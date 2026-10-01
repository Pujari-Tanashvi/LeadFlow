import {
  normalizeEmail,
  normalizeLeadName,
  normalizePhone,
} from "./leadIdentity.js";

const acceptedFields = [
  "name",
  "email",
  "phone",
  "source",
  "propertyType",
  "loanAmount",
] as const;

export interface ExternalLeadInput {
  name: string;
  email: string;
  phone: string;
  source: string;
  propertyType: string;
  loanAmount: number;
  nameNormalized: string;
  emailNormalized: string;
  phoneNormalized: string;
}

export type ExternalLeadInputResult =
  | { input: ExternalLeadInput; error?: never }
  | { input?: never; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function parseExternalLeadInput(
  value: unknown,
): ExternalLeadInputResult {
  if (!isRecord(value)) return { error: "A JSON object is required." };

  const unsupported = Object.keys(value).find(
    (field) =>
      !acceptedFields.includes(field as (typeof acceptedFields)[number]),
  );
  if (unsupported) return { error: `Unsupported field: ${unsupported}.` };

  const stringFields = [
    "name",
    "email",
    "phone",
    "source",
    "propertyType",
  ] as const;
  const normalizedStrings: Partial<
    Record<(typeof stringFields)[number], string>
  > = {};

  for (const field of stringFields) {
    const candidate = value[field];
    if (typeof candidate !== "string" || !candidate.trim()) {
      return { error: `${field} is required and must be a non-empty string.` };
    }
    normalizedStrings[field] = candidate.trim();
  }

  const name = normalizedStrings.name!;
  const email = normalizeEmail(normalizedStrings.email!);
  const phone = normalizedStrings.phone!;
  const source = normalizedStrings.source!;
  const propertyType = normalizedStrings.propertyType!;
  const loanAmount = value.loanAmount;

  if (name.length > 160) return { error: "name exceeds 160 characters." };
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { error: "email must be a valid email address." };
  }
  if (phone.length > 40 || !normalizePhone(phone)) {
    return {
      error: "phone must contain digits and be no more than 40 characters.",
    };
  }
  if (source.length > 100) return { error: "source exceeds 100 characters." };
  if (propertyType.length > 100) {
    return { error: "propertyType exceeds 100 characters." };
  }
  if (
    typeof loanAmount !== "number" ||
    !Number.isFinite(loanAmount) ||
    loanAmount < 0
  ) {
    return { error: "loanAmount must be a non-negative number." };
  }

  return {
    input: {
      name,
      email,
      phone,
      source,
      propertyType,
      loanAmount,
      nameNormalized: normalizeLeadName(name),
      emailNormalized: email,
      phoneNormalized: normalizePhone(phone),
    },
  };
}
