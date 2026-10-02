The current UI/design is already approved. Use the attached reference screenshots as the exact visual direction.

DO NOT redesign the UI, change the color palette, animations, glass effects, spacing, typography, cards, 3D/parallax effects, or overall layout. Keep the current Neo-Apple minimalist SaaS aesthetic.

First append this exact prompt verbatim to PROMPTS.md.

Now update the homepage/navigation terminology so it represents the actual LeadFlow mortgage brokerage product instead of a UI/UX design showcase.

Rename the main navigation to:

- Dashboard
- Leads & Pipeline
- Documents
- Analytics
- Automations
- Client Portal

Update homepage content:

- "LeadFlow UI/UX Design System & Architectural Canvas" → "LeadFlow Mortgage Workspace"
- Hero subtitle → "A modern mortgage brokerage platform for managing leads, clients, documents, tasks and automated workflows."
- "Launch Live Pipeline Board" → "Open Lead Pipeline"
- "Document Verification Engine" → "Document Center"
- "Download Entire Code (ZIP)" → "View Dashboard"

Update the main feature sections/cards to:

1. Live Lead Pipeline
2. Client & Case Management
3. Document Verification
4. Tasks & Workflow Automation
5. Analytics & Activity
6. Client Portal

Use realistic mortgage-specific sample content such as leads, advisors, loan amounts, property types, document statuses and pipeline stages.

Keep all existing visual styling and animations exactly as much as possible. Do not add backend logic yet. Do not replace working components unnecessarily.

After changes, run the project and fix any errors. Commit the changes and push to GitHub in the repository https://github.com/Pujari-Tanashvi/LeadFlow

Build the LeadFlow project from the current codebase.

The existing frontend design is approved. DO NOT redesign it or change its visual style, animations, glass effects, colors, typography, layout, or components.

First append this exact prompt to PROMPTS.md.

Set up a proper MERN + TypeScript full-stack structure:

- frontend: keep the existing React app
- backend: create /server using Node.js + Express + TypeScript
- MongoDB + Mongoose
- JWT authentication + bcrypt
- Socket.IO
- dotenv
- CORS

Create a clean backend structure with:
config, models, controllers, routes, middleware, services, sockets, utils.

Create .env.example.

Create a basic Express health route:
GET /api/health

Make sure frontend and backend can run separately.

Run npm install, typecheck/build and fix errors.

Do not implement all features yet.
Do not redesign the frontend.

Commit the completed work to Git if Git is configured.

First append this exact prompt to PROMPTS.md.

Implement the LeadFlow database foundation.

Create MongoDB/Mongoose models:

- Brokerage
- User

User roles:

- platform_admin
- brokerage_admin
- advisor
- client

Add brokerageId to tenant-specific users.

Implement:

- database connection
- register
- login
- JWT authentication
- bcrypt password hashing
- auth middleware
- role middleware
- GET /api/auth/me

Every brokerage user must only access their own brokerage data.

Do not modify the approved UI.

Run tests/typecheck and fix errors.
Commit the changes to https://github.com/Pujari-Tanashvi/LeadFlow

First append this exact prompt to PROMPTS.md.

Implement the LeadFlow lead system.

Create Lead model with:
name, email, phone, source, propertyType, loanAmount,
assignedAdvisor, stage, brokerageId, timestamps.

Pipeline stages:
New
Contacted
Qualified
Documents
In Review
Won
Lost

Create APIs:
GET /api/leads
POST /api/leads
GET /api/leads/:id
PATCH /api/leads/:id
DELETE /api/leads/:id
PATCH /api/leads/:id/stage

Add search, stage filter, advisor filter and pagination.

Enforce brokerage isolation on every lead query.

Record an Activity whenever a lead changes stage.

Do not redesign the frontend.
Run and fix errors.
Commit changes.

First append this exact prompt to PROMPTS.md.

Implement LeadFlow lead-to-client conversion.

Create Client model.

Add:
POST /api/leads/:id/convert

When converted:

- create the client
- create a client User account
- preserve lead history
- prevent duplicate client accounts
- associate client with brokerage
- associate client with advisor
- update lead status

