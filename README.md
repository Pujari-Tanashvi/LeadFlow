# LeadFlow

A multi-tenant lead-management and document-verification platform for mortgage
brokerages. One deployment serves many brokerages; each sees only its own users,
leads, clients, and documents. Advisors work a live pipeline board, convert
leads into clients who log in and upload documents, and lean on stage-driven
email and task automation. Built with React + Vite, Node/Express + TypeScript,
MongoDB/Mongoose, and Socket.IO.

**Live demo:** _add your Render URL here after deploying_
**Deploy guide:** see [DEPLOYMENT.md](./DEPLOYMENT.md)

## Test logins

After seeding (`npm run seed`, see DEPLOYMENT.md) — same password for all:
`LeadFlowDemo!2026`

| Role | Email | What they see |
| --- | --- | --- |
| Platform admin | `platform@leadflow.demo` | Operates across tenants; holds no brokerage data of its own. |
| Brokerage admin | `admin@leadflow.demo` | Full workspace + email-template and automation editing. |
| Advisor | `advisor@leadflow.demo` | Pipeline, documents, analytics, tasks (no template editing). |
| Client | `client@leadflow.demo` | Only their own case; uploads documents and tracks status. |

## How the brief maps to the code

- **Multi-tenancy & isolation** — every record carries a `brokerageId` and every
  query is scoped to the signed-in account's tenant; ids are validated so one
  brokerage can never read another's lead/client/document (returns 404/403).
- **External leads** — authenticated webhook `POST /api/webhooks/leads`
  (`x-webhook-secret` header) ingests leads from any external tool.
- **Live pipeline** — stage changes broadcast over Socket.IO to every open
  screen in the tenant; moves use optimistic concurrency so simultaneous edits
  can't clobber each other.
- **Duplicate detection** — new leads are cross-referenced by normalized email,
  phone, and name before creation.
- **Lead → client** — conversion provisions a client login (one-time activation
  token) with its own dossier; the client can log in and upload documents.
- **Background document verification** — uploads are stored on disk, then a
  DB-backed job queue verifies them asynchronously (deliberately slow and
  sometimes failing); status streams live to client and advisor.
- **Fast dashboard** — brokerage-scoped aggregates pushed over sockets so the
  numbers are current without a slow reload.
- **Email templates & stage triggers** — admins edit templates with
  placeholders (`{{client_name}}`, `{{advisor_name}}`, `{{brokerage_name}}`);
  entering a stage sends the linked email.
- **Task triggers** — entering a column creates the configured tasks with an
  assigned advisor and due date; overdue tasks are flagged.

## Resilience (the brief's "what if" scenarios)

- **Same lead twice / floods** — duplicate detection + unique indexes; writes
  are scoped and paginated.
- **Two advisors move the same lead** — `findOneAndUpdate` guarded on the
  expected stage; the loser gets a 409 to reload.
- **Worker crashes mid-job** — verification jobs use a timed lease
  (`lockedUntil`); an abandoned job is re-claimed by the next poll, with
  bounded retries and backoff.
- **Email provider down** — stage email/task automation is best-effort and
  isolated, so a send failure never rolls back the stage change.
- **Guessing another tenant's id** — all lookups are brokerage-scoped, so a
  foreign id resolves to 404.
- **Advisor goes offline** — the Socket.IO client auto-reconnects and the
  workspace reloads dependent data.

## Architecture

- `src/` — React + Vite frontend. Calls same-origin `/api`; Socket.IO on the
  same origin. In dev, Vite proxies both to the API (`vite.config.ts`).
- `server/src/` — Express + TypeScript API: tenant-scoped controllers,
  services, Mongoose models, the Socket.IO hub, and background workers.
- `scripts/` — `dev.mjs` (run both servers), `seed-demo.mjs` (demo tenant +
  logins), `user-admin.mjs` / `demo.mjs` (interview helpers).

In production a single Node process serves the API, the built frontend, and the
live channel (see DEPLOYMENT.md).

## Local development

```bash
npm install
cp .env.example .env   # set MONGODB_URI, JWT_SECRET, webhook secret
npm run dev            # API :4000, web :3000
npm run typecheck      # frontend + server
npm test               # unit test suites
```

Roles are server-authoritative: the signed-in role is read from the account on
every request, and there is no API that can escalate a role.
