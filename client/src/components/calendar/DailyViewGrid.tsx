import { useState, useEffect, useCallback, useMemo } from 'react';
import { CalendarEvent } from '../../types/calendar';
import { generateTimeSlots, getEventsForTimeSlot, calculateSlotPosition, formatTimeRange, TimeSlot } from '../../utils/timeSlots';
import { cleanEventTitle, formatClientName } from '../../utils/textCleaner';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Calendar, MapPin, User, Clock, MessageSquare, Trash2, Edit, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppointmentDetailsDialog } from './AppointmentDetailsDialog';
import './DailyViewGrid.css';

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
  const [dailyNotes, setDailyNotes] = useState('');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const { toast } = useToast();

  // Generate time slots from 6:00 AM to 11:30 PM in 30-minute intervals
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
    setIsDialogOpen(true);
    onEventClick(event);
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

  const renderEventInTimeSlot = (event: CalendarEvent, timeSlot: TimeSlot, eventIndex: number) => {
    const startTime = parseEventDate(event.startTime);
    const endTime = parseEventDate(event.endTime);
    
    if (!startTime || !endTime) return null;

    // Calculate the duration in 30-minute slots
    const durationMs = endTime.getTime() - startTime.getTime();
    const durationSlots = Math.ceil(durationMs / (30 * 60 * 1000));
    
    // Only render the event in its starting time slot
    const eventStartSlot = timeSlots.find(slot => {
      const slotDate = new Date(date);
      slotDate.setHours(slot.hour, slot.minute, 0, 0);
      return Math.abs(slotDate.getTime() - startTime.getTime()) < 30 * 60 * 1000;
    });
    
    if (eventStartSlot?.hour !== timeSlot.hour || eventStartSlot?.minute !== timeSlot.minute) {
      return null;
    }

    return (
      <div
        key={event.id}
        className={getAppointmentClassName(event)}
        style={{
          '--grid-span': durationSlots,
          height: `calc(${durationSlots * 40}px - 2px)`,
          minHeight: '36px',
          zIndex: 10 + eventIndex
        } as React.CSSProperties}
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
                {startTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
                {' - '}
                {endTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}
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
      </div>
    );
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

      {/* Main Content - Time Grid Layout */}
      <div className="daily-content">
        {/* Daily Notes Section */}
        <div className="daily-notes-section">
          <Card className="daily-notes-card">
            <CardContent className="p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium text-gray-700">Daily Notes</h3>
                <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                  <Edit className="h-3 w-3" />
                </Button>
              </div>
              <Textarea
                value={dailyNotes}
                onChange={(e) => setDailyNotes(e.target.value)}
                placeholder="Add notes for this day..."
                className="min-h-[60px] text-xs resize-none"
                data-testid="input-daily-notes"
              />
            </CardContent>
          </Card>
        </div>

        {/* Time Grid */}
        <div className="time-grid-container">
          <div className="time-grid">
            {/* Time Column Header */}
            <div className="time-column-header">
              <span className="time-label">Time</span>
            </div>
            
            {/* Events Column Header */}
            <div className="events-column-header">
              <span>Schedule</span>
              <Button
                variant="outline"
                size="sm"
                onClick={onNewAppointment}
                className="ml-auto text-xs"
                data-testid="button-add-appointment"
              >
                + Add
              </Button>
            </div>

            {/* Time Slots with Events */}
            {timeSlots.map((timeSlot, index) => {
              const slotEvents = getEventsForTimeSlot(dayEvents, date, timeSlot);
              
              return (
                <div key={`slot-${timeSlot.hour}-${timeSlot.minute}`} className="time-grid-row">
                  {/* Time Label */}
                  <div className="time-label-cell">
                    <span className="time-text" data-testid={`time-slot-${timeSlot.display}`}>
                      {timeSlot.display}
                    </span>
                  </div>
                  
                  {/* Events Cell */}
                  <div 
                    className={cn("events-cell", slotEvents.length > 0 && "has-events")}
                    onClick={() => {
                      if (onTimeSlotClick) {
                        const slotDate = new Date(date);
                        slotDate.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
                        onTimeSlotClick(slotDate, timeSlot.display);
                      }
                    }}
                    data-testid={`time-slot-grid-${timeSlot.display}`}
                  >
                    {slotEvents.map((event, eventIndex) => 
                      renderEventInTimeSlot(event, timeSlot, eventIndex)
                    )}
                  </div>
                </div>
              );
            })}
          </div>
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

      <AppointmentDetailsDialog
        event={selectedEvent}
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        onSessionNotes={onSessionNotes}
        onDeleteEvent={onDeleteEvent}
      />
    </div>
  );
};