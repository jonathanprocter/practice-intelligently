// @ts-ignore
import { google } from 'googleapis';
// @ts-ignore  
import { OAuth2Client } from 'google-auth-library';

const oauth2Client = new OAuth2Client(
  process.env.GOOGLE_CLIENT_ID,
  process.env.GOOGLE_CLIENT_SECRET,
  process.env.GOOGLE_REDIRECT_URI || 'http://localhost:5000/api/auth/google/callback'
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

    return this.auth.generateAuthUrl({
      access_type: 'offline',
      scope: scopes,
      prompt: 'consent'
    });
  }

  async getAccessToken(code: string): Promise<void> {
    const { tokens } = await this.auth.getAccessToken(code);
    this.auth.setCredentials(tokens);
    
    // Store tokens securely (implement your storage logic)
    // For demo purposes, we'll use memory storage
    // In production, store in database with user association
  }

  async listCalendars() {
    try {
      const response = await calendar.calendarList.list();
      return response.data.items || [];
    } catch (error) {
      console.error('Error fetching calendars:', error);
      throw new Error('Failed to fetch calendars');
    }
  }

  async getEvents(calendarId: string = 'primary', timeMin?: string, timeMax?: string): Promise<GoogleCalendarEvent[]> {
    try {
      const response = await calendar.events.list({
        calendarId,
        timeMin: timeMin || new Date().toISOString(),
        timeMax: timeMax || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days
        singleEvents: true,
        orderBy: 'startTime',
      });

      return (response.data.items || []).map((event: any) => {
        const attendees = event.attendees?.map((attendee: any) => ({
          email: attendee.email!,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus || 'needsAction'
        }));
        
        return {
        id: event.id!,
        summary: event.summary || 'Untitled Event',
        description: event.description,
        start: {
          dateTime: event.start?.dateTime || event.start?.date + 'T00:00:00',
          timeZone: event.start?.timeZone
        },
        end: {
          dateTime: event.end?.dateTime || event.end?.date + 'T23:59:59',
          timeZone: event.end?.timeZone
        },
        status: event.status || 'confirmed',
        attendees
        };
      });
    } catch (error) {
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
        id: response.data.id!,
        summary: response.data.summary!,
        description: response.data.description,
        start: {
          dateTime: response.data.start?.dateTime!,
          timeZone: response.data.start?.timeZone
        },
        end: {
          dateTime: response.data.end?.dateTime!,
          timeZone: response.data.end?.timeZone
        },
        status: response.data.status!,
        attendees: response.data.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      };
    } catch (error) {
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
        id: response.data.id!,
        summary: response.data.summary!,
        description: response.data.description,
        start: {
          dateTime: response.data.start?.dateTime!,
          timeZone: response.data.start?.timeZone
        },
        end: {
          dateTime: response.data.end?.dateTime!,
          timeZone: response.data.end?.timeZone
        },
        status: response.data.status!,
        attendees: response.data.attendees?.map(attendee => ({
          email: attendee.email!,
          displayName: attendee.displayName,
          responseStatus: attendee.responseStatus || 'needsAction'
        }))
      };
    } catch (error) {
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
    } catch (error) {
      console.error('Error deleting event:', error);
      throw new Error('Failed to delete calendar event');
    }
  }
}

export const googleCalendarService = new GoogleCalendarService();