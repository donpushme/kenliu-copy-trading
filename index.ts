// src/index.ts
import { app } from "./app";
import { createServer } from "./http";
import { initializeSocketServer } from "./socket-server";

const start = async () => {
  try {
    // Create the HTTP server using the Express app
    const httpServer = createServer(app);
    
    // Initialize Socket.io with the HTTP server
    const io = initializeSocketServer(httpServer);
    
    console.log("Server started successfully");
    
    // Handle graceful shutdown
    process.on("SIGTERM", gracefulShutdown);
    process.on("SIGINT", gracefulShutdown);
    
    function gracefulShutdown() {
      console.log("Shutting down gracefully...");
      httpServer.close(() => {
        console.log("HTTP server closed");
        process.exit(0);
      });
    }
  } catch (error) {
    console.error("Failed to start server:", error);
    process.exit(1);
  }
};

start();