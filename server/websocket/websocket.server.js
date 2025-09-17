// server/websocket/websocket.server.ts
import { Server as SocketIOServer } from "socket.io";
var activeConnections = /* @__PURE__ */ new Map();
var userPresence = /* @__PURE__ */ new Map();
function setupWebSocketServer(server) {
  const io = new SocketIOServer(server, {
    cors: {
      origin: process.env.NODE_ENV === "development" ? ["http://localhost:5173", "http://localhost:5000"] : true,
      methods: ["GET", "POST"],
      credentials: true
    },
    pingTimeout: 6e4,
    pingInterval: 25e3,
    transports: ["websocket", "polling"]
  });
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    const therapistId = socket.handshake.auth.therapistId;
    if (therapistId) {
      socket.data = {
        therapistId,
        connectedAt: /* @__PURE__ */ new Date()
      };
    }
    next();
  });
  io.on("connection", (socket) => {
    const socketData = socket.data;
    console.log(`\u{1F50C} Client connected: ${socket.id}${socketData?.therapistId ? ` (Therapist: ${socketData.therapistId})` : ""}`);
    activeConnections.set(socket.id, {
      ...socketData,
      connectedAt: /* @__PURE__ */ new Date()
    });
    if (socketData?.userId) {
      if (!userPresence.has(socketData.userId)) {
        userPresence.set(socketData.userId, /* @__PURE__ */ new Set());
      }
      userPresence.get(socketData.userId)?.add(socket.id);
      io.emit("user:online", {
        userId: socketData.userId,
        timestamp: /* @__PURE__ */ new Date()
      });
    }
    if (socketData?.therapistId) {
      socket.join(`therapist-${socketData.therapistId}`);
      console.log(`\u{1F3E0} Socket ${socket.id} auto-joined therapist room: therapist-${socketData.therapistId}`);
    }
    socket.on("join-therapist-room", (therapistId) => {
      socket.join(`therapist-${therapistId}`);
      console.log(`\u{1F3E0} Socket ${socket.id} joined therapist room: therapist-${therapistId}`);
      if (socket.data) {
        socket.data.therapistId = therapistId;
      }
    });
    socket.on("join-client-room", (clientId) => {
      socket.join(`client-${clientId}`);
      console.log(`\u{1F464} Socket ${socket.id} joined client room: client-${clientId}`);
    });
    socket.on("join-appointment-room", (appointmentId) => {
      socket.join(`appointment-${appointmentId}`);
      console.log(`\u{1F4C5} Socket ${socket.id} joined appointment room: appointment-${appointmentId}`);
    });
    socket.on("leave-room", (room) => {
      socket.leave(room);
      console.log(`\u{1F6AA} Socket ${socket.id} left room: ${room}`);
    });
    socket.on("appointment:created", (data) => {
      console.log("\u{1F4C5} Appointment created:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("appointment:created", data);
      }
    });
    socket.on("appointment:updated", (data) => {
      console.log("\u{1F4C5} Appointment updated:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("appointment:updated", data);
      }
      if (data.appointmentId) {
        socket.to(`appointment-${data.appointmentId}`).emit("appointment:updated", data);
      }
    });
    socket.on("appointment:deleted", (data) => {
      console.log("\u{1F4C5} Appointment deleted:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("appointment:deleted", data);
      }
    });
    socket.on("session-note:created", (data) => {
      console.log("\u{1F4DD} Session note created:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("session-note:created", data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit("session-note:created", data);
      }
    });
    socket.on("session-note:updated", (data) => {
      console.log("\u{1F4DD} Session note updated:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("session-note:updated", data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit("session-note:updated", data);
      }
    });
    socket.on("client:updated", (data) => {
      console.log("\u{1F464} Client updated:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("client:updated", data);
      }
      if (data.clientId) {
        socket.to(`client-${data.clientId}`).emit("client:updated", data);
      }
    });
    socket.on("document:upload-progress", (data) => {
      console.log("\u{1F4C4} Document upload progress:", data);
      if (data.room) {
        socket.to(data.room).emit("document:upload-progress", data);
      }
    });
    socket.on("ai:insight-generated", (data) => {
      console.log("\u{1F916} AI insight generated:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("ai:insight-generated", data);
      }
    });
    socket.on("calendar:sync-progress", (data) => {
      console.log("\u{1F4C6} Calendar sync progress:", data);
      if (socketData?.therapistId) {
        socket.to(`therapist-${socketData.therapistId}`).emit("calendar:sync-progress", data);
      }
    });
    socket.on("user:activity", (data) => {
      if (socketData?.userId) {
        socket.to("admin").emit("user:activity", {
          ...data,
          userId: socketData.userId,
          timestamp: /* @__PURE__ */ new Date()
        });
      }
    });
    socket.on("disconnect", (reason) => {
      console.log(`\u{1F50C} Client disconnected: ${socket.id} (${reason})`);
      activeConnections.delete(socket.id);
      if (socketData?.userId) {
        const userSockets = userPresence.get(socketData.userId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            userPresence.delete(socketData.userId);
            io.emit("user:offline", {
              userId: socketData.userId,
              timestamp: /* @__PURE__ */ new Date()
            });
          }
        }
      }
    });
    socket.on("error", (error) => {
      console.error("\u274C Socket error:", error);
    });
  });
  const wsManager = {
    io,
    broadcast: (event, data) => {
      console.log(`\u{1F4E2} Broadcasting: ${event}`);
      io.emit(event, data);
    },
    broadcastToRoom: (room, event, data) => {
      console.log(`\u{1F4E2} Broadcasting to room ${room}: ${event}`);
      io.to(room).emit(event, data);
    },
    broadcastToTherapist: (therapistId, event, data) => {
      console.log(`\u{1F4E2} Broadcasting to therapist ${therapistId}: ${event}`);
      io.to(`therapist-${therapistId}`).emit(event, data);
    },
    broadcastToClient: (clientId, event, data) => {
      console.log(`\u{1F4E2} Broadcasting to client ${clientId}: ${event}`);
      io.to(`client-${clientId}`).emit(event, data);
    },
    getConnectedSockets: () => {
      return activeConnections.size;
    },
    getRoomMembers: (room) => {
      const roomMembers = io.sockets.adapter.rooms.get(room);
      return roomMembers ? Array.from(roomMembers) : [];
    }
  };
  setInterval(() => {
    console.log(`\u{1F4CA} WebSocket Stats: ${activeConnections.size} connections, ${userPresence.size} unique users`);
  }, 6e4);
  return wsManager;
}
export {
  setupWebSocketServer
};
