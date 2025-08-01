/**
 * Utility functions for determining office locations based on scheduling rules
 */

/**
 * Gets the office location based on the day of the week
 * Monday = Woodbury
 * Tuesday, Saturday, Sunday = Telehealth
 * Wednesday, Thursday, Friday = Rockville Centre
 */
export function getOfficeLocationByDay(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (!targetDate || isNaN(targetDate.getTime())) {
    return 'Rockville Centre'; // Default fallback
  }
  
  const dayOfWeek = targetDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  switch (dayOfWeek) {
    case 1: // Monday
      return 'Woodbury';
    case 2: // Tuesday
    case 0: // Sunday
    case 6: // Saturday
      return 'Telehealth';
    case 3: // Wednesday
    case 4: // Thursday
    case 5: // Friday
      return 'Rockville Centre';
    default:
      return 'Rockville Centre'; // Default fallback
  }
}

/**
 * Gets the full display text for calendar events
 */
export function getCalendarLocationDisplay(date: Date | string): string {
  const location = getOfficeLocationByDay(date);
  return `Simple Practice | ${location}`;
}

/**
 * Gets location display for different contexts
 */
export function getLocationDisplay(date: Date | string, context: 'calendar' | 'appointment' | 'brief' = 'calendar'): string {
  const location = getOfficeLocationByDay(date);
  
  switch (context) {
    case 'calendar':
      return `Simple Practice | ${location}`;
    case 'appointment':
      return location;
    case 'brief':
      return location;
    default:
      return `Simple Practice | ${location}`;
  }
}

/**
 * Gets an icon or color code for the location type
 */
export function getLocationIcon(date: Date | string): string {
  const location = getOfficeLocationByDay(date);
  
  switch (location) {
    case 'Telehealth':
      return '🏠'; // Home/remote icon
    case 'Woodbury':
      return '🏢'; // Office building icon
    case 'Rockville Centre':
      return '🏥'; // Medical/clinic icon
    default:
      return '📍'; // General location icon
  }
}