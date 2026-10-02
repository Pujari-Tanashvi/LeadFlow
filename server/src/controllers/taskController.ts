import type { RequestHandler } from "express";
import { Types } from "mongoose";
import { ClientModel } from "../models/Client.js";
import { LeadModel } from "../models/Lead.js";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  TaskModel,
  type TaskPriority,
  type TaskStatus,
} from "../models/Task.js";
import { UserModel } from "../models/User.js";
import { emitTaskEvent } from "../sockets/index.js";
import { isTaskOverdue } from "../utils/taskOverdue.js";
import { parseTaskInput } from "../utils/taskInput.js";
import { buildTaskListFilter, getTaskTenantId } from "../utils/taskQuery.js";

function getTaskId(value: string): Types.ObjectId | null {
  return Types.ObjectId.isValid(value) && /^[a-f\d]{24}$/i.test(value)
    ? new Types.ObjectId(value)
    : null;
}

function sendInvalidTaskId(response: Parameters<RequestHandler>[1]): void {
  response.status(400).json({ error: "Task ID must be a valid MongoDB ID." });
}

function publicTask(task: InstanceType<typeof TaskModel>) {
  return Object.fromEntries(
    Object.entries(task.toObject()).filter(([key]) => key !== "automationKey"),
  );
}

async function advisorInBrokerage(
  advisorId: string,
  brokerageId: Types.ObjectId,
): Promise<boolean> {
  return Boolean(
    await UserModel.exists({
      _id: advisorId,
      brokerageId,
      role: "advisor",
    }),
  );
}

async function leadInBrokerage(
  leadId: string,
  brokerageId: Types.ObjectId,
): Promise<boolean> {
  return Boolean(await LeadModel.exists({ _id: leadId, brokerageId }));
}

async function clientInBrokerage(
  clientId: string,
  brokerageId: Types.ObjectId,
): Promise<boolean> {
  return Boolean(await ClientModel.exists({ _id: clientId, brokerageId }));
}

/**
 * Validate that any referenced advisor, lead, or client belongs to the caller's
 * brokerage. Returns an error message when a reference is invalid.
 */
async function validateReferences(
  update: { assignedAdvisor?: string | null; leadId?: string | null; clientId?: string | null },
  brokerageId: Types.ObjectId,
): Promise<string | null> {
  if (
    update.assignedAdvisor != null &&
    !(await advisorInBrokerage(update.assignedAdvisor, brokerageId))
  ) {
    return "assignedAdvisor must be an advisor in your brokerage.";
  }
  if (
    update.leadId != null &&
    !(await leadInBrokerage(update.leadId, brokerageId))
  ) {
    return "leadId must reference a lead in your brokerage.";
  }
  if (
    update.clientId != null &&
    !(await clientInBrokerage(update.clientId, brokerageId))
  ) {
    return "clientId must reference a client in your brokerage.";
  }
  return null;
}

function lifecycleFields(
  status: TaskStatus,
  dueDate: Date | null,
  existingCompletedAt: Date | null,
  now: Date,
): { completedAt: Date | null; overdue: boolean } {
  return {
    completedAt: status === "Completed" ? (existingCompletedAt ?? now) : null,
    overdue: isTaskOverdue({ status, dueDate }, now),
  };
}

