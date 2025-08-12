
import { Server as SocketIOServer } from 'socket.io';
import { Server as HTTPServer } from 'http';

export interface WebSocketManager {
  io: SocketIOServer;
  broadcast: (event: string, data: any) => void;
  broadcastToRoom: (room: string, event: string, data: any) => void;
}

export function setupWebSocketServer(server: HTTPServer): WebSocketManager {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === 'development' ? 'http://localhost:5173' : true,
      methods: ['GET', 'POST']
    }
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);

    // Join therapist-specific room
    socket.on('join-therapist-room', (therapistId: string) => {
      socket.join(`therapist-${therapistId}`);
      console.log(`Socket ${socket.id} joined therapist room: therapist-${therapistId}`);
    });

    // Handle session updates
    socket.on('session-update', (data) => {
      socket.broadcast.emit('session-updated', data);
    });

    // Handle appointment changes
    socket.on('appointment-change', (data) => {
      socket.broadcast.emit('appointment-changed', data);
    });

    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });
  });

  const wsManager: WebSocketManager = {
    io,
    broadcast: (event: string, data: any) => {
      io.emit(event, data);
    },
    broadcastToRoom: (room: string, event: string, data: any) => {
      io.to(room).emit(event, data);
    }
  };

  return wsManager;
}
