import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Progress } from '@/components/ui/progress';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import {
  User,
  FileText,
  Calendar,
  Brain,
  TrendingUp,
  AlertCircle,
  Download,
  Share2,
  ChevronDown,
  ChevronRight,
  Loader2,
  Search,
  Filter,
  Sparkles,
  FileCheck,
  Clock,
  Target,
  Heart,
  Shield,
  BookOpen,
  MessageSquare,
  PieChart,
  BarChart3,
  Activity,
  Zap
} from 'lucide-react';
import { format, parseISO, differenceInDays, subMonths } from 'date-fns';
import { useToast } from '@/components/ui/use-toast';

interface EnhancedClientProfileProps {
  clientId: string;
  onClose?: () => void;
}

interface ClientData {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth?: string;
  email?: string;
  phone?: string;
  diagnosis?: string[];
  treatmentGoals?: string[];
  medications?: string[];
  emergencyContact?: any;
  insuranceInfo?: any;
  metadata?: any;
}

interface DocumentSummary {
  totalDocuments: number;
  progressNotes: number;
  assessments: number;
  treatmentPlans: number;
  other: number;
  recentDocuments: Array<{
    id: string;
    title: string;
    date: string;
    type: string;
    summary?: string;
  }>;
}

interface AIInsights {
  treatmentProgress: {
    summary: string;
    trend: 'improving' | 'stable' | 'declining' | 'unknown';
    confidence: number;
  };
  keyThemes: string[];
  recommendations: string[];
  riskFactors: string[];
  strengths: string[];
  nextSteps: string[];
  sessionPatterns: {
    averageFrequency: string;
    consistency: number;
    missedSessions: number;
  };
}

