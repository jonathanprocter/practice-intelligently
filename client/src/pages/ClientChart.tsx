import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  User,
  Calendar,
  FileText,
  Upload,
  Clock,
  TrendingUp,
  AlertCircle,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  Edit2,
} from 'lucide-react';

import { DocumentProcessor } from '@/components/documents/DocumentProcessor';
import { SessionNoteLinkingModal } from '@/components/SessionNoteLinkingModal';
import { SessionRecommendations } from '@/components/SessionRecommendations';
import { CreateSessionNoteModal } from '@/components/CreateSessionNoteModal';
import EditableClientInfo from '@/components/clients/EditableClientInfo';

/* =======================
   Types
======================= */

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes?: string;
}

interface SessionNote {
  id: string;
  appointmentId?: string;
  eventId?: string;
  clientId: string;
  therapistId: string;
  content: string;
  createdAt: string;
  aiTags?: string[];
  source?: 'document_upload' | 'manual' | string;
  originalFilename?: string;
}

interface Appointment {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  type: string;
  status?: string;
  location?: string;
  googleEventId?: string;
  hasSessionNote?: boolean;
}

/* =======================
   Constants / Utils
======================= */

const TABS = {
  TIMELINE: 'timeline',
  SESSIONS: 'sessions',
  APPTS: 'appointments',
  DOCS: 'documents',
  RECS: 'recommendations',
} as const;

function safeDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function preview(text: string, max = 200) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(msg || `Request failed: ${r.status}`);
  }
  return (await r.json()) as T;
}

const qKeys = {
  client: (id: string) => ['/api/clients', id] as const,
  notes: (id: string) => ['/api/session-notes/client', id] as const,
  appts: (id: string) => ['/api/appointments/client', id] as const,
  pnotes: (id: string) => ['/api/progress-notes/client', id] as const,
};

/* =======================
   Small Reusable UI
======================= */

function HeaderSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48 mb-1" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function StatRow({ label, value, accent }: { label: string; value: React.ReactNode; accent?: boolean }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-xs text-gray-600">{label}</span>
      <span className={`font-semibold ${accent ? 'text-blue-600' : ''}`}>{value}</span>
    </div>
  );
}

function LabeledBadge({ children, variant = 'outline' as any, className = '' }) {
  return <Badge variant={variant} className={className}>{children}</Badge>;
}

