import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { Types } = await import("mongoose");
const {
  TaskModel,
  TASK_STATUSES,
  TASK_PRIORITIES,
  TASK_SOURCES,
  ACTIVE_TASK_STATUSES,
} = await import("../src/models/Task.js");
const { parseTaskInput } = await import("../src/utils/taskInput.js");
const { buildTaskListFilter, getTaskTenantId } = await import(
  "../src/utils/taskQuery.js"
);
const { isTaskOverdue, overdueResetFilter, overdueScanFilter } = await import(
  "../src/utils/taskOverdue.js"
);
const {
  PIPELINE_AUTOMATION_RULES,
  buildAutomationKey,
  computeDueDate,
  rulesForStage,
} = await import("../src/config/pipelineAutomation.js");
const { LEAD_STAGES } = await import("../src/models/Lead.js");

describe("task model", () => {
  it("requires a title, creator, and brokerage", () => {
    const errors = new TaskModel({}).validateSync()?.errors;

    assert.ok(errors?.title);
    assert.ok(errors?.createdBy);
    assert.ok(errors?.brokerageId);
  });

  it("applies sensible lifecycle defaults", () => {
    const task = new TaskModel({
      title: "Call borrower",
      createdBy: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
    });

    assert.equal(task.validateSync(), undefined);
    assert.equal(task.status, "Open");
    assert.equal(task.priority, "Medium");
    assert.equal(task.overdue, false);
    assert.equal(task.source, "manual");
    assert.equal(task.completedAt, null);
  });

  it("exposes the expected status, priority, and source enums", () => {
    assert.deepEqual(TASK_STATUSES, [
      "Open",
      "In Progress",
      "Completed",
      "Cancelled",
    ]);
    assert.deepEqual(TASK_PRIORITIES, ["Low", "Medium", "High", "Urgent"]);
    assert.deepEqual(TASK_SOURCES, ["manual", "automation"]);
    assert.deepEqual(ACTIVE_TASK_STATUSES, ["Open", "In Progress"]);
  });

  it("rejects out-of-enum status and priority values", () => {
    const task = new TaskModel({
      title: "Bad",
      createdBy: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      status: "Snoozed",
      priority: "Critical",
    });
    const errors = task.validateSync()?.errors;

    assert.ok(errors?.status);
    assert.ok(errors?.priority);
  });

  it("validates automation-created tasks", () => {
    const task = new TaskModel({
      title: "Send document request to borrower",
      createdBy: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      source: "automation",
      automationKey: "lead:rule",
      priority: "High",
      dueDate: new Date(),
    });

    assert.equal(task.validateSync(), undefined);
    assert.equal(task.source, "automation");
  });

  it("indexes tasks for brokerage-scoped listing and dedup", () => {
    const indexes = TaskModel.schema.indexes();
    const names = indexes.map(([keys]) => Object.keys(keys).join(","));

    assert.ok(names.includes("brokerageId,status,dueDate"));
    assert.ok(names.includes("brokerageId,assignedAdvisor,status"));
    assert.ok(names.includes("brokerageId,leadId"));

    const automationIndex = indexes.find(
      ([keys]) => Object.keys(keys).join(",") === "brokerageId,automationKey",
    );
    assert.ok(automationIndex);
    assert.equal(automationIndex?.[1]?.unique, true);
    assert.ok(automationIndex?.[1]?.partialFilterExpression);
  });
});

