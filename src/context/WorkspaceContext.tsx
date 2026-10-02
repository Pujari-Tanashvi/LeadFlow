/**
 * Workspace data for the signed-in user.
 *
 * Every figure shown by the approved components comes from the LeadFlow API
 * through the service layer; nothing is faked in the browser. Raw API payloads
 * are kept in state and mapped into the shapes the components already expect,
 * so a Socket.IO event and a manual refresh update exactly the same data.
 */
import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type {
  Advisor,
  Brokerage,
  DashboardStats,
  DocumentItem,
  EmailTemplate,
  Lead,
  LeadTask,
  PipelineStage,
  TaskTrigger,
} from "../types";
import type {
  ApiConvertResponse,
  ApiDashboardSummary,
  ApiDocument,
  ApiEmailTemplate,
  ApiLead,
  ApiLeadInput,
  ApiTask,
  ApiTaskInput,
} from "../services/apiTypes";
import {
  buildAdvisorNames,
  buildTaskContext,
  mapBrokerage,
  mapDashboard,
  mapDocument,
  mapEmailTemplate,
  mapLead,
  mapTask,
  toApiDocumentStatus,
  toApiStage,
} from "../services/mappers";
import {
  convertLeadToClient,
  createLead as createLeadRequest,
  listLeads,
  updateLeadStage,
} from "../services/leadService";
import {
  completeTask as completeTaskRequest,
  createTask as createTaskRequest,
  deleteTask as deleteTaskRequest,
  listTasks,
} from "../services/taskService";
import {
  createEmailTemplate as createTemplateRequest,
  deleteEmailTemplate as deleteTemplateRequest,
  listEmailTemplates,
  updateEmailTemplate as updateTemplateRequest,
} from "../services/emailTemplateService";
import {
  listDocuments,
  updateDocumentStatus as updateDocumentStatusRequest,
  uploadDocument as uploadDocumentRequest,
} from "../services/documentService";
import { fetchDashboardSummary } from "../services/dashboardService";
import {
  connectWorkspaceSocket,
  disconnectWorkspaceSocket,
  type SocketStatus,
} from "../services/socketService";
import { useAuth } from "./AuthContext";

const PAGE_LIMIT = 100;

export interface WorkspaceValue {
  leads: Lead[];
  documents: DocumentItem[];
  tasks: LeadTask[];
  emailTemplates: EmailTemplate[];
  dashboard: DashboardStats | null;
  brokerage: Brokerage;
  advisors: Advisor[];
  clients: Lead[];
  taskTriggers: TaskTrigger[];

  isLoading: boolean;
  error: string | null;
  actionError: string | null;
  lastEvent: string | null;
  socketStatus: SocketStatus;
  liveSyncEnabled: boolean;
  setLiveSyncEnabled: (enabled: boolean) => void;
  isEmpty: boolean;

  refresh: () => Promise<void>;
  clearActionError: () => void;
  /** Surface a client-side precondition failure in the action banner. */
  reportActionError: (message: string) => void;
  moveLead: (leadId: string, stage: PipelineStage) => Promise<void>;
  ingestLead: (
    input: ApiLeadInput,
    options?: { createAnyway?: boolean },
  ) => Promise<void>;
  convertLead: (leadId: string) => Promise<ApiConvertResponse | null>;
  completeTask: (taskId: string) => Promise<void>;
  addTask: (input: ApiTaskInput) => Promise<void>;
  removeTask: (taskId: string) => Promise<void>;
  saveTemplate: (template: EmailTemplate) => Promise<void>;
  addTemplate: (template: EmailTemplate) => Promise<void>;
  removeTemplate: (templateId: string) => Promise<void>;
  updateDocument: (document: DocumentItem) => Promise<void>;
  addDocument: (input: {
    clientId: string;
    documentType: string;
    file: File;
  }) => Promise<void>;
}

const WorkspaceContext = createContext<WorkspaceValue | null>(null);

function errorMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const value = (error as { message?: unknown }).message;
    if (typeof value === "string" && value.trim()) return value;
  }
  return fallback;
}

