import { useState } from 'react';
import { generateTimeSlots, getEventDurationInSlots, isEventInTimeSlot } from '../../utils/timeSlots';
import { formatDateShort, isToday, isSameDay } from '../../utils/dateUtils';
import { cleanEventTitle, formatClientName } from '../../utils/textCleaner';
import { getLocationDisplay, getLocationIcon } from '../../utils/locationUtils';
import { CalendarEvent, CalendarDay } from '../../types/calendar';
import { cn } from '@/lib/utils';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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
    const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return;
    }

    setDraggedEventId(event.id);

    e.dataTransfer.setData('text/plain', JSON.stringify({
      eventId: event.id,
      originalStartTime: startTime.toISOString(),
      originalEndTime: endTime.toISOString(),
      duration: endTime.getTime() - startTime.getTime()
    }));

    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setDragImage(e.currentTarget as HTMLElement, 10, 10);
  };

  const handleDragOver = (e: React.DragEvent, date: Date, timeSlot: { hour: number; minute: number }) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDropZone({ 
      date, 
      time: `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}` 
    });
  };

  const handleDragLeave = () => {
    setDropZone(null);
  };

  const handleDragEnd = () => {
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
      setDraggedEventId(null);
      setDropZone(null);
    }
  };

  const getEventsForTimeSlot = (date: Date, timeSlot: { hour: number; minute: number }) => {
    return events.filter(event => {
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return false;

      return isSameDay(startTime, date) && 
             isEventInTimeSlot(startTime, endTime, timeSlot.hour, timeSlot.minute);
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    switch (event.status) {
      case 'confirmed':
        return 'bg-therapy-success/20 border-therapy-success hover:border-therapy-success/80';
      case 'completed':
        return 'bg-therapy-primary/20 border-therapy-primary hover:border-therapy-primary/80';
      case 'cancelled':
        return 'bg-therapy-error/20 border-therapy-error hover:border-therapy-error/80';
      case 'no-show':
        return 'bg-gray-200 border-gray-400 hover:border-gray-500';
      default:
        return 'bg-therapy-warning/20 border-therapy-warning hover:border-therapy-warning/80';
    }
  };

  const getEventTypeIcon = (type: CalendarEvent['type']) => {
    switch (type) {
      case 'individual': return '👤';
      case 'group': return '👥';
      case 'intake': return '📋';
      case 'consultation': return '💬';
      case 'assessment': return '📊';
      case 'follow-up': return '🔄';
      default: return '📅';
    }
  };

  return (
    <div className="therapy-card overflow-hidden">
      {/* Header with day names */}
      <div className="grid grid-cols-8 bg-therapy-bg border-b-2 border-therapy-border">
        <div className="p-3 text-sm font-medium text-therapy-text">Time</div>
        {week.map((day, index) => (
          <div 
            key={index}
            className={cn(
              "p-3 text-center cursor-pointer transition-colors",
              isToday(day.date) 
                ? "bg-therapy-primary/10 border-therapy-primary border-b-2" 
                : "hover:bg-therapy-primary/5"
            )}
            onClick={() => onDayClick(day.date)}
          >
            <div className="text-xs text-therapy-text/70 uppercase tracking-wide">
              {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
            </div>
            <div className={cn(
              "text-lg font-semibold",
              isToday(day.date) ? "text-therapy-primary" : "text-therapy-text"
            )}>
              {formatDateShort(day.date)}
            </div>
          </div>
        ))}
      </div>

      {/* Time slots grid */}
      <div className="max-h-96 overflow-y-auto">
        {timeSlots.map((timeSlot, timeIndex) => (
          <div key={timeIndex} className="grid grid-cols-8 border-b border-therapy-border/50">
            {/* Time column */}
            <div className="p-2 text-xs text-therapy-text/70 bg-therapy-bg/50 border-r border-therapy-border/50 flex items-center justify-end pr-3">
              {timeSlot.display}
            </div>

            {/* Day columns */}
            {week.map((day, dayIndex) => {
              const dayEvents = getEventsForTimeSlot(day.date, timeSlot);
              const isDropTarget = dropZone && 
                isSameDay(dropZone.date, day.date) && 
                dropZone.time === timeSlot.display;

              return (
                <div
                  key={dayIndex}
                  className={cn(
                    "min-h-12 p-1 border-r border-therapy-border/50 relative cursor-pointer",
                    "hover:bg-therapy-primary/5 transition-colors",
                    isDropTarget && "bg-therapy-primary/20 border-therapy-primary border-2"
                  )}
                  onDragOver={(e) => handleDragOver(e, day.date, timeSlot)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDrop(e, day.date, timeSlot)}
                  onClick={() => onTimeSlotClick(day.date, timeSlot.display)}
                >
                  {dayEvents.map((event, eventIndex) => {
                    const isBeingDragged = draggedEventId === event.id;
                    const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                    const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
                    
                    return (
                      <Card
                        key={eventIndex}
                        className={cn(
                          "p-1 mb-1 text-xs cursor-pointer border transition-all duration-200",
                          getEventColor(event),
                          isBeingDragged && "opacity-50 rotate-3"
                        )}
                        draggable={!!onEventMove}
                        onDragStart={(e) => handleDragStart(e, event)}
                        onDragEnd={handleDragEnd}
                        onClick={(e) => {
                          e.stopPropagation();
                          onEventClick(event);
                        }}
                      >
                        <div className="flex items-center gap-1">
                          <span className="text-xs">{getEventTypeIcon(event.type)}</span>
                          <span className="font-medium text-therapy-text truncate">
                            {cleanEventTitle(event.title)}
                          </span>
                        </div>
                        
                        {event.clientName && (
                          <div className="text-therapy-text/70 truncate">
                            {event.clientName}
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between mt-1">
                          <span className="text-therapy-text/60">
                            {startTime.toLocaleTimeString('en-US', { 
                              hour: 'numeric', 
                              minute: '2-digit',
                              hour12: true 
                            })}
                          </span>
                          
                          <Badge 
                            variant="outline" 
                            className={cn(
                              "text-xs px-1 py-0",
                              event.status === 'confirmed' && "border-therapy-success text-therapy-success",
                              event.status === 'completed' && "border-therapy-primary text-therapy-primary",
                              event.status === 'cancelled' && "border-therapy-error text-therapy-error"
                            )}
                          >
                            {event.status}
                          </Badge>
                        </div>
                        
                        {event.location && (
                          <div className="text-therapy-text/60 text-xs truncate flex items-center gap-1">
                            {getLocationIcon(event.location)}
                            {getLocationDisplay(event.location)}
                          </div>
                        )}
                      </Card>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};