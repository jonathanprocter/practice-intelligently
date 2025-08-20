import { useState } from 'react';
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

      // Check if event is all-day by looking at duration and time patterns
      const duration = endTime.getTime() - startTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
      const isAllDayEvent = isMarkedAllDay || isFullDay || hours >= 20;

      if (!isAllDayEvent) return false;

      // For all-day events, check if the date falls within the event range
      const dateOnly = new Date(date.getFullYear(), date.getMonth(), date.getDate());
      const eventStartOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());
      const eventEndDate = endTime;
      const eventEndOnly = new Date(eventEndDate.getFullYear(), eventEndDate.getMonth(), eventEndDate.getDate());

      return dateOnly >= eventStartOnly && dateOnly < eventEndOnly;
    });
  };

  const getEventsForTimeSlot = (date: Date, timeSlot: { time: string; hour: number; minute: number }) => {
    const filteredEvents = events.filter(event => {
      // Ensure dates are properly parsed
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

      // Skip invalid dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        return false;
      }

      const eventDate = startTime;

      // Filter out all-day events from time slots
      const isMarkedAllDay = (event as any).isAllDay;
      const duration = endTime.getTime() - startTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
      const isAllDayEvent = isMarkedAllDay || isFullDay || hours >= 20;

      // Skip all-day events
      if (isAllDayEvent) return false;

      // For timed events, use simple date string comparison
      const eventDateStr = eventDate.toDateString();
      const targetDateStr = date.toDateString();

      if (eventDateStr !== targetDateStr) return false;

      return isEventInTimeSlot({ startTime, endTime }, timeSlot);
    });



    return filteredEvents;
  };

  // Helper to find the time slot index for a given Date object
  const getTimeSlotIndex = (date: Date): number => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    // Assuming each time slot is 60 minutes for simplicity in this calculation,
    // but the actual rendering will use getEventDurationInSlots for precise height.
    // This function is more for determining the 'top' position based on hour blocks.
    return hours; // This might need refinement based on how timeSlots are generated and indexed.
  };


  const getEventStyle = (event: CalendarEvent, dayIndex: number): React.CSSProperties => {
    const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

    // Check if dates are valid
    if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
      return {
        position: 'absolute',
        top: '0px',
        height: '58px',
        left: '2px',
        right: '2px',
        zIndex: 10,
      };
    }

    const startSlot = getTimeSlotIndex(startTime);
    const duration = getEventDurationInSlots(startTime, endTime);

    return {
      position: 'absolute',
      top: `${startSlot * 60}px`,
      height: `${duration * 60 - 2}px`,
      left: '2px',
      right: '2px',
      zIndex: 10,
    };
  };

  const getEventSourceClass = (event: CalendarEvent) => {
    // Check if it's a SimplePractice appointment
    const isSimplePractice = event.source === 'simplepractice' ||
                           event.notes?.toLowerCase().includes('simple practice') ||
                           event.title?.toLowerCase().includes('simple practice') ||
                           event.description?.toLowerCase().includes('simple practice') ||
                           event.title?.toLowerCase().includes('appointment'); // SimplePractice appointments sync as "X Appointment"

    let className = '';
    if (isSimplePractice) {
      className = 'event-block simplepractice';
    } else if (event.source === 'google') {
      className = 'event-block google';
    } else {
      className = 'event-block manual';
    }

    // Add appointment status styling
    if (event.status) {
      className += ` status-${event.status}`;
    }

    return className;
  };

  const cleanEventTitle = (title: string) => {
    // Remove lock symbols and other problematic characters
    return title
      .replace(/🔒\s*/g, '') // Remove lock symbol and following space
      .replace(/[\u{1F500}-\u{1F6FF}]/gu, '') // Remove emoji symbols
      .replace(/Ø=ÜÅ/g, '') // Remove corrupted symbols
      .replace(/Ø=Ý/g, '') // Remove corrupted symbols
      .replace(/!•/g, '') // Remove broken navigation symbols
      .replace(/!•\s*/g, '') // Remove broken navigation symbols with spaces
      .replace(/Page \d+ of \d+/g, '') // Remove page numbers
      .replace(/Back to Weekly Overview/g, '') // Remove navigation text
      .replace(/Weekly Overview/g, '') // Remove navigation text
      .replace(/Sunday Tuesday/g, '') // Remove broken day text
      .replace(/[\u{2022}\u{2023}\u{2024}\u{2025}]/gu, '') // Remove bullet points
      .replace(/\s+/g, ' ') // Normalize spaces
      .trim();
  };


  return (
    <div className="weekly-calendar">
      <div className="calendar-grid">
      {/* Headers */}
      <div className="calendar-cell header-cell">
        TIME
      </div>
      {week.map((day, index) => (
        <div
          key={index}
          className="calendar-cell header-cell"
          onClick={() => onDayClick(day.date)}
          style={{ textAlign: 'center', padding: '4px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}
        >
          <div style={{ fontWeight: 'bold', fontSize: '14px', marginBottom: '2px' }}>
            {day.dayOfWeek}
          </div>
          <div style={{ fontSize: '11px', color: '#666' }}>
            {day.date.getMonth() + 1}/{day.date.getDate()}/{day.date.getFullYear()}
          </div>
        </div>
      ))}

      {/* All-Day Events Section */}
      <div className="calendar-cell all-day-header">
        ALL DAY
      </div>
      {week.map((day, dayIndex) => {
        const allDayEvents = getAllDayEventsForDate(day.date);
        return (
          <div key={`allday-${dayIndex}`} className="calendar-cell all-day-slot">
            {allDayEvents.map((event) => (
              <div
                key={event.id}
                className="event-in-grid event-personal"
                onClick={(e) => {
                  e.stopPropagation();
                  onEventClick(event);
                }}
              >
                {cleanEventTitle(event.title)}
              </div>
            ))}
          </div>
        );
      })}

      {/* Time slots */}
      {timeSlots.map((timeSlot, slotIndex) => (
        <div key={slotIndex} className="contents">
          {/* Time column */}
          <div className={cn(
            "calendar-cell time-cell",
            timeSlot.minute === 0 ? "hour" : "half-hour",
            slotIndex === 0 ? "first-time-slot" : ""
          )}>
            {timeSlot.time}
          </div>

          {/* Day columns */}
          {week.map((day, dayIndex) => {
            const slotEvents = getEventsForTimeSlot(day.date, timeSlot);
            const isFirstSlotOfEvent = (event: CalendarEvent) => {
              const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);

              // Skip invalid dates
              if (isNaN(eventStart.getTime())) {
                return false;
              }

              // Check if this event starts in this exact time slot
              const eventStartMinutes = eventStart.getHours() * 60 + eventStart.getMinutes();
              const slotStartMinutes = timeSlot.hour * 60 + timeSlot.minute;
              const slotEndMinutes = slotStartMinutes + 30;

              // Return true only if the event starts within this 30-minute slot
              return eventStartMinutes >= slotStartMinutes && eventStartMinutes < slotEndMinutes;
            };

            return (
              <div
                key={dayIndex}
                className={cn(
                  "calendar-cell",
                  timeSlot.minute === 0 ? "hour" : "half-hour",
                  slotIndex === 0 ? "first-time-slot" : "",
                  dropZone && dropZone.date.toDateString() === day.date.toDateString() &&
                  dropZone.time === `${timeSlot.hour.toString().padStart(2, '0')}:${timeSlot.minute.toString().padStart(2, '0')}` ?
                  "drop-zone-active" : ""
                )}
                onClick={() => onTimeSlotClick(day.date, timeSlot.time)}
                onDragOver={(e) => handleDragOver(e, day.date, timeSlot)}
                onDragLeave={handleDragLeave}
                onDrop={(e) => handleDrop(e, day.date, timeSlot)}
              >
                {slotEvents.map((event, eventIndex) => {
                  const isFirstSlot = isFirstSlotOfEvent(event);

                  // Debug log for troubleshooting (disabled to reduce console noise)
                  // if (slotEvents.length > 0 && eventIndex === 0) {
                  //   console.log(`Rendering event ${event.title} at ${timeSlot.time} - isFirstSlot: ${isFirstSlot}`);
                  // }

                  if (!isFirstSlot) return null;

                  const eventSourceClass = getEventSourceClass(event);
                  const isSimplePractice = eventSourceClass.includes('simplepractice');
                  const isGoogle = eventSourceClass.includes('google');

                  // Calculate appointment height based on exact duration
                  const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                  const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
                  const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);

                  // Dynamic height calculation: 1px per minute with proper containment
                  // Add extra height to ensure time text doesn't get cut off
                  let appointmentHeight;
                  if (durationMinutes <= 30) {
                    // 30-minute appointments: Increased height for better time display
                    appointmentHeight = 28;
                  } else {
                    // Longer appointments get dynamic sizing with proper margins
                    appointmentHeight = Math.max(durationMinutes - 2, 28);
                  }

                  // Debug logging disabled to reduce console noise
                  // const durationText = durationMinutes <= 30 ? "30-min block" : `${durationMinutes} minutes`;
                  // console.log(`📊 ${event.title}: ${durationText} -> ${appointmentHeight}px height (contained within grid lines)`);

                  // Additional debug for specific problem events (disabled)
                  // if (event.title.includes('Angelica') || event.title.includes('Dan') || event.title.includes('Sherrifa') || event.title.includes('Blake')) {
                  //   console.log(`🔍 DETAILED: ${event.title}: ${durationText} -> ${appointmentHeight}px height`);
                  // }

                  // Add status-based CSS class for appointment styling
                  const statusClass = event.status ? `status-${event.status}` : '';

                  return (
                    <div
                      key={eventIndex}
                      className={cn(
                        "event-in-grid appointment",
                        eventSourceClass,
                        statusClass,
                        draggedEventId === event.id ? "dragging" : "",
                        "cursor-move hover:shadow-lg transition-shadow"
                      )}
                      style={{
                        ...getEventStyle(event, dayIndex), // Use the fixed getEventStyle
                        position: 'absolute',
                        width: 'calc(100% - 8px)',
                        height: `${appointmentHeight}px`,
                        top: '2px', // Add 2px margin from top grid line
                        left: '4px',
                        zIndex: 10,
                        minHeight: `${appointmentHeight}px`,
                        maxHeight: `${appointmentHeight}px`,
                        marginBottom: '2px' // Add 2px margin from bottom grid line
                      }}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, event)}
                      onDragEnd={handleDragEnd}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                    >
                      <div className="appointment-name" style={{
                        fontSize: durationMinutes <= 30 ? '7px' : '9px',
                        lineHeight: durationMinutes <= 30 ? '1.1' : '1.2',
                        fontWeight: 'bold',
                        height: durationMinutes <= 30 ? '12px' : 'auto',
                        overflow: 'hidden',
                        whiteSpace: 'normal',
                        wordWrap: 'break-word',
                        textOverflow: 'clip'
                      }}>
                        {wrapText(cleanEventTitle(event.title), durationMinutes <= 30 ? 12 : 18).map((line, index) => (
                          <div key={index}>{line}</div>
                        ))}
                      </div>
                      {event.location && getLocationDisplay(event.location) && (
                        <div className="appointment-location" style={{
                          fontSize: durationMinutes <= 30 ? '6px' : '7px',
                          lineHeight: '1.0',
                          color: '#666',
                          fontWeight: 'normal',
                          marginTop: '1px',
                          marginBottom: '1px'
                        }}>
                          {getLocationDisplay(event.location)?.display}
                        </div>
                      )}

                      <div className="appointment-spacer" style={{
                        height: durationMinutes <= 30 ? '1px' : '2px',
                        borderBottom: '1px solid #ccc',
                        margin: durationMinutes <= 30 ? '1px 0' : '2px 0'
                      }}></div>
                      <div className="appointment-time" style={{
                        fontSize: durationMinutes <= 30 ? '6px' : '8px',
                        lineHeight: '1.0',
                        height: durationMinutes <= 30 ? '10px' : 'auto',
                        marginTop: '-4px', // Move up by 4px to prevent cutoff
                        marginBottom: '2px' // Add bottom margin for breathing room
                      }}>
                        {(() => {
                          const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                          const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);

                          // Skip invalid dates
                          if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                            return 'Invalid time';
                          }

                          return `${startTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })} - ${endTime.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: false
                          })}`;
                        })()}
                      </div>
                    </div>
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