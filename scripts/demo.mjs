/**
 * Interview demo helper — the client-activation walkthrough.
 *
 * Converting a lead to a client issues a one-time activation token. The UI
 * deliberately does not display it (it exists to be emailed, like a password
 * reset link), so the activation step has to be driven from the API. This
 * script does the whole chain in one shot and prints every response, so you can
 * show the raw HTTP conversation instead of fumbling with copy/paste.
 *
 * Usage:
 *   node scripts/demo.mjs <staff-email> <staff-password> [client-password]
 *
 * Everything is printed as it happens, so it doubles as a talking point.
 */
const [, , STAFF_EMAIL, STAFF_PASSWORD, CLIENT_PASSWORD = "clientpass123"] =
  process.argv;

if (!STAFF_EMAIL || !STAFF_PASSWORD) {
  console.error(
    "Usage: node scripts/demo.mjs <staff-email> <staff-password> [client-password]",
  );
  process.exit(1);
}

const BASE = process.env.BASE_URL ?? "http://localhost:4000";
const JSON_HEADERS = { "Content-Type": "application/json" };

async function call(method, path, { token, body, headers } = {}) {
  const response = await fetch(`${BASE}${path}`, {
    method,
    headers: {
      ...(body ? JSON_HEADERS : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await response.text();
  let payload;
  try {
    payload = text ? JSON.parse(text) : undefined;
  } catch {
    payload = text;
  }
  return { status: response.status, body: payload };
}

function step(n, title) {
  console.log(`\n=== Step ${n}: ${title} ===`);
}

step(1, "Sign in as brokerage staff");
const staff = await call("POST", "/api/auth/login", {
  body: { email: STAFF_EMAIL, password: STAFF_PASSWORD },
});
if (staff.status !== 200) {
  console.error(`Login failed (${staff.status}):`, staff.body?.error);
  process.exit(1);
}
console.log(
  `OK ${staff.status} — ${staff.body.user.fullName} (${staff.body.user.role})`,
);
const staffToken = staff.body.token;

step(2, "List leads and pick one that is not converted yet");
const listed = await call("GET", "/api/leads", { token: staffToken });
if (listed.status !== 200) {
  console.error(`Could not list leads (${listed.status}):`, listed.body?.error);
  process.exit(1);
}
const target = listed.body.leads.find((lead) => !lead.convertedClientId);
console.log(`${listed.body.leads.length} lead(s) in this brokerage.`);
if (!target) {
  console.log(
    "Every lead is already converted. Create or ingest a new lead first (the webhook in INTERVIEW_GUIDE.md §3 does this).",
  );
  process.exit(0);
}
console.log(`Picked: ${target.name} <${target.email}> (${target._id})`);

step(3, "Convert the lead to a client");
const converted = await call("POST", `/api/leads/${target._id}/convert`, {
  token: staffToken,
  body: {},
});
if (converted.status !== 201) {
  console.error(`Convert failed (${converted.status}):`, converted.body?.error);
  process.exit(1);
}
console.log(`OK 201 — lead stage is now "${converted.body.lead.stage}"`);
console.log(`Client dossier: ${converted.body.client._id}`);
const token = converted.body.activation?.token;
if (!token) {
  console.log(
    "No activation token issued — this client already existed, so reuse their existing credentials instead.",
  );
  process.exit(0);
}
console.log(`Activation token (shown exactly once):\n  ${token}`);
console.log(`Expires: ${converted.body.activation.expiresAt}`);

step(4, "Client sets their password with the token");
const activated = await call("POST", "/api/auth/activate-client", {
  body: { activationToken: token, password: CLIENT_PASSWORD },
});
console.log(
  activated.status === 204
    ? "OK 204 — account activated"
    : `FAILED (${activated.status}): ${activated.body?.error}`,
);

step(5, "Client signs in");
const client = await call("POST", "/api/auth/login", {
  body: { email: target.email, password: CLIENT_PASSWORD },
});
console.log(
  client.status === 200
    ? `OK 200 — ${client.body.user.email} (${client.body.user.role})`
    : `FAILED (${client.status}): ${client.body?.error}`,
);
console.log(
  `\nClient credentials for the browser: ${target.email} / ${CLIENT_PASSWORD}`,
);
console.log(
  "Sign in as this client to open the Client Portal tab. Re-running the token is",
  "deliberately impossible: the API stores only a SHA-256 hash, so the raw token",
  "cannot be read back out of the database.",
);