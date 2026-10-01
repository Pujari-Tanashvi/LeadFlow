import { model, Schema, type InferSchemaType } from "mongoose";

export const VERIFICATION_JOB_STATUSES = [
  "Queued",
  "Processing",
  "Completed",
  "Failed",
] as const;

const verificationJobSchema = new Schema(
  {
    documentId: {
      type: Schema.Types.ObjectId,
      ref: "Document",
      required: true,
      index: true,
    },
    clientId: { type: Schema.Types.ObjectId, ref: "Client", required: true },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: VERIFICATION_JOB_STATUSES,
      default: "Queued",
      required: true,
    },
    attempts: { type: Number, default: 0, required: true },
    maxAttempts: { type: Number, default: 3, required: true },
    nextAttemptAt: { type: Date, default: Date.now, required: true },
    lockedUntil: { type: Date, default: null },
    lastError: { type: String, default: null },
    finishedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

verificationJobSchema.index({ status: 1, nextAttemptAt: 1, createdAt: 1 });
verificationJobSchema.index({ documentId: 1, createdAt: -1 });

export type DocumentVerificationJob = InferSchemaType<
  typeof verificationJobSchema
>;
export const DocumentVerificationJobModel = model(
  "DocumentVerificationJob",
  verificationJobSchema,
);
