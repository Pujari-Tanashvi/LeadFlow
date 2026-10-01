import { createHash } from "node:crypto";
import { BrokerageModel } from "../models/Brokerage.js";
import { UserModel, type UserRole } from "../models/User.js";
import {
  assertJwtConfiguration,
  createAccessToken,
  hashPassword,
  verifyPassword,
} from "./authService.js";

export interface RegisterInput {
  brokerageName: string;
  fullName: string;
  email: string;
  password: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  brokerageId: string | null;
}

export interface AuthResult {
  token: string;
  user: AuthenticatedUser;
}

function toAuthenticatedUser(user: {
  _id: { toString(): string };
  email: string;
  fullName: string;
  role: UserRole;
  brokerageId?: { toString(): string } | null;
}): AuthenticatedUser {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    brokerageId: user.brokerageId?.toString() ?? null,
  };
}

export async function registerBrokerage(
  input: RegisterInput,
): Promise<AuthResult> {
  assertJwtConfiguration();
  const email = input.email.trim().toLowerCase();
  if (await UserModel.exists({ email })) {
    throw Object.assign(
      new Error("An account with this email already exists."),
      {
        statusCode: 409,
      },
    );
  }

  const brokerage = await BrokerageModel.create({
    name: input.brokerageName.trim(),
  });
  let createdUserId: typeof brokerage._id | undefined;

  try {
    const user = await UserModel.create({
      email,
      fullName: input.fullName.trim(),
      passwordHash: await hashPassword(input.password),
      role: "brokerage_admin",
      brokerageId: brokerage._id,
    });
    createdUserId = user._id;
    const safeUser = toAuthenticatedUser(user);

    return { user: safeUser, token: createAccessToken(safeUser.id) };
  } catch (error) {
    if (createdUserId) {
      await UserModel.findByIdAndDelete(createdUserId).catch(() => undefined);
    }
    await BrokerageModel.findByIdAndDelete(brokerage._id).catch(
      () => undefined,
    );
    throw error;
  }
}

export async function login(
  emailInput: string,
  password: string,
): Promise<AuthResult | null> {
  const email = emailInput.trim().toLowerCase();
  const user = await UserModel.findOne({ email })
    .select("+passwordHash")
    .exec();

  if (
    !user ||
    user.passwordResetRequired ||
    !(await verifyPassword(password, user.passwordHash))
  ) {
    return null;
  }

  const safeUser = toAuthenticatedUser(user);
  return { user: safeUser, token: createAccessToken(safeUser.id) };
}

export async function activateClientAccount(
  activationToken: string,
  password: string,
): Promise<boolean> {
  const activationTokenHash = createHash("sha256")
    .update(activationToken)
    .digest("hex");
  const passwordHash = await hashPassword(password);
  const user = await UserModel.findOneAndUpdate(
    {
      role: "client",
      passwordResetRequired: true,
      activationTokenHash,
      activationTokenExpiresAt: { $gt: new Date() },
    },
    {
      $set: { passwordHash, passwordResetRequired: false },
      $unset: { activationTokenHash: 1, activationTokenExpiresAt: 1 },
    },
    { new: true, runValidators: true },
  ).exec();

  return Boolean(user);
}

export async function getAuthenticatedUser(
  userId: string,
): Promise<AuthenticatedUser | null> {
  const user = await UserModel.findById(userId)
    .select("email fullName role brokerageId")
    .exec();

  return user ? toAuthenticatedUser(user) : null;
}
