import { FileText, Plus, Search, Filter, Mic, Bot, Eye, Edit, Trash2, X, Save, Brain, Upload, CheckCircle, AlertCircle, BarChart3, Tag, TrendingUp, Activity, Download, Undo, Redo, Calendar, Clock, ChevronDown, FileDown, Copy, ArrowUpDown, Users, Sparkles, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem } from "@/components/ui/command";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Separator } from "@/components/ui/separator";
import { LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiClient, SessionNote } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { ClientLink } from "@/components/common/ClientLink";
import { EditSessionNoteTitleModal } from "@/components/EditSessionNoteTitleModal";
import { cn } from "@/lib/utils";

// Debounce utility function
function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null;
      func(...args);
    };

    if (timeout) {
      clearTimeout(timeout);
    }
    timeout = setTimeout(later, wait);
  };
}

// Types
interface SearchFilters {
  searchTerm: string;
  dateRange: { start: Date | null; end: Date | null };
  tags: string[];
  clients: string[];
  hasAISummary: boolean | null;
  sessionType: string | null;
  sortBy: 'date' | 'client' | 'relevance';
  sortOrder: 'asc' | 'desc';
}

interface BulkProcessingFile {
  file: File;
  preview: string;
  status: 'pending' | 'processing' | 'success' | 'error';
  error?: string;
  mapping?: {
    detectedClient?: string;
    suggestedDate?: Date;
    confidence: number;
  };
}

interface SessionTemplate {
  id: string;
  name: string;
  structure: 'SOAP' | 'DAP' | 'BIRP' | 'GIRP';
  prompts: string[];
  sections: {
    [key: string]: string;
  };
}

// Undo/Redo Hook
const useUndoableState = <T,>(initialState: T) => {
  const [state, setState] = useState(initialState);
  const [history, setHistory] = useState<T[]>([initialState]);
  const [currentIndex, setCurrentIndex] = useState(0);

  const updateState = useCallback((newState: T | ((prev: T) => T)) => {
    const resolvedState = typeof newState === 'function' ? (newState as (prev: T) => T)(state) : newState;
    const newHistory = history.slice(0, currentIndex + 1);
    newHistory.push(resolvedState);
    setHistory(newHistory);
    setCurrentIndex(newHistory.length - 1);
    setState(resolvedState);
  }, [state, history, currentIndex]);

  const undo = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setState(history[currentIndex - 1]);
    }
  }, [currentIndex, history]);

  const redo = useCallback(() => {
    if (currentIndex < history.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setState(history[currentIndex + 1]);
    }
  }, [currentIndex, history]);

  return {
    state,
    setState: updateState,
    undo,
    redo,
    canUndo: currentIndex > 0,
    canRedo: currentIndex < history.length - 1
  };
};

// Session Templates
const SESSION_TEMPLATES: SessionTemplate[] = [
  {
    id: 'intake',
    name: 'Initial Intake',
    structure: 'SOAP',
    prompts: ['Chief complaint', 'History of present illness', 'Past psychiatric history', 'Medical history'],
    sections: {
      subjective: 'Client reports...',
      objective: 'Client presented as...',
      assessment: 'Initial diagnostic impression...',
      plan: 'Treatment recommendations include...'
    }
  },
  {
    id: 'progress',
    name: 'Progress Note',
    structure: 'DAP',
    prompts: ['Session focus', 'Interventions used', 'Client response', 'Homework assigned'],
    sections: {
      data: 'In today\'s session...',
      assessment: 'Client demonstrated...',
      plan: 'Continue to work on...'
    }
  },
  {
    id: 'crisis',
    name: 'Crisis Intervention',
    structure: 'SOAP',
    prompts: ['Presenting crisis', 'Risk assessment', 'Safety plan', 'Follow-up'],
    sections: {
      subjective: 'Client presented in crisis due to...',
      objective: 'Risk assessment indicates...',
      assessment: 'Client is currently...',
      plan: 'Safety plan established including...'
    }
  }
];

