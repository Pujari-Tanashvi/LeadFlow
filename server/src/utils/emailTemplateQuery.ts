import { Types } from "mongoose";
import type { LeadStage } from "../models/Lead.js";
import type { AuthContext } from "../types/auth.js";
import { escapeRegex } from "./leadQuery.js";

export interface EmailTemplateListFilters {
  brokerageId: Types.ObjectId;
  stage?: LeadStage;
  active?: boolean;
  search?: string;
}

export function getEmailTemplateTenantId(
  auth: Pick<AuthContext, "brokerageId">,
): Types.ObjectId {
  if (!auth.brokerageId || !Types.ObjectId.isValid(auth.brokerageId)) {
    throw new Error(
      "A valid brokerage account is required for email template access.",
    );
  }

  return new Types.ObjectId(auth.brokerageId);
}

export function buildEmailTemplateListFilter(
  filters: EmailTemplateListFilters,
) {
  const query: {
    brokerageId: Types.ObjectId;
    stage?: LeadStage;
    active?: boolean;
    $or?: Array<Record<string, RegExp>>;
  } = { brokerageId: filters.brokerageId };

  if (filters.stage) query.stage = filters.stage;
  if (filters.active !== undefined) query.active = filters.active;
  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [{ name: matcher }, { subject: matcher }];
  }

  return query;
}
