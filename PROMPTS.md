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
