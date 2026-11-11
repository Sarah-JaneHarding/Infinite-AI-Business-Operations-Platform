import { 
  DocumentItem, 
  WarehouseContract, 
  WarehouseTenant, 
  WarehousePolicyAgreement, 
  WarehouseAuditRecord 
} from '../../legacy/types';

export const INITIAL_WAREHOUSE_DOCUMENTS: DocumentItem[] = [
  {
    id: 'IA-SOP-001',
    title: 'SOP-01: Policy Framework Ratification & Supersession Protocol',
    type: 'SOP',
    category: 'GOVERNANCE',
    version: '1.2',
    owner: 'Sarah-Jane Harding (CEO)',
    status: 'RATIFIED',
    reviewStatus: 'RATIFIED',
    reviewNotes: 'Ratified by Executive Committee. Non-bypassable HITL verification enforced under Law 02.',
    lastUpdated: '2026-09-02',
    hash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069',
    tags: ['L0 Constitution', 'Governance', 'HITL', 'OQ-002', 'Audit'],
    countersignedBy: 'Sarah-Jane Harding (CEO & Founding Partner)',
    countersignedAt: '2026-09-02 14:30 SAST',
    countersignHash: 'sig:sha256:4a9c39e28f11d98a2e105e4c6b8d9102',
    changeLog: [
      { version: '1.0', date: '2026-08-15', author: 'Operations Lead', summary: 'Initial draft of ratification guidelines' },
      { version: '1.1', date: '2026-08-25', author: 'Legal Counsel', summary: 'Incorporated POPIA Section 72 statutory constraints' },
      { version: '1.2', date: '2026-09-02', author: 'Sarah-Jane Harding', summary: 'Ratified and locked into Brain L0 immutable ring' }
    ],
    content: `# SOP-01: Policy Framework Ratification & Supersession Protocol
**Document ID:** IA-SOP-001  
**Classification:** L0 Constitution & Statutory Governance  
**Custodian:** Chief Executive Officer & Founding Partner  
**Effective Date:** 2026-09-02  
**Target Architecture:** Infinite Brain L0 Immutable Ring  

---

## 1. Purpose & Scope
This Standard Operating Procedure (SOP) defines the non-bypassable protocol for creating, reviewing, editing, and executing statutory countersignatures on all enterprise policy frameworks, customer contracts, and ecosystem specifications. 

In strict adherence to **System Law 02 (Human-in-the-Loop Supremacy)**:
> No artificial intelligence agent, autonomous queue, or automated workflow may ratify, alter, or countersign an L0 constitutional document without verified human executive authorization.

---

## 2. Document Lifecycle Stages
Every operational document ingested or drafted in the Infinite-AI ecosystem must traverse four mandatory gates:

\`\`\`
[ DRAFT ] ──> [ INTERNAL REVIEW ] ──> [ LEGAL & COMPLIANCE ] ──> [ RATIFICATION CEREMONY ] ──> [ BRAIN L0 COMMIT ]
\`\`\`

1. **Stage 1: Ingestion & Draft Creation**
   - Authors compose markdown documentation using standardized metadata tokens.
   - Initial SHA-256 integrity hash is computed upon creation.

2. **Stage 2: Technical & Operational Review**
   - Technical cross-checks against AWS af-south-1 architecture, CAPS curriculum guidelines, or SIAS protocols.
   - Automated LLM judge scans for contradictions with existing L0 policies.

3. **Stage 3: Legal & POPIA Alignment**
   - Verification that no student personally identifiable information (PII) is exposed.
   - Statutory compliance check with South African POPIA Act 4 of 2013 and Section 72 cross-border data transfer rules.

4. **Stage 4: Executive Countersignature**
   - The Chief Executive Officer or delegated Signing Authority reviews final diffs.
   - Cryptographic signature generated and recorded in the append-only Merkle ledger.

---

## 3. Mandatory Review Checklist
Before any document is marked **READY_TO_SIGN**, the reviewer must certify:
- [x] **POPIA Compliance**: Confirms all student records remain de-identified within tenant RLS schemas.
- [x] **Infrastructure Cost Reality**: Confirms unit pricing matches the R4,000/mo school baseline and AWS Cape Town margins.
- [x] **SLO Consistency**: Confirms latency (p95 < 200ms) and uptime commitments (99.9%) are technically feasible.
- [x] **Audit Chain Integrity**: Confirms document hash links into preceding Merkle root.

---

## 4. Supersession & Version Bumping
When an operational policy requires modification:
- A new minor version (e.g., v1.1 → v1.2) is cut for procedural updates.
- A major version (e.g., v1.x → v2.0) requires full re-ratification by the Board of Directors.
- Previous versions are never deleted from the Data Warehouse; they are marked **SUPERSEDED** with an immutable cryptographic tombstone.

*Authorized by: Executive Committee, Infinite-AI Operations Platform.*`
  },
  {
    id: 'IA-BP-2026-001',
    title: 'Comprehensive Business Operations Package & 3-Year Model FY26–29',
    type: 'PLAN',
    category: 'COMMERCIAL',
    version: '2.0',
    owner: 'Sarah-Jane Harding (CEO)',
    status: 'RATIFIED',
    reviewStatus: 'RATIFIED',
    reviewNotes: 'Updated with R4,000 / month / school pricing baseline and 25-school cohort milestones.',
    lastUpdated: '2026-09-02',
    hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    tags: ['Business Plan', 'R4k Baseline', 'Financials', 'ARR', 'Multi-Tenant'],
    countersignedBy: 'Sarah-Jane Harding (CEO)',
    countersignedAt: '2026-09-02 16:45 SAST',
    countersignHash: 'sig:sha256:91b2c3d4e5f67a8b9c0d1e2f3a4b5c6d',
    changeLog: [
      { version: '1.0', date: '2026-08-01', author: 'Strategy Pod', summary: 'Initial commercial roadmap' },
      { version: '2.0', date: '2026-09-02', author: 'Sarah-Jane Harding', summary: 'Calibrated to primary school affordability (R4,000/mo) and AWS af-south-1 cost model' }
    ],
    content: `# Comprehensive Business Operations Package FY26–29
**Document ID:** IA-BP-2026-001  
**Category:** Commercial Strategy & Operational Execution  
**Author:** Sarah-Jane Harding, Chief Executive Officer  

---

## Executive Summary
Infinite-AI provides an enterprise multi-agent operational platform tailored for South African primary schools and educational ecosystems. The system delivers 46 departmental AI agents spanning curriculum planning, SIAS inclusive education triage, administrative reporting, and SGB governance.

### Core Pricing Architecture
- **Standard Primary School Tier:** **R4,000 ZAR / school / month** (R48,000 ZAR / year).
- **Inclusions:** Complete access to all 46 specialized agents, unlimited teacher lesson planning, automated diagnostic assessment drafting, and POPIA-compliant data residency in AWS Cape Town (\`af-south-1\`).
- **Zero Student-Head Surcharges:** Fixed institutional subscription ensures budget certainty for School Governing Bodies (SGBs).

---

## Unit Economics & Infrastructure COGS
Our hybrid multi-tenant architecture leverages AWS Cape Town with strict PostgreSQL Row-Level Security (RLS) and Anthropic Claude prompt caching:

| Component | Cost per Month (ZAR) | Cost Model |
| :--- | :--- | :--- |
| **Fixed AWS Cape Town Infrastructure** | R6,475 (~$350 USD) | Shared platform base (ECS, RDS, S3, KMS) |
| **Fixed Operational Tooling** | R864 | Sentry, BetterStack, Domain/DNS |
| **Total Fixed Floor** | **R7,339 / mo** | Covered at just 3 schools |
| **Variable Cost per School (Anthropic + S3)** | **R1,074 / school / mo** | 2.2M tokens @ 80% prompt cache hit rate |

### Margin Progression at R4,000/mo:
- **3 Schools (Break-Even):** MRR R12,000 | COGS R10,561 | Gross Margin 12.0%
- **10 Schools (Pilot Cohort):** MRR R40,000 | COGS R18,079 | Gross Margin 54.8%
- **25 Schools (Phase 1 Target):** MRR R100,000 | COGS R34,189 | Gross Margin 65.8%
- **50 Schools (District Scale):** MRR R200,000 | COGS R61,039 | Gross Margin 69.5%
- **100 Schools (National Scale):** MRR R400,000 | COGS R114,739 | Gross Margin 71.3%

---

## Statutory Risk & Guardrails
- **POPIA Act 4 of 2013:** All student performance records, special educational needs diagnostics, and guardian interactions remain strictly de-identified in localized AWS data centers.
- **Human-In-The-Loop:** AI draft outputs (such as disciplinary recommendations or SIAS support referrals) cannot be finalized without educator approval.`
  },
  {
    id: 'CON-DOC-081',
    title: 'Standard Primary School SaaS Subscription Master Agreement',
    type: 'CONTRACT',
    category: 'LEGAL',
    version: '1.1',
    owner: 'Legal Counsel & Sales Operations',
    status: 'RATIFIED',
    reviewStatus: 'RATIFIED',
    reviewNotes: 'Standard template vetted by external education law counsel for South African public & independent schools.',
    lastUpdated: '2026-09-01',
    hash: 'sha256:c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a9f8e7d6c5b4a39281706f5e4d3',
    tags: ['Contract', 'School SaaS', 'R4k/mo', 'SGB', 'POPIA DPA'],
    countersignedBy: 'Sarah-Jane Harding & SGB Representative',
    countersignedAt: '2026-09-01 11:15 SAST',
    countersignHash: 'sig:sha256:8812a4f9103e5c7a2b9e4d6c1b3f7a90',
    changeLog: [
      { version: '1.0', date: '2026-08-10', author: 'Commercial Lead', summary: 'Initial contract draft' },
      { version: '1.1', date: '2026-09-01', author: 'Legal Counsel', summary: 'Added statutory SGB resolution annexure and POPIA schedule' }
    ],
    content: `# Standard Primary School SaaS Master Subscription Agreement
**Agreement Reference:** CON-DOC-081  
**Parties:** Infinite-AI Operations (Pty) Ltd ("Service Provider") AND The School Governing Body ("Subscriber")  
**Standard Subscription Rate:** R4,000.00 ZAR per month (payable monthly or annually in advance)  
**Governing Law:** Republic of South Africa  

---

## 1. Subscription Services & Agent Access
1.1 The Service Provider grants the Subscriber a non-exclusive, multi-user license to access the **Infinite-AI Education Ecosystem Platform**, comprising 46 specialized artificial intelligence agents.  
1.2 The subscription grants unlimited access for all certified educators, administrative staff, and School Management Team (SMT) members employed at the designated campus.  
1.3 Platform capabilities include automated CAPS lesson plan drafting, diagnostic rubric compilation, SIAS case coordination, and automated statutory quarterly return previews.

---

## 2. Financial Terms & Invoicing
2.1 **Monthly Subscription Fee:** R4,000.00 ZAR net of VAT.  
2.2 **Annual Equivalent:** R48,000.00 ZAR per annum.  
2.3 **Payment Terms:** 30 days from date of electronic invoice via Paystack direct debit or EFT.  
2.4 **Price Protection:** The monthly fee of R4,000.00 ZAR shall remain fixed for twenty-four (24) months from the Effective Date.

---

## 3. Data Protection & POPIA Compliance (Act 4 of 2013)
3.1 The Service Provider acts strictly as an **Operator** in terms of Section 1 of the Protection of Personal Information Act. The Subscriber remains the **Responsible Party**.  
3.2 All data is stored exclusively within the AWS African Region (\`af-south-1\`, Cape Town, South Africa) protected by AES-256 envelope encryption.  
3.3 Student personal identifiable information (PII) is automatically scrubbed by the Model Gateway prior to external inference.

---

## 4. Term, Termination & Data Return
4.1 The initial term is twelve (12) months, renewing automatically unless ninety (90) days written notice is given.  
4.2 Upon termination, all tenant records, lesson plans, and diagnostic history will be packaged into encrypted archives and transmitted to the SGB, followed by permanent cryptographic tombstoning.`
  },
  {
    id: 'POL-AGR-001',
    title: 'POPIA Section 72 Operator Data Protection Addendum (DPA)',
    type: 'POLICY',
    category: 'GOVERNANCE',
    version: '1.0',
    owner: 'Compliance Officer',
    status: 'RATIFIED',
    reviewStatus: 'RATIFIED',
    reviewNotes: 'Strict adherence to Information Regulator guidelines for schools handling minor learner data.',
    lastUpdated: '2026-08-28',
    hash: 'sha256:5a4b3c2d1e0f9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b',
    tags: ['POPIA', 'Section 72', 'DPA', 'Child Safeguarding', 'Compliance'],
    countersignedBy: 'Sarah-Jane Harding (CEO)',
    countersignedAt: '2026-08-28 10:00 SAST',
    countersignHash: 'sig:sha256:1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d',
    changeLog: [
      { version: '1.0', date: '2026-08-28', author: 'Compliance Officer', summary: 'Ratified DPA standard addendum' }
    ],
    content: `# POPIA Section 72 Operator Data Protection Addendum
**Document ID:** POL-AGR-001  
**Statutory Framework:** Protection of Personal Information Act (Act No. 4 of 2013), Sections 71–72  
**Applicability:** All Tenant Subscriptions, Vendor Integrations & Model Pipelines  

---

## 1. Statutory Invariants
In accordance with South African law regarding the processing of special personal information concerning children:
1. **Zero External PII Transfer:** No student name, South African National ID number, date of birth, home address, or guardian contact details may be transmitted outside the sovereign borders of the Republic of South Africa.
2. **Pre-Inference Scrubbing:** The L2 Guardrail layer executes deterministic regex and named-entity recognition (NER) redaction, substituting real learner identifiers with synthetic tenant tokens (e.g., \`[LEARNER_TOKEN_489]\`).
3. **Audit Immutability:** Every processing operation is recorded in the SHA-256 Merkle audit ledger with timestamps and user role tracking.

---

## 2. Cross-Border Safeguards (Section 72)
Where cloud inference utilizes global LLM model endpoints (e.g., Anthropic Claude):
- Prompts must contain solely pedagogical concepts, curriculum syllabi, and de-identified learner capability vectors.
- Sub-processors must be bound by standard contractual clauses ensuring protections equal to or exceeding POPIA Chapter 3 principles.`
  },
  {
    id: 'IA-DR-001',
    title: 'Disaster Recovery & High-Availability Runbook (af-south-1 Multi-AZ)',
    type: 'SOP',
    category: 'TECHNICAL',
    version: '1.3',
    owner: 'Head of Infrastructure',
    status: 'LIVE',
    reviewStatus: 'READY_TO_SIGN',
    reviewNotes: 'Drill RB-01 (DB restore) and RB-02 (Brain restore) verified in CI with RTO < 15m.',
    lastUpdated: '2026-09-01',
    hash: 'sha256:9f8e7d6c5b4a39281706f5e4d3c2b1a0f9e8d7c6b5a4938271605f4e3d2c1b0a',
    tags: ['Disaster Recovery', 'RTO', 'RPO', 'AWS Cape Town', 'Aurora'],
    changeLog: [
      { version: '1.0', date: '2026-07-20', author: 'Infra Pod', summary: 'Baseline DR spec' },
      { version: '1.3', date: '2026-09-01', author: 'Head of Infra', summary: 'Added RB-01 and RB-02 drill confirmation logs' }
    ],
    content: `# Disaster Recovery & High-Availability Runbook
**Runbook ID:** IA-DR-001  
**Cloud Region:** AWS Cape Town (\`af-south-1\`) Multi-AZ  
**Target Recovery Time Objective (RTO):** < 15 minutes  
**Target Recovery Point Objective (RPO):** < 1 minute  

---

## 1. High-Availability Topography
- **Primary Compute:** ECS Fargate deployed across \`af-south-1a\` and \`af-south-1b\`.
- **Database:** Amazon RDS Aurora PostgreSQL 16 Multi-AZ with automatic failover (< 30 seconds).
- **Persistent Storage:** S3 Standard-IA with cross-bucket versioning and 90-day transition to Glacier Deep Archive.

---

## 2. Emergency Recovery Procedures (Drill RB-01)
In the event of database corruption or unrecoverable instance failure:
1. Trigger automated point-in-time recovery via AWS CLI to the last validated Merkle hash checkpoint.
2. Verify table row counts against the Tenant-360 reconciliation ledger.
3. Validate KMS envelope encryption keys:
   \`\`\`bash
   aws rds restore-db-instance-to-point-in-time \\
     --source-db-instance-identifier infinite-ai-prod-db \\
     --target-db-instance infinite-ai-restored-db \\
     --restore-time 2026-09-02T12:00:00Z \\
     --region af-south-1
   \`\`\`
4. Reroute Application Load Balancer target group to the restored cluster.`
  },
  {
    id: 'IA-SAFEGUARD-002',
    title: 'Department of Basic Education SIAS & MTSS Triage Protocol',
    type: 'SOP',
    category: 'ECOSYSTEM',
    version: '1.0',
    owner: 'Education Operations Lead',
    status: 'REVIEW',
    reviewStatus: 'IN_REVIEW',
    reviewNotes: 'Pending final countersignature from School Management Advisory Board.',
    lastUpdated: '2026-08-30',
    hash: 'sha256:3a2b1c0d9e8f7a6b5c4d3e2f1a0b9c8d7e6f5a4b3c2d1e0f9a8b7c6d5e4f3a2b',
    tags: ['SIAS', 'MTSS', 'Special Needs', 'Department of Education', 'Triage'],
    changeLog: [
      { version: '1.0', date: '2026-08-30', author: 'Education Lead', summary: 'Aligned with DBE SIAS Policy Document 2014' }
    ],
    content: `# Department of Basic Education SIAS & MTSS Triage Protocol
**Document ID:** IA-SAFEGUARD-002  
**National Alignment:** DBE Policy on Screening, Identification, Assessment and Support (SIAS, 2014)  
**System Module:** MOD-02 Support & Inclusive Education Center  

---

## 1. Tier 1 to Tier 3 Triage Protocol
The platform provides non-diagnostic decision support for educators navigating learning barriers:

1. **Tier 1 (Universal Classroom Support):**
   - Differentiated instruction lesson templates generated automatically based on CAPS requirements.
2. **Tier 2 (Targeted School-Based Support Team Intervention):**
   - Individual Support Plans (ISPs) drafted by the SIAS Co-Pilot with parental consultation log.
3. **Tier 3 (District-Based Support Team Escalation):**
   - Formal referral dossiers assembled with full evidentiary audit logs for District Psychologists.

> **Crucial Safeguard:** AI agents are strictly prohibited from generating clinical diagnoses or prescribing medication. All suggestions require validation by a registered educator or educational psychologist.`
  }
];

