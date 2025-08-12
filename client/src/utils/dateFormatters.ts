/**
 * Date formatting utilities for session notes and appointments
 */

/**
 * Format a date for display in session notes and appointments
 * @param date - The date to format (string or Date object)
 * @returns Formatted date string
 */
export const formatSessionDate = (date: string | Date): string => {
  const d = new Date(date);

  // Check if date is valid
  if (isNaN(d.getTime())) {
    return 'Invalid date';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  }).format(d);
};

/**
 * Format a date for display with relative time
 * @param date - The date to format
 * @returns Formatted date string with relative time
 */
export const formatRelativeDate = (date: string | Date): string => {
  const d = new Date(date);
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return 'Today';
  } else if (diffDays === 1) {
    return 'Yesterday';
  } else if (diffDays === -1) {
    return 'Tomorrow';
  } else if (diffDays > 0 && diffDays < 7) {
    return `${diffDays} days ago`;
  } else if (diffDays < 0 && diffDays > -7) {
    return `In ${Math.abs(diffDays)} days`;
  } else {
    return formatSessionDate(d);
  }
};

/**
 * Calculate the proximity score between two dates
 * Lower score means closer proximity
 * @param date1 - First date
 * @param date2 - Second date
 * @returns Proximity score in hours
 */
export const getDateProximityScore = (date1: Date | string, date2: Date | string): number => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  const diff = Math.abs(d1.getTime() - d2.getTime());
  const hours = diff / (1000 * 60 * 60);
  return Math.round(hours * 10) / 10; // Round to 1 decimal place
};

/**
 * Check if two dates are on the same day
 * @param date1 - First date
 * @param date2 - Second date
 * @returns True if dates are on the same day
 */
export const isSameDay = (date1: Date | string, date2: Date | string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);

  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

/**
 * Check if a date is within a specified range of another date
 * @param date - The date to check
 * @param targetDate - The target date
 * @param hours - The range in hours
 * @returns True if date is within range
 */
export const isWithinRange = (
  date: Date | string, 
  targetDate: Date | string, 
  hours: number
): boolean => {
  const proximityScore = getDateProximityScore(date, targetDate);
  return proximityScore <= hours;
};

/**
 * Format a date range for display
 * @param startDate - Start date
 * @param endDate - End date
 * @returns Formatted date range string
 */
export const formatDateRange = (startDate: string | Date, endDate: string | Date): string => {
  const start = new Date(startDate);
  const end = new Date(endDate);

  if (isSameDay(start, end)) {
    const dateStr = new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(start);

    const startTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(start);

    const endTime = new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(end);

    return `${dateStr}, ${startTime} - ${endTime}`;
  } else {
    return `${formatSessionDate(start)} - ${formatSessionDate(end)}`;
  }
};

/**
 * Get a confidence score for auto-linking based on date proximity
 * @param noteDate - Date of the session note
 * @param appointmentDate - Date of the appointment
 * @returns Confidence score (0-100)
 */
export const getDateMatchConfidence = (
  noteDate: Date | string, 
  appointmentDate: Date | string
): number => {
  const proximityHours = getDateProximityScore(noteDate, appointmentDate);

  if (proximityHours <= 1) {
    return 95; // Within 1 hour - very high confidence
  } else if (proximityHours <= 4) {
    return 85; // Within 4 hours - high confidence
  } else if (proximityHours <= 24) {
    return 70; // Same day - moderate confidence
  } else if (proximityHours <= 48) {
    return 50; // Within 2 days - low confidence
  } else if (proximityHours <= 72) {
    return 30; // Within 3 days - very low confidence
  } else {
    return 10; // More than 3 days - minimal confidence
  }
};

/**
 * Sort dates in ascending order
 * @param dates - Array of dates to sort
 * @returns Sorted array of dates
 */
export const sortDatesAscending = (dates: (Date | string)[]): Date[] => {
  return dates
    .map(d => new Date(d))
    .sort((a, b) => a.getTime() - b.getTime());
};

/**
 * Sort dates in descending order
 * @param dates - Array of dates to sort
 * @returns Sorted array of dates
 */
export const sortDatesDescending = (dates: (Date | string)[]): Date[] => {
  return dates
    .map(d => new Date(d))
    .sort((a, b) => b.getTime() - a.getTime());
};

/**
 * Group dates by day
 * @param dates - Array of dates to group
 * @returns Object with date strings as keys and arrays of dates as values
 */
export const groupDatesByDay = (dates: (Date | string)[]): Record<string, Date[]> => {
  const grouped: Record<string, Date[]> = {};

  dates.forEach(date => {
    const d = new Date(date);
    const key = new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).format(d);

    if (!grouped[key]) {
      grouped[key] = [];
    }
    grouped[key].push(d);
  });

  return grouped;
};

/**
 * Parse a date string with multiple format support
 * @param dateString - The date string to parse
 * @returns Parsed Date object or null if invalid
 */
export const parseFlexibleDate = (dateString: string): Date | null => {
  // Try standard date parsing first
  const date = new Date(dateString);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try common formats
  const formats = [
    /(\d{1,2})\/(\d{1,2})\/(\d{4})/, // MM/DD/YYYY or M/D/YYYY
    /(\d{4})-(\d{2})-(\d{2})/, // YYYY-MM-DD
    /(\d{1,2})-(\d{1,2})-(\d{4})/ // MM-DD-YYYY or M-D-YYYY
  ];

  for (const format of formats) {
    const match = dateString.match(format);
    if (match) {
      // Attempt to create a valid date from the match
      const possibleDate = new Date(dateString);
      if (!isNaN(possibleDate.getTime())) {
        return possibleDate;
      }
    }
  }

  return null;
};