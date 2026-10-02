import assert from "node:assert/strict";
import { describe, it } from "node:test";

const { Types } = await import("mongoose");
const { EmailTemplateModel } = await import("../src/models/EmailTemplate.js");
const { LEAD_STAGES } = await import("../src/models/Lead.js");
const {
  SUPPORTED_PLACEHOLDERS,
  extractPlaceholders,
  findUnsupportedPlaceholders,
  validatePlaceholders,
  renderTemplate,
} = await import("../src/utils/emailTemplatePlaceholders.js");
const { parseEmailTemplateInput } = await import(
  "../src/utils/emailTemplateInput.js"
);
const { buildEmailTemplateListFilter, getEmailTemplateTenantId } = await import(
  "../src/utils/emailTemplateQuery.js"
);

describe("email template model", () => {
  it("requires name, subject, body, stage, and brokerage", () => {
    const errors = new EmailTemplateModel({}).validateSync()?.errors;

    assert.ok(errors?.name);
    assert.ok(errors?.subject);
    assert.ok(errors?.body);
    assert.ok(errors?.stage);
    assert.ok(errors?.brokerageId);
  });

  it("defaults to active and validates a complete template", () => {
    const template = new EmailTemplateModel({
      name: "Welcome email",
      subject: "Welcome to the team",
      body: "Hello there",
      stage: "Contacted",
      brokerageId: new Types.ObjectId(),
    });

    assert.equal(template.validateSync(), undefined);
    assert.equal(template.active, true);
  });

  it("rejects a stage outside the pipeline enum", () => {
    const template = new EmailTemplateModel({
      name: "Bad stage",
      subject: "Subject",
      body: "Body",
      stage: "Snoozed",
      brokerageId: new Types.ObjectId(),
    });
    const errors = template.validateSync()?.errors;

    assert.ok(errors?.stage);
  });

  it("indexes templates for brokerage-scoped listing", () => {
    const names = EmailTemplateModel.schema
      .indexes()
      .map(([keys]) => Object.keys(keys).join(","));

    assert.ok(names.includes("brokerageId,stage,active"));
    assert.ok(names.includes("brokerageId,name"));
  });
});

describe("email template placeholders", () => {
  it("exposes exactly the supported placeholder set", () => {
    assert.deepEqual(SUPPORTED_PLACEHOLDERS, [
      "client_name",
      "advisor_name",
      "brokerage_name",
    ]);
  });

  it("extracts placeholder tokens, including whitespace and duplicates", () => {
    assert.deepEqual(
      extractPlaceholders(
        "Hi {{client_name}}, from {{ advisor_name }} and {{client_name}}",
      ),
      ["client_name", "advisor_name", "client_name"],
    );
  });

  it("reports unique unsupported tokens only", () => {
    const unsupported = findUnsupportedPlaceholders(
      "{{client_name}} {{loan_amount}} {{foo}} {{foo}}",
    ).sort();

    assert.deepEqual(unsupported, ["foo", "loan_amount"]);
  });

  it("passes validation when every placeholder is supported", () => {
    assert.equal(
      validatePlaceholders({
        subject: "Hi {{client_name}}",
        body: "From {{advisor_name}} at {{brokerage_name}}",
      }),
      null,
    );
    assert.equal(validatePlaceholders({}), null);
  });

  it("fails validation and names the unsupported placeholder", () => {
    const subjectError = validatePlaceholders({
      subject: "Hi {{first_name}}",
      body: "ok",
    });
    assert.match(subjectError ?? "", /Unsupported placeholder/);
    assert.match(subjectError ?? "", /first_name/);

    assert.match(
      validatePlaceholders({ body: "Balance {{loan_amount}}" }) ?? "",
      /loan_amount/,
    );
  });

  it("renders supported placeholders and leaves the rest intact", () => {
    assert.equal(
      renderTemplate("Hi {{client_name}} from {{ advisor_name }} re {{unknown}}", {
        client_name: "Jordan",
        advisor_name: "Alex",
      }),
      "Hi Jordan from Alex re {{unknown}}",
    );
  });

  it("leaves a placeholder untouched when no value is supplied", () => {
    assert.equal(renderTemplate("{{brokerage_name}}", {}), "{{brokerage_name}}");
  });
});

