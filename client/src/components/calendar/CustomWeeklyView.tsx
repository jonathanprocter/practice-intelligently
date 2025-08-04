import React from 'react';
import { CalendarEvent, CalendarDay } from '../../types/calendar';
import { format, addDays } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface CustomWeeklyViewProps {
  weekStart: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
}

export function CustomWeeklyView({ weekStart, events, onEventClick }: CustomWeeklyViewProps) {
  // Generate time slots from 6:00 AM to 11:30 PM in 30-minute intervals
  const timeSlots = [];
  for (let hour = 6; hour <= 23; hour++) {
    timeSlots.push(`${hour.toString().padStart(2, '0')}:00`);
    if (hour < 23) {
      timeSlots.push(`${hour.toString().padStart(2, '0')}:30`);
    }
  }

  // Generate days of the week
  const weekDays = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const dayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  // Helper function to get events for a specific day and time
  const getEventsForDayAndTime = (date: Date, timeSlot: string) => {
    const dayStr = format(date, 'yyyy-MM-dd');
    return events.filter(event => {
      if (!event.start?.dateTime && !event.start?.date) return false;
      
      const eventDate = new Date(event.start.dateTime || event.start.date);
      const eventDateStr = format(eventDate, 'yyyy-MM-dd');
      
      if (eventDateStr !== dayStr) return false;
      
      if (event.start.dateTime) {
        const eventTime = format(eventDate, 'HH:mm');
        return eventTime === timeSlot;
      }
      
      return false;
    });
  };

  // Calculate weekly stats
  const weeklyStats = {
    totalAppointments: events.filter(e => e.start?.dateTime).length,
    totalHours: events.filter(e => e.start?.dateTime && e.end?.dateTime).reduce((acc, event) => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0),
    availableHours: (17.5 * 7) - events.filter(e => e.start?.dateTime && e.end?.dateTime).reduce((acc, event) => {
      const start = new Date(event.start.dateTime);
      const end = new Date(event.end.dateTime);
      return acc + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    }, 0)
  };

  const freeTimePercentage = Math.round((weeklyStats.availableHours / (17.5 * 7)) * 100);

  return (
    <div className="w-full bg-white dark:bg-gray-900">
      {/* Header */}
      <div className="mb-6 text-center">
        <h1 className="text-2xl font-bold mb-2 dark:text-white">WEEKLY PLANNER</h1>
        <p className="text-lg text-gray-600 dark:text-gray-300">
          {format(weekStart, 'MMMM d, yyyy')} - {format(addDays(weekStart, 6), 'MMMM d, yyyy')}
        </p>
      </div>

      {/* Weekly Stats Summary */}
      <div className="mb-6 flex justify-center space-x-8">
        <div className="text-center">
          <div className="text-2xl font-bold dark:text-white">{weeklyStats.totalAppointments}</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Appointments</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold dark:text-white">{weeklyStats.totalHours.toFixed(1)}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Scheduled</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold dark:text-white">{weeklyStats.availableHours.toFixed(1)}h</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Available</div>
        </div>
        <div className="text-center">
          <div className="text-2xl font-bold dark:text-white">{freeTimePercentage}%</div>
          <div className="text-sm text-gray-600 dark:text-gray-300">Free Time</div>
        </div>
      </div>

      {/* Calendar Legend */}
      <div className="mb-4 flex justify-center space-x-6">
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

      {/* Main Calendar Grid */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {/* Header Row */}
          <div className="grid grid-cols-8 gap-1 mb-2">
            <div className="p-2 font-bold text-center dark:text-white">TIME</div>
            {weekDays.map((day, index) => (
              <div key={index} className="p-2 font-bold text-center bg-gray-100 dark:bg-gray-800 dark:text-white">
                {dayNames[index]} {format(day, 'M/d/yyyy')}
              </div>
            ))}
          </div>

          {/* Time Slot Rows */}
          {timeSlots.map((timeSlot) => (
            <div key={timeSlot} className="grid grid-cols-8 gap-1 border-b border-gray-200 dark:border-gray-700">
              {/* Time Column */}
              <div className="p-2 text-sm font-medium text-gray-600 dark:text-gray-300 text-center">
                {timeSlot}
              </div>

              {/* Day Columns */}
              {weekDays.map((day, dayIndex) => {
                const dayEvents = getEventsForDayAndTime(day, timeSlot);
                return (
                  <div key={dayIndex} className="p-1 min-h-[50px] border-r border-gray-200 dark:border-gray-700">
                    {dayEvents.map((event) => (
                      <div
                        key={event.id}
                        onClick={() => onEventClick(event)}
                        className="cursor-pointer mb-1"
                      >
                        <Card className="p-2 hover:shadow-md transition-shadow">
                          <CardContent className="p-0">
                            <div className="text-xs font-medium mb-1 dark:text-white">
                              {event.summary}
                            </div>
                            <div className="flex flex-col space-y-1">
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
                              {event.location && (
                                <div className="text-xs text-gray-600 dark:text-gray-300">
                                  {event.location}
                                </div>
                              )}
                              <div className="text-xs text-gray-500 dark:text-gray-400">
                                {event.start?.dateTime && event.end?.dateTime && (
                                  `${format(new Date(event.start.dateTime), 'HH:mm')} - ${format(new Date(event.end.dateTime), 'HH:mm')}`
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    ))}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}