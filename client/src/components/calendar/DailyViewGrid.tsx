import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent } from '../../types/calendar';
import { generateTimeSlots, getEventsForTimeSlot, calculateSlotPosition, formatTimeRange, TimeSlot } from '../../utils/timeSlots';
import { cleanEventTitle, formatClientName } from '../../utils/textCleaner';
import { cn } from '@/lib/utils';
import './DailyViewGrid.css';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Calendar, MapPin, User, Clock, MessageSquare, Trash2, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface DailyViewGridProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick?: (date: Date, time: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onBackToWeek?: () => void;
  onNewAppointment: () => void;
  onSessionNotes?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
}

// Improved date comparison function
const isSameDay = (date1: Date, date2: Date): boolean => {
  try {
    const d1 = new Date(date1);
    const d2 = new Date(date2);
    return (
      d1.getFullYear() === d2.getFullYear() &&
      d1.getMonth() === d2.getMonth() &&
      d1.getDate() === d2.getDate()
    );
  } catch (error) {
    console.error('Date comparison error:', error);
    return false;
  }
};

// Safe date parsing function
const parseEventDate = (dateInput: string | Date): Date | null => {
  try {
    if (dateInput instanceof Date) {
      return dateInput;
    }
    if (typeof dateInput === 'string') {
      const parsed = new Date(dateInput);
      if (isNaN(parsed.getTime())) {
        console.warn('Invalid date string:', dateInput);
        return null;
      }
      return parsed;
    }
    return null;
  } catch (error) {
    console.error('Date parsing error:', error, dateInput);
    return null;
  }
};