describe("task input validation", () => {
  it("accepts and normalizes a full task body", () => {
    const result = parseTaskInput(
      {
        title: "  Call borrower  ",
        priority: "High",
        status: "Open",
        dueDate: "2026-10-10T00:00:00.000Z",
        leadId: "507f1f77bcf86cd799439011",
        clientId: null,
        assignedAdvisor: "507f1f77bcf86cd799439012",
      },
      false,
    );

    assert.ok(result.update);
    assert.equal(result.update.title, "Call borrower");
    assert.equal(result.update.priority, "High");
    assert.equal(result.update.status, "Open");
    assert.ok(result.update.dueDate instanceof Date);
    assert.equal(result.update.leadId, "507f1f77bcf86cd799439011");
    assert.equal(result.update.clientId, null);
    assert.equal(result.update.assignedAdvisor, "507f1f77bcf86cd799439012");
  });

  it("requires a title when creating", () => {
    assert.match(
      parseTaskInput({ priority: "High" }, false).error ?? "",
      /title is required/,
    );
  });

  it("rejects unknown and server-managed fields", () => {
    assert.match(
      parseTaskInput({ title: "x", color: "red" }, false).error ?? "",
      /Unsupported field/,
    );
    assert.match(
      parseTaskInput(
        { title: "x", brokerageId: "507f1f77bcf86cd799439011" },
        false,
      ).error ?? "",
      /assigned by the server/,
    );
    assert.match(
      parseTaskInput({ title: "x", overdue: true }, false).error ?? "",
      /assigned by the server/,
    );
    assert.match(
      parseTaskInput({ title: "x", createdBy: "507f1f77bcf86cd799439011" }, false)
        .error ?? "",
      /assigned by the server/,
    );
  });

  it("validates due dates and identifiers", () => {
    assert.match(
      parseTaskInput({ title: "x", dueDate: "not-a-date" }, false).error ?? "",
      /dueDate must be a valid date/,
    );
    assert.match(
      parseTaskInput({ title: "x", dueDate: {} }, false).error ?? "",
      /dueDate must be a date string or null/,
    );
    assert.equal(
      parseTaskInput({ title: "x", dueDate: null }, false).update?.dueDate,
      null,
    );
    assert.match(
      parseTaskInput({ title: "x", leadId: "nope" }, false).error ?? "",
      /leadId must be a valid ID/,
    );
    assert.equal(
      parseTaskInput({ title: "x", assignedAdvisor: "" }, false).update
        ?.assignedAdvisor,
      null,
    );
  });

  it("enforces status and priority enums", () => {
    assert.match(
      parseTaskInput({ title: "x", status: "Nope" }, false).error ?? "",
      /status must be one of/,
    );
    assert.match(
      parseTaskInput({ title: "x", priority: "Huge" }, false).error ?? "",
      /priority must be one of/,
    );
  });

  it("supports partial updates and rejects empty ones", () => {
    assert.match(
      parseTaskInput({}, true).error ?? "",
      /At least one editable field/,
    );
    assert.equal(
      parseTaskInput({ status: "Completed" }, true).update?.status,
      "Completed",
    );
  });
});

describe("task tenant query construction", () => {
  it("resolves a valid brokerage id and rejects invalid ones", () => {
    const id = getTaskTenantId({ brokerageId: "507f1f77bcf86cd799439011" });

    assert.equal(id.toString(), "507f1f77bcf86cd799439011");
    assert.throws(() => getTaskTenantId({ brokerageId: null }));
    assert.throws(() => getTaskTenantId({ brokerageId: "not-an-id" }));
  });

  it("binds list filters to the brokerage and supplied criteria", () => {
    const brokerageId = getTaskTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });
    const advisorId = new Types.ObjectId("507f1f77bcf86cd799439012");
    const leadId = new Types.ObjectId("507f1f77bcf86cd799439013");
    const filter = buildTaskListFilter({
      brokerageId,
      status: "Open",
      priority: "High",
      assignedAdvisor: advisorId,
      leadId,
      overdue: true,
      search: "call",
    });

    assert.equal(filter.brokerageId.toString(), brokerageId.toString());
    assert.equal(filter.status, "Open");
    assert.equal(filter.priority, "High");
    assert.equal(filter.assignedAdvisor, advisorId);
    assert.equal(filter.leadId, leadId);
    assert.equal(filter.overdue, true);
    assert.equal(filter.$or?.[0]?.title?.test("Call the borrower"), true);
    assert.equal(filter.$or?.[0]?.title?.test("email only"), false);
  });

  it("treats overdue=false distinctly from an absent filter", () => {
    const brokerageId = getTaskTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });

    assert.equal(buildTaskListFilter({ brokerageId, overdue: false }).overdue, false);
    assert.equal(buildTaskListFilter({ brokerageId }).overdue, undefined);
  });

  it("treats search input as literal text rather than a regex", () => {
    const brokerageId = getTaskTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });
    const filter = buildTaskListFilter({ brokerageId, search: "a.b+" });

    assert.equal(filter.$or?.[0]?.title?.test("a.b+ review"), true);
    assert.equal(filter.$or?.[0]?.title?.test("axbx"), false);
  });
});

