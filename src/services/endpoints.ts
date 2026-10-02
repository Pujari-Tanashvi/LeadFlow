/**
 * Canonical API surface consumed by the frontend.
 *
 * Every path is declared once here so the service layer, the socket layer and
 * the contract test all agree with the Express router. The frontend always
 * calls same-origin `/api/*`; in development Vite proxies that to the API
 * server (see vite.config.ts) which keeps CORS and the JWT cookie/header flow
 * simple and identical in every environment.
 */
export const API_BASE = "/api";

export const API_ENDPOINTS = {
  health: `${API_BASE}/health`,
  auth: {
    login: `${API_BASE}/auth/login`,
    register: `${API_BASE}/auth/register`,
    activateClient: `${API_BASE}/auth/activate-client`,
    me: `${API_BASE}/auth/me`,
  },
  leads: {
    list: `${API_BASE}/leads`,
    create: `${API_BASE}/leads`,
    item: (id: string) => `${API_BASE}/leads/${encodeURIComponent(id)}`,
    stage: (id: string) => `${API_BASE}/leads/${encodeURIComponent(id)}/stage`,
    convert: (id: string) => `${API_BASE}/leads/${encodeURIComponent(id)}/convert`,
    merge: (id: string) => `${API_BASE}/leads/${encodeURIComponent(id)}/merge`,
    remove: (id: string) => `${API_BASE}/leads/${encodeURIComponent(id)}`,
  },
  documents: {
    list: `${API_BASE}/documents`,
    create: `${API_BASE}/documents`,
    item: (id: string) => `${API_BASE}/documents/${encodeURIComponent(id)}`,
    content: (id: string) =>
      `${API_BASE}/documents/${encodeURIComponent(id)}/content`,
    status: (id: string) =>
      `${API_BASE}/documents/${encodeURIComponent(id)}/status`,
    retry: (id: string) => `${API_BASE}/documents/${encodeURIComponent(id)}/retry`,
    remove: (id: string) => `${API_BASE}/documents/${encodeURIComponent(id)}`,
  },
  tasks: {
    list: `${API_BASE}/tasks`,
    create: `${API_BASE}/tasks`,
    item: (id: string) => `${API_BASE}/tasks/${encodeURIComponent(id)}`,
    complete: (id: string) => `${API_BASE}/tasks/${encodeURIComponent(id)}/complete`,
    remove: (id: string) => `${API_BASE}/tasks/${encodeURIComponent(id)}`,
  },
  emailTemplates: {
    list: `${API_BASE}/email-templates`,
    create: `${API_BASE}/email-templates`,
    item: (id: string) =>
      `${API_BASE}/email-templates/${encodeURIComponent(id)}`,
    remove: (id: string) =>
      `${API_BASE}/email-templates/${encodeURIComponent(id)}`,
  },
  dashboard: `${API_BASE}/dashboard`,
} as const;

/** Socket.IO namespace-free endpoint, proxied to the API server in dev. */
export const SOCKET_PATH = "/socket.io";

/** Socket.IO event names emitted by the API. */
export const SOCKET_EVENTS = {
  leadCreated: "lead.created",
  documentStatus: "document.status",
  taskCreated: "task.created",
  taskUpdated: "task.updated",
  taskDeleted: "task.deleted",
  taskOverdue: "task.overdue",
  dashboardStats: "dashboard.stats",
} as const;

export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

/** Build a query string, dropping empty values so we never send `?stage=`. */
export function buildQuery(params?: QueryParams): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    search.set(key, String(value));
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}
