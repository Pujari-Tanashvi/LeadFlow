import { model, Schema, type InferSchemaType } from "mongoose";

const brokerageSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 160 },
    status: {
      type: String,
      enum: ["active", "suspended"],
      default: "active",
      required: true,
    },
  },
  { timestamps: true },
);

export type Brokerage = InferSchemaType<typeof brokerageSchema>;
export const BrokerageModel = model("Brokerage", brokerageSchema);
