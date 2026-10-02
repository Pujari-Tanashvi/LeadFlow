import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { EmailTemplateModel } from "../models/EmailTemplate.js";
import { LEAD_STAGES, type LeadStage } from "../models/Lead.js";
import { parseEmailTemplateInput } from "../utils/emailTemplateInput.js";
import {
  buildEmailTemplateListFilter,
  getEmailTemplateTenantId,
} from "../utils/emailTemplateQuery.js";

function getTemplateId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value)
    ? new Types.ObjectId(value)
    : null;
}

function sendInvalidTemplateId(response: Parameters<RequestHandler>[1]): void {
  response
    .status(400)
    .json({ error: "Email template ID must be a valid MongoDB ID." });
}

export const listEmailTemplates: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const brokerageId = getEmailTemplateTenantId(request.auth!);

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

    const rawActive = request.query.active;
    if (
      rawActive !== undefined &&
      rawActive !== "true" &&
      rawActive !== "false"
    ) {
      response.status(400).json({ error: "active must be true or false." });
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

    const filter = buildEmailTemplateListFilter({
      brokerageId,
      stage: typeof rawStage === "string" ? (rawStage as LeadStage) : undefined,
      active: rawActive === undefined ? undefined : rawActive === "true",
      search:
        typeof rawSearch === "string" && rawSearch.trim()
          ? rawSearch.trim()
          : undefined,
    });

    const [templates, total] = await Promise.all([
      EmailTemplateModel.find(filter)
        .sort({ updatedAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      EmailTemplateModel.countDocuments(filter).exec(),
    ]);

    response.status(200).json({
      templates,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const createEmailTemplate: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const brokerageId = getEmailTemplateTenantId(request.auth!);
    const parsed = parseEmailTemplateInput(request.body, false);
    if (parsed.error || !parsed.update) {
      response
        .status(400)
        .json({ error: parsed.error ?? "Invalid email template." });
      return;
    }

    const template = await EmailTemplateModel.create({
      name: parsed.update.name,
      subject: parsed.update.subject,
      body: parsed.update.body,
      stage: parsed.update.stage,
      active: parsed.update.active ?? true,
      brokerageId,
    });

    response.status(201).json({ template });
  } catch (error) {
    next(error);
  }
};

export const getEmailTemplate: RequestHandler = async (
  request,
  response,
  next,
) => {
  const templateId = getTemplateId(request.params.id);
  if (!templateId) return sendInvalidTemplateId(response);

  try {
    const template = await EmailTemplateModel.findOne({
      _id: templateId,
      brokerageId: getEmailTemplateTenantId(request.auth!),
    }).exec();
    if (!template) {
      response.status(404).json({ error: "Email template not found." });
      return;
    }
    response.status(200).json({ template });
  } catch (error) {
    next(error);
  }
};

export const updateEmailTemplate: RequestHandler = async (
  request,
  response,
  next,
) => {
  const templateId = getTemplateId(request.params.id);
  if (!templateId) return sendInvalidTemplateId(response);

  const parsed = parseEmailTemplateInput(request.body, true);
  if (parsed.error || !parsed.update) {
    response
      .status(400)
      .json({ error: parsed.error ?? "Invalid email template update." });
    return;
  }

  try {
    const brokerageId = getEmailTemplateTenantId(request.auth!);
    const template = await EmailTemplateModel.findOneAndUpdate(
      { _id: templateId, brokerageId },
      { $set: parsed.update },
      { new: true, runValidators: true },
    ).exec();
    if (!template) {
      response.status(404).json({ error: "Email template not found." });
      return;
    }
    response.status(200).json({ template });
  } catch (error) {
    next(error);
  }
};

export const deleteEmailTemplate: RequestHandler = async (
  request,
  response,
  next,
) => {
  const templateId = getTemplateId(request.params.id);
  if (!templateId) return sendInvalidTemplateId(response);

  try {
    const brokerageId = getEmailTemplateTenantId(request.auth!);
    const template = await EmailTemplateModel.findOneAndDelete({
      _id: templateId,
      brokerageId,
    }).exec();
    if (!template) {
      response.status(404).json({ error: "Email template not found." });
      return;
    }
    response.status(204).end();
  } catch (error) {
    next(error);
  }
};