function ReadMore({ text, max = 500 }: { text: string; max?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  if (text.length <= max) return <>{text}</>;
  return (
    <>
      {expanded ? text : text.slice(0, max) + '…'}
      <Button variant="link" className="h-auto p-0 ml-2" onClick={() => setExpanded(v => !v)} aria-label="Toggle full note">
        {expanded ? 'Show less' : 'Read more'}
      </Button>
    </>
  );
}

/* =======================
   Main Component
======================= */

export default function ClientChart() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId!;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = React.useState<typeof TABS[keyof typeof TABS]>(TABS.TIMELINE);

  const [isLinkingModalOpen, setIsLinkingModalOpen] = React.useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [isEditingHeader, setIsEditingHeader] = React.useState(false);

  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Queries with explicit queryFn
  const {
    data: client,
    isLoading: clientLoading,
    error: clientErr,
  } = useQuery({
    queryKey: qKeys.client(clientId),
    queryFn: () => api<Client>(`/api/clients/${clientId}`),
    enabled: !!clientId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const {
    data: sessionNotes = [],
    isLoading: notesLoading,
    error: notesErr,
  } = useQuery({
    queryKey: qKeys.notes(clientId),
    queryFn: () => api<SessionNote[]>(`/api/session-notes/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  const {
    data: appointments = [],
    isLoading: appointmentsLoading,
    error: apptsErr,
  } = useQuery({
    queryKey: qKeys.appts(clientId),
    queryFn: () => api<Appointment[]>(`/api/appointments/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  // Optional progress notes if you need them later
  useQuery({
    queryKey: qKeys.pnotes(clientId),
    queryFn: () => api<any[]>(`/api/progress-notes/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  // Build fast lookups
  const appointmentIdByEventId = React.useMemo(() => {
    const m = new Map<string, string>();
    appointments.forEach(a => a.googleEventId && m.set(a.googleEventId, a.id));
    return m;
  }, [appointments]);

  const notesByAppointmentId = React.useMemo(() => {
    const m = new Map<string, SessionNote[]>();
    sessionNotes.forEach(n => {
      const id = n.appointmentId ?? (n.eventId ? appointmentIdByEventId.get(n.eventId) : undefined);
      if (id) m.set(id, [...(m.get(id) ?? []), n]);
    });
    return m;
  }, [sessionNotes, appointmentIdByEventId]);

  const hasNoteFor = React.useCallback((appt: Appointment) => notesByAppointmentId.has(appt.id), [notesByAppointmentId]);

  // Timeline data
  const timelineData = React.useMemo(() => {
    const apptItems = appointments.map(apt => ({
      type: 'appointment' as const,
      date: new Date(apt.startTime),
      title: apt.title || 'Appointment',
      data: apt,
      hasNote: hasNoteFor(apt),
    }));

    const noteItems = sessionNotes.map(note => {
      const firstLine = note.content?.split('\n')[0] ?? 'Session Note';
      const title = firstLine.slice(0, 100) + (firstLine.length > 100 ? '…' : '');
      return {
        type: 'session-note' as const,
        date: new Date(note.createdAt),
        title,
        data: note,
        hasNote: true,
      };
    });

    return [...apptItems, ...noteItems].sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments, sessionNotes, hasNoteFor]);

  // Mutation: delete session note with optimistic update + undo
  const deleteSessionNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/session-notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete session note');
      return response.json();
    },
    onMutate: async (noteId: string) => {
      await queryClient.cancelQueries({ queryKey: qKeys.notes(clientId) });
      const prev = queryClient.getQueryData<SessionNote[]>(qKeys.notes(clientId)) || [];
      queryClient.setQueryData<SessionNote[]>(qKeys.notes(clientId), (old = []) => old.filter(n => n.id !== noteId));

      toast({
        title: 'Session note deleted',
        description: 'You can undo this action.',
        action: <ToastAction altText="Undo" onClick={() => queryClient.setQueryData(qKeys.notes(clientId), prev)}>Undo</ToastAction>,
      });

      return { prev };
    },
    onError: (_err, _noteId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qKeys.notes(clientId), ctx.prev);
      toast({
        title: 'Error',
        description: 'Failed to delete session note. Please try again.',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
      queryClient.invalidateQueries({ queryKey: qKeys.appts(clientId) });
    },
  });

  const handleDeleteSessionNote = (noteId: string) => setPendingDeleteId(noteId);

  const confirmDelete = () => {
    if (pendingDeleteId) {
      deleteSessionNoteMutation.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const handleLinkingComplete = () => {
    queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
    queryClient.invalidateQueries({ queryKey: qKeys.appts(clientId) });
  };

  const handleDocumentProcessed = () => {
    // avoid logging PHI
    queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
  };

  if (clientLoading) return <HeaderSkeleton />;

  if (clientErr || !client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Client not found</h2>
          <p className="text-gray-600">The client you&apos;re looking for doesn&apos;t exist.</p>
          <Button onClick={() => setLocation('/clients')} className="mt-4">
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const clientName = `${client.firstName} ${client.lastName}`;
  const dob = safeDate(client.dateOfBirth);

  const upcomingCount = React.useMemo(() => {
    const now = Date.now();
    return appointments.filter(apt => new Date(apt.startTime).getTime() > now).length;
  }, [appointments]);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/clients')}
            className="text-gray-600 hover:text-gray-900"
            aria-label="Back to Clients"
          >
            ← Back to Clients
          </Button>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-client-name">
                {clientName}
              </h1>
              <p className="text-gray-600" data-testid="text-client-email">
                {client.email}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span data-testid="text-client-dob">DOB: {dob ? dob.toLocaleDateString() : '—'}</span>
                <span data-testid="text-client-phone">Phone: {client.phone}</span>
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingHeader(v => !v)}
              data-testid="button-edit-client-header"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditingHeader ? 'Cancel Edit' : 'Edit Info'}
            </Button>
            <Button variant="outline" size="sm" aria-label="Schedule Appointment">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button size="sm" onClick={() => setIsCreateNoteModalOpen(true)} aria-label="New Session Note">
              <FileText className="w-4 h-4 mr-2" />
              New Session Note
            </Button>
          </div>
        </div>

        {isEditingHeader && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <EditableClientInfo client={client} mode="compact" />
          </div>
        )}
      </div>

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof TABS[keyof typeof TABS])} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value={TABS.TIMELINE}>Timeline</TabsTrigger>
          <TabsTrigger value={TABS.SESSIONS}>Session Notes</TabsTrigger>
          <TabsTrigger value={TABS.APPTS}>Appointments</TabsTrigger>
          <TabsTrigger value={TABS.DOCS}>Documents</TabsTrigger>
          <TabsTrigger value={TABS.RECS}>AI Insights</TabsTrigger>
        </TabsList>

        {/* Timeline */}
        <TabsContent value={TABS.TIMELINE} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Clinical Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <StatRow label="Total Sessions" value={sessionNotes.length} />
                  <StatRow label="Appointments" value={appointments.length} />
                  <StatRow label="Upcoming" value={upcomingCount} accent />
                  <StatRow
                    label="Last Contact"
                    value={timelineData[0] ? timelineData[0].date.toLocaleDateString() : 'N/A'}
                  />
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  <Button
                    size="sm"
                    className="w-full justify-start"
                    onClick={() => setIsCreateNoteModalOpen(true)}
                    data-testid="button-create-session-note"
                  >
                    <FileText className="w-4 h-4 mr-2" />
                    New Session Note
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    data-testid="button-schedule-appointment"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Schedule Appointment
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full justify-start"
                    onClick={() => setActiveTab(TABS.DOCS)}
                    data-testid="button-upload-document"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main timeline */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Clinical Timeline</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      Complete appointment and session history
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {appointmentsLoading && notesLoading ? (
                    <div className="space-y-4">
                      {Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="flex items-start gap-4">
                          <Skeleton className="w-12 h-12 rounded-full" />
                          <div className="flex-1">
                            <Skeleton className="h-6 w-48 mb-2" />
                            <Skeleton className="h-4 w-80 mb-2" />
                            <Skeleton className="h-20 w-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : timelineData.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">No clinical history found</h3>
                      <p className="text-gray-600 mb-4">Start by creating a session note or scheduling an appointment.</p>
                      <Button onClick={() => setIsCreateNoteModalOpen(true)}>
                        <FileText className="w-4 h-4 mr-2" />
                        Create First Session Note
                      </Button>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {timelineData.map((item, index) => (
                        <div key={`${item.type}-${(item as any).data.id}`} className="relative">
                          {/* Timeline line */}
                          {index < timelineData.length - 1 && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
                          )}

                          <div className="flex items-start gap-4">
                            {/* Dot */}
                            <div
                              className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
                                item.type === 'appointment'
                                  ? item.hasNote
                                    ? 'bg-green-600'
                                    : 'bg-blue-600'
                                  : 'bg-purple-600'
                              }`}
                            >
                              {item.type === 'appointment' ? (
                                item.hasNote ? <CheckCircle2 className="w-6 h-6" /> : <Calendar className="w-6 h-6" />
                              ) : (
                                <FileText className="w-6 h-6" />
                              )}
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-900">
                                        {item.type === 'appointment'
                                          ? (item as any).data.title || 'Therapy Appointment'
                                          : 'Session Note'}
                                      </h4>
                                      <LabeledBadge variant={item.type === 'appointment' ? 'default' : 'secondary'}>
                                        {item.type === 'appointment' ? 'Appointment' : 'Note'}
                                      </LabeledBadge>
                                      {item.type === 'appointment' && item.hasNote && (
                                        <LabeledBadge variant="outline" className="text-green-600 border-green-600">
                                          Has Note
                                        </LabeledBadge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {dateFmt.format(item.date)}
                                      {item.type === 'appointment' && (
                                        <span className="ml-2">
                                          {timeFmt.format(new Date((item as any).data.startTime))}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  <div className="flex items-center gap-2">
                                    {item.type === 'session-note' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSessionNote((item as any).data.id)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={deleteSessionNoteMutation.isPending}
                                        aria-label="Delete session note"
                                        data-testid={`button-delete-timeline-note-${(item as any).data.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Content preview */}
                                {item.type === 'session-note' && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-700">
                                      <ReadMore text={(item as any).data.content} max={500} />
                                    </p>
                                    {(item as any).data.aiTags?.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {(item as any).data.aiTags.slice(0, 4).map((tag: string, tagIndex: number) => (
                                          <Badge key={tagIndex} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                        {(item as any).data.aiTags.length > 4 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{(item as any).data.aiTags.length - 4} more
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                    {(item as any).data.source === 'document_upload' && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Upload className="w-3 h-3" />
                                        Uploaded Document
                                        {(item as any).data.originalFilename && (
                                          <span>: {(item as any).data.originalFilename}</span>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                )}

                                {item.type === 'appointment' && (
                                  <div className="space-y-2">
                                    <div className="grid grid-cols-2 gap-4 text-sm">
                                      <div>
                                        <span className="text-gray-600">Type:</span>
                                        <span className="ml-1 font-medium">{(item as any).data.type || 'Therapy'}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Status:</span>
                                        <span className="ml-1 font-medium">{(item as any).data.status || 'Scheduled'}</span>
                                      </div>
                                      {(item as any).data.location && (
                                        <div className="col-span-2">
                                          <span className="text-gray-600">Location:</span>
                                          <span className="ml-1">{(item as any).data.location}</span>
                                        </div>
                                      )}
                                    </div>
                                    {!item.hasNote &&
                                      new Date((item as any).data.startTime).getTime() < Date.now() && (
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => {
                                            setSelectedAppointment((item as any).data);
                                            setIsCreateNoteModalOpen(true);
                                          }}
                                          className="mt-2"
                                          data-testid={`button-add-note-to-appointment-${(item as any).data.id}`}
                                        >
                                          <FileText className="w-4 h-4 mr-2" />
                                          Add Session Note
                                        </Button>
                                      )}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Session Notes */}
        <TabsContent value={TABS.SESSIONS} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Session Notes</h2>
              <p className="text-sm text-gray-600">{sessionNotes.length} total session notes</p>
            </div>
            <Button onClick={() => setIsCreateNoteModalOpen(true)} aria-label="Create new session note">
              <FileText className="w-4 h-4 mr-2" />
              New Session Note
            </Button>
          </div>

          {notesLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-44 mb-2" />
                    <Skeleton className="h-4 w-64 mb-3" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessionNotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No session notes found</h3>
                <p className="text-gray-600 mb-4">Create your first session note for this client.</p>
                <Button onClick={() => setIsCreateNoteModalOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Session Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessionNotes.map((note) => {
                const linkedAppointment = appointments.find(
                  (apt) =>
                    apt.id === note.appointmentId ||
                    (apt.googleEventId && note.eventId && apt.googleEventId === note.eventId),
                );
                const displayDate = linkedAppointment
                  ? new Date(linkedAppointment.startTime)
                  : new Date(note.createdAt);
                const dateLabel = linkedAppointment ? 'Session Date' : 'Created';

                return (
                  <Card key={note.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">Session Note</h3>
                            {note.source === 'document_upload' && (
                              <Badge variant="secondary">
                                <Upload className="w-3 h-3 mr-1" />
                                Uploaded Document
                              </Badge>
                            )}
                            {linkedAppointment && (
                              <Badge variant="outline">
                                <Calendar className="w-3 h-3 mr-1" />
                                Linked to Appointment
                              </Badge>
                            )}
                          </div>
                          <div className="text-sm text-gray-600 mb-3" title={dateLabel}>
                            {displayDate.toLocaleDateString()}
                            {note.originalFilename && <span className="ml-3">File: {note.originalFilename}</span>}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSessionNote(note.id)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteSessionNoteMutation.isPending}
                          aria-label="Delete session note"
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                          <ReadMore text={note.content} max={600} />
                        </div>
                      </div>

                      {note.aiTags && note.aiTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-4">
                          {note.aiTags.map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Appointments */}
        <TabsContent value={TABS.APPTS} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Appointments</h2>
              <p className="text-sm text-gray-600">{appointments.length} total appointments</p>
            </div>
            <Button variant="outline" aria-label="Schedule new appointment">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule New
            </Button>
          </div>

          {appointmentsLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-64 mb-3" />
                    <Skeleton className="h-4 w-80 mb-2" />
                    <Skeleton className="h-4 w-72" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : appointments.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600 mb-4">Schedule the first appointment for this client.</p>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              {/* Summary cards */}
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Appointments</CardTitle>
                    <Calendar className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold">{appointments.length}</div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Linked Notes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-600">
                      {appointments.filter(a => hasNoteFor(a)).length}
                    </div>
                    <p className="text-xs text-muted-foreground">appointments with notes</p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Total Session Notes</CardTitle>
                    <FileText className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-blue-600">{sessionNotes.length}</div>
                    <p className="text-xs text-muted-foreground">
                      {sessionNotes.filter(n => !n.appointmentId && !n.eventId).length} unlinked to appointments
                    </p>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Coverage Rate</CardTitle>
                    <TrendingUp className="h-4 w-4 text-muted-foreground" />
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-purple-600">
                      {appointments.length > 0 ? Math.round((sessionNotes.length / appointments.length) * 100) : 0}%
                    </div>
                    <p className="text-xs text-muted-foreground">notes per appointment</p>
                  </CardContent>
                </Card>
              </div>

              {/* Info about unlinked notes */}
              {sessionNotes.filter(n => !n.appointmentId && !n.eventId).length > 0 ? (
                <Card className="border-orange-200 bg-orange-50">
                  <CardContent className="pt-6">
                    <div className="flex items-start gap-3">
                      <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                      <div>
                        <h4 className="font-medium text-orange-800">Session Notes Not Linked to Appointments</h4>
                        <p className="text-sm text-orange-700 mt-1">
                          {
                            sessionNotes.filter(n => !n.appointmentId && !n.eventId)
                              .length
                          } of {sessionNotes.length} session notes are not connected to specific appointments.
                        </p>
                        <div className="flex gap-2 mt-3">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setActiveTab(TABS.SESSIONS)}
                            className="text-orange-700 border-orange-300 hover:bg-orange-100"
                          >
                            View All Session Notes
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsLinkingModalOpen(true)}
                            className="text-orange-700 border-orange-300 hover:bg-orange-100"
                            data-testid="button-manage-linking"
                          >
                            <LinkIcon className="w-4 h-4 mr-2" />
                            Manage Linking
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ) : sessionNotes.length > 0 ? (
                <Card className="border-green-200 bg-green-50">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="w-5 h-5 text-green-600" />
                      <div className="flex-1">
                        <h4 className="font-medium text-green-800">All Notes Properly Linked</h4>
                        <p className="text-sm text-green-700">
                          Excellent! All {sessionNotes.length} session notes are linked to their corresponding appointments.
                        </p>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setIsLinkingModalOpen(true)}
                        className="text-green-700 border-green-300 hover:bg-green-100"
                        data-testid="button-manage-linking"
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Manage Linking
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ) : null}

              {/* Appointment list */}
              <Card>
                <CardHeader>
                  <CardTitle>Appointment History</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {appointments.map((appointment) => {
                      const linked = hasNoteFor(appointment);
                      const isPast = new Date(appointment.startTime).getTime() < Date.now();

                      return (
                        <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <Calendar className="w-4 h-4 text-gray-500" />
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-medium">
                                  {appointment.title || appointment.type?.replace('_', ' ') || 'Appointment'}
                                </p>
                                {linked && (
                                  <Badge variant="outline" className="text-xs bg-green-50 text-green-700 border-green-200">
                                    <FileText className="w-3 h-3 mr-1" />
                                    Note
                                  </Badge>
                                )}
                              </div>
                              <p className="text-sm text-gray-500">
                                {new Date(appointment.startTime).toLocaleString()}
                              </p>
                              {appointment.location && (
                                <p className="text-xs text-gray-400">{appointment.location}</p>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!linked && isPast ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedAppointment(appointment);
                                  setIsCreateNoteModalOpen(true);
                                }}
                                aria-label="Add note to appointment"
                                data-testid={`button-add-note-${appointment.id}`}
                              >
                                <FileText className="w-4 h-4 mr-2" />
                                Add Note
                              </Button>
                            ) : linked ? (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => setActiveTab(TABS.SESSIONS)}
                                className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                                aria-label="View linked note"
                                data-testid={`button-view-note-${appointment.id}`}
                              >
                                <FileText className="w-4 h-4" />
                              </Button>
                            ) : null}
                            <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                              {appointment.status || (isPast ? 'completed' : 'scheduled')}
                            </Badge>
                          </div>
                        </div>
                      );
                    })}
                    {appointments.length === 0 && (
                      <p className="text-gray-500 text-center py-8">No appointments found</p>
                    )}
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </TabsContent>

        {/* Documents */}
        <TabsContent value={TABS.DOCS} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Document Upload & Processing</h2>
            <p className="text-sm text-gray-600">Upload clinical documents for AI processing and automatic session note generation.</p>
          </div>

          <DocumentProcessor
            clientId={clientId}
            clientName={clientName}
            onDocumentProcessed={handleDocumentProcessed}
          />
        </TabsContent>

        {/* AI Insights */}
        <TabsContent value={TABS.RECS} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">AI Insights & Recommendations</h2>
            <p className="text-sm text-gray-600">AI-powered therapeutic insights based on session history.</p>
          </div>

          <SessionRecommendations clientId={clientId} sessionNotes={sessionNotes} />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isCreateNoteModalOpen && (
        <CreateSessionNoteModal
          isOpen={isCreateNoteModalOpen}
          onClose={() => {
            setIsCreateNoteModalOpen(false);
            setSelectedAppointment(null);
          }}
          clientId={clientId}
          clientName={clientName}
          selectedAppointment={selectedAppointment}
        />
      )}

      {isLinkingModalOpen && (
        <SessionNoteLinkingModal
          isOpen={isLinkingModalOpen}
          onClose={() => setIsLinkingModalOpen(false)}
          clientId={clientId}
          onLinkingComplete={handleLinkingComplete}
        />
      )}

      {/* Accessible Delete Confirm */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the session note. You can undo immediately after deletion from the toast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}