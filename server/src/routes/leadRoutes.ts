import { Router } from "express";
import {
  createLead,
  deleteLead,
  getLead,
  listLeads,
  mergeLead,
  patchLead,
  patchLeadStage,
} from "../controllers/leadController.js";
import { convertLead } from "../controllers/leadConversionController.js";
import {
  requireAuthentication,
  requireRoles,
} from "../middleware/authMiddleware.js";
import { requireLeadTenant } from "../middleware/leadTenantMiddleware.js";

export const leadRoutes = Router();

// Lead management is internal brokerage work: clients and platform admins have
// no business here, so every route requires an advisor or brokerage admin of
// the authenticated brokerage (mirrors tasks, dashboard and email templates).
leadRoutes.use(
  requireAuthentication,
  requireLeadTenant,
  requireRoles("brokerage_admin", "advisor"),
);
leadRoutes.get("/", listLeads);
leadRoutes.post("/", createLead);
leadRoutes.get("/:id", getLead);
leadRoutes.post("/:id/merge", mergeLead);
leadRoutes.post("/:id/convert", convertLead);
leadRoutes.patch("/:id/stage", patchLeadStage);
leadRoutes.patch("/:id", patchLead);
leadRoutes.delete("/:id", deleteLead);
