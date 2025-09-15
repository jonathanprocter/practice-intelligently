import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { storage } from './storage';
import { simpleOAuth } from './oauth-simple';
import { pool } from './db';
import type { Appointment, InsertAppointment } from '../shared/schema';

export interface CalendarSyncResult {
  synced: number;
  created: number;
  updated: number;
  deleted: number;
  skipped: number;
  errors: string[];
}

export interface GoogleEventData {
  summary: string;
  description?: string;
  location?: string;
  start: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
  reminders?: {
    useDefault: boolean;
    overrides?: Array<{
      method: string;
      minutes: number;
    }>;
  };
  colorId?: string;
  recurrence?: string[];
}

export class BidirectionalCalendarSync {
  private static instance: BidirectionalCalendarSync;
  private calendar: any;
  private lastSyncTime: Map<string, Date> = new Map();
  private syncInProgress: boolean = false;
  private webhookUrl?: string;

  private constructor() {
    this.initializeCalendar();
  }

  static getInstance(): BidirectionalCalendarSync {
    if (!BidirectionalCalendarSync.instance) {
      BidirectionalCalendarSync.instance = new BidirectionalCalendarSync();
    }
    return BidirectionalCalendarSync.instance;
  }

  private async initializeCalendar() {
    try {
      // First attempt to refresh tokens if needed
      await simpleOAuth.refreshTokensIfNeeded();
      
      if (simpleOAuth.isConnected()) {
        const oauth2Client = simpleOAuth.getOAuth2Client();
        this.calendar = google.calendar({ version: 'v3', auth: oauth2Client });
        console.log('✅ Bidirectional calendar sync initialized');
      } else {
        console.warn('⚠️ Google Calendar not connected - bidirectional sync disabled');
      }
    } catch (error) {
      console.error('Failed to initialize calendar:', error);
    }
  }

  /**
   * Reinitialize the calendar connection (useful after OAuth token refresh)
   */
  async reinitialize(): Promise<boolean> {
    try {
      console.log('🔄 Reinitializing bidirectional calendar sync...');
      await this.initializeCalendar();
      return simpleOAuth.isConnected();
    } catch (error) {
      console.error('Failed to reinitialize calendar:', error);
      return false;
    }
  }

