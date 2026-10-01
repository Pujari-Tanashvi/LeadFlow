import { timingSafeEqual } from "node:crypto";
import type { RequestHandler } from "express";
import { env } from "../config/env.js";

export function webhookSecretMatches(
  providedSecret: string | undefined,
  expectedSecret: string | undefined,
): boolean {
  if (!providedSecret || !expectedSecret) return false;

  const provided = Buffer.from(providedSecret, "utf8");
  const expected = Buffer.from(expectedSecret, "utf8");
  return (
    provided.length === expected.length && timingSafeEqual(provided, expected)
  );
}

export const requireLeadWebhookSecret: RequestHandler = (
  request,
  response,
  next,
) => {
  if (!env.leadWebhookSecret || env.leadWebhookSecret.length < 32) {
    response.status(503).json({ error: "Lead webhook is not configured." });
    return;
  }

  if (
    !webhookSecretMatches(
      request.header("x-webhook-secret"),
      env.leadWebhookSecret,
    )
  ) {
    response.status(401).json({ error: "Invalid webhook secret." });
    return;
  }

  next();
};
