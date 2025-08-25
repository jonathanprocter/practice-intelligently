
import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ApiClient } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { FileText, Search, Trash2, Edit3, Filter, Calendar, User, Tag, AlertCircle, CheckCircle, Clock } from 'lucide-react';

interface SessionNote {
  id: string;
  title?: string;
  content: string;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  clientId: string;
  clientName?: string;
  appointmentId?: string;
  createdAt: string;
  tags?: string[];
  source?: string;
}

const NotesManagementPage: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedNotes, setSelectedNotes] = useState<string[]>([]);
  const [filterBy, setFilterBy] = useState<'all' | 'progress-notes' | 'session-notes' | 'uploaded'>('all');
  const [sortBy, setSortBy] = useState<'date' | 'client' | 'type'>('date');
  const [selectedClient, setSelectedClient] = useState<string>('all');
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';

  // Fetch all session notes
  const { data: sessionNotes, isLoading } = useQuery({
    queryKey: ['session-notes', therapistId],
    queryFn: () => ApiClient.get(`/api/session-notes/therapist/${therapistId}`),
  });

  // Fetch clients for filtering
  const { data: clients } = useQuery({
    queryKey: ['clients', therapistId],
    queryFn: () => ApiClient.get(`/api/clients/${therapistId}`),
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (noteId: string) => ApiClient.delete(`/api/session-notes/${noteId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      toast({ title: 'Note deleted successfully' });
    },
    onError: () => {
      toast({ title: 'Failed to delete note', variant: 'destructive' });
    },
  });

  // Bulk delete mutation
  const bulkDeleteMutation = useMutation({
    mutationFn: async (noteIds: string[]) => {
      await Promise.all(noteIds.map(id => ApiClient.delete(`/api/session-notes/${id}`)));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['session-notes'] });
      setSelectedNotes([]);
      toast({ title: `Deleted ${selectedNotes.length} notes successfully` });
    },
    onError: () => {
      toast({ title: 'Failed to delete notes', variant: 'destructive' });
    },
  });

  // Filter and sort notes
  const filteredAndSortedNotes = useMemo(() => {
    if (!sessionNotes) return [];

    let filtered = sessionNotes.filter((note: SessionNote) => {
      // Text search
      const searchText = searchQuery.toLowerCase();
      const matchesSearch = !searchText || 
        note.title?.toLowerCase().includes(searchText) ||
        note.content?.toLowerCase().includes(searchText) ||
        note.clientName?.toLowerCase().includes(searchText) ||
        note.tags?.some(tag => tag.toLowerCase().includes(searchText));

      // Filter by type
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'progress-notes' && note.title) ||
        (filterBy === 'session-notes' && !note.title) ||
        (filterBy === 'uploaded' && note.source === 'document_upload');

      // Filter by client
      const matchesClient = selectedClient === 'all' || note.clientId === selectedClient;

      return matchesSearch && matchesFilter && matchesClient;
    });

    // Sort
    filtered.sort((a: SessionNote, b: SessionNote) => {
      if (sortBy === 'date') {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      } else if (sortBy === 'client') {
        return (a.clientName || '').localeCompare(b.clientName || '');
      } else if (sortBy === 'type') {
        const aType = a.title ? 'progress-note' : 'session-note';
        const bType = b.title ? 'progress-note' : 'session-note';
        return aType.localeCompare(bType);
      }
      return 0;
    });

    return filtered;
  }, [sessionNotes, searchQuery, filterBy, sortBy, selectedClient]);

  const handleSelectNote = (noteId: string, checked: boolean) => {
    if (checked) {
      setSelectedNotes(prev => [...prev, noteId]);
    } else {
      setSelectedNotes(prev => prev.filter(id => id !== noteId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedNotes(filteredAndSortedNotes.map((note: SessionNote) => note.id));
    } else {
      setSelectedNotes([]);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getNoteType = (note: SessionNote) => {
    if (note.title) return 'Progress Note';
    if (note.source === 'document_upload') return 'Uploaded Document';
    return 'Session Note';
  };

  const getNoteTypeColor = (note: SessionNote) => {
    if (note.title) return 'bg-blue-100 text-blue-800';
    if (note.source === 'document_upload') return 'bg-purple-100 text-purple-800';
    return 'bg-green-100 text-green-800';
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Notes Management</h1>
          <p className="text-gray-600 mt-1">View, filter, and manage all your session notes and uploaded documents</p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="outline" className="text-lg px-3 py-1">
            {filteredAndSortedNotes.length} notes
          </Badge>
          {selectedNotes.length > 0 && (
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" size="sm">
                  <Trash2 className="w-4 h-4 mr-2" />
                  Delete Selected ({selectedNotes.length})
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete Selected Notes</AlertDialogTitle>
                  <AlertDialogDescription>
                    Are you sure you want to delete {selectedNotes.length} selected notes? This action cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction 
                    onClick={() => bulkDeleteMutation.mutate(selectedNotes)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Delete Notes
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          )}
        </div>
      </div>

      {/* Filters and Search */}
      <Card>
        <CardHeader className="pb-4">
          <CardTitle className="text-lg">Filters & Search</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
              <Input
                placeholder="Search notes, clients, content..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Filter by type */}
            <Select value={filterBy} onValueChange={(value: any) => setFilterBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Notes</SelectItem>
                <SelectItem value="progress-notes">Progress Notes</SelectItem>
                <SelectItem value="session-notes">Session Notes</SelectItem>
                <SelectItem value="uploaded">Uploaded Documents</SelectItem>
              </SelectContent>
            </Select>

            {/* Filter by client */}
            <Select value={selectedClient} onValueChange={setSelectedClient}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by client" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Clients</SelectItem>
                {clients?.map((client: any) => (
                  <SelectItem key={client.id} value={client.id}>
                    {client.firstName} {client.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Sort by */}
            <Select value={sortBy} onValueChange={(value: any) => setSortBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date Created</SelectItem>
                <SelectItem value="client">Client Name</SelectItem>
                <SelectItem value="type">Note Type</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Notes List */}
      <Card>
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-lg">Session Notes</CardTitle>
            <div className="flex items-center gap-2">
              <Checkbox
                checked={selectedNotes.length === filteredAndSortedNotes.length && filteredAndSortedNotes.length > 0}
                onCheckedChange={handleSelectAll}
              />
              <span className="text-sm text-gray-600">Select All</span>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="space-y-1">
            {filteredAndSortedNotes.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <FileText className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p className="text-lg font-medium">No notes found</p>
                <p className="text-sm">Try adjusting your search or filter criteria</p>
              </div>
            ) : (
              filteredAndSortedNotes.map((note: SessionNote) => (
                <div key={note.id} className="flex items-start gap-4 p-4 border-b border-gray-100 hover:bg-gray-50">
                  <Checkbox
                    checked={selectedNotes.includes(note.id)}
                    onCheckedChange={(checked) => handleSelectNote(note.id, checked as boolean)}
                  />
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="font-medium text-gray-900 truncate">
                          {note.title || 'Session Note'}
                        </h3>
                        <div className="flex items-center gap-2 mt-1 text-sm text-gray-600">
                          <User className="w-3 h-3" />
                          <span>{note.clientName}</span>
                          <Clock className="w-3 h-3 ml-2" />
                          <span>{formatDate(note.createdAt)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 ml-4">
                        <Badge className={getNoteTypeColor(note)} variant="secondary">
                          {getNoteType(note)}
                        </Badge>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="ghost" size="sm" className="text-red-600 hover:text-red-700">
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Delete Note</AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete this note? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => deleteMutation.mutate(note.id)}
                                className="bg-red-600 hover:bg-red-700"
                              >
                                Delete
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                    
                    <p className="text-sm text-gray-600 mb-2 line-clamp-2">
                      {note.content.substring(0, 200)}...
                    </p>
                    
                    {note.tags && note.tags.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {note.tags.slice(0, 3).map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            <Tag className="w-2 h-2 mr-1" />
                            {tag}
                          </Badge>
                        ))}
                        {note.tags.length > 3 && (
                          <Badge variant="outline" className="text-xs">
                            +{note.tags.length - 3} more
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total Notes</p>
                <p className="text-2xl font-bold">{sessionNotes?.length || 0}</p>
              </div>
              <FileText className="w-8 h-8 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Progress Notes</p>
                <p className="text-2xl font-bold">
                  {sessionNotes?.filter((note: SessionNote) => note.title).length || 0}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Uploaded Docs</p>
                <p className="text-2xl font-bold">
                  {sessionNotes?.filter((note: SessionNote) => note.source === 'document_upload').length || 0}
                </p>
              </div>
              <AlertCircle className="w-8 h-8 text-purple-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Unique Clients</p>
                <p className="text-2xl font-bold">
                  {new Set(sessionNotes?.map((note: SessionNote) => note.clientId)).size || 0}
                </p>
              </div>
              <User className="w-8 h-8 text-orange-600" />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default NotesManagementPage;
