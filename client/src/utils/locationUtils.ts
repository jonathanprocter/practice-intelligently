/**
 * Utility functions for determining office locations based on scheduling rules
 * All times calculated in Eastern Time Zone (America/New_York)
 */

/**
 * Gets the office location based on the day of the week (Eastern Time)
 * Monday = Woodbury
 * Tuesday, Saturday, Sunday = Telehealth
 * Wednesday, Thursday, Friday = Rockville Centre
 */
export function getOfficeLocationByDay(date: Date | string): string {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  
  if (!targetDate || isNaN(targetDate.getTime())) {
    return 'Rockville Centre'; // Default fallback
  }
  
  // Convert to Eastern Time to get the correct day of week
  const easternTimeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York'
  };
  
  // Create a new date in Eastern timezone and get the day of week
  const easternDateFormatter = new Intl.DateTimeFormat('en-US', easternTimeOptions);
  const easternDate = new Date(easternDateFormatter.format(targetDate));
  const dayOfWeek = easternDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
  
  // Office location rules (Eastern Time):
  // Monday (1) = Woodbury
  // Tuesday (2), Saturday (6), Sunday (0) = Telehealth  
  // Wednesday (3), Thursday (4), Friday (5) = Rockville Centre
  
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