export const INITIAL_WAREHOUSE_CONTRACTS: WarehouseContract[] = [];

export const INITIAL_WAREHOUSE_TENANTS: WarehouseTenant[] = [];

export const INITIAL_WAREHOUSE_POLICIES: WarehousePolicyAgreement[] = [
  {
    id: 'POL-AGR-001',
    title: 'POPIA Section 72 Operator Data Protection Addendum (DPA)',
    jurisdiction: 'South Africa (POPIA Act 4 of 2013)',
    scope: 'All student identifiable data & assessment vectors',
    enforcementLevel: 'L0_IMMUTABLE',
    status: 'ACTIVE_RATIFIED',
    effectiveDate: '2026-08-28',
    nextReviewDate: '2027-08-27',
    governingBody: 'Information Regulator of South Africa',
    documentRefId: 'POL-AGR-001',
    retentionYears: 5,
    tombstoneEligible: true
  },
  {
    id: 'POL-AGR-002',
    title: 'SGB Child Safeguarding & Ethical AI Interaction Compact',
    jurisdiction: 'South Africa (Children\'s Act 38 of 2005 & DBE Policy)',
    scope: 'Classroom agent conversational prompts & SIAS Tier 1-3 referrals',
    enforcementLevel: 'L0_IMMUTABLE',
    status: 'ACTIVE_RATIFIED',
    effectiveDate: '2026-08-30',
    nextReviewDate: '2027-08-29',
    governingBody: 'Department of Basic Education & SGB Association',
    documentRefId: 'IA-SAFEGUARD-002',
    retentionYears: 7,
    tombstoneEligible: false
  },
  {
    id: 'POL-AGR-003',
    title: 'Cloud Infrastructure Service Level Agreement (SLA 99.9%)',
    jurisdiction: 'South Africa (Commercial Contracts)',
    scope: 'AWS af-south-1 availability, MTTR < 45m, PagerDuty escalation',
    enforcementLevel: 'L1_RESTRICTIVE',
    status: 'ACTIVE_RATIFIED',
    effectiveDate: '2026-09-01',
    nextReviewDate: '2027-08-31',
    governingBody: 'Infinite-AI Technical Steering Committee',
    documentRefId: 'IA-DR-001',
    retentionYears: 3,
    tombstoneEligible: true
  },
  {
    id: 'POL-AGR-004',
    title: 'Multi-Tenant Data Isolation & Tombstone Invariant Standard',
    jurisdiction: 'International ISO/IEC 27001 & POPIA',
    scope: 'PostgreSQL Row-Level Security, KMS Customer Managed Keys',
    enforcementLevel: 'L0_IMMUTABLE',
    status: 'ACTIVE_RATIFIED',
    effectiveDate: '2026-08-25',
    nextReviewDate: '2027-08-24',
    governingBody: 'Infinite-AI Security & Architecture Pod',
    documentRefId: 'IA-SOP-001',
    retentionYears: 10,
    tombstoneEligible: true
  }
];

