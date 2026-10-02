import { apiRequest, ApiError } from "./apiClient";
import { API_ENDPOINTS, type QueryParams } from "./endpoints";
import type {
  ApiConvertResponse,
  ApiDuplicateResponse,
  ApiLead,
  ApiLeadInput,
  ApiLeadListResponse,
  ApiLeadResponse,
} from "./apiTypes";
import { toApiStage } from "./mappers";
import type { PipelineStage } from "../types";

export interface LeadListParams {
  search?: string;
  stage?: PipelineStage;
  advisor?: string;
  page?: number;
  limit?: number;
}

/** Paged lead list, always scoped to the caller's brokerage by the API. */
export async function listLeads(
  params: LeadListParams = {},
  signal?: AbortSignal,
): Promise<ApiLeadListResponse> {
  const query: QueryParams = {
    search: params.search,
    stage: params.stage ? toApiStage(params.stage) : undefined,
    advisor: params.advisor,
    page: params.page,
    limit: params.limit,
  };
  return apiRequest<ApiLeadListResponse>(API_ENDPOINTS.leads.list, {
    query,
    signal,
  });
}

export async function fetchLead(
  leadId: string,
  signal?: AbortSignal,
): Promise<ApiLead> {
  const response = await apiRequest<ApiLeadResponse>(
    API_ENDPOINTS.leads.item(leadId),
    { signal },
  );
  return response.lead;
}

export interface CreateLeadOptions {
  /** Skip the duplicate guard after the advisor confirmed a duplicate. */
  createAnyway?: boolean;
}

export async function createLead(
  input: ApiLeadInput,
  options: CreateLeadOptions = {},
): Promise<ApiLead> {
  try {
    const response = await apiRequest<ApiLeadResponse>(API_ENDPOINTS.leads.create, {
      method: "POST",
      body: input,
      query: options.createAnyway ? { createAnyway: true } : undefined,
    });
    return response.lead;
  } catch (error) {
    // Surface duplicate detections as typed data so the UI can offer
    // view-existing / create-anyway / merge instead of a generic failure.
    if (error instanceof ApiError && error.isConflict) {
      const payload = error.payload as Partial<ApiDuplicateResponse> | undefined;
      if (payload?.duplicate) throw error;
    }
    throw error;
  }
}

/** Move a lead to a workspace stage (translated to the API vocabulary). */
export async function updateLeadStage(
  leadId: string,
  stage: PipelineStage,
): Promise<ApiLead> {
  const response = await apiRequest<ApiLeadResponse>(
    API_ENDPOINTS.leads.stage(leadId),
    { method: "PATCH", body: { stage: toApiStage(stage) } },
  );
  return response.lead;
}

export async function updateLead(
  leadId: string,
  input: Partial<ApiLeadInput>,
): Promise<ApiLead> {
  const response = await apiRequest<ApiLeadResponse>(
    API_ENDPOINTS.leads.item(leadId),
    { method: "PATCH", body: input },
  );
  return response.lead;
}

export async function mergeLead(
  leadId: string,
  duplicateId: string,
): Promise<ApiLead> {
  const response = await apiRequest<ApiLeadResponse & { mergedLeadId: string }>(
    API_ENDPOINTS.leads.merge(leadId),
    { method: "POST", body: { duplicateId } },
  );
  return response.lead;
}

export async function convertLeadToClient(
  leadId: string,
  advisorId?: string,
): Promise<ApiConvertResponse> {
  return apiRequest<ApiConvertResponse>(API_ENDPOINTS.leads.convert(leadId), {
    method: "POST",
    body: advisorId ? { advisorId } : undefined,
  });
}

export async function deleteLead(leadId: string): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.leads.remove(leadId), {
    method: "DELETE",
  });
}
