import { model, Schema, type InferSchemaType } from "mongoose";
import { LEAD_STAGES } from "./Lead.js";

export const EMAIL_DELIVERY_STATUSES = ["pending", "sent", "failed"] as const;

export type EmailDeliveryStatus = (typeof EMAIL_DELIVERY_STATUSES)[number];

/**
 * Record of a pipeline-automation email for a lead/stage. Doubles as the
 * idempotency guard: the unique {brokerageId, dedupeKey} index ensures the same
 * stage event never sends a duplicate email, and the status/error capture the
 * delivery outcome for auditing.
 */
const emailDeliverySchema = new Schema(
  {
    leadId: {
      type: Schema.Types.ObjectId,
      ref: "Lead",
      required: true,
      index: true,
    },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
    templateId: {
      type: Schema.Types.ObjectId,
      ref: "EmailTemplate",
      required: true,
    },
    stage: { type: String, enum: LEAD_STAGES, required: true },
    dedupeKey: { type: String, required: true },
    recipient: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    status: {
      type: String,
      enum: EMAIL_DELIVERY_STATUSES,
      default: "pending",
      required: true,
    },
    error: { type: String, default: null },
  },
  { timestamps: true },
);

emailDeliverySchema.index({ brokerageId: 1, leadId: 1, createdAt: -1 });
emailDeliverySchema.index({ brokerageId: 1, dedupeKey: 1 }, { unique: true });

export type EmailDelivery = InferSchemaType<typeof emailDeliverySchema>;
export const EmailDeliveryModel = model("EmailDelivery", emailDeliverySchema);
