import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import { pool } from './db';

// Local types for calendar functionality
interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status?: string;
  attendees?: any[];
  calendarId?: string;
  calendarName?: string;
  location?: string;
  isAllDay?: boolean;
}

interface GoogleCalendarInfo {
  id: string;
  summary: string;
  description?: string;
  primary?: boolean;
}

interface GoogleCalendarEventBase {
  id: string;
  summary?: string;
  description?: string;
  start?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  end?: {
    dateTime?: string;
    date?: string;
    timeZone?: string;
  };
  location?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
  }>;
}

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  // Check if we're running on Replit
  if (process.env.REPLIT_DEV_DOMAIN) {
    const uri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    // Using REPLIT_DEV_DOMAIN redirect URI
    // Debug logging removed for production
    return uri;
  }
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    const uri = `https://${domain}/api/auth/google/callback`;
    // Using REPLIT_DOMAINS redirect URI
    // Debug logging removed for production
    return uri;
  }
  // For local development
  const uri = 'http://0.0.0.0:5000/api/auth/google/callback';
  // Using localhost redirect URI
  // Debug logging removed for production
  return uri;
};

// Create a function to get OAuth client with current redirect URI
const getOAuth2Client = () => {
  return new OAuth2Client(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
};

const oauth2Client = getOAuth2Client();

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

export interface GoogleCalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: {
    dateTime: string;
    timeZone?: string;
  };
  end: {
    dateTime: string;
    timeZone?: string;
  };
  status?: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

export class GoogleCalendarService {
  private auth: OAuth2Client;
  private tokens: any = null;
  private isAuthenticated = false;

  constructor() {
    this.auth = oauth2Client;
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    // Get fresh OAuth client with current redirect URI
    this.auth = getOAuth2Client();

    console.log('Generating OAuth URL with redirect URI:', getRedirectUri());
    console.log('Using Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');

    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('Generated OAuth URL:', authUrl);
    console.log('Generated auth URL length:', authUrl.length);
    console.log('Auth URL domain:', authUrl.substring(0, 50) + '...');

    return authUrl;
  }

  async getAccessToken(code: string): Promise<void> {
    try {
      console.log('Exchanging authorization code for tokens...');

      // Use fresh OAuth client with current redirect URI for token exchange
      const currentOAuth = getOAuth2Client();
      const { tokens } = await currentOAuth.getToken(code);

      console.log('Successfully received tokens:', Object.keys(tokens));
      this.tokens = tokens;
      this.auth = currentOAuth;
      this.auth.setCredentials(tokens);
      this.isAuthenticated = true;
      console.log('Successfully authenticated with Google Calendar');
    } catch (error: any) {
      console.error('Error getting access token:', error);
      this.isAuthenticated = false;
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  isConnected(): boolean {
    const connected = this.isAuthenticated && this.tokens !== null;
    console.log(`Google Calendar connection status: ${connected}, authenticated: ${this.isAuthenticated}, has tokens: ${this.tokens !== null}`);
    return connected;
  }

  private ensureAuthenticated(): void {
    if (!this.isConnected()) {
      throw new Error('Google Calendar authentication required');
    }
    this.auth.setCredentials(this.tokens);
  }

  async listCalendars(): Promise<GoogleCalendarInfo[]> {
    this.ensureAuthenticated();
    try {
      const response = await calendar.calendarList.list();
      const calendars = response.data.items || [];
      console.log(`Found ${calendars.length} calendars:`, calendars.map(c => `${c.summary} (${c.id})`));
      return calendars.map(cal => ({
        id: cal.id || '',
        summary: cal.summary || '',
        description: cal.description,
        primary: cal.primary
      }));
    } catch (error: any) {
      console.error('Error listing calendars:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to list calendars');
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    this.ensureAuthenticated();
    try {
      // Use very broad time range if not specified to capture all events
      const defaultTimeMin = new Date('2020-01-01T00:00:00.000Z').toISOString();
      const defaultTimeMax = new Date('2030-12-31T23:59:59.999Z').toISOString();

      const finalTimeMin = timeMin || defaultTimeMin;
      const finalTimeMax = timeMax || defaultTimeMax;

      console.log(`Fetching ALL events for calendar: ${calendarId}, timeMin: ${finalTimeMin}, timeMax: ${finalTimeMax}`);

      let allEvents: any[] = [];
      let pageToken: string | undefined = undefined;
      let pageCount = 0;

      // Paginate through all events
      do {
        pageCount++;
        console.log(`Fetching page ${pageCount} for calendar ${calendarId}${pageToken ? ` (token: ${pageToken.substring(0, 20)}...)` : ''}`);

        const response = await calendar.events.list({
          calendarId,
          timeMin: finalTimeMin,
          timeMax: finalTimeMax,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 2500,
          showDeleted: false,
          pageToken
        });

        const events = response.data.items || [];
        allEvents.push(...events);
        pageToken = response.data.nextPageToken;

        console.log(`Page ${pageCount}: Found ${events.length} events. Total so far: ${allEvents.length}`);

        // Safety break to prevent infinite loops
        if (pageCount > 50) {
          console.warn(`Reached maximum page limit (${pageCount}) for calendar ${calendarId}`);
          break;
        }
      } while (pageToken);

      console.log(`TOTAL: Found ${allEvents.length} events in calendar ${calendarId} across ${pageCount} pages`);

      return allEvents.map((event: any): GoogleCalendarEvent => {
        const attendees = event.attendees?.map((attendee: any) => ({
          email: attendee.email || '',
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || 'needsAction'
        }));

        return {
          id: event.id || '',
          summary: event.summary || 'Untitled Event',
          description: event.description || undefined,
          start: {
            dateTime: event.start?.dateTime || (event.start?.date ? event.start.date + 'T00:00:00' : ''),
            timeZone: event.start?.timeZone
          },
          end: {
            dateTime: event.end?.dateTime || (event.end?.date ? event.end.date + 'T23:59:59' : ''),
            timeZone: event.end?.timeZone
          },
          status: event.status || 'confirmed',
          attendees
        };
      });
    } catch (error: any) {
      console.error(`Error fetching events from calendar ${calendarId}:`, error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to fetch calendar events');
    }
  }

  async getAllEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      const calendars = await this.listCalendars();
      const allEvents: GoogleCalendarEvent[] = [];

      // Fetch events from all calendars in parallel for better performance
      const promises = calendars.map(async (cal) => {
        try {
          const events = await this.getEvents(cal.id, timeMin, timeMax);
          return events.map(event => ({
            ...event,
            calendarId: cal.id,
            calendarName: cal.summary
          }));
        } catch (error) {
          console.log(`Skipping calendar ${cal.summary} due to error:`, error);
          return [];
        }
      });

      const results = await Promise.all(promises);
      results.forEach(events => allEvents.push(...events));

      console.log(`Total events found across all calendars: ${allEvents.length}`);
      return allEvents;
    } catch (error) {
      console.error('Error fetching all events:', error);
      throw error;
    }
  }

  async createEvent(calendarId: string = 'primary', eventData: any): Promise<GoogleCalendarEvent> {
    this.ensureAuthenticated();
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });

      const event = response.data;
      const calendarEvent: GoogleCalendarEvent = {
        id: event.id || '',
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || (event.start?.date ? event.start.date + 'T00:00:00' : ''),
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime || (event.end?.date ? event.end.date + 'T23:59:59' : ''),
          timeZone: event.end?.timeZone
        },
        status: event.status || 'confirmed',
        attendees: event.attendees?.map((a: any) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || 'needsAction'
        }))
      };

      // Sync created event to database
      await this.syncEventToDatabase(calendarEvent, calendarId);

      return calendarEvent;
    } catch (error: any) {
      console.error('Error creating calendar event:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(calendarId: string = 'primary', eventId: string, eventData: any): Promise<GoogleCalendarEvent> {
    this.ensureAuthenticated();
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData
      });

      const event = response.data;
      const calendarEvent: GoogleCalendarEvent = {
        id: event.id || '',
        summary: event.summary || 'Untitled Event',
        description: event.description || undefined,
        start: {
          dateTime: event.start?.dateTime || (event.start?.date ? event.start.date + 'T00:00:00' : ''),
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime || (event.end?.date ? event.end.date + 'T23:59:59' : ''),
          timeZone: event.end?.timeZone
        },
        status: event.status || 'confirmed',
        attendees: event.attendees?.map((a: any) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || 'needsAction'
        }))
      };

      // Sync updated event to database
      await this.syncEventToDatabase(calendarEvent, calendarId);

      return calendarEvent;
    } catch (error: any) {
      console.error('Error updating calendar event:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    this.ensureAuthenticated();
    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });

      // Remove from database
      await this.removeEventFromDatabase(eventId);
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to delete calendar event');
    }
  }

  // Database integration methods
  async syncEventToDatabase(event: GoogleCalendarEvent, calendarId: string, calendarName?: string, therapistId: string = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query(`
          INSERT INTO calendar_events (
            google_event_id, google_calendar_id, calendar_name, therapist_id,
            summary, description, start_time, end_time, time_zone, location,
            status, attendees, is_all_day, last_sync_time
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, NOW())
          ON CONFLICT (google_event_id) DO UPDATE SET
            summary = EXCLUDED.summary,
            description = EXCLUDED.description,
            start_time = EXCLUDED.start_time,
            end_time = EXCLUDED.end_time,
            time_zone = EXCLUDED.time_zone,
            location = EXCLUDED.location,
            status = EXCLUDED.status,
            attendees = EXCLUDED.attendees,
            is_all_day = EXCLUDED.is_all_day,
            last_sync_time = NOW(),
            updated_at = NOW()
        `, [
          event.id,
          calendarId,
          calendarName,
          therapistId,
          event.summary,
          event.description || null,
          event.start.dateTime,
          event.end.dateTime,
          event.start.timeZone || null,
          null, // location - not provided in current GoogleCalendarEvent interface
          event.status,
          JSON.stringify(event.attendees || []),
          false, // is_all_day - will be enhanced later
        ]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error syncing event to database:', error);
    }
  }

  async removeEventFromDatabase(eventId: string): Promise<void> {
    try {
      const client = await pool.connect();
      try {
        await client.query('DELETE FROM calendar_events WHERE google_event_id = $1', [eventId]);
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error removing event from database:', error);
    }
  }

  async syncAllEventsToDatabase(therapistId: string = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'): Promise<void> {
    try {
      console.log('Starting full calendar sync to database...');
      const calendars = await this.listCalendars();

      for (const cal of calendars) {
        console.log(`Syncing calendar: ${cal.summary} (${cal.id})`);
        const events = await this.getEvents(cal.id);

        for (const event of events) {
          await this.syncEventToDatabase(event, cal.id, cal.summary, therapistId);
        }
        console.log(`Synced ${events.length} events from ${cal.summary}`);
      }
      console.log('Calendar sync completed');
    } catch (error) {
      console.error('Error during calendar sync:', error);
      throw error;
    }
  }

  async getEventsFromDatabase(therapistId: string = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', timeMin?: string, timeMax?: string): Promise<CalendarEvent[]> {
    try {
      const client = await pool.connect();
      try {
        let query = `
          SELECT * FROM calendar_events 
          WHERE therapist_id = $1
        `;
        const params = [therapistId];

        if (timeMin) {
          query += ` AND start_time >= $${params.length + 1}`;
          params.push(timeMin);
        }

        if (timeMax) {
          query += ` AND start_time <= $${params.length + 1}`;
          params.push(timeMax);
        }

        query += ` ORDER BY start_time ASC`;

        const result = await client.query(query, params);
        return result.rows.map(row => ({
          id: row.google_event_id,
          summary: row.summary,
          description: row.description,
          start: {
            dateTime: row.start_time,
            timeZone: row.time_zone
          },
          end: {
            dateTime: row.end_time,
            timeZone: row.time_zone
          },
          status: row.status,
          attendees: row.attendees,
          calendarId: row.google_calendar_id,
          calendarName: row.calendar_name,
          location: row.location,
          isAllDay: row.is_all_day
        }));
      } finally {
        client.release();
      }
    } catch (error) {
      console.error('Error fetching events from database:', error);
      return [];
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();