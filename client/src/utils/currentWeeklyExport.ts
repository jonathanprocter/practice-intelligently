import jsPDF from 'jspdf';
import { CalendarEvent } from '../types/calendar';

// Clean event title utility function
function cleanEventTitle(title: string): string {
    if (!title) return '';

    // Remove " Appointment" suffix if present
    let cleanedTitle = title.replace(/\s+Appointment\s*$/i, '');

    // Remove extra whitespace
    cleanedTitle = cleanedTitle.trim().replace(/\s+/g, ' ');

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
    };
}

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
    timeSlotHeight: 14,
    fonts: {
          title: 16,
          weekInfo: 12,
          dayHeader: 9,
          timeLabel: 7,
          eventTitle: 8, // Increased for better readability
          eventTime: 6,
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

      // Save the PDF
      const weekStartStr = weekStart.toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric' 
      });
      const weekEndStr = weekEnd.toLocaleDateString('en-US', {
            month: 'short', 
            day: 'numeric',
            year: 'numeric'
      });

      pdf.save(`current-weekly-${weekStartStr}-${weekEndStr}.pdf`);
  };

const drawCurrentWeeklyHeader = (pdf: jsPDF, weekStart: Date, weekEnd: Date): void => {
    const { pageWidth, margins, headerHeight, fonts } = CURRENT_WEEKLY_CONFIG;

    // Title
    pdf.setFontSize(fonts.title);
    pdf.setFont('helvetica', 'bold');
    pdf.text('WEEKLY PLANNER', margins, margins + 20);

    // Week info
    pdf.setFontSize(fonts.weekInfo);
    pdf.setFont('helvetica', 'normal');
    const weekStartStr = weekStart.toLocaleDateString('en-US', {
          month: 'long', 
          day: 'numeric' 
    });
    const weekEndStr = weekEnd.toLocaleDateString('en-US', {
          month: 'long', 
          day: 'numeric',
          year: 'numeric'
    });
    pdf.text(`${weekStartStr} - ${weekEndStr}`, margins, margins + 35);
};

const drawCurrentWeeklyGrid = (pdf: jsPDF, events: CalendarEvent[], weekStart: Date): void => {
    const {
          pageWidth, 
          pageHeight, 
          margins, 
          headerHeight, 
          timeColumnWidth, 
          dayColumnWidth, 
          timeSlotHeight,
          fonts 
    } = CURRENT_WEEKLY_CONFIG;

    const gridStartY = margins + headerHeight;
    const gridHeight = pageHeight - margins * 2 - headerHeight;
    const totalSlots = 36; // 6:00 AM to 11:30 PM (half-hour slots)

    // Draw day headers
    pdf.setFontSize(fonts.dayHeader);
    pdf.setFont('helvetica', 'bold');

    const dayNames = ['TIME', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];

    for (let i = 0; i < dayNames.length; i++) {
          const x = margins + (i === 0 ? 0 : timeColumnWidth + (i - 1) * dayColumnWidth);
          const width = i === 0 ? timeColumnWidth : da
    }
    }
}
    })
    })
}
      })
      })
      })
  }
)
    }
}}
}
}