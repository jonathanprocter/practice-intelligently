import { CalendarEvent } from '@/types/calendar';

export type AppointmentStatus = 'scheduled' | 'confirmed' | 'completed' | 'cancelled' | 'no-show' | 'pending';

export interface StatusBadgeInfo {
  show: boolean;
  text: string;
  color: string;
}

/**
 * Get styling information for appointment status badges
 */
export function getStatusBadgeInfo(status: AppointmentStatus): StatusBadgeInfo {
  switch (status) {
    case 'confirmed':
      return {
        show: true,
        text: 'CONFIRMED',
        color: '#28a745' // Green
      };
    case 'completed':
      return {
        show: true,
        text: 'COMPLETED',
        color: '#6f42c1' // Purple
      };
    case 'cancelled':
      return {
        show: true,
        text: 'CANCELLED',
        color: '#ffc107' // Yellow
      };
    case 'no-show':
      return {
        show: true,
        text: 'NO SHOW',
        color: '#dc3545' // Red
      };
    case 'pending':
      return {
        show: true,
        text: 'PENDING',
        color: '#fd7e14' // Orange
      };
    case 'scheduled':
    default:
      return {
        show: false,
        text: '',
        color: ''
      };
  }
}

/**
 * Get CSS classes for appointment status styling
 */
export function getAppointmentStatusStyles(status: AppointmentStatus): string {
  switch (status) {
    case 'cancelled':
      return 'bg-yellow-50 border-yellow-300 text-yellow-800';
    case 'no-show':
      return 'bg-red-50 border-red-300 text-red-800';
    case 'completed':
      return 'bg-purple-50 border-purple-300 text-purple-800';
    case 'confirmed':
      return 'bg-green-50 border-green-300 text-green-800';
    case 'pending':
      return 'bg-orange-50 border-orange-300 text-orange-800';
    case 'scheduled':
    default:
      return 'bg-white border-gray-300 text-gray-800';
  }
}

/**
 * Determine if appointment text should have strikethrough styling
 */
export function shouldShowStrikethrough(status: AppointmentStatus): boolean {
  return status === 'cancelled' || status === 'no-show';
}

/**
 * Check if an event is an appointment (vs other calendar events)
 */
export function isAppointmentEvent(event: CalendarEvent): boolean {
  // Consider an event an appointment if it has a client name or is of appointment type
  return !!(event.clientName || 
           event.type === 'individual' || 
           event.type === 'group' || 
           event.type === 'intake' || 
           event.type === 'consultation' || 
           event.type === 'assessment' || 
           event.type === 'follow-up');
}

/**
 * Get a human-readable label for appointment status
 */
export function getAppointmentStatusLabel(status: AppointmentStatus): string {
  switch (status) {
    case 'scheduled':
      return 'Scheduled';
    case 'confirmed':
      return 'Confirmed';
    case 'completed':
      return 'Completed';
    case 'cancelled':
      return 'Cancelled';
    case 'no-show':
      return 'No Show';
    case 'pending':
      return 'Pending';
    default:
      return 'Unknown';
  }
}
export interface StatusBadgeInfo {
  show: boolean;
  text: string;
  color: string;
}

export function getAppointmentStatusStyles(status: string) {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'bg-green-100 border-green-500 text-green-800';
    case 'pending':
      return 'bg-yellow-100 border-yellow-500 text-yellow-800';
    case 'cancelled':
      return 'bg-red-100 border-red-500 text-red-800 opacity-60';
    case 'no-show':
      return 'bg-gray-100 border-gray-500 text-gray-800 opacity-60';
    case 'completed':
      return 'bg-blue-100 border-blue-500 text-blue-800';
    default:
      return 'bg-white border-gray-300 text-gray-800';
  }
}

export function getStatusBadgeInfo(status: string): StatusBadgeInfo {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return { show: true, text: 'CONFIRMED', color: '#22c55e' };
    case 'pending':
      return { show: true, text: 'PENDING', color: '#f59e0b' };
    case 'cancelled':
      return { show: true, text: 'CANCELLED', color: '#ef4444' };
    case 'no-show':
      return { show: true, text: 'NO-SHOW', color: '#6b7280' };
    case 'completed':
      return { show: true, text: 'COMPLETED', color: '#3b82f6' };
    default:
      return { show: false, text: '', color: '#6b7280' };
  }
}

export function shouldShowStrikethrough(status: string): boolean {
  const lowerStatus = status?.toLowerCase();
  return lowerStatus === 'cancelled' || lowerStatus === 'no-show';
}

export function isAppointmentEvent(event: any): boolean {
  // Check if this is an appointment-type event
  return event.source === 'simplepractice' || 
         event.calendar?.includes('appointment') ||
         event.type === 'appointment' ||
         (event.title && !event.title.toLowerCase().includes('block'));
}

export function getAppointmentStatusLabel(status: string): string {
  switch (status?.toLowerCase()) {
    case 'confirmed':
      return 'Confirmed';
    case 'pending':
      return 'Pending Confirmation';
    case 'cancelled':
      return 'Cancelled';
    case 'no-show':
      return 'No Show';
    case 'completed':
      return 'Completed';
    case 'scheduled':
      return 'Scheduled';
    default:
      return 'Unknown Status';
  }
}
