import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ApiClient, type Appointment } from '@/lib/api';
import { CalendarEvent, AppointmentStats } from '../../types/calendar';
import { formatDateLong } from '../../utils/dateUtils';
import { cleanEventTitle } from '../../utils/textCleaner';
import { getLocationDisplay } from '../../utils/locationUtils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { CalendarDays, Clock, User, MapPin, CheckCircle, XCircle, AlertCircle, Calendar } from 'lucide-react';

interface AppointmentStatusViewProps {
  appointments: CalendarEvent[];
  selectedDate?: Date;
  onAppointmentClick: (appointment: CalendarEvent) => void;
}

export const AppointmentStatusView = ({
  appointments,
  selectedDate,
  onAppointmentClick
}: AppointmentStatusViewProps) => {
  const [filterStatus, setFilterStatus] = useState<CalendarEvent['status'] | 'all'>('all');
  const [selectedAppointment, setSelectedAppointment] = useState<CalendarEvent | null>(null);

  // Filter appointments based on status and date
  const filteredAppointments = appointments.filter(appointment => {
    const statusMatch = filterStatus === 'all' || appointment.status === filterStatus;
    const dateMatch = !selectedDate || 
      (appointment.startTime instanceof Date ? appointment.startTime : new Date(appointment.startTime))
        .toDateString() === selectedDate.toDateString();
    
    return statusMatch && dateMatch;
  });

  // Calculate appointment statistics
  const getAppointmentStats = (): AppointmentStats => {
    const dateFilteredAppointments = selectedDate 
      ? appointments.filter(apt => {
          const aptDate = apt.startTime instanceof Date ? apt.startTime : new Date(apt.startTime);
          return aptDate.toDateString() === selectedDate.toDateString();
        })
      : appointments;

    return {
      total: dateFilteredAppointments.length,
      confirmed: dateFilteredAppointments.filter(a => a.status === 'confirmed').length,
      completed: dateFilteredAppointments.filter(a => a.status === 'completed').length,
      cancelled: dateFilteredAppointments.filter(a => a.status === 'cancelled').length,
      noShow: dateFilteredAppointments.filter(a => a.status === 'no-show').length,
      pending: dateFilteredAppointments.filter(a => a.status === 'scheduled').length,
    };
  };

  const stats = getAppointmentStats();

  const getStatusIcon = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-therapy-success" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-therapy-primary" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-therapy-error" />;
      case 'no-show':
        return <AlertCircle className="w-4 h-4 text-therapy-error" />;
      default:
        return <Clock className="w-4 h-4 text-therapy-warning" />;
    }
  };

  const getStatusColor = (status: CalendarEvent['status']) => {
    switch (status) {
      case 'confirmed':
        return 'bg-therapy-success/10 border-therapy-success text-therapy-success';
      case 'completed':
        return 'bg-therapy-primary/10 border-therapy-primary text-therapy-primary';
      case 'cancelled':
        return 'bg-therapy-error/10 border-therapy-error text-therapy-error';
      case 'no-show':
        return 'bg-gray-100 border-gray-400 text-gray-600';
      default:
        return 'bg-therapy-warning/10 border-therapy-warning text-therapy-warning';
    }
  };

  const formatTime = (time: Date | string) => {
    const dateTime = time instanceof Date ? time : new Date(time);
    return dateTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  return (
    <div className="space-y-6">
      {/* Header with stats */}
      <Card className="therapy-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-therapy-text">
            <CalendarDays className="w-5 h-5 text-therapy-primary" />
            Appointment Overview
            {selectedDate && (
              <span className="text-sm font-normal text-therapy-text/70">
                - {formatDateLong(selectedDate)}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-therapy-text">{stats.total}</div>
              <div className="text-sm text-therapy-text/70">Total</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-therapy-primary">{stats.confirmed}</div>
              <div className="text-sm text-therapy-text/70">Confirmed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-therapy-success">{stats.completed}</div>
              <div className="text-sm text-therapy-text/70">Completed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-therapy-warning">{stats.pending}</div>
              <div className="text-sm text-therapy-text/70">Pending</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-therapy-error">{stats.cancelled}</div>
              <div className="text-sm text-therapy-text/70">Cancelled</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-gray-600">{stats.noShow}</div>
              <div className="text-sm text-therapy-text/70">No Show</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filter buttons */}
      <div className="flex flex-wrap gap-2">
        {['all', 'scheduled', 'confirmed', 'completed', 'cancelled', 'no-show'].map((status) => (
          <Button
            key={status}
            variant={filterStatus === status ? "default" : "outline"}
            onClick={() => setFilterStatus(status as any)}
            className={cn(
              "capitalize",
              filterStatus === status 
                ? "bg-therapy-primary hover:bg-therapy-primary/80" 
                : "border-therapy-border hover:bg-therapy-primary/5"
            )}
          >
            {status === 'all' ? 'All Appointments' : status.replace('-', ' ')}
          </Button>
        ))}
      </div>

      {/* Appointments list */}
      <ScrollArea className="h-96">
        <div className="space-y-3">
          {filteredAppointments.length === 0 ? (
            <Card className="therapy-card">
              <CardContent className="p-6 text-center text-therapy-text/70">
                <Calendar className="w-12 h-12 mx-auto mb-2 text-therapy-text/30" />
                No appointments found for the selected criteria.
              </CardContent>
            </Card>
          ) : (
            filteredAppointments.map((appointment) => {
              const startTime = appointment.startTime instanceof Date ? appointment.startTime : new Date(appointment.startTime);
              const endTime = appointment.endTime instanceof Date ? appointment.endTime : new Date(appointment.endTime);
              
              return (
                <Card
                  key={appointment.id}
                  className={cn(
                    "therapy-card cursor-pointer transition-all duration-200 hover:shadow-md border-2",
                    getStatusColor(appointment.status)
                  )}
                  onClick={() => onAppointmentClick(appointment)}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center gap-3 mb-2">
                          {getStatusIcon(appointment.status)}
                          <h3 className="font-semibold text-therapy-text">
                            {cleanEventTitle(appointment.title)}
                          </h3>
                          <Badge variant="outline" className="ml-auto">
                            {appointment.type}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-therapy-text/70">
                          <div className="flex items-center gap-2">
                            <Clock className="w-4 h-4" />
                            {formatTime(startTime)} - {formatTime(endTime)}
                          </div>
                          
                          {appointment.clientName && (
                            <div className="flex items-center gap-2">
                              <User className="w-4 h-4" />
                              {appointment.clientName}
                            </div>
                          )}
                          
                          {appointment.location && (
                            <div className="flex items-center gap-2">
                              <MapPin className="w-4 h-4" />
                              {getLocationDisplay(appointment.location)}
                            </div>
                          )}
                        </div>
                        
                        {appointment.notes && (
                          <div className="mt-3 p-2 bg-therapy-bg/50 rounded text-sm text-therapy-text/70">
                            {appointment.notes}
                          </div>
                        )}
                      </div>
                      
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            variant="ghost" 
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAppointment(appointment);
                            }}
                          >
                            View Details
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md">
                          <DialogHeader>
                            <DialogTitle className="flex items-center gap-2">
                              {getStatusIcon(appointment.status)}
                              {cleanEventTitle(appointment.title)}
                            </DialogTitle>
                            <DialogDescription>
                              Appointment Details
                            </DialogDescription>
                          </DialogHeader>
                          
                          {selectedAppointment && (
                            <div className="space-y-4">
                              <div>
                                <label className="text-sm font-medium text-therapy-text">Time</label>
                                <p className="text-therapy-text/70">
                                  {formatTime(selectedAppointment.startTime)} - {formatTime(selectedAppointment.endTime)}
                                </p>
                              </div>
                              
                              {selectedAppointment.clientName && (
                                <div>
                                  <label className="text-sm font-medium text-therapy-text">Client</label>
                                  <p className="text-therapy-text/70">{selectedAppointment.clientName}</p>
                                </div>
                              )}
                              
                              <div>
                                <label className="text-sm font-medium text-therapy-text">Type</label>
                                <p className="text-therapy-text/70 capitalize">{selectedAppointment.type}</p>
                              </div>
                              
                              {selectedAppointment.location && (
                                <div>
                                  <label className="text-sm font-medium text-therapy-text">Location</label>
                                  <p className="text-therapy-text/70">{getLocationDisplay(selectedAppointment.location)}</p>
                                </div>
                              )}
                              
                              {selectedAppointment.notes && (
                                <div>
                                  <label className="text-sm font-medium text-therapy-text">Notes</label>
                                  <p className="text-therapy-text/70">{selectedAppointment.notes}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
      </ScrollArea>
    </div>
  );
};