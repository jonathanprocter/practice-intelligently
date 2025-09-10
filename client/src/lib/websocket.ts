// lib/websocket.ts
import io, { Socket } from 'socket.io-client';
import { ApiClient } from './api';

// Event types matching server-side definitions
export interface WebSocketEventData {
  appointmentId?: string;
  clientId?: string;
  therapistId?: string;
  sessionNoteId?: string;
  documentId?: string;
  actionItemId?: string;
  timestamp?: Date;
  data?: any;
  [key: string]: any;
}

export type WebSocketEventName = 
  // Connection events
  | 'connect'
  | 'disconnect'
  | 'reconnect'
  | 'reconnect_attempt'
  | 'connect_error'
  // Appointment events
  | 'appointment:created'
  | 'appointment:updated'
  | 'appointment:deleted'
  | 'appointment:status-changed'
  // Session note events
  | 'session-note:created'
  | 'session-note:updated'
  | 'session-note:deleted'
  | 'session-note:ai-processing'
  | 'session-note:ai-completed'
  // Client events
  | 'client:created'
  | 'client:updated'
  | 'client:deleted'
  | 'client:status-changed'
  // Document events
  | 'document:upload-started'
  | 'document:upload-progress'
  | 'document:upload-completed'
  | 'document:processing-started'
  | 'document:processing-completed'
  // AI events
  | 'ai:insight-generated'
  | 'ai:analysis-started'
  | 'ai:analysis-completed'
  // Calendar sync events
  | 'calendar:sync-started'
  | 'calendar:sync-progress'
  | 'calendar:sync-completed'
  | 'calendar:sync-error'
  // Action item events
  | 'action-item:created'
  | 'action-item:updated'
  | 'action-item:completed'
  | 'action-item:deleted'
  // User presence events
  | 'user:online'
  | 'user:offline'
  | 'user:activity'
  // System events
  | 'system:notification'
  | 'system:announcement'
  | 'system:maintenance';

export type WebSocketCallback = (data: WebSocketEventData) => void;

class WebSocketManager {
  private socket: Socket | null = null;
  private listeners: Map<string, Set<WebSocketCallback>> = new Map();
  private connectionStatus: 'connecting' | 'connected' | 'disconnected' | 'reconnecting' = 'disconnected';
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private messageQueue: Array<{ event: string; data: any }> = [];
  private statusListeners: Set<(status: string) => void> = new Set();
  private therapistId: string | null = null;

  constructor() {
    // Bind methods to preserve context
    this.connect = this.connect.bind(this);
    this.disconnect = this.disconnect.bind(this);
    this.emit = this.emit.bind(this);
    this.on = this.on.bind(this);
    this.off = this.off.bind(this);
  }

  connect(therapistId?: string) {
    if (this.socket?.connected) {
      console.log('🔌 WebSocket already connected');
      return;
    }

    this.therapistId = therapistId || ApiClient.getTherapistId();
    this.setConnectionStatus('connecting');

    // Determine the WebSocket URL based on environment
    const wsUrl = process.env.NODE_ENV === 'development' 
      ? 'http://localhost:5000'
      : window.location.origin;

    console.log(`🔌 Connecting to WebSocket at ${wsUrl}...`);

    this.socket = io(wsUrl, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionAttempts: this.maxReconnectAttempts,
      reconnectionDelay: this.reconnectDelay,
      reconnectionDelayMax: 10000,
      timeout: 20000,
      auth: {
        therapistId: this.therapistId
      }
    });

