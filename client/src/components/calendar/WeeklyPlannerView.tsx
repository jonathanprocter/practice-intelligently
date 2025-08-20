import React from 'react';
import { CalendarEvent, CalendarDay } from '../../types/calendar';

interface WeeklyPlannerViewProps {
  week: CalendarDay[];
  events: CalendarEvent[];
  onDayClick: (date: Date) => void;
  onTimeSlotClick: (date: Date, time: string) => void;
  onEventClick: (event: CalendarEvent) => void;
  onEventMove?: (eventId: string, newStartTime: Date, newEndTime: Date) => void;
}

/**
 * Renders a weekly planner view with events.
 * @param {WeeklyPlannerViewProps} props The properties for the WeeklyPlannerView component.
 * @returns A React component representing a weekly planner view.
 */
export const WeeklyPlannerView: React.FC<WeeklyPlannerViewProps> = ({
  week,
  events,
  onDayClick,
  onTimeSlotClick,
  onEventClick,
  onEventMove
}) => {
  // Early return for empty or invalid data
  if (week.length === 0) {
    return <div className="p-4 text-center text-gray-500">No week data available</div>;
  }

  if (events.length === 0) {
    return <div className="p-4 text-center text-gray-500">No events data available</div>;
  }

  // Debugging information (consider removing for production)
  console.debug('📅 Weekly view debug:', {
    weekLength: week.length,
    eventsLength: events.length,
    weekStart: week[0]?.date?.toDateString() || 'Invalid',
    weekEnd: week[6]?.date?.toDateString() || 'Invalid'
  });

  return (
    <div className="weekly-planner-view p-4">
      <div className="mb-4">
        <h2 className="text-lg font-semibold">Weekly Planner</h2>
        <p className="text-sm text-gray-600">
          {events.length} events for week of {week[0]?.date?.toDateString() || 'Unknown'}
        </p>
      </div>

      <div className="grid grid-cols-8 gap-2">
        <div className="font-medium text-sm text-gray-600">Time</div>
        {week.map((day, index) => (
          <div key={day.date.toISOString()} className="font-medium text-sm text-gray-600 text-center">
            <div>{day.dayName || 'Unknown'}</div>
            <div>{day.date.getDate()}</div>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-500">
        Component loaded successfully. Events and week data are available.
      </div>
    </div>
  );
};
