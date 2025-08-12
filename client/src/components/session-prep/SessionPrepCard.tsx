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
  content?: {
    summary?: string;
    keyPoints?: string[];
    suggestedQuestions?: string[];
  };
  recommendations?: string[];
}

interface SessionRecommendation {
  id: string;
  recommendation: string;
  rationale: string;
  confidence: number;
  category: string;
  expectedOutcome: string;
  implementationNotes: string;
  recommendationType?: string;
  title?: string;
  description?: string;
  expectedOutcomes?: string[];
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
      // For calendar events, try to find clientId by name first
      let actualClientId = clientId;

      console.log(`🔍 SessionPrepCard: Loading session prep for eventId=${eventId}, clientName="${clientName}", clientId=${clientId}`);

      // Check if clientId is a fake/placeholder ID (starts with 'calendar-')
      if (actualClientId && typeof actualClientId === 'string' && actualClientId.startsWith('calendar-')) {
        console.log(`🔍 Detected fake client ID: ${actualClientId}, treating as undefined`);
        actualClientId = undefined;
      }

      if (!actualClientId && clientName) {
        try {
          console.log(`🔍 Searching for client by name: "${clientName}"`);
          // Try to find client by name for calendar events
          const clientSearchResponse = await fetch(`/api/clients/search?name=${encodeURIComponent(clientName)}`);
          console.log(`🔍 Client search response status: ${clientSearchResponse.status}`);
          if (clientSearchResponse.ok) {
            const clientData = await clientSearchResponse.json();
            console.log(`🔍 Client search results:`, clientData);
            if (clientData && clientData.length > 0) {
              actualClientId = clientData[0].id;
              console.log(`✅ Found client ID ${actualClientId} for calendar event client name: ${clientName}`);
            } else {
              console.log(`❌ No clients found for name: "${clientName}"`);
            }
          } else {
            console.log(`❌ Client search failed with status: ${clientSearchResponse.status}`);
          }
        } catch (error) {
          console.log('❌ Could not find client ID for calendar event:', error);
        }
      }

      console.log(`🧠 Loading AI insights for ${actualClientId ? `client ${actualClientId}` : 'non-client appointment'}...`);

      // Load AI insights for session prep - works for both client and non-client appointments
      const requestBody = actualClientId 
        ? { clientId: actualClientId }
        : { appointmentTitle: title || 'Professional Appointment' };

