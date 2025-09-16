// hooks/useRealtimeUpdates.ts
import { useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/contexts/WebSocketContext';
import { useQueryClient } from '@tanstack/react-query';
import { WebSocketEventData } from '@/lib/websocket';

interface RealtimeOptions {
  onUpdate?: (data: any) => void;
  invalidateQueries?: string[];
  autoRefetch?: boolean;
}

/**
 * Hook to automatically handle real-time updates for a specific resource
 * Fixed version that properly uses WebSocket subscribe method without violating Rules of Hooks
 */
export const useRealtimeUpdates = (
  resourceType: 'appointments' | 'session-notes' | 'clients' | 'action-items' | 'documents',
  options: RealtimeOptions = {}
) => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const { onUpdate, invalidateQueries = [], autoRefetch = true } = options;

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

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
        unsubscribes.push(
          subscribe('appointment:created', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('appointment:updated', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today']);
            if (data.appointmentId) {
              invalidate([`/api/appointments/${data.appointmentId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('appointment:deleted', (data) => {
            invalidate(['/api/appointments', '/api/appointments/today', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'session-notes':
        // Session note events
        unsubscribes.push(
          subscribe('session-note:created', (data) => {
            invalidate(['/api/session-notes', '/api/dashboard/stats']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}/session-notes`]);
            }
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('session-note:updated', (data) => {
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
        
        unsubscribes.push(
          subscribe('session-note:deleted', (data) => {
            invalidate(['/api/session-notes', '/api/dashboard/stats']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}/session-notes`]);
            }
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('session-note:ai-completed', (data) => {
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
        unsubscribes.push(
          subscribe('client:created', (data) => {
            invalidate(['/api/clients', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('client:updated', (data) => {
            invalidate(['/api/clients']);
            if (data.clientId) {
              invalidate([`/api/clients/${data.clientId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('client:deleted', (data) => {
            invalidate(['/api/clients', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'action-items':
        // Action item events
        unsubscribes.push(
          subscribe('action-item:created', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('action-item:updated', (data) => {
            invalidate(['/api/action-items']);
            if (data.actionItemId) {
              invalidate([`/api/action-items/${data.actionItemId}`]);
            }
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('action-item:completed', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('action-item:deleted', (data) => {
            invalidate(['/api/action-items', '/api/dashboard/stats']);
            onUpdate?.(data);
          })
        );
        break;

      case 'documents':
        // Document events
        unsubscribes.push(
          subscribe('document:upload-completed', (data) => {
            invalidate(['/api/documents']);
            onUpdate?.(data);
          })
        );
        
        unsubscribes.push(
          subscribe('document:processing-completed', (data) => {
            invalidate(['/api/documents', '/api/session-notes']);
            onUpdate?.(data);
          })
        );
        break;
    }

    // Cleanup - properly unsubscribe all listeners
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [resourceType, autoRefetch, queryClient, subscribe]); // Note: onUpdate removed from deps to prevent re-subscriptions
};

/**
 * Hook to track presence and online status
 * Fixed version with proper cleanup
 */
export const usePresenceTracking = () => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    unsubscribes.push(
      subscribe('user:online', (data: WebSocketEventData) => {
        queryClient.setQueryData(['user-presence', data.userId], {
          ...data,
          status: 'online'
        });
      })
    );

    unsubscribes.push(
      subscribe('user:offline', (data: WebSocketEventData) => {
        queryClient.setQueryData(['user-presence', data.userId], {
          ...data,
          status: 'offline'
        });
      })
    );

    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [queryClient, subscribe]);
};

/**
 * Hook to handle calendar sync updates
 * Fixed version with proper cleanup
 */
export const useCalendarSyncUpdates = (onSyncComplete?: (data: any) => void) => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();
  const onSyncCompleteRef = useRef(onSyncComplete);

  // Keep ref updated
  useEffect(() => {
    onSyncCompleteRef.current = onSyncComplete;
  }, [onSyncComplete]);

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    unsubscribes.push(
      subscribe('calendar:sync-started', (data: WebSocketEventData) => {
        queryClient.setQueryData(['calendar-sync-status'], {
          status: 'syncing',
          progress: 0,
          ...data
        });
      })
    );

    unsubscribes.push(
      subscribe('calendar:sync-progress', (data: WebSocketEventData) => {
        queryClient.setQueryData(['calendar-sync-status'], {
          status: 'syncing',
          ...data
        });
      })
    );

    unsubscribes.push(
      subscribe('calendar:sync-completed', (data: WebSocketEventData) => {
        queryClient.setQueryData(['calendar-sync-status'], {
          status: 'completed',
          progress: 100,
          ...data
        });
        
        // Invalidate appointment queries
        queryClient.invalidateQueries({ queryKey: ['/api/appointments'] });
        queryClient.invalidateQueries({ queryKey: ['/api/calendar'] });
        
        onSyncCompleteRef.current?.(data);
      })
    );

    unsubscribes.push(
      subscribe('calendar:sync-error', (data: WebSocketEventData) => {
        queryClient.setQueryData(['calendar-sync-status'], {
          status: 'error',
          ...data
        });
      })
    );

    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [queryClient, subscribe]);
};

/**
 * Hook to handle AI processing updates
 * Fixed version with proper cleanup
 */
export const useAIProcessingUpdates = () => {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubscribes: Array<() => void> = [];

    unsubscribes.push(
      subscribe('ai:analysis-started', (data: WebSocketEventData) => {
        queryClient.setQueryData(['ai-processing', data.sessionNoteId || data.documentId], {
          status: 'processing',
          ...data
        });
      })
    );

    unsubscribes.push(
      subscribe('ai:analysis-completed', (data: WebSocketEventData) => {
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
      })
    );

    unsubscribes.push(
      subscribe('ai:insight-generated', (data: WebSocketEventData) => {
        queryClient.invalidateQueries({ queryKey: ['/api/ai-insights'] });
        queryClient.invalidateQueries({ queryKey: ['/api/dashboard/ai-insights'] });
      })
    );

    // Cleanup
    return () => {
      unsubscribes.forEach(unsubscribe => {
        if (typeof unsubscribe === 'function') {
          unsubscribe();
        }
      });
    };
  }, [queryClient, subscribe]);
};