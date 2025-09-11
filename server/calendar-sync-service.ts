import { storage } from './storage';
import { googleCalendarService } from './google-calendar';
import { pool } from './db';
import type { InsertAppointment } from '../shared/schema';

export interface CalendarSyncResult {
  synced: number;
  created: number;
  updated: number;
  skipped: number;
  errors: string[];
}

export class CalendarSyncService {
  private static instance: CalendarSyncService;
  
  static getInstance(): CalendarSyncService {
    if (!CalendarSyncService.instance) {
      CalendarSyncService.instance = new CalendarSyncService();
    }
    return CalendarSyncService.instance;
  }

  /**
   * Comprehensive calendar sync that auto-creates appointments for ALL calendar events
   * from 2015 to 2030 (full historical and future range)
   */
  async syncFullCalendarHistory(therapistId: string): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      console.log('Starting comprehensive calendar sync for therapist:', therapistId);
      
      // Fetch ALL calendar events from 2015-2030
      const timeMin = new Date('2015-01-01T00:00:00.000Z');
      const timeMax = new Date('2030-12-31T23:59:59.999Z');
      
      const events = await googleCalendarService.getEvents(timeMin, timeMax);
      
      if (!events || events.length === 0) {
        console.log('No calendar events found');
        return result;
      }

      console.log(`Found ${events.length} calendar events to process`);

      // Process each event
      for (const event of events) {
        try {
          const processed = await this.processCalendarEvent(event, therapistId);
          
          if (processed.created) {
            result.created++;
            result.synced++;
          } else if (processed.updated) {
            result.updated++;
            result.synced++;
          } else if (processed.skipped) {
            result.skipped++;
          }
        } catch (error) {
          const errorMsg = `Failed to process event "${event.summary}": ${error.message}`;
          console.error(errorMsg);
          result.errors.push(errorMsg);
        }
      }

