import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Calendar, Clock, MapPin, CheckCircle, AlertCircle, FileText } from 'lucide-react';

interface AppointmentSummaryProps {
  eventId: string;
}

interface NextAppointmentSummary {
  notes: {
    content: string;
    aiSummary?: string;
    createdAt: Date;
  }[];
  actionItems: {
    id: string;
    title: string;
    description: string;
    priority: 'low' | 'medium' | 'high';
    dueDate: Date;
    status: string;
  }[];
  nextAppointment: {
    eventId: string;
    summary: string;
    startTime: Date;
    endTime: Date;
    location: string;
  } | null;
}

export function AppointmentSummary({ eventId }: AppointmentSummaryProps) {
  const { data: summary, isLoading } = useQuery<NextAppointmentSummary>({
    queryKey: ['/api/appointments', eventId, 'next-summary'],
    enabled: !!eventId
  });

  if (isLoading) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Loading Appointment Summary...
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse space-y-2">
            <div className="h-4 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!summary) {
    return null;
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'low': return 'bg-green-100 text-green-800 border-green-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="space-y-4">
      {/* Session Notes Summary */}
      {summary.notes.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="w-5 h-5" />
              Session Notes ({summary.notes.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {summary.notes.map((note, index) => (
              <div key={index} className="border-l-4 border-blue-500 pl-4 py-2">
                {note.aiSummary && (
                  <div className="mb-2 p-2 bg-blue-50 rounded-lg">
                    <p className="text-sm font-medium text-blue-900 mb-1">AI Summary:</p>
                    <p className="text-sm text-blue-800">{note.aiSummary}</p>
                  </div>
                )}
                <div className="text-sm text-gray-600 line-clamp-3">
                  {note.content.length > 200 
                    ? `${note.content.substring(0, 200)}...` 
                    : note.content
                  }
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  {new Date(note.createdAt).toLocaleDateString()}
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Action Items */}
      {summary.actionItems.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="w-5 h-5" />
              Outstanding Action Items ({summary.actionItems.length})
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {summary.actionItems.map((item) => (
              <div key={item.id} className="flex items-start gap-3 p-3 bg-gray-50 rounded-lg">
                <AlertCircle className="w-4 h-4 mt-0.5 text-orange-500" />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-sm">{item.title}</h4>
                    <Badge className={getPriorityColor(item.priority)}>
                      {item.priority}
                    </Badge>
                  </div>
                  {item.description && (
                    <p className="text-sm text-gray-600 mb-2">{item.description}</p>
                  )}
                  <p className="text-xs text-gray-500">
                    Due: {new Date(item.dueDate).toLocaleDateString()}
                  </p>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Next Appointment */}
      {summary.nextAppointment && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              Next Scheduled Appointment
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <h4 className="font-medium">{summary.nextAppointment.summary}</h4>
              <div className="flex items-center gap-4 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Clock className="w-4 h-4" />
                  {new Date(summary.nextAppointment.startTime).toLocaleString()}
                </div>
                <div className="flex items-center gap-1">
                  <MapPin className="w-4 h-4" />
                  {summary.nextAppointment.location}
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="mt-2"
                onClick={() => window.location.href = `/calendar?date=${new Date(summary.nextAppointment!.startTime).toISOString().split('T')[0]}`}
              >
                View Appointment
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Empty State */}
      {summary.notes.length === 0 && summary.actionItems.length === 0 && !summary.nextAppointment && (
        <Card>
          <CardContent className="text-center py-8">
            <FileText className="w-12 h-12 text-gray-400 mx-auto mb-3" />
            <p className="text-gray-600">No session notes or action items found for this appointment.</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}