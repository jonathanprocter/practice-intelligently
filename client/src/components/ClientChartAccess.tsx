import React, { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { 
  FileText, Brain, TrendingUp, Calendar, Search, 
  Tag, Shield, Activity, Clock, AlertCircle,
  ChevronRight, Filter, Download, Share2
} from 'lucide-react';
import { format } from 'date-fns';
import { apiRequest } from '@/lib/queryClient';
import { cn } from '@/lib/utils';

interface ClientChartAccessProps {
  clientId: string;
  className?: string;
  embedded?: boolean;
}

export const ClientChartAccess: React.FC<ClientChartAccessProps> = ({
  clientId,
  className,
  embedded = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  // Fetch comprehensive chart data
  const { data: chartData, isLoading, error } = useQuery({
    queryKey: ['client-chart', clientId, 'comprehensive'],
    queryFn: () => apiRequest('GET', `/api/client-chart/${clientId}/comprehensive`),
    enabled: !!clientId,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Fetch longitudinal journey
  const { data: longitudinalData } = useQuery({
    queryKey: ['client-chart', clientId, 'longitudinal'],
    queryFn: () => apiRequest('GET', `/api/client-chart/${clientId}/longitudinal`),
    enabled: !!clientId && activeTab === 'timeline',
  });

  // Search within client data
  const { data: searchResults, refetch: performSearch } = useQuery({
    queryKey: ['client-chart', clientId, 'search', searchQuery],
    queryFn: () => apiRequest('GET', `/api/client-chart/${clientId}/search?q=${searchQuery}`),
    enabled: false,
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      performSearch();
    }
  };

  if (isLoading) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        <div className="text-center">
          <Brain className="h-12 w-12 animate-pulse mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading client chart...</p>
        </div>
      </div>
    );
  }

  if (error || !chartData) {
    return (
      <div className={cn("p-8", className)}>
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="text-destructive">Error Loading Chart</CardTitle>
            <CardDescription>Unable to load client chart data</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  const { 
    client, 
    demographics, 
    clinicalOverview, 
    sessionHistory,
    documents,
    treatmentPlanning,
    actionItems,
    aiAnalysis
  } = chartData;

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header Section */}
      {!embedded && (
        <div className="flex justify-between items-start">
          <div>
            <h2 className="text-3xl font-bold">
              {client.firstName} {client.lastName}
            </h2>
            <p className="text-muted-foreground">
              Client #{client.clientNumber || 'N/A'} • {demographics.age} years old
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" size="sm">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
          </div>
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Total Sessions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{sessionHistory.totalSessions}</div>
            <p className="text-xs text-muted-foreground">
              {clinicalOverview.therapyDuration.frequency} frequency
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Documents</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{documents.totalCount}</div>
            <p className="text-xs text-muted-foreground">
              {documents.highPriority.length} high priority
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Risk Level</CardTitle>
          </CardHeader>
          <CardContent>
            <Badge 
              variant={clinicalOverview.riskLevel === 'high' ? 'destructive' : 
                      clinicalOverview.riskLevel === 'moderate' ? 'warning' : 'default'}
              className="text-lg px-3 py-1"
            >
              {clinicalOverview.riskLevel}
            </Badge>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Action Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{actionItems.pending.length}</div>
            <p className="text-xs text-muted-foreground">
              {actionItems.overdue.length} overdue
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Search Bar */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex gap-2">
            <Input
              placeholder="Search across all client data..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className="flex-1"
            />
            <Button onClick={handleSearch}>
              <Search className="h-4 w-4 mr-2" />
              Search
            </Button>
          </div>
          {searchResults && (
            <div className="mt-4 p-4 bg-muted rounded-lg">
              <p className="text-sm font-medium mb-2">
                Found {searchResults.totalResults} results
              </p>
              <div className="space-y-2">
                {searchResults.sessions?.slice(0, 3).map((session: any) => (
                  <div key={session.id} className="text-sm">
                    <Badge variant="outline" className="mr-2">Session</Badge>
                    {session.title || format(new Date(session.sessionDate), 'MMM d, yyyy')}
                  </div>
                ))}
                {searchResults.documents?.slice(0, 3).map((doc: any) => (
                  <div key={doc.id} className="text-sm">
                    <Badge variant="outline" className="mr-2">Document</Badge>
                    {doc.fileName}
                  </div>
                ))}
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Main Content Tabs */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid grid-cols-6 w-full">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="sessions">Sessions</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="treatment">Treatment</TabsTrigger>
          <TabsTrigger value="insights">AI Insights</TabsTrigger>
        </TabsList>

        {/* Overview Tab */}
        <TabsContent value="overview" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Clinical Overview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Primary Diagnoses</p>
                  <div className="flex flex-wrap gap-2 mt-1">
                    {clinicalOverview.primaryDiagnoses.map((dx, i) => (
                      <Badge key={i} variant="secondary">{dx}</Badge>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Current Medications</p>
                  <div className="space-y-1 mt-1">
                    {clinicalOverview.currentMedications.map((med: any, i) => (
                      <div key={i} className="text-sm">
                        {med.name} - {med.dosage}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Treatment Duration</p>
                  <p className="text-sm">
                    Started {format(new Date(clinicalOverview.therapyDuration.startDate), 'MMM d, yyyy')}
                  </p>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[200px]">
                  <div className="space-y-3">
                    {sessionHistory.recentSessions.map((session: any) => (
                      <div key={session.id} className="flex items-start gap-3">
                        <Calendar className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {session.title || 'Session'}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(session.sessionDate), 'MMM d, yyyy')}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Timeline Tab */}
        <TabsContent value="timeline" className="space-y-4">
          {longitudinalData && (
            <Card>
              <CardHeader>
                <CardTitle>Treatment Journey</CardTitle>
                <CardDescription>
                  Longitudinal view of client's therapeutic progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[500px]">
                  <div className="space-y-4">
                    {longitudinalData.timelineEvents?.map((event: any, i: number) => (
                      <div key={i} className="flex gap-4">
                        <div className="flex flex-col items-center">
                          <div className={cn(
                            "w-3 h-3 rounded-full",
                            event.clinicalSignificance === 'high' ? 'bg-red-500' :
                            event.clinicalSignificance === 'medium' ? 'bg-yellow-500' :
                            'bg-green-500'
                          )} />
                          {i < longitudinalData.timelineEvents.length - 1 && (
                            <div className="w-0.5 h-16 bg-border" />
                          )}
                        </div>
                        <div className="flex-1 pb-8">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className="font-medium">{event.title}</p>
                              <p className="text-sm text-muted-foreground">
                                {format(new Date(event.date), 'MMM d, yyyy')}
                              </p>
                            </div>
                            <Badge variant={
                              event.sentiment === 'positive' ? 'success' :
                              event.sentiment === 'negative' ? 'destructive' :
                              'secondary'
                            }>
                              {event.type}
                            </Badge>
                          </div>
                          <p className="text-sm mt-2">{event.summary}</p>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {event.tags?.slice(0, 5).map((tag: string, j: number) => (
                              <Badge key={j} variant="outline" className="text-xs">
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value="documents" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Document Library</CardTitle>
              <CardDescription>
                {documents.totalCount} documents organized by category
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {Array.from(documents.byCategory.entries()).map(([category, docs]) => (
                  <div key={category}>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium capitalize">
                        {category.replace('-', ' ')}
                      </h4>
                      <Badge variant="secondary">{docs.length}</Badge>
                    </div>
                    <div className="space-y-2">
                      {docs.slice(0, 3).map((doc: any) => (
                        <div key={doc.id} className="flex items-center gap-3 p-2 hover:bg-muted rounded-lg cursor-pointer">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <div className="flex-1">
                            <p className="text-sm font-medium">{doc.fileName}</p>
                            <div className="flex gap-2 mt-1">
                              {doc.sensitivityLevel === 'high' && (
                                <Badge variant="destructive" className="text-xs">
                                  <Shield className="h-3 w-3 mr-1" />
                                  High Sensitivity
                                </Badge>
                              )}
                              {doc.aiTags?.slice(0, 2).map((tag: any, i: number) => (
                                <Badge key={i} variant="outline" className="text-xs">
                                  <Tag className="h-3 w-3 mr-1" />
                                  {typeof tag === 'string' ? tag : tag.tag}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <ChevronRight className="h-4 w-4" />
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>AI Analysis & Recommendations</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {aiAnalysis.riskAssessment && (
                <div className="p-4 border rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <AlertCircle className="h-5 w-5 text-warning" />
                    <h4 className="font-medium">Risk Assessment</h4>
                  </div>
                  <Badge variant={
                    aiAnalysis.riskAssessment.level === 'high' ? 'destructive' :
                    aiAnalysis.riskAssessment.level === 'moderate' ? 'warning' :
                    'default'
                  }>
                    {aiAnalysis.riskAssessment.level} Risk
                  </Badge>
                  <div className="mt-2 space-y-1">
                    {aiAnalysis.riskAssessment.factors.map((factor: string, i: number) => (
                      <p key={i} className="text-sm text-muted-foreground">• {factor}</p>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                <h4 className="font-medium">Recent Insights</h4>
                {aiAnalysis.insights.map((insight: any) => (
                  <div key={insight.id} className="p-3 border rounded-lg">
                    <div className="flex items-start justify-between">
                      <div>
                        <p className="font-medium text-sm">{insight.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {insight.content}
                        </p>
                      </div>
                      <Badge variant="outline">{insight.type}</Badge>
                    </div>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-medium">Active Recommendations</h4>
                {aiAnalysis.recommendations.map((rec: any) => (
                  <div key={rec.id} className="p-3 border rounded-lg">
                    <div className="flex items-start gap-3">
                      <Brain className="h-4 w-4 mt-0.5 text-primary" />
                      <div className="flex-1">
                        <p className="font-medium text-sm">{rec.title}</p>
                        <p className="text-sm text-muted-foreground mt-1">
                          {rec.description}
                        </p>
                        <div className="flex gap-2 mt-2">
                          <Badge variant={
                            rec.priority === 'high' ? 'destructive' :
                            rec.priority === 'medium' ? 'warning' :
                            'secondary'
                          }>
                            {rec.priority} priority
                          </Badge>
                          <Badge variant="outline">
                            {Math.round(rec.confidence * 100)}% confidence
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};