describe("email template input validation", () => {
  it("accepts and normalizes a full template body", () => {
    const result = parseEmailTemplateInput(
      {
        name: "  Welcome  ",
        subject: "  Hi {{client_name}}  ",
        body: "  Hello {{client_name}}  ",
        stage: "Contacted",
        active: false,
      },
      false,
    );

    assert.ok(result.update);
    assert.equal(result.update.name, "Welcome");
    assert.equal(result.update.subject, "Hi {{client_name}}");
    assert.equal(result.update.body, "Hello {{client_name}}");
    assert.equal(result.update.stage, "Contacted");
    assert.equal(result.update.active, false);
  });

  it("requires the core fields when creating", () => {
    assert.match(
      parseEmailTemplateInput({}, false).error ?? "",
      /name is required/,
    );
    assert.match(
      parseEmailTemplateInput({ name: "x" }, false).error ?? "",
      /subject is required/,
    );
  });

  it("rejects unknown and server-managed fields", () => {
    assert.match(
      parseEmailTemplateInput({ name: "x", color: "red" }, false).error ?? "",
      /Unsupported field/,
    );
    assert.match(
      parseEmailTemplateInput(
        { name: "x", brokerageId: "507f1f77bcf86cd799439011" },
        false,
      ).error ?? "",
      /assigned by the server/,
    );
  });

  it("enforces the stage enum", () => {
    assert.match(
      parseEmailTemplateInput(
        { name: "x", subject: "s", body: "b", stage: "Nope" },
        false,
      ).error ?? "",
      /stage must be one of/,
    );
  });

  it("requires active to be a boolean", () => {
    assert.match(
      parseEmailTemplateInput({ active: "yes" }, true).error ?? "",
      /active must be a boolean/,
    );
  });

  it("rejects unsupported placeholders before saving", () => {
    assert.match(
      parseEmailTemplateInput(
        { name: "x", subject: "Hi {{first_name}}", body: "ok", stage: "New" },
        false,
      ).error ?? "",
      /Unsupported placeholder/,
    );
    assert.match(
      parseEmailTemplateInput({ body: "Balance {{loan_amount}}" }, true).error ??
        "",
      /Unsupported placeholder/,
    );
  });

  it("accepts supported placeholders in subject and body", () => {
    const result = parseEmailTemplateInput(
      {
        subject: "Hi {{client_name}}",
        body: "From {{advisor_name}} at {{brokerage_name}}",
      },
      true,
    );

    assert.equal(result.error, undefined);
    assert.ok(result.update);
  });

  it("supports partial updates and rejects empty ones", () => {
    assert.match(
      parseEmailTemplateInput({}, true).error ?? "",
      /At least one editable field/,
    );
    assert.equal(
      parseEmailTemplateInput({ active: true }, true).update?.active,
      true,
    );
  });

  it("enforces length limits", () => {
    assert.match(
      parseEmailTemplateInput({ name: "a".repeat(161) }, true).error ?? "",
      /name exceeds 160 characters/,
    );
    assert.match(
      parseEmailTemplateInput({ subject: "a".repeat(201) }, true).error ?? "",
      /subject exceeds 200 characters/,
    );
  });
});

describe("email template tenant query construction", () => {
  it("resolves a valid brokerage id and rejects invalid ones", () => {
    const id = getEmailTemplateTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });

    assert.equal(id.toString(), "507f1f77bcf86cd799439011");
    assert.throws(() => getEmailTemplateTenantId({ brokerageId: null }));
    assert.throws(() => getEmailTemplateTenantId({ brokerageId: "not-an-id" }));
  });

  it("binds list filters to the brokerage and supplied criteria", () => {
    const brokerageId = getEmailTemplateTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });
    const filter = buildEmailTemplateListFilter({
      brokerageId,
      stage: "Contacted",
      active: true,
      search: "welcome",
    });

    assert.equal(filter.brokerageId.toString(), brokerageId.toString());
    assert.equal(filter.stage, "Contacted");
    assert.equal(filter.active, true);
    assert.equal(filter.$or?.[0]?.name?.test("Welcome email"), true);
    assert.equal(filter.$or?.[1]?.subject?.test("A welcome note"), true);
  });

  it("treats active=false distinctly from an absent filter", () => {
    const brokerageId = getEmailTemplateTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });

    assert.equal(
      buildEmailTemplateListFilter({ brokerageId, active: false }).active,
      false,
    );
    assert.equal(
      buildEmailTemplateListFilter({ brokerageId }).active,
      undefined,
    );
  });

  it("treats search input as literal text rather than a regex", () => {
    const brokerageId = getEmailTemplateTenantId({
      brokerageId: "507f1f77bcf86cd799439011",
    });
    const filter = buildEmailTemplateListFilter({ brokerageId, search: "a.b+" });

    assert.equal(filter.$or?.[0]?.name?.test("a.b+ template"), true);
    assert.equal(filter.$or?.[0]?.name?.test("axbx"), false);
  });

  it("keeps the configured stages available to templates", () => {
    assert.ok(LEAD_STAGES.includes("Contacted"));
    assert.ok(LEAD_STAGES.length > 0);
  });
});
