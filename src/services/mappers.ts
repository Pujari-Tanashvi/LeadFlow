import type {
  ActivityEntry,
  Brokerage,
  DashboardStats,
  DocStatus,
  DocumentItem,
  EmailTemplate,
  Lead,
  LeadTask,
  PipelineStage,
} from "../types";
import type {
  ApiDashboardSummary,
  ApiDocument,
  ApiEmailTemplate,
  ApiLead,
  ApiLeadStage,
  ApiTask,
  ApiUser,
} from "./apiTypes";

/**
 * The API models the pipeline with its own stage vocabulary. The approved UI
 * uses workspace-flavoured labels, so every stage crossing the boundary goes
 * through this single mapping table (and its inverse).
 */
export const API_STAGE_TO_UI: Record<ApiLeadStage, PipelineStage> = {
  New: "new",
  Contacted: "contacted",
  Qualified: "qualified",
  Documents: "doc_gathering",
  "In Review": "bank_underwriting",
  Won: "won",
  Lost: "lost",
};

export const UI_STAGE_TO_API: Record<PipelineStage, ApiLeadStage> = {
  new: "New",
  contacted: "Contacted",
  qualified: "Qualified",
  doc_gathering: "Documents",
  bank_underwriting: "In Review",
  // "Offer received" is a workspace alias of the API's review stage: the API
  // has no separate offer step, so both labels resolve to the same stage.
  offer_received: "In Review",
  won: "Won",
  lost: "Lost",
};

export function toUiStage(stage: string | null | undefined): PipelineStage {
  if (!stage) return "new";
  return API_STAGE_TO_UI[stage as ApiLeadStage] ?? "new";
}

export function toApiStage(stage: PipelineStage): ApiLeadStage {
  return UI_STAGE_TO_API[stage] ?? "New";
}

const EMPTY_VALUE = "—";

function text(value: string | null | undefined, fallback = EMPTY_VALUE): string {
  const trimmed = typeof value === "string" ? value.trim() : "";
  return trimmed ? trimmed : fallback;
}

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function describeDuration(ms: number): string {
  if (ms < MINUTE) return "less than a minute";
  if (ms < HOUR) {
    const minutes = Math.round(ms / MINUTE);
    return `${minutes} min${minutes === 1 ? "" : "s"}`;
  }
  if (ms < DAY) {
    const hours = Math.round(ms / HOUR);
    return `${hours} hour${hours === 1 ? "" : "s"}`;
  }
  const days = Math.round(ms / DAY);
  return `${days} day${days === 1 ? "" : "s"}`;
}

/** "5 mins ago" / "Just now" — the relative labels the UI already prints. */
export function relativeTime(
  value: string | null | undefined,
  fallback = EMPTY_VALUE,
): string {
  if (!value) return fallback;
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return fallback;

  const delta = Date.now() - timestamp;
  if (delta < MINUTE) return "Just now";
  return `${describeDuration(delta)} ago`;
}

/** "Overdue by 25 mins" / "Due in 2 hours" / "No due date". */
export function dueLabel(dueDate: string | null | undefined): string {
  if (!dueDate) return "No due date";
  const timestamp = new Date(dueDate).getTime();
  if (Number.isNaN(timestamp)) return "No due date";

  const delta = timestamp - Date.now();
  const duration = describeDuration(Math.abs(delta));
  return delta < 0 ? `Overdue by ${duration}` : `Due in ${duration}`;
}

const DOCUMENT_STATUS_TO_UI: Record<ApiDocument["status"], DocStatus> = {
  Pending: "not_uploaded",
  Uploading: "uploading",
  Processing: "analyzing",
  "In Review": "analyzing",
  Verified: "approved",
  Failed: "action_needed",
};

const DOCUMENT_STATUS_PROGRESS: Record<ApiDocument["status"], number> = {
  Pending: 0,
  Uploading: 20,
  Processing: 60,
  "In Review": 80,
  Verified: 100,
  Failed: 40,
};

export function toDocumentStatus(status: ApiDocument["status"]): DocStatus {
  return DOCUMENT_STATUS_TO_UI[status] ?? "analyzing";
}

const UI_STATUS_TO_API: Record<DocStatus, ApiDocument["status"]> = {
  not_uploaded: "Pending",
  uploading: "Uploading",
  analyzing: "Processing",
  approved: "Verified",
  action_needed: "Failed",
};