describe("overdue task detection", () => {
  const now = new Date("2026-10-02T12:00:00.000Z");
  const past = new Date("2026-10-01T00:00:00.000Z");
  const future = new Date("2026-10-05T00:00:00.000Z");

  it("flags only active, past-due tasks", () => {
    assert.equal(isTaskOverdue({ status: "Open", dueDate: past }, now), true);
    assert.equal(
      isTaskOverdue({ status: "In Progress", dueDate: past }, now),
      true,
    );
    assert.equal(
      isTaskOverdue({ status: "Completed", dueDate: past }, now),
      false,
    );
    assert.equal(
      isTaskOverdue({ status: "Cancelled", dueDate: past }, now),
      false,
    );
    assert.equal(isTaskOverdue({ status: "Open", dueDate: future }, now), false);
    assert.equal(isTaskOverdue({ status: "Open", dueDate: null }, now), false);
  });

  it("builds worker scan and reset filters", () => {
    const scan = overdueScanFilter(now);
    assert.deepEqual(scan.status, { $in: ["Open", "In Progress"] });
    assert.equal(scan.overdue, false);
    assert.equal(scan.dueDate.$ne, null);
    assert.equal(scan.dueDate.$lt, now);

    const reset = overdueResetFilter(now);
    assert.equal(reset.overdue, true);
    assert.ok(Array.isArray(reset.$or));
    assert.equal(reset.$or.length, 3);
  });
});

describe("pipeline task automation", () => {
  it("configures tasks for pipeline stages that need follow-up", () => {
    assert.equal(rulesForStage("Contacted").length, 1);
    assert.equal(rulesForStage("Qualified").length, 1);
    assert.equal(rulesForStage("New").length, 0);
    assert.equal(rulesForStage("Lost").length, 0);

    const rule = rulesForStage("Contacted")[0];
    assert.equal(rule?.stage, "Contacted");
    assert.ok((rule?.title.length ?? 0) > 0);
  });

  it("computes due dates relative to stage entry", () => {
    const entered = new Date("2026-10-02T00:00:00.000Z");
    const due = computeDueDate(entered, 2);

    assert.equal(due.getTime() - entered.getTime(), 2 * 24 * 60 * 60 * 1000);
  });

  it("builds a deterministic dedup key per lead and rule", () => {
    assert.equal(buildAutomationKey("lead1", "ruleA"), "lead1:ruleA");
    assert.equal(
      buildAutomationKey("lead1", "ruleA"),
      buildAutomationKey("lead1", "ruleA"),
    );
    assert.notEqual(
      buildAutomationKey("lead1", "ruleA"),
      buildAutomationKey("lead2", "ruleA"),
    );
  });

  it("keeps every rule valid and uniquely identified", () => {
    for (const rule of PIPELINE_AUTOMATION_RULES) {
      assert.ok(LEAD_STAGES.includes(rule.stage));
      assert.ok(TASK_PRIORITIES.includes(rule.priority));
      assert.ok(rule.dueInDays > 0);
      assert.ok(rule.ruleId.length > 0);
    }

    const ruleIds = PIPELINE_AUTOMATION_RULES.map((rule) => rule.ruleId);
    assert.equal(new Set(ruleIds).size, ruleIds.length);
  });
});
