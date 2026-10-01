import { randomInt } from "node:crypto";
import { Types } from "mongoose";
import { DocumentModel, type DocumentStatus } from "../models/Document.js";
import { DocumentVerificationJobModel } from "../models/DocumentVerificationJob.js";
import { emitDocumentStatus } from "../sockets/index.js";

const pollIntervalMs = 500;
const verificationDelayMs = 2200;
const reviewDelayMs = 700;
const jobLeaseMs = 60_000;

function delay(milliseconds: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, milliseconds));
}

export async function enqueueDocumentVerification(input: {
  documentId: Types.ObjectId;
  clientId: Types.ObjectId;
  brokerageId: Types.ObjectId;
}): Promise<void> {
  await DocumentVerificationJobModel.create({
    ...input,
    status: "Queued",
    attempts: 0,
    maxAttempts: 3,
    nextAttemptAt: new Date(),
  });
}

function publicDocument(document: InstanceType<typeof DocumentModel>) {
  return Object.fromEntries(
    Object.entries(document.toObject()).filter(
      ([key]) => key !== "storageKey" && key !== "contentType",
    ),
  );
}

async function publishStatus(
  document: InstanceType<typeof DocumentModel>,
): Promise<void> {
  emitDocumentStatus(
    document.brokerageId.toString(),
    document.clientId.toString(),
    publicDocument(document),
  );
}

async function updateDocumentStatus(
  documentId: Types.ObjectId,
  brokerageId: Types.ObjectId,
  currentStatuses: readonly DocumentStatus[],
  status: DocumentStatus,
  fields: Record<string, unknown> = {},
): Promise<InstanceType<typeof DocumentModel> | null> {
  const document = await DocumentModel.findOneAndUpdate(
    {
      _id: documentId,
      brokerageId,
      status: { $in: currentStatuses },
    },
    { $set: { status, ...fields } },
    { new: true, runValidators: true },
  ).exec();
  if (document) await publishStatus(document);
  return document;
}

export function createVerificationOutcome(
  shouldFail: boolean,
  filename: string,
  completedAt = new Date(),
) {
  return {
    status: shouldFail ? ("Failed" as const) : ("Verified" as const),
    failureReason: shouldFail
      ? "Automated verification could not confirm the document. Manual review is required."
      : null,
    verificationResult: {
      passed: !shouldFail,
      checks: {
        uploadedFilePresent: true,
        acceptedContentType: true,
        filenamePresent: Boolean(filename),
      },
      completedAt,
    },
  };
}

async function processJob(
  job: InstanceType<typeof DocumentVerificationJobModel>,
): Promise<void> {
  const documentId = job.documentId as Types.ObjectId;
  const brokerageId = job.brokerageId as Types.ObjectId;
  const processingStartedAt = new Date();
  const document = await updateDocumentStatus(
    documentId,
    brokerageId,
    ["Pending", "Processing", "In Review"],
    "Processing",
    {
      processingStartedAt,
      failureReason: null,
      verificationCompletedAt: null,
    },
  );
  if (!document) {
    await DocumentVerificationJobModel.updateOne(
      { _id: job._id, status: "Processing" },
      {
        $set: {
          status: "Failed",
          lastError:
            "Document no longer exists or is not eligible for processing.",
          finishedAt: new Date(),
          lockedUntil: null,
        },
      },
    ).exec();
    return;
  }

  await delay(verificationDelayMs + randomInt(0, 1200));
  const reviewStartedAt = new Date();
  const inReview = await updateDocumentStatus(
    documentId,
    brokerageId,
    ["Processing"],
    "In Review",
    { reviewStartedAt },
  );
  if (!inReview) {
    throw new Error(
      "Document status changed while verification was processing.",
    );
  }

  await delay(reviewDelayMs);
  const verificationCompletedAt = new Date();
  const outcome = createVerificationOutcome(
    randomInt(0, 100) < 25,
    inReview.filename,
    verificationCompletedAt,
  );
  const completedDocument = await updateDocumentStatus(
    documentId,
    brokerageId,
    ["In Review"],
    outcome.status,
    {
      verificationResult: outcome.verificationResult,
      failureReason: outcome.failureReason,
      verificationCompletedAt,
    },
  );
  if (!completedDocument) {
    throw new Error(
      "Document status changed before verification could complete.",
    );
  }

  await DocumentVerificationJobModel.updateOne(
    { _id: job._id, status: "Processing" },
    {
      $set: {
        status: "Completed",
        finishedAt: verificationCompletedAt,
        lockedUntil: null,
      },
    },
  ).exec();
}

