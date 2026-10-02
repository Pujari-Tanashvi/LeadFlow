import type { RequestHandler } from "express";
import type { UserRole } from "../models/User.js";
import { getAuthenticatedUser } from "../services/userService.js";
import { verifyAccessToken } from "../services/authService.js";

export const requireAuthentication: RequestHandler = async (
  request,
  response,
  next,
) => {
  const authorization = request.header("authorization");
  const token = authorization?.startsWith("Bearer ")
    ? authorization.slice("Bearer ".length)
    : undefined;

  if (!token) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  let userId: string;
  try {
    userId = verifyAccessToken(token);
  } catch {
    response.status(401).json({ error: "Invalid or expired access token." });
    return;
  }

  try {
    const user = await getAuthenticatedUser(userId);

    if (!user) {
      response.status(401).json({ error: "Account is no longer available." });
      return;
    }

    request.auth = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      role: user.role,
      // Always a plain string id: the tenant middleware validates it with
      // Types.ObjectId.isValid and builds queries from it.
      brokerageId: user.brokerageId ? String(user.brokerageId) : null,
    };
    next();
  } catch (error) {
    next(error);
  }
};

export function requireRoles(...allowedRoles: UserRole[]): RequestHandler {
  return (request, response, next) => {
    if (!request.auth) {
      response.status(401).json({ error: "Authentication required." });
      return;
    }

    if (!allowedRoles.includes(request.auth.role)) {
      response
        .status(403)
        .json({ error: "You do not have permission to access this resource." });
      return;
    }

    next();
  };
}

export const requireBrokerageScope: RequestHandler = (
  request,
  response,
  next,
) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }

  const requestedBrokerageId = request.params.brokerageId;
  if (!requestedBrokerageId) {
    response
      .status(400)
      .json({ error: "A brokerageId route parameter is required." });
    return;
  }

  if (
    request.auth.role !== "platform_admin" &&
    request.auth.brokerageId?.toLowerCase() !==
      requestedBrokerageId.toLowerCase()
  ) {
    response
      .status(403)
      .json({ error: "Access to this brokerage is forbidden." });
    return;
  }

  next();
};
