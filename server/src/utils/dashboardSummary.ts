import { LEAD_STAGES, type LeadStage } from "../models/Lead.js";

/**
 * Shape of a single row returned by the leads-by-stage aggregation
 * ({ $group: { _id: "$stage", count: { $sum: 1 } } }).
 */
export interface LeadStageCountRow {
  _id: string | null;
  count: number;
}

export type LeadStageCounts = Record<LeadStage, number>;

export type DashboardActivityType =
  | "lead_stage_changed"
  | "lead_converted"
  | "email_sent";

/** A recent-activity entry serialized for the dashboard API/socket payload. */
export interface RecentActivityEntry {
  id: string;
  type: DashboardActivityType | string;
  leadId: string;
  actorId: string;
  fromStage: string | null;
  toStage: string | null;
  clientId: string | null;
  createdAt: Date | null;
}

export interface DashboardSummary {
  totalLeads: number;
  leadsByStage: LeadStageCounts;
  contactedLeads: number;
  activeClients: number;
  wonLeads: number;
  lostLeads: number;
  overdueTasks: number;
  recentActivity: RecentActivityEntry[];
}

/** A fresh, fully zero-filled count for every pipeline stage. */
export function emptyStageCounts(): LeadStageCounts {
  return LEAD_STAGES.reduce((counts, stage) => {
    counts[stage] = 0;
    return counts;
  }, {} as LeadStageCounts);
}

/**
 * Fold the raw aggregation rows into a complete, zero-filled map over every
 * pipeline stage. Rows whose _id is not a known stage are ignored so a stray
 * value can never distort the dashboard.
 */
export function buildStageCounts(rows: LeadStageCountRow[]): LeadStageCounts {
  const counts = emptyStageCounts();
  for (const row of rows) {
    if (row._id !== null && row._id in counts) {
      counts[row._id as LeadStage] = row.count;
    }
  }
  return counts;
}

/** Loose shape accepted from a lean Activity document. */
export interface ActivityLike {
  _id: unknown;
  type?: unknown;
  leadId?: unknown;
  actorId?: unknown;
  fromStage?: unknown;
  toStage?: unknown;
  clientId?: unknown;
  createdAt?: unknown;
}

function toStringOrNull(value: unknown): string | null {
  return value === null || value === undefined ? null : String(value);
}

/** Project an Activity document down to the fields the dashboard exposes. */
export function serializeActivity(activity: ActivityLike): RecentActivityEntry {
  return {
    id: String(activity._id),
    type: typeof activity.type === "string" ? activity.type : "",
    leadId: String(activity.leadId),
    actorId: String(activity.actorId),
    fromStage: toStringOrNull(activity.fromStage),
    toStage: toStringOrNull(activity.toStage),
    clientId: toStringOrNull(activity.clientId),
    createdAt: activity.createdAt instanceof Date ? activity.createdAt : null,
  };
}

export interface DashboardSummaryInput {
  stageRows: LeadStageCountRow[];
  activeClients: number;
  overdueTasks: number;
  recentActivity: ActivityLike[];
}

/**
 * Assemble the full dashboard summary from already-fetched inputs. Pure and
 * DB-free so the entire response shape can be unit tested without a database:
 * total/contacted/won/lost are all derived from the single leads-by-stage
 * aggregation rather than issuing separate counts.
 */
export function assembleDashboardSummary(
  input: DashboardSummaryInput,
): DashboardSummary {
  const leadsByStage = buildStageCounts(input.stageRows);
  const totalLeads = LEAD_STAGES.reduce(
    (sum, stage) => sum + leadsByStage[stage],
    0,
  );

  return {
    totalLeads,
    leadsByStage,
    contactedLeads: leadsByStage.Contacted,
    activeClients: input.activeClients,
    wonLeads: leadsByStage.Won,
    lostLeads: leadsByStage.Lost,
    overdueTasks: input.overdueTasks,
    recentActivity: input.recentActivity.map(serializeActivity),
  };
}
