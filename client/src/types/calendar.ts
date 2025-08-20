export interface CalendarEvent {
  id: string;
  title: string;
  startTime: Date | string;
  endTime: Date | string;
  clientId?: string;
  clientName?: string;
  type: 'individual' | 'group' | 'intake' | 'consultation' | 'assessment' | 'follow-up';
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'pending';
  location?: string;
  notes?: string;
  description?: string;
  actionItems?: string;
  isAllDay?: boolean;
  priority?: 'low' | 'medium' | 'high';
  color?: string;
  source?: 'system' | 'google' | 'manual' | 'simplepractice';
  therapistId: string;
  attendees?: string;
  calendarId?: string;
  calendarName?: string;
  createdAt?: Date | string;
  updatedAt?: Date | string;
}

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  isCurrentMonth: boolean;
  events: CalendarEvent[];
}

export interface WeekView {
  weekStart: Date;
  weekEnd: Date;
  days: CalendarDay[];
  allEvents: CalendarEvent[];
}

export interface AppointmentStats {
  total: number;
  confirmed: number;
  completed: number;
  cancelled: number;
  noShow: number;
  pending: number;
}

export interface CalendarFilters {
  clientId?: string;
  type?: CalendarEvent['type'];
  status?: CalendarEvent['status'];
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export interface CalendarPreferences {
  startHour: number;
  endHour: number;
  slotDuration: number; // in minutes
  showWeekends: boolean;
  defaultView: 'week' | 'day' | 'month';
  timeFormat: '12h' | '24h';
}

export interface EventConflict {
  event1: CalendarEvent;
  event2: CalendarEvent;
  type: 'overlap' | 'double-booking' | 'back-to-back';
  severity: 'warning' | 'error';
}

export interface CalendarExportOptions {
  format: 'pdf' | 'ics' | 'csv';
  dateRange: {
    start: Date;
    end: Date;
  };
  includeNotes: boolean;
  includeClientInfo: boolean;
  includeCancelled: boolean;
}