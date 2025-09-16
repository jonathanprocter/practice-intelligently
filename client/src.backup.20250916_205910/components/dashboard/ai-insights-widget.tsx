import { useQuery, useMutation } from "@tanstack/react-query";
import { ApiClient, type AiInsight } from "@/lib/api";
import { 
  Bot, Lightbulb, TrendingUp, AlertTriangle, 
  Brain, Sparkles, RefreshCw, ChevronRight,
  AlertCircle, CheckCircle, Clock, User
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useState, useEffect } from "react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Link } from "wouter";
import { 
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface AIInsightsWidgetProps {
  therapistId?: string;
  clientId?: string;
  compact?: boolean;
  maxItems?: number;
}

export function AIInsightsWidget({ 
  therapistId = "e66b8b8e-e7a2-40b9-ae74-00c93ffe503c",
  clientId,
  compact = false,
  maxItems = 5
}: AIInsightsWidgetProps) {
  const [dismissedInsights, setDismissedInsights] = useState<Set<string>>(new Set());
  const [autoRefresh, setAutoRefresh] = useState(true);
  const { toast } = useToast();

  // Fetch AI insights with real-time updates
  const { data: insights, isLoading, refetch } = useQuery({
    queryKey: ['ai-insights', clientId || 'all'],
    queryFn: async () => {
      if (clientId) {
        return ApiClient.getClientAiInsights(clientId);
      }
      return ApiClient.getAiInsights();
    },
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds
  });

  // Mark insight as read
  const markAsReadMutation = useMutation({
    mutationFn: (insightId: string) => ApiClient.markInsightAsRead(insightId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ai-insights'] });
    }
  });

  // Dismiss insight temporarily
  const dismissInsight = (insightId: string) => {
    setDismissedInsights(prev => new Set(prev).add(insightId));
    markAsReadMutation.mutate(insightId);
  };

  // Filter and sort insights
  const filteredInsights = insights
    ?.filter(insight => !dismissedInsights.has(insight.id))
    ?.sort((a, b) => {
      // Sort by priority first, then by date
      const priorityOrder = { high: 0, medium: 1, low: 2 };
      const priorityDiff = (priorityOrder[a.priority as keyof typeof priorityOrder] || 2) - 
                           (priorityOrder[b.priority as keyof typeof priorityOrder] || 2);
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    })
    ?.slice(0, maxItems) || [];

  // Get insight statistics
  const stats = {
    total: insights?.length || 0,
    high: insights?.filter(i => i.priority === 'high').length || 0,
    unread: insights?.filter(i => !i.isRead).length || 0,
    actionRequired: insights?.filter(i => i.actionRequired).length || 0
  };

  // Get icon based on insight type
  const getInsightIcon = (type: string) => {
    switch (type) {
      case 'initial_assessment':
        return User;
      case 'session_analysis':
        return Brain;
      case 'progress_report':
        return TrendingUp;
      case 'urgent_alert':
      case 'urgent_document_flag':
        return AlertTriangle;
      case 'pattern_detection':
        return Lightbulb;
      case 'weekly_summary':
      case 'monthly_analytics':
        return Sparkles;
      default:
        return Bot;
    }
  };

  // Get color based on priority
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'text-red-600 bg-red-50 border-red-200';
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200';
      default:
        return 'text-blue-600 bg-blue-50 border-blue-200';
    }
  };

  // Get badge variant based on type
  const getTypeBadge = (type: string) => {
    const typeLabels: Record<string, string> = {
      initial_assessment: 'New Client',
      session_analysis: 'Session',
      progress_report: 'Progress',
      urgent_alert: 'URGENT',
      urgent_document_flag: 'Document Alert',
      pattern_detection: 'Pattern',
      weekly_summary: 'Weekly',
      monthly_analytics: 'Monthly',
      risk_assessment: 'Risk',
      treatment_recommendation: 'Treatment'
    };

    const label = typeLabels[type] || 'Insight';
    const isUrgent = type.includes('urgent');

    return (
      <Badge 
        variant={isUrgent ? "destructive" : "secondary"}
        className={cn(
          "text-xs",
          isUrgent && "animate-pulse"
        )}
      >
        {label}
      </Badge>
    );
  };

  // Format time ago
  const formatTimeAgo = (date: string) => {
    const now = new Date();
    const insightDate = new Date(date);
    const diffMs = now.getTime() - insightDate.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffMins < 1440) return `${Math.floor(diffMins / 60)}h ago`;
    return format(insightDate, 'MMM d');
  };

  // Auto-refresh effect
  useEffect(() => {
    if (autoRefresh) {
      const interval = setInterval(() => {
        refetch();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refetch]);

  // Show loading state
  if (isLoading) {
    return (
      <Card className={cn(compact && "border-0 shadow-none")}>
        <CardHeader className={cn(compact && "pb-3")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-therapy-primary" />
              AI Insights
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  // Show empty state
  if (filteredInsights.length === 0) {
    return (
      <Card className={cn(compact && "border-0 shadow-none")}>
        <CardHeader className={cn(compact && "pb-3")}>
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg flex items-center gap-2">
              <Brain className="h-5 w-5 text-therapy-primary" />
              AI Insights
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="text-center py-6 text-gray-500">
            <Brain className="h-12 w-12 mx-auto mb-3 text-gray-300" />
            <p className="text-sm">No AI insights available</p>
            <p className="text-xs mt-1">Insights will appear as you use the system</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn(compact && "border-0 shadow-none")}>
      <CardHeader className={cn(compact && "pb-3")}>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Brain className="h-5 w-5 text-therapy-primary" />
            AI Insights
            {stats.unread > 0 && (
              <Badge variant="destructive" className="ml-2">
                {stats.unread} new
              </Badge>
            )}
          </CardTitle>
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setAutoRefresh(!autoRefresh)}
                    className={cn(
                      "h-8 w-8",
                      autoRefresh && "text-therapy-primary"
                    )}
                  >
                    <Clock className="h-4 w-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  {autoRefresh ? 'Auto-refresh ON' : 'Auto-refresh OFF'}
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => refetch()}
              className="h-8 w-8"
            >
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>
        
        {/* Statistics bar */}
        {!compact && stats.total > 0 && (
          <div className="flex items-center gap-4 mt-3 text-xs text-gray-600">
            <span className="flex items-center gap-1">
              <AlertCircle className="h-3 w-3" />
              {stats.high} urgent
            </span>
            <span className="flex items-center gap-1">
              <CheckCircle className="h-3 w-3" />
              {stats.actionRequired} action needed
            </span>
            <span className="flex items-center gap-1">
              <Bot className="h-3 w-3" />
              {stats.total} total
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className={cn(compact && "pt-0")}>
        <ScrollArea className={cn(
          compact ? "h-[200px]" : "h-[400px]"
        )}>
          <div className="space-y-3">
            {filteredInsights.map((insight) => {
              const Icon = getInsightIcon(insight.insightType);
              const isUrgent = insight.priority === 'high' || insight.insightType.includes('urgent');
              
              return (
                <div
                  key={insight.id}
                  className={cn(
                    "p-3 rounded-lg border transition-all",
                    getPriorityColor(insight.priority),
                    !insight.isRead && "font-medium",
                    isUrgent && "border-red-400 bg-red-50"
                  )}
                  data-testid={`insight-card-${insight.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div className={cn(
                      "p-2 rounded-lg",
                      isUrgent ? "bg-red-100" : "bg-white"
                    )}>
                      <Icon className={cn(
                        "h-4 w-4",
                        isUrgent ? "text-red-600" : "text-therapy-primary"
                      )} />
                    </div>
                    
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        {getTypeBadge(insight.insightType)}
                        {insight.actionRequired && (
                          <Badge variant="outline" className="text-xs border-orange-300 text-orange-700">
                            Action Required
                          </Badge>
                        )}
                        <span className="text-xs text-gray-500">
                          {formatTimeAgo(insight.createdAt)}
                        </span>
                      </div>
                      
                      <p className={cn(
                        "text-sm mb-2",
                        isUrgent && "text-red-900"
                      )}>
                        {insight.content}
                      </p>
                      
                      {insight.recommendations && insight.recommendations.length > 0 && (
                        <div className="space-y-1 mb-2">
                          {insight.recommendations.slice(0, 2).map((rec, idx) => (
                            <div key={idx} className="flex items-start gap-1">
                              <ChevronRight className="h-3 w-3 mt-0.5 flex-shrink-0" />
                              <span className="text-xs">{rec}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Metadata badges */}
                      <div className="flex flex-wrap gap-1 mb-2">
                        {insight.metadata?.confidence && (
                          <Badge variant="outline" className="text-xs">
                            {insight.metadata.confidence}% confidence
                          </Badge>
                        )}
                        {insight.metadata?.sessionCount && (
                          <Badge variant="outline" className="text-xs">
                            Session #{insight.metadata.sessionCount}
                          </Badge>
                        )}
                        {insight.metadata?.modelsUsed && (
                          <Badge variant="outline" className="text-xs">
                            {insight.metadata.modelsUsed.length} models
                          </Badge>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2 mt-2">
                        {insight.clientId && (
                          <Link href={`/client-chart?id=${insight.clientId}`}>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 text-xs"
                            >
                              View Client
                            </Button>
                          </Link>
                        )}
                        
                        {!insight.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 text-xs"
                            onClick={() => markAsReadMutation.mutate(insight.id)}
                          >
                            Mark as Read
                          </Button>
                        )}
                        
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs"
                          onClick={() => dismissInsight(insight.id)}
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </ScrollArea>
        
        {/* View all link */}
        {!compact && stats.total > maxItems && (
          <div className="mt-4 pt-3 border-t">
            <Link href="/ai-insights">
              <Button variant="outline" className="w-full" size="sm">
                View All {stats.total} Insights
                <ChevronRight className="h-4 w-4 ml-2" />
              </Button>
            </Link>
          </div>
        )}
      </CardContent>
    </Card>
  );
}