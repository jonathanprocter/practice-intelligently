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
  clientId?: string;
  therapistId: string;
  type: string;
  title: string;
  content: string;
  confidence?: string;
  metadata?: any;
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

  static async deleteClient(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/clients/${id}`);
  }

  static async getTodaysAppointments(): Promise<Appointment[]> {
    const FALLBACK_THERAPIST_ID = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

    try {
      // Get both database appointments and calendar events to ensure complete coverage
      let dbAppointments: Appointment[] = [];
      let calendarEvents: any[] = [];

      // Fetch database appointments
      try {
        const dbResponse = await apiRequest('GET', `/api/appointments/today/${FALLBACK_THERAPIST_ID}`);
        dbAppointments = await dbResponse.json();
      } catch (dbError) {
        console.warn('Database appointments fetch failed:', dbError);
      }

      // Fetch calendar events for today
      try {
        const today = new Date();
        const timeMin = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const timeMax = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59, 999).toISOString();
        
        const calendarResponse = await apiRequest('GET', `/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}`);
        calendarEvents = await calendarResponse.json();
      } catch (calendarError) {
        console.warn('Calendar events fetch failed:', calendarError);
      }

      // Convert calendar events to appointment format, filtering out non-appointment events
      const calendarAppointments: Appointment[] = calendarEvents
        .filter((event: any) => {
          // Include events that look like appointments, meetings, or professional sessions
          const summary = event.summary || '';
          const lowerSummary = summary.toLowerCase();
          
          // Include if it contains appointment/session/therapy keywords
          const isAppointment = lowerSummary.includes('appointment') || 
                               lowerSummary.includes('session') || 
                               lowerSummary.includes('therapy');
          
          // Include professional meetings/calls with specific people (Blake, Nora, etc.)
          const isProfessionalMeeting = lowerSummary.includes('meeting with') ||
                                       lowerSummary.includes('call with') ||
                                       lowerSummary.includes('coffee with') ||
                                       (lowerSummary.includes('with') && 
                                        (lowerSummary.includes('blake') || 
                                         lowerSummary.includes('nora')));
          
          // Exclude non-professional events
          const isExcluded = lowerSummary.includes('birthday') ||
                            lowerSummary.includes('holiday') ||
                            lowerSummary.includes('vacation') ||
                            lowerSummary.includes('flight');
          
          return (isAppointment || isProfessionalMeeting) && !isExcluded;
        })
        .map((event: any) => {
          // Extract client name from event summary
          const summary = event.summary || '';
          let clientName = summary;
          
          // Handle different formats:
          // "Chris Balabanick Appointment" -> "Chris Balabanick"
          // "Coffee with Nora" -> "Nora"
          // "Call with Blake" -> "Blake"
          // "Meeting with John Doe" -> "John Doe"
          if (summary.toLowerCase().includes('appointment')) {
            clientName = summary.replace(/\s+appointment$/i, '').trim();
          } else if (summary.toLowerCase().match(/(coffee|call|meeting)\s+with\s+(.+)/i)) {
            const match = summary.match(/(coffee|call|meeting)\s+with\s+(.+)/i);
            clientName = match ? match[2].trim() : summary;
          }

          return {
            id: event.id || `calendar-${event.summary}-${event.start?.dateTime}`,
            clientId: `calendar-${clientName.replace(/\s+/g, '-').toLowerCase()}`,
            clientName: clientName,
            therapistId: FALLBACK_THERAPIST_ID,
            startTime: new Date(event.start?.dateTime || event.start?.date),
            endTime: new Date(event.end?.dateTime || event.end?.date),
            type: 'therapy',
            status: 'confirmed' as const,
            notes: event.description || '',
            location: event.location || '',
            isCalendarEvent: true, // Flag to distinguish from database appointments
            googleEventId: event.id
          };
        });

      // Combine appointments, avoiding duplicates
      // Database appointments take priority over calendar events for the same time/client
      const combinedAppointments = [...dbAppointments];
      
      for (const calendarAppt of calendarAppointments) {
        // Check if there's already a database appointment for the same time and client
        const isDuplicate = dbAppointments.some(dbAppt => {
          const dbTime = new Date(dbAppt.startTime).getTime();
          const calTime = new Date(calendarAppt.startTime).getTime();
          const timeDiff = Math.abs(dbTime - calTime);
          return timeDiff < 60000 && // Within 1 minute
                 (dbAppt.clientName?.toLowerCase() === calendarAppt.clientName?.toLowerCase() ||
                  dbAppt.googleEventId === calendarAppt.googleEventId);
        });

        if (!isDuplicate) {
          combinedAppointments.push(calendarAppt);
        }
      }

      // Sort by start time
      return combinedAppointments.sort((a, b) => 
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
      );

    } catch (error) {
      console.error('Error fetching appointments:', error);
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