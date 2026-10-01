import { model, Schema, type InferSchemaType } from "mongoose";

const clientSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: true,
    },
    email: { type: String, required: true, trim: true, lowercase: true },
    emailNormalized: { type: String, required: true, select: false },
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    phone: { type: String, required: true, trim: true, maxlength: 40 },
    phoneNormalized: { type: String, required: true, select: false },
    advisorIds: [{ type: Schema.Types.ObjectId, ref: "User" }],
    leadIds: [{ type: Schema.Types.ObjectId, ref: "Lead" }],
  },
  { timestamps: true },
);

clientSchema.index({ brokerageId: 1, emailNormalized: 1 }, { unique: true });
clientSchema.index({ brokerageId: 1, userId: 1 }, { unique: true });
clientSchema.index({ brokerageId: 1, leadIds: 1 });

export type Client = InferSchemaType<typeof clientSchema>;
export const ClientModel = model("Client", clientSchema);