  /**
   * Create a Google Calendar event from an appointment
   */
  async createGoogleEvent(appointment: Appointment): Promise<string | null> {
    if (!this.calendar || !simpleOAuth.isConnected()) {
      console.warn('Calendar not connected - cannot create event');
      return null;
    }

    try {
      // Get client details
      const client = await storage.getClient(appointment.clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Prepare event data
      const eventData: GoogleEventData = {
        summary: `${client.firstName} ${client.lastName} - ${appointment.type}`,
        description: this.buildEventDescription(appointment, client),
        location: appointment.location || 'Office',
        start: {
          dateTime: appointment.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: appointment.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        reminders: {
          useDefault: false,
          overrides: [
            { method: 'email', minutes: 24 * 60 }, // 1 day before
            { method: 'popup', minutes: 60 }, // 1 hour before
          ],
        },
        colorId: this.getColorForAppointmentType(appointment.type),
      };

      // Add client email as attendee if available
      if (client.email) {
        eventData.attendees = [{
          email: client.email,
          displayName: `${client.firstName} ${client.lastName}`,
        }];
      }

      // Handle recurring appointments
      if (appointment.recurrenceRule) {
        eventData.recurrence = [appointment.recurrenceRule];
      }

      // Create the event
      const response = await this.calendar.events.insert({
        calendarId: appointment.googleCalendarId || 'primary',
        requestBody: eventData,
      });

      console.log(`✅ Created Google Calendar event: ${response.data.id}`);

      // Update appointment with Google event ID
      await storage.updateAppointment(appointment.id, {
        googleEventId: response.data.id,
        lastGoogleSync: new Date(),
      });

      return response.data.id;
    } catch (error: any) {
      console.error('Failed to create Google Calendar event:', error);
      throw new Error(`Failed to create calendar event: ${error.message}`);
    }
  }

  /**
   * Update a Google Calendar event from an appointment
   */
  async updateGoogleEvent(appointment: Appointment): Promise<boolean> {
    if (!this.calendar || !simpleOAuth.isConnected() || !appointment.googleEventId) {
      console.warn('Cannot update event - calendar not connected or no event ID');
      return false;
    }

    try {
      // Get client details
      const client = await storage.getClient(appointment.clientId);
      if (!client) {
        throw new Error('Client not found');
      }

      // Get the existing event first to preserve data
      const existingEvent = await this.calendar.events.get({
        calendarId: appointment.googleCalendarId || 'primary',
        eventId: appointment.googleEventId,
      });

      // Update event data
      const eventData: GoogleEventData = {
        summary: `${client.firstName} ${client.lastName} - ${appointment.type}`,
        description: this.buildEventDescription(appointment, client),
        location: appointment.location || existingEvent.data.location || 'Office',
        start: {
          dateTime: appointment.startTime.toISOString(),
          timeZone: 'America/New_York',
        },
        end: {
          dateTime: appointment.endTime.toISOString(),
          timeZone: 'America/New_York',
        },
        colorId: this.getColorForAppointmentType(appointment.type),
      };

      // Update attendees if client email exists
      if (client.email) {
        eventData.attendees = [{
          email: client.email,
          displayName: `${client.firstName} ${client.lastName}`,
        }];
      }

      // Update the event
      await this.calendar.events.update({
        calendarId: appointment.googleCalendarId || 'primary',
        eventId: appointment.googleEventId,
        requestBody: eventData,
      });

      console.log(`✅ Updated Google Calendar event: ${appointment.googleEventId}`);

      // Update sync timestamp
      await storage.updateAppointment(appointment.id, {
        lastGoogleSync: new Date(),
      });

      return true;
    } catch (error: any) {
      console.error('Failed to update Google Calendar event:', error);
      if (error.code === 404) {
        // Event doesn't exist, try to create it
        console.log('Event not found, creating new one...');
        const newEventId = await this.createGoogleEvent(appointment);
        return newEventId !== null;
      }
      return false;
    }
  }

  /**
   * Delete a Google Calendar event
   */
  async deleteGoogleEvent(appointment: Appointment): Promise<boolean> {
    if (!this.calendar || !simpleOAuth.isConnected() || !appointment.googleEventId) {
      console.warn('Cannot delete event - calendar not connected or no event ID');
      return false;
    }

    try {
      await this.calendar.events.delete({
        calendarId: appointment.googleCalendarId || 'primary',
        eventId: appointment.googleEventId,
      });

      console.log(`✅ Deleted Google Calendar event: ${appointment.googleEventId}`);
      return true;
    } catch (error: any) {
      console.error('Failed to delete Google Calendar event:', error);
      if (error.code === 404) {
        // Event already deleted
        console.log('Event already deleted from Google Calendar');
        return true;
      }
      return false;
    }
  }

  /**
   * Sync changes from Google Calendar to the app
   * Supports pagination for large date ranges (2015-2030)
   * @param forceUpdate - If true, updates all appointments regardless of Google's update timestamp
   * @param calendarId - The calendar to sync from, defaults to Simple Practice calendar
   */
  async syncFromGoogle(therapistId: string, timeMin?: Date, timeMax?: Date, forceUpdate: boolean = false, calendarId: string = '79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822@group.calendar.google.com'): Promise<CalendarSyncResult> {
    const result: CalendarSyncResult = {
      synced: 0,
      created: 0,
      updated: 0,
      deleted: 0,
      skipped: 0,
      errors: []
    };

    if (!this.calendar || !simpleOAuth.isConnected()) {
      result.errors.push('Calendar not connected');
      return result;
    }

    // Lock to prevent concurrent syncs
    if (this.syncInProgress) {
      result.errors.push('Sync already in progress');
      return result;
    }

    this.syncInProgress = true;

    try {
      // Set time range to 2015-2030 if not provided
      const startTime = timeMin || new Date('2015-01-01T00:00:00.000Z');
      const endTime = timeMax || new Date('2030-12-31T23:59:59.999Z');

      console.log(`🔄 Starting comprehensive Google Calendar sync from ${startTime.toISOString()} to ${endTime.toISOString()}`);

      // Collect all events with pagination
      let allEvents: any[] = [];
      let pageToken: string | undefined = undefined;
      let pageCount = 0;
      const maxResults = 2500; // Maximum allowed by Google Calendar API

      // Paginate through all events
      do {
        pageCount++;
        console.log(`📄 Fetching page ${pageCount} of Google Calendar events...`);

        try {
          const response = await this.calendar.events.list({
            calendarId: calendarId, // Use the provided calendar ID (Simple Practice by default)
            timeMin: startTime.toISOString(),
            timeMax: endTime.toISOString(),
            singleEvents: true,
            orderBy: 'startTime',
            maxResults,
            pageToken,
            showDeleted: false, // Don't include deleted events
            timeZone: 'America/New_York',
          });

          const events = response.data.items || [];
          allEvents = allEvents.concat(events);
          pageToken = response.data.nextPageToken;

          console.log(`  ✓ Page ${pageCount}: Retrieved ${events.length} events (total so far: ${allEvents.length})`);

          // Add a small delay between pages to avoid rate limiting
          if (pageToken) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
        } catch (pageError: any) {
          console.error(`Failed to fetch page ${pageCount}:`, pageError);
          result.errors.push(`Failed to fetch page ${pageCount}: ${pageError.message}`);
          // Continue with what we have so far
          break;
        }
      } while (pageToken);

      console.log(`📊 Total Google Calendar events found: ${allEvents.length}`);

      // Build a map of Google event IDs for efficient lookup
      const googleEventMap = new Map<string, any>();
      for (const event of allEvents) {
        if (event.id) {
          googleEventMap.set(event.id, event);
        }
      }

      // Process events in batches to avoid overwhelming the database
      const batchSize = 50;
      for (let i = 0; i < allEvents.length; i += batchSize) {
        const batch = allEvents.slice(i, i + batchSize);
        console.log(`Processing batch ${Math.floor(i / batchSize) + 1} of ${Math.ceil(allEvents.length / batchSize)} (events ${i + 1}-${Math.min(i + batchSize, allEvents.length)})`);

        // Process events in parallel within each batch
        const batchPromises = batch.map(async (event) => {
          try {
            const processed = await this.processGoogleEvent(event, therapistId, forceUpdate);
            
            if (processed.created) {
              result.created++;
              result.synced++;
            } else if (processed.updated) {
              result.updated++;
              result.synced++;
            } else if (processed.deleted) {
              result.deleted++;
              result.synced++;
            } else if (processed.skipped) {
              result.skipped++;
            }
          } catch (error: any) {
            console.error(`Failed to process event "${event.summary}":`, error);
            result.errors.push(`Failed to process event "${event.summary}": ${error.message}`);
          }
        });

        await Promise.all(batchPromises);
      }

      // Check for deleted events (events in DB but not in Google)
      console.log('🔍 Checking for events deleted from Google Calendar...');
      await this.checkForDeletedEventsComprehensive(therapistId, googleEventMap, startTime, endTime, result, calendarId);

      // Update last sync time
      this.lastSyncTime.set(therapistId, new Date());

      // Log comprehensive summary
      console.log('✅ Google Calendar sync completed successfully!');
      console.log(`📈 Sync Statistics:`);
      console.log(`   - Total Synced: ${result.synced}`);
      console.log(`   - Created: ${result.created}`);
      console.log(`   - Updated: ${result.updated}`);
      console.log(`   - Deleted: ${result.deleted}`);
      console.log(`   - Skipped: ${result.skipped}`);
      if (result.errors.length > 0) {
        console.log(`   - Errors: ${result.errors.length}`);
      }

      return result;
    } catch (error: any) {
      console.error('❌ Google Calendar sync failed:', error);
      result.errors.push(`Sync failed: ${error.message}`);
      return result;
    } finally {
      this.syncInProgress = false;
    }
  }

  /**
   * Process a single Google Calendar event
   * @param forceUpdate - If true, updates appointments regardless of Google's update timestamp
   */
  private async processGoogleEvent(
    event: any,
    therapistId: string,
    forceUpdate: boolean = false
  ): Promise<{ created: boolean; updated: boolean; deleted: boolean; skipped: boolean }> {
    // Check if event was cancelled
    if (event.status === 'cancelled') {
      // Handle cancelled event
      const appointment = await storage.getAppointmentByEventId(event.id);
      if (appointment) {
        await storage.cancelAppointment(appointment.id, 'Cancelled in Google Calendar');
        return { created: false, updated: false, deleted: true, skipped: false };
      }
      return { created: false, updated: false, deleted: false, skipped: true };
    }

    // Skip events without required data
    if (!event.start || !event.summary) {
      return { created: false, updated: false, deleted: false, skipped: true };
    }

    // Check if appointment already exists
    const existingAppointment = await storage.getAppointmentByEventId(event.id);
    
    if (existingAppointment) {
      // Check if event was updated in Google or if force update is enabled
      const googleUpdated = new Date(event.updated);
      const lastSync = existingAppointment.lastGoogleSync || new Date(0);
      
      // Always update if forceUpdate is true, or if Google event was updated after last sync
      if (forceUpdate || googleUpdated > lastSync) {
        // Update existing appointment
        const updated = await this.updateAppointmentFromGoogle(existingAppointment, event, forceUpdate);
        return { created: false, updated, deleted: false, skipped: !updated };
      }
      
      // Even if not force updating, check if appointment data needs correction
      // This ensures data accuracy even when Google hasn't marked the event as updated
      const needsDataCorrection = await this.checkAppointmentNeedsCorrection(existingAppointment, event);
      if (needsDataCorrection) {
        const updated = await this.updateAppointmentFromGoogle(existingAppointment, event, true);
        return { created: false, updated, deleted: false, skipped: !updated };
      }
      
      return { created: false, updated: false, deleted: false, skipped: true };
    }

    // Create new appointment from Google event
    const created = await this.createAppointmentFromGoogle(event, therapistId);
    return { created, updated: false, deleted: false, skipped: !created };
  }

  /**
   * Check if appointment data needs correction by comparing with Google event
   * This ensures data accuracy even when Google hasn't marked the event as updated
   */
  private async checkAppointmentNeedsCorrection(appointment: Appointment, event: any): Promise<boolean> {
    try {
      // Parse times from Google event
      const googleStartTime = new Date(event.start.dateTime || event.start.date);
      const googleEndTime = new Date(event.end.dateTime || event.end.date);
      const appointmentStartTime = new Date(appointment.startTime);
      const appointmentEndTime = new Date(appointment.endTime);

      // Check for time discrepancies
      if (googleStartTime.getTime() !== appointmentStartTime.getTime() ||
          googleEndTime.getTime() !== appointmentEndTime.getTime()) {
        console.log(`  ⚠️ Time mismatch for appointment ${appointment.id}`);
        return true;
      }

      // Check for location discrepancies
      if (event.location !== appointment.location && event.location) {
        console.log(`  ⚠️ Location mismatch for appointment ${appointment.id}`);
        return true;
      }

      // Check for client name mismatch in summary
      const clientInfo = await this.extractClientFromEvent(event);
      if (clientInfo.firstName || clientInfo.lastName) {
        const client = await storage.getClient(appointment.clientId);
        if (client) {
          const googleClientName = `${clientInfo.firstName} ${clientInfo.lastName}`.trim();
          const dbClientName = `${client.firstName} ${client.lastName}`.trim();
          if (googleClientName && dbClientName && googleClientName !== dbClientName) {
            console.log(`  ⚠️ Client name mismatch for appointment ${appointment.id}: Google: "${googleClientName}" vs DB: "${dbClientName}"`);
            // In this case, we might need to update the client association
            return true;
          }
        }
      }

      // Check for appointment type mismatch
      const googleAppointmentType = this.determineAppointmentType(event);
      if (googleAppointmentType !== appointment.type) {
        console.log(`  ⚠️ Appointment type mismatch for appointment ${appointment.id}`);
        return true;
      }

      // Check for status discrepancy (e.g., cancelled in Google but not in DB)
      if (event.status === 'cancelled' && appointment.status !== 'cancelled') {
        console.log(`  ⚠️ Status mismatch for appointment ${appointment.id}: cancelled in Google but not in DB`);
        return true;
      }

      // Check if past appointment is still marked as scheduled
      if (new Date() > googleEndTime && appointment.status === 'scheduled') {
        console.log(`  ⚠️ Past appointment ${appointment.id} still marked as scheduled`);
        return true;
      }

      return false;
    } catch (error) {
      console.error(`Error checking appointment correction needs:`, error);
      // If we can't check, assume it needs updating to be safe
      return true;
    }
  }

  /**
   * Update appointment from Google Calendar event
   * Enhanced with comprehensive field mapping
   * @param forceUpdate - If true, updates all fields regardless of changes
   */
  private async updateAppointmentFromGoogle(appointment: Appointment, event: any, forceUpdate: boolean = false): Promise<boolean> {
    try {
      // Parse times
      const startTime = new Date(event.start.dateTime || event.start.date);
      const endTime = new Date(event.end.dateTime || event.end.date);

      // Check if significant changes occurred
      const hasTimeChange = 
        startTime.getTime() !== new Date(appointment.startTime).getTime() ||
        endTime.getTime() !== new Date(appointment.endTime).getTime();
      
      const hasLocationChange = event.location !== appointment.location;
      const hasDescriptionChange = event.description !== appointment.notes;

      // Only skip update if not forcing and no changes detected
      if (!forceUpdate && !hasTimeChange && !hasLocationChange && !hasDescriptionChange) {
        return false; // No changes, skip update
      }

      // Extract video link from location or description
      let videoLink = appointment.videoLink;
      if (event.location?.includes('zoom.us') || event.location?.includes('meet.google.com')) {
        videoLink = event.location;
      } else if (event.description) {
        const zoomMatch = event.description.match(/https:\/\/[\w-]+\.zoom\.us\/[\w\/?=&-]+/);
        const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[\w-]+/);
        const newVideoLink = zoomMatch?.[0] || meetMatch?.[0];
        if (newVideoLink) {
          videoLink = newVideoLink;
        }
      }

      // Extract reminder settings
      let reminderMinutes = appointment.reminderMinutes || 60;
      if (event.reminders?.overrides?.length > 0) {
        const popupReminder = event.reminders.overrides.find((r: any) => r.method === 'popup');
        if (popupReminder) {
          reminderMinutes = popupReminder.minutes;
        }
      }

      // Determine new status based on event status and time
      let status = appointment.status;
      if (event.status === 'cancelled') {
        status = 'cancelled';
      } else if (new Date() > endTime && status === 'scheduled') {
        // Auto-complete past appointments
        status = 'completed';
      }

      const updates: Partial<Appointment> = {
        startTime,
        endTime,
        location: event.location || appointment.location,
        notes: event.description || appointment.notes,
        lastGoogleSync: new Date(event.updated || new Date()),
        videoLink: videoLink || undefined,
        reminderMinutes,
        status,
        // Update appointment type if changed
        type: this.determineAppointmentType(event),
        // Handle recurring event updates
        recurrenceRule: event.recurrence?.[0] || appointment.recurrenceRule,
        recurrenceId: event.recurringEventId || appointment.recurrenceId,
      };

      await storage.updateAppointment(appointment.id, updates);
      console.log(`  ✓ Updated appointment from Google: ${appointment.id} (${event.summary})`);
      return true;
    } catch (error: any) {
      console.error(`Failed to update appointment ${appointment.id} from Google:`, error);
      return false;
    }
  }

  /**
   * Create appointment from Google Calendar event
   * Enhanced with comprehensive field mapping
   */
  private async createAppointmentFromGoogle(event: any, therapistId: string): Promise<boolean> {
    try {
      // Skip all-day events and events without proper time
      if (!event.start?.dateTime && event.start?.date) {
        console.log(`Skipping all-day event: ${event.summary}`);
        return false;
      }

      // Extract client info from event
      const clientInfo = await this.extractClientFromEvent(event);
      const clientId = await this.findOrCreateClient(clientInfo, therapistId);

      // Parse start and end times
      const startTime = new Date(event.start.dateTime || event.start.date);
      const endTime = new Date(event.end.dateTime || event.end.date);

      // Validate times
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.error(`Invalid dates for event: ${event.summary}`);
        return false;
      }

      // Extract video link from location or description
      let videoLink = '';
      if (event.location?.includes('zoom.us') || event.location?.includes('meet.google.com')) {
        videoLink = event.location;
      } else if (event.description) {
        const zoomMatch = event.description.match(/https:\/\/[\w-]+\.zoom\.us\/[\w\/?=&-]+/);
        const meetMatch = event.description.match(/https:\/\/meet\.google\.com\/[\w-]+/);
        videoLink = zoomMatch?.[0] || meetMatch?.[0] || '';
      }

      // Extract reminder settings
      let reminderMinutes = 60; // Default to 1 hour
      if (event.reminders?.overrides?.length > 0) {
        // Use the first popup reminder
        const popupReminder = event.reminders.overrides.find((r: any) => r.method === 'popup');
        if (popupReminder) {
          reminderMinutes = popupReminder.minutes;
        }
      }

      const appointment: InsertAppointment = {
        clientId,
        therapistId,
        startTime,
        endTime,
        type: this.determineAppointmentType(event),
        status: this.determineStatus(event),
        location: event.location || 'Office',
        notes: event.description || '',
        googleEventId: event.id,
        googleCalendarId: event.calendarId || 'primary',
        lastGoogleSync: new Date(event.updated || new Date()),
        videoLink: videoLink || undefined,
        reminderSent: false,
        reminderMinutes,
        // Handle recurring events
        recurrenceRule: event.recurrence?.[0] || undefined,
        recurrenceId: event.recurringEventId || undefined,
      };

      const createdAppointment = await storage.createAppointment(appointment);
      console.log(`  ✓ Created appointment from Google: ${event.summary} (${startTime.toLocaleDateString()})`);
      return true;
    } catch (error: any) {
      console.error(`Failed to create appointment from Google event "${event.summary}":`, error);
      return false;
    }
  }

