import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-unit-tests";

const { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } =
  await import("../src/services/authService.js");
const { Types } = await import("mongoose");
const { BrokerageModel } = await import("../src/models/Brokerage.js");
const { ClientModel } = await import("../src/models/Client.js");
const { DocumentModel, DOCUMENT_STATUSES } =
  await import("../src/models/Document.js");
const { DocumentVerificationJobModel, VERIFICATION_JOB_STATUSES } =
  await import("../src/models/DocumentVerificationJob.js");
const { LeadModel } = await import("../src/models/Lead.js");
const { UserModel } = await import("../src/models/User.js");
const { brokerageFilter, canAccessBrokerage } =
  await import("../src/utils/tenantAccess.js");
const { buildLeadListFilter, escapeRegex, getLeadTenantId } =
  await import("../src/utils/leadQuery.js");
const { normalizeEmail, normalizeLeadName, normalizePhone } =
  await import("../src/utils/leadIdentity.js");
const { getLeadsMissingIdentityFilter } =
  await import("../src/services/leadIdentityService.js");
const { documentScopeFilter } =
  await import("../src/services/documentAccessService.js");
const { canTransitionDocumentStatus } =
  await import("../src/utils/documentStatus.js");
const { createVerificationOutcome } =
  await import("../src/services/documentVerificationWorker.js");
const { parseExternalLeadInput } =
  await import("../src/utils/webhookLeadInput.js");
const { webhookSecretMatches } =
  await import("../src/middleware/webhookAuthMiddleware.js");

describe("authentication primitives", () => {
  it("hashes passwords and verifies only the matching password", async () => {
    const hash = await hashPassword("correct-horse-battery-staple");

    assert.notEqual(hash, "correct-horse-battery-staple");
    assert.equal(
      await verifyPassword("correct-horse-battery-staple", hash),
      true,
    );
    assert.equal(await verifyPassword("incorrect-password", hash), false);
  });

  it("issues verifiable access tokens", () => {
    const token = createAccessToken("user-123");

    assert.equal(verifyAccessToken(token), "user-123");
    assert.throws(() => verifyAccessToken("invalid-token"));
  });
});

describe("brokerage tenant access", () => {
  const brokerageAdmin = {
    role: "brokerage_admin" as const,
    brokerageId: "507f1f77bcf86cd799439011",
  };

  it("allows access only to the authenticated user's brokerage", () => {
    assert.equal(
      canAccessBrokerage(brokerageAdmin, "507F1F77BCF86CD799439011"),
      true,
    );
    assert.equal(
      canAccessBrokerage(brokerageAdmin, "507f1f77bcf86cd799439012"),
      false,
    );
    assert.deepEqual(brokerageFilter(brokerageAdmin), {
      brokerageId: "507f1f77bcf86cd799439011",
    });
  });

  it("allows platform admins across brokerages", () => {
    const platformAdmin = {
      role: "platform_admin" as const,
      brokerageId: null,
    };

    assert.equal(
      canAccessBrokerage(platformAdmin, "507f1f77bcf86cd799439012"),
      true,
    );
    assert.deepEqual(brokerageFilter(platformAdmin), {});
  });
});

