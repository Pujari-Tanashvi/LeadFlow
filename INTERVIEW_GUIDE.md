# LeadFlow — Interview Walkthrough & Demo Guide

> Your personal prep sheet. For every feature it gives you three things:
> **What it does** (plain English), **How it works** (so you sound credible), and
> **Say this / Show this** (words for the recruiter + what to click).
> This file is just for you — it is not part of the submission, so you don't have to commit it.

---

## 0. The 30-second pitch (memorise this)

> "LeadFlow is a multi-tenant SaaS platform for mortgage brokerages. One deployment serves
> many brokerages, and each one only ever sees its own data. Leads arrive automatically from
> external tools through a webhook, land on a live pipeline board that every advisor sees update
> in real time, and the system catches duplicates. When a lead becomes a client, that client gets
> their own login to upload documents, which are verified by a background worker with live status.
> Moving a lead through the pipeline automatically fires the right emails and advisor tasks, and a
> live dashboard shows the numbers. It's built on the MERN stack with TypeScript, JWT auth with
> four roles, and Socket.IO for the live updates."

If they want the stack in one line: **React + Vite + TypeScript frontend, Node + Express + TypeScript backend, MongoDB with Mongoose, Socket.IO for realtime, JWT + bcrypt for auth.**

---

## 1. Architecture at a glance

**Three parts, one repo:**

- **Frontend** (`src/`) — React 19 + Vite + TypeScript + Tailwind. A `src/services/` layer wraps every API call and the Socket.IO client; `src/context/` holds auth + workspace state.
- **Backend** (`server/src/`) — Express + TypeScript, organised as routes → middleware → controllers → services → models (Mongoose). Socket.IO is attached to the same HTTP server.
- **Database** — MongoDB. Also used as the backing store for the background workers (no separate queue server needed).

**How the two halves connect:** the frontend always calls same-origin `/api/*`. In development, Vite proxies `/api` and the `/socket.io` websocket to the API server on port 4000 (see `vite.config.ts`). The API client attaches the JWT as a `Bearer` token on every request and reacts to 401s by signing the user out.

**Key decisions you chose (and can defend):**

