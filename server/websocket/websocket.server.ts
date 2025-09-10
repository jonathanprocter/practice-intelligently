
import { Server as SocketIOServer, Socket } from 'socket.io';
import { Server as HTTPServer } from 'http';

// Define event types for type safety
export interface WebSocketEvents {
  // Connection events
  'join-therapist-room': (therapistId: string) => void;
  'join-client-room': (clientId: string) => void;
  'join-appointment-room': (appointmentId: string) => void;
  'leave-room': (room: string) => void;
  
  // Appointment events
  'appointment:created': (data: any) => void;
  'appointment:updated': (data: any) => void;
  'appointment:deleted': (data: any) => void;
  'appointment:status-changed': (data: any) => void;
  
  // Session note events
  'session-note:created': (data: any) => void;
  'session-note:updated': (data: any) => void;
  'session-note:deleted': (data: any) => void;
  'session-note:ai-processing': (data: any) => void;
  'session-note:ai-completed': (data: any) => void;
  
  // Client events
  'client:created': (data: any) => void;
  'client:updated': (data: any) => void;
  'client:deleted': (data: any) => void;
  'client:status-changed': (data: any) => void;
  
  // Document events
  'document:upload-started': (data: any) => void;
  'document:upload-progress': (data: any) => void;
  'document:upload-completed': (data: any) => void;
  'document:processing-started': (data: any) => void;
  'document:processing-completed': (data: any) => void;
  
  // AI events
  'ai:insight-generated': (data: any) => void;
  'ai:analysis-started': (data: any) => void;
  'ai:analysis-completed': (data: any) => void;
  
  // Calendar sync events
  'calendar:sync-started': (data: any) => void;
  'calendar:sync-progress': (data: any) => void;
  'calendar:sync-completed': (data: any) => void;
  'calendar:sync-error': (data: any) => void;
  
  // Action item events
  'action-item:created': (data: any) => void;
  'action-item:updated': (data: any) => void;
  'action-item:completed': (data: any) => void;
  'action-item:deleted': (data: any) => void;
  
  // User presence events
  'user:online': (data: any) => void;
  'user:offline': (data: any) => void;
  'user:activity': (data: any) => void;
  
  // System events
  'system:notification': (data: any) => void;
  'system:announcement': (data: any) => void;
  'system:maintenance': (data: any) => void;
}

export interface WebSocketManager {
  io: SocketIOServer;
  broadcast: (event: string, data: any) => void;
  broadcastToRoom: (room: string, event: string, data: any) => void;
  broadcastToTherapist: (therapistId: string, event: string, data: any) => void;
  broadcastToClient: (clientId: string, event: string, data: any) => void;
  getConnectedSockets: () => number;
  getRoomMembers: (room: string) => string[];
}

interface SocketData {
  therapistId?: string;
  userId?: string;
  userType?: 'therapist' | 'client' | 'admin';
  connectedAt: Date;
}

// Store active connections
const activeConnections = new Map<string, SocketData>();
const userPresence = new Map<string, Set<string>>(); // userId -> Set of socketIds

