export interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
}

interface CalendarEvent {
  id: string;
  title: string;
  clientName?: string;
  start: Date;
  end: Date;
}

export function generateTimeSlots(): TimeSlot[] {
  const slots: TimeSlot[] = [];

  // Generate 30-minute slots from 6:00 AM to 11:30 PM
  for (let hour = 6; hour <= 23; hour++) {
    slots.push({
      hour,
      minute: 0,
      display: `${hour.toString().padStart(2, '0')}:00`
    });

    if (hour < 23) { // Don't add 30-minute slot for the last hour
      slots.push({
        hour,
        minute: 30,
        display: `${hour.toString().padStart(2, '0')}:30`
      });
    }
  }

  return slots;
}

export function getEventDurationInSlots(startTime: Date, endTime: Date): number {
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = durationMs / (1000 * 60);
  return Math.ceil(durationMinutes / 30); // 30-minute slots
}

export function isEventInTimeSlot(event: any, timeSlot: TimeSlot): boolean {
  const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
  const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

  // Handle invalid dates
  if (isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
    return false;
  }

  const slotStart = new Date(eventStart);
  slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  const matches = (eventStart < slotEnd) && (eventEnd > slotStart);

  // Debug log for troubleshooting
  if (matches) {
    console.log(`Event "${event.clientName || event.title}" matches time slot ${timeSlot.display}`, {
      eventStart: eventStart.toISOString(),
      eventEnd: eventEnd.toISOString(),
      slotStart: slotStart.toISOString(),
      slotEnd: slotEnd.toISOString()
    });
  }

  return matches;
}

// Keep the old function for backwards compatibility
export function isEventInTimeSlotLegacy(eventStart: Date, eventEnd: Date, slotHour: number, slotMinute: number): boolean {
  const slotStart = new Date(eventStart);
  slotStart.setHours(slotHour, slotMinute, 0, 0);

  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);

  return (eventStart < slotEnd) && (eventEnd > slotStart);
}

export function formatTimeSlot(hour: number, minute: number): string {
  // Use military time format (24-hour)
  return `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
}

export function getTimeSlotPosition(eventTime: Date): { hour: number; minute: number } {
  return {
    hour: eventTime.getHours(),
    minute: eventTime.getMinutes() >= 30 ? 30 : 0
  };
}

export function matchEventsToTimeSlots(events: CalendarEvent[], timeSlots: TimeSlot[]): TimeSlot[] {
  return timeSlots;
}