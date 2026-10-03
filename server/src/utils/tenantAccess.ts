import type { UserRole } from "../models/User.js";
import type { AuthContext } from "../types/auth.js";

/**
 * Roles that may own a client dossier, and therefore may be assigned as the
 * advisor on a lead, a task or a conversion.
 *
 * Both are brokerage staff working inside the tenant, so both satisfy the
 * property that actually matters — the assignee belongs to the brokerage that
 * owns the record. Excluding `brokerage_admin` made the flagship
 * lead -> client workflow impossible for any freshly registered brokerage:
 * registration creates an admin, there is no endpoint that provisions an
 * `advisor`, so there was no valid advisor id to ever assign.
 */
export const DOSSIER_OWNER_ROLES: readonly UserRole[] = [
  "advisor",
  "brokerage_admin",
];

/** Mongo filter matching a user who may own a dossier in `brokerageId`. */
export function dossierOwnerFilter(brokerageId: unknown) {
  return { brokerageId, role: { $in: [...DOSSIER_OWNER_ROLES] } };
}

export function canAccessBrokerage(
  auth: Pick<AuthContext, "role" | "brokerageId">,
  requestedBrokerageId: string,
): boolean {
  return (
    auth.role === "platform_admin" ||
    (auth.brokerageId !== null &&
      auth.brokerageId.toLowerCase() === requestedBrokerageId.toLowerCase())
  );
}

export function brokerageFilter(
  auth: Pick<AuthContext, "role" | "brokerageId">,
): { brokerageId?: string } {
  if (auth.role === "platform_admin") {
    return {};
  }

  if (!auth.brokerageId) {
    throw new Error("Authenticated brokerage user is missing a brokerageId.");
  }

  return { brokerageId: auth.brokerageId };
}
