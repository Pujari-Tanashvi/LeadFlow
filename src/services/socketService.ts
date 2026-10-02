import { io, type Socket } from "socket.io-client";
import { SOCKET_EVENTS } from "./endpoints";
import type {
  ApiDashboardSummary,
  ApiDocument,
  ApiLead,
  ApiTask,
} from "./apiTypes";

export type SocketStatus = "idle" | "connecting" | "connected" | "error";

export type TaskEventName = "created" | "updated" | "deleted" | "overdue";

export interface WorkspaceSocketHandlers {
  onStatus?: (status: SocketStatus, detail?: string) => void;
  /** A new lead was ingested (webhook or manual intake) for this brokerage. */
  onLeadCreated?: (lead: ApiLead) => void;
  /** Background verification progressed for one of the brokerage documents. */
  onDocumentStatus?: (document: ApiDocument) => void;
  /** Task created / updated / deleted / flagged overdue. */
  onTaskEvent?: (event: TaskEventName, task: ApiTask) => void;
  /** A fresh brokerage dashboard summary after any lead/client change. */
  onDashboardStats?: (summary: ApiDashboardSummary) => void;
}

let socket: Socket | null = null;
let currentToken: string | null = null;

const TASK_EVENT_NAMES: Record<TaskEventName, string> = {
  created: SOCKET_EVENTS.taskCreated,
  updated: SOCKET_EVENTS.taskUpdated,
  deleted: SOCKET_EVENTS.taskDeleted,
  overdue: SOCKET_EVENTS.taskOverdue,
};

function isApiLead(value: unknown): value is ApiLead {
  return Boolean(
    value && typeof value === "object" && typeof (value as ApiLead)._id === "string",
  );
}

function isApiDocument(value: unknown): value is ApiDocument {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ApiDocument)._id === "string",
  );
}

function isApiTask(value: unknown): value is ApiTask {
  return Boolean(
    value && typeof value === "object" && typeof (value as ApiTask)._id === "string",
  );
}

function isDashboardSummary(value: unknown): value is ApiDashboardSummary {
  return Boolean(
    value &&
      typeof value === "object" &&
      typeof (value as ApiDashboardSummary).totalLeads === "number",
  );
}

/**
 * Open the authenticated live channel. The API joins the socket to the
 * brokerage (or, for a client, to its own dossier) based on the JWT, so the
 * frontend can never subscribe to another tenant's events.
 */
export function connectWorkspaceSocket(
  token: string,
  handlers: WorkspaceSocketHandlers = {},
): Socket {
  if (socket && currentToken === token) return socket;
  disconnectWorkspaceSocket();
  currentToken = token;

  const connection = io({
    path: "/socket.io",
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionDelay: 1000,
    reconnectionDelayMax: 8000,
  });

  connection.on("connect", () => handlers.onStatus?.("connected"));
  connection.on("disconnect", (reason) =>
    handlers.onStatus?.("connecting", `Live sync ${reason}`),
  );
  connection.on("connect_error", (error) =>
    handlers.onStatus?.("error", error.message),
  );

  connection.on(SOCKET_EVENTS.leadCreated, (payload: unknown) => {
    if (isApiLead(payload)) handlers.onLeadCreated?.(payload);
  });

  connection.on(SOCKET_EVENTS.documentStatus, (payload: unknown) => {
    if (isApiDocument(payload)) handlers.onDocumentStatus?.(payload);
  });

  for (const event of ["created", "updated", "deleted", "overdue"] as const) {
    connection.on(TASK_EVENT_NAMES[event], (payload: unknown) => {
      if (isApiTask(payload)) handlers.onTaskEvent?.(event, payload);
    });
  }

  connection.on(SOCKET_EVENTS.dashboardStats, (payload: unknown) => {
    if (isDashboardSummary(payload)) handlers.onDashboardStats?.(payload);
  });

  socket = connection;
  handlers.onStatus?.("connecting");
  return connection;
}

export function disconnectWorkspaceSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.disconnect();
    socket = null;
  }
  currentToken = null;
}

export function isSocketConnected(): boolean {
  return Boolean(socket?.connected);
}
