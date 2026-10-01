import { model, Schema, type InferSchemaType } from "mongoose";

export const USER_ROLES = [
  "platform_admin",
  "brokerage_admin",
  "advisor",
  "client",
] as const;

export type UserRole = (typeof USER_ROLES)[number];

const userSchema = new Schema(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    fullName: { type: String, required: true, trim: true, maxlength: 160 },
    passwordHash: { type: String, required: true, select: false },
    passwordResetRequired: { type: Boolean, default: false, required: true },
    activationTokenHash: { type: String, select: false },
    activationTokenExpiresAt: { type: Date, select: false },
    role: { type: String, enum: USER_ROLES, required: true },
    brokerageId: {
      type: Schema.Types.ObjectId,
      ref: "Brokerage",
      required: function (this: { role?: UserRole }) {
        return this.role !== "platform_admin";
      },
      index: true,
    },
  },
  { timestamps: true },
);

userSchema.index({ activationTokenHash: 1 }, { unique: true, sparse: true });

export type User = InferSchemaType<typeof userSchema>;
export const UserModel = model("User", userSchema);
