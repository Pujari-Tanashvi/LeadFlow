import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { ActivityModel } from "../models/Activity.js";
import { LEAD_STAGES, LeadModel, type LeadStage } from "../models/Lead.js";
import { UserModel } from "../models/User.js";
import { findDuplicateLeads } from "../services/leadDuplicateService.js";
import { applyPipelineAutomation } from "../services/taskAutomationService.js";
import { applyPipelineEmailAutomation } from "../services/pipelineEmailService.js";
import { publishDashboardStats } from "../services/dashboardService.js";
import { buildLeadListFilter, getLeadTenantId } from "../utils/leadQuery.js";
import { dossierOwnerFilter } from "../utils/tenantAccess.js";
import {
  normalizeEmail,
  normalizeLeadName,
  normalizePhone,
} from "../utils/leadIdentity.js";

const editableFields = [
  "name",
  "email",
  "phone",
  "source",
  "propertyType",
  "nationality",
  "targetCity",
  "employmentStatus",
  "propertyPriceEur",
  "loanAmount",
  "assignedAdvisor",
  "stage",
] as const;

type EditableField = (typeof editableFields)[number];

/**
 * Optional descriptive fields. Unlike the core fields these accept an empty
 * value so a caller can clear them again without a separate unset endpoint.
 */
const optionalTextFields = [
  "nationality",
  "targetCity",
  "employmentStatus",
] as const;
type LeadUpdate = Partial<Record<EditableField, unknown>> &
  Partial<
    Record<"emailNormalized" | "phoneNormalized" | "nameNormalized", string>
  >;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseLeadInput(
  value: unknown,
  partial: boolean,
): { update?: LeadUpdate; error?: string } {
  if (!isRecord(value)) return { error: "A JSON request body is required." };

  const unknownFields = Object.keys(value).filter(
    (field) =>
      !editableFields.includes(field as EditableField) &&
      field !== "brokerageId",
  );
  if (unknownFields.length)
    return { error: `Unsupported field: ${unknownFields[0]}.` };
  if ("brokerageId" in value)
    return { error: "brokerageId is assigned from your account." };

  const update: LeadUpdate = {};
  for (const field of editableFields) {
    if (!(field in value)) continue;
    const fieldValue = value[field];

    if (field === "loanAmount") {
      if (
        typeof fieldValue !== "number" ||
        !Number.isFinite(fieldValue) ||
        fieldValue < 0
      ) {
        return { error: "loanAmount must be a non-negative number." };
      }
      update[field] = fieldValue;
      continue;
    }

    if (field === "assignedAdvisor") {
      if (fieldValue === null || fieldValue === "") {
        update[field] = null;
      } else if (
        typeof fieldValue === "string" &&
        Types.ObjectId.isValid(fieldValue)
      ) {
        update[field] = fieldValue;
      } else {
        return { error: "assignedAdvisor must be a valid user ID or null." };
      }
      continue;
    }

    if (field === "propertyPriceEur") {
      if (fieldValue === null || fieldValue === "") {
        update[field] = null;
        continue;
      }
      if (
        typeof fieldValue !== "number" ||
        !Number.isFinite(fieldValue) ||
        fieldValue < 0
      ) {
        return { error: "propertyPriceEur must be a non-negative number." };
      }
      update[field] = fieldValue;
      continue;
    }

    // Optional descriptive fields accept an empty value so they can be cleared.
    if (
      (optionalTextFields as readonly string[]).includes(field) &&
      (fieldValue === null || fieldValue === "")
    ) {
      update[field] = "";
      continue;
    }

    if (typeof fieldValue !== "string" || !fieldValue.trim()) {
      return { error: `${field} must be a non-empty string.` };
    }

    const normalized = fieldValue.trim();
    if (field === "phone" && !normalizePhone(normalized)) {
      return { error: "phone must contain at least one digit." };
    }
    if (field === "stage") {
      if (!LEAD_STAGES.includes(normalized as LeadStage)) {
        return { error: `stage must be one of: ${LEAD_STAGES.join(", ")}.` };
      }
      update[field] = normalized as LeadStage;
      continue;
    }

    const maxLength =
      field === "name"
        ? 160
        : field === "email"
          ? 254
          : field === "phone"
            ? 40
            : 100;
    if (normalized.length > maxLength)
      return { error: `${field} exceeds ${maxLength} characters.` };
    if (field === "email" && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized)) {
      return { error: "email must be a valid email address." };
    }
    if (field === "email") {
      update.email = normalizeEmail(normalized);
      update.emailNormalized = normalizeEmail(normalized);
    } else if (field === "phone") {
      update.phone = normalized;
      update.phoneNormalized = normalizePhone(normalized);
    } else if (field === "name") {
      update.name = normalized;
      update.nameNormalized = normalizeLeadName(normalized);
    } else {
      update[field] = normalized;
    }
  }

  const requiredFields = [
    "name",
    "email",
    "phone",
    "source",
    "propertyType",
    "loanAmount",
  ] as const;
  if (!partial) {
    for (const field of requiredFields) {
      if (!(field in update)) return { error: `${field} is required.` };
    }
  }
  if (Object.keys(update).length === 0)
    return { error: "At least one editable field is required." };

  return { update };
}

