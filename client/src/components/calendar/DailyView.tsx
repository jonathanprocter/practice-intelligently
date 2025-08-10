import { useState, useMemo } from 'react';
import { CalendarEvent } from '../../types/calendar';
import { cleanEventTitle, formatClientName } from '../../utils/textCleaner';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Clock, MapPin, User, FileText, Brain, Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, MessageSquare, Target, TrendingUp, Trash2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { AppointmentSummary } from './AppointmentSummary';

interface DailyViewProps {
    date: Date;
    events: CalendarEvent[];
    onEventClick: (event: CalendarEvent) => void;
    onTimeSlotClick?: (date: Date, time: string) => void;
    onPreviousDay: () => void;
    onNextDay: () => void;
    onNewAppointment: () => void;
    onSessionNotes?: (event: CalendarEvent) => void;
    onDeleteEvent?: (event: CalendarEvent) => void;
}

interface AIInsight {
    summary: string;
    keyPoints: string[];
    suggestedQuestions: string[];
    recommendedFollowUp: string[];
    progressIndicators: string[];
}

// Improved date comparison function
const isSameDay = (date1: Date, date2: Date): boolean => {
    try {
          // Normalize both dates to local timezone and compare year, month, day
          const d1 = new Date(date1);
          const d2 = new Date(date2);

          return (
                  d1.getFullYear() === d2.getFullYear() &&
                  d1.getMonth() === d2.getMonth() &&
                  d1.getDate() === d2.getDate()
                );
    } catch (error) {
          console.error('Date comparison error:', error);
          return false;
    }
};

// Safe date parsing function
const parseEventDate = (dateInput: string | Date): Date | null => {
    try {
          if (dateInput instanceof Date) {
                  return dateInput;
          }

          if (typeof dateInput === 'string') {
                  const parsed = new Date(dateInput);
                  if (isNaN(parsed.getTime())) {
                            console.warn('Invalid date string:', dateInput);
                            return null;
                  }
                  return parsed;
          }

          return null;
    } catch (error) {
          console.error('Date parsing error:', error, dateInput);
          return null;
    }
};

