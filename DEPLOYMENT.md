# Deploying LeadFlow (MongoDB Atlas + Render)

LeadFlow runs as a **single web service**: one Node process serves the Express
API, the built React app, and the Socket.IO live channel on the same origin.
That keeps deployment simple and avoids any cross-origin/websocket setup.

You deploy in five steps:

1. Create a MongoDB Atlas database.
2. Create the Render web service from this repo.
3. Let the first deploy build and boot.
4. Seed the demo tenant (gives you logins for every role).
5. Point the inbound-lead webhook at the seeded brokerage.

Everything below uses the free tiers of both services.

---

## 1. MongoDB Atlas (free M0 cluster)

1. Sign in at <https://cloud.mongodb.com> and create a project.
2. **Build a Database → M0 (Free)**. Pick any provider/region and create it.
3. **Database Access → Add New Database User.** Choose password auth, set a
   username and a strong password, and give it **Read and write to any
   database**. Save the username/password.
4. **Network Access → Add IP Address → Allow access from anywhere**
   (`0.0.0.0/0`). Render's outbound IPs are dynamic on the free tier, so this is
   the simplest option for a demo. (For production you would restrict this.)
5. **Database → Connect → Drivers** and copy the **SRV connection string**. It
   looks like:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
   ```

   Insert your password and add a database name before the `?` so data lands in
   one place:

   ```
   mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority
   ```

   Keep this string — it is your `MONGODB_URI`.

---

## 2. Create the Render web service

The repo already contains `render.yaml`, so the fastest path is a Blueprint.

**Option A — Blueprint (recommended)**

1. Push this repo to GitHub (see the project README for the exact commands).
2. In Render, go to **New → Blueprint**, connect the GitHub repo, and Render
   reads `render.yaml` and proposes a `leadflow` web service on the free plan.
3. When prompted, fill the variables marked "sync: false":
   - `MONGODB_URI` — the Atlas string from step 1.
   - `LEAD_WEBHOOK_SECRET` — any long random string, **at least 32 characters**
     (e.g. run `openssl rand -hex 24`). You'll reuse it in step 5.
   - `LEAD_WEBHOOK_BROKERAGE_ID` — leave blank for now; you set it in step 5.
   - `JWT_SECRET` is generated automatically by Render.
4. **Apply** to create and deploy the service.

**Option B — manual web service**

If you prefer not to use the Blueprint: **New → Web Service**, connect the repo,
runtime **Node**, and set

- Build command: `npm install --include=dev && npm run build`
- Start command: `NODE_ENV=production node server/dist/index.js`
- Health check path: `/api/health`

then add the environment variables from the table at the bottom of this file.

> **Why `--include=dev`:** the build needs the TypeScript compiler (a dev
> dependency). If `NODE_ENV=production` is set during install, npm skips dev
> dependencies and the build fails — so `NODE_ENV=production` is applied on the
> **start** command only, never as an environment variable.

---

## 3. First deploy

Watch the deploy logs. A healthy boot ends with:

```
Connected to MongoDB.
LeadFlow API listening on http://localhost:10000
```

Render then marks the service **Live** once `GET /api/health` returns 200. Open
the service URL (e.g. `https://leadflow-xxxx.onrender.com`) and you'll get the
sign-in screen.

> Free-tier services sleep after ~15 minutes idle; the next request takes ~50s
> to wake. That is expected on the free plan.

---

## 4. Seed the demo tenant (test logins)

The seed script creates one brokerage, an account for **every role**, pipeline
leads, a converted client with a dossier, and an email template. It writes
straight to the database, so run it **locally pointed at the same Atlas URI** —
the deployed app reads the very same data. (Render's free tier has no Shell; if
you're on a paid plan you can instead open the service **Shell** and run
`npm run seed` there.)

From your machine, in the project folder:

```bash
# one-time
npm install

# seed (use the SAME Atlas connection string as the deployed service)
MONGODB_URI="mongodb+srv://<user>:<password>@cluster0.xxxxx.mongodb.net/leadflow?retryWrites=true&w=majority" npm run seed
```

It prints the **Brokerage id** and the logins:

| Role | Email | Password |
| --- | --- | --- |
| Platform admin | `platform@leadflow.demo` | `LeadFlowDemo!2026` |
| Brokerage admin | `admin@leadflow.demo` | `LeadFlowDemo!2026` |
| Advisor | `advisor@leadflow.demo` | `LeadFlowDemo!2026` |
| Client | `client@leadflow.demo` | `LeadFlowDemo!2026` |

Sign in with each on the deployed URL to see how the workspace changes per role
(the platform admin sees a tenant-less view, the client sees only their own
case and can upload documents, advisors/admins get the full pipeline).

> Re-running the seed is safe — it updates the same records instead of
> duplicating them, and resets the demo passwords. Override the password with
> `DEMO_PASSWORD=... npm run seed` if you like.

---

## 5. Attach the inbound-lead webhook

The webhook needs to know which brokerage new leads belong to.

1. Copy the **Brokerage id** the seed printed.
2. In Render → your service → **Environment**, set
   `LEAD_WEBHOOK_BROKERAGE_ID` to that id and save (Render redeploys).

Now send a real external lead. Any tool that can POST JSON works — a form tool
such as Tally/Typeform via Zapier or Make, or a quick cURL:

```bash
curl -X POST https://leadflow-xxxx.onrender.com/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: THE_LEAD_WEBHOOK_SECRET_FROM_STEP_2" \
  -d '{
    "name": "Nina Schmidt",
    "email": "nina.schmidt@example.com",
    "phone": "+49 160 5551234",
    "source": "Landing page",
    "propertyType": "Apartment",
    "loanAmount": 310000,
    "targetCity": "Berlin"
  }'
```

The new lead appears **live** on the pipeline board of any open advisor/admin
session (no refresh), and duplicate submissions are rejected with a 409.

---

## Environment variable reference

| Variable | Required | Notes |
| --- | --- | --- |
| `MONGODB_URI` | yes | Atlas SRV string incl. database name. |
| `JWT_SECRET` | yes | ≥32 chars. Auto-generated by the Blueprint. |
| `LEAD_WEBHOOK_SECRET` | for webhook | ≥32 chars; also set in the sending tool. |
| `LEAD_WEBHOOK_BROKERAGE_ID` | for webhook | Brokerage id from the seed. |
| `FRONTEND_ORIGIN` | no | Defaults to `RENDER_EXTERNAL_URL` (same origin). Set only if you host the frontend elsewhere. |
| `EMAIL_SMTP_HOST` / `_PORT` / `_USER` / `_PASSWORD` | no | Real SMTP for stage emails. Unset = emails are logged, not sent (safe for a demo). |
| `EMAIL_FROM` | no | From address for stage emails. |
| `NODE_ENV` | set by start cmd | `production` enables serving the built frontend. |
| `PORT` | set by Render | Render injects it; the server reads it. |

---

## Local development

```bash
npm install
cp .env.example .env   # fill in MONGODB_URI + secrets; a local mongod also works
npm run dev            # API on :4000, Vite web on :3000 (proxies /api + sockets)
```

`npm run typecheck` validates both the frontend and server; `npm test` runs the
unit test suites.
