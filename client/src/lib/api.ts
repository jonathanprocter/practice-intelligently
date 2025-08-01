import { apiRequest } from "./queryClient";

export interface DashboardStats {
  todaysSessions: number;
  activeClients: number;
  urgentActionItems: number;
  completionRate: number;
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
    const response = await apiRequest('GET', `/api/appointments/today/${this.therapistId}`);
    return response.json();
  }

  static async getAppointments(date?: string): Promise<Appointment[]> {
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
}
