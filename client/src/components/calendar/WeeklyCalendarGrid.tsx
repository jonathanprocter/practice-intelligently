import React, { useState } from 'react';
import { generateTimeSlots, getEventDurationInSlots, isEventInTimeSlot } from '../../utils/timeSlots';
import { formatDateShort } from '../../utils/dateUtils';
import { cleanEventTitle } from '../../utils/textCleaner';
import { wrapText } from '../../utils/textWrappers';
import { CalendarEvent, CalendarDay } from '../../types/calendar';
import { cn } from '@/lib/utils';
import { getLocationDisplay } from '../../utils/locationUtils';

interface WeeklyCalendarGridProps {
  week: CalendarDay[];
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
}

export const WeeklyCalendarGrid = ({
  week,
  events,
  onDayClick,
  onTimeSlotClick,
  onEventClick,
  onEventMove
}: WeeklyCalendarGridProps) => {
  const timeSlots = generateTimeSlots();
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [dropZone, setDropZone] = useState<{date: Date, time: string} | null>(null);

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
      console.error('Error handling drop:', error);
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
      
      return eventDate.toDateString() === date.toDateString() && (isMarkedAllDay || isHolidayOrWeather);
    });
  };

  console.log('WeeklyCalendarGrid rendering with:', {
    totalEvents: events.length,
    weekDates: week.map(d => d.date.toDateString()),
    sampleEvents: events.slice(0, 3).map(e => ({
      title: e.clientName || e.title,
      start: e.startTime,
      startStr: e.startTime instanceof Date ? e.startTime.toISOString() : e.startTime
    }))
  });

  return (
    <div className="weekly-calendar-container">
      {/* All-day events section */}
      <div className="mb-4">
        <div className="grid grid-cols-8 border border-gray-200 bg-gray-50">
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
        
        {/* Day headers */}
        {week.map((day) => (
          <div
            key={day.date.toISOString()}
            className={cn(
              "calendar-day-header border-r border-gray-200",
              day.isToday && "calendar-day-today"
            )}
            onClick={() => onDayClick(day.date)}
          >
            <div>{formatDateShort(day.date)}</div>
            <div className="text-xs text-gray-500">{day.date.getDate()}</div>
          </div>
        ))}

        {/* Time slots */}
        {timeSlots.map((timeSlot) => (
          <React.Fragment key={`${timeSlot.hour}-${timeSlot.minute}`}>
            {/* Time label */}
            <div className="border-r border-b border-gray-200 p-2 text-xs text-gray-600 bg-gray-50">
              {timeSlot.display}
            </div>
            
            {/* Day columns */}
            {week.map((day) => {
              // Get all events for this day
              const allDayEvents = events.filter(event => {
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                return eventStart.toDateString() === day.date.toDateString();
              });
              
              // Filter events that START in this specific time slot (not span through it)
              const slotStartEvents = allDayEvents.filter(event => {
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                const eventHour = eventStart.getHours();
                const eventMinute = eventStart.getMinutes();
                
                // Check if event starts in this exact time slot
                const startsInSlot = eventHour === timeSlot.hour && 
                  ((timeSlot.minute === 0 && eventMinute < 30) || 
                   (timeSlot.minute === 30 && eventMinute >= 30));
                
                return startsInSlot;
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
                dropZone.date.toDateString() === day.date.toDateString() &&
                dropZone.time === `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}`;
              
              return (
                <div
                  key={`${day.date.toISOString()}-${timeSlot.hour}-${timeSlot.minute}`}
                  className={cn(
                    "calendar-time-slot border-r border-b border-gray-200 p-1 min-h-[40px] relative",
                    isDropTarget && "drag-over-target"
                  )}
                  onClick={() => onTimeSlotClick(day.date, timeSlot.display)}
                  onDragOver={(e) => handleDragOver(e, day.date, timeSlot)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.date, timeSlot)}
                  style={{ position: 'relative', overflow: 'visible' }}
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
                        height: `${event.slotsToSpan * 40 - 4}px`, // 40px per slot minus border/padding
                        width: 'calc(100% - 4px)',
                        position: 'absolute',
                        top: '2px',
                        left: '2px',
                        zIndex: 10,
                        backgroundColor: event.status === 'confirmed' ? '#dcfce7' : 
                                       event.status === 'pending' ? '#fef3c7' : 
                                       event.status === 'cancelled' ? '#fecaca' : '#dbeafe',
                        border: `1px solid ${event.status === 'confirmed' ? '#22c55e' : 
                                            event.status === 'pending' ? '#f59e0b' : 
                                            event.status === 'cancelled' ? '#ef4444' : '#3b82f6'}`,
                        borderLeft: `4px solid ${event.status === 'confirmed' ? '#16a34a' : 
                                                 event.status === 'pending' ? '#d97706' : 
                                                 event.status === 'cancelled' ? '#dc2626' : '#2563eb'}`
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      draggable={!!onEventMove}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="text-xs font-medium text-gray-900 mb-1">
                        {event.clientName || wrapText(cleanEventTitle(event.title || 'Event'), 15)[0]}
                      </div>
                      <div className="text-xs text-gray-600">
                        {getLocationDisplay(event.location) || getDefaultLocation(new Date(event.startTime))}
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {new Date(event.startTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })} - {new Date(event.endTime).toLocaleTimeString('en-US', { 
                          hour: 'numeric', 
                          minute: '2-digit',
                          hour12: true 
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};