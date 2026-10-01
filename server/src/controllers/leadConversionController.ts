import type { RequestHandler } from "express";
import { convertLeadToClient } from "../services/leadConversionService.js";

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export const convertLead: RequestHandler = async (request, response, next) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  let advisorId: string | undefined;
  if (request.body !== undefined) {
    if (!isRecord(request.body)) {
      response
        .status(400)
        .json({ error: "Request body must be a JSON object." });
      return;
    }
    const unknownField = Object.keys(request.body).find(
      (field) => field !== "advisorId",
    );
    if (unknownField) {
      response
        .status(400)
        .json({ error: `Unsupported field: ${unknownField}.` });
      return;
    }
    if (request.body.advisorId !== undefined) {
      if (typeof request.body.advisorId !== "string") {
        response.status(400).json({ error: "advisorId must be a string." });
        return;
      }
      advisorId = request.body.advisorId;
    }
  }

  try {
    const result = await convertLeadToClient({
      leadId: request.params.id,
      auth: request.auth,
      advisorId,
    });
    response.status(201).json(result);
  } catch (error) {
    next(error);
  }
};