/** Inverse of {@link toDocumentStatus} for status changes made in the UI. */
export function toApiDocumentStatus(status: DocStatus): ApiDocument["status"] {
  return UI_STATUS_TO_API[status] ?? "Processing";
}

export function documentProgress(status: ApiDocument["status"]): number {
  return DOCUMENT_STATUS_PROGRESS[status] ?? 0;
}

/** Map the free-form document type onto the UI's fixed category list. */
export function toDocumentCategory(
  documentType: string,
): DocumentItem["category"] {
  const value = documentType.trim().toLowerCase();
  const categories: DocumentItem["category"][] = [
    "Income Proof",
    "Identification",
    "Banking",
    "Credit Rating",
    "Property",
  ];
  const exact = categories.find(
    (category) => category.toLowerCase() === value,
  );
  if (exact) return exact;

  if (/passport|permit|visa|identity|id card|residence/.test(value)) {
    return "Identification";
  }
  if (/payslip|salary|income|employment|paysheet/.test(value)) {
    return "Income Proof";
  }
  if (/credit|schufa|rating/.test(value)) return "Credit Rating";
  if (/bank|account|statement/.test(value)) return "Banking";
  return "Property";
}

export function mapLead(lead: ApiLead): Lead {
  return {
    id: lead._id,
    brokerageId: lead.brokerageId,
    name: text(lead.name),
    email: text(lead.email),
    phone: text(lead.phone),
    nationality: text(lead.nationality),
    targetCity: text(lead.targetCity),
    loanAmountEur: lead.loanAmount ?? 0,
    propertyPriceEur: lead.propertyPriceEur ?? 0,
    employmentStatus: text(lead.employmentStatus),
    source: text(lead.source),
    stage: toUiStage(lead.stage),
    assignedAdvisorId: lead.assignedAdvisor ?? "",
    createdAt: relativeTime(lead.createdAt),
    updatedAt: relativeTime(lead.updatedAt),
    isClient: Boolean(lead.convertedClientId),
    clientId: lead.convertedClientId ?? null,
    notesCount: 0,
  };
}

export function mapDocument(document: ApiDocument): DocumentItem {
  return {
    id: document._id,
    // Documents belong to a client dossier. The workspace keys them by the
    // owning client so the dossier and the document hub always agree.
    leadId: document.clientId,
    brokerageId: document.brokerageId,
    name: text(document.documentType),
    category: toDocumentCategory(document.documentType),
    fileName: text(document.filename, ""),
    uploadedAt: relativeTime(document.createdAt),
    status: toDocumentStatus(document.status),
    progress: documentProgress(document.status),
    flagReason: document.failureReason ?? undefined,
    required: true,
  };
}

export interface TaskMappingContext {
  leadNames: Map<string, string>;
  leadStages: Map<string, PipelineStage>;
  advisorNames: Map<string, string>;
}

export function mapTask(task: ApiTask, context: TaskMappingContext): LeadTask {
  const leadStage = task.leadId
    ? context.leadStages.get(task.leadId)
    : undefined;
  return {
    id: task._id,
    leadId: task.leadId ?? "",
    leadName: task.leadId
      ? (context.leadNames.get(task.leadId) ?? EMPTY_VALUE)
      : "Brokerage task",
    brokerageId: task.brokerageId,
    title: text(task.title),
    stage: leadStage ?? "new",
    assignedToAdvisor: task.assignedAdvisor
      ? (context.advisorNames.get(task.assignedAdvisor) ??
        advisorFallbackLabel(task.assignedAdvisor))
      : "Unassigned",
    dueAt: dueLabel(task.dueDate),
    isOverdue: task.overdue,
    isCompleted: task.status === "Completed",
  };
}

/** Advisor ids are opaque on the wire; show a stable short handle. */
export function advisorFallbackLabel(advisorId: string): string {
  return `Advisor ${advisorId.slice(-4).toUpperCase()}`;
}

/**
 * Build the advisor directory from data the API actually returns: the
 * assignment ids present on the tenant's leads plus the signed-in user.
 */
