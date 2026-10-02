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

export interface AuthenticatedBrokerage {
  id: string;
  name: string;
}

export interface AuthenticatedUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
  brokerageId: string | null;
  /**
   * Denormalized brokerage identity so the client never has to guess which
   * tenant it is operating in. Always derived from the signed-in account.
   */
  brokerage: AuthenticatedBrokerage | null;
}

export interface AuthResult {
  token: string;
  user: AuthenticatedUser;
}

/**
 * Normalize a brokerage reference (raw ObjectId, populated document, or plain
 * id) into the safe public brokerage shape returned to clients.
 */
function toBrokerage(value: unknown): AuthenticatedBrokerage | null {
  if (!value || typeof value !== "object") return null;
  const record = value as {
    _id?: { toString(): string };
    id?: string;
    name?: string;
  };
  const id = record._id ? record._id.toString() : record.id;
  if (!id) return null;
  return { id, name: typeof record.name === "string" ? record.name : "" };
}

function toAuthenticatedUser(user: {
  _id: { toString(): string };
  email: string;
  fullName: string;
  role: UserRole;
  brokerageId?:
    | { toString(): string; name?: string }
    | { _id: { toString(): string }; name?: string }
    | null;
}): AuthenticatedUser {
  return {
    id: user._id.toString(),
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    brokerageId: user.brokerageId?.toString() ?? null,
    brokerage: toBrokerage(user.brokerageId),
  };
}

/** Resolve the brokerage name for a user document whose ref is not populated. */
async function brokerageFor(
  user: { brokerageId?: unknown },
): Promise<AuthenticatedBrokerage | null> {
  const reference = toBrokerage(user.brokerageId);
  if (!reference) return null;
  if (reference.name) return reference;
  const brokerage = await BrokerageModel.findById(reference.id)
    .select("name")
    .lean()
    .exec();
  return brokerage
    ? { id: reference.id, name: brokerage.name ?? "" }
    : { id: reference.id, name: "" };
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
    // The freshly created brokerage name is already known, no extra lookup.
    safeUser.brokerage = { id: brokerage._id.toString(), name: brokerage.name };

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
  safeUser.brokerage = await brokerageFor(user);
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

  if (!user) return null;
  // The brokerage id must stay a raw string id for the tenant middleware and
  // the socket rooms, so the display name is resolved with a separate lookup
  // instead of populating (and object-ifying) the reference.
  const safeUser = toAuthenticatedUser(user);
  safeUser.brokerage = await brokerageFor(user);
  return safeUser;
}
