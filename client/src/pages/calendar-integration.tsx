import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Calendar, 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  Clock,
  Database,
  Cloud,
  Settings,
  Info
} from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

interface CalendarEvent {
  id: string;
  summary: string;
  description?: string;
  start: { dateTime: string; timeZone?: string };
  end: { dateTime: string; timeZone?: string };
  status: string;
  calendarId?: string;
  calendarName?: string;
  location?: string;
  attendees?: { email: string; displayName?: string }[];
}

export default function CalendarIntegration() {
  const [syncingEvents, setSyncingEvents] = useState(false);
  const [eventSource, setEventSource] = useState<'database' | 'live'>('database');
  const [urlMessage, setUrlMessage] = useState<{type: 'success' | 'error', message: string} | null>(null);
  const queryClient = useQueryClient();

  // Check URL parameters for messages from OAuth callback
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const error = urlParams.get('error');
    const success = urlParams.get('success');
    const message = urlParams.get('message');

    if (error && message) {
      setUrlMessage({ type: 'error', message: decodeURIComponent(message) });
    } else if (success && message) {
      setUrlMessage({ type: 'success', message: decodeURIComponent(message) });
    }

    // Clear URL parameters after reading them
    if (error || success) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Check Google Calendar connection status
  const { data: connectionStatus, refetch: refetchStatus } = useQuery({
    queryKey: ['google-calendar-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/google/status');
      return response.json();
    }
  });

  // Fetch calendar events
  const { data: events = [], isLoading: eventsLoading, refetch: refetchEvents } = useQuery({
    queryKey: ['calendar-events', eventSource],
    queryFn: async () => {
      const endpoint = eventSource === 'database' 
        ? '/api/calendar/events/local'
        : '/api/calendar/events/hybrid?source=live';
      
      const response = await fetch(endpoint);
      if (!response.ok) {
        throw new Error('Failed to fetch events');
      }
      return response.json();
    },
    enabled: connectionStatus?.connected
  });

  // Sync calendar mutation
  const syncMutation = useMutation({
    mutationFn: async () => {
      setSyncingEvents(true);
      return apiRequest('POST', '/api/calendar/sync', {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      setSyncingEvents(false);
    },
    onError: () => {
      setSyncingEvents(false);
    }
  });

  const connectToGoogle = () => {
    window.location.href = '/api/auth/google';
  };

  const formatEventTime = (dateTimeStr: string) => {
    return new Date(dateTimeStr).toLocaleString();
  };

  const getRedirectURI = () => {
    return `${window.location.origin}/api/auth/google/callback`;
  };

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Calendar Integration</h1>
          <p className="text-gray-600 mt-2">Manage your calendar connection and sync events</p>
        </div>
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetchStatus()}
          >
            <RefreshCw className="w-4 h-4 mr-2" />
            Refresh Status
          </Button>
        </div>
      </div>

      {/* URL Message Alert */}
      {urlMessage && (
        <Alert className={urlMessage.type === 'error' ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}>
          <AlertDescription className={urlMessage.type === 'error' ? 'text-red-800' : 'text-green-800'}>
            {urlMessage.type === 'error' ? (
              <XCircle className="w-4 h-4 inline mr-2" />
            ) : (
              <CheckCircle className="w-4 h-4 inline mr-2" />
            )}
            {urlMessage.message}
          </AlertDescription>
        </Alert>
      )}

      {/* Connection Status Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="w-5 h-5" />
            Connection Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                connectionStatus?.connected ? 'bg-green-100' : 'bg-gray-100'
              }`}>
                {connectionStatus?.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-gray-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <p className="text-sm text-gray-600">
                  {connectionStatus?.connected 
                    ? 'Connected and ready to sync' 
                    : 'Not connected - click to authorize'
                  }
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant={connectionStatus?.connected ? "default" : "outline"}>
                {connectionStatus?.connected ? 'Connected' : 'Disconnected'}
              </Badge>
              {!connectionStatus?.connected && (
                <Button onClick={connectToGoogle}>
                  Connect to Google
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* OAuth Configuration Info */}
      <Alert>
        <Info className="h-4 w-4" />
        <AlertDescription>
          <strong>Google Cloud Console Setup Required:</strong>
          <br />
          Add this redirect URI to your Google Cloud Console OAuth credentials: 
          <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-sm">
            {getRedirectURI()}
          </code>
        </AlertDescription>
      </Alert>

      {connectionStatus?.connected && (
        <>
          {/* Calendar Management */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <RefreshCw className="w-5 h-5" />
                Calendar Management
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Event Data Source</h4>
                  <p className="text-sm text-gray-600">Choose between database cache or live API</p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant={eventSource === 'database' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSource('database')}
                  >
                    <Database className="w-4 h-4 mr-2" />
                    Database
                  </Button>
                  <Button
                    variant={eventSource === 'live' ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setEventSource('live')}
                  >
                    <Cloud className="w-4 h-4 mr-2" />
                    Live API
                  </Button>
                </div>
              </div>

              <div className="flex items-center justify-between p-4 border rounded-lg">
                <div>
                  <h4 className="font-medium">Sync Calendar Events</h4>
                  <p className="text-sm text-gray-600">Import all events from Google Calendar to database</p>
                </div>
                <Button
                  onClick={() => syncMutation.mutate()}
                  disabled={syncingEvents || syncMutation.isPending}
                >
                  {syncingEvents || syncMutation.isPending ? (
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4 mr-2" />
                  )}
                  Sync Now
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Events Display */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Calendar Events
                <Badge variant="outline" className="ml-2">
                  {eventSource === 'database' ? 'From Database' : 'Live API'}
                </Badge>
              </CardTitle>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchEvents()}
                  disabled={eventsLoading}
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${eventsLoading ? 'animate-spin' : ''}`} />
                  Refresh Events
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {eventsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <RefreshCw className="w-6 h-6 animate-spin mr-2" />
                  Loading events...
                </div>
              ) : events.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No calendar events found
                </div>
              ) : (
                <div className="space-y-3">
                  {events.slice(0, 10).map((event: CalendarEvent) => (
                    <div
                      key={event.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                    >
                      <div className="flex-1">
                        <h4 className="font-medium">{event.summary}</h4>
                        {event.description && (
                          <p className="text-sm text-gray-600 mt-1">{event.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500">
                          <span>{formatEventTime(event.start.dateTime)}</span>
                          {event.calendarName && (
                            <Badge variant="outline" className="text-xs">
                              {event.calendarName}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <Badge variant={event.status === 'confirmed' ? 'default' : 'outline'}>
                        {event.status}
                      </Badge>
                    </div>
                  ))}
                  {events.length > 10 && (
                    <div className="text-center py-2 text-sm text-gray-500">
                      Showing first 10 of {events.length} events
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}