export function setupWebSocketServer(server: HTTPServer): WebSocketManager {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'development' ? 
        ['http://localhost:5173', 'http://localhost:5000'] : 
        true,
      methods: ['GET', 'POST'],
      credentials: true
    },
    pingTimeout: 60000,
    pingInterval: 25000,
    transports: ['websocket', 'polling']
  });

  // Authentication middleware (optional - can be enhanced with actual auth)
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth.token;
    const therapistId = socket.handshake.auth.therapistId;
    
    // Basic validation - enhance with actual JWT verification if needed
    if (therapistId) {
      socket.data = {
        therapistId,
        connectedAt: new Date()
      } as SocketData;
    }
    
    next();
  });

  io.on('connection', (socket: Socket) => {
    const socketData = socket.data as SocketData;
    console.log(`🔌 Client connected: ${socket.id}${socketData?.therapistId ? ` (Therapist: ${socketData.therapistId})` : ''}`);
    
    // Store connection
    activeConnections.set(socket.id, {
      ...socketData,
      connectedAt: new Date()
    });
    
    // Track user presence
    if (socketData?.userId) {
      if (!userPresence.has(socketData.userId)) {
        userPresence.set(socketData.userId, new Set());
      }
      userPresence.get(socketData.userId)?.add(socket.id);
      
      // Broadcast user online status
      io.emit('user:online', {
        userId: socketData.userId,
        timestamp: new Date()
      });
    }

    // Join therapist-specific room automatically if therapistId provided
    if (socketData?.therapistId) {
      socket.join(`therapist-${socketData.therapistId}`);
      console.log(`🏠 Socket ${socket.id} auto-joined therapist room: therapist-${socketData.therapistId}`);
    }

    // Room management
    socket.on('join-therapist-room', (therapistId: string) => {
      socket.join(`therapist-${therapistId}`);
      console.log(`🏠 Socket ${socket.id} joined therapist room: therapist-${therapistId}`);
      
      // Update socket data
      if (socket.data) {
        (socket.data as SocketData).therapistId = therapistId;
      }
    });
    
    socket.on('join-client-room', (clientId: string) => {
      socket.join(`client-${clientId}`);
      console.log(`👤 Socket ${socket.id} joined client room: client-${clientId}`);
    });
    
    socket.on('join-appointment-room', (appointmentId: string) => {
      socket.join(`appointment-${appointmentId}`);
      console.log(`📅 Socket ${socket.id} joined appointment room: appointment-${appointmentId}`);
    });
    
    socket.on('leave-room', (room: string) => {
      socket.leave(room);
      console.log(`🚪 Socket ${socket.id} left room: ${room}`);
    });

    // Appointment events
    socket.on('appointment:created', (data) => {
      console.log('📅 Appointment created:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('appointment:created', data);
      }
    });
    
    socket.on('appointment:updated', (data) => {
      console.log('📅 Appointment updated:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('appointment:updated', data);
      }
      if (data.appointmentId) {
        socket.to(`appointment-${data.appointmentId}`).emit('appointment:updated', data);
      }
    });
    
    socket.on('appointment:deleted', (data) => {
      console.log('📅 Appointment deleted:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('appointment:deleted', data);
      }
    });

    // Session note events
    socket.on('session-note:created', (data) => {
      console.log('📝 Session note created:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('session-note:created', data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit('session-note:created', data);
      }
    });
    
    socket.on('session-note:updated', (data) => {
      console.log('📝 Session note updated:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('session-note:updated', data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit('session-note:updated', data);
      }
    });

    // Client events
    socket.on('client:updated', (data) => {
      console.log('👤 Client updated:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('client:updated', data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit('client:updated', data);
      }
    });

    // Document events
    socket.on('document:upload-progress', (data) => {
      console.log('📄 Document upload progress:', data);
      if (data.room) {
        socket.to(data.room).emit('document:upload-progress', data);
      }
    });

    // AI events
    socket.on('ai:insight-generated', (data) => {
      console.log('🤖 AI insight generated:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('ai:insight-generated', data);
      }
    });

    // Calendar sync events
    socket.on('calendar:sync-progress', (data) => {
      console.log('📆 Calendar sync progress:', data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit('calendar:sync-progress', data);
      }
    });

    // User activity tracking
    socket.on('user:activity', (data) => {
      if (socketData?.userId) {
        socket.to('admin').emit('user:activity', {
          ...data,
          userId: socketData.userId,
          timestamp: new Date()
        });
      }
    });

    // Handle disconnection
    socket.on('disconnect', (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
      
      // Remove from active connections
      activeConnections.delete(socket.id);
      
      // Update user presence
      if (socketData?.userId) {
        const userSockets = userPresence.get(socketData.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          
          // If user has no more active connections, mark as offline
          if (userSockets.size === 0) {
            userPresence.delete(socketData.userId);
            io.emit('user:offline', {
              userId: socketData.userId,
              timestamp: new Date()
            });
          }
        }
      }
    });

    // Error handling
    socket.on('error', (error) => {
      console.error('❌ Socket error:', error);
    });
  });

  // Create WebSocket manager with utility methods
  const wsManager: WebSocketManager = {
    io,
    
    broadcast: (event: string, data: any) => {
      console.log(`📢 Broadcasting: ${event}`);
      io.emit(event, data);
    },
    
    broadcastToRoom: (room: string, event: string, data: any) => {
      console.log(`📢 Broadcasting to room ${room}: ${event}`);
      io.to(room).emit(event, data);
    },
    
    broadcastToTherapist: (therapistId: string, event: string, data: any) => {
      console.log(`📢 Broadcasting to therapist ${therapistId}: ${event}`);
      io.to(`therapist-${therapistId}`).emit(event, data);
    },
    
    broadcastToClient: (clientId: string, event: string, data: any) => {
      console.log(`📢 Broadcasting to client ${clientId}: ${event}`);
      io.to(`client-${clientId}`).emit(event, data);
    },
    
    getConnectedSockets: () => {
      return activeConnections.size;
    },
    
    getRoomMembers: (room: string) => {
      const roomMembers = io.sockets.adapter.rooms.get(room);
      return roomMembers ? Array.from(roomMembers) : [];
    }
  };

  // Log server stats periodically
  setInterval(() => {
    console.log(`📊 WebSocket Stats: ${activeConnections.size} connections, ${userPresence.size} unique users`);
  }, 60000);

  return wsManager;
}