  /**
   * Check for events deleted from Google Calendar
   */
  private async checkForDeletedEvents(
    therapistId: string,
    currentEvents: any[],
    result: CalendarSyncResult
  ): Promise<void> {
    try {
      // Get all appointments with Google event IDs
      const appointments = await storage.getAppointments(therapistId);
      const googleEventIds = new Set(currentEvents.map(e => e.id));

      for (const appointment of appointments) {
        if (appointment.googleEventId && !googleEventIds.has(appointment.googleEventId)) {
          // Event was deleted from Google Calendar
          await storage.cancelAppointment(appointment.id, 'Deleted from Google Calendar');
          result.deleted++;
          result.synced++;
          console.log(`Marked appointment as cancelled (deleted from Google): ${appointment.id}`);
        }
      }
    } catch (error) {
      console.error('Failed to check for deleted events:', error);
      result.errors.push(`Failed to check deleted events: ${error.message}`);
    }
  }

  /**
   * Comprehensive check for events deleted from Google Calendar
   * Handles large date ranges efficiently
   */
  private async checkForDeletedEventsComprehensive(
    therapistId: string,
    googleEventMap: Map<string, any>,
    startTime: Date,
    endTime: Date,
    result: CalendarSyncResult,
    calendarId: string = '79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822@group.calendar.google.com'
  ): Promise<void> {
    try {
      // Get all appointments within the date range that have Google event IDs
      const query = `
        SELECT * FROM appointments 
        WHERE therapist_id = $1 
        AND google_event_id IS NOT NULL 
        AND start_time >= $2 
        AND start_time <= $3
        AND status != 'cancelled'
      `;
      
      const appointmentsResult = await pool.query(query, [
        therapistId,
        startTime.toISOString(),
        endTime.toISOString()
      ]);
      
      const appointments = appointmentsResult.rows;
      console.log(`Found ${appointments.length} appointments to check for deletion`);

      // Check each appointment to see if it still exists in Google
      let deletedCount = 0;
      for (const appointment of appointments) {
        if (!googleEventMap.has(appointment.google_event_id)) {
          // Event was deleted from Google Calendar
          try {
            await storage.cancelAppointment(appointment.id, 'Deleted from Google Calendar');
            deletedCount++;
            result.deleted++;
            result.synced++;
            console.log(`  ✓ Marked appointment as cancelled (deleted from Google): ${appointment.id}`);
          } catch (deleteError: any) {
            console.error(`  ✗ Failed to mark appointment ${appointment.id} as deleted:`, deleteError);
            result.errors.push(`Failed to delete appointment ${appointment.id}: ${deleteError.message}`);
          }
        }
      }

      if (deletedCount > 0) {
        console.log(`📝 Marked ${deletedCount} appointments as cancelled (deleted from Google)`);
      }
    } catch (error: any) {
      console.error('Failed to check for deleted events:', error);
      result.errors.push(`Failed to check deleted events: ${error.message}`);
    }
  }

