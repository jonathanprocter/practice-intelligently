import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';

// Clean event title utility function
function cleanEventTitle(title: string): string {
  return cleanTitleForPDF(title);
}

export interface CurrentWeeklyExportConfig {
  pageWidth: number;
  pageHeight: number;
  margins: number;
  headerHeight: number;
  timeColumnWidth: number;
  dayColumnWidth: number;
  timeSlotHeight: number;
  fonts: {
    title: number;
    weekInfo: number;
    dayHeader: number;
    timeLabel: number;
    eventTitle: number;
    eventSource: number;
    eventTime: number;
  };
}

// Optimized configuration for complete time range display
export const CURRENT_WEEKLY_CONFIG: CurrentWeeklyExportConfig = {
  pageWidth: 792, // 11" landscape
  pageHeight: 612, // 8.5" landscape
  margins: 16, // Perfect centering
  headerHeight: 40,
  timeColumnWidth: 60,
  dayColumnWidth: 100, // Clean 100px for 7 days = 700px total
  timeSlotHeight: 13, // Slightly reduced to fit all time slots
  fonts: {
    title: 16,
    weekInfo: 12,
    dayHeader: 9,
    timeLabel: 7,
    eventTitle: 5, // Small but readable
    eventSource: 4, // Very small for source/location
    eventTime: 4, // Very small for time
  },
};

export const exportCurrentWeeklyView = (
  events: CalendarEvent[],
  weekStart: Date,
  weekEnd: Date
): void => {
  // Normalize week start to beginning of Monday
  const normalizedWeekStart = new Date(weekStart);
  normalizedWeekStart.setHours(0, 0, 0, 0);
  // Ensure week end covers full Sunday
  const normalizedWeekEnd = new Date(weekEnd);
  normalizedWeekEnd.setHours(23, 59, 59, 999);

//   console.log(`📊 Exporting weekly view: ${normalizedWeekStart.toDateString()} to ${normalizedWeekEnd.toDateString()}`);
//const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [CURRENT_WEEKLY_CONFIG.pageWidth, CURRENT_WEEKLY_CONFIG.pageHeight]
  });

  pdf.setFont('helvetica');
  // Draw header
  drawCurrentWeeklyHeader(pdf, normalizedWeekStart, normalizedWeekEnd);
  // Draw grid and events
  drawCurrentWeeklyGrid(pdf, events, normalizedWeekStart);
  
  // Debug Monday events before saving
  const mondayEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    return eventDate.getDay() === 1 && // Monday
      eventDate >= normalizedWeekStart && 
      eventDate <= normalizedWeekEnd;
  });

//mondayEvents.forEach(event => {
    const eventDate = new Date(event.startTime);
    // Event processed: ${event.title} at ${eventDate.toLocaleString()}
  });

  // Save the PDF with dynamic filename
  const weekStartStr = normalizedWeekStart.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric',
    year: 'numeric'
  });
  const weekEndStr = normalizedWeekEnd.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  
  const filename = `remarkable_weekly_${weekStartStr}_${weekEndStr}.pdf`;
  pdf.save(filename);
};

function drawCurrentWeeklyHeader(pdf: jsPDF, weekStart: Date, weekEnd: Date): void {
  const config = CURRENT_WEEKLY_CONFIG;
  
  // Title
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(config.fonts.title);
  pdf.setFont('helvetica', 'bold');
  
  const weekStartStr = weekStart.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric'
  });
  const weekEndStr = weekEnd.toLocaleDateString('en-US', { 
    month: 'short', 
    day: 'numeric', 
    year: 'numeric'
  });
  
  pdf.text(`Weekly Calendar: ${weekStartStr} - ${weekEndStr}`, config.margins, 25);
}

