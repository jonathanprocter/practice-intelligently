import { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { formatTime, formatEventTime } from '../../utils/dateUtils';
import { generateTimeSlots } from '../../utils/timeSlots';
import { CalendarEvent } from '../../types/calendar';
import '../../styles/DailyView.css';

interface DailyViewProps {
  selectedDate: Date;
  events: CalendarEvent[];
  dailyNotes: string;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onBackToWeek: () => void;
  onEventClick: (event: CalendarEvent) => void;
  onUpdateEvent: (eventId: string, updates: Partial<CalendarEvent>) => void;
  onUpdateDailyNotes: (notes: string) => void;
  onEventMove?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
  onCreateEvent?: (startTime: Date, endTime: Date) => void;
  onDeleteEvent?: (eventId: string) => void;
}

export const DailyView = ({
  selectedDate,
  events,
  dailyNotes,
  onPreviousDay,
  onNextDay,
  onBackToWeek,
  onEventClick,
  onUpdateEvent,
  onUpdateDailyNotes,
  onEventMove,
  onCreateEvent,
  onDeleteEvent
}: DailyViewProps) => {
  const [currentNotes, setCurrentNotes] = useState(dailyNotes);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [noteTimers, setNoteTimers] = useState<{[key: string]: NodeJS.Timeout}>({});

  // Get events for the selected date with null checks and proper date conversion
  const dayEvents = events.filter(event => {
    if (!event || !event.startTime || !event.endTime || !selectedDate) return false;
    try {
      // Convert startTime and endTime to Date objects if they aren't already
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
      
      // Validate that dates are valid
      if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime()) || isNaN(selectedDate.getTime())) {
        // Invalid date detected
        return false;
      }
      
      const selectedDateString = selectedDate.toDateString();
      const eventDateString = startTime.toDateString();
      const matches = eventDateString === selectedDateString;

      // Event date matching checked

      return matches;
    } catch (error) {
      // Invalid date in event
      return false;
    }
  });

  // Null check for selectedDate before using
  if (!selectedDate) {
    // DailyView: selectedDate is undefined
    return (
      <div className="planner-container daily-planner">
        <div className="flex items-center justify-center h-64">
          <p>Loading daily view...</p>
        </div>
      </div>
    );
  }

  // Daily view event filtering completed

  // Calculate daily statistics with error handling
  const totalEvents = dayEvents.length;
  const totalHours = dayEvents.reduce((sum, event) => {
    try {
      // Convert startTime and endTime to Date objects if they aren't already
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
      if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) return sum;
      return sum + (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);
    } catch (error) {
      // Error calculating event duration
      return sum;
    }
  }, 0);
  const availableHours = 24 - totalHours;
  const freeTimePercentage = Math.round((availableHours / 24) * 100);

  // Use the same time slot generation as weekly view (6:00 to 23:30)
  const timeSlots = generateTimeSlots().map(slot => ({
    ...slot,
    isHour: slot.minute === 0
  }));

  const getEventStyle = (event: CalendarEvent) => {
    // Convert startTime and endTime to Date objects if they aren't already
    const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const eventEnd = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
    
    // Validate dates
    if (!eventStart || !eventEnd || isNaN(eventStart.getTime()) || isNaN(eventEnd.getTime())) {
      // Invalid dates in event
      return { className: 'appointment', style: { display: 'none' } };
    }
    
    const durationMinutes = (eventEnd.getTime() - eventStart.getTime()) / (1000 * 60);

    // Check if this is an all-day event
    const isMarkedAllDay = (event as any).isAllDay;
    const duration = eventEnd.getTime() - eventStart.getTime();
    const hours = duration / (1000 * 60 * 60);
    const startHour = eventStart.getHours();
    const startMinute = eventStart.getMinutes();
    const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
    const isAllDayEvent = isMarkedAllDay || isFullDay || hours >= 20;

    if (isAllDayEvent) {
      // All-day events should be positioned at the top, not in the timeline
      return {
        className: 'appointment all-day',
        style: {
          top: '0px',
          height: '40px',
          position: 'relative' as const,
          marginBottom: '8px'
        }
      };
    }

    // Calculate position based on start time - aligned to time slots exactly
    // Timeline starts at 6:00, so we calculate 30-minute slots since 6:00
    const minutesSince6am = (startHour - 6) * 60 + startMinute;
    const slotsFromStart = minutesSince6am / 30;
    const topPosition = Math.max(0, slotsFromStart * 40); // 40px per 30min slot

    // Calculate height based on duration
    let height = Math.max(36, (durationMinutes / 30) * 40 - 4); // 40px per 30min slot, minus padding

    // Source-specific styling - check if it's a SimplePractice appointment
    let className = 'appointment ';
    const isSimplePractice = event.source === 'simplepractice' || 
                           event.notes?.toLowerCase().includes('simple practice') ||
                           event.title?.toLowerCase().includes('simple practice') ||
                           event.description?.toLowerCase().includes('simple practice') ||
                           event.title?.toLowerCase().includes('appointment'); // SimplePractice appointments sync as "X Appointment"

    if (isSimplePractice) {
      className += 'simplepractice ';
    } else if (event.source === 'google') {
      className += 'google-calendar ';
    } else {
      className += 'personal ';
    }

    return {
      className,
      style: {
        top: `${topPosition}px`,
        height: `${height}px`
      }
    };
  };

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEventId(expandedEventId === eventId ? null : eventId);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('text/plain', JSON.stringify({
      eventId: event.id,
      startTime: event.startTime,
      endTime: event.endTime
    }));
  };

  const handleDrop = (e: React.DragEvent, slot: any, slotIndex: number) => {
    e.preventDefault();
    try {
      const dragData = JSON.parse(e.dataTransfer.getData('text/plain'));
      const { eventId, startTime, endTime } = dragData;

      // Calculate new start time based on slot position
      const slotHour = Math.floor(slotIndex / 2) + 6; // 6:00 AM start, 2 slots per hour
      const slotMinute = (slotIndex % 2) * 30;

      const originalStart = new Date(startTime);
      const originalEnd = new Date(endTime);
      const duration = originalEnd.getTime() - originalStart.getTime();

      const newStartTime = new Date(selectedDate);
      newStartTime.setHours(slotHour, slotMinute, 0, 0);

      const newEndTime = new Date(newStartTime.getTime() + duration);

      if (onEventMove) {
        onEventMove(eventId, newStartTime, newEndTime);
      }
    } catch (error) {
      console.error('Error processing drop:', error);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleSlotDoubleClick = (slot: any, slotIndex: number) => {
    if (onCreateEvent) {
      const slotHour = Math.floor(slotIndex / 2) + 6; // 6:00 AM start, 2 slots per hour
      const slotMinute = (slotIndex % 2) * 30;

      const startTime = new Date(selectedDate);
      startTime.setHours(slotHour, slotMinute, 0, 0);

      const endTime = new Date(startTime);
      endTime.setHours(slotHour, slotMinute + 30, 0, 0); // Default 30-minute duration

      onCreateEvent(startTime, endTime);
    }
  };

  // Local state for text areas to allow immediate typing
  const [localEventData, setLocalEventData] = useState<{[key: string]: {notes?: string, actionItems?: string}}>({});

  const handleEventNotesChange = (eventId: string, field: 'notes' | 'actionItems', value: string) => {
    // Update local state immediately for responsive typing
    setLocalEventData(prev => ({
      ...prev,
      [eventId]: {
        ...prev[eventId],
        [field]: value
      }
    }));

    // Clear existing timer for this event and field
    const timerKey = `${eventId}_${field}`;
    if (noteTimers[timerKey]) {
      clearTimeout(noteTimers[timerKey]);
    }
    
    // Set new timer with debouncing (500ms delay)
    const newTimer = setTimeout(() => {
      console.log(`💾 Saving ${field} for event ${eventId}:`, value);
      onUpdateEvent(eventId, { [field]: value });
      
      // Clean up timer
      setNoteTimers(prev => {
        const updated = { ...prev };
        delete updated[timerKey];
        return updated;
      });
    }, 500);
    
    // Store the timer
    setNoteTimers(prev => ({
      ...prev,
      [timerKey]: newTimer
    }));
  };

  // Helper function to get current value (local state or event data)
  const getCurrentValue = (event: CalendarEvent, field: 'notes' | 'actionItems') => {
    const localValue = localEventData[event.id]?.[field];
    return localValue !== undefined ? localValue : (event[field] || '');
  };

  const formatEventTime = (event: CalendarEvent) => {
    // Convert startTime and endTime to Date objects if they aren't already
    const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const end = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
    
    // Validate dates
    if (!start || !end || isNaN(start.getTime()) || isNaN(end.getTime())) {
      return 'Invalid time';
    }
    
    return `${start.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}-${end.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
  };

  const getDayName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getDateString = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  };

  const getDayNavigationName = (date: Date) => {
    return date.toLocaleDateString('en-US', { weekday: 'long' });
  };

  const getPreviousDay = () => {
    const prevDay = new Date(selectedDate);
    prevDay.setDate(prevDay.getDate() - 1);
    return prevDay;
  };

  const getNextDay = () => {
    const nextDay = new Date(selectedDate);
    nextDay.setDate(nextDay.getDate() + 1);
    return nextDay;
  };

  return (
    <div className="planner-container daily-planner">
      {/* Header Navigation Bar - styled buttons implementation */}
      <div className="nav-header">
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToWeek}
          className="nav-btn weekly-btn"
          aria-label="Navigate to weekly overview"
          tabIndex={0}
        >
          📅 Weekly Overview
        </Button>
        <div className="page-title">
          <h2>{getDayName(selectedDate)}, {getDateString(selectedDate)}</h2>
          <span className="appointment-count">{totalEvents} appointments</span>
        </div>
        <div className="legend">
          <div className="legend-item">
            <span className="legend-symbol simplepractice"></span>SimplePractice
          </div>
          <div className="legend-item">
            <span className="legend-symbol google-calendar"></span>Google Calendar
          </div>
          <div className="legend-item">
            <span className="legend-symbol personal"></span>Holidays in United States
          </div>
        </div>
      </div>

      {/* Daily Statistics - exact match to HTML template */}
      <div className="daily-stats">
        <div className="stat-item">
          <span className="stat-number">{totalEvents}</span>
          Appointments
        </div>
        <div className="stat-item">
          <span className="stat-number">{totalHours.toFixed(1)}h</span>
          Scheduled
        </div>
        <div className="stat-item">
          <span className="stat-number">{availableHours.toFixed(1)}h</span>
          Available
        </div>
        <div className="stat-item">
          <span className="stat-number">{freeTimePercentage}%</span>
          Free Time
        </div>
      </div>



      {/* All-Day Events Section */}
      {dayEvents.filter(event => {
        const isMarkedAllDay = (event as any).isAllDay;
        // Convert startTime and endTime to Date objects if they aren't already
        const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
        const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
        
        // Validate dates
        if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
          return false;
        }
        
        const duration = endTime.getTime() - startTime.getTime();
        const hours = duration / (1000 * 60 * 60);
        const startHour = startTime.getHours();
        const startMinute = startTime.getMinutes();
        const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
        return isMarkedAllDay || isFullDay || hours >= 20;
      }).length > 0 && (
        <div className="all-day-section">
          <h4 className="all-day-title">All Day</h4>
          <div className="all-day-events">
            {dayEvents.filter(event => {
              const isMarkedAllDay = (event as any).isAllDay;
              // Convert startTime and endTime to Date objects if they aren't already
              const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
              const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
              
              // Validate dates
              if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
                return false;
              }
              
              const duration = endTime.getTime() - startTime.getTime();
              const hours = duration / (1000 * 60 * 60);
              const startHour = startTime.getHours();
              const startMinute = startTime.getMinutes();
              const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
              return isMarkedAllDay || isFullDay || hours >= 20;
            }).map((event) => (
              <div
                key={event.id}
                className="all-day-event"
                onClick={() => toggleEventExpansion(event.id)}
              >
                <div className="event-title">{event.title}</div>
                {event.description && (
                  <div className="event-description">{event.description}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schedule Grid - CSS Grid for perfect alignment */}
      <div className="schedule-grid">
        {/* Time Column */}
        <div className="time-column">
          {timeSlots.map((slot, index) => (
            <div key={index} className={`time-slot ${slot.minute === 0 ? 'hour' : ''}`}>
              <span className={slot.minute === 0 ? 'text-sm' : 'text-xs'}>
                {slot.display}
              </span>
            </div>
          ))}
        </div>

        {/* Appointments Column */}
        <div className="appointments-column">
          {/* Empty appointment slots for grid background */}
          {timeSlots.map((slot, index) => (
            <div 
              key={index} 
              className={`appointment-slot ${slot.minute === 0 ? 'hour' : ''}`}
              onDrop={(e) => handleDrop(e, slot, index)}
              onDragOver={handleDragOver}
              onDoubleClick={() => handleSlotDoubleClick(slot, index)}
              title="Double-click to create new appointment"
            ></div>
          ))}

          {/* Render timed events as absolutely positioned elements */}
          {dayEvents.filter(event => {
            // Filter out all-day events from the timeline
            const isMarkedAllDay = (event as any).isAllDay;
            // Convert startTime and endTime to Date objects if they aren't already
            const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
            const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
            
            // Validate dates
            if (!startTime || !endTime || isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
              return false;
            }
            
            const duration = endTime.getTime() - startTime.getTime();
            const hours = duration / (1000 * 60 * 60);
            const startHour = startTime.getHours();
            const startMinute = startTime.getMinutes();
            const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);
            return !(isMarkedAllDay || isFullDay || hours >= 20);
          }).map((event) => {
            const { className, style } = getEventStyle(event);
            // Match the same logic from WeeklyCalendarGrid
            const calendarClass = event.calendarId === 'en.usa#holiday@group.v.calendar.google.com' ? 'personal' : 
                                  (event.title.toLowerCase().includes('haircut') ||
                                   event.title.toLowerCase().includes('dan re:') ||
                                   event.title.toLowerCase().includes('blake') ||
                                   event.title.toLowerCase().includes('phone call')) ? 'google-calendar' :
                                  'simplepractice';
            return (
              <div key={event.id}>
                <div
                  className={`appointment ${calendarClass} ${className}`}
                  style={style}
                  draggable
                  onDragStart={(e) => handleDragStart(e, event)}
                  onClick={() => toggleEventExpansion(event.id)}
                >
                  <div className="appointment-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '4px' }}>

                    {/* Left: Event title, calendar, and time */}
                    <div className="appointment-left">
                      <div className="appointment-title-bold">{event.title}</div>
                      <div className="appointment-calendar">
                        {event.calendarId === '0np7sib5u30o7oc297j5pb259g' ? 'SimplePractice' : 
                         event.calendarId === 'en.usa#holiday@group.v.calendar.google.com' ? 'Holidays in United States' : 
                         'Google Calendar'}
                      </div>
                      <div className="appointment-time">{formatEventTime(event)}</div>
                    </div>

                    {/* Center: Event Notes (bulleted) - only if they exist */}
                    <div className="appointment-center">
                      {event.notes && (
                        <div className="appointment-notes">
                          <div className="appointment-notes-header">Event Notes</div>
                          {event.notes.split('\n')
                            .filter(note => note.trim().length > 0)
                            .map(note => note.trim().replace(/^[•\s-]+/, '').trim())
                            .filter(note => note.length > 0 && note !== '•' && note !== '-')
                            .map((note, index) => (
                              <div key={index} className="note-item">{note}</div>
                            ))}
                        </div>
                      )}
                    </div>

                    {/* Right: Action Items - only if they exist */}
                    <div className="appointment-right">
                      {event.actionItems && (
                        <div className="appointment-actions">
                          <div className="appointment-actions-header">Action Items</div>
                          {event.actionItems.split('\n')
                            .filter(item => item.trim().length > 0)
                            .map(item => item.trim().replace(/^[•\s-]+/, '').trim())
                            .filter(item => item.length > 0 && item !== '•' && item !== '-')
                            .map((item, index) => (
                              <div key={index} className="action-item">{item}</div>
                            ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Expanded event details */}
                {expandedEventId === event.id && (
                  <div 
                    className="expanded-event-details"
                    style={{
                      position: 'absolute',
                      top: `${parseInt(style?.top || '0px') + parseInt(style?.height || '40px') + 5}px`,
                      left: '8px',
                      right: '8px',
                      background: '#f8f8f8',
                      border: '2px solid #ccc',
                      borderRadius: '4px',
                      padding: '12px',
                      zIndex: 1000,
                      boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                    }}
                  >
                    <div className="space-y-3">
                      <div className="notes-area">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Event Notes
                        </label>
                        <Textarea
                          value={getCurrentValue(event, 'notes')}
                          onChange={(e) => handleEventNotesChange(event.id, 'notes', e.target.value)}
                          placeholder="Add notes for this appointment..."
                          className="w-full text-sm"
                          rows={3}
                        />
                      </div>
                      <div className="notes-area">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Action Items
                        </label>
                        <Textarea
                          value={getCurrentValue(event, 'actionItems')}
                          onChange={(e) => handleEventNotesChange(event.id, 'actionItems', e.target.value)}
                          placeholder="Add action items and follow-ups..."
                          className="w-full text-sm"
                          rows={2}
                        />
                      </div>
                      <div className="flex justify-between pt-2">
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => {
                            if (onDeleteEvent) {
                              onDeleteEvent(event.id);
                            }
                            setExpandedEventId(null);
                          }}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setExpandedEventId(null)}
                          className="text-xs"
                        >
                          Close
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Bar - styled buttons implementation */}
      <div className="nav-footer">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousDay}
          className="nav-btn prev-btn"
          aria-label={`Navigate to ${getDayNavigationName(getPreviousDay())}`}
          tabIndex={0}
        >
          ← {getDayNavigationName(getPreviousDay())}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToWeek}
          className="nav-btn weekly-btn"
          aria-label="Navigate to weekly overview"
          tabIndex={0}
        >
          📅 Weekly Overview
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onNextDay}
          className="nav-btn next-btn"
          aria-label={`Navigate to ${getDayNavigationName(getNextDay())}`}
          tabIndex={0}
        >
          {getDayNavigationName(getNextDay())} →
        </Button>
      </div>
    </div>
  );
};