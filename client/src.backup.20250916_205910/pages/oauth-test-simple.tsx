import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, XCircle, Calendar, RefreshCw, LogOut } from 'lucide-react';
import { apiRequest } from '@/lib/queryClient';

export default function OAuthTestSimple() {
  interface TokenInfo {
    access_token?: string;
    refresh_token?: string;
    expiry_date?: number;
  }

  interface CalendarEvent {
    id: string;
    summary: string;
    start: { dateTime?: string; date?: string };
    end: { dateTime?: string; date?: string };
  }

  interface DebugInfo {
    hasTokens: boolean;
    tokenFile: boolean;
    credentials: boolean;
    [key: string]: unknown;
  }

  const [tokens, setTokens] = useState<TokenInfo | null>(null);
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [debugInfo, setDebugInfo] = useState<DebugInfo | null>(null);
  const [testLogs, setTestLogs] = useState<string[]>([]);
  const queryClient = useQueryClient();

  const addLog = (message: string) => {
    const timestamp = new Date().toLocaleTimeString();
    setTestLogs(prev => [...prev, `[${timestamp}] ${message}`]);
  };

  // Check connection status
  const { data: status, refetch: refetchStatus, isLoading } = useQuery({
    queryKey: ['oauth-status'],
    queryFn: async () => {
      const response = await fetch('/api/auth/google/status');
      return response.json();
    },
    refetchInterval: 5000 // Check every 5 seconds
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: () => apiRequest('/api/auth/google/disconnect', 'POST'),
    onSuccess: () => {
      addLog('Successfully disconnected from Google Calendar');
      queryClient.invalidateQueries({ queryKey: ['oauth-status'] });
    },
    onError: (error: any) => {
      addLog(`Disconnect failed: ${error.message}`);
    }
  });

  // Test calendar access
  const testCalendarAccess = async () => {
    addLog('Testing calendar access...');
    try {
      const response = await fetch('/api/calendar/calendars');
      const data = await response.json();

      if (response.ok) {
        addLog(`✅ Calendar access successful! Found ${data.length} calendars`);
        data.forEach((cal: any, index: number) => {
          addLog(`  ${index + 1}. ${cal.summary} (${cal.id})`);
        });
      } else {
        addLog(`❌ Calendar access failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Calendar test error: ${error.message}`);
    }
  };

  // Test events access
  const testEventsAccess = async () => {
    addLog('Testing events access...');
    try {
      const response = await fetch('/api/calendar/events?timeMin=' + new Date().toISOString());
      const data = await response.json();

      if (response.ok) {
        addLog(`✅ Events access successful! Found ${data.length} events`);
        if (data.length > 0) {
          data.slice(0, 3).forEach((event: any, index: number) => {
            addLog(`  ${index + 1}. ${event.summary || 'No title'} - ${event.start?.dateTime || event.start?.date}`);
          });
        }
      } else {
        addLog(`❌ Events access failed: ${data.error}`);
      }
    } catch (error: any) {
      addLog(`❌ Events test error: ${error.message}`);
    }
  };

  const startOAuthFlow = () => {
    addLog('Starting OAuth flow...');
    window.location.href = '/api/auth/google';
  };

  const clearLogs = () => setTestLogs([]);

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">OAuth Test - Simple</h1>
          <p className="text-gray-600 mt-2">Test your Google Calendar OAuth connection</p>
        </div>
        <Button onClick={() => refetchStatus()} variant="outline" size="sm">
          <RefreshCw className="w-4 h-4 mr-2" />
          Refresh Status
        </Button>
      </div>

      {/* Connection Status */}
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
                status?.connected ? 'bg-green-100' : 'bg-red-100'
              }`}>
                {isLoading ? (
                  <RefreshCw className="w-5 h-5 animate-spin text-gray-600" />
                ) : status?.connected ? (
                  <CheckCircle className="w-5 h-5 text-green-600" />
                ) : (
                  <XCircle className="w-5 h-5 text-red-600" />
                )}
              </div>
              <div>
                <h4 className="font-medium">Google Calendar</h4>
                <Badge variant={status?.connected ? 'default' : 'destructive'}>
                  {isLoading ? 'Checking...' : status?.connected ? 'Connected' : 'Not Connected'}
                </Badge>
              </div>
            </div>

            <div className="flex gap-2">
              {status?.connected ? (
                <>
                  <Button 
                    onClick={() => disconnectMutation.mutate()} 
                    variant="outline" 
                    size="sm"
                    disabled={disconnectMutation.isPending}
                  >
                    <LogOut className="w-4 h-4 mr-2" />
                    {disconnectMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
                  </Button>
                  <Button onClick={testCalendarAccess} size="sm">
                    Test Calendars
                  </Button>
                  <Button onClick={testEventsAccess} size="sm" variant="outline">
                    Test Events
                  </Button>
                </>
              ) : (
                <Button onClick={startOAuthFlow} size="sm">
                  Connect Google Calendar
                </Button>
              )}
            </div>
          </div>

          {status?.error && (
            <Alert className="mt-4">
              <XCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Error:</strong> {status.error}
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Logs */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Test Logs
            <Button onClick={clearLogs} variant="outline" size="sm">
              Clear Logs
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="bg-gray-900 text-green-400 p-4 rounded-lg font-mono text-sm max-h-96 overflow-y-auto">
            {testLogs.length === 0 ? (
              <div className="text-gray-500">No logs yet. Try testing your OAuth connection!</div>
            ) : (
              testLogs.map((log, index) => (
                <div key={index} className="mb-1">
                  {log}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Actions</CardTitle>
        </CardHeader>
        <CardContent className="flex gap-2 flex-wrap">
          <Button 
            onClick={() => window.open('/oauth/debug', '_blank')} 
            variant="outline"
          >
            Open Debug Page
          </Button>
          <Button 
            onClick={() => window.open('/oauth-troubleshoot', '_blank')} 
            variant="outline"
          >
            Troubleshooting Guide
          </Button>
          <Button 
            onClick={() => window.open('https://console.cloud.google.com/apis/credentials', '_blank')} 
            variant="outline"
          >
            Google Cloud Console
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}