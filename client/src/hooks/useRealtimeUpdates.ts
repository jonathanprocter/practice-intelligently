// hooks/useRealtimeUpdates.ts
import { useEffect } from 'react';
import { useWebSocketEvent } from '@/contexts/WebSocketContext';
import { useQueryClient } from '@tanstack/react-query';

interface RealtimeOptions {
  onUpdate?: (data: any) => void;
  invalidateQueries?: string[];
  autoRefetch?: boolean;
}

/**
 * Hook to automatically handle real-time updates for a specific resource
 */
export const useRealtimeUpdates = (
  resourceType: 'appointments' | 'session-notes' | 'clients' | 'action-items' | 'documents',
  options: RealtimeOptions = {}
) => {
  const queryClient = useQueryClient();
  const { onUpdate, invalidateQueries = [], autoRefetch = true } = options;

  useEffect(() => {
    const eventHandlers: Array<() => void> = [];

    // Helper to invalidate queries
    const invalidate = (additionalKeys: string[] = []) => {
      if (autoRefetch) {
        const keysToInvalidate = [...invalidateQueries, ...additionalKeys];
        keysToInvalidate.forEach(key => {
          queryClient.invalidateQueries({ queryKey: [key] });
        });
      }
    };

    switch (resourceType) {
      case 'appointments':
        // Appointment events
        eventHandlers.push(
          useWebSocketEvent('appointment:created', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('appointment:updated', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today']);
            if (data.appointmentId) {
              invalidate([`/api/appointments/${data.appointmentId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('appointment:deleted', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'session-notes':
        // Session note events
        eventHandlers.push(
          useWebSocketEvent('session-note:created', (data) => {
            invalidate(['/api/session-notes', '/api/dashboard/stats']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}/session-notes`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('session-note:updated', (data) => {
            invalidate(['/api/session-notes']);
            if (data.sessionNoteId) {
              invalidate([`/api/session-notes/${data.sessionNoteId}`]);
            }
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}/session-notes`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('session-note:deleted', (data) => {
            invalidate(['/api/session-notes', '/api/dashboard/stats']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}/session-notes`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('session-note:ai-completed', (data) => {
            invalidate(['/api/session-notes']);
            if (data.sessionNoteId) {
              invalidate([`/api/session-notes/${data.sessionNoteId}`]);
            }
            onUpdate?.(data);
          })
        );
        break;

      case 'clients':
        // Client events
        eventHandlers.push(
          useWebSocketEvent('client:created', (data) => {
            invalidate(['/api/clients', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('client:updated', (data) => {
            invalidate(['/api/clients']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('client:deleted', (data) => {
            invalidate(['/api/clients', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'action-items':
        // Action item events
        eventHandlers.push(
          useWebSocketEvent('action-item:created', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('action-item:updated', (data) => {
            invalidate(['/api/action-items']);
            if (data.actionItemId) {
              invalidate([`/api/action-items/${data.actionItemId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('action-item:completed', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('action-item:deleted', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'documents':
        // Document events
        eventHandlers.push(
          useWebSocketEvent('document:upload-completed', (data) => {
            invalidate(['/api/documents']);
            onUpdate?.(data);
          })
        );
        
        eventHandlers.push(
          useWebSocketEvent('document:processing-completed', (data) => {
            invalidate(['/api/documents', '/api/session-notes']);
            onUpdate?.(data);
          })
        );
        break;
    }

    // Cleanup
    return () => {
      eventHandlers.forEach(unsubscribe => unsubscribe?.());
    };
  }, [resourceType, autoRefetch, onUpdate, queryClient]);
};

/**
 * Hook to track user presence and online status
 */
export const useUserPresence = () => {
  const queryClient = useQueryClient();

  useWebSocketEvent('user:online', (data) => {
    queryClient.setQueryData(['user-presence', data.userId], {
      ...data,
      status: 'online'
    });
  });

  useWebSocketEvent('user:offline', (data) => {
    queryClient.setQueryData(['user-presence', data.userId], {
      ...data,
      status: 'offline'
    });
  });
};

/**
 * Hook to handle calendar sync updates
 */
export const useCalendarSyncUpdates = (onSyncComplete?: (data: any) => void) => {
  const queryClient = useQueryClient();

  useWebSocketEvent('calendar:sync-started', (data) => {
    queryClient.setQueryData(['calendar-sync-status'], {
      status: 'syncing',
      progress: 0,
      ...data
    });
  });

  useWebSocketEvent('calendar:sync-progress', (data) => {
    queryClient.setQueryData(['calendar-sync-status'], {
      status: 'syncing',
      ...data
    });
  });

  useWebSocketEvent('calendar:sync-completed', (data) => {
    queryClient.setQueryData(['calendar-sync-status'], {
      status: 'completed',
      progress: 100,
      ...data
    });
    
    // Invalidate appointment queries
    queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
    queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
    
    onSyncComplete?.(data);
  });

  useWebSocketEvent('calendar:sync-error', (data) => {
    queryClient.setQueryData(['calendar-sync-status'], {
      status: 'error',
      ...data
    });
  });
};

/**
 * Hook to handle AI processing updates
 */
export const useAIProcessingUpdates = () => {
  const queryClient = useQueryClient();

  useWebSocketEvent('ai:analysis-started', (data) => {
    queryClient.setQueryData(['ai-processing', data.sessionNoteId || data.documentId], {
      status: 'processing',
      ...data
    });
  });

  useWebSocketEvent('ai:analysis-completed', (data) => {
    queryClient.setQueryData(['ai-processing', data.sessionNoteId || data.documentId], {
      status: 'completed',
      ...data
    });
    
    // Invalidate relevant queries
    if (data.sessionNoteId) {
      queryClient.invalidateQueries({ queryKey: [`/api/session-notes/${data.sessionNoteId}`] });
    }
    if (data.clientId) {
      queryClient.invalidateQueries({ queryKey: [`/api/clients/${data.clientId}/insights`] });
    }
  });

  useWebSocketEvent('ai:insight-generated', (data) => {
    queryClient.invalidateQueries({ queryKey: ['/api/ai-insights'] });
    queryClient.invalidateQueries({ queryKey: ['/api/dashboard/ai-insights'] });
  });
};