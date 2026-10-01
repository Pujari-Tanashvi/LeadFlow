import { model, Schema, type InferSchemaType } from "mongoose";

export const DOCUMENT_STATUSES = [
  "Pending",
  "Uploading",
  "Processing",
  "In Review",
  "Verified",
  "Failed",
] as const;

export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

const documentSchema = new Schema(
  {
    clientId: {
      type: Schema.Types.ObjectId,
      ref: "Client",
      required: true,
      index: true,
    },
    uploadedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    filename: { type: String, required: true, trim: true, maxlength: 255 },
    fileUrl: { type: String, required: true },
    storageKey: { type: String, required: true, select: false },
    contentType: { type: String, required: true, select: false },
    documentType: { type: String, required: true, trim: true, maxlength: 100 },
    status: {
      type: String,
      enum: DOCUMENT_STATUSES,
      default: "Pending",
      required: true,
    },
    verificationResult: { type: Schema.Types.Mixed, default: null },
    failureReason: { type: String, default: null, maxlength: 1000 },
    processingStartedAt: { type: Date, default: null },
    reviewStartedAt: { type: Date, default: null },
    verificationCompletedAt: { type: Date, default: null },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
      index: true,
    },
  },
  { timestamps: true },
);

documentSchema.index({ brokerageId: 1, clientId: 1, createdAt: -1 });

export type Document = InferSchemaType<typeof documentSchema>;
export const DocumentModel = model("Document", documentSchema);
