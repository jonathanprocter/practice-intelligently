import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';

// Clean event title utility function
function cleanEventTitle(title: string): string {
    if (!title) return '';

    // Remove " Appointment" suffix if present
    let cleanedTitle = title.replace(/\s+Appointment\s*$/i, '');

    // Remove extra whitespace and emojis for PDF compatibility
    cleanedTitle = cleanedTitle.trim()
        .replace(/\s+/g, ' ')
        .replace(/[\u{1F600}-\u{1F64F}]|[\u{1F300}-\u{1F5FF}]|[\u{1F680}-\u{1F6FF}]|[\u{1F1E0}-\u{1F1FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}]/gu, '');

    return cleanedTitle;
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
        eventTime: number;
        eventSource: number;
    };
}

// PERFECT CONFIGURATION - DO NOT MODIFY WITHOUT USER APPROVAL
// Calculate perfect centering: 
// Total grid width = timeColumnWidth + (7 * dayColumnWidth) = 60 + (7 * 100) = 760px
// Available space = pageWidth - totalGridWidth = 792 - 760 = 32px
// Perfect margins = 32px / 2 = 16px
const CURRENT_WEEKLY_CONFIG: CurrentWeeklyExportConfig = {
    pageWidth: 792, // 11" landscape
    pageHeight: 612, // 8.5" landscape
    margins: 16, // Perfect centering: (792 - 760) / 2 = 16
    headerHeight: 40,
    timeColumnWidth: 60,
    dayColumnWidth: 100, // Clean 100px for 7 days = 700px total
    timeSlotHeight: 14, // Optimized for 36 half-hour slots
    fonts: {
        title: 16,
        weekInfo: 12,
        dayHeader: 9,
        timeLabel: 8,
        eventTitle: 5,
        eventTime: 4,
        eventSource: 4,
    },
};

