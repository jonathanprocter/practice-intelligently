import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, type Appointment } from "@/lib/api";
import { Play, Pause, MoreHorizontal, Calendar, ExternalLink, Clock, Edit, FileText, Users, Video, ChevronDown, ChevronUp, Lightbulb, Brain, NotebookPen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu, 
  DropdownMenuContent, 
  DropdownMenuItem, 
  DropdownMenuTrigger,
  DropdownMenuSeparator 
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useLocation } from "wouter";
import SessionPrepModal from "@/components/session-prep/session-prep-modal";
import ClientInfoModal from "./ClientInfoModal";
import { getCalendarLocationDisplay } from "@/utils/locationUtils";

export default function TodaysSchedule() {
  const [activeSession, setActiveSession] = useState<string | null>(null);
  const [expandedReminders, setExpandedReminders] = useState<Set<string>>(new Set());
  const [sessionPrepModal, setSessionPrepModal] = useState<{
    isOpen: boolean;
    eventId: string;
    clientName: string;
    appointmentTime: string;
  }>({
    isOpen: false,
    eventId: '',
    clientName: '',
    appointmentTime: ''
  });
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [appointmentToDelete, setAppointmentToDelete] = useState<Appointment | null>(null);
  const [clientInfoModal, setClientInfoModal] = useState<{
    isOpen: boolean;
    clientName: string;
  }>({
    isOpen: false,
    clientName: ''
  });
  const { toast } = useToast();
  const [, navigate] = useLocation();
  const queryClient = useQueryClient();

  const { data: appointments, isLoading } = useQuery({
    queryKey: ['todays-appointments'],
    queryFn: ApiClient.getTodaysAppointments,
    refetchInterval: 30000, // Refresh every 30 seconds for real-time updates
  });

  const handleStartSession = (appointmentId: string, clientName: string) => {
    setActiveSession(appointmentId);
    toast({
      title: "Session Started",
      description: `Started session with ${clientName}`,
    });
  };

  const handleEndSession = (appointmentId: string) => {
    setActiveSession(null);
    toast({
      title: "Session Ended",
      description: "Session has been ended",
    });
  };

  const handleClientNameClick = (clientName: string) => {
    setClientInfoModal({
      isOpen: true,
      clientName: clientName
    });
  };

  const toggleReminder = (appointmentId: string) => {
    const newExpanded = new Set(expandedReminders);
    if (newExpanded.has(appointmentId)) {
      newExpanded.delete(appointmentId);
    } else {
      newExpanded.add(appointmentId);
    }
    setExpandedReminders(newExpanded);
  };

  const openSessionPrep = (eventId: string, clientName: string, appointmentTime: string) => {
    setSessionPrepModal({
      isOpen: true,
      eventId,
      clientName,
      appointmentTime
    });
  };

  const closeSessionPrep = () => {
    setSessionPrepModal({
      isOpen: false,
      eventId: '',
      clientName: '',
      appointmentTime: ''
    });
  };

  const generateAIInsights = async (eventId: string, clientName: string) => {
    try {
      const response = await fetch(`/api/session-prep/${eventId}/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: eventId })
      });

      if (response.ok) {
        toast({
          title: "AI Insights Generated",
          description: `Clinical insights generated for ${clientName}`,
        });
      } else {
        throw new Error('Failed to generate insights');
      }
    } catch (error) {
      console.error('AI insights generation error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: "Error",
        description: `Failed to generate AI insights: ${errorMessage}. Please try again.`,
        variant: "destructive",
      });
    }
  };

  // Delete appointment mutation
  const deleteAppointmentMutation = useMutation({
    mutationFn: (appointmentId: string) => ApiClient.cancelAppointment(appointmentId, "Cancelled by user"),
    onSuccess: () => {
      queryClient.invalidateQueries(['todays-appointments']);
      queryClient.invalidateQueries(['dashboard-stats']);
      toast({
        title: "Appointment deleted",
        description: "The appointment has been successfully cancelled.",
      });
      setDeleteDialogOpen(false);
      setAppointmentToDelete(null);
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete appointment. Please try again.",
        variant: "destructive",
      });
    }
  });

  const handleDeleteClick = (appointment: Appointment) => {
    setAppointmentToDelete(appointment);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = () => {
    if (appointmentToDelete) {
      deleteAppointmentMutation.mutate(appointmentToDelete.id);
    }
  };

  // Mock AI-generated reminder notes based on client name
  const generateReminderNotes = (clientName: string) => {
    const reminders = {
      'John Best': {
        lastSession: 'July 28, 2025',
        keyPoints: [
          'Discussed anxiety management techniques',
          'Homework: practice breathing exercises daily',
          'Progress with workplace stress reduction'
        ],
        nextFocus: 'Continue CBT techniques for anxiety, follow up on work situation',
        aiInsight: 'Client showing improved self-awareness. Consider introducing mindfulness practices.'
      },
      'Valentina Gjidoda': {
        lastSession: 'July 29, 2025',
        keyPoints: [
          'Explored relationship boundaries',
          'Identified triggers for emotional responses',
          'Discussed communication strategies'
        ],
        nextFocus: 'Role-play difficult conversations, review boundary-setting homework',
        aiInsight: 'Strong therapeutic rapport established. Client ready for deeper trauma work.'
      },
      'Karen Foster': {
        lastSession: 'July 30, 2025',
        keyPoints: [
          'Depression screening showed improvement',
          'Medication compliance discussed',
          'Social support system strengthening'
        ],
        nextFocus: 'Assess mood changes, discuss social activities plan',
        aiInsight: 'Notable improvement in mood. Consider reducing session frequency if progress continues.'
      },
      'Brian Kolsch': {
        lastSession: 'July 25, 2025',
        keyPoints: [
          'Anger management progress review',
          'Family dynamics discussion',
          'Coping strategies implementation'
        ],
        nextFocus: 'Practice new coping techniques, family session planning',
        aiInsight: 'Client struggling with implementation. May benefit from group therapy referral.'
      },
      'Noah Silverman': {
        lastSession: 'July 27, 2025',
        keyPoints: [
          'ADHD medication adjustment effects',
          'Work productivity improvements',
          'Organization strategies working well'
        ],
        nextFocus: 'Monitor medication effects, expand productivity systems',
        aiInsight: 'Excellent progress with ADHD management. Consider vocational counseling referral.'
      }
    };

    return reminders[clientName as keyof typeof reminders] || {
      lastSession: 'Previous session',
      keyPoints: ['Review previous session notes', 'Assess current goals'],
      nextFocus: 'Continue therapeutic work based on treatment plan',
      aiInsight: 'Maintain therapeutic rapport and assess progress toward goals.'
    };
  };

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
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const calculateDuration = (startTime: string, endTime: string) => {
    const start = new Date(startTime);
    const end = new Date(endTime);
    const durationMs = end.getTime() - start.getTime();
    const durationMinutes = Math.round(durationMs / (1000 * 60));
    return `${durationMinutes} min`;
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
          appointments.map((appointment) => {
            const clientName = appointment.clientId === 'calendar-event' 
              ? appointment.type.replace(' Appointment', '').trim()
              : appointment.clientName || appointment.type;
            const reminderNotes = generateReminderNotes(clientName);
            const isExpanded = expandedReminders.has(appointment.id);
            
            return (
              <div key={appointment.id} className="bg-therapy-bg rounded-lg overflow-hidden">
                <div className="flex items-center space-x-4 p-4">
                  <div className="w-12 h-12 bg-therapy-success text-white rounded-lg flex items-center justify-center font-bold">
                    <span className="text-sm">{formatTime(appointment.startTime)}</span>
                  </div>
                  <div className="flex-1">
                <h4 className="font-semibold text-therapy-text flex items-center gap-2">
                  {appointment.clientId === 'calendar-event' ? (
                    <>
                      <Calendar className="h-4 w-4 text-therapy-primary" />
                      <button 
                        onClick={() => handleClientNameClick(clientName)}
                        className="text-left hover:text-therapy-primary hover:underline transition-colors"
                      >
                        {clientName}
                      </button>
                    </>
                  ) : (
                    <button 
                      onClick={() => handleClientNameClick(clientName)}
                      className="text-left hover:text-therapy-primary hover:underline transition-colors"
                    >
                      {clientName}
                    </button>
                  )}
                </h4>
                <p className="text-therapy-text/60 text-sm">
                  {appointment.clientId === 'calendar-event' 
                    ? getCalendarLocationDisplay(appointment.startTime)
                    : appointment.type}
                </p>
                <div className="flex items-center space-x-2 mt-1">
                  <Badge className={getStatusColor(appointment.status)}>
                    {appointment.status.replace('_', ' ')}
                  </Badge>
                  <span className="text-xs text-therapy-text/50">
                    {appointment.clientId === 'calendar-event' ? 'Calendar Event' : calculateDuration(appointment.startTime, appointment.endTime)}
                  </span>
                </div>
                  </div>
                  <div className="flex space-x-2">
                {/* Session Prep Button */}
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="w-8 h-8 bg-blue-50 text-blue-600 hover:bg-blue-100"
                  onClick={() => openSessionPrep(
                    appointment.googleEventId || appointment.id, 
                    clientName, 
                    formatTime(appointment.startTime)
                  )}
                  title="Session Prep Notes"
                >
                  <NotebookPen className="h-4 w-4" />
                </Button>

                {/* AI Insights Button */}
                <Button 
                  size="icon" 
                  variant="ghost"
                  className="w-8 h-8 bg-purple-50 text-purple-600 hover:bg-purple-100"
                  onClick={() => generateAIInsights(
                    appointment.googleEventId || appointment.id, 
                    clientName
                  )}
                  title="AI Insights"
                >
                  <Brain className="h-4 w-4" />
                </Button>

                {/* Start/End Session Button */}
                {activeSession === appointment.id ? (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="w-8 h-8 bg-therapy-error/10 text-therapy-error hover:bg-therapy-error/20"
                    onClick={() => handleEndSession(appointment.id)}
                    title="End Session"
                  >
                    <Pause className="h-4 w-4" />
                  </Button>
                ) : (
                  <Button 
                    size="icon" 
                    variant="ghost"
                    className="w-8 h-8 bg-therapy-success/10 text-therapy-success hover:bg-therapy-success/20"
                    onClick={() => handleStartSession(appointment.id, appointment.type)}
                    title="Start Session"
                  >
                    <Play className="h-4 w-4" />
                  </Button>
                )}

                {/* Actions Dropdown Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button 
                      size="icon" 
                      variant="ghost"
                      className="w-8 h-8 bg-gray-100 text-gray-600 hover:bg-gray-200"
                      title="More Actions"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem 
                      onClick={() => {
                        if (appointment.clientId !== 'calendar-event') {
                          // For database appointments, navigate to edit
                          navigate(`/appointments`);
                        } else {
                          // For calendar events, inform user it's external
                          toast({
                            title: "Simple Practice Event",
                            description: "This appointment is from Simple Practice. Please edit it there.",
                          });
                        }
                      }}
                    >
                      <Edit className="h-4 w-4 mr-2" />
                      Edit Appointment
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        // Navigate to session notes for this appointment
                        navigate('/session-notes');
                      }}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      View Session Notes
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (appointment.clientId !== 'calendar-event') {
                          navigate('/clients');
                        } else {
                          toast({
                            title: "Calendar Event",
                            description: "This is a calendar event. Client profile not available.",
                          });
                        }
                      }}
                    >
                      <Users className="h-4 w-4 mr-2" />
                      Client Profile
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      onClick={() => {
                        toast({
                          title: "Video Call",
                          description: "Video call functionality will be available soon.",
                        });
                      }}
                    >
                      <Video className="h-4 w-4 mr-2" />
                      Join Video Call
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => {
                        if (appointment.clientId !== 'calendar-event') {
                          // For database appointments
                          navigate('/appointments');
                        } else {
                          toast({
                            title: "Simple Practice Event",
                            description: "Please reschedule this appointment in Simple Practice.",
                          });
                        }
                      }}
                    >
                      <Clock className="h-4 w-4 mr-2" />
                      Reschedule
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem 
                      className="text-red-600 hover:text-red-700 hover:bg-red-50"
                      onClick={() => {
                        if (appointment.clientId !== 'calendar-event') {
                          // For database appointments, allow deletion
                          handleDeleteClick(appointment);
                        } else {
                          toast({
                            title: "Simple Practice Event",
                            description: "This appointment is from Simple Practice. Please cancel it there.",
                          });
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Appointment
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                  </DropdownMenu>
                  </div>
                </div>
                
                {/* Reminder Notes Section */}
              <Collapsible open={isExpanded} onOpenChange={() => toggleReminder(appointment.id)}>
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="w-full justify-between p-2 text-therapy-primary hover:bg-therapy-primary/5"
                  >
                    <div className="flex items-center space-x-2">
                      <Lightbulb className="h-4 w-4" />
                      <span className="text-sm font-medium">Session Prep Notes</span>
                    </div>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="px-4 pb-4">
                  <div className="bg-therapy-primary/5 rounded-lg p-4 space-y-3">
                    <div>
                      <p className="text-xs text-therapy-text/60 mb-1">Last Session: {reminderNotes.lastSession}</p>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-semibold text-therapy-text mb-2">Key Points Covered:</h5>
                      <ul className="text-sm text-therapy-text/80 space-y-1">
                        {reminderNotes.keyPoints.map((point, index) => (
                          <li key={index} className="flex items-start space-x-2">
                            <span className="text-therapy-primary text-xs mt-1">•</span>
                            <span>{point}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <h5 className="text-sm font-semibold text-therapy-text mb-1">Today's Focus:</h5>
                      <p className="text-sm text-therapy-text/80">{reminderNotes.nextFocus}</p>
                    </div>
                    
                    <div className="border-t border-therapy-border pt-3">
                      <h5 className="text-sm font-semibold text-therapy-primary mb-1 flex items-center space-x-1">
                        <Lightbulb className="h-3 w-3" />
                        <span>AI Clinical Insight:</span>
                      </h5>
                      <p className="text-sm text-therapy-text/80 italic">{reminderNotes.aiInsight}</p>
                    </div>
                  </div>
                </CollapsibleContent>
                </Collapsible>
              </div>
            );
          })
        ) : (
          <div className="text-center py-8">
            <p className="text-therapy-text/60">No appointments scheduled for today</p>
            <p className="text-xs text-therapy-text/40 mt-2">
              {appointments === undefined ? 'Loading appointments...' : 'Connected to Google Calendar'}
            </p>
          </div>
        )}
      </div>

      <SessionPrepModal
        isOpen={sessionPrepModal.isOpen}
        onClose={closeSessionPrep}
        eventId={sessionPrepModal.eventId}
        clientName={sessionPrepModal.clientName}
        appointmentTime={sessionPrepModal.appointmentTime}
      />

      <ClientInfoModal
        clientName={clientInfoModal.clientName}
        isOpen={clientInfoModal.isOpen}
        onOpenChange={(open) => setClientInfoModal({ ...clientInfoModal, isOpen: open })}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Appointment</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this appointment with{" "}
              <span className="font-medium">
                {appointmentToDelete?.type}
              </span>
              {" "}scheduled for{" "}
              <span className="font-medium">
                {appointmentToDelete?.startTime && 
                  new Date(appointmentToDelete.startTime).toLocaleString()
                }
              </span>?
              <br /><br />
              This action cannot be undone. The appointment will be cancelled and marked as deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={deleteAppointmentMutation.isPending}
              className="bg-red-600 hover:bg-red-700"
            >
              {deleteAppointmentMutation.isPending ? "Deleting..." : "Delete Appointment"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
