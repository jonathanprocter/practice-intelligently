import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CalendarEvent } from '@/types/calendar';
import { cn } from '@/lib/utils';

interface MonthlyViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  onDateSelect: (date: Date) => void;
  onMonthChange: (date: Date) => void;
  onEventClick: (event: CalendarEvent) => void;
}

export const MonthlyView = ({
  currentDate,
  events,
  onDateSelect,
  onMonthChange,
  onEventClick
}: MonthlyViewProps) => {
  const [hoveredDate, setHoveredDate] = useState<string | null>(null);

  // Get month name and year
  const monthName = currentDate.toLocaleDateString('en-US', { month: 'long' });
  const year = currentDate.getFullYear();

  // Get first day of month and calculate grid
  const firstDay = new Date(year, currentDate.getMonth(), 1);
  const lastDay = new Date(year, currentDate.getMonth() + 1, 0);

  // Get the day of week (0 = Sunday, but we want Monday = 0)
  const startDay = (firstDay.getDay() + 6) % 7; // Convert to Monday = 0
  const daysInMonth = lastDay.getDate();

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const days = [];

    // Add previous month's trailing days
    const prevMonth = new Date(year, currentDate.getMonth() - 1, 0);
    for (let i = startDay - 1; i >= 0; i--) {
      const date = new Date(year, currentDate.getMonth() - 1, prevMonth.getDate() - i);
      days.push({ date, isCurrentMonth: false });
    }

    // Add current month's days
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, currentDate.getMonth(), day);
      days.push({ date, isCurrentMonth: true });
    }

    // Add next month's leading days to complete the grid (42 days = 6 weeks)
    const totalCells = 42;
    const remainingCells = totalCells - days.length;
    for (let day = 1; day <= remainingCells; day++) {
      const date = new Date(year, currentDate.getMonth() + 1, day);
      days.push({ date, isCurrentMonth: false });
    }

    return days;
  }, [year, currentDate.getMonth(), startDay, daysInMonth]);

  // Group events by date
  const eventsByDate = useMemo(() => {
    const grouped: { [key: string]: CalendarEvent[] } = {};
    events.forEach(event => {
      const startTime = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      if (!isNaN(startTime.getTime())) {
        const dateKey = startTime.toDateString();
        if (!grouped[dateKey]) {
          grouped[dateKey] = [];
        }
        grouped[dateKey].push(event);
      }
    });
    return grouped;
  }, [events]);

  const handlePreviousMonth = () => {
    const prevMonth = new Date(year, currentDate.getMonth() - 1, 1);
    onMonthChange(prevMonth);
  };

  const handleNextMonth = () => {
    const nextMonth = new Date(year, currentDate.getMonth() + 1, 1);
    onMonthChange(nextMonth);
  };

  const isToday = (date: Date) => {
    const today = new Date();
    return date.toDateString() === today.toDateString();
  };

  const dayHeaders = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return (
    <div className="monthly-calendar-container bg-white">
      {/* Header */}
      <div className="flex items-center justify-between mb-6 p-4 border-b border-gray-200">
        <h1 className="text-2xl font-bold text-gray-900">
          {monthName} {year}
        </h1>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handlePreviousMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={handleNextMonth}
            className="h-8 w-8 p-0"
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Calendar Grid */}
      <div className="monthly-calendar-grid border-2 border-black bg-white">
        {/* Day Headers */}
        <div className="grid grid-cols-7 border-b-2 border-black">
          {dayHeaders.map((day) => (
            <div
              key={day}
              className="p-3 text-center font-semibold text-sm bg-gray-50 border-r border-gray-300 last:border-r-0"
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div className="grid grid-cols-7">
          {calendarDays.map(({ date, isCurrentMonth }, index) => {
            const dateKey = date.toDateString();
            const dayEvents = eventsByDate[dateKey] || [];
            const isHovered = hoveredDate === dateKey;
            const todayClass = isToday(date);

            return (
              <div
                key={index}
                className={cn(
                  "monthly-calendar-day border-r border-b border-gray-300 last:border-r-0 p-2 min-h-[120px] cursor-pointer transition-colors",
                  !isCurrentMonth && "bg-gray-50 text-gray-400",
                  isCurrentMonth && "bg-white text-gray-900",
                  todayClass && "bg-blue-50 border-blue-300",
                  isHovered && "bg-gray-100"
                )}
                onClick={() => onDateSelect(date)}
                onMouseEnter={() => setHoveredDate(dateKey)}
                onMouseLeave={() => setHoveredDate(null)}
              >
                {/* Day Number */}
                <div className={cn(
                  "text-right font-medium mb-1 text-sm",
                  todayClass && "text-blue-600 font-bold"
                )}>
                  {date.getDate()}
                </div>

                {/* Events */}
                <div className="space-y-1">
                  {dayEvents.slice(0, 3).map((event, eventIndex) => (
                    <div
                      key={eventIndex}
                      className={cn(
                        "text-xs p-1 rounded cursor-pointer truncate",
                        event.source === 'simplepractice' && "bg-blue-100 text-blue-800 border-l-2 border-blue-500",
                        event.source === 'google' && "bg-green-100 text-green-800 border-l-2 border-green-500",
                        event.source === 'manual' && "bg-orange-100 text-orange-800 border-l-2 border-orange-500"
                      )}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick(event);
                      }}
                      title={`${event.title} - ${event.startTime instanceof Date ? 
                        event.startTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : 
                        new Date(event.startTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
                      }`}
                    >
                      {event.title}
                    </div>
                  ))}

                  {/* Show overflow indicator */}
                  {dayEvents.length > 3 && (
                    <div className="text-xs text-gray-500 font-medium">
                      +{dayEvents.length - 3} more
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};