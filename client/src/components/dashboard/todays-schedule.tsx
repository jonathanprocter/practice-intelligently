import { useQuery } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { Play, Pause, MoreHorizontal, Calendar, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export default function TodaysSchedule() {
  const { data: appointments, isLoading } = useQuery({
    queryKey: ['todays-appointments'],
    queryFn: ApiClient.getTodaysAppointments,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  if (isLoading) {
    return (
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <h3 className="text-xl font-bold text-therapy-text">Today's Schedule</h3>
        </div>
        <div className="p-6 space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: false
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-therapy-primary/10 text-therapy-primary';
      case 'in_progress': return 'bg-therapy-warning/10 text-therapy-warning';
      case 'completed': return 'bg-therapy-success/10 text-therapy-success';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-bold text-therapy-text">Today's Schedule</h3>
          <Button variant="ghost" className="text-therapy-primary hover:text-therapy-primary/80">
            View All
          </Button>
        </div>
      </div>
      
      <div className="p-6 space-y-4">
        {appointments && appointments.length > 0 ? (
          appointments.map((appointment) => (
            <div key={appointment.id} className="flex items-center space-x-4 p-4 bg-therapy-bg rounded-lg">
              <div className="w-12 h-12 bg-therapy-success text-white rounded-lg flex items-center justify-center font-bold">
                <span className="text-sm">{formatTime(appointment.startTime)}</span>
              </div>
              <div className="flex-1">
                <h4 className="font-semibold text-therapy-text flex items-center gap-2">
                  {appointment.clientId === 'calendar-event' ? (
                    <>
                      <Calendar className="h-4 w-4 text-therapy-primary" />
                      {appointment.type}
                    </>
                  ) : (
                    'Client Session'
                  )}
                </h4>
                <p className="text-therapy-text/60 text-sm">
                  {appointment.clientId === 'calendar-event' ? 'Google Calendar' : appointment.type}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-therapy-text/50">
                    {appointment.clientId === 'calendar-event' ? 'Calendar Event' : '50 min'}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2">
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="w-8 h-8 bg-therapy-success/10 text-therapy-success hover:bg-therapy-success/20"
                >
                  <Play className="h-4 w-4" />
                </Button>
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-200"
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-8">
            <p className="text-therapy-text/60">No appointments scheduled for today</p>
            <p className="text-xs text-therapy-text/40 mt-2">
              {appointments === undefined ? 'Loading appointments...' : 'Connected to Google Calendar'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
