import { createHash, randomBytes } from "node:crypto";
import { Types } from "mongoose";
import { ActivityModel } from "../models/Activity.js";
import { ClientModel } from "../models/Client.js";
import { LEAD_STAGES, LeadModel, type LeadStage } from "../models/Lead.js";
import { UserModel } from "../models/User.js";
import type { AuthContext } from "../types/auth.js";
import { normalizeEmail, normalizePhone } from "../utils/leadIdentity.js";
import { dossierOwnerFilter } from "../utils/tenantAccess.js";
import { hashPassword } from "./authService.js";

const activationLifetimeMs = 24 * 60 * 60 * 1000;

function serviceError(
  message: string,
  statusCode: number,
): Error & { statusCode: number } {
  return Object.assign(new Error(message), { statusCode });
}

export interface ConvertLeadInput {
  leadId: string;
  auth: AuthContext;
  advisorId?: string;
}

export interface ConvertLeadResult {
  client: Record<string, unknown>;
  user: { id: string; email: string; role: "client" };
  lead: Record<string, unknown>;
  activation: { token: string; expiresAt: Date } | null;
  reusedExistingClient: boolean;
}

function publicClient(client: InstanceType<typeof ClientModel>) {
  return Object.fromEntries(
    Object.entries(client.toObject()).filter(
      ([key]) => key !== "emailNormalized" && key !== "phoneNormalized",
    ),
  ) as Record<string, unknown>;
}

function publicLead(lead: InstanceType<typeof LeadModel>) {
  const value = lead.toObject();
  delete value.emailNormalized;
  delete value.phoneNormalized;
  delete value.nameNormalized;
  return value as Record<string, unknown>;
}

