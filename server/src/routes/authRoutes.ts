import { Router } from "express";
import {
  getCurrentUser,
  loginUser,
  register,
} from "../controllers/authController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";

export const authRoutes = Router();

authRoutes.post("/register", register);
authRoutes.post("/login", loginUser);
authRoutes.get("/me", requireAuthentication, getCurrentUser);
