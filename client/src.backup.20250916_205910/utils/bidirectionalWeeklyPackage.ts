import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';
import { format, addDays } from 'date-fns';

// US Letter dimensions for reMarkable compatibility
const US_LETTER_LANDSCAPE = { width: 792, height: 612 }; // 11x8.5 inches
const US_LETTER_PORTRAIT = { width: 612, height: 792 }; // 8.5x11 inches

// Configuration for bidirectional weekly package
const PACKAGE_CONFIG = {
  // Weekly overview page (landscape)
  weekly: {
    ...US_LETTER_LANDSCAPE,
    margin: 30,
    headerHeight: 80,
    timeColumnWidth: 65,
    dayColumnWidth: 95,
    timeSlotHeight: 14,
    totalSlots: 36 // 6:00 AM to 11:30 PM
  },
  // Daily pages (portrait)
  daily: {
    ...US_LETTER_PORTRAIT,
    margin: 25,
    headerHeight: 90,
    timeColumnWidth: 80,
    appointmentColumnWidth: 480
  }
};

/**
 * Comprehensive Bidirectional Weekly Package Export
 * Creates a complete package with:
 * - 1 Weekly overview page (landscape) with navigation to daily pages
 * - 7 Daily pages (portrait) with navigation back to weekly and between days
 * - Full US Letter format for reMarkable compatibility
 */