  /**
   * Handle conflict resolution when scheduling
   */
  async checkForConflicts(
    therapistId: string,
    startTime: Date,
    endTime: Date,
    excludeAppointmentId?: string
  ): Promise<Array<{ appointment: Appointment; conflictType: 'overlap' | 'buffer' }>> {
    const conflicts: Array<{ appointment: Appointment; conflictType: 'overlap' | 'buffer' }> = [];
    
    try {
      // Get appointments for the day
      const dayStart = new Date(startTime);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(startTime);
      dayEnd.setHours(23, 59, 59, 999);

      const appointments = await storage.getAppointments(therapistId, dayStart);
      
      // Buffer time in minutes
      const BUFFER_TIME = 15;

      for (const apt of appointments) {
        // Skip the appointment being updated
        if (excludeAppointmentId && apt.id === excludeAppointmentId) continue;
        
        // Skip cancelled appointments
        if (apt.status === 'cancelled') continue;

        const aptStart = new Date(apt.startTime);
        const aptEnd = new Date(apt.endTime);
        
        // Check for direct overlap
        if (
          (startTime >= aptStart && startTime < aptEnd) ||
          (endTime > aptStart && endTime <= aptEnd) ||
          (startTime <= aptStart && endTime >= aptEnd)
        ) {
          conflicts.push({ appointment: apt, conflictType: 'overlap' });
        }
        
        // Check for buffer time violations
        const bufferStart = new Date(aptStart.getTime() - BUFFER_TIME * 60000);
        const bufferEnd = new Date(aptEnd.getTime() + BUFFER_TIME * 60000);
        
        if (
          (startTime >= bufferStart && startTime < aptStart) ||
          (endTime > aptEnd && endTime <= bufferEnd)
        ) {
          conflicts.push({ appointment: apt, conflictType: 'buffer' });
        }
      }
    } catch (error) {
      console.error('Failed to check for conflicts:', error);
    }

    return conflicts;
  }

