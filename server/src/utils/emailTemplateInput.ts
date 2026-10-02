import { LEAD_STAGES, type LeadStage } from "../models/Lead.js";
import { validatePlaceholders } from "./emailTemplatePlaceholders.js";

const editableFields = ["name", "subject", "body", "stage", "active"] as const;

type EditableField = (typeof editableFields)[number];

const serverManagedFields = ["brokerageId"] as const;

export interface EmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  stage: LeadStage;
  active: boolean;
}

export type EmailTemplateUpdate = Partial<EmailTemplateInput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseEmailTemplateInput(
  value: unknown,
  partial: boolean,
): { update?: EmailTemplateUpdate; error?: string } {
  if (!isRecord(value)) return { error: "A JSON request body is required." };

  for (const field of serverManagedFields) {
    if (field in value) return { error: `${field} is assigned by the server.` };
  }
  const unknownField = Object.keys(value).find(
    (field) => !editableFields.includes(field as EditableField),
  );
  if (unknownField) return { error: `Unsupported field: ${unknownField}.` };

  const update: EmailTemplateUpdate = {};

  for (const field of editableFields) {
    if (!(field in value)) continue;
    const fieldValue = value[field];

    if (field === "name") {
      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        return { error: "name must be a non-empty string." };
      }
      const name = fieldValue.trim();
      if (name.length > 160) return { error: "name exceeds 160 characters." };
      update.name = name;
      continue;
    }

    if (field === "subject") {
      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        return { error: "subject must be a non-empty string." };
      }
      const subject = fieldValue.trim();
      if (subject.length > 200) {
        return { error: "subject exceeds 200 characters." };
      }
      update.subject = subject;
      continue;
    }

    if (field === "body") {
      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        return { error: "body must be a non-empty string." };
      }
      const body = fieldValue.trim();
      if (body.length > 10000) {
        return { error: "body exceeds 10000 characters." };
      }
      update.body = body;
      continue;
    }

    if (field === "stage") {
      if (!LEAD_STAGES.includes(fieldValue as LeadStage)) {
        return { error: `stage must be one of: ${LEAD_STAGES.join(", ")}.` };
      }
      update.stage = fieldValue as LeadStage;
      continue;
    }

    if (field === "active") {
      if (typeof fieldValue !== "boolean") {
        return { error: "active must be a boolean." };
      }
      update.active = fieldValue;
      continue;
    }
  }

  if (!partial) {
    for (const required of ["name", "subject", "body", "stage"] as const) {
      if (update[required] === undefined) {
        return { error: `${required} is required.` };
      }
    }
  }
  if (Object.keys(update).length === 0) {
    return { error: "At least one editable field is required." };
  }

  // Only supported placeholders may be saved. Validate whichever of the
  // text fields are present in this request.
  const placeholderError = validatePlaceholders({
    subject: update.subject,
    body: update.body,
  });
  if (placeholderError) return { error: placeholderError };

  return { update };
}
