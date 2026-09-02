import { StageGate, OpenQuestion, RiskItem, BusinessModule, DealItem, DocumentItem } from '../types';

export const INITIAL_STAGES: StageGate[] = [
  {
    id: '00',
    name: 'Ground rules, repo, toolchain & strict TS',
    dependsOn: '—',
    status: 'PASS',
    summary: 'Pre-commit hooks had silently never installed in initial sandbox; caught by CI verification gate and fixed.',
    details: 'Toolchain enforced: TypeScript 5.8 strict mode, Turborepo pipeline, pnpm workspace isolation, forbid-bypass ESLint rules.',
    command: 'pnpm verify:stage 00',
    testCount: 42
  },
  {
    id: '01',
    name: 'Data foundation, multi-tenancy & Row Level Security (RLS)',
    dependsOn: '00',
    status: 'PASS',
    summary: 'RLS suite green in CI across tenant boundary validation. Context-less queries throw SQL 42704.',
    details: 'Postgres 16 RLS enforced via withTenant() transaction wrapper. current_setting(\'app.tenant_id\', false) raising form verified.',
    command: 'pnpm verify:stage 01',
    testCount: 88
  },
  {
    id: '02',
    name: 'Identity, RBAC & Immutable Audit Ledger',
    dependsOn: '01',
    status: 'GAP',
    summary: 'Integrity alert: No exit-gate entry recorded; hash-chain verification lived on separate branch; dead guard left in codebase.',
    details: 'Remediation available: run retroactive verification suite, merge SHA-256 audit ledger hash chain into main branch, and mark gate passed.',
    command: 'pnpm verify:stage 02',
    testCount: 64
  },
  {
    id: '03',
    name: 'POPIA / GDPR compliance & PII Membrane',
    dependsOn: '01, 02',
    status: 'PASS',
    summary: 'Egress guard on single pathway; red-team 40+ injection attacks blocked. CSP nonce leak resolved.',
    details: 'Zero un-scrubbed PII can exit through the model gateway. De-identification provenance stamp required on all model payloads.',
    command: 'pnpm verify:stage 03',
    testCount: 104
  },
  {
    id: '04',
    name: 'Model Gateway, pooling, failover & token budgeting',
    dependsOn: '00',
    status: 'PASS',
    summary: 'Multi-provider pooling (Claude 3.7 / Sonnet 4.6, Gemini 2.5 Flash), circuit breakers, caching proven in CI.',
    details: 'Hard tenant spend quotas. 5-minute system prompt caching achieves 80% input token cost reduction.',
    command: 'pnpm verify:stage 04',
    testCount: 76
  },
  {
    id: '05',
    name: 'Infinite Brain L0–L4 Memory Tiers',
    dependsOn: '01, 03, 04',
    status: 'PASS',
    summary: 'Temporal, supersession, and point-in-time restore tests green in CI. Append-only invariants hold.',
    details: 'L0 Constitution & Policy, L1 Ingested Data, L2 Semantic Vector Knowledge Graph (pgvector), L3 SOPs & Workflows, L4 Episodic Working Memory.',
    command: 'pnpm verify:stage 05',
    testCount: 112
  },
  {
    id: '06',
    name: 'Agent runtime, DAG orchestrator, HITL approval gates',
    dependsOn: '04, 05',
    status: 'PASS',
    summary: 'Durability + bypass-proof human approval gates green in CI. Human approval gates have NO bypass flags.',
    details: 'DAG state machine supports branching, pause-on-approval, SLA timeouts, and auditable event replay.',
    command: 'pnpm verify:stage 06',
    testCount: 92
  },
  {
    id: '07',
    name: 'Eval harness, golden sets & LLM judge',
    dependsOn: '06',
    status: 'PASS',
    summary: 'Judge mechanism and metric harness operational; calibration dataset hand-labelled validation active.',
    details: 'Fidelity evaluation tests answer keys, factual consistency, and compliance to corporate governance bylaws.',
    command: 'pnpm verify:stage 07',
    testCount: 58
  },
  {
    id: '08',
    name: 'MOD-01 Operations & Strategic Planning Engine',
    dependsOn: '06, 07',
    status: 'PASS',
    summary: 'Strategy decomposition engine verified: Corporate Vision → AOP → OKRs → Quarterly Sprints → Resource DAG.',
    details: 'Ingested 136 core policy frameworks. Ratification workflow ready for executive countersignatures.',
    command: 'pnpm verify:stage 08',
    testCount: 130
  },
  {
    id: '09',
    name: 'MOD-03 Data Warehouse & Tenant-360 Pipeline',
    dependsOn: '03, 06',
    status: 'PASS',
    summary: 'Reconciliation, schema conformity, and quarantine tests green in CI.',
    details: 'Converts disparate ERP, CRM, and ticketing data into unified, de-identified Tenant-360 customer records.',
    command: 'pnpm verify:stage 09',
    testCount: 84
  },
  {
    id: '10',
    name: 'MOD-02 Incident, SLA & Support Analytics Center',
    dependsOn: '09',
    status: 'PASS',
    summary: 'Triage state machine operational: Screen → Health Score → Tier 1/2/3 → Escalation → Review.',
    details: 'Automated PagerDuty webhook dispatch for Critical incidents with zero silent drops.',
    command: 'pnpm verify:stage 10',
    testCount: 72
  },
  {
    id: '11',
    name: 'MOD-04 Business Operations AI Toolbox',
    dependsOn: '08, 10',
    status: 'PASS',
    summary: 'Specialist generative business agents verified: RFP response, SLA audit memo, board packs.',
    details: 'Double-run validation: numerical answers independently re-verified against warehouse data.',
    command: 'pnpm verify:stage 11',
    testCount: 96
  },
  {
    id: '12',
    name: 'MOD-05 Workforce Performance & Learning Studio',
    dependsOn: '08, 09, 11',
    status: 'PASS',
    summary: 'Competency gap analysis engine active. Generates role-specific micro-training without punitive rankings.',
    details: 'Professional development credit ledger integrates with internal accreditation standards.',
    command: 'pnpm verify:stage 12',
    testCount: 68
  },
  {
    id: '13',
    name: 'Learning Engine (LE) Continuous Improvement Loop',
    dependsOn: '07, 12',
    status: 'PASS',
    summary: 'Promotion gates and automated rollback proven in CI. Learns from human corrections safely.',
    details: 'Audit trail records every model prompt adjustment; bias checks run automatically before promotion.',
    command: 'pnpm verify:stage 13',
    testCount: 54
  },
  {
    id: '14',
    name: 'Experience surfaces, accessibility & performance budgets',
    dependsOn: '08–13',
    status: 'PASS',
    summary: 'Lighthouse 95+ and WCAG AA accessibility budgets green in CI.',
    details: 'Responsive executive command, operations dashboards, low-bandwidth mode for distributed teams.',
    command: 'pnpm verify:stage 14',
    testCount: 46
  },
  {
    id: '15',
    name: 'Observability, SLOs, Telemetry & Disaster Recovery',
    dependsOn: '14',
    status: 'PASS',
    summary: 'Full restore drills recorded (RB-01 DB restore, RB-02 Brain restore). RTO < 15m, RPO < 1m.',
    details: 'Structured telemetry via CloudWatch & OpenTelemetry. Distributed tracing through model gateway.',
    command: 'pnpm verify:stage 15',
    testCount: 60
  },
  {
    id: '16',
    name: 'Security hardening, threat model & pen-test prep',
    dependsOn: '15',
    status: 'PASS',
    summary: 'CVE audit clean, supply-chain package locks pinned, secrets manager envelope encryption verified.',
    details: 'External penetration test scope finalized. POPIA technical safeguards documented.',
    command: 'pnpm verify:stage 16',
    testCount: 78
  },
  {
    id: '17',
    name: 'Tenant lifecycle, provisioning, billing & metering',
    dependsOn: '16',
    status: 'PASS',
    summary: 'Automated onboarding wizard with retention schedule ratification tested end-to-end.',
    details: 'Metered billing ledger tracks token consumption and storage footprint per tenant with Paystack/Stripe.',
    command: 'pnpm verify:stage 17',
    testCount: 66
  },
  {
    id: '18',
    name: 'Launch readiness, load testing & pilot handover',
    dependsOn: '17',
    status: 'PROG',
    summary: 'k6 load test scripts ready (450 VU peak, 600 VU spike). PagerDuty credential integration pending.',
    details: 'Gated on OQ-014 (PagerDuty paging human escalation) before full pilot tenant onboarding.',
    command: 'pnpm verify:stage 18',
    testCount: 40
  }
];

