import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { SessionNoteEntry } from '@/components/SessionNoteEntry';
import { Calendar, Plus, Search, FileText, Clock, MapPin, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';

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
            <Card key={note.id} className="hover:shadow-md transition-shadow">
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
    </div>
  );
}