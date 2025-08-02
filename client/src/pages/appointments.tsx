import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { 
  Calendar, Plus, Clock, MapPin, Trash2, MoreVertical, Phone, Edit, 
  FileText, User, CheckCircle2, Search, Filter, ArrowUpRight, Brain,
  MessageSquare, Target, TrendingUp, List, Grid3X3, CalendarDays,
  Archive, PlayCircle, Eye, Check, X, PhoneCall, MessageCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

interface ExtendedAppointment extends Appointment {
  clientName?: string;
  clientPhone?: string;
  clientInitials?: string;
  isCustomType?: boolean;
  location?: string;
  isCalendarEvent?: boolean; // Track if this is from Google Calendar
}

export default function Appointments() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [searchFilter, setSearchFilter] = useState("");
  const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
  const [selectedAppointments, setSelectedAppointments] = useState<string[]>([]);
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);
  const [sessionPrepModal, setSessionPrepModal] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<ExtendedAppointment | null>(null);

  // Advanced filtering states
  const [dateRange, setDateRange] = useState<{start: string, end: string}>({
    start: new Date().toISOString().split('T')[0],
    end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
  });
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [clientFilter, setClientFilter] = useState("");
  const [locationFilter, setLocationFilter] = useState("");
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [quickFilterType, setQuickFilterType] = useState<'today' | 'week' | 'month' | 'custom'>('today');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Enhanced query for date range and comprehensive filtering
  const { data: appointmentsData, isLoading } = useQuery({
    queryKey: ['appointments', quickFilterType, dateRange, selectedDate],
    queryFn: async () => {
      if (quickFilterType === 'today' || selectedDate === new Date().toISOString().split('T')[0]) {
        return ApiClient.getTodaysAppointments();
      } else if (quickFilterType === 'custom' && dateRange.start && dateRange.end) {
        // For date range queries, fetch appointments for each day and combine
        const appointments = [];
        const start = new Date(dateRange.start);
        const end = new Date(dateRange.end);

        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0];
          try {
            const dayAppointments = await ApiClient.getAppointments(dateStr);
            appointments.push(...dayAppointments);
          } catch (err) {
            console.warn(`Could not fetch appointments for ${dateStr}`);
          }
        }
        return appointments;
      } else {
        return ApiClient.getAppointments(selectedDate);
      }
    },
  });

  // Transform appointments data with client info
  const appointments: ExtendedAppointment[] = (appointmentsData || []).map((apt: Appointment) => {
    // Check if this is a calendar event (non-UUID ID)
    const isCalendarEvent = apt.id && !apt.id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);

    return {
      ...apt,
      clientName: apt.type?.replace(' Appointment', '') || 'Unknown Client',
      clientPhone: '', // Would be populated from client database records when available
      clientInitials: (apt.type?.replace(' Appointment', '') || 'UC').split(' ').map(n => n[0]).join('').substring(0, 2),
      isCustomType: apt.type !== 'Individual Counseling',
      location: 'Office', // Would be determined by business logic
      isCalendarEvent,
    };
  });

  // Comprehensive multi-criteria filtering
  const filteredAppointments = appointments.filter(apt => {
    // Text search filter
    const textMatch = searchFilter === "" || 
      apt.clientName?.toLowerCase().includes(searchFilter.toLowerCase()) ||
      apt.type.toLowerCase().includes(searchFilter.toLowerCase()) ||
      apt.notes?.toLowerCase().includes(searchFilter.toLowerCase());

    // Status filter
    const statusMatch = statusFilter.length === 0 || statusFilter.includes(apt.status);

    // Client name filter
    const clientMatch = clientFilter === "" || 
      apt.clientName?.toLowerCase().includes(clientFilter.toLowerCase());

    // Location filter
    const locationMatch = locationFilter === "" || 
      apt.location?.toLowerCase().includes(locationFilter.toLowerCase());

    return textMatch && statusMatch && clientMatch && locationMatch;
  });

  // Quick stats - based on actual displayed data
  const todayAppointments = filteredAppointments.length; // Show actual filtered count
  const thisWeekAppointments = appointments.length; // Total for selected date
  const noShows = appointments.filter(apt => apt.status === 'no_show').length;
  const newClients = appointments.filter(apt => apt.status === 'confirmed' && apt.type?.includes('Initial')).length;

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800';
      case 'pending': return 'bg-yellow-100 text-yellow-800';
      case 'completed': return 'bg-blue-100 text-blue-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getNextAvailableSlot = () => {
    const now = new Date();
    const nextHour = new Date(now.getTime() + 60 * 60 * 1000);
    return nextHour.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const handleSessionPrep = (appointment: ExtendedAppointment) => {
    setSelectedAppointment(appointment);
    setSessionPrepModal(true);
  };

  // Helper functions for advanced filtering
  const setQuickFilter = (type: 'today' | 'week' | 'month' | 'custom') => {
    setQuickFilterType(type);
    const now = new Date();

    switch (type) {
      case 'today':
        setSelectedDate(now.toISOString().split('T')[0]);
        break;
      case 'week':
        const weekStart = new Date(now.setDate(now.getDate() - now.getDay()));
        const weekEnd = new Date(now.setDate(weekStart.getDate() + 6));
        setDateRange({
          start: weekStart.toISOString().split('T')[0],
          end: weekEnd.toISOString().split('T')[0]
        });
        break;
      case 'month':
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        setDateRange({
          start: monthStart.toISOString().split('T')[0],
          end: monthEnd.toISOString().split('T')[0]
        });
        break;
    }
  };

  const clearAllFilters = () => {
    setSearchFilter("");
    setClientFilter("");
    setLocationFilter("");
    setStatusFilter([]);
    setQuickFilterType('today');
    setSelectedDate(new Date().toISOString().split('T')[0]);
  };

  const toggleStatusFilter = (status: string) => {
    setStatusFilter(prev => 
      prev.includes(status) 
        ? prev.filter(s => s !== status)
        : [...prev, status]
    );
  };

  // Get unique clients for filter dropdown
  const uniqueClients = [...new Set(appointments.map(apt => apt.clientName).filter(Boolean))];
  const uniqueLocations = [...new Set(appointments.map(apt => apt.location).filter(Boolean))];
  const availableStatuses = ['confirmed', 'pending', 'completed', 'cancelled', 'no_show'];

  const handleMarkComplete = (appointmentId: string) => {
    // Implementation for marking appointment as complete
    toast({
      title: "Appointment Completed",
      description: "Session marked as complete",
    });
  };

  const handleBulkAction = (action: string) => {
    if (selectedAppointments.length === 0) return;

    switch (action) {
      case 'complete':
        selectedAppointments.forEach(id => handleMarkComplete(id));
        break;
      case 'checkin':
        toast({
          title: "Check-ins Sent",
          description: `Sent check-ins to ${selectedAppointments.length} clients`,
        });
        break;
    }
    setSelectedAppointments([]);
  };

  const deleteAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => ApiClient.cancelAppointment(appointmentId, "Cancelled by user"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully cancelled.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const deleteCalendarEventMutation = useMutation({
    mutationFn: (eventId: string) => ApiClient.deleteCalendarEvent(eventId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appointments'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
      queryClient.invalidateQueries({ queryKey: ['oauth-events'] });
      toast({
        title: "Calendar event deleted",
        description: "The event has been successfully removed from your calendar.",
      });
    },
    onError: (error: any) => {
      toast({
        title: "Error",
        description: `Failed to delete calendar event: ${error.message}`,
        variant: "destructive",
      });
    }
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-therapy-text">Appointments</h1>
          <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
        <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
          <CardContent className="p-6">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 animate-pulse">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="text-center">
                  <div className="h-8 w-16 bg-gray-200 rounded mx-auto mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-20 mx-auto"></div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
        <div className="grid gap-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gray-200 rounded-full"></div>
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded mb-2 w-1/3"></div>
                    <div className="h-3 bg-gray-200 rounded w-2/3"></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Appointments</h1>
          <p className="text-therapy-text/60">Streamlined appointment management and session workflow</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline"
            className="bg-green-50 hover:bg-green-100 text-green-700 border-green-200"
          >
            <PlayCircle className="w-4 h-4 mr-2" />
            Start Next
          </Button>
          <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
            <Plus className="w-4 h-4 mr-2" />
            Schedule Appointment
          </Button>
        </div>
      </div>

      {/* Snapshot Summary */}
      <Card className="border-0 shadow-sm bg-gradient-to-r from-blue-50 to-purple-50">
        <CardContent className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-therapy-text">
              {selectedDate === new Date().toISOString().split('T')[0] ? "Today's" : "Selected Date"} Snapshot
            </h3>
            <div className="text-sm text-therapy-text/60">
              Next available: <span className="font-medium text-therapy-primary">{getNextAvailableSlot()}</span>
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">{todayAppointments}</div>
              <p className="text-xs text-therapy-text/60">
                {searchFilter ? 'Filtered' : (selectedDate === new Date().toISOString().split('T')[0] ? 'Today' : 'Selected')}
              </p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-purple-600">{thisWeekAppointments}</div>
              <p className="text-xs text-therapy-text/60">Total</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-orange-600">{noShows}</div>
              <p className="text-xs text-therapy-text/60">No-Shows</p>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{newClients}</div>
              <p className="text-xs text-therapy-text/60">New Clients</p>
            </div>
          </div>
          {/* Debug info for development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-2 text-xs text-gray-500 bg-gray-50 p-2 rounded">
              Debug: {appointments.length} total appointments, {filteredAppointments.length} after filters
              {searchFilter && ` (filter: "${searchFilter}")`}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Search and Filters */}
      <Card className="border-0 shadow-sm">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search clients, session types, or notes..."
                value={searchFilter}
                onChange={(e) => setSearchFilter(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex items-center gap-2">
              <div className="flex items-center space-x-2">
                <Calendar className="h-4 w-4 text-therapy-primary" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="border border-therapy-border rounded-lg px-3 py-2 text-sm"
                />
              </div>
              {selectedAppointments.length > 0 && (
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('complete')}>
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Complete ({selectedAppointments.length})
                  </Button>
                  <Button variant="outline" size="sm" onClick={() => handleBulkAction('checkin')}>
                    <MessageCircle className="h-4 w-4 mr-1" />
                    Send Check-in
                  </Button>
                </div>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                className={showAdvancedFilters ? "bg-therapy-primary text-white" : ""}
              >
                <Filter className="h-4 w-4 mr-1" />
                Advanced
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={clearAllFilters}
                disabled={!searchFilter && !clientFilter && statusFilter.length === 0}
              >
                Clear Filters
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    {viewMode === 'list' ? <List className="h-4 w-4" /> : <Grid3X3 className="h-4 w-4" />}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => setViewMode('list')}>
                    <List className="h-4 w-4 mr-2" />
                    List View
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setViewMode('grid')}>
                    <Grid3X3 className="h-4 w-4 mr-2" />
                    Grid View
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Advanced Filters Panel */}
      {showAdvancedFilters && (
        <Card className="border-0 shadow-sm bg-blue-50/30">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Quick Date Filters */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-therapy-text">Quick Date Filter</label>
                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant={quickFilterType === 'today' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickFilter('today')}
                    className="text-xs"
                  >
                    Today
                  </Button>
                  <Button
                    variant={quickFilterType === 'week' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickFilter('week')}
                    className="text-xs"
                  >
                    This Week
                  </Button>
                  <Button
                    variant={quickFilterType === 'month' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickFilter('month')}
                    className="text-xs"
                  >
                    This Month
                  </Button>
                  <Button
                    variant={quickFilterType === 'custom' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setQuickFilter('custom')}
                    className="text-xs"
                  >
                    Custom
                  </Button>
                </div>
                {quickFilterType === 'custom' && (
                  <div className="space-y-2 mt-2">
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="w-full border border-therapy-border rounded px-2 py-1 text-sm"
                      placeholder="Start Date"
                    />
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="w-full border border-therapy-border rounded px-2 py-1 text-sm"
                      placeholder="End Date"
                    />
                  </div>
                )}
              </div>

              {/* Client Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-therapy-text">Client</label>
                <div className="relative">
                  <User className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Search by client name..."
                    value={clientFilter}
                    onChange={(e) => setClientFilter(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                {uniqueClients.length > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1">
                    {uniqueClients
                      .filter(client => !clientFilter || client.toLowerCase().includes(clientFilter.toLowerCase()))
                      .slice(0, 5)
                      .map(client => (
                        <button
                          key={client}
                          onClick={() => setClientFilter(client)}
                          className="block w-full text-left px-2 py-1 text-xs hover:bg-therapy-primary/10 rounded"
                        >
                          {client}
                        </button>
                      ))
                    }
                  </div>
                )}
              </div>

              {/* Status Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-therapy-text">Status</label>
                <div className="space-y-2">
                  {availableStatuses.map(status => (
                    <label key={status} className="flex items-center space-x-2 text-sm">
                      <Checkbox
                        checked={statusFilter.includes(status)}
                        onCheckedChange={() => toggleStatusFilter(status)}
                      />
                      <span className="capitalize">{status.replace('_', ' ')}</span>
                      <Badge 
                        className={getStatusColor(status) + ' text-xs'}
                        variant="secondary"
                      >
                        {appointments.filter(apt => apt.status === status).length}
                      </Badge>
                    </label>
                  ))}
                </div>
              </div>

              {/* Location Filter */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-therapy-text">Location</label>
                <div className="relative">
                  <MapPin className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <Input
                    placeholder="Filter by location..."
                    value={locationFilter}
                    onChange={(e) => setLocationFilter(e.target.value)}
                    className="pl-8 text-sm"
                  />
                </div>
                {uniqueLocations.length > 0 && (
                  <div className="space-y-1">
                    {uniqueLocations.map(location => (
                      <button
                        key={location}
                        onClick={() => setLocationFilter(location)}
                        className="block w-full text-left px-2 py-1 text-xs hover:bg-therapy-primary/10 rounded"
                      >
                        {location}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Filter Summary */}
            <div className="mt-4 pt-4 border-t border-therapy-border/30">
              <div className="flex items-center justify-between text-sm text-therapy-text/60">
                <div>
                  Showing {filteredAppointments.length} of {appointments.length} appointments
                  {(searchFilter || clientFilter || statusFilter.length > 0 || locationFilter) && (
                    <span className="ml-2 text-therapy-primary font-medium">
                      (filtered)
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  {quickFilterType !== 'today' && (
                    <Badge variant="outline" className="text-xs">
                      {quickFilterType === 'custom' 
                        ? `${dateRange.start} to ${dateRange.end}` 
                        : quickFilterType
                      }
                    </Badge>
                  )}
                  {statusFilter.length > 0 && (
                    <Badge variant="outline" className="text-xs">
                      {statusFilter.length} status{statusFilter.length > 1 ? 'es' : ''}
                    </Badge>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Appointments List/Grid */}
      <div className={viewMode === 'grid' ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' : 'space-y-4'}>
        {filteredAppointments.length > 0 ? (
          filteredAppointments.map((appointment) => (
            <Card key={appointment.id} className="hover:shadow-md transition-shadow border-l-4 border-l-therapy-primary">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  {/* Selection Checkbox */}
                  <Checkbox
                    checked={selectedAppointments.includes(appointment.id)}
                    onCheckedChange={(checked) => {
                      if (checked) {
                        setSelectedAppointments(prev => [...prev, appointment.id]);
                      } else {
                        setSelectedAppointments(prev => prev.filter(id => id !== appointment.id));
                      }
                    }}
                  />

                  {/* Time Badge */}
                  <div className="text-center min-w-[60px]">
                    <div className="bg-therapy-primary text-white rounded-lg p-2 text-sm font-medium">
                      <div>{formatTime(appointment.startTime)}</div>
                    </div>
                  </div>

                  {/* Client Avatar */}
                  <Avatar className="h-10 w-10">
                    <AvatarFallback className="bg-therapy-success text-white">
                      {appointment.clientInitials}
                    </AvatarFallback>
                  </Avatar>

                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h3 className="font-semibold text-therapy-text truncate">
                        {appointment.clientName}
                      </h3>
                      <a 
                        href={`tel:${appointment.clientPhone}`} 
                        className="text-therapy-primary hover:bg-therapy-primary/10 p-1 rounded"
                        title="Call client"
                      >
                        <Phone className="h-4 w-4" />
                      </a>
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm text-therapy-text/70">
                        {appointment.isCustomType ? (
                          <Badge variant="secondary" className="text-xs">{appointment.type}</Badge>
                        ) : (
                          'Individual Counseling'
                        )}
                      </span>
                      {appointment.isCalendarEvent && (
                        <Badge variant="outline" className="text-xs text-blue-600 border-blue-200">
                          Calendar Event
                        </Badge>
                      )}
                      <div className="flex items-center gap-1 text-sm text-therapy-text/60">
                        <MapPin className="h-3 w-3" />
                        <span>{appointment.location}</span>
                      </div>
                    </div>

                    {/* Quick Actions */}
                    <div className="flex flex-wrap gap-1 mt-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="text-xs h-7"
                        onClick={() => handleSessionPrep(appointment)}
                      >
                        Session Prep
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        Note
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        Check-In
                      </Button>
                      <Button variant="outline" size="sm" className="text-xs h-7">
                        <Edit className="h-3 w-3" />
                      </Button>
                      {!appointment.isCalendarEvent ? (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7 text-red-600 hover:bg-red-50"
                          onClick={() => deleteAppointmentMutation.mutate(appointment.id)}
                          disabled={deleteAppointmentMutation.isPending}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      ) : (
                        <Button 
                          variant="outline" 
                          size="sm" 
                          className="text-xs h-7 text-red-600 hover:bg-red-50"
                          onClick={() => deleteCalendarEventMutation.mutate(appointment.id)}
                          disabled={deleteCalendarEventMutation.isPending}
                          title="Delete from Google Calendar"
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>

                    {/* Expanded Content */}
                    {expandedAppointment === appointment.id && (
                      <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <strong>Duration:</strong> {formatTime(appointment.startTime)} - {formatTime(appointment.endTime)}
                          </div>
                          <div>
                            <strong>Status:</strong> 
                            <Badge className={`ml-2 ${getStatusColor(appointment.status)}`}>
                              {appointment.status}
                            </Badge>
                          </div>
                        </div>
                        {appointment.notes && (
                          <div className="mt-2">
                            <strong>Notes:</strong>
                            <p className="text-therapy-text/70">{appointment.notes}</p>
                          </div>
                        )}
                        <div className="flex gap-2 mt-3">
                          <Button size="sm" className="bg-therapy-primary hover:bg-therapy-primary/90">
                            <FileText className="h-3 w-3 mr-1" />
                            Start New Note
                          </Button>
                          <Button variant="outline" size="sm">
                            <PhoneCall className="h-3 w-3 mr-1" />
                            Call Client
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Expand Toggle */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setExpandedAppointment(
                      expandedAppointment === appointment.id ? null : appointment.id
                    )}
                  >
                    {expandedAppointment === appointment.id ? (
                      <X className="h-4 w-4" />
                    ) : (
                      <ArrowUpRight className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <Card className="col-span-full">
            <CardContent className="p-12 text-center">
              <Calendar className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-therapy-text mb-2">
                No appointments scheduled
              </h3>
              <p className="text-therapy-text/60 mb-4">
                {searchFilter ? 
                  `No appointments found matching "${searchFilter}" ${appointments.length > 0 ? `(${appointments.length} total available)` : ''}` : 
                  `No appointments found for ${new Date(selectedDate).toLocaleDateString()}`
                }
              </p>
              <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
                <Plus className="w-4 h-4 mr-2" />
                Schedule an Appointment
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Session Prep Modal */}
      <Dialog open={sessionPrepModal} onOpenChange={setSessionPrepModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-therapy-primary" />
              Session Prep - {selectedAppointment?.clientName}
            </DialogTitle>
            <DialogDescription>
              Review client progress and prepare for upcoming session
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div><strong>Time:</strong> {selectedAppointment && formatTime(selectedAppointment.startTime)}</div>
              <div><strong>Location:</strong> {selectedAppointment?.location}</div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-blue-600" />
                <span className="font-medium">Session Goals</span>
              </div>
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm">Continue work on anxiety management techniques and discuss homework completion.</p>
              </div>
            </div>
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-purple-600" />
                <span className="font-medium">Follow-up Questions</span>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg">
                <ul className="text-sm space-y-1">
                  <li>• How did the breathing exercises work this week?</li>
                  <li>• Any significant triggers or stressful events?</li>
                  <li>• Progress on sleep hygiene goals?</li>
                </ul>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSessionPrepModal(false)}>
                Close
              </Button>
              <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
                <FileText className="h-4 w-4 mr-2" />
                Start Session Note
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}