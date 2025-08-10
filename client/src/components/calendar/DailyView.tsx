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
import { Clock, MapPin, User, FileText, Brain, Calendar, ChevronLeft, ChevronRight, Plus, Sparkles, MessageSquare, Target, TrendingUp } from 'lucide-react';
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
    onSessionNotes
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

                  const eventStart = parseEventDate(event.startTime);
                  if (!eventStart) {
                            console.warn('DailyView: Could not parse event start time:', event.startTime);
                            return false;
                  }

                  const matches = isSameDay(eventStart, date);
                  if (matches) {
                            console.log('DailyView: Event matches date:', event.title, eventStart);
                  }

                  return matches;
          });

          console.log('DailyView: Filtered events count:', filtered.length);

          // Sort events by start time
          const sorted = filtered.sort((a, b) => {
                  const aTime = parseEventDate(a.startTime);
                  const bTime = parseEventDate(b.startTime);

                  if (!aTime || !bTime) return 0;

                  return aTime.getTime() - bTime.getTime();
          });

          console.log('DailyView: Final sorted events:', sorted.map(e => ({
                  title: e.title,
                  startTime: e.startTime
          })));

          return sorted;
    }, [events, date]);

    // Generate time slots for the day (24 hours)
    const timeSlots = useMemo(() => {
        const slots = [];
        // Generate 30-minute slots from 6:00 AM to 11:30 PM
        for (let hour = 6; hour <= 23; hour++) {
            slots.push({
                hour,
                minute: 0,
                display: `${hour.toString().padStart(2, '0')}:00`
            });

            if (hour < 23) { // Don't add 30-minute slot for the last hour
                slots.push({
                    hour,
                    minute: 30,
                    display: `${hour.toString().padStart(2, '0')}:30`
                });
            }
        }
        return slots;
    }, []);

    // Get events for specific time slot
    const getEventsForTimeSlot = (timeSlot: { hour: number; minute: number }) => {
        return dayEvents.filter(event => {
            const eventStart = parseEventDate(event.startTime);
            const eventEnd = parseEventDate(event.endTime);

            if (!eventStart || !eventEnd) return false;

            const slotStart = new Date(eventStart);
            slotStart.setHours(timeSlot.hour, timeSlot.minute, 0, 0);

            const slotEnd = new Date(slotStart);
            slotEnd.setMinutes(slotEnd.getMinutes() + 30);

            return (eventStart < slotEnd) && (eventEnd > slotStart);
        });
    };

    // Handle event analysis
    const handleAnalyzeSession = async (event: CalendarEvent) => {
        if (!event || !event.notes) {
            toast({
                title: "No session notes found",
                description: "Add session notes to get AI insights.",
                variant: "destructive"
            });
            return;
        }

        setIsAnalyzing(true);
        try {
            const response = await fetch('/api/analyze-session', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    sessionNotes: event.notes,
                    clientName: event.clientName || cleanEventTitle(event.title || ''),
                    sessionDate: event.startTime
                })
            });

            if (!response.ok) throw new Error('Analysis failed');

            const insights: AIInsight = await response.json();
            setAiInsights(insights);
        } catch (error) {
            console.error('Session analysis error:', error);
            toast({
                title: "Analysis failed",
                description: "Could not analyze session notes.",
                variant: "destructive"
            });
        } finally {
            setIsAnalyzing(false);
        }
    };

    return (
        <div className="space-y-6">
            {/* Header with navigation */}
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onPreviousDay}
                        data-testid="button-previous-day"
                    >
                        <ChevronLeft className="h-4 w-4" />
                        Previous
                    </Button>
                    <h2 className="text-2xl font-semibold text-gray-900 dark:text-gray-100">
                        {date.toLocaleDateString('en-US', {
                            weekday: 'long',
                            month: 'long',
                            day: 'numeric',
                            year: 'numeric'
                        })}
                    </h2>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onNextDay}
                        data-testid="button-next-day"
                    >
                        Next
                        <ChevronRight className="h-4 w-4" />
                    </Button>
                </div>
                <Button
                    onClick={onNewAppointment}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                    data-testid="button-new-appointment"
                >
                    <Plus className="h-4 w-4 mr-2" />
                    New Appointment
                </Button>
            </div>

            {/* Daily statistics */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Calendar className="h-5 w-5 text-blue-600" />
                            <span className="text-sm font-medium">Total Events</span>
                        </div>
                        <p className="text-2xl font-bold mt-2" data-testid="text-total-events">
                            {dayEvents.length}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <User className="h-5 w-5 text-green-600" />
                            <span className="text-sm font-medium">Clients</span>
                        </div>
                        <p className="text-2xl font-bold mt-2" data-testid="text-unique-clients">
                            {new Set(dayEvents.map(e => e.clientName || cleanEventTitle(e.title || ''))).size}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <Clock className="h-5 w-5 text-orange-600" />
                            <span className="text-sm font-medium">Hours Scheduled</span>
                        </div>
                        <p className="text-2xl font-bold mt-2" data-testid="text-scheduled-hours">
                            {Math.round(dayEvents.reduce((total, event) => {
                                const start = parseEventDate(event.startTime);
                                const end = parseEventDate(event.endTime);
                                if (start && end) {
                                    return total + (end.getTime() - start.getTime()) / (1000 * 60 * 60);
                                }
                                return total;
                            }, 0) * 10) / 10}
                        </p>
                    </CardContent>
                </Card>
                
                <Card>
                    <CardContent className="p-4">
                        <div className="flex items-center space-x-2">
                            <MapPin className="h-5 w-5 text-purple-600" />
                            <span className="text-sm font-medium">Location</span>
                        </div>
                        <p className="text-sm font-semibold mt-2" data-testid="text-office-location">
                            {(() => {
                                const day = date.getDay();
                                if (day === 1) return 'Woodbury';
                                if (day === 2 || day === 0 || day === 6) return 'Telehealth';
                                return 'Rockville Centre';
                            })()}
                        </p>
                    </CardContent>
                </Card>
            </div>

            {/* Time slot grid */}
            <Card>
                <CardHeader>
                    <CardTitle>Daily Schedule</CardTitle>
                </CardHeader>
                <CardContent>
                    <ScrollArea className="h-[600px]">
                        <div className="space-y-1">
                            {timeSlots.map((timeSlot) => {
                                const slotEvents = getEventsForTimeSlot(timeSlot);
                                
                                return (
                                    <div
                                        key={`${timeSlot.hour}-${timeSlot.minute}`}
                                        className={cn(
                                            "flex border border-gray-200 dark:border-gray-700 rounded-lg p-2 min-h-[60px]",
                                            slotEvents.length > 0 
                                                ? "bg-blue-50 dark:bg-blue-900/20" 
                                                : "bg-gray-50 dark:bg-gray-800/20 hover:bg-gray-100 dark:hover:bg-gray-700/30 cursor-pointer"
                                        )}
                                        onClick={() => {
                                            if (slotEvents.length === 0 && onTimeSlotClick) {
                                                onTimeSlotClick(date, timeSlot.display);
                                            }
                                        }}
                                        data-testid={`timeslot-${timeSlot.display}`}
                                    >
                                        <div className="w-20 flex-shrink-0 text-sm font-medium text-gray-600 dark:text-gray-400 pt-1">
                                            {timeSlot.display}
                                        </div>
                                        <div className="flex-1 space-y-1">
                                            {slotEvents.length === 0 ? (
                                                <div className="text-sm text-gray-400 dark:text-gray-600 italic">
                                                    Available
                                                </div>
                                            ) : (
                                                slotEvents.map((event, idx) => {
                                                    const clientName = event.clientName || formatClientName(cleanEventTitle(event.title || ''));
                                                    const startTime = parseEventDate(event.startTime);
                                                    const endTime = parseEventDate(event.endTime);
                                                    
                                                    return (
                                                        <div
                                                            key={`${event.id}-${idx}`}
                                                            className="bg-white dark:bg-gray-800 border border-blue-200 dark:border-blue-700 rounded p-3 cursor-pointer hover:shadow-md transition-shadow"
                                                            onClick={() => {
                                                                setSelectedEvent(event);
                                                                onEventClick(event);
                                                            }}
                                                            data-testid={`event-${event.id}`}
                                                        >
                                                            <div className="flex items-start justify-between">
                                                                <div className="flex-1">
                                                                    <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                                                                        {clientName}
                                                                    </h3>
                                                                    <div className="flex items-center space-x-2 mt-1 text-sm text-gray-600 dark:text-gray-400">
                                                                        <Clock className="h-3 w-3" />
                                                                        <span>
                                                                            {startTime?.toLocaleTimeString('en-US', { 
                                                                                hour: 'numeric', 
                                                                                minute: '2-digit' 
                                                                            })} - {endTime?.toLocaleTimeString('en-US', { 
                                                                                hour: 'numeric', 
                                                                                minute: '2-digit' 
                                                                            })}
                                                                        </span>
                                                                    </div>
                                                                    <div className="flex items-center space-x-2 mt-1">
                                                                        <Badge 
                                                                            variant={event.status === 'confirmed' ? 'default' : 'secondary'}
                                                                            className="text-xs"
                                                                        >
                                                                            {event.status || 'scheduled'}
                                                                        </Badge>
                                                                        <Badge variant="outline" className="text-xs">
                                                                            {event.type || 'individual'}
                                                                        </Badge>
                                                                    </div>
                                                                </div>
                                                                {event.notes && (
                                                                    <Button
                                                                        variant="ghost"
                                                                        size="sm"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            handleAnalyzeSession(event);
                                                                        }}
                                                                        className="ml-2"
                                                                        data-testid={`button-analyze-${event.id}`}
                                                                    >
                                                                        <Brain className="h-4 w-4" />
                                                                    </Button>
                                                                )}
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </ScrollArea>
                </CardContent>
            </Card>

            {/* AI Insights Dialog */}
            <Dialog open={!!aiInsights} onOpenChange={() => setAiInsights(null)}>
                <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center space-x-2">
                            <Sparkles className="h-5 w-5 text-blue-600" />
                            <span>AI Session Insights</span>
                        </DialogTitle>
                        <DialogDescription>
                            AI-powered analysis of your therapy session notes
                        </DialogDescription>
                    </DialogHeader>
                    
                    {aiInsights && (
                        <div className="space-y-6">
                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                    <FileText className="h-4 w-4 mr-2" />
                                    Session Summary
                                </h3>
                                <p className="text-gray-700 dark:text-gray-300">{aiInsights.summary}</p>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                    <Target className="h-4 w-4 mr-2" />
                                    Key Points
                                </h3>
                                <ul className="space-y-1">
                                    {aiInsights.keyPoints.map((point, idx) => (
                                        <li key={idx} className="flex items-start space-x-2">
                                            <span className="text-blue-600 mt-1">•</span>
                                            <span className="text-gray-700 dark:text-gray-300">{point}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                    <MessageSquare className="h-4 w-4 mr-2" />
                                    Suggested Follow-up Questions
                                </h3>
                                <ul className="space-y-1">
                                    {aiInsights.suggestedQuestions.map((question, idx) => (
                                        <li key={idx} className="flex items-start space-x-2">
                                            <span className="text-green-600 mt-1">?</span>
                                            <span className="text-gray-700 dark:text-gray-300">{question}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>

                            <div>
                                <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-2 flex items-center">
                                    <TrendingUp className="h-4 w-4 mr-2" />
                                    Progress Indicators
                                </h3>
                                <ul className="space-y-1">
                                    {aiInsights.progressIndicators.map((indicator, idx) => (
                                        <li key={idx} className="flex items-start space-x-2">
                                            <span className="text-purple-600 mt-1">↗</span>
                                            <span className="text-gray-700 dark:text-gray-300">{indicator}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    )}

                    {isAnalyzing && (
                        <div className="flex items-center justify-center py-8">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            <span className="ml-2 text-gray-600 dark:text-gray-400">Analyzing session notes...</span>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Session Notes Dialog */}
            {selectedEvent && (
                <AppointmentSummary
                    eventId={selectedEvent.id}
                />
            )}
        </div>
    );
};