import { apiRequest } from "./apiClient";
import { API_ENDPOINTS, type QueryParams } from "./endpoints";
import type {
  ApiEmailTemplate,
  ApiEmailTemplateInput,
  ApiEmailTemplateListResponse,
  ApiEmailTemplateResponse,
  ApiLeadStage,
} from "./apiTypes";

export interface EmailTemplateListParams {
  stage?: ApiLeadStage;
  active?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/** Read access: brokerage admins and advisors. */
export async function listEmailTemplates(
  params: EmailTemplateListParams = {},
  signal?: AbortSignal,
): Promise<ApiEmailTemplateListResponse> {
  const query: QueryParams = {
    stage: params.stage,
    active: params.active === undefined ? undefined : params.active,
    search: params.search,
    page: params.page,
    limit: params.limit,
  };
  return apiRequest<ApiEmailTemplateListResponse>(
    API_ENDPOINTS.emailTemplates.list,
    { query, signal },
  );
}

export async function fetchEmailTemplate(
  templateId: string,
  signal?: AbortSignal,
): Promise<ApiEmailTemplate> {
  const response = await apiRequest<ApiEmailTemplateResponse>(
    API_ENDPOINTS.emailTemplates.item(templateId),
    { signal },
  );
  return response.template;
}

/** Write access: brokerage admins only (the API enforces the role). */
export async function createEmailTemplate(
  input: ApiEmailTemplateInput,
): Promise<ApiEmailTemplate> {
  const response = await apiRequest<ApiEmailTemplateResponse>(
    API_ENDPOINTS.emailTemplates.create,
    { method: "POST", body: input },
  );
  return response.template;
}

export async function updateEmailTemplate(
  templateId: string,
  input: Partial<ApiEmailTemplateInput>,
): Promise<ApiEmailTemplate> {
  const response = await apiRequest<ApiEmailTemplateResponse>(
    API_ENDPOINTS.emailTemplates.item(templateId),
    { method: "PATCH", body: input },
  );
  return response.template;
}

export async function deleteEmailTemplate(templateId: string): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.emailTemplates.remove(templateId), {
    method: "DELETE",
  });
}
