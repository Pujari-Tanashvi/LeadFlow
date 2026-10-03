/**
 * Interview helper — inspect and adjust user accounts.
 *
 * Roles are server-authoritative on purpose: the navbar role dropdown is
 * `disabled`, and there is deliberately no HTTP endpoint that can escalate a
 * role. That is the right security posture, but it means you cannot create the
 * second "advisor" seat an interviewer might ask about from inside the UI.
 *
 * This script talks straight to MongoDB so you can prepare demo accounts
 * without weakening the API. It reuses the application's own bcrypt cost, so
 * a password created here signs in through the normal login form.
 *
 * Usage:
 *   node scripts/user-admin.mjs list
 *   node scripts/user-admin.mjs create-advisor <brokerageId> <email> <fullName> <password>
 *   node scripts/user-admin.mjs set-role <email> <platform_admin|brokerage_admin|advisor|client> [brokerageId]
 *   node scripts/user-admin.mjs remove <email>
 */
import "dotenv/config";
import mongoose from "mongoose";
import bcrypt from "bcrypt";
import process from "node:process";

const [, , command, ...args] = process.argv;

const VALID_ROLES = ["platform_admin", "brokerage_admin", "advisor", "client"];

function usage() {
  console.error(
    [
      "Usage:",
      "  node scripts/user-admin.mjs list",
      "  node scripts/user-admin.mjs create-advisor <brokerageId> <email> <fullName> <password>",
      "  node scripts/user-admin.mjs set-role <email> " +
        "<platform_admin|brokerage_admin|advisor|client> [brokerageId]",
      "  node scripts/user-admin.mjs remove <email>",
    ].join("\n"),
  );
}

async function connect() {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    console.error("MONGODB_URI is not set. Is .env present in the project root?");
    process.exit(1);
  }
  await mongoose.connect(uri);
  return mongoose.connection.db;
}

async function listUsers() {
  const db = await connect();
  const users = await db
    .collection("users")
    .find({}, { projection: { passwordHash: 0 } })
    .sort({ createdAt: 1 })
    .toArray();
  console.log(`${users.length} user(s):\n`);
  for (const user of users) {
    const brokerage = user.brokerageId ? user.brokerageId.toString() : "(none)";
    console.log(
      `  ${user.role.padEnd(16)} ${user.email.padEnd(34)} brokerage=${brokerage}`,
    );
  }
  await mongoose.disconnect();
}

async function createAdvisor(brokerageId, email, fullName, password) {
  const db = await connect();
  if (!mongoose.Types.ObjectId.isValid(brokerageId)) {
    console.error("brokerageId must be a valid MongoDB ID.");
    process.exit(1);
  }
  const brokerage = await db
    .collection("brokerages")
    .findOne({ _id: new mongoose.Types.ObjectId(brokerageId) });
  if (!brokerage) {
    console.error(`No brokerage with id ${brokerageId}.`);
    process.exit(1);
  }

  const normalizedEmail = email.trim().toLowerCase();
  const existing = await db
    .collection("users")
    .findOne({ email: normalizedEmail });
  if (existing) {
    console.error(
      `${normalizedEmail} already exists as ${existing.role}. Use "set-role" instead.`,
    );
    await mongoose.disconnect();
    process.exit(1);
  }

  // Same cost factor as the app's hashPassword (server/src/services/authService.ts).
  const passwordHash = await bcrypt.hash(password, 12);
  const result = await db.collection("users").insertOne({
    email: normalizedEmail,
    fullName: fullName.trim(),
    passwordHash,
    passwordResetRequired: false,
    role: "advisor",
    brokerageId: new mongoose.Types.ObjectId(brokerageId),
    createdAt: new Date(),
    updatedAt: new Date(),
  });

  console.log(`Created advisor ${normalizedEmail} in "${brokerage.name}".`);
  console.log(`  user id: ${result.insertedId.toString()}`);
  console.log("  Sign in at http://localhost:3000 with that email and password.");
  console.log(
    "  Tip: an advisor sees every workspace tab but cannot edit email templates,",
  );
  console.log("  which is the cleanest role difference to demonstrate.");
  await mongoose.disconnect();
}

async function setRole(email, role, brokerageId) {
  const db = await connect();
  const normalizedEmail = email.trim().toLowerCase();
  const user = await db.collection("users").findOne({ email: normalizedEmail });
  if (!user) {
    console.error(`No user with email ${normalizedEmail}.`);
    await mongoose.disconnect();
    process.exit(1);
  }

  const previous = user.role;
  if (previous === role && (role === "platform_admin" || user.brokerageId)) {
    console.log(`${normalizedEmail} is already ${role}.`);
    await mongoose.disconnect();
    return;
  }

  // A platform_admin has no brokerage, so promoting one clears brokerageId.
  // Every other role REQUIRES a brokerage, so demoting a platform_admin has to
  // put one back — otherwise the account authenticates but is locked out of
  // every tenant-scoped route with a 403.
  if (role === "platform_admin") {
    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: { role, updatedAt: new Date() },
        $unset: { brokerageId: "" },
      },
    );
    console.log(`${normalizedEmail}: ${previous} -> ${role} (brokerage cleared)`);
  } else {
    const targetId = brokerageId ?? user.brokerageId;
    if (!targetId || !mongoose.Types.ObjectId.isValid(String(targetId))) {
      console.error(
        `${normalizedEmail} has no brokerage, and the ${role} role requires one.`,
      );
      console.error(
        "  Re-run with a brokerage id:",
      );
      console.error(
        `    node scripts/user-admin.mjs set-role ${normalizedEmail} ${role} <brokerageId>`,
      );
      await mongoose.disconnect();
      process.exit(1);
    }

    const brokerage = await db
      .collection("brokerages")
      .findOne({ _id: new mongoose.Types.ObjectId(String(targetId)) });
    if (!brokerage) {
      console.error(`No brokerage with id ${targetId}.`);
      await mongoose.disconnect();
      process.exit(1);
    }

    await db.collection("users").updateOne(
      { _id: user._id },
      {
        $set: {
          role,
          brokerageId: new mongoose.Types.ObjectId(String(targetId)),
          updatedAt: new Date(),
        },
      },
    );
    console.log(`${normalizedEmail}: ${previous} -> ${role} in "${brokerage.name}"`);
  }

  console.log(
    "  Sign out and back in: the role is re-read from the account on every request.",
  );
  await mongoose.disconnect();
}

async function removeUser(email) {
  const db = await connect();
  const normalizedEmail = email.trim().toLowerCase();
  const result = await db
    .collection("users")
    .deleteOne({ email: normalizedEmail });
  console.log(
    result.deletedCount
      ? `Removed ${normalizedEmail}.`
      : `No user with email ${normalizedEmail}.`,
  );
  await mongoose.disconnect();
}

async function main() {
  if (!command || command === "list") {
    await listUsers();
    return;
  }
  if (command === "create-advisor") {
    const [brokerageId, email, fullName, password] = args;
    if (!brokerageId || !email || !fullName || !password) {
      usage();
      process.exit(1);
    }
    await createAdvisor(brokerageId, email, fullName, password);
    return;
  }
  if (command === "set-role") {
    const [email, role, brokerageId] = args;
    if (!email || !VALID_ROLES.includes(role)) {
      usage();
      process.exit(1);
    }
    await setRole(email, role, brokerageId);
    return;
  }
  if (command === "remove") {
    const [email] = args;
    if (!email) {
      usage();
      process.exit(1);
    }
    await removeUser(email);
    return;
  }
  usage();
  process.exit(1);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});