function drawCurrentWeeklyGrid(pdf: jsPDF, events: CalendarEvent[], weekStart: Date): void {
  const config = CURRENT_WEEKLY_CONFIG;
  const startY = config.headerHeight + 10;
  
  // Generate days of the week
  const weekDays: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }
  
  // Time slots from 6:00 to 23:30
  const timeSlots: TimeSlot[] = [];
  for (let hour = 6; hour <= 23; hour++) {
    timeSlots.push({ hour, minute: 0, display: `${hour.toString().padStart(2, '0')}:00` });
    if (hour < 23) {
      timeSlots.push({ hour, minute: 30, display: `${hour.toString().padStart(2, '0')}:30` });
    }
  }
  
  // Draw day headers
  pdf.setFillColor(255, 255, 255);
  pdf.rect(config.margins, startY, config.pageWidth - (2 * config.margins), 25, 'F');
  
  pdf.setTextColor(0, 0, 0);
  pdf.setFontSize(config.fonts.dayHeader);
  pdf.setFont('helvetica', 'bold');
  
  // Time column header
  pdf.text('Time', config.margins + 5, startY + 15);
  
  // Day column headers
  weekDays.forEach((day, index) => {
    const x = config.margins + config.timeColumnWidth + (index * config.dayColumnWidth);
    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = day.getDate().toString();
    
    pdf.text(`${dayName} ${dayDate}`, x + 5, startY + 15);
  });
  
  // Draw grid
  pdf.setDrawColor(0, 0, 0);
  pdf.setLineWidth(0.5);
  
  // Draw time slots and events
  timeSlots.forEach((slot, slotIndex) => {
    const y = startY + 25 + (slotIndex * config.timeSlotHeight);
    
    // Draw horizontal line
    pdf.line(config.margins, y, config.pageWidth - config.margins, y);
    
    // Time label
    pdf.setFontSize(config.fonts.timeLabel);
    pdf.setFont('helvetica', 'normal');
    pdf.text(slot.display, config.margins + 5, y + 10);
    
    // Draw events for this time slot
    weekDays.forEach((day, dayIndex) => {
      const dayEvents = getEventsForTimeSlot(events, day, slot);
      
      dayEvents.forEach((event, eventIndex) => {
        const x = config.margins + config.timeColumnWidth + (dayIndex * config.dayColumnWidth) + 2;
        const eventY = y + 2 + (eventIndex * 10);
        
        // Event styling
        pdf.setFillColor(196, 155, 108, 0.2); // Therapy primary color with transparency
        pdf.rect(x, eventY, config.dayColumnWidth - 4, 8, 'F');
        
        pdf.setDrawColor(196, 155, 108);
        pdf.setLineWidth(1);
        pdf.rect(x, eventY, config.dayColumnWidth - 4, 8, 'S');
        
        // Event text
        pdf.setTextColor(0, 0, 0);
        pdf.setFontSize(config.fonts.eventTitle);
        pdf.setFont('helvetica', 'normal');
        
        const title = cleanEventTitle(event.title);
        const truncatedTitle = title.length > 12 ? title.substring(0, 12) + '...' : title;
        pdf.text(truncatedTitle, x + 2, eventY + 6);
      });
    });
  });
  
  // Draw vertical grid lines
  for (let i = 0; i <= 7; i++) {
    const x = config.margins + config.timeColumnWidth + (i * config.dayColumnWidth);
    pdf.line(x, startY, x, startY + 25 + (timeSlots.length * config.timeSlotHeight));
  }
  
  // Draw time column separator
  pdf.line(
    config.margins + config.timeColumnWidth, 
    startY, 
    config.margins + config.timeColumnWidth, 
    startY + 25 + (timeSlots.length * config.timeSlotHeight)
  );
}



// Fallback for emoji cleaner if not available
function cleanTitleForPDF(title: string): string {
  if (!title) return '';
  
  return title
    .replace(/[^\w\s\-.,!?()]/g, '')
    .replace(/\s+/g, ' ')
    .trim() || 'Untitled Session';
}

// Complete time slot structure
interface TimeSlot {
  hour: number;
  minute: number;
  display: string;
}

function getEventsForTimeSlot(events: CalendarEvent[], date: Date, timeSlot: TimeSlot): CalendarEvent[] {
  return events.filter(event => {
    const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
    
    // Check if event is on this day
    if (eventStart.toDateString() !== date.toDateString()) return false;
    
    // Check if event overlaps this time slot
    const slotStart = new Date(date);
    slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
    const slotEnd = new Date(slotStart);
    slotEnd.setMinutes(slotEnd.getMinutes() + 30);
    
    return eventStart < slotEnd && eventEnd > slotStart;
  });
}