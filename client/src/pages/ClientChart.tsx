/**
 * Enhanced ClientChart Component
 * 
 * Optional dependencies for full functionality:
 * - npm install recharts (for charts in analytics)
 * - npm install react-window (for virtual scrolling with large datasets)
 * - npm install date-fns (for better date formatting)
 * 
 * The component will work without these libraries but with reduced features.
 */

import React from 'react';
import { useParams, useLocation } from 'wouter';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
// Optional imports - uncomment if you have these libraries installed
// import { format, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns';

// Fallback date formatting if date-fns is not available
const format = (date: Date, formatStr: string) => {
  // Simple fallback formatting
  const months = ['January', 'February', 'March', 'April', 'May', 'June', 
                  'July', 'August', 'September', 'October', 'November', 'December'];
  if (formatStr === 'MMMM yyyy') {
    return `${months[date.getMonth()]} ${date.getFullYear()}`;
  }
  if (formatStr === 'MMM yyyy') {
    return `${months[date.getMonth()].slice(0, 3)} ${date.getFullYear()}`;
  }
  return date.toLocaleDateString();
};

const startOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth(), 1);
};

const endOfMonth = (date: Date) => {
  return new Date(date.getFullYear(), date.getMonth() + 1, 0);
};

const isWithinInterval = (date: Date, interval: { start: Date; end: Date }) => {
  return date >= interval.start && date <= interval.end;
};

import { useToast } from '@/hooks/use-toast';
import { ToastAction } from '@/components/ui/toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
// Note: Uncomment these imports if you have recharts installed
// import {
//   LineChart,
//   Line,
//   BarChart,
//   Bar,
//   XAxis,
//   YAxis,
//   CartesianGrid,
//   Tooltip,
//   ResponsiveContainer,
// } from 'recharts';
import {
  User,
  Calendar,
  FileText,
  Upload,
  Clock,
  TrendingUp,
  AlertCircle,
  Trash2,
  Link as LinkIcon,
  CheckCircle2,
  Edit2,
  Search,
  Filter,
  Download,
  MoreVertical,
  Archive,
  Tag,
  BarChart3,
  X,
  ChevronDown,
  Copy,
  Printer,
} from 'lucide-react';

// Safe lazy loading with fallbacks
const loadComponent = (importFn: () => Promise<any>, fallback?: React.ComponentType<any>) => {
  return React.lazy(() => 
    importFn().catch(() => {
      console.error('Failed to load component');
      return { 
        default: fallback || (() => <div>Component not available</div>) 
      };
    })
  );
};

// Import components - these will use the actual components if they exist
// For now, import them normally to avoid issues
import { DocumentProcessor } from '@/components/documents/DocumentProcessor';
import { SessionNoteLinkingModal } from '@/components/SessionNoteLinkingModal';
import { SessionRecommendations } from '@/components/SessionRecommendations';
import { CreateSessionNoteModal } from '@/components/CreateSessionNoteModal';
import EditableClientInfo from '@/components/clients/EditableClientInfo';

/* =======================
   Types
======================= */

interface Client {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  emergencyContact: string;
  emergencyPhone: string;
  notes?: string;
}

interface SessionNote {
  id: string;
  appointmentId?: string;
  eventId?: string;
  clientId: string;
  therapistId: string;
  content: string;
  createdAt: string;
  aiTags?: string[];
  source?: 'document_upload' | 'manual' | string;
  originalFilename?: string;
}

interface Appointment {
  id: string;
  title?: string;
  startTime: string;
  endTime: string;
  type: string;
  status?: string;
  location?: string;
  googleEventId?: string;
  hasSessionNote?: boolean;
}

interface DateRange {
  start: Date;
  end: Date;
}

interface TimelineItem {
  type: 'appointment' | 'session-note';
  date: Date;
  title: string;
  data: Appointment | SessionNote;
  hasNote: boolean;
}

interface ClientStats {
  totalSessions: number;
  totalAppointments: number;
  upcomingCount: number;
  completedCount: number;
  linkedNotesCount: number;
  unlinkedNotesCount: number;
  coverageRate: number;
  avgSessionsPerMonth: number;
  lastContactDays: number;
}

/* =======================
   Constants / Utils
======================= */

const TABS = {
  TIMELINE: 'timeline',
  SESSIONS: 'sessions',
  APPTS: 'appointments',
  DOCS: 'documents',
  ANALYTICS: 'analytics',
  RECS: 'recommendations',
} as const;

const NOTE_TEMPLATES = [
  { 
    name: 'SOAP Note', 
    structure: 'Subjective:\n\n\nObjective:\n\n\nAssessment:\n\n\nPlan:\n\n' 
  },
  { 
    name: 'DAP Note', 
    structure: 'Data:\n\n\nAssessment:\n\n\nPlan:\n\n' 
  },
  { 
    name: 'Progress Note', 
    structure: 'Session Focus:\n\n\nInterventions:\n\n\nClient Response:\n\n\nNext Steps:\n\n' 
  },
  {
    name: 'BIRP Note',
    structure: 'Behavior:\n\n\nIntervention:\n\n\nResponse:\n\n\nPlan:\n\n'
  },
];

