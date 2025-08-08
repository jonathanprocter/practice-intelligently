import { apiRequest } from "./queryClient";

export interface DashboardStats {
  todaysSessions: number;
  activeClients: number;
  urgentActionItems: number;
  completionRate: number;
  calendarIntegrated?: boolean;
  calendarEvents?: number;
}

export interface Client {
  id: string;
  clientNumber?: string;
  firstName: string;
  lastName: string;
  preferredName?: string;
  pronouns?: string;
  email?: string;
  phone?: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  address?: unknown;
  emergencyContact?: unknown;
  insuranceInfo?: unknown;
  medicalHistory?: unknown;
  medications?: unknown;
  allergies?: unknown;
  referralSource?: string;
  primaryConcerns?: unknown;
  therapistId?: string;
  status: string;
  riskLevel?: string;
  consentStatus?: unknown;
  hipaaSignedDate?: string;
  lastContact?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  startTime: string;
  endTime: string;
  type: string;
  status: string;
  notes?: string;
  location?: string;
  clientName?: string; // Added from backend join
  clientFirstName?: string;
  clientLastName?: string;
}

export interface ActionItem {
  id: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  status: 'pending' | 'in_progress' | 'completed';
  dueDate?: string;
  clientId?: string;
}

export interface AiInsight {
  id: string;
  type: string;
  title: string;
  content: string;
  confidence?: number;
  isRead: boolean;
  createdAt: string;
}

export interface Activity {
  id: string;
  type: 'session' | 'ai_analysis' | 'appointment' | 'goal' | 'sync' | 'other';
  title: string;
  description: string;
  timestamp: string;
}

export interface SessionNote {
  id: string;
  appointmentId?: string;
  eventId?: string;
  clientId: string;
  therapistId: string;
  content: string;
  transcript?: string;
  aiSummary?: string;
  tags?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CalendarEvent {
  id: string;
  title: string;
  start: Date;
  end: Date;
  description?: string;
  location?: string;
  clientName?: string;
}

export interface ApiStatus {
  service: string;
  status: 'online' | 'offline' | 'checking';
  lastChecked?: string;
  error?: string;
}

export class ApiClient {
  private static get therapistId(): string {
    // Use the demo therapist ID for live data
    return 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  }

  static async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiRequest('GET', `/api/dashboard/stats/${this.therapistId}`);
    return response.json();
  }