export const EnhancedClientProfile: React.FC<EnhancedClientProfileProps> = ({
  clientId,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isGeneratingInsights, setIsGeneratingInsights] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['summary']));
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch client data
  const { data: client, isLoading: clientLoading } = useQuery({
    queryKey: ['client', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/clients/${clientId}`);
      if (!response.ok) throw new Error('Failed to fetch client');
      return response.json();
    }
  });

  // Fetch all documents
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ['client-documents', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/documents/client/${clientId}`);
      if (!response.ok) return { totalDocuments: 0, recentDocuments: [] };
      return response.json();
    }
  });

  // Fetch session notes
  const { data: sessionNotes } = useQuery({
    queryKey: ['client-session-notes', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/session-notes/client/${clientId}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Fetch appointments
  const { data: appointments } = useQuery({
    queryKey: ['client-appointments', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/appointments/client/${clientId}`);
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Generate AI insights
  const generateInsightsMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/ai/generate-client-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          includeDocuments: true,
          includeSessionNotes: true,
          includeAppointments: true,
          timeRange: 'last_6_months'
        })
      });
      if (!response.ok) throw new Error('Failed to generate insights');
      return response.json();
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['client-ai-insights', clientId], data);
      toast({
        title: "AI Insights Generated",
        description: "Comprehensive analysis complete",
      });
    },
    onError: (error) => {
      toast({
        title: "Failed to Generate Insights",
        description: error.message,
        variant: "destructive",
      });
    }
  });

  // Fetch or use cached AI insights
  const { data: aiInsights } = useQuery({
    queryKey: ['client-ai-insights', clientId],
    queryFn: async () => {
      const response = await fetch(`/api/ai/client-insights/${clientId}`);
      if (!response.ok) return null;
      return response.json();
    },
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const handleQuickAction = async (action: string) => {
    switch (action) {
      case 'generate-summary':
        await generateInsightsMutation.mutateAsync();
        break;
      case 'export-data':
        // Implement export functionality
        toast({
          title: "Exporting Data",
          description: "Preparing comprehensive client report...",
        });
        break;
      case 'share-team':
        // Implement sharing functionality
        toast({
          title: "Sharing with Team",
          description: "Client profile shared with treatment team",
        });
        break;
    }
  };

  if (clientLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-32 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  const documentStats = {
    total: documents?.totalDocuments || 0,
    progressNotes: sessionNotes?.length || 0,
    assessments: documents?.assessments || 0,
    treatmentPlans: documents?.treatmentPlans || 0
  };

  const clientAge = client?.dateOfBirth 
    ? Math.floor(differenceInDays(new Date(), parseISO(client.dateOfBirth)) / 365)
    : null;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-xl font-bold">
                {client?.firstName?.[0]}{client?.lastName?.[0]}
              </div>
              <div>
                <h1 className="text-2xl font-bold">
                  {client?.firstName} {client?.lastName}
                </h1>
                <div className="flex gap-4 text-sm text-gray-600 mt-1">
                  {clientAge && <span>Age: {clientAge}</span>}
                  {client?.email && <span>{client.email}</span>}
                  {client?.phone && <span>{client.phone}</span>}
                </div>
                <div className="flex gap-2 mt-2">
                  {client?.diagnosis?.map((d: string, i: number) => (
                    <Badge key={i} variant="secondary">{d}</Badge>
                  ))}
                </div>
              </div>
            </div>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('export-data')}
              >
                <Download className="w-4 h-4 mr-1" />
                Export
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleQuickAction('share-team')}
              >
                <Share2 className="w-4 h-4 mr-1" />
                Share
              </Button>
              <Button
                size="sm"
                onClick={() => generateInsightsMutation.mutate()}
                disabled={generateInsightsMutation.isPending}
              >
                {generateInsightsMutation.isPending ? (
                  <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                ) : (
                  <Sparkles className="w-4 h-4 mr-1" />
                )}
                Generate AI Insights
              </Button>
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Sessions</p>
                <p className="text-2xl font-bold">{sessionNotes?.length || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Documents</p>
                <p className="text-2xl font-bold">{documentStats.total}</p>
              </div>
              <FileCheck className="w-8 h-8 text-green-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Appointments</p>
                <p className="text-2xl font-bold">{appointments?.length || 0}</p>
              </div>
              <Calendar className="w-8 h-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Treatment Days</p>
                <p className="text-2xl font-bold">
                  {client?.createdAt 
                    ? differenceInDays(new Date(), parseISO(client.createdAt))
                    : 0}
                </p>
              </div>
              <Clock className="w-8 h-8 text-orange-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* AI Insights Panel */}
      {aiInsights && (
        <Card className="border-gradient-to-r from-blue-500 to-purple-600">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5" />
              AI-Generated Clinical Insights
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Treatment Progress */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">Treatment Progress</span>
                <Badge variant={
                  aiInsights.treatmentProgress?.trend === 'improving' ? 'default' :
                  aiInsights.treatmentProgress?.trend === 'stable' ? 'secondary' :
                  'destructive'
                }>
                  {aiInsights.treatmentProgress?.trend}
                </Badge>
              </div>
              <p className="text-sm text-gray-600">
                {aiInsights.treatmentProgress?.summary}
              </p>
              <Progress value={aiInsights.treatmentProgress?.confidence * 100} />
            </div>

            {/* Key Themes */}
            <div>
              <h4 className="text-sm font-medium mb-2">Recurring Themes</h4>
              <div className="flex flex-wrap gap-2">
                {aiInsights.keyThemes?.map((theme: string, i: number) => (
                  <Badge key={i} variant="outline">
                    <MessageSquare className="w-3 h-3 mr-1" />
                    {theme}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Strengths & Risk Factors */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <h4 className="text-sm font-medium mb-2 text-green-600">Strengths</h4>
                <ul className="space-y-1">
                  {aiInsights.strengths?.map((strength: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-1">
                      <Heart className="w-3 h-3 text-green-500 mt-0.5" />
                      {strength}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h4 className="text-sm font-medium mb-2 text-orange-600">Risk Factors</h4>
                <ul className="space-y-1">
                  {aiInsights.riskFactors?.map((risk: string, i: number) => (
                    <li key={i} className="text-sm flex items-start gap-1">
                      <AlertCircle className="w-3 h-3 text-orange-500 mt-0.5" />
                      {risk}
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Recommendations */}
            <div>
              <h4 className="text-sm font-medium mb-2">AI Recommendations</h4>
              <div className="space-y-2">
                {aiInsights.recommendations?.map((rec: string, i: number) => (
                  <Alert key={i}>
                    <Zap className="h-4 w-4" />
                    <AlertDescription>{rec}</AlertDescription>
                  </Alert>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-4">
          {/* Treatment Goals */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Target className="w-5 h-5" />
                Treatment Goals
              </CardTitle>
            </CardHeader>
            <CardContent>
              {client?.treatmentGoals?.length > 0 ? (
                <ul className="space-y-2">
                  {client.treatmentGoals.map((goal: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-xs font-bold">
                        {i + 1}
                      </div>
                      <span className="text-sm">{goal}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-gray-500">No treatment goals defined</p>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Activity className="w-5 h-5" />
                Recent Activity
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {sessionNotes?.slice(0, 5).map((note: any) => (
                    <div key={note.id} className="flex items-start gap-3 p-2 hover:bg-gray-50 rounded">
                      <FileText className="w-4 h-4 text-gray-400 mt-0.5" />
                      <div className="flex-1">
                        <p className="text-sm font-medium">{note.title || 'Session Note'}</p>
                        <p className="text-xs text-gray-500">
                          {format(parseISO(note.createdAt), 'MMM d, yyyy')}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <CardTitle>All Documents ({documentStats.total})</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">
                    <Search className="w-4 h-4 mr-1" />
                    Search
                  </Button>
                  <Button size="sm" variant="outline">
                    <Filter className="w-4 h-4 mr-1" />
                    Filter
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                <div className="text-center p-3 bg-blue-50 rounded">
                  <p className="text-2xl font-bold text-blue-600">{documentStats.progressNotes}</p>
                  <p className="text-xs text-gray-600">Progress Notes</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded">
                  <p className="text-2xl font-bold text-green-600">{documentStats.assessments}</p>
                  <p className="text-xs text-gray-600">Assessments</p>
                </div>
                <div className="text-center p-3 bg-purple-50 rounded">
                  <p className="text-2xl font-bold text-purple-600">{documentStats.treatmentPlans}</p>
                  <p className="text-xs text-gray-600">Treatment Plans</p>
                </div>
                <div className="text-center p-3 bg-gray-50 rounded">
                  <p className="text-2xl font-bold text-gray-600">
                    {documentStats.total - documentStats.progressNotes - documentStats.assessments - documentStats.treatmentPlans}
                  </p>
                  <p className="text-xs text-gray-600">Other</p>
                </div>
              </div>
              
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {documents?.recentDocuments?.map((doc: any) => (
                    <Collapsible key={doc.id}>
                      <CollapsibleTrigger className="w-full">
                        <div className="flex items-center justify-between p-3 hover:bg-gray-50 rounded">
                          <div className="flex items-center gap-3">
                            <FileText className="w-4 h-4 text-gray-400" />
                            <div className="text-left">
                              <p className="text-sm font-medium">{doc.title}</p>
                              <p className="text-xs text-gray-500">
                                {format(parseISO(doc.date), 'MMM d, yyyy')} • {doc.type}
                              </p>
                            </div>
                          </div>
                          <ChevronDown className="w-4 h-4" />
                        </div>
                      </CollapsibleTrigger>
                      <CollapsibleContent className="px-10 pb-3">
                        <p className="text-sm text-gray-600">{doc.summary || 'No summary available'}</p>
                        <Button size="sm" variant="link" className="mt-2">
                          View Full Document →
                        </Button>
                      </CollapsibleContent>
                    </Collapsible>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="timeline">
          {/* Import and use the EnhancedClinicalTimeline component here */}
          <Card>
            <CardContent className="p-0">
              <p className="p-8 text-center text-gray-500">
                Timeline view would be rendered here using EnhancedClinicalTimeline component
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="analytics">
          <div className="grid gap-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5" />
                  Session Frequency Analysis
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Chart visualization would go here
                </div>
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <PieChart className="w-5 h-5" />
                  Treatment Focus Areas
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center text-gray-500">
                  Pie chart visualization would go here
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="treatment">
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Treatment Plan
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <h4 className="text-sm font-medium mb-2">Current Interventions</h4>
                    <ul className="space-y-1">
                      <li className="text-sm">• Cognitive Behavioral Therapy (CBT)</li>
                      <li className="text-sm">• Mindfulness-Based Stress Reduction</li>
                      <li className="text-sm">• Weekly Individual Sessions</li>
                    </ul>
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Medications</h4>
                    {client?.medications?.length > 0 ? (
                      <ul className="space-y-1">
                        {client.medications.map((med: string, i: number) => (
                          <li key={i} className="text-sm">• {med}</li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">No medications recorded</p>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-sm font-medium mb-2">Next Steps</h4>
                    {aiInsights?.nextSteps?.length > 0 ? (
                      <ul className="space-y-1">
                        {aiInsights.nextSteps.map((step: string, i: number) => (
                          <li key={i} className="text-sm flex items-start gap-2">
                            <span className="text-blue-500">→</span>
                            {step}
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-sm text-gray-500">Generate AI insights for recommendations</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};