// components/dashboard/todays-schedule/index.tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar, RefreshCw } from "lucide-react";

// Sub-components
import AppointmentCard from "./AppointmentCard";
import SessionPrepModal from "@/components/session-prep/session-prep-modal";
import ClientInfoModal from "./ClientInfoModal";
import DeleteAppointmentDialog from "./DeleteAppointmentDialog";
import { useAppointmentActions } from "./hooks/useAppointmentActions";
import { useSessionManagement } from "./hooks/useSessionManagement";

// Constants
const REFRESH_INTERVAL = 30 * 1000; // 30 seconds
const CACHE_TIME = 5 * 60 * 1000; // 5 minutes

export default function TodaysSchedule() {
  const { therapistId } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // State management
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [sessionPrepModal, setSessionPrepModal] = useState({
    isOpen: false,
    eventId: '',
    clientName: '',
    appointmentTime: ''
  });
  const [deleteDialog, setDeleteDialog] = useState({
    isOpen: false,
    appointment: null as Appointment | null
  });
  const [clientInfoModal, setClientInfoModal] = useState({
    isOpen: false,
    clientName: ''
  });

  // Hooks
  const { activeSession, startSession, endSession } = useSessionManagement();
  const { deleteAppointment, isDeleting } = useAppointmentActions();

  // Data fetching
  const { 
    data: appointments, 
    isLoading, 
    error, 
    refetch,
    isRefetching 
  } = useQuery({
    queryKey: ['todays-appointments', therapistId],
    queryFn: ApiClient.getTodaysAppointments,
    refetchInterval: REFRESH_INTERVAL,
    staleTime: 15 * 1000, // Consider data fresh for 15 seconds
    gcTime: CACHE_TIME,
    enabled: !!therapistId,
  });

  // Computed values
  const sortedAppointments = useMemo(() => {
    if (!appointments) return [];

    return [...appointments].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
  }, [appointments]);

  const upcomingAppointments = useMemo(() => {
    const now = new Date();
    return sortedAppointments.filter(apt => new Date(apt.startTime) > now);
  }, [sortedAppointments]);

  const currentAppointment = useMemo(() => {
    const now = new Date();
    return sortedAppointments.find(apt => {
      const start = new Date(apt.startTime);
      const end = new Date(apt.endTime);
      return start <= now && end >= now;
    });
  }, [sortedAppointments]);

  // Handlers
  const handleToggleCard = (appointmentId: string) => {
    setExpandedCards(prev => {
      const next = new Set(prev);
      if (next.has(appointmentId)) {
        next.delete(appointmentId);
      } else {
        next.add(appointmentId);
      }
      return next;
    });
  };

  const handleOpenSessionPrep = (appointment: Appointment) => {
    const clientName = appointment.clientId === 'calendar-event' 
      ? appointment.type.replace(' Appointment', '').trim()
      : (appointment as any).clientName || appointment.type;

    setSessionPrepModal({
      isOpen: true,
      eventId: (appointment as any).googleEventId || appointment.id,
      clientName,
      appointmentTime: new Date(appointment.startTime).toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    });
  };

  const handleDeleteClick = (appointment: Appointment) => {
    setDeleteDialog({
      isOpen: true,
      appointment
    });
  };

  const handleDeleteConfirm = async () => {
    if (deleteDialog.appointment) {
      try {
        await deleteAppointment(deleteDialog.appointment.id);
        queryClient.invalidateQueries({ queryKey: ['todays-appointments'] });
        queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
        toast({
          title: "Appointment deleted",
          description: "The appointment has been successfully cancelled.",
        });
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to delete appointment. Please try again.",
          variant: "destructive",
        });
      } finally {
        setDeleteDialog({ isOpen: false, appointment: null });
      }
    }
  };

  // Loading state
  if (isLoading) {
    return <TodaysScheduleSkeleton />;
  }

  // Error state
  if (error) {
    return (
      <div className="therapy-card p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-xl font-bold text-therapy-text">Today's Schedule</h3>
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => refetch()}
          >
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
        <div className="text-center py-8">
          <p className="text-therapy-error mb-2">Failed to load appointments</p>
          <p className="text-sm text-therapy-text/60">{error.message}</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="therapy-card">
        <div className="p-6 border-b border-therapy-border">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold text-therapy-text">Today's Schedule</h3>
              {currentAppointment && (
                <p className="text-sm text-therapy-primary mt-1">
                  Current session in progress
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              {isRefetching && (
                <RefreshCw className="h-4 w-4 text-therapy-text/40 animate-spin" />
              )}
              <Badge variant="outline" className="text-xs">
                {sortedAppointments.length} appointments
              </Badge>
              <Button 
                variant="ghost" 
                size="sm"
                className="text-therapy-primary hover:text-therapy-primary/80"
                onClick={() => window.location.href = '/appointments'}
              >
                View All
              </Button>
            </div>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Current Session Highlight */}
          {currentAppointment && (
            <div className="bg-therapy-primary/5 border border-therapy-primary/20 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="h-2 w-2 bg-therapy-primary rounded-full animate-pulse" />
                <span className="text-sm font-medium text-therapy-primary">
                  Session in Progress
                </span>
              </div>
              <AppointmentCard
                appointment={currentAppointment}
                isActive={activeSession === currentAppointment.id}
                isExpanded={expandedCards.has(currentAppointment.id)}
                onToggleExpand={() => handleToggleCard(currentAppointment.id)}
                onStartSession={() => startSession(currentAppointment.id, currentAppointment.type)}
                onEndSession={() => endSession(currentAppointment.id)}
                onOpenSessionPrep={() => handleOpenSessionPrep(currentAppointment)}
                onDelete={() => handleDeleteClick(currentAppointment)}
                variant="current"
              />
            </div>
          )}

          {/* Upcoming Appointments */}
          {upcomingAppointments.length > 0 ? (
            <>
              {upcomingAppointments.length > 0 && currentAppointment && (
                <div className="text-sm font-medium text-therapy-text/60 mb-2">
                  Upcoming Sessions
                </div>
              )}
              {upcomingAppointments.map((appointment) => (
                <AppointmentCard
                  key={appointment.id}
                  appointment={appointment}
                  isActive={activeSession === appointment.id}
                  isExpanded={expandedCards.has(appointment.id)}
                  onToggleExpand={() => handleToggleCard(appointment.id)}
                  onStartSession={() => startSession(appointment.id, appointment.type)}
                  onEndSession={() => endSession(appointment.id)}
                  onOpenSessionPrep={() => handleOpenSessionPrep(appointment)}
                  onDelete={() => handleDeleteClick(appointment)}
                />
              ))}
            </>
          ) : !currentAppointment ? (
            <div className="text-center py-8">
              <Calendar className="h-12 w-12 text-therapy-text/20 mx-auto mb-3" />
              <p className="text-therapy-text/60">No appointments scheduled for today</p>
              <p className="text-xs text-therapy-text/40 mt-2">
                Connected to Google Calendar
              </p>
            </div>
          ) : null}
        </div>
      </div>

      {/* Modals */}
      <SessionPrepModal
        isOpen={sessionPrepModal.isOpen}
        onClose={() => setSessionPrepModal({ ...sessionPrepModal, isOpen: false })}
        eventId={sessionPrepModal.eventId}
        clientName={sessionPrepModal.clientName}
        appointmentTime={sessionPrepModal.appointmentTime}
      />

      <ClientInfoModal
        clientName={clientInfoModal.clientName}
        isOpen={clientInfoModal.isOpen}
        onOpenChange={(open) => setClientInfoModal({ ...clientInfoModal, isOpen: open })}
      />

      <DeleteAppointmentDialog
        isOpen={deleteDialog.isOpen}
        appointment={deleteDialog.appointment}
        isDeleting={isDeleting}
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteDialog({ isOpen: false, appointment: null })}
      />
    </>
  );
}

// Loading skeleton component
function TodaysScheduleSkeleton() {
  return (
    <div className="therapy-card">
      <div className="p-6 border-b border-therapy-border">
        <div className="h-7 w-48 bg-gray-200 rounded animate-pulse" />
      </div>
      <div className="p-6 space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gray-200 rounded-lg" />
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded mb-2 w-3/4" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="flex gap-2">
                <div className="w-8 h-8 bg-gray-200 rounded" />
                <div className="w-8 h-8 bg-gray-200 rounded" />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}