1. **TypeScript end to end** — one shared mental model of the data, fewer runtime bugs.
2. **MongoDB as the concurrency + queue primitive instead of Redis/BullMQ** — atomic `findOneAndUpdate` gives optimistic locking and a lease-based job queue without another piece of infrastructure, so the whole thing runs on free tiers. (You can state exactly what you'd add to scale — see §8.)
3. **Socket.IO rooms per brokerage** — live updates that are themselves tenant-isolated.
4. **Thin controllers, logic in services, pure helpers in `utils/`** — the pure helpers are unit-tested without a database (97 tests).

---

## 2. The four roles (requirement: "four kinds of users")

Say: *"I decided what each role can do and enforced it on both the frontend and the API."*

| Role | What they can do |
|---|---|
| **platform_admin** | Platform-level account with no brokerage (`brokerageId = null`). Deliberately kept minimal — the tenant middleware blocks it from any single brokerage's data, so it can never read a brokerage's leads/clients. |
| **brokerage_admin** | Full control of their brokerage: leads, pipeline, tasks, dashboard, lead ingestion, **and** email templates (create/edit/delete). |
| **advisor** | Day-to-day work: leads, pipeline, tasks, dashboard, convert leads to clients. Can *view* templates but not edit them. |
| **client** | Only their own case: log in, see their case, upload documents. Cannot see leads, tasks, templates, or the dashboard. |

The frontend mirrors this in `permissionsForRole` (AuthContext), and the API enforces it with `requireRoles(...)` on each router. Both layers agree — the frontend hides what the API also refuses.

---

## 3. Running it for the demo

**Environment variables the API needs** — copy `.env.example` to `.env` in the project root:

- `MONGODB_URI` — a MongoDB connection string (MongoDB Atlas free tier is fine). MongoDB must be reachable before you start the app.
- `JWT_SECRET` — any random string of **32+ characters**.
- `LEAD_WEBHOOK_SECRET` — a random **32+ char** secret for the external webhook.
- `LEAD_WEBHOOK_BROKERAGE_ID` — the `_id` of the brokerage that owns inbound webhook leads (grab it after you register a brokerage).
- Optional: `EMAIL_SMTP_HOST/PORT/USER/PASSWORD`, `EMAIL_FROM` — if unset, emails are logged to the server console (intentionally — see §6, feature 9).

**Start it:**

```bash
cp .env.example .env      # then fill in MONGODB_URI and JWT_SECRET
npm install
npm run dev               # API (:4000) + Vite UI (:3000), one terminal
```

`npm run dev` runs `scripts/dev.mjs`, which starts **both** the Express API and the Vite dev server and stops them together. This matters: the UI calls same-origin `/api/*`, which Vite proxies to the API. Starting *only* `npm run dev:web` leaves that proxy with nothing to forward to, and every sign-in fails with a gateway error that looks like a broken login rather than a missing backend.

Then open `http://localhost:3000`. (If you deployed, use the deployed URL and your seeded test logins instead.)

### The "golden path" demo order (do it in this sequence)

1. **Register a brokerage** → you become its brokerage_admin. *"This created a tenant and my admin account."*
2. **Open the pipeline board.** Keep it visible.
3. **Fire the webhook** (second terminal) → the new lead appears on the board **without refreshing**.
4. **Fire the same lead again** → show the **duplicate** response.
5. **Drag/advance a lead through stages** → point out the **email** + **task** that fire, and the **dashboard** number changing live.
6. **Convert a lead to a client** → copy the activation token → **activate** → **log in as the client**.
7. As the client, **upload a document** → watch it go **Processing → In Review → Verified/Failed** live; flip to the advisor screen and show the same status updating.
8. **Open a second browser window** side-by-side to prove the live multi-screen sync.
9. **Show the dashboard**, the **email templates** admin screen, and the **overdue task** highlight.
10. **Show the security**: try to open another brokerage's lead by ID → 404.

A ready-to-paste webhook call for step 3 (fill in your secret):

```bash
curl -X POST http://localhost:4000/api/webhooks/leads \
  -H "Content-Type: application/json" \
  -H "x-webhook-secret: YOUR_LEAD_WEBHOOK_SECRET" \
  -d '{"name":"Olivia Martin","email":"olivia@example.com","phone":"+49 170 1234567","source":"Website","propertyType":"Apartment","loanAmount":520000}'
```

---

## 4. Feature by feature

Each feature below maps to a numbered requirement in the brief.

### Feature 1 — Multi-tenant isolation (requirement 1)

**What it does:** One deployment serves many brokerages. Each brokerage sees only its own users, leads, clients, documents and tasks — never another's.

**How it works:** Every record carries a `brokerageId`. The authenticated user's brokerage comes from their JWT, and *every* query is scoped by it through small helpers (`getLeadTenantId`, `brokerageFilter`, etc.) plus a tenant middleware on each router. A `platform_admin` has no brokerage, so the same middleware blocks it from any single brokerage's data. Even the Socket.IO live updates are scoped — each socket joins a `brokerage:<id>` room, so realtime events can't leak across tenants either.

**Say this:** *"Isolation isn't a filter I remember to add — it's baked into every query through a tenant helper, and it's enforced at the route, the database query, and the websocket room."*

**Show this:** Register two brokerages; show that leads created in one never appear in the other.

### Feature 2 — Automatic lead intake from an external tool (requirement 2)

**What it does:** Leads arrive automatically over an HTTP webhook — the same way a web form, ad platform or tool like Zapier would deliver them.

**How it works:** `POST /api/webhooks/leads` is protected by a shared secret in the `x-webhook-secret` header, compared in **constant time** (so you can't time-guess it) and required to be 32+ characters. The payload is validated and mapped to our lead shape, attributed to the configured brokerage, run through duplicate detection, saved, and then broadcast live to the board. If it's a duplicate it returns `409` instead of silently creating a copy.

**Say this:** *"Any external system can POST a lead with a signed secret. I validate and de-duplicate before it ever hits the board, and the board updates live."*

**Show this:** The `curl` call from §3 → the lead pops onto the pipeline instantly.

### Feature 3 — Live pipeline board (requirement 3)

**What it does:** A board of stages (New → Contacted → … → Won / Lost). Any change on any screen shows up live on every other open screen.

**How it works:** Lead create / stage-change / delete each emit a Socket.IO event (`lead.created`, `dashboard.stats`, task events) to the brokerage's room; open clients receive it and update immediately — no polling. Moving a lead uses **optimistic concurrency**: the update only succeeds if the lead is still in the stage you saw it in; otherwise you get a `409` "stage changed concurrently, reload" instead of silently overwriting a colleague.

**Say this:** *"Realtime is push-based over websockets, scoped per brokerage. And I handle the race where two advisors move the same lead at once — the second one is told to reload rather than clobbering the first."*

**Show this:** Two browser windows side by side; move a lead in one, watch it move in the other.

### Feature 4 — Duplicate lead detection (requirement 4)

**What it does:** Notices when a new lead is someone the brokerage already knows — even if the name is typed differently.

**How it works:** Each lead stores **normalized** identity fields: email lower-cased, phone reduced to digits only, name stripped of accents and extra spaces. A new lead is matched within the brokerage by same email, OR same phone, OR same name+phone. On a hit the API returns `409` with the matches and offers actions: *view existing*, *create anyway*, or *merge*. Merge consolidates history onto one lead and removes the duplicate.

**Say this:** *"I normalize identity so 'José +49 170…' and 'jose 0170…' are recognised as the same person. The user decides whether to merge or keep both — I don't silently drop data."*

**Show this:** Fire the same webhook twice → show the duplicate warning.

### Feature 5 — Lead → client conversion + client login (requirements 5 & 11)

**What it does:** An advisor turns a lead into a client who can log in, see their case, and upload documents.

**How it works:** Convert (advisor/admin only) creates a client `User` (role `client`) and a `Client` record, and issues a **one-time activation token** (random, stored only as a SHA-256 hash with an expiry — the raw token is shown once, exactly like a password-reset link). The client calls `/api/auth/activate-client` with that token to set their password, then logs in to their portal.

**Say this:** *"Conversion provisions a real login securely — the activation token is hashed at rest and expires, so even I can't read it from the database."*

**Show this:** Convert a lead → copy the token → activate → log in as the client.

### Feature 6 — Background document verification with live status (requirement 6)

**What it does:** Clients upload documents; checking happens in the background (slow, and it sometimes fails) and the status shows live to both the client and the advisor — the client never waits on the upload screen.

**How it works:** On upload the file is validated by its **magic bytes** (not just its extension), stored privately on disk under a random key (outside the web root, mode 0600, served only through an authenticated, tenant-scoped endpoint), and a **job** row is created. An in-process worker polls every 0.5s and **atomically claims** a job with a 60-second lease. It walks the document Pending → Processing → In Review → **Verified or Failed**, with realistic delays and a deliberate ~25% failure rate. Failures **retry up to 3× with exponential backoff**; after that the document is marked Failed with a reason and a manual retry button. Every transition emits a live `document.status` event to the client and the advisor.

**Say this:** *"I used MongoDB itself as the job queue. Each job is claimed atomically with a lease, so if the worker crashes mid-job the lease expires and another run picks it up — nothing gets stuck. Status is pushed live, so the client can close the upload screen immediately."*

**Show this:** Upload as the client → watch the status animate through to Verified/Failed on both screens; if it fails, hit retry.

### Feature 7 — Dashboard that loads fast and is never stale (requirement 7)

**What it does:** Pipeline numbers (totals, per-stage counts, active clients, overdue tasks, recent activity) that load quickly and stay current.

**How it works:** One endpoint runs a **single indexed aggregation** — a `$group` over the brokerage's leads gives totals and the full stage breakdown in one pass — alongside a few parallel counts. "Never stale" is achieved by **pushing** a fresh summary over `dashboard.stats` whenever a lead, client or stage changes, so the screen updates without re-polling.

**Say this:** *"Instead of many small queries I compute the whole summary in one aggregation on indexed fields, and I push updates live so it's never out of date — no polling, no cache to invalidate."*

**Show this:** Keep the dashboard open while you move a lead; the numbers change on their own.

### Feature 8 — Email templates with placeholders (requirement 8)

**What it does:** A brokerage admin creates and edits email templates containing placeholders like the client's or advisor's name, each linked to a pipeline stage.

**How it works:** Per-brokerage CRUD. Only `brokerage_admin` can create/edit/delete (advisors can view). Supported placeholders — `{{client_name}}`, `{{advisor_name}}`, `{{brokerage_name}}` — are **validated before saving**, so a template can't reference something we can't fill. Templates carry an `active` flag and a stage.

**Say this:** *"Admins own the templates; I validate placeholders up front so a stage email can never render a broken token."*

**Show this:** The templates admin screen — create one with a placeholder.

### Feature 9 — Email triggers on the pipeline (requirement 9)

**What it does:** When a lead enters a stage, it automatically sends the email the admin linked to that stage (e.g. a welcome email on New).

**How it works:** On a stage change, the system finds the active template for that brokerage+stage, renders the placeholders, and sends through a **provider-agnostic email abstraction** (today a log transport; swapping in SMTP/SES is one class). It's **idempotent**: a deterministic dedupe key plus a unique database index mean the same stage event can be processed twice and still send only one email. And it's **best-effort**: if the email provider is down, the failure is recorded and swallowed — it never rolls back or blocks the stage change itself.

**Say this:** *"Email is decoupled behind an interface, it's idempotent so retries don't double-send, and a dead email provider can never break the pipeline move — the stage change always succeeds."*

**Show this:** Move a lead to a stage that has a template; show the `[email] …` line in the server console (or the recorded delivery).

### Feature 10 — Task triggers on columns + overdue tasks (requirement 10)

**What it does:** When a lead enters a column, it creates the tasks the admin configured for that column (e.g. "Call within 2 hours"), each with an assigned advisor and a due date; overdue tasks stand out.

**How it works:** Stage entry runs the task automation, which creates the configured tasks with an **idempotency key** (unique index) so re-processing the same event never duplicates a task. A second in-process worker reconciles overdue state every 60s: it flags active, past-due tasks as overdue (emitting a live event) and clears the flag when a task is completed, rescheduled or no longer due. The dashboard counts overdue tasks and the UI highlights them.

**Say this:** *"Column entry spawns the right tasks with an assignee and due date, de-duplicated by an idempotency key, and a background reconciler keeps the overdue flag honest in both directions."*

**Show this:** Move a lead to New → the "Call within 2 hours" task appears; show an overdue task highlighted.

---

## 5. The hard questions (straight from the brief — expect these)

The brief lists "questions worth asking yourself." Recruiters often ask these directly. Short, confident answers:

**"What if the same lead is sent twice, or 500 arrive in a minute?"**
Twice → duplicate detection on normalized email/phone/name catches it; the webhook returns a duplicate response instead of creating a copy, and emails/tasks have idempotency keys so nothing double-fires. 500/minute → each is validated and de-duplicated independently; today they're handled in-process, and the honest scaling answer is a dedicated queue with per-tenant rate limits (see §7).

**"What if two advisors move the same lead at the same moment?"**
Optimistic concurrency: the stage update only applies if the lead is still in the stage that advisor saw. The loser gets a `409 — reload and retry`, so no silent overwrite.

**"What if the background worker crashes halfway through a job?"**
Jobs are claimed with a **60-second lease**, not deleted. If the worker dies mid-job the lease expires and the next poll re-claims it. Status transitions are guarded (they only move from the expected state), and jobs retry up to 3× with backoff before being marked Failed with a reason.

**"What if the email provider is down when a lead changes stage?"**
Email is best-effort and decoupled. The failure is recorded on the delivery record and swallowed; the stage change, task creation and board/dashboard updates all still succeed. Nothing user-facing breaks.

**"If one brokerage floods the system, do the others slow down?"**
Honest answer: today the workers are a single in-process FIFO, so a flood from one tenant would delay others — this is a **known limitation I'd fix** with a real queue (BullMQ/Redis) plus per-tenant rate limiting and fair scheduling. I called this out in my summary. (This is a *good* answer — the brief explicitly rewards knowing what you cut.)

**"What if someone guesses the ID of another brokerage's lead?"**
Every lookup is scoped by `brokerageId`, so a foreign ID simply returns `404 — not found`; you can't even confirm it exists. Documents go further: a client is locked to their *own* client ID, so one client can't read another client's files in the same brokerage.

**"What if an advisor's internet drops for two minutes?"**
The Socket.IO client auto-reconnects with backoff, re-authenticates with the JWT, and rejoins the brokerage room. On reconnect the app re-fetches current state over REST, so the screen catches up on anything it missed — no manual refresh.

---

## 6. Security summary (one slide's worth)

- **Passwords:** bcrypt, 12 rounds; hashes never leave the database (field is excluded by default).
- **Auth:** JWT (HS256), 1-hour expiry, secret required to be 32+ chars (checked at boot).
- **Authorization:** every router has an authentication gate, a tenant gate, and role gates (`requireRoles`).
- **Tenant isolation / IDOR:** every query scoped by `brokerageId`; clients additionally scoped to their own record; cross-tenant access returns 404.
- **Uploads:** validated by magic bytes, stored privately (not web-accessible), path-traversal-guarded, served with `X-Content-Type-Options: nosniff` as an attachment.
- **Webhook:** constant-time secret comparison, 32-char minimum.
- **Activation tokens:** random, hashed at rest (SHA-256), time-limited, single-use.
- **Input validation** on every endpoint before anything touches the database.

---

## 7. What I intentionally cut, and what I'd do next (your two-paragraph summary)

The brief says a smaller product that works well scores higher, and that deciding what to cut is part of the assessment. Use this framing:

**Paragraph 1 — what I built & key decisions:** *"I built all ten core capabilities end to end on the MERN stack with TypeScript: multi-tenant isolation, webhook intake, a live pipeline, duplicate detection, lead-to-client conversion with a real client login, background document verification with live status, a live dashboard, email templates, and stage-triggered emails and tasks. My main architectural decision was to use MongoDB itself as both the concurrency primitive (atomic, stage-guarded updates) and the job queue (lease-based claiming), which kept the system fully on free tiers with no extra infrastructure, while still handling races, worker crashes and retries properly. Realtime is push-based over Socket.IO, scoped per brokerage."*

**Paragraph 2 — what's weak & next steps:** *"The clearest trade-off is that background work runs in a single in-process worker with no cross-tenant fairness, so under heavy load from one brokerage others would wait — I'd move to a Redis-backed queue (BullMQ) with per-tenant rate limiting next. The email transport is a log-only stub behind an interface, so plugging in a real provider (SES/Postmark) is a one-class change. I'd also add a short-lived cache for the dashboard, integration tests over the HTTP layer (today the unit tests are database-free), and a richer platform-admin console."*

(Adjust wording to match what you actually deployed.)

---

## 8. Quick-reference cheat sheet

**API endpoints**

- Auth: `POST /api/auth/register`, `POST /api/auth/login`, `POST /api/auth/activate-client`, `GET /api/auth/me`
- Webhook: `POST /api/webhooks/leads` (header `x-webhook-secret`)
- Leads: `GET/POST /api/leads`, `GET/PATCH/DELETE /api/leads/:id`, `PATCH /api/leads/:id/stage`, `POST /api/leads/:id/convert`, `POST /api/leads/:id/merge`
- Tasks: `GET/POST /api/tasks`, `GET/PATCH/DELETE /api/tasks/:id`, `POST /api/tasks/:id/complete`
- Documents: `GET/POST /api/documents`, `GET /api/documents/:id`, `GET /api/documents/:id/content`, `PATCH /api/documents/:id/status`, `POST /api/documents/:id/retry`, `DELETE /api/documents/:id`
- Email templates: `GET/POST /api/email-templates`, `GET/PATCH/DELETE /api/email-templates/:id`
- Dashboard: `GET /api/dashboard`

**Socket.IO events (server → client):** `lead.created`, `document.status`, `task.created`, `task.updated`, `task.deleted`, `task.overdue`, `dashboard.stats`

**Where things live in the code (if they ask to see it):**

- Tenant scoping: `server/src/utils/tenantAccess.ts`, `*TenantMiddleware.ts`
- Duplicate detection: `server/src/services/leadDuplicateService.ts`, `utils/leadIdentity.ts`
- Document worker/queue: `server/src/services/documentVerificationWorker.ts`
- Overdue worker: `server/src/services/overdueTaskWorker.ts`
- Email automation: `server/src/services/pipelineEmailService.ts`, `services/emailService.ts`
- Task automation: `server/src/services/taskAutomationService.ts`
- Dashboard aggregation: `server/src/services/dashboardService.ts`
- Realtime: `server/src/sockets/index.ts`; frontend `src/services/socketService.ts`

**Your test logins (fill in before the interview):**

- platform_admin: ______________________
- brokerage_admin: ______________________
- advisor: ______________________
- client: ______________________ (create by converting a lead, then activating)

---

### One last tip
If you get stuck on a question, fall back to the honest version: *"Here's what I built, here's the trade-off I made and why, and here's what I'd do next."* The brief explicitly rewards that over pretending everything is production-scale.
