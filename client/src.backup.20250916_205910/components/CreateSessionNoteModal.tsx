import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { apiRequest } from '@/lib/queryClient';
import { 
  FileText, 
  Loader2, 
  Calendar,
  Plus,
  Save,
  Clock,
  Sparkles,
  ChevronRight,
  AlertCircle,
  CheckCircle,
  Brain,
  Mic,
  MicOff,
  Copy,
  FileDown,
  Eye,
  EyeOff,
  Timer,
  BookOpen,
  Heart,
  Shield,
  Target,
  TrendingUp,
  Users,
  Zap,
  RefreshCw
} from 'lucide-react';

// Types
interface CreateSessionNoteModalProps {
  isOpen: boolean;
  onClose: () => void;
  clientId: string;
  clientName: string;
  selectedAppointment?: {
    id: string;
    startTime: string;
    endTime: string;
    title?: string;
  } | null;
}

interface SessionNoteData {
  clientId: string;
  therapistId: string;
  title?: string;  // ADD THIS
  content: string;
  appointmentId: string;
  source: string;
  metadata?: SessionNoteMetadata;
}

interface SessionNoteMetadata {
  template?: string;
  sessionDuration?: number;
  interventions?: string[];
  privateNotes?: string;
  nextSessionGoals?: string[];
  homeworkAssigned?: string[];
  riskAssessment?: RiskAssessment;
  wordCount?: number;
  createdWithAI?: boolean;
}

interface RiskAssessment {
  level: 'low' | 'moderate' | 'high';
  notes?: string;
  lastAssessed: string;
}

interface NoteTemplate {
  id: string;
  name: string;
  icon: React.ElementType;
  category: string;
  content: string;
  fields?: string[];
  description: string;
}

interface AIAnalysis {
  extractedDate?: string;
  sessionType?: string;
  mood?: string;
  aiTags?: string[];
  keyTopics?: string[];
  urgencyLevel?: 'low' | 'moderate' | 'high';
  progressIndicators?: string[];
  suggestedInterventions?: string[];
  riskFactors?: string[];
  strengths?: string[];
  nextSteps?: string[];
}

// Note Templates
const NOTE_TEMPLATES: NoteTemplate[] = [
  {
    id: 'soap',
    name: 'SOAP Note',
    icon: FileText,
    category: 'Clinical',
    description: 'Subjective, Objective, Assessment, Plan format',
    content: `SUBJECTIVE:
[Client's reported symptoms, feelings, and concerns]

OBJECTIVE:
[Observable behaviors, appearance, affect]

ASSESSMENT:
[Clinical impressions, progress toward goals]

PLAN:
[Treatment plan, interventions, homework, next session focus]`,
    fields: ['subjective', 'objective', 'assessment', 'plan']
  },
  {
    id: 'dap',
    name: 'DAP Note',
    icon: Brain,
    category: 'Clinical',
    description: 'Data, Assessment, Plan format',
    content: `DATA:
[Objective observations and subjective reports]

ASSESSMENT:
[Clinical interpretation and analysis]

PLAN:
[Treatment plan and next steps]`,
    fields: ['data', 'assessment', 'plan']
  },
  {
    id: 'progress',
    name: 'Progress Note',
    icon: TrendingUp,
    category: 'Progress',
    description: 'Focus on client progress and treatment goals',
    content: `SESSION DATE: [Date]
SESSION NUMBER: [#]

PRESENTING CONCERNS:
[Current issues discussed]

INTERVENTIONS USED:
[Therapeutic techniques applied]

CLIENT RESPONSE:
[How client responded to interventions]

PROGRESS TOWARD GOALS:
[Assessment of progress]

HOMEWORK/BETWEEN SESSION WORK:
[Assignments given]

PLAN FOR NEXT SESSION:
[Focus areas for next meeting]`,
    fields: ['concerns', 'interventions', 'response', 'progress', 'homework', 'plan']
  },
  {
    id: 'crisis',
    name: 'Crisis Note',
    icon: AlertCircle,
    category: 'Specialized',
    description: 'For crisis interventions and high-risk situations',
    content: `CRISIS SITUATION:
[Description of crisis]

RISK ASSESSMENT:
- Suicidal ideation: [Yes/No - Details]
- Homicidal ideation: [Yes/No - Details]
- Self-harm risk: [Low/Moderate/High]
- Protective factors: [List]

INTERVENTIONS:
[Crisis interventions used]

SAFETY PLAN:
[Safety measures implemented]

FOLLOW-UP:
[Required follow-up actions]

CONSULTATION:
[Supervisor/colleague consultation if applicable]`,
    fields: ['crisis', 'risk', 'interventions', 'safety', 'followup']
  },
  {
    id: 'group',
    name: 'Group Session',
    icon: Users,
    category: 'Group',
    description: 'For group therapy sessions',
    content: `GROUP TOPIC: [Topic]
ATTENDEES: [Number present]

GROUP DYNAMICS:
[Observations about group interaction]

CLIENT PARTICIPATION:
[Level and quality of participation]

KEY DISCUSSIONS:
[Main topics covered]

CLIENT'S CONTRIBUTIONS:
[What client shared or contributed]

OBSERVATIONS:
[Clinical observations specific to client]

NEXT SESSION:
[Plans or goals for next group]`,
    fields: ['topic', 'dynamics', 'participation', 'discussions', 'observations']
  },
  {
    id: 'intake',
    name: 'Initial Assessment',
    icon: BookOpen,
    category: 'Assessment',
    description: 'For initial client assessments',
    content: `REFERRAL SOURCE: [Source]

PRESENTING PROBLEMS:
[Chief complaints and duration]

HISTORY:
- Previous treatment: [Details]
- Medical history: [Relevant information]
- Medications: [Current medications]
- Substance use: [Assessment]

MENTAL STATUS:
[Observations of appearance, behavior, mood, etc.]

INITIAL IMPRESSIONS:
[Diagnostic impressions]

TREATMENT RECOMMENDATIONS:
[Recommended approach and frequency]`,
    fields: ['referral', 'problems', 'history', 'status', 'impressions', 'recommendations']
  }
];

