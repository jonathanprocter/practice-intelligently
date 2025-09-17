// components/dashboard/todays-schedule-enhanced.tsx
import { useQuery } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { useState, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Calendar, Clock, User, MapPin, CheckCircle, 
  AlertCircle, Timer, RefreshCw, FileText, 
  ChevronRight, UserPlus, Video, Phone 
} from "lucide-react";
import { format, formatDistanceToNow, differenceInMinutes, isAfter, isBefore } from "date-fns";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";

interface CountdownTimerProps {
  targetTime: Date;
  label: string;
}

function CountdownTimer({ targetTime, label }: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isUrgent, setIsUrgent] = useState(false);

  useEffect(() => {
    const updateTimer = () => {
      const now = new Date();
      const diff = differenceInMinutes(targetTime, now);
      
      if (diff < 0) {
        const absDiff = Math.abs(diff);
        const hours = Math.floor(absDiff / 60);
        const minutes = absDiff % 60;
        setTimeLeft(`${hours}h ${minutes}m ago`);
        setIsUrgent(false);
      } else if (diff === 0) {
        setTimeLeft("Now");
        setIsUrgent(true);
      } else {
        const hours = Math.floor(diff / 60);
        const minutes = diff % 60;
        setTimeLeft(hours > 0 ? `${hours}h ${minutes}m` : `${minutes}m`);
        setIsUrgent(diff < 15);
      }
    };

    updateTimer();
    const interval = setInterval(updateTimer, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, [targetTime]);

  return (
    <div className="flex items-center gap-2">
      <Timer className={cn("h-4 w-4", isUrgent ? "text-therapy-warning animate-pulse" : "text-therapy-text/60")} />
      <span className={cn("text-sm font-medium", isUrgent ? "text-therapy-warning" : "text-therapy-text/60")}>
        {label}: {timeLeft}
      </span>
    </div>
  );
}

interface AppointmentCardEnhancedProps {
  appointment: Appointment;
  onComplete: (id: string) => void;
  onAddNote: (id: string) => void;
  onReschedule: (id: string) => void;
  onViewClient: (clientId: string) => void;
  isActive?: boolean;
  hasNotes?: boolean;
}

function AppointmentCardEnhanced({ 
  appointment, 
  onComplete, 
  onAddNote, 
  onReschedule,
  onViewClient,
  isActive = false,
  hasNotes = false
}: AppointmentCardEnhancedProps) {
  const startTime = new Date(appointment.startTime);
  const endTime = new Date(appointment.endTime);
  const now = new Date();
  const isUpcoming = isAfter(startTime, now);
  const isPast = isAfter(now, endTime);
  const isCurrent = !isUpcoming && !isPast;

  const getStatusBadge = () => {
    if (appointment.status === 'completed') {
      return <Badge variant="outline" className="bg-therapy-success/10 text-therapy-success border-therapy-success">Completed</Badge>;
    }
    if (appointment.status === 'cancelled') {
      return <Badge variant="outline" className="bg-therapy-error/10 text-therapy-error border-therapy-error">Cancelled</Badge>;
    }
    if (appointment.status === 'no_show') {
      return <Badge variant="outline" className="bg-therapy-warning/10 text-therapy-warning border-therapy-warning">No Show</Badge>;
    }
    if (isCurrent) {
      return <Badge variant="outline" className="bg-therapy-primary/10 text-therapy-primary border-therapy-primary animate-pulse">In Progress</Badge>;
    }
    if (isUpcoming) {
      return <Badge variant="outline" className="bg-therapy-secondary/10 text-therapy-secondary border-therapy-secondary">Upcoming</Badge>;
    }
    return <Badge variant="outline" className="bg-therapy-text/10 text-therapy-text border-therapy-text">Scheduled</Badge>;
  };

  const getAppointmentTypeIcon = () => {
    const type = appointment.type?.toLowerCase() || '';
    if (type.includes('video') || type.includes('telehealth')) {
      return <Video className="h-4 w-4 text-therapy-primary" />;
    }
    if (type.includes('phone')) {
      return <Phone className="h-4 w-4 text-therapy-primary" />;
    }
    if (type.includes('initial') || type.includes('intake')) {
      return <UserPlus className="h-4 w-4 text-therapy-primary" />;
    }
    return <User className="h-4 w-4 text-therapy-primary" />;
  };

  return (
    <Card className={cn(
      "transition-all duration-200 hover:shadow-md",
      isActive && "ring-2 ring-therapy-primary shadow-lg",
      isCurrent && "bg-therapy-primary/5 border-therapy-primary"
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-3">
            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-therapy-primary/10">
              {getAppointmentTypeIcon()}
            </div>
            <div>
              <h4 className="font-semibold text-therapy-text flex items-center gap-2">
                {appointment.clientName || 
                  (appointment.clientFirstName && appointment.clientLastName 
                    ? `${appointment.clientFirstName} ${appointment.clientLastName}`
                    : "Client")}
                {hasNotes && <FileText className="h-3 w-3 text-therapy-success" />}
              </h4>
              <p className="text-sm text-therapy-text/60">
                {format(startTime, "h:mm a")} - {format(endTime, "h:mm a")}
              </p>
            </div>
          </div>
          {getStatusBadge()}
        </div>

        {appointment.location && (
          <div className="flex items-center gap-2 mb-3 text-sm text-therapy-text/60">
            <MapPin className="h-3 w-3" />
            <span>{appointment.location}</span>
          </div>
        )}

        {(isUpcoming || isCurrent) && appointment.status !== 'cancelled' && (
          <div className="mb-3">
            <CountdownTimer 
              targetTime={startTime} 
              label={isCurrent ? "Started" : "Starts in"}
            />
          </div>
        )}

        {appointment.notes && (
          <div className="mb-3 p-2 bg-therapy-secondary/5 rounded-md">
            <p className="text-sm text-therapy-text/80 line-clamp-2">{appointment.notes}</p>
          </div>
        )}

        <div className="flex gap-2 mt-3">
          {appointment.status === 'scheduled' && !isPast && (
            <>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onComplete(appointment.id)}
                className="flex-1"
                data-testid={`button-complete-${appointment.id}`}
              >
                <CheckCircle className="h-3 w-3 mr-1" />
                Complete
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => onAddNote(appointment.id)}
                className="flex-1"
                data-testid={`button-add-note-${appointment.id}`}
              >
                <FileText className="h-3 w-3 mr-1" />
                Add Note
              </Button>
            </>
          )}
          {appointment.status === 'completed' && !hasNotes && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => onAddNote(appointment.id)}
              className="flex-1"
              data-testid={`button-add-note-${appointment.id}`}
            >
              <FileText className="h-3 w-3 mr-1" />
              Add Session Note
            </Button>
          )}
          {appointment.clientId && appointment.clientId !== 'calendar-event' && (
            <Button
              size="sm"
              variant="ghost"
              onClick={() => onViewClient(appointment.clientId)}
              data-testid={`button-view-client-${appointment.id}`}
            >
              <ChevronRight className="h-3 w-3" />
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export default function TodaysScheduleEnhanced() {
  const { toast } = useToast();
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  // Fetch today's appointments
  const { 
    data: appointments = [], 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['todays-appointments'],
    queryFn: ApiClient.getTodaysAppointments,
    refetchInterval: 30000, // Refresh every 30 seconds
    staleTime: 15000,
  });

  // Fetch session notes for today
  const { data: sessionNotes = [] } = useQuery({
    queryKey: ['todays-session-notes'],
    queryFn: ApiClient.getTodaysSessionNotes,
    refetchInterval: 60000,
  });

  // Process appointments
  const processedAppointments = useMemo(() => {
    const now = new Date();
    const sorted = [...appointments].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );

    const upcoming = sorted.filter(apt => 
      isAfter(new Date(apt.startTime), now) && apt.status === 'scheduled'
    );
    
    const current = sorted.find(apt => {
      const start = new Date(apt.startTime);
      const end = new Date(apt.endTime);
      return isBefore(start, now) && isAfter(end, now) && apt.status === 'scheduled';
    });

    const completed = sorted.filter(apt => 
      apt.status === 'completed' || apt.status === 'no_show'
    );

    return { upcoming, current, completed, all: sorted };
  }, [appointments, currentTime]);

  // Check if appointment has notes
  const hasSessionNote = (appointmentId: string) => {
    return sessionNotes.some((note: any) => note.appointmentId === appointmentId);
  };

  // Handlers
  const handleComplete = async (appointmentId: string) => {
    try {
      await ApiClient.completeAppointment(appointmentId);
      toast({
        title: "Appointment completed",
        description: "The appointment has been marked as completed.",
      });
      refetch();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to complete appointment",
        variant: "destructive",
      });
    }
  };

  const handleAddNote = (appointmentId: string) => {
    // Navigate to session note creation
    window.location.href = `/session-notes?appointmentId=${appointmentId}`;
  };

  const handleReschedule = (appointmentId: string) => {
    // Navigate to appointment rescheduling
    window.location.href = `/appointments?reschedule=${appointmentId}`;
  };

  const handleViewClient = (clientId: string) => {
    // Navigate to client chart
    window.location.href = `/client-chart/${clientId}`;
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center justify-between">
            <span>Today's Schedule</span>
            <Skeleton className="h-8 w-20" />
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <Skeleton key={i} className="h-32 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Today's Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8">
            <AlertCircle className="h-8 w-8 text-therapy-error mb-2" />
            <p className="text-therapy-error">Failed to load appointments</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => refetch()}
              className="mt-2"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Retry
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5 text-therapy-primary" />
            Today's Schedule
          </CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline">
              {processedAppointments.all.length} Total
            </Badge>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => refetch()}
              disabled={isRefetching}
              data-testid="button-refresh-schedule"
            >
              <RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Current Session */}
          {processedAppointments.current && (
            <div>
              <h3 className="text-sm font-semibold text-therapy-text mb-2 flex items-center gap-2">
                <div className="w-2 h-2 bg-therapy-primary rounded-full animate-pulse" />
                Current Session
              </h3>
              <AppointmentCardEnhanced
                appointment={processedAppointments.current}
                onComplete={handleComplete}
                onAddNote={handleAddNote}
                onReschedule={handleReschedule}
                onViewClient={handleViewClient}
                isActive={true}
                hasNotes={hasSessionNote(processedAppointments.current.id)}
              />
            </div>
          )}

          {/* Upcoming Appointments */}
          {processedAppointments.upcoming.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-therapy-text mb-2">
                Upcoming ({processedAppointments.upcoming.length})
              </h3>
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-2">
                  {processedAppointments.upcoming.map(appointment => (
                    <AppointmentCardEnhanced
                      key={appointment.id}
                      appointment={appointment}
                      onComplete={handleComplete}
                      onAddNote={handleAddNote}
                      onReschedule={handleReschedule}
                      onViewClient={handleViewClient}
                      hasNotes={hasSessionNote(appointment.id)}
                    />
                  ))}
                </div>
              </ScrollArea>
            </div>
          )}

          {/* Completed Today */}
          {processedAppointments.completed.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-therapy-text mb-2">
                Completed Today ({processedAppointments.completed.length})
              </h3>
              <div className="space-y-2">
                {processedAppointments.completed.slice(0, 3).map(appointment => (
                  <AppointmentCardEnhanced
                    key={appointment.id}
                    appointment={appointment}
                    onComplete={handleComplete}
                    onAddNote={handleAddNote}
                    onReschedule={handleReschedule}
                    onViewClient={handleViewClient}
                    hasNotes={hasSessionNote(appointment.id)}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Empty State */}
          {processedAppointments.all.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12">
              <Calendar className="h-12 w-12 text-therapy-text/30 mb-3" />
              <p className="text-therapy-text/60 text-center">No appointments scheduled for today</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => window.location.href = '/appointments'}
              >
                Schedule Appointment
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}