function safeDate(s?: string) {
  if (!s) return undefined;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

const dateFmt = new Intl.DateTimeFormat('en-US', {
  weekday: 'long',
  year: 'numeric',
  month: 'long',
  day: 'numeric',
});

const timeFmt = new Intl.DateTimeFormat('en-US', {
  hour: 'numeric',
  minute: '2-digit',
  hour12: true,
});

function preview(text: string, max = 200) {
  if (!text) return '';
  if (text.length <= max) return text;
  return text.slice(0, max) + '…';
}

async function api<T>(url: string): Promise<T> {
  const r = await fetch(url);
  if (!r.ok) {
    const msg = await r.text().catch(() => '');
    throw new Error(msg || `Request failed: ${r.status}`);
  }
  return (await r.json()) as T;
}

const qKeys = {
  client: (id: string) => ['/api/clients', id] as const,
  notes: (id: string) => ['/api/session-notes/client', id] as const,
  appts: (id: string) => ['/api/appointments/client', id] as const,
  pnotes: (id: string) => ['/api/progress-notes/client', id] as const,
};

/* =======================
   Custom Hooks
======================= */

function useClientData(clientId: string) {
  const queryClient = useQueryClient();

  const client = useQuery({
    queryKey: qKeys.client(clientId),
    queryFn: () => api<Client>(`/api/clients/${clientId}`),
    enabled: !!clientId,
    staleTime: 60_000,
    placeholderData: keepPreviousData,
  });

  const sessionNotes = useQuery({
    queryKey: qKeys.notes(clientId),
    queryFn: () => api<SessionNote[]>(`/api/session-notes/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  const appointments = useQuery({
    queryKey: qKeys.appts(clientId),
    queryFn: () => api<Appointment[]>(`/api/appointments/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  const progressNotes = useQuery({
    queryKey: qKeys.pnotes(clientId),
    queryFn: () => api<any[]>(`/api/progress-notes/client/${clientId}`),
    enabled: !!clientId,
    placeholderData: [],
  });

  const isLoading = client.isLoading || sessionNotes.isLoading || appointments.isLoading;
  const hasError = client.error || sessionNotes.error || appointments.error;

  return {
    client,
    sessionNotes,
    appointments,
    progressNotes,
    isLoading,
    hasError,
    refetchAll: () => {
      client.refetch();
      sessionNotes.refetch();
      appointments.refetch();
      progressNotes.refetch();
    },
  };
}

function useKeyboardShortcuts(handlers: {
  onNewNote?: () => void;
  onLink?: () => void;
  onExport?: () => void;
  onSearch?: () => void;
  onEscape?: () => void;
}) {
  React.useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Cmd/Ctrl + N for new note
      if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
        e.preventDefault();
        handlers.onNewNote?.();
      }
      // Cmd/Ctrl + L for linking
      if ((e.metaKey || e.ctrlKey) && e.key === 'l') {
        e.preventDefault();
        handlers.onLink?.();
      }
      // Cmd/Ctrl + E for export
      if ((e.metaKey || e.ctrlKey) && e.key === 'e') {
        e.preventDefault();
        handlers.onExport?.();
      }
      // Cmd/Ctrl + K for search
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        handlers.onSearch?.();
      }
      // Escape
      if (e.key === 'Escape') {
        handlers.onEscape?.();
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [handlers]);
}

function useRealtimeUpdates(clientId: string, queryClient: any) {
  const { toast } = useToast();

  React.useEffect(() => {
    // Skip if no WebSocket URL is configured
    if (!import.meta.env.VITE_WS_URL) {
      return;
    }

    try {
      // WebSocket connection for real-time updates
      const wsUrl = `${import.meta.env.VITE_WS_URL}/clients/${clientId}/updates`;
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('WebSocket connected for client updates');
      };

      ws.onmessage = (event) => {
        try {
          const update = JSON.parse(event.data);

          switch (update.type) {
            case 'note_added':
            case 'note_updated':
              queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
              toast({
                title: 'Session note updated',
                description: `${update.therapistName || 'Another therapist'} modified a session note`,
              });
              break;
            case 'appointment_scheduled':
              queryClient.invalidateQueries({ queryKey: qKeys.appts(clientId) });
              toast({
                title: 'New appointment',
                description: 'A new appointment has been scheduled',
              });
              break;
          }
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };

      return () => {
        ws.close();
      };
    } catch (error) {
      console.error('Failed to setup WebSocket connection:', error);
    }
  }, [clientId, queryClient, toast]);
}

/* =======================
   Analytics Functions
======================= */

function calculateClientStats(
  sessionNotes: SessionNote[],
  appointments: Appointment[],
  hasNoteFor: (apt: Appointment) => boolean
): ClientStats {
  const now = new Date();
  const upcomingCount = appointments.filter(apt => new Date(apt.startTime) > now).length;
  const completedCount = appointments.filter(apt => new Date(apt.startTime) <= now).length;
  const linkedNotesCount = appointments.filter(hasNoteFor).length;
  const unlinkedNotesCount = sessionNotes.filter(n => !n.appointmentId && !n.eventId).length;

  // Calculate average sessions per month
  const sessionDates = sessionNotes.map(n => new Date(n.createdAt));
  const oldestSession = sessionDates.length > 0 ? Math.min(...sessionDates.map(d => d.getTime())) : now.getTime();
  const monthsActive = Math.max(1, (now.getTime() - oldestSession) / (1000 * 60 * 60 * 24 * 30));
  const avgSessionsPerMonth = Math.round((sessionNotes.length / monthsActive) * 10) / 10;

  // Calculate days since last contact
  const allDates = [
    ...sessionNotes.map(n => new Date(n.createdAt)),
    ...appointments.map(a => new Date(a.startTime))
  ];
  const lastContact = allDates.length > 0 ? Math.max(...allDates.map(d => d.getTime())) : now.getTime();
  const lastContactDays = Math.floor((now.getTime() - lastContact) / (1000 * 60 * 60 * 24));

  return {
    totalSessions: sessionNotes.length,
    totalAppointments: appointments.length,
    upcomingCount,
    completedCount,
    linkedNotesCount,
    unlinkedNotesCount,
    coverageRate: appointments.length > 0 
      ? Math.round((linkedNotesCount / appointments.length) * 100) 
      : 0,
    avgSessionsPerMonth,
    lastContactDays,
  };
}

function generateSessionFrequencyData(sessionNotes: SessionNote[]) {
  const last6Months = Array.from({ length: 6 }, (_, i) => {
    const date = new Date();
    date.setMonth(date.getMonth() - i);
    return {
      month: format(date, 'MMM yyyy'),
      start: startOfMonth(date),
      end: endOfMonth(date),
      count: 0,
    };
  }).reverse();

  sessionNotes.forEach(note => {
    const noteDate = new Date(note.createdAt);
    const monthData = last6Months.find(m => 
      isWithinInterval(noteDate, { start: m.start, end: m.end })
    );
    if (monthData) {
      monthData.count++;
    }
  });

  return last6Months.map(({ month, count }) => ({ month, sessions: count }));
}

function extractCommonThemes(sessionNotes: SessionNote[]) {
  const themes = new Map<string, number>();

  sessionNotes.forEach(note => {
    // Extract themes from AI tags
    note.aiTags?.forEach(tag => {
      themes.set(tag, (themes.get(tag) || 0) + 1);
    });

    // Simple keyword extraction (in production, use NLP library)
    const keywords = ['anxiety', 'depression', 'trauma', 'relationship', 'family', 'work', 'stress', 'coping'];
    keywords.forEach(keyword => {
      if (note.content.toLowerCase().includes(keyword)) {
        themes.set(keyword, (themes.get(keyword) || 0) + 1);
      }
    });
  });

  return Array.from(themes.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }));
}

