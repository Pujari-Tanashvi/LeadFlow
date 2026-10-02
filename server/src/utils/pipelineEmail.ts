import type { LeadStage } from "../models/Lead.js";
import type { EmailMessage } from "../services/emailService.js";
import {
  renderTemplate,
  type SupportedPlaceholder,
} from "./emailTemplatePlaceholders.js";

/** Shown in place of {{advisor_name}} when a lead has no assigned advisor. */
export const DEFAULT_ADVISOR_NAME = "your advisor";

/**
 * Deterministic idempotency key for a lead entering a stage. The same stage
 * event processed more than once yields the same key, so the unique index on
 * EmailDelivery guarantees a single email per lead per stage.
 */
export function buildPipelineEmailDedupeKey(
  leadId: string,
  stage: LeadStage,
): string {
  return `${leadId}:${stage}`;
}

export interface TemplateValueInput {
  clientName: string;
  advisorName?: string | null;
  brokerageName?: string | null;
}

/**
 * Resolve the supported placeholder values for a lead. Every supported
 * placeholder is always given a value so a rendered email never leaks a raw
 * `{{token}}`; a missing advisor falls back to {@link DEFAULT_ADVISOR_NAME}.
 */
export function buildTemplateValues(
  input: TemplateValueInput,
): Partial<Record<SupportedPlaceholder, string>> {
  const advisor = input.advisorName?.trim();
  const brokerage = input.brokerageName?.trim();
  return {
    client_name: input.clientName,
    advisor_name: advisor ? advisor : DEFAULT_ADVISOR_NAME,
    brokerage_name: brokerage ?? "",
  };
}

export interface EmailTemplateContent {
  subject: string;
  body: string;
}

/** Render a template's subject and body into a ready-to-send email message. */
export function buildPipelineEmailMessage(params: {
  template: EmailTemplateContent;
  recipient: string;
  values: Partial<Record<SupportedPlaceholder, string>>;
}): EmailMessage {
  return {
    to: params.recipient,
    subject: renderTemplate(params.template.subject, params.values),
    body: renderTemplate(params.template.body, params.values),
  };
}
