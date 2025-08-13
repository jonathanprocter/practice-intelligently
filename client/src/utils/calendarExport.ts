import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';
import { cleanEventTitle, sanitizeForPDF } from './textCleaner';
import { formatDateLong, formatDateShort } from './dateUtils';
import { getLocationDisplay } from './locationUtils';

export interface CalendarExportConfig {
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

// Therapy practice themed export configuration
export const THERAPY_WEEKLY_CONFIG: CalendarExportConfig = {
  pageWidth: 792, // 11" landscape
  pageHeight: 612, // 8.5" landscape
  margins: 16,
  headerHeight: 50,
  timeColumnWidth: 60,
  dayColumnWidth: 100,
  timeSlotHeight: 14,
  fonts: {
    title: 18,
    weekInfo: 14,
    dayHeader: 10,
    timeLabel: 8,
    eventTitle: 6,
    eventSource: 5,
    eventTime: 5,
  },
};

export const THERAPY_DAILY_CONFIG: CalendarExportConfig = {
  pageWidth: 612, // 8.5" portrait
  pageHeight: 792, // 11" portrait
  margins: 20,
  headerHeight: 60,
  timeColumnWidth: 80,
  dayColumnWidth: 500,
  timeSlotHeight: 18,
  fonts: {
    title: 16,
    weekInfo: 12,
    dayHeader: 12,
    timeLabel: 8,
    eventTitle: 8,
    eventSource: 6,
    eventTime: 6,
  },
};

// Therapy practice colors for PDF
const THERAPY_COLORS = {
  primary: [196, 155, 108], // therapy-primary as RGB
  success: [87, 118, 156], // therapy-success as RGB
  warning: [162, 184, 108], // therapy-warning as RGB
  error: [143, 93, 90], // therapy-error as RGB
  text: [26, 26, 26], // therapy-text as RGB
  border: [221, 221, 221], // therapy-border as RGB
  background: [249, 249, 249], // therapy-bg as RGB
};

function drawTherapyHeader(pdf: jsPDF, title: string, subtitle?: string): void {
  const config = THERAPY_WEEKLY_CONFIG;
  
  // Header background
  pdf.setFillColor(...THERAPY_COLORS.primary);
  pdf.rect(0, 0, config.pageWidth, config.headerHeight, 'F');
  
  // Practice name and title
  pdf.setTextColor(255, 255, 255);
  pdf.setFontSize(config.fonts.title);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Remarkable Planner - Therapy Practice', config.margins, 25);
  
  if (subtitle) {
    pdf.setFontSize(config.fonts.weekInfo);
    pdf.setFont('helvetica', 'normal');
    pdf.text(subtitle, config.margins, 40);
  }
  
  // Reset colors
  pdf.setTextColor(...THERAPY_COLORS.text);
}

function drawWeeklyGrid(pdf: jsPDF, events: CalendarEvent[], weekStart: Date): void {
  const config = THERAPY_WEEKLY_CONFIG;
  const startY = config.headerHeight + 10;
  
  // Generate days of the week
  const weekDays = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(weekStart);
    day.setDate(day.getDate() + i);
    weekDays.push(day);
  }
  
  // Draw day headers
  pdf.setFillColor(...THERAPY_COLORS.background);
  pdf.rect(config.margins, startY, config.pageWidth - (2 * config.margins), 20, 'F');
  
  pdf.setTextColor(...THERAPY_COLORS.text);
  pdf.setFontSize(config.fonts.dayHeader);
  pdf.setFont('helvetica', 'bold');
  
  // Time column header
  pdf.text('Time', config.margins + 5, startY + 12);
  
  // Day column headers
  weekDays.forEach((day, index) => {
    const x = config.margins + config.timeColumnWidth + (index * config.dayColumnWidth);
    const dayName = day.toLocaleDateString('en-US', { weekday: 'short' });
    const dayDate = formatDateShort(day);
    
    pdf.text(dayName, x + 5, startY + 8);
    pdf.text(dayDate, x + 5, startY + 16);
  });
  
  // Draw grid lines
  pdf.setDrawColor(...THERAPY_COLORS.border);
  pdf.setLineWidth(0.5);
  
