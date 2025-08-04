import React from 'react';
import { CalendarEvent } from '../../types/calendar';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface CustomDailyViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onPrevDay: () => void;
  onNextDay: () => void;
}

export function CustomDailyView({ date, events, onEventClick, onPrevDay, onNextDay }: CustomDailyViewProps) {
  // Generate time slots from 6:00 AM to 11:30 PM in 30-minute intervals
  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 23) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Filter events for the current day
  const dayStr = format(date, 'yyyy-MM-dd');
  const dayEvents = events.filter(event => {
    if (!event.start?.dateTime && !event.start?.date) return false;
    const eventDate = new Date(event.start.dateTime || event.start.date);
    const eventDateStr = format(eventDate, 'yyyy-MM-dd');
    return eventDateStr === dayStr;
  });

  // Helper function to get events for a specific time slot
  const getEventsForTime = (timeSlot: string) => {
    return dayEvents.filter(event => {
      if (!event.start?.dateTime) return false;
      const eventDate = new Date(event.start.dateTime);
      const eventTime = format(eventDate, 'HH:mm');
      return eventTime === timeSlot;
    });
  };

  // Calculate daily stats
  const dailyStats = {
    totalAppointments: dayEvents.filter(e => e.start?.dateTime).length,
    totalHours: dayEvents.filter(e => e.start?.dateTime && e.end?.dateTime).reduce((acc, event) => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0),
    availableHours: 17.5 - dayEvents.filter(e => e.start?.dateTime && e.end?.dateTime).reduce((acc, event) => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0)
  };

  const freeTimePercentage = Math.round((dailyStats.availableHours / 17.5) * 100);

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-900">
      {/* Header with Navigation */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <Button variant="outline" onClick={onPrevDay} className="flex items-center space-x-2">
            <ChevronLeft className="w-4 h-4" />
            <span>Previous Day</span>
          </Button>
          
          <div className="text-center">
            <h1 className="text-2xl font-bold dark:text-white">Weekly Overview</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">
              {format(date, 'EEEE, MMMM d, yyyy')}
            </p>
          </div>

          <Button variant="outline" onClick={onNextDay} className="flex items-center space-x-2">
            <span>Next Day</span>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>

        {/* Daily Stats */}
        <div className="flex justify-center space-x-8 mb-6">
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white">{dailyStats.totalAppointments}</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Appointments</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white">{dailyStats.totalHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Scheduled</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white">{dailyStats.availableHours.toFixed(1)}h</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Available</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold dark:text-white">{freeTimePercentage}%</div>
            <div className="text-sm text-gray-600 dark:text-gray-300">Free Time</div>
          </div>
        </div>

        {/* Calendar Legend */}
        <div className="flex justify-center space-x-6 mb-4">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-blue-500 rounded"></div>
            <span className="text-sm dark:text-white">SimplePractice</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-green-500 rounded"></div>
            <span className="text-sm dark:text-white">Google Calendar</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 bg-red-500 rounded"></div>
            <span className="text-sm dark:text-white">Holidays</span>
          </div>
        </div>
      </div>

      {/* Time Slots */}
      <div className="space-y-2">
        {timeSlots.map((timeSlot) => {
          const timeEvents = getEventsForTime(timeSlot);
          return (
            <div key={timeSlot} className="flex border-b border-gray-200 dark:border-gray-700">
              {/* Time Column */}
              <div className="w-20 p-3 text-sm font-medium text-gray-600 dark:text-gray-300 text-right">
                {timeSlot}
              </div>

              {/* Events Column */}
              <div className="flex-1 p-3 min-h-[60px]">
                {timeEvents.length > 0 ? (
                  <div className="space-y-2">
                    {timeEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="cursor-pointer"
                      >
                        <Card className="hover:shadow-md transition-shadow">
                          <CardContent className="p-3">
                            <div className="flex justify-between items-start mb-2">
                              <div className="font-medium dark:text-white">
                                {event.summary}
                              </div>
                              <Badge 
                                variant="secondary" 
                                className={`text-xs ${
                                  event.organizer?.email?.includes('simplepractice') 
                                    ? 'bg-blue-500 text-white' 
                                    : event.organizer?.email?.includes('google')
                                    ? 'bg-green-500 text-white'
                                    : 'bg-red-500 text-white'
                                }`}
                              >
                                {event.organizer?.email?.includes('simplepractice') 
                                  ? 'SimplePractice' 
                                  : event.organizer?.email?.includes('google')
                                  ? 'Google Calendar'
                                  : 'Holiday'}
                              </Badge>
                            </div>
                            
                            {event.location && (
                              <div className="text-sm text-gray-600 dark:text-gray-300 mb-1">
                                📍 {event.location}
                              </div>
                            )}
                            
                            <div className="text-sm text-gray-500 dark:text-gray-400">
                              {event.start?.dateTime && event.end?.dateTime && (
                                `${format(new Date(event.start.dateTime), 'HH:mm')} - ${format(new Date(event.end.dateTime), 'HH:mm')}`
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-gray-400 dark:text-gray-500 text-sm italic">
                    No appointments
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}