import { Router } from "express";
import { createLeadFromWebhook } from "../controllers/leadWebhookController.js";
import { requireLeadWebhookSecret } from "../middleware/webhookAuthMiddleware.js";

export const leadWebhookRoutes = Router();

leadWebhookRoutes.post(
  "/leads",
  requireLeadWebhookSecret,
  createLeadFromWebhook,
);
