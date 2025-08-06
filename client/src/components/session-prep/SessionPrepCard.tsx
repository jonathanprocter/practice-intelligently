import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { 
  Brain, 
  Heart, 
  Target, 
  MessageSquare, 
  BookOpen, 
  Lightbulb,
  Clock,
  User,
  TrendingUp,
  FileText,
  Sparkles
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';

interface SessionPrepCardProps {
  eventId: string;
  clientName: string;
  appointmentTime: string;
  clientId?: string;
  onOpenFullPrep?: () => void;
  className?: string;
}

interface AIInsights {
  prep_content: string;
  key_focus_areas: string[];
  suggested_techniques: string[];
}

interface SessionRecommendation {
  id: string;
  recommendation: string;
  rationale: string;
  confidence: number;
  category: string;
  expectedOutcome: string;
  implementationNotes: string;
}

export function SessionPrepCard({ 
  eventId, 
  clientName, 
  appointmentTime, 
  clientId,
  onOpenFullPrep,
  className 
}: SessionPrepCardProps) {
  const [aiInsights, setAiInsights] = useState<AIInsights | null>(null);
  const [sessionRecommendations, setSessionRecommendations] = useState<SessionRecommendation[]>([]);
  const [isLoadingInsights, setIsLoadingInsights] = useState(false);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);
  const [showFullInsights, setShowFullInsights] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (eventId) {
      loadSessionPrep();
    }
  }, [eventId]);

  const loadSessionPrep = async () => {
    setIsLoadingInsights(true);
    try {
      // Load AI insights for session prep
      if (clientId) {
        const insightsResponse = await fetch(`/api/session-prep/${eventId}/ai-insights`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ clientId })
        });
        
        if (insightsResponse.ok) {
          const data = await insightsResponse.json();
          setAiInsights(data.insights);
        }
      }
    } catch (error) {
      console.error('Error loading session prep insights:', error);
    } finally {
      setIsLoadingInsights(false);
    }
  };

  const loadSessionRecommendations = async () => {
    if (!clientId) return;
    
    setIsLoadingRecommendations(true);
    try {
      const response = await fetch(`/api/session-recommendations/client/${clientId}`);
      if (response.ok) {
        const recommendations = await response.json();
        setSessionRecommendations(recommendations.slice(0, 3)); // Show top 3
      }
    } catch (error) {
      console.error('Error loading session recommendations:', error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const generateNewRecommendations = async () => {
    if (!clientId) return;
    
    setIsLoadingRecommendations(true);
    try {
      const response = await fetch('/api/session-recommendations/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          clientId,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'
        })
      });
      
      if (response.ok) {
        const newRecommendations = await response.json();
        setSessionRecommendations(newRecommendations.slice(0, 3));
        toast({
          title: "Session recommendations updated",
          description: "New AI-powered suggestions have been generated for your session."
        });
      }
    } catch (error) {
      console.error('Error generating recommendations:', error);
      toast({
        title: "Error generating recommendations",
        description: "Please try again later.",
        variant: "destructive"
      });
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  useEffect(() => {
    if (clientId && sessionRecommendations.length === 0) {
      loadSessionRecommendations();
    }
  }, [clientId]);

  const formatInsightContent = (content: string) => {
    // Split content into paragraphs and return first 2-3 sentences for preview
    const sentences = content.split('.').filter(s => s.trim().length > 0);
    return sentences.slice(0, 2).join('.') + (sentences.length > 2 ? '...' : '.');
  };

  return (
    <Card className={cn("w-full max-w-2xl", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Heart className="h-5 w-5 text-blue-500" />
            <CardTitle className="text-lg">Session Preparation</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs">
              <Clock className="h-3 w-3 mr-1" />
              {appointmentTime}
            </Badge>
            <Badge variant="secondary" className="text-xs">
              <User className="h-3 w-3 mr-1" />
              {clientName}
            </Badge>
          </div>
        </div>
        <CardDescription>
          Gentle AI insights to help you prepare for a meaningful session
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* AI Insights Section */}
        {isLoadingInsights ? (
          <div className="flex items-center justify-center py-6">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Sparkles className="h-4 w-4 animate-pulse" />
              <span className="text-sm">Generating gentle insights...</span>
            </div>
          </div>
        ) : aiInsights ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <Brain className="h-4 w-4 text-purple-500" />
              <h3 className="text-sm font-medium">Thoughtful Preparation Notes</h3>
            </div>
            
            <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-950/30 dark:to-purple-950/30 rounded-lg p-4">
              <p className="text-sm text-muted-foreground leading-relaxed">
                {showFullInsights 
                  ? aiInsights.prep_content 
                  : formatInsightContent(aiInsights.prep_content)
                }
              </p>
              {aiInsights.prep_content.length > 200 && (
                <Button
                  variant="link"
                  size="sm"
                  className="mt-2 p-0 h-auto text-xs"
                  onClick={() => setShowFullInsights(!showFullInsights)}
                >
                  {showFullInsights ? 'Show less' : 'Read more'}
                </Button>
              )}
            </div>

            {/* Focus Areas */}
            {aiInsights.key_focus_areas && aiInsights.key_focus_areas.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Key Focus Areas</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiInsights.key_focus_areas.map((area, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {area}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Techniques */}
            {aiInsights.suggested_techniques && aiInsights.suggested_techniques.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Gentle Techniques</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiInsights.suggested_techniques.map((technique, index) => (
                    <Badge key={index} variant="outline" className="text-xs">
                      {technique}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-6 text-center">
            <Brain className="h-8 w-8 text-muted-foreground/50 mb-2" />
            <p className="text-sm text-muted-foreground mb-3">
              Generate gentle AI insights for this session
            </p>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={loadSessionPrep}
              disabled={!clientId}
            >
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Insights
            </Button>
          </div>
        )}

        <Separator />

        {/* Session Recommendations */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-blue-500" />
              <h3 className="text-sm font-medium">Therapeutic Suggestions</h3>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={generateNewRecommendations}
              disabled={isLoadingRecommendations || !clientId}
              className="h-7 text-xs"
            >
              {isLoadingRecommendations ? (
                <Sparkles className="h-3 w-3 animate-pulse" />
              ) : (
                <TrendingUp className="h-3 w-3" />
              )}
            </Button>
          </div>

          {isLoadingRecommendations ? (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="bg-muted/50 rounded-md p-3 animate-pulse">
                  <div className="h-3 bg-muted rounded w-3/4 mb-2"></div>
                  <div className="h-2 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : sessionRecommendations.length > 0 ? (
            <ScrollArea className="max-h-48">
              <div className="space-y-2">
                {sessionRecommendations.map((rec, index) => (
                  <div key={rec.id} className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-md p-3">
                    <div className="flex items-start justify-between mb-1">
                      <Badge variant="secondary" className="text-xs mb-2">
                        {rec.category}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          rec.confidence >= 0.8 ? "bg-green-500" :
                          rec.confidence >= 0.6 ? "bg-yellow-500" : "bg-red-500"
                        )}></div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(rec.confidence * 100)}%
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-foreground leading-relaxed mb-2">
                      {rec.recommendation}
                    </p>
                    {rec.expectedOutcome && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {rec.expectedOutcome}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-4 text-center">
              <MessageSquare className="h-6 w-6 text-muted-foreground/50 mb-2" />
              <p className="text-xs text-muted-foreground mb-2">
                No session recommendations available
              </p>
              {clientId && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  onClick={generateNewRecommendations}
                  className="text-xs"
                >
                  <Sparkles className="h-3 w-3 mr-1" />
                  Generate Suggestions
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex gap-2">
            {onOpenFullPrep && (
              <Button size="sm" variant="outline" onClick={onOpenFullPrep}>
                <FileText className="h-4 w-4 mr-2" />
                Full Preparation
              </Button>
            )}
          </div>
          
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Sparkles className="h-3 w-3" />
            <span>AI-powered insights</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}