export const INITIAL_MODULES: BusinessModule[] = [
  {
    id: 'brain',
    code: 'BRAIN',
    name: 'Infinite Brain (L0–L4)',
    originalRef: 'Infinite Brain',
    purpose: 'Durable corporate memory that preserves organizational policies, decisions, and knowledge without destructive overwriting.',
    habitatName: 'Root Network',
    habitatIcon: '🌱',
    accentColor: 'var(--cyan)',
    agents: ['L0 Constitution Agent', 'L1 Evidence Ingester', 'L2 Semantic Graph Weaver', 'L3 SOP Validator', 'L4 Working Memory Agent'],
    metrics: [
      { label: 'Indexed Nodes', value: '14,820', change: '+12% this week' },
      { label: 'Policy Records', value: '136 ratified' },
      { label: 'Query Latency', value: '18ms (p95)' }
    ]
  },
  {
    id: 'mod-01',
    code: 'MOD-01',
    name: 'Strategy & Operations Planning Engine',
    originalRef: 'MOD-01 Curriculum Engine',
    purpose: 'Deconstructs high-level enterprise vision into Annual Operating Plans, quarterly OKRs, sprint milestones, and resource capacity.',
    habitatName: 'Growing Season',
    habitatIcon: '☀️',
    accentColor: 'var(--violet)',
    agents: ['Vision Synthesizer', 'OKR Cascade Agent', 'Capacity Planner', 'Roadmap Align Agent', 'Sprint Generator'],
    metrics: [
      { label: 'Active Plans', value: '18 divisions' },
      { label: 'OKR Alignment', value: '94.2%' },
      { label: 'Planning Velocity', value: '4.5x faster' }
    ]
  },
  {
    id: 'mod-02',
    code: 'MOD-02',
    name: 'Support & Incident Escalation Center',
    originalRef: 'MOD-02 Support Analytics Centre (SIAS/MTSS)',
    purpose: 'Automated Tier 1–3 incident screening, MTTR reduction, root-cause investigation, and emergency safeguarding paging.',
    habitatName: 'Watering Hole',
    habitatIcon: '💧',
    accentColor: 'var(--rose)',
    agents: ['Incident Triage Bot', 'SLA Breach Predictor', 'Root Cause Detective', 'Escalation Dispatcher', 'Resolution Drafter'],
    metrics: [
      { label: 'Open Incidents', value: '3 active', change: '0 critical' },
      { label: 'MTTR Average', value: '38 minutes', change: '-45% QoQ' },
      { label: 'SLA Adherence', value: '99.8%' }
    ]
  },
  {
    id: 'mod-03',
    code: 'MOD-03',
    name: 'Enterprise Data Warehouse & Tenant-360',
    originalRef: 'MOD-03 Data Collection & Warehouse',
    purpose: 'High-throughput data ingestion, schema conformity checks, automated PII de-identification, and unified customer health scores.',
    habitatName: 'Watershed',
    habitatIcon: '🏞',
    accentColor: 'var(--sky)',
    agents: ['Warehouse Ingest Pipeline', 'PII Scrub Agent', 'Schema Conformer', 'Tenant-360 Aggregator', 'Anomaly Spotter'],
    metrics: [
      { label: 'Tenants Monitored', value: '25 enterprise' },
      { label: 'Records Ingested', value: '2.4M today' },
      { label: 'Quarantine Rate', value: '0.02%' }
    ]
  },
  {
    id: 'mod-04',
    code: 'MOD-04',
    name: 'Operations & AI Productivity Toolbox',
    originalRef: 'MOD-04 Teaching & Learning Toolbox',
    purpose: 'Specialist generative business agents that compile verified RFP responses, SLA audit memos, executive board packs, and contract compliance reviews.',
    habitatName: 'Workshop Grove',
    habitatIcon: '🐝',
    accentColor: 'var(--spark)',
    agents: ['RFP Answer Drafter', 'Board Pack Compiler', 'SLA Memo Generator', 'Contract Auditor', 'Executive Briefer'],
    metrics: [
      { label: 'Drafter Agents', value: '14 active' },
      { label: 'Hours Saved', value: '62 hrs/wk per exec' },
      { label: 'First-Pass Rate', value: '88.4%' }
    ]
  },
  {
    id: 'mod-05',
    code: 'MOD-05',
    name: 'Workforce Performance & Learning Studio',
    originalRef: 'MOD-05 Teaching Analytics & PD Studio',
    purpose: 'Workforce capability tracking, skill gap detection, on-demand custom training pathways, and professional development accreditation.',
    habitatName: 'Nesting Ground',
    habitatIcon: '🪺',
    accentColor: 'var(--leaf)',
    agents: ['Skill Gap Analyzer', 'Micro-Course Builder', 'Accreditation Tracer', 'Team Growth Coach', 'Review Synthesizer'],
    metrics: [
      { label: 'Active Trainees', value: '340 staff' },
      { label: 'Course Completion', value: '82.5%' },
      { label: 'Capability Score', value: '+24 pts' }
    ]
  }
];

