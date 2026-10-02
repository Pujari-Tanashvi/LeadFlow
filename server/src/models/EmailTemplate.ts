import { model, Schema, type InferSchemaType } from "mongoose";
import { LEAD_STAGES } from "./Lead.js";

const emailTemplateSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    subject: { type: String, required: true, trim: true, maxlength: 200 },
    body: { type: String, required: true, trim: true, maxlength: 10000 },
    stage: { type: String, enum: LEAD_STAGES, required: true },
    active: { type: Boolean, default: true, required: true },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

emailTemplateSchema.index({ brokerageId: 1, stage: 1, active: 1 });
emailTemplateSchema.index({ brokerageId: 1, name: 1 });

export type EmailTemplate = InferSchemaType<typeof emailTemplateSchema>;
export const EmailTemplateModel = model("EmailTemplate", emailTemplateSchema);
