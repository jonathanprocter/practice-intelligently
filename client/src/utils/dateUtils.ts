// Eastern Time timezone options for consistent date formatting
const EASTERN_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: 'America/New_York'
};

export function formatDateShort(date: Date): string {
  return date.toLocaleDateString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    month: 'short',
    day: 'numeric'
  });
}

export function formatDateLong(date: Date): string {
  return date.toLocaleDateString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
}

export function getWeekStart(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day; // Adjust to get Monday as start of week
  const weekStart = new Date(d.setDate(diff));
  weekStart.setHours(0, 0, 0, 0);
  return weekStart;
}

export function getWeekEnd(date: Date): Date {
  const weekStart = getWeekStart(date);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);
  return weekEnd;
}

export function getWeekDays(weekStart: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    days.push(day);
  }
  return days;
}

export function isToday(date: Date): boolean {
  const today = new Date();
  const todayEastern = today.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  const dateEastern = date.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  return dateEastern === todayEastern;
}

export function isSameDay(date1: Date, date2: Date): boolean {
  const date1Eastern = date1.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  const date2Eastern = date2.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  return date1Eastern === date2Eastern;
}

export function getWeekRangeString(weekStart: Date, weekEnd: Date): string {
  const startStr = weekStart.toLocaleDateString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    month: 'long',
    day: 'numeric'
  });
  
  const endStr = weekEnd.toLocaleDateString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    month: 'long',
    day: 'numeric',
    year: 'numeric'
  });
  
  return `${startStr} - ${endStr}`;
}

export function addWeeks(date: Date, weeks: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + (weeks * 7));
  return result;
}

export function isCurrentWeek(weekStart: Date): boolean {
  const today = new Date();
  const currentWeekStart = getWeekStart(today);
  const weekStartEastern = weekStart.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  const currentWeekStartEastern = currentWeekStart.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS);
  return weekStartEastern === currentWeekStartEastern;
}

// Helper function to get current date in Eastern Time
export function getTodayInEasternTime(): string {
  const now = new Date();
  return now.toLocaleDateString('en-CA', EASTERN_TIME_OPTIONS); // YYYY-MM-DD format
}

// Military time formatting functions with explicit EDT timezone handling
export function formatTimeMilitary(dateTime: Date | string): string {
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (isNaN(date.getTime())) {
    return '00:00';
  }
  
  // Ensure we're displaying in Eastern Time regardless of how the date is stored
  return date.toLocaleTimeString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
}

export function formatDateTimeMilitary(dateTime: Date | string): string {
  const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
  if (isNaN(date.getTime())) {
    return '';
  }
  const dateStr = date.toLocaleDateString('en-US', {
    ...EASTERN_TIME_OPTIONS,
    month: 'short',
    day: 'numeric'
  });
  const timeStr = formatTimeMilitary(date);
  return `${dateStr} ${timeStr}`;
}

export function formatTimeRangeMilitary(startTime: Date | string, endTime: Date | string): string {
  const start = formatTimeMilitary(startTime);
  const end = formatTimeMilitary(endTime);
  return `${start} - ${end}`;
}