export const INITIAL_OPEN_QUESTIONS: OpenQuestion[] = [
  {
    id: 'OQ-002',
    question: 'Countersign 136 ingested core business & policy frameworks (L0 ratification)',
    blocks: 'MOD-01 planning outputs',
    owner: 'Chief Executive Officer',
    status: 'OPEN'
  },
  {
    id: 'OQ-003',
    question: 'Countersign enterprise operational review & sprint planning templates',
    blocks: 'MOD-01 fidelity check',
    owner: 'VP Operations',
    status: 'OPEN'
  },
  {
    id: 'OQ-006',
    question: 'Internal capability certification table & credits alignment for MOD-05',
    blocks: 'MOD-05 auto-logging',
    owner: 'Chief People Officer',
    status: 'OPEN'
  },
  {
    id: 'OQ-013',
    question: 'Multi-lingual operations scope: primary corporate English vs regional translations',
    blocks: 'MOD-04 language support',
    owner: 'Product Lead',
    status: 'DECISION'
  },
  {
    id: 'OQ-014',
    question: 'Paging escalation vendor (PagerDuty) & named human incident commander on-call',
    blocks: 'Critical Incident Gateway; gates pilot onboarding',
    owner: 'CEO & Head of Infra',
    status: 'CRITICAL'
  },
  {
    id: 'OQ-015',
    question: 'Corporate governance compliance judge implementation (policy clause cross-verifier)',
    blocks: 'Guardrail verdicts',
    owner: 'Lead AI Engineer',
    status: 'OPEN'
  },
  {
    id: 'OQ-016',
    question: '50+ hand-labelled enterprise test outputs to calibrate LLM eval judge',
    blocks: 'Golden set eval quality',
    owner: 'Operations Advisory',
    status: 'OPEN'
  },
  {
    id: 'OQ-017',
    question: 'k6 peak (450 VU) and spike (600/300 VU) performance test on live cloud endpoint',
    blocks: 'Stage 18 sign-off',
    owner: 'DevOps Pod',
    status: 'BLOCKED'
  },
  {
    id: 'OQ-018',
    question: 'Recalibrate tier pricing vs real token telemetry post-pilot',
    blocks: 'Long-term gross margin target',
    owner: 'Finance Director',
    status: 'DEFERRED'
  },
  {
    id: 'OQ-019',
    question: 'Confirm first enterprise pilot cohort (strictly gated on OQ-014)',
    blocks: 'Commercial revenue milestone',
    owner: 'CEO & Head of Sales',
    status: 'BLOCKED'
  },
  {
    id: 'OQ-021',
    question: 'Transactional email provider configuration (Amazon SES default in af-south-1 vs Postmark)',
    blocks: 'Automated dunning & customer alert notices',
    owner: 'Engineering',
    status: 'DONE'
  },
  {
    id: 'OQ-022',
    question: 'POPIA / GDPR right-to-be-forgotten on append-only audit ledgers (tombstone pattern)',
    blocks: 'Tenant closure protocol',
    owner: 'Legal Counsel & Tech Lead',
    status: 'DECISION'
  }
];

