// contexts/WebSocketContext.tsx
import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { wsManager, WebSocketEventName, WebSocketCallback, WebSocketEventData } from '@/lib/websocket';
import { ApiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';

interface WebSocketContextType {
  isConnected: boolean;
  connectionStatus: string;
  connect: () => void;
  disconnect: () => void;
  emit: (event: string, data: any) => void;
  subscribe: (event: WebSocketEventName, callback: WebSocketCallback) => () => void;
  joinRoom: (roomType: 'therapist' | 'client' | 'appointment', roomId: string) => void;
  leaveRoom: (room: string) => void;
  notifyAppointmentChange: (type: 'created' | 'updated' | 'deleted', appointment: any) => void;
  notifySessionNoteChange: (type: 'created' | 'updated' | 'deleted', sessionNote: any) => void;
  notifyClientChange: (type: 'created' | 'updated' | 'deleted', client: any) => void;
  trackActivity: (activity: string, details?: any) => void;
}

const WebSocketContext = createContext<WebSocketContextType | undefined>(undefined);

export const useWebSocket = () => {
  const context = useContext(WebSocketContext);
  if (!context) {
    throw new Error('useWebSocket must be used within a WebSocketProvider');
  }
  return context;
};

interface WebSocketProviderProps {
  children: React.ReactNode;
  autoConnect?: boolean;
}

export const WebSocketProvider = ({ children, autoConnect = true }: WebSocketProviderProps) => {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('disconnected');
  const { toast } = useToast();
  const statusUnsubscribeRef = useRef<(() => void) | null>(null);
  const eventUnsubscribesRef = useRef<Array<() => void>>([]);
  const hasShownConnectionToast = useRef(false);
  const therapistId = ApiClient.getTherapistId();

  // Setup global event handlers
  useEffect(() => {
    // Subscribe to connection status changes
    statusUnsubscribeRef.current = wsManager.onStatusChange((status) => {
      setConnectionStatus(status);
      setIsConnected(status === 'connected');
      
      // Show connection status toasts
      if (status === 'connected' && !hasShownConnectionToast.current) {
        hasShownConnectionToast.current = true;
        toast({
          title: '🔌 Connected',
          description: 'Real-time updates are now active',
          duration: 2000,
        });
      } else if (status === 'disconnected' && hasShownConnectionToast.current) {
        hasShownConnectionToast.current = false;
        toast({
          title: '❌ Disconnected',
          description: 'Real-time updates paused. Attempting to reconnect...',
          variant: 'destructive',
          duration: 3000,
        });
      }
    });

    // Setup real-time event handlers that invalidate queries
    const unsubscribes: Array<() => void> = [];

    // Appointment events
    unsubscribes.push(
      wsManager.on('appointment:created', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
        
        toast({
          title: '📅 New Appointment',
          description: `New appointment created${data.clientName ? ` for ${data.clientName}` : ''}`,
        });
      })
    );

    unsubscribes.push(
      wsManager.on('appointment:updated', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
        
        if (data.appointmentId) {
          queryClient.invalidateQueries({ queryKey: [`/api/appointments/${data.appointmentId}`] });
        }
      })
    );

    unsubscribes.push(
      wsManager.on('appointment:deleted', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        queryClient.invalidateQueries({ queryKey: ['/api/appointments/today'] });
      })
    );

    // Session note events
    unsubscribes.push(
      wsManager.on('session-note:created', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        
        if (data.clientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${data.clientId}/session-notes`] });
        }
        
        toast({
          title: '📝 New Session Note',
          description: `New session note added${data.clientName ? ` for ${data.clientName}` : ''}`,
        });
      })
    );

    unsubscribes.push(
      wsManager.on('session-note:updated', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
        
        if (data.sessionNoteId) {
          queryClient.invalidateQueries({ queryKey: [`/api/session-notes/${data.sessionNoteId}`] });
        }
        
        if (data.clientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${data.clientId}/session-notes`] });
        }
      })
    );

    unsubscribes.push(
      wsManager.on('session-note:ai-completed', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
        
        toast({
          title: '🤖 AI Processing Complete',
          description: 'Session note has been analyzed and enhanced with AI insights',
        });
      })
    );

    // Client events
    unsubscribes.push(
      wsManager.on('client:updated', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/clients'] });
        
        if (data.clientId) {
          queryClient.invalidateQueries({ queryKey: [`/api/clients/${data.clientId}`] });
        }
      })
    );

    // Document events
    unsubscribes.push(
      wsManager.on('document:upload-completed', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        
        toast({
          title: '📄 Document Uploaded',
          description: 'Document has been successfully uploaded and is being processed',
        });
      })
    );

    unsubscribes.push(
      wsManager.on('document:processing-completed', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/documents'] });
        queryClient.invalidateQueries({ queryKey: ['/api/session-notes'] });
        
        toast({
          title: '✅ Document Processed',
          description: 'Document has been analyzed and session notes have been created',
        });
      })
    );

    // AI events
    unsubscribes.push(
      wsManager.on('ai:insight-generated', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/ai-insights'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/ai-insights'] });
        
        toast({
          title: '💡 New AI Insight',
          description: data.title || 'New insight available in your dashboard',
        });
      })
    );

    // Calendar sync events
    unsubscribes.push(
      wsManager.on('calendar:sync-completed', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
        
        toast({
          title: '📆 Calendar Synced',
          description: `Calendar has been synchronized${data.appointmentsUpdated ? ` (${data.appointmentsUpdated} appointments updated)` : ''}`,
        });
      })
    );

    unsubscribes.push(
      wsManager.on('calendar:sync-error', (data: WebSocketEventData) => {
        toast({
          title: '❌ Calendar Sync Failed',
          description: data.error || 'Failed to synchronize calendar. Please try again.',
          variant: 'destructive',
        });
      })
    );

    // Action item events
    unsubscribes.push(
      wsManager.on('action-item:created', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
        
        toast({
          title: '📋 New Action Item',
          description: data.title || 'New action item has been created',
        });
      })
    );

    unsubscribes.push(
      wsManager.on('action-item:completed', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/action-items'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/stats'] });
      })
    );

    // System events
    unsubscribes.push(
      wsManager.on('system:notification', (data: WebSocketEventData) => {
        toast({
          title: data.title || 'System Notification',
          description: data.message || '',
          variant: data.variant || 'default',
        });
      })
    );

    unsubscribes.push(
      wsManager.on('system:announcement', (data: WebSocketEventData) => {
        toast({
          title: '📢 ' + (data.title || 'Announcement'),
          description: data.message || '',
          duration: 10000,
        });
      })
    );

    eventUnsubscribesRef.current = unsubscribes;

    // Cleanup
    return () => {
      if (statusUnsubscribeRef.current) {
        statusUnsubscribeRef.current();
      }
      eventUnsubscribesRef.current.forEach(unsub => unsub());
    };
  }, [toast]);

  // Auto-connect on mount if enabled
  useEffect(() => {
    if (autoConnect && therapistId) {
      wsManager.connect(therapistId);
    }

    return () => {
      if (autoConnect) {
        wsManager.disconnect();
      }
    };
  }, [autoConnect, therapistId]);

  const connect = useCallback(() => {
    wsManager.connect(therapistId);
  }, [therapistId]);

  const disconnect = useCallback(() => {
    wsManager.disconnect();
  }, []);

  const emit = useCallback((event: string, data: any) => {
    wsManager.emit(event, data);
  }, []);

  const subscribe = useCallback((event: WebSocketEventName, callback: WebSocketCallback) => {
    return wsManager.on(event, callback);
  }, []);

  const joinRoom = useCallback((roomType: 'therapist' | 'client' | 'appointment', roomId: string) => {
    switch (roomType) {
      case 'therapist':
        wsManager.joinTherapistRoom(roomId);
        break;
      case 'client':
        wsManager.joinClientRoom(roomId);
        break;
      case 'appointment':
        wsManager.joinAppointmentRoom(roomId);
        break;
    }
  }, []);

  const leaveRoom = useCallback((room: string) => {
    wsManager.leaveRoom(room);
  }, []);

  const notifyAppointmentChange = useCallback((type: 'created' | 'updated' | 'deleted', appointment: any) => {
    switch (type) {
      case 'created':
        wsManager.notifyAppointmentCreated(appointment);
        break;
      case 'updated':
        wsManager.notifyAppointmentUpdated(appointment);
        break;
      case 'deleted':
        wsManager.notifyAppointmentDeleted(appointment.id);
        break;
    }
  }, []);

  const notifySessionNoteChange = useCallback((type: 'created' | 'updated' | 'deleted', sessionNote: any) => {
    switch (type) {
      case 'created':
        wsManager.notifySessionNoteCreated(sessionNote);
        break;
      case 'updated':
        wsManager.notifySessionNoteUpdated(sessionNote);
        break;
      case 'deleted':
        wsManager.notifySessionNoteDeleted(sessionNote.id, sessionNote.clientId);
        break;
    }
  }, []);

  const notifyClientChange = useCallback((type: 'created' | 'updated' | 'deleted', client: any) => {
    if (type === 'updated') {
      wsManager.notifyClientUpdated(client);
    } else {
      wsManager.emit(`client:${type}`, client);
    }
  }, []);

  const trackActivity = useCallback((activity: string, details?: any) => {
    wsManager.trackUserActivity(activity, details);
  }, []);

  const value: WebSocketContextType = {
    isConnected,
    connectionStatus,
    connect,
    disconnect,
    emit,
    subscribe,
    joinRoom,
    leaveRoom,
    notifyAppointmentChange,
    notifySessionNoteChange,
    notifyClientChange,
    trackActivity,
  };

  return (
    <WebSocketContext.Provider value={value}>
      {children}
    </WebSocketContext.Provider>
  );
};

// Custom hooks for common WebSocket operations
export const useWebSocketEvent = (event: WebSocketEventName, callback: WebSocketCallback) => {
  const { subscribe } = useWebSocket();
  
  useEffect(() => {
    const unsubscribe = subscribe(event, callback);
    return unsubscribe;
  }, [event, callback, subscribe]);
};

export const useWebSocketRoom = (roomType: 'therapist' | 'client' | 'appointment', roomId: string | undefined) => {
  const { joinRoom, leaveRoom } = useWebSocket();
  
  useEffect(() => {
    if (roomId) {
      joinRoom(roomType, roomId);
      
      return () => {
        leaveRoom(`${roomType}-${roomId}`);
      };
    }
  }, [roomType, roomId, joinRoom, leaveRoom]);
};