import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface YearlyViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onYearChange: (date: Date) => void;
  onMonthSelect: (date: Date) => void;
}

interface MonthData {
  name: string;
  year: number;
  month: number;
  firstDay: number;
  daysInMonth: number;
  events: { [key: string]: CalendarEvent[] };
}

export const YearlyView = ({
  currentDate,
  events,
  onDateSelect,
  onYearChange,
  onMonthSelect
}: YearlyViewProps) => {
  const year = currentDate.getFullYear();

  // Generate data for all 12 months
  const monthsData = useMemo<MonthData[]>(() => {
    const months = [];
    const monthNames = [
      'January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'
    ];

    for (let month = 0; month < 12; month++) {
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      const startDay = (firstDay.getDay() + 6) % 7; // Convert to Monday = 0

      // Group events for this month
      const monthEvents: { [key: string]: CalendarEvent[] } = {};
      events.forEach(event => {
        const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
        if (!isNaN(startTime.getTime()) && 
            startTime.getFullYear() === year && 
            startTime.getMonth() === month) {
          const dateKey = startTime.getDate().toString();
          if (!monthEvents[dateKey]) {
            monthEvents[dateKey] = [];
          }
          monthEvents[dateKey].push(event);
        }
      });

      months.push({
        name: monthNames[month],
        year,
        month,
        firstDay: startDay,
        daysInMonth: lastDay.getDate(),
        events: monthEvents
      });
    }

    return months;
  }, [year, events]);

  const handlePreviousYear = () => {
    const prevYear = new Date(year - 1, currentDate.getMonth(), 1);
    onYearChange(prevYear);
  };

  const handleNextYear = () => {
    const nextYear = new Date(year + 1, currentDate.getMonth(), 1);
    onYearChange(nextYear);
  };

  const isToday = (monthData: MonthData, day: number) => {
    const today = new Date();
    return today.getFullYear() === year && 
           today.getMonth() === monthData.month && 
           today.getDate() === day;
  };

  const generateMonthGrid = (monthData: MonthData) => {
    const days = [];

    // Add empty cells for days before the first day of the month
    for (let i = 0; i < monthData.firstDay; i++) {
      days.push(null);
    }

    // Add all days of the month
    for (let day = 1; day <= monthData.daysInMonth; day++) {
      days.push(day);
    }

    return days;
  };

  const dayHeaders = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

  return (
    <div className="yearly-calendar-container bg-white p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl font-bold text-gray-900 text-center flex-1">
          {year}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousYear}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextYear}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* 12-Month Grid */}
      <div className="grid grid-cols-3 gap-8">
        {monthsData.map((monthData) => (
          <div key={`${monthData.month}`} className="monthly-mini-calendar">
            {/* Month Name */}
            <h3 
              className="text-lg font-semibold text-center mb-4 cursor-pointer hover:text-blue-600 transition-colors"
              onClick={() => onMonthSelect(new Date(year, monthData.month, 1))}
            >
              {monthData.name}
            </h3>

            {/* Day Headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {dayHeaders.map((header, index) => (
                <div key={`month-${monthData.month}-header-${index}`} className="text-xs text-center font-medium text-gray-500 p-1">
                  {header}
                </div>
              ))}
            </div>

            {/* Days Grid */}
            <div className="grid grid-cols-7 gap-1">
              {generateMonthGrid(monthData).map((day, index) => {
                if (day === null) {
                  return <div key={`month-${monthData.month}-empty-${index}`} className="p-1 h-8"></div>;
                }

                const hasEvents = monthData.events[day.toString()]?.length > 0;
                const eventCount = monthData.events[day.toString()]?.length || 0;
                const todayClass = isToday(monthData, day);
                const date = new Date(year, monthData.month, day);

                return (
                  <div
                    key={`month-${monthData.month}-day-${day}`}
                    className={cn(
                      "relative p-1 h-8 text-xs text-center cursor-pointer border border-gray-200 transition-colors hover:bg-gray-100",
                      todayClass && "bg-blue-100 border-blue-400 text-blue-800 font-bold",
                      hasEvents && !todayClass && "bg-blue-50 border-blue-200"
                    )}
                    onClick={() => onDateSelect(date)}
                    title={hasEvents ? `${eventCount} event${eventCount !== 1 ? 's' : ''}` : ''}
                  >
                    <span className="flex items-center justify-center h-full">
                      {day}
                    </span>

                    {/* Event indicator dots */}
                    {hasEvents && (
                      <div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 flex gap-0.5">
                        {eventCount > 0 && eventCount <= 3 && (
                          [...Array(Math.min(eventCount, 3))].map((_, i) => (
                            <div
                              key={`month-${monthData.month}-day-${day}-dot-${i}`}
                              className="w-1 h-1 bg-blue-500 rounded-full"
                            />
                          ))
                        )}
                        {eventCount > 3 && (
                          <>
                            <div key={`month-${monthData.month}-day-${day}-dot-1`} className="w-1 h-1 bg-blue-500 rounded-full" />
                            <div key={`month-${monthData.month}-day-${day}-dot-2`} className="w-1 h-1 bg-blue-500 rounded-full" />
                            <div key={`month-${monthData.month}-day-${day}-dot-3`} className="w-1 h-1 bg-blue-500 rounded-full" />
                          </>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="mt-8 text-center">
        <div className="flex items-center justify-center gap-4 text-sm text-gray-600">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
            <span>Has Events</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-blue-100 border border-blue-400 rounded-full"></div>
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  );
};