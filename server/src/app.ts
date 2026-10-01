import cors from "cors";
import express from "express";
import { env } from "./config/env.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { authRoutes } from "./routes/authRoutes.js";
import { healthRoutes } from "./routes/healthRoutes.js";

export const app = express();

app.use(cors({ origin: env.frontendOrigin }));
app.use(express.json());
app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use(errorHandler);
