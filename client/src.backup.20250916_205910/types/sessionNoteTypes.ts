/**
 * Type definitions for Session Notes and Appointments
 */

export interface SessionNote {
  id: string;
  appointmentId?: string;
  eventId?: string;
  clientId: string;
  therapistId: string;
  content: string;
  createdAt: string;
  updatedAt?: string;
  aiTags?: string[];
  source?: 'manual' | 'upload' | 'import' | 'transcription';
  originalFilename?: string;
  metadata?: SessionNoteMetadata;
}

export interface SessionNoteMetadata {
  wordCount?: number;
  sentiment?: 'positive' | 'neutral' | 'negative';
  topics?: string[];
  keyPhrases?: string[];
  confidence?: number;
  processingDate?: string;
}

export interface Appointment {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  type: AppointmentType;
  status?: AppointmentStatus;
  location?: string;
  googleEventId?: string;
  clientId: string;
  therapistId: string;
  notes?: string;
  isRecurring?: boolean;
  recurringId?: string;
}

export type AppointmentType = 
  | 'initial_consultation'
  | 'regular_session'
  | 'emergency_session'
  | 'group_session'
  | 'phone_session'
  | 'video_session'
  | 'assessment'
  | 'follow_up'
  | 'other';

export type AppointmentStatus = 
  | 'scheduled'
  | 'confirmed'
  | 'completed'
  | 'cancelled'
  | 'no_show'
  | 'rescheduled';

export interface AutoLinkSuggestion {
  noteId: string;
  appointmentId: string;
  confidence: number;
  reason: string;
  factors?: LinkingFactor[];
}

export interface LinkingFactor {
  type: 'date_proximity' | 'content_match' | 'ai_analysis' | 'pattern_match';
  weight: number;
  description: string;
}

export interface AutoLinkResult {
  linkedCount: number;
  totalUnlinked: number;
  linkedNoteIds?: string[];
  suggestions?: AutoLinkSuggestion[];
  errors?: LinkingError[];
}

export interface LinkingError {
  noteId: string;
  reason: string;
  code?: string;
}

export interface BulkLinkRequest {
  noteIds: string[];
  appointmentId: string;
  override?: boolean;
}

export interface LinkValidation {
  isValid: boolean;
  confidence: number;
  warnings?: string[];
  suggestions?: string[];
}

export interface SessionNoteLinkingStats {
  totalNotes: number;
  linkedNotes: number;
  unlinkedNotes: number;
  appointmentsWithNotes: number;
  appointmentsWithoutNotes: number;
  averageLinkingConfidence?: number;
  lastAutoLinkDate?: string;
}

export interface LinkingHistory {
  id: string;
  action: 'link' | 'unlink' | 'auto-link' | 'bulk-link';
  noteIds: string[];
  appointmentId?: string;
  userId: string;
  timestamp: string;
  metadata?: Record<string, any>;
}

export interface FilterOptions {
  dateRange?: {
    start: string;
    end: string;
  };
  tags?: string[];
  source?: SessionNote['source'];
  hasAppointment?: boolean;
  searchQuery?: string;
  sortBy?: 'date' | 'relevance' | 'confidence';
  sortOrder?: 'asc' | 'desc';
}

export interface PaginationOptions {
  page: number;
  pageSize: number;
  total?: number;
}

export interface SessionNoteSearchResult {
  notes: SessionNote[];
  pagination: PaginationOptions & { total: number };
  filters: FilterOptions;
}

export interface AppointmentSearchResult {
  appointments: Appointment[];
  pagination: PaginationOptions & { total: number };
  filters: FilterOptions;
}