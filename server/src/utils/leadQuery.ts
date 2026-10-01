import { Types } from "mongoose";
import type { LeadStage } from "../models/Lead.js";
import type { AuthContext } from "../types/auth.js";

export interface LeadListFilters {
  brokerageId: Types.ObjectId;
  search?: string;
  stage?: LeadStage;
  assignedAdvisor?: Types.ObjectId;
}

export function getLeadTenantId(
  auth: Pick<AuthContext, "brokerageId">,
): Types.ObjectId {
  if (!auth.brokerageId || !Types.ObjectId.isValid(auth.brokerageId)) {
    throw new Error("A valid brokerage account is required for lead access.");
  }

  return new Types.ObjectId(auth.brokerageId);
}

export function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function buildLeadListFilter(filters: LeadListFilters) {
  const query: {
    brokerageId: Types.ObjectId;
    stage?: LeadStage;
    assignedAdvisor?: Types.ObjectId;
    $or?: Array<Record<string, RegExp>>;
  } = { brokerageId: filters.brokerageId };

  if (filters.stage) query.stage = filters.stage;
  if (filters.assignedAdvisor) query.assignedAdvisor = filters.assignedAdvisor;
  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [{ name: matcher }, { email: matcher }, { phone: matcher }];
  }

  return query;
}
