import { TaskModel } from "../models/Task.js";
import { emitTaskEvent } from "../sockets/index.js";
import { overdueResetFilter, overdueScanFilter } from "../utils/taskOverdue.js";

const pollIntervalMs = 60_000;

function publicTask(task: InstanceType<typeof TaskModel>) {
  return Object.fromEntries(
    Object.entries(task.toObject()).filter(([key]) => key !== "automationKey"),
  );
}

/**
 * Flag active, past-due tasks as overdue and clear the flag from tasks that no
 * longer qualify (completed, cancelled, rescheduled, or due date cleared).
 * Emits live socket events so advisor screens stay current.
 */
export async function reconcileOverdueTasks(
  now = new Date(),
): Promise<{ flagged: number; cleared: number }> {
  const dueTasks = await TaskModel.find(overdueScanFilter(now)).exec();
  if (dueTasks.length) {
    await TaskModel.updateMany(
      { _id: { $in: dueTasks.map((task) => task._id) } },
      { $set: { overdue: true } },
    ).exec();
    for (const task of dueTasks) {
      task.overdue = true;
      emitTaskEvent(task.brokerageId.toString(), "overdue", publicTask(task));
    }
  }

  const resetTasks = await TaskModel.find(overdueResetFilter(now)).exec();
  if (resetTasks.length) {
    await TaskModel.updateMany(
      { _id: { $in: resetTasks.map((task) => task._id) } },
      { $set: { overdue: false } },
    ).exec();
    for (const task of resetTasks) {
      task.overdue = false;
      emitTaskEvent(task.brokerageId.toString(), "updated", publicTask(task));
    }
  }

  return { flagged: dueTasks.length, cleared: resetTasks.length };
}

export function startOverdueTaskWorker(): () => void {
  let running = false;
  let stopped = false;
  const poll = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await reconcileOverdueTasks();
    } catch (error) {
      console.error("Overdue task reconciliation failed:", error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void poll(), pollIntervalMs);
  void poll();
  return () => {
    stopped = true;
    clearInterval(timer);
  };
}
