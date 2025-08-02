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

  static async generateSessionPrep(sessionNoteId: string, clientId: string): Promise<any> {
    const response = await apiRequest('POST', '/api/ai/session-prep-from-note', {
      sessionNoteId,
      clientId
    });
    return response.json();
  }

  static async getClients(): Promise<Client[]> {
    const response = await apiRequest('GET', `/api/clients/${this.therapistId}`);
    return response.json();
  }

  static async getClient(id: string): Promise<Client> {
    const response = await apiRequest('GET', `/api/clients/detail/${id}`);
    return response.json();
  }

  static async createClient(client: Omit<Client, 'id' | 'createdAt' | 'updatedAt'>): Promise<Client> {
    const response = await apiRequest('POST', '/api/clients', {
      ...client,
      therapistId: this.therapistId
    });
    return response.json();
  }

  static async updateClient(id: string, updates: Partial<Client>): Promise<Client> {
    const response = await apiRequest('PUT', `/api/clients/${id}`, updates);
    return response.json();
  }

  static async getTodaysAppointments(): Promise<Appointment[]> {
    try {
      // Use hardcoded therapist ID - safe fallback
      const therapistId = this.therapistId;
      
      if (!therapistId) {
        console.warn('No therapist ID available, returning empty appointments');
        return [];
      }

      // First try to get Google Calendar events for today
      const calendarResponse = await fetch('/api/oauth/events/today');

      if (calendarResponse.ok) {
        const calendarEvents = await calendarResponse.json();

        // Convert Google Calendar events to appointment format
        const calendarAppointments: Appointment[] = calendarEvents.map((event: any) => ({
          id: event.id || `calendar-${Date.now()}`,
          clientId: 'calendar-event',
          therapistId: therapistId,
          startTime: event.start?.dateTime || event.start?.date,
          endTime: event.end?.dateTime || event.end?.date,
          type: event.summary || 'Calendar Event',
          status: 'confirmed',
          notes: event.description || ''
        }));

        // Also get database appointments
        try {
          const dbResponse = await apiRequest('GET', `/api/appointments/${therapistId}`);
          const dbAppointments = await dbResponse.json();

          // Combine and return both
          return [...calendarAppointments, ...dbAppointments];
        } catch (dbError) {
          // If database fails, return just calendar events
          return calendarAppointments;
        }
      } else {
        // Fallback to database appointments only
        const response = await apiRequest('GET', `/api/appointments/${therapistId}`);
        return response.json();
      }
    } catch (error) {
      console.error('Error fetching appointments:', error);
      // Final fallback to database with safe therapist ID
      try {
        const therapistId = this.therapistId;
        if (therapistId) {
          const response = await apiRequest('GET', `/api/appointments/${therapistId}`);
          return response.json();
        }
        return [];
      } catch (dbError) {
        return [];
      }
    }
  }

  static async getGoogleCalendarEvents(): Promise<any[]> {
    const response = await apiRequest('GET', `/api/appointments/today/${this.therapistId}`);
    return response.json();
  }

  static async getAppointments(date?: string): Promise<Appointment[]> {
    // If asking for today's date, use the combined approach
    const today = new Date().toISOString().split('T')[0];
    if (date === today) {
      return this.getTodaysAppointments();
    }

    const url = date 
      ? `/api/appointments/${this.therapistId}?date=${date}`
      : `/api/appointments/${this.therapistId}`;
    const response = await apiRequest('GET', url);
    return response.json();
  }

  static async createAppointment(appointment: Omit<Appointment, 'id'>): Promise<Appointment> {
    const response = await apiRequest('POST', '/api/appointments', {
      ...appointment,
      therapistId: this.therapistId
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
    const response = await apiRequest('GET', `/api/action-items/${this.therapistId}`);
    return response.json();
  }

  static async getUrgentActionItems(): Promise<ActionItem[]> {
    const response = await apiRequest('GET', `/api/action-items/urgent/${this.therapistId}`);
    return response.json();
  }

  static async createActionItem(item: Omit<ActionItem, 'id'>): Promise<ActionItem> {
    const response = await apiRequest('POST', '/api/action-items', {
      ...item,
      therapistId: this.therapistId
    });
    return response.json();
  }

  static async updateActionItem(id: string, updates: Partial<ActionItem>): Promise<ActionItem> {
    const response = await apiRequest('PATCH', `/api/action-items/${id}`, updates);
    return response.json();
  }

  static async getAiInsights(): Promise<AiInsight[]> {
    const response = await apiRequest('GET', `/api/ai-insights/${this.therapistId}`);
    return response.json();
  }

  static async generateAiInsights(): Promise<AiInsight[]> {
    const response = await apiRequest('POST', `/api/ai/generate-insights/${this.therapistId}`);
    return response.json();
  }

  static async createSessionNote(note: {
    appointmentId: string;
    clientId: string;
    content: string;
    transcript?: string;
  }): Promise<any> {
    const response = await apiRequest('POST', '/api/session-notes', {
      ...note,
      therapistId: this.therapistId
    });
    return response.json();
  }

  static async getApiStatuses(): Promise<ApiStatus[]> {
    const response = await apiRequest('GET', '/api/health/ai-services');
    return response.json();
  }

  static async getTodaysSessionNotes(): Promise<SessionNote[]> {
    const response = await apiRequest('GET', `/api/session-notes/today/${this.therapistId}`);
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
}