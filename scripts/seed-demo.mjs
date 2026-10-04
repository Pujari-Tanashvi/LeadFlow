/**
 * Seed a self-contained demo tenant so a deployed LeadFlow has working test
 * logins for every role, plus enough pipeline data to be worth looking at.
 *
 * It is idempotent: re-running updates the same records (same emails, same
 * brokerage) instead of creating duplicates, and resets the demo passwords.
 * It talks straight to MongoDB (like scripts/user-admin.mjs) using the app's
 * own bcrypt cost, so every account signs in through the normal login form.
 *
 * Usage:
 *   MONGODB_URI="mongodb+srv://..." node scripts/seed-demo.mjs
 *   # or, with the project .env present:
 *   npm run seed
 *
 * After it runs, copy the printed Brokerage id into the LEAD_WEBHOOK_BROKERAGE_ID
 * environment variable so the inbound lead webhook is attached to this tenant.
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import process from "node:process";

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "LeadFlowDemo!2026";
const BROKERAGE_NAME = "LeadFlow Demo Brokerage";
const BCRYPT_COST = 12; // Matches hashPassword() in server/src/services/authService.ts.

// Normalizers mirror server/src/utils/leadIdentity.ts so duplicate detection
// behaves exactly as it does for data created through the API.
const normalizeEmail = (v) => v.normalize("NFKC").trim().toLowerCase();
const normalizePhone = (v) => v.normalize("NFKC").replace(/\D/g, "");
const normalizeName = (v) =>
  v
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLowerCase();

const now = () => new Date();

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error(
      "MONGODB_URI is not set. Provide it inline or add it to a .env file in the project root.",
    );
    process.exit(1);
  }
  await mongoose.connect(uri);
  return mongoose.connection.db;
}

/** Upsert a user by email and return its _id. */
async function upsertUser(db, { email, fullName, role, brokerageId }) {
  const normalizedEmail = normalizeEmail(email);
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, BCRYPT_COST);
  const set = {
    email: normalizedEmail,
    fullName,
    passwordHash,
    passwordResetRequired: false,
    role,
    updatedAt: now(),
  };
  // platform_admin has no tenant; every other role requires one.
  if (role === "platform_admin") {
    await db
      .collection("users")
      .updateOne(
        { email: normalizedEmail },
        { $set: set, $unset: { brokerageId: "" }, $setOnInsert: { createdAt: now() } },
        { upsert: true },
      );
  } else {
    set.brokerageId = brokerageId;
    await db
      .collection("users")
      .updateOne(
        { email: normalizedEmail },
        { $set: set, $setOnInsert: { createdAt: now() } },
        { upsert: true },
      );
  }
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  return user._id;
}

/** Upsert a lead by (brokerageId, email) and return its _id. */
async function upsertLead(db, brokerageId, lead) {
  const email = normalizeEmail(lead.email);
  const set = {
    name: lead.name,
    email,
    emailNormalized: email,
    phone: lead.phone,
    phoneNormalized: normalizePhone(lead.phone),
    nameNormalized: normalizeName(lead.name),
    source: lead.source,
    propertyType: lead.propertyType,
    nationality: lead.nationality ?? "",
    targetCity: lead.targetCity ?? "",
    employmentStatus: lead.employmentStatus ?? "",
    propertyPriceEur: lead.propertyPriceEur ?? null,
    loanAmount: lead.loanAmount,
    assignedAdvisor: lead.assignedAdvisor ?? null,
    stage: lead.stage,
    convertedClientId: lead.convertedClientId ?? null,
    convertedAt: lead.convertedAt ?? null,
    brokerageId,
    updatedAt: now(),
  };
  await db
    .collection("leads")
    .updateOne(
      { brokerageId, email },
      { $set: set, $setOnInsert: { createdAt: now() } },
      { upsert: true },
    );
  const doc = await db.collection("leads").findOne({ brokerageId, email });
  return doc._id;
}

