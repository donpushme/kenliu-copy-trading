// src/server/http-server.ts
import http from "http";
import { Express } from "express";
import dotenv from "dotenv";
import connectDB from "./db/connection";

dotenv.config();

// HTTP server instance
let server: http.Server;

/**
 * Create and configure the HTTP server
 * @param app - The Express application to use
 * @returns The HTTP server instance
 */
export function createServer(app: Express): http.Server {
  const port = process.env.PORT || 5000;
  const MongoDB_URI = process.env.MONGO_URI || "mongodb://localhost:27017/mike";
  server = http.createServer(app);

  server.listen(port, () => {
    connectDB(MongoDB_URI);
    console.log(`HTTP server is listening on http://localhost:${port}`);
  });

  // Handle server errors
  server.on("error", (error: NodeJS.ErrnoException) => {
    if (error.syscall !== "listen") {
      throw error;
    }

    const bind = typeof port === "string" ? `Pipe ${port}` : `Port ${port}`;

    // Handle specific listen errors with friendly messages
    switch (error.code) {
      case "EACCES":
        console.error(`${bind} requires elevated privileges`);
        process.exit(1);
        break;
      case "EADDRINUSE":
        console.error(`${bind} is already in use`);
        process.exit(1);
        break;
      default:
        throw error;
    }
  });

  return server;
}

/**
 * Get the existing HTTP server instance
 * @returns The HTTP server instance
 * @throws Error if the server has not been created
 */
export function getServer(): http.Server {
  if (!server) {
    throw new Error("HTTP server has not been created. Call createServer first.");
  }
  return server;
}

/**
 * Shut down the HTTP server gracefully
 * @returns Promise that resolves when the server has closed
 */
export function closeServer(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (!server) {
      resolve();
      return;
    }

    server.close((err) => {
      if (err) {
        reject(err);
        return;
      }
      console.log("HTTP server closed");
      resolve();
    });
  });
}