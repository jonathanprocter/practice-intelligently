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
  Link,
  CheckCircle2,
  Edit2
} from 'lucide-react';
import { DocumentProcessor } from '@/components/documents/DocumentProcessor';
import { SessionNoteLinkingModal } from '@/components/SessionNoteLinkingModal';
import { SessionRecommendations } from '@/components/SessionRecommendations';
import { CreateSessionNoteModal } from '@/components/CreateSessionNoteModal';
import EditableClientInfo from '@/components/clients/EditableClientInfo';

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
  const [activeTab, setActiveTab] = useState('timeline');
  const [isLinkingModalOpen, setIsLinkingModalOpen] = useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState<Appointment | null>(null);
  const [isEditingHeader, setIsEditingHeader] = useState(false);
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

  // Comprehensive timeline data combining appointments and session notes
  const timelineData = React.useMemo(() => {
    const combined = [
      ...appointments.map(apt => ({
        type: 'appointment' as const,
        date: new Date(apt.startTime),
        title: apt.title || 'Appointment',
        data: apt,
        hasNote: sessionNotes.some(note => note.appointmentId === apt.id || note.eventId === apt.googleEventId)
      })),
      ...sessionNotes.map(note => ({
        type: 'session-note' as const,
        date: new Date(note.createdAt),
        title: note.content?.split('\n')[0]?.substring(0, 100) + '...' || 'Session Note',
        data: note,
        hasNote: true
      }))
    ];
    
    return combined.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments, sessionNotes]);

  const handleDocumentProcessed = (document: any) => {
    // Refresh session notes after document is processed
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
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-client-name">{clientName}</h1>
              <p className="text-gray-600" data-testid="text-client-email">{client.email}</p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span data-testid="text-client-dob">DOB: {new Date(client.dateOfBirth).toLocaleDateString()}</span>
                <span data-testid="text-client-phone">Phone: {client.phone}</span>
              </div>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => setIsEditingHeader(!isEditingHeader)}
              data-testid="button-edit-client-header"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditingHeader ? 'Cancel Edit' : 'Edit Info'}
            </Button>
            <Button variant="outline" size="sm">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule Appointment
            </Button>
            <Button 
              size="sm"
              onClick={() => setIsCreateNoteModalOpen(true)}
            >
              <FileText className="w-4 h-4 mr-2" />
              New Session Note
            </Button>
          </div>
        </div>

        {/* Inline Header Edit Section */}
        {isEditingHeader && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <EditableClientInfo client={client} mode="compact" />
          </div>
        )}
      </div>

      {/* Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sessions">Session Notes</TabsTrigger>
          <TabsTrigger value="appointments">Appointments</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="recommendations">AI Insights</TabsTrigger>
        </TabsList>

        {/* Timeline Tab - Comprehensive EHR View */}
        <TabsContent value="timeline" className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Quick Stats Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-sm font-medium">Clinical Summary</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Total Sessions</span>
                    <span className="font-semibold">{sessionNotes.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Appointments</span>
                    <span className="font-semibold">{appointments.length}</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Upcoming</span>
                    <span className="font-semibold text-blue-600">
                      {appointments.filter(apt => new Date(apt.startTime) > new Date()).length}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-xs text-gray-600">Last Contact</span>
                    <span className="font-semibold text-xs">
                      {timelineData[0] ? timelineData[0].date.toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
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
                    onClick={() => setActiveTab('documents')}
                    data-testid="button-upload-document"
                  >
                    <Upload className="w-4 h-4 mr-2" />
                    Upload Document
                  </Button>
                </CardContent>
              </Card>
            </div>

            {/* Main Timeline */}
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
                  {timelineData.length === 0 ? (
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
                        <div key={`${item.type}-${item.data.id}`} className="relative">
                          {/* Timeline line */}
                          {index < timelineData.length - 1 && (
                            <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200"></div>
                          )}
                          
                          <div className="flex items-start gap-4">
                            {/* Timeline dot */}
                            <div className={`
                              w-12 h-12 rounded-full flex items-center justify-center text-white
                              ${item.type === 'appointment' 
                                ? (item.hasNote ? 'bg-green-600' : 'bg-blue-600')
                                : 'bg-purple-600'
                              }
                            `}>
                              {item.type === 'appointment' ? (
                                item.hasNote ? <CheckCircle2 className="w-6 h-6" /> : <Calendar className="w-6 h-6" />
                              ) : (
                                <FileText className="w-6 h-6" />
                              )}
                            </div>

                            {/* Timeline content */}
                            <div className="flex-1 min-w-0">
                              <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-1">
                                      <h4 className="font-medium text-gray-900">
                                        {item.type === 'appointment' ? (
                                          item.data.title || 'Therapy Appointment'
                                        ) : (
                                          'Session Note'
                                        )}
                                      </h4>
                                      <Badge variant={item.type === 'appointment' ? 'default' : 'secondary'}>
                                        {item.type === 'appointment' ? 'Appointment' : 'Note'}
                                      </Badge>
                                      {item.type === 'appointment' && item.hasNote && (
                                        <Badge variant="outline" className="text-green-600 border-green-600">
                                          Has Note
                                        </Badge>
                                      )}
                                    </div>
                                    <div className="text-sm text-gray-600 mb-2">
                                      {item.date.toLocaleDateString('en-US', {
                                        weekday: 'long',
                                        year: 'numeric',
                                        month: 'long',
                                        day: 'numeric'
                                      })}
                                      {item.type === 'appointment' && (
                                        <span className="ml-2">
                                          {new Date(item.data.startTime).toLocaleTimeString('en-US', {
                                            hour: 'numeric',
                                            minute: '2-digit',
                                            hour12: true
                                          })}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2">
                                    {item.type === 'session-note' && (
                                      <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleDeleteSessionNote(item.data.id, item.data.source)}
                                        className="text-red-600 hover:text-red-700 hover:bg-red-50"
                                        disabled={deleteSessionNoteMutation.isPending}
                                        data-testid={`button-delete-timeline-note-${item.data.id}`}
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </Button>
                                    )}
                                  </div>
                                </div>

                                {/* Content preview */}
                                {item.type === 'session-note' && (
                                  <div className="space-y-2">
                                    <p className="text-sm text-gray-700 line-clamp-3">
                                      {item.data.content.substring(0, 200)}...
                                    </p>
                                    {item.data.aiTags && item.data.aiTags.length > 0 && (
                                      <div className="flex flex-wrap gap-1">
                                        {item.data.aiTags.slice(0, 4).map((tag, tagIndex) => (
                                          <Badge key={tagIndex} variant="outline" className="text-xs">
                                            {tag}
                                          </Badge>
                                        ))}
                                        {item.data.aiTags.length > 4 && (
                                          <Badge variant="outline" className="text-xs">
                                            +{item.data.aiTags.length - 4} more
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                    {item.data.source === 'document_upload' && (
                                      <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <Upload className="w-3 h-3" />
                                        Uploaded Document
                                        {item.data.originalFilename && (
                                          <span>: {item.data.originalFilename}</span>
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
                                        <span className="ml-1 font-medium">{item.data.type || 'Therapy'}</span>
                                      </div>
                                      <div>
                                        <span className="text-gray-600">Status:</span>
                                        <span className="ml-1 font-medium">{item.data.status || 'Scheduled'}</span>
                                      </div>
                                      {item.data.location && (
                                        <div className="col-span-2">
                                          <span className="text-gray-600">Location:</span>
                                          <span className="ml-1">{item.data.location}</span>
                                        </div>
                                      )}
                                    </div>
                                    {!item.hasNote && new Date(item.data.startTime) < new Date() && (
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => {
                                          setSelectedAppointment(item.data);
                                          setIsCreateNoteModalOpen(true);
                                        }}
                                        className="mt-2"
                                        data-testid={`button-add-note-to-appointment-${item.data.id}`}
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

        {/* Session Notes Tab */}
        <TabsContent value="sessions" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Session Notes</h2>
              <p className="text-sm text-gray-600">{sessionNotes.length} total session notes</p>
            </div>
            <Button onClick={() => setIsCreateNoteModalOpen(true)}>
              <FileText className="w-4 h-4 mr-2" />
              New Session Note
            </Button>
          </div>
          
          {notesLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
                const linkedAppointment = appointments.find(apt => 
                  apt.id === note.appointmentId || 
                  (apt.googleEventId && note.eventId && apt.googleEventId === note.eventId)
                );
                
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
                          <div className="text-sm text-gray-600 mb-3">
                            {linkedAppointment ? (
                              <span>Session Date: {new Date(linkedAppointment.startTime).toLocaleDateString()}</span>
                            ) : (
                              <span>Created: {new Date(note.createdAt).toLocaleDateString()}</span>
                            )}
                            {note.originalFilename && (
                              <span className="ml-3">File: {note.originalFilename}</span>
                            )}
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDeleteSessionNote(note.id, note.source)}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          disabled={deleteSessionNoteMutation.isPending}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                      
                      <div className="prose prose-sm max-w-none">
                        <div className="whitespace-pre-wrap text-sm text-gray-700">
                          {note.content.length > 500 ? (
                            <>
                              {note.content.substring(0, 500)}...
                              <Button variant="link" className="h-auto p-0 ml-2">
                                Read more
                              </Button>
                            </>
                          ) : (
                            note.content
                          )}
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

        {/* Appointments Tab */}
        <TabsContent value="appointments" className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Appointments</h2>
              <p className="text-sm text-gray-600">{appointments.length} total appointments</p>
            </div>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule New
            </Button>
          </div>
          
          {appointmentsLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
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
            <div className="space-y-4">
              {appointments.map((appointment) => {
                const hasNote = sessionNotes.some(note => 
                  note.appointmentId === appointment.id || 
                  (appointment.googleEventId && note.eventId && appointment.googleEventId === note.eventId)
                );
                const isPast = new Date(appointment.startTime) < new Date();
                
                return (
                  <Card key={appointment.id}>
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-2">
                            <h3 className="font-medium">{appointment.title || 'Therapy Appointment'}</h3>
                            <Badge variant={isPast ? 'secondary' : 'default'}>
                              {isPast ? 'Completed' : 'Upcoming'}
                            </Badge>
                            {hasNote && (
                              <Badge variant="outline" className="text-green-600 border-green-600">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Has Note
                              </Badge>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
                            <div>
                              <span className="font-medium">Date:</span> {new Date(appointment.startTime).toLocaleDateString()}
                            </div>
                            <div>
                              <span className="font-medium">Time:</span> {new Date(appointment.startTime).toLocaleTimeString('en-US', {
                                hour: 'numeric',
                                minute: '2-digit',
                                hour12: true
                              })}
                            </div>
                            <div>
                              <span className="font-medium">Type:</span> {appointment.type || 'Therapy'}
                            </div>
                            <div>
                              <span className="font-medium">Status:</span> {appointment.status || 'Scheduled'}
                            </div>
                            {appointment.location && (
                              <div className="col-span-2">
                                <span className="font-medium">Location:</span> {appointment.location}
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {!hasNote && isPast && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setIsCreateNoteModalOpen(true);
                              }}
                            >
                              <FileText className="w-4 h-4 mr-2" />
                              Add Note
                            </Button>
                          )}
                          {hasNote && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setIsLinkingModalOpen(true);
                              }}
                            >
                              <Link className="w-4 h-4 mr-2" />
                              View Note
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Document Upload & Processing</h2>
            <p className="text-sm text-gray-600">Upload clinical documents for AI processing and automatic session note generation.</p>
          </div>
          
          <DocumentProcessor
            clientId={params.clientId!}
            clientName={clientName}
            onDocumentProcessed={handleDocumentProcessed}
          />
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="recommendations" className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">AI Insights & Recommendations</h2>
            <p className="text-sm text-gray-600">AI-powered therapeutic insights based on session history.</p>
          </div>
          
          <SessionRecommendations 
            clientId={params.clientId!}
            sessionNotes={sessionNotes}
          />
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
          clientId={params.clientId!}
          clientName={clientName}
          selectedAppointment={selectedAppointment}
        />
      )}

      {isLinkingModalOpen && (
        <SessionNoteLinkingModal
          isOpen={isLinkingModalOpen}
          onClose={() => setIsLinkingModalOpen(false)}
          clientId={params.clientId!}
          onLinkingComplete={handleLinkingComplete}
        />
      )}
    </div>
  );
}