describe("database model validation", () => {
  it("requires brokerage membership for brokerage roles", () => {
    const advisor = new UserModel({
      email: "advisor@example.com",
      fullName: "Avery Advisor",
      passwordHash: "hash",
      role: "advisor",
    });

    assert.ok(advisor.validateSync()?.errors.brokerageId);
  });

  it("allows platform admins without a brokerage", () => {
    const admin = new UserModel({
      email: "platform@example.com",
      fullName: "Platform Admin",
      passwordHash: "hash",
      role: "platform_admin",
    });

    assert.equal(admin.validateSync(), undefined);
  });

  it("requires a brokerage name", () => {
    const brokerage = new BrokerageModel({});

    assert.ok(brokerage.validateSync()?.errors.name);
  });

  it("indexes normalized duplicate identities within a brokerage", () => {
    const indexes = LeadModel.schema
      .indexes()
      .map(([keys]) => Object.keys(keys).join(","));

    assert.ok(indexes.includes("brokerageId,emailNormalized"));
    assert.ok(indexes.includes("brokerageId,phoneNormalized"));
    assert.ok(indexes.includes("brokerageId,nameNormalized,phoneNormalized"));
  });

  it("enforces one client profile per brokerage account and email", () => {
    const indexes = ClientModel.schema
      .indexes()
      .map(([keys]) => Object.keys(keys).join(","));

    assert.ok(indexes.includes("brokerageId,emailNormalized"));
    assert.ok(indexes.includes("brokerageId,userId"));
    assert.ok(UserModel.schema.path("passwordResetRequired"));
    assert.ok(
      UserModel.schema
        .indexes()
        .some(
          ([keys]) => Object.keys(keys).join(",") === "activationTokenHash",
        ),
    );

    const invitedClient = new UserModel({
      email: "invited.client@example.com",
      fullName: "Invited Client",
      passwordHash: "temporary-password-hash",
      passwordResetRequired: true,
      role: "client",
      brokerageId: "507f1f77bcf86cd799439011",
    });
    assert.equal(invitedClient.validateSync(), undefined);
  });

  it("allows conversion activities to link a client while retaining stage history", async () => {
    const { ActivityModel } = await import("../src/models/Activity.js");
    const { Types } = await import("mongoose");
    const activity = new ActivityModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      actorId: new Types.ObjectId(),
      clientId: new Types.ObjectId(),
      type: "lead_converted",
    });

    assert.equal(activity.validateSync(), undefined);
  });

  it("requires both stages on stage-change Activities", async () => {
    const { ActivityModel } = await import("../src/models/Activity.js");
    const { Types } = await import("mongoose");
    const activity = new ActivityModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      actorId: new Types.ObjectId(),
      type: "lead_stage_changed",
    });

    assert.ok(activity.validateSync()?.errors.fromStage);
    assert.ok(activity.validateSync()?.errors.toStage);
  });

  it("defines brokerage-indexed Document fields and statuses", () => {
    const indexes = DocumentModel.schema
      .indexes()
      .map(([keys]) => Object.keys(keys).join(","));
    const document = new DocumentModel({
      clientId: new Types.ObjectId(),
      uploadedBy: new Types.ObjectId(),
      filename: "passport.pdf",
      fileUrl: "/api/documents/doc-id/content",
      storageKey: "00000000-0000-4000-8000-000000000000",
      contentType: "application/pdf",
      documentType: "Identity",
      brokerageId: new Types.ObjectId(),
    });

    assert.deepEqual(DOCUMENT_STATUSES, [
      "Pending",
      "Uploading",
      "Processing",
      "In Review",
      "Verified",
      "Failed",
    ]);
    assert.ok(indexes.includes("brokerageId,clientId,createdAt"));
    assert.equal(document.validateSync(), undefined);
  });

  it("stores persistent verification jobs with retry and claim indexes", () => {
    const job = new DocumentVerificationJobModel({
      documentId: new Types.ObjectId(),
      clientId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
    });
    const indexes = DocumentVerificationJobModel.schema
      .indexes()
      .map(([keys]) => Object.keys(keys).join(","));

    assert.deepEqual(VERIFICATION_JOB_STATUSES, [
      "Queued",
      "Processing",
      "Completed",
      "Failed",
    ]);
    assert.equal(job.validateSync(), undefined);
    assert.equal(job.attempts, 0);
    assert.equal(job.maxAttempts, 3);
    assert.ok(indexes.includes("status,nextAttemptAt,createdAt"));
  });

  it("records successful and failed verification results and reasons", () => {
    const completedAt = new Date("2026-10-01T12:00:00.000Z");
    const passed = createVerificationOutcome(false, "income.pdf", completedAt);
    const failed = createVerificationOutcome(true, "income.pdf", completedAt);

    assert.equal(passed.status, "Verified");
    assert.equal(passed.verificationResult.passed, true);
    assert.equal(passed.verificationResult.completedAt, completedAt);
    assert.equal(passed.failureReason, null);
    assert.equal(failed.status, "Failed");
    assert.equal(failed.verificationResult.passed, false);
    assert.equal(failed.verificationResult.completedAt, completedAt);
    assert.match(failed.failureReason ?? "", /Manual review/);
  });

  it("allows valid document-status progressions only", () => {
    assert.equal(canTransitionDocumentStatus("Pending", "Uploading"), true);
    assert.equal(canTransitionDocumentStatus("Processing", "Verified"), true);
    assert.equal(canTransitionDocumentStatus("Verified", "Pending"), false);
    assert.equal(canTransitionDocumentStatus("Pending", "Verified"), false);
  });

  it("builds document filters with brokerage and optional client scope", () => {
    const brokerageId = new Types.ObjectId("507f1f77bcf86cd799439011");
    const clientId = new Types.ObjectId("507f1f77bcf86cd799439012");

    assert.deepEqual(documentScopeFilter({ brokerageId }), { brokerageId });
    assert.deepEqual(documentScopeFilter({ brokerageId, clientId }), {
      brokerageId,
      clientId,
    });
  });
});

