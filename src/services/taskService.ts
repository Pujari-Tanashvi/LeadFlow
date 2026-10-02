import { apiRequest } from "./apiClient";
import { API_ENDPOINTS, type QueryParams } from "./endpoints";
import type {
  ApiTask,
  ApiTaskInput,
  ApiTaskListResponse,
  ApiTaskResponse,
  ApiTaskStatus,
} from "./apiTypes";

export interface TaskListParams {
  status?: ApiTaskStatus;
  priority?: string;
  advisor?: string;
  leadId?: string;
  clientId?: string;
  overdue?: boolean;
  search?: string;
  page?: number;
  limit?: number;
}

/** Advisor/advisor tasks. Brokerage isolation is enforced server-side. */
export async function listTasks(
  params: TaskListParams = {},
  signal?: AbortSignal,
): Promise<ApiTaskListResponse> {
  const query: QueryParams = {
    status: params.status,
    priority: params.priority,
    advisor: params.advisor,
    leadId: params.leadId,
    clientId: params.clientId,
    overdue: params.overdue,
    search: params.search,
    page: params.page,
    limit: params.limit,
  };
  return apiRequest<ApiTaskListResponse>(API_ENDPOINTS.tasks.list, {
    query,
    signal,
  });
}

export async function createTask(input: ApiTaskInput): Promise<ApiTask> {
  const response = await apiRequest<ApiTaskResponse>(
    API_ENDPOINTS.tasks.create,
    { method: "POST", body: input },
  );
  return response.task;
}

export async function updateTask(
  taskId: string,
  input: Partial<ApiTaskInput>,
): Promise<ApiTask> {
  const response = await apiRequest<ApiTaskResponse>(
    API_ENDPOINTS.tasks.item(taskId),
    { method: "PATCH", body: input },
  );
  return response.task;
}

export async function completeTask(taskId: string): Promise<ApiTask> {
  const response = await apiRequest<ApiTaskResponse>(
    API_ENDPOINTS.tasks.complete(taskId),
    { method: "POST" },
  );
  return response.task;
}

export async function deleteTask(taskId: string): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.tasks.remove(taskId), {
    method: "DELETE",
  });
}
