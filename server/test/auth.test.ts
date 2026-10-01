import assert from "node:assert/strict";
import { after, describe, it } from "node:test";

process.env.JWT_SECRET = "test-secret-that-is-long-enough-for-unit-tests";

const { createAccessToken, hashPassword, verifyAccessToken, verifyPassword } =
  await import("../src/services/authService.js");
const { BrokerageModel } = await import("../src/models/Brokerage.js");
const { UserModel } = await import("../src/models/User.js");
const { brokerageFilter, canAccessBrokerage } =
  await import("../src/utils/tenantAccess.js");

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
});

after(() => {
  delete process.env.JWT_SECRET;
});