export const INITIAL_RISKS: RiskItem[] = [
  {
    id: 'R1',
    title: 'Stage 02 exit gate unverified + audit ledger hash chain unmerged',
    likelihood: 2,
    impact: 5,
    mitigation: 'Run retroactive Stage 02 gate in Dev Studio; merge SHA-256 hash chain; record in audit log.',
    owner: 'DevOps / Lead Eng',
    category: 'Operational'
  },
  {
    id: 'R2',
    title: 'Terraform IaC execution against real AWS af-south-1 infrastructure',
    likelihood: 4,
    impact: 4,
    mitigation: 'Test workspace apply first; budget for VPC NAT gateway and IAM policy edge cases.',
    owner: 'Infra Pod',
    category: 'Infrastructure'
  },
  {
    id: 'R3',
    title: 'Docker-dependent test suites proven only in local/CI sandbox',
    likelihood: 3,
    impact: 4,
    mitigation: 'Confirm main branch green; run integration suite on live Testcontainers instance.',
    owner: 'QA Lead',
    category: 'Operational'
  },
  {
    id: 'R4',
    title: 'Emergency safeguarding paging vendor (PagerDuty) unconfigured',
    likelihood: 2,
    impact: 5,
    mitigation: 'Wire PagerDuty webhook token into L5 escalation guardrail; conduct test page with named human.',
    owner: 'CEO & On-Call Lead',
    category: 'Security'
  },
  {
    id: 'R5',
    title: 'POPIA data subject erasure request on append-only tables',
    likelihood: 2,
    impact: 5,
    mitigation: 'Implement cryptographic erasure of salt/keys + logical tombstoning to preserve hash chain.',
    owner: 'Legal & Tech Lead',
    category: 'Compliance'
  },
  {
    id: 'R6',
    title: 'LLM judge uncalibrated on corporate policy fidelity',
    likelihood: 3,
    impact: 4,
    mitigation: 'Conduct calibration workshop with 50+ hand-scored operational memos.',
    owner: 'AI Research Lead',
    category: 'Operational'
  },
  {
    id: 'R7',
    title: 'Long enterprise enterprise procurement and sales cycles',
    likelihood: 4,
    impact: 4,
    mitigation: 'Deploy pilot seed packages (R15k) with clear 12-week SMT conversion gates to de-risk.',
    owner: 'Commercial Director',
    category: 'Financial'
  },
  {
    id: 'R8',
    title: 'Model token cost creep vs initial estimates',
    likelihood: 3,
    impact: 4,
    mitigation: 'Model gateway enforces pre-call budgets, 5-minute system prompt caching, and small model fallback.',
    owner: 'Finance & Gateway Pod',
    category: 'Financial'
  },
  {
    id: 'R9',
    title: 'Multi-lingual enterprise terminology fidelity',
    likelihood: 3,
    impact: 4,
    mitigation: 'Human-in-the-loop review flag for lower-resourced languages; domain terminology dictionaries in L0.',
    owner: 'Product Lead',
    category: 'Operational'
  },
  {
    id: 'R10',
    title: 'Key-person dependency in architecture and executive relationships',
    likelihood: 3,
    impact: 5,
    mitigation: 'Documented runbooks (RB-01..08), video walkthroughs, advisory board oversight.',
    owner: 'Founder / Board',
    category: 'Operational'
  },
  {
    id: 'R11',
    title: 'Big-tech generic AI assistant competition',
    likelihood: 3,
    impact: 3,
    mitigation: 'Moat built on domain-specific Brain L0-L4, RLS isolation, POPIA data residency, and auditability.',
    owner: 'Product Strategy',
    category: 'Operational'
  },
  {
    id: 'R12',
    title: 'Bandwidth and connectivity constraints across distributed sites',
    likelihood: 4,
    impact: 3,
    mitigation: 'Low-bandwidth rendering mode, offline-safe draft queue, CDN edge caching in Cape Town & JHB.',
    owner: 'Frontend Lead',
    category: 'Infrastructure'
  }
];