  static async getTodaysCalendarEvents(): Promise<any[]> {
    try {
      const response = await fetch('/api/oauth/events/today');
      if (response.ok) {
        return response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching calendar events:', error);
      return [];
    }
  }

  static async getSessionNotes(): Promise<SessionNote[]> {
    try {
      const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'; // Use the demo therapist ID
      const response = await fetch(`/api/session-notes/therapist/${therapistId}`);
      if (response.ok) {
        return response.json();
      }
      return [];
    } catch (error) {
      console.error('Error fetching session notes:', error);
      return [];
    }
  }

  static async updateSessionNote(id: string, updates: Partial<SessionNote>): Promise<SessionNote> {
    const response = await apiRequest('PUT', `/api/session-notes/${id}`, updates);
    return response.json();
  }

  static async deleteSessionNote(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/session-notes/${id}`);
  }

  static async generateSessionPrep(sessionNoteId: string, clientId: string): Promise<{ appointmentsUpdated: number }> {
    const response = await apiRequest('/api/session-prep/generate', {
      method: 'POST',
      body: JSON.stringify({ sessionNoteId, clientId }),
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  static async generateSessionNoteTags(sessionNoteId: string): Promise<SessionNote> {
    const response = await apiRequest(`/api/session-notes/${sessionNoteId}/generate-tags`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    return response.json();
  }

  static async getClients(): Promise<Client[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/clients/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async getClient(id: string): Promise<Client> {
    const response = await apiRequest('GET', `/api/clients/detail/${id}`);
    return response.json();
  }

  static async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('POST', '/api/clients', {
      ...client,
      therapistId: FALLBACK_THERAPIST_ID
    });
    return response.json();
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const response = await apiRequest('PUT', `/api/clients/${id}`, updates);
    return response.json();
  }

  static async getTodaysAppointments(): Promise<Appointment[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

    try {
      // Use the hardcoded demo therapist ID consistently
      const therapistId = FALLBACK_THERAPIST_ID;

      // Get database appointments first (they're synced with Google Calendar and have proper client names)
      try {
        const dbResponse = await apiRequest('GET', `/api/appointments/today/${therapistId}`);
        const dbAppointments = await dbResponse.json();

        // Database appointments already have proper client names and are synced with Google Calendar
        // No need to combine with calendar events since they're duplicates
        return dbAppointments;
      } catch (dbError) {
        console.warn('Database appointments fetch failed, falling back to calendar events');

        // Fallback: Get Google Calendar events only if database fails
        try {
          const calendarResponse = await apiRequest('GET', '/api/oauth/events/today');
          const calendarEvents = await calendarResponse.json();

          // Convert Google Calendar events to appointment format
          const calendarAppointments: Appointment[] = calendarEvents.map((event: any) => ({
            id: event.id || `calendar-${Date.now()}`,
            clientId: 'calendar-event',
            startTime: event.start?.dateTime || event.start?.date,
            endTime: event.end?.dateTime || event.end?.date,
            type: event.summary || 'Calendar Event',
            status: 'confirmed',
            notes: event.description || ''
          }));

          return calendarAppointments;
        } catch (calendarError) {
          console.warn('Both database and calendar fetch failed');
          return [];
        }
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Final fallback - return empty array to prevent crashes
      return [];
    }
  }

  static async getGoogleCalendarEvents(): Promise<any[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/appointments/today/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async getAppointments(date?: string): Promise<Appointment[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

    // If asking for today's date, use the combined approach
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      return this.getTodaysAppointments();
    }

    const url = date 
      ? `/api/appointments/${FALLBACK_THERAPIST_ID}?date=${date}`
      : `/api/appointments/${FALLBACK_THERAPIST_ID}`;
    const response = await apiRequest('GET', url);
    return response.json();
  }

  static async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

    const response = await apiRequest('POST', '/api/appointments', {
      ...appointment,
      therapistId: FALLBACK_THERAPIST_ID
    });
    return response.json();
  }

  static async updateAppointment(id: string, updates: Partial<Appointment>): Promise<Appointment> {
    const response = await apiRequest('PUT', `/api/appointments/${id}`, updates);
    return response.json();
  }

  static async updateAppointmentStatus(id: string, status: string, reason?: string): Promise<Appointment> {
    const response = await apiRequest('PATCH', `/api/appointments/${id}/status`, { status, reason });
    return response.json();
  }

  static async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const response = await apiRequest('DELETE', `/api/appointments/${id}`, { reason });
    return response.json();
  }

  static async deleteCalendarEvent(eventId: string, calendarId: string = 'primary'): Promise<void> {
    const response = await apiRequest('DELETE', `/api/calendar/events/${eventId}?calendarId=${calendarId}`);
    if (!response.ok) {
      throw new Error('Failed to delete calendar event');
    }
  }

  static async getAppointment(id: string): Promise<Appointment> {
    const response = await apiRequest('GET', `/api/appointments/detail/${id}`);
    return response.json();
  }

  static async getActionItems(): Promise<ActionItem[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/action-items/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async getUrgentActionItems(): Promise<ActionItem[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/action-items/urgent/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async createActionItem(item: Omit<ActionItem, 'id'>): Promise<ActionItem> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('POST', '/api/action-items', {
      ...item,
      therapistId: FALLBACK_THERAPIST_ID
    });
    return response.json();
  }

  static async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    const response = await apiRequest('PATCH', `/api/action-items/${id}`, updates);
    return response.json();
  }

  static async getAiInsights(): Promise<AiInsight[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/ai-insights/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async generateAiInsights(): Promise<AiInsight[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('POST', `/api/ai/generate-insights/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async createSessionNote(note: {
    appointmentId: string;
    clientId: string;
    content: string;
    transcript?: string;
  }): Promise<any> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('POST', '/api/session-notes', {
      ...note,
      therapistId: FALLBACK_THERAPIST_ID
    });
    return response.json();
  }

  static async getApiStatuses(): Promise<ApiStatus[]> {
    const response = await apiRequest('GET', '/api/health/ai-services');
    return response.json();
  }

  static async getTodaysSessionNotes(): Promise<SessionNote[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/session-notes/today/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }

  static async getCalendarConnectionStatus(): Promise<{ connected: boolean }> {
    const response = await apiRequest('GET', '/api/oauth/is-connected');
    return response.json();
  }

  // User profile management
  static async getUser(userId: string): Promise<any> {
    const response = await apiRequest('GET', `/api/users/${userId}`);
    return response.json();
  }

  static async updateUser(userId: string, userData: any): Promise<any> {
    const response = await apiRequest('PATCH', `/api/users/${userId}`, userData);
    return response.json();
  }

  // Recent Activity
  static async getRecentActivity(): Promise<Activity[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    const response = await apiRequest('GET', `/api/recent-activity/${FALLBACK_THERAPIST_ID}`);
    return response.json();
  }
}