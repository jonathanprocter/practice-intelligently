// Google Calendar API integration
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

export class GoogleCalendarAPI {
  static async getEvents(therapistId: string, timeMin?: string, timeMax?: string, calendarId?: string): Promise<GoogleCalendarEvent[]> {
    try {
      const params = new URLSearchParams();
      if (timeMin) params.append('timeMin', timeMin);
      if (timeMax) params.append('timeMax', timeMax);
      if (calendarId) params.append('calendarId', calendarId);

      const response = await fetch(`/api/calendar/events/${therapistId}?${params.toString()}`);
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Google Calendar not connected. Please connect your calendar in settings.');
        }
        throw new Error('Failed to fetch calendar events');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching Google Calendar events:', error);
      throw error;
    }
  }

  static async getCalendars(): Promise<GoogleCalendarItem[]> {
    try {
      const response = await fetch('/api/calendar/calendars');
      
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Google Calendar not connected. Please connect your calendar in settings.');
        }
        throw new Error('Failed to fetch calendars');
      }
      
      return await response.json();
    } catch (error) {
      console.error('Error fetching Google calendars:', error);
      throw error;
    }
  }

  static async createEvent(eventData: {
    summary: string;
    description?: string;
    start: { dateTime: string; timeZone?: string };
    end: { dateTime: string; timeZone?: string };
    attendees?: Array<{ email: string }>;
    calendarId?: string;
  }): Promise<GoogleCalendarEvent> {
    try {
      const response = await fetch('/api/calendar/events', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to create calendar event');
      }

      return await response.json();
    } catch (error) {
      console.error('Error creating calendar event:', error);
      throw error;
    }
  }

  static async updateEvent(eventId: string, eventData: unknown): Promise<GoogleCalendarEvent> {
    try {
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(eventData),
      });

      if (!response.ok) {
        throw new Error('Failed to update calendar event');
      }

      return await response.json();
    } catch (error) {
      console.error('Error updating calendar event:', error);
      throw error;
    }
  }

  static async deleteEvent(eventId: string, calendarId?: string): Promise<void> {
    try {
      const params = calendarId ? `?calendarId=${calendarId}` : '';
      const response = await fetch(`/api/calendar/events/${eventId}${params}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete calendar event');
      }
    } catch (error) {
      console.error('Error deleting calendar event:', error);
      throw error;
    }
  }

  static connectGoogleCalendar(): void {
    window.location.href = '/api/auth/google';
  }
}