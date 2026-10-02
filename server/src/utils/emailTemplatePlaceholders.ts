/**
 * The only template placeholders the system knows how to fill in. Every
 * placeholder used in a template's subject or body must be one of these.
 */
export const SUPPORTED_PLACEHOLDERS = [
  "client_name",
  "advisor_name",
  "brokerage_name",
] as const;

export type SupportedPlaceholder = (typeof SUPPORTED_PLACEHOLDERS)[number];

// Matches {{ token }} allowing optional surrounding whitespace. The token name
// itself is limited to word characters so stray braces are not misread.
const PLACEHOLDER_SOURCE = "\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}";

function isSupported(token: string): token is SupportedPlaceholder {
  return (SUPPORTED_PLACEHOLDERS as readonly string[]).includes(token);
}

/**
 * Extract every placeholder token name used in a string, in order of
 * appearance (duplicates included).
 */
export function extractPlaceholders(text: string): string[] {
  const tokens: string[] = [];
  for (const match of text.matchAll(new RegExp(PLACEHOLDER_SOURCE, "g"))) {
    if (match[1]) tokens.push(match[1]);
  }
  return tokens;
}

/**
 * Return the unique placeholder tokens in a string that are not supported.
 */
export function findUnsupportedPlaceholders(text: string): string[] {
  const unsupported = new Set<string>();
  for (const token of extractPlaceholders(text)) {
    if (!isSupported(token)) unsupported.add(token);
  }
  return [...unsupported];
}

/**
 * Validate that the supplied subject/body only use supported placeholders.
 * Returns an error message when an unsupported placeholder is present, or
 * null when everything checks out.
 */
export function validatePlaceholders(fields: {
  subject?: string;
  body?: string;
}): string | null {
  const unsupported = new Set<string>();
  for (const value of [fields.subject, fields.body]) {
    if (typeof value !== "string") continue;
    for (const token of findUnsupportedPlaceholders(value)) {
      unsupported.add(token);
    }
  }
  if (unsupported.size === 0) return null;

  const offending = [...unsupported].map((token) => `{{${token}}}`).join(", ");
  const supported = SUPPORTED_PLACEHOLDERS.map(
    (token) => `{{${token}}}`,
  ).join(", ");
  return `Unsupported placeholder(s): ${offending}. Supported placeholders are: ${supported}.`;
}

/**
 * Replace supported placeholders in a template string with the provided
 * values. Unknown placeholders and those without a value are left untouched.
 */
export function renderTemplate(
  text: string,
  values: Partial<Record<SupportedPlaceholder, string>>,
): string {
  return text.replace(
    new RegExp(PLACEHOLDER_SOURCE, "g"),
    (whole: string, rawToken: string) => {
      if (isSupported(rawToken) && values[rawToken] !== undefined) {
        return values[rawToken] as string;
      }
      return whole;
    },
  );
}
