export interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
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

export function isEventInTimeSlot(eventStart: Date, eventEnd: Date, slotHour: number, slotMinute: number): boolean {
  const slotStart = new Date(eventStart);
  slotStart.setHours(slotHour, slotMinute, 0, 0);
  
  const slotEnd = new Date(slotStart);
  slotEnd.setMinutes(slotEnd.getMinutes() + 30);
  
  return (eventStart < slotEnd) && (eventEnd > slotStart);
}

export function formatTimeSlot(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour === 0 ? 12 : hour > 12 ? hour - 12 : hour;
  return `${displayHour}:${minute.toString().padStart(2, '0')} ${period}`;
}

export function getTimeSlotPosition(eventTime: Date): { hour: number; minute: number } {
  return {
    hour: eventTime.getHours(),
    minute: eventTime.getMinutes() >= 30 ? 30 : 0
  };
}