import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';
import { CalendarEvent, CalendarDay } from '../types/calendar';
import { getWeekStart, getWeekEnd, getWeekDays, addWeeks, isCurrentWeek, getWeekRangeString } from '../utils/dateUtils';
// Removed export imports - using direct PDF export now
import { WeeklyCalendarGrid } from '../components/calendar/WeeklyCalendarGrid';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { DailyView } from '../components/calendar/DailyView';
import { AppointmentStatusView } from '../components/calendar/AppointmentStatusView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CalendarDays, List, Clock, FileDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(() => {
    // Start with a week that might have events - let's try January 2025
    const startDate = new Date('2025-01-27'); // Monday of this week
    return getWeekStart(startDate);
  });
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('all');

  // Get week range
  const weekEnd = getWeekEnd(currentWeek);
  const weekDays = getWeekDays(currentWeek);
  const weekRangeString = getWeekRangeString(currentWeek, weekEnd);

  // Fetch Google Calendar events instead of mock appointments
  // Add Connect Google Calendar functionality
  const connectGoogleCalendar = () => {
    console.log('Initiating Google Calendar connection...');
    window.location.href = '/api/auth/google';
  };

  const { data: googleEvents = [], isLoading, error, refetch } = useQuery({
    queryKey: ['google-calendar-events', 'dr-procter-id', selectedCalendarId],
    queryFn: async () => {
      // First check if Google Calendar is connected
      const statusResponse = await fetch('/api/auth/google/status');
      const status = await statusResponse.json();
      
      if (!status.connected) {
        throw new Error('Google Calendar not connected');
      }
      
      // Fetch all events with a much broader range to ensure we get everything
      const timeMin = new Date('2020-01-01T00:00:00.000Z').toISOString();
      const timeMax = new Date('2030-12-31T23:59:59.999Z').toISOString();
      const calendarParam = selectedCalendarId === 'all' ? 'all' : selectedCalendarId;
      
      const response = await fetch(`/api/calendar/events/dr-procter-id?timeMin=${timeMin}&timeMax=${timeMax}&calendarId=${calendarParam}`);
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        if (response.status === 401 || response.status === 403 || errorData.requiresAuth) {
          throw new Error('Google Calendar not connected');
        }
        throw new Error(errorData.error || 'Failed to fetch calendar events');
      }
      
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    staleTime: 5 * 60 * 1000, // Consider data stale after 5 minutes
    cacheTime: 15 * 60 * 1000 // Keep in cache for 15 minutes
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
  const calendarEvents: CalendarEvent[] = googleEvents.map((event: any) => {
    // Handle both dateTime and date formats from Google Calendar
    let startTime: Date, endTime: Date;
    
    try {
      if (event.start?.dateTime) {
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
    
    return {
      id: event.id || `event-${Math.random()}`,
      title: event.summary || 'Untitled Event',
      startTime,
      endTime,
      clientId: `google-${event.id}`,
      clientName: event.summary || 'Google Calendar Event',
      type: 'individual' as CalendarEvent['type'],
      status: (event.status === 'confirmed' ? 'scheduled' : 'pending') as CalendarEvent['status'],
      location: event.location || 'Remote/Office',
      notes: event.description || '',
      therapistId: 'dr-procter-id',
      source: 'google' as CalendarEvent['source'],
      attendees: event.attendees?.map((a: any) => a.email).join(', ') || '',
      calendarName: event.calendarName || 'Google Calendar'
    };
  }).filter(event => {
    // Filter out invalid events
    const isValid = event.startTime instanceof Date && !isNaN(event.startTime.getTime());
    if (!isValid) {
      console.warn('Filtering out invalid event:', event);
    }
    return isValid;
  });

  // Add debug logging for event filtering
  console.log(`Total events after conversion: ${calendarEvents.length}`);
  console.log(`Current week: ${currentWeek.toDateString()} to ${weekEnd.toDateString()}`);
  
  // Show sample of events for debugging
  if (calendarEvents.length > 0) {
    console.log('Sample events:', calendarEvents.slice(0, 3).map(e => ({
      title: e.title,
      startTime: e.startTime,
      dateString: e.startTime instanceof Date ? e.startTime.toDateString() : 'Invalid Date'
    })));
    
    // Show events for different weeks to help debug
    const eventsByWeek = calendarEvents.reduce((acc, event) => {
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const weekStart = getWeekStart(eventDate).toDateString();
      if (!acc[weekStart]) acc[weekStart] = [];
      acc[weekStart].push(event.title);
      return acc;
    }, {} as Record<string, string[]>);
    
    console.log('Events by week (showing first 5 weeks):', Object.entries(eventsByWeek).slice(0, 5));
  }

  // Create calendar days with events
  const calendarDays: CalendarDay[] = weekDays.map(date => {
    const dayEvents = calendarEvents.filter(event => {
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      const matches = eventDate.toDateString() === date.toDateString();
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
  
  // Log total events for the current week
  const weekEventCount = calendarDays.reduce((total, day) => total + day.events.length, 0);
  console.log(`Events for current week (${currentWeek.toDateString()} - ${weekEnd.toDateString()}): ${weekEventCount}`);

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
    setSelectedDate(date);
    setActiveTab('day');
  };

  const handleTimeSlotClick = (date: Date, time: string) => {
    setSelectedDate(date);
    // Could open new appointment dialog here
    console.log(`Time slot clicked: ${date.toDateString()} at ${time}`);
  };

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
  };

  const handleEventMove = (eventId: string, newStartTime: Date, newEndTime: Date) => {
    // Implement event rescheduling
    console.log(`Moving event ${eventId} to ${newStartTime.toISOString()}`);
    // This would call an API to update the appointment
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
              <Button 
                variant="outline" 
                onClick={() => refetch()} 
                className="w-full"
              >
                Retry Connection
              </Button>
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