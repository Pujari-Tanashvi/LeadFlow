import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { Types } = await import("mongoose");
const { LEAD_STAGES } = await import("../src/models/Lead.js");
const { TaskModel } = await import("../src/models/Task.js");
const { ActivityModel } = await import("../src/models/Activity.js");
const {
  emptyStageCounts,
  buildStageCounts,
  serializeActivity,
  assembleDashboardSummary,
} = await import("../src/utils/dashboardSummary.js");
const { getDashboardTenantId } = await import("../src/utils/dashboardQuery.js");

const OID = "507f1f77bcf86cd799439011";

describe("dashboard stage counts", () => {
  it("zero-fills every pipeline stage", () => {
    const counts = emptyStageCounts();

    assert.deepEqual(Object.keys(counts), [...LEAD_STAGES]);
    for (const stage of LEAD_STAGES) {
      assert.equal(counts[stage], 0);
    }
  });

  it("folds aggregation rows into a zero-filled map", () => {
    const counts = buildStageCounts([
      { _id: "New", count: 4 },
      { _id: "Won", count: 2 },
      { _id: null, count: 9 }, // never produced, but must be ignored safely
    ]);

    assert.equal(counts.New, 4);
    assert.equal(counts.Won, 2);
    assert.equal(counts.Lost, 0);
    assert.equal(counts.Contacted, 0);
  });

  it("ignores unknown stage rows so they cannot distort the total", () => {
    const counts = buildStageCounts([{ _id: "Snoozed", count: 5 }]);

    assert.deepEqual(counts, emptyStageCounts());
  });
});

describe("assembleDashboardSummary", () => {
  it("derives totals and per-stage figures from the single stage aggregation", () => {
    const summary = assembleDashboardSummary({
      stageRows: [
        { _id: "New", count: 3 },
        { _id: "Contacted", count: 5 },
        { _id: "Qualified", count: 2 },
        { _id: "Won", count: 4 },
        { _id: "Lost", count: 1 },
      ],
      activeClients: 7,
      overdueTasks: 2,
      recentActivity: [],
    });

    assert.equal(summary.totalLeads, 15);
    assert.equal(summary.contactedLeads, 5);
    assert.equal(summary.wonLeads, 4);
    assert.equal(summary.lostLeads, 1);
    assert.equal(summary.activeClients, 7);
    assert.equal(summary.overdueTasks, 2);
    assert.deepEqual(summary.recentActivity, []);
    assert.equal(summary.leadsByStage.Documents, 0);
  });

  it("returns zeros for an empty brokerage", () => {
    const summary = assembleDashboardSummary({
      stageRows: [],
      activeClients: 0,
      overdueTasks: 0,
      recentActivity: [],
    });

    assert.equal(summary.totalLeads, 0);
    assert.equal(summary.contactedLeads, 0);
    assert.equal(summary.wonLeads, 0);
    assert.equal(summary.lostLeads, 0);
    assert.deepEqual(summary.leadsByStage, emptyStageCounts());
  });
});

describe("serializeActivity", () => {
  it("projects an activity into the dashboard shape", () => {
    const createdAt = new Date("2026-01-02T03:04:05.000Z");
    const entry = serializeActivity({
      _id: new Types.ObjectId(OID),
      type: "lead_stage_changed",
      leadId: new Types.ObjectId(OID),
      actorId: new Types.ObjectId(OID),
      fromStage: "New",
      toStage: "Contacted",
      clientId: null,
      createdAt,
    });

    assert.equal(entry.id, OID);
    assert.equal(entry.type, "lead_stage_changed");
    assert.equal(entry.leadId, OID);
    assert.equal(entry.actorId, OID);
    assert.equal(entry.fromStage, "New");
    assert.equal(entry.toStage, "Contacted");
    assert.equal(entry.clientId, null);
    assert.equal(entry.createdAt, createdAt);
  });

  it("tolerates missing optional fields without leaking undefined", () => {
    const entry = serializeActivity({ _id: new Types.ObjectId(OID) });

    assert.equal(entry.fromStage, null);
    assert.equal(entry.toStage, null);
    assert.equal(entry.clientId, null);
    assert.equal(entry.createdAt, null);
  });
});

describe("dashboard tenant scoping", () => {
  it("resolves the brokerage id from the auth context", () => {
    const id = getDashboardTenantId({ brokerageId: OID });
    assert.ok(id instanceof Types.ObjectId);
    assert.equal(id.toString(), OID);
  });

  it("rejects a missing or invalid brokerage", () => {
    assert.throws(() => getDashboardTenantId({ brokerageId: null }));
    assert.throws(() => getDashboardTenantId({ brokerageId: "not-an-id" }));
  });
});

describe("dashboard indexes", () => {
  function indexNames(model: typeof TaskModel | typeof ActivityModel) {
    return model.schema.indexes().map(([keys]) => Object.keys(keys).join(","));
  }

  it("indexes tasks by brokerage and overdue flag", () => {
    assert.ok(indexNames(TaskModel).includes("brokerageId,overdue"));
  });

  it("indexes activity by brokerage and recency", () => {
    assert.ok(indexNames(ActivityModel).includes("brokerageId,createdAt"));
  });
});
