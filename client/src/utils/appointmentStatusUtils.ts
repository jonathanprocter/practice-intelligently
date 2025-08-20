import { AppointmentStatus, type AppointmentStatusType } from '../../../shared/schema';
import { CalendarEvent } from '@/types/calendar';

export function getAppointmentStatusColor(status: AppointmentStatusType | string): string {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return '#4285f4'; // Blue
    case AppointmentStatus.CANCELLED:
      return '#ffc107'; // Amber
    case AppointmentStatus.NO_SHOW:
      return '#dc3545'; // Red
    case AppointmentStatus.CLINICIAN_CANCELED:
      return '#6c757d'; // Gray
    case AppointmentStatus.COMPLETED:
      return '#28a745'; // Green
    default:
      return '#4285f4'; // Default blue
  }
}

export function getAppointmentStatusLabel(status: AppointmentStatusType | string): string {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
      return 'Scheduled';
    case AppointmentStatus.CONFIRMED:
      return 'Confirmed';
    case AppointmentStatus.CANCELLED:
      return 'CANCELLED';
    case AppointmentStatus.NO_SHOW:
      return 'NO SHOW';
    case AppointmentStatus.CLINICIAN_CANCELED:
      return 'Clinician Canceled';
    case AppointmentStatus.COMPLETED:
      return 'Completed';
    default:
      return 'Scheduled';
  }
}

export function getAppointmentStatusCSS(status: AppointmentStatusType | string): string {
  switch (status) {
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return 'appointment';
    case AppointmentStatus.CANCELLED:
      return 'appointment no-show'; // Amber styling
    case AppointmentStatus.NO_SHOW:
      return 'appointment cancelled-red'; // Red styling
    case AppointmentStatus.CLINICIAN_CANCELED:
      return 'appointment cancelled-minimal'; // Gray styling
    case AppointmentStatus.COMPLETED:
      return 'appointment completed';
    default:
      return 'appointment';
  }
}

export function shouldShowStrikethrough(status: AppointmentStatusType | string): boolean {
  return status === AppointmentStatus.CANCELLED || 
         status === AppointmentStatus.NO_SHOW || 
         status === AppointmentStatus.CLINICIAN_CANCELED;
}

export function getStatusBadgeInfo(status: AppointmentStatusType | string): {
  show: boolean;
  text: string;
  color: string;
} {
  switch (status) {
    case AppointmentStatus.CANCELLED:
      return { show: true, text: 'CANCELLED', color: '#fd7e14' };
    case AppointmentStatus.NO_SHOW:
      return { show: true, text: 'NO SHOW', color: '#d32f2f' };
    case AppointmentStatus.CLINICIAN_CANCELED:
      return { show: true, text: 'Clinician Canceled', color: '#6c757d' };
    default:
      return { show: false, text: '', color: '' };
  }
}

export function getAppointmentStatusStyles(status: AppointmentStatusType | string): React.CSSProperties {
  const baseStyles: React.CSSProperties = {
    position: 'relative',
    cursor: 'pointer',
    transition: 'opacity 0.2s',
    padding: '8px 12px',
    margin: '2px',
    borderRadius: '4px',
    fontSize: '13px',
    height: '38px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
  };

  switch (status) {
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return {
        ...baseStyles,
        background: '#4285f4',
        color: 'white',
      };
    case AppointmentStatus.CANCELLED:
      return {
        ...baseStyles,
        background: '#fff3cd',
        color: '#856404',
        border: '2px solid #ffc107',
      };
    case AppointmentStatus.NO_SHOW:
      return {
        ...baseStyles,
        background: '#ffebee',
        color: '#d32f2f',
        border: '2px solid #f44336',
      };
    case AppointmentStatus.CLINICIAN_CANCELED:
      return {
        ...baseStyles,
        background: '#f8f9fa',
        color: '#6c757d',
        border: '1px solid #dee2e6',
        opacity: 0.6,
      };
    case AppointmentStatus.COMPLETED:
      return {
        ...baseStyles,
        background: '#d4edda',
        color: '#155724',
        border: '1px solid #c3e6cb',
      };
    default:
      return {
        ...baseStyles,
        background: '#4285f4',
        color: 'white',
      };
  }
}

export function isAppointmentEvent(event: CalendarEvent): boolean {
  const title = event.title.toLowerCase();
  return title.includes('appointment') || 
         title.includes('session') || 
         title.includes('therapy') ||
         title.includes('consultation') ||
         title.includes('patient') ||
         event.source === 'simplepractice';
}

export function getAppointmentStatusPriority(status: AppointmentStatusType | string): number {
  // Higher number = higher priority for sorting
  switch (status) {
    case AppointmentStatus.NO_SHOW:
      return 5; // Highest priority - red
    case AppointmentStatus.CANCELLED:
      return 4; // High priority - amber
    case AppointmentStatus.SCHEDULED:
    case AppointmentStatus.CONFIRMED:
      return 3; // Medium priority - normal
    case AppointmentStatus.COMPLETED:
      return 2; // Lower priority - completed
    case AppointmentStatus.CLINICIAN_CANCELED:
      return 1; // Lowest priority - gray
    default:
      return 3;
  }
}

export interface AppointmentStatusStats {
  total: number;
  scheduled: number;
  confirmed: number;
  cancelled: number;
  no_show: number;
  clinician_canceled: number;
  completed: number;
}

export function calculateAppointmentStats(events: CalendarEvent[]): AppointmentStatusStats {
  const appointmentEvents = events.filter(isAppointmentEvent);

  return {
    total: appointmentEvents.length,
    scheduled: appointmentEvents.filter(e => e.status === AppointmentStatus.SCHEDULED).length,
    confirmed: appointmentEvents.filter(e => e.status === AppointmentStatus.CONFIRMED).length,
    cancelled: appointmentEvents.filter(e => e.status === AppointmentStatus.CANCELLED).length,
    no_show: appointmentEvents.filter(e => e.status === AppointmentStatus.NO_SHOW).length,
    clinician_canceled: appointmentEvents.filter(e => e.status === AppointmentStatus.CLINICIAN_CANCELED).length,
    completed: appointmentEvents.filter(e => e.status === AppointmentStatus.COMPLETED).length,
  };
}