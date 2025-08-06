import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Progress } from "@/components/ui/progress";
import { Lightbulb, Clock, CheckCircle, XCircle, Zap, Target, BookOpen, Star, Sparkles } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";

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

interface SessionRecommendationsProps {
  clientId: string;
  therapistId: string;
}

export function SessionRecommendations({ clientId, therapistId }: SessionRecommendationsProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<SessionRecommendation | null>(null);
  const [feedback, setFeedback] = useState("");
  const [effectiveness, setEffectiveness] = useState("");
  const queryClient = useQueryClient();

  // Fetch session recommendations for the client
  const { data: recommendations = [], isLoading, error } = useQuery({
    queryKey: ['/api/session-recommendations/client', clientId],
  });

  // Generate new recommendations
  const generateRecommendationsMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest('POST', '/api/session-recommendations/generate', { clientId, therapistId });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-recommendations/client', clientId] });
    },
  });

  // Mark recommendation as implemented
  const implementRecommendationMutation = useMutation({
    mutationFn: async ({ id, feedback, effectiveness }: { id: string; feedback: string; effectiveness: string }) => {
      const response = await apiRequest('PUT', `/api/session-recommendations/${id}/implement`, { feedback, effectiveness });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/session-recommendations/client', clientId] });
      setSelectedRecommendation(null);
      setFeedback("");
      setEffectiveness("");
    },
  });

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'urgent': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'medium': return 'bg-blue-500';
      case 'low': return 'bg-gray-500';
      default: return 'bg-gray-500';
    }
  };

  const getRecommendationTypeIcon = (type: string) => {
    switch (type) {
      case 'intervention': return <Target className="h-4 w-4" />;
      case 'technique': return <Zap className="h-4 w-4" />;
      case 'assessment': return <BookOpen className="h-4 w-4" />;
      case 'homework': return <Star className="h-4 w-4" />;
      default: return <Lightbulb className="h-4 w-4" />;
    }
  };

  const pendingRecommendations = recommendations.filter((rec: SessionRecommendation) => rec.status === 'pending');
  const implementedRecommendations = recommendations.filter((rec: SessionRecommendation) => rec.isImplemented);

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Session Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
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

  if (error) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <XCircle className="h-5 w-5 text-red-500" />
            Error Loading Recommendations
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-red-600">Failed to load session recommendations. Please try again.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            AI Session Recommendations
          </div>
          <Button
            onClick={() => generateRecommendationsMutation.mutate()}
            disabled={generateRecommendationsMutation.isPending}
            variant="outline"
            size="sm"
          >
            {generateRecommendationsMutation.isPending ? (
              <div className="flex items-center gap-2">
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600"></div>
                Generating...
              </div>
            ) : (
              <>
                <Sparkles className="h-4 w-4 mr-2" />
                Generate New
              </>
            )}
          </Button>
        </CardTitle>
        <CardDescription>
          AI-powered therapeutic recommendations based on client history and clinical patterns
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="pending" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Pending ({pendingRecommendations.length})
            </TabsTrigger>
            <TabsTrigger value="implemented" className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4" />
              Implemented ({implementedRecommendations.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending" className="space-y-4 mt-4">
            {pendingRecommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Lightbulb className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No pending recommendations</p>
                <p className="text-sm">Generate new recommendations based on recent session data</p>
              </div>
            ) : (
              pendingRecommendations.map((recommendation: SessionRecommendation) => (
                <Card key={recommendation.id} className="border-l-4 border-l-blue-500">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        {getRecommendationTypeIcon(recommendation.recommendationType)}
                        <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={`${getPriorityColor(recommendation.priority)} text-white`}>
                          {recommendation.priority.toUpperCase()}
                        </Badge>
                        <Badge variant="outline">
                          {Math.round(parseFloat(recommendation.confidence) * 100)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{recommendation.description}</p>
                    
                    <div className="space-y-2">
                      <h4 className="font-medium text-sm text-gray-900">Clinical Rationale:</h4>
                      <p className="text-sm text-gray-600">{recommendation.rationale}</p>
                    </div>

                    {recommendation.suggestedApproaches && recommendation.suggestedApproaches.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-900">Suggested Approaches:</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {recommendation.suggestedApproaches.map((approach, index) => (
                            <li key={index}>{approach}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendation.expectedOutcomes && recommendation.expectedOutcomes.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-900">Expected Outcomes:</h4>
                        <ul className="text-sm text-gray-600 list-disc list-inside space-y-1">
                          {recommendation.expectedOutcomes.map((outcome, index) => (
                            <li key={index}>{outcome}</li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {recommendation.implementationNotes && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-900">Implementation Notes:</h4>
                        <p className="text-sm text-gray-600">{recommendation.implementationNotes}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4">
                      <div className="text-xs text-gray-500">
                        Generated by {recommendation.aiModel} • {new Date(recommendation.createdAt).toLocaleDateString()}
                      </div>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button 
                            size="sm"
                            onClick={() => setSelectedRecommendation(recommendation)}
                          >
                            Mark as Implemented
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Mark Recommendation as Implemented</DialogTitle>
                            <DialogDescription>
                              Please provide feedback on the implementation and effectiveness of this recommendation.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium">Implementation Feedback</label>
                              <Textarea
                                placeholder="Describe how you implemented this recommendation..."
                                value={feedback}
                                onChange={(e) => setFeedback(e.target.value)}
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Effectiveness</label>
                              <select
                                value={effectiveness}
                                onChange={(e) => setEffectiveness(e.target.value)}
                                className="w-full mt-1 p-2 border rounded-md"
                              >
                                <option value="">Select effectiveness...</option>
                                <option value="very_effective">Very Effective</option>
                                <option value="somewhat_effective">Somewhat Effective</option>
                                <option value="ineffective">Ineffective</option>
                                <option value="not_tried">Not Tried</option>
                              </select>
                            </div>
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="outline"
                                onClick={() => {
                                  setSelectedRecommendation(null);
                                  setFeedback("");
                                  setEffectiveness("");
                                }}
                              >
                                Cancel
                              </Button>
                              <Button
                                onClick={() => {
                                  if (selectedRecommendation) {
                                    implementRecommendationMutation.mutate({
                                      id: selectedRecommendation.id,
                                      feedback,
                                      effectiveness
                                    });
                                  }
                                }}
                                disabled={!effectiveness || implementRecommendationMutation.isPending}
                              >
                                {implementRecommendationMutation.isPending ? "Saving..." : "Save Implementation"}
                              </Button>
                            </div>
                          </div>
                        </DialogContent>
                      </Dialog>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="implemented" className="space-y-4 mt-4">
            {implementedRecommendations.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <CheckCircle className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                <p>No implemented recommendations yet</p>
                <p className="text-sm">Recommendations you mark as implemented will appear here</p>
              </div>
            ) : (
              implementedRecommendations.map((recommendation: SessionRecommendation) => (
                <Card key={recommendation.id} className="border-l-4 border-l-green-500 bg-green-50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                        <CardTitle className="text-lg">{recommendation.title}</CardTitle>
                      </div>
                      <Badge variant="outline" className="text-green-700 border-green-300">
                        {recommendation.effectiveness?.replace('_', ' ').toUpperCase() || 'IMPLEMENTED'}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-gray-700">{recommendation.description}</p>
                    
                    {recommendation.feedback && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-sm text-gray-900">Implementation Feedback:</h4>
                        <p className="text-sm text-gray-600 bg-white p-3 rounded border">{recommendation.feedback}</p>
                      </div>
                    )}

                    <div className="flex justify-between items-center pt-4 text-xs text-gray-500">
                      <span>
                        Implemented on {recommendation.implementedAt ? new Date(recommendation.implementedAt).toLocaleDateString() : 'Unknown'}
                      </span>
                      <span>
                        Generated by {recommendation.aiModel}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}