  /**
   * Build event description with appointment details
   */
  private buildEventDescription(appointment: Appointment, client: any): string {
    const lines = [];
    
    lines.push(`Appointment Type: ${appointment.type}`);
    lines.push(`Client: ${client.firstName} ${client.lastName}`);
    
    if (client.phone) {
      lines.push(`Phone: ${client.phone}`);
    }
    
    if (client.email) {
      lines.push(`Email: ${client.email}`);
    }
    
    if (appointment.notes) {
      lines.push('');
      lines.push('Notes:');
      lines.push(appointment.notes);
    }
    
    lines.push('');
    lines.push(`Appointment ID: ${appointment.id}`);
    lines.push(`Last synced: ${new Date().toISOString()}`);
    
    return lines.join('\n');
  }

  /**
   * Get color ID for appointment type
   */
  private getColorForAppointmentType(type: string): string {
    const colorMap: Record<string, string> = {
      'intake': '2',        // Green
      'therapy': '1',       // Blue  
      'assessment': '5',    // Yellow
      'group': '6',         // Orange
      'family': '3',        // Purple
      'consultation': '7',  // Cyan
      'emergency': '11',    // Red
    };
    return colorMap[type] || '1'; // Default to blue
  }

  /**
   * Extract client information from Google Calendar event
   */
  private async extractClientFromEvent(event: any): Promise<{
    name: string;
    email?: string;
  }> {
    const summary = event.summary || '';
    
    // Try to extract name from summary (format: "Name - Type" or just "Name")
    const nameMatch = summary.match(/^([^-]+?)(?:\s*-\s*.*)?$/);
    const name = nameMatch ? nameMatch[1].trim() : summary;
    
    // Extract email from attendees
    let email: string | undefined;
    if (event.attendees && event.attendees.length > 0) {
      const clientAttendee = event.attendees.find((a: any) => 
        !a.organizer && a.email && !a.email.includes('calendar.google.com')
      );
      if (clientAttendee) {
        email = clientAttendee.email;
      }
    }
    
    return { name, email };
  }

