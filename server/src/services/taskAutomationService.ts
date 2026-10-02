import { Types } from "mongoose";
import {
  buildAutomationKey,
  computeDueDate,
  rulesForStage,
} from "../config/pipelineAutomation.js";
import type { LeadStage } from "../models/Lead.js";
import { TaskModel } from "../models/Task.js";
import { emitTaskEvent } from "../sockets/index.js";
import { isTaskOverdue } from "../utils/taskOverdue.js";

export interface PipelineAutomationInput {
  leadId: Types.ObjectId;
  brokerageId: Types.ObjectId;
  stage: LeadStage;
  actorId: Types.ObjectId;
  assignedAdvisor?: Types.ObjectId | null;
  clientId?: Types.ObjectId | null;
  enteredAt?: Date;
}

function isDuplicateKeyError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: unknown }).code === 11000
  );
}

function publicTask(task: InstanceType<typeof TaskModel>) {
  return Object.fromEntries(
    Object.entries(task.toObject()).filter(([key]) => key !== "automationKey"),
  );
}

/**
 * Create the task(s) configured for a pipeline stage when a lead enters it.
 *
 * Idempotency: each rule produces a deterministic automationKey per lead. A
 * pre-check plus a unique partial index on {brokerageId, automationKey} ensure
 * the same stage event received more than once never creates duplicate tasks.
 */
export async function applyPipelineAutomation(
  input: PipelineAutomationInput,
): Promise<Array<InstanceType<typeof TaskModel>>> {
  const rules = rulesForStage(input.stage);
  if (rules.length === 0) return [];

  const enteredAt = input.enteredAt ?? new Date();
  const created: Array<InstanceType<typeof TaskModel>> = [];

  for (const rule of rules) {
    const automationKey = buildAutomationKey(
      input.leadId.toString(),
      rule.ruleId,
    );

    const alreadyExists = await TaskModel.exists({
      brokerageId: input.brokerageId,
      automationKey,
    });
    if (alreadyExists) continue;

    const dueDate = computeDueDate(enteredAt, rule.dueInDays);

    try {
      const task = await TaskModel.create({
        title: rule.title,
        leadId: input.leadId,
        clientId: input.clientId ?? null,
        assignedAdvisor: input.assignedAdvisor ?? null,
        dueDate,
        status: "Open",
        priority: rule.priority,
        overdue: isTaskOverdue({ status: "Open", dueDate }, new Date()),
        completedAt: null,
        createdBy: input.actorId,
        source: "automation",
        automationKey,
        brokerageId: input.brokerageId,
      });
      created.push(task);
      emitTaskEvent(input.brokerageId.toString(), "created", publicTask(task));
    } catch (error) {
      // A concurrent identical stage event may insert first; the unique index
      // rejects the duplicate, which we treat as an idempotent no-op.
      if (isDuplicateKeyError(error)) continue;
      throw error;
    }
  }

  return created;
}
