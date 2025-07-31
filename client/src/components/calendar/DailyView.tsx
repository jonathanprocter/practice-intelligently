import { useState } from 'react';
import { CalendarEvent } from '../../types/calendar';
import { cleanEventTitle, formatClientName } from '../../utils/textCleaner';
import { analyzeContent } from '../../utils/aiServices';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Clock, MapPin, User, FileText, Brain, Calendar } from 'lucide-react';

interface DailyViewProps {
  date: Date;
  events: CalendarEvent[];
  onEventClick: (event: CalendarEvent) => void;
  onEventUpdate: (eventId: string, updates: Partial<CalendarEvent>) => void;
}

export const DailyView = ({ date, events, onEventClick, onEventUpdate }: DailyViewProps) => {
  const [analyzingEvent, setAnalyzingEvent] = useState<string | null>(null);
  const [insights, setInsights] = useState<Record<string, any>>({});

  // Filter and sort events for the selected date
  const dayEvents = events
    .filter(event => {
      const eventStart = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
      return eventStart.toDateString() === date.toDateString();
    })
    .sort((a, b) => {
      const aTime = a.startTime instanceof Date ? a.startTime : new Date(a.startTime);
      const bTime = b.startTime instanceof Date ? b.startTime : new Date(b.startTime);
      return aTime.getTime() - bTime.getTime();
    });

  // Generate AI insights for an event
  const handleAnalyzeEvent = async (event: CalendarEvent) => {
    if (analyzingEvent) return;
    
    setAnalyzingEvent(event.id);
    
    try {
      const analysisContent = `
        Appointment Details:
        Title: ${event.title}
        Client: ${event.clientName}
        Date: ${date.toDateString()}
        Time: ${event.startTime instanceof Date ? event.startTime.toLocaleTimeString() : 'Unknown'}
        Duration: ${event.endTime && event.startTime ? 
          Math.round((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60)) + ' minutes' : 'Unknown'}
        Status: ${event.status}
        Notes: ${event.notes || 'No notes available'}
        Location: ${event.location || 'Not specified'}
      `;
      
      const analysis = await analyzeContent(analysisContent, 'session');
      setInsights(prev => ({ ...prev, [event.id]: analysis }));
    } catch (error) {
      console.error('Failed to analyze event:', error);
    } finally {
      setAnalyzingEvent(null);
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
      hour: 'numeric', 
      minute: '2-digit', 
      hour12: true 
    });
  };

  const getEventDuration = (event: CalendarEvent) => {
    if (!event.endTime || !event.startTime) return 'Duration unknown';
    
    const start = event.startTime instanceof Date ? event.startTime : new Date(event.startTime);
    const end = event.endTime instanceof Date ? event.endTime : new Date(event.endTime);
    const minutes = Math.round((end.getTime() - start.getTime()) / (1000 * 60));
    
    return `${minutes} minutes`;
  };

  return (
    <div className="daily-view-container space-y-6">
      {/* Daily Header */}
      <div className="flex justify-between items-start">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {date.toLocaleDateString('en-US', { 
              weekday: 'long', 
              month: 'long', 
              day: 'numeric', 
              year: 'numeric' 
            })}
          </h2>
          <p className="text-gray-600 mt-1">
            {dayEvents.length} {dayEvents.length === 1 ? 'appointment' : 'appointments'} scheduled
          </p>
        </div>
        
        <div className="flex gap-2">
          <Badge variant="outline" className="bg-blue-50 text-blue-700">
            Daily View
          </Badge>
        </div>
      </div>

      {/* Daily Statistics */}
      <div className="grid grid-cols-4 gap-4">
        {[
          { label: 'Total', value: dayEvents.length, color: 'bg-gray-100' },
          { label: 'Confirmed', value: dayEvents.filter(e => e.status === 'confirmed').length, color: 'bg-blue-100' },
          { label: 'Completed', value: dayEvents.filter(e => e.status === 'completed').length, color: 'bg-green-100' },
          { label: 'Cancelled', value: dayEvents.filter(e => e.status === 'cancelled').length, color: 'bg-red-100' },
        ].map((stat) => (
          <div key={stat.label} className={`${stat.color} p-3 rounded-lg text-center`}>
            <div className="text-2xl font-bold">{stat.value}</div>
            <div className="text-sm text-gray-600">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Events List */}
      <div className="space-y-4">
        {dayEvents.length === 0 ? (
          <Card className="p-8 text-center">
            <div className="text-gray-500">
              <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No appointments scheduled for this day</p>
              <p className="text-sm mt-2">Click on a time slot in the weekly view to schedule an appointment</p>
            </div>
          </Card>
        ) : (
          dayEvents.map((event) => (
            <Card 
              key={event.id} 
              className="cursor-pointer hover:shadow-md transition-shadow"
              onClick={() => onEventClick(event)}
            >
              <CardHeader className="pb-3">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <CardTitle className="text-lg">
                      {cleanEventTitle(event.title)}
                    </CardTitle>
                    <div className="flex items-center gap-4 mt-2 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        {formatTime(event.startTime)} - {event.endTime ? formatTime(event.endTime) : 'Open'}
                      </div>
                      <div className="flex items-center gap-1">
                        <User className="w-4 h-4" />
                        {getEventDuration(event)}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Badge className={getStatusColor(event.status || 'pending')}>
                      {event.status || 'Pending'}
                    </Badge>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAnalyzeEvent(event);
                      }}
                      disabled={analyzingEvent === event.id}
                    >
                      <Brain className="w-4 h-4 mr-1" />
                      {analyzingEvent === event.id ? 'Analyzing...' : 'AI Insights'}
                    </Button>
                  </div>
                </div>
              </CardHeader>
              
              <CardContent className="pt-0">
                <div className="grid grid-cols-2 gap-4">
                  {/* Client Information */}
                  {event.clientName && (
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        <User className="w-4 h-4" />
                        Client
                      </div>
                      <p className="text-sm">{formatClientName(event.clientName)}</p>
                    </div>
                  )}

                  {/* Location */}
                  {event.location && (
                    <div>
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        <MapPin className="w-4 h-4" />
                        Location
                      </div>
                      <p className="text-sm">{event.location}</p>
                    </div>
                  )}

                  {/* Session Notes */}
                  {event.notes && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-1">
                        <FileText className="w-4 h-4" />
                        Notes
                      </div>
                      <p className="text-sm text-gray-600 bg-gray-50 p-2 rounded">
                        {event.notes}
                      </p>
                    </div>
                  )}

                  {/* AI Insights */}
                  {insights[event.id] && (
                    <div className="col-span-2">
                      <div className="flex items-center gap-1 text-sm font-medium text-gray-700 mb-2">
                        <Brain className="w-4 h-4" />
                        AI Analysis
                      </div>
                      <div className="bg-blue-50 p-3 rounded-lg space-y-2">
                        {insights[event.id].insights && insights[event.id].insights.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Key Insights:</p>
                            <ul className="text-xs text-blue-700 space-y-1">
                              {insights[event.id].insights.slice(0, 2).map((insight: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-blue-400 mt-1">•</span>
                                  {insight}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        {insights[event.id].recommendations && insights[event.id].recommendations.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-blue-800 mb-1">Recommendations:</p>
                            <ul className="text-xs text-blue-700 space-y-1">
                              {insights[event.id].recommendations.slice(0, 2).map((rec: string, idx: number) => (
                                <li key={idx} className="flex items-start gap-1">
                                  <span className="text-blue-400 mt-1">→</span>
                                  {rec}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
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
};