export const DailyView = ({
    date,
    events,
    onEventClick,
    onTimeSlotClick,
    onPreviousDay,
    onNextDay,
    onNewAppointment,
    onSessionNotes,
    onDeleteEvent
}: DailyViewProps) => {
    const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [aiInsights, setAiInsights] = useState<AIInsight | null>(null);
    const [sessionNotes, setSessionNotes] = useState('');
    const [existingProgressNotes, setExistingProgressNotes] = useState<any[]>([]);
    const [sessionPrepNotes, setSessionPrepNotes] = useState<any>(null);
    const [isLoadingAppointmentData, setIsLoadingAppointmentData] = useState(false);
    const { toast } = useToast();

    // Improved event filtering with better date handling and debugging
    const dayEvents = useMemo(() => {
          console.log('DailyView: Filtering events for date:', date);
          console.log('DailyView: Total events received:', events.length);

          if (!events || events.length === 0) {
                  console.log('DailyView: No events to filter');
                  return [];
          }

          const filtered = events.filter(event => {
                  if (!event || !event.startTime) {
                            console.warn('DailyView: Event missing startTime:', event);
                            return false;
                  }

                  const eventDate = parseEventDate(event.startTime);
                  if (!eventDate) {
                            console.warn('DailyView: Could not parse event date:', event.startTime);
                            return false;
                  }

                  const matches = isSameDay(eventDate, date);

                  if (matches) {
                            console.log(`DailyView: Event "${event.title}" matches date ${date.toDateString()}`);
                  }

                  return matches;
          });

          console.log(`DailyView: Found ${filtered.length} events for ${date.toDateString()}`);
          return filtered.sort((a, b) => {
                  const timeA = parseEventDate(a.startTime);
                  const timeB = parseEventDate(b.startTime);
                  if (!timeA || !timeB) return 0;
                  return timeA.getTime() - timeB.getTime();
          });
    }, [events, date]);

    const handleEventClick = (event: CalendarEvent) => {
        setSelectedEvent(event);
        onEventClick(event);
        // Fetch session notes and prep notes when an event is clicked
        fetchSessionData(event);
    };

    const handleCloseDialog = () => {
        setSelectedEvent(null);
        setAiInsights(null);
        setSessionNotes('');
        setExistingProgressNotes([]);
        setSessionPrepNotes(null);
    };

    const fetchSessionData = async (event: CalendarEvent) => {
        setIsLoadingAppointmentData(true);
        try {
            // Placeholder for actual API calls to fetch session notes and prep notes
            // In a real app, you'd likely fetch these based on event.id or similar
            const mockSessionNotes = await new Promise<any[]>((resolve) => setTimeout(() => resolve([
                { id: 'note1', content: 'Client seemed anxious but engaged.', date: '2023-10-26' },
                { id: 'note2', content: 'Discussed goals for next session.', date: '2023-10-19' },
            ]), 500));

            const mockPrepNotes = await new Promise<any>((resolve) => setTimeout(() => resolve({
                goal: 'Improve client\'s self-efficacy.',
                clientHistory: 'Previous sessions focused on building rapport.',
                keyAreas: ['Confidence building', 'Cognitive restructuring'],
            }), 500));

            setExistingProgressNotes(mockSessionNotes);
            setSessionPrepNotes(mockPrepNotes);

        } catch (error) {
            console.error("Error fetching session data:", error);
            toast({
                title: "Error",
                description: "Failed to load session data.",
                variant: "destructive"
            });
        } finally {
            setIsLoadingAppointmentData(false);
        }
    };

    const analyzeSession = async () => {
        if (!selectedEvent) return;

        setIsAnalyzing(true);
        setAiInsights(null); // Clear previous insights

        try {
            // Placeholder for AI analysis API call
            const mockAiResponse: AIInsight = {
                summary: `AI summary of the session with ${cleanEventTitle(selectedEvent.title)}. Focus was on overcoming obstacles.`,
                keyPoints: [
                    'Client expressed a breakthrough in understanding.',
                    'Identified specific actionable steps.',
                    'Discussed potential setbacks and coping mechanisms.',
                ],
                suggestedQuestions: [
                    'What was the most significant part of today\'s session for you?',
                    'How do you plan to implement the actionable steps?',
                    'What support do you anticipate needing in the next week?',
                ],
                recommendedFollowUp: [
                    'Schedule a check-in call in 3 days.',
                    'Provide additional resources on resilience.',
                    'Review progress on action steps next session.',
                ],
                progressIndicators: [
                    'Increased client engagement observed.',
                    'Positive verbal feedback on session effectiveness.',
                    'Client readily identified next steps.',
                ],
            };
            setAiInsights(mockAiResponse);
            toast({
                title: "Analysis Complete",
                description: "AI insights generated successfully.",
            });
        } catch (error) {
            console.error("Error analyzing session:", error);
            toast({
                title: "Error",
                description: "Failed to generate AI insights.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    const handleSaveSessionNotes = () => {
        if (!selectedEvent) return;
        // Placeholder for saving session notes
        console.log(`Saving notes for event ${selectedEvent.title}:`, sessionNotes);
        toast({
            title: "Notes Saved",
            description: "Your session notes have been saved.",
        });
        // Optionally clear the textarea or add the new note to existingProgressNotes
        const newNote = { id: `note_${Date.now()}`, content: sessionNotes, date: new Date().toISOString().split('T')[0] };
        setExistingProgressNotes(prevNotes => [...prevNotes, newNote]);
        setSessionNotes('');
    };

    const handleDeleteEvent = async () => {
        if (!selectedEvent || !onDeleteEvent) return;
        
        try {
            await onDeleteEvent(selectedEvent);
            setSelectedEvent(null);
            toast({
                title: "Event Deleted",
                description: "The calendar event has been successfully deleted.",
            });
        } catch (error) {
            console.error('Error deleting event:', error);
            toast({
                title: "Error",
                description: "Failed to delete the event. Please try again.",
                variant: "destructive"
            });
        }
    };

    return (
        <div className="p-4 h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <Button onClick={onPreviousDay} variant="ghost" size="icon">
                    <ChevronLeft />
                </Button>
                <h2 className="text-2xl font-bold text-center">{date.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</h2>
                <Button onClick={onNextDay} variant="ghost" size="icon">
                    <ChevronRight />
                </Button>
            </div>

            <div className="flex-grow overflow-y-auto">
                {dayEvents.length === 0 ? (
                    <p className="text-center text-muted-foreground">No appointments for today.</p>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {dayEvents.map((event) => (
                            <Card
                                key={event.id}
                                className="cursor-pointer hover:shadow-lg transition-shadow"
                                onClick={() => handleEventClick(event)}
                            >
                                <CardHeader>
                                    <CardTitle className="text-lg truncate">{cleanEventTitle(event.title)}</CardTitle>
                                    <div className="text-sm text-muted-foreground flex items-center">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {event.isAllDay ? 'All Day' : (
                                            <>
                                                {event.startTime && parseEventDate(event.startTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {event.endTime && !event.isAllDay && ` - ${parseEventDate(event.endTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </>
                                        )}
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    {event.location && (
                                        <div className="flex items-center text-sm mb-1">
                                            <MapPin className="mr-1 h-4 w-4 text-primary" />
                                            {event.location}
                                        </div>
                                    )}
                                    {event.clientName && (
                                        <div className="flex items-center text-sm mb-1">
                                            <User className="mr-1 h-4 w-4 text-primary" />
                                            {formatClientName(event.clientName)}
                                        </div>
                                    )}
                                    {event.notes && (
                                        <div className="text-sm text-muted-foreground mt-2 line-clamp-2">
                                            {event.notes}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
            </div>

            <div className="mt-4 flex justify-center">
                <Button onClick={onNewAppointment} className="w-full max-w-sm">
                    <Plus className="mr-2 h-4 w-4" /> New Appointment
                </Button>
            </div>

            <Dialog open={!!selectedEvent} onOpenChange={handleCloseDialog}>
                <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{selectedEvent ? cleanEventTitle(selectedEvent.title) : ''}</DialogTitle>
                        <DialogDescription>
                            {selectedEvent && (
                                <div className="flex flex-col space-y-2">
                                    <div className="flex items-center text-sm text-muted-foreground">
                                        <Clock className="mr-1 h-4 w-4" />
                                        {selectedEvent.isAllDay ? 'All Day' : (
                                            <>
                                                {selectedEvent.startTime && parseEventDate(selectedEvent.startTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                {selectedEvent.endTime && !selectedEvent.isAllDay && ` - ${parseEventDate(selectedEvent.endTime)?.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`}
                                            </>
                                        )}
                                    </div>
                                    {selectedEvent.location && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <MapPin className="mr-1 h-4 w-4 text-primary" />
                                            {selectedEvent.location}
                                        </div>
                                    )}
                                    {selectedEvent.clientName && (
                                        <div className="flex items-center text-sm text-muted-foreground">
                                            <User className="mr-1 h-4 w-4 text-primary" />
                                            {formatClientName(selectedEvent.clientName)}
                                        </div>
                                    )}
                                </div>
                            )}
                        </DialogDescription>
                    </DialogHeader>

                    <ScrollArea className="max-h-[calc(90vh-200px)] pr-4">
                        {isLoadingAppointmentData ? (
                            <p>Loading appointment details...</p>
                        ) : (
                            <>
                                {onSessionNotes && (
                                    <div className="mb-6">
                                        <div className="flex justify-between items-center mb-2">
                                            <h3 className="text-lg font-semibold flex items-center">
                                                <FileText className="mr-2 h-5 w-5" /> Session Notes
                                            </h3>
                                            <Button onClick={handleSaveSessionNotes} disabled={!sessionNotes.trim()}>Save Notes</Button>
                                        </div>
                                        <Textarea
                                            value={sessionNotes}
                                            onChange={(e) => setSessionNotes(e.target.value)}
                                            placeholder="Enter your notes for this session..."
                                            className="min-h-[100px]"
                                        />
                                        {existingProgressNotes.length > 0 && (
                                            <div className="mt-4">
                                                <h4 className="text-md font-semibold mb-2 flex items-center">
                                                    <TrendingUp className="mr-2 h-4 w-4" /> Previous Progress Notes
                                                </h4>
                                                <ul className="space-y-2 max-h-48 overflow-y-auto">
                                                    {existingProgressNotes.map((note) => (
                                                        <li key={note.id} className="text-sm text-muted-foreground border-b pb-1">
                                                            <p>{note.content}</p>
                                                            <span className="text-xs text-gray-500"> - {note.date}</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )}
                                    </div>
                                )}

                                <div className="mb-6">
                                    <h3 className="text-lg font-semibold flex items-center mb-2">
                                        <Brain className="mr-2 h-5 w-5" /> AI Assistant
                                    </h3>
                                    <Button onClick={analyzeSession} disabled={isAnalyzing || !selectedEvent}>
                                        {isAnalyzing ? 'Analyzing...' : (
                                            <>
                                                <Sparkles className="mr-2 h-4 w-4" /> Analyze Session
                                            </>
                                        )}
                                    </Button>
                                    {aiInsights && (
                                        <div className="mt-4 p-3 border rounded-md bg-secondary/50">
                                            <AppointmentSummary eventId={selectedEvent?.id || ''} />
                                        </div>
                                    )}
                                </div>

                                {sessionPrepNotes && (
                                    <div className="mb-6">
                                        <h3 className="text-lg font-semibold flex items-center mb-2">
                                            <Target className="mr-2 h-5 w-5" /> Session Prep
                                        </h3>
                                        <div className="p-3 border rounded-md bg-background">
                                            <p className="text-sm font-medium mb-1">Goal: {sessionPrepNotes.goal}</p>
                                            <p className="text-sm text-muted-foreground mb-1">History: {sessionPrepNotes.clientHistory}</p>
                                            <p className="text-sm text-muted-foreground">Key Areas: {sessionPrepNotes.keyAreas.join(', ')}</p>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}
                    </ScrollArea>
                    
                    {/* Dialog Footer with Action Buttons */}
                    {onDeleteEvent && selectedEvent && (
                        <div className="flex justify-between items-center pt-4 border-t">
                            <Button 
                                variant="destructive" 
                                onClick={handleDeleteEvent}
                                className="flex items-center"
                            >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete Event
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>
        </div>
    );
};