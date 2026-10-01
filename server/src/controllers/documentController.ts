import type { RequestHandler, Response } from "express";
import path from "node:path";
import { Types } from "mongoose";
import { ClientModel } from "../models/Client.js";
import {
  DOCUMENT_STATUSES,
  DocumentModel,
  type DocumentStatus,
} from "../models/Document.js";
import {
  documentScopeFilter,
  resolveDocumentScope,
} from "../services/documentAccessService.js";
import { documentStorage } from "../services/documentStorage.js";
import { canTransitionDocumentStatus } from "../utils/documentStatus.js";

function publicDocument(document: InstanceType<typeof DocumentModel>) {
  const value = document.toObject();
  return Object.fromEntries(
    Object.entries(value).filter(
      ([key]) => key !== "storageKey" && key !== "contentType",
    ),
  );
}

function sendInvalidId(response: Response): void {
  response
    .status(400)
    .json({ error: "Document ID must be a valid MongoDB ID." });
}

function safeFilename(filename: string): string {
  const basename = path.basename(filename.replace(/\\/g, "/"));
  const cleaned = basename.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  return cleaned.slice(0, 255) || "document";
}

function fileSignatureMatches(file: Express.Multer.File): boolean {
  const bytes = file.buffer;
  switch (file.mimetype) {
    case "application/pdf":
      return bytes.subarray(0, 5).toString("ascii") === "%PDF-";
    case "image/jpeg":
      return (
        bytes.length >= 3 &&
        bytes[0] === 0xff &&
        bytes[1] === 0xd8 &&
        bytes[2] === 0xff
      );
    case "image/png":
      return bytes
        .subarray(0, 8)
        .equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    case "image/webp":
      return (
        bytes.subarray(0, 4).toString("ascii") === "RIFF" &&
        bytes.subarray(8, 12).toString("ascii") === "WEBP"
      );
    default:
      return false;
  }
}

function handleControllerError(
  error: unknown,
  next: Parameters<RequestHandler>[2],
): void {
  next(error);
}

export const uploadDocument: RequestHandler = async (
  request,
  response,
  next,
) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  if (!request.file) {
    response.status(400).json({ error: "A file field is required." });
    return;
  }
  const { clientId, documentType } = request.body as Record<string, unknown>;
  if (
    typeof clientId !== "string" ||
    typeof documentType !== "string" ||
    !documentType.trim()
  ) {
    response
      .status(400)
      .json({ error: "clientId and documentType are required." });
    return;
  }
  if (documentType.trim().length > 100) {
    response
      .status(400)
      .json({ error: "documentType exceeds 100 characters." });
    return;
  }
  if (!fileSignatureMatches(request.file)) {
    response
      .status(415)
      .json({
        error: "File content does not match an accepted PDF or image type.",
      });
    return;
  }

  let stored: Awaited<ReturnType<typeof documentStorage.save>> | undefined;
  try {
    const scope = await resolveDocumentScope(request.auth, clientId);
    const client = await ClientModel.findOne({
      _id: scope.clientId,
      brokerageId: scope.brokerageId,
    }).exec();
    if (!client) {
      response.status(404).json({ error: "Client not found." });
      return;
    }

    stored = await documentStorage.save(request.file);
    const documentId = new Types.ObjectId();
    const document = await DocumentModel.create({
      _id: documentId,
      clientId: client._id,
      uploadedBy: new Types.ObjectId(request.auth.userId),
      filename: safeFilename(request.file.originalname),
      fileUrl: `/api/documents/${documentId.toString()}/content`,
      storageKey: stored.storageKey,
      contentType: request.file.mimetype,
      documentType: documentType.trim(),
      status: "Pending",
      brokerageId: scope.brokerageId,
    });
    response.status(201).json({ document: publicDocument(document) });
  } catch (error) {
    if (stored)
      await documentStorage.remove(stored.storageKey).catch(() => undefined);
    handleControllerError(error, next);
  }
};

