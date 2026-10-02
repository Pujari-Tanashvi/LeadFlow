import "dotenv/config";

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const emailPort = process.env.EMAIL_SMTP_PORT
  ? Number(process.env.EMAIL_SMTP_PORT)
  : undefined;

export const env = {
  port,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  leadWebhookSecret: process.env.LEAD_WEBHOOK_SECRET,
  leadWebhookBrokerageId: process.env.LEAD_WEBHOOK_BROKERAGE_ID,
  // Email provider credentials come from the environment only.
  email: {
    host: process.env.EMAIL_SMTP_HOST,
    port:
      emailPort !== undefined && Number.isInteger(emailPort)
        ? emailPort
        : undefined,
    user: process.env.EMAIL_SMTP_USER,
    password: process.env.EMAIL_SMTP_PASSWORD,
    from: process.env.EMAIL_FROM ?? "no-reply@leadflow.local",
  },
};
