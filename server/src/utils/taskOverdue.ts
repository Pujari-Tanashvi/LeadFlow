import { ACTIVE_TASK_STATUSES, type TaskStatus } from "../models/Task.js";

export interface OverdueTaskShape {
  status: TaskStatus;
  dueDate: Date | null;
}

/**
 * A task is overdue when it still needs work (Open or In Progress), has a due
 * date, and that due date is in the past. Completed and cancelled tasks are
 * never overdue.
 */
export function isTaskOverdue(task: OverdueTaskShape, now: Date): boolean {
  if (!task.dueDate) return false;
  if (
    !ACTIVE_TASK_STATUSES.includes(
      task.status as (typeof ACTIVE_TASK_STATUSES)[number],
    )
  ) {
    return false;
  }
  return task.dueDate.getTime() < now.getTime();
}

/**
 * Matches active tasks whose due date has passed but are not yet flagged as
 * overdue, so the worker can flag them.
 */
export function overdueScanFilter(now: Date) {
  return {
    status: { $in: [...ACTIVE_TASK_STATUSES] },
    dueDate: { $ne: null, $lt: now },
    overdue: false,
  };
}

/**
 * Matches tasks currently flagged overdue that should no longer be, because
 * they were completed/cancelled, had their due date cleared, or rescheduled
 * into the future.
 */
export function overdueResetFilter(now: Date) {
  return {
    overdue: true,
    $or: [
      { status: { $nin: [...ACTIVE_TASK_STATUSES] } },
      { dueDate: null },
      { dueDate: { $gte: now } },
    ],
  };
}