      console.log('Calendar sync completed:', result);
      return result;
      
    } catch (error) {
      console.error('Calendar sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }

  /**
   * Process a single calendar event and create/update appointment
   */
  private async processCalendarEvent(
    event: any, 
    therapistId: string
  ): Promise<{ created: boolean; updated: boolean; skipped: boolean }> {
    
    // Skip events without required data
    if (!event.start || !event.summary) {
      return { created: false, updated: false, skipped: true };
    }

    // Extract client information from event
    const clientInfo = await this.extractClientInfo(event);
    
    if (!clientInfo.isAppointment) {
      return { created: false, updated: false, skipped: true };
    }

    // Try to match to existing client or create a placeholder
    const clientId = await this.matchOrCreateClient(clientInfo, therapistId);
    
    // Check if appointment already exists
    const existingAppointment = await this.findExistingAppointment(event, clientId, therapistId);
    
    if (existingAppointment) {
      // Update existing appointment if needed
      const updated = await this.updateAppointmentFromEvent(existingAppointment.id, event);
      return { created: false, updated, skipped: !updated };
    }

    // Create new appointment
    const appointment: InsertAppointment = {
      id: `cal-${event.id || this.generateEventId(event)}`,
      clientId,
      therapistId,
      startTime: new Date(event.start.dateTime || event.start.date),
      endTime: new Date(event.end.dateTime || event.end.date),
      type: this.determineAppointmentType(event),
      status: this.determineAppointmentStatus(event, new Date()),
      notes: event.description || '',
      location: event.location || '',
      googleEventId: event.id,
      metadata: {
        source: 'google_calendar',
        originalSummary: event.summary,
        synced: true,
        syncedAt: new Date().toISOString(),
        attendees: event.attendees || [],
        htmlLink: event.htmlLink
      }
    };

    try {
      await storage.createAppointment(appointment);
      console.log(`Created appointment for: ${clientInfo.clientName} on ${appointment.startTime}`);
      return { created: true, updated: false, skipped: false };
    } catch (error) {
      console.error('Failed to create appointment:', error);
      return { created: false, updated: false, skipped: true };
    }
  }

  /**
   * Extract client information from calendar event
   */
  private async extractClientInfo(event: any): Promise<{
    clientName: string;
    clientEmail?: string;
    isAppointment: boolean;
  }> {
    const summary = event.summary || '';
    const description = event.description || '';
    const lowerSummary = summary.toLowerCase();
    const lowerDescription = description.toLowerCase();
    
    // Check if this is likely a therapy appointment
    const therapyKeywords = [
      'therapy', 'session', 'appointment', 'counseling', 'consultation',
      'intake', 'assessment', 'treatment', 'client', 'patient'
    ];
    
    const isAppointment = therapyKeywords.some(keyword => 
      lowerSummary.includes(keyword) || lowerDescription.includes(keyword)
    );
    
    // Also check for client names in common patterns
    const namePatterns = [
      /^(.*?)\s*[-–—]\s*(?:therapy|session|appointment|counseling)/i,
      /^(?:therapy|session|appointment|counseling)\s*(?:with|for)?\s*[-–—]?\s*(.*?)$/i,
      /^(.*?)\s*(?:\(|:)\s*(?:therapy|session|appointment)/i,
      /^([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s*$/  // Just a name
    ];
    
    let clientName = summary;
    for (const pattern of namePatterns) {
      const match = summary.match(pattern);
      if (match && match[1]) {
        clientName = match[1].trim();
        break;
      }
    }
    
    // Extract email from attendees
    let clientEmail: string | undefined;
    if (event.attendees && event.attendees.length > 0) {
      const clientAttendee = event.attendees.find((a: any) => 
        !a.organizer && a.email && !a.email.includes('calendar.google.com')
      );
      if (clientAttendee) {
        clientEmail = clientAttendee.email;
        if (!clientName && clientAttendee.displayName) {
          clientName = clientAttendee.displayName;
        }
      }
    }
    
    return {
      clientName: clientName.replace(/\s+appointment$/i, '').trim(),
      clientEmail,
      isAppointment: isAppointment || (clientName.length > 0 && clientName.length < 100)
    };
  }

  /**
   * Match calendar event to existing client or create placeholder
   */
  private async matchOrCreateClient(
    clientInfo: { clientName: string; clientEmail?: string },
    therapistId: string
  ): Promise<string> {
    
    // Try to find existing client by name or email
    const clients = await storage.getClients(therapistId);
    
    // First try exact match
    let matchedClient = clients.find(c => {
      const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
      const searchName = clientInfo.clientName.toLowerCase();
      
      return fullName === searchName || 
             c.email?.toLowerCase() === clientInfo.clientEmail?.toLowerCase() ||
             c.preferredName?.toLowerCase() === searchName;
    });
    
    // Try partial match if no exact match
    if (!matchedClient) {
      matchedClient = clients.find(c => {
        const fullName = `${c.firstName} ${c.lastName}`.toLowerCase();
        const searchName = clientInfo.clientName.toLowerCase();
        
        return fullName.includes(searchName) || 
               searchName.includes(fullName) ||
               (c.firstName && searchName.includes(c.firstName.toLowerCase())) ||
               (c.lastName && searchName.includes(c.lastName.toLowerCase()));
      });
    }
    
    if (matchedClient) {
      return matchedClient.id;
    }
    
    // Create placeholder client for unmatched calendar events
    const nameParts = clientInfo.clientName.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Client';
    
    const newClient = await storage.createClient({
      firstName,
      lastName,
      email: clientInfo.clientEmail,
      status: 'active',
      therapistId,
      metadata: {
        source: 'calendar_sync',
        autoCreated: true,
        originalName: clientInfo.clientName
      }
    });
    
    console.log(`Created placeholder client: ${clientInfo.clientName}`);
    return newClient.id;
  }

  /**
   * Find existing appointment to avoid duplicates
   */
  private async findExistingAppointment(
    event: any,
    clientId: string,
    therapistId: string
  ): Promise<any> {
    try {
      // Check by Google event ID first
      if (event.id) {
        const result = await pool.query(
          `SELECT * FROM appointments WHERE google_event_id = $1 OR id = $2`,
          [event.id, `cal-${event.id}`]
        );
        if (result.rows.length > 0) {
          return result.rows[0];
        }
      }
      
      // Check by time and client to avoid duplicates
      const startTime = new Date(event.start.dateTime || event.start.date);
      const endTime = new Date(event.end.dateTime || event.end.date);
      
      const result = await pool.query(
        `SELECT * FROM appointments 
         WHERE client_id = $1 
         AND therapist_id = $2
         AND start_time = $3
         AND end_time = $4`,
        [clientId, therapistId, startTime.toISOString(), endTime.toISOString()]
      );
      
      return result.rows.length > 0 ? result.rows[0] : null;
    } catch (error) {
      console.error('Error finding existing appointment:', error);
      return null;
    }
  }

  /**
   * Update existing appointment from calendar event
   */
  private async updateAppointmentFromEvent(
    appointmentId: string,
    event: any
  ): Promise<boolean> {
    try {
      const updates: any = {
        notes: event.description || '',
        location: event.location || '',
        metadata: {
          lastSynced: new Date().toISOString(),
          htmlLink: event.htmlLink
        }
      };
      
      await storage.updateAppointment(appointmentId, updates);
      return true;
    } catch (error) {
      console.error('Failed to update appointment:', error);
      return false;
    }
  }

  /**
   * Determine appointment type from calendar event
   */
  private determineAppointmentType(event: any): string {
    const summary = (event.summary || '').toLowerCase();
    const description = (event.description || '').toLowerCase();
    
    if (summary.includes('intake') || description.includes('intake')) {
      return 'intake';
    }
    if (summary.includes('assessment') || description.includes('assessment')) {
      return 'assessment';
    }
    if (summary.includes('group') || description.includes('group')) {
      return 'group';
    }
    if (summary.includes('family') || description.includes('family')) {
      return 'family';
    }
    
    return 'therapy';
  }

  /**
   * Determine appointment status based on date
   */
  private determineAppointmentStatus(event: any, currentDate: Date): 'scheduled' | 'completed' | 'cancelled' | 'no_show' {
    const startTime = new Date(event.start.dateTime || event.start.date);
    
    // Check if event was cancelled in Google Calendar
    if (event.status === 'cancelled') {
      return 'cancelled';
    }
    
    // Future appointment
    if (startTime > currentDate) {
      return 'scheduled';
    }
    
    // Past appointment - assume completed unless marked otherwise
    return 'completed';
  }

  /**
   * Generate a unique event ID if not provided
   */
  private generateEventId(event: any): string {
    const date = new Date(event.start.dateTime || event.start.date).toISOString();
    const summary = event.summary || 'event';
    return `${date}-${summary}`.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  }

  /**
   * Sync calendar events for today only
   */
  async syncTodayEvents(therapistId: string): Promise<CalendarSyncResult> {
    const today = new Date();
    const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    return this.syncCalendarRange(therapistId, timeMin, timeMax);
  }

  /**
   * Sync calendar events for a specific date range
   */
  async syncCalendarRange(
    therapistId: string, 
    timeMin: Date, 
    timeMax: Date
  ): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      skipped: 0,
      errors: []
    };

    try {
      const events = await googleCalendarService.getEvents(timeMin, timeMax);
      
      for (const event of events) {
        try {
          const processed = await this.processCalendarEvent(event, therapistId);
          
          if (processed.created) {
            result.created++;
            result.synced++;
          } else if (processed.updated) {
            result.updated++;
            result.synced++;
          } else if (processed.skipped) {
            result.skipped++;
          }
        } catch (error) {
          result.errors.push(`Failed to process event: ${error.message}`);
        }
      }
      
      return result;
    } catch (error) {
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    }
  }
}

export const calendarSyncService = CalendarSyncService.getInstance();