/**
 * US Federal Holidays Generator (2015-2030)
 * 
 * This module generates all US federal holidays from 2015 to 2030
 * for integration with the calendar system.
 */

export interface USHoliday {
  id: string;
  summary: string;
  description: string;
  start: { date: string }; // All-day format YYYY-MM-DD
  end: { date: string };   // All-day format YYYY-MM-DD
  status: 'confirmed';
  isAllDay: true;
  calendarId: 'us-holidays';
  calendarName: 'US Federal Holidays';
  type: 'holiday';
}

/**
 * Calculate Easter date for a given year using the algorithm
 */
function calculateEaster(year: number): Date {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  
  return new Date(year, month - 1, day);
}

/**
 * Get the nth occurrence of a weekday in a month
 */
function getNthWeekdayOfMonth(year: number, month: number, weekday: number, n: number): Date {
  const firstDay = new Date(year, month, 1);
  const firstWeekday = firstDay.getDay();
  
  let daysToAdd = (weekday - firstWeekday + 7) % 7;
  if (n > 1) {
    daysToAdd += (n - 1) * 7;
  }
  
  return new Date(year, month, 1 + daysToAdd);
}

/**
 * Get the last occurrence of a weekday in a month
 */
function getLastWeekdayOfMonth(year: number, month: number, weekday: number): Date {
  const lastDay = new Date(year, month + 1, 0);
  const lastWeekday = lastDay.getDay();
  
  let daysToSubtract = (lastWeekday - weekday + 7) % 7;
  return new Date(year, month, lastDay.getDate() - daysToSubtract);
}

/**
 * Format date as YYYY-MM-DD for all-day events
 */
