import React, { useState } from 'react';
import { CalendarEvent } from '@/types/calendar';
import { AppointmentStatusModal } from './AppointmentStatusModal';
import { 
  getAppointmentStatusStyles, 
  getStatusBadgeInfo, 
  shouldShowStrikethrough,
  isAppointmentEvent,
  getAppointmentStatusLabel 
} from '@/utils/appointmentStatusUtils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

interface AppointmentStatusViewProps {
  events: CalendarEvent[];
  selectedDate: Date;
  onEventClick?: (event: CalendarEvent) => void;
}

export function AppointmentStatusView({ events, selectedDate, onEventClick }: AppointmentStatusViewProps) {
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Filter events for the selected date and appointments only
  const appointmentEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    return eventDateOnly.getTime() === selectedDateOnly.getTime() && isAppointmentEvent(event);
  }).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());

  const handleEventClick = (event: CalendarEvent) => {
    setSelectedEvent(event);
    setModalOpen(true);
    onEventClick?.(event);
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false 
    });
  };

  const formatTimeRange = (startTime: Date, endTime: Date) => {
    return `${formatTime(startTime)}-${formatTime(endTime)}`;
  };

  if (appointmentEvents.length === 0) {
    return (
      <Card className="w-full">
        <CardContent className="p-6">
          <div className="text-center text-muted-foreground">
            No appointments scheduled for {selectedDate.toLocaleDateString()}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4 h-full">
      <div className="text-lg font-semibold">
        {selectedDate.toLocaleDateString('en-US', { 
          weekday: 'long', 
          year: 'numeric', 
          month: 'long', 
          day: 'numeric' 
        })}
      </div>

      <div className="text-sm text-muted-foreground">
        {appointmentEvents.length} appointment{appointmentEvents.length !== 1 ? 's' : ''} scheduled
      </div>

      <div className="space-y-3 max-h-[600px] overflow-y-auto">
        {appointmentEvents.map((event) => {
          const badgeInfo = getStatusBadgeInfo(event.status || 'scheduled');
          const isStrikethrough = shouldShowStrikethrough(event.status || 'scheduled');

          const getBackgroundColor = (status: string) => {
            switch(status) {
              case 'cancelled': return '#fff3cd';
              case 'no_show': return '#f8d7da';
              case 'clinician_canceled': return '#f8f9fa';
              default: return '#ffffff';
            }
          };

          const getBorderColor = (status: string) => {
            switch(status) {
              case 'cancelled': return '#ffc107';
              case 'no_show': return '#dc3545';
              case 'clinician_canceled': return '#6c757d';
              default: return '#e2e8f0';
            }
          };

          return (
            <div
              key={event.id}
              className="relative cursor-pointer transition-opacity hover:opacity-90 p-3 rounded-lg border"
              style={{
                backgroundColor: getBackgroundColor(event.status || 'scheduled'),
                borderColor: getBorderColor(event.status || 'scheduled')
              }}
              onClick={() => handleEventClick(event)}
            >
              {/* Status Badge */}
              {badgeInfo.show && (
                <Badge 
                  className="absolute top-2 right-2 text-xs font-bold z-10"
                  style={{ 
                    backgroundColor: badgeInfo.color, 
                    color: 'white',
                    fontSize: '10px',
                    padding: '2px 6px',
                    letterSpacing: '0.5px'
                  }}
                >
                  {badgeInfo.text}
                </Badge>
              )}

              {/* Appointment Details */}
              <div className={`space-y-2 pr-16 ${isStrikethrough ? 'line-through' : ''}`}>
                <div className="font-bold text-base break-words">
                  {event.title}
                </div>
                <div className="text-xs opacity-75 uppercase tracking-wide">
                  {event.source === 'simplepractice' ? 'SIMPLEPRACTICE' : event.source.toUpperCase()}
                </div>
                <div className="font-semibold text-sm">
                  {formatTimeRange(new Date(event.startTime), new Date(event.endTime))}
                </div>
                {event.notes && (
                  <div className="text-xs text-gray-600 mt-1 break-words">
                    {event.notes}
                  </div>
                )}
              </div>

              {/* Clinician Canceled Overlay */}
              {event.status === 'clinician_canceled' && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-500 bg-opacity-20 rounded-lg">
                  <div className="bg-gray-500 bg-opacity-90 text-white px-2 py-1 rounded text-xs font-bold">
                    Clinician Canceled
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Appointment Status Modal */}
      <AppointmentStatusModal
        event={selectedEvent}
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
      />
    </div>
  );
}

// Statistics Component
interface AppointmentStatsProps {
  events: CalendarEvent[];
  selectedDate: Date;
}

export function AppointmentStats({ events, selectedDate }: AppointmentStatsProps) {
  const appointmentEvents = events.filter(event => {
    const eventDate = new Date(event.startTime);
    const selectedDateOnly = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), selectedDate.getDate());
    const eventDateOnly = new Date(eventDate.getFullYear(), eventDate.getMonth(), eventDate.getDate());

    return eventDateOnly.getTime() === selectedDateOnly.getTime() && isAppointmentEvent(event);
  });

  const stats = {
    total: appointmentEvents.length,
    scheduled: appointmentEvents.filter(e => e.status === 'scheduled').length,
    confirmed: appointmentEvents.filter(e => e.status === 'confirmed').length,
    cancelled: appointmentEvents.filter(e => e.status === 'cancelled').length,
    no_show: appointmentEvents.filter(e => e.status === 'no_show').length,
    clinician_canceled: appointmentEvents.filter(e => e.status === 'clinician_canceled').length,
    completed: appointmentEvents.filter(e => e.status === 'completed').length,
  };

  // Calculate scheduled hours (assuming 1 hour per appointment by default)
  const scheduledHours = appointmentEvents.reduce((total, event) => {
    const duration = (new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60);
    return total + duration;
  }, 0);

  const totalWorkHours = 10; // 8 AM to 6 PM
  const availableHours = Math.max(0, totalWorkHours - scheduledHours);
  const freeTimePercentage = Math.round((availableHours / totalWorkHours) * 100);

  return (
    <div className="bg-gray-50 dark:bg-gray-800 border-b-2 border-gray-800 dark:border-gray-200">
      <div className="grid grid-cols-4 gap-4 p-4">
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {stats.total}
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Appointments
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {scheduledHours.toFixed(1)}h
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Scheduled
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {availableHours.toFixed(1)}h
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Available
          </div>
        </div>
        <div className="text-center">
          <div className="text-lg font-bold text-gray-800 dark:text-gray-200">
            {freeTimePercentage}%
          </div>
          <div className="text-sm text-gray-600 dark:text-gray-400">
            Free Time
          </div>
        </div>
      </div>
    </div>
  );
}