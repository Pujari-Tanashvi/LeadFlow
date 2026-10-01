# MERN Assignment Submission — LeadFlow

## Two-Paragraph Project Summary

### 1. What We Built & Key Architectural Decisions
LeadFlow is a high-performance multi-tenant lead management and asynchronous document verification platform built for German mortgage brokerages serving international expats. The user interface embodies a **Neo-Apple Minimalist** design aesthetic utilizing translucent frosted liquid glass (24px backdrop blur, 180% saturation, specular refraction chamfers) and micro-interactions. Key architectural decisions include:
1. **Multi-Tenant Data Isolation**: Complete tenant scoping across brokerages (Berlin, Munich, Frankfurt), ensuring advisors, clients, and loan dossiers are strictly isolated.
2. **Real-Time Kanban Pipeline**: Live stage progression with optimistic UI updates and WebSocket simulation.
3. **Automated Stage Triggers**: Column transitions immediately dispatch personalized email templates with dynamic placeholder injection (`{{client_name}}`, `{{advisor_name}}`, etc.) and register advisor SLA tasks with overdue countdown timers.
4. **Duplicate Lead Detection Engine**: Webhook ingestion automatically cross-references historical leads by email, phone, and name.
5. **Non-Blocking Background Document Verification**: Simulates background OCR, salary verification, and bank policy underwriting (e.g., flagging outdated Schufa credit reports or truncated payslips) so clients and advisors are never blocked on the upload screen.

### 2. What is Missing or Weak & Next Steps
In this prototype version, real-time WebSocket events and the OCR background worker are simulated in-memory rather than running through dedicated Redis/BullMQ message queues and distributed Celery workers. Document uploads are stored client-side/in-memory rather than an S3/Google Cloud Storage signed URL pipeline with ClamAV virus scanning. The next steps for production hardening would include:
1. Deploying a containerized Node.js/Express backend connected to a MongoDB multi-tenant cluster with row-level tenant indexing.
2. Integrating Apache Kafka or Redis BullMQ for fault-tolerant background document processing that can survive worker node crashes and replay jobs without data loss.
3. Connecting official German Open Banking APIs (PSD2) and SCHUFA direct API connections for instant credit verification.
4. Implementing end-to-end OAuth2 authentication with multi-factor authentication (MFA) tailored to GDPR and BaFin compliance standards.