Use a secure temporary-password/reset flow.

Enforce brokerage isolation.

Do not redesign the UI.
Test and fix errors.
Commit changes.

First append this exact prompt to PROMPTS.md.

Implement background document verification.

When a document is uploaded:
Pending → Processing → In Review → Verified/Failed

Use a background job/worker instead of blocking the API request.

Verification should intentionally take a few seconds and sometimes fail.

Store:
verification result
failure reason
timestamps

Emit Socket.IO document status events so client/advisor screens can update live.

Add retry handling for failed jobs. homepage includes under l interactive liquide glass there are stuff like glass efeect and below that at60-30 color systems and typographic scale and stuff is not related to the project put things that are a match to project not for effects of site,also names all over the site are german keep them simple give legit names to each and everything.

Do not redesign the frontend.
Test and commit.

First append this exact prompt to PROMPTS.md.

Implement background document verification.

When a document is uploaded:
Pending → Processing → In Review → Verified/Failed

Use a background job/worker instead of blocking the API request.

Verification should intentionally take a few seconds and sometimes fail.

Store:
verification result
failure reason
timestamps

Emit Socket.IO document status events so client/advisor screens can update live.

Add retry handling for failed jobs. homepage includes under l interactive liquide glass there are stuff like glass efeect and below that at60-30 color systems and typographic scale and stuff is not related to the project put things that are a match to project not for effects of site,also names all over the site are german keep them simple give legit names to each and everything.

Do not redesign the frontend.
Test and commit.

First append this exact prompt to PROMPTS.md.

Implement LeadFlow document management.

Create Document model:
clientId, uploadedBy, filename, fileUrl,
documentType, status, brokerageId, timestamps.

Statuses:
Pending
Uploading
Processing
In Review
Verified
Failed

Create secure document APIs for:
upload
list
get
update status
delete

Clients can access only their own documents.
Advisors/admins can access documents belonging to their brokerage.

Use a storage abstraction so storage can later be connected to S3 or another provider.

Do not redesign the frontend.
Test and commit.

First append this exact prompt to PROMPTS.md.

Implement an external lead webhook:

POST /api/webhooks/leads

Accept:
name
email
phone
source
propertyType
loanAmount

Validate and normalize the data.

Protect the webhook with a secret from environment variables.

Run duplicate detection before creating the lead.

Create the lead and emit the real-time lead.created event.

Return proper HTTP responses.

Do not redesign the frontend.
Test the webhook locally.
Commit changes.

First append this exact prompt to PROMPTS.md.

Implement LeadFlow duplicate lead detection.

Normalize email and phone before comparison.

Detect duplicates using:

- email
- phone
- name + phone

When a duplicate is detected, return the existing lead information and allow:

- view existing
- create anyway
- merge

Duplicate checks must stay inside the same brokerage.

Add useful indexes for duplicate detection.

Do not redesign the UI.

Test and fix errors.
Commit changes.

First append this exact prompt verbatim to PROMPTS.md.

Implement Tasks and pipeline task automation.

Task fields:
title, leadId, clientId, assignedAdvisor, dueDate, status, priority, createdBy, brokerageId.

Create APIs to:
- create task
- list/filter tasks
- update task
- complete task
- delete task

Automatically identify overdue tasks.

Implement pipeline automation:
when a lead enters a configured pipeline stage, create the required task, assign the advisor and calculate the due date.

Prevent duplicate tasks when the same stage event is received more than once.

Respect brokerage isolation and existing authentication/roles.

Do not redesign the frontend.

Run/typecheck/test and fix errors.
Commit the changes if Git is configured.

First append this exact prompt verbatim to PROMPTS.md.

Implement brokerage email templates.

Create EmailTemplate with:
name, subject, body, stage, active, brokerageId.

Support these placeholders:
{{client_name}}
{{advisor_name}}
{{brokerage_name}}

Create CRUD APIs.

Only brokerage_admin can create, edit and delete templates.

Validate supported placeholders before saving.

Respect brokerage isolation.

Do not redesign the frontend.

Test and fix errors.
Commit changes.https://github.com/Pujari-Tanashvi/LeadFlow
