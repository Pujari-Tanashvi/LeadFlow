import type { RequestHandler } from "express";
import { Types } from "mongoose";

export const requireTaskTenant: RequestHandler = (request, response, next) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  if (
    !request.auth.brokerageId ||
    !Types.ObjectId.isValid(request.auth.brokerageId)
  ) {
    response
      .status(403)
      .json({ error: "A brokerage account is required for task access." });
    return;
  }

  next();
};