export default function SessionNotes() {
  // Core State
  const [searchTerm, setSearchTerm] = useState("");
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);
  const [isDetailView, setIsDetailView] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<SessionTemplate | null>(null);

  // Enhanced Search Filters
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: '',
    dateRange: { start: null, end: null },
    tags: [],
    clients: [],
    hasAISummary: null,
    sessionType: null,
    sortBy: 'date',
    sortOrder: 'desc'
  });
  const [showAdvancedSearch, setShowAdvancedSearch] = useState(false);

  // Undo/Redo for editing
  const {
    state: editContent,
    setState: setEditContent,
    undo: undoEdit,
    redo: redoEdit,
    canUndo,
    canRedo
  } = useUndoableState("");

  const [editTags, setEditTags] = useState("");
  const [editDate, setEditDate] = useState("");
  const [tagSuggestions, setTagSuggestions] = useState<string[]>([]);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);

  // Bulk processing state
  const [isBulkProcessing, setIsBulkProcessing] = useState(false);
  const [bulkFiles, setBulkFiles] = useState<BulkProcessingFile[]>([]);
  const [bulkProgress, setBulkProgress] = useState<{
    processed: number;
    successful: number;
    failed: number;
    total: number;
    errors: any[];
  }>({ processed: 0, successful: 0, failed: 0, total: 0, errors: [] });

  // Analytics & Visualization
  const [showTagAnalytics, setShowTagAnalytics] = useState(false);
  const [selectedAnalyticsView, setSelectedAnalyticsView] = useState<'overview' | 'trends' | 'clients'>('overview');

  // Export state
  const [isExporting, setIsExporting] = useState(false);
  const [selectedNotesForExport, setSelectedNotesForExport] = useState<string[]>([]);
  const [exportFormat, setExportFormat] = useState<'pdf' | 'csv' | 'docx'>('pdf');

  // Multi-select for batch operations
  const [selectedNoteIds, setSelectedNoteIds] = useState<Set<string>>(new Set());
  const [showBatchActions, setShowBatchActions] = useState(false);

  // Debounced search
  const debouncedSearch = useCallback(
    debounce((value: string) => {
      setDebouncedSearchTerm(value);
    }, 300),
    []
  );

  useEffect(() => {
    debouncedSearch(searchTerm);
  }, [searchTerm, debouncedSearch]);

  // Fetch session notes with React Query
  const { data: sessionNotes = [], isLoading, error } = useQuery({
    queryKey: ['session-notes'],
    queryFn: ApiClient.getSessionNotes,
    staleTime: 30000, // Consider data stale after 30 seconds
    retry: 3,
    retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
  });

  // Get all unique tags for autocomplete
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    sessionNotes.forEach(note => {
      (note.tags || []).forEach(tag => tags.add(tag));
      (note.aiTags || []).forEach(tag => tags.add(tag));
    });
    return Array.from(tags).sort();
  }, [sessionNotes]);

  // Get all unique clients
  const allClients = useMemo(() => {
    const clients = new Set<string>();
    sessionNotes.forEach(note => clients.add(note.clientId));
    return Array.from(clients);
  }, [sessionNotes]);

  // Enhanced filtering with multiple criteria
  const filteredNotes = useMemo(() => {
    let filtered = [...sessionNotes];

    // Text search
    if (debouncedSearchTerm) {
      const searchLower = debouncedSearchTerm.toLowerCase();
      filtered = filtered.filter(note => 
        note.clientId.toLowerCase().includes(searchLower) ||
        note.content.toLowerCase().includes(searchLower) ||
        (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchLower))) ||
        (note.title && note.title.toLowerCase().includes(searchLower)) ||
        (note.subjective && note.subjective.toLowerCase().includes(searchLower)) ||
        (note.objective && note.objective.toLowerCase().includes(searchLower)) ||
        (note.assessment && note.assessment.toLowerCase().includes(searchLower)) ||
        (note.plan && note.plan.toLowerCase().includes(searchLower))
      );
    }

    // Date range filter
    if (filters.dateRange.start || filters.dateRange.end) {
      filtered = filtered.filter(note => {
        const noteDate = new Date(note.sessionDate || note.createdAt);
        if (filters.dateRange.start && noteDate < filters.dateRange.start) return false;
        if (filters.dateRange.end && noteDate > filters.dateRange.end) return false;
        return true;
      });
    }

    // Tag filter
    if (filters.tags.length > 0) {
      filtered = filtered.filter(note => {
        const noteTags = [...(note.tags || []), ...(note.aiTags || [])];
        return filters.tags.some(tag => noteTags.includes(tag));
      });
    }

    // Client filter
    if (filters.clients.length > 0) {
      filtered = filtered.filter(note => filters.clients.includes(note.clientId));
    }

    // AI Summary filter
    if (filters.hasAISummary !== null) {
      filtered = filtered.filter(note => 
        filters.hasAISummary ? !!note.aiSummary : !note.aiSummary
      );
    }

    // Sorting
    filtered.sort((a, b) => {
      let comparison = 0;

      switch (filters.sortBy) {
        case 'date':
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
          break;
        case 'client':
          comparison = a.clientId.localeCompare(b.clientId);
          break;
        case 'relevance':
          // Simple relevance scoring based on search term frequency
          if (debouncedSearchTerm) {
            const scoreA = (a.content.match(new RegExp(debouncedSearchTerm, 'gi')) || []).length;
            const scoreB = (b.content.match(new RegExp(debouncedSearchTerm, 'gi')) || []).length;
            comparison = scoreB - scoreA;
          }
          break;
      }

      return filters.sortOrder === 'asc' ? -comparison : comparison;
    });

    return filtered;
  }, [sessionNotes, debouncedSearchTerm, filters]);

  // Tag analytics with enhanced metrics
  const tagAnalytics = useMemo(() => {
    const tagFrequency: { [key: string]: number } = {};
    const tagsByClient: { [key: string]: string[] } = {};
    const tagsByDate: { [key: string]: string[] } = {};
    const tagCoOccurrence: { [key: string]: { [key: string]: number } } = {};

    sessionNotes.forEach(note => {
      const allTags = [...(note.tags || []), ...(note.aiTags || [])];

      allTags.forEach((tag, i) => {
        const normalizedTag = tag.toLowerCase().trim();

        // Frequency
        tagFrequency[normalizedTag] = (tagFrequency[normalizedTag] || 0) + 1;

        // By client
        if (!tagsByClient[note.clientId]) tagsByClient[note.clientId] = [];
        if (!tagsByClient[note.clientId].includes(normalizedTag)) {
          tagsByClient[note.clientId].push(normalizedTag);
        }

        // By date
        const dateKey = note.sessionDate ? 
          new Date(note.sessionDate).toISOString().split('T')[0] : 
          new Date(note.createdAt).toISOString().split('T')[0];
        if (!tagsByDate[dateKey]) tagsByDate[dateKey] = [];
        tagsByDate[dateKey].push(normalizedTag);

        // Co-occurrence
        allTags.forEach((otherTag, j) => {
          if (i !== j) {
            const otherNormalized = otherTag.toLowerCase().trim();
            if (!tagCoOccurrence[normalizedTag]) tagCoOccurrence[normalizedTag] = {};
            tagCoOccurrence[normalizedTag][otherNormalized] = 
              (tagCoOccurrence[normalizedTag][otherNormalized] || 0) + 1;
          }
        });
      });
    });

    // Calculate trends
    const dates = Object.keys(tagsByDate).sort();
    const last30Days = dates.slice(-30);
    const tagTrends: { [key: string]: number[] } = {};

    last30Days.forEach(date => {
      tagsByDate[date].forEach(tag => {
        if (!tagTrends[tag]) tagTrends[tag] = new Array(30).fill(0);
        const index = last30Days.indexOf(date);
        tagTrends[tag][index]++;
      });
    });

    // Sort tags by frequency
    const sortedTags = Object.entries(tagFrequency)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 20);

    // Prepare chart data
    const chartData = sortedTags.slice(0, 10).map(([tag, count]) => ({
      name: tag,
      count: count,
      percentage: Math.round((count / sessionNotes.length) * 100)
    }));

    // Calculate trending tags (comparing last 15 days to previous 15)
    const trendingTags: { tag: string; growth: number }[] = [];
    Object.entries(tagTrends).forEach(([tag, trend]) => {
      const firstHalf = trend.slice(0, 15).reduce((a, b) => a + b, 0);
      const secondHalf = trend.slice(15).reduce((a, b) => a + b, 0);
      if (firstHalf > 0) {
        const growth = ((secondHalf - firstHalf) / firstHalf) * 100;
        trendingTags.push({ tag, growth });
      }
    });
    trendingTags.sort((a, b) => b.growth - a.growth);

    return {
      tagFrequency,
      sortedTags,
      tagsByClient,
      tagsByDate,
      tagCoOccurrence,
      chartData,
      trendingTags: trendingTags.slice(0, 5),
      decliningTags: trendingTags.slice(-5).reverse(),
      totalUniqueTags: Object.keys(tagFrequency).length,
      averageTagsPerNote: sessionNotes.length > 0 ? 
        Object.values(tagFrequency).reduce((a, b) => a + b, 0) / sessionNotes.length : 0
    };
  }, [sessionNotes]);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Mutations with optimistic updates
  const updateNoteMutation = useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<SessionNote> }) =>
      ApiClient.updateSessionNote(id, updates),
    onMutate: async ({ id, updates }) => {
      await queryClient.cancelQueries({ queryKey: ['session-notes'] });
      const previousNotes = queryClient.getQueryData<SessionNote[]>(['session-notes']);

      queryClient.setQueryData<SessionNote[]>(['session-notes'], old => 
        old ? old.map(note => note.id === id ? { ...note, ...updates } : note) : []
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['session-notes'], context.previousNotes);
      }
      toast({ 
        title: "Error updating session note", 
        description: err.message,
        variant: "destructive" 
      });
    },
    onSuccess: () => {
      toast({ title: "Session note updated successfully" });
      setIsEditing(false);
      setIsDetailView(false);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
    },
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (ids: string[]) => 
      Promise.all(ids.map(id => ApiClient.deleteSessionNote(id))),
    onMutate: async (ids) => {
      await queryClient.cancelQueries({ queryKey: ['session-notes'] });
      const previousNotes = queryClient.getQueryData<SessionNote[]>(['session-notes']);

      queryClient.setQueryData<SessionNote[]>(['session-notes'], old => 
        old ? old.filter(note => !ids.includes(note.id)) : []
      );

      return { previousNotes };
    },
    onError: (err, variables, context) => {
      if (context?.previousNotes) {
        queryClient.setQueryData(['session-notes'], context.previousNotes);
      }
      toast({ 
        title: "Error deleting session notes", 
        description: err.message,
        variant: "destructive" 
      });
    },
    onSuccess: (_, ids) => {
      toast({ 
        title: "Success", 
        description: `${ids.length} session note(s) deleted successfully` 
      });
      setIsDetailView(false);
      setSelectedNoteIds(new Set());
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
    },
  });

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

  // Bulk processing with file preview
  const handleBulkFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files || []);

    const processedFiles = await Promise.all(files.map(async (file) => {
      const preview = await file.text();
      const previewSnippet = preview.substring(0, 500);

      // Simple client detection (could be enhanced with AI)
      const clientMatch = preview.match(/(?:client|patient):\s*([^\n]+)/i);
      const dateMatch = preview.match(/(?:date|session):\s*([^\n]+)/i);

      return {
        file,
        preview: previewSnippet,
        status: 'pending' as const,
        mapping: {
          detectedClient: clientMatch ? clientMatch[1].trim() : undefined,
          suggestedDate: dateMatch ? new Date(dateMatch[1]) : new Date(),
          confidence: (clientMatch ? 50 : 0) + (dateMatch ? 50 : 0)
        }
      };
    }));

    setBulkFiles(prev => [...prev, ...processedFiles]);
  };

  const processBulkFiles = async () => {
    if (bulkFiles.length === 0) return;

    setIsBulkProcessing(true);
    setBulkProgress({ 
      processed: 0, 
      successful: 0, 
      failed: 0, 
      total: bulkFiles.length, 
      errors: [] 
    });

    for (let i = 0; i < bulkFiles.length; i++) {
      const file = bulkFiles[i];

      try {
        // Update file status
        setBulkFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'processing' } : f
        ));

        const content = await file.file.text();

        // Process the document (simplified - actual implementation would call API)
        await new Promise(resolve => setTimeout(resolve, 1000)); // Simulate processing

        setBulkFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'success' } : f
        ));

        setBulkProgress(prev => ({
          ...prev,
          processed: prev.processed + 1,
          successful: prev.successful + 1
        }));
      } catch (error) {
        setBulkFiles(prev => prev.map((f, idx) => 
          idx === i ? { ...f, status: 'error', error: error.message } : f
        ));

        setBulkProgress(prev => ({
          ...prev,
          processed: prev.processed + 1,
          failed: prev.failed + 1,
          errors: [...prev.errors, { file: file.file.name, error: error.message }]
        }));
      }
    }

    queryClient.invalidateQueries({ queryKey: ['session-notes'] });
    toast({ 
      title: "Bulk processing completed", 
      description: `${bulkProgress.successful} successful, ${bulkProgress.failed} failed`
    });
  };

  // Export functionality
  const exportNotes = async (format: 'pdf' | 'csv' | 'docx') => {
    setIsExporting(true);

    try {
      const notesToExport = selectedNoteIds.size > 0 
        ? sessionNotes.filter(note => selectedNoteIds.has(note.id))
        : filteredNotes;

      // Simulate export (actual implementation would call API)
      await new Promise(resolve => setTimeout(resolve, 2000));

      toast({ 
        title: "Export successful", 
        description: `Exported ${notesToExport.length} notes as ${format.toUpperCase()}` 
      });

      // Reset selection after export
      setSelectedNoteIds(new Set());
    } catch (error) {
      toast({ 
        title: "Export failed", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsExporting(false);
    }
  };

  // AI-powered tag suggestions
  const suggestTags = async () => {
    setIsGeneratingTags(true);

    try {
      // Simulate AI tag generation based on content
      await new Promise(resolve => setTimeout(resolve, 1000));

      const suggestions = [
        'anxiety', 'coping-strategies', 'mindfulness', 
        'cognitive-restructuring', 'progress'
      ].filter(tag => !editTags.includes(tag));

      setTagSuggestions(suggestions);
      toast({ title: "Tag suggestions generated" });
    } catch (error) {
      toast({ 
        title: "Failed to generate suggestions", 
        description: error.message,
        variant: "destructive" 
      });
    } finally {
      setIsGeneratingTags(false);
    }
  };

  // Handlers
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

  const handleDelete = (notes: SessionNote[]) => {
    const noteCount = notes.length;
    const message = noteCount === 1 
      ? "Are you sure you want to delete this session note?" 
      : `Are you sure you want to delete ${noteCount} session notes?`;

    if (confirm(`${message} This action cannot be undone.`)) {
      deleteNoteMutation.mutate(notes.map(n => n.id));
    }
  };

  const handleBatchDelete = () => {
    const selectedNotes = sessionNotes.filter(note => selectedNoteIds.has(note.id));
    handleDelete(selectedNotes);
  };

  const toggleNoteSelection = (noteId: string) => {
    setSelectedNoteIds(prev => {
      const newSet = new Set(prev);
      if (newSet.has(noteId)) {
        newSet.delete(noteId);
      } else {
        newSet.add(noteId);
      }
      return newSet;
    });
  };

  const selectAllNotes = () => {
    if (selectedNoteIds.size === filteredNotes.length) {
      setSelectedNoteIds(new Set());
    } else {
      setSelectedNoteIds(new Set(filteredNotes.map(n => n.id)));
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + A: Select all
      if ((e.ctrlKey || e.metaKey) && e.key === 'a' && !isEditing) {
        e.preventDefault();
        selectAllNotes();
      }

      // Ctrl/Cmd + Z: Undo (when editing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'z' && isEditing && canUndo) {
        e.preventDefault();
        undoEdit();
      }

      // Ctrl/Cmd + Y: Redo (when editing)
      if ((e.ctrlKey || e.metaKey) && e.key === 'y' && isEditing && canRedo) {
        e.preventDefault();
        redoEdit();
      }

      // Escape: Clear selection or close dialogs
      if (e.key === 'Escape') {
        if (selectedNoteIds.size > 0) {
          setSelectedNoteIds(new Set());
        } else if (isDetailView || isEditing) {
          setIsDetailView(false);
          setIsEditing(false);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isEditing, canUndo, canRedo, selectedNoteIds, isDetailView]);

  // Announce actions for screen readers
  const announce = (message: string) => {
    const announcement = document.createElement('div');
    announcement.setAttribute('aria-live', 'polite');
    announcement.setAttribute('aria-atomic', 'true');
    announcement.className = 'sr-only';
    announcement.textContent = message;
    document.body.appendChild(announcement);
    setTimeout(() => document.body.removeChild(announcement), 1000);
  };

  // Chart colors
  const CHART_COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316'];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-2xl font-bold text-therapy-text">Session Notes</h1>
          <p className="text-therapy-text/60">Document and analyze therapy sessions</p>
        </div>
        <div className="flex items-center space-x-2">
          {selectedNoteIds.size > 0 && (
            <Badge variant="secondary" className="py-1">
              {selectedNoteIds.size} selected
            </Badge>
          )}
          <Button 
            className="bg-therapy-primary hover:bg-therapy-primary/90"
            onClick={() => setIsCreating(true)}
          >
            <Plus className="w-4 h-4 mr-2" />
            New Session Note
          </Button>
        </div>
      </div>

      {/* Create Session Note */}
      {isCreating && (
        <div className="therapy-card p-6 space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">Create Session Note</h3>
            <Button variant="ghost" size="sm" onClick={() => setIsCreating(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Template Selection */}
          <div>
            <label className="block text-sm font-medium mb-2">Use Template (Optional)</label>
            <Select onValueChange={(value) => setSelectedTemplate(SESSION_TEMPLATES.find(t => t.id === value) || null)}>
              <SelectTrigger>
                <SelectValue placeholder="Select a template..." />
              </SelectTrigger>
              <SelectContent>
                {SESSION_TEMPLATES.map(template => (
                  <SelectItem key={template.id} value={template.id}>
                    <div>
                      <div className="font-medium">{template.name}</div>
                      <div className="text-xs text-gray-500">{template.structure} format</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium mb-2">Client</label>
              <Select>
                <SelectTrigger>
                  <SelectValue placeholder="Select client..." />
                </SelectTrigger>
                <SelectContent>
                  {allClients.map(clientId => (
                    <SelectItem key={clientId} value={clientId}>
                      <ClientLink clientId={clientId} fallback={`Client ${clientId.substring(0, 8)}`} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-2">Session Type</label>
              <Input placeholder="e.g., Individual Therapy - CBT" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">Session Notes</label>
            <Textarea 
              placeholder={selectedTemplate ? selectedTemplate.sections.subjective : "Enter your session notes here..."}
              rows={8}
              className="font-mono text-sm"
            />
            {selectedTemplate && (
              <div className="mt-2 text-xs text-gray-500">
                Template: {selectedTemplate.name} ({selectedTemplate.structure})
              </div>
            )}
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
              <Button variant="outline" size="sm">
                <Layers className="w-4 h-4 mr-2" />
                Templates
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

      {/* Search and Filters */}
      <div className="space-y-4">
        <div className="flex space-x-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              placeholder="Search session notes..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
              aria-label="Search session notes"
            />
          </div>

          <Button 
            variant="outline"
            onClick={() => setShowAdvancedSearch(!showAdvancedSearch)}
            className={cn(showAdvancedSearch && "bg-therapy-primary/10")}
          >
            <Filter className="w-4 h-4 mr-2" />
            Advanced Filters
            <ChevronDown className={cn("w-4 h-4 ml-2 transition-transform", showAdvancedSearch && "rotate-180")} />
          </Button>

          <Popover>
            <PopoverTrigger asChild>
              <Button variant="outline">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                Sort
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-48">
              <div className="space-y-2">
                <Select value={filters.sortBy} onValueChange={(value: any) => setFilters(prev => ({ ...prev, sortBy: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">Date</SelectItem>
                    <SelectItem value="client">Client</SelectItem>
                    <SelectItem value="relevance">Relevance</SelectItem>
                  </SelectContent>
                </Select>
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start"
                  onClick={() => setFilters(prev => ({ ...prev, sortOrder: prev.sortOrder === 'asc' ? 'desc' : 'asc' }))}
                >
                  {filters.sortOrder === 'asc' ? '↑ Ascending' : '↓ Descending'}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          <Button 
            variant="outline" 
            className="bg-therapy-warning/10 border-therapy-warning text-therapy-warning hover:bg-therapy-warning hover:text-white"
            onClick={() => setIsBulkProcessing(!isBulkProcessing)}
          >
            <Upload className="w-4 h-4 mr-2" />
            Bulk Import
          </Button>

          <Button 
            variant="outline" 
            className="bg-therapy-primary/10 border-therapy-primary text-therapy-primary hover:bg-therapy-primary hover:text-white"
            onClick={() => setShowTagAnalytics(!showTagAnalytics)}
          >
            <BarChart3 className="w-4 h-4 mr-2" />
            Analytics
          </Button>
        </div>

        {/* Advanced Search Panel */}
        {showAdvancedSearch && (
          <div className="therapy-card p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Date Range</label>
                <div className="flex space-x-2">
                  <Input 
                    type="date" 
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, start: e.target.value ? new Date(e.target.value) : null }
                    }))}
                  />
                  <span className="self-center">to</span>
                  <Input 
                    type="date"
                    onChange={(e) => setFilters(prev => ({ 
                      ...prev, 
                      dateRange: { ...prev.dateRange, end: e.target.value ? new Date(e.target.value) : null }
                    }))}
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start">
                      {filters.tags.length > 0 ? `${filters.tags.length} selected` : "Select tags..."}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-64">
                    <Command>
                      <CommandInput placeholder="Search tags..." />
                      <CommandEmpty>No tags found.</CommandEmpty>
                      <CommandGroup>
                        {allTags.map(tag => (
                          <CommandItem
                            key={tag}
                            onSelect={() => {
                              setFilters(prev => ({
                                ...prev,
                                tags: prev.tags.includes(tag) 
                                  ? prev.tags.filter(t => t !== tag)
                                  : [...prev.tags, tag]
                              }));
                            }}
                          >
                            <Checkbox 
                              checked={filters.tags.includes(tag)}
                              className="mr-2"
                            />
                            {tag}
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </Command>
                  </PopoverContent>
                </Popover>
              </div>

              <div className="flex items-end space-x-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="ai-summary"
                    checked={filters.hasAISummary === true}
                    onCheckedChange={(checked) => 
                      setFilters(prev => ({ ...prev, hasAISummary: checked === true ? true : null }))
                    }
                  />
                  <label htmlFor="ai-summary" className="text-sm">Has AI Summary</label>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => setFilters({
                    searchTerm: '',
                    dateRange: { start: null, end: null },
                    tags: [],
                    clients: [],
                    hasAISummary: null,
                    sessionType: null,
                    sortBy: 'date',
                    sortOrder: 'desc'
                  })}
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Batch Actions Bar */}
      {selectedNoteIds.size > 0 && (
        <div className="bg-therapy-primary/10 border border-therapy-primary rounded-lg p-3 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Checkbox 
              checked={selectedNoteIds.size === filteredNotes.length}
              onCheckedChange={selectAllNotes}
            />
            <span className="text-sm font-medium">
              {selectedNoteIds.size} of {filteredNotes.length} selected
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => exportNotes(exportFormat)}
              disabled={isExporting}
            >
              <FileDown className="w-4 h-4 mr-1" />
              Export
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                const selectedNotes = sessionNotes.filter(n => selectedNoteIds.has(n.id));
                selectedNotes.forEach(note => generateTagsMutation.mutate(note.id));
              }}
            >
              <Bot className="w-4 h-4 mr-1" />
              Generate Tags
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleBatchDelete}
              className="text-red-600 hover:text-red-700"
            >
              <Trash2 className="w-4 h-4 mr-1" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Bulk Processing Panel */}
      {isBulkProcessing && (
        <div className="therapy-card p-6 space-y-4 border-l-4 border-therapy-warning">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="text-lg font-semibold text-therapy-text">Bulk Document Processing</h3>
              <p className="text-therapy-text/60 text-sm">Upload multiple therapy documents for AI processing</p>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setIsBulkProcessing(false)}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* File Upload */}
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
                />
                <label
                  htmlFor="bulk-file-input"
                  className="inline-flex items-center px-4 py-2 bg-therapy-primary text-white rounded-lg hover:bg-therapy-primary/90 cursor-pointer"
                >
                  Select Files
                </label>
              </div>

              {/* File List with Preview */}
              {bulkFiles.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-medium text-therapy-text">Files to Process ({bulkFiles.length})</h4>
                  <div className="max-h-64 overflow-y-auto space-y-2">
                    {bulkFiles.map((file, index) => (
                      <div key={index} className="border rounded-lg p-3 space-y-2">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2">
                            <FileText className="w-4 h-4 text-therapy-text/60" />
                            <span className="text-sm font-medium">{file.file.name}</span>
                            {file.status === 'processing' && (
                              <Badge variant="outline" className="text-xs">Processing...</Badge>
                            )}
                            {file.status === 'success' && (
                              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                                <CheckCircle className="w-3 h-3 mr-1" />
                                Processed
                              </Badge>
                            )}
                            {file.status === 'error' && (
                              <Badge variant="outline" className="text-xs bg-red-50 text-red-700">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Failed
                              </Badge>
                            )}
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBulkFiles(prev => prev.filter((_, i) => i !== index))}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* File Preview & Mapping */}
                        <div className="bg-gray-50 rounded p-2 text-xs text-gray-600">
                          <div className="line-clamp-2 mb-2">{file.preview}</div>
                          {file.mapping && (
                            <div className="flex items-center space-x-4 text-xs">
                              {file.mapping.detectedClient && (
                                <span className="flex items-center">
                                  <Users className="w-3 h-3 mr-1" />
                                  {file.mapping.detectedClient}
                                </span>
                              )}
                              {file.mapping.suggestedDate && (
                                <span className="flex items-center">
                                  <Calendar className="w-3 h-3 mr-1" />
                                  {file.mapping.suggestedDate.toLocaleDateString()}
                                </span>
                              )}
                              <Badge variant="outline" className="text-xs">
                                {file.mapping.confidence}% confidence
                              </Badge>
                            </div>
                          )}
                        </div>

                        {file.error && (
                          <Alert className="bg-red-50 border-red-200">
                            <AlertCircle className="h-4 w-4" />
                            <AlertDescription className="text-xs">{file.error}</AlertDescription>
                          </Alert>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Processing Status */}
            <div className="space-y-4">
              <div className="bg-therapy-bg border border-therapy-border rounded-lg p-4">
                <h4 className="font-medium text-therapy-text mb-3">Processing Pipeline</h4>

                {bulkProgress.total > 0 ? (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between text-sm">
                      <span>Processing documents...</span>
                      <span className="text-therapy-primary font-medium">
                        {bulkProgress.processed}/{bulkProgress.total}
                      </span>
                    </div>
                    <Progress value={(bulkProgress.processed / bulkProgress.total) * 100} />

                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <CheckCircle className="w-4 h-4 text-therapy-success" />
                          <span>Successful</span>
                        </span>
                        <span className="font-medium">{bulkProgress.successful}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="flex items-center space-x-1">
                          <AlertCircle className="w-4 h-4 text-therapy-danger" />
                          <span>Failed</span>
                        </span>
                        <span className="font-medium">{bulkProgress.failed}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2 text-sm text-therapy-text/60">
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success mt-0.5" />
                      <span>AI-powered document analysis</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success mt-0.5" />
                      <span>Automatic client matching</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success mt-0.5" />
                      <span>SOAP note formatting</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <CheckCircle className="w-4 h-4 text-therapy-success mt-0.5" />
                      <span>Smart tagging & categorization</span>
                    </div>
                  </div>
                )}
              </div>

              <Button
                onClick={processBulkFiles}
                disabled={bulkFiles.length === 0}
                className="w-full bg-therapy-success hover:bg-therapy-success/90"
              >
                <Brain className="w-4 h-4 mr-2" />
                Process {bulkFiles.length} Files
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Session Notes List */}
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
              </div>
            ))}
          </div>
        ) : error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Failed to load session notes. Please try refreshing the page.
            </AlertDescription>
          </Alert>
        ) : filteredNotes.length > 0 ? (
          filteredNotes.map((note) => (
            <div 
              key={note.id} 
              className={cn(
                "therapy-card p-6 transition-all",
                selectedNoteIds.has(note.id) && "ring-2 ring-therapy-primary bg-therapy-primary/5"
              )}
              role="article"
              aria-label={`Session note for ${note.clientId}`}
            >
              <div className="flex items-start space-x-4">
                {/* Selection Checkbox */}
                <Checkbox
                  checked={selectedNoteIds.has(note.id)}
                  onCheckedChange={() => toggleNoteSelection(note.id)}
                  aria-label={`Select session note for ${note.clientId}`}
                />

                <div className="flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <h3 className="font-semibold text-therapy-text mb-1" data-testid={`text-note-title-${note.id}`}>
                        {note.title ? (
                          <span className="text-lg">{note.title}</span>
                        ) : (
                          <span className="flex items-center gap-2 text-gray-600">
                            <ClientLink clientId={note.clientId} fallback={`Client ${note.clientId.substring(0, 8)}`} />
                            <span>- Session Note</span>
                            <Badge variant="outline" className="text-xs">No Title</Badge>
                          </span>
                        )}
                      </h3>
                      <p className="text-sm text-therapy-text/60">
                        {new Date(note.sessionDate || note.createdAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      {note.title && (
                        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
                          <FileText className="w-3 h-3 mr-1" />
                          SOAP
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

                  {/* Content Preview */}
                  <div className="text-therapy-text mb-4">
                    {note.title ? (
                      <div className="space-y-2">
                        {note.subjective && (
                          <div>
                            <span className="font-medium text-sm text-blue-700">S:</span>
                            <span className="text-sm ml-2">{note.subjective.substring(0, 150)}...</span>
                          </div>
                        )}
                        {note.assessment && (
                          <div>
                            <span className="font-medium text-sm text-green-700">A:</span>
                            <span className="text-sm ml-2">{note.assessment.substring(0, 150)}...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm line-clamp-3">
                        {note.content.substring(0, 300)}...
                      </p>
                    )}
                  </div>

                  {/* Tags and Actions */}
                  <div className="flex items-center justify-between">
                    <div className="flex space-x-2 flex-wrap">
                      {(note.tags || []).concat(note.aiTags || []).slice(0, 5).map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs mb-1">
                          {tag}
                        </Badge>
                      ))}
                      {((note.tags?.length || 0) + (note.aiTags?.length || 0)) > 5 && (
                        <Badge variant="outline" className="text-xs mb-1">
                          +{((note.tags?.length || 0) + (note.aiTags?.length || 0)) - 5} more
                        </Badge>
                      )}
                    </div>

                    <div className="flex space-x-1">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(note)}
                        data-testid={`button-view-${note.id}`}
                      >
                        <Eye className="w-4 h-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          setSelectedNote(note);
                          setIsEditingTitle(true);
                        }}
                        aria-label={`Edit title for session note of ${note.clientId}`}
                        data-testid={`button-edit-title-${note.id}`}
                      >
                        <Edit className="w-4 h-4 mr-1" />
                        Title
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleEdit(note)}
                        data-testid={`button-edit-${note.id}`}
                      >
                        <Edit className="w-4 h-4" />
                      </Button>
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <Sparkles className="w-4 h-4" />
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-48 p-2">
                          <div className="space-y-1">
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => generateTagsMutation.mutate(note.id)}
                              disabled={generateTagsMutation.isPending}
                            >
                              <Bot className="w-3 h-3 mr-2" />
                              Generate Tags
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="w-full justify-start"
                              onClick={() => sessionPrepMutation.mutate({ sessionNoteId: note.id, clientId: note.clientId })}
                              disabled={sessionPrepMutation.isPending}
                            >
                              <Brain className="w-3 h-3 mr-2" />
                              Session Prep
                            </Button>
                            <Separator className="my-1" />
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="w-full justify-start text-red-600"
                              onClick={() => handleDelete([note])}
                            >
                              <Trash2 className="w-3 h-3 mr-2" />
                              Delete
                            </Button>
                          </div>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-therapy-text/30 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-therapy-text mb-2">
              {searchTerm || filters.tags.length > 0 ? "No matching session notes found" : "No session notes found"}
            </h3>
            <p className="text-therapy-text/60 mb-4">
              {searchTerm || filters.tags.length > 0
                ? "Try adjusting your search criteria"
                : "Start documenting your therapy sessions"}
            </p>
            {!searchTerm && filters.tags.length === 0 && (
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

      {/* Detail/Edit Dialog */}
      <Dialog open={isDetailView || isEditing} onOpenChange={(open) => {
        if (!open) {
          setIsDetailView(false);
          setIsEditing(false);
          setSelectedNote(null);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>{isEditing ? "Edit Session Note" : "Session Note Details"}</span>
              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={undoEdit}
                    disabled={!canUndo}
                    title="Undo (Ctrl+Z)"
                  >
                    <Undo className="w-4 h-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm"
                    onClick={redoEdit}
                    disabled={!canRedo}
                    title="Redo (Ctrl+Y)"
                  >
                    <Redo className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </DialogTitle>
            {selectedNote && (
              <DialogDescription>
                <ClientLink clientId={selectedNote.clientId} /> • {new Date(selectedNote.createdAt).toLocaleDateString()}
              </DialogDescription>
            )}
          </DialogHeader>

          {selectedNote && (
            <div className="space-y-6">
              {/* Content */}
              <div>
                <label className="block text-sm font-medium mb-2">
                  {selectedNote.title ? "SOAP Note" : "Session Content"}
                </label>
                {isEditing ? (
                  <div className="space-y-4">
                    <Textarea
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                      className="min-h-[300px] font-mono text-sm"
                      placeholder="Session note content..."
                    />
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        {editContent.length} characters
                      </span>
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={suggestTags}
                          disabled={isGeneratingTags}
                        >
                          <Bot className="w-3 h-3 mr-1" />
                          {isGeneratingTags ? "Generating..." : "Suggest Tags"}
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 border rounded-lg bg-gray-50 max-h-96 overflow-y-auto">
                    {selectedNote.title ? (
                      <div className="space-y-4">
                        {selectedNote.subjective && (
                          <div>
                            <h4 className="font-medium text-blue-700 mb-1">Subjective</h4>
                            <p className="text-sm whitespace-pre-wrap">{selectedNote.subjective}</p>
                          </div>
                        )}
                        {selectedNote.objective && (
                          <div>
                            <h4 className="font-medium text-orange-700 mb-1">Objective</h4>
                            <p className="text-sm whitespace-pre-wrap">{selectedNote.objective}</p>
                          </div>
                        )}
                        {selectedNote.assessment && (
                          <div>
                            <h4 className="font-medium text-green-700 mb-1">Assessment</h4>
                            <p className="text-sm whitespace-pre-wrap">{selectedNote.assessment}</p>
                          </div>
                        )}
                        {selectedNote.plan && (
                          <div>
                            <h4 className="font-medium text-purple-700 mb-1">Plan</h4>
                            <p className="text-sm whitespace-pre-wrap">{selectedNote.plan}</p>
                          </div>
                        )}
                      </div>
                    ) : (
                      <pre className="whitespace-pre-wrap text-sm font-mono">
                        {selectedNote.content}
                      </pre>
                    )}
                  </div>
                )}
              </div>

              {/* Tags */}
              <div>
                <label className="block text-sm font-medium mb-2">Tags</label>
                {isEditing ? (
                  <div className="space-y-2">
                    <Input
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder="Enter tags separated by commas"
                    />
                    {tagSuggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs text-gray-500">Suggestions:</span>
                        {tagSuggestions.map(tag => (
                          <Badge
                            key={tag}
                            variant="outline"
                            className="cursor-pointer hover:bg-gray-100"
                            onClick={() => setEditTags(prev => prev ? `${prev}, ${tag}` : tag)}
                          >
                            <Plus className="w-3 h-3 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedNote.tags?.map((tag, index) => (
                      <Badge key={index} variant="secondary">{tag}</Badge>
                    ))}
                    {selectedNote.aiTags?.map((tag, index) => (
                      <Badge key={`ai-${index}`} variant="outline" className="bg-purple-50">
                        <Bot className="w-3 h-3 mr-1" />
                        {tag}
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              {/* Date */}
              <div>
                <label className="block text-sm font-medium mb-2">Session Date</label>
                {isEditing ? (
                  <Input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                  />
                ) : (
                  <p className="text-sm text-gray-600">
                    {new Date(selectedNote.sessionDate || selectedNote.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex justify-end space-x-2 pt-4 border-t">
                {isEditing ? (
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsEditing(false)}
                    >
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
                  <>
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        navigator.clipboard.writeText(selectedNote.content);
                        toast({ title: "Content copied to clipboard" });
                        announce("Content copied to clipboard");
                      }}
                    >
                      <Copy className="w-4 h-4 mr-1" />
                      Copy
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => handleEdit(selectedNote)}
                    >
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button 
                      variant="outline" 
                      onClick={() => setIsDetailView(false)}
                    >
                      Close
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Analytics Dialog */}
      <Dialog open={showTagAnalytics} onOpenChange={setShowTagAnalytics}>
        <DialogContent className="max-w-6xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Session Notes Analytics</DialogTitle>
            <DialogDescription>
              Comprehensive analysis of your therapy documentation patterns
            </DialogDescription>
          </DialogHeader>

          <Tabs value={selectedAnalyticsView} onValueChange={(v: any) => setSelectedAnalyticsView(v)}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="clients">Clients</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <Tag className="w-8 h-8 text-blue-600 mb-2" />
                  <p className="text-2xl font-bold">{tagAnalytics.totalUniqueTags}</p>
                  <p className="text-sm text-gray-600">Unique Tags</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg">
                  <Activity className="w-8 h-8 text-green-600 mb-2" />
                  <p className="text-2xl font-bold">{tagAnalytics.averageTagsPerNote.toFixed(1)}</p>
                  <p className="text-sm text-gray-600">Avg Tags/Note</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <FileText className="w-8 h-8 text-purple-600 mb-2" />
                  <p className="text-2xl font-bold">{sessionNotes.length}</p>
                  <p className="text-sm text-gray-600">Total Notes</p>
                </div>
                <div className="bg-orange-50 p-4 rounded-lg">
                  <Users className="w-8 h-8 text-orange-600 mb-2" />
                  <p className="text-2xl font-bold">{allClients.length}</p>
                  <p className="text-sm text-gray-600">Active Clients</p>
                </div>
              </div>

              {/* Tag Frequency Chart */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Most Frequent Tags</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={tagAnalytics.chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" angle={-45} textAnchor="end" height={80} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#3B82F6" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Tag Distribution Pie Chart */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Tag Distribution</h3>
                  <ResponsiveContainer width="100%" height={200}>
                    <PieChart>
                      <Pie
                        data={tagAnalytics.chartData.slice(0, 5)}
                        dataKey="percentage"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={80}
                        label
                      >
                        {tagAnalytics.chartData.slice(0, 5).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-4">Tag Co-occurrence</h3>
                  <div className="space-y-2">
                    {Object.entries(tagAnalytics.tagCoOccurrence)
                      .slice(0, 5)
                      .map(([tag, related]) => {
                        const topRelated = Object.entries(related)
                          .sort(([,a], [,b]) => b - a)
                          .slice(0, 3);
                        return (
                          <div key={tag} className="text-sm">
                            <span className="font-medium">{tag}:</span>
                            <span className="ml-2 text-gray-600">
                              {topRelated.map(([t]) => t).join(', ')}
                            </span>
                          </div>
                        );
                      })}
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="trends" className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                {/* Trending Tags */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-4 text-green-600">📈 Trending Up</h3>
                  <div className="space-y-2">
                    {tagAnalytics.trendingTags.map(({ tag, growth }) => (
                      <div key={tag} className="flex items-center justify-between">
                        <Badge variant="outline">{tag}</Badge>
                        <span className="text-sm text-green-600">+{growth.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Declining Tags */}
                <div className="bg-white rounded-lg border p-4">
                  <h3 className="font-semibold mb-4 text-red-600">📉 Trending Down</h3>
                  <div className="space-y-2">
                    {tagAnalytics.decliningTags.map(({ tag, growth }) => (
                      <div key={tag} className="flex items-center justify-between">
                        <Badge variant="outline">{tag}</Badge>
                        <span className="text-sm text-red-600">{growth.toFixed(1)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Activity Timeline */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="font-semibold mb-4">Session Activity (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart 
                    data={Object.entries(tagAnalytics.tagsByDate)
                      .slice(-30)
                      .map(([date, tags]) => ({
                        date: new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
                        sessions: tags.length
                      }))}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <Tooltip />
                    <Line type="monotone" dataKey="sessions" stroke="#3B82F6" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </TabsContent>

            <TabsContent value="clients" className="space-y-6">
              <div className="grid grid-cols-1 gap-4">
                {Object.entries(tagAnalytics.tagsByClient).slice(0, 10).map(([clientId, tags]) => (
                  <div key={clientId} className="bg-white rounded-lg border p-4">
                    <div className="flex items-center justify-between mb-3">
                      <ClientLink clientId={clientId} fallback={`Client ${clientId.substring(0, 8)}`} />
                      <Badge variant="secondary">{tags.length} unique tags</Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {tags.slice(0, 10).map(tag => (
                        <Badge key={tag} variant="outline" className="text-xs">{tag}</Badge>
                      ))}
                      {tags.length > 10 && (
                        <Badge variant="outline" className="text-xs">+{tags.length - 10} more</Badge>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        </DialogContent>
      </Dialog>

      {/* Edit Session Note Title Modal */}
      {selectedNote && (
        <EditSessionNoteTitleModal
          note={selectedNote}
          isOpen={isEditingTitle}
          onClose={() => {
            setIsEditingTitle(false);
            setSelectedNote(null);
          }}
          onTitleUpdated={() => {
            // Invalidate relevant queries to refresh the data
            queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
            queryClient.invalidateQueries({ queryKey: ['/api/session-notes/today'] });
          }}
        />
      )}
    </div>
  );
}