// Common therapeutic interventions for quick insertion
const COMMON_INTERVENTIONS = [
  'Cognitive restructuring',
  'Mindfulness exercise',
  'Grounding techniques',
  'Emotion regulation skills',
  'Behavioral activation',
  'Exposure therapy',
  'Problem-solving therapy',
  'Relaxation training',
  'Social skills training',
  'Motivational interviewing',
  'Psychoeducation',
  'Role-playing',
  'Homework review',
  'Safety planning'
];

export function CreateSessionNoteModal({
  isOpen,
  onClose,
  clientId,
  clientName,
  selectedAppointment
}: CreateSessionNoteModalProps) {
  // Core state
  const [content, setContent] = useState('');
  const [sessionNoteTitle, setSessionNoteTitle] = useState<string>(''); // ADD THIS
  const [appointmentMode, setAppointmentMode] = useState<'existing' | 'new' | 'none'>('existing');
  const [selectedAppointmentId, setSelectedAppointmentId] = useState<string>('');
  const [newAppointmentDate, setNewAppointmentDate] = useState<string>('');
  const [newAppointmentTime, setNewAppointmentTime] = useState<string>('');
  const [newAppointmentTitle, setNewAppointmentTitle] = useState<string>('');

  // Enhanced features state
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [sessionTimer, setSessionTimer] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [privateNotes, setPrivateNotes] = useState('');
  const [showPrivateNotes, setShowPrivateNotes] = useState(false);
  const [selectedInterventions, setSelectedInterventions] = useState<string[]>([]);
  const [homeworkAssignments, setHomeworkAssignments] = useState<string[]>([]);
  const [nextSessionGoals, setNextSessionGoals] = useState<string[]>([]);
  const [riskLevel, setRiskLevel] = useState<'low' | 'moderate' | 'high'>('low');
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [lastAutoSave, setLastAutoSave] = useState<Date | null>(null);

  // AI state
  const [aiAnalysis, setAiAnalysis] = useState<AIAnalysis | null>(null);
  const [showAiSuggestions, setShowAiSuggestions] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [aiSuggestedContent, setAiSuggestedContent] = useState('');

  // Voice recording state
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  // Refs
  const contentRef = useRef<HTMLTextAreaElement>(null);
  const autoSaveTimeoutRef = useRef<NodeJS.Timeout>();
  const sessionTimerRef = useRef<NodeJS.Timeout>();
  const recordingTimerRef = useRef<NodeJS.Timeout>();

  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Fetch existing appointments
  const { data: appointments, isLoading: appointmentsLoading } = useQuery({
    queryKey: ['/api/appointments/client', clientId],
    queryFn: async () => {
      const response = await apiRequest('GET', `/api/appointments/client/${clientId}`);
      return response.json();
    },
    enabled: isOpen
  });

  // Title suggestions generator
  const generateTitleSuggestions = () => {
    const suggestions = [];
    
    // Based on template
    if (selectedTemplate) {
      const template = NOTE_TEMPLATES.find(t => t.id === selectedTemplate);
      suggestions.push(`${template?.name} - ${new Date().toLocaleDateString()}`);
    }
    
    // Based on interventions
    if (selectedInterventions.length > 0) {
      suggestions.push(`${selectedInterventions[0]} Session`);
    }
    
    // Based on risk level
    if (riskLevel === 'high') {
      suggestions.push('Crisis Intervention Session');
    } else if (riskLevel === 'moderate') {
      suggestions.push('Risk Assessment & Safety Planning');
    }
    
    // Based on AI analysis
    if (aiAnalysis?.sessionType) {
      suggestions.push(aiAnalysis.sessionType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()));
    }
    
    // Based on session type
    suggestions.push(`Session Note - ${clientName}`);
    
    // Generic fallbacks
    suggestions.push(`Progress Review - ${new Date().toLocaleDateString()}`);
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
  };

  // Computed values
  const wordCount = useMemo(() => {
    return content.trim().split(/\s+/).filter(word => word.length > 0).length;
  }, [content]);

  const characterCount = useMemo(() => {
    return content.length;
  }, [content]);

  const estimatedReadTime = useMemo(() => {
    // Average reading speed: 200 words per minute
    return Math.ceil(wordCount / 200);
  }, [wordCount]);

  const completionProgress = useMemo(() => {
    // Consider a note complete at ~300 words
    const targetWords = 300;
    return Math.min((wordCount / targetWords) * 100, 100);
  }, [wordCount]);

  // Initialize with selected appointment
  useEffect(() => {
    if (selectedAppointment) {
      setSelectedAppointmentId(selectedAppointment.id);
      setAppointmentMode('existing');
    }
  }, [selectedAppointment]);

  // Session timer
  useEffect(() => {
    if (isTimerRunning) {
      sessionTimerRef.current = setInterval(() => {
        setSessionTimer(prev => prev + 1);
      }, 1000);
    } else {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    }
    return () => {
      if (sessionTimerRef.current) {
        clearInterval(sessionTimerRef.current);
      }
    };
  }, [isTimerRunning]);

  // Auto-save functionality
  useEffect(() => {
    if (autoSaveEnabled && content.length > 50) {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }

      autoSaveTimeoutRef.current = setTimeout(() => {
        handleAutoSave();
      }, 5000); // Auto-save after 5 seconds of inactivity
    }

    return () => {
      if (autoSaveTimeoutRef.current) {
        clearTimeout(autoSaveTimeoutRef.current);
      }
    };
  }, [content, autoSaveEnabled]);

  // AI content analysis with debouncing
  useEffect(() => {
    if (content.trim().length > 100 && !isAnalyzing) {
      const timer = setTimeout(() => {
        analyzeContentWithAI();
      }, 3000); // Wait 3 seconds after typing stops
      return () => clearTimeout(timer);
    }
  }, [content]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ctrl/Cmd + S to save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSubmit(e as any);
      }
      // Ctrl/Cmd + Shift + T to toggle timer
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 't') {
        e.preventDefault();
        setIsTimerRunning(prev => !prev);
      }
      // Ctrl/Cmd + Shift + P to toggle private notes
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'p') {
        e.preventDefault();
        setShowPrivateNotes(prev => !prev);
      }
    };

    if (isOpen) {
      window.addEventListener('keydown', handleKeyPress);
      return () => window.removeEventListener('keydown', handleKeyPress);
    }
  }, [isOpen, content]);

  // Handlers
  const handleAutoSave = useCallback(async () => {
    try {
      const draftData = {
        sessionNoteTitle,  // ADD THIS
        content,
        privateNotes,
        selectedInterventions,
        homeworkAssignments,
        nextSessionGoals,
        appointmentMode,
        selectedAppointmentId,
        newAppointmentDate,
        newAppointmentTime,
        newAppointmentTitle
      };

      localStorage.setItem(`session-note-draft-${clientId}`, JSON.stringify(draftData));
      setLastAutoSave(new Date());

      toast({
        title: "Draft Saved",
        description: "Your work has been auto-saved",
        duration: 2000
      });
    } catch (error) {
      console.error('Auto-save failed:', error);
    }
  }, [sessionNoteTitle, content, privateNotes, selectedInterventions, homeworkAssignments, nextSessionGoals, 
      appointmentMode, selectedAppointmentId, newAppointmentDate, newAppointmentTime, newAppointmentTitle, clientId]);

  const loadDraft = useCallback(() => {
    try {
      const draftData = localStorage.getItem(`session-note-draft-${clientId}`);
      if (draftData) {
        const draft = JSON.parse(draftData);
        setSessionNoteTitle(draft.sessionNoteTitle || ''); // ADD THIS
        setContent(draft.content || '');
        setPrivateNotes(draft.privateNotes || '');
        setSelectedInterventions(draft.selectedInterventions || []);
        setHomeworkAssignments(draft.homeworkAssignments || []);
        setNextSessionGoals(draft.nextSessionGoals || []);
        setAppointmentMode(draft.appointmentMode || 'existing');
        setSelectedAppointmentId(draft.selectedAppointmentId || '');
        setNewAppointmentDate(draft.newAppointmentDate || '');
        setNewAppointmentTime(draft.newAppointmentTime || '');
        setNewAppointmentTitle(draft.newAppointmentTitle || '');

        toast({
          title: "Draft Restored",
          description: "Your previous work has been loaded",
        });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
    }
  }, [clientId]);

  const analyzeContentWithAI = async () => {
    setIsAnalyzing(true);
    try {
      const response = await apiRequest('POST', '/api/ai/analyze-session-content', {
        content: content.trim(),
        clientId,
        clientName,
        previousNotes: false // Could fetch previous notes for context
      });

      const analysis: AIAnalysis = await response.json();
      setAiAnalysis(analysis);
      setShowAiSuggestions(true);

      // Auto-apply some suggestions if appropriate
      if (analysis.urgencyLevel === 'high') {
        setRiskLevel('high');
        toast({
          title: "High Risk Indicators Detected",
          description: "Please review the risk assessment section",
          variant: "destructive"
        });
      }

      if (analysis.suggestedInterventions) {
        // Don't auto-select, but make them easily available
        toast({
          title: "AI Analysis Complete",
          description: `${analysis.suggestedInterventions.length} interventions suggested`,
        });
      }
    } catch (error) {
      console.error('AI analysis failed:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const generateAISuggestion = async (type: 'complete' | 'expand' | 'summarize') => {
    try {
      const response = await apiRequest('POST', '/api/ai/generate-note-content', {
        existingContent: content,
        type,
        template: selectedTemplate,
        clientName,
        sessionType: aiAnalysis?.sessionType,
        keyPoints: aiAnalysis?.keyTopics
      });

      const suggestion = await response.json();
      setAiSuggestedContent(suggestion.content);

      toast({
        title: "AI Suggestion Ready",
        description: "Review and edit the suggested content below",
      });
    } catch (error) {
      toast({
        title: "AI Generation Failed",
        description: "Could not generate suggestion",
        variant: "destructive"
      });
    }
  };

  const applyTemplate = (templateId: string) => {
    const template = NOTE_TEMPLATES.find(t => t.id === templateId);
    if (template) {
      setContent(template.content);
      setSelectedTemplate(templateId);
      toast({
        title: "Template Applied",
        description: `${template.name} template has been applied`,
      });
    }
  };

  const insertIntervention = (intervention: string) => {
    if (!selectedInterventions.includes(intervention)) {
      setSelectedInterventions([...selectedInterventions, intervention]);
    }
  };

  const formatSessionTime = (seconds: number): string => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const exportNote = () => {
    const exportData = {
      clientName,
      date: new Date().toISOString(),
      content,
      interventions: selectedInterventions,
      homework: homeworkAssignments,
      nextSessionGoals,
      sessionDuration: sessionTimer,
      wordCount
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `session-note-${clientName.replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);

    toast({
      title: "Note Exported",
      description: "Session note has been downloaded",
    });
  };

  // Mutations
  const createAppointmentMutation = useMutation({
    mutationFn: async (appointmentData: any) => {
      return apiRequest('POST', '/api/appointments', appointmentData);
    }
  });

  const createSessionNoteMutation = useMutation({
    mutationFn: async (data: SessionNoteData) => {
      return apiRequest('POST', '/api/session-notes', data);
    },
    onSuccess: () => {
      toast({
        title: "Session Note Created",
        description: `Session note for ${clientName} has been created successfully.`,
      });

      // Clear draft
      localStorage.removeItem(`session-note-draft-${clientId}`);

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['/api/session-notes/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/appointments/client', clientId] });
      queryClient.invalidateQueries({ queryKey: ['/api/clients', clientId] });

      // Reset form
      resetForm();
      onClose();
    },
    onError: (error: any) => {
      console.error('Error creating session note:', error);
      toast({
        title: "Error",
        description: "Failed to create session note. Your work has been saved as a draft.",
        variant: "destructive",
      });
      handleAutoSave();
    }
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!content.trim()) {
      toast({
        title: "Content Required",
        description: "Please enter session note content before saving.",
        variant: "destructive",
      });
      return;
    }

    let appointmentIdToUse = '';

    try {
      if (appointmentMode === 'existing' && selectedAppointmentId) {
        appointmentIdToUse = selectedAppointmentId;
      } else if (appointmentMode === 'new') {
        if (!newAppointmentDate || !newAppointmentTime) {
          toast({
            title: "Appointment Details Required",
            description: "Please provide both date and time for the new appointment.",
            variant: "destructive",
          });
          return;
        }

        const startDateTime = new Date(`${newAppointmentDate}T${newAppointmentTime}`);
        const endDateTime = new Date(startDateTime.getTime() + (sessionTimer || 3600) * 1000);

        const appointmentData = {
          clientId,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
          startTime: startDateTime.toISOString(),
          endTime: endDateTime.toISOString(),
          title: newAppointmentTitle || 'Session',
          type: aiAnalysis?.sessionType || 'individual_therapy',
          status: 'completed',
          source: 'manual'
        };

        const appointmentResponse = await createAppointmentMutation.mutateAsync(appointmentData);
        const createdAppointment = await appointmentResponse.json();
        appointmentIdToUse = createdAppointment.id;
      }

      // Prepare metadata
      const metadata: SessionNoteMetadata = {
        template: selectedTemplate,
        sessionDuration: sessionTimer,
        interventions: selectedInterventions,
        privateNotes: privateNotes,
        nextSessionGoals: nextSessionGoals,
        homeworkAssigned: homeworkAssignments,
        riskAssessment: riskLevel !== 'low' ? {
          level: riskLevel,
          notes: privateNotes,
          lastAssessed: new Date().toISOString()
        } : undefined,
        wordCount: wordCount,
        createdWithAI: !!aiAnalysis
      };

      // Create session note
      const sessionNoteData = {
        clientId,
        therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
        title: sessionNoteTitle || `Session Note - ${new Date().toLocaleDateString()}`, // ADD THIS
        content: content.trim(),
        appointmentId: appointmentIdToUse,
        source: 'manual',
        metadata,
        ...(aiAnalysis && {
          aiTags: aiAnalysis.aiTags,
          sessionDate: aiAnalysis.extractedDate ? new Date(aiAnalysis.extractedDate).toISOString() : undefined
        })
      };

      createSessionNoteMutation.mutate(sessionNoteData);
    } catch (error) {
      console.error('Error in submission:', error);
      toast({
        title: "Error",
        description: "Failed to save. Your work has been saved as a draft.",
        variant: "destructive",
      });
      handleAutoSave();
    }
  };

  const resetForm = () => {
    setContent('');
    setSessionNoteTitle(''); // ADD THIS
    setSelectedAppointmentId('');
    setNewAppointmentDate('');
    setNewAppointmentTime('');
    setNewAppointmentTitle('');
    setSelectedTemplate('');
    setSessionTimer(0);
    setIsTimerRunning(false);
    setPrivateNotes('');
    setSelectedInterventions([]);
    setHomeworkAssignments([]);
    setNextSessionGoals([]);
    setRiskLevel('low');
    setAiAnalysis(null);
    setShowAiSuggestions(false);
    setAiSuggestedContent('');
  };

  const handleClose = () => {
    if (content.trim().length > 0) {
      if (confirm('You have unsaved changes. Do you want to save them as a draft?')) {
        handleAutoSave();
      }
    }
    resetForm();
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-[95vw] w-[1200px] max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Create Session Note for {clientName}
            </div>
            <div className="flex items-center gap-2 text-sm">
              {/* Session Timer */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsTimerRunning(!isTimerRunning)}
                className="gap-2"
              >
                <Timer className="w-4 h-4" />
                {formatSessionTime(sessionTimer)}
                {isTimerRunning ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </Button>

              {/* Auto-save indicator */}
              {autoSaveEnabled && lastAutoSave && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Badge variant="secondary" className="gap-1">
                        <Save className="w-3 h-3" />
                        Saved
                      </Badge>
                    </TooltipTrigger>
                    <TooltipContent>
                      Last saved at {lastAutoSave.toLocaleTimeString()}
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}

              {/* Word count */}
              <Badge variant="outline">
                {wordCount} words
              </Badge>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <Tabs defaultValue="content" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="clinical">Clinical Details</TabsTrigger>
              <TabsTrigger value="ai" className="flex items-center gap-1">
                <Sparkles className="w-4 h-4" />
                AI Assist
              </TabsTrigger>
              <TabsTrigger value="templates">Templates</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4">
              {/* Appointment Section */}
              <div className="border rounded-lg p-4 bg-gray-50">
                <Label className="text-base font-medium mb-3 block">Appointment Linking</Label>

                <div className="space-y-3">
                  <Select value={appointmentMode} onValueChange={(value: 'existing' | 'new' | 'none') => setAppointmentMode(value)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Choose appointment option" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="existing">Link to existing appointment</SelectItem>
                      <SelectItem value="new">Create new appointment</SelectItem>
                      <SelectItem value="none">No appointment link</SelectItem>
                    </SelectContent>
                  </Select>

                  {appointmentMode === 'existing' && (
                    <Select value={selectedAppointmentId} onValueChange={setSelectedAppointmentId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select an appointment" />
                      </SelectTrigger>
                      <SelectContent>
                        {appointments?.map((apt: any) => (
                          <SelectItem key={apt.id} value={apt.id}>
                            {new Date(apt.startTime).toLocaleDateString()} at {new Date(apt.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}

                  {appointmentMode === 'new' && (
                    <div className="grid grid-cols-3 gap-4">
                      <Input
                        type="date"
                        value={newAppointmentDate}
                        onChange={(e) => setNewAppointmentDate(e.target.value)}
                        placeholder="Date"
                      />
                      <Input
                        type="time"
                        value={newAppointmentTime}
                        onChange={(e) => setNewAppointmentTime(e.target.value)}
                        placeholder="Time"
                      />
                      <Input
                        value={newAppointmentTitle}
                        onChange={(e) => setNewAppointmentTitle(e.target.value)}
                        placeholder="Session Title"
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Session Note Title */}
              <div className="space-y-2">
                <Label htmlFor="session-title">Session Note Title</Label>
                <Input
                  id="session-title"
                  placeholder="e.g., 'Progress Review - Week 12' or 'Crisis Intervention Session'"
                  value={sessionNoteTitle}
                  onChange={(e) => setSessionNoteTitle(e.target.value)}
                  className="text-lg font-medium"
                  data-testid="input-session-title"
                />
                <p className="text-xs text-muted-foreground">
                  Optional: Give this session a descriptive title for easy reference
                </p>
                
                {/* Title Suggestions */}
                {sessionNoteTitle === '' && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    <span className="text-xs text-muted-foreground">Suggestions:</span>
                    {generateTitleSuggestions().map((suggestion, idx) => (
                      <Badge
                        key={idx}
                        variant="outline"
                        className="cursor-pointer text-xs"
                        onClick={() => setSessionNoteTitle(suggestion)}
                        data-testid={`suggestion-${idx}`}
                      >
                        {suggestion}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Main Content Area */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="session-content">Session Notes</Label>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setShowPrivateNotes(!showPrivateNotes)}
                    >
                      {showPrivateNotes ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      Private Notes
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={exportNote}
                    >
                      <FileDown className="w-4 h-4" />
                      Export
                    </Button>
                  </div>
                </div>

                <Textarea
                  id="session-content"
                  ref={contentRef}
                  placeholder="Enter your session notes here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  rows={15}
                  className="font-mono text-sm"
                />

                {/* Progress bar */}
                <div className="flex items-center gap-2 text-xs text-gray-500">
                  <Progress value={completionProgress} className="flex-1 h-2" />
                  <span>{Math.round(completionProgress)}% complete</span>
                  <span>• {estimatedReadTime} min read</span>
                </div>
              </div>

              {/* Private Notes (conditionally shown) */}
              {showPrivateNotes && (
                <div className="space-y-2 p-4 border-2 border-dashed border-yellow-300 bg-yellow-50 rounded-lg">
                  <Label className="flex items-center gap-2 text-yellow-800">
                    <Shield className="w-4 h-4" />
                    Private Notes (Not included in official record)
                  </Label>
                  <Textarea
                    placeholder="Personal observations, hypotheses, or notes for supervision..."
                    value={privateNotes}
                    onChange={(e) => setPrivateNotes(e.target.value)}
                    rows={4}
                    className="bg-yellow-100"
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="clinical" className="space-y-4">
              {/* Risk Assessment */}
              <div className="border rounded-lg p-4">
                <Label className="text-base font-medium mb-3 block flex items-center gap-2">
                  <AlertCircle className="w-4 h-4" />
                  Risk Assessment
                </Label>
                <Select value={riskLevel} onValueChange={(value: 'low' | 'moderate' | 'high') => setRiskLevel(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low Risk</SelectItem>
                    <SelectItem value="moderate">Moderate Risk</SelectItem>
                    <SelectItem value="high">High Risk - Requires Immediate Attention</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Interventions Used */}
              <div className="border rounded-lg p-4">
                <Label className="text-base font-medium mb-3 block">Interventions Used</Label>
                <div className="flex flex-wrap gap-2 mb-3">
                  {COMMON_INTERVENTIONS.map(intervention => (
                    <Badge
                      key={intervention}
                      variant={selectedInterventions.includes(intervention) ? "default" : "outline"}
                      className="cursor-pointer"
                      onClick={() => insertIntervention(intervention)}
                    >
                      {selectedInterventions.includes(intervention) && <CheckCircle className="w-3 h-3 mr-1" />}
                      {intervention}
                    </Badge>
                  ))}
                </div>
                <Input
                  placeholder="Add custom intervention..."
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') {
                      const input = e.currentTarget;
                      if (input.value) {
                        insertIntervention(input.value);
                        input.value = '';
                      }
                    }
                  }}
                />
              </div>

              {/* Homework Assignments */}
              <div className="border rounded-lg p-4">
                <Label className="text-base font-medium mb-3 block flex items-center gap-2">
                  <BookOpen className="w-4 h-4" />
                  Homework Assignments
                </Label>
                <div className="space-y-2">
                  {homeworkAssignments.map((hw, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="secondary">{idx + 1}</Badge>
                      <span className="flex-1">{hw}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setHomeworkAssignments(homeworkAssignments.filter((_, i) => i !== idx))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Input
                    placeholder="Add homework assignment..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        if (input.value) {
                          setHomeworkAssignments([...homeworkAssignments, input.value]);
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>

              {/* Next Session Goals */}
              <div className="border rounded-lg p-4">
                <Label className="text-base font-medium mb-3 block flex items-center gap-2">
                  <Target className="w-4 h-4" />
                  Goals for Next Session
                </Label>
                <div className="space-y-2">
                  {nextSessionGoals.map((goal, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <Badge variant="secondary">{idx + 1}</Badge>
                      <span className="flex-1">{goal}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setNextSessionGoals(nextSessionGoals.filter((_, i) => i !== idx))}
                      >
                        ×
                      </Button>
                    </div>
                  ))}
                  <Input
                    placeholder="Add goal for next session..."
                    onKeyPress={(e) => {
                      if (e.key === 'Enter') {
                        const input = e.currentTarget;
                        if (input.value) {
                          setNextSessionGoals([...nextSessionGoals, input.value]);
                          input.value = '';
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="ai" className="space-y-4">
              {/* AI Analysis Results */}
              {aiAnalysis && (
                <div className="border rounded-lg p-4 bg-blue-50">
                  <div className="flex items-center justify-between mb-3">
                    <Label className="text-base font-medium flex items-center gap-2">
                      <Brain className="w-4 h-4" />
                      AI Analysis
                    </Label>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => analyzeContentWithAI()}
                      disabled={isAnalyzing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isAnalyzing ? 'animate-spin' : ''}`} />
                      Refresh
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    {aiAnalysis.mood && (
                      <div>
                        <span className="font-medium">Mood:</span> {aiAnalysis.mood}
                      </div>
                    )}
                    {aiAnalysis.urgencyLevel && (
                      <div>
                        <span className="font-medium">Urgency:</span>
                        <Badge variant={aiAnalysis.urgencyLevel === 'high' ? 'destructive' : 'secondary'} className="ml-2">
                          {aiAnalysis.urgencyLevel}
                        </Badge>
                      </div>
                    )}
                    {aiAnalysis.sessionType && (
                      <div>
                        <span className="font-medium">Session Type:</span> {aiAnalysis.sessionType}
                      </div>
                    )}
                    {aiAnalysis.extractedDate && (
                      <div>
                        <span className="font-medium">Date Detected:</span> {new Date(aiAnalysis.extractedDate).toLocaleDateString()}
                      </div>
                    )}
                  </div>

                  {aiAnalysis.keyTopics && aiAnalysis.keyTopics.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-sm">Key Topics:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aiAnalysis.keyTopics.map((topic, idx) => (
                          <Badge key={idx} variant="outline" className="text-xs">
                            {topic}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.suggestedInterventions && aiAnalysis.suggestedInterventions.length > 0 && (
                    <div className="mt-3">
                      <span className="font-medium text-sm">Suggested Interventions:</span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {aiAnalysis.suggestedInterventions.map((intervention, idx) => (
                          <Badge
                            key={idx}
                            variant="secondary"
                            className="text-xs cursor-pointer"
                            onClick={() => insertIntervention(intervention)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {intervention}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  )}

                  {aiAnalysis.riskFactors && aiAnalysis.riskFactors.length > 0 && (
                    <div className="mt-3 p-2 bg-red-100 rounded">
                      <span className="font-medium text-sm text-red-800">Risk Factors Identified:</span>
                      <ul className="text-xs text-red-700 mt-1">
                        {aiAnalysis.riskFactors.map((factor, idx) => (
                          <li key={idx}>• {factor}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {/* AI Content Generation */}
              <div className="border rounded-lg p-4">
                <Label className="text-base font-medium mb-3 block">AI Content Assistant</Label>
                <div className="flex gap-2 mb-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISuggestion('complete')}
                    disabled={isAnalyzing}
                  >
                    <Zap className="w-4 h-4 mr-1" />
                    Complete Note
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISuggestion('expand')}
                    disabled={!content || isAnalyzing}
                  >
                    Expand
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => generateAISuggestion('summarize')}
                    disabled={!content || isAnalyzing}
                  >
                    Summarize
                  </Button>
                </div>

                {aiSuggestedContent && (
                  <div className="space-y-2">
                    <Textarea
                      value={aiSuggestedContent}
                      onChange={(e) => setAiSuggestedContent(e.target.value)}
                      rows={8}
                      className="bg-blue-50"
                    />
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setContent(aiSuggestedContent)}
                      >
                        Replace Content
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setContent(content + '\n\n' + aiSuggestedContent)}
                      >
                        Append to Content
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setAiSuggestedContent('')}
                      >
                        Clear
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="templates" className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {NOTE_TEMPLATES.map(template => (
                  <div
                    key={template.id}
                    className="border rounded-lg p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                    onClick={() => applyTemplate(template.id)}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <template.icon className="w-5 h-5 text-blue-600" />
                      <h3 className="font-medium">{template.name}</h3>
                      <Badge variant="outline" className="ml-auto text-xs">
                        {template.category}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600">{template.description}</p>
                    {selectedTemplate === template.id && (
                      <Badge className="mt-2">Currently Selected</Badge>
                    )}
                  </div>
                ))}
              </div>

              {selectedTemplate && (
                <div className="p-4 bg-blue-50 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Tip:</strong> You're using the {NOTE_TEMPLATES.find(t => t.id === selectedTemplate)?.name} template. 
                    Fill in each section for a complete clinical note.
                  </p>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter className="flex-shrink-0 border-t pt-4">
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2 text-sm text-gray-500">
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+S</kbd> to save
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Shift+T</kbd> timer
              <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl+Shift+P</kbd> private notes
            </div>

            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={loadDraft}
                disabled={!localStorage.getItem(`session-note-draft-${clientId}`)}
              >
                Load Draft
              </Button>
              <Button
                variant="outline"
                onClick={handleClose}
                disabled={createSessionNoteMutation.isPending || createAppointmentMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={
                  createSessionNoteMutation.isPending || 
                  createAppointmentMutation.isPending || 
                  !content.trim() ||
                  (appointmentMode === 'existing' && !selectedAppointmentId) ||
                  (appointmentMode === 'new' && (!newAppointmentDate || !newAppointmentTime))
                }
              >
                {(createSessionNoteMutation.isPending || createAppointmentMutation.isPending) ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4 mr-2" />
                    Save Session Note
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}