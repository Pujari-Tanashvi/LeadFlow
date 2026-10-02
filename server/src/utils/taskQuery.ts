import { Types } from "mongoose";
import type {
  TaskPriority,
  TaskStatus,
} from "../models/Task.js";
import type { AuthContext } from "../types/auth.js";
import { escapeRegex } from "./leadQuery.js";

export interface TaskListFilters {
  brokerageId: Types.ObjectId;
  status?: TaskStatus;
  priority?: TaskPriority;
  assignedAdvisor?: Types.ObjectId;
  leadId?: Types.ObjectId;
  clientId?: Types.ObjectId;
  overdue?: boolean;
  search?: string;
}

export function getTaskTenantId(
  auth: Pick<AuthContext, "brokerageId">,
): Types.ObjectId {
  if (!auth.brokerageId || !Types.ObjectId.isValid(auth.brokerageId)) {
    throw new Error("A valid brokerage account is required for task access.");
  }

  return new Types.ObjectId(auth.brokerageId);
}

export function buildTaskListFilter(filters: TaskListFilters) {
  const query: {
    brokerageId: Types.ObjectId;
    status?: TaskStatus;
    priority?: TaskPriority;
    assignedAdvisor?: Types.ObjectId;
    leadId?: Types.ObjectId;
    clientId?: Types.ObjectId;
    overdue?: boolean;
    $or?: Array<Record<string, RegExp>>;
  } = { brokerageId: filters.brokerageId };

  if (filters.status) query.status = filters.status;
  if (filters.priority) query.priority = filters.priority;
  if (filters.assignedAdvisor) query.assignedAdvisor = filters.assignedAdvisor;
  if (filters.leadId) query.leadId = filters.leadId;
  if (filters.clientId) query.clientId = filters.clientId;
  if (filters.overdue !== undefined) query.overdue = filters.overdue;
  if (filters.search) {
    const matcher = new RegExp(escapeRegex(filters.search), "i");
    query.$or = [{ title: matcher }];
  }

  return query;
}