export function buildAdvisorNames(
  leads: Lead[],
  currentUser: ApiUser | null,
): Map<string, string> {
  const names = new Map<string, string>();
  if (currentUser) names.set(currentUser.id, currentUser.fullName);
  for (const lead of leads) {
    const id = lead.assignedAdvisorId;
    if (!id || names.has(id)) continue;
    names.set(id, advisorFallbackLabel(id));
  }
  return names;
}

export function buildTaskContext(
  leads: Lead[],
  currentUser: ApiUser | null = null,
): TaskMappingContext {
  const leadNames = new Map<string, string>();
  const leadStages = new Map<string, PipelineStage>();
  for (const lead of leads) {
    leadNames.set(lead.id, lead.name);
    leadStages.set(lead.id, lead.stage);
  }
  return {
    leadNames,
    leadStages,
    advisorNames: buildAdvisorNames(leads, currentUser),
  };
}

const PLACEHOLDER_PATTERN = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;

export const SUPPORTED_PLACEHOLDERS = [
  "{{client_name}}",
  "{{advisor_name}}",
  "{{brokerage_name}}",
] as const;

/** Placeholders actually used by a template, in order of first appearance. */
export function extractPlaceholders(subject: string, body: string): string[] {
  const found: string[] = [];
  for (const match of `${subject} ${body}`.matchAll(PLACEHOLDER_PATTERN)) {
    const token = match[1];
    if (token) found.push(`{{${token}}}`);
  }
  return found.length > 0 ? found : [...SUPPORTED_PLACEHOLDERS];
}

export function mapEmailTemplate(template: ApiEmailTemplate): EmailTemplate {
  return {
    id: template._id,
    brokerageId: template.brokerageId,
    name: text(template.name),
    triggerStage: toUiStage(template.stage),
    subject: template.subject ?? "",
    body: template.body ?? "",
    availablePlaceholders: extractPlaceholders(
      template.subject ?? "",
      template.body ?? "",
    ),
  };
}

export function mapDashboard(summary: ApiDashboardSummary): DashboardStats {
  const leadsByStage = {
    new: 0,
    contacted: 0,
    qualified: 0,
    doc_gathering: 0,
    bank_underwriting: 0,
    offer_received: 0,
    won: 0,
    lost: 0,
  } as Record<PipelineStage, number>;

  for (const [stage, count] of Object.entries(summary.leadsByStage ?? {})) {
    const uiStage = toUiStage(stage);
    leadsByStage[uiStage] = (leadsByStage[uiStage] ?? 0) + count;
  }

  return {
    totalLeads: summary.totalLeads ?? 0,
    leadsByStage,
    contactedLeads: summary.contactedLeads ?? 0,
    activeClients: summary.activeClients ?? 0,
    wonLeads: summary.wonLeads ?? 0,
    lostLeads: summary.lostLeads ?? 0,
    overdueTasks: summary.overdueTasks ?? 0,
    recentActivity: (summary.recentActivity ?? []).map(toActivityEntry),
  };
}

function toActivityEntry(entry: {
  id: string;
  type: string;
  leadId: string;
  actorId: string;
  fromStage: string | null;
  toStage: string | null;
  clientId: string | null;
  createdAt: string | null;
}): ActivityEntry {
  return {
    id: entry.id,
    type: text(entry.type, "activity"),
    leadId: entry.leadId,
    actorId: entry.actorId,
    fromStage: entry.fromStage,
    toStage: entry.toStage,
    clientId: entry.clientId,
    createdAt: entry.createdAt,
  };
}

function initialsFor(name: string): string {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) return "LF";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

/**
 * The workspace is always scoped to the brokerage of the signed-in account, so
 * the tenant object is derived from the authenticated identity instead of a
 * client-side list of brokerages.
 */
export function mapBrokerage(
  user: ApiUser | null,
  stats?: DashboardStats | null,
): Brokerage {
  const name = text(user?.brokerage?.name, "Your brokerage");
  return {
    id: user?.brokerageId ?? "",
    name,
    city: "",
    licenseNumber: "",
    activeAdvisors: 0,
    totalLeads: stats?.totalLeads ?? 0,
    monthlyVolumeEur: 0,
    logoInitials: initialsFor(name),
    color: "#0284C7",
  };
}

/** Leads that have been converted into client dossiers. */
export function clientLeads(leads: Lead[]): Lead[] {
  return leads.filter((lead) => lead.isClient && lead.clientId);
}