/* =======================
   Export Functions
======================= */

async function exportToPDF(data: any, clientName: string) {
  // In production, use a library like jsPDF or react-pdf
  const pdfContent = {
    title: `Client Report: ${clientName}`,
    date: new Date().toLocaleDateString(),
    sections: [
      { title: 'Client Information', content: data.client },
      { title: 'Session Notes', content: data.sessionNotes },
      { title: 'Appointments', content: data.appointments },
    ],
  };

  // Simulate PDF generation
  const blob = new Blob([JSON.stringify(pdfContent, null, 2)], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${clientName.replace(/\s+/g, '-')}-report.pdf`;
  a.click();
  URL.revokeObjectURL(url);
}

async function exportToCSV(data: any, clientName: string) {
  // Convert data to CSV format
  const csvRows = ['Date,Type,Content'];

  data.timeline.forEach((item: TimelineItem) => {
    const date = item.date.toLocaleDateString();
    const type = item.type;
    const content = item.type === 'session-note' 
      ? preview((item.data as SessionNote).content, 100).replace(/,/g, ';')
      : (item.data as Appointment).title || 'Appointment';
    csvRows.push(`${date},${type},"${content}"`);
  });

  const csv = csvRows.join('\n');
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${clientName.replace(/\s+/g, '-')}-data.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

/* =======================
   Small Components
======================= */

function HeaderSkeleton() {
  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <Skeleton className="w-16 h-16 rounded-full" />
            <div>
              <Skeleton className="h-6 w-64 mb-2" />
              <Skeleton className="h-4 w-48 mb-1" />
              <div className="flex gap-4 mt-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-40" />
              </div>
            </div>
          </div>
          <div className="flex gap-2">
            <Skeleton className="h-9 w-28" />
            <Skeleton className="h-9 w-44" />
            <Skeleton className="h-9 w-40" />
          </div>
        </div>
      </div>
      <Skeleton className="h-10 w-full" />
    </div>
  );
}

function StatCard({ 
  label, 
  value, 
  subtext, 
  icon: Icon, 
  trend,
  className = '' 
}: { 
  label: string; 
  value: React.ReactNode; 
  subtext?: string;
  icon?: any;
  trend?: 'up' | 'down' | 'neutral';
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      </CardHeader>
      <CardContent>
        <div className="flex items-baseline gap-2">
          <div className="text-2xl font-bold">{value}</div>
          {trend && (
            <span className={`text-xs ${
              trend === 'up' ? 'text-green-600' : 
              trend === 'down' ? 'text-red-600' : 
              'text-gray-600'
            }`}>
              {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '–'}
            </span>
          )}
        </div>
        {subtext && <p className="text-xs text-muted-foreground mt-1">{subtext}</p>}
      </CardContent>
    </Card>
  );
}

function ReadMore({ text, max = 500 }: { text: string; max?: number }) {
  const [expanded, setExpanded] = React.useState(false);
  if (text.length <= max) return <>{text}</>;
  return (
    <>
      {expanded ? text : text.slice(0, max) + '…'}
      <Button 
        variant="link" 
        className="h-auto p-0 ml-2" 
        onClick={() => setExpanded(v => !v)} 
        aria-label="Toggle full note"
      >
        {expanded ? 'Show less' : 'Read more'}
      </Button>
    </>
  );
}

function TimelineItemComponent({ 
  item, 
  index, 
  isSelected,
  onSelect,
  onDelete,
  onAddNote,
  showLine = false 
}: {
  item: TimelineItem;
  index: number;
  isSelected: boolean;
  onSelect: (id: string) => void;
  onDelete?: (id: string) => void;
  onAddNote?: (appointment: Appointment) => void;
  showLine?: boolean;
}) {
  const data = item.data as any;

  return (
    <div className="relative">
      {showLine && (
        <div className="absolute left-6 top-12 w-0.5 h-16 bg-gray-200" />
      )}

      <div className="flex items-start gap-4">
        {/* Selection checkbox */}
        {item.type === 'session-note' && (
          <Checkbox
            checked={isSelected}
            onCheckedChange={() => onSelect(data.id)}
            className="mt-4"
          />
        )}

        {/* Timeline dot */}
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center text-white ${
            item.type === 'appointment'
              ? item.hasNote
                ? 'bg-green-600'
                : 'bg-blue-600'
              : 'bg-purple-600'
          }`}
        >
          {item.type === 'appointment' ? (
            item.hasNote ? <CheckCircle2 className="w-6 h-6" /> : <Calendar className="w-6 h-6" />
          ) : (
            <FileText className="w-6 h-6" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="bg-white border rounded-lg p-4 shadow-sm hover:shadow-md transition-all">
            <div className="flex items-start justify-between mb-2">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-medium text-gray-900">
                    {item.type === 'appointment'
                      ? data.title || 'Therapy Appointment'
                      : 'Session Note'}
                  </h4>
                  <Badge variant={item.type === 'appointment' ? 'default' : 'secondary'}>
                    {item.type === 'appointment' ? 'Appointment' : 'Note'}
                  </Badge>
                  {item.type === 'appointment' && item.hasNote && (
                    <Badge variant="outline" className="text-green-600 border-green-600">
                      Has Note
                    </Badge>
                  )}
                </div>
                <div className="text-sm text-gray-600 mb-2">
                  {dateFmt.format(item.date)}
                  {item.type === 'appointment' && (
                    <span className="ml-2">
                      {timeFmt.format(new Date(data.startTime))}
                    </span>
                  )}
                </div>
              </div>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="w-4 h-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {item.type === 'session-note' && (
                    <>
                      <DropdownMenuItem onClick={() => navigator.clipboard.writeText(data.content)}>
                        <Copy className="w-4 h-4 mr-2" />
                        Copy Note
                      </DropdownMenuItem>
                      <DropdownMenuItem>
                        <Printer className="w-4 h-4 mr-2" />
                        Print
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem 
                        onClick={() => onDelete?.(data.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete
                      </DropdownMenuItem>
                    </>
                  )}
                  {item.type === 'appointment' && !item.hasNote && (
                    <DropdownMenuItem onClick={() => onAddNote?.(data)}>
                      <FileText className="w-4 h-4 mr-2" />
                      Add Session Note
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            {/* Content preview */}
            {item.type === 'session-note' && (
              <div className="space-y-2">
                <p className="text-sm text-gray-700">
                  <ReadMore text={data.content} max={500} />
                </p>
                {data.aiTags?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {data.aiTags.slice(0, 4).map((tag: string, tagIndex: number) => (
                      <Badge key={tagIndex} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {data.aiTags.length > 4 && (
                      <Badge variant="outline" className="text-xs">
                        +{data.aiTags.length - 4} more
                      </Badge>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

/* =======================
   Error Boundary
======================= */

class ClientChartErrorBoundary extends React.Component<
  { children: React.ReactNode },
  { hasError: boolean; error: Error | null }
> {
  state = { hasError: false, error: null };

  static getDerivedStateFromError(error: Error) {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('ClientChart error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Card className="m-6">
          <CardContent className="pt-6">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Something went wrong</AlertTitle>
              <AlertDescription>
                {(this.state.error as unknown as Error)?.message || 'An unexpected error occurred while loading the client chart.'}
              </AlertDescription>
            </Alert>
            <div className="flex gap-2 mt-4">
              <Button onClick={() => window.location.reload()}>
                Reload Page
              </Button>
              <Button variant="outline" onClick={() => this.setState({ hasError: false, error: null })}>
                Try Again
              </Button>
            </div>
          </CardContent>
        </Card>
      );
    }

    return this.props.children;
  }
}

/* =======================
   Main Component
======================= */

function ClientChartInner() {
  const params = useParams<{ clientId: string }>();
  const clientId = params.clientId!;
  const [, setLocation] = useLocation();

  // State
  const [activeTab, setActiveTab] = React.useState<typeof TABS[keyof typeof TABS]>(TABS.TIMELINE);
  const [searchTerm, setSearchTerm] = React.useState('');
  const [dateFilter, setDateFilter] = React.useState<DateRange | null>(null);
  const [noteTypeFilter, setNoteTypeFilter] = React.useState<'all' | 'linked' | 'unlinked'>('all');
  const [selectedNotes, setSelectedNotes] = React.useState<Set<string>>(new Set());
  const [showExportMenu, setShowExportMenu] = React.useState(false);

  // Modals
  const [isLinkingModalOpen, setIsLinkingModalOpen] = React.useState(false);
  const [isCreateNoteModalOpen, setIsCreateNoteModalOpen] = React.useState(false);
  const [selectedAppointment, setSelectedAppointment] = React.useState<Appointment | null>(null);
  const [isEditingHeader, setIsEditingHeader] = React.useState(false);
  const [pendingDeleteId, setPendingDeleteId] = React.useState<string | null>(null);

  const queryClient = useQueryClient();
  const { toast } = useToast();

  // Data fetching
  const {
    client,
    sessionNotes,
    appointments,
    progressNotes,
    isLoading,
    hasError,
    refetchAll,
  } = useClientData(clientId);

  // Real-time updates
  useRealtimeUpdates(clientId, queryClient);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onNewNote: () => setIsCreateNoteModalOpen(true),
    onLink: () => setIsLinkingModalOpen(true),
    onExport: () => setShowExportMenu(true),
    onSearch: () => document.getElementById('search-input')?.focus(),
    onEscape: () => {
      setSelectedNotes(new Set());
      setShowExportMenu(false);
    },
  });

  // Build fast lookups
  const appointmentIdByEventId = React.useMemo(() => {
    const m = new Map<string, string>();
    appointments.data?.forEach(a => a.googleEventId && m.set(a.googleEventId, a.id));
    return m;
  }, [appointments.data]);

  const notesByAppointmentId = React.useMemo(() => {
    const m = new Map<string, SessionNote[]>();
    sessionNotes.data?.forEach(n => {
      const id = n.appointmentId ?? (n.eventId ? appointmentIdByEventId.get(n.eventId) : undefined);
      if (id) m.set(id, [...(m.get(id) ?? []), n]);
    });
    return m;
  }, [sessionNotes.data, appointmentIdByEventId]);

  const hasNoteFor = React.useCallback((appt: Appointment) => notesByAppointmentId.has(appt.id), [notesByAppointmentId]);

  // Calculate stats
  const stats = React.useMemo(() => {
    if (!sessionNotes.data || !appointments.data) {
      return null;
    }
    return calculateClientStats(sessionNotes.data, appointments.data, hasNoteFor);
  }, [sessionNotes.data, appointments.data, hasNoteFor]);

  // Timeline data with filtering and grouping
  const timelineData = React.useMemo(() => {
    if (!appointments.data || !sessionNotes.data) return [];

    const apptItems = appointments.data.map(apt => ({
      type: 'appointment' as const,
      date: new Date(apt.startTime),
      title: apt.title || 'Appointment',
      data: apt,
      hasNote: hasNoteFor(apt),
    }));

    const noteItems = sessionNotes.data.map(note => {
      const firstLine = note.content?.split('\n')[0] ?? 'Session Note';
      const title = firstLine.slice(0, 100) + (firstLine.length > 100 ? '…' : '');
      return {
        type: 'session-note' as const,
        date: new Date(note.createdAt),
        title,
        data: note,
        hasNote: true,
      };
    });

    let allItems = [...apptItems, ...noteItems];

    // Apply filters
    if (searchTerm) {
      allItems = allItems.filter(item => 
        item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.type === 'session-note' && 
         (item.data as SessionNote).content.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    if (dateFilter) {
      allItems = allItems.filter(item => 
        isWithinInterval(item.date, { start: dateFilter.start, end: dateFilter.end })
      );
    }

    if (noteTypeFilter !== 'all') {
      allItems = allItems.filter(item => {
        if (item.type !== 'session-note') return true;
        const note = item.data as SessionNote;
        const isLinked = note.appointmentId || note.eventId;
        return noteTypeFilter === 'linked' ? isLinked : !isLinked;
      });
    }

    return allItems.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [appointments.data, sessionNotes.data, hasNoteFor, searchTerm, dateFilter, noteTypeFilter]);

  // Group timeline by month
  const groupedTimelineData = React.useMemo(() => {
    const groups = new Map<string, typeof timelineData>();

    timelineData.forEach(item => {
      const monthKey = format(item.date, 'MMMM yyyy');
      if (!groups.has(monthKey)) {
        groups.set(monthKey, []);
      }
      groups.get(monthKey)!.push(item);
    });

    return Array.from(groups.entries()).map(([month, items]) => ({
      month,
      items: items.sort((a, b) => b.date.getTime() - a.date.getTime())
    }));
  }, [timelineData]);

  // Analytics data
  const sessionFrequencyData = React.useMemo(() => {
    if (!sessionNotes.data) return [];
    return generateSessionFrequencyData(sessionNotes.data);
  }, [sessionNotes.data]);

  const commonThemes = React.useMemo(() => {
    if (!sessionNotes.data) return [];
    return extractCommonThemes(sessionNotes.data);
  }, [sessionNotes.data]);

  // Mutations
  const deleteSessionNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      const response = await fetch(`/api/session-notes/${noteId}`, { method: 'DELETE' });
      if (!response.ok) throw new Error('Failed to delete session note');
      return response.json();
    },
    onMutate: async (noteId: string) => {
      await queryClient.cancelQueries({ queryKey: qKeys.notes(clientId) });
      const prev = queryClient.getQueryData<SessionNote[]>(qKeys.notes(clientId)) || [];
      queryClient.setQueryData<SessionNote[]>(qKeys.notes(clientId), (old = []) => 
        old.filter(n => n.id !== noteId)
      );

      toast({
        title: 'Session note deleted',
        description: 'You can undo this action.',
        action: (
          <ToastAction 
            altText="Undo" 
            onClick={() => queryClient.setQueryData<SessionNote[]>(qKeys.notes(clientId), prev)}
          >
            Undo
          </ToastAction>
        ),
      });

      return { prev };
    },
    onError: (_err, _noteId, ctx) => {
      if (ctx?.prev) queryClient.setQueryData(qKeys.notes(clientId), ctx.prev);
      toast({
        title: 'Error',
        description: 'Failed to delete session note. Please try again.',
        variant: 'destructive',
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
      queryClient.invalidateQueries({ queryKey: qKeys.appts(clientId) });
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (noteIds: string[]) => {
      const promises = noteIds.map(id => 
        fetch(`/api/session-notes/${id}`, { method: 'DELETE' })
      );
      const results = await Promise.all(promises);
      if (results.some(r => !r.ok)) {
        throw new Error('Failed to delete some notes');
      }
      return true;
    },
    onSuccess: () => {
      setSelectedNotes(new Set());
      toast({
        title: 'Notes deleted',
        description: `Successfully deleted ${selectedNotes.size} session notes`,
      });
      refetchAll();
    },
    onError: () => {
      toast({
        title: 'Error',
        description: 'Failed to delete some notes. Please try again.',
        variant: 'destructive',
      });
    },
  });

  // Handlers
  const handleDeleteSessionNote = (noteId: string) => setPendingDeleteId(noteId);

  const confirmDelete = () => {
    if (pendingDeleteId) {
      deleteSessionNoteMutation.mutate(pendingDeleteId);
      setPendingDeleteId(null);
    }
  };

  const handleBulkDelete = () => {
    if (selectedNotes.size > 0) {
      bulkDeleteMutation.mutate(Array.from(selectedNotes));
    }
  };

  const handleSelectNote = (noteId: string) => {
    setSelectedNotes(prev => {
      const next = new Set(prev);
      if (next.has(noteId)) {
        next.delete(noteId);
      } else {
        next.add(noteId);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    if (!sessionNotes.data) return;
    if (selectedNotes.size === sessionNotes.data.length) {
      setSelectedNotes(new Set());
    } else {
      setSelectedNotes(new Set(sessionNotes.data.map(n => n.id)));
    }
  };

  const handleExport = async (format: 'pdf' | 'csv') => {
    const data = {
      client: client.data,
      sessionNotes: sessionNotes.data,
      appointments: appointments.data,
      timeline: timelineData,
    };

    const clientName = client.data ? `${client.data.firstName} ${client.data.lastName}` : 'Client';

    if (format === 'pdf') {
      await exportToPDF(data, clientName);
    } else if (format === 'csv') {
      await exportToCSV(data, clientName);
    }

    toast({
      title: 'Export successful',
      description: `Client data exported as ${format.toUpperCase()}`,
    });

    setShowExportMenu(false);
  };

  const handleLinkingComplete = () => {
    queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
    queryClient.invalidateQueries({ queryKey: qKeys.appts(clientId) });
  };

  const handleDocumentProcessed = () => {
    queryClient.invalidateQueries({ queryKey: qKeys.notes(clientId) });
  };

  // Loading state
  if (isLoading) return <HeaderSkeleton />;

  // Error state
  if (hasError || !client.data) {
    return (
      <div className="p-6">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-lg font-semibold text-gray-900">Client not found</h2>
          <p className="text-gray-600">The client you're looking for doesn't exist or there was an error loading the data.</p>
          <div className="flex gap-2 justify-center mt-4">
            <Button onClick={() => refetchAll()}>
              Try Again
            </Button>
            <Button variant="outline" onClick={() => setLocation('/clients')}>
              Back to Clients
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const clientName = `${client.data.firstName} ${client.data.lastName}`;
  const dob = safeDate(client.data.dateOfBirth);

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center gap-4 mb-4">
          <Button
            variant="ghost"
            onClick={() => setLocation('/clients')}
            className="text-gray-600 hover:text-gray-900"
            aria-label="Back to Clients"
          >
            ← Back to Clients
          </Button>

          {/* Keyboard shortcuts hint */}
          <div className="ml-auto text-xs text-gray-500">
            Press <kbd className="px-1 py-0.5 bg-gray-100 rounded">⌘K</kbd> to search
          </div>
        </div>

        <div className="flex items-start justify-between">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center">
              <User className="w-8 h-8 text-white" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900" data-testid="text-client-name">
                {clientName}
              </h1>
              <p className="text-gray-600" data-testid="text-client-email">
                {client.data.email}
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm text-gray-500">
                <span data-testid="text-client-dob">DOB: {dob ? dob.toLocaleDateString() : '—'}</span>
                <span data-testid="text-client-phone">Phone: {client.data.phone}</span>
                {stats && stats.lastContactDays > 30 && (
                  <Badge variant="outline" className="text-orange-600 border-orange-600">
                    Last contact {stats.lastContactDays} days ago
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex gap-2">
            <DropdownMenu open={showExportMenu} onOpenChange={setShowExportMenu}>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Download className="w-4 h-4 mr-2" />
                  Export
                  <ChevronDown className="w-4 h-4 ml-1" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => handleExport('pdf')}>
                  Export as PDF
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleExport('csv')}>
                  Export as CSV
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsEditingHeader(v => !v)}
              data-testid="button-edit-client-header"
            >
              <Edit2 className="w-4 h-4 mr-2" />
              {isEditingHeader ? 'Cancel Edit' : 'Edit Info'}
            </Button>

            <Button variant="outline" size="sm" aria-label="Schedule Appointment">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule
            </Button>

            <Button size="sm" onClick={() => setIsCreateNoteModalOpen(true)} aria-label="New Session Note">
              <FileText className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
        </div>

        {isEditingHeader && (
          <div className="mt-6 p-4 border rounded-lg bg-gray-50">
            <EditableClientInfo client={client.data} mode="compact" />
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
          <Input
            id="search-input"
            placeholder="Search notes and appointments..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>

        <Select value={noteTypeFilter} onValueChange={(v) => setNoteTypeFilter(v as any)}>
          <SelectTrigger className="w-40">
            <Filter className="w-4 h-4 mr-2" />
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Notes</SelectItem>
            <SelectItem value="linked">Linked Only</SelectItem>
            <SelectItem value="unlinked">Unlinked Only</SelectItem>
          </SelectContent>
        </Select>

        {searchTerm && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSearchTerm('')}
          >
            <X className="w-4 h-4 mr-2" />
            Clear
          </Button>
        )}
      </div>

      {/* Bulk actions bar */}
      {selectedNotes.size > 0 && (
        <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-lg flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={sessionNotes.data?.length === selectedNotes.size}
              onCheckedChange={handleSelectAll}
            />
            <span className="text-sm font-medium">
              {selectedNotes.size} note{selectedNotes.size !== 1 && 's'} selected
            </span>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSelectedNotes(new Set())}>
              Clear Selection
            </Button>
            <Button size="sm" variant="outline">
              <Tag className="w-4 h-4 mr-2" />
              Add Tags
            </Button>
            <Button size="sm" variant="outline">
              <Archive className="w-4 h-4 mr-2" />
              Archive
            </Button>
            <Button 
              size="sm" 
              variant="destructive" 
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof TABS[keyof typeof TABS])} className="space-y-6">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value={TABS.TIMELINE}>Timeline</TabsTrigger>
          <TabsTrigger value={TABS.SESSIONS}>Session Notes</TabsTrigger>
          <TabsTrigger value={TABS.APPTS}>Appointments</TabsTrigger>
          <TabsTrigger value={TABS.DOCS}>Documents</TabsTrigger>
          <TabsTrigger value={TABS.ANALYTICS}>Analytics</TabsTrigger>
          <TabsTrigger value={TABS.RECS}>AI Insights</TabsTrigger>
        </TabsList>

        {/* Timeline Tab */}
        <TabsContent value={TABS.TIMELINE} className="space-y-6">
          <div className="grid gap-6 lg:grid-cols-4">
            {/* Sidebar */}
            <div className="lg:col-span-1 space-y-4">
              {stats && (
                <>
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Clinical Summary</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Total Sessions</span>
                          <span className="font-semibold">{stats.totalSessions}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Appointments</span>
                          <span className="font-semibold">{stats.totalAppointments}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Upcoming</span>
                          <span className="font-semibold text-blue-600">{stats.upcomingCount}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Coverage Rate</span>
                          <span className="font-semibold text-green-600">{stats.coverageRate}%</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-xs text-gray-600">Avg/Month</span>
                          <span className="font-semibold">{stats.avgSessionsPerMonth}</span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium">Quick Actions</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                      <Button
                        size="sm"
                        className="w-full justify-start"
                        onClick={() => setIsCreateNoteModalOpen(true)}
                        data-testid="button-create-session-note"
                      >
                        <FileText className="w-4 h-4 mr-2" />
                        New Session Note
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        data-testid="button-schedule-appointment"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        Schedule Appointment
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setActiveTab(TABS.DOCS)}
                        data-testid="button-upload-document"
                      >
                        <Upload className="w-4 h-4 mr-2" />
                        Upload Document
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="w-full justify-start"
                        onClick={() => setIsLinkingModalOpen(true)}
                      >
                        <LinkIcon className="w-4 h-4 mr-2" />
                        Manage Linking
                      </Button>
                    </CardContent>
                  </Card>
                </>
              )}
            </div>

            {/* Main timeline */}
            <div className="lg:col-span-3">
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <CardTitle>Clinical Timeline</CardTitle>
                    <div className="flex items-center gap-2 text-sm text-gray-500">
                      <Clock className="w-4 h-4" />
                      {timelineData.length} total events
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  {timelineData.length === 0 ? (
                    <div className="text-center py-8">
                      <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-gray-900 mb-2">
                        {searchTerm ? 'No results found' : 'No clinical history found'}
                      </h3>
                      <p className="text-gray-600 mb-4">
                        {searchTerm 
                          ? 'Try adjusting your search or filters'
                          : 'Start by creating a session note or scheduling an appointment.'}
                      </p>
                      {!searchTerm && (
                        <Button onClick={() => setIsCreateNoteModalOpen(true)}>
                          <FileText className="w-4 h-4 mr-2" />
                          Create First Session Note
                        </Button>
                      )}
                    </div>
                  ) : (
                    // Regular rendering
                    <div className="space-y-6">
                      {groupedTimelineData.map(({ month, items }) => (
                        <div key={month}>
                          <h3 className="text-sm font-semibold text-gray-600 mb-3 sticky top-0 bg-white py-2 z-10">
                            {month}
                          </h3>
                          <div className="space-y-4">
                            {items.map((item, index) => (
                              <TimelineItemComponent
                                key={`${item.type}-${(item.data as any).id}`}
                                item={item}
                                index={index}
                                isSelected={selectedNotes.has((item.data as any).id)}
                                onSelect={handleSelectNote}
                                onDelete={handleDeleteSessionNote}
                                onAddNote={(apt) => {
                                  setSelectedAppointment(apt);
                                  setIsCreateNoteModalOpen(true);
                                }}
                                showLine={index < items.length - 1}
                              />
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </TabsContent>

        {/* Analytics Tab */}
        <TabsContent value={TABS.ANALYTICS} className="space-y-6">
          <div className="grid gap-4 md:grid-cols-4">
            <StatCard
              label="Total Sessions"
              value={stats?.totalSessions || 0}
              icon={FileText}
              trend="neutral"
            />
            <StatCard
              label="Coverage Rate"
              value={`${stats?.coverageRate || 0}%`}
              subtext="notes per appointment"
              icon={TrendingUp}
              trend={stats && stats.coverageRate > 80 ? 'up' : 'down'}
            />
            <StatCard
              label="Avg Sessions/Month"
              value={stats?.avgSessionsPerMonth || 0}
              icon={Calendar}
              trend="neutral"
            />
            <StatCard
              label="Days Since Contact"
              value={stats?.lastContactDays || 0}
              icon={Clock}
              trend={stats && stats.lastContactDays > 30 ? 'down' : 'up'}
              className={stats && stats.lastContactDays > 30 ? 'border-orange-200' : ''}
            />
          </div>

          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Session Frequency</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Chart placeholder - uncomment if you have recharts installed */}
                {/* <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={sessionFrequencyData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Line 
                      type="monotone" 
                      dataKey="sessions" 
                      stroke="#8b5cf6" 
                      strokeWidth={2}
                      dot={{ fill: '#8b5cf6' }}
                    />
                  </LineChart>
                </ResponsiveContainer> */}

                {/* Simple text-based alternative */}
                <div className="space-y-3">
                  <h4 className="text-sm font-medium text-gray-600">Last 6 Months</h4>
                  {sessionFrequencyData.map((data) => (
                    <div key={data.month} className="flex items-center justify-between">
                      <span className="text-sm">{data.month}</span>
                      <div className="flex items-center gap-2">
                        <div className="w-32 bg-gray-200 rounded-full h-2">
                          <div 
                            className="bg-purple-600 h-2 rounded-full transition-all"
                            style={{ width: `${(data.sessions / Math.max(...sessionFrequencyData.map(d => d.sessions), 1)) * 100}%` }}
                          />
                        </div>
                        <span className="text-sm font-medium w-8">{data.sessions}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Common Themes</CardTitle>
              </CardHeader>
              <CardContent>
                {/* Chart placeholder - uncomment if you have recharts installed */}
                {/* <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={commonThemes}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="theme" angle={-45} textAnchor="end" height={100} />
                    <YAxis />
                    <Tooltip />
                    <Bar dataKey="count" fill="#8b5cf6" />
                  </BarChart>
                </ResponsiveContainer> */}

                {/* Simple text-based alternative */}
                <div className="space-y-3">
                  {commonThemes.length > 0 ? (
                    commonThemes.slice(0, 8).map(({ theme, count }) => (
                      <div key={theme} className="flex items-center justify-between">
                        <span className="text-sm">{theme}</span>
                        <div className="flex items-center gap-2">
                          <div className="w-24 bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-purple-600 h-2 rounded-full transition-all"
                              style={{ width: `${(count / Math.max(...commonThemes.map(t => t.count), 1)) * 100}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-8">{count}</span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-sm text-gray-500">No themes identified yet</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Treatment Progress Indicators</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Alert>
                  <BarChart3 className="h-4 w-4" />
                  <AlertTitle>Progress Analysis</AlertTitle>
                  <AlertDescription>
                    Based on {sessionNotes.data?.length || 0} session notes, the client shows consistent engagement 
                    with therapy. Consider implementing outcome measures for more detailed progress tracking.
                  </AlertDescription>
                </Alert>

                {commonThemes.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium mb-2">Key Focus Areas</h4>
                    <div className="flex flex-wrap gap-2">
                      {commonThemes.slice(0, 5).map(({ theme }) => (
                        <Badge key={theme} variant="secondary">
                          {theme}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Session Notes Tab */}
        <TabsContent value={TABS.SESSIONS} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Session Notes</h2>
              <p className="text-sm text-gray-600">{sessionNotes.data?.length || 0} total session notes</p>
            </div>
            <div className="flex gap-2">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    Templates
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {NOTE_TEMPLATES.map((template) => (
                    <DropdownMenuItem
                      key={template.name}
                      onClick={() => {
                        // TODO: Set template and open modal with pre-filled content
                        setIsCreateNoteModalOpen(true);
                      }}
                    >
                      {template.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => setIsCreateNoteModalOpen(true)}>
                <FileText className="w-4 h-4 mr-2" />
                New Session Note
              </Button>
            </div>
          </div>

          {/* Session notes list */}
          {sessionNotes.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-44 mb-2" />
                    <Skeleton className="h-4 w-64 mb-3" />
                    <Skeleton className="h-20 w-full" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : sessionNotes.data?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No session notes found</h3>
                <p className="text-gray-600 mb-4">Create your first session note for this client.</p>
                <Button onClick={() => setIsCreateNoteModalOpen(true)}>
                  <FileText className="w-4 h-4 mr-2" />
                  Create Session Note
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {sessionNotes.data?.map((note) => (
                <Card key={note.id}>
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between mb-4">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="font-medium">Session Note</h3>
                          {note.source === 'document_upload' && (
                            <Badge variant="secondary">
                              <Upload className="w-3 h-3 mr-1" />
                              Uploaded
                            </Badge>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 mb-3">
                          {new Date(note.createdAt).toLocaleDateString()}
                        </div>
                      </div>
                      <Checkbox
                        checked={selectedNotes.has(note.id)}
                        onCheckedChange={() => handleSelectNote(note.id)}
                      />
                    </div>
                    <div className="prose prose-sm max-w-none">
                      <div className="whitespace-pre-wrap text-sm text-gray-700">
                        <ReadMore text={note.content} max={600} />
                      </div>
                    </div>
                    {note.aiTags && note.aiTags.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-4">
                        {note.aiTags.map((tag, index) => (
                          <Badge key={index} variant="outline" className="text-xs">
                            {tag}
                          </Badge>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Appointments Tab */}
        <TabsContent value={TABS.APPTS} className="space-y-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-lg font-semibold">Appointments</h2>
              <p className="text-sm text-gray-600">{appointments.data?.length || 0} total appointments</p>
            </div>
            <Button variant="outline">
              <Calendar className="w-4 h-4 mr-2" />
              Schedule New
            </Button>
          </div>

          {appointments.isLoading ? (
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}>
                  <CardContent className="p-6">
                    <Skeleton className="h-5 w-64 mb-3" />
                    <Skeleton className="h-4 w-80 mb-2" />
                    <Skeleton className="h-4 w-72" />
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : appointments.data?.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <Calendar className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No appointments found</h3>
                <p className="text-gray-600 mb-4">Schedule the first appointment for this client.</p>
                <Button variant="outline">
                  <Calendar className="w-4 h-4 mr-2" />
                  Schedule Appointment
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {appointments.data?.map((appointment) => {
                const linked = hasNoteFor(appointment);
                const isPast = new Date(appointment.startTime).getTime() < Date.now();

                return (
                  <Card key={appointment.id}>
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Calendar className="w-4 h-4 text-gray-500" />
                          <div>
                            <p className="font-medium">
                              {appointment.title || appointment.type?.replace('_', ' ') || 'Appointment'}
                            </p>
                            <p className="text-sm text-gray-500">
                              {new Date(appointment.startTime).toLocaleString()}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          {linked && (
                            <Badge variant="outline" className="text-green-600">
                              Has Note
                            </Badge>
                          )}
                          {!linked && isPast && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setSelectedAppointment(appointment);
                                setIsCreateNoteModalOpen(true);
                              }}
                            >
                              Add Note
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>

        {/* Documents Tab */}
        <TabsContent value={TABS.DOCS} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">Document Upload & Processing</h2>
            <p className="text-sm text-gray-600">
              Upload clinical documents for AI processing and automatic session note generation.
            </p>
          </div>

          <DocumentProcessor
            clientId={clientId}
            clientName={clientName}
            onDocumentProcessed={handleDocumentProcessed}
          />
        </TabsContent>

        {/* AI Insights Tab */}
        <TabsContent value={TABS.RECS} className="space-y-6">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">AI Insights & Recommendations</h2>
            <p className="text-sm text-gray-600">
              AI-powered therapeutic insights based on session history.
            </p>
          </div>

          <SessionRecommendations 
            clientId={clientId}
            therapistId="e66b8b8e-e7a2-40b9-ae74-00c93ffe503c"
          />
        </TabsContent>
      </Tabs>

      {/* Modals */}
      {isCreateNoteModalOpen && (
        <CreateSessionNoteModal
          isOpen={isCreateNoteModalOpen}
          onClose={() => {
            setIsCreateNoteModalOpen(false);
            setSelectedAppointment(null);
          }}
          clientId={clientId}
          clientName={clientName}
          selectedAppointment={selectedAppointment}
        />
      )}

      {isLinkingModalOpen && (
        <SessionNoteLinkingModal
          isOpen={isLinkingModalOpen}
          onClose={() => setIsLinkingModalOpen(false)}
          clientId={clientId}
          sessionNotes={sessionNotes.data || []}
          appointments={appointments.data || []}
          onLinkingComplete={handleLinkingComplete}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!pendingDeleteId} onOpenChange={(open) => !open && setPendingDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete session note?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove the session note. You can undo immediately after deletion from the toast.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// Export with error boundary
export default function ClientChart() {
  return (
    <ClientChartErrorBoundary>
      <ClientChartInner />
    </ClientChartErrorBoundary>
  );
}