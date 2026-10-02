import { Types } from "mongoose";
import {
  TASK_PRIORITIES,
  TASK_STATUSES,
  type TaskPriority,
  type TaskStatus,
} from "../models/Task.js";

const editableFields = [
  "title",
  "leadId",
  "clientId",
  "assignedAdvisor",
  "dueDate",
  "status",
  "priority",
] as const;

type EditableField = (typeof editableFields)[number];

const serverManagedFields = [
  "brokerageId",
  "createdBy",
  "overdue",
  "completedAt",
  "source",
  "automationKey",
] as const;

export interface TaskInput {
  title: string;
  leadId: string | null;
  clientId: string | null;
  assignedAdvisor: string | null;
  dueDate: Date | null;
  status: TaskStatus;
  priority: TaskPriority;
}

export type TaskUpdate = Partial<TaskInput>;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parseObjectIdField(
  field: EditableField,
  value: unknown,
): { value: string | null } | { error: string } {
  if (value === null || value === "") return { value: null };
  if (typeof value === "string" && Types.ObjectId.isValid(value)) {
    return { value };
  }
  return { error: `${field} must be a valid ID or null.` };
}

export function parseTaskInput(
  value: unknown,
  partial: boolean,
): { update?: TaskUpdate; error?: string } {
  if (!isRecord(value)) return { error: "A JSON request body is required." };

  for (const field of serverManagedFields) {
    if (field in value) return { error: `${field} is assigned by the server.` };
  }
  const unknownField = Object.keys(value).find(
    (field) => !editableFields.includes(field as EditableField),
  );
  if (unknownField) return { error: `Unsupported field: ${unknownField}.` };

  const update: TaskUpdate = {};

  for (const field of editableFields) {
    if (!(field in value)) continue;
    const fieldValue = value[field];

    if (field === "title") {
      if (typeof fieldValue !== "string" || !fieldValue.trim()) {
        return { error: "title must be a non-empty string." };
      }
      const title = fieldValue.trim();
      if (title.length > 200) {
        return { error: "title exceeds 200 characters." };
      }
      update.title = title;
      continue;
    }

    if (
      field === "leadId" ||
      field === "clientId" ||
      field === "assignedAdvisor"
    ) {
      const parsed = parseObjectIdField(field, fieldValue);
      if ("error" in parsed) return { error: parsed.error };
      update[field] = parsed.value;
      continue;
    }

    if (field === "dueDate") {
      if (fieldValue === null || fieldValue === "") {
        update.dueDate = null;
        continue;
      }
      if (typeof fieldValue !== "string" && typeof fieldValue !== "number") {
        return { error: "dueDate must be a date string or null." };
      }
      const parsedDate = new Date(fieldValue);
      if (Number.isNaN(parsedDate.getTime())) {
        return { error: "dueDate must be a valid date." };
      }
      update.dueDate = parsedDate;
      continue;
    }

    if (field === "status") {
      if (!TASK_STATUSES.includes(fieldValue as TaskStatus)) {
        return { error: `status must be one of: ${TASK_STATUSES.join(", ")}.` };
      }
      update.status = fieldValue as TaskStatus;
      continue;
    }

    if (field === "priority") {
      if (!TASK_PRIORITIES.includes(fieldValue as TaskPriority)) {
        return {
          error: `priority must be one of: ${TASK_PRIORITIES.join(", ")}.`,
        };
      }
      update.priority = fieldValue as TaskPriority;
      continue;
    }
  }

  if (!partial && update.title === undefined) {
    return { error: "title is required." };
  }
  if (Object.keys(update).length === 0) {
    return { error: "At least one editable field is required." };
  }

  return { update };
}