export const listTasks: RequestHandler = async (request, response, next) => {
  try {
    const brokerageId = getTaskTenantId(request.auth!);

    const rawStatus = request.query.status;
    if (
      typeof rawStatus === "string" &&
      !TASK_STATUSES.includes(rawStatus as TaskStatus)
    ) {
      response
        .status(400)
        .json({ error: `status must be one of: ${TASK_STATUSES.join(", ")}.` });
      return;
    }

    const rawPriority = request.query.priority;
    if (
      typeof rawPriority === "string" &&
      !TASK_PRIORITIES.includes(rawPriority as TaskPriority)
    ) {
      response.status(400).json({
        error: `priority must be one of: ${TASK_PRIORITIES.join(", ")}.`,
      });
      return;
    }

    if (
      request.query.advisor !== undefined &&
      request.query.assignedAdvisor !== undefined
    ) {
      response
        .status(400)
        .json({ error: "Use either advisor or assignedAdvisor, not both." });
      return;
    }
    const rawAdvisor = request.query.advisor ?? request.query.assignedAdvisor;
    if (
      rawAdvisor !== undefined &&
      (typeof rawAdvisor !== "string" || !getTaskId(rawAdvisor))
    ) {
      response.status(400).json({ error: "advisor must be a valid user ID." });
      return;
    }
    if (
      typeof rawAdvisor === "string" &&
      !(await advisorInBrokerage(rawAdvisor, brokerageId))
    ) {
      response
        .status(400)
        .json({ error: "advisor must belong to your brokerage." });
      return;
    }

    const rawLeadId = request.query.leadId;
    if (
      rawLeadId !== undefined &&
      (typeof rawLeadId !== "string" || !getTaskId(rawLeadId))
    ) {
      response.status(400).json({ error: "leadId must be a valid MongoDB ID." });
      return;
    }

    const rawClientId = request.query.clientId;
    if (
      rawClientId !== undefined &&
      (typeof rawClientId !== "string" || !getTaskId(rawClientId))
    ) {
      response
        .status(400)
        .json({ error: "clientId must be a valid MongoDB ID." });
      return;
    }

    const rawOverdue = request.query.overdue;
    if (
      rawOverdue !== undefined &&
      rawOverdue !== "true" &&
      rawOverdue !== "false"
    ) {
      response.status(400).json({ error: "overdue must be true or false." });
      return;
    }

    const rawSearch = request.query.search;
    if (rawSearch !== undefined && typeof rawSearch !== "string") {
      response.status(400).json({ error: "search must be a string." });
      return;
    }

    const page =
      request.query.page === undefined ? 1 : Number(request.query.page);
    const limit =
      request.query.limit === undefined ? 20 : Number(request.query.limit);
    if (
      !Number.isInteger(page) ||
      page < 1 ||
      !Number.isInteger(limit) ||
      limit < 1 ||
      limit > 100
    ) {
      response.status(400).json({
        error: "page must be positive and limit must be between 1 and 100.",
      });
      return;
    }

    const filter = buildTaskListFilter({
      brokerageId,
      status: typeof rawStatus === "string" ? (rawStatus as TaskStatus) : undefined,
      priority:
        typeof rawPriority === "string"
          ? (rawPriority as TaskPriority)
          : undefined,
      assignedAdvisor:
        typeof rawAdvisor === "string"
          ? new Types.ObjectId(rawAdvisor)
          : undefined,
      leadId:
        typeof rawLeadId === "string"
          ? new Types.ObjectId(rawLeadId)
          : undefined,
      clientId:
        typeof rawClientId === "string"
          ? new Types.ObjectId(rawClientId)
          : undefined,
      overdue: rawOverdue === undefined ? undefined : rawOverdue === "true",
      search:
        typeof rawSearch === "string" && rawSearch.trim()
          ? rawSearch.trim()
          : undefined,
    });

    const [tasks, total] = await Promise.all([
      TaskModel.find(filter)
        .sort({ dueDate: 1, createdAt: -1, _id: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .exec(),
      TaskModel.countDocuments(filter).exec(),
    ]);

    response.status(200).json({
      tasks,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

export const createTask: RequestHandler = async (request, response, next) => {
  try {
    const brokerageId = getTaskTenantId(request.auth!);
    const parsed = parseTaskInput(request.body, false);
    if (parsed.error || !parsed.update) {
      response.status(400).json({ error: parsed.error ?? "Invalid task." });
      return;
    }

    const referenceError = await validateReferences(parsed.update, brokerageId);
    if (referenceError) {
      response.status(400).json({ error: referenceError });
      return;
    }

    const now = new Date();
    const status = parsed.update.status ?? "Open";
    const dueDate = parsed.update.dueDate ?? null;
    const lifecycle = lifecycleFields(status, dueDate, null, now);

    const task = await TaskModel.create({
      title: parsed.update.title,
      leadId: parsed.update.leadId ?? null,
      clientId: parsed.update.clientId ?? null,
      assignedAdvisor: parsed.update.assignedAdvisor ?? null,
      dueDate,
      status,
      priority: parsed.update.priority ?? "Medium",
      createdBy: new Types.ObjectId(request.auth!.userId),
      source: "manual",
      brokerageId,
      ...lifecycle,
    });

    const payload = publicTask(task);
    emitTaskEvent(brokerageId.toString(), "created", payload);
    response.status(201).json({ task: payload });
  } catch (error) {
    next(error);
  }
};

export const getTask: RequestHandler = async (request, response, next) => {
  const taskId = getTaskId(request.params.id);
  if (!taskId) return sendInvalidTaskId(response);

  try {
    const task = await TaskModel.findOne({
      _id: taskId,
      brokerageId: getTaskTenantId(request.auth!),
    }).exec();
    if (!task) {
      response.status(404).json({ error: "Task not found." });
      return;
    }
    response.status(200).json({ task: publicTask(task) });
  } catch (error) {
    next(error);
  }
};

export const updateTask: RequestHandler = async (request, response, next) => {
  const taskId = getTaskId(request.params.id);
  if (!taskId) return sendInvalidTaskId(response);

  const parsed = parseTaskInput(request.body, true);
  if (parsed.error || !parsed.update) {
    response.status(400).json({ error: parsed.error ?? "Invalid task update." });
    return;
  }

  try {
    const brokerageId = getTaskTenantId(request.auth!);
    const referenceError = await validateReferences(parsed.update, brokerageId);
    if (referenceError) {
      response.status(400).json({ error: referenceError });
      return;
    }

    const existing = await TaskModel.findOne({
      _id: taskId,
      brokerageId,
    }).exec();
    if (!existing) {
      response.status(404).json({ error: "Task not found." });
      return;
    }

    const now = new Date();
    const status: TaskStatus =
      parsed.update.status ?? (existing.status as TaskStatus);
    const dueDate: Date | null =
      "dueDate" in parsed.update
        ? parsed.update.dueDate ?? null
        : existing.dueDate ?? null;
    const lifecycle = lifecycleFields(
      status,
      dueDate,
      existing.completedAt ?? null,
      now,
    );

    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, brokerageId },
      { $set: { ...parsed.update, ...lifecycle } },
      { new: true, runValidators: true },
    ).exec();
    if (!task) {
      response.status(404).json({ error: "Task not found." });
      return;
    }

    const payload = publicTask(task);
    emitTaskEvent(brokerageId.toString(), "updated", payload);
    response.status(200).json({ task: payload });
  } catch (error) {
    next(error);
  }
};

export const completeTask: RequestHandler = async (request, response, next) => {
  const taskId = getTaskId(request.params.id);
  if (!taskId) return sendInvalidTaskId(response);

  try {
    const brokerageId = getTaskTenantId(request.auth!);
    const task = await TaskModel.findOneAndUpdate(
      { _id: taskId, brokerageId },
      { $set: { status: "Completed", completedAt: new Date(), overdue: false } },
      { new: true, runValidators: true },
    ).exec();
    if (!task) {
      response.status(404).json({ error: "Task not found." });
      return;
    }

    const payload = publicTask(task);
    emitTaskEvent(brokerageId.toString(), "updated", payload);
    response.status(200).json({ task: payload });
  } catch (error) {
    next(error);
  }
};

export const deleteTask: RequestHandler = async (request, response, next) => {
  const taskId = getTaskId(request.params.id);
  if (!taskId) return sendInvalidTaskId(response);

  try {
    const brokerageId = getTaskTenantId(request.auth!);
    const task = await TaskModel.findOneAndDelete({
      _id: taskId,
      brokerageId,
    }).exec();
    if (!task) {
      response.status(404).json({ error: "Task not found." });
      return;
    }
    emitTaskEvent(brokerageId.toString(), "deleted", { _id: taskId });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
};
