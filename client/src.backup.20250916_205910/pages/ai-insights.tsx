import { useQuery, useMutation } from "@tanstack/react-query";
import { ApiClient, type AiInsight } from "@/lib/api";
import { Bot, Lightbulb, TrendingUp, FileText, AlertTriangle, Sparkles, RefreshCw, Eye, X, Brain, Users, Calendar, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { AIIntelligenceDashboard } from "@/components/dashboard/AIIntelligenceDashboard";

export default function AiInsights() {
  const [filterType, setFilterType] = useState("all");
  const [selectedInsight, setSelectedInsight] = useState<AiInsight | null>(null);
  const [activeView, setActiveView] = useState<'intelligence' | 'legacy'>('intelligence');
  const [selectedClientId, setSelectedClientId] = useState<string | undefined>(undefined);

  const { toast } = useToast();

  // Mock therapist ID - in a real app, this would come from auth context
  const therapistId = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c";

  const { data: insights, isLoading } = useQuery({
    queryKey: ['ai-insights'],
    queryFn: ApiClient.getAiInsights,
  });

  const generateMutation = useMutation({
    mutationFn: ApiClient.generateAiInsights,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
      toast({ title: "AI insights generated successfully" });
    },
    onError: () => {
      toast({ title: "Failed to generate AI insights", variant: "destructive" });
    }
  });

  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'pattern': return Lightbulb;
      case 'progress': return TrendingUp;
      case 'risk': return AlertTriangle;
      case 'suggestion': return FileText;
      default: return Bot;
    }
  };

  const getInsightColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'bg-therapy-primary/20 text-therapy-primary border-therapy-primary/30';
      case 'progress': return 'bg-therapy-success/20 text-therapy-success border-therapy-success/30';
      case 'risk': return 'bg-therapy-error/20 text-therapy-error border-therapy-error/30';
      case 'suggestion': return 'bg-therapy-warning/20 text-therapy-warning border-therapy-warning/30';
      default: return 'bg-therapy-primary/20 text-therapy-primary border-therapy-primary/30';
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'pattern': return 'bg-therapy-primary/10 text-therapy-primary';
      case 'progress': return 'bg-therapy-success/10 text-therapy-success';
      case 'risk': return 'bg-therapy-error/10 text-therapy-error';
      case 'suggestion': return 'bg-therapy-warning/10 text-therapy-warning';
      default: return 'bg-therapy-primary/10 text-therapy-primary';
    }
  };

  const filteredInsights = insights?.filter(insight => 
    filterType === "all" || insight.type === filterType
  ) || [];

  const getConfidenceLevel = (confidence?: number) => {
    if (!confidence) return 'Unknown';
    if (confidence >= 80) return 'High';
    if (confidence >= 60) return 'Medium';
    return 'Low';
  };

  const getConfidenceColor = (confidence?: number) => {
    if (!confidence) return 'text-gray-500';
    if (confidence >= 80) return 'text-green-600';
    if (confidence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Get clients for selection - moved before conditional returns
  const { data: clients } = useQuery({
    queryKey: ['clients'],
    queryFn: ApiClient.getClients,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">AI Insights</h1>
          <Button>
            <RefreshCw className="w-4 h-4 mr-2" />
            Generate Insights
          </Button>
        </div>
        <div className="grid gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="therapy-card p-6 animate-pulse">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded mb-2"></div>
                  <div className="h-3 bg-gray-200 rounded w-2/3 mb-3"></div>
                  <div className="h-8 bg-gray-200 rounded w-20"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text flex items-center gap-3">
            <Brain className="w-8 h-8 text-blue-600" />
            AI Clinical Intelligence
          </h1>
          <p className="text-therapy-text/60">Advanced AI-powered clinical analytics and predictive insights</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedClientId || "all"} onValueChange={(value) => setSelectedClientId(value === "all" ? undefined : value)}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="Select client for analysis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Clients</SelectItem>
              {clients?.map((client) => (
                <SelectItem key={client.id} value={client.id}>
                  {(client as any).name || `Client ${client.id}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Advanced AI Intelligence Dashboard */}
      <Tabs value={activeView} onValueChange={(value) => setActiveView(value as 'intelligence' | 'legacy')}>
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="intelligence" className="flex items-center gap-2">
            <Brain className="w-4 h-4" />
            AI Intelligence
          </TabsTrigger>
          <TabsTrigger value="legacy" className="flex items-center gap-2">
            <Bot className="w-4 h-4" />
            Basic Insights
          </TabsTrigger>
        </TabsList>

        <TabsContent value="intelligence" className="mt-6">
          <AIIntelligenceDashboard 
            therapistId={therapistId}
            clientId={selectedClientId}
          />
        </TabsContent>

        <TabsContent value="legacy" className="mt-6">
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <div>
                <h2 className="text-xl font-semibold text-therapy-text">Basic AI Insights</h2>
                <p className="text-therapy-text/60">Traditional AI analysis and recommendations</p>
              </div>
              <Button 
                onClick={() => generateMutation.mutate()}
                disabled={generateMutation.isPending}
                className="bg-therapy-primary hover:bg-therapy-primary/90"
              >
                <RefreshCw className={`w-4 h-4 mr-2 ${generateMutation.isPending ? 'animate-spin' : ''}`} />
                {generateMutation.isPending ? 'Generating...' : 'Generate Insights'}
              </Button>
            </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-primary/10 rounded-lg flex items-center justify-center">
                <Lightbulb className="text-therapy-primary" />
              </div>
              <Badge variant="secondary">
                {insights?.filter(i => i.type === 'pattern').length || 0}
              </Badge>
            </div>
            <h3 className="font-semibold text-therapy-text">Pattern Analysis</h3>
            <p className="text-sm text-therapy-text/60">Behavioral patterns detected</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-success/10 rounded-lg flex items-center justify-center">
                <TrendingUp className="text-therapy-success" />
              </div>
              <Badge variant="secondary">
                {insights?.filter(i => i.type === 'progress').length || 0}
              </Badge>
            </div>
            <h3 className="font-semibold text-therapy-text">Progress Tracking</h3>
            <p className="text-sm text-therapy-text/60">Treatment progress insights</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-error/10 rounded-lg flex items-center justify-center">
                <AlertTriangle className="text-therapy-error" />
              </div>
              <Badge variant="secondary">
                {insights?.filter(i => i.type === 'risk').length || 0}
              </Badge>
            </div>
            <h3 className="font-semibold text-therapy-text">Risk Assessment</h3>
            <p className="text-sm text-therapy-text/60">Potential risk factors</p>
          </CardContent>
        </Card>

        <Card className="therapy-card border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div className="w-12 h-12 bg-therapy-warning/10 rounded-lg flex items-center justify-center">
                <FileText className="text-therapy-warning" />
              </div>
              <Badge variant="secondary">
                {insights?.filter(i => i.type === 'suggestion').length || 0}
              </Badge>
            </div>
            <h3 className="font-semibold text-therapy-text">Recommendations</h3>
            <p className="text-sm text-therapy-text/60">AI-generated suggestions</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <div className="flex items-center space-x-4">
        <Select value={filterType} onValueChange={setFilterType}>
          <SelectTrigger className="w-48">
            <SelectValue placeholder="Filter by type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Insights</SelectItem>
            <SelectItem value="pattern">Pattern Analysis</SelectItem>
            <SelectItem value="progress">Progress Tracking</SelectItem>
            <SelectItem value="risk">Risk Assessment</SelectItem>
            <SelectItem value="suggestion">Recommendations</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Insights List */}
      <div className="grid gap-6">
        {filteredInsights.length > 0 ? (
          filteredInsights.map((insight) => {
            const IconComponent = getInsightIcon(insight.type);
            return (
              <Card key={insight.id} className={`therapy-card border-0 border-l-4 ${getInsightColor(insight.type)}`}>
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4 flex-1">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getInsightColor(insight.type)}`}>
                        <IconComponent className="h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-3 mb-2">
                          <h3 className="font-semibold text-therapy-text">{insight.title}</h3>
                          <Badge className={getTypeBadgeColor(insight.type)}>
                            {insight.type.charAt(0).toUpperCase() + insight.type.slice(1)}
                          </Badge>
                          {insight.confidence && (
                            <Badge variant="outline" className={getConfidenceColor(insight.confidence)}>
                              {getConfidenceLevel(insight.confidence)} Confidence
                            </Badge>
                          )}
                        </div>
                        <p className="text-therapy-text/70 mb-4 line-clamp-3">
                          {insight.content}
                        </p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-sm text-therapy-text/50">
                            <span>{new Date(insight.createdAt).toLocaleDateString()}</span>
                            {!insight.isRead && (
                              <Badge variant="secondary" className="text-xs">New</Badge>
                            )}
                          </div>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => setSelectedInsight(insight)}
                          >
                            <Eye className="w-4 h-4 mr-2" />
                            View Details
                          </Button>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <div className="therapy-card p-12 text-center">
            <Bot className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-therapy-text mb-2">
              {filterType === "all" ? 'No AI insights yet' : `No ${filterType} insights found`}
            </h3>
            <p className="text-therapy-text/60 mb-4">
              {filterType === "all" 
                ? 'Generate AI insights to get personalized recommendations for your practice'
                : `Try generating insights or selecting a different filter type`
              }
            </p>
            <Button 
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending}
              className="bg-therapy-primary hover:bg-therapy-primary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              {generateMutation.isPending ? 'Generating...' : 'Generate AI Insights'}
            </Button>
          </div>
        )}
      </div>

          {/* Insight Detail Modal */}
          {selectedInsight && (
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
              <div className="therapy-card max-w-2xl w-full max-h-[80vh] overflow-y-auto">
                <div className="p-6">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex items-start space-x-4">
                      <div className={`w-12 h-12 rounded-lg flex items-center justify-center ${getInsightColor(selectedInsight.type)}`}>
                        {(() => {
                          const IconComponent = getInsightIcon(selectedInsight.type);
                          return <IconComponent className="h-6 w-6" />;
                        })()}
                      </div>
                      <div>
                        <h2 className="text-xl font-bold text-therapy-text mb-2">
                          {selectedInsight.title}
                        </h2>
                        <div className="flex items-center space-x-3">
                          <Badge className={getTypeBadgeColor(selectedInsight.type)}>
                            {selectedInsight.type.charAt(0).toUpperCase() + selectedInsight.type.slice(1)}
                          </Badge>
                          {selectedInsight.confidence && (
                            <Badge variant="outline" className={getConfidenceColor(selectedInsight.confidence)}>
                              {getConfidenceLevel(selectedInsight.confidence)} Confidence ({selectedInsight.confidence}%)
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => setSelectedInsight(null)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-therapy-text mb-2">Analysis Details</h3>
                      <p className="text-therapy-text/80 whitespace-pre-wrap">
                        {selectedInsight.content}
                      </p>
                    </div>

                    <div className="flex items-center justify-between pt-4 border-t border-therapy-border">
                      <div className="text-sm text-therapy-text/50">
                        Generated on {new Date(selectedInsight.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                          hour: '2-digit',
                          minute: '2-digit'
                        })}
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" onClick={() => setSelectedInsight(null)}>
                          Close
                        </Button>
                        <Button className="bg-therapy-primary hover:bg-therapy-primary/90">
                          Mark as Reviewed
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}