export const INITIAL_DEALS: DealItem[] = [
  {
    id: 'D-001',
    client: 'Beacon Ridge Enterprise Group',
    contact: 'Chief Information Officer',
    stage: 'PILOT GATED',
    tier: 'Pilot Seed',
    annualValueZar: 15000,
    nextStep: 'Resolve OQ-014 PagerDuty human escalation before formal pilot tenant kickoff.'
  },
  {
    id: 'D-002',
    client: 'Gauteng Logistics & Supply Chain',
    contact: 'Operations Director',
    stage: 'DEMO',
    tier: 'Standard',
    annualValueZar: 48000,
    nextStep: 'Executive demo on live infrastructure once Terraform deployment is green.'
  },
  {
    id: 'D-003',
    client: 'National Infrastructure Agency',
    contact: 'Governance & Compliance Director',
    stage: 'BRIEFED',
    tier: 'Enterprise',
    annualValueZar: 120000,
    nextStep: 'Deliver cost-recovery & de-identified aggregation memo.'
  },
  {
    id: 'D-004',
    client: 'Apex Financial Services (SME Division)',
    contact: 'Head of Business Systems',
    stage: 'PROSPECT',
    tier: 'Standard',
    annualValueZar: 48000,
    nextStep: 'Introductory discovery call post-Stage 02 ratification.'
  }
];

