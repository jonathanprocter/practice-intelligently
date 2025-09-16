import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ApiClient } from "@/lib/api";
import { format, parseISO, differenceInDays, differenceInMonths } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { 
  Calendar, Clock, FileText, TrendingUp, User, Brain, 
  ChevronDown, ChevronUp, MessageSquare, Target, Activity,
  BarChart3, CalendarDays, Heart, AlertCircle, CheckCircle2
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ClientProgressTimelineProps {
  clientId: string;
  clientName?: string;
}

interface TimelineEvent {
  id: string;
  date: Date;
  type: 'appointment' | 'note' | 'insight' | 'milestone';
  title: string;
  description?: string;
  status?: string;
  sessionNote?: {
    id: string;
    content: string;
    createdAt: string;
  };
  metrics?: {
    progress?: number;
    mood?: string;
    engagement?: number;
  };
  aiInsights?: Array<{
    id: string;
    title: string;
    content: string;
    confidence?: number;
  }>;
}

export default function ClientProgressTimeline({ clientId, clientName }: ClientProgressTimelineProps) {
  const [expandedEvents, setExpandedEvents] = useState<Set<string>>(new Set());
  const [timeRange, setTimeRange] = useState<'all' | 'year' | '6months' | '3months'>('all');
  
  // Fetch all appointments for this client
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['client-appointments', clientId],
    queryFn: () => ApiClient.getAppointmentsByClient(clientId),
    enabled: !!clientId,
  });

  // Fetch all session notes for this client
  const { data: sessionNotes, isLoading: notesLoading } = useQuery({
    queryKey: ['client-session-notes', clientId],
    queryFn: () => ApiClient.getSessionNotesByClient(clientId),
    enabled: !!clientId,
  });

  // Fetch AI insights for this client
  const { data: aiInsights, isLoading: insightsLoading } = useQuery({
    queryKey: ['client-ai-insights', clientId],
    queryFn: () => ApiClient.getAiInsightsByClient(clientId),
    enabled: !!clientId,
  });

  // Calculate therapy metrics
  const therapyMetrics = useMemo(() => {
    if (!appointments) return null;
    
    const sortedAppointments = [...appointments].sort((a, b) => 
      new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
    );
    
    const firstSession = sortedAppointments[0];
    const lastSession = sortedAppointments[sortedAppointments.length - 1];
    const completedSessions = appointments.filter(apt => apt.status === 'completed').length;
    const cancelledSessions = appointments.filter(apt => apt.status === 'cancelled').length;
    const upcomingSessions = appointments.filter(apt => new Date(apt.startTime) > new Date()).length;
    
    const therapyDuration = firstSession && lastSession
      ? differenceInMonths(new Date(lastSession.startTime), new Date(firstSession.startTime))
      : 0;
    
    const attendanceRate = appointments.length > 0 
      ? Math.round((completedSessions / (completedSessions + cancelledSessions)) * 100)
      : 0;
    
    return {
      totalSessions: appointments.length,
      completedSessions,
      cancelledSessions,
      upcomingSessions,
      therapyDuration,
      attendanceRate,
      firstSessionDate: firstSession?.startTime,
      lastSessionDate: lastSession?.startTime,
    };
  }, [appointments]);

  // Create unified timeline
  const timeline = useMemo(() => {
    const events: TimelineEvent[] = [];
    
    // Add appointments to timeline
    appointments?.forEach(apt => {
      const sessionNote = sessionNotes?.find(note => 
        note.appointmentId === apt.id || note.eventId === apt.id
      );
      
      events.push({
        id: apt.id,
        date: new Date(apt.startTime),
        type: 'appointment',
        title: `${apt.type} - ${apt.status}`,
        description: apt.notes,
        status: apt.status,
        sessionNote,
        aiInsights: aiInsights?.filter(insight => 
          insight.metadata?.appointmentId === apt.id
        ),
      });
    });
    
    // Add standalone session notes
    sessionNotes?.forEach(note => {
      if (!note.appointmentId) {
        events.push({
          id: note.id,
          date: new Date(note.sessionDate || note.createdAt),
          type: 'note',
          title: note.title || 'Progress Note',
          description: note.narrativeSummary || note.content,
          sessionNote: note,
        });
      }
    });
    
    // Sort by date (newest first)
    events.sort((a, b) => b.date.getTime() - a.date.getTime());
    
    // Filter by time range
    const now = new Date();
    const filtered = events.filter(event => {
      if (timeRange === 'all') return true;
      const monthsAgo = timeRange === 'year' ? 12 : timeRange === '6months' ? 6 : 3;
      const cutoffDate = new Date(now.setMonth(now.getMonth() - monthsAgo));
      return event.date >= cutoffDate;
    });
    
    return filtered;
  }, [appointments, sessionNotes, aiInsights, timeRange]);

  const toggleEventExpansion = (eventId: string) => {
    setExpandedEvents(prev => {
      const next = new Set(prev);
      if (next.has(eventId)) {
        next.delete(eventId);
      } else {
        next.add(eventId);
      }
      return next;
    });
  };

  if (appointmentsLoading || notesLoading || insightsLoading) {
    return <div className="space-y-4">
      {[1, 2, 3].map(i => <Skeleton key={i} className="h-24 w-full" />)}
    </div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with client name and summary */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-primary" />
              <CardTitle className="text-2xl">
                {clientName || 'Client'} - Complete Therapy Journey
              </CardTitle>
            </div>
            <Badge variant="outline" className="text-lg px-3 py-1">
              {therapyMetrics?.totalSessions || 0} Total Sessions
            </Badge>
          </div>
        </CardHeader>
        
        <CardContent>
          {/* Therapy Metrics Overview */}
          {therapyMetrics && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="flex flex-col space-y-1 border rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Duration</span>
                <span className="text-xl font-semibold">
                  {therapyMetrics.therapyDuration} months
                </span>
              </div>
              
              <div className="flex flex-col space-y-1 border rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Completed</span>
                <span className="text-xl font-semibold text-green-600">
                  {therapyMetrics.completedSessions}
                </span>
              </div>
              
              <div className="flex flex-col space-y-1 border rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Upcoming</span>
                <span className="text-xl font-semibold text-blue-600">
                  {therapyMetrics.upcomingSessions}
                </span>
              </div>
              
              <div className="flex flex-col space-y-1 border rounded-lg p-3">
                <span className="text-sm text-muted-foreground">Attendance</span>
                <div className="flex items-center gap-2">
                  <Progress value={therapyMetrics.attendanceRate} className="flex-1" />
                  <span className="text-sm font-semibold">
                    {therapyMetrics.attendanceRate}%
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Time Range Filter */}
          <div className="flex gap-2 mb-4">
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('all')}
            >
              All Time
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('year')}
            >
              Past Year
            </Button>
            <Button
              variant={timeRange === '6months' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('6months')}
            >
              6 Months
            </Button>
            <Button
              variant={timeRange === '3months' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTimeRange('3months')}
            >
              3 Months
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Timeline */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CalendarDays className="h-5 w-5" />
            Session Timeline
          </CardTitle>
        </CardHeader>
        
        <CardContent>
          <ScrollArea className="h-[600px] pr-4">
            <div className="relative">
              {/* Timeline line */}
              <div className="absolute left-6 top-0 bottom-0 w-0.5 bg-border" />
              
              {/* Timeline events */}
              <div className="space-y-4">
                {timeline.map((event, index) => {
                  const isExpanded = expandedEvents.has(event.id);
                  const isUpcoming = event.date > new Date();
                  const isPast = event.date < new Date();
                  
                  return (
                    <div key={event.id} className="relative flex items-start gap-4">
                      {/* Timeline dot */}
                      <div className={cn(
                        "relative z-10 mt-1.5 h-3 w-3 rounded-full border-2 bg-background",
                        event.type === 'appointment' && event.status === 'completed' 
                          ? "border-green-500 bg-green-500"
                          : event.type === 'appointment' && event.status === 'cancelled'
                          ? "border-red-500 bg-red-500"
                          : isUpcoming 
                          ? "border-blue-500 bg-blue-500"
                          : "border-gray-400 bg-gray-400"
                      )} />
                      
                      {/* Event card */}
                      <Card className="flex-1 cursor-pointer hover:shadow-md transition-shadow"
                            onClick={() => toggleEventExpansion(event.id)}>
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                {event.type === 'appointment' && <Calendar className="h-4 w-4" />}
                                {event.type === 'note' && <FileText className="h-4 w-4" />}
                                {event.type === 'insight' && <Brain className="h-4 w-4" />}
                                
                                <span className="font-semibold">{event.title}</span>
                                
                                {event.status && (
                                  <Badge variant={
                                    event.status === 'completed' ? 'default' :
                                    event.status === 'cancelled' ? 'destructive' :
                                    event.status === 'scheduled' ? 'secondary' : 'outline'
                                  }>
                                    {event.status}
                                  </Badge>
                                )}
                              </div>
                              
                              <div className="text-sm text-muted-foreground mb-2">
                                {format(event.date, 'EEEE, MMMM d, yyyy - h:mm a')}
                              </div>
                              
                              {event.description && (
                                <p className="text-sm text-muted-foreground line-clamp-2">
                                  {event.description}
                                </p>
                              )}
                              
                              {/* Expanded content */}
                              {isExpanded && (
                                <div className="mt-4 space-y-4 border-t pt-4">
                                  {/* Session Note */}
                                  {event.sessionNote && (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold flex items-center gap-2">
                                        <FileText className="h-4 w-4" />
                                        Progress Note
                                      </h4>
                                      
                                      {event.sessionNote.subjective && (
                                        <div>
                                          <span className="font-medium">Subjective:</span>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {event.sessionNote.subjective}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {event.sessionNote.objective && (
                                        <div>
                                          <span className="font-medium">Objective:</span>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {event.sessionNote.objective}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {event.sessionNote.assessment && (
                                        <div>
                                          <span className="font-medium">Assessment:</span>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {event.sessionNote.assessment}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {event.sessionNote.plan && (
                                        <div>
                                          <span className="font-medium">Plan:</span>
                                          <p className="text-sm text-muted-foreground mt-1">
                                            {event.sessionNote.plan}
                                          </p>
                                        </div>
                                      )}
                                      
                                      {event.sessionNote.keyPoints && event.sessionNote.keyPoints.length > 0 && (
                                        <div>
                                          <span className="font-medium">Key Points:</span>
                                          <ul className="list-disc list-inside text-sm text-muted-foreground mt-1">
                                            {event.sessionNote.keyPoints.map((point: string, i: number) => (
                                              <li key={i}>{point}</li>
                                            ))}
                                          </ul>
                                        </div>
                                      )}
                                    </div>
                                  )}
                                  
                                  {/* AI Insights */}
                                  {event.aiInsights && event.aiInsights.length > 0 && (
                                    <div className="space-y-2">
                                      <h4 className="font-semibold flex items-center gap-2">
                                        <Brain className="h-4 w-4" />
                                        AI Insights
                                      </h4>
                                      {event.aiInsights.map((insight: any, i: number) => (
                                        <div key={i} className="bg-muted/50 rounded-lg p-3">
                                          <p className="text-sm">{insight.content}</p>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                            
                            <Button variant="ghost" size="sm">
                              {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  );
                })}
                
                {timeline.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No sessions recorded yet
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </CardContent>
      </Card>
    </div>
  );
}