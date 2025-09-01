import React, { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Calendar, 
  FileText, 
  Clock, 
  User, 
  Tag, 
  AlertCircle,
  CheckCircle,
  XCircle,
  Link,
  Plus,
  Filter,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { format, parseISO, isWithinInterval, startOfMonth, endOfMonth } from 'date-fns';

interface TimelineItem {
  id: string;
  type: 'appointment' | 'session_note' | 'document' | 'chart_note';
  date: string;
  title: string;
  content?: string;
  clientId: string;
  clientName: string;
  appointmentId?: string;
  googleEventId?: string;
  tags?: string[];
  status?: 'completed' | 'scheduled' | 'cancelled' | 'no_show' | 'unlinked';
  source?: 'manual' | 'google_calendar' | 'document_upload' | 'auto_generated';
  metadata?: {
    duration?: number;
    location?: string;
    therapist?: string;
    documentType?: string;
    reconciliationStatus?: 'matched' | 'pending' | 'unmatched';
  };
}

interface ClinicalTimelineProps {
  clientId?: string;
  therapistId: string;
  dateRange?: {
    start: Date;
    end: Date;
  };
}

export const ClinicalTimeline: React.FC<ClinicalTimelineProps> = ({
  clientId,
  therapistId,
  dateRange
}) => {
  const [selectedMonth, setSelectedMonth] = useState(new Date());
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());
  const [filterType, setFilterType] = useState<'all' | 'appointments' | 'notes' | 'documents'>('all');
  const [showUnlinked, setShowUnlinked] = useState(true);

  // Fetch all session notes
  const { data: sessionNotes = [] } = useQuery({
    queryKey: ['session-notes', therapistId, clientId],
    queryFn: async () => {
      const url = clientId 
        ? `/api/session-notes/client/${clientId}`
        : `/api/session-notes/therapist/${therapistId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch session notes');
      return response.json();
    }
  });

  // Fetch all appointments
  const { data: appointments = [] } = useQuery({
    queryKey: ['appointments', therapistId, clientId],
    queryFn: async () => {
      const url = clientId
        ? `/api/appointments/client/${clientId}`
        : `/api/appointments/${therapistId}`;
      const response = await fetch(url);
      if (!response.ok) throw new Error('Failed to fetch appointments');
      return response.json();
    }
  });

  // Fetch documents
  const { data: documents = [] } = useQuery({
    queryKey: ['documents', therapistId, clientId],
    queryFn: async () => {
      const url = `/api/documents/${therapistId}${clientId ? `?clientId=${clientId}` : ''}`;
      const response = await fetch(url);
      if (!response.ok) return []; // Documents endpoint might not exist yet
      return response.json();
    }
  });

  // Fetch Google Calendar events for reconciliation
  const { data: calendarEvents = [] } = useQuery({
    queryKey: ['calendar-events', therapistId, selectedMonth],
    queryFn: async () => {
      const start = startOfMonth(selectedMonth);
      const end = endOfMonth(selectedMonth);
      const response = await fetch(
        `/api/calendar/events/${therapistId}?timeMin=${start.toISOString()}&timeMax=${end.toISOString()}`
      );
      if (!response.ok) return [];
      return response.json();
    }
  });

  // Process all items into timeline format
  const timelineItems = useMemo(() => {
    const items: TimelineItem[] = [];

    // Process appointments
    appointments.forEach((apt: any) => {
      items.push({
        id: apt.id,
        type: 'appointment',
        date: apt.startTime,
        title: `Appointment: ${apt.clientName || 'Unknown Client'}`,
        clientId: apt.clientId,
        clientName: apt.clientName || 'Unknown',
        appointmentId: apt.id,
        googleEventId: apt.googleEventId,
        status: apt.status,
        source: apt.googleEventId ? 'google_calendar' : 'manual',
        metadata: {
          duration: apt.duration,
          location: apt.location,
          therapist: apt.therapistName,
          reconciliationStatus: apt.googleEventId ? 'matched' : 'unmatched'
        }
      });
    });

    // Process session notes
    sessionNotes.forEach((note: any) => {
      const isChartNote = !note.appointmentId && !note.googleEventId;
      items.push({
        id: note.id,
        type: isChartNote ? 'chart_note' : 'session_note',
        date: note.sessionDate || note.createdAt,
        title: note.title || `${isChartNote ? 'Chart Note' : 'Session Note'}: ${note.clientName || 'Unknown Client'}`,
        content: note.content,
        clientId: note.clientId,
        clientName: note.clientName || 'Unknown',
        appointmentId: note.appointmentId,
        googleEventId: note.eventId,
        tags: note.tags || note.aiTags,
        status: note.appointmentId ? 'completed' : 'unlinked',
        source: note.source || 'manual',
        metadata: {
          documentType: 'progress_note',
          reconciliationStatus: note.appointmentId ? 'matched' : 'pending'
        }
      });
    });

    // Process uploaded documents as potential chart notes
    documents.forEach((doc: any) => {
      if (!doc.linkedToNote) {
        items.push({
          id: doc.id,
          type: 'document',
          date: doc.uploadDate || doc.createdAt,
          title: `Document: ${doc.fileName || doc.title}`,
          content: doc.extractedText,
          clientId: doc.clientId,
          clientName: doc.clientName || 'Unknown',
          tags: doc.tags,
          status: 'unlinked',
          source: 'document_upload',
          metadata: {
            documentType: doc.documentType || 'unspecified',
            reconciliationStatus: 'pending'
          }
        });
      }
    });

    // Add unmatched calendar events as pending items
    calendarEvents.forEach((event: any) => {
      const hasMatch = items.some(item => 
        item.googleEventId === event.id || 
        (item.type === 'appointment' && item.metadata?.reconciliationStatus === 'matched')
      );

      if (!hasMatch && event.summary && !event.summary.includes('Blocked')) {
        items.push({
          id: `cal-${event.id}`,
          type: 'appointment',
          date: event.start?.dateTime || event.start?.date,
          title: `Calendar Event: ${event.summary}`,
          clientId: '',
          clientName: extractClientNameFromEvent(event.summary),
          googleEventId: event.id,
          status: 'scheduled',
          source: 'google_calendar',
          metadata: {
            location: event.location,
            reconciliationStatus: 'unmatched'
          }
        });
      }
    });

    // Sort by date (most recent first)
    return items.sort((a, b) => 
      new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [appointments, sessionNotes, documents, calendarEvents]);

  // Filter items based on selected filters
  const filteredItems = useMemo(() => {
    let filtered = timelineItems;

    // Filter by type
    if (filterType !== 'all') {
      const typeMap = {
        appointments: 'appointment',
        notes: ['session_note', 'chart_note'],
        documents: 'document'
      };
      const allowedTypes = typeMap[filterType as keyof typeof typeMap];
      filtered = filtered.filter(item => 
        Array.isArray(allowedTypes) 
          ? allowedTypes.includes(item.type)
          : item.type === allowedTypes
      );
    }

    // Filter by unlinked status
    if (!showUnlinked) {
      filtered = filtered.filter(item => item.status !== 'unlinked');
    }

    // Filter by date range
    if (dateRange) {
      filtered = filtered.filter(item => {
        const itemDate = parseISO(item.date);
        return isWithinInterval(itemDate, { 
          start: dateRange.start, 
          end: dateRange.end 
        });
      });
    }

    return filtered;
  }, [timelineItems, filterType, showUnlinked, dateRange]);

  // Group items by date
  const groupedItems = useMemo(() => {
    const groups: Record<string, TimelineItem[]> = {};
    
    filteredItems.forEach(item => {
      const date = format(parseISO(item.date), 'yyyy-MM-dd');
      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(item);
    });

    return Object.entries(groups).sort(([a], [b]) => b.localeCompare(a));
  }, [filteredItems]);

  const toggleItemExpansion = (itemId: string) => {
    const newExpanded = new Set(expandedItems);
    if (newExpanded.has(itemId)) {
      newExpanded.delete(itemId);
    } else {
      newExpanded.add(itemId);
    }
    setExpandedItems(newExpanded);
  };

  const getStatusBadge = (item: TimelineItem) => {
    const statusConfig = {
      completed: { icon: CheckCircle, color: 'bg-green-100 text-green-800' },
      scheduled: { icon: Clock, color: 'bg-blue-100 text-blue-800' },
      cancelled: { icon: XCircle, color: 'bg-red-100 text-red-800' },
      no_show: { icon: AlertCircle, color: 'bg-orange-100 text-orange-800' },
      unlinked: { icon: Link, color: 'bg-gray-100 text-gray-800' }
    };

    const config = statusConfig[item.status || 'unlinked'];
    const Icon = config.icon;

    return (
      <Badge className={config.color}>
        <Icon className="w-3 h-3 mr-1" />
        {item.status || 'unlinked'}
      </Badge>
    );
  };

  const getTypeIcon = (type: TimelineItem['type']) => {
    switch (type) {
      case 'appointment':
        return Calendar;
      case 'session_note':
        return FileText;
      case 'chart_note':
        return FileText;
      case 'document':
        return FileText;
      default:
        return FileText;
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Clinical Timeline</span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUnlinked(!showUnlinked)}
            >
              {showUnlinked ? 'Hide' : 'Show'} Unlinked Items
            </Button>
            <Button variant="default" size="sm">
              <Plus className="w-4 h-4 mr-1" />
              Add Progress Note
            </Button>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="all" onValueChange={(v) => setFilterType(v as any)}>
          <TabsList className="mb-4">
            <TabsTrigger value="all">All Items</TabsTrigger>
            <TabsTrigger value="appointments">Appointments</TabsTrigger>
            <TabsTrigger value="notes">Progress Notes</TabsTrigger>
            <TabsTrigger value="documents">Documents</TabsTrigger>
          </TabsList>

          <ScrollArea className="h-[600px] pr-4">
            {groupedItems.map(([date, items]) => (
              <div key={date} className="mb-6">
                <h3 className="text-sm font-semibold text-gray-600 mb-3">
                  {format(parseISO(date), 'EEEE, MMMM d, yyyy')}
                </h3>
                <div className="space-y-3">
                  {items.map(item => {
                    const Icon = getTypeIcon(item.type);
                    const isExpanded = expandedItems.has(item.id);

                    return (
                      <div
                        key={item.id}
                        className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-2">
                              <Icon className="w-4 h-4 text-gray-600" />
                              <span className="font-medium">{item.title}</span>
                              {item.metadata?.reconciliationStatus === 'unmatched' && (
                                <Badge variant="outline" className="text-xs">
                                  Needs Reconciliation
                                </Badge>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <User className="w-3 h-3" />
                              <span>{item.clientName}</span>
                              <span className="mx-2">•</span>
                              <Clock className="w-3 h-3" />
                              <span>{format(parseISO(item.date), 'h:mm a')}</span>
                              {item.metadata?.location && (
                                <>
                                  <span className="mx-2">•</span>
                                  <span>{item.metadata.location}</span>
                                </>
                              )}
                            </div>

                            {item.tags && item.tags.length > 0 && (
                              <div className="flex gap-1 mt-2">
                                {item.tags.map(tag => (
                                  <Badge key={tag} variant="secondary" className="text-xs">
                                    <Tag className="w-3 h-3 mr-1" />
                                    {tag}
                                  </Badge>
                                ))}
                              </div>
                            )}

                            {item.content && (
                              <div className="mt-3">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => toggleItemExpansion(item.id)}
                                  className="p-0 h-auto font-normal"
                                >
                                  {isExpanded ? (
                                    <ChevronDown className="w-4 h-4 mr-1" />
                                  ) : (
                                    <ChevronRight className="w-4 h-4 mr-1" />
                                  )}
                                  {isExpanded ? 'Hide' : 'Show'} Content
                                </Button>
                                {isExpanded && (
                                  <div className="mt-2 p-3 bg-gray-50 rounded text-sm">
                                    {item.content.substring(0, 500)}
                                    {item.content.length > 500 && '...'}
                                  </div>
                                )}
                              </div>
                            )}
                          </div>

                          <div className="ml-4">
                            {getStatusBadge(item)}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            {groupedItems.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No timeline items found for the selected filters.
              </div>
            )}
          </ScrollArea>
        </Tabs>
      </CardContent>
    </Card>
  );
};

// Helper function to extract client name from calendar event
function extractClientNameFromEvent(summary: string): string {
  // Remove common prefixes and suffixes
  const patterns = [
    /^🔒\s*(.+?)\s+(Appointment|Session|Therapy|Meeting)$/i,
    /^(.+?)\s+(Appointment|Session|Therapy|Meeting)$/i,
    /^(?:Appointment|Session|Therapy|Meeting)\s+with\s+(.+)$/i,
  ];

  for (const pattern of patterns) {
    const match = summary.match(pattern);
    if (match && match[1]) {
      return match[1].trim();
    }
  }

  return summary;
}

export default ClinicalTimeline;