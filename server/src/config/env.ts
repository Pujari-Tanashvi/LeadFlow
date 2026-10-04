import "dotenv/config";

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

const emailPort = process.env.EMAIL_SMTP_PORT
  ? Number(process.env.EMAIL_SMTP_PORT)
  : undefined;

const nodeEnv = process.env.NODE_ENV ?? "development";

// In a single-service deployment the browser is served from the same origin as
// the API, so the allowed origin is the deployment URL. Render injects that as
// RENDER_EXTERNAL_URL, which we fall back to when FRONTEND_ORIGIN is not set.
const frontendOrigin =
  process.env.FRONTEND_ORIGIN ??
  process.env.RENDER_EXTERNAL_URL ??
  "http://localhost:3000";

export const env = {
  port,
  nodeEnv,
  isProduction: nodeEnv === "production",
  // Serve the built frontend from Express when running the production bundle
  // (one web service hosts the API, the static app and the Socket.IO channel).
  serveClient:
    nodeEnv === "production" || process.env.SERVE_CLIENT === "true",
  frontendOrigin,
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
