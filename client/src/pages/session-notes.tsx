import { FileText, Plus, Search, Filter, Mic, Bot, Eye, Edit, Trash2, X, Save, Brain, Upload, CheckCircle, AlertCircle, BarChart3, Tag, TrendingUp, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, SessionNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ClientLink } from "@/components/common/ClientLink";

export default function SessionNotes() {
  const [searchTerm, setSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState("");
  const [editTags, setEditTags] = useState("");
  const [editDate, setEditDate] = useState("");
  
  // Bulk processing state
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<File[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{
    processed: number;
    successful: number;
    failed: number;
    total: number;
    errors: any[];
  }>({ processed: 0, successful: 0, failed: 0, total: 0, errors: [] });
  
  // Tag visualization state
  const [showTagAnalytics, setShowTagAnalytics] = useState(false);

  // Fetch session notes from database
  const { data: sessionNotes = [], isLoading } = useQuery({
    queryKey: ['session-notes'],
    queryFn: ApiClient.getSessionNotes,
  });

  // Categorize tags semantically
  const categorizeTag = (tag: string): string => {
    const emotionalTags = ['anxiety', 'depression', 'anger', 'joy', 'sadness', 'fear', 'stress', 'worry', 'happiness', 'grief', 'trauma'];
    const behavioralTags = ['avoidance', 'coping', 'self-harm', 'substance', 'sleep', 'eating', 'exercise', 'social', 'work', 'relationships'];
    const therapeuticTags = ['cbt', 'dbt', 'act', 'mindfulness', 'exposure', 'homework', 'goals', 'progress', 'breakthrough', 'resistance'];
    const cognitiveTag = ['thinking', 'beliefs', 'thoughts', 'cognitive', 'rumination', 'catastrophizing', 'self-talk', 'awareness'];
    
    if (emotionalTags.some(keyword => tag.includes(keyword))) return 'Emotional';
    if (behavioralTags.some(keyword => tag.includes(keyword))) return 'Behavioral';  
    if (therapeuticTags.some(keyword => tag.includes(keyword))) return 'Therapeutic';
    if (cognitiveTag.some(keyword => tag.includes(keyword))) return 'Cognitive';
    return 'Other';
  };

  // Calculate tag trends over time
  const calculateTagTrends = (tagsByDate: { [key: string]: string[] }) => {
    const dates = Object.keys(tagsByDate).filter(d => d !== 'undated').sort();
    const recentDates = dates.slice(-30); // Last 30 days
    
    if (recentDates.length < 2) return { trending: [], declining: [], stable: [] };
    
    const midpoint = Math.floor(recentDates.length / 2);
    const firstHalf = recentDates.slice(0, midpoint);
    const secondHalf = recentDates.slice(midpoint);
    
    const firstHalfTags: { [key: string]: number } = {};
    const secondHalfTags: { [key: string]: number } = {};
    
    firstHalf.forEach(date => {
      tagsByDate[date].forEach(tag => {
        firstHalfTags[tag] = (firstHalfTags[tag] || 0) + 1;
      });
    });
    
    secondHalf.forEach(date => {
      tagsByDate[date].forEach(tag => {
        secondHalfTags[tag] = (secondHalfTags[tag] || 0) + 1;
      });
    });
    
    const trending: string[] = [];
    const declining: string[] = [];
    const stable: string[] = [];
    
    const allTagsSet = new Set([...Object.keys(firstHalfTags), ...Object.keys(secondHalfTags)]);
    
    allTagsSet.forEach(tag => {
      const firstCount = firstHalfTags[tag] || 0;
      const secondCount = secondHalfTags[tag] || 0;
      const change = secondCount - firstCount;
      
      if (change > 0) trending.push(tag);
      else if (change < 0) declining.push(tag);
      else stable.push(tag);
    });
    
    return {
      trending: trending.slice(0, 10),
      declining: declining.slice(0, 10),
      stable: stable.slice(0, 10)
    };
  };

  // Calculate tag analytics with useMemo for performance
  const tagAnalytics = useMemo(() => {
    const tagFrequency: { [key: string]: number } = {};
    const tagsByClient: { [key: string]: string[] } = {};
    const tagsByDate: { [key: string]: string[] } = {};
    const semanticGroups: { [key: string]: string[] } = {};
    
    sessionNotes.forEach(note => {
      // Process AI tags
      const allTags = [
        ...(note.tags || []),
        ...(note.aiTags || [])
      ];
      
      allTags.forEach(tag => {
        const normalizedTag = tag.toLowerCase().trim();
        if (normalizedTag) {
          // Count frequency
          tagFrequency[normalizedTag] = (tagFrequency[normalizedTag] || 0) + 1;
          
          // Group by client
          if (!tagsByClient[note.clientId]) tagsByClient[note.clientId] = [];
          if (!tagsByClient[note.clientId].includes(normalizedTag)) {
            tagsByClient[note.clientId].push(normalizedTag);
          }
          
          // Group by date
          const dateKey = note.sessionDate ? new Date(note.sessionDate).toISOString().split('T')[0] : 'undated';
          if (!tagsByDate[dateKey]) tagsByDate[dateKey] = [];
          if (!tagsByDate[dateKey].includes(normalizedTag)) {
            tagsByDate[dateKey].push(normalizedTag);
          }
          
          // Semantic grouping (basic categorization)
          const category = categorizeTag(normalizedTag);
          if (!semanticGroups[category]) semanticGroups[category] = [];
          if (!semanticGroups[category].includes(normalizedTag)) {
            semanticGroups[category].push(normalizedTag);
          }
        }
      });
    });

    // Get top tags
    const sortedTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);

    // Calculate insights
    const totalUniqueTags = Object.keys(tagFrequency).length;
    const averageTagsPerNote = sessionNotes.length > 0 ? 
      Object.values(tagFrequency).reduce((a, b) => a + b, 0) / sessionNotes.length : 0;
    
    const tagTrends = calculateTagTrends(tagsByDate);
    
    return {
      tagFrequency,
      sortedTags,
      tagsByClient,
      tagsByDate,
      semanticGroups,
      totalUniqueTags,
      averageTagsPerNote: Math.round(averageTagsPerNote * 10) / 10,
      tagTrends
    };
  }, [sessionNotes]);
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Filter session notes based on search term - include SOAP fields
  const filteredNotes = sessionNotes.filter(note => 
    note.clientId.toLowerCase().includes(searchTerm.toLowerCase()) ||
    note.content.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (note.title && note.title.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.subjective && note.subjective.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.objective && note.objective.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.assessment && note.assessment.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.plan && note.plan.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (note.keyPoints && note.keyPoints.some(point => point.toLowerCase().includes(searchTerm.toLowerCase()))) ||
    (note.significantQuotes && note.significantQuotes.some(quote => quote.toLowerCase().includes(searchTerm.toLowerCase())))
  );

  // Mutation for updating session notes
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SessionNote> }) =>
      ApiClient.updateSessionNote(id, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      toast({ title: "Session note updated successfully" });
      setIsEditing(false);
      setIsDetailView(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error updating session note", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation for deleting session notes
  const deleteNoteMutation = useMutation({
    mutationFn: (id: string) => ApiClient.deleteSessionNote(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      toast({ title: "Session note deleted successfully" });
      setIsDetailView(false);
    },
    onError: (error) => {
      toast({ 
        title: "Error deleting session note", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Mutation for generating AI tags
  const generateTagsMutation = useMutation({
    mutationFn: (id: string) => ApiClient.generateSessionNoteTags(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      toast({ title: "AI tags generated successfully" });
    },
    onError: (error) => {
      toast({ 
        title: "Error generating AI tags", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  // Bulk document processing mutation
  const bulkProcessMutation = useMutation({
    mutationFn: async (documents: { title: string; content: string }[]) => {
      const response = await fetch('/api/documents/process-bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documents,
          therapistId: 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c',
          chunkSize: 5 // Process in smaller chunks for better UX
        })
      });

      if (!response.ok) {
        throw new Error(`Bulk processing failed: ${response.statusText}`);
      }

      return response.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      toast({ 
        title: "Bulk processing completed!", 
        description: `${data.summary.successful}/${data.summary.totalDocuments} documents processed successfully`
      });
      setBulkFiles([]);
      setIsBulkProcessing(false);
      setBulkProgress({ processed: 0, successful: 0, failed: 0, total: 0, errors: [] });
    },
    onError: (error) => {
      console.error('Bulk processing error:', error);
      toast({ 
        title: "Bulk processing failed", 
        description: error.message,
        variant: "destructive" 
      });
      setIsBulkProcessing(false);
    },
  });

  // Handle file upload for bulk processing
  const handleBulkFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);
    setBulkFiles(prev => [...prev, ...files]);
  };

  // Process bulk files
  const processBulkFiles = async () => {
    if (bulkFiles.length === 0) return;

    setIsBulkProcessing(true);
    setBulkProgress({ processed: 0, successful: 0, failed: 0, total: bulkFiles.length, errors: [] });

    try {
      const documents = await Promise.all(
        bulkFiles.map(async (file) => {
          const content = await file.text();
          return {
            title: file.name.replace(/\.[^/.]+$/, ""), // Remove file extension
            content
          };
        })
      );

      await bulkProcessMutation.mutateAsync(documents);
    } catch (error) {
      console.error('Error processing bulk files:', error);
    }
  };

  // Remove file from bulk upload
  const removeBulkFile = (index: number) => {
    setBulkFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleViewDetails = (note: SessionNote) => {
    setSelectedNote(note);
    setIsDetailView(true);
    setIsEditing(false);
  };

  const handleEdit = (note: SessionNote) => {
    setSelectedNote(note);
    setEditContent(note.content);
    setEditTags(note.tags ? note.tags.join(", ") : "");
    setEditDate(new Date(note.createdAt).toISOString().split('T')[0]);
    setIsEditing(true);
  };

  const handleSaveEdit = () => {
    if (!selectedNote) return;
    
    const tagsArray = editTags.split(",").map(tag => tag.trim()).filter(tag => tag.length > 0);
    // Convert date string to ISO string for proper database storage
    const updatedDate = new Date(editDate + 'T' + new Date(selectedNote.createdAt).toTimeString().slice(0,8));
    
    updateNoteMutation.mutate({
      id: selectedNote.id,
      updates: {
        content: editContent,
        tags: tagsArray,
        createdAt: updatedDate.toISOString()
      }
    });
  };

  const handleDelete = (note: SessionNote) => {
    if (confirm("Are you sure you want to delete this session note? This action cannot be undone.")) {
      deleteNoteMutation.mutate(note.id);
    }
  };

  // Mutation for generating session prep
  const sessionPrepMutation = useMutation({
    mutationFn: ({ sessionNoteId, clientId }: { sessionNoteId: string; clientId: string }) =>
      ApiClient.generateSessionPrep(sessionNoteId, clientId),
    onSuccess: (result) => {
      toast({ 
        title: "Session prep generated successfully",
        description: `Applied to ${result.appointmentsUpdated} upcoming appointment(s)`
      });
    },
    onError: (error) => {
      toast({ 
        title: "Error generating session prep", 
        description: error.message,
        variant: "destructive" 
      });
    },
  });

  const handleGenerateSessionPrep = (note: SessionNote) => {
    sessionPrepMutation.mutate({
      sessionNoteId: note.id,
      clientId: note.clientId
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Session Notes</h1>
          <p className="text-therapy-text/60">Document and analyze therapy sessions</p>
        </div>
        <Button 
          className="bg-therapy-primary hover:bg-therapy-primary/90"
          onClick={() => setIsCreating(true)}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session Note
        </Button>
      </div>

      {isCreating && (
        <div className="therapy-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Create Session Note</h3>
            <Button variant="ghost" onClick={() => setIsCreating(false)}>
              Cancel
            </Button>
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <select className="w-full border border-therapy-border rounded-lg px-3 py-2">
                <option>Select client...</option>
                <option>Michael Rodriguez</option>
                <option>Emma Thompson</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Session Type</label>
              <Input placeholder="e.g., Individual Therapy - CBT" />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium mb-2">Session Notes</label>
            <Textarea 
              placeholder="Enter your session notes here..."
              rows={6}
            />
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex space-x-2">
              <Button variant="outline" size="sm">
                <Mic className="w-4 h-4 mr-2" />
                Record Audio
              </Button>
              <Button variant="outline" size="sm">
                <Bot className="w-4 h-4 mr-2" />
                AI Analysis
              </Button>
            </div>
            <div className="flex space-x-2">
              <Button variant="outline" onClick={() => setIsCreating(false)}>
                Cancel
              </Button>
              <Button className="bg-therapy-success hover:bg-therapy-success/90">
                Save Note
              </Button>
            </div>
          </div>
        </div>
      )}

      <div className="flex space-x-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
          <Input
            placeholder="Search session notes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Button variant="outline">
          <Filter className="w-4 h-4 mr-2" />
          Filter
        </Button>
        <Button 
          variant="outline" 
          className="bg-therapy-warning/10 border-therapy-warning text-therapy-warning hover:bg-therapy-warning hover:text-white"
          onClick={() => setIsBulkProcessing(!isBulkProcessing)}
        >
          <Upload className="w-4 h-4 mr-2" />
          Bulk Processing
        </Button>
        <Button 
          variant="outline" 
          className="bg-therapy-primary/10 border-therapy-primary text-therapy-primary hover:bg-therapy-primary hover:text-white"
          onClick={() => setShowTagAnalytics(!showTagAnalytics)}
        >
          <BarChart3 className="w-4 h-4 mr-2" />
          Tag Analytics
        </Button>
      </div>

      {/* Bulk Document Processing Section */}
      {isBulkProcessing && (
        <div className="therapy-card p-6 space-y-4 border-l-4 border-therapy-warning">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-therapy-text">Bulk Document Processing</h3>
              <p className="text-therapy-text/60 text-sm">Upload multiple therapy documents for AI processing and automatic client/appointment matching</p>
            </div>
            <Button variant="ghost" onClick={() => setIsBulkProcessing(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload Section */}
            <div className="space-y-4">
              <div className="border-2 border-dashed border-therapy-border rounded-lg p-6 text-center">
                <Upload className="w-8 h-8 mx-auto mb-2 text-therapy-text/40" />
                <p className="text-therapy-text/60 mb-3">Drop files here or click to browse</p>
                <input
                  type="file"
                  multiple
                  accept=".txt,.doc,.docx,.pdf"
                  onChange={handleBulkFileUpload}
                  className="hidden"
                  id="bulk-file-input"
                  disabled={bulkProcessMutation.isPending}
                />
                <label
                  htmlFor="bulk-file-input"
                  className="inline-flex items-center px-4 py-2 bg-therapy-primary text-white rounded-lg hover:bg-therapy-primary/90 cursor-pointer"
                >
                  Select Files
                </label>
              </div>

              {/* Selected Files List */}
              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-therapy-text">Selected Files ({bulkFiles.length})</h4>
                  <div className="max-h-40 overflow-y-auto space-y-1">
                    {bulkFiles.map((file, index) => (
                      <div key={index} className="flex items-center justify-between bg-therapy-bg border border-therapy-border rounded px-3 py-2">
                        <div className="flex items-center space-x-2">
                          <FileText className="w-4 h-4 text-therapy-text/60" />
                          <span className="text-sm text-therapy-text truncate">{file.name}</span>
                          <Badge variant="secondary" className="text-xs">
                            {(file.size / 1024).toFixed(1)}KB
                          </Badge>
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => removeBulkFile(index)}
                          disabled={bulkProcessMutation.isPending}
                        >
                          <X className="w-3 h-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Progress and Status Section */}
            <div className="space-y-4">
              <div className="bg-therapy-bg border border-therapy-border rounded-lg p-4">
                <h4 className="font-medium text-therapy-text mb-3">Processing Status</h4>
                
                {bulkProcessMutation.isPending ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing documents...</span>
                      <span className="text-therapy-primary font-medium">
                        {bulkProgress.processed}/{bulkProgress.total}
                      </span>
                    </div>
                    <div className="w-full bg-therapy-border rounded-full h-2">
                      <div 
                        className="bg-therapy-primary h-2 rounded-full transition-all duration-300"
                        style={{ width: `${(bulkProgress.processed / bulkProgress.total) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-therapy-text/60">
                    <div className="space-y-3">
                      <div className="font-medium text-therapy-text">Zmanus Processing Pipeline:</div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Detects if documents are already formatted as progress notes</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Raw documents: Full zmanus clinical analysis & SOAP formatting</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Formatted documents: AI tagging & client/appointment matching only</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Automatic client matching via fuzzy name search</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Smart appointment linking by date proximity (±1 day)</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Success/Error Summary */}
                {bulkProgress.total > 0 && (
                  <div className="mt-4 space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center space-x-2">
                        <CheckCircle className="w-4 h-4 text-therapy-success" />
                        <span>Successful</span>
                      </span>
                      <span className="font-medium text-therapy-success">{bulkProgress.successful}</span>
                    </div>
                    {bulkProgress.failed > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-2">
                          <AlertCircle className="w-4 h-4 text-therapy-danger" />
                          <span>Failed</span>
                        </span>
                        <span className="font-medium text-therapy-danger">{bulkProgress.failed}</span>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex space-x-2">
                <Button
                  onClick={processBulkFiles}
                  disabled={bulkFiles.length === 0 || bulkProcessMutation.isPending}
                  className="flex-1 bg-therapy-success hover:bg-therapy-success/90"
                >
                  {bulkProcessMutation.isPending ? (
                    <>Processing...</>
                  ) : (
                    <>
                      <Brain className="w-4 h-4 mr-2" />
                      Process {bulkFiles.length} Files
                    </>
                  )}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setBulkFiles([])}
                  disabled={bulkProcessMutation.isPending}
                >
                  Clear All
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="grid gap-4">
        {isLoading ? (
          // Loading skeleton
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="therapy-card p-6 animate-pulse">
                <div className="flex justify-between items-start mb-4">
                  <div className="space-y-2">
                    <div className="h-5 bg-gray-200 rounded w-48"></div>
                    <div className="h-4 bg-gray-200 rounded w-32"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                    <div className="h-6 bg-gray-200 rounded w-20"></div>
                  </div>
                </div>
                <div className="h-20 bg-gray-200 rounded mb-4"></div>
                <div className="flex justify-between">
                  <div className="flex space-x-2">
                    <div className="h-6 bg-gray-200 rounded w-12"></div>
                    <div className="h-6 bg-gray-200 rounded w-16"></div>
                  </div>
                  <div className="flex space-x-2">
                    <div className="h-8 bg-gray-200 rounded w-16"></div>
                    <div className="h-8 bg-gray-200 rounded w-24"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <div key={note.id} className="therapy-card p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h3 className="font-semibold text-therapy-text mb-1">
                    {note.title ? note.title : 
                      <span className="flex items-center gap-2">
                        <ClientLink clientId={note.clientId} fallback={`Client ${note.clientId.substring(0, 8)}`} />
                        <span>- Session Note</span>
                      </span>
                    }
                  </h3>
                  <p className="text-sm text-therapy-text/60">
                    {note.sessionDate 
                      ? new Date(note.sessionDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                      : new Date(note.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })
                    } at {new Date(note.createdAt).toLocaleTimeString('en-US', {
                      hour: '2-digit',
                      minute: '2-digit',
                      hour12: false
                    })}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  {note.title && (
                    <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                      <FileText className="w-3 h-3 mr-1" />
                      SOAP Note
                    </Badge>
                  )}
                  {note.transcript && (
                    <Badge variant="outline" className="text-xs">
                      <Mic className="w-3 h-3 mr-1" />
                      Audio
                    </Badge>
                  )}
                  {note.aiSummary && (
                    <Badge variant="outline" className="text-xs">
                      <Bot className="w-3 h-3 mr-1" />
                      AI Analyzed
                    </Badge>
                  )}
                </div>
              </div>
              
              {note.title ? (
                // Display SOAP-structured note (merged from progress notes)
                <div className="text-therapy-text mb-4 space-y-3">
                  {note.subjective && (
                    <div>
                      <h4 className="font-medium text-sm text-blue-700 mb-1">Subjective:</h4>
                      <p className="text-sm line-clamp-2">{note.subjective.substring(0, 200)}{note.subjective.length > 200 ? '...' : ''}</p>
                    </div>
                  )}
                  {note.assessment && (
                    <div>
                      <h4 className="font-medium text-sm text-green-700 mb-1">Assessment:</h4>
                      <p className="text-sm line-clamp-2">{note.assessment.substring(0, 200)}{note.assessment.length > 200 ? '...' : ''}</p>
                    </div>
                  )}
                  {note.plan && (
                    <div>
                      <h4 className="font-medium text-sm text-purple-700 mb-1">Plan:</h4>
                      <p className="text-sm line-clamp-2">{note.plan.substring(0, 200)}{note.plan.length > 200 ? '...' : ''}</p>
                    </div>
                  )}
                </div>
              ) : (
                // Display traditional session note
                <div className="text-therapy-text mb-4 max-h-32 overflow-hidden">
                  <p className="text-sm line-clamp-4">
                    {note.content.length > 300 
                      ? `${note.content.substring(0, 300)}...` 
                      : note.content
                    }
                  </p>
                </div>
              )}

              <div className="flex items-center justify-between">
                <div className="flex space-x-2 flex-wrap">
                  {note.tags && Array.isArray(note.tags) && note.tags.map((tag, index) => (
                    <Badge key={index} variant="secondary" className="text-xs mb-1">
                      {tag}
                    </Badge>
                  ))}
                </div>
                <div className="flex space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleViewDetails(note)}
                  >
                    <Eye className="w-4 h-4 mr-1" />
                    View Details
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleEdit(note)}
                  >
                    <Edit className="w-4 h-4 mr-1" />
                    Edit
                  </Button>
                  {(!note.tags || note.tags.length === 0) && (
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => generateTagsMutation.mutate(note.id)}
                      disabled={generateTagsMutation.isPending}
                      className="text-green-600 hover:text-green-700"
                    >
                      <Bot className="w-4 h-4 mr-1" />
                      {generateTagsMutation.isPending ? "Generating..." : "Generate AI Tags"}
                    </Button>
                  )}
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleGenerateSessionPrep(note)}
                    disabled={sessionPrepMutation.isPending}
                    className="text-blue-600 hover:text-blue-700"
                  >
                    <Brain className="w-4 h-4 mr-1" />
                    Generate Session Prep
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={() => handleDelete(note)}
                    className="text-red-600 hover:text-red-700"
                  >
                    <Trash2 className="w-4 h-4 mr-1" />
                    Delete
                  </Button>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-therapy-text mb-2">
              {searchTerm ? "No matching session notes found" : "No session notes found"}
            </h3>
            <p className="text-therapy-text/60 mb-4">
              {searchTerm 
                ? "Try adjusting your search terms or clear the search to see all notes."
                : "Start documenting your therapy sessions to see them here."
              }
            </p>
            {!searchTerm && (
              <Button 
                className="bg-therapy-primary hover:bg-therapy-primary/90"
                onClick={() => setIsCreating(true)}
              >
                <Plus className="w-4 h-4 mr-2" />
                Create First Session Note
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Detailed View Dialog */}
      <Dialog open={isDetailView || isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsDetailView(false);
          setIsEditing(false);
          setSelectedNote(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {isEditing ? "Edit Session Note" : "Session Note Details"}
              </span>
              <div className="flex space-x-2">
                {!isEditing && selectedNote && (
                  <>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleEdit(selectedNote)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    {(!selectedNote.tags || selectedNote.tags.length === 0) && (
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => generateTagsMutation.mutate(selectedNote.id)}
                        disabled={generateTagsMutation.isPending}
                        className="text-green-600 hover:text-green-700"
                      >
                        <Bot className="w-4 h-4 mr-1" />
                        {generateTagsMutation.isPending ? "Generating..." : "Generate AI Tags"}
                      </Button>
                    )}
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleGenerateSessionPrep(selectedNote)}
                      disabled={sessionPrepMutation.isPending}
                      className="text-blue-600 hover:text-blue-700"
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      {sessionPrepMutation.isPending ? "Generating..." : "Generate Session Prep"}
                    </Button>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleDelete(selectedNote)}
                      className="text-red-600 hover:text-red-700"
                    >
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </>
                )}
              </div>
            </DialogTitle>
            {selectedNote && (
              <DialogDescription>
                Client: <ClientLink clientId={selectedNote.clientId} fallback={`Client ${selectedNote.clientId.substring(0, 8)}`} /> • {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })} at {new Date(selectedNote.createdAt).toLocaleTimeString('en-US', {
                  hour: '2-digit',
                  minute: '2-digit',
                  hour12: false
                })}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedNote && (
            <div className="space-y-6">
              {selectedNote.title ? (
                // Display SOAP fields for merged progress notes
                <>
                  {/* Title */}
                  <div>
                    <label className="block text-sm font-medium mb-2">Title</label>
                    <div className="p-3 border rounded-lg bg-gray-50">
                      <p className="text-sm font-medium">{selectedNote.title}</p>
                    </div>
                  </div>

                  {/* Subjective */}
                  {selectedNote.subjective && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-blue-700">Subjective</label>
                      <div className="p-4 border rounded-lg bg-blue-50">
                        <p className="text-sm whitespace-pre-wrap">{selectedNote.subjective}</p>
                      </div>
                    </div>
                  )}

                  {/* Objective */}
                  {selectedNote.objective && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-orange-700">Objective</label>
                      <div className="p-4 border rounded-lg bg-orange-50">
                        <p className="text-sm whitespace-pre-wrap">{selectedNote.objective}</p>
                      </div>
                    </div>
                  )}

                  {/* Assessment */}
                  {selectedNote.assessment && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-green-700">Assessment</label>
                      <div className="p-4 border rounded-lg bg-green-50">
                        <p className="text-sm whitespace-pre-wrap">{selectedNote.assessment}</p>
                      </div>
                    </div>
                  )}

                  {/* Plan */}
                  {selectedNote.plan && (
                    <div>
                      <label className="block text-sm font-medium mb-2 text-purple-700">Plan</label>
                      <div className="p-4 border rounded-lg bg-purple-50">
                        <p className="text-sm whitespace-pre-wrap">{selectedNote.plan}</p>
                      </div>
                    </div>
                  )}

                  {/* Key Points */}
                  {selectedNote.keyPoints && selectedNote.keyPoints.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Key Points</label>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        <ul className="list-disc list-inside space-y-1">
                          {selectedNote.keyPoints.map((point, index) => (
                            <li key={index} className="text-sm">{point}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  )}

                  {/* Significant Quotes */}
                  {selectedNote.significantQuotes && selectedNote.significantQuotes.length > 0 && (
                    <div>
                      <label className="block text-sm font-medium mb-2">Significant Quotes</label>
                      <div className="p-4 border rounded-lg bg-gray-50">
                        {selectedNote.significantQuotes.map((quote, index) => (
                          <blockquote key={index} className="italic text-sm mb-2 pl-4 border-l-2 border-gray-300">
                            "{quote}"
                          </blockquote>
                        ))}
                      </div>
                    </div>
                  )}
                </>
              ) : (
                // Display traditional session content
                <div>
                  <label className="block text-sm font-medium mb-2">Session Content</label>
                  {isEditing ? (
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Session note content..."
                    />
                  ) : (
                    <div className="p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {selectedNote.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}

              {/* AI Summary */}
              {selectedNote.aiSummary && !isEditing && (
                <div>
                  <label className="block text-sm font-medium mb-2">
                    AI Summary
                  </label>
                  <div className="p-4 border rounded-lg bg-blue-50">
                    <p className="text-sm">{selectedNote.aiSummary}</p>
                  </div>
                </div>
              )}

              {/* Date of Service */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Date of Service
                </label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  Tags
                </label>
                {isEditing ? (
                  <Input
                    value={editTags}
                    onChange={(e) => setEditTags(e.target.value)}
                    placeholder="Enter tags separated by commas (e.g., DBT, ACT, EMDR)"
                  />
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags && selectedNote.tags.length > 0 ? (
                      selectedNote.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary">
                          {tag}
                        </Badge>
                      ))
                    ) : (
                      <span className="text-gray-500 text-sm">No tags</span>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                    >
                      <X className="w-4 h-4 mr-1" />
                      Cancel
                    </Button>
                    <Button 
                      onClick={handleSaveEdit}
                      disabled={updateNoteMutation.isPending}
                      className="bg-therapy-primary hover:bg-therapy-primary/90"
                    >
                      <Save className="w-4 h-4 mr-1" />
                      {updateNoteMutation.isPending ? "Saving..." : "Save Changes"}
                    </Button>
                  </>
                ) : (
                  <Button 
                    variant="outline" 
                    onClick={() => setIsDetailView(false)}
                  >
                    Close
                  </Button>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Tag Analytics Modal */}
      <Dialog open={showTagAnalytics} onOpenChange={setShowTagAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-therapy-primary" />
              Intelligent Document Tagging Visualization
            </DialogTitle>
            <DialogDescription>
              Comprehensive analysis of AI-generated tags and patterns across your clinical documents
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Overview Stats */}
            <div className="lg:col-span-3 grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex items-center gap-3">
                  <Tag className="w-8 h-8 text-blue-600 dark:text-blue-400" />
                  <div>
                    <p className="text-2xl font-bold text-blue-700 dark:text-blue-300">{tagAnalytics.totalUniqueTags}</p>
                    <p className="text-sm text-blue-600 dark:text-blue-400">Unique Tags</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-4 rounded-lg border border-green-200 dark:border-green-800">
                <div className="flex items-center gap-3">
                  <Activity className="w-8 h-8 text-green-600 dark:text-green-400" />
                  <div>
                    <p className="text-2xl font-bold text-green-700 dark:text-green-300">{tagAnalytics.averageTagsPerNote}</p>
                    <p className="text-sm text-green-600 dark:text-green-400">Avg Tags/Note</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 p-4 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-center gap-3">
                  <TrendingUp className="w-8 h-8 text-purple-600 dark:text-purple-400" />
                  <div>
                    <p className="text-2xl font-bold text-purple-700 dark:text-purple-300">{tagAnalytics.tagTrends.trending.length}</p>
                    <p className="text-sm text-purple-600 dark:text-purple-400">Trending Tags</p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 p-4 rounded-lg border border-orange-200 dark:border-orange-800">
                <div className="flex items-center gap-3">
                  <Brain className="w-8 h-8 text-orange-600 dark:text-orange-400" />
                  <div>
                    <p className="text-2xl font-bold text-orange-700 dark:text-orange-300">{Object.keys(tagAnalytics.semanticGroups).length}</p>
                    <p className="text-sm text-orange-600 dark:text-orange-400">Categories</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Tags */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-therapy-primary" />
                Most Frequent Tags
              </h3>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {tagAnalytics.sortedTags.length > 0 ? (
                  tagAnalytics.sortedTags.slice(0, 15).map(([tag, count]) => (
                    <div key={tag} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <Badge variant="outline" className="text-xs">{tag}</Badge>
                      <span className="text-sm font-medium text-gray-600 dark:text-gray-300">{count}</span>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Tag className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No tags found yet</p>
                    <p className="text-sm">Process some documents to see tag analytics</p>
                  </div>
                )}
              </div>
            </div>

            {/* Semantic Categories */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Brain className="w-5 h-5 text-therapy-secondary" />
                Semantic Categories
              </h3>
              <div className="space-y-3">
                {Object.entries(tagAnalytics.semanticGroups).length > 0 ? (
                  Object.entries(tagAnalytics.semanticGroups).map(([category, tags]) => (
                    <div key={category} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="font-medium text-sm">{category}</h4>
                        <Badge variant="secondary" className="text-xs">{tags.length}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {tags.slice(0, 8).map(tag => (
                          <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                        ))}
                        {tags.length > 8 && (
                          <Badge variant="outline" className="text-xs">+{tags.length - 8} more</Badge>
                        )}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    <Brain className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>No categories found yet</p>
                    <p className="text-sm">AI will categorize tags as documents are processed</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trending Analysis */}
            <div className="bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-therapy-accent" />
                Tag Trends
              </h3>
              
              {tagAnalytics.tagTrends.trending.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-green-600 dark:text-green-400 mb-2">📈 Trending Up</h4>
                  <div className="flex flex-wrap gap-1">
                    {tagAnalytics.tagTrends.trending.slice(0, 6).map(tag => (
                      <Badge key={tag} className="bg-green-100 text-green-800 border-green-200 text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {tagAnalytics.tagTrends.declining.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-medium text-sm text-red-600 dark:text-red-400 mb-2">📉 Declining</h4>
                  <div className="flex flex-wrap gap-1">
                    {tagAnalytics.tagTrends.declining.slice(0, 6).map(tag => (
                      <Badge key={tag} className="bg-red-100 text-red-800 border-red-200 text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {tagAnalytics.tagTrends.stable.length > 0 && (
                <div>
                  <h4 className="font-medium text-sm text-gray-600 dark:text-gray-400 mb-2">📊 Stable</h4>
                  <div className="flex flex-wrap gap-1">
                    {tagAnalytics.tagTrends.stable.slice(0, 6).map(tag => (
                      <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Tag Frequency Visualization */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-therapy-primary" />
                Tag Distribution Analysis
              </h3>
              <div className="space-y-3">
                {tagAnalytics.sortedTags.slice(0, 10).map(([tag, count]) => {
                  const maxCount = Math.max(...tagAnalytics.sortedTags.map(([, c]) => c));
                  const percentage = (count / maxCount) * 100;
                  return (
                    <div key={tag} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-sm">{tag}</Badge>
                        <span className="text-sm font-medium">{count} ({Math.round((count / sessionNotes.length) * 100)}% of notes)</span>
                      </div>
                      <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                        <div 
                          className="bg-therapy-primary rounded-full h-2 transition-all duration-300"
                          style={{ width: `${percentage}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Client Tag Distribution */}
            <div className="lg:col-span-3 bg-white dark:bg-gray-800 rounded-lg border p-4">
              <h3 className="font-semibold text-lg mb-4 flex items-center gap-2">
                <Tag className="w-5 h-5 text-therapy-secondary" />
                AI Tagging Insights & Patterns
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {Object.entries(tagAnalytics.tagsByClient).slice(0, 9).map(([clientId, tags]) => (
                  <div key={clientId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium text-sm truncate" title={clientId}>{clientId.substring(0, 12)}...</h4>
                      <Badge variant="secondary" className="text-xs">{tags.length} tags</Badge>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {tags.slice(0, 5).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {tags.length > 5 && (
                        <Badge variant="outline" className="text-xs">+{tags.length - 5}</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}