import type { Types } from "mongoose";
import { ActivityModel } from "../models/Activity.js";
import { ClientModel } from "../models/Client.js";
import { LeadModel } from "../models/Lead.js";
import { TaskModel } from "../models/Task.js";
import { emitDashboardStats } from "../sockets/index.js";
import {
  assembleDashboardSummary,
  type ActivityLike,
  type DashboardSummary,
  type LeadStageCountRow,
} from "../utils/dashboardSummary.js";

const RECENT_ACTIVITY_LIMIT = 10;

/**
 * Compute the dashboard summary for a single brokerage.
 *
 * Every query is scoped by brokerageId so results can never cross tenants, and
 * each is served by an index:
 *  - leads-by-stage via a {brokerageId, stage, ...} index (one aggregation
 *    pass yields total/contacted/won/lost and the full stage distribution);
 *  - active clients via countDocuments on the {brokerageId, ...} index;
 *  - overdue tasks via the {brokerageId, overdue} index;
 *  - recent activity via the {brokerageId, createdAt} index.
 */
export async function getDashboardSummary(
  brokerageId: Types.ObjectId,
): Promise<DashboardSummary> {
  const [stageRows, activeClients, overdueTasks, recentActivity] =
    await Promise.all([
      LeadModel.aggregate<LeadStageCountRow>([
        { $match: { brokerageId } },
        { $group: { _id: "$stage", count: { $sum: 1 } } },
      ]).exec(),
      ClientModel.countDocuments({ brokerageId }).exec(),
      TaskModel.countDocuments({ brokerageId, overdue: true }).exec(),
      ActivityModel.find({ brokerageId })
        .sort({ createdAt: -1, _id: -1 })
        .limit(RECENT_ACTIVITY_LIMIT)
        .select("type leadId actorId fromStage toStage clientId createdAt")
        .lean()
        .exec(),
    ]);

  return assembleDashboardSummary({
    stageRows,
    activeClients,
    overdueTasks,
    recentActivity: recentActivity as ActivityLike[],
  });
}

/**
 * Recompute and broadcast the dashboard summary for a brokerage over Socket.IO.
 * Best-effort: broadcasting is never allowed to fail or slow the mutation that
 * triggered it, so all errors are swallowed after logging.
 */
export async function publishDashboardStats(
  brokerageId: Types.ObjectId,
): Promise<void> {
  try {
    const summary = await getDashboardSummary(brokerageId);
    emitDashboardStats(brokerageId.toString(), summary);
  } catch (error) {
    console.error("Dashboard stats broadcast failed:", error);
  }
}
