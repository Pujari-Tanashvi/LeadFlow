import { model, Schema, type InferSchemaType } from "mongoose";

export const LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Documents",
  "In Review",
  "Won",
  "Lost",
] as const;

export type LeadStage = (typeof LEAD_STAGES)[number];

const leadSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
    },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    source: { type: String, required: true, trim: true, maxlength: 100 },
    propertyType: { type: String, required: true, trim: true, maxlength: 100 },
    loanAmount: { type: Number, required: true, min: 0 },
    assignedAdvisor: {
      type: Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    stage: { type: String, enum: LEAD_STAGES, default: "New", required: true },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

leadSchema.index({ brokerageId: 1, stage: 1, createdAt: -1 });
leadSchema.index({ brokerageId: 1, assignedAdvisor: 1, createdAt: -1 });

export type Lead = InferSchemaType<typeof leadSchema>;
export const LeadModel = model("Lead", leadSchema);
