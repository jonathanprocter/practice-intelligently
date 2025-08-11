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

  // Rendering weekly calendar grid

  // Use the week prop directly instead of recalculating
  const calendarDays = useMemo(() => {
    console.log('📅 Computing calendar days for week starting:', week && week.length > 0 ? format(week[0].date, 'EEE MMM dd yyyy') : 'No week provided');
    console.log('📅 Total events available for filtering:', events?.length || 0);

    if (!week || week.length === 0) {
      console.log('⚠️ No week data provided to calendar grid');
      return [];
    }

    if (!events || events.length === 0) {
      console.log('⚠️ No events provided to calendar grid');
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
            console.log(`📅 Event "${event.title}" matches ${format(day.date, 'EEE MMM dd yyyy')}`);
          }

          return matches;
        } catch (error) {
          console.error('Error filtering event:', error, event);
          return false;
        }
      });

      console.log(`📅 ${format(day.date, 'EEE MMM dd yyyy')}: Found ${dayEvents.length} events`);

      return {
        ...day,
        events: dayEvents
      };
    });
  }, [week, events]);


  return (
    <div className="weekly-calendar-container">
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
                      <div 
                        className="appointment-client-name font-semibold text-gray-900"
                        style={{ 
                          fontSize: event.slotsToSpan >= 3 ? '12px' : event.slotsToSpan >= 2 ? '11px' : '10px',
                          lineHeight: '1.2',
                          marginBottom: '1px',
                          wordWrap: 'break-word',
                          wordBreak: 'break-word',
                          overflow: 'hidden'
                        }}
                      >
                        {event.clientName || cleanEventTitle(event.title || 'Event')}
                      </div>
                      <div 
                        className="appointment-source text-blue-600"
                        style={{ 
                          fontSize: event.slotsToSpan >= 3 ? '10px' : '9px',
                          lineHeight: '1.1',
                          marginBottom: 'auto',
                          fontWeight: '500',
                          paddingBottom: '2px',
                          borderBottom: '1px solid #e2e8f0',
                          overflow: 'hidden',
                          wordWrap: 'break-word',
                          wordBreak: 'break-word',
                          flex: '1',
                          display: '-webkit-box',
                          WebkitLineClamp: event.slotsToSpan >= 3 ? 3 : event.slotsToSpan >= 2 ? 2 : 1,
                          WebkitBoxOrient: 'vertical'
                        }}
                      >
                        {event.calendarName?.includes('Simple Practice') ? 'SimplePractice' : 
                         event.calendarName?.includes('Google') ? 'Google Calendar' : 
                         event.source === 'google' ? 'Google Calendar' : 'SimplePractice'} | {event.location || 'Office'}
                      </div>
                      <div 
                        className="appointment-time text-gray-600"
                        style={{ 
                          fontSize: event.slotsToSpan >= 3 ? '10px' : '9px',
                          lineHeight: '1.1',
                          fontWeight: '500',
                          paddingTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {new Date(event.startTime).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })} - {new Date(event.endTime).toLocaleTimeString('en-US', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
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