async function validateAdvisor(
  advisorId: unknown,
  brokerageId: Types.ObjectId,
): Promise<boolean> {
  if (advisorId === null || advisorId === undefined) return true;
  if (!(advisorId instanceof Types.ObjectId) && typeof advisorId !== "string")
    return false;
  if (!Types.ObjectId.isValid(advisorId)) return false;

  return Boolean(
    await UserModel.exists({
      _id: advisorId,
      ...dossierOwnerFilter(brokerageId),
    }),
  );
}

function getLeadId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value)
    ? new Types.ObjectId(value)
    : null;
}

function sendInvalidLeadId(response: Parameters<RequestHandler>[1]): void {
  response.status(400).json({ error: "Lead ID must be a valid MongoDB ID." });
}

function sendDuplicateResponse(
  response: Parameters<RequestHandler>[1],
  matches: Awaited<ReturnType<typeof findDuplicateLeads>>,
  allowCreateAnyway: boolean,
): void {
  response.status(409).json({
    duplicate: true,
    error: "Potential duplicate lead found.",
    matches,
    actions: allowCreateAnyway
      ? ["view_existing", "create_anyway", "merge"]
      : ["view_existing", "merge"],
  });
}

export const listLeads: RequestHandler = async (request, response, next) => {
  try {
    const brokerageId = getLeadTenantId(request.auth!);
    const rawStage = request.query.stage;
    if (
      typeof rawStage === "string" &&
      !LEAD_STAGES.includes(rawStage as LeadStage)
    ) {
      response
        .status(400)
        .json({ error: `stage must be one of: ${LEAD_STAGES.join(", ")}.` });
      return;
    }

    if (
      request.query.advisor !== undefined &&
      request.query.assignedAdvisor !== undefined
    ) {
      response
        .status(400)
        .json({ error: "Use either advisor or assignedAdvisor, not both." });
      return;
    }
    const rawAdvisor = request.query.advisor ?? request.query.assignedAdvisor;
    if (
      rawAdvisor !== undefined &&
      (typeof rawAdvisor !== "string" || !getLeadId(rawAdvisor))
    ) {
      response.status(400).json({ error: "advisor must be a valid user ID." });
      return;
    }
    if (
      typeof rawAdvisor === "string" &&
      !(await validateAdvisor(rawAdvisor, brokerageId))
    ) {
      response
        .status(400)
        .json({ error: "advisor must belong to your brokerage." });
      return;
    }

    const rawSearch = request.query.search;
    if (rawSearch !== undefined && typeof rawSearch !== "string") {
      response.status(400).json({ error: "search must be a string." });
      return;
    }
    const page =
      request.query.page === undefined ? 1 : Number(request.query.page);
    const limit =
      request.query.limit === undefined ? 20 : Number(request.query.limit);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      response.status(400).json({
        error: "page must be positive and limit must be between 1 and 100.",
      });
      return;
    }

    const filter = buildLeadListFilter({
      brokerageId,
      search:
        typeof rawSearch === "string" && rawSearch.trim()
          ? rawSearch.trim()
          : undefined,
      stage: typeof rawStage === "string" ? (rawStage as LeadStage) : undefined,
      assignedAdvisor:
        typeof rawAdvisor === "string"
          ? new Types.ObjectId(rawAdvisor)
          : undefined,
    });
    const [leads, total] = await Promise.all([
      LeadModel.find(filter)
        .sort({ createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      LeadModel.countDocuments(filter).exec(),
    ]);

    response.status(200).json({
      leads,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const createLead: RequestHandler = async (request, response, next) => {
  try {
    const brokerageId = getLeadTenantId(request.auth!);
    const queryOverride = request.query.createAnyway;
    if (
      queryOverride !== undefined &&
      queryOverride !== "true" &&
      queryOverride !== "false"
    ) {
      response
        .status(400)
        .json({ error: "createAnyway must be true or false." });
      return;
    }

    let createAnyway = queryOverride === "true";
    let leadBody = request.body;
    if (isRecord(leadBody) && "createAnyway" in leadBody) {
      if (typeof leadBody.createAnyway !== "boolean") {
        response.status(400).json({ error: "createAnyway must be a boolean." });
        return;
      }
      createAnyway ||= leadBody.createAnyway;
      leadBody = { ...leadBody };
      delete (leadBody as Record<string, unknown>).createAnyway;
    }

    const parsed = parseLeadInput(leadBody, false);
    if (parsed.error || !parsed.update) {
      response.status(400).json({ error: parsed.error ?? "Invalid lead." });
      return;
    }

    if (
      "assignedAdvisor" in parsed.update &&
      !(await validateAdvisor(parsed.update.assignedAdvisor, brokerageId))
    ) {
      response.status(400).json({
        error: "assignedAdvisor must be an advisor in your brokerage.",
      });
      return;
    }

    const duplicates = await findDuplicateLeads(brokerageId, {
      name: parsed.update.name as string,
      email: parsed.update.email as string,
      phone: parsed.update.phone as string,
    });
    if (duplicates.length && !createAnyway) {
      sendDuplicateResponse(response, duplicates, true);
      return;
    }

    const lead = await LeadModel.create({ ...parsed.update, brokerageId });
    // Refresh brokerage dashboards (total leads / stage distribution change).
    void publishDashboardStats(brokerageId);
    response.status(201).json({ lead });
  } catch (error) {
    next(error);
  }
};

export const getLead: RequestHandler = async (request, response, next) => {
  const leadId = getLeadId(request.params.id);
  if (!leadId) return sendInvalidLeadId(response);

  try {
    const lead = await LeadModel.findOne({
      _id: leadId,
      brokerageId: getLeadTenantId(request.auth!),
    }).exec();
    if (!lead) {
      response.status(404).json({ error: "Lead not found." });
      return;
    }
    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
};

async function updateLead(
  request: Parameters<RequestHandler>[0],
  response: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
  stageOnly: boolean,
): Promise<void> {
  const leadId = getLeadId(request.params.id);
  if (!leadId) {
    sendInvalidLeadId(response);
    return;
  }

  const brokerageId = getLeadTenantId(request.auth!);
  let body = request.body;
  if (stageOnly) {
    if (!isRecord(body) || typeof body.stage !== "string") {
      response.status(400).json({ error: "stage is required." });
      return;
    }
    body = { stage: body.stage };
  }
  const parsed = parseLeadInput(body, true);
  if (parsed.error || !parsed.update) {
    response
      .status(400)
      .json({ error: parsed.error ?? "Invalid lead update." });
    return;
  }

  try {
    if (
      "assignedAdvisor" in parsed.update &&
      !(await validateAdvisor(parsed.update.assignedAdvisor, brokerageId))
    ) {
      response.status(400).json({
        error: "assignedAdvisor must be an advisor in your brokerage.",
      });
      return;
    }

    const existing = await LeadModel.findOne({
      _id: leadId,
      brokerageId,
    }).exec();
    if (!existing) {
      response.status(404).json({ error: "Lead not found." });
      return;
    }

    const fromStage = existing.stage;
    const requestedStage = parsed.update.stage as LeadStage | undefined;

    if (
      "name" in parsed.update ||
      "email" in parsed.update ||
      "phone" in parsed.update
    ) {
      const duplicates = await findDuplicateLeads(
        brokerageId,
        {
          name: (parsed.update.name ?? existing.name) as string,
          email: (parsed.update.email ?? existing.email) as string,
          phone: (parsed.update.phone ?? existing.phone) as string,
        },
        leadId,
      );
      if (duplicates.length) {
        sendDuplicateResponse(response, duplicates, false);
        return;
      }
    }

    const lead = await LeadModel.findOneAndUpdate(
      requestedStage
        ? { _id: leadId, brokerageId, stage: fromStage }
        : { _id: leadId, brokerageId },
      { $set: parsed.update },
      { new: true, runValidators: true },
    ).exec();

    if (!lead) {
      const stillInBrokerage = await LeadModel.exists({
        _id: leadId,
        brokerageId,
      });
      if (stillInBrokerage) {
        response.status(409).json({
          error: "Lead stage changed concurrently. Reload and retry.",
        });
        return;
      }
      response.status(404).json({ error: "Lead not found." });
      return;
    }

    if (requestedStage && requestedStage !== fromStage) {
      try {
        await ActivityModel.create({
          leadId,
          brokerageId,
          actorId: new Types.ObjectId(request.auth!.userId),
          type: "lead_stage_changed",
          fromStage,
          toStage: requestedStage,
        });
      } catch (error) {
        await LeadModel.findOneAndUpdate(
          { _id: leadId, brokerageId, stage: requestedStage },
          { $set: { stage: fromStage } },
        ).exec();
        throw error;
      }

      // Pipeline automation is best-effort: a failure here must never roll back
      // or fail the stage change the user already performed.
      try {
        await applyPipelineAutomation({
          leadId,
          brokerageId,
          stage: requestedStage,
          actorId: new Types.ObjectId(request.auth!.userId),
          assignedAdvisor: lead.assignedAdvisor ?? null,
          clientId: lead.convertedClientId ?? null,
        });
      } catch (error) {
        console.error("Pipeline task automation failed:", error);
      }

      // Pipeline email automation is best-effort: a template, send, or record
      // failure must never roll back or fail the stage change.
      try {
        await applyPipelineEmailAutomation({
          leadId,
          brokerageId,
          stage: requestedStage,
          actorId: new Types.ObjectId(request.auth!.userId),
          recipientEmail: lead.email,
          clientName: lead.name,
          assignedAdvisor: lead.assignedAdvisor ?? null,
          clientId: lead.convertedClientId ?? null,
        });
      } catch (error) {
        console.error("Pipeline email automation failed:", error);
      }

      // Refresh brokerage dashboards: stage distribution and the won/lost
      // figures change on every stage transition.
      void publishDashboardStats(brokerageId);
    }

    response.status(200).json({ lead });
  } catch (error) {
    next(error);
  }
}

export const patchLead: RequestHandler = (request, response, next) => {
  void updateLead(request, response, next, false);
};

export const patchLeadStage: RequestHandler = (request, response, next) => {
  void updateLead(request, response, next, true);
};

export const mergeLead: RequestHandler = async (request, response, next) => {
  const leadId = getLeadId(request.params.id);
  if (!leadId) return sendInvalidLeadId(response);
  if (!isRecord(request.body) || typeof request.body.duplicateId !== "string") {
    response.status(400).json({ error: "duplicateId is required." });
    return;
  }

  const duplicateId = getLeadId(request.body.duplicateId);
  if (!duplicateId) {
    response
      .status(400)
      .json({ error: "duplicateId must be a valid MongoDB ID." });
    return;
  }
  if (duplicateId.equals(leadId)) {
    response
      .status(400)
      .json({ error: "A lead cannot be merged into itself." });
    return;
  }

  try {
    const brokerageId = getLeadTenantId(request.auth!);
    const [primary, duplicate] = await Promise.all([
      LeadModel.findOne({ _id: leadId, brokerageId }).exec(),
      LeadModel.findOne({ _id: duplicateId, brokerageId }).exec(),
    ]);
    if (!primary || !duplicate) {
      response.status(404).json({ error: "Lead not found." });
      return;
    }

    const possibleMatches = await findDuplicateLeads(
      brokerageId,
      { name: primary.name, email: primary.email, phone: primary.phone },
      leadId,
    );
    if (
      !possibleMatches.some(
        (match) => String(match.lead._id) === duplicateId.toString(),
      )
    ) {
      response
        .status(409)
        .json({ error: "The selected lead is not a detected duplicate." });
      return;
    }

    if (!primary.assignedAdvisor && duplicate.assignedAdvisor) {
      primary.assignedAdvisor = duplicate.assignedAdvisor;
    }
    await primary.save();
    await ActivityModel.updateMany(
      { leadId: duplicateId, brokerageId },
      { $set: { leadId } },
    ).exec();

    const removed = await LeadModel.findOneAndDelete({
      _id: duplicateId,
      brokerageId,
    }).exec();
    if (!removed) {
      response.status(409).json({
        error: "Duplicate lead changed during merge. Reload and retry.",
      });
      return;
    }

    response.status(200).json({ lead: primary, mergedLeadId: duplicateId });
  } catch (error) {
    next(error);
  }
};

export const deleteLead: RequestHandler = async (request, response, next) => {
  const leadId = getLeadId(request.params.id);
  if (!leadId) return sendInvalidLeadId(response);

  try {
    const brokerageId = getLeadTenantId(request.auth!);
    const lead = await LeadModel.findOneAndDelete({
      _id: leadId,
      brokerageId,
    }).exec();
    if (!lead) {
      response.status(404).json({ error: "Lead not found." });
      return;
    }
    // Refresh brokerage dashboards (total leads / stage distribution change).
    void publishDashboardStats(brokerageId);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
};
