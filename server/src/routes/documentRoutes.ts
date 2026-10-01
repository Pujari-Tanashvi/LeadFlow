import { Router } from "express";
import {
  deleteDocument,
  getDocument,
  getDocumentContent,
  listDocuments,
  updateDocumentStatus,
  uploadDocument,
} from "../controllers/documentController.js";
import { requireAuthentication } from "../middleware/authMiddleware.js";
import { receiveDocumentUpload } from "../middleware/documentUploadMiddleware.js";

export const documentRoutes = Router();

documentRoutes.use(requireAuthentication);
documentRoutes.get("/", listDocuments);
documentRoutes.post("/", receiveDocumentUpload, uploadDocument);
documentRoutes.get("/:id/content", getDocumentContent);
documentRoutes.get("/:id", getDocument);
documentRoutes.patch("/:id/status", updateDocumentStatus);
documentRoutes.delete("/:id", deleteDocument);
