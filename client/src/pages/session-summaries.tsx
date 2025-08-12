import { useState, useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Brain, TrendingUp, Calendar, FileText, BarChart3, LineChart, Target, AlertTriangle, Lightbulb, Play, Loader2 } from 'lucide-react';
import { LineChart as RechartsLineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
         BarChart as RechartsBarChart, Bar, PieChart, Pie, Cell, RadialBarChart, RadialBar, Legend } from 'recharts';
import { apiRequest, queryClient } from '@/lib/queryClient';

interface SessionSummary {
  id: string;
  clientId: string;
  therapistId: string;
  sessionNoteIds: string[];
  title: string;
  timeframe: string;
  summaryType: string;
  keyInsights: string[];
  progressMetrics: any;
  moodTrends: any;
  goalProgress: any;
  interventionEffectiveness: any;
  riskAssessment: any;
  recommendedActions: string[];
  visualData: any;
  aiGeneratedContent: string;
  confidence: number;
  dateRange: any;
  sessionCount: number;
  avgSessionRating: number | null;
  aiModel: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
}

interface SessionNote {
  id: string;
  clientId: string;
  title: string;
  content: string;
  sessionDate: string;
}

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

export default function SessionSummariesPage() {
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [selectedSessionNotes, setSelectedSessionNotes] = useState<string[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState<string>('');
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch clients
  const { data: clients = [] } = useQuery<Client[]>({
    queryKey: ['/api/clients/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'],
  });

  // Fetch session summaries for selected client
  const { data: sessionSummaries = [], isLoading: loadingSummaries } = useQuery<SessionSummary[]>({
    queryKey: ['/api/session-summaries/client', selectedClientId],
    enabled: !!selectedClientId,
  });

  // Fetch session notes for selected client
  const { data: sessionNotes = [] } = useQuery<SessionNote[]>({
    queryKey: ['/api/session-notes/client', selectedClientId],
    enabled: !!selectedClientId,
  });

  // Generate session summary mutation
  const generateSummaryMutation = useMutation({
    mutationFn: async (data: { sessionNoteIds: string[], clientId: string, therapistId: string, timeframe: string }) =>
      await apiRequest('POST', '/api/session-summaries/generate', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-summaries/client', selectedClientId] });
      setIsGenerating(false);
      setSelectedSessionNotes([]);
      setSelectedTimeframe('');
    },
    onError: (error) => {
      console.error('Failed to generate session summary:', error);
      setIsGenerating(false);
    },
  });

  const handleGenerateSummary = () => {
    if (!selectedClientId || selectedSessionNotes.length === 0 || !selectedTimeframe) {
      return;
    }

    setIsGenerating(true);
    generateSummaryMutation.mutate({
      sessionNoteIds: selectedSessionNotes,
      clientId: selectedClientId,
      therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
      timeframe: selectedTimeframe,
    });
  };

  const handleSessionNoteToggle = (sessionNoteId: string) => {
    setSelectedSessionNotes(prev => 
      prev.includes(sessionNoteId) 
        ? prev.filter(id => id !== sessionNoteId)
        : [...prev, sessionNoteId]
    );
  };

  const renderMoodTrendsChart = (moodTrends: any) => {
    if (!moodTrends?.trendData) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Mood Progression
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsLineChart data={moodTrends.trendData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="session" />
              <YAxis domain={[0, 10]} />
              <Tooltip />
              <Line type="monotone" dataKey="mood" stroke="#0088FE" strokeWidth={3} />
              <Line type="monotone" dataKey="anxiety" stroke="#FF8042" strokeWidth={2} />
              <Line type="monotone" dataKey="energy" stroke="#00C49F" strokeWidth={2} />
            </RechartsLineChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderGoalProgressChart = (goalProgress: any[]) => {
    if (!goalProgress || !Array.isArray(goalProgress)) return null;

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Goal Progress
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RechartsBarChart data={goalProgress}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="goal" angle={-45} textAnchor="end" height={100} />
              <YAxis domain={[0, 100]} />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Progress']} />
              <Bar dataKey="progressPercentage" fill="#00C49F" />
            </RechartsBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderProgressMetricsChart = (progressMetrics: any) => {
    if (!progressMetrics) return null;

    const data = Object.entries(progressMetrics).map(([key, value]) => ({
      name: key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase()),
      value: value as number,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            Progress Metrics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <RadialBarChart cx="50%" cy="50%" innerRadius="20%" outerRadius="90%" data={data}>
              <RadialBar dataKey="value" cornerRadius={10} fill="#8884D8" />
              <Legend />
              <Tooltip formatter={(value: any) => [`${value}%`, 'Score']} />
            </RadialBarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  const renderInterventionEffectiveness = (interventionEffectiveness: any) => {
    if (!interventionEffectiveness?.effectivenessScores) return null;

    const data = Object.entries(interventionEffectiveness.effectivenessScores).map(([key, value]) => ({
      name: key.replace(/([A-Z])/g, ' $1'),
      value: value as number,
    }));

    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            Intervention Effectiveness
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="50%"
                outerRadius={80}
                fill="#8884D8"
                dataKey="value"
                label={({ name, value }) => `${name}: ${value}%`}
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value: any) => [`${value}%`, 'Effectiveness']} />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Session Summaries</h1>
          <p className="text-gray-600 dark:text-gray-400">
            AI-powered comprehensive session analysis with visual insights
          </p>
        </div>
        <Button
          onClick={handleGenerateSummary}
          disabled={!selectedClientId || selectedSessionNotes.length === 0 || !selectedTimeframe || isGenerating}
          className="flex items-center gap-2"
          data-testid="button-generate-summary"
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Play className="h-4 w-4" />
          )}
          {isGenerating ? 'Generating...' : 'Generate AI Summary'}
        </Button>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="generate">Generate Summary</TabsTrigger>
          <TabsTrigger value="view">View Summaries</TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5" />
                Generate AI-Powered Session Summary
              </CardTitle>
              <CardDescription>
                Select a client, choose session notes, and generate comprehensive analysis with visual insights
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Client Selection */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Select Client</label>
                <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                  <SelectTrigger data-testid="select-client">
                    <SelectValue placeholder="Choose a client..." />
                  </SelectTrigger>
                  <SelectContent>
                    {clients.map(client => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.firstName} {client.lastName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Session Notes Selection */}
              {selectedClientId && sessionNotes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Select Session Notes</label>
                  <ScrollArea className="h-48 border rounded-md p-4">
                    <div className="space-y-3">
                      {sessionNotes.map(note => (
                        <div key={note.id} className="flex items-center space-x-2">
                          <Checkbox
                            id={note.id}
                            checked={selectedSessionNotes.includes(note.id)}
                            onCheckedChange={() => handleSessionNoteToggle(note.id)}
                            data-testid={`checkbox-session-note-${note.id}`}
                          />
                          <label htmlFor={note.id} className="text-sm flex-1 cursor-pointer">
                            <div className="font-medium">{note.title}</div>
                            <div className="text-gray-500 text-xs">
                              {new Date(note.sessionDate).toLocaleDateString()}
                            </div>
                          </label>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                  <p className="text-xs text-gray-500">
                    {selectedSessionNotes.length} session note{selectedSessionNotes.length !== 1 ? 's' : ''} selected
                  </p>
                </div>
              )}

              {/* Timeframe Selection */}
              {selectedSessionNotes.length > 0 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Analysis Timeframe</label>
                  <Select value={selectedTimeframe} onValueChange={setSelectedTimeframe}>
                    <SelectTrigger data-testid="select-timeframe">
                      <SelectValue placeholder="Choose timeframe..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Weekly">Weekly Summary</SelectItem>
                      <SelectItem value="Bi-weekly">Bi-weekly Summary</SelectItem>
                      <SelectItem value="Monthly">Monthly Summary</SelectItem>
                      <SelectItem value="Quarterly">Quarterly Summary</SelectItem>
                      <SelectItem value="Custom Range">Custom Range</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="view" className="space-y-6">
          {/* Client Selection for viewing */}
          <Card>
            <CardHeader>
              <CardTitle>View Session Summaries</CardTitle>
              <CardDescription>Select a client to view their session summaries</CardDescription>
            </CardHeader>
            <CardContent>
              <Select value={selectedClientId} onValueChange={setSelectedClientId}>
                <SelectTrigger data-testid="select-client-view">
                  <SelectValue placeholder="Choose a client to view summaries..." />
                </SelectTrigger>
                <SelectContent>
                  {clients.map(client => (
                    <SelectItem key={client.id} value={client.id}>
                      {client.firstName} {client.lastName}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </CardContent>
          </Card>

          {/* Display Session Summaries */}
          {selectedClientId && (
            <div className="space-y-6">
              {loadingSummaries ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin" />
                    <span className="ml-2">Loading summaries...</span>
                  </CardContent>
                </Card>
              ) : sessionSummaries.length === 0 ? (
                <Card>
                  <CardContent className="flex items-center justify-center py-8">
                    <div className="text-center">
                      <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">No session summaries found for this client</p>
                      <p className="text-sm text-gray-400 mt-2">Generate your first AI summary using the Generate tab</p>
                    </div>
                  </CardContent>
                </Card>
              ) : (
                sessionSummaries.map(summary => (
                  <Card key={summary.id} className="overflow-hidden">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Brain className="h-5 w-5" />
                            {summary.title}
                          </CardTitle>
                          <CardDescription className="flex items-center gap-4 mt-2">
                            <Badge variant="outline" className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {summary.timeframe}
                            </Badge>
                            <Badge variant="secondary">
                              {summary.sessionCount} sessions
                            </Badge>
                            <Badge variant="outline">
                              Confidence: {Math.round(summary.confidence * 100)}%
                            </Badge>
                          </CardDescription>
                        </div>
                        <Badge variant="outline">{summary.status}</Badge>
                      </div>
                    </CardHeader>

                    <CardContent className="space-y-6">
                      {/* Key Insights */}
                      {summary.keyInsights && summary.keyInsights.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Lightbulb className="h-4 w-4" />
                            Key Insights
                          </h4>
                          <ul className="space-y-2">
                            {summary.keyInsights.map((insight, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm">{insight}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Visual Charts */}
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {renderMoodTrendsChart(summary.moodTrends)}
                        {renderProgressMetricsChart(summary.progressMetrics)}
                        {renderGoalProgressChart(summary.goalProgress)}
                        {renderInterventionEffectiveness(summary.interventionEffectiveness)}
                      </div>

                      {/* Risk Assessment */}
                      {summary.riskAssessment && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <AlertTriangle className="h-4 w-4" />
                            Risk Assessment
                          </h4>
                          <div className="flex items-center gap-4 mb-3">
                            <Badge variant={summary.riskAssessment.currentRiskLevel === 'low' ? 'outline' : 'destructive'}>
                              Risk Level: {summary.riskAssessment.currentRiskLevel}
                            </Badge>
                          </div>
                          {summary.riskAssessment.protectiveFactors && summary.riskAssessment.protectiveFactors.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Protective Factors:</h5>
                              <ul className="list-disc list-inside text-sm text-green-700 dark:text-green-400">
                                {summary.riskAssessment.protectiveFactors.map((factor: string, index: number) => (
                                  <li key={index}>{factor}</li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Recommended Actions */}
                      {summary.recommendedActions && summary.recommendedActions.length > 0 && (
                        <div>
                          <h4 className="font-semibold mb-3 flex items-center gap-2">
                            <Target className="h-4 w-4" />
                            Recommended Actions
                          </h4>
                          <ul className="space-y-2">
                            {summary.recommendedActions.map((action, index) => (
                              <li key={index} className="flex items-start gap-2">
                                <div className="w-1.5 h-1.5 bg-green-500 rounded-full mt-2 flex-shrink-0" />
                                <span className="text-sm">{action}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* Clinical Narrative */}
                      {summary.aiGeneratedContent && (
                        <div>
                          <h4 className="font-semibold mb-3">Clinical Narrative</h4>
                          <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                            <p className="text-sm leading-relaxed whitespace-pre-wrap">
                              {summary.aiGeneratedContent}
                            </p>
                          </div>
                        </div>
                      )}

                      <Separator />

                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>Generated by {summary.aiModel}</span>
                        <span>Created: {new Date(summary.createdAt).toLocaleDateString()}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}