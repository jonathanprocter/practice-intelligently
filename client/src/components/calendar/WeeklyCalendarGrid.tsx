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

      // Check if backend marked it as all-day
      const isMarkedAllDay = (event as any).isAllDay;
      
      return eventDate.toDateString() === date.toDateString() && isMarkedAllDay;
    });
  };

  return (
    <div className="weekly-calendar-container">
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
              const dayEvents = events.filter(event => {
                const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                return eventStart.toDateString() === day.date.toDateString() && 
                       isEventInTimeSlot(event, timeSlot);
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
                >
                  {dayEvents.map((event) => (
                    <div
                      key={event.id}
                      className={cn(
                        "calendar-event",
                        `calendar-event-${event.status?.toLowerCase() || 'confirmed'}`,
                        draggedEventId === event.id && "opacity-50"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      draggable={!!onEventMove}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                    >
                      <div className="text-xs font-medium">
                        {wrapText(cleanEventTitle(event.title), 15)[0]}
                      </div>
                      {event.clientName && (
                        <div className="text-xs text-gray-600">
                          {event.clientName}
                        </div>
                      )}
                      {getLocationDisplay(event.location) && (
                        <div className="text-xs text-gray-500">
                          {getLocationDisplay(event.location)}
                        </div>
                      )}
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