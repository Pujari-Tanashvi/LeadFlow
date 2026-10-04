# LeadFlow — Submission Summary

## 1. What I built and key decisions

LeadFlow is a multi-tenant platform for mortgage brokerages: a single
deployment serves many brokerages, and every lead, client, document, task, and
template is scoped to a `brokerageId` so no tenant can see another's data. The
stack is React + Vite on the front end and Node/Express + TypeScript with
MongoDB/Mongoose on the back end, with Socket.IO for live updates and JWT auth;
there are four server-authoritative roles (platform admin, brokerage admin,
advisor, client). Leads arrive from an external tool through an authenticated
webhook and are de-duplicated on normalized email/phone/name; advisors work a
live Kanban pipeline where stage moves use optimistic concurrency
(`findOneAndUpdate` guarded on the expected stage) so two advisors can't clobber
each other, and entering a stage fires best-effort email and task automation
(placeholders, assigned advisor, due dates, overdue flags). Converting a lead
provisions a real client login with its own dossier; the client uploads
documents that are **actually stored** (multipart upload, magic-byte content
validation, written to disk, streamed back only after a tenant/ownership check),
and a **DB-backed background job queue** verifies them asynchronously — slow and
occasionally failing on purpose — using a timed lease so a crashed worker's job
is re-claimed, with bounded retries and backoff, while status streams live to
both client and advisor. A key deployment decision was to serve the built
frontend, the API, and the Socket.IO channel from one Node process on a single
origin, which removes all cross-origin/websocket friction and makes the whole
app a single free Render web service backed by MongoDB Atlas.

## 2. What is missing or weak, and what I'd do next

The biggest production gap is document file storage: files are written to the
server's local disk, which is fine locally but ephemeral on Render's free tier,
so uploaded files (not their database records) would be lost on redeploy — the
right next step is object storage (S3/GCS) with signed URLs and a virus scan.
The verification itself is intentionally faked (the brief allows this), and the
job queue, while durable and crash-safe in MongoDB, is a single in-process
poller; at real volume I'd move it to a dedicated queue (BullMQ/Redis) with
multiple workers. Email is wired to SMTP but falls back to logging when no
provider is configured, so stage emails are demonstrable without a live mail
account; a production build would add a real provider plus delivery retries and
queueing.
Auth uses short-lived JWTs without refresh tokens or MFA, and tenant isolation
is enforced in application queries rather than at the database layer — I'd add
refresh/MFA and consider per-tenant database roles for defense in depth. Finally,
the automated tests are fast DB-free unit tests covering the core logic; next
I'd add integration tests against an ephemeral MongoDB and an end-to-end pass
over the four-role flows, and address free-tier cold starts (which add ~50s to
the first request after idle) with a warmer or a paid instance.
