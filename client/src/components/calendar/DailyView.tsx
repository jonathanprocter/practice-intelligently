import { useState } from 'react';
import { generateTimeSlots } from '../../utils/timeSlots';
import { formatDateLong, isToday } from '../../utils/dateUtils';
import { cleanEventTitle } from '../../utils/textCleaner';
import { getLocationDisplay, getLocationIcon } from '../../utils/locationUtils';
import { CalendarEvent } from '../../types/calendar';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { ChevronLeft, ChevronRight, Plus, FileText } from 'lucide-react';

interface DailyViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onTimeSlotClick: (time: string) => void;
  onPreviousDay: () => void;
  onNextDay: () => void;
  onNewAppointment?: () => void;
  onSessionNotes?: (event: CalendarEvent) => void;
}

export const DailyView = ({
  date,
  events,
  onEventClick,
  onTimeSlotClick,
  onPreviousDay,
  onNextDay,
  onNewAppointment,
  onSessionNotes
}: DailyViewProps) => {
  const timeSlots = generateTimeSlots();
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);

  // Filter events for the selected date
  const dayEvents = events.filter(event => {
    const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    return eventStart.toDateString() === date.toDateString();
  }).sort((a, b) => {
    const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
    const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
    return aTime.getTime() - bTime.getTime();
  });

  const getEventsForTimeSlot = (timeSlot: { hour: number; minute: number }) => {
    return dayEvents.filter(event => {
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
      
      const slotTime = new Date(date);
      slotTime.setHours(timeSlot.hour, timeSlot.minute, 0, 0);
      
      return startTime <= slotTime && endTime > slotTime;
    });
  };

  const getEventColor = (event: CalendarEvent) => {
    switch (event.status) {
      case 'confirmed':
        return 'bg-therapy-success/10 border-therapy-success text-therapy-success';
      case 'completed':
        return 'bg-therapy-primary/10 border-therapy-primary text-therapy-primary';
      case 'cancelled':
        return 'bg-therapy-error/10 border-therapy-error text-therapy-error';
      case 'no-show':
        return 'bg-gray-100 border-gray-400 text-gray-600';
      default:
        return 'bg-therapy-warning/10 border-therapy-warning text-therapy-warning';
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

  const formatTime = (time: Date | string) => {
    const dateTime = time instanceof Date ? time : new Date(time);
    return dateTime.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getDayStats = () => {
    const total = dayEvents.length;
    const completed = dayEvents.filter(e => e.status === 'completed').length;
    const confirmed = dayEvents.filter(e => e.status === 'confirmed').length;
    const cancelled = dayEvents.filter(e => e.status === 'cancelled').length;
    
    return { total, completed, confirmed, cancelled };
  };

  const stats = getDayStats();

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="p-6 bg-therapy-bg border-b-2 border-therapy-border">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className={cn(
              "text-2xl font-bold",
              isToday(date) ? "text-therapy-primary" : "text-therapy-text"
            )}>
              {formatDateLong(date)}
            </h1>
            {isToday(date) && (
              <p className="text-therapy-primary/70 text-sm">Today's Schedule</p>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {onNewAppointment && (
              <Button 
                onClick={onNewAppointment}
                className="bg-therapy-primary hover:bg-therapy-primary/80 text-white flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Appointment
              </Button>
            )}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button 
            variant="outline" 
            onClick={onPreviousDay}
            className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5"
          >
            <ChevronLeft className="w-4 h-4 mr-2" />
            Previous Day
          </Button>

          {/* Day stats */}
          <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="border-therapy-text/20">
                {stats.total} Total
              </Badge>
              <Badge variant="outline" className="border-therapy-success text-therapy-success">
                {stats.completed} Completed
              </Badge>
              <Badge variant="outline" className="border-therapy-primary text-therapy-primary">
                {stats.confirmed} Confirmed
              </Badge>
              {stats.cancelled > 0 && (
                <Badge variant="outline" className="border-therapy-error text-therapy-error">
                  {stats.cancelled} Cancelled
                </Badge>
              )}
            </div>
          </div>

          <Button 
            variant="outline" 
            onClick={onNextDay}
            className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5"
          >
            Next Day
            <ChevronRight className="w-4 h-4 ml-2" />
          </Button>
        </div>
      </div>

      {/* Daily schedule */}
      <div className="flex-1 flex">
        {/* Time slots */}
        <div className="w-20 border-r-2 border-therapy-border bg-therapy-bg/50">
          <ScrollArea className="h-full">
            {timeSlots.map((timeSlot, index) => (
              <div
                key={index}
                className={cn(
                  "p-3 text-xs text-therapy-text/70 border-b border-therapy-border/30 cursor-pointer hover:bg-therapy-primary/5",
                  selectedTimeSlot === timeSlot.display && "bg-therapy-primary/10 text-therapy-primary"
                )}
                onClick={() => {
                  setSelectedTimeSlot(timeSlot.display);
                  onTimeSlotClick(timeSlot.display);
                }}
              >
                {timeSlot.display}
              </div>
            ))}
          </ScrollArea>
        </div>

        {/* Appointments */}
        <div className="flex-1">
          <ScrollArea className="h-full">
            {timeSlots.map((timeSlot, index) => {
              const slotEvents = getEventsForTimeSlot(timeSlot);
              
              return (
                <div
                  key={index}
                  className={cn(
                    "min-h-16 border-b border-therapy-border/30 p-3",
                    selectedTimeSlot === timeSlot.display && "bg-therapy-primary/5"
                  )}
                >
                  {slotEvents.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-therapy-text/30 text-sm">
                      {/* Empty slot */}
                    </div>
                  ) : (
                    slotEvents.map((event, eventIndex) => {
                      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
                      const endTime = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
                      
                      return (
                        <Card
                          key={eventIndex}
                          className={cn(
                            "mb-2 cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                            getEventColor(event)
                          )}
                          onClick={() => onEventClick(event)}
                        >
                          <CardContent className="p-4">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <div className="flex items-center gap-2 mb-2">
                                  <span className="text-lg">{getEventTypeIcon(event.type)}</span>
                                  <h3 className="font-semibold text-therapy-text">
                                    {cleanEventTitle(event.title)}
                                  </h3>
                                  <Badge variant="outline" className="ml-auto">
                                    {event.status}
                                  </Badge>
                                </div>
                                
                                {event.clientName && (
                                  <p className="text-therapy-text/70 mb-2">
                                    Client: {event.clientName}
                                  </p>
                                )}
                                
                                <div className="flex items-center gap-4 text-sm text-therapy-text/60 mb-2">
                                  <span>🕒 {formatTime(startTime)} - {formatTime(endTime)}</span>
                                  {event.location && (
                                    <span className="flex items-center gap-1">
                                      {getLocationIcon(event.location)}
                                      {getLocationDisplay(event.location)}
                                    </span>
                                  )}
                                </div>
                                
                                {event.notes && (
                                  <p className="text-sm text-therapy-text/70 bg-therapy-bg/50 p-2 rounded mt-2">
                                    {event.notes}
                                  </p>
                                )}
                              </div>
                              
                              {onSessionNotes && event.status === 'completed' && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    onSessionNotes(event);
                                  }}
                                  className="ml-2 text-therapy-primary hover:text-therapy-primary/80"
                                >
                                  <FileText className="w-4 h-4" />
                                </Button>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })
                  )}
                </div>
              );
            })}
          </ScrollArea>
        </div>
      </div>
    </div>
  );
};