export const INITIAL_WAREHOUSE_AUDIT_LOG: WarehouseAuditRecord[] = [
  {
    id: 'AUD-901',
    timestamp: '2026-09-02 16:45:12 SAST',
    entityType: 'DOCUMENT',
    entityId: 'IA-BP-2026-001',
    action: 'RATIFY',
    actor: 'Sarah-Jane Harding',
    actorRole: 'Chief Executive Officer',
    details: 'Ratified Comprehensive Business Operations Package v2.0 with R4k/mo baseline.',
    merkleHash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'
  },
  {
    id: 'AUD-902',
    timestamp: '2026-09-02 14:30:28 SAST',
    entityType: 'DOCUMENT',
    entityId: 'IA-SOP-001',
    action: 'RATIFY',
    actor: 'Sarah-Jane Harding',
    actorRole: 'CEO & Founding Partner',
    details: 'Constitutional commit: SOP-01 locked into Brain L0 immutable ring.',
    merkleHash: 'sha256:7f83b1657ff1fc53b92dc18148a1d65dfc2d4b1fa3d677284addd200126d9069'
  },
  {
    id: 'AUD-903',
    timestamp: '2026-09-01 10:00:00 SAST',
    entityType: 'WAREHOUSE',
    entityId: 'MOD-03-DATASTORE',
    action: 'INITIALIZE',
    actor: 'Infrastructure Orchestrator',
    actorRole: 'System Pipeline',
    details: 'Initialized multi-tenant schema repository and KMS envelope encryption in af-south-1.',
    merkleHash: 'sha256:4f3e2d1c0b9a8f7e6d5c4b3a2f1e0d9c8b7a6f5e4d3c2b1a0f9e8d7c6b5a4938'
  }
];
