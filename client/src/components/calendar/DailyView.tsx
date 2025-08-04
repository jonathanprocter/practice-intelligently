import { useState } from 'react';
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

  // Filter and sort events for the selected date
  const dayEvents = events
    .filter(event => {
      const eventStart = typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime;
      return eventStart.toDateString() === date.toDateString();
    })
    .sort((a, b) => {
      const aTime = typeof a.startTime === 'string' ? new Date(a.startTime) : a.startTime;
      const bTime = typeof b.startTime === 'string' ? new Date(b.startTime) : b.startTime;
      return aTime.getTime() - bTime.getTime();
    });

  // Generate AI insights for an appointment
  const generateAIInsights = async (event: CalendarEvent) => {
    setIsAnalyzing(true);
    
    try {
      const response = await fetch('/api/ai/appointment-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appointment: {
            title: event.title,
            clientName: event.clientName,
            date: date.toISOString(),
            startTime: event.startTime,
            endTime: event.endTime,
            status: event.status,
            notes: event.notes,
            location: event.location,
            sessionNotes
          }
        })
      });

      if (response.ok) {
        const insights = await response.json();
        setAiInsights(insights);
      }
    } catch (error) {
      console.error('Failed to generate AI insights:', error);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleEventClick = async (event: CalendarEvent) => {
    setSelectedEvent(event);
    setAiInsights(null);
    setExistingProgressNotes([]);
    setSessionPrepNotes(null);
    setIsLoadingAppointmentData(true);
    
    try {
      // Load existing progress notes linked to this appointment
      const progressResponse = await fetch(`/api/progress-notes/appointment/${event.id}`);
      if (progressResponse.ok) {
        const progressNotes = await progressResponse.json();
        setExistingProgressNotes(progressNotes);
      }

      // Load session prep notes for this appointment
      const prepResponse = await fetch(`/api/session-prep/appointment/${event.id}`);
      if (prepResponse.ok) {
        const prepData = await prepResponse.json();
        setSessionPrepNotes(prepData);
      }

      // Try to load existing session notes from database
      const sessionResponse = await fetch(`/api/session-notes/${event.id}`);
      if (sessionResponse.ok) {
        const existingNotes = await sessionResponse.json();
        if (existingNotes.length > 0) {
          // Use the most recent note
          const latestNote = existingNotes[0];
          setSessionNotes(latestNote.content);
        } else {
          setSessionNotes(event.notes || '');
        }
      } else {
        setSessionNotes(event.notes || '');
      }
    } catch (error) {
      // Silently handle loading errors - calendar events may not have associated data
      setSessionNotes(event.notes || '');
    } finally {
      setIsLoadingAppointmentData(false);
    }
  };

  const saveSessionNotes = async () => {
    if (!selectedEvent) return;

    try {
      // Saving session notes for event
      const response = await fetch('/api/session-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          eventId: selectedEvent.id,
          content: sessionNotes,
          date: date.toISOString(),
          clientName: selectedEvent.clientName
        })
      });

      // Save response received
      
      if (response.ok) {
        const result = await response.json();
        // Session notes saved successfully
        
        // Update the event locally to show it has notes
        const updatedEvent = { ...selectedEvent, notes: sessionNotes };
        setSelectedEvent(updatedEvent);
        
        // Show success feedback with timestamp
        const timestamp = new Date().toLocaleTimeString();
        toast({ title: "Session notes saved successfully" });
        
        // Update the visual state to show notes are saved
        // Notes saved and UI updated
      } else {
        const errorText = await response.text();
        console.error('Failed to save session notes:', response.status, errorText);
        toast({ title: "Failed to save session notes", variant: "destructive" });
      }
    } catch (error) {
      console.error('Network error saving session notes:', error);
      toast({ title: "Network error saving session notes", variant: "destructive" });
    }
  };

  const saveAIInsights = async () => {
    if (!selectedEvent || !aiInsights) return;

    try {
      const insightsText = [
        aiInsights.summary && `Summary: ${aiInsights.summary}`,
        aiInsights.suggestedQuestions?.length && `Suggested Questions:\n${aiInsights.suggestedQuestions.map(q => `• ${q}`).join('\n')}`,
        aiInsights.progressIndicators?.length && `Progress Indicators:\n${aiInsights.progressIndicators.map(p => `✓ ${p}`).join('\n')}`,
        aiInsights.recommendedFollowUp?.length && `Follow-up Actions:\n${aiInsights.recommendedFollowUp.map(a => `→ ${a}`).join('\n')}`
      ].filter(Boolean).join('\n\n');

      const response = await fetch(`/api/ai-insights/${selectedEvent.id}/save`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          insights: insightsText,
          clientId: selectedEvent.clientId || 'default-client',
          therapistId: 'default-therapist'
        })
      });

      if (response.ok) {
        toast({ title: "AI insights saved as session note" });
      } else {
        throw new Error('Failed to save AI insights');
      }
    } catch (error) {
      console.error('Error saving AI insights:', error);
      toast({ title: "Failed to save AI insights", variant: "destructive" });
    }
  };

  const handleDragStart = (e: React.DragEvent, event: CalendarEvent) => {
    e.dataTransfer.setData('application/json', JSON.stringify(event));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = async (e: React.DragEvent, targetTime: string) => {
    e.preventDefault();
    
    try {
      const eventData = JSON.parse(e.dataTransfer.getData('application/json'));
      const [hours, minutes] = targetTime.split(':').map(Number);
      
      const newStartTime = new Date(date);
      newStartTime.setHours(hours, minutes, 0, 0);
      
      // Calculate duration from original event
      const originalStart = new Date(eventData.startTime);
      const originalEnd = new Date(eventData.endTime);
      const duration = originalEnd.getTime() - originalStart.getTime();
      
      const newEndTime = new Date(newStartTime.getTime() + duration);

      // Update Google Calendar
      const response = await fetch(`/api/calendar/events/${eventData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          calendarId: eventData.calendarId || 'primary',
          summary: eventData.title,
          start: {
            dateTime: newStartTime.toISOString()
          },
          end: {
            dateTime: newEndTime.toISOString()
          },
          location: eventData.location
        })
      });

      if (response.ok) {
        // Trigger events refresh
        window.location.reload(); // Simple refresh - could be more sophisticated
      }
    } catch (error) {
      console.error('Failed to move appointment:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status?.toLowerCase()) {
      case 'confirmed': return 'bg-blue-100 text-blue-800';
      case 'completed': return 'bg-green-100 text-green-800';
      case 'cancelled': return 'bg-red-100 text-red-800';
      case 'no-show': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const formatTime = (dateTime: Date | string) => {
    const date = dateTime instanceof Date ? dateTime : new Date(dateTime);
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      hour12: false 
    });
  };

  const getEventDuration = (event: CalendarEvent) => {
    if (!event.endTime || !event.startTime) return 'Duration unknown';
    
    const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const end = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    return `${minutes} minutes`;
  };

  // Get location default based on day of week
  const getDefaultLocationForDate = (date: Date) => {
    const dayOfWeek = date.getDay();
    switch (dayOfWeek) {
      case 1: return 'Woodbury';
      case 2: return 'Telehealth';
      case 3:
      case 4:
      case 5: return 'Rockville Centre';
      default: return 'Remote/Office';
    }
  };

  // Generate time slots from 6:00 AM to 11:30 PM
  const generateTimeSlots = () => {
    const slots = [];
    for (let hour = 6; hour < 24; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < 23) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  };

  const timeSlots = generateTimeSlots();

  return (
    <div className="daily-view-container h-full flex flex-col">
      {/* Daily Header */}
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" onClick={onPreviousDay} size="sm">
            <ChevronLeft className="w-4 h-4" />
          </Button>
          
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {date.toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'long', 
                day: 'numeric', 
                year: 'numeric' 
              })}
            </h2>
            <p className="text-sm text-gray-600">
              {dayEvents.length} appointments • {getDefaultLocationForDate(date)}
            </p>
          </div>
          
          <Button variant="outline" onClick={onNextDay} size="sm">
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
        
        <Button onClick={onNewAppointment} className="bg-blue-600 hover:bg-blue-700 text-white">
          <Plus className="w-4 h-4 mr-2" />
          New Appointment
        </Button>
      </div>

      {/* Daily Schedule Grid */}
      <div className="flex-1 bg-white border rounded-lg overflow-hidden">
        <div className="grid grid-cols-[60px_1fr] h-full">
          {/* Time Column */}
          <div className="bg-gray-50 border-r">
            <div className="h-12 border-b bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-600">
              TIME
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              {timeSlots.map((time) => (
                <div key={time} className="h-12 border-b border-gray-200 flex items-center justify-center text-xs text-gray-600 font-mono">
                  {time}
                </div>
              ))}
            </ScrollArea>
          </div>

          {/* Appointments Column */}
          <div className="relative">
            <div className="h-12 border-b bg-gray-100 flex items-center justify-center text-xs font-medium text-gray-700">
              {date.toLocaleDateString('en-US', { weekday: 'short', month: 'numeric', day: 'numeric', year: 'numeric' })}
            </div>
            <ScrollArea className="h-[calc(100%-48px)]">
              <div className="relative">
                {timeSlots.map((time, index) => {
                  const slotEvents = dayEvents.filter(event => {
                    const eventStart = typeof event.startTime === 'string' ? new Date(event.startTime) : event.startTime;
                    const slotTime = `${eventStart.getHours().toString().padStart(2, '0')}:${eventStart.getMinutes().toString().padStart(2, '0')}`;
                    return slotTime === time;
                  });

                  return (
                    <div 
                      key={time} 
                      className="h-12 border-b border-gray-100 hover:bg-blue-50 cursor-pointer relative"
                      onClick={() => onTimeSlotClick?.(date, time)}
                      onDragOver={handleDragOver}
                      onDrop={(e) => handleDrop(e, time)}
                    >
                      {slotEvents.map((event) => {
                        const duration = event.endTime && event.startTime ? 
                          Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60)) : 60;
                        const slots = Math.max(1, Math.round(duration / 30));
                        
                        return (
                          <div
                            key={event.id}
                            className="absolute inset-x-1 bg-white border border-gray-300 rounded-sm cursor-move hover:shadow-md transition-shadow p-1"
                            style={{
                              height: `${slots * 48 - 4}px`,
                              top: '2px',
                              zIndex: 10
                            }}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, event)}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEventClick(event);
                            }}
                          >
                            <div className="h-full flex flex-col justify-between text-xs">
                              <div className="font-semibold text-gray-900 leading-tight">
                                {event.clientName || cleanEventTitle(event.title)}
                              </div>
                              <div className="text-blue-600 text-xs leading-tight">
                                {event.calendarName?.includes('Simple Practice') ? 'SimplePractice' : 'Google Calendar'} | {event.location || getDefaultLocationForDate(date)}
                              </div>
                              <div className="text-gray-600 text-xs leading-tight">
                                {formatTime(event.startTime)} - {event.endTime ? formatTime(event.endTime) : 'Open'}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </div>

      {/* Enhanced Appointment Modal with AI Integration */}
      <Dialog open={!!selectedEvent} onOpenChange={() => setSelectedEvent(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <User className="w-5 h-5" />
              {selectedEvent?.clientName || cleanEventTitle(selectedEvent?.title || '')}
            </DialogTitle>
            <DialogDescription>
              {selectedEvent && formatTime(selectedEvent.startTime)} - {selectedEvent?.endTime && formatTime(selectedEvent.endTime)} • {selectedEvent?.location || getDefaultLocationForDate(date)}
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Loading State */}
              {isLoadingAppointmentData && (
                <div className="text-center py-4">
                  <div className="inline-flex items-center gap-2 text-blue-600">
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                    Loading appointment data...
                  </div>
                </div>
              )}

              {/* Existing Progress Notes from Document Processing */}
              {existingProgressNotes.length > 0 && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h4 className="font-medium text-green-900 mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Progress Notes from Document Processing ({existingProgressNotes.length})
                  </h4>
                  {existingProgressNotes.map((note, index) => (
                    <div key={note.id} className="mb-4 last:mb-0">
                      <div className="text-sm text-green-800 font-medium mb-2">{note.title}</div>
                      {note.narrativeSummary && (
                        <div className="text-sm text-green-700 mb-2">
                          <strong>Summary:</strong> {note.narrativeSummary}
                        </div>
                      )}
                      {note.keyPoints && note.keyPoints.length > 0 && (
                        <div className="text-sm text-green-700 mb-2">
                          <strong>Key Points:</strong> {Array.isArray(note.keyPoints) ? note.keyPoints.join(', ') : note.keyPoints}
                        </div>
                      )}
                      {note.tonalAnalysis && (
                        <div className="text-sm text-green-700 mb-2">
                          <strong>Tonal Analysis:</strong> {note.tonalAnalysis}
                        </div>
                      )}
                      <div className="text-xs text-green-600">
                        Generated: {new Date(note.sessionDate || note.createdAt).toLocaleDateString()}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Session Prep Notes for This Appointment */}
              {sessionPrepNotes && (
                <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                  <h4 className="font-medium text-purple-900 mb-3 flex items-center gap-2">
                    <Brain className="w-4 h-4" />
                    AI Session Prep Insights
                  </h4>
                  <div className="text-sm text-purple-800 whitespace-pre-wrap">
                    {sessionPrepNotes.prepContent || sessionPrepNotes.aiGeneratedInsights}
                  </div>
                  {sessionPrepNotes.keyFocusAreas && sessionPrepNotes.keyFocusAreas.length > 0 && (
                    <div className="mt-3 text-sm text-purple-700">
                      <strong>Focus Areas:</strong> {sessionPrepNotes.keyFocusAreas.join(', ')}
                    </div>
                  )}
                </div>
              )}

              {/* Session Notes */}
              <div>
                <label className="text-sm font-medium text-gray-700 mb-2 block">
                  Session Notes {existingProgressNotes.length > 0 || sessionPrepNotes ? '(Add New Notes)' : ''}
                </label>
                <Textarea
                  value={sessionNotes}
                  onChange={(e) => setSessionNotes(e.target.value)}
                  placeholder="Add your session notes here..."
                  className="min-h-[120px]"
                />
              </div>

              {/* AI Insights Section */}
              <div className="border-t pt-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-blue-600" />
                    AI Therapy Assistant
                  </h3>
                  <Button
                    onClick={() => generateAIInsights(selectedEvent!)}
                    disabled={isAnalyzing}
                    variant="outline"
                    size="sm"
                  >
                    <Brain className="w-4 h-4 mr-2" />
                    {isAnalyzing ? 'Analyzing...' : 'Generate Insights'}
                  </Button>
                </div>

                {aiInsights && (
                  <div className="space-y-4">
                    {/* Session Summary */}
                    {aiInsights.summary && (
                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                          <FileText className="w-4 h-4" />
                          Session Summary
                        </h4>
                        <p className="text-blue-800 text-sm">{aiInsights.summary}</p>
                      </div>
                    )}

                    {/* Suggested Questions */}
                    {aiInsights.suggestedQuestions?.length > 0 && (
                      <div className="bg-purple-50 p-4 rounded-lg">
                        <h4 className="font-medium text-purple-900 mb-2 flex items-center gap-2">
                          <MessageSquare className="w-4 h-4" />
                          Suggested Questions for Next Session
                        </h4>
                        <ul className="space-y-1">
                          {aiInsights.suggestedQuestions.map((question, index) => (
                            <li key={index} className="text-purple-800 text-sm flex items-start gap-2">
                              <span className="text-purple-400 mt-1">•</span>
                              {question}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Progress Indicators */}
                    {aiInsights.progressIndicators?.length > 0 && (
                      <div className="bg-green-50 p-4 rounded-lg">
                        <h4 className="font-medium text-green-900 mb-2 flex items-center gap-2">
                          <TrendingUp className="w-4 h-4" />
                          Progress Indicators
                        </h4>
                        <ul className="space-y-1">
                          {aiInsights.progressIndicators.map((indicator, index) => (
                            <li key={index} className="text-green-800 text-sm flex items-start gap-2">
                              <span className="text-green-400 mt-1">✓</span>
                              {indicator}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Follow-up Recommendations */}
                    {aiInsights.recommendedFollowUp?.length > 0 && (
                      <div className="bg-orange-50 p-4 rounded-lg">
                        <h4 className="font-medium text-orange-900 mb-2 flex items-center gap-2">
                          <Target className="w-4 h-4" />
                          Recommended Follow-up Actions
                        </h4>
                        <ul className="space-y-1">
                          {aiInsights.recommendedFollowUp.map((action, index) => (
                            <li key={index} className="text-orange-800 text-sm flex items-start gap-2">
                              <span className="text-orange-400 mt-1">→</span>
                              {action}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex justify-between pt-4 border-t">
                <Button variant="outline" onClick={() => setSelectedEvent(null)}>
                  Close
                </Button>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={saveSessionNotes}>
                    <FileText className="w-4 h-4 mr-2" />
                    Save Notes
                  </Button>
                  {aiInsights && (
                    <Button variant="outline" onClick={saveAIInsights}>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Save AI Insights
                    </Button>
                  )}
                  <Button>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Action Item
                  </Button>
                </div>
                
                {/* Save Status Indicator */}
                {sessionNotes.trim() && (
                  <div className="text-xs text-gray-500 mt-2 flex items-center gap-1">
                    <FileText className="w-3 h-3" />
                    Notes ready to save ({sessionNotes.length} characters)
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        </DialogContent>
      </Dialog>

      {/* Appointment Summary Dialog */}
      {selectedEvent && (
        <AppointmentSummary eventId={selectedEvent.id} />
      )}
    </div>
  );
};