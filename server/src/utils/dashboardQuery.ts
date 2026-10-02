import { Types } from "mongoose";
import type { AuthContext } from "../types/auth.js";

/**
 * Resolve the tenant (brokerage) the dashboard must be scoped to. Every
 * dashboard query is restricted to this id so one brokerage can never read
 * another brokerage's statistics.
 */
export function getDashboardTenantId(
  auth: Pick<AuthContext, "brokerageId">,
): Types.ObjectId {
  if (!auth.brokerageId || !Types.ObjectId.isValid(auth.brokerageId)) {
    throw new Error(
      "A valid brokerage account is required for dashboard access.",
    );
  }

  return new Types.ObjectId(auth.brokerageId);
}
