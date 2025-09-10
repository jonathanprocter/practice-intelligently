// Optimized WebSocket manager with message batching and throttling
import { Server } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import { EventEmitter } from 'events';

interface WSMessage {
  type: string;
  data: any;
  timestamp: number;
}

interface BatchedMessage {
  messages: WSMessage[];
  count: number;
}

interface ClientMetrics {
  messagesReceived: number;
  messagesSent: number;
  batchesSent: number;
  lastActivity: number;
  connectionTime: number;
}

class OptimizedWebSocketManager extends EventEmitter {
  private wss: WebSocketServer;
  private clients: Map<string, WebSocket> = new Map();
  private rooms: Map<string, Set<string>> = new Map();
  private messageQueue: Map<string, WSMessage[]> = new Map();
  private clientMetrics: Map<string, ClientMetrics> = new Map();
  
  // Configuration
  private readonly BATCH_INTERVAL = 100; // Batch messages every 100ms
  private readonly MAX_BATCH_SIZE = 50; // Max messages per batch
  private readonly THROTTLE_INTERVAL = 50; // Minimum ms between sends
  private readonly HEARTBEAT_INTERVAL = 30000; // 30 seconds
  
  private batchTimers: Map<string, NodeJS.Timeout> = new Map();
  private lastSendTime: Map<string, number> = new Map();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: Server) {
    super();
    
    this.wss = new WebSocketServer({ 
      server,
      perMessageDeflate: {
        zlibDeflateOptions: {
          level: 6, // Compression level
          memLevel: 8,
          strategy: 3 // Z_FIXED strategy
        },
        zlibInflateOptions: {
          chunkSize: 10 * 1024
        },
        clientNoContextTakeover: true, // Prevents client memory build-up
        serverNoContextTakeover: true, // Prevents server memory build-up
        serverMaxWindowBits: 14,
        concurrencyLimit: 10, // Limits concurrent compressions
        threshold: 1024 // Only compress messages > 1KB
      }
    });
    
    this.initialize();
    this.startHeartbeat();
  }

  private initialize() {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      
      // Initialize client metrics
      this.clientMetrics.set(clientId, {
        messagesReceived: 0,
        messagesSent: 0,
        batchesSent: 0,
        lastActivity: Date.now(),
        connectionTime: Date.now()
      });
      
      this.clients.set(clientId, ws);
      this.messageQueue.set(clientId, []);
      
      // Send optimized connection message
      this.sendImmediate(clientId, {
        type: 'connection',
        data: { 
          clientId,
          config: {
            batchInterval: this.BATCH_INTERVAL,
            maxBatchSize: this.MAX_BATCH_SIZE
          }
        }
      });
      
      ws.on('message', (message: Buffer) => {
        this.handleMessage(clientId, message);
      });
      
      ws.on('close', () => {
        this.handleDisconnect(clientId);
      });
      
      ws.on('error', (error) => {
        console.error(`WebSocket error for client ${clientId}:`, error);
        this.handleDisconnect(clientId);
      });
      
      ws.on('pong', () => {
        const metrics = this.clientMetrics.get(clientId);
        if (metrics) {
          metrics.lastActivity = Date.now();
        }
      });
      
      this.emit('client:connected', clientId);
    });
  }

  private handleMessage(clientId: string, message: Buffer) {
    try {
      const metrics = this.clientMetrics.get(clientId);
      if (metrics) {
        metrics.messagesReceived++;
        metrics.lastActivity = Date.now();
      }
      
      const data = JSON.parse(message.toString());
      
      // Handle different message types
      switch (data.type) {
        case 'join':
          this.joinRoom(clientId, data.room);
          break;
        case 'leave':
          this.leaveRoom(clientId, data.room);
          break;
        case 'broadcast':
          this.broadcastToRoom(data.room, data.data, clientId);
          break;
        case 'metrics':
          this.sendMetrics(clientId);
          break;
        default:
          this.emit('message', { clientId, data });
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleDisconnect(clientId: string) {
    // Clear batch timer
    const timer = this.batchTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(clientId);
    }
    
    // Leave all rooms
    for (const [roomId, members] of this.rooms.entries()) {
      members.delete(clientId);
      if (members.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    // Clean up
    this.clients.delete(clientId);
    this.messageQueue.delete(clientId);
    this.clientMetrics.delete(clientId);
    this.lastSendTime.delete(clientId);
    
    this.emit('client:disconnected', clientId);
  }

  // Room management
  private joinRoom(clientId: string, roomId: string) {
    if (!this.rooms.has(roomId)) {
      this.rooms.set(roomId, new Set());
    }
    this.rooms.get(roomId)!.add(clientId);
    
    this.emit('room:joined', { clientId, roomId });
  }

  private leaveRoom(clientId: string, roomId: string) {
    const room = this.rooms.get(roomId);
    if (room) {
      room.delete(clientId);
      if (room.size === 0) {
        this.rooms.delete(roomId);
      }
    }
    
    this.emit('room:left', { clientId, roomId });
  }

  // Optimized message sending with batching
  public send(clientId: string, message: WSMessage) {
    const queue = this.messageQueue.get(clientId);
    if (!queue) return;
    
    queue.push({
      ...message,
      timestamp: Date.now()
    });
    
    // Start batch timer if not already running
    if (!this.batchTimers.has(clientId)) {
      const timer = setTimeout(() => {
        this.flushBatch(clientId);
      }, this.BATCH_INTERVAL);
      
      this.batchTimers.set(clientId, timer);
    }
    
    // Flush immediately if batch is full
    if (queue.length >= this.MAX_BATCH_SIZE) {
      this.flushBatch(clientId);
    }
  }

  // Send message immediately without batching (for critical messages)
  private sendImmediate(clientId: string, message: any) {
    const ws = this.clients.get(clientId);
    if (!ws || ws.readyState !== WebSocket.OPEN) return;
    
    try {
      ws.send(JSON.stringify(message));
      
      const metrics = this.clientMetrics.get(clientId);
      if (metrics) {
        metrics.messagesSent++;
      }
    } catch (error) {
      console.error(`Error sending immediate message to ${clientId}:`, error);
    }
  }

  private flushBatch(clientId: string) {
    const queue = this.messageQueue.get(clientId);
    const ws = this.clients.get(clientId);
    
    if (!queue || queue.length === 0 || !ws || ws.readyState !== WebSocket.OPEN) {
      this.clearBatchTimer(clientId);
      return;
    }
    
    // Apply throttling
    const lastSend = this.lastSendTime.get(clientId) || 0;
    const now = Date.now();
    
    if (now - lastSend < this.THROTTLE_INTERVAL) {
      // Reschedule batch
      this.clearBatchTimer(clientId);
      const timer = setTimeout(() => {
        this.flushBatch(clientId);
      }, this.THROTTLE_INTERVAL - (now - lastSend));
      this.batchTimers.set(clientId, timer);
      return;
    }
    
    // Send batched messages
    const batch: BatchedMessage = {
      messages: queue.splice(0, this.MAX_BATCH_SIZE),
      count: queue.length
    };
    
    try {
      ws.send(JSON.stringify({
        type: 'batch',
        data: batch
      }));
      
      this.lastSendTime.set(clientId, now);
      
      const metrics = this.clientMetrics.get(clientId);
      if (metrics) {
        metrics.batchesSent++;
        metrics.messagesSent += batch.messages.length;
      }
    } catch (error) {
      console.error(`Error sending batch to ${clientId}:`, error);
    }
    
    // Clear or reschedule timer
    this.clearBatchTimer(clientId);
    
    if (queue.length > 0) {
      const timer = setTimeout(() => {
        this.flushBatch(clientId);
      }, this.BATCH_INTERVAL);
      this.batchTimers.set(clientId, timer);
    }
  }

  private clearBatchTimer(clientId: string) {
    const timer = this.batchTimers.get(clientId);
    if (timer) {
      clearTimeout(timer);
      this.batchTimers.delete(clientId);
    }
  }

  // Broadcast to room with optimization
  public broadcastToRoom(roomId: string, message: any, excludeClientId?: string) {
    const room = this.rooms.get(roomId);
    if (!room) return;
    
    const wsMessage: WSMessage = {
      type: 'room:message',
      data: { roomId, ...message },
      timestamp: Date.now()
    };
    
    for (const clientId of room) {
      if (clientId !== excludeClientId) {
        this.send(clientId, wsMessage);
      }
    }
  }

  // Broadcast to all clients
  public broadcast(message: any, excludeClientId?: string) {
    const wsMessage: WSMessage = {
      type: 'broadcast',
      data: message,
      timestamp: Date.now()
    };
    
    for (const clientId of this.clients.keys()) {
      if (clientId !== excludeClientId) {
        this.send(clientId, wsMessage);
      }
    }
  }

  // Heartbeat to keep connections alive and detect stale connections
  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      const now = Date.now();
      
      for (const [clientId, ws] of this.clients.entries()) {
        const metrics = this.clientMetrics.get(clientId);
        
        if (metrics && now - metrics.lastActivity > this.HEARTBEAT_INTERVAL * 2) {
          // Connection is stale, disconnect
          console.log(`Disconnecting stale client: ${clientId}`);
          ws.terminate();
          this.handleDisconnect(clientId);
        } else if (ws.readyState === WebSocket.OPEN) {
          ws.ping();
        }
      }
    }, this.HEARTBEAT_INTERVAL);
  }

  // Send performance metrics to client
  private sendMetrics(clientId: string) {
    const metrics = this.clientMetrics.get(clientId);
    if (!metrics) return;
    
    const connectionDuration = Date.now() - metrics.connectionTime;
    
    this.sendImmediate(clientId, {
      type: 'metrics',
      data: {
        ...metrics,
        connectionDuration,
        avgMessagesPerMinute: (metrics.messagesReceived / (connectionDuration / 60000)).toFixed(2),
        compressionEnabled: true,
        batchingEnabled: true
      }
    });
  }

  // Get overall statistics
  public getStatistics() {
    let totalMessages = 0;
    let totalBatches = 0;
    
    for (const metrics of this.clientMetrics.values()) {
      totalMessages += metrics.messagesSent;
      totalBatches += metrics.batchesSent;
    }
    
    return {
      connectedClients: this.clients.size,
      activeRooms: this.rooms.size,
      totalMessages,
      totalBatches,
      averageBatchSize: totalBatches > 0 ? (totalMessages / totalBatches).toFixed(2) : 0,
      clientMetrics: Array.from(this.clientMetrics.entries()).map(([id, metrics]) => ({
        clientId: id,
        ...metrics
      }))
    };
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Cleanup on shutdown
  public shutdown() {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    // Clear all batch timers
    for (const timer of this.batchTimers.values()) {
      clearTimeout(timer);
    }
    
    // Close all connections
    for (const ws of this.clients.values()) {
      ws.close();
    }
    
    this.wss.close();
    this.removeAllListeners();
  }
}

export default OptimizedWebSocketManager;