export const listDocuments: RequestHandler = async (
  request,
  response,
  next,
) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  const requestedClientId = request.query.clientId;
  if (
    requestedClientId !== undefined &&
    typeof requestedClientId !== "string"
  ) {
    response.status(400).json({ error: "clientId must be a string." });
    return;
  }
  try {
    const scope = await resolveDocumentScope(
      request.auth,
      requestedClientId as string | undefined,
    );
    const documents = await DocumentModel.find(documentScopeFilter(scope))
      .sort({ createdAt: -1, _id: -1 })
      .exec();
    response.status(200).json({ documents: documents.map(publicDocument) });
  } catch (error) {
    handleControllerError(error, next);
  }
};

async function findAccessibleDocument(
  request: Parameters<RequestHandler>[0],
  response: Response,
) {
  if (
    !Types.ObjectId.isValid(request.params.id) ||
    !/^[a-f\d]{24}$/i.test(request.params.id)
  ) {
    sendInvalidId(response);
    return null;
  }
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return null;
  }
  const scope = await resolveDocumentScope(request.auth);
  const document = await DocumentModel.findOne({
    _id: new Types.ObjectId(request.params.id),
    ...documentScopeFilter(scope),
  }).exec();
  if (!document) {
    response.status(404).json({ error: "Document not found." });
    return null;
  }
  return { scope, document };
}

export const getDocument: RequestHandler = async (request, response, next) => {
  try {
    const result = await findAccessibleDocument(request, response);
    if (result)
      response.status(200).json({ document: publicDocument(result.document) });
  } catch (error) {
    handleControllerError(error, next);
  }
};

export const getDocumentContent: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await findAccessibleDocument(request, response);
    if (!result) return;
    const document = await DocumentModel.findOne({
      _id: result.document._id,
      ...documentScopeFilter(result.scope),
    })
      .select("+storageKey +contentType")
      .exec();
    if (!document) {
      response.status(404).json({ error: "Document not found." });
      return;
    }
    response.setHeader("Content-Type", document.contentType);
    response.setHeader(
      "Content-Disposition",
      `attachment; filename*=UTF-8''${encodeURIComponent(document.filename)}`,
    );
    response.setHeader("X-Content-Type-Options", "nosniff");
    documentStorage.open(document.storageKey).on("error", next).pipe(response);
  } catch (error) {
    handleControllerError(error, next);
  }
};

export const updateDocumentStatus: RequestHandler = async (
  request,
  response,
  next,
) => {
  if (!request.auth) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  if (request.auth.role === "client") {
    response
      .status(403)
      .json({ error: "Clients cannot update document status." });
    return;
  }
  if (
    typeof request.body?.status !== "string" ||
    !DOCUMENT_STATUSES.includes(request.body.status as DocumentStatus)
  ) {
    response
      .status(400)
      .json({
        error: `status must be one of: ${DOCUMENT_STATUSES.join(", ")}.`,
      });
    return;
  }
  try {
    const result = await findAccessibleDocument(request, response);
    if (!result) return;
    const nextStatus = request.body.status as DocumentStatus;
    if (!canTransitionDocumentStatus(result.document.status, nextStatus)) {
      response
        .status(409)
        .json({
          error: `Cannot change status from ${result.document.status} to ${nextStatus}.`,
        });
      return;
    }
    const document = await DocumentModel.findOneAndUpdate(
      {
        _id: result.document._id,
        ...documentScopeFilter(result.scope),
        status: result.document.status,
      },
      { $set: { status: nextStatus } },
      { new: true, runValidators: true },
    ).exec();
    if (!document) {
      response
        .status(409)
        .json({
          error: "Document status changed concurrently. Reload and retry.",
        });
      return;
    }
    response.status(200).json({ document: publicDocument(document) });
  } catch (error) {
    handleControllerError(error, next);
  }
};

export const deleteDocument: RequestHandler = async (
  request,
  response,
  next,
) => {
  try {
    const result = await findAccessibleDocument(request, response);
    if (!result) return;
    const document = await DocumentModel.findOne({
      _id: result.document._id,
      ...documentScopeFilter(result.scope),
    })
      .select("+storageKey")
      .exec();
    if (!document) {
      response.status(404).json({ error: "Document not found." });
      return;
    }
    await documentStorage.remove(document.storageKey);
    await DocumentModel.deleteOne({
      _id: document._id,
      ...documentScopeFilter(result.scope),
    }).exec();
    response.status(204).end();
  } catch (error) {
    handleControllerError(error, next);
  }
};
