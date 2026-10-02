import { apiRequest, apiUpload, apiDownload } from "./apiClient";
import { API_ENDPOINTS } from "./endpoints";
import type {
  ApiDocument,
  ApiDocumentListResponse,
  ApiDocumentResponse,
  ApiDocumentStatus,
} from "./apiTypes";

/**
 * Documents are owned by a client dossier. The API scopes a client-role
 * account to its own dossier automatically, so no client id is sent for them.
 */
export async function listDocuments(
  clientId?: string,
  signal?: AbortSignal,
): Promise<ApiDocumentListResponse> {
  return apiRequest<ApiDocumentListResponse>(API_ENDPOINTS.documents.list, {
    query: { clientId },
    signal,
  });
}

export async function fetchDocument(
  documentId: string,
  signal?: AbortSignal,
): Promise<ApiDocument> {
  const response = await apiRequest<ApiDocumentResponse>(
    API_ENDPOINTS.documents.item(documentId),
    { signal },
  );
  return response.document;
}

export interface UploadDocumentInput {
  clientId: string;
  documentType: string;
  file: File;
}

/** Upload a borrower file. The API validates the real file signature. */
export async function uploadDocument(
  input: UploadDocumentInput,
): Promise<ApiDocument> {
  const form = new FormData();
  form.append("clientId", input.clientId);
  form.append("documentType", input.documentType);
  form.append("file", input.file);
  const response = await apiUpload<ApiDocumentResponse>(
    API_ENDPOINTS.documents.create,
    form,
  );
  return response.document;
}

export async function updateDocumentStatus(
  documentId: string,
  status: ApiDocumentStatus,
): Promise<ApiDocument> {
  const response = await apiRequest<ApiDocumentResponse>(
    API_ENDPOINTS.documents.status(documentId),
    { method: "PATCH", body: { status } },
  );
  return response.document;
}

export async function retryDocumentVerification(
  documentId: string,
): Promise<ApiDocument> {
  const response = await apiRequest<ApiDocumentResponse>(
    API_ENDPOINTS.documents.retry(documentId),
    { method: "POST" },
  );
  return response.document;
}

export async function deleteDocument(documentId: string): Promise<void> {
  await apiRequest<void>(API_ENDPOINTS.documents.remove(documentId), {
    method: "DELETE",
  });
}

export function downloadDocument(documentId: string): Promise<Blob> {
  return apiDownload(API_ENDPOINTS.documents.content(documentId));
}