function formatDateString(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Generate US federal holidays for a specific year
 */
function generateHolidaysForYear(year: number): USHoliday[] {
  const holidays: USHoliday[] = [];

  // Fixed date holidays
  const fixedHolidays = [
    { month: 0, day: 1, name: "New Year's Day", desc: "First day of the year" },
    { month: 6, day: 4, name: "Independence Day", desc: "Celebrating American independence" },
    { month: 10, day: 11, name: "Veterans Day", desc: "Honoring military veterans" },
    { month: 11, day: 25, name: "Christmas Day", desc: "Christian holiday celebrating the birth of Jesus" }
  ];

  fixedHolidays.forEach(holiday => {
    let date = new Date(year, holiday.month, holiday.day);
    
    // If holiday falls on weekend, observe on weekday
    if (date.getDay() === 0) { // Sunday
      date = new Date(year, holiday.month, holiday.day + 1); // Move to Monday
    } else if (date.getDay() === 6) { // Saturday
      date = new Date(year, holiday.month, holiday.day - 1); // Move to Friday
    }

    holidays.push({
      id: `us-holiday-${year}-${holiday.name.toLowerCase().replace(/[^a-z]/g, '-')}`,
      summary: holiday.name,
      description: holiday.desc,
      start: { date: formatDateString(date) },
      end: { date: formatDateString(date) },
      status: 'confirmed',
      isAllDay: true,
      calendarId: 'us-holidays',
      calendarName: 'US Federal Holidays',
      type: 'holiday'
    });
  });

  // Variable date holidays
  
  // Martin Luther King Jr. Day (3rd Monday in January)
  const mlkDay = getNthWeekdayOfMonth(year, 0, 1, 3);
  holidays.push({
    id: `us-holiday-${year}-martin-luther-king-jr-day`,
    summary: "Martin Luther King Jr. Day",
    description: "Honoring the civil rights leader",
    start: { date: formatDateString(mlkDay) },
    end: { date: formatDateString(mlkDay) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Presidents' Day (3rd Monday in February)
  const presidentsDay = getNthWeekdayOfMonth(year, 1, 1, 3);
  holidays.push({
    id: `us-holiday-${year}-presidents-day`,
    summary: "Presidents' Day",
    description: "Honoring US presidents",
    start: { date: formatDateString(presidentsDay) },
    end: { date: formatDateString(presidentsDay) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Memorial Day (Last Monday in May)
  const memorialDay = getLastWeekdayOfMonth(year, 4, 1);
  holidays.push({
    id: `us-holiday-${year}-memorial-day`,
    summary: "Memorial Day",
    description: "Honoring fallen military service members",
    start: { date: formatDateString(memorialDay) },
    end: { date: formatDateString(memorialDay) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Labor Day (1st Monday in September)
  const laborDay = getNthWeekdayOfMonth(year, 8, 1, 1);
  holidays.push({
    id: `us-holiday-${year}-labor-day`,
    summary: "Labor Day",
    description: "Celebrating American workers",
    start: { date: formatDateString(laborDay) },
    end: { date: formatDateString(laborDay) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Columbus Day (2nd Monday in October)
  const columbusDay = getNthWeekdayOfMonth(year, 9, 1, 2);
  holidays.push({
    id: `us-holiday-${year}-columbus-day`,
    summary: "Columbus Day",
    description: "Commemorating Christopher Columbus's arrival in the Americas",
    start: { date: formatDateString(columbusDay) },
    end: { date: formatDateString(columbusDay) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Thanksgiving (4th Thursday in November)
  const thanksgiving = getNthWeekdayOfMonth(year, 10, 4, 4);
  holidays.push({
    id: `us-holiday-${year}-thanksgiving`,
    summary: "Thanksgiving Day",
    description: "Traditional harvest celebration",
    start: { date: formatDateString(thanksgiving) },
    end: { date: formatDateString(thanksgiving) },
    status: 'confirmed',
    isAllDay: true,
    calendarId: 'us-holidays',
    calendarName: 'US Federal Holidays',
    type: 'holiday'
  });

  // Juneteenth (June 19) - Federal holiday since 2021
  if (year >= 2021) {
    let juneteenth = new Date(year, 5, 19);
    
    // If holiday falls on weekend, observe on weekday
    if (juneteenth.getDay() === 0) { // Sunday
      juneteenth = new Date(year, 5, 20); // Move to Monday
    } else if (juneteenth.getDay() === 6) { // Saturday
      juneteenth = new Date(year, 5, 18); // Move to Friday
    }

    holidays.push({
      id: `us-holiday-${year}-juneteenth`,
      summary: "Juneteenth",
      description: "Commemorating the end of slavery in the United States",
      start: { date: formatDateString(juneteenth) },
      end: { date: formatDateString(juneteenth) },
      status: 'confirmed',
      isAllDay: true,
      calendarId: 'us-holidays',
      calendarName: 'US Federal Holidays',
      type: 'holiday'
    });
  }

  return holidays;
}

/**
 * Generate all US federal holidays from 2015 to 2030
 */
export function generateUSHolidays(): USHoliday[] {
  const allHolidays: USHoliday[] = [];
  
  for (let year = 2015; year <= 2030; year++) {
    const yearHolidays = generateHolidaysForYear(year);
    allHolidays.push(...yearHolidays);
  }
  
  return allHolidays;
}

/**
 * Get holidays for a specific year
 */
export function getHolidaysForYear(year: number): USHoliday[] {
  if (year < 2015 || year > 2030) {
    return [];
  }
  return generateHolidaysForYear(year);
}

/**
 * Get holidays for a specific date range
 */
export function getHolidaysInRange(startDate: string, endDate: string): USHoliday[] {
  const allHolidays = generateUSHolidays();
  
  return allHolidays.filter(holiday => {
    const holidayDate = holiday.start.date;
    return holidayDate >= startDate && holidayDate <= endDate;
  });
}

/**
 * Check if a specific date is a US federal holiday
 */
export function isUSHoliday(dateString: string): boolean {
  const year = parseInt(dateString.substring(0, 4));
  if (year < 2015 || year > 2030) {
    return false;
  }
  
  const yearHolidays = generateHolidaysForYear(year);
  return yearHolidays.some(holiday => holiday.start.date === dateString);
}

/**
 * Get holiday name for a specific date
 */
export function getHolidayName(dateString: string): string | null {
  const year = parseInt(dateString.substring(0, 4));
  if (year < 2015 || year > 2030) {
    return null;
  }
  
  const yearHolidays = generateHolidaysForYear(year);
  const holiday = yearHolidays.find(holiday => holiday.start.date === dateString);
  return holiday ? holiday.summary : null;
}