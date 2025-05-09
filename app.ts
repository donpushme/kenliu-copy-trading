// src/app.ts
import express, { Request, Response } from "express";
import botRouter from "./route/bot";
import dotenv from "dotenv";
import bodyParser from "body-parser";
import cors from "cors";

dotenv.config();

// Create Express application
const app = express();

// Middleware
app.use(bodyParser.json());

app.use(cors())

// Basic health check endpoint
app.get("/health", (req: Request, res: Response) => {
  res.status(200).json({ status: "ok", timestamp: new Date() });
});

// Routers
app.use("/bot", botRouter);

// Export the Express app for potential usage in tests
export { app };