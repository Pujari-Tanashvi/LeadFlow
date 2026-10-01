import { Types } from "mongoose";
import { ClientModel } from "../models/Client.js";
import type { AuthContext } from "../types/auth.js";

export interface DocumentScope {
  brokerageId: Types.ObjectId;
  clientId?: Types.ObjectId;
}

export async function resolveDocumentScope(
  auth: AuthContext,
  requestedClientId?: string,
): Promise<DocumentScope> {
  if (!auth.brokerageId || !Types.ObjectId.isValid(auth.brokerageId)) {
    throw Object.assign(new Error("A brokerage account is required."), {
      statusCode: 403,
    });
  }

  const brokerageId = new Types.ObjectId(auth.brokerageId);
  if (auth.role === "client") {
    const ownClient = await ClientModel.findOne({
      userId: new Types.ObjectId(auth.userId),
      brokerageId,
    })
      .select("_id")
      .exec();
    if (!ownClient) {
      throw Object.assign(new Error("Client profile not found."), {
        statusCode: 403,
      });
    }

    if (requestedClientId && requestedClientId !== ownClient._id.toString()) {
      throw Object.assign(new Error("Document not found."), {
        statusCode: 404,
      });
    }

    return { brokerageId, clientId: ownClient._id };
  }

  if (
    auth.role !== "advisor" &&
    auth.role !== "brokerage_admin" &&
    auth.role !== "platform_admin"
  ) {
    throw Object.assign(new Error("You do not have access to documents."), {
      statusCode: 403,
    });
  }

  if (requestedClientId) {
    if (!Types.ObjectId.isValid(requestedClientId)) {
      throw Object.assign(new Error("clientId must be a valid MongoDB ID."), {
        statusCode: 400,
      });
    }
    const belongsToBrokerage = await ClientModel.exists({
      _id: new Types.ObjectId(requestedClientId),
      brokerageId,
    });
    if (!belongsToBrokerage) {
      throw Object.assign(new Error("Client not found."), { statusCode: 404 });
    }
    return { brokerageId, clientId: new Types.ObjectId(requestedClientId) };
  }

  return { brokerageId };
}

export function documentScopeFilter(scope: DocumentScope) {
  return {
    brokerageId: scope.brokerageId,
    ...(scope.clientId ? { clientId: scope.clientId } : {}),
  };
}
