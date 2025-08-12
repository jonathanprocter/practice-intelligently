import { FileText, Plus, Search, Filter, Mic, Bot, Eye, Edit, Trash2, X, Save, Brain, Upload, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, SessionNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

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
  
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Fetch session notes from database
  const { data: sessionNotes = [], isLoading } = useQuery({
    queryKey: ['session-notes'],
    queryFn: ApiClient.getSessionNotes,
  });

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
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success" />
                      <span>AI will extract client names, session dates, and SOAP notes</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success" />
                      <span>Automatic client matching using fuzzy name search</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success" />
                      <span>Smart appointment linking by date proximity</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success" />
                      <span>Intelligent tag generation for categorization</span>
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
                    {note.title ? note.title : `${note.clientId} - Session Note`}
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
                Client: {selectedNote.clientId} • {new Date(selectedNote.createdAt).toLocaleDateString('en-US', {
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
    </div>
  );
}