export const INITIAL_DOCUMENTS: DocumentItem[] = [
  {
    id: 'IA-BP-2026-001',
    title: 'Comprehensive Business Operations Package FY26–29',
    type: 'PLAN',
    version: '1.0',
    owner: 'CEO & Founder',
    status: 'LIVE',
    lastUpdated: '2026-09-02'
  },
  {
    id: 'IA-AUD-002',
    title: 'Verified Pilot Readiness Audit v2',
    type: 'AUDIT',
    version: '2.0',
    owner: 'Head of QA',
    status: 'LIVE',
    lastUpdated: '2026-09-01'
  },
  {
    id: 'IA-BM-001',
    title: 'Infinite AI Architecture & Build Manual (19 Stages)',
    type: 'SPEC',
    version: '1.0',
    owner: 'Principal Architect',
    status: 'LIVE',
    lastUpdated: '2026-08-28'
  },
  {
    id: 'STAGE_LOG',
    title: 'Development Stage Log & Verification Gates (7,923 lines)',
    type: 'LOG',
    version: 'Live',
    owner: 'Engineering Pod',
    status: 'LIVE',
    lastUpdated: '2026-09-02'
  },
  {
    id: 'OQ-REGISTER',
    title: 'Open Questions & Human Decision Blocker Register',
    type: 'LOG',
    version: 'Live',
    owner: 'CEO Office',
    status: 'LIVE',
    lastUpdated: '2026-09-02'
  },
  {
    id: 'COST_MODEL',
    title: 'Unit Economics & Token Cost Optimization Model',
    type: 'POLICY',
    version: '0.9',
    owner: 'Finance Pod',
    status: 'REVIEW',
    lastUpdated: '2026-08-30'
  },
  {
    id: 'POPIA_GDPR',
    title: 'Privacy Invariants, Purpose Tables & Tombstone Procedure',
    type: 'POLICY',
    version: '1.1',
    owner: 'Compliance Officer',
    status: 'RATIFIED',
    lastUpdated: '2026-08-25'
  },
  {
    id: 'SOP-01-RATIFY',
    title: 'SOP-01: Policy Framework Ratification & Supersession',
    type: 'SOP',
    version: '1.0',
    owner: 'Operations Lead',
    status: 'LIVE',
    lastUpdated: '2026-08-15'
  }
];

