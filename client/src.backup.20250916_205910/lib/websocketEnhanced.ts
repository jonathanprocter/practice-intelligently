// Enhanced WebSocket Client with Automatic Reconnection and Message Queuing
import { toast } from '@/hooks/use-toast';
import { networkMonitor } from './errorHandler';

interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
  id?: string;
}

interface WebSocketOptions {
  reconnect?: boolean;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  messageTimeout?: number;
  queueMessages?: boolean;
}

export class EnhancedWebSocket {
  private ws: WebSocket | null = null;
  private url: string;
  private options: WebSocketOptions;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private listeners: Map<string, Set<(data: any) => void>> = new Map();
  private connectionState: 'connecting' | 'connected' | 'disconnected' | 'error' = 'disconnected';
  private lastPingTime: number = Date.now();
  private isIntentionallyClosed = false;

  constructor(url: string, options: WebSocketOptions = {}) {
    this.url = url;
    this.options = {
      reconnect: true,
      reconnectInterval: 1000,
      maxReconnectAttempts: 10,
      heartbeatInterval: 30000,
      messageTimeout: 5000,
      queueMessages: true,
      ...options
    };

    // Listen to network status changes
    networkMonitor.subscribe(this.handleNetworkChange);
  }

  // Connect to WebSocket server
  connect(): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      console.log('WebSocket already connected');
      return;
    }

    this.isIntentionallyClosed = false;
    this.connectionState = 'connecting';
    console.log('Connecting to WebSocket:', this.url);

    try {
      // Convert HTTP URL to WebSocket URL
      const wsUrl = this.url.replace(/^http/, 'ws');
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen;
      this.ws.onmessage = this.handleMessage;
      this.ws.onerror = this.handleError;
      this.ws.onclose = this.handleClose;
    } catch (error) {
      console.error('Failed to create WebSocket:', error);
      this.handleError(new Event('error'));
    }
  }

  // Disconnect from WebSocket
  disconnect(): void {
    this.isIntentionallyClosed = true;
    this.clearTimers();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnecting');
      this.ws = null;
    }
    
    this.connectionState = 'disconnected';
  }

  // Send message with queuing support
  send(message: WebSocketMessage): boolean {
    message.timestamp = message.timestamp || Date.now();
    message.id = message.id || this.generateMessageId();

    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        return true;
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.queueMessage(message);
        return false;
      }
    } else {
      // Queue message if not connected and queuing is enabled
      if (this.options.queueMessages) {
        this.queueMessage(message);
        console.log('Message queued for sending when reconnected');
      }
      return false;
    }
  }

  // Subscribe to specific message types
  on(type: string, callback: (data: any) => void): () => void {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    this.listeners.get(type)!.add(callback);

    // Return unsubscribe function
    return () => {
      const callbacks = this.listeners.get(type);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.listeners.delete(type);
        }
      }
    };
  }

  // Get connection state
  getState(): string {
    return this.connectionState;
  }

  // Check if connected
  isConnected(): boolean {
    return this.ws !== null && this.ws.readyState === WebSocket.OPEN;
  }

  // Private methods
  private handleOpen = (event: Event): void => {
    console.log('WebSocket connected');
    this.connectionState = 'connected';
    this.reconnectAttempts = 0;

    // Clear reconnection timer
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    // Start heartbeat
    this.startHeartbeat();

    // Process queued messages
    this.processMessageQueue();

    // Notify listeners
    this.emit('connected', { reconnected: this.reconnectAttempts > 0 });

    // Show connection restored message if this was a reconnection
    if (this.reconnectAttempts > 0) {
      toast({
        title: 'Connection Restored',
        description: 'Real-time updates are now active',
        variant: 'default',
      });
    }
  };

  private handleMessage = (event: MessageEvent): void => {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);

      // Handle heartbeat/pong messages
      if (message.type === 'pong') {
        this.lastPingTime = Date.now();
        return;
      }

      // Emit to specific listeners
      const callbacks = this.listeners.get(message.type);
      if (callbacks) {
        callbacks.forEach(callback => {
          try {
            callback(message.data);
          } catch (error) {
            console.error(`Error in WebSocket listener for ${message.type}:`, error);
          }
        });
      }

      // Emit to wildcard listeners
      const wildcardCallbacks = this.listeners.get('*');
      if (wildcardCallbacks) {
        wildcardCallbacks.forEach(callback => {
          try {
            callback(message);
          } catch (error) {
            console.error('Error in WebSocket wildcard listener:', error);
          }
        });
      }

    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  };

  private handleError = (event: Event): void => {
    console.error('WebSocket error:', event);
    this.connectionState = 'error';
    
    // Emit error event
    this.emit('error', { error: event });
  };

  private handleClose = (event: CloseEvent): void => {
    console.log('WebSocket closed:', event.code, event.reason);
    this.connectionState = 'disconnected';
    this.clearTimers();

    // Emit disconnected event
    this.emit('disconnected', { 
      code: event.code, 
      reason: event.reason,
      wasClean: event.wasClean 
    });

    // Attempt reconnection if not intentionally closed
    if (!this.isIntentionallyClosed && this.options.reconnect) {
      this.scheduleReconnect();
    }
  };

  private handleNetworkChange = (online: boolean): void => {
    if (online && this.connectionState === 'disconnected' && !this.isIntentionallyClosed) {
      console.log('Network is back online, attempting WebSocket reconnection');
      this.connect();
    }
  };

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= (this.options.maxReconnectAttempts || 10)) {
      console.error('Max reconnection attempts reached');
      toast({
        title: 'Connection Lost',
        description: 'Unable to establish real-time connection. Some features may be limited.',
        variant: 'destructive',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      (this.options.reconnectInterval || 1000) * Math.pow(1.5, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    console.log(`Scheduling WebSocket reconnection attempt ${this.reconnectAttempts} in ${delay}ms`);
    
    this.reconnectTimer = setTimeout(() => {
      if (!this.isIntentionallyClosed) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
    }

    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        // Send ping
        this.send({ type: 'ping', data: {} });

        // Check if we've received a pong recently
        const timeSinceLastPong = Date.now() - this.lastPingTime;
        if (timeSinceLastPong > (this.options.heartbeatInterval || 30000) * 2) {
          console.warn('WebSocket heartbeat timeout, reconnecting...');
          this.ws?.close();
        }
      }
    }, this.options.heartbeatInterval || 30000);
  }

  private clearTimers(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private queueMessage(message: WebSocketMessage): void {
    if (this.options.queueMessages) {
      // Limit queue size to prevent memory issues
      const maxQueueSize = 100;
      if (this.messageQueue.length >= maxQueueSize) {
        this.messageQueue.shift(); // Remove oldest message
      }
      this.messageQueue.push(message);
    }
  }

  private processMessageQueue(): void {
    if (this.messageQueue.length === 0) return;

    console.log(`Processing ${this.messageQueue.length} queued messages`);
    const messages = [...this.messageQueue];
    this.messageQueue = [];

    messages.forEach(message => {
      // Skip messages that are too old
      const age = Date.now() - (message.timestamp || 0);
      if (age < (this.options.messageTimeout || 5000)) {
        this.send(message);
      }
    });
  }

  private generateMessageId(): string {
    return `${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private emit(eventType: string, data: any): void {
    const callbacks = this.listeners.get(eventType);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in WebSocket event listener for ${eventType}:`, error);
        }
      });
    }
  }
}

