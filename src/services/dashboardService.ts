import { apiRequest } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import type { ApiDashboardSummary } from "./apiTypes";

/**
 * Brokerage-scoped statistics. Available to brokerage admins and advisors;
 * clients and platform admins are rejected by the API and must not call it.
 */
export async function fetchDashboardSummary(
  signal?: AbortSignal,
): Promise<ApiDashboardSummary> {
  return apiRequest<ApiDashboardSummary>(API_ENDPOINTS.dashboard, { signal });
}
