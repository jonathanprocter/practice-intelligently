import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarEvent } from '../../types/calendar';
import { apiRequest } from '@/lib/queryClient';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
  Calendar,
  Clock,
  MapPin,
  User,
  Phone,
  Mail,
  MessageSquare,
  Brain,
  TrendingUp,
  Target,
  AlertTriangle,
  Edit,
  Save,
  X,
  RefreshCw,
  Lightbulb,
  FileText,
  Activity
} from 'lucide-react';

interface AppointmentDetailsDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onProgressNotes?: (event: CalendarEvent) => void;
  onDeleteEvent?: (event: CalendarEvent) => void;
  triggerInsights?: boolean;
  onInsightsTriggerHandled?: () => void;
}

interface SessionRecommendation {
  id: string;
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  category: 'therapeutic' | 'behavioral' | 'assessment';
  suggestedInterventions: string[];
  expectedOutcomes: string[];
  implementationNotes: string;
}

interface AIInsights {
  clientSummary: string;
  keyFocusAreas: string[];
  suggestedInterventions: string[];
  riskFactors: string[];
  progressIndicators: string[];
  sessionPrep: string[];
  retentionAnalysis?: {
    risk: 'low' | 'moderate' | 'high';
    factors: string[];
    recommendations: string[];
  };
}

