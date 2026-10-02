export type UserRole = 'advisor' | 'brokerage_admin' | 'platform_admin' | 'client';

export type PipelineStage = 
  | 'new'
  | 'contacted'
  | 'qualified'
  | 'doc_gathering'
  | 'bank_underwriting'
  | 'offer_received'
  | 'won'
  | 'lost';

export interface Brokerage {
  id: string;
  name: string;
  city: string;
  licenseNumber: string;
  activeAdvisors: number;
  totalLeads: number;
  monthlyVolumeEur: number;
  logoInitials: string;
  color: string;
}

export interface Advisor {
  id: string;
  brokerageId: string;
  name: string;
  email: string;
  avatar: string;
  role: string;
  activeCases: number;
}

export interface Lead {
  id: string;
  brokerageId: string;
  name: string;
  email: string;
  phone: string;
  nationality: string;
  targetCity: string;
  loanAmountEur: number;
  propertyPriceEur: number;
  employmentStatus: string;
  /** Required by the API when a lead is created. */
  propertyType?: string;
  source: string;
  stage: PipelineStage;
  assignedAdvisorId: string;
  createdAt: string;
  updatedAt: string;
  isClient: boolean;
  /** Set once the lead has been converted into a client dossier. */
  clientId?: string | null;
  duplicateInfo?: {
    isDuplicate: boolean;
    previousLeadId: string;
    reason: string;
  };
  notesCount: number;
}

export type DocStatus = 'not_uploaded' | 'uploading' | 'analyzing' | 'approved' | 'action_needed';

export interface DocumentItem {
  id: string;
  leadId: string;
  brokerageId: string;
  name: string;
  category: 'Income Proof' | 'Identification' | 'Banking' | 'Credit Rating' | 'Property';
  fileName?: string;
  fileSize?: string;
  uploadedAt?: string;
  status: DocStatus;
  progress: number;
  flagReason?: string;
  required: boolean;
}

export interface TaskTrigger {
  id: string;
  brokerageId: string;
  stage: PipelineStage;
  title: string;
  slaHours: number;
  assigneeRole: 'advisor' | 'brokerage_admin';
}

export interface LeadTask {
  id: string;
  leadId: string;
  leadName: string;
  brokerageId: string;
  title: string;
  stage: PipelineStage;
  assignedToAdvisor: string;
  dueAt: string;
  isOverdue: boolean;
  isCompleted: boolean;
}

export interface EmailTemplate {
  id: string;
  brokerageId: string;
  name: string;
  triggerStage: PipelineStage;
  subject: string;
  body: string;
  availablePlaceholders: string[];
}

export interface DesignShowcaseItem {
  id: string;
  title: string;
  subtitle: string;
  imagePath: string;
  aspectRatio: string;
  description: string;
  designNotes: string[];
  visualEffects: string[];
}

/** One entry of the brokerage activity feed returned by the dashboard API. */
export type WorkspaceTab =
  | 'showcase'
  | 'pipeline'
  | 'documents'
  | 'analytics'
  | 'automations'
  | 'client_portal';

/** Every workspace destination in the primary navigation. */
export const WORKSPACE_TABS: readonly WorkspaceTab[] = [
  'showcase',
  'pipeline',
  'documents',
  'analytics',
  'automations',
  'client_portal',
];

/**
 * Tabs a role may open. A client only ever reaches its own portal; brokerage
 * staff get the full workspace.
 */
export function tabsForRole(role: UserRole): WorkspaceTab[] {
  switch (role) {
    case 'client':
      return ['client_portal'];
    case 'advisor':
    case 'brokerage_admin':
      return [...WORKSPACE_TABS];
    case 'platform_admin':
      return ['showcase'];
    default:
      return ['showcase'];
  }
}

export interface ActivityEntry {
  id: string;
  type: string;
  leadId: string;
  actorId: string;
  fromStage: string | null;
  toStage: string | null;
  clientId: string | null;
  createdAt: string | null;
}

/** Brokerage-scoped statistics served by GET /api/dashboard. */
export interface DashboardStats {
  totalLeads: number;
  leadsByStage: Record<PipelineStage, number>;
  contactedLeads: number;
  activeClients: number;
  wonLeads: number;
  lostLeads: number;
  overdueTasks: number;
  recentActivity: ActivityEntry[];
}
