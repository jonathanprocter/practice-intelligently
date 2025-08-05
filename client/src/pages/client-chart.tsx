import { useState, useEffect } from 'react';
import { useRoute, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { 
  FileText, 
  Brain, 
  TrendingUp, 
  Calendar, 
  Clock, 
  ArrowLeft,
  Lightbulb,
  Target,
  AlertTriangle,
  BookOpen,
  Loader2
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  status: string;
}

interface ProgressNote {
  id: string;
  title: string;
  subjective: string;
  objective: string;
  assessment: string;
  plan: string;
  tonalAnalysis: string;
  keyPoints: string[];
  significantQuotes: string[];
  narrativeSummary: string;
  sessionDate: Date;
  appointmentId: string | null;
  createdAt: Date;
}

interface SessionPrepNote {
  id: string;
  prepContent: string;
  keyFocusAreas: string[];
  previousSessionSummary: string;
  suggestedInterventions: string[];
  clientGoals: string[];
  riskFactors: string[];
  homeworkReview: string;
  sessionObjectives: string[];
  aiGeneratedInsights: string;
  createdAt: Date;
}

interface CaseConceptualization {
  overview: string;
  diagnosticImpression: string;
  presentingConcerns: string[];
  strengths: string[];
  riskFactors: string[];
  treatmentGoals: string[];
  recommendedInterventions: string[];
  prognosis: string;
  culturalConsiderations: string;
  nextSteps: string[];
}

interface TreatmentGuide {
  overview: string;
  recommendedInterventions: string[];
  evidenceBasedTechniques: string;
  sessionStructure: string;
  homeworkSuggestions: string;
  nextSteps: string[];
  progressMonitoring: string;
  riskManagement: string;
}

export default function ClientChart() {
  const [match, params] = useRoute('/clients/:clientId/chart');
  const clientId = params?.clientId;
  const [, setLocation] = useLocation();
  const [activeTab, setActiveTab] = useState('progress-notes');
  const queryClient = useQueryClient();

  const { data: client, isLoading: clientLoading } = useQuery<Client>({
    queryKey: [`/api/clients/detail/${clientId}`],
    enabled: !!clientId
  });

  const { data: progressNotes = [], isLoading: notesLoading } = useQuery<ProgressNote[]>({
    queryKey: [`/api/progress-notes/${clientId}`],
    enabled: !!clientId
  });

  const { data: sessionPrepNotes = [], isLoading: prepLoading } = useQuery<SessionPrepNote[]>({
    queryKey: [`/api/session-prep/client/${clientId}`],
    enabled: !!clientId
  });

  const generateConceptualizationMutation = useMutation({
    mutationFn: async (clientId: string): Promise<CaseConceptualization> => {
      return await apiRequest(`/api/ai/case-conceptualization/${clientId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/case-conceptualization', clientId] });
    }
  });

  const { data: caseConceptualization, isLoading: conceptLoading } = useQuery<CaseConceptualization | null>({
    queryKey: ['/api/ai/case-conceptualization', clientId],
    enabled: !!clientId
  });

  const generateTreatmentGuideMutation = useMutation({
    mutationFn: async (clientId: string): Promise<TreatmentGuide> => {
      return await apiRequest(`/api/ai/treatment-guide/${clientId}`, 'POST');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/ai/treatment-guide', clientId] });
    }
  });

  const { data: treatmentGuide, isLoading: guideLoading } = useQuery<TreatmentGuide | null>({
    queryKey: ['/api/ai/treatment-guide', clientId],
    enabled: !!clientId
  });

  if (!match || !clientId) {
    return (
      <div className="container mx-auto p-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Client Chart</h1>
          <p className="text-muted-foreground">No client ID provided</p>
          <Button 
            onClick={() => setLocation('/clients')}
            className="mt-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
        </div>
      </div>
    );
  }

  if (clientLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin" />
        <span className="ml-2">Loading client information...</span>
      </div>
    );
  }

  if (!client) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground">Client not found</p>
        <Button onClick={() => setLocation('/clients')} className="mt-4">
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Clients
        </Button>
      </div>
    );
  }

  const handleGenerateConceptualization = () => {
    if (clientId) {
      generateConceptualizationMutation.mutate(clientId);
    }
  };

  const handleGenerateTreatmentGuide = () => {
    if (clientId) {
      generateTreatmentGuideMutation.mutate(clientId);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-7xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/clients')}
            data-testid="button-back-to-clients"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Clients
          </Button>
          <div className="flex items-center space-x-3">
            <Avatar>
              <AvatarFallback>
                {client?.firstName?.charAt(0) || 'C'}{client?.lastName?.charAt(0) || 'L'}
              </AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-2xl font-bold" data-testid="text-client-name">
                {client?.firstName || 'Unknown'} {client?.lastName || 'Client'}
              </h1>
              <p className="text-muted-foreground">
                Client Chart Review
              </p>
            </div>
          </div>
        </div>
        <Badge variant={client?.status === 'active' ? 'default' : 'secondary'}>
          {client?.status || 'unknown'}
        </Badge>
      </div>

      {/* Client Summary Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Client Summary</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Email</p>
              <p data-testid="text-client-email">{client?.email || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Phone</p>
              <p data-testid="text-client-phone">{client?.phone || 'Not provided'}</p>
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">Date of Birth</p>
              <p data-testid="text-client-dob">
                {client?.dateOfBirth ? format(new Date(client.dateOfBirth), 'MMM dd, yyyy') : 'Not provided'}
              </p>
            </div>
          </div>
          <Separator className="my-4" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div>
              <p className="text-2xl font-bold text-blue-600">{progressNotes?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Progress Notes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-green-600">{sessionPrepNotes?.length || 0}</p>
              <p className="text-sm text-muted-foreground">Session Prep Notes</p>
            </div>
            <div>
              <p className="text-2xl font-bold text-purple-600">
                {(progressNotes?.length || 0) + (sessionPrepNotes?.length || 0)}
              </p>
              <p className="text-sm text-muted-foreground">Total Documents</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for different views */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="progress-notes" data-testid="tab-progress-notes">
            <FileText className="w-4 h-4 mr-2" />
            Progress Notes
          </TabsTrigger>
          <TabsTrigger value="session-prep" data-testid="tab-session-prep">
            <Calendar className="w-4 h-4 mr-2" />
            Session Prep
          </TabsTrigger>
          <TabsTrigger value="case-conceptualization" data-testid="tab-case-conceptualization">
            <Brain className="w-4 h-4 mr-2" />
            Case Overview
          </TabsTrigger>
          <TabsTrigger value="treatment-guide" data-testid="tab-treatment-guide">
            <BookOpen className="w-4 h-4 mr-2" />
            Treatment Guide
          </TabsTrigger>
        </TabsList>

        {/* Progress Notes Tab */}
        <TabsContent value="progress-notes" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Progress Notes</h2>
            <Badge variant="outline">{progressNotes?.length || 0} notes</Badge>
          </div>
          
          {notesLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading progress notes...
            </div>
          ) : !progressNotes || progressNotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No progress notes found for this client</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {progressNotes.map((note: ProgressNote) => (
                  <Card key={note.id} data-testid={`card-progress-note-${note.id}`}>
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{note.title}</CardTitle>
                          <CardDescription className="flex items-center space-x-2 mt-1">
                            <Clock className="w-4 h-4" />
                            <span>Session: {format(new Date(note.sessionDate), 'MMM dd, yyyy')}</span>
                            <span>•</span>
                            <span>Created: {format(new Date(note.createdAt), 'MMM dd, yyyy')}</span>
                          </CardDescription>
                        </div>
                        {note.appointmentId && (
                          <Badge variant="secondary">Linked to Appointment</Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* SOAP Format */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <h4 className="font-semibold text-sm text-blue-600 mb-2">SUBJECTIVE</h4>
                          <p className="text-sm text-muted-foreground">{note.subjective}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-green-600 mb-2">OBJECTIVE</h4>
                          <p className="text-sm text-muted-foreground">{note.objective}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-orange-600 mb-2">ASSESSMENT</h4>
                          <p className="text-sm text-muted-foreground">{note.assessment}</p>
                        </div>
                        <div>
                          <h4 className="font-semibold text-sm text-purple-600 mb-2">PLAN</h4>
                          <p className="text-sm text-muted-foreground">{note.plan}</p>
                        </div>
                      </div>

                      {/* Key Points */}
                      {note.keyPoints && note.keyPoints.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Key Points</h4>
                          <div className="flex flex-wrap gap-2">
                            {note.keyPoints.map((point, index) => (
                              <Badge key={index} variant="outline" className="text-xs">
                                {point}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Significant Quotes */}
                      {note.significantQuotes && note.significantQuotes.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Significant Quotes</h4>
                          <div className="space-y-2">
                            {note.significantQuotes.map((quote, index) => (
                              <blockquote key={index} className="border-l-4 border-blue-500 pl-4 italic text-sm">
                                "{quote}"
                              </blockquote>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Narrative Summary */}
                      {note.narrativeSummary && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Narrative Summary</h4>
                          <p className="text-sm text-muted-foreground">{note.narrativeSummary}</p>
                        </div>
                      )}

                      {/* Tonal Analysis */}
                      {note.tonalAnalysis && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Tonal Analysis</h4>
                          <p className="text-sm text-muted-foreground">{note.tonalAnalysis}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Session Prep Tab */}
        <TabsContent value="session-prep" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Session Preparation Notes</h2>
            <Badge variant="outline">{sessionPrepNotes?.length || 0} prep notes</Badge>
          </div>
          
          {prepLoading ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Loading session prep notes...
            </div>
          ) : !sessionPrepNotes || sessionPrepNotes.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No session prep notes found for this client</p>
              </CardContent>
            </Card>
          ) : (
            <ScrollArea className="h-[600px]">
              <div className="space-y-4">
                {sessionPrepNotes.map((prep: SessionPrepNote) => (
                  <Card key={prep.id} data-testid={`card-session-prep-${prep.id}`}>
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center space-x-2">
                        <Calendar className="w-5 h-5" />
                        <span>Session Preparation</span>
                      </CardTitle>
                      <CardDescription>
                        Created: {format(new Date(prep.createdAt), 'MMM dd, yyyy')}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* Prep Content */}
                      <div>
                        <h4 className="font-semibold text-sm mb-2">Preparation Content</h4>
                        <p className="text-sm text-muted-foreground">{prep.prepContent}</p>
                      </div>

                      {/* Key Focus Areas */}
                      {prep.keyFocusAreas && prep.keyFocusAreas.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Key Focus Areas</h4>
                          <div className="flex flex-wrap gap-2">
                            {prep.keyFocusAreas.map((area, index) => (
                              <Badge key={index} variant="default" className="text-xs">
                                <Target className="w-3 h-3 mr-1" />
                                {area}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Session Objectives */}
                      {prep.sessionObjectives && prep.sessionObjectives.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Session Objectives</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {prep.sessionObjectives.map((objective, index) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {objective}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Suggested Interventions */}
                      {prep.suggestedInterventions && prep.suggestedInterventions.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2">Suggested Interventions</h4>
                          <ul className="list-disc list-inside space-y-1">
                            {prep.suggestedInterventions.map((intervention, index) => (
                              <li key={index} className="text-sm text-muted-foreground">
                                {intervention}
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Risk Factors */}
                      {prep.riskFactors && prep.riskFactors.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 text-red-600">Risk Factors</h4>
                          <div className="space-y-2">
                            {prep.riskFactors.map((risk, index) => (
                              <div key={index} className="flex items-start space-x-2">
                                <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5" />
                                <span className="text-sm text-muted-foreground">{risk}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI Generated Insights */}
                      {prep.aiGeneratedInsights && (
                        <div>
                          <h4 className="font-semibold text-sm mb-2 flex items-center space-x-2">
                            <Brain className="w-4 h-4" />
                            <span>AI Generated Insights</span>
                          </h4>
                          <p className="text-sm text-muted-foreground">{prep.aiGeneratedInsights}</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </ScrollArea>
          )}
        </TabsContent>

        {/* Case Conceptualization Tab */}
        <TabsContent value="case-conceptualization" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Case Conceptualization</h2>
            <Button 
              onClick={handleGenerateConceptualization}
              disabled={generateConceptualizationMutation.isPending}
              data-testid="button-generate-conceptualization"
            >
              {generateConceptualizationMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Generate Overview
            </Button>
          </div>

          {conceptLoading || generateConceptualizationMutation.isPending ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating case conceptualization...
            </div>
          ) : caseConceptualization ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Brain className="w-5 h-5" />
                  <span>AI-Generated Case Conceptualization</span>
                </CardTitle>
                <CardDescription>
                  Comprehensive clinical overview based on all available documentation
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Clinical Overview</h3>
                  <p className="text-muted-foreground">{caseConceptualization?.overview || 'No overview available'}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Presenting Concerns</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {caseConceptualization?.presentingConcerns?.map((concern: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{concern}</li>
                      )) || <li className="text-sm text-muted-foreground">No concerns identified</li>}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Client Strengths</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {caseConceptualization?.strengths?.map((strength: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{strength}</li>
                      )) || <li className="text-sm text-muted-foreground">No strengths identified</li>}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Risk Factors</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {caseConceptualization?.riskFactors?.map((risk: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground text-red-600">{risk}</li>
                      )) || <li className="text-sm text-muted-foreground">No risk factors identified</li>}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Treatment Goals</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {caseConceptualization?.treatmentGoals?.map((goal: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{goal}</li>
                      )) || <li className="text-sm text-muted-foreground">No goals identified</li>}
                    </ul>
                  </div>
                </div>

                <Separator />

                <div>
                  <h3 className="font-semibold mb-2">Diagnostic Impression</h3>
                  <p className="text-muted-foreground">{caseConceptualization?.diagnosticImpression || 'No diagnostic impression available'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Prognosis</h3>
                  <p className="text-muted-foreground">{caseConceptualization?.prognosis || 'No prognosis available'}</p>
                </div>

                {caseConceptualization?.culturalConsiderations && (
                  <div>
                    <h3 className="font-semibold mb-2">Cultural Considerations</h3>
                    <p className="text-muted-foreground">{caseConceptualization.culturalConsiderations}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <Brain className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No case conceptualization available</p>
                <Button onClick={handleGenerateConceptualization} data-testid="button-create-conceptualization">
                  <Brain className="w-4 h-4 mr-2" />
                  Generate Case Overview
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Treatment Guide Tab */}
        <TabsContent value="treatment-guide" className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">AI Treatment Guide</h2>
            <Button 
              onClick={handleGenerateTreatmentGuide}
              disabled={generateTreatmentGuideMutation.isPending}
              data-testid="button-generate-treatment-guide"
            >
              {generateTreatmentGuideMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Lightbulb className="w-4 h-4 mr-2" />
              )}
              Generate Guide
            </Button>
          </div>

          {guideLoading || generateTreatmentGuideMutation.isPending ? (
            <div className="flex items-center justify-center h-32">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              Generating treatment guide...
            </div>
          ) : treatmentGuide ? (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BookOpen className="w-5 h-5" />
                  <span>AI-Generated Treatment Guide</span>
                </CardTitle>
                <CardDescription>
                  Evidence-based treatment recommendations based on clinical data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <h3 className="font-semibold mb-2">Treatment Overview</h3>
                  <p className="text-muted-foreground">{treatmentGuide?.overview || 'No treatment overview available'}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <h3 className="font-semibold mb-2">Recommended Interventions</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {treatmentGuide?.recommendedInterventions?.map((intervention: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{intervention}</li>
                      )) || <li className="text-sm text-muted-foreground">No interventions available</li>}
                    </ul>
                  </div>

                  <div>
                    <h3 className="font-semibold mb-2">Next Steps</h3>
                    <ul className="list-disc list-inside space-y-1">
                      {treatmentGuide?.nextSteps?.map((step: string, index: number) => (
                        <li key={index} className="text-sm text-muted-foreground">{step}</li>
                      )) || <li className="text-sm text-muted-foreground">No next steps available</li>}
                    </ul>
                  </div>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Evidence-Based Techniques</h3>
                  <p className="text-muted-foreground">{treatmentGuide?.evidenceBasedTechniques || 'No techniques available'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Session Structure Recommendations</h3>
                  <p className="text-muted-foreground">{treatmentGuide?.sessionStructure || 'No structure recommendations available'}</p>
                </div>

                <div>
                  <h3 className="font-semibold mb-2">Homework and Between-Session Activities</h3>
                  <p className="text-muted-foreground">{treatmentGuide?.homeworkSuggestions || 'No homework suggestions available'}</p>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="text-center py-8">
                <BookOpen className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground mb-4">No treatment guide available</p>
                <Button onClick={handleGenerateTreatmentGuide} data-testid="button-create-treatment-guide">
                  <Lightbulb className="w-4 h-4 mr-2" />
                  Generate Treatment Guide
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}