export const DailyViewGrid = ({
  date,
  events,
  onEventClick,
  onTimeSlotClick,
  onPreviousDay,
  onNextDay,
  onBackToWeek,
  onNewAppointment,
  onSessionNotes,
  onDeleteEvent
}: DailyViewGridProps) => {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [expandedEventId, setExpandedEventId] = useState<string | null>(null);
  const [dailyNotes, setDailyNotes] = useState('');
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const { toast } = useToast();

  // Generate time slots from 6:00 AM to 11:30 PM
  const timeSlots = useMemo(() => generateTimeSlots(), []);

  // Filter and sort events for the selected date
  const dayEvents = useMemo(() => {
    console.log('DailyViewGrid: Filtering events for date:', date);
    console.log('DailyViewGrid: Total events received:', events.length);

    if (!events || events.length === 0) {
      console.log('DailyViewGrid: No events to filter');
      return [];
    }

    const filtered = events.filter(event => {
      if (!event || !event.startTime) {
        console.warn('DailyViewGrid: Event missing startTime:', event);
        return false;
      }

      const eventDate = parseEventDate(event.startTime);
      if (!eventDate) {
        console.warn('DailyViewGrid: Could not parse event date:', event.startTime);
        return false;
      }

      const matches = isSameDay(eventDate, date);
      if (matches) {
        console.log(`DailyViewGrid: Event "${event.title}" matches date ${date.toDateString()}`);
      }

      return matches;
    });

    console.log(`DailyViewGrid: Found ${filtered.length} events for ${date.toDateString()}`);
    return filtered.sort((a, b) => {
      const timeA = parseEventDate(a.startTime);
      const timeB = parseEventDate(b.startTime);
      if (!timeA || !timeB) return 0;
      return timeA.getTime() - timeB.getTime();
    });
  }, [events, date]);

  // Helper functions for navigation
  const getPreviousDay = useCallback(() => {
    const prevDay = new Date(date);
    prevDay.setDate(date.getDate() - 1);
    return prevDay;
  }, [date]);

  const getNextDay = useCallback(() => {
    const nextDay = new Date(date);
    nextDay.setDate(date.getDate() + 1);
    return nextDay;
  }, [date]);

  const getDayNavigationName = useCallback((targetDate: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);

    if (isSameDay(targetDate, today)) return 'Today';
    if (isSameDay(targetDate, tomorrow)) return 'Tomorrow';
    if (isSameDay(targetDate, yesterday)) return 'Yesterday';
    
    return targetDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  }, []);

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setExpandedEventId(expandedEventId === event.id ? null : event.id);
    onEventClick(event);
  };

  const handleTimeSlotClick = (timeSlot: TimeSlot) => {
    if (onTimeSlotClick) {
      // Create a new date with the specific time slot
      const slotDate = new Date(date);
      slotDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      onTimeSlotClick(slotDate, timeSlot.display);
    }
  };

  const handleDeleteEvent = async (event: CalendarEvent) => {
    if (!onDeleteEvent) return;
    
    try {
      await onDeleteEvent(event);
      setExpandedEventId(null);
      toast({
        title: "Event Deleted",
        description: "The calendar event has been successfully deleted.",
      });
    } catch (error) {
      console.error('Error deleting event:', error);
      toast({
        title: "Error",
        description: "Failed to delete the event. Please try again.",
        variant: "destructive"
      });
    }
  };

  const getAppointmentClassName = (event: CalendarEvent) => {
    let baseClass = "appointment";
    
    // Source-based styling
    if (event.source === 'simplepractice' || event.source === 'SimplePractice') {
      baseClass += " simplepractice";
    } else if (event.source === 'google' || event.source === 'Google Calendar') {
      baseClass += " google-calendar";
    } else {
      baseClass += " personal";
    }
    
    // Status-based styling
    if (event.status === 'cancelled') {
      baseClass += " status-cancelled";
    } else if (event.status === 'confirmed') {
      baseClass += " status-confirmed";
    }
    
    return baseClass;
  };

  const getEventPositionStyle = (event: CalendarEvent, timeSlot: TimeSlot) => {
    const startTime = parseEventDate(event.startTime);
    const endTime = parseEventDate(event.endTime);
    
    if (!startTime || !endTime) return {};

    const slotPosition = calculateSlotPosition(startTime, endTime);
    const duration = Math.max(1, slotPosition.endSlot - slotPosition.startSlot);
    
    return {
      '--grid-span': duration,
      height: `calc(${duration * 40}px - 2px)`,
      minHeight: '36px'
    };
  };

  return (
    <div className="daily-view" data-testid="daily-view-grid">
      {/* Header */}
      <div className="daily-header">
        <h1 className="daily-title">
          {date.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
          })}
        </h1>
        <div className="daily-stats">
          <span className="appointments-count" data-testid="appointments-count">
            {dayEvents.length} appointment{dayEvents.length !== 1 ? 's' : ''}
          </span>
        </div>
      </div>

      {/* Daily Notes Section */}
      <Card className="daily-notes mb-4">
        <CardContent className="p-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-sm font-medium">Daily Notes</h3>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsEditingNotes(!isEditingNotes)}
              data-testid="button-edit-daily-notes"
            >
              <Edit className="h-4 w-4" />
            </Button>
          </div>
          {isEditingNotes ? (
            <div className="space-y-2">
              <Textarea
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
                placeholder="Add notes for this day..."
                className="min-h-[80px]"
                data-testid="input-daily-notes"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  onClick={() => {
                    setIsEditingNotes(false);
                    toast({ title: "Notes Saved", description: "Daily notes have been saved." });
                  }}
                  data-testid="button-save-notes"
                >
                  Save
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditingNotes(false)}
                  data-testid="button-cancel-notes"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              {dailyNotes || 'Click edit to add daily notes...'}
            </p>
          )}
        </CardContent>
      </Card>

      {/* Time Grid */}
      <div className="daily-grid">
        {/* Time Column */}
        <div className="time-column">
          <div className="time-header">Time</div>
          {timeSlots.map((slot) => (
            <div
              key={`${slot.hour}-${slot.minute}`}
              className="time-slot-label"
              data-testid={`time-slot-${slot.display}`}
            >
              {slot.display}
            </div>
          ))}
        </div>

        {/* Appointments Column */}
        <div className="appointments-column">
          <div className="appointments-header">
            Appointments
            <Button
              variant="outline"
              size="sm"
              onClick={onNewAppointment}
              className="ml-auto"
              data-testid="button-add-appointment"
            >
              + Add
            </Button>
          </div>

          {/* Time slots with appointments */}
          {timeSlots.map((slot, slotIndex) => {
            const slotEvents = getEventsForTimeSlot(dayEvents, date, slot);
            
            return (
              <div
                key={`slot-${slot.hour}-${slot.minute}`}
                className={cn("time-slot", slotEvents.length > 0 && "has-events")}
                onClick={() => handleTimeSlotClick(slot)}
                data-testid={`time-slot-grid-${slot.display}`}
              >
                {slotEvents.map((event, eventIndex) => {
                  const startTime = parseEventDate(event.startTime);
                  const endTime = parseEventDate(event.endTime);
                  
                  return (
                    <div
                      key={event.id}
                      className={getAppointmentClassName(event)}
                      style={getEventPositionStyle(event, slot) as React.CSSProperties}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleEventClick(event);
                      }}
                      data-testid={`appointment-${event.id}`}
                    >
                      <div className="appointment-content">
                        <div className="appointment-title">
                          {cleanEventTitle(event.title)}
                        </div>
                        <div className="appointment-time">
                          {startTime && endTime && (
                            <span className="time-range">
                              {formatTimeRange(startTime, endTime)}
                            </span>
                          )}
                        </div>
                        {event.clientName && (
                          <div className="appointment-client">
                            {formatClientName(event.clientName)}
                          </div>
                        )}
                        {event.location && (
                          <div className="appointment-location">
                            <MapPin className="h-3 w-3" />
                            {event.location}
                          </div>
                        )}
                      </div>

                      {/* Expanded Event Details */}
                      {expandedEventId === event.id && (
                        <div className="appointment-expanded" data-testid={`expanded-details-${event.id}`}>
                          <div className="expanded-content">
                            {event.notes && (
                              <div className="expanded-section">
                                <h4>Notes</h4>
                                <p>{event.notes}</p>
                              </div>
                            )}
                            
                            <div className="expanded-actions">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  if (onSessionNotes) onSessionNotes(event);
                                }}
                                className="text-xs"
                                data-testid={`button-session-notes-${event.id}`}
                              >
                                <MessageSquare className="h-3 w-3 mr-1" />
                                Session Notes
                              </Button>
                              {onDeleteEvent && (
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleDeleteEvent(event);
                                  }}
                                  className="text-xs"
                                  data-testid={`button-delete-${event.id}`}
                                >
                                  <Trash2 className="h-3 w-3 mr-1" />
                                  Delete
                                </Button>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedEventId(null);
                                }}
                                className="text-xs"
                                data-testid={`button-close-${event.id}`}
                              >
                                <X className="h-3 w-3 mr-1" />
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
            );
          })}
        </div>
      </div>

      {/* Footer Navigation Bar */}
      <div className="nav-footer">
        <Button
          variant="outline"
          size="sm"
          onClick={onPreviousDay}
          className="nav-btn prev-btn"
          aria-label={`Navigate to ${getDayNavigationName(getPreviousDay())}`}
          data-testid="button-previous-day"
        >
          ← {getDayNavigationName(getPreviousDay())}
        </Button>
        
        {onBackToWeek && (
          <Button
            variant="outline"
            size="sm"
            onClick={onBackToWeek}
            className="nav-btn weekly-btn"
            aria-label="Navigate to weekly overview"
            data-testid="button-weekly-overview"
          >
            📅 Weekly Overview
          </Button>
        )}
        
        <Button
          variant="outline"
          size="sm"
          onClick={onNextDay}
          className="nav-btn next-btn"
          aria-label={`Navigate to ${getDayNavigationName(getNextDay())}`}
          data-testid="button-next-day"
        >
          {getDayNavigationName(getNextDay())} →
        </Button>
      </div>
    </div>
  );
};