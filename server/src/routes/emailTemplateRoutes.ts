import { Router } from "express";
import {
  createEmailTemplate,
  deleteEmailTemplate,
  getEmailTemplate,
  listEmailTemplates,
  updateEmailTemplate,
} from "../controllers/emailTemplateController.js";
import {
  requireAuthentication,
  requireRoles,
} from "../middleware/authMiddleware.js";
import { requireEmailTemplateTenant } from "../middleware/emailTemplateTenantMiddleware.js";

export const emailTemplateRoutes = Router();

emailTemplateRoutes.use(requireAuthentication, requireEmailTemplateTenant);

// Viewing templates is available to brokerage admins and advisors.
emailTemplateRoutes.get(
  "/",
  requireRoles("brokerage_admin", "advisor"),
  listEmailTemplates,
);
emailTemplateRoutes.get(
  "/:id",
  requireRoles("brokerage_admin", "advisor"),
  getEmailTemplate,
);

// Only brokerage admins can create, edit, or delete templates.
emailTemplateRoutes.post(
  "/",
  requireRoles("brokerage_admin"),
  createEmailTemplate,
);
emailTemplateRoutes.patch(
  "/:id",
  requireRoles("brokerage_admin"),
  updateEmailTemplate,
);
emailTemplateRoutes.delete(
  "/:id",
  requireRoles("brokerage_admin"),
  deleteEmailTemplate,
);