export const LAUNCH_SEQUENCE = [
  {
    phase: 1,
    title: 'THIS WEEK — RATIFICATION & GOVERNANCE',
    items: [
      'Countersign 136 ingested corporate policy frameworks in Brain L0 (OQ-002)',
      'Ratify enterprise operational review and sprint planning templates (OQ-003)',
      'Resolve Stage 02 retroactive verification gate & merge SHA-256 hash chain'
    ]
  },
  {
    phase: 2,
    title: 'WEEK 1–2 — CLOUD ACCOUNTS & CREDENTIALS',
    items: [
      'AWS af-south-1 (Cape Town) production tenant + Cloudflare edge DNS',
      'Model provider keys configured (Anthropic Claude + Google Gemini API)',
      'PagerDuty emergency safeguarding escalation key configured (OQ-014)',
      'Paystack / Stripe sandbox billing integration active'
    ]
  },
  {
    phase: 3,
    title: 'WEEK 2–3 — FIRST TERRAFORM RUN & DEPLOYMENT',
    items: [
      'Confirm CI pipeline green on main branch across all packages',
      'Execute terraform init, plan, apply against test workspace in af-south-1',
      'Fire live test paging webhook to verify on-call escalation route'
    ]
  },
  {
    phase: 4,
    title: 'WEEK 3–4 — EVAL HARNESS & JUDGE CALIBRATION',
    items: [
      'Hand-score 50+ operational memos with advisory council (OQ-016)',
      'Calibrate automated LLM judge against human score baseline',
      'Finalize incident monitoring SLA escalation thresholds'
    ]
  },
  {
    phase: 5,
    title: 'WEEK 4–5 — LOAD TESTING & SECURITY HARNESS',
    items: [
      'Execute k6 peak load test (450 VU) and spike test (600/300 VU) on live gateway (OQ-017)',
      'Commission third-party penetration test and POPIA readiness review',
      'Finalize legal consensus on append-only ledger cryptographic tombstoning (OQ-022)'
    ]
  },
  {
    phase: 6,
    title: 'PILOT ONBOARDING (AFTER PAGING GATE CONFIRMED)',
    items: [
      'Execute pilot agreements & Operator Data Privacy Addendum with Beacon Ridge',
      'Run Stage 17 automated tenant onboarding wizard end-to-end',
      'Baseline operational metrics in writing; initiate weekly executive review cadence'
    ]
  }
];

export const AWS_SERVICE_CATALOG = [
  {
    layer: 'L8/L6',
    service: 'ECS Fargate (Web & Workers)',
    purpose: 'Containerized Next.js UI, model gateway, and background worker queues',
    sizing: '0.5 vCPU · 1 GB RAM × 5 tasks',
    model: 'Per vCPU/GB-hour',
    monthlyZar: 2590,
    monthlyUsd: 140,
    type: 'Shared'
  },
  {
    layer: 'L3',
    service: 'RDS PostgreSQL 16 + pgvector',
    purpose: 'Tenant-isolated database with RLS, audit ledgers, and 1536-dim memory embeddings',
    sizing: 'db.t4g.medium (2 vCPU · 4 GB)',
    model: 'Instance hour + storage',
    monthlyZar: 2220,
    monthlyUsd: 120,
    type: 'Shared'
  },
  {
    layer: 'L3',
    service: 'ElastiCache Redis 7',
    purpose: 'High-speed session cache, tenant rate-limiting counters, hot Brain memory cache',
    sizing: 'cache.t4g.micro (0.5 GB)',
    model: 'Node hour',
    monthlyZar: 213,
    monthlyUsd: 11.5,
    type: 'Shared'
  },
  {
    layer: 'L3/L8',
    service: 'S3 + CloudFront CDN',
    purpose: 'Document asset uploads, Brain long-term snapshots, static web edge delivery in SA',
    sizing: 'S3 Standard-IA + Edge POP',
    model: 'Per GB stored & transferred',
    monthlyZar: 444,
    monthlyUsd: 24,
    type: 'Variable'
  },
  {
    layer: 'L6',
    service: 'SQS Standard Queue + ALB',
    purpose: 'Worker task queue for ingestion, de-ident, reports; Application Load Balancer with TLS',
    sizing: '1 ALB + multi-queues',
    model: 'Per LCU-hour & request volume',
    monthlyZar: 555,
    monthlyUsd: 30,
    type: 'Shared'
  },
  {
    layer: 'L5/L2',
    service: 'Secrets Manager, KMS & WAF',
    purpose: 'Envelope encryption for POPIA compliance; Web Application Firewall on ALB',
    sizing: '12 secrets + 3 CMKs + WAF rules',
    model: 'Per secret/key & rule requests',
    monthlyZar: 450,
    monthlyUsd: 24.3,
    type: 'Shared'
  },
  {
    layer: 'L0',
    service: 'VPC, Route 53 & NAT Gateway',
    purpose: 'Private subnets for compute & DB; outbound NAT Gateway for LLM API requests',
    sizing: '2 AZs + 1 NAT Gateway',
    model: 'Per NAT hour + data processed',
    monthlyZar: 620,
    monthlyUsd: 33.5,
    type: 'Shared'
  }
];
