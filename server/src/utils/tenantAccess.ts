import type { AuthContext } from "../types/auth.js";

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
