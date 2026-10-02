import type { LeadStage } from "../models/Lead.js";
import type { TaskPriority } from "../models/Task.js";

export interface PipelineAutomationRule {
  /** Stable identifier used to build the per-lead dedup key. */
  ruleId: string;
  /** Pipeline stage whose entry triggers the rule. */
  stage: LeadStage;
  /** Title of the task that gets created. */
  title: string;
  /** Priority assigned to the generated task. */
  priority: TaskPriority;
  /** Number of days from stage entry used to compute the due date. */
  dueInDays: number;
}

/**
 * Configured pipeline automations. When a lead enters one of these stages the
 * matching task(s) are created, assigned to the lead's advisor, with a due date
 * computed from the stage-entry time. Stages without a rule (e.g. New, Lost)
 * intentionally create no tasks.
 */
export const PIPELINE_AUTOMATION_RULES: readonly PipelineAutomationRule[] = [
  {
    ruleId: "contacted-qualification-call",
    stage: "Contacted",
    title: "Complete initial qualification call",
    priority: "High",
    dueInDays: 1,
  },
  {
    ruleId: "qualified-request-documents",
    stage: "Qualified",
    title: "Send document request to borrower",
    priority: "High",
    dueInDays: 2,
  },
  {
    ruleId: "documents-review-submission",
    stage: "Documents",
    title: "Review submitted borrower documents",
    priority: "Medium",
    dueInDays: 3,
  },
  {
    ruleId: "in-review-underwriting-followup",
    stage: "In Review",
    title: "Follow up on underwriting review",
    priority: "Medium",
    dueInDays: 2,
  },
  {
    ruleId: "won-schedule-closing",
    stage: "Won",
    title: "Schedule closing and client onboarding",
    priority: "High",
    dueInDays: 3,
  },
] as const;

export function rulesForStage(
  stage: LeadStage,
): readonly PipelineAutomationRule[] {
  return PIPELINE_AUTOMATION_RULES.filter((rule) => rule.stage === stage);
}

/** Deterministic dedup key so the same stage event never duplicates a task. */
export function buildAutomationKey(
  leadId: string,
  ruleId: string,
): string {
  return `${leadId}:${ruleId}`;
}

export function computeDueDate(enteredAt: Date, dueInDays: number): Date {
  return new Date(enteredAt.getTime() + dueInDays * 24 * 60 * 60 * 1000);
}
