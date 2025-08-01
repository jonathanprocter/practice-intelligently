import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Lightbulb, Save, Loader2, Brain, FileText, Target, AlertTriangle, BookOpen } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Label } from "@/components/ui/label";

interface SessionPrepNote {
  id: string;
  eventId: string;
  clientId: string;
  therapistId: string;
  prepContent: string;
  keyFocusAreas: string[];
  sessionObjectives: string[];
  previousSessionSummary?: string;
  suggestedInterventions: string[];
  clientGoals: string[];
  riskFactors: string[];
  homeworkReview?: string;
  aiGeneratedInsights?: string;
  followUpQuestions?: string[];
  psychoeducationalMaterials?: Array<{
    title: string;
    description: string;
    type: 'handout' | 'worksheet' | 'reading' | 'video' | 'app';
    url?: string;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

interface SessionPrepModalProps {
  isOpen: boolean;
  onClose: () => void;
  eventId: string;
  clientName: string;
  appointmentTime: string;
}

export default function SessionPrepModal({ 
  isOpen, 
  onClose, 
  eventId, 
  clientName, 
  appointmentTime 
}: SessionPrepModalProps) {
  const [prepNote, setPrepNote] = useState<SessionPrepNote | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isGeneratingAI, setIsGeneratingAI] = useState(false);
  const [prepContent, setPrepContent] = useState("");
  const [focusAreas, setFocusAreas] = useState<string[]>([]);
  const [newFocusArea, setNewFocusArea] = useState("");
  const [sessionObjectives, setSessionObjectives] = useState<string[]>([]);
  const [newObjective, setNewObjective] = useState("");
  const [followUpQuestions, setFollowUpQuestions] = useState<string[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [psychoeducationalMaterials, setPsychoeducationalMaterials] = useState<Array<{
    title: string;
    description: string;
    type: 'handout' | 'worksheet' | 'reading' | 'video' | 'app';
    url?: string;
  }>>([]);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      fetchPrepNote();
    }
  }, [isOpen, eventId]);

  const fetchPrepNote = async () => {
    setIsLoading(true);
    try {
      const response = await fetch(`/api/session-prep/${eventId}`);
      if (response.ok) {
        const note = await response.json();
        setPrepNote(note);
        setPrepContent(note.prepContent || "");
        setFocusAreas(note.keyFocusAreas || []);
        setSessionObjectives(note.sessionObjectives || []);
        setFollowUpQuestions(note.followUpQuestions || []);
        setPsychoeducationalMaterials(note.psychoeducationalMaterials || []);
      } else if (response.status === 404) {
        // No prep note exists yet
        setPrepNote(null);
        setPrepContent("");
        setFocusAreas([]);
        setSessionObjectives([]);
        setFollowUpQuestions([]);
        setPsychoeducationalMaterials([]);
      }
    } catch (error) {
      console.error('Error fetching prep note:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const savePrepNote = async () => {
    setSaving(true);
    try {
      const data = {
        eventId,
        clientId: eventId, // Using eventId as clientId for now
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c', // Default therapist
        prepContent,
        keyFocusAreas: focusAreas,
        sessionObjectives,
        followUpQuestions,
        psychoeducationalMaterials
      };

      let response;
      if (prepNote) {
        response = await fetch(`/api/session-prep/${prepNote.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      } else {
        response = await fetch('/api/session-prep', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(data)
        });
      }

      if (response.ok) {
        const savedNote = await response.json();
        setPrepNote(savedNote);
        toast({
          title: "Session prep saved",
          description: "Your session preparation notes have been saved successfully.",
        });
      } else {
        throw new Error('Failed to save prep note');
      }
    } catch (error) {
      console.error('Error saving prep note:', error);
      toast({
        title: "Error",
        description: "Failed to save session prep notes. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const generateAIInsights = async () => {
    setIsGeneratingAI(true);
    try {
      const response = await fetch(`/api/session-prep/${eventId}/ai-insights`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ clientId: eventId })
      });

      if (response.ok) {
        const result = await response.json();
        setPrepNote(prev => prev ? { 
          ...prev, 
          aiGeneratedInsights: result.insights,
          followUpQuestions: result.followUpQuestions,
          psychoeducationalMaterials: result.psychoeducationalMaterials
        } : null);
        
        // Update local state with new AI-generated content
        if (result.followUpQuestions) {
          setFollowUpQuestions(result.followUpQuestions);
        }
        if (result.psychoeducationalMaterials) {
          setPsychoeducationalMaterials(result.psychoeducationalMaterials);
        }
        
        toast({
          title: "AI insights generated",
          description: "Clinical insights, questions, and resources have been generated based on client history.",
        });
      } else {
        throw new Error('Failed to generate AI insights');
      }
    } catch (error) {
      console.error('Error generating AI insights:', error);
      toast({
        title: "Error",
        description: "Failed to generate AI insights. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsGeneratingAI(false);
    }
  };

  const addFocusArea = () => {
    if (newFocusArea.trim() && !focusAreas.includes(newFocusArea.trim())) {
      setFocusAreas([...focusAreas, newFocusArea.trim()]);
      setNewFocusArea("");
    }
  };

  const removeFocusArea = (area: string) => {
    setFocusAreas(focusAreas.filter(a => a !== area));
  };

  const addObjective = () => {
    if (newObjective.trim() && !sessionObjectives.includes(newObjective.trim())) {
      setSessionObjectives([...sessionObjectives, newObjective.trim()]);
      setNewObjective("");
    }
  };

  const removeObjective = (objective: string) => {
    setSessionObjectives(sessionObjectives.filter(o => o !== objective));
  };

  const addFollowUpQuestion = () => {
    if (newQuestion.trim() && !followUpQuestions.includes(newQuestion.trim())) {
      setFollowUpQuestions([...followUpQuestions, newQuestion.trim()]);
      setNewQuestion("");
    }
  };

  const removeFollowUpQuestion = (question: string) => {
    setFollowUpQuestions(followUpQuestions.filter(q => q !== question));
  };

  const addPsychoeducationalMaterial = (material: {
    title: string;
    description: string;
    type: 'handout' | 'worksheet' | 'reading' | 'video' | 'app';
    url?: string;
  }) => {
    setPsychoeducationalMaterials([...psychoeducationalMaterials, material]);
  };

  const removePsychoeducationalMaterial = (index: number) => {
    setPsychoeducationalMaterials(psychoeducationalMaterials.filter((_, i) => i !== index));
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Session Prep - {clientName}
            <Badge variant="outline">{appointmentTime}</Badge>
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="prep" className="space-y-4">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="prep">Session Prep</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="goals">Goals & Objectives</TabsTrigger>
            <TabsTrigger value="questions">Follow-up Questions</TabsTrigger>
            <TabsTrigger value="materials">Resources</TabsTrigger>
          </TabsList>

          <TabsContent value="prep" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="prepContent">Session Preparation Notes</Label>
                <Textarea
                  id="prepContent"
                  placeholder="Enter your preparation notes for this session..."
                  value={prepContent}
                  onChange={(e) => setPrepContent(e.target.value)}
                  rows={6}
                  className="mt-1"
                />
              </div>

              <div>
                <Label>Key Focus Areas</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add focus area..."
                    value={newFocusArea}
                    onChange={(e) => setNewFocusArea(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFocusArea()}
                  />
                  <Button onClick={addFocusArea} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {focusAreas.map((area, index) => (
                    <Badge key={index} variant="secondary" className="cursor-pointer" 
                           onClick={() => removeFocusArea(area)}>
                      {area} ×
                    </Badge>
                  ))}
                </div>
              </div>

              <div>
                <Label>Session Objectives</Label>
                <div className="flex gap-2 mt-1">
                  <Input
                    placeholder="Add session objective..."
                    value={newObjective}
                    onChange={(e) => setNewObjective(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addObjective()}
                  />
                  <Button onClick={addObjective} variant="outline">Add</Button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  {sessionObjectives.map((objective, index) => (
                    <Badge key={index} variant="outline" className="cursor-pointer"
                           onClick={() => removeObjective(objective)}>
                      <Target className="h-3 w-3 mr-1" />
                      {objective} ×
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="questions" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Follow-up Questions Based on Previous Sessions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label>Add Follow-up Question</Label>
                  <div className="flex gap-2 mt-1">
                    <Input
                      placeholder="e.g., How did the homework assignment go? Any progress with anxiety management?"
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && addFollowUpQuestion()}
                    />
                    <Button onClick={addFollowUpQuestion} variant="outline">Add</Button>
                  </div>
                </div>
                <div className="space-y-2">
                  {followUpQuestions.map((question, index) => (
                    <div key={index} className="flex items-start gap-2 p-3 bg-blue-50 rounded-lg">
                      <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">Q{index + 1}:</p>
                        <p className="text-sm text-blue-800">{question}</p>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        onClick={() => removeFollowUpQuestion(question)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  {followUpQuestions.length === 0 && (
                    <div className="text-center py-8 text-gray-500">
                      <FileText className="h-12 w-12 mx-auto mb-3 opacity-50" />
                      <p>Add follow-up questions to guide your session</p>
                      <p className="text-xs mt-1">Questions that help continue where you left off</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="materials" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Psychoeducational Materials & Handouts
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {psychoeducationalMaterials.map((material, index) => (
                    <div key={index} className="border rounded-lg p-3 space-y-2">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <Badge variant="outline" className="mb-2">
                            {material.type.charAt(0).toUpperCase() + material.type.slice(1)}
                          </Badge>
                          <h4 className="font-medium text-sm">{material.title}</h4>
                          <p className="text-xs text-gray-600 mt-1">{material.description}</p>
                          {material.url && (
                            <a 
                              href={material.url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              View Resource →
                            </a>
                          )}
                        </div>
                        <Button 
                          variant="ghost" 
                          size="sm" 
                          onClick={() => removePsychoeducationalMaterial(index)}
                          className="text-gray-500 hover:text-red-600"
                        >
                          ×
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {psychoeducationalMaterials.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    <BookOpen className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Psychoeducational materials will be suggested by AI</p>
                    <p className="text-xs mt-1">Based on client needs and session focus areas</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="insights" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Brain className="h-5 w-5" />
                  AI-Generated Clinical Insights
                  <Button 
                    onClick={generateAIInsights} 
                    disabled={isGeneratingAI}
                    variant="outline"
                    size="sm"
                  >
                    {isGeneratingAI ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Lightbulb className="h-4 w-4" />
                    )}
                    {isGeneratingAI ? 'Generating...' : 'Generate Insights'}
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent>
                {prepNote?.aiGeneratedInsights ? (
                  <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded-lg">
                    {prepNote.aiGeneratedInsights}
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="h-12 w-12 mx-auto mb-3 opacity-50" />
                    <p>Click "Generate Insights" to get AI-powered clinical recommendations</p>
                    <p className="text-xs mt-1">Based on client history and previous sessions</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="goals" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Client Goals
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Client goals will be populated from treatment plans and previous sessions.</p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <AlertTriangle className="h-5 w-5" />
                    Risk Factors
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">Risk factors and monitoring notes will appear here.</p>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={savePrepNote} disabled={isSaving || !prepContent.trim()}>
            {isSaving ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isSaving ? 'Saving...' : 'Save Prep Notes'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}