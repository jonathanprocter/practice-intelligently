import React, { useState } from 'react';
import { generateTimeSlots, getEventDurationInSlots, isEventInTimeSlot } from '../../utils/timeSlots';
import { formatDateShort } from '../../utils/dateUtils';
import { cleanEventTitle } from '../../utils/textCleaner';
import { wrapText } from '../../utils/textWrappers';
import { CalendarEvent, CalendarDay } from '../../types/calendar';
import { cn } from '@/lib/utils';
import { getLocationDisplay } from '../../utils/locationUtils';
import { addDays, format } from 'date-fns'; // Assuming date-fns is used for formatting and date manipulation
import { useMemo } from 'react'; // Import useMemo
import { Button } from '@/components/ui/button';
import { Package, Sparkles } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { exportWeeklyPackageFromCalendar } from '../../utils/bidirectionalWeeklyPackageLinked';
import { exportAdvancedBidirectionalWeekly } from '../../utils/bidirectionalLinkedPDFExport';
import { startOfWeek, endOfWeek } from 'date-fns';

interface WeeklyCalendarGridProps {
  week: CalendarDay[]; // This prop seems unused in the provided code, but kept for signature completeness.
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
}

export const WeeklyCalendarGrid = ({
  week, // This prop is defined but not used in the component's render logic.
  events,
  onDayClick,
  onTimeSlotClick,
  onEventClick,
  onEventMove
}: WeeklyCalendarGridProps) => {

  // Events processed and ready for rendering
  const timeSlots = generateTimeSlots();
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<{date: Date, time: string} | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [exportStatus, setExportStatus] = useState<string>('');
  const { toast } = useToast();

  // Calculate weekStart from the week prop - ensure it's the beginning of the week (Sunday)
  const weekStart = useMemo(() => {
    if (week && week.length > 0) {
      const firstDay = week[0].date;
      // Ensure we get the start of the week (Sunday)
      const startOfWeek = new Date(firstDay);
      startOfWeek.setDate(firstDay.getDate() - firstDay.getDay());
      startOfWeek.setHours(0, 0, 0, 0);
      return startOfWeek;
    }
    return new Date(); // Fallback to current date
  }, [week]);

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    // Ensure dates are properly parsed
    const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

    // Skip invalid dates
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return;
    }

    // Set visual state
    setDraggedEventId(event.id);

    // Set drag data
    e.dataTransfer.setData('text/plain', JSON.stringify({
      eventId: event.id,
      originalStartTime: startTime.toISOString(),
      originalEndTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime()
    }));

    // Set drag effect
    e.dataTransfer.effectAllowed = 'move';
    // Add some visual feedback
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, timeSlot: { hour: number; minute: number }) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    // Set drop zone for visual feedback
    setDropZone({ date, time: `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}` });
  };

  const handleDragLeave = (e: React.DragEvent) => {
    // Clear drop zone when leaving
    setDropZone(null);
  };

  const handleDragEnd = (e: React.DragEvent) => {
    // Clear drag state
    setDraggedEventId(null);
    setDropZone(null);
  };

  const handleDrop = (e: React.DragEvent, date: Date, timeSlot: { hour: number; minute: number }) => {
    e.preventDefault();
    if (!onEventMove) return;

    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const newStartTime = new Date(date);
      newStartTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

      const newEndTime = new Date(newStartTime.getTime() + dragData.duration);

      onEventMove(dragData.eventId, newStartTime, newEndTime);
    } catch (error) {
      // Error handling drop (production logging disabled)
    } finally {
      // Clear drag state
      setDraggedEventId(null);
      setDropZone(null);
    }
  };

  // Function to get default location based on day of week
  const getDefaultLocation = (date: Date) => {
    const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
    switch (dayOfWeek) {
      case 1: // Monday
        return 'Woodbury';
      case 2: // Tuesday
        return 'Telehealth';
      case 3: // Wednesday
      case 4: // Thursday
      case 5: // Friday
        return 'Rockville Centre';
      default:
        return 'Remote/Office';
    }
  };

  const getAllDayEventsForDate = (date: Date) => {
    return events.filter(event => {
      // Ensure dates are properly parsed
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

      // Skip invalid dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return false;
      }

      const eventDate = startTime;

      // Check if backend marked it as all-day OR if it's a holiday/weather event (these are typically all-day)
      const isMarkedAllDay = (event as any).isAllDay;
      const isHolidayOrWeather = event.title?.includes('Forecast') || 
                                event.title?.includes('Holiday') || 
                                event.calendarName?.includes('Holiday');

      // Use Eastern Time for consistent date comparison
      const eventDateEDT = eventDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      const dateEDT = date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
      return eventDateEDT === dateEDT && (isMarkedAllDay || isHolidayOrWeather);
    });
  };

  const handleBidirectionalExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating bidirectional weekly package...');

      // Use the first day of the week to determine the current week
      const currentDate = week && week.length > 0 ? week[0].date : new Date();

      console.log('🎯 EXACT Weekly Package (8 Pages) from Weekly Grid');
      console.log(`📅 Week Start: ${format(weekStart, 'MMM dd, yyyy')}`);
      console.log(`📊 Available Events: ${events.length}`);

      // Export the bidirectional weekly package
      await exportWeeklyPackageFromCalendar(currentDate, events);

      setExportStatus('✅ Bidirectional weekly package exported successfully!');

      toast({
        title: "Export Complete",
        description: "Your bidirectional weekly package (8 pages) has been exported successfully!",
      });

      // Clear status after 3 seconds
      setTimeout(() => setExportStatus(''), 3000);

    } catch (error) {
      console.error('Export failed:', error);
      setExportStatus('❌ Export failed. Please try again.');

      toast({
        title: "Export Failed",
        description: "Failed to export the weekly package. Please try again.",
        variant: "destructive"
      });

      setTimeout(() => setExportStatus(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  const handleAdvancedExport = async () => {
    try {
      setIsExporting(true);
      setExportStatus('Generating advanced bidirectional package...');

      const currentDate = week && week.length > 0 ? week[0].date : new Date();
      const weekStartDate = startOfWeek(currentDate, { weekStartsOn: 1 });
      const weekEndDate = endOfWeek(currentDate, { weekStartsOn: 1 });

      await exportAdvancedBidirectionalWeekly(weekStartDate, weekEndDate, events);

      setExportStatus('✅ Advanced bidirectional package exported successfully!');

      toast({
        title: "Advanced Export Complete",
        description: "Your advanced bidirectional package has been exported successfully!",
      });

      setTimeout(() => setExportStatus(''), 3000);

    } catch (error) {
      console.error('Advanced export failed:', error);
      setExportStatus('❌ Advanced export failed. Please try again.');

      toast({
        title: "Export Failed",
        description: "Failed to export the advanced package. Please try again.",
        variant: "destructive"
      });

      setTimeout(() => setExportStatus(''), 3000);
    } finally {
      setIsExporting(false);
    }
  };

  // Rendering weekly calendar grid

  // Use the week prop directly instead of recalculating
  const calendarDays = useMemo(() => {
    if (!week || week.length === 0) {
      return [];
    }

    if (!events || events.length === 0) {
      return week.map(day => ({
        ...day,
        events: []
      }));
    }

    return week.map(day => {
      const dayEvents = events.filter(event => {
        if (!event || !event.startTime) return false;

        try {
          const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
          if (isNaN(eventDate.getTime())) return false;

          // Use Eastern Time for consistent date comparison
          const eventDateEDT = eventDate.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const dayDateEDT = day.date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
          const matches = eventDateEDT === dayDateEDT;

          if (matches) {
//             console.log(`📅 Event "${event.title}" matches ${format(day.date, 'EEE MMM dd yyyy')}`);
          }

          return matches;
        } catch (error) {
          console.error('Error filtering event:', error, event);
          return false;
        }
      });

//       console.log(`📅 ${format(day.date, 'EEE MMM dd yyyy')}: Found ${dayEvents.length} events`);

      return {
        ...day,
        events: dayEvents
      };
    });
  }, [week, events]);


  return (
    <div className="weekly-calendar-container">
      {/* Bidirectional Export Header */}
      <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <Package className="h-5 w-5 text-blue-600" />
            <h3 className="font-semibold text-blue-800">Weekly Package Export</h3>
          </div>
          <div className="text-sm text-blue-600">
            {events.length} events this week
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2">
          <Button
            onClick={handleBidirectionalExport}
            disabled={isExporting}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300"
            size="sm"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Package className="mr-2 h-4 w-4" />
                Export Weekly Package (8 Pages)
              </>
            )}
          </Button>

          <Button
            onClick={handleAdvancedExport}
            disabled={isExporting}
            variant="outline"
            className="flex-1 border-blue-300 text-blue-700 hover:bg-blue-50"
            size="sm"
          >
            {isExporting ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                Exporting...
              </>
            ) : (
              <>
                <Sparkles className="mr-2 h-4 w-4" />
                Advanced Export
              </>
            )}
          </Button>
        </div>

        {exportStatus && (
          <div className={`mt-3 p-2 rounded text-sm text-center font-medium ${
            exportStatus.includes('✅') 
              ? 'bg-green-100 text-green-800 border border-green-200' 
              : exportStatus.includes('❌')
              ? 'bg-red-100 text-red-800 border border-red-200'
              : 'bg-blue-100 text-blue-800 border border-blue-200'
          }`}>
            {exportStatus}
          </div>
        )}

        <div className="mt-2 text-xs text-blue-600">
          💡 Exports 8 pages: 1 weekly overview + 7 daily pages with full bidirectional navigation
        </div>
      </div>

      {/* Day headers with day names */}
      <div className="grid grid-cols-8 border border-gray-200 mb-0">
        {/* Empty corner for alignment */}
        <div className="border-r border-gray-200 p-2 bg-gray-50"></div>

        {/* Day headers */}
        {week.map((day) => (
          <div
            key={day.date.toISOString()}
            className={cn(
              "calendar-day-header border-r border-gray-200 p-2 bg-gray-50 text-center cursor-pointer",
              day.isToday && "calendar-day-today bg-blue-50"
            )}
            onClick={() => {
              try {
                onDayClick?.(day.date);
              } catch (error) {
                console.error('Error in day click handler:', error);
              }
            }}
          >
            <div className="font-medium text-sm">{formatDateShort(day.date)}</div>
            <div className="text-xs text-gray-600 mt-1">
              {day.date.toLocaleDateString('en-US', { weekday: 'long' })}
            </div>
          </div>
        ))}
      </div>

      {/* All-day events section */}
      <div className="mb-4">
        <div className="grid grid-cols-8 border border-gray-200 border-t-0 bg-gray-50">
          <div className="border-r border-gray-200 p-2 font-medium text-sm">
            All Day
          </div>
          {week.map((day) => {
            const allDayEvents = getAllDayEventsForDate(day.date);
            return (
              <div
                key={`allday-${day.date.toISOString()}`}
                className="border-r border-gray-200 p-2 min-h-[60px]"
              >
                {allDayEvents.map((event) => (
                  <div
                    key={`allday-${event.id}`}
                    className="text-xs p-1 mb-1 bg-blue-100 rounded cursor-pointer hover:bg-blue-200"
                    onClick={() => onEventClick(event)}
                  >
                    {event.clientName || event.title || 'All Day Event'}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      </div>

      <div className="grid grid-cols-8 border border-gray-200">
        {/* Time column header */}
        <div className="border-r border-gray-200 p-2 bg-gray-50 font-medium text-sm">
          Time
        </div>

        {/* Simplified column headers for timed events */}
        {week.map((day) => (
          <div
            key={`timed-header-${day.date.toISOString()}`}
            className={cn(
              "border-r border-gray-200 p-2 bg-gray-50 text-center text-xs text-gray-600",
              day.isToday && "bg-blue-50"
            )}
          >
            {getDefaultLocation(day.date)}
          </div>
        ))}

        {/* Time slots */}
        {timeSlots.map((timeSlot) => (
          <div key={`timeslot-${timeSlot.hour}-${timeSlot.minute}`} className="contents">
            {/* Time label */}
            <div className="border-r border-b border-gray-200 p-2 text-xs text-gray-600 bg-gray-50">
              {timeSlot.display}
            </div>

            {/* Day columns */}
            {week.map((day) => {
              // Get all events for this day using consistent Eastern Time comparison
              const allDayEvents = events.filter(event => {
                if (!event.startTime) return false;
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                if (isNaN(eventStart.getTime())) return false;

                // Use Eastern Time for consistent date comparison
                const eventDateEDT = eventStart.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
                const dayDateEDT = day.date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' });
                return eventDateEDT === dayDateEDT;
              });

              // Filter events that START in this specific time slot (not span through it)
              const slotStartEvents = allDayEvents.filter(event => {
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);

                // Convert to Eastern Time for hour/minute comparison
                const edtTime = eventStart.toLocaleString('en-US', { 
                  timeZone: 'America/New_York',
                  hour12: false,
                  hour: '2-digit',
                  minute: '2-digit'
                });
                const [hourStr, minuteStr] = edtTime.split(':');
                const eventHour = parseInt(hourStr);
                const eventMinute = parseInt(minuteStr);

                // Check if event starts in this exact time slot
                const startsInSlot = eventHour === timeSlot.hour && 
                  ((timeSlot.minute === 0 && eventMinute < 30) || 
                   (timeSlot.minute === 30 && eventMinute >= 30));

                // Exclude all-day events from timed slots
                const isMarkedAllDay = (event as any).isAllDay;
                const isHolidayOrWeather = event.title?.includes('Forecast') || 
                                          event.title?.includes('Holiday') || 
                                          event.calendarName?.includes('Holiday');

                return startsInSlot && !isMarkedAllDay && !isHolidayOrWeather;
              });

              // Calculate how many 30-minute slots each event should span
              const eventsWithSpan = slotStartEvents.map(event => {
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
                const durationMs = eventEnd.getTime() - eventStart.getTime();
                const durationMinutes = durationMs / (1000 * 60);
                const slotsToSpan = Math.max(1, Math.ceil(durationMinutes / 30));

                return { ...event, slotsToSpan };
              });

              const isDropTarget = dropZone && 
                dropZone.date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) === 
                day.date.toLocaleDateString('en-CA', { timeZone: 'America/New_York' }) &&
                dropZone.time === `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}`;

              return (
                <div
                  key={`${day.date.toISOString()}-${timeSlot.hour}-${timeSlot.minute}`}
                  className={cn(
                    "calendar-time-slot border-r border-b border-gray-200 p-1 min-h-[40px] relative",
                    isDropTarget && "drag-over-target"
                  )}
                  onClick={() => {
                    try {
                      onTimeSlotClick?.(day.date, timeSlot.display);
                    } catch (error) {
                      console.error('Error in time slot click handler:', error);
                    }
                  }}
                  onDragOver={(e) => handleDragOver(e, day.date, timeSlot)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.date, timeSlot)}
                  style={{ position: 'relative', overflow: 'visible', minHeight: '40px' }}
                >
                  {eventsWithSpan.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "calendar-event",
                        `calendar-event-${event.status?.toLowerCase() || 'confirmed'}`,
                        draggedEventId === event.id && "opacity-50"
                      )}
                      style={{
                        height: `${Math.max(event.slotsToSpan * 40 - 6, 36)}px`, // Better height calculation
                        width: 'calc(100% - 6px)',
                        position: 'absolute',
                        top: '3px',
                        left: '3px',
                        zIndex: 10,
                        backgroundColor: '#f8fafc',
                        border: '1px solid #e2e8f0',
                        borderLeft: '3px solid #3b82f6',
                        borderRadius: '4px',
                        padding: event.slotsToSpan >= 3 ? '6px' : event.slotsToSpan >= 2 ? '4px' : '3px',
                        overflow: 'hidden',
                        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        justifyContent: 'flex-start'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        try {
                          onEventClick?.(event);
                        } catch (error) {
                          console.error('Error in event click handler:', error);
                        }
                      }}
                      draggable={!!onEventMove}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                    >
                      {/* Event content */}
                      <div className="flex-1 min-h-0">
                        {/* Client name or title */}
                        <div 
                          className="font-medium text-xs leading-tight mb-1"
                          style={{ 
                            fontSize: event.slotsToSpan >= 3 ? '11px' : '10px',
                            lineHeight: '1.2'
                          }}
                        >
                          {event.clientName ? 
                            wrapText(event.clientName, event.slotsToSpan >= 3 ? 20 : 15) : 
                            wrapText(cleanEventTitle(event.title), event.slotsToSpan >= 3 ? 20 : 15)
                          }
                        </div>

                        {/* Time display for longer events */}
                        {event.slotsToSpan >= 2 && (
                          <div 
                            className="text-gray-600 text-xs"
                            style={{ fontSize: '9px', lineHeight: '1.1' }}
                          >
                            {(() => {
                              const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                              const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

                              if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                                return '';
                              }

                              const startStr = startTime.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'America/New_York'
                              });
                              const endStr = endTime.toLocaleTimeString('en-US', { 
                                hour: 'numeric', 
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'America/New_York'
                              });

                              return `${startStr} - ${endStr}`;
                            })()}
                          </div>
                        )}

                        {/* Location for longer events */}
                        {event.slotsToSpan >= 3 && event.location && (
                          <div 
                            className="text-gray-500 text-xs mt-1"
                            style={{ fontSize: '8px', lineHeight: '1.1' }}
                          >
                            📍 {getLocationDisplay(event.location).display}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

