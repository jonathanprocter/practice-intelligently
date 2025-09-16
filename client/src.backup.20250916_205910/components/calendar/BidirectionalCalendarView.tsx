import { useState, useMemo, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ApiClient } from '@/lib/api';
import { CalendarEvent } from '@/types/calendar';
import { SessionNote } from '@/lib/api';
import { useCalendarEvents } from '@/hooks/useCalendarEvents';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { Textarea } from '@/components/ui/textarea';
import { CalendarDays, ChevronLeft, ChevronRight, RefreshCw, Settings, Plus, AlertCircle, Clock, CheckCircle2, XCircle, Calendar as CalendarIcon, User, MapPin, FileText, Loader2, Copy, Trash2, Edit } from 'lucide-react';
import { format, addDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth, isToday, isSameDay, addWeeks, addMonths } from 'date-fns';

interface AppointmentFormData {
  clientId: string;
  startTime: Date;
  endTime: Date;
  type: string;
  location: string;
  notes: string;
  syncToGoogle: boolean;
}

interface CalendarViewProps {
  therapistId: string;
}

export default function BidirectionalCalendarView({ therapistId }: CalendarViewProps) {
  const [viewMode, setViewMode] = useState<'day' | 'week' | 'month'>('week');
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showAppointmentDialog, setShowAppointmentDialog] = useState(false);
  const [showSyncSettings, setShowSyncSettings] = useState(false);
  const [appointmentForm, setAppointmentForm] = useState<AppointmentFormData>({
    clientId: '',
    startTime: new Date(),
    endTime: new Date(),
    type: 'therapy',
    location: 'Office',
    notes: '',
    syncToGoogle: true,
  });

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get date range based on view mode
  const getDateRange = () => {
    switch (viewMode) {
      case 'day':
        return {
          start: currentDate,
          end: currentDate,
        };
      case 'week':
        return {
          start: startOfWeek(currentDate, { weekStartsOn: 1 }),
          end: endOfWeek(currentDate, { weekStartsOn: 1 }),
        };
      case 'month':
        return {
          start: startOfMonth(currentDate),
          end: endOfMonth(currentDate),
        };
    }
  };

  const dateRange = getDateRange();

  // Fetch appointments and Google Calendar events
  const { data: appointments = [], isLoading: appointmentsLoading, refetch: refetchAppointments } = useQuery({
    queryKey: ['/api/appointments', therapistId, dateRange],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/range?therapistId=${therapistId}&startDate=${dateRange.start.toISOString()}&endDate=${dateRange.end.toISOString()}`);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    },
  });

  // Use the shared hook for calendar events
  const { events: googleEvents = [], isLoading: eventsLoading, refetch: refetchEvents } = useCalendarEvents({
    timeMin: dateRange.start,
    timeMax: dateRange.end,
  });

  // Fetch sync status
  const { data: syncStatus } = useQuery({
    queryKey: ['/api/calendar/sync/status', therapistId],
    queryFn: async () => {
      const response = await fetch(`/api/calendar/sync/status/${therapistId}`);
      if (!response.ok) throw new Error('Failed to fetch sync status');
      return response.json();
    },
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  // Fetch clients for appointment creation
  const { data: clients = [] } = useQuery({
    queryKey: ['/api/clients', therapistId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${therapistId}`);
      if (!response.ok) throw new Error('Failed to fetch clients');
      return response.json();
    },
  });

  // Create appointment mutation
  const createAppointmentMutation = useMutation({
    mutationFn: async (data: AppointmentFormData) => {
      const response = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          therapistId,
        }),
      });
      if (!response.ok) throw new Error('Failed to create appointment');
      const appointment = await response.json();

      // Sync to Google Calendar if requested
      if (data.syncToGoogle) {
        const syncResponse = await fetch(`/api/calendar/appointments/${appointment.id}/sync-to-google`, {
          method: 'POST',
        });
        if (!syncResponse.ok) {
          console.error('Failed to sync to Google Calendar');
        }
      }

      return appointment;
    },
    onSuccess: () => {
      toast({
        title: 'Appointment created',
        description: 'The appointment has been created and synced to Google Calendar',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setShowAppointmentDialog(false);
      resetAppointmentForm();
    },
    onError: (error) => {
      toast({
        title: 'Error',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<AppointmentFormData> }) => {
      const response = await fetch(`/api/appointments/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!response.ok) throw new Error('Failed to update appointment');
      
      // Sync to Google Calendar
      await fetch(`/api/calendar/appointments/${id}/sync-to-google`, {
        method: 'PUT',
      });

      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Appointment updated',
        description: 'The appointment has been updated and synced to Google Calendar',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
    },
  });

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: async (id: string) => {
      // Delete from Google Calendar first
      await fetch(`/api/calendar/appointments/${id}/sync-to-google`, {
        method: 'DELETE',
      });

      const response = await fetch(`/api/appointments/${id}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete appointment');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Appointment deleted',
        description: 'The appointment has been deleted from both the app and Google Calendar',
      });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setSelectedEvent(null);
    },
  });

  // Check for conflicts
  const checkConflictsMutation = useMutation({
    mutationFn: async (data: { startTime: Date; endTime: Date; excludeId?: string }) => {
      const response = await fetch('/api/calendar/check-conflicts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          therapistId,
          startTime: data.startTime.toISOString(),
          endTime: data.endTime.toISOString(),
          excludeAppointmentId: data.excludeId,
        }),
      });
      if (!response.ok) throw new Error('Failed to check conflicts');
      return response.json();
    },
  });

  // Bidirectional sync mutation
  const syncCalendarMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/sync/bidirectional', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapistId }),
      });
      if (!response.ok) throw new Error('Failed to sync calendar');
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: 'Calendar synced',
        description: `Synced ${data.result.synced} events (${data.result.created} created, ${data.result.updated} updated, ${data.result.deleted} deleted)`,
      });
      refetchAppointments();
      refetchEvents();
    },
    onError: (error) => {
      toast({
        title: 'Sync failed',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Setup webhook mutation
  const setupWebhookMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/calendar/webhook/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ therapistId }),
      });
      if (!response.ok) throw new Error('Failed to setup webhook');
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: 'Webhook setup',
        description: 'Real-time sync with Google Calendar is now enabled',
      });
    },
  });

  const resetAppointmentForm = () => {
    setAppointmentForm({
      clientId: '',
      startTime: new Date(),
      endTime: new Date(),
      type: 'therapy',
      location: 'Office',
      notes: '',
      syncToGoogle: true,
    });
  };

  const handleDateNavigation = (direction: 'prev' | 'next') => {
    switch (viewMode) {
      case 'day':
        setCurrentDate(prev => addDays(prev, direction === 'next' ? 1 : -1));
        break;
      case 'week':
        setCurrentDate(prev => addWeeks(prev, direction === 'next' ? 1 : -1));
        break;
      case 'month':
        setCurrentDate(prev => addMonths(prev, direction === 'next' ? 1 : -1));
        break;
    }
  };

  const handleAppointmentSubmit = async () => {
    // Check for conflicts first
    const conflictCheck = await checkConflictsMutation.mutateAsync({
      startTime: appointmentForm.startTime,
      endTime: appointmentForm.endTime,
    });

    if (conflictCheck.hasConflicts) {
      const proceed = window.confirm(
        `This appointment conflicts with ${conflictCheck.conflicts.length} existing appointment(s). Do you want to proceed anyway?`
      );
      if (!proceed) return;
    }

    createAppointmentMutation.mutate(appointmentForm);
  };

  const getEventColor = (type: string) => {
    const colors: Record<string, string> = {
      'intake': 'bg-green-500',
      'therapy': 'bg-blue-500',
      'assessment': 'bg-yellow-500',
      'group': 'bg-orange-500',
      'family': 'bg-purple-500',
      'consultation': 'bg-cyan-500',
      'emergency': 'bg-red-500',
    };
    return colors[type] || 'bg-gray-500';
  };

  return (
    <div className="space-y-4">
      {/* Header with sync status and controls */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <CardTitle>Calendar</CardTitle>
            <div className="flex items-center gap-2">
              {/* Sync Status */}
              <div className="flex items-center gap-2">
                {syncStatus?.isConnected ? (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3 w-3 text-green-500" />
                    Connected
                  </Badge>
                ) : (
                  <Badge variant="outline" className="gap-1">
                    <XCircle className="h-3 w-3 text-red-500" />
                    Disconnected
                  </Badge>
                )}
                {syncStatus?.lastSync && (
                  <span className="text-xs text-muted-foreground">
                    Last sync: {format(new Date(syncStatus.lastSync), 'HH:mm')}
                  </span>
                )}
              </div>

              {/* Sync Button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => syncCalendarMutation.mutate()}
                disabled={syncCalendarMutation.isPending || !syncStatus?.isConnected}
                data-testid="button-sync-calendar"
              >
                {syncCalendarMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <RefreshCw className="h-4 w-4" />
                )}
                Sync
              </Button>

              {/* Settings */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSyncSettings(true)}
                data-testid="button-calendar-settings"
              >
                <Settings className="h-4 w-4" />
              </Button>

              {/* Add Appointment */}
              <Button
                size="sm"
                onClick={() => setShowAppointmentDialog(true)}
                data-testid="button-add-appointment"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Appointment
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {/* View Mode Selector and Navigation */}
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateNavigation('prev')}
                data-testid="button-prev-date"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => handleDateNavigation('next')}
                data-testid="button-next-date"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setCurrentDate(new Date())}
                data-testid="button-today"
              >
                Today
              </Button>
              <span className="font-medium">
                {format(currentDate, viewMode === 'day' ? 'EEEE, MMMM d, yyyy' : 'MMMM yyyy')}
              </span>
            </div>
            <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as typeof viewMode)}>
              <TabsList>
                <TabsTrigger value="day" data-testid="tab-day-view">Day</TabsTrigger>
                <TabsTrigger value="week" data-testid="tab-week-view">Week</TabsTrigger>
                <TabsTrigger value="month" data-testid="tab-month-view">Month</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Calendar Grid */}
          {appointmentsLoading || eventsLoading ? (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin" />
            </div>
          ) : (
            <div className="border rounded-lg overflow-hidden">
              {viewMode === 'day' && (
                <DayView
                  date={currentDate}
                  appointments={appointments}
                  googleEvents={googleEvents}
                  onEventClick={setSelectedEvent}
                />
              )}
              {viewMode === 'week' && (
                <WeekView
                  startDate={dateRange.start}
                  appointments={appointments}
                  googleEvents={googleEvents}
                  onEventClick={setSelectedEvent}
                />
              )}
              {viewMode === 'month' && (
                <MonthView
                  date={currentDate}
                  appointments={appointments}
                  googleEvents={googleEvents}
                  onEventClick={setSelectedEvent}
                />
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Appointment Creation Dialog */}
      <Dialog open={showAppointmentDialog} onOpenChange={setShowAppointmentDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Appointment</DialogTitle>
            <DialogDescription>
              Schedule a new appointment and sync it with Google Calendar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="client">Client</Label>
              <Select
                value={appointmentForm.clientId}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, clientId: value }))}
              >
                <SelectTrigger id="client" data-testid="select-client">
                  <SelectValue placeholder="Select a client" />
                </SelectTrigger>
                <SelectContent>
                  {clients.map((client: any) => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="start-time">Start Time</Label>
                <Input
                  id="start-time"
                  type="datetime-local"
                  value={format(appointmentForm.startTime, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, startTime: new Date(e.target.value) }))}
                  data-testid="input-start-time"
                />
              </div>
              <div>
                <Label htmlFor="end-time">End Time</Label>
                <Input
                  id="end-time"
                  type="datetime-local"
                  value={format(appointmentForm.endTime, "yyyy-MM-dd'T'HH:mm")}
                  onChange={(e) => setAppointmentForm(prev => ({ ...prev, endTime: new Date(e.target.value) }))}
                  data-testid="input-end-time"
                />
              </div>
            </div>
            <div>
              <Label htmlFor="type">Appointment Type</Label>
              <Select
                value={appointmentForm.type}
                onValueChange={(value) => setAppointmentForm(prev => ({ ...prev, type: value }))}
              >
                <SelectTrigger id="type" data-testid="select-appointment-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="intake">Intake</SelectItem>
                  <SelectItem value="therapy">Therapy</SelectItem>
                  <SelectItem value="assessment">Assessment</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                  <SelectItem value="consultation">Consultation</SelectItem>
                  <SelectItem value="emergency">Emergency</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                value={appointmentForm.location}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, location: e.target.value }))}
                placeholder="Office, Virtual, etc."
                data-testid="input-location"
              />
            </div>
            <div>
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={appointmentForm.notes}
                onChange={(e) => setAppointmentForm(prev => ({ ...prev, notes: e.target.value }))}
                placeholder="Additional notes..."
                rows={3}
                data-testid="textarea-notes"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="sync-google"
                checked={appointmentForm.syncToGoogle}
                onCheckedChange={(checked) => 
                  setAppointmentForm(prev => ({ ...prev, syncToGoogle: checked as boolean }))
                }
              />
              <Label htmlFor="sync-google">Sync to Google Calendar</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowAppointmentDialog(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAppointmentSubmit}
              disabled={createAppointmentMutation.isPending || !appointmentForm.clientId}
            >
              {createAppointmentMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Create Appointment
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sync Settings Dialog */}
      <Dialog open={showSyncSettings} onOpenChange={setShowSyncSettings}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Calendar Sync Settings</DialogTitle>
            <DialogDescription>
              Configure how your calendar syncs with Google Calendar
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {syncStatus?.isConnected 
                  ? 'Your calendar is connected and syncing with Google Calendar.'
                  : 'Your calendar is not connected. Please authenticate with Google to enable sync.'}
              </AlertDescription>
            </Alert>
            
            {syncStatus?.isConnected && (
              <>
                <div className="space-y-2">
                  <h4 className="font-medium">Sync Information</h4>
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Last sync:</span>
                      <span>{syncStatus.lastSync ? format(new Date(syncStatus.lastSync), 'PPpp') : 'Never'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Sync in progress:</span>
                      <span>{syncStatus.syncInProgress ? 'Yes' : 'No'}</span>
                    </div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <h4 className="font-medium">Webhook Status</h4>
                  <Button
                    variant="outline"
                    onClick={() => setupWebhookMutation.mutate()}
                    disabled={setupWebhookMutation.isPending}
                    className="w-full"
                  >
                    {setupWebhookMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : null}
                    Setup Real-time Sync
                  </Button>
                </div>
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowSyncSettings(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Day View Component
function DayView({ date, appointments, googleEvents, onEventClick }: any) {
  const hours = Array.from({ length: 24 }, (_, i) => i);
  
  return (
    <div className="relative">
      <div className="grid grid-cols-[auto,1fr] divide-x">
        <div className="w-16">
          {hours.map(hour => (
            <div key={hour} className="h-16 px-2 py-1 text-xs text-muted-foreground">
              {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
            </div>
          ))}
        </div>
        <div className="relative">
          {hours.map(hour => (
            <div key={hour} className="h-16 border-b" />
          ))}
          {/* Render appointments and events */}
          {appointments.map((apt: any) => (
            <AppointmentBlock
              key={apt.id}
              appointment={apt}
              onClick={() => onEventClick(apt)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// Week View Component
function WeekView({ startDate, appointments, googleEvents, onEventClick }: any) {
  const days = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  
  return (
    <div className="grid grid-cols-8 divide-x">
      <div className="col-span-1">
        <div className="h-12 border-b" />
        {Array.from({ length: 10 }, (_, i) => i + 8).map(hour => (
          <div key={hour} className="h-20 border-b px-2 py-1 text-xs text-muted-foreground">
            {format(new Date().setHours(hour, 0, 0, 0), 'ha')}
          </div>
        ))}
      </div>
      {days.map(day => (
        <div key={day.toISOString()} className="col-span-1">
          <div className="h-12 border-b p-2 text-center">
            <div className="text-xs text-muted-foreground">{format(day, 'EEE')}</div>
            <div className={`text-sm font-medium ${isToday(day) ? 'text-primary' : ''}`}>
              {format(day, 'd')}
            </div>
          </div>
          <div className="relative">
            {Array.from({ length: 10 }, (_, i) => (
              <div key={i} className="h-20 border-b" />
            ))}
            {/* Render appointments for this day */}
            {appointments
              .filter((apt: any) => isSameDay(new Date(apt.startTime), day))
              .map((apt: any) => (
                <AppointmentBlock
                  key={apt.id}
                  appointment={apt}
                  onClick={() => onEventClick(apt)}
                  compact
                />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// Month View Component
function MonthView({ date, appointments, googleEvents, onEventClick }: any) {
  const start = startOfMonth(date);
  const end = endOfMonth(date);
  const startWeek = startOfWeek(start, { weekStartsOn: 1 });
  const endWeek = endOfWeek(end, { weekStartsOn: 1 });
  
  const days = [];
  let current = startWeek;
  while (current <= endWeek) {
    days.push(current);
    current = addDays(current, 1);
  }
  
  return (
    <div className="grid grid-cols-7 divide-x divide-y">
      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
        <div key={day} className="p-2 text-center text-xs font-medium text-muted-foreground">
          {day}
        </div>
      ))}
      {days.map(day => (
        <div
          key={day.toISOString()}
          className={`min-h-[100px] p-2 ${
            format(day, 'M') !== format(date, 'M') ? 'bg-muted/50' : ''
          }`}
        >
          <div className={`text-sm ${isToday(day) ? 'font-bold text-primary' : ''}`}>
            {format(day, 'd')}
          </div>
          <div className="mt-1 space-y-1">
            {appointments
              .filter((apt: any) => isSameDay(new Date(apt.startTime), day))
              .slice(0, 3)
              .map((apt: any) => (
                <div
                  key={apt.id}
                  className="text-xs p-1 rounded bg-primary/10 cursor-pointer hover:bg-primary/20"
                  onClick={() => onEventClick(apt)}
                  data-testid={`appointment-${apt.id}`}
                >
                  {format(new Date(apt.startTime), 'HH:mm')} - {apt.clientName}
                </div>
              ))}
            {appointments.filter((apt: any) => isSameDay(new Date(apt.startTime), day)).length > 3 && (
              <div className="text-xs text-muted-foreground">
                +{appointments.filter((apt: any) => isSameDay(new Date(apt.startTime), day)).length - 3} more
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

// Appointment Block Component
function AppointmentBlock({ appointment, onClick, compact = false }: any) {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const duration = (endTime.getTime() - startTime.getTime()) / (1000 * 60); // in minutes
  const height = compact ? 'auto' : `${(duration / 60) * 64}px`; // 64px per hour
  
  return (
    <div
      className={`absolute left-0 right-0 mx-1 p-1 rounded cursor-pointer hover:opacity-90 ${
        appointment.googleEventId ? 'border-2 border-green-500' : ''
      } ${compact ? 'text-xs' : 'text-sm'}`}
      style={{
        top: compact ? 'auto' : `${((startTime.getHours() - 8) * 64 + (startTime.getMinutes() / 60) * 64)}px`,
        height,
        backgroundColor: `var(--${appointment.type}-color, #3b82f6)`,
      }}
      onClick={onClick}
      data-testid={`appointment-block-${appointment.id}`}
    >
      <div className="text-white font-medium">
        {format(startTime, 'HH:mm')} - {appointment.clientName}
      </div>
      {!compact && (
        <div className="text-white/80 text-xs">{appointment.type}</div>
      )}
    </div>
  );
}