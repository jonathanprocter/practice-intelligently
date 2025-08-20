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