  // Generate time slots (6 AM to 11 PM)
  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    timeSlots.push({ hour, minute: 0, display: `${hour.toString().padStart(2, '0')}:00` });
    if (hour < 23) {
      timeSlots.push({ hour, minute: 30, display: `${hour.toString().padStart(2, '0')}:30` });
    }
  }
  
  // Draw time slots and events
  timeSlots.forEach((slot, slotIndex) => {
    const y = startY + 20 + (slotIndex * config.timeSlotHeight);
    
    // Draw horizontal line
    pdf.line(config.margins, y, config.pageWidth - config.margins, y);
    
    // Time label
    pdf.setFontSize(config.fonts.timeLabel);
    pdf.setFont('helvetica', 'normal');
    pdf.text(slot.display, config.margins + 5, y + 8);
    
    // Draw events for this time slot
    weekDays.forEach((day, dayIndex) => {
      const dayEvents = events.filter(event => {
        const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
        const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
        
        // Check if event is on this day and overlaps this time slot
        if (eventStart.toDateString() !== day.toDateString()) return false;
        
        const slotStart = new Date(day);
        slotStart.setHours(slot.hour, slot.minute, 0, 0);
        const slotEnd = new Date(slotStart);
        slotEnd.setMinutes(slotEnd.getMinutes() + 30);
        
        return eventStart < slotEnd && eventEnd > slotStart;
      });
      
      dayEvents.forEach((event, eventIndex) => {
        const x = config.margins + config.timeColumnWidth + (dayIndex * config.dayColumnWidth) + 2;
        const eventY = y + 2 + (eventIndex * 12);
        
        // Event background based on status
        let bgColor = THERAPY_COLORS.background;
        switch (event.status) {
          case 'confirmed':
            bgColor = THERAPY_COLORS.success;
            break;
          case 'completed':
            bgColor = THERAPY_COLORS.primary;
            break;
          case 'cancelled':
            bgColor = THERAPY_COLORS.error;
            break;
          default:
            bgColor = THERAPY_COLORS.warning;
        }
        
        pdf.setFillColor(...bgColor);
        pdf.rect(x, eventY, config.dayColumnWidth - 4, 10, 'F');
        
        // Event text
        pdf.setTextColor(255, 255, 255);  
        pdf.setFontSize(config.fonts.eventTitle);
        pdf.setFont('helvetica', 'bold');
        
        const title = cleanEventTitle(event.title);
        const truncatedTitle = title.length > 12 ? title.substring(0, 12) + '...' : title;
        pdf.text(truncatedTitle, x + 2, eventY + 7);
        
        // Client name if available
        if (event.clientName) {
          pdf.setFontSize(config.fonts.eventSource);
          pdf.setFont('helvetica', 'normal');
          const clientText = event.clientName.length > 10 ? event.clientName.substring(0, 10) + '...' : event.clientName;
          // pdf.text(clientText, x + 2, eventY + 12);
        }
      });
    });
  });
  
  // Draw vertical grid lines
  for (let i = 0; i <= 7; i++) {
    const x = config.margins + config.timeColumnWidth + (i * config.dayColumnWidth);
    pdf.line(x, startY, x, startY + 20 + (timeSlots.length * config.timeSlotHeight));
  }
  
  // Draw time column separator
  pdf.line(config.margins + config.timeColumnWidth, startY, config.margins + config.timeColumnWidth, startY + 20 + (timeSlots.length * config.timeSlotHeight));
}

