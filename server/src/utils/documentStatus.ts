import type { DocumentStatus } from "../models/Document.js";

export const DOCUMENT_STATUS_TRANSITIONS: Record<
  DocumentStatus,
  readonly DocumentStatus[]
> = {
  Pending: ["Uploading", "Processing", "Failed"],
  Uploading: ["Processing", "Failed"],
  Processing: ["In Review", "Verified", "Failed"],
  "In Review": ["Processing", "Verified", "Failed"],
  Verified: [],
  Failed: ["Pending", "Processing"],
};

export function canTransitionDocumentStatus(
  current: DocumentStatus,
  next: DocumentStatus,
): boolean {
  return DOCUMENT_STATUS_TRANSITIONS[current].includes(next);
}
