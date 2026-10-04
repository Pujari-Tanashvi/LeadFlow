/**
 * Wire types returned by the LeadFlow API. They mirror the Express
 * controllers exactly; the UI never consumes them directly — `mappers.ts`
 * converts them into the shapes the approved components already expect.
 */

export type ApiUserRole =
  | "platform_admin"
  | "brokerage_admin"
  | "advisor"
  | "client";

export interface ApiBrokerageRef {
  id: string;
  name: string;
}

export interface ApiUser {
  id: string;
  email: string;
  fullName: string;
  role: ApiUserRole;
  brokerageId: string | null;
  brokerage: ApiBrokerageRef | null;
  /** Present for client accounts: the id of the client's own dossier. */
  clientId?: string | null;
}

export interface ApiAuthResponse {
  token: string;
  user: ApiUser;
}

export interface ApiPagination {
  page: number;
  limit: number;
  total: number;
  pages: number;
}

export const API_LEAD_STAGES = [
  "New",
  "Contacted",
  "Qualified",
  "Documents",
  "In Review",
  "Won",
  "Lost",
] as const;

export type ApiLeadStage = (typeof API_LEAD_STAGES)[number];

export interface ApiLead {
  _id: string;
  name: string;
  email: string;
  phone: string;
  source: string;
  propertyType: string;
  nationality: string;
  targetCity: string;
  employmentStatus: string;
  propertyPriceEur: number | null;
  loanAmount: number;
  assignedAdvisor: string | null;
  convertedClientId: string | null;
  convertedAt: string | null;
  stage: ApiLeadStage;
  brokerageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiLeadListResponse {
  leads: ApiLead[];
  pagination: ApiPagination;
}

export interface ApiLeadResponse {
  lead: ApiLead;
}

export interface ApiDuplicateMatch {
  lead: ApiLead;
  reasons?: string[];
  score?: number;
}

export interface ApiDuplicateResponse {
  duplicate: boolean;
  error: string;
  matches: ApiDuplicateMatch[];
  actions: string[];
}

export interface ApiClient {
  _id: string;
  userId: string;
  brokerageId: string;
  email: string;
  fullName: string;
  phone: string;
  advisorIds: string[];
  leadIds: string[];
  createdAt: string;
  updatedAt: string;
}

export interface ApiConvertResponse {
  client: ApiClient;
  user: { id: string; email: string; role: "client" };
  lead: ApiLead;
  activation: { token: string; expiresAt: string } | null;
  reusedExistingClient: boolean;
}

export const API_DOCUMENT_STATUSES = [
  "Pending",
  "Uploading",
  "Processing",
  "In Review",
  "Verified",
  "Failed",
] as const;

export type ApiDocumentStatus = (typeof API_DOCUMENT_STATUSES)[number];

export interface ApiDocument {
  _id: string;
  clientId: string;
  uploadedBy: string;
  filename: string;
  fileUrl: string;
  documentType: string;
  status: ApiDocumentStatus;
  verificationResult: unknown;
  failureReason: string | null;
  processingStartedAt: string | null;
  reviewStartedAt: string | null;
  verificationCompletedAt: string | null;
  brokerageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiDocumentListResponse {
  documents: ApiDocument[];
}

export interface ApiDocumentResponse {
  document: ApiDocument;
}

export const API_TASK_STATUSES = [
  "Open",
  "In Progress",
  "Completed",
  "Cancelled",
] as const;

export type ApiTaskStatus = (typeof API_TASK_STATUSES)[number];

export const API_TASK_PRIORITIES = [
  "Low",
  "Medium",
  "High",
  "Urgent",
] as const;

export type ApiTaskPriority = (typeof API_TASK_PRIORITIES)[number];

export interface ApiTask {
  _id: string;
  title: string;
  leadId: string | null;
  clientId: string | null;
  assignedAdvisor: string | null;
  dueDate: string | null;
  status: ApiTaskStatus;
  priority: ApiTaskPriority;
  overdue: boolean;
  completedAt: string | null;
  createdBy: string;
  source: "manual" | "automation";
  brokerageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiTaskListResponse {
  tasks: ApiTask[];
  pagination: ApiPagination;
}

export interface ApiTaskResponse {
  task: ApiTask;
}

export interface ApiEmailTemplate {
  _id: string;
  name: string;
  subject: string;
  body: string;
  stage: ApiLeadStage;
  active: boolean;
  brokerageId: string;
  createdAt: string;
  updatedAt: string;
}

export interface ApiEmailTemplateListResponse {
  templates: ApiEmailTemplate[];
  pagination: ApiPagination;
}

export interface ApiEmailTemplateResponse {
  template: ApiEmailTemplate;
}

export interface ApiActivityEntry {
  id: string;
  type: string;
  leadId: string;
  actorId: string;
  fromStage: string | null;
  toStage: string | null;
  clientId: string | null;
  createdAt: string | null;
}

export interface ApiDashboardSummary {
  totalLeads: number;
  leadsByStage: Record<ApiLeadStage, number>;
  contactedLeads: number;
  activeClients: number;
  wonLeads: number;
  lostLeads: number;
  overdueTasks: number;
  recentActivity: ApiActivityEntry[];
}

/** Payload used to create or update a lead. */
export interface ApiLeadInput {
  name: string;
  email: string;
  phone: string;
  source: string;
  propertyType: string;
  nationality?: string;
  targetCity?: string;
  employmentStatus?: string;
  propertyPriceEur?: number | null;
  loanAmount: number;
  assignedAdvisor?: string | null;
  stage?: ApiLeadStage;
}

/** Payload used to create or update a task. */
export interface ApiTaskInput {
  title: string;
  leadId?: string | null;
  clientId?: string | null;
  assignedAdvisor?: string | null;
  dueDate?: string | null;
  status?: ApiTaskStatus;
  priority?: ApiTaskPriority;
}

/** Payload used to create or update an email template. */
export interface ApiEmailTemplateInput {
  name: string;
  subject: string;
  body: string;
  stage: ApiLeadStage;
  active?: boolean;
}
