import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { documentRoutes } from "./routes/documentRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { leadRoutes } from "./routes/leadRoutes.js";
import { leadWebhookRoutes } from "./routes/leadWebhookRoutes.js";
import { taskRoutes } from "./routes/taskRoutes.js";

export const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", leadWebhookRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/documents", documentRoutes);
app.use(errorHandler);