  /**
   * Find or create client for Google Calendar event
   */
  private async findOrCreateClient(
    clientInfo: { name: string; email?: string },
    therapistId: string
  ): Promise<string> {
    // Try to find existing client
    const clients = await storage.getClients(therapistId);
    
    // Match by email first
    if (clientInfo.email) {
      const matched = clients.find(c => c.email === clientInfo.email);
      if (matched) return matched.id;
    }
    
    // Match by name
    const nameParts = clientInfo.name.split(' ');
    const firstName = nameParts[0] || 'Unknown';
    const lastName = nameParts.slice(1).join(' ') || 'Client';
    
    const matched = clients.find(c => 
      c.firstName.toLowerCase() === firstName.toLowerCase() &&
      c.lastName.toLowerCase() === lastName.toLowerCase()
    );
    
    if (matched) return matched.id;
    
    // Create new client
    const newClient = await storage.createClient({
      firstName,
      lastName,
      email: clientInfo.email,
      therapistId,
      status: 'active',
    });
    
    console.log(`Created client from Google Calendar: ${clientInfo.name}`);
    return newClient.id;
  }

  /**
   * Determine appointment type from event
   */
  private determineAppointmentType(event: any): string {
    const text = `${event.summary} ${event.description || ''}`.toLowerCase();
    
    if (text.includes('intake')) return 'intake';
    if (text.includes('assessment')) return 'assessment';
    if (text.includes('group')) return 'group';
    if (text.includes('family')) return 'family';
    if (text.includes('consultation')) return 'consultation';
    if (text.includes('emergency')) return 'emergency';
    
    return 'therapy';
  }