    this.setupEventHandlers();
  }

  private setupEventHandlers() {
    if (!this.socket) return;

    // Connection events
    this.socket.on('connect', () => {
      console.log('✅ WebSocket connected:', this.socket?.id);
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;
      
      // Auto-join therapist room
      if (this.therapistId) {
        this.joinTherapistRoom(this.therapistId);
      }
      
      // Flush message queue
      this.flushMessageQueue();
      
      // Notify listeners
      this.notifyListeners('connect', { socketId: this.socket?.id });
    });

    this.socket.on('disconnect', (reason) => {
      console.log('❌ WebSocket disconnected:', reason);
      this.setConnectionStatus('disconnected');
      this.notifyListeners('disconnect', { reason });
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('🔄 WebSocket reconnected after', attemptNumber, 'attempts');
      this.setConnectionStatus('connected');
      this.reconnectAttempts = 0;
      this.notifyListeners('reconnect', { attemptNumber });
    });

    this.socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('🔄 WebSocket reconnection attempt', attemptNumber);
      this.setConnectionStatus('reconnecting');
      this.reconnectAttempts = attemptNumber;
      this.notifyListeners('reconnect_attempt', { attemptNumber });
    });

    this.socket.on('connect_error', (error) => {
      console.error('❌ WebSocket connection error:', error.message);
      this.notifyListeners('connect_error', { error: error.message });
    });

    // Application events - Set up listeners for all event types
    const eventTypes: WebSocketEventName[] = [
      'appointment:created',
      'appointment:updated',
      'appointment:deleted',
      'appointment:status-changed',
      'session-note:created',
      'session-note:updated',
      'session-note:deleted',
      'session-note:ai-processing',
      'session-note:ai-completed',
      'client:created',
      'client:updated',
      'client:deleted',
      'client:status-changed',
      'document:upload-started',
      'document:upload-progress',
      'document:upload-completed',
      'document:processing-started',
      'document:processing-completed',
      'ai:insight-generated',
      'ai:analysis-started',
      'ai:analysis-completed',
      'calendar:sync-started',
      'calendar:sync-progress',
      'calendar:sync-completed',
      'calendar:sync-error',
      'action-item:created',
      'action-item:updated',
      'action-item:completed',
      'action-item:deleted',
      'user:online',
      'user:offline',
      'user:activity',
      'system:notification',
      'system:announcement',
      'system:maintenance'
    ];

    eventTypes.forEach(eventType => {
      this.socket?.on(eventType, (data: WebSocketEventData) => {
        console.log(`📨 Received ${eventType}:`, data);
        this.notifyListeners(eventType, data);
      });
    });
  }

  private setConnectionStatus(status: typeof this.connectionStatus) {
    this.connectionStatus = status;
    this.statusListeners.forEach(listener => listener(status));
  }

  private notifyListeners(event: string, data: WebSocketEventData) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket listener for ${event}:`, error);
        }
      });
    }
  }

  private flushMessageQueue() {
    while (this.messageQueue.length > 0 && this.socket?.connected) {
      const { event, data } = this.messageQueue.shift()!;
      this.socket.emit(event, data);
    }
  }

  disconnect() {
    if (this.socket) {
      console.log('🔌 Disconnecting WebSocket...');
      this.socket.disconnect();
      this.socket = null;
      this.setConnectionStatus('disconnected');
    }
  }

  emit(event: string, data: any) {
    if (this.socket?.connected) {
      console.log(`📤 Emitting ${event}:`, data);
      this.socket.emit(event, data);
    } else {
      console.log(`📦 Queueing ${event} (not connected)`);
      this.messageQueue.push({ event, data });
    }
  }

  on(event: WebSocketEventName, callback: WebSocketCallback): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    
    this.listeners.get(event)!.add(callback);
    console.log(`👂 Added listener for ${event}`);

    // Return unsubscribe function
    return () => this.off(event, callback);
  }

  off(event: WebSocketEventName, callback: WebSocketCallback) {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.delete(callback);
      console.log(`🔇 Removed listener for ${event}`);
      
      if (callbacks.size === 0) {
        this.listeners.delete(event);
      }
    }
  }

  onStatusChange(callback: (status: string) => void): () => void {
    this.statusListeners.add(callback);
    // Immediately call with current status
    callback(this.connectionStatus);
    
    // Return unsubscribe function
    return () => {
      this.statusListeners.delete(callback);
    };
  }

  // Room management
  joinTherapistRoom(therapistId: string) {
    this.emit('join-therapist-room', therapistId);
    console.log(`🏠 Joining therapist room: ${therapistId}`);
  }

  joinClientRoom(clientId: string) {
    this.emit('join-client-room', clientId);
    console.log(`👤 Joining client room: ${clientId}`);
  }

  joinAppointmentRoom(appointmentId: string) {
    this.emit('join-appointment-room', appointmentId);
    console.log(`📅 Joining appointment room: ${appointmentId}`);
  }

  leaveRoom(room: string) {
    this.emit('leave-room', room);
    console.log(`🚪 Leaving room: ${room}`);
  }

  // Utility methods
  isConnected(): boolean {
    return this.socket?.connected || false;
  }

  getConnectionStatus(): string {
    return this.connectionStatus;
  }

  getSocketId(): string | undefined {
    return this.socket?.id;
  }

  // Event emitters for common actions
  notifyAppointmentCreated(appointment: any) {
    this.emit('appointment:created', appointment);
  }

  notifyAppointmentUpdated(appointment: any) {
    this.emit('appointment:updated', appointment);
  }

  notifyAppointmentDeleted(appointmentId: string) {
    this.emit('appointment:deleted', { appointmentId });
  }

  notifySessionNoteCreated(sessionNote: any) {
    this.emit('session-note:created', sessionNote);
  }

  notifySessionNoteUpdated(sessionNote: any) {
    this.emit('session-note:updated', sessionNote);
  }

  notifySessionNoteDeleted(sessionNoteId: string, clientId: string) {
    this.emit('session-note:deleted', { sessionNoteId, clientId });
  }

  notifyClientUpdated(client: any) {
    this.emit('client:updated', client);
  }

  notifyDocumentProgress(documentId: string, progress: number, status: string) {
    this.emit('document:upload-progress', {
      documentId,
      progress,
      status,
      timestamp: new Date()
    });
  }

  notifyAIInsightGenerated(insight: any) {
    this.emit('ai:insight-generated', insight);
  }

  notifyCalendarSyncProgress(progress: number, status: string, details?: any) {
    this.emit('calendar:sync-progress', {
      progress,
      status,
      details,
      timestamp: new Date()
    });
  }

  notifyActionItemCompleted(actionItemId: string, clientId?: string) {
    this.emit('action-item:completed', {
      actionItemId,
      clientId,
      timestamp: new Date()
    });
  }

  trackUserActivity(activity: string, details?: any) {
    this.emit('user:activity', {
      activity,
      details,
      timestamp: new Date()
    });
  }
}

// Create singleton instance
export const wsManager = new WebSocketManager();

// Export convenience functions
export const connectWebSocket = (therapistId?: string) => wsManager.connect(therapistId);
export const disconnectWebSocket = () => wsManager.disconnect();
export const emitWebSocketEvent = (event: string, data: any) => wsManager.emit(event, data);
export const onWebSocketEvent = (event: WebSocketEventName, callback: WebSocketCallback) => wsManager.on(event, callback);
export const offWebSocketEvent = (event: WebSocketEventName, callback: WebSocketCallback) => wsManager.off(event, callback);