function initialsOf(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const { user, token, permissions } = useAuth();

  const [rawLeads, setRawLeads] = useState<ApiLead[]>([]);
  const [rawDocuments, setRawDocuments] = useState<ApiDocument[]>([]);
  const [rawTasks, setRawTasks] = useState<ApiTask[]>([]);
  const [rawTemplates, setRawTemplates] = useState<ApiEmailTemplate[]>([]);
  const [rawDashboard, setRawDashboard] =
    useState<ApiDashboardSummary | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const [socketStatus, setSocketStatus] = useState<SocketStatus>("idle");
  const [liveSyncEnabled, setLiveSyncEnabled] = useState(true);

  const leads = useMemo(() => rawLeads.map(mapLead), [rawLeads]);
  const documents = useMemo(() => rawDocuments.map(mapDocument), [rawDocuments]);
  const emailTemplates = useMemo(
    () => rawTemplates.map(mapEmailTemplate),
    [rawTemplates],
  );
  const taskContext = useMemo(
    () => buildTaskContext(leads, user),
    [leads, user],
  );
  const tasks = useMemo(
    () => rawTasks.map((task) => mapTask(task, taskContext)),
    [rawTasks, taskContext],
  );
  const dashboard = useMemo(
    () => (rawDashboard ? mapDashboard(rawDashboard) : null),
    [rawDashboard],
  );
  const brokerage = useMemo(
    () => mapBrokerage(user, dashboard),
    [user, dashboard],
  );
  const advisorNames = useMemo(
    () => buildAdvisorNames(leads, user),
    [leads, user],
  );
  const advisors = useMemo<Advisor[]>(
    () =>
      [...advisorNames.entries()].map(([id, name]) => ({
        id,
        brokerageId: user?.brokerageId ?? "",
        name,
        email: "",
        avatar: initialsOf(name),
        role: "Mortgage Advisor",
        activeCases: leads.filter((lead) => lead.assignedAdvisorId === id).length,
      })),
    [advisorNames, leads, user],
  );
  const clients = useMemo(
    () => leads.filter((lead) => lead.isClient && lead.clientId),
    [leads],
  );

  // Stage automations are server-owned. They are surfaced from the automation
  // tasks the API actually created, so the list is always real.
  const taskTriggers = useMemo<TaskTrigger[]>(
    () =>
      rawTasks
        .filter((task) => task.source === "automation")
        .map((task) => {
          const lead = leads.find((item) => item.id === task.leadId);
          const due = task.dueDate ? new Date(task.dueDate).getTime() : NaN;
          const created = new Date(task.createdAt).getTime();
          const slaHours = Number.isFinite(due - created)
            ? Math.max(1, Math.round((due - created) / (1000 * 60 * 60)))
            : 24;
          return {
            id: task._id,
            brokerageId: task.brokerageId,
            title: task.title,
            stage: lead?.stage ?? "new",
            slaHours,
            assigneeRole: "advisor",
          };
        }),
    [rawTasks, leads],
  );

  const isEmpty = useMemo(() => {
    if (permissions.isPlatformAdmin) return true;
    if (permissions.isClient) return rawDocuments.length === 0;
    return (
      rawLeads.length === 0 &&
      rawDocuments.length === 0 &&
      rawTasks.length === 0 &&
      rawTemplates.length === 0
    );
  }, [
    permissions.isClient,
    permissions.isPlatformAdmin,
    rawDocuments.length,
    rawLeads.length,
    rawTasks.length,
    rawTemplates.length,
  ]);

  const loadAll = useCallback(async () => {
    if (!token) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);

    // A platform admin is not attached to a brokerage, so there is no tenant
    // data to read. The workspace explains that instead of guessing.
    if (permissions.isPlatformAdmin) {
      setIsLoading(false);
      return;
    }

    // A client is scoped by the API to its own dossier: no lead, task,
    // template or dashboard request is ever issued for that role.
    if (permissions.isClient) {
      try {
        const documentsResponse = await listDocuments();
        setRawDocuments(documentsResponse.documents);
      } catch (caught) {
        setError(
          errorMessage(caught, "Your documents could not be loaded right now."),
        );
      }
      setIsLoading(false);
      return;
    }

    const [leadResult, documentResult, taskResult, templateResult, dashResult] =
      await Promise.allSettled([
        listLeads({ limit: PAGE_LIMIT }),
        listDocuments(),
        listTasks({ limit: PAGE_LIMIT }),
        listEmailTemplates({ limit: PAGE_LIMIT }),
        fetchDashboardSummary(),
      ]);

    if (leadResult.status === "fulfilled") setRawLeads(leadResult.value.leads);
    if (documentResult.status === "fulfilled") {
      setRawDocuments(documentResult.value.documents);
    }
    if (taskResult.status === "fulfilled") setRawTasks(taskResult.value.tasks);
    if (templateResult.status === "fulfilled") {
      setRawTemplates(templateResult.value.templates);
    }
    if (dashResult.status === "fulfilled") setRawDashboard(dashResult.value);

    const failures: string[] = [];
    if (leadResult.status === "rejected") {
      failures.push(errorMessage(leadResult.reason, "Leads could not be loaded."));
    }
    if (documentResult.status === "rejected") {
      failures.push(
        errorMessage(documentResult.reason, "Documents could not be loaded."),
      );
    }
    if (taskResult.status === "rejected") {
      failures.push(errorMessage(taskResult.reason, "Tasks could not be loaded."));
    }
    if (templateResult.status === "rejected") {
      failures.push(
        errorMessage(templateResult.reason, "Email templates could not be loaded."),
      );
    }
    if (dashResult.status === "rejected") {
      failures.push(
        errorMessage(dashResult.reason, "Dashboard statistics could not be loaded."),
      );
    }
    setError(failures.length > 0 ? failures.join(" ") : null);
    setIsLoading(false);
  }, [permissions.isClient, permissions.isPlatformAdmin, token]);

  useEffect(() => {
    void loadAll();
  }, [loadAll]);

  // Live updates. The JWT is verified during the Socket.IO handshake and the
  // server places the socket in the brokerage (or client) room for it.
  useEffect(() => {
    if (!token || !liveSyncEnabled || permissions.isPlatformAdmin) {
      disconnectWorkspaceSocket();
      setSocketStatus("idle");
      return;
    }

    connectWorkspaceSocket(token, {
      onStatus: (status, detail) => {
        setSocketStatus(status);
        if (detail) setLastEvent(detail);
      },
      onLeadCreated: (lead) => {
        setRawLeads((previous) =>
          previous.some((item) => item._id === lead._id)
            ? previous
            : [lead, ...previous],
        );
        setLastEvent(`Live lead received: ${lead.name}`);
      },
      onDocumentStatus: (document) => {
        setRawDocuments((previous) => {
          const index = previous.findIndex(
            (item) => item._id === document._id,
          );
          if (index === -1) return [document, ...previous];
          const next = [...previous];
          next[index] = document;
          return next;
        });
        setLastEvent(
          `Document ${document.documentType} · ${document.status}`,
        );
      },
      onTaskEvent: (event, task) => {
        setRawTasks((previous) => {
          if (event === "deleted") {
            return previous.filter((item) => item._id !== task._id);
          }
          const index = previous.findIndex((item) => item._id === task._id);
          if (index === -1) return [task, ...previous];
          const next = [...previous];
          next[index] = task;
          return next;
        });
        setLastEvent(`Task ${event}: ${task.title}`);
      },
      onDashboardStats: (summary) => setRawDashboard(summary),
    });

    return () => {
      disconnectWorkspaceSocket();
    };
  }, [liveSyncEnabled, permissions.isPlatformAdmin, token]);

  const upsertLead = useCallback((lead: ApiLead) => {
    setRawLeads((previous) => {
      const index = previous.findIndex((item) => item._id === lead._id);
      if (index === -1) return [lead, ...previous];
      const next = [...previous];
      next[index] = lead;
      return next;
    });
  }, []);

  const moveLead = useCallback(
    async (leadId: string, stage: PipelineStage) => {
      setActionError(null);
      try {
        const updated = await updateLeadStage(leadId, stage);
        upsertLead(updated);
        setLastEvent(`Live pipeline: ${updated.name} → ${toApiStage(stage)}`);
        // Entering a stage runs the server automations (task + email), so pull
        // the dependent resources back into the workspace.
        void loadAll();
      } catch (caught) {
        setActionError(
          errorMessage(caught, "The lead could not be moved to that stage."),
        );
      }
    },
    [loadAll, upsertLead],
  );

  const ingestLead = useCallback(
    async (input: ApiLeadInput, options?: { createAnyway?: boolean }) => {
      setActionError(null);
      try {
        const created = await createLeadRequest(input, {
          createAnyway: options?.createAnyway,
        });
        upsertLead(created);
        setLastEvent(`Lead ingested: ${created.name}`);
      } catch (caught) {
        setActionError(errorMessage(caught, "The lead could not be created."));
      }
    },
    [upsertLead],
  );

  const convertLead = useCallback(
    async (leadId: string): Promise<ApiConvertResponse | null> => {
      setActionError(null);
      try {
        const result = await convertLeadToClient(leadId);
        upsertLead(result.lead);
        setLastEvent(`Client dossier created for ${result.lead.name}`);
        void loadAll();
        return result;
      } catch (caught) {
        setActionError(errorMessage(caught, "The lead could not be converted."));
        return null;
      }
    },
    [loadAll, upsertLead],
  );

  const completeTask = useCallback(async (taskId: string) => {
    setActionError(null);
    try {
      const updated = await completeTaskRequest(taskId);
      setRawTasks((previous) => {
        const index = previous.findIndex((item) => item._id === updated._id);
        if (index === -1) return [updated, ...previous];
        const next = [...previous];
        next[index] = updated;
        return next;
      });
      setLastEvent(`Task completed: ${updated.title}`);
    } catch (caught) {
      setActionError(errorMessage(caught, "The task could not be completed."));
    }
  }, []);

  const addTask = useCallback(async (input: ApiTaskInput) => {
    setActionError(null);
    try {
      const created = await createTaskRequest(input);
      setRawTasks((previous) => [created, ...previous]);
      setLastEvent(`Task created: ${created.title}`);
    } catch (caught) {
      setActionError(errorMessage(caught, "The task could not be created."));
    }
  }, []);

  const removeTask = useCallback(async (taskId: string) => {
    setActionError(null);
    try {
      await deleteTaskRequest(taskId);
      setRawTasks((previous) => previous.filter((item) => item._id !== taskId));
      setLastEvent("Task deleted");
    } catch (caught) {
      setActionError(errorMessage(caught, "The task could not be deleted."));
    }
  }, []);

  const saveTemplate = useCallback(async (template: EmailTemplate) => {
    setActionError(null);
    try {
      const updated = await updateTemplateRequest(template.id, {
        name: template.name,
        subject: template.subject,
        body: template.body,
        stage: toApiStage(template.triggerStage),
      });
      setRawTemplates((previous) =>
        previous.map((item) => (item._id === updated._id ? updated : item)),
      );
      setLastEvent(`Template updated: ${updated.name}`);
    } catch (caught) {
      setActionError(
        errorMessage(caught, "The email template could not be updated."),
      );
    }
  }, []);

  const addTemplate = useCallback(async (template: EmailTemplate) => {
    setActionError(null);
    try {
      const created = await createTemplateRequest({
        name: template.name,
        subject: template.subject,
        body: template.body,
        stage: toApiStage(template.triggerStage),
        active: true,
      });
      setRawTemplates((previous) => [created, ...previous]);
      setLastEvent(`Template created: ${created.name}`);
    } catch (caught) {
      setActionError(
        errorMessage(caught, "The email template could not be created."),
      );
    }
  }, []);

  const removeTemplate = useCallback(async (templateId: string) => {
    setActionError(null);
    try {
      await deleteTemplateRequest(templateId);
      setRawTemplates((previous) =>
        previous.filter((item) => item._id !== templateId),
      );
      setLastEvent("Template deleted");
    } catch (caught) {
      setActionError(
        errorMessage(caught, "The email template could not be deleted."),
      );
    }
  }, []);

  const clearActionError = useCallback(() => setActionError(null), []);
  const reportActionError = useCallback(
    (message: string) => setActionError(message),
    [],
  );

  const updateDocument = useCallback(async (document: DocumentItem) => {
    setActionError(null);
    try {
      const updated = await updateDocumentStatusRequest(
        document.id,
        toApiDocumentStatus(document.status),
      );
      setRawDocuments((previous) => {
        const index = previous.findIndex((item) => item._id === updated._id);
        if (index === -1) return [updated, ...previous];
        const next = [...previous];
        next[index] = updated;
        return next;
      });
      setLastEvent(`Document ${updated.documentType} · ${updated.status}`);
    } catch (caught) {
      setActionError(
        errorMessage(caught, "The document status could not be updated."),
      );
    }
  }, []);

  const addDocument = useCallback(
    async (input: { clientId: string; documentType: string; file: File }) => {
      setActionError(null);
      try {
        const created = await uploadDocumentRequest(input);
        setRawDocuments((previous) => [created, ...previous]);
        setLastEvent(`Upload received: ${created.filename}`);
      } catch (caught) {
        setActionError(
          errorMessage(caught, "The document could not be uploaded."),
        );
      }
    },
    [],
  );

  const value = useMemo<WorkspaceValue>(
    () => ({
      leads,
      documents,
      tasks,
      emailTemplates,
      dashboard,
      brokerage,
      advisors,
      clients,
      taskTriggers,
      isLoading,
      error,
      actionError,
      lastEvent,
      socketStatus,
      liveSyncEnabled,
      setLiveSyncEnabled,
      isEmpty,
      refresh: loadAll,
      clearActionError,
      reportActionError,
      moveLead,
      ingestLead,
      convertLead,
      completeTask,
      addTask,
      removeTask,
      saveTemplate,
      addTemplate,
      removeTemplate,
      updateDocument,
      addDocument,
    }),
    [
      leads,
      documents,
      tasks,
      emailTemplates,
      dashboard,
      brokerage,
      advisors,
      clients,
      taskTriggers,
      isLoading,
      error,
      actionError,
      lastEvent,
      socketStatus,
      liveSyncEnabled,
      isEmpty,
      loadAll,
      clearActionError,
      reportActionError,
      moveLead,
      ingestLead,
      convertLead,
      completeTask,
      addTask,
      removeTask,
      saveTemplate,
      addTemplate,
      removeTemplate,
      updateDocument,
      addDocument,
    ],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export function useWorkspace(): WorkspaceValue {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error("useWorkspace must be used inside a WorkspaceProvider.");
  }
  return context;
}