// Global WebSocket instance
let globalWebSocket: EnhancedWebSocket | null = null;

export function getWebSocket(): EnhancedWebSocket {
  if (!globalWebSocket) {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    globalWebSocket = new EnhancedWebSocket(wsUrl);
    globalWebSocket.connect();
  }
  return globalWebSocket;
}

// React hook for WebSocket
export function useWebSocket(messageType?: string) {
  const [lastMessage, setLastMessage] = React.useState<any>(null);
  const [connectionState, setConnectionState] = React.useState<string>('disconnected');

  React.useEffect(() => {
    const ws = getWebSocket();
    
    // Subscribe to connection state changes
    const unsubConnect = ws.on('connected', () => setConnectionState('connected'));
    const unsubDisconnect = ws.on('disconnected', () => setConnectionState('disconnected'));
    const unsubError = ws.on('error', () => setConnectionState('error'));

    // Subscribe to specific message type if provided
    let unsubMessage: (() => void) | null = null;
    if (messageType) {
      unsubMessage = ws.on(messageType, (data) => {
        setLastMessage(data);
      });
    }

    // Initial state
    setConnectionState(ws.getState());

    return () => {
      unsubConnect();
      unsubDisconnect();
      unsubError();
      if (unsubMessage) unsubMessage();
    };
  }, [messageType]);

  return {
    lastMessage,
    connectionState,
    sendMessage: (message: WebSocketMessage) => getWebSocket().send(message),
    isConnected: () => getWebSocket().isConnected(),
  };
}

export default EnhancedWebSocket;