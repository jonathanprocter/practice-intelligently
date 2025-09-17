// Fallback WebSocket handler using socket.io to prevent client errors
import { Server } from 'socket.io';

export function setupWebSocketFallback(server) {
  console.log('🔌 Setting up WebSocket server (fallback mode)');
  
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"]
    },
    transports: ['websocket', 'polling']
  });

  io.on('connection', (socket) => {
    console.log('Client connected:', socket.id);
    
    // Handle therapist room joining
    socket.on('join-therapist-room', (therapistId) => {
      socket.join(`therapist:${therapistId}`);
      console.log(`Socket ${socket.id} joined room therapist:${therapistId}`);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      console.log('Client disconnected:', socket.id);
    });

    // Echo back any other events (for testing)
    socket.onAny((event, ...args) => {
      console.log(`Received event: ${event}`, args);
    });
  });

  return io;
}

export default { setupWebSocketFallback };