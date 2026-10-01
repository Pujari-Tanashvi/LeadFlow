import { createServer } from "node:http";
import { app } from "./app.js";
import { connectToDatabase } from "./config/database.js";
import { env } from "./config/env.js";
import { assertJwtConfiguration } from "./services/authService.js";
import { backfillLeadIdentityFields } from "./services/leadIdentityService.js";
import { attachSockets } from "./sockets/index.js";

const httpServer = createServer(app);

async function startServer(): Promise<void> {
  if (!env.mongoUri) {
    throw new Error("MONGODB_URI must be set before starting the API.");
  }

  assertJwtConfiguration();
  await connectToDatabase(env.mongoUri);
  const migratedLeadCount = await backfillLeadIdentityFields();
  if (migratedLeadCount > 0) {
    console.info(
      `Normalized identity fields for ${migratedLeadCount} existing leads.`,
    );
  }
  attachSockets(httpServer, env.frontendOrigin);
  httpServer.listen(env.port, () => {
    console.info(`LeadFlow API listening on http://localhost:${env.port}`);
  });
}

startServer().catch((error: unknown) => {
  console.error("API startup failed:", error);
  process.exitCode = 1;
});
