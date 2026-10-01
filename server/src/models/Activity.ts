import { model, Schema, type InferSchemaType } from "mongoose";
import { LEAD_STAGES } from "./Lead.js";

const activitySchema = new Schema(
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
    actorId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: { type: String, enum: ["lead_stage_changed"], required: true },
    fromStage: { type: String, enum: LEAD_STAGES, required: true },
    toStage: { type: String, enum: LEAD_STAGES, required: true },
  },
  { timestamps: true },
);

activitySchema.index({ brokerageId: 1, leadId: 1, createdAt: -1 });

export type Activity = InferSchemaType<typeof activitySchema>;
export const ActivityModel = model("Activity", activitySchema);
