export type UserRole = 'advisor' | 'brokerage_admin' | 'platform_admin' | 'client';

export type PipelineStage = 
  | 'new'
  | 'contacted'
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
  employmentStatus: 'Employed (Permanent)' | 'Self-Employed' | 'Blue Card Holder' | 'Civil Servant';
  source: 'Typeform Web Form' | 'Meta Expat Ads' | 'Partner Expatica' | 'Direct Calendly';
  stage: PipelineStage;
  assignedAdvisorId: string;
  createdAt: string;
  updatedAt: string;
  isClient: boolean;
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
