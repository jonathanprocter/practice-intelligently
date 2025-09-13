import { useQuery } from "@tanstack/react-query";
import { CalendarEvent } from "@/types/calendar";

interface UseCalendarEventsParams {
  timeMin?: string | Date;
  timeMax?: string | Date;
  calendarId?: string;
  activeTab?: string;
  enabled?: boolean;
}

// Transform events to CalendarEvent format
const transformEvents = (events: any[]): CalendarEvent[] => {
  return events.map((event: any) => {
    try {
      // Parse start time from database format
      let startTime: Date;
      if (event.start?.dateTime) {
        startTime = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        startTime = new Date(event.start.date + 'T00:00:00');
      } else {
        startTime = new Date();
      }

      // Parse end time from database format
      let endTime: Date;
      if (event.end?.dateTime) {
        endTime = new Date(event.end.dateTime);
      } else if (event.end?.date) {
        endTime = new Date(event.end.date + 'T23:59:59');
      } else {
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default
      }

      // Ensure we have a valid CalendarEvent structure
      const calendarEvent: CalendarEvent = {
        id: event.id || `event-${Date.now()}-${Math.random()}`,
        title: event.summary || event.title || 'Appointment',
        startTime: startTime,
        endTime: endTime,
        googleEventId: event.id,
        description: event.description || undefined,
        location: event.location || undefined,
        calendarId: event.calendarId || undefined,
        color: event.colorId || undefined,
        status: event.status || 'confirmed',
        attendees: event.attendees || [],
        isAllDay: event.start?.date && !event.start?.dateTime,
        // Parse client name from title/summary if present
        clientName: event.summary?.split(' - ')[0] || 
                   event.summary?.replace(' Appointment', '').replace(' Session', '').trim() ||
                   undefined,
      };

      return calendarEvent;
    } catch (error) {
      console.error('Error transforming event:', error, event);
      // Return a basic event structure on error
      return {
        id: event.id || `event-${Date.now()}-${Math.random()}`,
        title: event.summary || 'Event',
        startTime: new Date(),
        endTime: new Date(Date.now() + 60 * 60 * 1000),
        googleEventId: event.id,
        status: 'confirmed',
        attendees: [],
        isAllDay: false,
      };
    }
  });
};

export function useCalendarEvents({
  timeMin,
  timeMax,
  calendarId,
  activeTab,
  enabled = true
}: UseCalendarEventsParams = {}) {
  // Normalize dates to ISO strings
  const normalizedTimeMin = timeMin ? (timeMin instanceof Date ? timeMin.toISOString() : timeMin) : undefined;
  const normalizedTimeMax = timeMax ? (timeMax instanceof Date ? timeMax.toISOString() : timeMax) : undefined;

  const query = useQuery({
    queryKey: ['calendar-events', normalizedTimeMin, normalizedTimeMax, calendarId, activeTab],
    queryFn: async () => {
      // Build query params
      const params = new URLSearchParams();
      if (normalizedTimeMin) params.append('timeMin', normalizedTimeMin);
      if (normalizedTimeMax) params.append('timeMax', normalizedTimeMax);
      if (calendarId && calendarId !== 'all') params.append('calendarId', calendarId);

      const url = `/api/calendar/events${params.toString() ? `?${params.toString()}` : ''}`;
      
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error('Failed to fetch calendar events');
      }
      
      const events = await response.json();
      return transformEvents(events);
    },
    enabled: enabled,
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
    gcTime: 10 * 60 * 1000, // Keep in cache for 10 minutes
    refetchInterval: 5 * 60 * 1000, // Refetch every 5 minutes (increased from frequent refetching)
    refetchOnWindowFocus: false, // Disable refetch on window focus to reduce calls
  });

  return {
    events: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
    isFetching: query.isFetching,
  };
}

// Hook for today's calendar events specifically
export function useTodaysCalendarEvents(enabled = true) {
  const today = new Date();
  const dayStart = new Date(today);
  dayStart.setHours(0, 0, 0, 0);
  const dayEnd = new Date(today);
  dayEnd.setHours(23, 59, 59, 999);

  return useCalendarEvents({
    timeMin: dayStart,
    timeMax: dayEnd,
    enabled
  });
}

// Hook for weekly calendar events
export function useWeeklyCalendarEvents(weekStart: Date, enabled = true) {
  const startOfWeek = new Date(weekStart);
  startOfWeek.setDate(weekStart.getDate() - weekStart.getDay());
  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return useCalendarEvents({
    timeMin: startOfWeek,
    timeMax: endOfWeek,
    enabled
  });
}