describe("lead tenant query construction", () => {
  it("always binds list filters to the authenticated brokerage", () => {
    const brokerageId = getLeadTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });
    const filter = buildLeadListFilter({
      brokerageId,
      search: "lee",
      stage: "Qualified",
    });

    assert.equal(filter.brokerageId.toString(), brokerageId.toString());
    assert.equal(filter.stage, "Qualified");
    assert.equal(filter.$or?.[0]?.name?.test("Lee Smith"), true);
    assert.equal(filter.$or?.[0]?.name?.test("Ashley"), false);
  });

  it("rejects authenticated users without a valid brokerage ID", () => {
    assert.throws(() => getLeadTenantId({ brokerageId: null }));
  });

  it("treats search input as literal text rather than a regular expression", () => {
    const filter = buildLeadListFilter({
      brokerageId: getLeadTenantId({ brokerageId: "507f1f77bcf86cd799439011" }),
      search: "Jamie.+",
    });

    assert.equal(escapeRegex("Jamie.+"), "Jamie\\.\\+");
    assert.equal(filter.$or?.[0]?.name?.test("Jamie.+ Chen"), true);
    assert.equal(filter.$or?.[0]?.name?.test("Jamie Lee Chen"), false);
  });

  it("normalizes email, phone, and name for duplicate comparisons", () => {
    assert.equal(
      normalizeEmail("  JANE.DOE@Example.COM "),
      "jane.doe@example.com",
    );
    assert.equal(normalizePhone("+1 (415) 555-0100"), "14155550100");
    assert.equal(normalizeLeadName("  José   Smith "), "jose smith");
  });

  it("backfills leads missing any normalized identity key", () => {
    assert.deepEqual(getLeadsMissingIdentityFilter(), {
      $or: [
        { emailNormalized: { $exists: false } },
        { phoneNormalized: { $exists: false } },
        { nameNormalized: { $exists: false } },
      ],
    });
  });

  it("validates and normalizes external webhook lead data", () => {
    const result = parseExternalLeadInput({
      name: "  Jamie Chen ",
      email: " JAMIE.CHEN@EXAMPLE.COM ",
      phone: "+1 (415) 555-0100",
      source: " Broker referral ",
      propertyType: "Condo",
      loanAmount: 485000,
    });

    assert.ok(result.input);
    assert.equal(result.input.name, "Jamie Chen");
    assert.equal(result.input.email, "jamie.chen@example.com");
    assert.equal(result.input.phoneNormalized, "14155550100");
    assert.equal(result.input.source, "Broker referral");
    assert.equal(result.input.nameNormalized, "jamie chen");
  });

  it("rejects invalid or extra webhook fields", () => {
    assert.equal(
      parseExternalLeadInput({ name: "Only a name" }).error?.includes("email"),
      true,
    );
    assert.equal(
      parseExternalLeadInput({
        name: "Jamie Chen",
        email: "jamie@example.com",
        phone: "---",
        source: "Referral",
        propertyType: "Condo",
        loanAmount: 100,
      }).error?.includes("phone"),
      true,
    );
    assert.match(
      parseExternalLeadInput({ name: "Jamie", brokerageId: "tenant" }).error ??
        "",
      /Unsupported field/,
    );
  });

  it("compares webhook secrets without accepting missing or wrong values", () => {
    assert.equal(webhookSecretMatches("secret-value", "secret-value"), true);
    assert.equal(webhookSecretMatches("wrong-value", "secret-value"), false);
    assert.equal(webhookSecretMatches(undefined, "secret-value"), false);
    assert.equal(webhookSecretMatches("secret-value", undefined), false);
  });
});

after(() => {
  delete process.env.JWT_SECRET;
});
