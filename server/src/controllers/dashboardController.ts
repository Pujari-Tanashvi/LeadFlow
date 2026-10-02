import type { RequestHandler } from "express";
import { getDashboardSummary } from "../services/dashboardService.js";
import { getDashboardTenantId } from "../utils/dashboardQuery.js";

export const getDashboard: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const brokerageId = getDashboardTenantId(request.auth!);
    const summary = await getDashboardSummary(brokerageId);
    response.status(200).json(summary);
  } catch (error) {
    next(error);
  }
};