export const exportCurrentWeeklyView = (
    events: CalendarEvent[],
    weekStart: Date,
    weekEnd: Date
): void => {
    const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'pt',
        format: [CURRENT_WEEKLY_CONFIG.pageWidth, CURRENT_WEEKLY_CONFIG.pageHeight]
    });

    pdf.setFont('helvetica');

    // Draw header
    drawCurrentWeeklyHeader(pdf, weekStart, weekEnd);

    // Draw grid and events
    drawCurrentWeeklyGrid(pdf, events, weekStart);

    // Save the PDF with proper filename format
    const weekStartStr = weekStart.toLocaleDateString('en-US', {
        month: '2-digit', 
        day: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');
    const weekEndStr = weekEnd.toLocaleDateString('en-US', {
        month: '2-digit', 
        day: '2-digit',
        year: 'numeric'
    }).replace(/\//g, '-');

    pdf.save(`weekly-planner-${weekStartStr}-to-${weekEndStr}.pdf`);
};

const drawCurrentWeeklyHeader = (pdf: jsPDF, weekStart: Date, weekEnd: Date): void => {
    const { margins, fonts } = CURRENT_WEEKLY_CONFIG;

    // Title
    pdf.setFontSize(fonts.title);
    pdf.setFont('helvetica', 'bold');
    pdf.text('WEEKLY PLANNER', margins, margins + 20);

    // Week info
    pdf.setFontSize(fonts.weekInfo);
    pdf.setFont('helvetica', 'normal');
    const weekStartStr = weekStart.toLocaleDateString('en-US', {
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    const weekEndStr = weekEnd.toLocaleDateString('en-US', {
        month: 'long', 
        day: 'numeric',
        year: 'numeric'
    });
    pdf.text(`${weekStartStr} - ${weekEndStr}`, margins, margins + 35);

    // Header separator line
    pdf.setLineWidth(0.5);
    pdf.line(margins, margins + 40, CURRENT_WEEKLY_CONFIG.pageWidth - margins, margins + 40);
};

const drawCurrentWeeklyGrid = (pdf: jsPDF, events: CalendarEvent[], weekStart: Date): void => {
    const {
        margins, 
        headerHeight, 
        timeColumnWidth, 
        dayColumnWidth, 
        timeSlotHeight,
        fonts 
    } = CURRENT_WEEKLY_CONFIG;

    const gridStartY = margins + headerHeight;
    const totalSlots = 36; // 6:00 AM to 11:30 PM (half-hour slots)

    // Draw day headers
    pdf.setFontSize(fonts.dayHeader);
    pdf.setFont('helvetica', 'bold');

    // Time column header
    pdf.text('TIME', margins + timeColumnWidth/2 - 10, gridStartY + 15);

    // Day headers with dynamic dates
    const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    for (let i = 0; i < 7; i++) {
        const currentDay = new Date(weekStart);
        currentDay.setDate(weekStart.getDate() + i);
        
        const dayHeader = `${dayNames[i]} ${currentDay.getMonth() + 1}/${currentDay.getDate()}/${currentDay.getFullYear()}`;
        const x = margins + timeColumnWidth + i * dayColumnWidth + dayColumnWidth/2 - 30;
        
        pdf.text(dayHeader, x, gridStartY + 15);
    }

    // Draw time grid with alternating backgrounds
    pdf.setFontSize(fonts.timeLabel);
    pdf.setFont('helvetica', 'normal');

    for (let slot = 0; slot < totalSlots; slot++) {
        const hour = Math.floor(slot / 2) + 6; // Start at 6 AM
        const minute = (slot % 2) * 30;
        const timeString = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
        
        const y = gridStartY + 20 + slot * timeSlotHeight;
        
        // Alternating row backgrounds (top-of-hour grey, half-hour white)
        if (minute === 0) {
            pdf.setFillColor(230, 230, 230); // Grey #E6E6E6
            pdf.rect(margins, y - 2, timeColumnWidth + 7 * dayColumnWidth, timeSlotHeight, 'F');
        }
        
        // Draw time label
        pdf.setTextColor(0, 0, 0);
        pdf.text(timeString, margins + timeColumnWidth/2 - 12, y + timeSlotHeight/2 + 2);
        
        // Draw grid lines
        pdf.setLineWidth(0.3);
        pdf.setDrawColor(200, 200, 200);
        pdf.line(margins, y, margins + timeColumnWidth + 7 * dayColumnWidth, y);
    }

    // Draw vertical grid lines
    for (let i = 0; i <= 7; i++) {
        const x = margins + (i === 0 ? timeColumnWidth : timeColumnWidth + i * dayColumnWidth);
        pdf.line(x, gridStartY + 20, x, gridStartY + 20 + totalSlots * timeSlotHeight);
    }

    // Draw events
    drawWeeklyEvents(pdf, events, weekStart, gridStartY);
};

const drawWeeklyEvents = (pdf: jsPDF, events: CalendarEvent[], weekStart: Date, gridStartY: number): void => {
    const { margins, timeColumnWidth, dayColumnWidth, timeSlotHeight, fonts } = CURRENT_WEEKLY_CONFIG;

    events.forEach(event => {
        const eventStart = new Date(event.start);
        const eventEnd = new Date(event.end);
        
        // Calculate day index (0-6 for Mon-Sun)
        const dayIndex = (eventStart.getDay() + 6) % 7; // Convert Sunday=0 to Monday=0
        
        // Skip events outside the current week
        if (eventStart < weekStart || eventStart > new Date(weekStart.getTime() + 7 * 24 * 60 * 60 * 1000)) {
            return;
        }
        
        // Calculate position
        const startHour = eventStart.getHours();
        const startMinute = eventStart.getMinutes();
        const endHour = eventEnd.getHours();
        const endMinute = eventEnd.getMinutes();
        
        // Convert to time slots (30-minute intervals starting from 6 AM)
        const startSlot = (startHour - 6) * 2 + Math.floor(startMinute / 30);
        const endSlot = (endHour - 6) * 2 + Math.ceil(endMinute / 30);
        
        // Skip events outside business hours
        if (startSlot < 0 || startSlot >= 36) return;
        
        const eventHeight = Math.max(1, endSlot - startSlot) * timeSlotHeight - 2;
        const eventX = margins + timeColumnWidth + dayIndex * dayColumnWidth + 2;
        const eventY = gridStartY + 20 + startSlot * timeSlotHeight + 1;
        const eventWidth = dayColumnWidth - 4;
        
        // Determine event styling based on source
        let borderColor: [number, number, number];
        let borderStyle: 'solid' | 'dotted' = 'solid';
        let borderWidth = 5;
        
        if (event.source === 'SimplePractice' || event.calendarId?.includes('79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822')) {
            borderColor = [100, 149, 237]; // Cornflower blue #6495ED
        } else if (event.source === 'Google Calendar' || event.calendarId?.includes('jonathan.procter@gmail.com')) {
            borderColor = [34, 197, 94]; // Green #22C55E
            borderStyle = 'dotted';
        } else if (event.source === 'Holiday' || event.calendarId?.includes('holiday')) {
            borderColor = [245, 158, 11]; // Orange #F59E0B
        } else {
            borderColor = [100, 149, 237]; // Default to cornflower blue
        }
        
        // Draw event background (white)
        pdf.setFillColor(255, 255, 255);
        pdf.rect(eventX, eventY, eventWidth, eventHeight, 'F');
        
        // Draw left border (thick colored line)
        pdf.setDrawColor(borderColor[0], borderColor[1], borderColor[2]);
        pdf.setLineWidth(borderWidth);
        pdf.line(eventX, eventY, eventX, eventY + eventHeight);
        
        // Draw event border
        pdf.setLineWidth(0.5);
        pdf.setDrawColor(180, 180, 180);
        pdf.rect(eventX, eventY, eventWidth, eventHeight, 'S');
        
        // Draw event content
        const contentX = eventX + 8;
        const contentY = eventY + 8;
        const contentWidth = eventWidth - 16;
        
        // Event title (5pt bold, max 2 lines)
        pdf.setFontSize(fonts.eventTitle);
        pdf.setFont('helvetica', 'bold');
        pdf.setTextColor(0, 0, 0);
        
        const title = cleanEventTitle(event.title);
        const titleLines = pdf.splitTextToSize(title, contentWidth);
        const maxTitleLines = 2;
        
        for (let i = 0; i < Math.min(titleLines.length, maxTitleLines); i++) {
            if (contentY + i * 6 < eventY + eventHeight - 15) {
                pdf.text(titleLines[i], contentX, contentY + i * 6);
            }
        }
        
        // Source & Location (4pt grey)
        if (eventHeight > 20) {
            pdf.setFontSize(fonts.eventSource);
            pdf.setFont('helvetica', 'normal');
            pdf.setTextColor(128, 128, 128);
            
            const source = event.source || 'Calendar';
            const location = getLocationDisplay(event, eventStart);
            const sourceText = `${source} | ${location}`;
            
            pdf.text(sourceText, contentX, contentY + 12);
            
            // Horizontal separator line
            if (eventHeight > 25) {
                pdf.setDrawColor(200, 200, 200);
                pdf.setLineWidth(0.3);
                pdf.line(contentX, contentY + 14, contentX + contentWidth - 10, contentY + 14);
                
                // Time range (4pt grey)
                const timeText = `${eventStart.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })} - ${eventEnd.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
                pdf.text(timeText, contentX, contentY + 18);
            }
        }
    });
};

// Location logic by day as specified
const getLocationDisplay = (event: CalendarEvent, eventDate: Date): string => {
    // If event has explicit location, use it
    if (event.location && event.location.trim()) {
        return event.location;
    }
    
    // Default location logic by day
    const dayOfWeek = eventDate.getDay();
    switch (dayOfWeek) {
        case 1: return 'Woodbury'; // Monday
        case 2: return 'Telehealth'; // Tuesday
        case 3: // Wednesday
        case 4: // Thursday
        case 5: return 'RVC'; // Friday
        case 6: // Saturday
        case 0: return 'Telehealth'; // Sunday
        default: return 'RVC';
    }
};