export async function convertLeadToClient(
  input: ConvertLeadInput,
): Promise<ConvertLeadResult> {
  if (
    !input.auth.brokerageId ||
    !Types.ObjectId.isValid(input.auth.brokerageId)
  ) {
    throw serviceError("A brokerage account is required for conversion.", 403);
  }

  const brokerageId = new Types.ObjectId(input.auth.brokerageId);
  if (!Types.ObjectId.isValid(input.leadId)) {
    throw serviceError("Lead ID must be a valid MongoDB ID.", 400);
  }
  const leadId = new Types.ObjectId(input.leadId);
  const lead = await LeadModel.findOne({ _id: leadId, brokerageId })
    .select("+emailNormalized +phoneNormalized +nameNormalized")
    .exec();
  if (!lead) throw serviceError("Lead not found.", 404);

  if (lead.convertedClientId) {
    throw serviceError("Lead has already been converted to a client.", 409);
  }

  // Fall back to whoever is doing the converting: an explicit advisorId, then
  // the lead's existing assignee, then the signed-in brokerage staff member.
  const advisorIdValue =
    input.advisorId ??
    lead.assignedAdvisor?.toString() ??
    (input.auth.role === "advisor" || input.auth.role === "brokerage_admin"
      ? input.auth.userId
      : undefined);
  if (!advisorIdValue || !Types.ObjectId.isValid(advisorIdValue)) {
    throw serviceError(
      "Assign an advisor to the lead before converting it.",
      422,
    );
  }
  const advisorId = new Types.ObjectId(advisorIdValue);
  const advisorExists = await UserModel.exists({
    _id: advisorId,
    ...dossierOwnerFilter(brokerageId),
  });
  if (!advisorExists) {
    throw serviceError(
      "The assigned advisor must belong to your brokerage.",
      422,
    );
  }

  const email = normalizeEmail(lead.email);
  const emailNormalized = email;
  const existingClient = await ClientModel.findOne({
    brokerageId,
    emailNormalized,
  }).exec();
  let client = existingClient;
  let user = existingClient
    ? await UserModel.findOne({
        _id: existingClient.userId,
        brokerageId,
        role: "client",
      }).exec()
    : null;
  if (existingClient && !user) {
    throw serviceError(
      "Existing client account is inconsistent; contact support.",
      409,
    );
  }

  let createdUserId: Types.ObjectId | undefined;
  let createdClientId: Types.ObjectId | undefined;
  let activationToken: string | null = null;
  let activationExpiresAt: Date | null = null;
  let clientAssociationChanged = false;
  let leadConverted = false;
  const createdActivityIds: Types.ObjectId[] = [];

  try {
    if (!client) {
      const existingUser = await UserModel.findOne({ email }).exec();
      if (existingUser) {
        if (
          existingUser.role !== "client" ||
          existingUser.brokerageId?.toString() !== brokerageId.toString()
        ) {
          throw serviceError(
            "An account with this email already exists outside this brokerage client profile.",
            409,
          );
        }
        user = existingUser;
      } else {
        const temporaryPassword = randomBytes(32).toString("base64url");
        activationToken = randomBytes(32).toString("base64url");
        activationExpiresAt = new Date(Date.now() + activationLifetimeMs);
        const activationTokenHash = createHash("sha256")
          .update(activationToken)
          .digest("hex");
        user = await UserModel.create({
          email,
          fullName: lead.name,
          passwordHash: await hashPassword(temporaryPassword),
          passwordResetRequired: true,
          activationTokenHash,
          activationTokenExpiresAt: activationExpiresAt,
          role: "client",
          brokerageId,
        });
        createdUserId = user._id;
      }

      client = await ClientModel.create({
        userId: user._id,
        brokerageId,
        email,
        emailNormalized,
        fullName: lead.name,
        phone: lead.phone,
        phoneNormalized: normalizePhone(lead.phone),
        advisorIds: [advisorId],
        leadIds: [],
      });
      createdClientId = client._id;
    }

    const previousStage = lead.stage as LeadStage;
    const updatedLead = await LeadModel.findOneAndUpdate(
      {
        _id: leadId,
        brokerageId,
        convertedClientId: null,
        stage: previousStage,
      },
      {
        $set: {
          convertedClientId: client._id,
          convertedAt: new Date(),
          assignedAdvisor: advisorId,
          stage: "Won",
        },
      },
      { new: true, runValidators: true },
    ).exec();
    if (!updatedLead) {
      throw serviceError("Lead was converted by another request.", 409);
    }
    leadConverted = true;

    if (!createdClientId) {
      await ClientModel.updateOne(
        { _id: client._id, brokerageId },
        { $addToSet: { leadIds: leadId, advisorIds: advisorId } },
      ).exec();
      clientAssociationChanged = true;
      client = (await ClientModel.findOne({
        _id: client._id,
        brokerageId,
      }).exec())!;
    } else {
      await ClientModel.updateOne(
        { _id: client._id, brokerageId },
        { $addToSet: { leadIds: leadId } },
      ).exec();
    }

    if (previousStage !== "Won") {
      const stageActivity = await ActivityModel.create({
        leadId,
        brokerageId,
        actorId: new Types.ObjectId(input.auth.userId),
        type: "lead_stage_changed",
        fromStage: previousStage,
        toStage: "Won",
        clientId: client._id,
      });
      createdActivityIds.push(stageActivity._id);
    }
    const conversionActivity = await ActivityModel.create({
      leadId,
      brokerageId,
      actorId: new Types.ObjectId(input.auth.userId),
      type: "lead_converted",
      fromStage: previousStage,
      toStage: "Won",
      clientId: client._id,
    });
    createdActivityIds.push(conversionActivity._id);

    return {
      client: publicClient(client),
      user: { id: user!._id.toString(), email: user!.email, role: "client" },
      lead: publicLead(updatedLead),
      activation:
        activationToken && activationExpiresAt
          ? { token: activationToken, expiresAt: activationExpiresAt }
          : null,
      reusedExistingClient: !createdClientId,
    };
  } catch (error) {
    if (createdActivityIds.length) {
      await ActivityModel.deleteMany({
        _id: { $in: createdActivityIds },
        brokerageId,
        leadId,
      }).catch(() => undefined);
    }
    if (leadConverted) {
      await LeadModel.updateOne(
        { _id: leadId, brokerageId, convertedClientId: client?._id },
        {
          $set: { stage: lead.stage, assignedAdvisor: lead.assignedAdvisor },
          $unset: { convertedClientId: 1, convertedAt: 1 },
        },
      ).catch(() => undefined);
    }
    if (clientAssociationChanged && client) {
      await ClientModel.updateOne(
        { _id: client._id, brokerageId },
        { $pull: { leadIds: leadId, advisorIds: advisorId } },
      ).catch(() => undefined);
    }
    if (createdClientId) {
      await ClientModel.deleteOne({ _id: createdClientId, brokerageId }).catch(
        () => undefined,
      );
    }
    if (createdUserId) {
      await UserModel.deleteOne({ _id: createdUserId, brokerageId }).catch(
        () => undefined,
      );
    }
    throw error;
  }
}
