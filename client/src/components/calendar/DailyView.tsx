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
                            console.log('DailyView: Event matches date:', event.title || event.summary, eventStart);
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
                  title: e.title || e.summary,
                  startTime: e.startTime
          })));

          return sorted;
    }, [events, date]);

    // Generate time slots for the day (24 hours)
    const timeSlots = useMemo(() => {
          const slots
    })
          })))
          })
                  }
                  }
                  }
          })
          }
    })
}
})
    }
                  }
          }
          }
    }
}
    }
          )
    }
}
}
}