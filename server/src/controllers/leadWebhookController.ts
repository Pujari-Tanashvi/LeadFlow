import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { env } from "../config/env.js";
import { findDuplicateLeads } from "../services/leadDuplicateService.js";
import { LeadModel } from "../models/Lead.js";
import { emitLeadCreated } from "../sockets/index.js";
import { publishDashboardStats } from "../services/dashboardService.js";
import { parseExternalLeadInput } from "../utils/webhookLeadInput.js";

function serializeLead(lead: InstanceType<typeof LeadModel>) {
  const serialized = lead.toObject();
  delete serialized.nameNormalized;
  delete serialized.emailNormalized;
  delete serialized.phoneNormalized;
  return serialized;
}

export const createLeadFromWebhook: RequestHandler = async (
  request,
  response,
  next,
) => {
  const parsed = parseExternalLeadInput(request.body);
  if (parsed.error || !parsed.input) {
    response
      .status(400)
      .json({ error: parsed.error ?? "Invalid lead payload." });
    return;
  }

  if (
    !env.leadWebhookBrokerageId ||
    !Types.ObjectId.isValid(env.leadWebhookBrokerageId)
  ) {
    response
      .status(503)
      .json({ error: "Lead webhook brokerage is not configured." });
    return;
  }

  try {
    const brokerageId = new Types.ObjectId(env.leadWebhookBrokerageId);
    const duplicates = await findDuplicateLeads(brokerageId, parsed.input);
    if (duplicates.length) {
      response.status(409).json({
        duplicate: true,
        error: "Potential duplicate lead found.",
        matches: duplicates,
      });
      return;
    }

    const lead = await LeadModel.create({ ...parsed.input, brokerageId });
    const responseLead = serializeLead(lead);
    emitLeadCreated(brokerageId.toString(), responseLead);
    // Refresh brokerage dashboards (total leads / stage distribution change).
    void publishDashboardStats(brokerageId);
    response.status(201).json({ lead: responseLead });
  } catch (error) {
    next(error);
  }
};
