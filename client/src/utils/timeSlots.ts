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

// Enhanced utilities for daily view grid layout
export function getTimeSlotIndex(time: string): number {
  const timeSlots = generateTimeSlots();
  return timeSlots.findIndex(slot => slot.display === time);
}

export function calculateSlotPosition(startTime: Date, endTime: Date): { startSlot: number; endSlot: number } {
  const startHour = startTime.getHours();
  const startMinute = startTime.getMinutes();
  const endHour = endTime.getHours();
  const endMinute = endTime.getMinutes();

  // Calculate slot positions (each hour has 2 slots: :00 and :30)
  const startSlot = ((startHour - 6) * 2) + (startMinute >= 30 ? 1 : 0);
  const endSlot = ((endHour - 6) * 2) + (endMinute >= 30 ? 1 : 0);

  return { startSlot, endSlot };
}

export function formatTimeRange(startTime: Date, endTime: Date): string {
  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  return `${formatTime(startTime)} - ${formatTime(endTime)}`;
}

export function getEventsForTimeSlot(events: any[], date: Date, timeSlot: TimeSlot): any[] {
  return events.filter(event => {
    const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    
    // Check if event is on the same day
    if (eventDate.toDateString() !== date.toDateString()) {
      return false;
    }
    
    // Check if event overlaps with this time slot
    return isEventInTimeSlot(event, timeSlot);
  });
}