// services/websocket.service.ts
import { EventEmitter } from 'events';
import { toast } from '@/hooks/use-toast';

export type WSEventType = 
  | 'appointment.created'
  | 'appointment.updated'
  | 'appointment.cancelled'
  | 'appointment.started'
  | 'appointment.ended'
  | 'client.updated'
  | 'session.note.created'
  | 'session.note.updated'
  | 'ai.insight.generated'
  | 'action.item.created'
  | 'action.item.completed'
  | 'calendar.sync'
  | 'user.status'
  | 'notification';

export interface WSMessage {
  type: WSEventType;
  data: any;
  timestamp: string;
  userId?: string;
  metadata?: {
    priority?: 'low' | 'medium' | 'high' | 'urgent';
    source?: string;
    correlationId?: string;
  };
}

interface WebSocketConfig {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  heartbeatInterval?: number;
  enableCompression?: boolean;
  debug?: boolean;
}

class WebSocketService extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WSMessage[] = [];
  private isConnected = false;
  private therapistId: string | null = null;
  private lastActivity = Date.now();
  private activityCheckTimer: NodeJS.Timeout | null = null;

  constructor(config: WebSocketConfig = {}) {
    super();
    this.config = {
      url: config.url || this.getWebSocketUrl(),
      reconnectInterval: config.reconnectInterval || 3000,
      maxReconnectAttempts: config.maxReconnectAttempts || 10,
      heartbeatInterval: config.heartbeatInterval || 30000,
      enableCompression: config.enableCompression ?? true,
      debug: config.debug ?? false,
    };
  }

  private getWebSocketUrl(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    return `${protocol}//${host}/ws`;
  }

  public connect(therapistId: string): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.log('WebSocket already connected');
      return;
    }

    this.therapistId = therapistId;
    this.log('Connecting to WebSocket...');

    try {
      const url = `${this.config.url}?therapistId=${therapistId}`;
      this.ws = new WebSocket(url);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onerror = this.handleError.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
    } catch (error) {
      this.log('Failed to create WebSocket connection', error);
      this.scheduleReconnect();
    }
  }

  private handleOpen(): void {
    this.log('WebSocket connected');
    this.isConnected = true;
    this.reconnectAttempts = 0;

    // Send authentication
    this.send({
      type: 'user.status',
      data: { 
        therapistId: this.therapistId,
        status: 'online',
        timestamp: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });

    // Process queued messages
    this.processMessageQueue();

    // Start heartbeat
    this.startHeartbeat();

    // Start activity monitoring
    this.startActivityMonitoring();

    // Emit connection event
    this.emit('connected');

    // Show connection notification
    if (this.reconnectAttempts > 0) {
      toast({
        title: 'Reconnected',
        description: 'Real-time updates restored',
        duration: 2000,
      });
    }
  }

  private handleMessage(event: MessageEvent): void {
    this.lastActivity = Date.now();

    try {
      const message: WSMessage = JSON.parse(event.data);
      this.log('Received message:', message.type);

      // Handle different message types
      switch (message.type) {
        case 'appointment.created':
        case 'appointment.updated':
        case 'appointment.cancelled':
          this.emit('appointment-change', message);
          this.showNotification(message);
          break;

        case 'appointment.started':
          this.emit('session-started', message);
          this.showNotification(message, 'Session started');
          break;

        case 'appointment.ended':
          this.emit('session-ended', message);
          this.showNotification(message, 'Session ended');
          break;

        case 'session.note.created':
        case 'session.note.updated':
          this.emit('session-note-change', message);
          break;

        case 'ai.insight.generated':
          this.emit('ai-insight', message);
          this.showNotification(message, 'New AI insight available');
          break;

        case 'action.item.created':
          this.emit('action-item-created', message);
          this.showNotification(message, 'New action item');
          break;

        case 'action.item.completed':
          this.emit('action-item-completed', message);
          break;

        case 'calendar.sync':
          this.emit('calendar-sync', message);
          break;

        case 'notification':
          this.showNotification(message);
          break;

        default:
          this.emit(message.type, message);
      }

      // Emit generic message event
      this.emit('message', message);

    } catch (error) {
      this.log('Failed to parse message', error);
    }
  }

  private handleError(error: Event): void {
    this.log('WebSocket error', error);
    this.emit('error', error);
  }

  private handleClose(event: CloseEvent): void {
    this.log('WebSocket closed', event.code, event.reason);
    this.isConnected = false;
    this.stopHeartbeat();
    this.stopActivityMonitoring();

    // Emit disconnection event
    this.emit('disconnected', event);

    // Attempt reconnection if not a normal closure
    if (event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      toast({
        title: 'Connection Lost',
        description: 'Unable to establish real-time connection. Please refresh the page.',
        variant: 'destructive',
      });
      return;
    }

    this.reconnectAttempts++;
    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(1.5, this.reconnectAttempts - 1),
      30000
    );

    this.log(`Scheduling reconnect attempt ${this.reconnectAttempts} in ${delay}ms`);

    this.reconnectTimer = setTimeout(() => {
      if (this.therapistId) {
        this.connect(this.therapistId);
      }
    }, delay);
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'user.status',
          data: { 
            type: 'heartbeat',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private startActivityMonitoring(): void {
    this.stopActivityMonitoring();

    // Check for inactivity every minute
    this.activityCheckTimer = setInterval(() => {
      const inactiveTime = Date.now() - this.lastActivity;
      const isInactive = inactiveTime > 5 * 60 * 1000; // 5 minutes

      if (isInactive && this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'user.status',
          data: { 
            status: 'idle',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }
    }, 60000);

    // Track user activity
    const updateActivity = () => {
      this.lastActivity = Date.now();
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.send({
          type: 'user.status',
          data: { 
            status: 'active',
            timestamp: new Date().toISOString()
          },
          timestamp: new Date().toISOString()
        });
      }
    };

    window.addEventListener('mousemove', updateActivity, { passive: true });
    window.addEventListener('keypress', updateActivity, { passive: true });
  }

  private stopActivityMonitoring(): void {
    if (this.activityCheckTimer) {
      clearInterval(this.activityCheckTimer);
      this.activityCheckTimer = null;
    }
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.send(message);
      }
    }
  }

  public send(message: WSMessage): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
        this.log('Sent message:', message.type);
      } catch (error) {
        this.log('Failed to send message', error);
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
      this.log('Message queued:', message.type);
    }
  }

  private showNotification(message: WSMessage, title?: string): void {
    const priority = message.metadata?.priority || 'medium';
    const shouldNotify = priority === 'high' || priority === 'urgent';

    if (!shouldNotify) return;

    // Check if browser notifications are enabled
    if ('Notification' in window && Notification.permission === 'granted') {
      const notificationTitle = title || this.getNotificationTitle(message.type);
      const notification = new Notification(notificationTitle, {
        body: this.getNotificationBody(message),
        icon: '/icon-192x192.png',
        badge: '/badge-72x72.png',
        tag: message.type,
        requireInteraction: priority === 'urgent',
      });

      notification.onclick = () => {
        window.focus();
        notification.close();
        this.emit('notification-clicked', message);
      };
    }

    // Always show in-app toast for important messages
    if (priority === 'urgent') {
      toast({
        title: title || this.getNotificationTitle(message.type),
        description: this.getNotificationBody(message),
        variant: 'default',
        duration: 5000,
      });
    }
  }

  private getNotificationTitle(type: WSEventType): string {
    const titles: Record<WSEventType, string> = {
      'appointment.created': 'New Appointment',
      'appointment.updated': 'Appointment Updated',
      'appointment.cancelled': 'Appointment Cancelled',
      'appointment.started': 'Session Started',
      'appointment.ended': 'Session Ended',
      'client.updated': 'Client Information Updated',
      'session.note.created': 'Session Note Created',
      'session.note.updated': 'Session Note Updated',
      'ai.insight.generated': 'AI Insight Available',
      'action.item.created': 'New Action Item',
      'action.item.completed': 'Action Item Completed',
      'calendar.sync': 'Calendar Synced',
      'user.status': 'Status Update',
      'notification': 'Notification',
    };
    return titles[type] || 'Update';
  }

  private getNotificationBody(message: WSMessage): string {
    if (message.data?.description) return message.data.description;
    if (message.data?.message) return message.data.message;
    if (message.data?.clientName) return `Client: ${message.data.clientName}`;
    return 'You have a new update';
  }

  public disconnect(): void {
    this.log('Disconnecting WebSocket');

    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();
    this.stopActivityMonitoring();

    if (this.ws) {
      this.ws.close(1000, 'User disconnected');
      this.ws = null;
    }

    this.isConnected = false;
    this.messageQueue = [];
  }

  public getConnectionState(): 'connecting' | 'connected' | 'disconnected' {
    if (!this.ws) return 'disconnected';

    switch (this.ws.readyState) {
      case WebSocket.CONNECTING:
        return 'connecting';
      case WebSocket.OPEN:
        return 'connected';
      default:
        return 'disconnected';
    }
  }

  public isOnline(): boolean {
    return this.isConnected && this.ws?.readyState === WebSocket.OPEN;
  }

  private log(...args: any[]): void {
    if (this.config.debug) {
      console.log('[WebSocket]', ...args);
    }
  }
}

// Create singleton instance
export const wsService = new WebSocketService({
  debug: process.env.NODE_ENV === 'development'
});

// Export hooks for React components
export function useWebSocket() {
  const [isConnected, setIsConnected] = useState(wsService.isOnline());
  const [lastMessage, setLastMessage] = useState<WSMessage | null>(null);

  useEffect(() => {
    const handleConnected = () => setIsConnected(true);
    const handleDisconnected = () => setIsConnected(false);
    const handleMessage = (message: WSMessage) => setLastMessage(message);

    wsService.on('connected', handleConnected);
    wsService.on('disconnected', handleDisconnected);
    wsService.on('message', handleMessage);

    return () => {
      wsService.off('connected', handleConnected);
      wsService.off('disconnected', handleDisconnected);
      wsService.off('message', handleMessage);
    };
  }, []);

  return {
    isConnected,
    lastMessage,
    send: wsService.send.bind(wsService),
    disconnect: wsService.disconnect.bind(wsService),
    connect: wsService.connect.bind(wsService),
  };
}

export default wsService;