export const exportBidirectionalWeeklyPackage = async (
  weekStartDate: Date,
  weekEndDate: Date,
  events: CalendarEvent[]
): Promise<void> => {
  try {
    console.log('🎯 STARTING BIDIRECTIONAL WEEKLY PACKAGE EXPORT');
    console.log(`📅 Week: ${format(weekStartDate, 'MMM dd')} - ${format(weekEndDate, 'MMM dd, yyyy')}`);
    console.log(`📊 Events: ${events.length}`);

    // Initialize PDF in landscape mode for the weekly overview
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'pt',
      format: 'letter'
    });

    // Filter events for the current week
    const weekEvents = events.filter(event => {
      const eventDate = new Date(event.startTime);
      return eventDate >= weekStartDate && eventDate <= weekEndDate;
    });

    console.log('📊 Week events:', weekEvents.length);

    // PAGE 1: Weekly Overview (Landscape)
    const eventMap = await generateWeeklyOverviewPage(
      pdf,
      weekStartDate,
      weekEndDate,
      weekEvents
    );

    // PAGES 2-8: Daily Pages (Portrait)
    for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
      const currentDate = addDays(weekStartDate, dayIndex);
      const dayEvents = weekEvents.filter(event => {
        const eventDate = new Date(event.startTime);
        return eventDate.toDateString() === currentDate.toDateString();
      });

      console.log(`📅 Day ${dayIndex + 1} (${format(currentDate, 'EEE MMM dd')}):`, dayEvents.length, 'events');

      // Add new page for daily view
      pdf.addPage('letter', 'portrait');
      await generateDailyPage(
        pdf,
        currentDate,
        dayEvents,
        dayIndex,
        weekStartDate,
        weekEndDate,
        eventMap
      );
    }

    // Generate filename
    const filename = `bidirectional-weekly-package-${format(weekStartDate, 'MMM-dd')}-to-${format(weekEndDate, 'MMM-dd-yyyy')}.pdf`;

    // Save the complete package
    pdf.save(filename);

    console.log('✅ BIDIRECTIONAL WEEKLY PACKAGE EXPORT COMPLETE');
    console.log('📄 Total pages:', 8);
    console.log('📁 Filename:', filename);

  } catch (error) {
    console.error('❌ Bidirectional weekly package export failed:', error);
    throw new Error(`Export failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
};

/**
 * Generate Weekly Overview Page (Landscape)
 * Features clickable appointments that reference daily pages
 */
async function generateWeeklyOverviewPage(
  pdf: jsPDF,
  weekStartDate: Date,
  weekEndDate: Date,
  events: CalendarEvent[]
): Promise<Record<string, { x: number; y: number; width: number; height: number }>> {
  const config = PACKAGE_CONFIG.weekly;
  const eventMap: Record<string, { x: number; y: number; width: number; height: number }> = {};

  // Page setup
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, config.width, config.height, 'F');

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(24);
  pdf.setTextColor(0, 0, 0);
  pdf.text('WEEKLY OVERVIEW', config.width / 2, 40, { align: 'center' });

  const weekRange = `${format(weekStartDate, 'MMMM dd')} - ${format(weekEndDate, 'MMMM dd, yyyy')}`;
  pdf.setFontSize(14);
  pdf.text(weekRange, config.width / 2, 65, { align: 'center' });

  // Navigation hint
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Click appointments to navigate to daily pages', config.width / 2, config.headerHeight - 5, { align: 'center' });

  // Calculate grid dimensions
  const gridStartY = config.headerHeight + config.margin;
  const gridWidth = config.width - (config.margin * 2);
  const availableWidth = gridWidth - config.timeColumnWidth;
  const actualDayWidth = availableWidth / 7;

  // Draw day headers with navigation links
  const daysOfWeek = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);

  for (let day = 0; day < 7; day++) {
    const dayX = config.margin + config.timeColumnWidth + (day * actualDayWidth);
    const currentDate = addDays(weekStartDate, day);

    // Day header background
    pdf.setFillColor(240, 240, 240);
    pdf.rect(dayX, gridStartY, actualDayWidth, 30, 'F');

    // Day name and date
    pdf.setTextColor(0, 0, 0);
    pdf.text(daysOfWeek[day], dayX + actualDayWidth / 2, gridStartY + 15, { align: 'center' });
    pdf.text(currentDate.getDate().toString(), dayX + actualDayWidth / 2, gridStartY + 27, { align: 'center' });

    // Link entire header area to corresponding daily page
    pdf.link(dayX, gridStartY, actualDayWidth, 30, { pageNumber: day + 2 });
  }

  // Draw time grid and events with daily page links
  const timeGridStartY = gridStartY + 30;

  for (let slot = 0; slot < config.totalSlots; slot++) {
    const hour = 6 + Math.floor(slot / 2);
    const minute = (slot % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const slotY = timeGridStartY + (slot * config.timeSlotHeight);
    const isTopOfHour = minute === 0;

    // Time slot background
    pdf.setFillColor(isTopOfHour ? 245 : 250, isTopOfHour ? 245 : 250, isTopOfHour ? 245 : 250);
    pdf.rect(config.margin, slotY, config.width - (config.margin * 2), config.timeSlotHeight, 'F');

    // Time label
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', isTopOfHour ? 'bold' : 'normal');
    pdf.setFontSize(9);
    pdf.text(timeStr, config.margin + config.timeColumnWidth - 5, slotY + 10, { align: 'right' });

    // Grid lines
    pdf.setDrawColor(isTopOfHour ? 180 : 220, isTopOfHour ? 180 : 220, isTopOfHour ? 180 : 220);
    pdf.setLineWidth(isTopOfHour ? 1 : 0.5);
    pdf.line(config.margin, slotY, config.width - config.margin, slotY);
  }

  // Draw vertical day separators
  for (let day = 0; day <= 7; day++) {
    const dayX = config.margin + config.timeColumnWidth + (day * actualDayWidth);
    pdf.setDrawColor(180, 180, 180);
    pdf.setLineWidth(1);
    pdf.line(dayX, gridStartY, dayX, timeGridStartY + (config.totalSlots * config.timeSlotHeight));
  }

  // Draw events with daily page references
  events.forEach(event => {
    const eventDate = new Date(event.startTime);
    const dayOfWeek = eventDate.getDay();
    const adjustedDay = dayOfWeek === 0 ? 6 : dayOfWeek - 1; // Convert Sunday=0 to Sunday=6

    if (adjustedDay >= 0 && adjustedDay < 7) {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);

      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const endHour = endTime.getHours();
      const endMinute = endTime.getMinutes();

      const startSlot = ((startHour - 6) * 2) + (startMinute >= 30 ? 1 : 0);
      const endSlot = ((endHour - 6) * 2) + (endMinute >= 30 ? 1 : 0);

      if (startSlot >= 0 && startSlot < config.totalSlots) {
        const eventX = config.margin + config.timeColumnWidth + (adjustedDay * actualDayWidth);
        const eventY = timeGridStartY + (startSlot * config.timeSlotHeight);
        const eventWidth = actualDayWidth - 2;
        const eventHeight = Math.max((endSlot - startSlot) * config.timeSlotHeight, config.timeSlotHeight);

        // Event background
        pdf.setFillColor(255, 255, 255);
        pdf.rect(eventX + 1, eventY + 1, eventWidth - 2, eventHeight - 2, 'F');

        // Event border based on source
        if (event.source === 'simplepractice' || event.title?.includes('Appointment')) {
          pdf.setDrawColor(100, 149, 237); // SimplePractice blue
        } else if (event.source === 'google') {
          pdf.setDrawColor(34, 197, 94); // Google Calendar green
        } else {
          pdf.setDrawColor(245, 158, 11); // Holiday orange
        }
        pdf.setLineWidth(1);
        pdf.rect(eventX + 1, eventY + 1, eventWidth - 2, eventHeight - 2, 'S');

        // Event text with daily page reference
        pdf.setTextColor(0, 0, 0);
        pdf.setFont('helvetica', 'normal');
        pdf.setFontSize(8);

        const eventTitle = event.title || 'Untitled Event';
        const cleanTitle = eventTitle.replace(' Appointment', '').trim();
        const dailyPageRef = `(→ Page ${adjustedDay + 2})`;

        pdf.text(cleanTitle, eventX + 3, eventY + 12);
        pdf.text(dailyPageRef, eventX + 3, eventY + 24);

        // Link the event block to its daily page
        pdf.link(eventX + 1, eventY + 1, eventWidth - 2, eventHeight - 2, { pageNumber: adjustedDay + 2 });
      }
    }
  });

  // Footer with navigation
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('Navigation: Pages 2-8 contain detailed daily views', config.width / 2, config.height - 35, { align: 'center' });

  return eventMap;
}

/**
 * Generate Daily Page (Portrait)
 * Features navigation back to weekly overview and between days
 */
async function generateDailyPage(
  pdf: jsPDF,
  date: Date,
  events: CalendarEvent[],
  dayIndex: number,
  weekStartDate: Date,
  weekEndDate: Date,
  eventMap: Record<string, { x: number; y: number; width: number; height: number }>
) {
  const config = PACKAGE_CONFIG.daily;

  // Page setup
  pdf.setFillColor(255, 255, 255);
  pdf.rect(0, 0, config.width, config.height, 'F');

  // Header
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(28);
  pdf.setTextColor(0, 0, 0);
  pdf.text('DAILY PLANNER', config.width / 2, 40, { align: 'center' });

  const dateStr = format(date, 'EEEE, MMMM dd, yyyy');
  pdf.setFontSize(16);
  pdf.text(dateStr, config.width / 2, 65, { align: 'center' });

  // Event count
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(12);
  pdf.text(`${events.length} appointments scheduled`, config.width / 2, 85, { align: 'center' });

  // Navigation buttons
  const navY = config.headerHeight - 15;
  const buttonWidth = 100;
  const buttonHeight = 20;

  // Back to Weekly button
  pdf.setFillColor(240, 240, 240);
  pdf.rect(config.width / 2 - buttonWidth / 2, navY - 10, buttonWidth, buttonHeight, 'F');
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(config.width / 2 - buttonWidth / 2, navY - 10, buttonWidth, buttonHeight, 'S');
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text('← Back to Weekly (Page 1)', config.width / 2, navY, { align: 'center' });
  // Link back to weekly overview
  pdf.link(config.width / 2 - buttonWidth / 2, navY - 10, buttonWidth, buttonHeight, { pageNumber: 1 });

  // Previous/Next day navigation
  const prevDay = dayIndex > 0 ? `← ${format(addDays(weekStartDate, dayIndex - 1), 'EEE')} (Page ${dayIndex + 1})` : '';
  const nextDay = dayIndex < 6 ? `${format(addDays(weekStartDate, dayIndex + 1), 'EEE')} (Page ${dayIndex + 3}) →` : '';

  if (prevDay) {
    pdf.text(prevDay, 50, navY);
    pdf.link(50, navY - 10, buttonWidth, buttonHeight, { pageNumber: dayIndex + 1 });
  }
  if (nextDay) {
    pdf.text(nextDay, config.width - 50, navY, { align: 'right' });
    pdf.link(config.width - 50 - buttonWidth, navY - 10, buttonWidth, buttonHeight, { pageNumber: dayIndex + 3 });
  }

  // Time grid
  const gridStartY = config.headerHeight + 20;
  const timeSlotHeight = 18;
  const totalSlots = 36; // 6:00 AM to 11:30 PM

  // Draw time column and appointment column headers
  pdf.setFont('helvetica', 'bold');
  pdf.setFontSize(12);
  pdf.setFillColor(240, 240, 240);

  // Time column header
  pdf.rect(config.margin, gridStartY, config.timeColumnWidth, 25, 'F');
  pdf.setDrawColor(180, 180, 180);
  pdf.rect(config.margin, gridStartY, config.timeColumnWidth, 25, 'S');
  pdf.text('TIME', config.margin + config.timeColumnWidth / 2, gridStartY + 16, { align: 'center' });

  // Appointment column header
  pdf.rect(config.margin + config.timeColumnWidth, gridStartY, config.appointmentColumnWidth, 25, 'F');
  pdf.rect(config.margin + config.timeColumnWidth, gridStartY, config.appointmentColumnWidth, 25, 'S');
  pdf.text('APPOINTMENTS', config.margin + config.timeColumnWidth + config.appointmentColumnWidth / 2, gridStartY + 16, { align: 'center' });

  // Draw time slots
  const timeGridStartY = gridStartY + 25;

  for (let slot = 0; slot < totalSlots; slot++) {
    const hour = 6 + Math.floor(slot / 2);
    const minute = (slot % 2) * 30;
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    const slotY = timeGridStartY + (slot * timeSlotHeight);
    const isTopOfHour = minute === 0;

    // Time slot background
    pdf.setFillColor(isTopOfHour ? 245 : 250, isTopOfHour ? 245 : 250, isTopOfHour ? 245 : 250);
    pdf.rect(config.margin, slotY, config.width - (config.margin * 2), timeSlotHeight, 'F');

    // Time label
    pdf.setTextColor(0, 0, 0);
    pdf.setFont('helvetica', isTopOfHour ? 'bold' : 'normal');
    pdf.setFontSize(10);
    pdf.text(timeStr, config.margin + config.timeColumnWidth - 5, slotY + 12, { align: 'right' });

    // Grid lines
    pdf.setDrawColor(isTopOfHour ? 180 : 220, isTopOfHour ? 180 : 220, isTopOfHour ? 180 : 220);
    pdf.setLineWidth(isTopOfHour ? 1 : 0.5);
    pdf.line(config.margin, slotY, config.width - config.margin, slotY);
  }

  // Vertical separator
  pdf.setDrawColor(180, 180, 180);
  pdf.setLineWidth(2);
  pdf.line(config.margin + config.timeColumnWidth, gridStartY, config.margin + config.timeColumnWidth, timeGridStartY + (totalSlots * timeSlotHeight));

  // Draw events with enhanced styling
  events.forEach(event => {
    const startTime = new Date(event.startTime);
    const endTime = new Date(event.endTime);

    const startHour = startTime.getHours();
    const startMinute = startTime.getMinutes();
    const endHour = endTime.getHours();
    const endMinute = endTime.getMinutes();

    const startSlot = ((startHour - 6) * 2) + (startMinute >= 30 ? 1 : 0);
    const endSlot = ((endHour - 6) * 2) + (endMinute >= 30 ? 1 : 0);

    if (startSlot >= 0 && startSlot < totalSlots) {
      const eventX = config.margin + config.timeColumnWidth + 2;
      const eventY = timeGridStartY + (startSlot * timeSlotHeight) + 1;
      const eventWidth = config.appointmentColumnWidth - 4;
      const eventHeight = Math.max((endSlot - startSlot) * timeSlotHeight - 2, timeSlotHeight - 2);

      // Event background
      pdf.setFillColor(255, 255, 255);
      pdf.rect(eventX, eventY, eventWidth, eventHeight, 'F');

      // Event styling based on source
      if (event.source === 'simplepractice' || event.title?.includes('Appointment')) {
        pdf.setDrawColor(100, 149, 237);
        pdf.setLineWidth(1);
        pdf.rect(eventX, eventY, eventWidth, eventHeight, 'S');
        pdf.setFillColor(100, 149, 237);
        pdf.rect(eventX, eventY, 4, eventHeight, 'F');
      } else if (event.source === 'google') {
        pdf.setDrawColor(34, 197, 94);
        pdf.setLineWidth(1);
        pdf.setLineDash([3, 2]);
        pdf.rect(eventX, eventY, eventWidth, eventHeight, 'S');
        pdf.setLineDash([]);
        pdf.setFillColor(34, 197, 94);
        pdf.rect(eventX, eventY, 4, eventHeight, 'F');
      } else {
        pdf.setDrawColor(245, 158, 11);
        pdf.setLineWidth(1);
        pdf.rect(eventX, eventY, eventWidth, eventHeight, 'S');
        pdf.setFillColor(245, 158, 11);
        pdf.rect(eventX, eventY, 4, eventHeight, 'F');
      }

      // Event text
      pdf.setTextColor(0, 0, 0);
      pdf.setFont('helvetica', 'bold');
      pdf.setFontSize(11);

      const eventTitle = event.title || 'Untitled Event';
      const cleanTitle = eventTitle.replace(' Appointment', '').trim();
      pdf.text(cleanTitle, eventX + 8, eventY + 14);

      // Time range
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(9);
      const timeRange = `${format(startTime, 'h:mm a')} - ${format(endTime, 'h:mm a')}`;
      pdf.text(timeRange, eventX + 8, eventY + 26);

      // Additional details if available
      if (event.location) {
        pdf.setFontSize(8);
        pdf.text(`📍 ${event.location}`, eventX + 8, eventY + 36);
      }

      // Link back to weekly overview for this event
      pdf.link(eventX, eventY, eventWidth, eventHeight, { pageNumber: 1 });
    }
  });

  // Footer with navigation
  pdf.setFont('helvetica', 'normal');
  pdf.setFontSize(10);
  pdf.text(`Page ${dayIndex + 2} of 8 | Click events to return to weekly overview`, config.width / 2, config.height - 35, { align: 'center' });
}
