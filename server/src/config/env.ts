import "dotenv/config";

const port = Number(process.env.PORT ?? 4000);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error("PORT must be an integer between 1 and 65535.");
}

export const env = {
  port,
  frontendOrigin: process.env.FRONTEND_ORIGIN ?? "http://localhost:3000",
  mongoUri: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET,
  leadWebhookSecret: process.env.LEAD_WEBHOOK_SECRET,
  leadWebhookBrokerageId: process.env.LEAD_WEBHOOK_BROKERAGE_ID,
};
