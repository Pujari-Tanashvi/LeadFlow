import { Types } from "mongoose";
import { ActivityModel } from "../models/Activity.js";
import { BrokerageModel } from "../models/Brokerage.js";
import { EmailDeliveryModel } from "../models/EmailDelivery.js";
import { EmailTemplateModel } from "../models/EmailTemplate.js";
import type { LeadStage } from "../models/Lead.js";
import { UserModel } from "../models/User.js";
import {
  buildPipelineEmailDedupeKey,
  buildPipelineEmailMessage,
  buildTemplateValues,
} from "../utils/pipelineEmail.js";
import { getEmailService, type EmailService } from "./emailService.js";

export interface PipelineEmailAutomationInput {
  leadId: Types.ObjectId;
  brokerageId: Types.ObjectId;
  stage: LeadStage;
  actorId: Types.ObjectId;
  recipientEmail: string;
  clientName: string;
  assignedAdvisor?: Types.ObjectId | null;
  clientId?: Types.ObjectId | null;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

/**
 * Send the configured automation email when a lead enters a pipeline stage.
 *
 * Flow: find the active template for the brokerage/stage, render the supported
 * placeholders, hand the message to the email service abstraction, and record an
 * Activity. Idempotency: a deterministic dedupeKey plus a pre-check and the
 * unique {brokerageId, dedupeKey} index ensure the same stage event processed
 * more than once never sends a duplicate email. A send failure is recorded and
 * swallowed — callers additionally run this best-effort so email never blocks or
 * rolls back the lead stage change.
 */
export async function applyPipelineEmailAutomation(
  input: PipelineEmailAutomationInput,
  emailService: EmailService = getEmailService(),
): Promise<void> {
  // 1. Find the active email template for this brokerage + stage.
  const template = await EmailTemplateModel.findOne({
    brokerageId: input.brokerageId,
    stage: input.stage,
    active: true,
  })
    .sort({ updatedAt: -1, _id: -1 })
    .exec();
  if (!template) return;
  if (!input.recipientEmail) return;

  // 2. Render the placeholders.
  const [advisor, brokerage] = await Promise.all([
    input.assignedAdvisor
      ? UserModel.findOne({
          _id: input.assignedAdvisor,
          brokerageId: input.brokerageId,
        })
          .select("fullName")
          .exec()
      : Promise.resolve(null),
    BrokerageModel.findById(input.brokerageId).select("name").exec(),
  ]);

  const message = buildPipelineEmailMessage({
    template: { subject: template.subject, body: template.body },
    recipient: input.recipientEmail,
    values: buildTemplateValues({
      clientName: input.clientName,
      advisorName: advisor?.fullName ?? null,
      brokerageName: brokerage?.name ?? null,
    }),
  });

  // 3a. Claim the dedupe slot before sending so a repeated stage event is a
  //     no-op. A pre-check avoids the common case; the unique index is the
  //     authoritative guard against concurrent duplicates.
  const dedupeKey = buildPipelineEmailDedupeKey(
    input.leadId.toString(),
    input.stage,
  );
  const alreadyHandled = await EmailDeliveryModel.exists({
    brokerageId: input.brokerageId,
    dedupeKey,
  });
  if (alreadyHandled) return;

  let delivery;
  try {
    delivery = await EmailDeliveryModel.create({
      leadId: input.leadId,
      brokerageId: input.brokerageId,
      templateId: template._id as Types.ObjectId,
      stage: input.stage,
      dedupeKey,
      recipient: message.to,
      subject: message.subject,
      status: "pending",
    });
  } catch (error) {
    // A concurrent identical stage event inserted first; treat as handled.
    if (isDuplicateKeyError(error)) return;
    throw error;
  }

  // 3b. Queue/send through the email service abstraction. A send failure must
  //     never propagate out of automation.
  try {
    await emailService.send(message);
  } catch (error) {
    delivery.status = "failed";
    delivery.error = error instanceof Error ? error.message : String(error);
    await delivery.save();
    console.error("Pipeline email send failed:", error);
    return;
  }

  delivery.status = "sent";
  await delivery.save();

  // 4. Record an Activity for the successful send.
  await ActivityModel.create({
    leadId: input.leadId,
    brokerageId: input.brokerageId,
    actorId: input.actorId,
    type: "email_sent",
    toStage: input.stage,
    clientId: input.clientId ?? undefined,
  });
}
