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
  "nationality",
  "targetCity",
  "employmentStatus",
  "propertyPriceEur",
  "loanAmount",
] as const;

export interface ExternalLeadInput {
  name: string;
  email: string;
  phone: string;
  source: string;
  propertyType: string;
  nationality: string;
  targetCity: string;
  employmentStatus: string;
  propertyPriceEur: number | null;
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

  // Optional presentation fields: accepted when present, ignored when absent.
  const optionalText = (field: string): string | null => {
    const candidate = value[field];
    if (candidate === undefined || candidate === null) return null;
    if (typeof candidate !== "string") {
      throw new Error(`${field} must be a string when provided.`);
    }
    const trimmed = candidate.trim();
    if (trimmed.length > 100) {
      throw new Error(`${field} exceeds 100 characters.`);
    }
    return trimmed;
  };

  let nationality = "";
  let targetCity = "";
  let employmentStatus = "";
  let propertyPriceEur: number | null = null;
  try {
    nationality = optionalText("nationality") ?? "";
    targetCity = optionalText("targetCity") ?? "";
    employmentStatus = optionalText("employmentStatus") ?? "";
  } catch (error) {
    return { error: (error as Error).message };
  }

  const rawPropertyPrice = value.propertyPriceEur;
  if (rawPropertyPrice !== undefined && rawPropertyPrice !== null) {
    if (
      typeof rawPropertyPrice !== "number" ||
      !Number.isFinite(rawPropertyPrice) ||
      rawPropertyPrice < 0
    ) {
      return { error: "propertyPriceEur must be a non-negative number." };
    }
    propertyPriceEur = rawPropertyPrice;
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
      nationality,
      targetCity,
      employmentStatus,
      propertyPriceEur,
      loanAmount,
      nameNormalized: normalizeLeadName(name),
      emailNormalized: email,
      phoneNormalized: normalizePhone(phone),
    },
  };
}