async function main() {
  const db = await connect();

  // 1) Brokerage (tenant).
  await db
    .collection("brokerages")
    .updateOne(
      { name: BROKERAGE_NAME },
      { $set: { name: BROKERAGE_NAME, status: "active", updatedAt: now() }, $setOnInsert: { createdAt: now() } },
      { upsert: true },
    );
  const brokerage = await db
    .collection("brokerages")
    .findOne({ name: BROKERAGE_NAME });
  const brokerageId = brokerage._id;

  // 2) One account per role.
  const platformAdminId = await upsertUser(db, {
    email: "platform@leadflow.demo",
    fullName: "Priya Platform",
    role: "platform_admin",
  });
  const adminId = await upsertUser(db, {
    email: "admin@leadflow.demo",
    fullName: "Amina Admin",
    role: "brokerage_admin",
    brokerageId,
  });
  const advisorId = await upsertUser(db, {
    email: "advisor@leadflow.demo",
    fullName: "Alex Advisor",
    role: "advisor",
    brokerageId,
  });
  const clientUserId = await upsertUser(db, {
    email: "client@leadflow.demo",
    fullName: "Carla Client",
    role: "client",
    brokerageId,
  });

  // 3) Client dossier for the client account (links the login to a case).
  const clientEmail = normalizeEmail("client@leadflow.demo");
  const clientPhone = "+49 170 1112223";
  await db.collection("clients").updateOne(
    { brokerageId, userId: clientUserId },
    {
      $set: {
        userId: clientUserId,
        brokerageId,
        email: clientEmail,
        emailNormalized: clientEmail,
        fullName: "Carla Client",
        phone: clientPhone,
        phoneNormalized: normalizePhone(clientPhone),
        advisorIds: [advisorId],
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now(), leadIds: [] },
    },
    { upsert: true },
  );
  const clientDossier = await db
    .collection("clients")
    .findOne({ brokerageId, userId: clientUserId });
  const clientId = clientDossier._id;

  // 4) Pipeline leads across the stages, all owned by the demo advisor.
  const leads = [
    { name: "Lukas Weber", email: "lukas.weber@example.com", phone: "+49 151 2003001", source: "Website", propertyType: "Apartment", nationality: "German", targetCity: "Berlin", employmentStatus: "Employed", propertyPriceEur: 420000, loanAmount: 336000, stage: "New", assignedAdvisor: advisorId },
    { name: "Sofia Rossi", email: "sofia.rossi@example.com", phone: "+49 151 2003002", source: "Referral", propertyType: "Condo", nationality: "Italian", targetCity: "Munich", employmentStatus: "Self-employed", propertyPriceEur: 560000, loanAmount: 448000, stage: "Contacted", assignedAdvisor: advisorId },
    { name: "Mateusz Nowak", email: "mateusz.nowak@example.com", phone: "+49 151 2003003", source: "Portal", propertyType: "House", nationality: "Polish", targetCity: "Frankfurt", employmentStatus: "Employed", propertyPriceEur: 610000, loanAmount: 500000, stage: "Qualified", assignedAdvisor: advisorId },
    { name: "Elena Petrova", email: "elena.petrova@example.com", phone: "+49 151 2003004", source: "Website", propertyType: "Apartment", nationality: "Bulgarian", targetCity: "Berlin", employmentStatus: "Employed", propertyPriceEur: 380000, loanAmount: 304000, stage: "Documents", assignedAdvisor: advisorId },
    { name: "Diego Fernandez", email: "diego.fernandez@example.com", phone: "+49 151 2003005", source: "Referral", propertyType: "Condo", nationality: "Spanish", targetCity: "Hamburg", employmentStatus: "Employed", propertyPriceEur: 495000, loanAmount: 400000, stage: "In Review", assignedAdvisor: advisorId },
    { name: "Hiroshi Tanaka", email: "hiroshi.tanaka@example.com", phone: "+49 151 2003006", source: "Portal", propertyType: "Apartment", nationality: "Japanese", targetCity: "Munich", employmentStatus: "Employed", propertyPriceEur: 530000, loanAmount: 420000, stage: "Lost", assignedAdvisor: advisorId },
  ];
  for (const lead of leads) {
    await upsertLead(db, brokerageId, lead);
  }

  // The converted lead is the client's own case: Won + linked to the dossier.
  const convertedLeadId = await upsertLead(db, brokerageId, {
    name: "Carla Client",
    email: "client@leadflow.demo",
    phone: clientPhone,
    source: "Referral",
    propertyType: "Apartment",
    nationality: "Mexican",
    targetCity: "Berlin",
    employmentStatus: "Employed",
    propertyPriceEur: 450000,
    loanAmount: 360000,
    stage: "Won",
    assignedAdvisor: advisorId,
    convertedClientId: clientId,
    convertedAt: now(),
  });
  await db
    .collection("clients")
    .updateOne(
      { _id: clientId },
      { $addToSet: { leadIds: convertedLeadId } },
    );

  // 5) A welcome email template wired to the New stage (shows placeholders).
  await db.collection("emailtemplates").updateOne(
    { brokerageId, name: "Welcome — New Lead" },
    {
      $set: {
        name: "Welcome — New Lead",
        subject: "Welcome to {{brokerage_name}}, {{client_name}}",
        body:
          "Hi {{client_name}},\n\nThank you for your mortgage enquiry. I'm {{advisor_name}} " +
          "and I'll be your advisor at {{brokerage_name}}. I'll be in touch shortly to get started.\n\n" +
          "Best regards,\n{{advisor_name}}",
        stage: "New",
        active: true,
        brokerageId,
        updatedAt: now(),
      },
      $setOnInsert: { createdAt: now() },
    },
    { upsert: true },
  );

  // Summary.
  console.log("\n✓ LeadFlow demo tenant is ready.\n");
  console.log(`Brokerage: ${BROKERAGE_NAME}`);
  console.log(`Brokerage id (set as LEAD_WEBHOOK_BROKERAGE_ID): ${brokerageId.toString()}\n`);
  console.log("Test logins (same password for all):");
  console.log(`  password: ${DEMO_PASSWORD}\n`);
  console.log("  platform_admin   platform@leadflow.demo");
  console.log("  brokerage_admin  admin@leadflow.demo");
  console.log("  advisor          advisor@leadflow.demo");
  console.log("  client           client@leadflow.demo");
  console.log(
    `\nSeeded ${leads.length + 1} leads (incl. 1 converted client) for ${BROKERAGE_NAME}.`,
  );
  console.log("Ids:");
  console.log(`  platform_admin user: ${platformAdminId.toString()}`);
  console.log(`  brokerage_admin user: ${adminId.toString()}`);
  console.log(`  advisor user: ${advisorId.toString()}`);
  console.log(`  client user: ${clientUserId.toString()}  dossier: ${clientId.toString()}`);

  await mongoose.disconnect();
}

main().catch(async (error) => {
  console.error("Seed failed:", error);
  await mongoose.disconnect().catch(() => undefined);
  process.exitCode = 1;
});
