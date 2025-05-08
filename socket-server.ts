// src/socket/socket-server.ts
import { Server as SocketIOServer } from "socket.io";
import { Server as HTTPServer } from "http";
import dotenv from "dotenv";

dotenv.config();

// Socket.io instance that will be exported
let io: SocketIOServer;

/**
 * Initialize and configure the Socket.io server
 * @param httpServer - The HTTP server to attach Socket.io to
 * @returns The configured Socket.io server instance
 */
export function initializeSocketServer(httpServer: HTTPServer): SocketIOServer {
  io = new SocketIOServer(httpServer, {
    cors: {
      origin: process.env.SOCKET_CORS_ORIGIN || "*",
      methods: ["GET", "POST"],
      credentials: true
    }
  });

  // Set up event handlers
  io.on("connection", (socket) => {
    console.log(`Client connected: ${socket.id}`);

    // Handle client messages
    socket.on("message", (data) => {
      console.log(`Received message from ${socket.id}:`, data);
      socket.emit("response", { status: "Message received", timestamp: new Date() });
    });

    // Custom event for bot status updates
    socket.on("botStatusRequest", () => {
      socket.emit("botStatus", { isRunning: false, lastOperation: new Date() });
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  console.log("Socket.io server initialized");
  return io;
}

/**
 * Get the existing Socket.io instance
 * @returns The Socket.io server instance
 * @throws Error if the Socket.io server has not been initialized
 */
export function getSocketIO(): SocketIOServer {
  if (!io) {
    throw new Error("Socket.io has not been initialized. Call initializeSocketServer first.");
  }
  return io;
}

// Add more socket-related utility functions here
export function emitToAll(event: string, data: any): void {
  if (!io) {
    console.error("Socket.io not initialized. Cannot emit event:", event);
    return;
  }
  io.emit(event, data);
}

export function emitToRoom(room: string, event: string, data: any): void {
  if (!io) {
    console.error("Socket.io not initialized. Cannot emit event to room:", room, event);
    return;
  }
  io.to(room).emit(event, data);
}

export function emitTrade(isBuy: boolean, isMaster:boolean, amount: number, token: string, signature: string ): void {
  if (!io) {
    console.error("Socket.io not initialized. Cannot emit trade event");
    return;
  }
  io.emit("trade", { isBuy, isMaster, amount, token, signature });
}