      const insightsResponse = await fetch(`/api/session-prep/${eventId}/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody)
      });

      if (insightsResponse.ok) {
        const contentType = insightsResponse.headers.get('content-type');
        if (contentType && contentType.includes('application/json')) {
          const data = await insightsResponse.json();
          console.log('Received AI insights data:', data);
          
          // Handle the response structure from the API
          if (data.insights) {
            // Extract insights from the nested structure
            const insights = data.insights;
            
            // Transform the API response to match frontend expectations
            const transformedInsights = {
              appointmentType: insights.appointmentType || 'session',
              title: title,
              keyThemes: insights.content?.keyPoints || [],
              recommendedFocus: insights.content?.recommendations || [],
              suggestedQuestions: insights.content?.suggestedQuestions || [],
              nextSteps: insights.content?.nextSteps || [],
              summary: insights.content?.summary || 'AI insights generated successfully',
              content: insights.content
            };
            
            setAiInsights(transformedInsights);
          } else {
            console.log('Unexpected response format:', data);
            // Fallback handling
            setAiInsights({
              appointmentType: 'session',
              title: title,
              summary: 'Insights generated',
              keyThemes: [],
              recommendedFocus: []
            });
          }
        } else {
          console.error('Expected JSON response but received HTML');
          throw new Error('Server returned HTML instead of JSON');
        }
      } else {
        console.error('AI insights request failed:', insightsResponse.status, insightsResponse.statusText);
        throw new Error(`Failed to load AI insights: ${insightsResponse.status}`);
      }
    } catch (error) {
      console.error('Error loading session prep insights:', error);
      toast({
        title: "Unable to load AI insights",
        description: "Please try again later.",
        variant: "destructive"
      });
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
    // Handle undefined/null content
    if (!content || typeof content !== 'string') {
      return 'No content available';
    }

    // Format rich text content, preserving natural line breaks and paragraphs
    // Split content into paragraphs and return first paragraph for preview
    const paragraphs = content.split('\n\n').filter(p => p.trim().length > 0);
    const firstParagraph = paragraphs[0] || content;

    // If first paragraph is too long, truncate to about 150 characters
    if (firstParagraph.length > 150) {
      const sentences = firstParagraph.split('.').filter(s => s.trim().length > 0);
      return sentences.slice(0, 2).join('.') + (sentences.length > 2 ? '...' : '.');
    }

    return firstParagraph + (paragraphs.length > 1 ? '...' : '');
  };

  // Format the complete rich text content for display
  const formatFullContent = (content: string) => {
    // Handle undefined/null content
    if (!content || typeof content !== 'string') {
      return <p className="text-muted-foreground">No content available</p>;
    }

    // Preserve natural line breaks and paragraph structure
    return content.split('\n\n').map((paragraph, index) => (
      <p key={index} className="mb-2 last:mb-0">
        {paragraph.trim()}
      </p>
    ));
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
              <div className="text-sm text-muted-foreground leading-relaxed">
                {/* Display appointment type and title */}
                {aiInsights?.appointmentType && (
                  <div className="mb-3">
                    <span className="font-medium text-gray-900 dark:text-gray-100">
                      {aiInsights.title || 'Session'} ({aiInsights.appointmentType})
                    </span>
                  </div>
                )}
                
                {/* Display key themes */}
                {aiInsights?.keyThemes && aiInsights.keyThemes.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Key Themes:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.keyThemes.map((theme: string, index: number) => (
                        <li key={index} className="text-gray-600 dark:text-gray-300">{theme}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Display recommended focus */}
                {aiInsights?.recommendedFocus && aiInsights.recommendedFocus.length > 0 && (
                  <div className="mb-3">
                    <div className="font-medium text-gray-800 dark:text-gray-200 mb-1">Recommended Focus:</div>
                    <ul className="list-disc list-inside space-y-1">
                      {aiInsights.recommendedFocus.map((focus: string, index: number) => (
                        <li key={index} className="text-gray-600 dark:text-gray-300">{focus}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                {/* Fallback to old format if available */}
                {!aiInsights?.keyThemes && (aiInsights?.content?.summary || aiInsights?.prep_content) && (
                  <div>
                    {showFullInsights ? (
                      <>{formatFullContent(aiInsights?.content?.summary || aiInsights?.prep_content || '')}</>
                    ) : (
                      <p>{formatInsightContent(aiInsights?.content?.summary || aiInsights?.prep_content || '')}</p>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Key Points */}
            {aiInsights?.content?.keyPoints && aiInsights.content.keyPoints.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Target className="h-4 w-4 text-green-500" />
                  <span className="text-sm font-medium">Key Points</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {aiInsights.content.keyPoints.map((point, index) => (
                    <Badge key={index} variant="secondary" className="text-xs">
                      {point}
                    </Badge>
                  ))}
                </div>
              </div>
            )}

            {/* Focus Areas - fallback for backward compatibility */}
            {aiInsights?.key_focus_areas && Array.isArray(aiInsights.key_focus_areas) && aiInsights.key_focus_areas.length > 0 && (
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

            {/* Suggested Questions */}
            {aiInsights?.content?.suggestedQuestions && aiInsights.content.suggestedQuestions.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-yellow-500" />
                  <span className="text-sm font-medium">Suggested Questions</span>
                </div>
                <div className="space-y-1">
                  {aiInsights.content.suggestedQuestions.slice(0, 3).map((question, index) => (
                    <div key={index} className="text-xs text-muted-foreground bg-white/50 dark:bg-black/20 rounded p-2">
                      {question}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Suggested Techniques - fallback for backward compatibility */}
            {aiInsights?.suggested_techniques && aiInsights.suggested_techniques.length > 0 && (
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

            {/* Backward compatibility for recommendations */}
            {aiInsights?.recommendations && Array.isArray(aiInsights.recommendations) && aiInsights.recommendations.length > 0 && (
              <div>
                <h4 className="font-medium text-sm mb-2">Recommendations</h4>
                <ul className="space-y-1">
                  {aiInsights.recommendations.map((rec, index) => (
                    <li key={index} className="text-sm text-gray-600">• {rec}</li>
                  ))}
                </ul>
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
            <ScrollArea className="h-48 w-full">
              <div className="space-y-2 pr-2">
                {sessionRecommendations.map((rec: any, index) => (
                  <div key={rec.id} className="bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/20 dark:to-blue-950/20 rounded-md p-3">
                    <div className="flex items-start justify-between mb-1">
                      <Badge variant="secondary" className="text-xs mb-2">
                        {rec.recommendationType}
                      </Badge>
                      <div className="flex items-center gap-1">
                        <div className={cn(
                          "w-2 h-2 rounded-full",
                          parseFloat(rec.confidence) >= 0.8 ? "bg-green-500" :
                          parseFloat(rec.confidence) >= 0.6 ? "bg-yellow-500" : "bg-red-500"
                        )}></div>
                        <span className="text-xs text-muted-foreground">
                          {Math.round(parseFloat(rec.confidence) * 100)}%
                        </span>
                      </div>
                    </div>
                    <h4 className="text-sm font-medium text-foreground mb-1">
                      {rec.title}
                    </h4>
                    <p className="text-sm text-foreground leading-relaxed mb-2">
                      {rec.description}
                    </p>
                    {rec.expectedOutcomes && rec.expectedOutcomes.length > 0 && (
                      <p className="text-xs text-muted-foreground">
                        Expected: {rec.expectedOutcomes[0]}
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