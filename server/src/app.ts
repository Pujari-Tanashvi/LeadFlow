import cors from "cors";
import express from "express";
import type { RequestHandler } from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { documentRoutes } from "./routes/documentRoutes.js";
import { authRoutes } from "./routes/authRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";
import { leadRoutes } from "./routes/leadRoutes.js";
import { leadWebhookRoutes } from "./routes/leadWebhookRoutes.js";
import { taskRoutes } from "./routes/taskRoutes.js";
import { emailTemplateRoutes } from "./routes/emailTemplateRoutes.js";
import { dashboardRoutes } from "./routes/dashboardRoutes.js";

export const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/webhooks", leadWebhookRoutes);
app.use("/api/leads", leadRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/email-templates", emailTemplateRoutes);
app.use("/api/dashboard", dashboardRoutes);
app.use("/api/documents", documentRoutes);

// An unmatched `/api/*` path must still answer with the JSON envelope the
// client parses, otherwise Express' default HTML error page is rendered as a
// raw "Cannot GET ..." string and the real problem (a typo in the path, or a
// route that no longer exists) is invisible in the UI.
const notFound: RequestHandler = (request, response) => {
  response.status(404).json({
    error: `No API route matches ${request.method} ${request.originalUrl}.`,
  });
};

app.use("/api", notFound);
app.use(errorHandler);
