import { Router } from "express";
import { getDashboard } from "../controllers/dashboardController.js";
import {
  requireAuthentication,
  requireRoles,
} from "../middleware/authMiddleware.js";
import { requireDashboardTenant } from "../middleware/dashboardTenantMiddleware.js";

export const dashboardRoutes = Router();

dashboardRoutes.use(
  requireAuthentication,
  requireDashboardTenant,
  requireRoles("brokerage_admin", "advisor"),
);
dashboardRoutes.get("/", getDashboard);
