import { WebPageItem } from '../types';

export const DEFAULT_PAGES: WebPageItem[] = [
  {
    id: 'page-vision',
    slug: 'vision-mission',
    title: 'Vision & Mission',
    category: 'Corporate Strategy',
    author: 'Sarah-Jane (CEO)',
    version: '1.2',
    lastModified: '2026-09-02',
    isSystem: true,
    content: `# Vision & Mission

## Executive Purpose
The **Infinite-AI Business Platform** exists to build, operate, and continuously elevate an enterprise-grade, multi-agent AI ecosystem for full business automation, rigorous governance, and operational resilience.

---

### Core Vision
> **"Build a world-class AI-powered business ecosystem that scales globally with zero compromise on human agency, institutional truth, and compliance."**

We demonstrate that sophisticated AI autonomy does not require surrendering executive control. Through our **Four Unbreakable Laws**, we deliver an enterprise workforce capable of running complex operations around the clock while guaranteeing that critical outcomes remain firmly anchored in human accountability.

---

### Enterprise Mission
1. **Deliver Intelligent Autonomous Operations:** Power all twelve business departments with specialized, coordinated AI agents executing deterministic workflows.
2. **Preserve Institutional Memory:** Eliminate organizational amnesia through the append-only **Infinite Brain (L0–L4)**, creating an immutable tree-ring record of corporate wisdom.
3. **Pioneer Uncompromising Governance:** Guarantee strict compliance with **POPIA Section 72**, **GDPR adequacy**, **King IV principles**, and non-bypassable **Human-in-the-Loop (HITL)** approval gates.
4. **Democratize Enterprise SaaS Economics:** Offer hyper-efficient multi-tenant software operations yielding >70% gross margins through intelligent model routing and prompt caching.`
  },
  {
    id: 'page-overview',
    slug: 'company-overview',
    title: 'Company Overview',
    category: 'Corporate Strategy',
    author: 'Executive Strategy AI (A01)',
    version: '1.0',
    lastModified: '2026-09-01',
    isSystem: true,
    content: `# Company Overview: Infinite-AI

## Architectural Pedigree
Adapted from the renowned **Infinite-AI Education Ecosystem**, the platform has transitioned from academic curriculum and multi-tenant school governance into a comprehensive **Enterprise Operations System**.

### Primary Business Foundations
- **Headquarters & Cloud Region:** Cape Town & Johannesburg, South Africa (AWS \`af-south-1\`).
- **Core Operating Model:** Multi-agent autonomous workflows orchestrated across 46 specialist AI employees under human executive supervision.
- **Enterprise Moat:** 
  1. **L0–L4 Memory Engine:** Context is never blindly overwritten; policies are ratified and version-controlled.
  2. **The Membrane Guardrail:** Zero customer or learner PII can cross the model boundary.
  3. **Strict Tenant Isolation:** Hardware-level Row Level Security (\`withTenant\`) ensures absolute multi-tenant segregation.

---

### The Executive Team & Advisory
- **Sarah-Jane:** Chief Executive Officer & Strategic Architect
- **David K.:** Chief Technology Officer & Principal Infrastructure Architect
- **Naledi M.:** VP Legal, Regulatory & Information Officer
- **Thabo R.:** Head of Customer Success & Enterprise Pilots`
  },
  {
    id: 'page-products',
    slug: 'product-suite',
    title: 'Product Suite',
    category: 'Product Development',
    author: 'Head of Product (A05)',
    version: '2.1',
    lastModified: '2026-08-30',
    isSystem: true,
    content: `# The Infinite-AI Product Suite

Our modular enterprise platform is divided into one centralized institutional core and five domain-specialized operational engines:

---

### 1. The Infinite Brain (Memory L0–L4)
- **L0 Constitution:** Immutable legal bylaws, board charters, and 136 ratified policy frameworks.
- **L1 Raw Evidence:** Cryptographically hashed source documents and contract artifacts in S3.
- **L2 Semantic Index:** 1536-dimensional semantic vector knowledge graph in PostgreSQL (\`pgvector\`).
- **L3 Procedural Workflows:** Deterministic SOP state machines and operational runbooks.
- **L4 Episodic Memory:** Append-only SHA-256 event ledger tracking every agent decision and human signature.

---

### 2. MOD-01: Strategic Planning & Decomposition Engine
Transforms corporate vision and Annual Operating Plans (AOP) into quarterly OKRs, sprint backlogs, and resource-balanced DAG execution paths.

---

### 3. MOD-02: Support & Incident Escalation Center
Triage engine for Tier 1–3 incidents with automated SLA breach prediction, root cause investigation, and emergency PagerDuty safeguarding paging.

---

### 4. MOD-03: Enterprise Data Warehouse & Tenant-360
Continuous data ingestion pipeline equipped with schema conformity checks, automated PII scrubbers, and holistic tenant health scoring.

---

### 5. MOD-04: AI Operations Toolbox
Double-verified generative business agents delivering tender/RFP answers, SLA audit memos, board packs, and contract compliance reviews.

---

### 6. MOD-05: Workforce Performance & Learning Studio
Continuous capability development studio that diagnoses team skill gaps and generates accredited micro-courses without punitive rankings.`
  },
  {
    id: 'page-pipeline',
    slug: 'deployment-pipeline',
    title: 'Software Deployment Pipeline (19 Stages)',
    category: 'Engineering & DevOps',
    author: 'DevOps Pipeline AI (A07)',
    version: '3.0',
    lastModified: '2026-09-02',
    isSystem: true,
    content: `# 19-Stage Development & Deployment Pipeline

Every capability in Infinite-AI is engineered through nineteen strict dependency-ordered stages. No stage can commence until its predecessor exit gate is verified and recorded in \`docs/STAGE_LOG.md\`.

---

### Topological Stage Manifest:
1. **Stage 00:** Ground rules, repo, toolchain & strict TypeScript configuration.
2. **Stage 01:** Data foundation, multi-tenancy & PostgreSQL Row Level Security (\`withTenant\`).
3. **Stage 02:** Identity, RBAC & Immutable SHA-256 Audit Ledger.
4. **Stage 03:** POPIA / GDPR compliance, PII scrubbers & egress membrane filter.
5. **Stage 04:** Model Gateway, multi-provider pooling, token budgeting & prompt caching.
6. **Stage 05:** Infinite Brain L0–L4 Memory Tiers & temporal restore engine.
7. **Stage 06:** Agent runtime, DAG orchestrator & bypass-proof HITL approval gates.
8. **Stage 07:** Eval harness, golden validation sets & automated LLM policy judge.
9. **Stage 08:** MOD-01 Operations & Strategic Planning Engine.
10. **Stage 09:** MOD-03 Data Warehouse & Tenant-360 Pipeline.
11. **Stage 10:** MOD-02 Incident, SLA & Support Analytics Center.
12. **Stage 11:** MOD-04 Business Operations AI Generative Toolbox.
13. **Stage 12:** MOD-05 Workforce Performance & Learning Studio.
14. **Stage 13:** Continuous Learning Engine (LE) improvement loop.
15. **Stage 14:** Experience surfaces, accessibility (WCAG AA) & performance budgets.
16. **Stage 15:** Observability, SLO telemetry & Disaster Recovery drills (RB-01/02).
17. **Stage 16:** Security hardening, threat modeling & external pen-test readiness.
18. **Stage 17:** Tenant lifecycle, automated provisioning wizard & Paystack metering.
19. **Stage 18:** Launch readiness, k6 load testing (450 VU peak) & pilot handover.`
  },
  {
    id: 'page-crm',
    slug: 'crm-system',
    title: 'CRM & Customer Lifecycle System',
    category: 'CRM & Sales',
    author: 'Customer Insights Analyst (A08)',
    version: '1.4',
    lastModified: '2026-09-01',
    isSystem: true,
    content: `# CRM Intelligence & Customer Lifecycle System

## Philosophy: Radical Transparency & Data Isolation
The Infinite-AI CRM engine synthesizes telemetry from all enterprise tenants into an actionable Customer-360 cockpit while preserving absolute database isolation.

---

### Key Capabilities
- **Predictive Churn Detection:** Analyzes daily active agent usage and API token consumption to flag accounts at risk of disengagement 30 days before renewal.
- **Enterprise Pilot Pipeline:** Manages the six-stage enterprise deal sequence:
  \`PROSPECT\` → \`BRIEFED\` → \`DEMO\` → \`PILOT GATED\` → \`PILOT ACTIVE\` → \`EXPANDED\`
- **Automated Tenant Health Index (0–100):** Continuously scores customer accounts based on:
  - Error rates (<0.1%)
  - User feedback & resolution satisfaction
  - Multi-department agent engagement depth
  - Prompt cache efficiency

---

### Active Enterprise Pilot Cohort
- **Beacon Ridge Enterprise Group:** Pilot Seed (R15,000) — *Status: Gated on PagerDuty escalation (OQ-014)*
- **Gauteng Logistics & Supply Chain:** Standard Tier (R48,000) — *Status: Demo Scheduled*
- **National Infrastructure Agency:** Enterprise Tier (R120,000) — *Status: Briefed*
- **Apex Financial Services (SME):** Standard Tier (R48,000) — *Status: Prospect*`
  },
  {
    id: 'page-finance',
    slug: 'financial-management',
    title: 'Financial Management System',
    category: 'Finance & Accounting',
    author: 'Executive Finance AI (A03)',
    version: '1.5',
    lastModified: '2026-09-02',
    isSystem: true,
    content: `# Financial Management & SaaS Unit Economics

## 3-Year Strategic SaaS Financial Model

### Core Operating Metrics
- **Annual Recurring Revenue (ARR) Target Year 3:** R12.4M ($680k USD)
- **Blended Gross Margin:** 72.4% (anchored by Model Gateway prompt caching)
- **Customer Lifetime Value (LTV):** R194,400
- **Customer Acquisition Cost (CAC):** R39,500
- **LTV : CAC Ratio:** 4.9 : 1
- **CAC Payback Period:** 10.2 months
- **Operating Cash Runway:** 18.5 months at current burn

---

### Cloud Cost Structure (AWS af-south-1 Base)
- **Fixed Infrastructure Floor:** ~R6,800 / month ($370 USD) covering VPC, RDS Postgres 16, Redis ElastiCache, ALB, and Fargate core tasks.
- **Variable Compute & Gateway:** ~R120 / tenant / month.
- **Cost Reduction Moat:** 5-minute system prompt caching yields a **78–82% reduction** in input token billing across Anthropic and Google Gemini APIs.`
  },
  {
    id: 'page-playbooks',
    slug: 'playbooks',
    title: 'Playbook Library (Sales, Marketing & Product)',
    category: 'Operations',
    author: 'Operations Workflow AI (A15)',
    version: '2.0',
    lastModified: '2026-08-29',
    isSystem: true,
    content: `# Enterprise Playbook Library

---

## 1. Sales Playbook: Enterprise Pilot Conversion
- **Objective:** Convert enterprise pilot prospects into 3-year recurring software agreements with >80% close rate.
- **Protocol:**
  1. Lead qualification performed by Inbound Lead Qualification AI (\`A29\`).
  2. Proposal & RFP Drafter AI (\`A30\`) synthesizes customized tender responses citing L0 bylaws.
  3. Commercial Lead delivers high-fidelity demo emphasizing zero PII egress and tenant RLS.
  4. Pilot Seed agreement executed with mandatory 12-week review milestones.

---

## 2. Marketing Playbook: Evidence-Led Enterprise Inbound
- **Objective:** Establish market authority in POPIA-compliant AI systems.
- **Protocol:**
  1. Content AI (\`A32\`) drafts technical whitepapers highlighting empirical red-team results.
  2. Brand Governance AI (\`A33\`) verifies anti-slop visual guidelines and terminology standards.
  3. Executive leadership publishes monthly thought pieces on African enterprise AI sovereignty.

---

## 3. Product Development Playbook: Autonomous Feature Sprinting
- **Objective:** Deliver verified product enhancements every two weeks without regression.
- **Protocol:**
  1. Feature Discovery AI (\`A18\`) synthesizes customer feedback clusters.
  2. Software Architect (\`A06\`) drafts technical specs and schema definitions.
  3. Non-bypassable HITL approval gate checks security compliance.
  4. CI pipeline tests against 19 cumulative verification gates.`
  },
  {
    id: 'page-runbooks',
    slug: 'runbooks',
    title: 'Runbook Library (DevOps, CRM & Security)',
    category: 'Operations',
    author: 'Site Reliability AI (A24)',
    version: '2.2',
    lastModified: '2026-08-27',
    isSystem: true,
    content: `# Operational Runbooks

---

## RB-01: Disaster Recovery & Database Point-in-Time Restore
- **Target RPO:** < 1 minute | **Target RTO:** < 15 minutes
- **Trigger:** Corrupted schema or accidental administrative write.
- **Execution Steps:**
  1. Halt inbound traffic via ALB maintenance maintenance target group.
  2. Retrieve latest automated WAL archive from AWS S3 in Cape Town region.
  3. Spin up standby RDS PostgreSQL instance at requested timestamp:
     \`aws rds restore-db-instance-to-point-in-time --source-db-instance-identifier ia-prod-db ...\`
  4. Verify tenant RLS table hashes against audit ledger.
  5. Swap Route 53 internal DNS CNAME and re-open gateway.

---

## RB-02: Emergency Security Incident & Safeguarding Response
- **Trigger:** High-risk keyword detected, unauthorized egress attempt, or pen-test anomaly.
- **Execution Steps:**
  1. Automated PII Membrane triggers immediate session quarantine.
  2. Webhook dispatches high-priority alert to PagerDuty live on-call schedule.
  3. Incident Commander AI (\`A45\`) generates forensic evidence bundle.
  4. Named Human Incident Commander confirms root-cause within 15 minutes.
  5. Post-mortem report filed in L4 audit ledger.`
  },
  {
    id: 'page-sops',
    slug: 'sop-library',
    title: 'Standard Operating Procedures (SOP Library)',
    category: 'Operations',
    author: 'Operations Workflow AI (A15)',
    version: '2.0',
    lastModified: '2026-09-01',
    isSystem: true,
    content: `# Standard Operating Procedures (SOPs)

---

## SOP-01: Document Creation & Ratification Workflow
- **Scope:** All formal policies, architectural specifications, and client-facing deliverables.
- **Procedure:**
  1. Intake request logged in system backlog with unique ID (e.g., \`IA-POL-04\`).
  2. Assigned departmental AI agent compiles initial draft citing Brain L0 references.
  3. Compliance AI (\`A04\`) conducts automated POPIA & brand terminology verification.
  4. Mandatory **Human-in-the-Loop (HITL)** executive review and countersignature.
  5. Cryptographic SHA-256 hash appended to Brain L4 ledger.

---

## SOP-02: AI Agent Task Execution & Guardrails
- **Scope:** All 46 autonomous departmental agents.
- **Procedure:**
  1. Task assigned via L6 DAG Orchestrator with execution timeout (30s max per node).
  2. Agent validates caller RBAC authorization.
  3. Egress guard checks model payload: zero raw PII permitted.
  4. Restricted actions (financial movement, code deployment, legal signoff) trigger immediate pause.
  5. Full request/response telemetry logged to CloudWatch with correlation ID.

---

## SOP-03: Incident Response & Escalation Framework
- **Severity Tiers:**
  - **Tier 1 (Minor):** Non-blocking UI glitch or rate-limit retry. SLA: 4 hours.
  - **Tier 2 (Degraded):** p95 latency >1,200ms or single tenant sync issue. SLA: 1 hour.
  - **Tier 3 (Critical):** Data leak alert or safeguarding trigger. SLA: 15 minutes with human page.`
  },
  {
    id: 'page-governance',
    slug: 'ai-governance-centre',
    title: 'AI Governance & Ethics Centre',
    category: 'Governance & Security',
    author: 'Executive Compliance AI (A04)',
    version: '2.0',
    lastModified: '2026-09-02',
    isSystem: true,
    content: `# AI Governance & Ethical Operations Centre

## The Four Unbreakable Architectural Laws

### Law 01 · The Membrane (Zero PII in Prompts)
No customer, employee, or learner personal data can enter an AI model context. All prompts pass through the L5 Egress Guard which tokenizes entities against a cryptographic salt. Red-team tests with 40+ adversarial jailbreak vectors have demonstrated 100% containment.

### Law 02 · The Keystone (The Human Decides)
No autonomous agent possesses independent execution rights over financial transfers, disciplinary actions, legal advice, or production code pushes. The system codebase strictly forbids \`SKIP_APPROVAL\` bypass parameters.

### Law 03 · Tree Rings (Append-Only Brain)
Organizational memory is never blindly mutated or deleted. Policies, decisions, and system updates are recorded chronologically in the Infinite Brain like tree rings—point-in-time restorable, tamper-evident, and fully explainable.

### Law 04 · Equally (Tenant Isolation)
Every database query is executed through the \`withTenant(tenant_id)\` wrapper with PostgreSQL Row Level Security enabled. Queries lacking tenant context automatically throw SQL error 42704.`
  },
  {
    id: 'page-security',
    slug: 'security-compliance',
    title: 'Security, POPIA & Risk Management Centre',
    category: 'Governance & Security',
    author: 'Security & Risk AI (A14)',
    version: '1.8',
    lastModified: '2026-08-28',
    isSystem: true,
    content: `# Security, POPIA & Risk Management Centre

## Compliance Alignment
- **POPIA (Protection of Personal Information Act):** Fully aligned with Section 72 trans-border information flows and 8 conditions of lawful processing. Primary data plane resides exclusively in South Africa.
- **GDPR Adequacy:** Standard contractual clauses & cryptographic pseudonymization applied to all tenant records.
- **King IV Principles:** Transparent AI governance, ethical leadership, and auditable risk registers.

---

### Cryptographic Tombstoning Pattern (OQ-022)
When an enterprise tenant or data subject invokes the statutory right to be forgotten:
1. The append-only event ledger cannot be destructively edited without breaking the SHA-256 hash chain.
2. We apply **Cryptographic Erasure**: the tenant-specific encryption salt is destroyed.
3. A logical tombstone record is appended to the ledger, rendering historical ciphertext mathematically irreversible while preserving the tamper-evident chain of custody.`
  },
  {
    id: 'page-integrations',
    slug: 'integrations-dashboard',
    title: 'Third-Party Integrations Dashboard',
    category: 'Engineering & DevOps',
    author: 'Principal Architect (David K.)',
    version: '1.2',
    lastModified: '2026-09-02',
    isSystem: true,
    content: `# Third-Party Tool Integrations Dashboard

The platform orchestrates ten essential enterprise SaaS tools starting with free-tier capabilities, engineered for seamless upgradeability:

1. **Notion:** Knowledge base syncing & L3 SOP documentation store.
2. **Slack:** Executive alert webhooks, incident alerts, and HITL notification bots.
3. **Trello / Jira:** Sprint backlog tracking and kanban workflow synchronization.
4. **GitHub:** 19-stage CI/CD pipeline, repository scanning, and commit audit trails.
5. **Google Workspace:** Document collaboration, shared drives, and enterprise email dispatch.
6. **Stripe / Paystack:** Multi-currency SaaS metering, subscriptions, and automated dunning.
7. **HubSpot:** Enterprise sales pipeline synchronization and CRM contact deduplication.
8. **Zapier:** Custom enterprise trigger automations across 5,000+ business applications.
9. **AWS (af-south-1):** Primary cloud data plane (ECS Fargate, RDS Postgres, pgvector, S3).
10. **Azure (Free Tier):** Secondary cloud disaster recovery and failover verification.`
  }
];
