import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';
import { CalendarEvent, CalendarDay } from '../types/calendar';
import { getOfficeLocationByDay, getCalendarLocationDisplay } from '@/utils/locationUtils';
import { getWeekStart, getWeekEnd, getWeekDays, addWeeks, isCurrentWeek, getWeekRangeString } from '../utils/dateUtils';
// Removed export imports - using direct PDF export now
import { WeeklyCalendarGrid } from '../components/calendar/WeeklyCalendarGrid';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { Link } from 'wouter';
import { DailyView } from '../components/calendar/DailyView';
import { AppointmentStatusView } from '../components/calendar/AppointmentStatusView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, List, Clock, FileDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon, Settings, Search, Filter, MapPin, User, X } from 'lucide-react';

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Start with the current week to show today's events
    return getWeekStart(new Date());
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all');
  
  // Advanced filtering states for calendar
  const [searchFilter, setSearchFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showAdvancedCalendarFilters, setShowAdvancedCalendarFilters] = useState(false);
  const [dateRangeFilter, setDateRangeFilter] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [calendarTypeFilter, setCalendarTypeFilter] = useState<string[]>([]);

  // Get week range
  const weekEnd = getWeekEnd(currentWeek);
  const weekDays = getWeekDays(currentWeek);
  const weekRangeString = getWeekRangeString(currentWeek, weekEnd);

  // Fetch Google Calendar events instead of mock appointments
  // Add Connect Google Calendar functionality
  const connectGoogleCalendar = () => {
    // Initiating Google Calendar connection
    window.location.href = '/api/auth/google';
  };



  const { data: googleEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['google-calendar-events', selectedCalendarId],
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
    queryFn: async () => {
      // Fetching calendar events for current timeframe only
      try {
        // Get all events from 2015-2030 to include all historical appointments
        const recentStart = new Date('2015-01-01T00:00:00.000Z');
        const recentEnd = new Date('2030-12-31T23:59:59.999Z');
        
        const timeMin = recentStart.toISOString();
        const timeMax = recentEnd.toISOString();
        const calendarParam = selectedCalendarId === 'all' ? '' : `&calendarId=${selectedCalendarId}`;

        // Try getting Simple Practice events specifically first
        const simplePracticeCalendarId = '79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822@group.calendar.google.com';
        const simplePracticeResponse = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&calendarId=${simplePracticeCalendarId}`);
        
        if (simplePracticeResponse.ok) {
          const simplePracticeEvents = await simplePracticeResponse.json();
          console.log(`Successfully loaded ${simplePracticeEvents.length} events from Simple Practice calendar`);
          
          if (simplePracticeEvents.length > 0) {
            return simplePracticeEvents.map((event: any) => ({
              id: event.id,
              title: event.title || event.summary || 'Appointment',
              startTime: new Date(event.startTime || event.start?.dateTime || event.start?.date),
              endTime: new Date(event.endTime || event.end?.dateTime || event.end?.date),
              location: event.location || getCalendarLocationDisplay(event.startTime || event.start?.dateTime || event.start?.date),
              description: event.description || '',
              calendarId: event.calendarId || 'simple-practice',
              calendarName: event.calendarName || 'Simple Practice'
            }));
          }
        }
        
        // Fallback: Get all calendar events
        const allEventsResponse = await fetch(`/api/calendar/events?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}${calendarParam}`);

        if (allEventsResponse.ok) {
          const allEvents = await allEventsResponse.json();
          console.log(`Successfully loaded ${allEvents.length} events from all calendars`);

          if (allEvents.length > 0) {
            return allEvents.map((event: any) => ({
              id: event.id,
              title: event.title || event.summary || 'Appointment',  
              startTime: new Date(event.startTime || event.start?.dateTime || event.start?.date),
              endTime: new Date(event.endTime || event.end?.dateTime || event.end?.date),
              location: event.location || getCalendarLocationDisplay(event.startTime || event.start?.dateTime || event.start?.date),
              description: event.description || '',
              calendarId: event.calendarId || 'simple-practice',
              calendarName: event.calendarName || 'Simple Practice'
            }));
          }
        }

        // Fallback: Get today's events from Simple Practice integration
        const todayResponse = await fetch('/api/oauth/events/today');
        console.log('Today response status:', todayResponse.status);

        if (todayResponse.ok) {
          const todayEvents = await todayResponse.json();
          console.log('Today events from API:', todayEvents.length);

          // Convert Google Calendar events to the expected format
          const convertedEvents = todayEvents.map((event: any) => {
            const startTime = new Date(event.start?.dateTime || event.start?.date);
            const endTime = new Date(event.end?.dateTime || event.end?.date);

            return {
              id: event.id,
              title: event.summary || 'Appointment',
              startTime,
              endTime,
              location: 'Simple Practice',
              description: event.description || '',
              calendarId: 'simple-practice',
              calendarName: 'Simple Practice'
            };
          });

          console.log('Successfully converted', convertedEvents.length, 'events');
          return convertedEvents;
        } else {
          console.error('API response not ok:', todayResponse.status);
          return [];
        }
      } catch (err) {
        console.error('Calendar fetch error:', err);
        return [];
      }

      // Fallback: First check if Google Calendar is connected
      const statusResponse = await fetch('/api/auth/google/status');
      const status = await statusResponse.json();

      if (!status.connected) {
        // Try to get events from database first
        const dbResponse = await fetch('/api/calendar/events/local');
        if (dbResponse.ok) {
          return dbResponse.json();
        }
        return []; // Return empty array instead of throwing error
      }

      // Use the main calendar events endpoint to get all historical data 2015-2030
      const timeMin = new Date('2015-01-01T00:00:00.000Z').toISOString();
      const timeMax = new Date('2030-12-31T23:59:59.999Z').toISOString();
      const calendarParam = selectedCalendarId === 'all' ? '' : `&calendarId=${selectedCalendarId}`;

      const response = await fetch(`/api/calendar/events?timeMin=${timeMin}&timeMax=${timeMax}${calendarParam}`);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403 || errorData.requiresAuth) {
          // Fallback to database if API fails
          const dbResponse = await fetch('/api/calendar/events/local');
          if (dbResponse.ok) {
            return dbResponse.json();
          }
          throw new Error('Google Calendar not connected');
        }
        throw new Error(errorData.error || 'Failed to fetch calendar events');
      }

      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true
  });

  // Fetch available calendars
  const { data: calendars = [] } = useQuery({
    queryKey: ['google-calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/calendars');
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          return [];
        }
        throw new Error('Failed to fetch calendars');
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    enabled: !!googleEvents?.length || !error // Only fetch if we have events or no error
  });

  // Convert Google Calendar events to calendar events with proper error handling
  // Apply comprehensive filtering to calendar events
  const filteredGoogleEvents = googleEvents.filter((event: any) => {
    // Text search filter
    const textMatch = searchFilter === "" || 
      (event.title || event.summary || '').toLowerCase().includes(searchFilter.toLowerCase()) ||
      (event.description || '').toLowerCase().includes(searchFilter.toLowerCase());
    
    // Location filter
    const locationMatch = locationFilter === "" || 
      (event.location || '').toLowerCase().includes(locationFilter.toLowerCase()) ||
      (event.calendarName || '').toLowerCase().includes(locationFilter.toLowerCase());
    
    // Calendar type filter
    const calendarMatch = calendarTypeFilter.length === 0 || 
      calendarTypeFilter.includes(event.calendarName || event.calendarId || 'unknown');
    
    return textMatch && locationMatch && calendarMatch;
  });

  const calendarEvents: CalendarEvent[] = filteredGoogleEvents.map((event: any) => {
    // Handle both dateTime and date formats from Google Calendar
    let startTime: Date, endTime: Date;

    try {
      // Use the direct startTime if already converted by backend
      if (event.startTime) {
        startTime = new Date(event.startTime);
      } else if (event.start?.dateTime) {
        startTime = new Date(event.start.dateTime);
      } else if (event.start?.date) {
        startTime = new Date(event.start.date + 'T00:00:00');
      } else {
        console.warn('Event missing start time:', event);
        startTime = new Date();
      }

      if (event.end?.dateTime) {
        endTime = new Date(event.end.dateTime);
      } else if (event.end?.date) {
        endTime = new Date(event.end.date + 'T23:59:59');
      } else {
        endTime = new Date(startTime.getTime() + 60 * 60 * 1000); // 1 hour default
      }
    } catch (dateError) {
      console.error('Error parsing event dates:', dateError, event);
      startTime = new Date();
      endTime = new Date(startTime.getTime() + 60 * 60 * 1000);
    }

    const startDateForLocation = event.start?.dateTime ? 
      new Date(event.start.dateTime) : 
      event.start?.date ? new Date(event.start.date) : new Date();

    return {
      id: event.id || `event-${Math.random()}`,
      title: event.title || event.summary || 'Appointment',
      startTime: startTime,
      endTime: endTime,
      clientId: undefined, // Let DailyView component handle client lookup by name
      clientName: event.title || event.summary || 'Appointment',
      type: 'individual' as CalendarEvent['type'],
      status: (event.status === 'confirmed' ? 'scheduled' : 'pending') as CalendarEvent['status'],
      location: event.location || getDefaultLocationForDate(startDateForLocation),
      notes: event.description || '',
      source: 'google' as CalendarEvent['source'],
      attendees: event.attendees?.map((a: any) => a.email).join(', ') || '',
      calendarName: event.calendarName || 'Simple Practice'
    };
  }).filter(event => {
    // Filter out invalid events - check if we have valid dates (Date objects or valid date strings)
    const hasValidStart = event.startTime && (event.startTime instanceof Date || !isNaN(new Date(event.startTime).getTime()));
    const hasValidEnd = event.endTime && (event.endTime instanceof Date || !isNaN(new Date(event.endTime).getTime()));
    const isValid = hasValidStart && hasValidEnd;

    if (!isValid) {
      console.warn('Filtering out invalid event:', event);
    }
    return isValid;
  });

  // Calendar events processed and organized by week

  // Create calendar days with events (filtered to current week for display)
  const calendarDays: CalendarDay[] = weekDays.map(date => {
    const dayEvents = calendarEvents.filter(event => {
      if (!event.startTime) return false;
      
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      
      // Handle invalid dates
      if (isNaN(eventDate.getTime())) {
        console.warn('Invalid event date:', event);
        return false;
      }
      
      // Use date comparison that accounts for timezone differences
      const eventDateStr = eventDate.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const dayDateStr = date.toLocaleDateString('en-CA'); // YYYY-MM-DD format
      const matches = eventDateStr === dayDateStr;
      
      // Debug logging for troubleshooting
      if (matches) {
        console.log(`Event "${event.title}" matches day ${dayDateStr}`, {
          eventDate: eventDate.toISOString(),
          eventDateStr,
          dayDateStr
        });
      }
      
      return matches;
    });

    // Debug logging for each day
    if (dayEvents.length > 0) {
      console.log(`${date.toDateString()}: ${dayEvents.length} events`, dayEvents.map(e => e.title));
    }

    return {
      date,
      isToday: date.toDateString() === new Date().toDateString(),
      isCurrentMonth: date.getMonth() === new Date().getMonth(),
      events: dayEvents
    };
  });

  // Log statistics for both total events and current week
  const weekEventCount = calendarDays.reduce((total, day) => total + day.events.length, 0);
  console.log(`Events for current week (${currentWeek.toDateString()} - ${weekEnd.toDateString()}): ${weekEventCount}`);
  console.log(`Total events loaded in calendar: ${calendarEvents.length}`);
  
  // Debug: Show sample event dates and week dates for comparison
  if (calendarEvents.length > 0 && weekEventCount === 0) {
    console.log('DEBUG: Week dates vs Event dates comparison');
    console.log('Week days:', weekDays.map(d => d.toLocaleDateString('en-CA')));
    console.log('Sample event dates:', calendarEvents.slice(0, 5).map(e => {
      const eventDate = e.startTime instanceof Date ? e.startTime : new Date(e.startTime);
      return {
        title: e.title,
        rawDate: eventDate.toISOString(),
        localDate: eventDate.toLocaleDateString('en-CA'),
        dateString: eventDate.toDateString()
      };
    }));
  }

  // Navigation handlers
  const handlePreviousWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, -1));
  };

  const handleNextWeek = () => {
    setCurrentWeek(addWeeks(currentWeek, 1));
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentWeek(getWeekStart(today));
    setSelectedDate(today);
  };

  const handleDayClick = (date: Date) => {
    try {
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date passed to handleDayClick:', date);
        return;
      }
      setSelectedDate(date);
      setActiveTab('day');
    } catch (error) {
      console.error('Error in handleDayClick:', error);
    }
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    try {
      if (!date || isNaN(date.getTime())) {
        console.error('Invalid date passed to handleTimeSlotClick:', date);
        return;
      }
      setSelectedDate(date);
      // Could open new appointment dialog here
      console.log(`Time slot clicked: ${date.toDateString()} at ${time}`);
    } catch (error) {
      console.error('Error in handleTimeSlotClick:', error);
    }
  };

  const handleEventClick = (event: CalendarEvent) => {
    try {
      if (!event || !event.id) {
        console.error('Invalid event passed to handleEventClick:', event);
        return;
      }
      setSelectedEvent(event);
    } catch (error) {
      console.error('Error in handleEventClick:', error);
    }
  };

  const handleEventMove = async (eventId: string, newStartTime: Date, newEndTime: Date) => {
    try {
      if (!eventId || !newStartTime || !newEndTime) {
        console.error('Invalid parameters for event move:', { eventId, newStartTime, newEndTime });
        return;
      }
      
      if (isNaN(newStartTime.getTime()) || isNaN(newEndTime.getTime())) {
        console.error('Invalid dates for event move:', { newStartTime, newEndTime });
        return;
      }
      
      console.log(`Moving event ${eventId} to ${newStartTime.toISOString()}`);
      
      // Find the event to get its calendar information
      const event = calendarEvents.find(e => e.id === eventId);
      if (!event) {
        console.error('Event not found for move operation');
        return;
      }

      // Determine the correct calendar ID from the event
      let calendarId = 'primary';
      if (event.calendarId) {
        calendarId = event.calendarId;
      } else if (event.calendarName?.includes('Simple Practice')) {
        calendarId = '79dfcb90ce59b1b0345b24f5c8d342bd308eac9521d063a684a8bbd377f2b822@group.calendar.google.com';
      } else if (event.calendarName?.includes('TrevorAI')) {
        calendarId = 'c2ffec13aa77af8e71cac14a327928e34da57bddaadf18c4e0f669827e1454ff@group.calendar.google.com';
      }
      
      console.log(`Moving event in calendar: ${calendarId}`);
      
      // Call the API to update the calendar event
      const response = await fetch(`/api/calendar/events/${eventId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          calendarId,
          startTime: newStartTime.toISOString(),
          endTime: newEndTime.toISOString(),
        }),
      });

      if (response.ok) {
        // Refresh calendar data to show the updated event
        refetch();
        console.log(`Successfully moved event ${eventId}`);
      } else {
        const error = await response.text();
        console.error('Failed to move event:', error);
      }
    } catch (error) {
      console.error('Error moving event:', error);
    }
  };

  const handleNewAppointment = () => {
    // Implement new appointment creation
    console.log('Creating new appointment');
  };

  const handleExportCalendar = async (type: 'weekly' | 'daily' | 'appointments') => {
    const { exportToPDF, exportDailyToPDF } = await import('@/utils/pdfExport');

    // Convert calendar events to appointment format for PDF export
    const appointmentData = calendarEvents.map(event => ({
      id: event.id,
      clientName: event.clientName,
      type: event.type,
      startTime: event.startTime.toISOString(),
      endTime: event.endTime.toISOString(),
      status: event.status,
      notes: event.notes || '',
      attendees: event.attendees || ''
    }));

    try {
      switch (type) {
        case 'weekly':
        case 'appointments':
          await exportToPDF({
            appointments: appointmentData,
            weekStart: currentWeek,
            therapistName: 'Dr. Jonathan Procter'
          });
          break;
        case 'daily':
          await exportDailyToPDF({
            appointments: appointmentData,
            date: selectedDate,
            therapistName: 'Dr. Jonathan Procter'
          });
          break;
      }
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleSessionNotes = (event: CalendarEvent) => {
    // Navigate to session notes
    console.log(`Opening session notes for event ${event.id}`);
  };

  // Helper functions for calendar filtering
  const clearCalendarFilters = () => {
    setSearchFilter("");
    setLocationFilter("");
    setCalendarTypeFilter([]);
  };

  const toggleCalendarTypeFilter = (calendarName: string) => {
    setCalendarTypeFilter(prev => 
      prev.includes(calendarName) 
        ? prev.filter(name => name !== calendarName)
        : [...prev, calendarName]
    );
  };

  // Get unique calendar types and locations for filtering
  const uniqueCalendarTypes = [...new Set(googleEvents.map(event => event.calendarName).filter(Boolean))];
  const uniqueLocations = [...new Set(googleEvents.map(event => event.location).filter(Boolean))];
  
  const getDefaultLocationForDate = (date: Date) => {
    return getOfficeLocationByDay(date.getDay());
  };

  // Show connection error with connect button
  if (error && error.message?.includes('Google Calendar not connected')) {
    return (
      <div className="p-6">
        <Card className="max-w-md mx-auto">
          <CardContent className="pt-6">
            <div className="text-center space-y-4">
              <CalendarIcon className="w-16 h-16 mx-auto text-gray-400" />
              <div>
                <h3 className="text-lg font-semibold">Connect Google Calendar</h3>
                <p className="text-gray-600 mt-2">
                  Connect your Google Calendar to view and manage your appointments
                </p>
              </div>
              <Button onClick={connectGoogleCalendar} className="w-full">
                Connect Google Calendar
              </Button>
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  onClick={() => refetch()} 
                  className="flex-1"
                >
                  Retry Connection
                </Button>
                <Link href="/calendar/integration">
                  <Button variant="outline" size="sm">
                    <Settings className="w-4 h-4" />
                  </Button>
                </Link>
              </div>
              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/oauth-simple'} 
                    className="text-xs"
                  >
                    Simple Connect
                  </Button>
                  <Button 
                    variant="outline" 
                    onClick={() => window.location.href = '/oauth-test'} 
                    className="text-xs"
                  >
                    Debug OAuth
                  </Button>
                </div>
                <Button 
                  variant="destructive" 
                  onClick={() => window.location.href = '/oauth-troubleshoot'} 
                  className="w-full text-xs"
                >
                  Fix 403 Error
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-therapy-border rounded w-1/3"></div>
          <div className="h-96 bg-therapy-border rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="therapy-card border-therapy-primary">
          <CardContent className="p-6 text-center">
            <h2 className="text-xl font-bold text-therapy-text mb-4">Google Calendar Authentication Required</h2>
            <p className="text-therapy-text/70 mb-6">
              Your Google Calendar session has expired or needs to be reconnected.
              Please authenticate again to view your calendar events from 2023-2025.
            </p>
            <Button 
              onClick={connectGoogleCalendar}
              className="bg-blue-600 hover:bg-blue-700 text-white mb-4"
            >
              Reconnect Google Calendar
            </Button>
            <p className="text-sm text-therapy-text/50">
              This will restore access to all your calendars: Simple Practice, TrevorAI, Holidays, and personal events.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-therapy-bg">
      {/* Calendar Header */}
      <div className="space-y-6 p-6 bg-therapy-bg border-b-2 border-therapy-border">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-therapy-text">{weekRangeString}</h1>
            <div className="flex items-center space-x-3 mt-2">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm text-gray-600">Google Calendar Connected</span>
              </div>
              <span className="text-sm text-gray-600">
                {calendarEvents.length} events loaded (2020-2030) • 
                {calendars?.length > 0 ? ` ${calendars.length} calendars` : ' Loading calendars...'}
              </span>
              {calendarEvents.length > 0 && (
                <div className="text-xs text-gray-500 mt-1">
                  Earliest: {new Date(Math.min(...calendarEvents.map(e => new Date(e.startTime).getTime()))).toLocaleDateString()} • 
                  Latest: {new Date(Math.max(...calendarEvents.map(e => new Date(e.startTime).getTime()))).toLocaleDateString()}
                </div>
              )}
            </div>

            {/* Calendar Selector */}
            <div className="mt-3">
              <Select value={selectedCalendarId} onValueChange={setSelectedCalendarId}>
                <SelectTrigger className="w-64">
                  <SelectValue placeholder="Select calendar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Calendars ({calendarEvents.length} events)</SelectItem>
                  {calendars?.map((cal: any) => {
                    const calendarEventCount = calendarEvents.filter(event => 
                      event.calendarName === cal.summary || 
                      (event as any).calendarId === cal.id
                    ).length;
                    return (
                      <SelectItem key={cal.id} value={cal.id}>
                        {cal.summary} ({calendarEventCount} events)
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <Link href="/calendar/integration">
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4 mr-2" />
                Integration
              </Button>
            </Link>
            <Button 
              onClick={handleNewAppointment}
              className="bg-therapy-primary hover:bg-therapy-primary/80 text-white flex items-center gap-2"
            >
              <CalendarIcon className="w-4 h-4" />
              New Appointment
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button 
                  variant="outline"
                  className="border-therapy-border hover:bg-therapy-primary/5 flex items-center gap-2"
                >
                  <FileDown className="w-4 h-4" />
                  Export Calendar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExportCalendar('weekly')}>
                  Export Weekly View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCalendar('daily')}>
                  Export Daily View
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExportCalendar('appointments')}>
                  Export Appointment List
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        <div className="flex justify-center">
          <div className="flex space-x-3">
            <Button 
              variant="outline" 
              onClick={handlePreviousWeek}
              className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary transition-all duration-200"
            >
              <ChevronLeft className="w-4 h-4 mr-2" />
              Previous Week
            </Button>

            <Button 
              variant={isCurrentWeek(currentWeek) ? "default" : "outline"}
              onClick={handleToday}
              className={
                isCurrentWeek(currentWeek) 
                  ? "bg-therapy-primary hover:bg-therapy-primary/80 text-white px-6 py-2 font-medium" 
                  : "px-6 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary text-therapy-text transition-all duration-200"
              }
            >
              Today
            </Button>

            <Button 
              variant="outline" 
              onClick={handleNextWeek}
              className="flex items-center px-4 py-2 bg-therapy-bg border-therapy-border hover:bg-therapy-primary/5 hover:border-therapy-primary transition-all duration-200"
            >
              Next Week
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Advanced Filtering Bar for Calendar */}
        <Card className="mt-4 border-0 shadow-sm bg-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-4 mb-3">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search events, descriptions, or calendar names..."
                  value={searchFilter}
                  onChange={(e) => setSearchFilter(e.target.value)}
                  className="pl-10"
                />
              </div>
              <div className="relative">
                <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Filter by location..."
                  value={locationFilter}
                  onChange={(e) => setLocationFilter(e.target.value)}
                  className="pl-10 w-48"
                />
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedCalendarFilters(!showAdvancedCalendarFilters)}
                className={showAdvancedCalendarFilters ? "bg-therapy-primary text-white" : ""}
              >
                <Filter className="h-4 w-4 mr-1" />
                Filters
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearCalendarFilters}
                disabled={!searchFilter && !locationFilter && calendarTypeFilter.length === 0}
              >
                Clear
              </Button>
            </div>

            {/* Advanced Filters Panel */}
            {showAdvancedCalendarFilters && (
              <div className="pt-4 border-t border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* Calendar Type Filter */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-therapy-text">Calendar Source</label>
                    <div className="space-y-2">
                      {uniqueCalendarTypes.map(calendarName => (
                        <label key={calendarName} className="flex items-center space-x-2 text-sm">
                          <Checkbox
                            checked={calendarTypeFilter.includes(calendarName)}
                            onCheckedChange={() => toggleCalendarTypeFilter(calendarName)}
                          />
                          <span>{calendarName}</span>
                          <Badge 
                            variant="secondary"
                            className="text-xs"
                          >
                            {googleEvents.filter(event => event.calendarName === calendarName).length}
                          </Badge>
                        </label>
                      ))}
                    </div>
                  </div>

                  {/* Quick Location Filters */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-therapy-text">Quick Locations</label>
                    <div className="space-y-1">
                      {uniqueLocations.slice(0, 5).map(location => (
                        <button
                          key={location}
                          onClick={() => setLocationFilter(location)}
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-therapy-primary/10 rounded"
                        >
                          {location}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Event Statistics */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-therapy-text">Calendar Stats</label>
                    <div className="space-y-1 text-xs text-gray-600">
                      <div>Total Events: {filteredGoogleEvents.length}</div>
                      <div>This Week: {calendarDays.reduce((sum, day) => sum + day.events.length, 0)}</div>
                      <div>Today: {calendarDays.find(day => day.isToday)?.events.length || 0}</div>
                      {(searchFilter || locationFilter || calendarTypeFilter.length > 0) && (
                        <Badge variant="outline" className="text-xs">
                          Filtered View
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Calendar Content */}
      <div className="flex-1 p-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full">
          <TabsList className="grid w-full grid-cols-3 mb-6">
            <TabsTrigger value="week" className="flex items-center gap-2">
              <CalendarDays className="w-4 h-4" />
              Week View
            </TabsTrigger>
            <TabsTrigger value="day" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Daily View
            </TabsTrigger>
            <TabsTrigger value="appointments" className="flex items-center gap-2">
              <List className="w-4 h-4" />
              Appointments
            </TabsTrigger>
          </TabsList>

          <TabsContent value="week" className="h-full">
            <WeeklyCalendarGrid
              week={calendarDays}
              events={calendarEvents}
              onDayClick={handleDayClick}
              onTimeSlotClick={handleTimeSlotClick}
              onEventClick={handleEventClick}
              onEventMove={handleEventMove}
            />
          </TabsContent>

          <TabsContent value="day" className="h-full">
            <DailyView
              date={selectedDate}
              events={calendarEvents}
              onEventClick={handleEventClick}
              onTimeSlotClick={handleTimeSlotClick}
              onPreviousDay={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() - 1);
                setSelectedDate(newDate);
              }}
              onNextDay={() => {
                const newDate = new Date(selectedDate);
                newDate.setDate(newDate.getDate() + 1);
                setSelectedDate(newDate);
              }}
              onNewAppointment={handleNewAppointment}
              onSessionNotes={handleSessionNotes}
            />
          </TabsContent>

          <TabsContent value="appointments" className="h-full">
            <AppointmentStatusView
              appointments={calendarEvents}
              selectedDate={activeTab === 'appointments' ? undefined : selectedDate}
              onAppointmentClick={handleEventClick}
            />
          </TabsContent>
        </Tabs>
      </div>

      {/* Event Details Dialog */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-therapy-text">
              {selectedEvent?.title}
            </DialogTitle>
            <DialogDescription>
              Appointment Details
            </DialogDescription>
          </DialogHeader>

          {selectedEvent && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium text-therapy-text">Date & Time</label>
                <p className="text-therapy-text/70">
                  {(selectedEvent.startTime instanceof Date ? selectedEvent.startTime : new Date(selectedEvent.startTime))
                    .toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
                  <br />
                  {(selectedEvent.startTime instanceof Date ? selectedEvent.startTime : new Date(selectedEvent.startTime))
                    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })} - 
                  {(selectedEvent.endTime instanceof Date ? selectedEvent.endTime : new Date(selectedEvent.endTime))
                    .toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}
                </p>
              </div>

              {selectedEvent.clientName && (
                <div>
                  <label className="text-sm font-medium text-therapy-text">Client</label>
                  <p className="text-therapy-text/70">{selectedEvent.clientName}</p>
                </div>
              )}

              <div>
                <label className="text-sm font-medium text-therapy-text">Type</label>
                <p className="text-therapy-text/70 capitalize">{selectedEvent.type}</p>
              </div>

              <div>
                <label className="text-sm font-medium text-therapy-text">Status</label>
                <p className="text-therapy-text/70 capitalize">{selectedEvent.status}</p>
              </div>

              {selectedEvent.location && (
                <div>
                  <label className="text-sm font-medium text-therapy-text">Location</label>
                  <p className="text-therapy-text/70">{selectedEvent.location}</p>
                </div>
              )}

              {selectedEvent.notes && (
                <div>
                  <label className="text-sm font-medium text-therapy-text">Notes</label>
                  <p className="text-therapy-text/70">{selectedEvent.notes}</p>
                </div>
              )}

              <div className="flex gap-2 pt-4">
                <Button 
                  variant="outline" 
                  onClick={() => setSelectedEvent(null)}
                  className="flex-1"
                >
                  Close
                </Button>
                {selectedEvent.status === 'completed' && (
                  <Button 
                    onClick={() => handleSessionNotes(selectedEvent)}
                    className="flex-1 bg-therapy-primary hover:bg-therapy-primary/80"
                  >
                    View Notes
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}