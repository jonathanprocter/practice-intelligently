// lib/api.ts
import { apiRequest } from "./queryClient";

// Types remain the same as your original file
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
  clientName?: string;
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
  title?: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  tonalAnalysis?: string;
  keyPoints?: string[];
  significantQuotes?: string[];
  narrativeSummary?: string;
  sessionDate?: string;
  aiTags?: string[];
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

// API Client with context-aware methods
export class ApiClient {
  // Store therapist ID in a static variable that can be set
  private static currentTherapistId: string | null = null;

  // Method to set the current therapist ID
  static setTherapistId(therapistId: string | null) {
    this.currentTherapistId = therapistId;
  }

  // Get therapist ID with fallback for backwards compatibility
  private static get therapistId(): string {
    if (this.currentTherapistId) {
      return this.currentTherapistId;
    }

    // Try to get from localStorage as fallback
    const storedAuth = localStorage.getItem('auth');
    if (storedAuth) {
      try {
        const auth = JSON.parse(storedAuth);
        if (auth.therapistId) {
          return auth.therapistId;
        }
      } catch (e) {
        console.warn('Failed to parse stored auth');
      }
    }

    // Ultimate fallback for demo purposes - remove in production
    console.warn('Using fallback therapist ID - this should not happen in production');
    return 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
  }

  // Auth methods
  static async login(email: string, password: string): Promise<any> {
    const response = await apiRequest('POST', '/api/auth/login', { email, password });
    const data = await response.json();

    // Set the therapist ID after successful login
    if (data.therapistId) {
      this.setTherapistId(data.therapistId);
    }

    return data;
  }

  static async logout(): Promise<void> {
    await apiRequest('POST', '/api/auth/logout');
    this.setTherapistId(null);
  }

  static async verifyAuth(): Promise<boolean> {
    try {
      const response = await apiRequest('GET', '/api/auth/verify');
      return response.ok;
    } catch {
      return false;
    }
  }

  static async refreshToken(): Promise<any> {
    const response = await apiRequest('POST', '/api/auth/refresh');
    return response.json();
  }

  // Dashboard methods
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

  // Session Notes methods
  static async getSessionNotes(): Promise<SessionNote[]> {
    try {
      const response = await fetch(`/api/session-notes/therapist/${this.therapistId}`);
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
    const response = await apiRequest('POST', '/api/session-prep/generate', { sessionNoteId, clientId });
    return response.json();
  }

  static async generateSessionNoteTags(sessionNoteId: string): Promise<SessionNote> {
    const response = await apiRequest('POST', `/api/session-notes/${sessionNoteId}/generate-tags`);
    return response.json();
  }

  // Client methods
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

  static async deleteClient(id: string): Promise<void> {
    await apiRequest('DELETE', `/api/clients/${id}`);
  }

  // Appointment methods
  static async getTodaysAppointments(): Promise<Appointment[]> {
    try {
      let dbAppointments: Appointment[] = [];
      let calendarEvents: any[] = [];

      // Fetch database appointments
      try {
        const dbResponse = await apiRequest('GET', `/api/appointments/today/${this.therapistId}`);
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

      // Convert and combine appointments
      const calendarAppointments = this.processCalendarEvents(calendarEvents);
      return this.combineAppointments(dbAppointments, calendarAppointments);

    } catch (error) {
      console.error('Error fetching appointments:', error);
      return [];
    }
  }

  private static processCalendarEvents(events: any[]): Appointment[] {
    return events
      .filter((event: any) => {
        const summary = event.summary || '';
        const lowerSummary = summary.toLowerCase();

        const isAppointment = lowerSummary.includes('appointment') || 
                             lowerSummary.includes('session') || 
                             lowerSummary.includes('therapy');

        const isProfessionalMeeting = lowerSummary.includes('meeting with') ||
                                     lowerSummary.includes('call with') ||
                                     lowerSummary.includes('coffee with');

        const isExcluded = lowerSummary.includes('birthday') ||
                          lowerSummary.includes('holiday') ||
                          lowerSummary.includes('vacation') ||
                          lowerSummary.includes('flight');

        return (isAppointment || isProfessionalMeeting) && !isExcluded;
      })
      .map((event: any) => {
        const summary = event.summary || '';
        let clientName = summary;

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
          therapistId: this.therapistId,
          startTime: new Date(event.start?.dateTime || event.start?.date),
          endTime: new Date(event.end?.dateTime || event.end?.date),
          type: 'therapy',
          status: 'confirmed' as const,
          notes: event.description || '',
          location: event.location || '',
          isCalendarEvent: true,
          googleEventId: event.id
        };
      });
  }

  private static combineAppointments(
    dbAppointments: Appointment[], 
    calendarAppointments: Appointment[]
  ): Appointment[] {
    const combinedAppointments = [...dbAppointments];

    for (const calendarAppt of calendarAppointments) {
      const isDuplicate = dbAppointments.some(dbAppt => {
        const dbTime = new Date(dbAppt.startTime).getTime();
        const calTime = new Date(calendarAppt.startTime).getTime();
        const timeDiff = Math.abs(dbTime - calTime);
        return timeDiff < 60000 && 
               (dbAppt.clientName?.toLowerCase() === calendarAppt.clientName?.toLowerCase() ||
                dbAppt.googleEventId === calendarAppt.googleEventId);
      });

      if (!isDuplicate) {
        combinedAppointments.push(calendarAppt);
      }
    }

    return combinedAppointments.sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }

  static async getAppointments(date?: string): Promise<Appointment[]> {
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

  static async cancelAppointment(id: string, reason?: string): Promise<Appointment> {
    const response = await apiRequest('DELETE', `/api/appointments/${id}`, { reason });
    return response.json();
  }

  // Action Items methods
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

  // AI Insights methods
  static async getAiInsights(): Promise<AiInsight[]> {
    const response = await apiRequest('GET', `/api/ai-insights/${this.therapistId}`);
    return response.json();
  }

  static async generateAiInsights(): Promise<AiInsight[]> {
    const response = await apiRequest('POST', `/api/ai/generate-insights/${this.therapistId}`);
    return response.json();
  }

  // Session methods
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

  static async getTodaysSessionNotes(): Promise<SessionNote[]> {
    const response = await apiRequest('GET', `/api/session-notes/today/${this.therapistId}`);
    return response.json();
  }

  // Service Status methods
  static async getApiStatuses(): Promise<ApiStatus[]> {
    const response = await apiRequest('GET', '/api/health/ai-services');
    return response.json();
  }

  static async getCalendarConnectionStatus(): Promise<{ connected: boolean }> {
    const response = await apiRequest('GET', '/api/oauth/is-connected');
    return response.json();
  }

  // Activity methods
  static async getRecentActivity(): Promise<Activity[]> {
    const response = await apiRequest('GET', `/api/recent-activity/${this.therapistId}`);
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