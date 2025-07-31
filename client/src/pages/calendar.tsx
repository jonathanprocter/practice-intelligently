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
import { CalendarDays, List, Clock, FileDown, ChevronLeft, ChevronRight, Calendar as CalendarIcon } from 'lucide-react';

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [selectedCalendarId, setSelectedCalendarId] = useState<string>('primary');

  // Get week range
  const weekEnd = getWeekEnd(currentWeek);
  const weekDays = getWeekDays(currentWeek);
  const weekRangeString = getWeekRangeString(currentWeek, weekEnd);

  // Fetch Google Calendar events instead of mock appointments
  // Add Connect Google Calendar functionality
  const connectGoogleCalendar = () => {
    window.location.href = '/api/auth/google';
  };

  const { data: googleEvents, isLoading, error } = useQuery({
    queryKey: ['google-calendar-events', 'dr-procter-id', currentWeek.toISOString(), selectedCalendarId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/events/dr-procter-id?timeMin=${currentWeek.toISOString()}&timeMax=${weekEnd.toISOString()}&calendarId=${selectedCalendarId}`);
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Google Calendar not connected');
        }
        throw new Error('Failed to fetch calendar events');
      }
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false
  });

  // Fetch available calendars
  const { data: calendars } = useQuery({
    queryKey: ['google-calendars'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/calendars');
      if (!response.ok) return [];
      return response.json();
    },
    retry: false,
    refetchOnWindowFocus: false
  });

  // Convert Google Calendar events to calendar events  
  const calendarEvents: CalendarEvent[] = (googleEvents || []).map((event: any) => ({
    id: event.id,
    title: event.summary || 'Untitled Event',
    startTime: new Date(event.start.dateTime),
    endTime: new Date(event.end.dateTime),
    clientId: `google-${event.id}`,
    clientName: event.summary || 'Google Calendar Event',
    type: 'individual' as CalendarEvent['type'],
    status: (event.status === 'confirmed' ? 'scheduled' : 'pending') as CalendarEvent['status'],
    location: event.location || 'Dr. Jonathan Procter\'s Office',
    notes: event.description || '',
    therapistId: 'dr-procter-id',
    source: 'google' as CalendarEvent['source'],
    attendees: event.attendees?.map((a: any) => a.email).join(', ') || ''
  }));

  // Create calendar days with events
  const calendarDays: CalendarDay[] = weekDays.map(date => ({
    date,
    isToday: date.toDateString() === new Date().toDateString(),
    isCurrentMonth: date.getMonth() === new Date().getMonth(),
    events: calendarEvents.filter(event => {
      const eventDate = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      return eventDate.toDateString() === date.toDateString();
    })
  }));

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
            <h2 className="text-xl font-bold text-therapy-text mb-4">Google Calendar Connection Required</h2>
            <p className="text-therapy-text/70 mb-6">
              To view and manage your appointments, please connect your Google Calendar account.
              This will sync your existing events and allow you to manage your schedule directly from Practice Intelligence.
            </p>
            <Button 
              onClick={connectGoogleCalendar}
              className="bg-blue-600 hover:bg-blue-700 text-white mb-4"
            >
              Connect Google Calendar
            </Button>
            <p className="text-sm text-therapy-text/50">
              Your calendar data will remain private and secure.
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
                <div className="w-2 h-2 bg-therapy-success rounded-full"></div>
                <span className="text-sm text-therapy-text/70">Online</span>
              </div>
              <span className="text-sm text-therapy-text/70">
                Weekly Calendar • Click any day to view details
              </span>
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