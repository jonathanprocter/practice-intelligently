import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent } from '../../types/calendar';
import { generateTimeSlots } from '../../utils/timeSlots';
import { formatTime, formatEventTime, getDayNavigationName, getNextDay, getPreviousDay, getDateString } from '../../utils/dateUtils';
import { getLocationDisplay } from '../../utils/locationUtils';
import { cleanTitle } from '../../utils/titleCleaner';
import { cleanEmojis } from '../../utils/emojiCleaner';
import { useCalendar } from '../../hooks/useCalendar';
import { useEventDuplication } from '../../hooks/useEventDuplication';
import { Button } from '../ui/button';
import { Textarea } from '../ui/textarea';
import './DailyView.css';

interface DailyViewProps {
  selectedDate: Date | null;
  onDateChange: (date: Date) => void;
  onBackToWeek: () => void;
  events: CalendarEvent[];
  onDeleteEvent?: (eventId: string) => void;
}

interface ExpandedEventDetails {
  id: string;
  notes: string;
  actionItems: string;
}

interface NoteTimer {
  [key: string]: NodeJS.Timeout;
}

const DailyView: React.FC<DailyViewProps> = ({
  selectedDate,
  onDateChange,
  onBackToWeek,
  events,
  onDeleteEvent
}) => {
  // State management
  const [draggedEventId, setDraggedEventId] = useState<string | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [noteTimers, setNoteTimers] = useState<NoteTimer>({});
  const [eventNotes, setEventNotes] = useState<{ [key: string]: string }>({});
  const [eventActionItems, setEventActionItems] = useState<{ [key: string]: string }>({});

  // Hooks
  const { updateEvent } = useCalendar();
  const { checkForDuplicates } = useEventDuplication();

  // Early return for invalid date
  if (!selectedDate) {
    return (
      <div className="daily-view-container">
        <div className="daily-view-loading">
          <p>Loading daily view...</p>
        </div>
      </div>
    );
  }

  // Generate time slots
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Filter events for the selected date
  const dayEvents = useMemo(() => {
    if (!selectedDate || !events) return [];
    
    return events.filter((event) => {
      if (!event.startTime || !event.endTime) return false;
      
      try {
        const eventDate = new Date(event.startTime);
        const selectedDateStr = selectedDate.toDateString();
        const eventDateStr = eventDate.toDateString();
        
        return selectedDateStr === eventDateStr;
      } catch (error) {
        console.warn('Error filtering event:', event, error);
        return false;
      }
    });
  }, [selectedDate, events]);

  // Calculate statistics
  const { totalEvents, totalHours, freeTimePercentage } = useMemo(() => {
    const total = dayEvents.length;
    const hours = dayEvents.reduce((acc, event) => {
      if (!event.startTime || !event.endTime) return acc;
      
      try {
        const start = new Date(event.startTime);
        const end = new Date(event.endTime);
        const duration = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
        return acc + Math.max(0, duration);
      } catch (error) {
        console.warn('Error calculating duration for event:', event, error);
        return acc;
      }
    }, 0);
    
    const workingHours = 17.5; // 6 AM to 11:30 PM
    const freeTime = Math.max(0, ((workingHours - hours) / workingHours) * 100);
    
    return {
      totalEvents: total,
      totalHours: Math.round(hours * 100) / 100,
      freeTimePercentage: Math.round(freeTime)
    };
  }, [dayEvents]);

  // Event styling function
  const getEventStyle = useCallback((event: CalendarEvent, eventIndex: number, filteredTimedEvents: CalendarEvent[]) => {
    if (!event.startTime || !event.endTime) return {};

    try {
      const startTime = new Date(event.startTime);
      const endTime = new Date(event.endTime);
      
      // Validate dates
      if (isNaN(startTime.getTime()) || isNaN(endTime.getTime())) {
        console.warn('Invalid dates for event:', event);
        return {};
      }

      const duration = endTime.getTime() - startTime.getTime();
      const hours = duration / (1000 * 60 * 60);
      const startHour = startTime.getHours();
      const startMinute = startTime.getMinutes();
      const isMarkedAllDay = (event as any).isAllDay;
      const isFullDay = startHour === 0 && startMinute === 0 && (hours === 24 || hours % 24 === 0);

      if (isFullDay || isMarkedAllDay || hours >= 20) {
        return {}; // All-day events handled separately
      }

      // Calculate grid positioning
      const startSlotIndex = Math.max(0, Math.floor(((startHour - 6) * 60 + startMinute) / 30));
      const endSlotIndex = Math.min(35, Math.ceil(((endTime.getHours() - 6) * 60 + endTime.getMinutes()) / 30));
      const gridRowStart = startSlotIndex + 2; // +2 for header rows
      const gridRowEnd = Math.max(gridRowStart + 1, endSlotIndex + 2);

      // Handle overlapping events
      const overlappingEvents = filteredTimedEvents.filter((e, i) => {
        if (i >= eventIndex) return false;
        if (!e.startTime || !e.endTime) return false;
        
        try {
          const eStart = new Date(e.startTime);
          const eEnd = new Date(e.endTime);
          return (startTime < eEnd && endTime > eStart);
        } catch {
          return false;
        }
      });

      const overlapCount = overlappingEvents.length;
      const gridColumn = overlapCount > 0 ? `${2 + overlapCount} / 3` : '2 / 3';

      return {
        gridRowStart,
        gridRowEnd,
        gridColumn,
        zIndex: 10 + eventIndex,
      };
    } catch (error) {
      console.warn('Error calculating event style:', event, error);
      return {};
    }
  }, []);

  // Get calendar class for event
  const getCalendarClass = useCallback((event: CalendarEvent) => {
    if (event.calendarId === 'en.usa#holiday@group.v.calendar.google.com') return 'personal';
    if (event.calendarId === '0np7slb5u30o7oc29735pb259g' || event.source === 'simplepractice') return 'simplepractice';
    if (event.title?.toLowerCase().includes('haircut') ||
        event.title?.toLowerCase().includes('dan res') ||
        event.title?.toLowerCase().includes('blake') ||
        event.title?.toLowerCase().includes('phone call')) return 'google-calendar';
    if (event.source === 'simplepractice') return 'simplepractice';
    return 'google-calendar';
  }, []);

  // Event handlers
  const handleDragStart = useCallback((e: React.DragEvent, event: CalendarEvent) => {
    setDraggedEventId(event.id);
    e.dataTransfer.effectAllowed = 'move';
  }, []);

  const handleDragEnd = useCallback(() => {
    setDraggedEventId(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent, timeSlot: string) => {
    e.preventDefault();
    if (!draggedEventId) return;

    // Handle event movement logic here
    console.log('Moving event', draggedEventId, 'to', timeSlot);
    setDraggedEventId(null);
  }, [draggedEventId]);

  const handleSlotDoubleClick = useCallback((timeSlot: string) => {
    // Handle creating new appointment
    console.log('Creating new appointment at', timeSlot);
  }, []);

  const toggleEventExpansion = useCallback((eventId: string) => {
    setExpandedEventId(prev => prev === eventId ? null : eventId);
  }, []);

  const handleEventNotesChange = useCallback((eventId: string, field: 'notes' | 'actionItems', value: string) => {
    // Clear existing timer for this event and field
    const timerKey = `${eventId}-${field}`;
    if (noteTimers[timerKey]) {
      clearTimeout(noteTimers[timerKey]);
    }

    // Update local state immediately
    if (field === 'notes') {
      setEventNotes(prev => ({ ...prev, [eventId]: value }));
    } else {
      setEventActionItems(prev => ({ ...prev, [eventId]: value }));
    }

    // Set new timer for auto-save
    const newTimer = setTimeout(() => {
      // Auto-save logic would go here
      console.log('Auto-saving', field, 'for event', eventId);
    }, 2000);

    setNoteTimers(prev => ({ ...prev, [timerKey]: newTimer }));
  }, [noteTimers]);

  // Helper functions
  const getCurrentValue = useCallback((event: CalendarEvent, field: 'notes' | 'actionItems') => {
    const localValue = field === 'notes' ? eventNotes[event.id] : eventActionItems[event.id];
    return localValue !== undefined ? localValue : (event[field] || '');
  }, [eventNotes, eventActionItems]);

  // Navigation handlers
  const onPreviousDay = useCallback(() => {
    if (selectedDate) {
      const prevDay = getPreviousDay(selectedDate);
      onDateChange(prevDay);
    }
  }, [selectedDate, onDateChange]);

  const onNextDay = useCallback(() => {
    if (selectedDate) {
      const nextDay = getNextDay(selectedDate);
      onDateChange(nextDay);
    }
  }, [selectedDate, onDateChange]);

  const onBackToWeekly = useCallback(() => {
    onBackToWeek();
  }, [onBackToWeek]);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      Object.values(noteTimers).forEach(timer => clearTimeout(timer));
    };
  }, [noteTimers]);

  return (
    <div className="daily-view-container">
      {/* Header Navigation */}
      <div className="daily-header">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousDay}
          className="nav-btn prev-btn"
          aria-label={`Navigate to ${getDayNavigationName(getPreviousDay(selectedDate))}`}
          tabIndex={0}
        >
          ← {getDayNavigationName(getPreviousDay(selectedDate))}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToWeekly}
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
          aria-label={`Navigate to ${getDayNavigationName(getNextDay(selectedDate))}`}
          tabIndex={0}
        >
          {getDayNavigationName(getNextDay(selectedDate))} →
        </Button>
      </div>

      {/* Daily Header - Date and Statistics */}
      <div className="daily-header">
        <div className="date-section">
          <h1 className="day-title">{getDayNavigationName(selectedDate)}</h1>
          <h2 className="date-title">{getDateString(selectedDate)}</h2>
        </div>
        <div className="stats-section">
          <div className="stat-item">
            <span className="stat-number">{totalEvents}</span>
            <span className="stat-label">Appointments</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{totalHours.toFixed(1)}h</span>
            <span className="stat-label">Scheduled</span>
          </div>
          <div className="stat-item">
            <span className="stat-number">{freeTimePercentage}%</span>
            <span className="stat-label">Free Time</span>
          </div>
        </div>
      </div>

      {/* All Day Events Section */}
      {dayEvents.some((event, index, array) => {
        // Remove duplicates first
        const isDuplicate = array.findIndex(e => e.id === event.id) !== index;
        if (isDuplicate) return false;

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
      }) && (
        <div className="all-day-section">
          <h3 className="all-day-title">All Day</h3>
          <div className="all-day-events">
            {dayEvents.filter((event, index, array) => {
              // Remove duplicates first
              const isDuplicate = array.findIndex(e => e.id === event.id) !== index;
              if (isDuplicate) return false;

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
            }).map((event, allDayIndex) => (
              <div
                key={`all-day-${event.id}-${allDayIndex}`}
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
        {/* Time column */}
        <div className="time-column">
          {timeSlots.map((slot, index) => (
            <div key={index} className={`time-slot ${slot.minute === 0 ? 'hour' : ''}`}>
              <span className={slot.minute === 0 ? 'text-sm' : 'text-xs'}>
                {slot.display}
              </span>
            </div>
          ))}
        </div>

        {/* Appointments column */}
        <div 
          className={`appointments-column ${draggedEventId ? 'drag-over' : ''}`}
          onDrop={(e) => handleDrop(e, 'null')}
          onDragOver={(e) => e.preventDefault()}
          onDoubleClick={() => handleSlotDoubleClick('null')}
          title="Double-click to create new appointment"
        >
          {/* Render timed events using CSS Grid positioning */}
          {dayEvents.filter(event => {
            // Filter out all-day events from the timed events
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
          }).map((event, eventIndex) => {
            const filteredTimedEvents = dayEvents.filter(e => {
              const isMarkedAllDay = (e as any).isAllDay;
              const eStart = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
              const eEnd = e.endTime instanceof Date ? e.endTime : new Date(e.endTime);
              if (!eStart || !eEnd || isNaN(eStart.getTime()) || isNaN(eEnd.getTime())) return false;
              const eDuration = eEnd.getTime() - eStart.getTime();
              const eHours = eDuration / (1000 * 60 * 60);
              const eStartHour = eStart.getHours();
              const eStartMinute = eStart.getMinutes();
              const eIsFullDay = eStartHour === 0 && eStartMinute === 0 && (eHours === 24 || eHours % 24 === 0);
              return !(isMarkedAllDay || eIsFullDay || eHours >= 20);
            });

            const eventStyle = getEventStyle(event, eventIndex, filteredTimedEvents);
            // Match the event title from /client/src/components/calendar/DailyView.tsx
            const calendarClass = event.calendarId === '0np7slb5u30o7oc29735pb259g' ? 'personal' :
                                event.calendarId === 'en.usa#holiday@group.v.calendar.google.com' ? 'Holidays in United States' :
                                event.source === 'simplepractice' ? 'SimplePractice' :
                                'Google Calendar';

            // Add status styling
            const statusClass = event.status ? `status-${event.status}` : '';

            return (
              <div
                key={`event-container-${event.id}-${eventIndex}`}
                className={`appointment ${calendarClass} ${statusClass} ${draggedEventId === event.id ? 'dragging' : ''}`}
                style={eventStyle}
                draggable
                onDragStart={(e) => handleDragStart(e, event)}
                onDragEnd={handleDragEnd}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  toggleEventExpansion(event.id);
                }}
              >
                <div className="appointment-layout" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px', padding: '4px' }}>
                  {/* Left: Event title, calendar, and time */}
                  <div className="appointment-left">
                    <div className="appointment-title-bold">{event.title}</div>
                    <div className="appointment-calendar">
                      {event.calendarId === '0np7slb5u30o7oc29735pb259g' || event.source === 'simplepractice' ? 'SimplePractice' :
                       event.calendarId === 'en.usa#holiday@group.v.calendar.google.com' ? 'Holidays in United States' :
                       'Google Calendar'}
                    </div>
                    {event.location && getLocationDisplay(event.location) && (
                      <span> | {getLocationDisplay(event.location).display}</span>
                    )}
                    <div className="appointment-time">{formatEventTime(event)}</div>
                  </div>

                  {/* Center: Event Notes (bulleted) - only if they exist */}
                  <div className="appointment-center">
                    {event.notes && (
                      <div className="appointment-notes">
                        <div className="appointment-notes-header">Event Notes</div>
                        {event.notes.split('\n')
                          .filter(note => note.trim().length > 0)
                          .filter(note => note.trim().replace(/[^\w\s]/g, '').trim())
                          .filter(note => note.length > 0 && note !== '*' && note !== '-')
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
                          .filter(item => item.trim().replace(/[^\w\s]/g, '').trim())
                          .filter(item => item.length > 0 && item !== '*' && item !== '-')
                          .map(item => item.trim().replace(/[*\-]/g, '').trim())
                          .filter(item => item.length > 0 && item !== '*' && item !== '-')
                          .map((item, index) => (
                            <div key={index} className="action-item">{item}</div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Modal outside the appointment loop to prevent flickering */}
      {expandedEventId && (
        <>
          {/* Backdrop */}
          <div
            className="modal-backdrop"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0, 0, 0, 0.5)',
              zIndex: 999
            }}
            onClick={() => setExpandedEventId(null)}
          />
          {/* Modal Content */}
          <div
            className="expanded-event-details"
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '500px',
              maxWidth: '90vw',
              maxHeight: '80vh',
              background: '#ffffff',
              border: '2px solid #333',
              borderRadius: '8px',
              padding: '16px',
              zIndex: 1000,
              boxShadow: '0 4px 20px rgba(0,0,0,0.3)',
              overflow: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {(() => {
              const expandedEvent = dayEvents.find(event => event.id === expandedEventId);
              if (!expandedEvent) return null;

              return (
                <div className="space-y-3">
                  <div className="modal-header">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      {expandedEvent.title}
                    </h3>
                    <p className="text-sm text-gray-600">
                      {formatEventTime(expandedEvent)} | {expandedEvent.calendarId === '0np7slb5u30o7oc29735pb259g' || expandedEvent.source === 'simplepractice' ? 'SimplePractice' :
                       expandedEvent.calendarId === 'en.usa#holiday@group.v.calendar.google.com' ? 'Holidays in United States' :
                       'Google Calendar'}
                    </p>
                  </div>

                  <div className="notes-area">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Event Notes
                    </label>
                    <Textarea
                      value={getCurrentValue(expandedEvent, 'notes')}
                      onChange={(e) => handleEventNotesChange(expandedEvent.id, 'notes', e.target.value)}
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
                      value={getCurrentValue(expandedEvent, 'actionItems')}
                      onChange={(e) => handleEventNotesChange(expandedEvent.id, 'actionItems', e.target.value)}
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
                          onDeleteEvent(expandedEvent.id);
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
              );
            })()}
          </div>
        </>
      )}

      {/* Footer Navigation Bar - styled buttons implementation */}
      <div className="nav-footer">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousDay}
          className="nav-btn prev-btn"
          aria-label={`Navigate to ${getDayNavigationName(getPreviousDay(selectedDate))}`}
          tabIndex={0}
        >
          ← {getDayNavigationName(getPreviousDay(selectedDate))}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBackToWeekly}
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
          aria-label={`Navigate to ${getDayNavigationName(getNextDay(selectedDate))}`}
          tabIndex={0}
        >
          {getDayNavigationName(getNextDay(selectedDate))} →
        </Button>
      </div>
    </div>
  );
};

export default DailyView;

