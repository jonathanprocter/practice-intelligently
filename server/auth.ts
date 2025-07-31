import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  // Check if we're running on Replit
  if (process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS) {
    // Use the actual Replit domain from environment
    const domain = process.env.REPLIT_DEV_DOMAIN || process.env.REPLIT_DOMAINS;
    return `https://${domain}/api/auth/google/callback`;
  }
  return 'http://localhost:5000/api/auth/google/callback';
};

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  getRedirectUri()
);

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
  status: string;
  attendees?: Array<{
    email: string;
    displayName?: string;
    responseStatus: string;
  }>;
}

export class GoogleCalendarService {
  private auth: OAuth2Client;

  constructor() {
    this.auth = oauth2Client;
  }

  generateAuthUrl(): string {
    const scopes = [
      'https://www.googleapis.com/auth/calendar.readonly',
      'https://www.googleapis.com/auth/calendar.events'
    ];

    // Debug logging can be removed in production
    // console.log('Generating OAuth URL with redirect URI:', getRedirectUri());
    // console.log('Using Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getAccessToken(code: string): Promise<void> {
    try {
      const { tokens } = await this.auth.getToken(code);
      this.auth.setCredentials(tokens);
      console.log('Successfully authenticated with Google Calendar');
    } catch (error: any) {
      console.error('Error getting access token:', error);
      throw new Error('Failed to authenticate with Google Calendar');
    }
  }

  isAuthenticated(): boolean {
    return !!(this.auth.credentials?.access_token);
  }

  async listCalendars() {
    try {
      // Check if we have valid credentials
      if (!this.auth.credentials?.access_token) {
        throw new Error('No valid credentials - authentication required');
      }
      
      const response = await calendar.calendarList.list();
      const calendars = response.data.items || [];
      console.log(`Found ${calendars.length} calendars:`, calendars.map(c => `${c.summary} (${c.id})`));
      return calendars;
    } catch (error: any) {
      console.error('Error fetching calendars:', error);
      if (error.code === 403) {
        throw new Error('Insufficient permissions - please reconnect your Google Calendar');
      }
      if (error.code === 401) {
        throw new Error('Authentication required - please connect your Google Calendar');
      }
      throw new Error(`Failed to fetch calendars: ${error.message || 'Unknown error'}`);
    }
  }

  // New method to get events from all calendars
  async getAllEvents(timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      const calendars = await this.listCalendars();
      const allEvents: GoogleCalendarEvent[] = [];
      
      // Fetch events from all calendars in parallel
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
      console.error('Error fetching events from all calendars:', error);
      throw error;
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      // Check if we have valid credentials
      if (!this.auth.credentials?.access_token) {
        throw new Error('No valid credentials - authentication required');
      }
      
      // Use very broad time range - from 2023 to end of 2025
      const defaultTimeMin = new Date('2023-01-01T00:00:00.000Z').toISOString();
      const defaultTimeMax = new Date('2025-12-31T23:59:59.999Z').toISOString();
      
      const finalTimeMin = timeMin || defaultTimeMin;
      const finalTimeMax = timeMax || defaultTimeMax;
      
      console.log(`Fetching events for calendar: ${calendarId}, timeMin: ${finalTimeMin}, timeMax: ${finalTimeMax}`);
      
      const response = await calendar.events.list({
        calendarId,
        timeMin: finalTimeMin,
        timeMax: finalTimeMax,
        singleEvents: true,
        orderBy: 'startTime',
        maxResults: 250,
        showDeleted: false
      });

      const events = response.data.items || [];
      console.log(`Found ${events.length} events in calendar ${calendarId}`);

      return events.map((event: any): GoogleCalendarEvent => {
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
      console.error('Error fetching events:', error);
      throw new Error('Failed to fetch calendar events');
    }
  }

  async createEvent(calendarId: string = 'primary', eventData: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
  }): Promise<GoogleCalendarEvent> {
    try {
      const response = await calendar.events.insert({
        calendarId,
        requestBody: eventData
      });

      return {
        id: response.data.id || '',
        summary: response.data.summary || 'Untitled Event',
        description: response.data.description || undefined,
        start: {
          dateTime: response.data.start?.dateTime || '',
          timeZone: response.data.start?.timeZone
        },
        end: {
          dateTime: response.data.end?.dateTime || '',
          timeZone: response.data.end?.timeZone
        },
        status: response.data.status || 'confirmed',
        attendees: response.data.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      };
    } catch (error: any) {
      console.error('Error creating event:', error);
      throw new Error('Failed to create calendar event');
    }
  }

  async updateEvent(calendarId: string = 'primary', eventId: string, eventData: any): Promise<GoogleCalendarEvent> {
    try {
      const response = await calendar.events.update({
        calendarId,
        eventId,
        requestBody: eventData
      });

      return {
        id: response.data.id || '',
        summary: response.data.summary || 'Untitled Event',
        description: response.data.description || undefined,
        start: {
          dateTime: response.data.start?.dateTime || '',
          timeZone: response.data.start?.timeZone
        },
        end: {
          dateTime: response.data.end?.dateTime || '',
          timeZone: response.data.end?.timeZone
        },
        status: response.data.status || 'confirmed',
        attendees: response.data.attendees?.map(attendee => ({
          email: attendee.email || '',
          displayName: attendee.displayName || undefined,
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      };
    } catch (error: any) {
      console.error('Error updating event:', error);
      throw new Error('Failed to update calendar event');
    }
  }

  async deleteEvent(calendarId: string = 'primary', eventId: string): Promise<void> {
    try {
      await calendar.events.delete({
        calendarId,
        eventId
      });
    } catch (error: any) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();