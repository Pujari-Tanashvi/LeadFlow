import { LeadModel } from "../models/Lead.js";
import {
  normalizeEmail,
  normalizeLeadName,
  normalizePhone,
} from "../utils/leadIdentity.js";

const batchSize = 500;

export function getLeadsMissingIdentityFilter() {
  return {
    $or: [
      { emailNormalized: { $exists: false } },
      { phoneNormalized: { $exists: false } },
      { nameNormalized: { $exists: false } },
    ],
  };
}

export async function backfillLeadIdentityFields(): Promise<number> {
  const cursor = LeadModel.find(getLeadsMissingIdentityFilter())
    .select("_id name email phone")
    .lean()
    .cursor({ batchSize });

  let pending: Array<{
    updateOne: {
      filter: {
        _id: typeof cursor extends never
          ? never
          : import("mongoose").Types.ObjectId;
      };
      update: {
        $set: {
          emailNormalized: string;
          phoneNormalized: string;
          nameNormalized: string;
        };
      };
    };
  }> = [];
  let updatedCount = 0;

  for await (const lead of cursor) {
    pending.push({
      updateOne: {
        filter: { _id: lead._id },
        update: {
          $set: {
            emailNormalized: normalizeEmail(lead.email),
            phoneNormalized: normalizePhone(lead.phone),
            nameNormalized: normalizeLeadName(lead.name),
          },
        },
      },
    });

    if (pending.length === batchSize) {
      const result = await LeadModel.bulkWrite(pending, { ordered: false });
      updatedCount += result.modifiedCount;
      pending = [];
    }
  }

  if (pending.length) {
    const result = await LeadModel.bulkWrite(pending, { ordered: false });
    updatedCount += result.modifiedCount;
  }

  return updatedCount;
}
