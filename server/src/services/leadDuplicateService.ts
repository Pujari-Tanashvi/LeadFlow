import { Types } from "mongoose";
import { LeadModel } from "../models/Lead.js";
import {
  normalizeEmail,
  normalizeLeadName,
  normalizePhone,
} from "../utils/leadIdentity.js";

export type DuplicateReason = "email" | "phone" | "name_phone";

export interface DuplicateLeadMatch {
  lead: Record<string, unknown>;
  matchedBy: DuplicateReason[];
}

export interface LeadIdentityInput {
  name: string;
  email: string;
  phone: string;
}

export async function findDuplicateLeads(
  brokerageId: Types.ObjectId,
  identity: LeadIdentityInput,
  excludeLeadId?: Types.ObjectId,
): Promise<DuplicateLeadMatch[]> {
  const normalizedEmail = normalizeEmail(identity.email);
  const normalizedPhone = normalizePhone(identity.phone);
  const normalizedName = normalizeLeadName(identity.name);

  const matches = await LeadModel.find({
    brokerageId,
    ...(excludeLeadId ? { _id: { $ne: excludeLeadId } } : {}),
    $or: [
      { emailNormalized: normalizedEmail },
      { phoneNormalized: normalizedPhone },
      { nameNormalized: normalizedName, phoneNormalized: normalizedPhone },
    ],
  })
    .select("+emailNormalized +phoneNormalized +nameNormalized")
    .sort({ createdAt: -1 })
    .exec();

  return matches.map((lead) => {
    const matchedBy: DuplicateReason[] = [];
    if (lead.emailNormalized === normalizedEmail) matchedBy.push("email");
    if (lead.phoneNormalized === normalizedPhone) matchedBy.push("phone");
    if (
      lead.nameNormalized === normalizedName &&
      lead.phoneNormalized === normalizedPhone
    ) {
      matchedBy.push("name_phone");
    }

    const existingLead = lead.toObject();
    delete existingLead.emailNormalized;
    delete existingLead.phoneNormalized;
    delete existingLead.nameNormalized;

    return {
      lead: existingLead as Record<string, unknown>,
      matchedBy,
    };
  });
}
