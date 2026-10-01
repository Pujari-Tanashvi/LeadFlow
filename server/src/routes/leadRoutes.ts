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

leadRoutes.use(requireAuthentication, requireLeadTenant);
leadRoutes.get("/", listLeads);
leadRoutes.post("/", createLead);
leadRoutes.get("/:id", getLead);
leadRoutes.post("/:id/merge", mergeLead);
leadRoutes.post(
  "/:id/convert",
  requireRoles("brokerage_admin", "advisor"),
  convertLead,
);
leadRoutes.patch("/:id/stage", patchLeadStage);
leadRoutes.patch("/:id", patchLead);
leadRoutes.delete("/:id", deleteLead);
