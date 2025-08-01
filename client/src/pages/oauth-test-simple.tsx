
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, RefreshCw, Calendar } from 'lucide-react';

export default function OAuthTestSimple() {
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<any[]>([]);

  const checkStatus = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/auth/google/status');
      const data = await response.json();
      setStatus(data);
      console.log('Connection status:', data);
    } catch (error) {
      console.error('Error checking status:', error);
      setStatus({ connected: false, error: 'Failed to check status' });
    } finally {
      setLoading(false);
    }
  };

  const testEvents = async () => {
    try {
      const response = await fetch('/api/calendar/events');
      if (response.ok) {
        const data = await response.json();
        setEvents(data.slice(0, 5));
        console.log('Events:', data);
      } else {
        console.error('Failed to fetch events:', response.status);
      }
    } catch (error) {
      console.error('Error fetching events:', error);
    }
  };

  useEffect(() => {
    checkStatus();
  }, []);

  const connectGoogle = () => {
    console.log('Initiating Google OAuth...');
    window.location.href = '/api/auth/google';
  };

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Google Calendar OAuth Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div className="flex items-center gap-3">
              {status?.connected ? (
                <CheckCircle className="w-6 h-6 text-green-600" />
              ) : (
                <XCircle className="w-6 h-6 text-red-600" />
              )}
              <div>
                <h4 className="font-medium">Connection Status</h4>
                <p className="text-sm text-gray-600">
                  {status?.connected ? 'Connected' : 'Not connected'}
                </p>
              </div>
            </div>
            <Badge variant={status?.connected ? 'default' : 'destructive'}>
              {status?.connected ? 'Connected' : 'Disconnected'}
            </Badge>
          </div>

          {/* Current Domain Info */}
          <Alert>
            <AlertDescription>
              <strong>Current Domain:</strong> {window.location.origin}
              <br />
              <strong>Callback URL:</strong> {window.location.origin}/api/auth/google/callback
            </AlertDescription>
          </Alert>

          {/* Action Buttons */}
          <div className="grid grid-cols-1 gap-2">
            <Button onClick={checkStatus} disabled={loading} variant="outline">
              <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Check Status
            </Button>
            
            <Button onClick={connectGoogle} disabled={status?.connected}>
              <Calendar className="w-4 h-4 mr-2" />
              Connect Google Calendar
            </Button>
            
            {status?.connected && (
              <Button onClick={testEvents} variant="secondary">
                Test Fetch Events
              </Button>
            )}
          </div>

          {/* Events Display */}
          {events.length > 0 && (
            <div className="space-y-2">
              <h4 className="font-medium">Sample Events:</h4>
              {events.map((event, index) => (
                <div key={index} className="p-2 border rounded text-sm">
                  <strong>{event.summary}</strong>
                  <br />
                  {new Date(event.start.dateTime).toLocaleString()}
                </div>
              ))}
            </div>
          )}

          {/* Debug Info */}
          {status && (
            <details className="text-xs">
              <summary>Debug Info</summary>
              <pre className="mt-2 p-2 bg-gray-100 rounded overflow-auto">
                {JSON.stringify(status, null, 2)}
              </pre>
            </details>
          )}

        </CardContent>
      </Card>
    </div>
  );
}
