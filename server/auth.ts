import { google } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';

// Get the correct redirect URI based on environment
const getRedirectUri = () => {
  // Check if we're running on Replit
  if (process.env.REPLIT_DEV_DOMAIN) {
    const uri = `https://${process.env.REPLIT_DEV_DOMAIN}/api/auth/google/callback`;
    console.log('Using REPLIT_DEV_DOMAIN redirect URI:', uri);
    return uri;
  }
  if (process.env.REPLIT_DOMAINS) {
    const domain = process.env.REPLIT_DOMAINS.split(',')[0];
    const uri = `https://${domain}/api/auth/google/callback`;
    console.log('Using REPLIT_DOMAINS redirect URI:', uri);
    return uri;
  }
  // For local development
  const uri = 'http://localhost:5000/api/auth/google/callback';
  console.log('Using localhost redirect URI:', uri);
  return uri;
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

    console.log('Generating OAuth URL with redirect URI:', getRedirectUri());
    console.log('Using Client ID:', process.env.GOOGLE_CLIENT_ID?.substring(0, 20) + '...');

    const authUrl = this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent',
      include_granted_scopes: true
    });

    console.log('Generated OAuth URL:', authUrl);
    return authUrl;
  }

  async getAccessToken(code: string): Promise<void> {
    try {
      console.log('Exchanging authorization code for tokens...');
      const { tokens } = await this.auth.getToken(code);
      console.log('Successfully received tokens:', Object.keys(tokens));
      this.tokens = tokens;
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
    return this.isAuthenticated && this.tokens !== null;
  }

  private ensureAuthenticated(): void {
    if (!this.isConnected()) {
      throw new Error('Google Calendar authentication required');
    }
    this.auth.setCredentials(this.tokens);
  }

  async listCalendars(): Promise<any[]> {
    this.ensureAuthenticated();
    try {
      const response = await calendar.calendarList.list();
      const calendars = response.data.items || [];
      console.log(`Found ${calendars.length} calendars:`, calendars.map(c => `${c.summary} (${c.id})`));
      return calendars;
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
        attendees: event.attendees?.map((a: any) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || 'needsAction'
        }))
      };
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
        attendees: event.attendees?.map((a: any) => ({
          email: a.email || '',
          displayName: a.displayName || undefined,
          responseStatus: a.responseStatus || 'needsAction'
        }))
      };
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
    } catch (error: any) {
      console.error('Error deleting calendar event:', error);
      if (error.code === 401 || error.code === 403) {
        this.isAuthenticated = false;
        throw new Error('Google Calendar authentication required');
      }
      throw new Error('Failed to delete calendar event');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();