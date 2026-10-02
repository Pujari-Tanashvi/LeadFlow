import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { Types } = await import("mongoose");
const { EmailDeliveryModel, EMAIL_DELIVERY_STATUSES } = await import(
  "../src/models/EmailDelivery.js"
);
const { ActivityModel } = await import("../src/models/Activity.js");
const {
  DEFAULT_ADVISOR_NAME,
  buildPipelineEmailDedupeKey,
  buildTemplateValues,
  buildPipelineEmailMessage,
} = await import("../src/utils/pipelineEmail.js");
const { createEmailService, LogEmailService } = await import(
  "../src/services/emailService.js"
);

function captureInfo(run: () => Promise<void>): Promise<string[]> {
  const logs: string[] = [];
  const original = console.info;
  console.info = (message?: unknown) => {
    logs.push(String(message));
  };
  return run()
    .then(() => logs)
    .finally(() => {
      console.info = original;
    });
}

describe("pipeline email helpers", () => {
  it("builds a deterministic dedupe key per lead and stage", () => {
    assert.equal(
      buildPipelineEmailDedupeKey("lead1", "Contacted"),
      "lead1:Contacted",
    );
    assert.equal(
      buildPipelineEmailDedupeKey("lead1", "Contacted"),
      buildPipelineEmailDedupeKey("lead1", "Contacted"),
    );
    assert.notEqual(
      buildPipelineEmailDedupeKey("lead1", "Contacted"),
      buildPipelineEmailDedupeKey("lead1", "Qualified"),
    );
    assert.notEqual(
      buildPipelineEmailDedupeKey("lead1", "Contacted"),
      buildPipelineEmailDedupeKey("lead2", "Contacted"),
    );
  });

  it("resolves every supported placeholder, trimming input", () => {
    const values = buildTemplateValues({
      clientName: "Jordan",
      advisorName: "  Alex  ",
      brokerageName: "  Acme Lending  ",
    });

    assert.equal(values.client_name, "Jordan");
    assert.equal(values.advisor_name, "Alex");
    assert.equal(values.brokerage_name, "Acme Lending");
  });

  it("falls back to a default advisor when none is assigned", () => {
    for (const advisorName of [null, undefined, "", "   "]) {
      const values = buildTemplateValues({
        clientName: "Jordan",
        advisorName,
        brokerageName: "Acme Lending",
      });
      assert.equal(values.advisor_name, DEFAULT_ADVISOR_NAME);
    }
  });

  it("renders subject and body and targets the recipient", () => {
    const message = buildPipelineEmailMessage({
      template: {
        subject: "Hi {{client_name}}",
        body: "From {{advisor_name}} at {{brokerage_name}}",
      },
      recipient: "jordan@example.com",
      values: buildTemplateValues({
        clientName: "Jordan",
        advisorName: "Alex",
        brokerageName: "Acme Lending",
      }),
    });

    assert.equal(message.to, "jordan@example.com");
    assert.equal(message.subject, "Hi Jordan");
    assert.equal(message.body, "From Alex at Acme Lending");
  });

  it("never leaves a supported placeholder unfilled", () => {
    const message = buildPipelineEmailMessage({
      template: { subject: "Hi {{client_name}}", body: "From {{advisor_name}}" },
      recipient: "jordan@example.com",
      values: buildTemplateValues({
        clientName: "Jordan",
        advisorName: null,
        brokerageName: "Acme Lending",
      }),
    });

    assert.equal(message.body, `From ${DEFAULT_ADVISOR_NAME}`);
    assert.ok(!message.body.includes("{{"));
  });
});

describe("email delivery model", () => {
  it("requires the lead, brokerage, template, stage, key, recipient, subject", () => {
    const errors = new EmailDeliveryModel({}).validateSync()?.errors;

    assert.ok(errors?.leadId);
    assert.ok(errors?.brokerageId);
    assert.ok(errors?.templateId);
    assert.ok(errors?.stage);
    assert.ok(errors?.dedupeKey);
    assert.ok(errors?.recipient);
    assert.ok(errors?.subject);
  });

  it("defaults status to pending and validates a complete record", () => {
    const delivery = new EmailDeliveryModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      templateId: new Types.ObjectId(),
      stage: "Contacted",
      dedupeKey: "lead:Contacted",
      recipient: "jordan@example.com",
      subject: "Welcome",
    });

    assert.equal(delivery.validateSync(), undefined);
    assert.equal(delivery.status, "pending");
  });

  it("exposes the delivery status enum", () => {
    assert.deepEqual(EMAIL_DELIVERY_STATUSES, ["pending", "sent", "failed"]);
  });

  it("rejects out-of-enum status and stage values", () => {
    const delivery = new EmailDeliveryModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      templateId: new Types.ObjectId(),
      stage: "Snoozed",
      dedupeKey: "lead:Snoozed",
      recipient: "jordan@example.com",
      subject: "Welcome",
      status: "queued",
    });
    const errors = delivery.validateSync()?.errors;

    assert.ok(errors?.stage);
    assert.ok(errors?.status);
  });

  it("enforces single-send with a unique dedupe index", () => {
    const indexes = EmailDeliveryModel.schema.indexes();
    const names = indexes.map(([keys]) => Object.keys(keys).join(","));

    assert.ok(names.includes("brokerageId,leadId,createdAt"));

    const dedupeIndex = indexes.find(
      ([keys]) => Object.keys(keys).join(",") === "brokerageId,dedupeKey",
    );
    assert.ok(dedupeIndex);
    assert.equal(dedupeIndex?.[1]?.unique, true);
  });
});

describe("email service abstraction", () => {
  it("builds a sendable service from transport config", () => {
    const service = createEmailService({ from: "no-reply@leadflow.local" });
    assert.equal(typeof service.send, "function");
  });

  it("delivers through a configured transport", async () => {
    const logs = await captureInfo(() =>
      new LogEmailService({
        from: "no-reply@leadflow.local",
        host: "smtp.example.com",
      }).send({ to: "jordan@example.com", subject: "Welcome", body: "Hi" }),
    );

    assert.equal(logs.length, 1);
    assert.match(logs[0] ?? "", /to=jordan@example.com/);
    assert.match(logs[0] ?? "", /transport=configured/);
  });

  it("still resolves when no transport credentials are set", async () => {
    const logs = await captureInfo(() =>
      new LogEmailService({ from: "no-reply@leadflow.local" }).send({
        to: "jordan@example.com",
        subject: "Welcome",
        body: "Hi",
      }),
    );

    assert.match(logs[0] ?? "", /transport=log-only/);
  });
});

describe("email_sent activity", () => {
  it("records an email_sent activity without stage fields", () => {
    const activity = new ActivityModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      actorId: new Types.ObjectId(),
      type: "email_sent",
      toStage: "Contacted",
    });

    assert.equal(activity.validateSync(), undefined);
  });

  it("keeps stage fields required for stage-change activities", () => {
    const errors = new ActivityModel({
      leadId: new Types.ObjectId(),
      brokerageId: new Types.ObjectId(),
      actorId: new Types.ObjectId(),
      type: "lead_stage_changed",
    }).validateSync()?.errors;

    assert.ok(errors?.fromStage);
    assert.ok(errors?.toStage);
  });
});