function drawDailyGrid(pdf: jsPDF, events: CalendarEvent[], date: Date): void {
  const config = THERAPY_DAILY_CONFIG;
  const startY = config.headerHeight + 10;
  
  // Filter events for the selected date
  const dayEvents = events.filter(event => {
    const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    return eventStart.toDateString() === date.toDateString();
  }).sort((a, b) => {
    const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
    const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
    return aTime.getTime() - bTime.getTime();
  });
  
  // Day header
  pdf.setFillColor(...THERAPY_COLORS.background);
  pdf.rect(config.margins, startY, config.pageWidth - (2 * config.margins), 25, 'F');
  
  pdf.setTextColor(...THERAPY_COLORS.text);
  pdf.setFontSize(config.fonts.dayHeader);
  pdf.setFont('helvetica', 'bold');
  pdf.text('Time', config.margins + 5, startY + 12);
  pdf.text('Appointments', config.margins + config.timeColumnWidth + 5, startY + 12);
  
  // Generate time slots
  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    timeSlots.push({ hour, minute: 0, display: `${hour.toString().padStart(2, '0')}:00` });
    if (hour < 23) {
      timeSlots.push({ hour, minute: 30, display: `${hour.toString().padStart(2, '0')}:30` });
    }
  }
  
  // Draw appointments
  let currentY = startY + 25;
  
  if (dayEvents.length === 0) {
    pdf.setFontSize(12);
    pdf.setFont('helvetica', 'italic');
    pdf.setTextColor(...THERAPY_COLORS.text);
    pdf.text('No appointments scheduled for this day', config.margins + 20, currentY + 30);
  } else {
    dayEvents.forEach((event, index) => {
      const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
      
      // Event background
      let bgColor = THERAPY_COLORS.background;
      switch (event.status) {
        case 'confirmed':
          bgColor = [135, 169, 107]; // lighter therapy-success
          break;
        case 'completed':
          bgColor = [180, 146, 108]; // lighter therapy-primary
          break;
        case 'cancelled':
          bgColor = [184, 120, 120]; // lighter therapy-error
          break;
        default:
          bgColor = [180, 186, 120]; // lighter therapy-warning
      }
      
      pdf.setFillColor(...bgColor);
      pdf.rect(config.margins, currentY, config.pageWidth - (2 * config.margins), 40, 'F');
      
      // Time
      pdf.setTextColor(...THERAPY_COLORS.text);
      pdf.setFontSize(config.fonts.timeLabel);
      pdf.setFont('helvetica', 'bold');
      const timeStr = `${eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${eventEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
      pdf.text(timeStr, config.margins + 5, currentY + 12);
      
      // Event details
      pdf.setFontSize(config.fonts.eventTitle);
      pdf.setFont('helvetica', 'bold');
      pdf.text(cleanEventTitle(event.title), config.margins + config.timeColumnWidth + 5, currentY + 12);
      
      if (event.clientName) {
        pdf.setFontSize(config.fonts.eventSource);
        pdf.setFont('helvetica', 'normal');
        pdf.text(`Client: ${event.clientName}`, config.margins + config.timeColumnWidth + 5, currentY + 22);
      }
      
      if (event.location) {
        pdf.setFontSize(config.fonts.eventSource);
        pdf.text(`Location: ${getLocationDisplay(event.location)}`, config.margins + config.timeColumnWidth + 5, currentY + 30);
      }
      
      pdf.setFontSize(config.fonts.eventSource);
      pdf.text(`Status: ${event.status}`, config.margins + config.timeColumnWidth + 5, currentY + 38);
      
      currentY += 45;
    });
  }
}

export function exportWeeklyCalendar(events: CalendarEvent[], weekStart: Date, weekEnd: Date): void {
//   console.log(`📊 Exporting weekly calendar: ${weekStart.toDateString()} to ${weekEnd.toDateString()}`);
  
  const pdf = new jsPDF({
    orientation: 'landscape',
    unit: 'pt',
    format: [THERAPY_WEEKLY_CONFIG.pageWidth, THERAPY_WEEKLY_CONFIG.pageHeight]
  });
  
  pdf.setFont('helvetica');
  
  // Draw header
  const weekRange = `${formatDateShort(weekStart)} - ${formatDateShort(weekEnd)}`;
  drawTherapyHeader(pdf, 'Weekly Calendar', weekRange);
  
  // Draw grid and events
  drawWeeklyGrid(pdf, events, weekStart);
  
  // Save the PDF
  const filename = `therapy_weekly_calendar_${weekStart.toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export function exportDailyCalendar(events: CalendarEvent[], date: Date): void {
//   console.log(`📊 Exporting daily calendar for: ${date.toDateString()}`);
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: [THERAPY_DAILY_CONFIG.pageWidth, THERAPY_DAILY_CONFIG.pageHeight]
  });
  
  pdf.setFont('helvetica');
  
  // Draw header
  const dateStr = formatDateLong(date);
  drawTherapyHeader(pdf, 'Daily Schedule', dateStr);
  
  // Draw schedule
  drawDailyGrid(pdf, events, date);
  
  // Save the PDF
  const filename = `therapy_daily_schedule_${date.toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}

export function exportAppointmentList(events: CalendarEvent[], startDate: Date, endDate: Date): void {
//   console.log(`📊 Exporting appointment list: ${startDate.toDateString()} to ${endDate.toDateString()}`);
  
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'letter'
  });
  
  pdf.setFont('helvetica');
  
  // Header
  drawTherapyHeader(pdf, 'Appointment List', `${formatDateShort(startDate)} - ${formatDateShort(endDate)}`);
  
  // Filter and sort events
  const filteredEvents = events.filter(event => {
    const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    return eventDate >= startDate && eventDate <= endDate;
  }).sort((a, b) => {
    const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
    const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
    return aTime.getTime() - bTime.getTime();
  });
  
  let currentY = 80;
  
  if (filteredEvents.length === 0) {
    pdf.setFontSize(12);
    pdf.setTextColor(...THERAPY_COLORS.text);
    pdf.text('No appointments found for the selected date range.', 40, currentY + 20);
  } else {
    // Statistics
    const stats = {
      total: filteredEvents.length,
      confirmed: filteredEvents.filter(e => e.status === 'confirmed').length,
      completed: filteredEvents.filter(e => e.status === 'completed').length,
      cancelled: filteredEvents.filter(e => e.status === 'cancelled').length,
    };
    
    pdf.setFontSize(10);
    pdf.setTextColor(...THERAPY_COLORS.text);
    pdf.text(`Total Appointments: ${stats.total} | Confirmed: ${stats.confirmed} | Completed: ${stats.completed} | Cancelled: ${stats.cancelled}`, 40, currentY);
    currentY += 30;
    
    // Appointments table
    filteredEvents.forEach((event, index) => {
      const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
      
      // Check if we need a new page
      if (currentY > 700) {
        pdf.addPage();
        currentY = 40;
      }
      
      // Date and time
      pdf.setFontSize(9);
      pdf.setFont('helvetica', 'bold');
      pdf.text(eventStart.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }), 40, currentY);
      pdf.text(`${eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${eventEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`, 120, currentY);
      
      // Event details
      pdf.setFont('helvetica', 'normal');
      pdf.text(cleanEventTitle(event.title), 220, currentY);
      
      if (event.clientName) {
        pdf.text(event.clientName, 380, currentY);
      }
      
      // Status
      pdf.text(event.status, 480, currentY);
      
      currentY += 15;
    });
  }
  
  // Save the PDF
  const filename = `therapy_appointments_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.pdf`;
  pdf.save(filename);
}