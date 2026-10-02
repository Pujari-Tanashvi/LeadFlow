import { env } from "../config/env.js";

/**
 * A single outbound email handed to the email service abstraction.
 *
 * The automation layer renders placeholders before constructing this, so the
 * values here are final and ready to deliver.
 */
export interface EmailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Provider-agnostic email abstraction. Concrete implementations may send
 * synchronously or enqueue the message for a background worker — callers only
 * depend on this interface, never on a specific provider.
 */
export interface EmailService {
  send(message: EmailMessage): Promise<void>;
}

/**
 * Connection/credentials for the email provider. All values originate from
 * environment variables (see config/env.ts); none are hard-coded.
 */
export interface EmailTransportConfig {
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  from: string;
}

/**
 * Default, dependency-free implementation.
 *
 * It carries the env-provided credentials and records the outbound message to
 * the server log. In production this is the seam where a real transport (SMTP,
 * SES, Postmark, …) would use {@link EmailTransportConfig} to deliver the mail;
 * swapping it in only requires another {@link EmailService} implementation.
 */
export class LogEmailService implements EmailService {
  private readonly config: EmailTransportConfig;

  constructor(config: EmailTransportConfig) {
    this.config = config;
  }

  async send(message: EmailMessage): Promise<void> {
    // Body is intentionally not logged to avoid leaking recipient PII.
    console.info(
      `[email] from=${this.config.from} to=${message.to} ` +
        `subject=${JSON.stringify(message.subject)} ` +
        `transport=${this.config.host ? "configured" : "log-only"}`,
    );
  }
}

/**
 * Build an {@link EmailService} from the given transport config. Centralised so
 * a real provider can be introduced in one place without touching callers.
 */
export function createEmailService(config: EmailTransportConfig): EmailService {
  return new LogEmailService(config);
}

let cachedEmailService: EmailService | undefined;

/** Shared, lazily-constructed email service wired to the environment config. */
export function getEmailService(): EmailService {
  if (!cachedEmailService) {
    cachedEmailService = createEmailService(env.email);
  }
  return cachedEmailService;
}