  /**
   * Determine appointment status
   */
  private determineStatus(event: any): 'scheduled' | 'completed' | 'cancelled' | 'no_show' {
    if (event.status === 'cancelled') return 'cancelled';
    
    const now = new Date();
    const endTime = new Date(event.end.dateTime || event.end.date);
    
    if (endTime < now) return 'completed';
    return 'scheduled';
  }

  /**
   * Setup webhook for real-time Google Calendar updates
   */
  async setupWebhook(therapistId: string, webhookUrl: string): Promise<boolean> {
    if (!this.calendar || !simpleOAuth.isConnected()) {
      console.warn('Cannot setup webhook - calendar not connected');
      return false;
    }

    try {
      this.webhookUrl = webhookUrl;
      
      // Create a watch request for calendar changes
      const response = await this.calendar.events.watch({
        calendarId: 'primary',
        requestBody: {
          id: `watch-${therapistId}-${Date.now()}`,
          type: 'web_hook',
          address: webhookUrl,
          params: {
            ttl: '2592000', // 30 days in seconds
          },
        },
      });

      console.log(`✅ Webhook setup for calendar updates: ${response.data.id}`);
      return true;
    } catch (error: any) {
      console.error('Failed to setup webhook:', error);
      return false;
    }
  }

  /**
   * Handle webhook notification from Google Calendar
   */
  async handleWebhookNotification(
    therapistId: string,
    resourceId: string,
    resourceState: string
  ): Promise<void> {
    console.log(`Received webhook notification: ${resourceState} for ${resourceId}`);
    
    if (resourceState === 'sync') {
      // Initial sync notification
      console.log('Initial sync notification received');
      return;
    }

    // Perform incremental sync
    await this.syncFromGoogle(therapistId);
  }

  /**
   * Get sync status
   */
  getSyncStatus(therapistId: string): {
    lastSync: Date | null;
    syncInProgress: boolean;
    isConnected: boolean;
  } {
    return {
      lastSync: this.lastSyncTime.get(therapistId) || null,
      syncInProgress: this.syncInProgress,
      isConnected: simpleOAuth.isConnected(),
    };
  }
}

export const bidirectionalCalendarSync = BidirectionalCalendarSync.getInstance();