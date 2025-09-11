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
    return uri;
  }
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    const uri = `https://${domain}/api/auth/google/callback`;
    return uri;
  }
  // For local development
  const uri = 'http://0.0.0.0:5000/api/auth/google/callback';
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
      console.log('Successfully connected with Google Calendar');
    } catch (error: any) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to connect with Google Calendar');
    }
  }

  isConnected(): boolean {
    const connected = this.tokens !== null;
    console.log(`Google Calendar connection status: ${connected}, has tokens: ${this.tokens !== null}`);
    return connected;
  }

  private ensureConnected(): void {
    if (!this.isConnected()) {
      throw new Error('Google Calendar connection required');
    }
    this.auth.setCredentials(this.tokens);
  }

  async listCalendars(): Promise<GoogleCalendarInfo[]> {
    this.ensureConnected();
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
        throw new Error('Google Calendar connection required');
      }
      throw new Error('Failed to list calendars');
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    this.ensureConnected();
    try {
      // Use very broad time range if not specified to capture all events from 2019-2030
      const defaultTimeMin = new Date('2019-01-01T00:00:00.000Z').toISOString();
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
          maxResults: 2500,
          singleEvents: true,
          orderBy: 'startTime',
          pageToken
        });

        const events = response.data.items || [];
        allEvents = allEvents.concat(events);
        pageToken = response.data.nextPageToken;

        console.log(`  Page ${pageCount}: ${events.length} events (total so far: ${allEvents.length})`);
      } while (pageToken);

      console.log(`✅ Successfully fetched ${allEvents.length} total events from ${calendarId}`);

      return allEvents.map(event => ({
        id: event.id || '',
        summary: event.summary || '',
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date || '',
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date || '',
          timeZone: event.end?.timeZone
        },
        status: event.status,
        attendees: event.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        }))
      }));
    } catch (error: any) {
      console.error('Error getting events:', error);
      if (error.code === 401 || error.code === 403) {
        throw new Error('Google Calendar connection required');
      }
      throw new Error('Failed to get events');
    }
  }

  async createEvent(event: GoogleCalendarEventBase, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    this.ensureConnected();
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: event
      });

      const createdEvent = response.data;
      return {
        id: createdEvent.id || '',
        summary: createdEvent.summary || '',
        description: createdEvent.description,
        start: {
          dateTime: createdEvent.start?.dateTime || createdEvent.start?.date || '',
          timeZone: createdEvent.start?.timeZone
        },
        end: {
          dateTime: createdEvent.end?.dateTime || createdEvent.end?.date || '',
          timeZone: createdEvent.end?.timeZone
        },
        status: createdEvent.status,
        attendees: createdEvent.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        }))
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      if (error.code === 401 || error.code === 403) {
        throw new Error('Google Calendar connection required');
      }
      throw new Error('Failed to create event');
    }
  }

  async updateEvent(eventId: string, event: Partial<GoogleCalendarEventBase>, calendarId: string = 'primary'): Promise<GoogleCalendarEvent> {
    this.ensureConnected();
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: event as any
      });

      const updatedEvent = response.data;
      return {
        id: updatedEvent.id || '',
        summary: updatedEvent.summary || '',
        description: updatedEvent.description,
        start: {
          dateTime: updatedEvent.start?.dateTime || updatedEvent.start?.date || '',
          timeZone: updatedEvent.start?.timeZone
        },
        end: {
          dateTime: updatedEvent.end?.dateTime || updatedEvent.end?.date || '',
          timeZone: updatedEvent.end?.timeZone
        },
        status: updatedEvent.status,
        attendees: updatedEvent.attendees?.map((attendee: any) => ({
          email: attendee.email,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus
        }))
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      if (error.code === 401 || error.code === 403) {
        throw new Error('Google Calendar connection required');
      }
      throw new Error('Failed to update event');
    }
  }

  async deleteEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    this.ensureConnected();
    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });
      console.log(`Event ${eventId} deleted successfully`);
    } catch (error: any) {
      console.error('Error deleting event:', error);
      if (error.code === 401 || error.code === 403) {
        throw new Error('Google Calendar connection required');
      }
      throw new Error('Failed to delete event');
    }
  }

  async refreshTokens(): Promise<void> {
    try {
      if (!this.tokens?.refresh_token) {
        throw new Error('No refresh token available');
      }

      console.log('Refreshing Google Calendar tokens...');
      this.auth.setCredentials(this.tokens);
      const { credentials } = await this.auth.refreshAccessToken();
      this.tokens = credentials;
      this.auth.setCredentials(this.tokens);
      console.log('Google Calendar tokens refreshed successfully');
    } catch (error: any) {
      console.error('Error refreshing tokens:', error);
      throw new Error('Failed to refresh Google Calendar tokens');
    }
  }

  async verifyGoogleTokens(): Promise<boolean> {
    try {
      if (!this.tokens) {
        return false;
      }
      this.auth.setCredentials(this.tokens);
      
      // Try to list calendars as a test
      await calendar.calendarList.list({ maxResults: 1 });
      return true;
    } catch (error: any) {
      console.error('Google token verification failed:', error);
      if (error.code === 401 && this.tokens?.refresh_token) {
        try {
          await this.refreshTokens();
          return true;
        } catch (refreshError) {
          console.error('Google token refresh failed:', refreshError);
          return false;
        }
      }
      return false;
    }
  }

  setTokens(tokens: any): void {
    this.tokens = tokens;
    this.auth.setCredentials(tokens);
  }

  getTokens(): any {
    return this.tokens;
  }

  async syncWithDatabase(therapistId: string, appointments: any[]): Promise<void> {
    // Sync appointments with database
    for (const appointment of appointments) {
      try {
        // Check if appointment exists in database
        const result = await pool.query(
          'SELECT id FROM appointments WHERE google_event_id = $1',
          [appointment.id]
        );

        if (result.rows.length === 0) {
          // Create new appointment in database
          await pool.query(
            `INSERT INTO appointments (
              therapist_id, 
              client_id, 
              google_event_id, 
              title, 
              scheduled_datetime, 
              duration_minutes, 
              status
            ) VALUES ($1, $2, $3, $4, $5, $6, $7)`,
            [
              therapistId,
              null, // Client ID would be determined from attendees
              appointment.id,
              appointment.summary,
              appointment.start.dateTime,
              30, // Default duration
              'scheduled'
            ]
          );
        }
      } catch (error) {
        console.error('Error syncing appointment:', error);
      }
    }
  }
}

// Export a singleton instance
export const googleCalendarService = new GoogleCalendarService();