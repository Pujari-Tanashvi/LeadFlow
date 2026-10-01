import { Router } from "express";
import {
  activateClient,
  getCurrentUser,
  loginUser,
  register,
} from "../controllers/authController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", loginUser);
authRoutes.post("/activate-client", activateClient);
authRoutes.get("/me", requireAuthentication, getCurrentUser);
