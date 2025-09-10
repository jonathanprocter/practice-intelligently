// pages/websocket-test.tsx
import { useState, useEffect } from 'react';
import { useWebSocket, useWebSocketEvent } from '@/contexts/WebSocketContext';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Send, Wifi, WifiOff, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface EventLog {
  id: string;
  event: string;
  data: any;
  timestamp: Date;
}

export default function WebSocketTest() {
  const [eventLogs, setEventLogs] = useState<EventLog[]>([]);
  const [selectedRoom, setSelectedRoom] = useState<string>('');
  const { 
    isConnected, 
    connectionStatus, 
    connect, 
    disconnect, 
    emit, 
    joinRoom, 
    leaveRoom,
    notifyAppointmentChange,
    notifySessionNoteChange,
    trackActivity
  } = useWebSocket();

  // Log helper
  const addLog = (event: string, data: any) => {
    setEventLogs(prev => [{
      id: `${Date.now()}-${Math.random()}`,
      event,
      data,
      timestamp: new Date()
    }, ...prev].slice(0, 50)); // Keep last 50 events
  };

  // Subscribe to various events for testing
  useWebSocketEvent('connect', (data) => {
    addLog('connect', data);
  });

  useWebSocketEvent('disconnect', (data) => {
    addLog('disconnect', data);
  });

  useWebSocketEvent('appointment:created', (data) => {
    addLog('appointment:created', data);
  });

  useWebSocketEvent('appointment:updated', (data) => {
    addLog('appointment:updated', data);
  });

  useWebSocketEvent('session-note:created', (data) => {
    addLog('session-note:created', data);
  });

  useWebSocketEvent('session-note:updated', (data) => {
    addLog('session-note:updated', data);
  });

  useWebSocketEvent('ai:insight-generated', (data) => {
    addLog('ai:insight-generated', data);
  });

  useWebSocketEvent('calendar:sync-completed', (data) => {
    addLog('calendar:sync-completed', data);
  });

  useWebSocketEvent('document:processing-completed', (data) => {
    addLog('document:processing-completed', data);
  });

  useWebSocketEvent('system:notification', (data) => {
    addLog('system:notification', data);
  });

  // Test event emitters
  const testAppointmentCreated = () => {
    const testAppointment = {
      id: `test-${Date.now()}`,
      clientName: 'Test Client',
      startTime: new Date().toISOString(),
      type: 'session'
    };
    notifyAppointmentChange('created', testAppointment);
    addLog('SENT: appointment:created', testAppointment);
  };

  const testSessionNoteCreated = () => {
    const testNote = {
      id: `note-${Date.now()}`,
      clientId: 'test-client',
      clientName: 'Test Client',
      content: 'Test session note content'
    };
    notifySessionNoteChange('created', testNote);
    addLog('SENT: session-note:created', testNote);
  };

  const testAIInsight = () => {
    const testInsight = {
      title: 'Test AI Insight',
      content: 'This is a test AI-generated insight',
      confidence: 'high'
    };
    emit('ai:insight-generated', testInsight);
    addLog('SENT: ai:insight-generated', testInsight);
  };

  const testCalendarSync = () => {
    const syncData = {
      appointmentsUpdated: 5,
      timestamp: new Date()
    };
    emit('calendar:sync-completed', syncData);
    addLog('SENT: calendar:sync-completed', syncData);
  };

  const testJoinRoom = () => {
    const therapistId = 'e66b8b8e-e7a2-40b9-ae74-00c93ffe503c';
    joinRoom('therapist', therapistId);
    setSelectedRoom(`therapist-${therapistId}`);
    addLog('JOINED ROOM', `therapist-${therapistId}`);
  };

  const testLeaveRoom = () => {
    if (selectedRoom) {
      leaveRoom(selectedRoom);
      addLog('LEFT ROOM', selectedRoom);
      setSelectedRoom('');
    }
  };

  const testTrackActivity = () => {
    trackActivity('test-activity', { action: 'button-click', page: 'websocket-test' });
    addLog('SENT: user:activity', { action: 'button-click', page: 'websocket-test' });
  };

  const clearLogs = () => {
    setEventLogs([]);
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <h1 className="text-3xl font-bold mb-6">WebSocket Testing Dashboard</h1>
      
      {/* Connection Status */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Connection Status
            <Badge variant={isConnected ? 'default' : 'destructive'}>
              {connectionStatus}
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 mb-4">
            <div className={cn(
              "flex items-center gap-2",
              isConnected ? "text-green-600" : "text-red-600"
            )}>
              {isConnected ? <Wifi className="h-5 w-5" /> : <WifiOff className="h-5 w-5" />}
              <span className="font-medium">
                {isConnected ? 'Connected' : 'Disconnected'}
              </span>
            </div>
            
            {connectionStatus === 'reconnecting' && (
              <div className="flex items-center gap-2 text-yellow-600">
                <RefreshCw className="h-4 w-4 animate-spin" />
                <span>Reconnecting...</span>
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={connect} 
              disabled={isConnected}
              variant="default"
              size="sm"
            >
              Connect
            </Button>
            <Button 
              onClick={disconnect} 
              disabled={!isConnected}
              variant="destructive"
              size="sm"
            >
              Disconnect
            </Button>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Test Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Test Event Emitters</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h4 className="text-sm font-medium mb-2">Appointment Events</h4>
              <Button 
                onClick={testAppointmentCreated}
                disabled={!isConnected}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Emit Appointment Created
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Session Note Events</h4>
              <Button 
                onClick={testSessionNoteCreated}
                disabled={!isConnected}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Emit Session Note Created
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">AI Events</h4>
              <Button 
                onClick={testAIInsight}
                disabled={!isConnected}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Emit AI Insight Generated
              </Button>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Calendar Events</h4>
              <Button 
                onClick={testCalendarSync}
                disabled={!isConnected}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Emit Calendar Sync Complete
              </Button>
            </div>

            <Separator className="my-4" />

            <div>
              <h4 className="text-sm font-medium mb-2">Room Management</h4>
              <div className="space-y-2">
                <Button 
                  onClick={testJoinRoom}
                  disabled={!isConnected || !!selectedRoom}
                  size="sm"
                  className="w-full"
                >
                  Join Therapist Room
                </Button>
                <Button 
                  onClick={testLeaveRoom}
                  disabled={!isConnected || !selectedRoom}
                  size="sm"
                  variant="outline"
                  className="w-full"
                >
                  Leave Room
                </Button>
                {selectedRoom && (
                  <p className="text-xs text-muted-foreground">
                    Current room: {selectedRoom}
                  </p>
                )}
              </div>
            </div>

            <div>
              <h4 className="text-sm font-medium mb-2">Activity Tracking</h4>
              <Button 
                onClick={testTrackActivity}
                disabled={!isConnected}
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                Track Test Activity
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Event Logs */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Event Logs
              <Button 
                onClick={clearLogs}
                size="sm"
                variant="ghost"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-[600px] w-full pr-4">
              {eventLogs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No events logged yet. Try emitting some events!
                </p>
              ) : (
                <div className="space-y-2">
                  {eventLogs.map((log) => (
                    <div 
                      key={log.id}
                      className={cn(
                        "p-3 rounded-lg border text-sm",
                        log.event.startsWith('SENT') ? "bg-blue-50 border-blue-200" : "bg-gray-50"
                      )}
                    >
                      <div className="flex items-center justify-between mb-1">
                        <Badge variant="outline" className="text-xs">
                          {log.event}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {log.timestamp.toLocaleTimeString()}
                        </span>
                      </div>
                      <pre className="text-xs overflow-x-auto mt-2 p-2 bg-white rounded">
                        {JSON.stringify(log.data, null, 2)}
                      </pre>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}