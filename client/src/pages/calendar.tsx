import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';
import { CalendarEvent, CalendarDay } from '../types/calendar';
import { getWeekStart, getWeekEnd, getWeekDays, addWeeks, isCurrentWeek, getWeekRangeString } from '../utils/dateUtils';
import { exportWeeklyCalendar, exportDailyCalendar, exportAppointmentList } from '../utils/calendarExport';
import { WeeklyCalendarGrid } from '../components/calendar/WeeklyCalendarGrid';
import { CalendarHeader } from '../components/calendar/CalendarHeader';
import { DailyView } from '../components/calendar/DailyView';
import { AppointmentStatusView } from '../components/calendar/AppointmentStatusView';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { CalendarDays, List, Clock, FileDown, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Calendar() {
  const [currentWeek, setCurrentWeek] = useState(() => getWeekStart(new Date()));
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [activeTab, setActiveTab] = useState('week');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Get week range
  const weekEnd = getWeekEnd(currentWeek);
  const weekDays = getWeekDays(currentWeek);
  const weekRangeString = getWeekRangeString(currentWeek, weekEnd);

  // Fetch appointments for current week
  const { data: appointments = [], isLoading, error } = useQuery({
    queryKey: ['appointments', currentWeek.toISOString()],
    queryFn: () => ApiClient.getAppointments(currentWeek.toISOString().split('T')[0]),
  });

  // Convert appointments to calendar events
  const calendarEvents: CalendarEvent[] = appointments.map(apt => ({
    id: apt.id,
    title: apt.notes || `${apt.type} Session`,
    startTime: new Date(apt.startTime),
    endTime: new Date(apt.endTime),
    clientId: apt.clientId,
    clientName: `Client ${apt.clientId.slice(-4)}`, // Would normally come from a join with client data
    type: (apt.type as CalendarEvent['type']) || 'individual',
    status: (apt.status as CalendarEvent['status']) || 'scheduled',
    location: 'Therapy Office - Room 1', // Would come from appointment data
    notes: apt.notes,
    therapistId: 'demo-therapist-id',
    source: 'system'
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

  const handleExportCalendar = (type: 'weekly' | 'daily' | 'appointments') => {
    switch (type) {
      case 'weekly':
        exportWeeklyCalendar(calendarEvents, currentWeek, weekEnd);
        break;
      case 'daily':
        exportDailyCalendar(calendarEvents, selectedDate);
        break;
      case 'appointments':
        exportAppointmentList(calendarEvents, currentWeek, weekEnd);
        break;
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
        <Card className="therapy-card border-therapy-error">
          <CardContent className="p-6 text-center">
            <p className="text-therapy-error">Failed to load calendar data</p>
            <Button 
              variant="outline" 
              onClick={() => window.location.reload()}
              className="mt-4"
            >
              Retry
            </Button>
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
              <Calendar className="w-4 h-4" />
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