async function handleProcessingFailure(
  job: InstanceType<typeof DocumentVerificationJobModel>,
  error: unknown,
): Promise<void> {
  const reason =
    error instanceof Error
      ? error.message
      : "Unknown verification worker error.";
  if (job.attempts < job.maxAttempts) {
    const backoffMs = Math.min(
      30_000,
      1000 * 2 ** Math.max(job.attempts - 1, 0),
    );
    await DocumentVerificationJobModel.updateOne(
      { _id: job._id, status: "Processing" },
      {
        $set: {
          status: "Queued",
          nextAttemptAt: new Date(Date.now() + backoffMs),
          lastError: reason,
          lockedUntil: null,
        },
      },
    ).exec();
    return;
  }

  await DocumentVerificationJobModel.updateOne(
    { _id: job._id, status: "Processing" },
    {
      $set: {
        status: "Failed",
        lastError: reason,
        finishedAt: new Date(),
        lockedUntil: null,
      },
    },
  ).exec();
  const failedAt = new Date();
  await updateDocumentStatus(
    job.documentId as Types.ObjectId,
    job.brokerageId as Types.ObjectId,
    ["Pending", "Processing", "In Review"],
    "Failed",
    {
      failureReason:
        "Verification worker failed after automatic retries. Please retry the document.",
      verificationCompletedAt: failedAt,
    },
  );
}

export async function processNextDocumentVerificationJob(): Promise<boolean> {
  const now = new Date();
  const job = await DocumentVerificationJobModel.findOneAndUpdate(
    {
      $or: [
        { status: "Queued", nextAttemptAt: { $lte: now } },
        { status: "Processing", lockedUntil: { $lte: now } },
      ],
    },
    {
      $set: {
        status: "Processing",
        lockedUntil: new Date(now.getTime() + jobLeaseMs),
      },
      $inc: { attempts: 1 },
    },
    { new: true, sort: { nextAttemptAt: 1, createdAt: 1 } },
  ).exec();
  if (!job) return false;

  try {
    await processJob(job);
  } catch (error) {
    console.error("Document verification job failed:", error);
    await handleProcessingFailure(job, error);
  }
  return true;
}

export function startDocumentVerificationWorker(): () => void {
  let running = false;
  let stopped = false;
  const poll = async () => {
    if (running || stopped) return;
    running = true;
    try {
      await processNextDocumentVerificationJob();
    } catch (error) {
      console.error("Document verification queue polling failed:", error);
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

export async function retryFailedDocumentVerification(
  documentId: Types.ObjectId,
  brokerageId: Types.ObjectId,
): Promise<InstanceType<typeof DocumentModel> | null> {
  const document = await DocumentModel.findOneAndUpdate(
    { _id: documentId, brokerageId, status: "Failed" },
    {
      $set: {
        status: "Pending",
        verificationResult: null,
        failureReason: null,
        processingStartedAt: null,
        reviewStartedAt: null,
        verificationCompletedAt: null,
      },
    },
    { new: true, runValidators: true },
  ).exec();
  if (!document) return null;

  try {
    await enqueueDocumentVerification({
      documentId: document._id,
      clientId: document.clientId,
      brokerageId,
    });
  } catch (error) {
    await DocumentModel.updateOne(
      { _id: document._id, brokerageId, status: "Pending" },
      {
        $set: {
          status: "Failed",
          failureReason: "Retry could not be queued.",
        },
      },
    ).exec();
    throw error;
  }

  emitDocumentStatus(
    brokerageId.toString(),
    document.clientId.toString(),
    publicDocument(document),
  );
  return document;
}
