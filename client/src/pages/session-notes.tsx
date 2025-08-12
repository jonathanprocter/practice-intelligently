import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SessionNoteEntry } from '@/components/SessionNoteEntry';
import { EditSessionNoteTitleModal } from '@/components/EditSessionNoteTitleModal';
import { Calendar, Plus, Search, FileText, Clock, MapPin, Users, Edit2, Eye, MoreVertical } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface SessionNote {
  id: string;
  title: string;
  content: string;
  sessionDate: string;
  meetingType: string;
  location?: string;
  duration?: number;
  participants?: string[];
  manualEntry: boolean;
  followUpRequired: boolean;
  tags?: string[];
  createdAt: string;
}

interface CalendarEvent {
  id: string;
  summary: string;
  start_time: string;
  end_time: string;
  google_event_id: string;
}

export default function SessionNotesPage() {
  const [showNoteEntry, setShowNoteEntry] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [editingNote, setEditingNote] = useState<SessionNote | null>(null);
  const [selectedNote, setSelectedNote] = useState<SessionNote | null>(null);

  // Fetch session notes
  const { data: sessionNotes = [], refetch: refetchNotes } = useQuery({
    queryKey: ['/api/session-notes', 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c'],
    queryFn: async () => {
      const response = await fetch('/api/session-notes/therapist/e66b8b8e-e7a2-40b9-ae74-00c93ffe503c');
      if (!response.ok) throw new Error('Failed to fetch session notes');
      return response.json();
    }
  });

  // Fetch calendar events for linking
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['/api/calendar/events/recent'],
    queryFn: async () => {
      const response = await fetch('/api/calendar/events/recent?days=30');
      if (!response.ok) throw new Error('Failed to fetch calendar events');
      return response.json();
    }
  });

  const filteredNotes = sessionNotes.filter((note: SessionNote) => {
    const matchesSearch = 
      note.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.content?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      note.tags?.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesFilter = filterType === 'all' || note.meetingType === filterType;
    
    return matchesSearch && matchesFilter;
  });

  const handleCreateNote = (event?: CalendarEvent) => {
    setSelectedEvent(event || null);
    setShowNoteEntry(true);
  };

  const handleNoteSaved = () => {
    setShowNoteEntry(false);
    setSelectedEvent(null);
    refetchNotes();
  };

  const handleEditNote = (note: SessionNote) => {
    setEditingNote(note);
  };

  const handleViewNote = (note: SessionNote) => {
    setSelectedNote(note);
  };

  const closeEditModal = () => {
    setEditingNote(null);
  };

  const closeViewModal = () => {
    setSelectedNote(null);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getMeetingTypeColor = (type: string) => {
    const colors = {
      therapy_session: 'bg-blue-100 text-blue-800',
      consultation: 'bg-green-100 text-green-800',
      supervision: 'bg-purple-100 text-purple-800',
      team_meeting: 'bg-orange-100 text-orange-800',
      planning: 'bg-yellow-100 text-yellow-800',
      other: 'bg-gray-100 text-gray-800'
    };
    return colors[type as keyof typeof colors] || colors.other;
  };

  if (showNoteEntry) {
    return (
      <div className="container mx-auto p-4">
        <SessionNoteEntry
          eventId={selectedEvent?.google_event_id}
          eventTitle={selectedEvent?.summary}
          eventDate={selectedEvent?.start_time}
          onSave={handleNoteSaved}
          onCancel={() => setShowNoteEntry(false)}
        />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Session Notes</h1>
        <Button onClick={() => handleCreateNote()} className="flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Session Note
        </Button>
      </div>

      {/* Search and Filter */}
      <div className="flex gap-4 items-center">
        <div className="flex-1 relative">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search notes by title, content, or tags..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filterType}
          onChange={(e) => setFilterType(e.target.value)}
          className="px-3 py-2 border rounded-md"
        >
          <option value="all">All Types</option>
          <option value="therapy_session">Therapy Sessions</option>
          <option value="consultation">Consultations</option>
          <option value="supervision">Supervision</option>
          <option value="team_meeting">Team Meetings</option>
          <option value="planning">Planning</option>
          <option value="other">Other</option>
        </select>
      </div>

      {/* Recent Calendar Events Without Notes */}
      {calendarEvents.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Recent Calendar Events (Add Notes)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-2">
              {calendarEvents.slice(0, 5).map((event: CalendarEvent) => (
                <div key={event.id} className="flex items-center justify-between p-3 border rounded-lg">
                  <div>
                    <h4 className="font-medium">{event.summary}</h4>
                    <p className="text-sm text-gray-600">{formatDate(event.start_time)}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCreateNote(event)}
                  >
                    Add Notes
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Session Notes List */}
      <div className="grid gap-4">
        {filteredNotes.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-8">
              <FileText className="w-12 h-12 text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-600 mb-2">No session notes found</h3>
              <p className="text-gray-500 text-center mb-4">
                {searchTerm ? 'Try adjusting your search terms.' : 'Create your first session note to get started.'}
              </p>
              <Button onClick={() => handleCreateNote()}>
                Create Session Note
              </Button>
            </CardContent>
          </Card>
        ) : (
          filteredNotes.map((note: SessionNote) => (
            <Card 
              key={note.id} 
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleViewNote(note)}
              data-testid={`card-session-note-${note.id}`}
            >
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-lg">{note.title || 'Untitled Session'}</CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(note.sessionDate || note.createdAt)}
                      </div>
                      {note.location && (
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3 h-3" />
                          {note.location}
                        </div>
                      )}
                      {note.duration && (
                        <div className="flex items-center gap-1">
                          <Clock className="w-3 h-3" />
                          {note.duration} min
                        </div>
                      )}
                      {note.participants && note.participants.length > 0 && (
                        <div className="flex items-center gap-1">
                          <Users className="w-3 h-3" />
                          {note.participants.length} participants
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getMeetingTypeColor(note.meetingType)}>
                      {note.meetingType?.replace('_', ' ') || 'Session'}
                    </Badge>
                    {note.manualEntry && (
                      <Badge variant="outline">Manual</Badge>
                    )}
                    {note.followUpRequired && (
                      <Badge variant="destructive">Follow-up</Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" data-testid={`button-actions-${note.id}`}>
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem 
                          onClick={() => handleViewNote(note)}
                          data-testid={`menu-view-${note.id}`}
                        >
                          <Eye className="w-4 h-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem 
                          onClick={() => handleEditNote(note)}
                          data-testid={`menu-edit-${note.id}`}
                        >
                          <Edit2 className="w-4 h-4 mr-2" />
                          Edit Title
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <p className="text-gray-700 line-clamp-3">
                    {note.content || 'No content available.'}
                  </p>
                  
                  {note.tags && note.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {note.tags.map((tag, index) => (
                        <Badge key={index} variant="secondary" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>

      {/* Edit Title Modal */}
      <EditSessionNoteTitleModal
        isOpen={!!editingNote}
        onClose={closeEditModal}
        note={editingNote}
        onTitleUpdated={() => {
          refetchNotes();
          closeEditModal();
        }}
      />

      {/* View Note Modal */}
      {selectedNote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="bg-white rounded-lg max-w-4xl max-h-[80vh] overflow-auto p-6 m-4 w-full">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h2 className="text-2xl font-bold mb-2" data-testid="view-note-title">
                  {selectedNote.title || 'Untitled Session'}
                </h2>
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <Calendar className="w-3 h-3" />
                    {formatDate(selectedNote.sessionDate || selectedNote.createdAt)}
                  </div>
                  {selectedNote.location && (
                    <div className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {selectedNote.location}
                    </div>
                  )}
                  {selectedNote.duration && (
                    <div className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {selectedNote.duration} min
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => handleEditNote(selectedNote)}
                  data-testid="button-edit-from-view"
                >
                  <Edit2 className="w-4 h-4 mr-2" />
                  Edit Title
                </Button>
                <Button variant="outline" onClick={closeViewModal} data-testid="button-close-view">
                  ✕
                </Button>
              </div>
            </div>
            
            <div className="space-y-4">
              <div className="flex gap-2 mb-4">
                <Badge className={getMeetingTypeColor(selectedNote.meetingType)}>
                  {selectedNote.meetingType?.replace('_', ' ') || 'Session'}
                </Badge>
                {selectedNote.manualEntry && (
                  <Badge variant="outline">Manual</Badge>
                )}
                {selectedNote.followUpRequired && (
                  <Badge variant="destructive">Follow-up</Badge>
                )}
              </div>
              
              <div className="prose max-w-none">
                <div 
                  className="whitespace-pre-wrap text-gray-800 leading-relaxed"
                  data-testid="view-note-content"
                >
                  {selectedNote.content || 'No content available.'}
                </div>
              </div>
              
              {selectedNote.tags && selectedNote.tags.length > 0 && (
                <div className="border-t pt-4">
                  <h4 className="font-medium mb-2">Tags</h4>
                  <div className="flex flex-wrap gap-1">
                    {selectedNote.tags.map((tag, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}