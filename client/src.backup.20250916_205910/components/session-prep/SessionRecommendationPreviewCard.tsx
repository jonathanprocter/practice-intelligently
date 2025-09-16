import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { 
  Brain, 
  Target, 
  Zap, 
  BookOpen, 
  Star, 
  Lightbulb, 
  TrendingUp,
  Clock,
  ChevronRight,
  AlertTriangle
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SessionRecommendationPreviewProps {
  clientId: string;
  clientName: string;
  onViewAll?: () => void;
  className?: string;
  maxRecommendations?: number;
}

interface SessionRecommendation {
  id: string;
  clientId: string;
  therapistId: string;
  recommendationType: string;
  title: string;
  description: string;
  rationale: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  confidence: string;
  evidenceBase: string[];
  suggestedApproaches: string[];
  expectedOutcomes: string[];
  implementationNotes: string;
  isImplemented: boolean;
  implementedAt: Date | null;
  feedback: string | null;
  effectiveness: string | null;
  status: string;
  validUntil: Date | null;
  aiModel: string;
  createdAt: Date;
  updatedAt: Date;
}

export function SessionRecommendationPreviewCard({ 
  clientId, 
  clientName, 
  onViewAll,
  className,
  maxRecommendations = 3
}: SessionRecommendationPreviewProps) {
  
  // Fetch session recommendations for the client
  const { data: recommendations = [], isLoading } = useQuery({
    queryKey: ['/api/session-recommendations/client', clientId],
  });

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'intervention': return <Target className="h-3 w-3" />;
      case 'technique': return <Zap className="h-3 w-3" />;
      case 'assessment': return <BookOpen className="h-3 w-3" />;
      case 'homework': return <Star className="h-3 w-3" />;
      default: return <Lightbulb className="h-3 w-3" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-100 text-red-700 border-red-200';
      case 'high': return 'bg-orange-100 text-orange-700 border-orange-200';
      case 'medium': return 'bg-blue-100 text-blue-700 border-blue-200';
      case 'low': return 'bg-gray-100 text-gray-700 border-gray-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  const getConfidenceColor = (confidence: string) => {
    const conf = parseFloat(confidence);
    if (conf >= 0.8) return 'text-green-600';
    if (conf >= 0.6) return 'text-yellow-600';
    return 'text-red-600';
  };

  // Filter to pending recommendations and sort by priority and confidence
  const pendingRecommendations = (recommendations as SessionRecommendation[])
    .filter((rec: SessionRecommendation) => rec.status === 'pending')
    .sort((a: SessionRecommendation, b: SessionRecommendation) => {
      // Sort by priority first (urgent > high > medium > low)
      const priorityOrder = { urgent: 4, high: 3, medium: 2, low: 1 };
      const aPriority = priorityOrder[a.priority as keyof typeof priorityOrder] || 0;
      const bPriority = priorityOrder[b.priority as keyof typeof priorityOrder] || 0;
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      // Then sort by confidence
      return parseFloat(b.confidence) - parseFloat(a.confidence);
    })
    .slice(0, maxRecommendations);

  const urgentCount = (recommendations as SessionRecommendation[]).filter((rec: SessionRecommendation) => 
    rec.status === 'pending' && rec.priority === 'urgent'
  ).length;

  const highCount = (recommendations as SessionRecommendation[]).filter((rec: SessionRecommendation) => 
    rec.status === 'pending' && rec.priority === 'high'
  ).length;

  if (isLoading) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500 animate-pulse" />
              <CardTitle className="text-sm">Session Focus</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs animate-pulse">
              Loading...
            </Badge>
          </div>
          <CardDescription className="text-xs">
            Preparing contextual recommendations for {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[1, 2, 3].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-3 bg-gray-200 rounded w-3/4 mb-1"></div>
                <div className="h-2 bg-gray-200 rounded w-1/2"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (pendingRecommendations.length === 0) {
    return (
      <Card className={cn("w-full", className)}>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <CardTitle className="text-sm">Session Focus</CardTitle>
            </div>
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              Ready
            </Badge>
          </div>
          <CardDescription className="text-xs">
            No active recommendations for {clientName}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-3 text-muted-foreground">
            <Lightbulb className="h-8 w-8 mx-auto mb-2 text-gray-300" />
            <p className="text-xs">All recommendations addressed</p>
            <p className="text-xs text-gray-500">Focus on open dialogue</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-purple-500" />
            <CardTitle className="text-sm">Session Focus</CardTitle>
            {(urgentCount > 0 || highCount > 0) && (
              <AlertTriangle className="h-3 w-3 text-amber-500" />
            )}
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <TrendingUp className="h-3 w-3 mr-1" />
              {pendingRecommendations.length} Active
            </Badge>
            {urgentCount > 0 && (
              <Badge variant="destructive" className="text-xs">
                {urgentCount} Urgent
              </Badge>
            )}
          </div>
        </div>
        <CardDescription className="text-xs">
          Priority therapeutic recommendations for {clientName}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-3">
        <ScrollArea className="h-32 w-full">
          <div className="space-y-2 pr-2">
            {pendingRecommendations.map((rec: SessionRecommendation, index: number) => (
              <div 
                key={rec.id} 
                className={cn(
                  "border rounded-lg p-2 transition-colors hover:bg-gray-50",
                  rec.priority === 'urgent' && "border-red-200 bg-red-50/50",
                  rec.priority === 'high' && "border-orange-200 bg-orange-50/50"
                )}
              >
                <div className="flex items-start justify-between mb-1">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    {getRecommendationTypeIcon(rec.recommendationType)}
                    <span className="text-xs font-medium truncate">
                      {rec.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <Badge 
                      variant="outline" 
                      className={cn("text-xs px-1 py-0", getPriorityColor(rec.priority))}
                    >
                      {rec.priority}
                    </Badge>
                    <span className={cn("text-xs font-medium", getConfidenceColor(rec.confidence))}>
                      {Math.round(parseFloat(rec.confidence) * 100)}%
                    </span>
                  </div>
                </div>
                
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {rec.description.length > 60 ? `${rec.description.substring(0, 60)}...` : rec.description}
                </p>
                
                {rec.expectedOutcomes && rec.expectedOutcomes.length > 0 && (
                  <div className="mt-1">
                    <p className="text-xs text-blue-600 italic">
                      Expected: {rec.expectedOutcomes[0]}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>

        {((recommendations as SessionRecommendation[]).filter((r: SessionRecommendation) => r.status === 'pending').length > maxRecommendations || onViewAll) && (
          <div className="pt-2 border-t">
            <Button
              variant="ghost"
              size="sm"
              className="w-full text-xs h-7"
              onClick={onViewAll}
            >
              <span>View All Recommendations</span>
              <ChevronRight className="h-3 w-3 ml-1" />
            </Button>
          </div>
        )}

        {pendingRecommendations.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground pt-1">
            <div className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              <span>Updated {new Date(pendingRecommendations[0].updatedAt).toLocaleDateString()}</span>
            </div>
            <span className="text-xs">
              AI: {pendingRecommendations[0].aiModel}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}