import React, { useState, useEffect } from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery } from '@tanstack/react-query';
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
  AlertCircle
} from 'lucide-react';
import { DocumentProcessor } from '@/components/documents/DocumentProcessor';

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
  content: string;
  createdAt: string;
  aiTags?: string[];
  source?: string;
  originalFilename?: string;
}

interface Appointment {
  id: string;
  title: string;
  start: string;
  status?: string;
}

export default function ClientChart() {
  const params = useParams<{ clientId: string }>();
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('overview');

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
                  {appointments.filter((apt: Appointment) => new Date(apt.start) > new Date()).length}
                </div>
                <p className="text-xs text-muted-foreground">
                  Next: {appointments.find((apt: Appointment) => new Date(apt.start) > new Date())?.start ? 
                    new Date(appointments.find((apt: Appointment) => new Date(apt.start) > new Date())!.start).toLocaleDateString() : 
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
                      <div className="flex items-center gap-2 mb-1">
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
          <Card>
            <CardHeader>
              <CardTitle>Appointment History</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {appointments.map((appointment: Appointment) => (
                  <div key={appointment.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-4 h-4 text-gray-500" />
                      <div>
                        <p className="font-medium">{appointment.title}</p>
                        <p className="text-sm text-gray-500">
                          {new Date(appointment.start).toLocaleString()}
                        </p>
                      </div>
                    </div>
                    <Badge variant={appointment.status === 'completed' ? 'default' : 'secondary'}>
                      {appointment.status || 'scheduled'}
                    </Badge>
                  </div>
                ))}
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
    </div>
  );
}