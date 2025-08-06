import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { 
  User, 
  Calendar, 
  FileText, 
  Brain, 
  Upload,
  Clock,
  Activity,
  TrendingUp,
  AlertCircle,
  Trash2,
  Link
} from 'lucide-react';
import { DocumentProcessor } from '@/components/documents/DocumentProcessor';
import { SessionNoteLinkingModal } from '@/components/SessionNoteLinkingModal';

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
  source?: string;
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

export default function ClientChart() {
  const params = useParams<{ clientId: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: ['/api/clients', params.clientId],
    enabled: !!params.clientId
  });

  const { data: sessionNotes = [], isLoading: notesLoading } = useQuery<SessionNote[]>({
    queryKey: ['/api/session-notes/client', params.clientId],
    enabled: !!params.clientId
  });

  const { data: appointments = [], isLoading: appointmentsLoading } = useQuery<Appointment[]>({
    queryKey: ['/api/appointments/client', params.clientId],
    enabled: !!params.clientId
  });

  const { data: progressNotes = [] } = useQuery<any[]>({
    queryKey: ['/api/progress-notes/client', params.clientId],
    enabled: !!params.clientId
  });

  const handleDocumentProcessed = (document: any) => {
    // Refresh session notes after document is processed
    // This will be handled by the DocumentProcessor component
    console.log('Document processed:', document);
  };

  // Delete session note mutation
  const deleteSessionNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/session-notes/${noteId}`, {
        method: 'DELETE',
      });
      if (!response.ok) {
        throw new Error('Failed to delete session note');
      }
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-notes/client', params.clientId] });
      toast({
        title: "Session note deleted",
        description: "The session note has been successfully removed."
      });
    },
    onError: (error) => {
      console.error('Error deleting session note:', error);
      toast({
        title: "Error",
        description: "Failed to delete session note. Please try again.",
        variant: "destructive"
      });
    }
  });

  const handleDeleteSessionNote = (noteId: string, noteSource?: string) => {
    if (confirm(`Are you sure you want to delete this ${noteSource === 'document_upload' ? 'uploaded document' : 'session note'}? This action cannot be undone.`)) {
      deleteSessionNoteMutation.mutate(noteId);
    }
  };

  const handleLinkingComplete = () => {
    // Refresh all related data after linking
    queryClient.invalidateQueries({ queryKey: ['/api/session-notes/client', params.clientId] });
    queryClient.invalidateQueries({ queryKey: ['/api/appointments/client', params.clientId] });
  };

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Client not found</h2>
          <p className="text-gray-600">The client you're looking for doesn't exist.</p>
          <Button 
            onClick={() => setLocation('/clients')} 
            className="mt-4"
          >
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  const clientName = `${client.firstName} ${client.lastName}`;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button 
            variant="ghost" 
            onClick={() => setLocation('/clients')}
            className="text-gray-600 hover:text-gray-900"
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
              <h1 className="text-2xl font-bold text-gray-900">{clientName}</h1>
              <p className="text-gray-600">{client.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span>DOB: {new Date(client.dateOfBirth).toLocaleDateString()}</span>
                <span>Phone: {client.phone}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button size="sm">
              <FileText className="w-4 h-4 mr-2" />
              New Session Note
            </Button>
          </div>
        </div>
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="sessions">Session Notes</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {/* Quick Stats */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
                <Activity className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{sessionNotes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Last session: {sessionNotes[0] ? new Date(sessionNotes[0].createdAt).toLocaleDateString() : 'None'}
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Upcoming Appointments</CardTitle>
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {appointments.filter((apt: Appointment) => new Date(apt.startTime) > new Date()).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Next: {appointments.find((apt: Appointment) => new Date(apt.startTime) > new Date())?.startTime ? 
                    new Date(appointments.find((apt: Appointment) => new Date(apt.startTime) > new Date())!.startTime).toLocaleDateString() : 
                    'Not scheduled'
                  }
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Progress Notes</CardTitle>
                <TrendingUp className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{progressNotes.length}</div>
                <p className="text-xs text-muted-foreground">
                  Most recent therapeutic progress
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Activity</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionNotes.slice(0, 5).map((note: SessionNote) => (
                  <div key={note.id} className="flex items-start gap-3">
                    <div className="w-2 h-2 bg-blue-600 rounded-full mt-2"></div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Session Note</span>
                          <span className="text-xs text-gray-500">
                            {new Date(note.createdAt).toLocaleDateString()}
                          </span>
                          {note.source === 'document_upload' && (
                            <Badge variant="secondary" className="text-xs">
                              Uploaded Document
                            </Badge>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSessionNote(note.id, note.source)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50 h-auto p-1"
                          disabled={deleteSessionNoteMutation.isPending}
                          data-testid={`button-delete-recent-note-${note.id}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                      <p className="text-sm text-gray-600 line-clamp-2">
                        {note.content.substring(0, 100)}...
                      </p>
                      {note.aiTags && note.aiTags.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-2">
                          {note.aiTags.slice(0, 3).map((tag, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {tag}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {sessionNotes.length === 0 && (
                  <p className="text-gray-500 text-center py-4">No session notes yet</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Notes Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Session Notes History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {sessionNotes.map((note: SessionNote) => (
                  <div key={note.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-gray-500" />
                        <span className="font-medium">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </span>
                        {note.source === 'document_upload' && (
                          <Badge variant="secondary">
                            From: {note.originalFilename}
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-500">
                          {new Date(note.createdAt).toLocaleTimeString()}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSessionNote(note.id, note.source)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteSessionNoteMutation.isPending}
                          data-testid={`button-delete-note-${note.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </div>
                    
                    {note.aiTags && note.aiTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-3">
                        {note.aiTags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                    
                    <div className="prose prose-sm max-w-none">
                      <pre className="whitespace-pre-wrap text-sm text-gray-700 bg-gray-50 p-3 rounded">
                        {note.content}
                      </pre>
                    </div>
                  </div>
                ))}
                {sessionNotes.length === 0 && (
                  <p className="text-gray-500 text-center py-8">No session notes found</p>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          {/* Appointment Summary Stats */}
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
                  {appointments.filter(apt => 
                    sessionNotes.some(note => 
                      note.appointmentId === apt.id || 
                      (note.eventId && apt.googleEventId && note.eventId === apt.googleEventId)
                    )
                  ).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  appointments with notes
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Session Notes</CardTitle>
                <FileText className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {sessionNotes.length}
                </div>
                <p className="text-xs text-muted-foreground">
                  {sessionNotes.filter(note => !note.appointmentId && !note.eventId).length} unlinked to appointments
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
                <p className="text-xs text-muted-foreground">
                  notes per appointment
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Information Alert about Unlinked Notes */}
          {sessionNotes.filter(note => !note.appointmentId && !note.eventId).length > 0 && (
            <Card className="border-orange-200 bg-orange-50">
              <CardContent className="pt-6">
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-orange-800">Session Notes Not Linked to Appointments</h4>
                    <p className="text-sm text-orange-700 mt-1">
                      {sessionNotes.filter(note => !note.appointmentId && !note.eventId).length} of {sessionNotes.length} session notes 
                      are not connected to specific appointments. These notes exist in the system but don't appear 
                      with their corresponding appointments below.
                    </p>
                    <div className="flex gap-2 mt-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setActiveTab('sessions')}
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
                        <Link className="w-4 h-4 mr-2" />
                        Manage Linking
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment: Appointment) => {
                  // Check if there's a session note linked to this appointment
                  const linkedSessionNote = sessionNotes.find(note => 
                    note.appointmentId === appointment.id || 
                    (note.eventId && appointment.googleEventId && note.eventId === appointment.googleEventId)
                  );
                  
                  return (
                    <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <Calendar className="w-4 h-4 text-gray-500" />
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{appointment.title || appointment.type?.replace('_', ' ') || 'Appointment'}</p>
                            {linkedSessionNote && (
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
                          {linkedSessionNote && (
                            <p className="text-xs text-blue-600 mt-1">
                              Session note: {linkedSessionNote.content.substring(0, 80)}...
                            </p>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {linkedSessionNote ? (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setActiveTab('sessions')}
                            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50"
                            data-testid={`button-view-note-${appointment.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              // TODO: Implement create session note for this appointment
                              toast({
                                title: "Feature Coming Soon",
                                description: "Creating session notes for specific appointments will be available soon.",
                              });
                            }}
                            className="text-gray-400 hover:text-gray-600 hover:bg-gray-50"
                            data-testid={`button-add-note-${appointment.id}`}
                          >
                            <FileText className="w-4 h-4" />
                          </Button>
                        )}
                        <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                          {appointment.status || 'scheduled'}
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
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <DocumentProcessor
            clientId={params.clientId!}
            clientName={clientName}
            onDocumentProcessed={handleDocumentProcessed}
          />
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value="analytics" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="w-5 h-5" />
                AI-Powered Insights
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div>
                  <h4 className="font-medium mb-2">Therapeutic Progress</h4>
                  <p className="text-sm text-gray-600">
                    Based on session notes analysis, this client shows consistent engagement 
                    and progress indicators. Recent sessions focus on anxiety management and 
                    coping strategies.
                  </p>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Common Themes</h4>
                  <div className="flex flex-wrap gap-1">
                    <Badge variant="outline">anxiety</Badge>
                    <Badge variant="outline">coping-strategies</Badge>
                    <Badge variant="outline">CBT</Badge>
                    <Badge variant="outline">progress</Badge>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-medium mb-2">Session Frequency</h4>
                  <p className="text-sm text-gray-600">
                    Maintains regular weekly sessions with strong attendance. 
                    Recommended to continue current schedule.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Session Note Linking Modal */}
      <SessionNoteLinkingModal
        isOpen={isLinkingModalOpen}
        onClose={() => setIsLinkingModalOpen(false)}
        clientId={params.clientId!}
        sessionNotes={sessionNotes}
        appointments={appointments}
        onLinkingComplete={handleLinkingComplete}
      />
    </div>
  );
}