export const AppointmentDetailsDialog = ({
  event,
  open,
  onOpenChange,
  onProgressNotes,
  onDeleteEvent,
  triggerInsights = false,
  onInsightsTriggerHandled
}: AppointmentDetailsDialogProps) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editData, setEditData] = useState<Partial<CalendarEvent>>({});
  const [activeTab, setActiveTab] = useState('details');
  const [newActionItem, setNewActionItem] = useState({ description: '', priority: 'medium' as const });
  const [newNote, setNewNote] = useState('');
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Reset edit data when event changes
  useEffect(() => {
    if (event) {
      setEditData({
        title: event.title,
        notes: event.notes || '',
        location: event.location || '',
        clientName: event.clientName || ''
      });
    }
  }, [event]);

  // Handle insights trigger from quick button
  useEffect(() => {
    if (triggerInsights && open) {
      setActiveTab('insights');
      // Trigger insights generation
      setTimeout(() => {
        generateInsightsMutation.mutate();
      }, 300);
      // Clear the trigger flag
      if (onInsightsTriggerHandled) {
        onInsightsTriggerHandled();
      }
    }
  }, [triggerInsights, open, onInsightsTriggerHandled]);

  // Fetch client information if available
  const { data: clientData } = useQuery({
    queryKey: ['/api/clients/by-name', event?.clientName],
    queryFn: async () => {
      if (!event?.clientName) return null;
      const response = await apiRequest('GET', `/api/clients/by-name/${encodeURIComponent(event.clientName)}`);
      return response.json();
    },
    enabled: !!event?.clientName && open
  });

  // Fetch AI insights for the client or general appointment insights
  const { data: aiInsights, isLoading: insightsLoading, refetch: refetchInsights } = useQuery({
    queryKey: ['/api/ai/session-insights', clientData?.id || event?.id],
    queryFn: async () => {
      // If we have client data, use client-specific insights
      if (clientData?.id) {
        const response = await apiRequest('POST', '/api/ai/session-insights', {
          clientId: clientData.id,
          appointmentContext: {
            date: event?.startTime,
            type: 'upcoming_session'
          }
        });
        return response.json();
      }

      // For non-client appointments (like supervision), generate general insights
      if (event?.id) {
        const response = await apiRequest('POST', `/api/session-prep/${event.id}/ai-insights`, {
          clientId: null, // Indicate this is not a client session
          appointmentTitle: event.title,
          appointmentType: 'supervision'
        });
        return response.json();
      }

      return null;
    },
    enabled: (!!clientData?.id || !!event?.id) && open && activeTab === 'insights'
  });

  // Fetch session recommendations
  const { data: recommendations, isLoading: recLoading } = useQuery({
    queryKey: ['/api/session-recommendations/client', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return [];
      const response = await apiRequest('GET', `/api/session-recommendations/client/${clientData.id}`);
      return response.json();
    },
    enabled: !!clientData?.id && open && activeTab === 'recommendations'
  });

  // Generate new AI insights
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      if (!clientData?.id) throw new Error('No client data available');
      const response = await apiRequest('POST', '/api/ai/generate-session-insights', {
        clientId: clientData.id,
        appointmentDate: event?.startTime
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/session-insights', clientData?.id] });
      toast({
        title: "AI Insights Generated",
        description: "Fresh insights have been generated for this appointment."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to generate AI insights. Please try again.",
        variant: "destructive"
      });
    }
  });

  // Fetch action items for the client
  const { data: actionItems } = useQuery({
    queryKey: ['/api/action-items/client', clientData?.id],
    queryFn: async () => {
      if (!clientData?.id) return [];
      const response = await apiRequest('GET', `/api/action-items/client/${clientData.id}`);
      return response.json();
    },
    enabled: !!clientData?.id && open
  });

  // Create action item mutation
  const createActionItemMutation = useMutation({
    mutationFn: async (actionItem: { description: string; priority: string }) => {
      const response = await apiRequest('POST', '/api/action-items', {
        ...actionItem,
        clientId: clientData?.id,
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        appointmentId: event?.id,
        status: 'pending'
      });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/action-items/client', clientData?.id] });
      setNewActionItem({ description: '', priority: 'medium' });
      toast({
        title: "Action Item Created",
        description: "New action item has been added to this appointment."
      });
    }
  });

  // Update appointment mutation
  const updateAppointmentMutation = useMutation({
    mutationFn: async (updatedData: Partial<CalendarEvent>) => {
      if (!event?.id) throw new Error('No event ID');
      const response = await apiRequest('PATCH', `/api/appointments/${event.id}`, updatedData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/calendar/events'] });
      setIsEditing(false);
      toast({
        title: "Appointment Updated",
        description: "The appointment has been successfully updated."
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update appointment. Please try again.",
        variant: "destructive"
      });
    }
  });

  if (!event) return null;

  const formatDateTime = (dateTime: Date | string) => {
    const date = typeof dateTime === 'string' ? new Date(dateTime) : dateTime;
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      })
    };
  };

  const startDateTime = formatDateTime(event.startTime);
  const endDateTime = formatDateTime(event.endTime);

  const handleSave = () => {
    updateAppointmentMutation.mutate(editData);
  };

  const handleCancel = () => {
    setEditData({
      title: event.title,
      notes: event.notes || '',
      location: event.location || '',
      clientName: event.clientName || ''
    });
    setIsEditing(false);
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] overflow-hidden p-0">
        <ScrollArea className="max-h-[85vh] overflow-y-auto">
          <div className="p-6">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-therapy-primary" />
              {isEditing ? (
                <Input
                  value={editData.title || ''}
                  onChange={(e) => setEditData({ ...editData, title: e.target.value })}
                  className="text-lg font-semibold"
                />
              ) : (
                event.title
              )}
            </span>
            <div className="flex items-center gap-2">
              {isEditing ? (
                <>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCancel}
                    disabled={updateAppointmentMutation.isPending}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    onClick={handleSave}
                    disabled={updateAppointmentMutation.isPending}
                  >
                    <Save className="h-4 w-4 mr-1" />
                    Save
                  </Button>
                </>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setIsEditing(true)}
                >
                  <Edit className="h-4 w-4 mr-1" />
                  Edit
                </Button>
              )}
            </div>
          </DialogTitle>
          <DialogDescription>
            {startDateTime.date} • {startDateTime.time} - {endDateTime.time}
          </DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="details">Details</TabsTrigger>
            <TabsTrigger value="notes">Notes</TabsTrigger>
            <TabsTrigger value="actions">Action Items</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="recommendations">Recommendations</TabsTrigger>
          </TabsList>

          <TabsContent value="details" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Appointment Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="client-name">Client Name</Label>
                    {isEditing ? (
                      <Input
                        id="client-name"
                        value={editData.clientName || ''}
                        onChange={(e) => setEditData({ ...editData, clientName: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4 text-gray-500" />
                        <span>{event.clientName || 'No client specified'}</span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="location">Location</Label>
                    {isEditing ? (
                      <Input
                        id="location"
                        value={editData.location || ''}
                        onChange={(e) => setEditData({ ...editData, location: e.target.value })}
                      />
                    ) : (
                      <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{event.location || 'No location specified'}</span>
                      </div>
                    )}
                  </div>
                </div>

                {clientData && (
                  <div className="mt-6 p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium mb-3">Client Information</h4>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      {clientData.email && (
                        <div className="flex items-center gap-2">
                          <Mail className="h-4 w-4 text-gray-500" />
                          <span>{clientData.email}</span>
                        </div>
                      )}
                      {clientData.phone && (
                        <div className="flex items-center gap-2">
                          <Phone className="h-4 w-4 text-gray-500" />
                          <span>{clientData.phone}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  {isEditing ? (
                    <Textarea
                      id="notes"
                      value={editData.notes || ''}
                      onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                      rows={4}
                      placeholder="Add appointment notes..."
                    />
                  ) : (
                    <div className="min-h-[100px] p-3 bg-gray-50 rounded-lg">
                      <span className="text-gray-700">
                        {event.notes || 'No notes available'}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="default"
                onClick={() => {
                  generateInsightsMutation.mutate();
                  setActiveTab('insights');
                }}
                disabled={generateInsightsMutation.isPending || insightsLoading}
                className="flex items-center gap-2 bg-therapy-primary hover:bg-therapy-primary/90"
                data-testid="button-generate-insights"
              >
                <Brain className={cn("h-4 w-4", generateInsightsMutation.isPending && "animate-pulse")} />
                {generateInsightsMutation.isPending ? 'Generating...' : 'Generate AI Insights'}
              </Button>

              {onProgressNotes && (
                <Button
                  variant="outline"
                  onClick={() => onProgressNotes(event)}
                  className="flex items-center gap-2"
                  data-testid="button-progress-notes"
                >
                  <MessageSquare className="h-4 w-4" />
                  Progress Notes
                </Button>
              )}

              {onDeleteEvent && (
                <Button
                  variant="destructive"
                  onClick={() => onDeleteEvent(event)}
                  className="flex items-center gap-2"
                  data-testid="button-delete-appointment"
                >
                  <X className="h-4 w-4" />
                  Delete
                </Button>
              )}
            </div>
          </TabsContent>

          <TabsContent value="notes" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-therapy-primary" />
                  Appointment Notes
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="appointment-notes">Current Notes</Label>
                  <Textarea
                    id="appointment-notes"
                    value={editData.notes || ''}
                    onChange={(e) => setEditData({ ...editData, notes: e.target.value })}
                    rows={6}
                    placeholder="Add detailed notes for this appointment..."
                    className="min-h-[150px]"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quick-note">Add Quick Note</Label>
                  <div className="flex gap-2">
                    <Textarea
                      id="quick-note"
                      value={newNote}
                      onChange={(e) => setNewNote(e.target.value)}
                      rows={2}
                      placeholder="Quick note to add..."
                      className="flex-1"
                    />
                    <Button
                      onClick={() => {
                        if (newNote.trim()) {
                          const timestamp = new Date().toLocaleString();
                          const currentNotes = editData.notes || '';
                          const separator = currentNotes ? '\n\n' : '';
                          setEditData({
                            ...editData,
                            notes: `${currentNotes}${separator}[${timestamp}] ${newNote.trim()}`
                          });
                          setNewNote('');
                        }
                      }}
                      disabled={!newNote.trim()}
                      className="self-end"
                    >
                      Add Note
                    </Button>
                  </div>
                </div>

                <Button
                  onClick={handleSave}
                  disabled={updateAppointmentMutation.isPending}
                  className="w-full"
                >
                  <Save className="h-4 w-4 mr-2" />
                  Save Notes
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="actions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-therapy-primary" />
                  Action Items
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Create New Action Item */}
                <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-medium">Create New Action Item</h4>
                  <div className="space-y-2">
                    <Label htmlFor="action-description">Description</Label>
                    <Textarea
                      id="action-description"
                      value={newActionItem.description}
                      onChange={(e) => setNewActionItem({ ...newActionItem, description: e.target.value })}
                      rows={2}
                      placeholder="Describe the action item..."
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="action-priority">Priority</Label>
                    <select
                      id="action-priority"
                      value={newActionItem.priority}
                      onChange={(e) => setNewActionItem({ ...newActionItem, priority: e.target.value as any })}
                      className="w-full p-2 border border-gray-300 rounded-md"
                    >
                      <option value="low">Low Priority</option>
                      <option value="medium">Medium Priority</option>
                      <option value="high">High Priority</option>
                    </select>
                  </div>
                  <Button
                    onClick={() => createActionItemMutation.mutate(newActionItem)}
                    disabled={!newActionItem.description.trim() || createActionItemMutation.isPending}
                    className="w-full"
                  >
                    <Target className="h-4 w-4 mr-2" />
                    Create Action Item
                  </Button>
                </div>

                {/* Existing Action Items */}
                <div className="space-y-3">
                  <h4 className="font-medium">Existing Action Items</h4>
                  {actionItems && actionItems.length > 0 ? (
                    <div className="space-y-2">
                      {actionItems.map((item: any) => (
                        <div key={item.id} className={`p-3 border rounded-lg ${
                          item.priority === 'high' ? 'border-red-200 bg-red-50' :
                          item.priority === 'medium' ? 'border-yellow-200 bg-yellow-50' :
                          'border-green-200 bg-green-50'
                        }`}>
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="text-sm font-medium">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <Badge className={getPriorityColor(item.priority)}>
                                  {item.priority}
                                </Badge>
                                <span className="text-xs text-gray-500">
                                  {item.status === 'completed' ? 'Completed' : 'Pending'}
                                </span>
                              </div>
                            </div>
                            {item.status === 'pending' && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Mark as completed
                                  apiRequest('PATCH', `/api/action-items/${item.id}`, { status: 'completed' })
                                    .then(() => {
                                      queryClient.invalidateQueries({ queryKey: ['/api/action-items/client', clientData?.id] });
                                      toast({ title: "Action item marked as completed" });
                                    });
                                }}
                              >
                                Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-sm">No action items for this appointment.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">AI Progress Insights</h3>
              <Button
                variant="outline"
                size="sm"
                onClick={() => generateInsightsMutation.mutate()}
                disabled={generateInsightsMutation.isPending || insightsLoading}
              >
                <RefreshCw className={cn("h-4 w-4 mr-2", generateInsightsMutation.isPending && "animate-spin")} />
                Generate Fresh Insights
              </Button>
            </div>

            {insightsLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Generating AI insights...</span>
              </div>
            ) : aiInsights ? (
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Brain className="h-5 w-5 text-therapy-primary" />
                      Client Overview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-700">{aiInsights.clientSummary}</p>
                  </CardContent>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Target className="h-5 w-5 text-blue-600" />
                        Key Focus Areas
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      {aiInsights.keyFocusAreas && Array.isArray(aiInsights.keyFocusAreas) && aiInsights.keyFocusAreas.length > 0 ? (
                        <div>
                          <h4 className="font-medium text-sm mb-2">Key Focus Areas</h4>
                          <ul className="space-y-1">
                            {aiInsights.keyFocusAreas.map((area: string, index: number) => (
                              <li key={index} className="text-sm text-gray-600">• {area}</li>
                            ))}
                          </ul>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-500">No focus areas identified yet</p>
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <TrendingUp className="h-5 w-5 text-green-600" />
                        Progress Indicators
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiInsights.progressIndicators && Array.isArray(aiInsights.progressIndicators) && aiInsights.progressIndicators.length > 0 ? (
                          aiInsights.progressIndicators.map((indicator: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                              <span className="text-sm">{indicator}</span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No progress indicators identified yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Lightbulb className="h-5 w-5 text-yellow-600" />
                        Suggested Interventions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiInsights.suggestedInterventions && Array.isArray(aiInsights.suggestedInterventions) && aiInsights.suggestedInterventions.length > 0 ? (
                          aiInsights.suggestedInterventions.map((intervention: string, index: number) => (
                            <div key={index} className="text-sm p-2 bg-yellow-50 rounded">
                              {intervention}
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No interventions suggested yet</p>
                        )}
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-red-600" />
                        Risk Factors
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiInsights.riskFactors && Array.isArray(aiInsights.riskFactors) && aiInsights.riskFactors.length > 0 ? (
                          aiInsights.riskFactors.map((risk: string, index: number) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertTriangle className="w-3 h-3 text-red-500" />
                              <span className="text-sm">{risk}</span>
                            </div>
                          ))
                        ) : (
                          <span className="text-sm text-gray-500">No significant risk factors identified</span>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {aiInsights.sessionPrep && Array.isArray(aiInsights.sessionPrep) && aiInsights.sessionPrep.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <FileText className="h-5 w-5 text-therapy-primary" />
                        Session Preparation
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {aiInsights.sessionPrep.map((prep: string, index: number) => (
                          <div key={index} className="p-3 bg-therapy-background border-l-4 border-therapy-primary">
                            <span className="text-sm">{prep}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {aiInsights.retentionAnalysis && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Activity className="h-5 w-5 text-purple-600" />
                        Retention Analysis
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">Risk Level:</span>
                          <Badge className={cn(
                            aiInsights.retentionAnalysis.risk === 'high' && 'bg-red-100 text-red-800',
                            aiInsights.retentionAnalysis.risk === 'moderate' && 'bg-yellow-100 text-yellow-800',
                            aiInsights.retentionAnalysis.risk === 'low' && 'bg-green-100 text-green-800'
                          )}>
                            {aiInsights.retentionAnalysis.risk.charAt(0).toUpperCase() + aiInsights.retentionAnalysis.risk.slice(1)}
                          </Badge>
                        </div>
                        <div>
                          <h5 className="text-sm font-medium mb-2">Recommendations:</h5>
                          <ul className="space-y-1">
                            {aiInsights.retentionAnalysis.recommendations.map((rec: string, index: number) => (
                              <li key={index} className="text-sm text-gray-600">• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            ) : (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500 mb-4">No AI insights available for this client</p>
                <Button
                  variant="outline"
                  onClick={() => generateInsightsMutation.mutate()}
                  disabled={!clientData}
                >
                  Generate Insights
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="recommendations" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-semibold">Session Recommendations</h3>
            </div>

            {recLoading ? (
              <div className="flex items-center justify-center py-8">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                <span>Loading recommendations...</span>
              </div>
            ) : recommendations && recommendations.length > 0 ? (
              <div className="space-y-4">
                {recommendations.map((rec: SessionRecommendation) => (
                  <Card key={rec.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle className="text-base">{rec.title}</CardTitle>
                        <Badge className={getPriorityColor(rec.priority)}>
                          {rec.priority}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-gray-700">{rec.description}</p>

                      {rec.suggestedInterventions.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Suggested Interventions:</h5>
                          <ul className="space-y-1">
                            {rec.suggestedInterventions.map((intervention, index) => (
                              <li key={index} className="text-sm text-gray-600">• {intervention}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.expectedOutcomes.length > 0 && (
                        <div>
                          <h5 className="text-sm font-medium mb-2">Expected Outcomes:</h5>
                          <ul className="space-y-1">
                            {rec.expectedOutcomes.map((outcome, index) => (
                              <li key={index} className="text-sm text-gray-600">• {outcome}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {rec.implementationNotes && (
                        <div className="p-3 bg-blue-50 rounded-lg">
                          <h5 className="text-sm font-medium mb-1">Implementation Notes:</h5>
                          <p className="text-sm text-gray-700">{rec.implementationNotes}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8">
                <Lightbulb className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No recommendations available for this client</p>
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Progress History</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-500">Progress history functionality will be available soon</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};