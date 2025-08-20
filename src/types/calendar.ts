export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string | Date;
  endTime: string | Date;
  isAllDay?: boolean;
  location?: string;
  clientName?: string;
  notes?: string;
  source?: 'simplepractice' | 'google' | 'holiday';
  status?: string;
  calendarName?: string;
}

export interface CalendarDay {
  date: Date;
  isToday: boolean;
  events?: CalendarEvent[];
}
