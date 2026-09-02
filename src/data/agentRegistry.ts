import { AgentRecord } from '../types';

export const FULL_46_AGENTS: AgentRecord[] = [
  // 1. Executive Management
  {
    id: 'A01',
    name: 'Executive Strategy AI',
    department: 'Executive Management',
    role: 'Chief Strategy Officer (AI)',
    skills: ['Strategic planning', 'Business modelling', 'Risk analysis', 'Vision alignment'],
    responsibilities: ['Define enterprise strategy', 'Align departmental goals', 'Monitor KPIs'],
    guardrails: ['No financial execution', 'No legal decisions without HITL'],
    permissions: { read: ['all'], write: ['strategy_docs'], execute: [] },
    hitl_gates: ['Strategic decisions', 'Budget approvals'],
    telemetry: { logging: true, versioning: true, lastActive: '2m ago', tasksHandled: 412 }
  },
  {
    id: 'A02',
    name: 'Executive Operations AI',
    department: 'Executive Management',
    role: 'Chief Operating Officer (AI)',
    skills: ['Operational design', 'Workflow optimisation', 'Resource allocation'],
    responsibilities: ['Oversee operations', 'Manage cross-department workflows'],
    guardrails: ['No HR disciplinary actions', 'No financial transfers'],
    permissions: { read: ['ops_docs'], write: ['ops_updates'], execute: [] },
    hitl_gates: ['Operational restructuring'],
    telemetry: { logging: true, versioning: true, lastActive: '5m ago', tasksHandled: 320 }
  },
  {
    id: 'A03',
    name: 'Executive Finance AI',
    department: 'Executive Management',
    role: 'Chief Financial Officer (AI)',
    skills: ['Financial modelling', 'Forecasting', 'Budget planning'],
    responsibilities: ['Create forecasts', 'Monitor cashflow', 'Analyse financial risk'],
    guardrails: ['No real transactions', 'No tax filings'],
    permissions: { read: ['finance'], write: ['reports'], execute: [] },
    hitl_gates: ['Budget approvals', 'Financial strategy'],
    telemetry: { logging: true, versioning: true, lastActive: '1m ago', tasksHandled: 590 }
  },
  {
    id: 'A04',
    name: 'Executive Compliance AI',
    department: 'Executive Management',
    role: 'Chief Compliance Officer (AI)',
    skills: ['POPIA compliance', 'Risk assessment', 'Policy drafting'],
    responsibilities: ['Draft policies', 'Monitor compliance', 'Audit processes'],
    guardrails: ['No legal enforcement'],
    permissions: { read: ['legal'], write: ['compliance_docs'], execute: [] },
    hitl_gates: ['Policy enforcement'],
    telemetry: { logging: true, versioning: true, lastActive: '8m ago', tasksHandled: 280 }
  },

  // 2. Product Development
  {
    id: 'A05',
    name: 'Product Development AI',
    department: 'Product Development',
    role: 'Head of Product (AI)',
    skills: ['Roadmapping', 'Feature design', 'User research'],
    responsibilities: ['Build product roadmaps', 'Define features', 'Analyse user needs'],
    guardrails: ['No direct customer communication'],
    permissions: { read: ['product_docs'], write: ['feature_specs'], execute: [] },
    hitl_gates: ['Feature approvals', 'Roadmap shifts'],
    telemetry: { logging: true, versioning: true, lastActive: '3m ago', tasksHandled: 640 }
  },
  {
    id: 'A17',
    name: 'UI/UX Design Systems AI',
    department: 'Product Development',
    role: 'Lead Experience Designer (AI)',
    skills: ['Design tokens', 'WCAG AA audits', 'Responsive layouts', 'Component specs'],
    responsibilities: ['Maintain design system', 'Verify accessibility', 'Prototype UI mockups'],
    guardrails: ['Must adhere to anti-slop rules', 'No proprietary asset export'],
    permissions: { read: ['design_tokens', 'ui_specs'], write: ['ui_specs'], execute: [] },
    hitl_gates: ['Design system tokens update'],
    telemetry: { logging: true, versioning: true, lastActive: '11m ago', tasksHandled: 195 }
  },
  {
    id: 'A18',
    name: 'Feature Discovery AI',
    department: 'Product Development',
    role: 'User Needs Researcher (AI)',
    skills: ['Customer interview synthesis', 'Feedback clustering', 'Gap detection'],
    responsibilities: ['Cluster support tickets into feature ideas', 'Draft PRDs'],
    guardrails: ['PII scrubbed from user quotes'],
    permissions: { read: ['user_feedback'], write: ['prds'], execute: [] },
    hitl_gates: ['PRD publication'],
    telemetry: { logging: true, versioning: true, lastActive: '14m ago', tasksHandled: 154 }
  },
  {
    id: 'A19',
    name: 'Product Telemetry AI',
    department: 'Product Development',
    role: 'Product Analytics Lead (AI)',
    skills: ['Cohort retention', 'Funnel analysis', 'Feature adoption tracking'],
    responsibilities: ['Generate monthly adoption reports', 'Track feature drop-off'],
    guardrails: ['Aggregated data only; zero user-level tracking'],
    permissions: { read: ['analytics_warehouse'], write: ['product_metrics'], execute: [] },
    hitl_gates: ['Data aggregation schema changes'],
    telemetry: { logging: true, versioning: true, lastActive: '6m ago', tasksHandled: 340 }
  },

  // 3. Software Engineering
  {
    id: 'A06',
    name: 'Software Engineering AI',
    department: 'Software Engineering',
    role: 'Lead Software Architect (AI)',
    skills: ['System design', 'API modelling', 'Code generation', 'TypeScript strict'],
    responsibilities: ['Draft architecture', 'Generate code samples', 'Review engineering plans'],
    guardrails: ['No direct production code deployment', 'No skipping exit gates'],
    permissions: { read: ['engineering_docs'], write: ['architecture'], execute: [] },
    hitl_gates: ['Architecture changes', 'Schema migrations'],
    telemetry: { logging: true, versioning: true, lastActive: 'Just now', tasksHandled: 890 }
  },
  {
    id: 'A20',
    name: 'Frontend Architect AI',
    department: 'Software Engineering',
    role: 'Principal Frontend Engineer (AI)',
    skills: ['React 19', 'Next.js App Router', 'Tailwind CSS', 'State management'],
    responsibilities: ['Review client code', 'Enforce bundle budgets', 'Optimize web performance'],
    guardrails: ['No external CDN scripts injected without SRI'],
    permissions: { read: ['frontend_repo'], write: ['frontend_specs'], execute: [] },
    hitl_gates: ['Client dependency addition'],
    telemetry: { logging: true, versioning: true, lastActive: '4m ago', tasksHandled: 420 }
  },
  {
    id: 'A21',
    name: 'Backend Services AI',
    department: 'Software Engineering',
    role: 'Distributed Systems Specialist (AI)',
    skills: ['Node.js 22', 'PostgreSQL RLS', 'gRPC', 'REST API design'],
    responsibilities: ['Enforce withTenant RLS queries', 'Manage queue workers', 'Audit endpoints'],
    guardrails: ['No bypass of tenant context wrapper allowed'],
    permissions: { read: ['backend_repo'], write: ['api_contracts'], execute: [] },
    hitl_gates: ['API contract breaking changes'],
    telemetry: { logging: true, versioning: true, lastActive: '7m ago', tasksHandled: 512 }
  },
  {
    id: 'A22',
    name: 'Database & Storage AI',
    department: 'Software Engineering',
    role: 'Database Reliability Engineer (AI)',
    skills: ['PostgreSQL 16', 'pgvector 1536-dim', 'WAL replication', 'Index tuning'],
    responsibilities: ['Validate RLS security policies', 'Tune vector search indexes', 'Plan backups'],
    guardrails: ['No destructive DROP or TRUNCATE operations'],
    permissions: { read: ['db_schemas'], write: ['migration_plans'], execute: [] },
    hitl_gates: ['Production database migrations'],
    telemetry: { logging: true, versioning: true, lastActive: '15m ago', tasksHandled: 230 }
  },

  // 4. DevOps & CI/CD
  {
    id: 'A07',
    name: 'DevOps Pipeline AI',
    department: 'DevOps',
    role: 'CI/CD Automation Specialist (AI)',
    skills: ['Pipeline design', 'Containerisation', 'Monitoring', 'Turborepo'],
    responsibilities: ['Draft CI/CD pipelines', 'Suggest optimisations', 'Monitor build times'],
    guardrails: ['No direct production deployment'],
    permissions: { read: ['devops_docs'], write: ['pipeline_specs'], execute: [] },
    hitl_gates: ['Pipeline changes', 'Secret key rotation'],
    telemetry: { logging: true, versioning: true, lastActive: '1m ago', tasksHandled: 710 }
  },
  {
    id: 'A23',
    name: 'Infrastructure IaC AI',
    department: 'DevOps',
    role: 'Cloud Architect (AI)',
    skills: ['Terraform', 'AWS af-south-1', 'ECS Fargate', 'VPC Peering'],
    responsibilities: ['Generate Terraform plans', 'Calculate monthly AWS cost estimates'],
    guardrails: ['No automated terraform apply in production'],
    permissions: { read: ['iac_repo'], write: ['tf_plans'], execute: [] },
    hitl_gates: ['Terraform apply execution'],
    telemetry: { logging: true, versioning: true, lastActive: '12m ago', tasksHandled: 180 }
  },
  {
    id: 'A24',
    name: 'Site Reliability AI',
    department: 'DevOps',
    role: 'SRE Specialist (AI)',
    skills: ['SLO tracking', 'Synthetic monitoring', 'Chaos engineering', 'Runbook automation'],
    responsibilities: ['Monitor 99.9% uptime SLA', 'Track p95 latency', 'Verify RPO/RTO drills'],
    guardrails: ['Cannot mute P1 alerts autonomously'],
    permissions: { read: ['cloudwatch', 'telemetry'], write: ['slo_reports'], execute: [] },
    hitl_gates: ['SLO alert threshold alterations'],
    telemetry: { logging: true, versioning: true, lastActive: 'Just now', tasksHandled: 840 }
  },
  {
    id: 'A25',
    name: 'Release Management AI',
    department: 'DevOps',
    role: 'Release Gatekeeper (AI)',
    skills: ['Semantic versioning', 'Changelog generation', '19-stage log auditing'],
    responsibilities: ['Verify stage exit gates before release', 'Draft release notes'],
    guardrails: ['Cannot sign off on failing exit gates'],
    permissions: { read: ['stage_logs'], write: ['release_notes'], execute: [] },
    hitl_gates: ['Release tags publication'],
    telemetry: { logging: true, versioning: true, lastActive: '9m ago', tasksHandled: 260 }
  },

  // 5. CRM & Customer Success
  {
    id: 'A08',
    name: 'CRM Intelligence AI',
    department: 'CRM',
    role: 'Customer Insights Analyst (AI)',
    skills: ['Customer segmentation', 'Journey mapping', 'Retention modelling', 'Tenant-360'],
    responsibilities: ['Analyse CRM data', 'Generate insights', 'Support customer success'],
    guardrails: ['No direct customer contact'],
    permissions: { read: ['crm'], write: ['crm_reports'], execute: [] },
    hitl_gates: ['Customer strategy changes'],
    telemetry: { logging: true, versioning: true, lastActive: '3m ago', tasksHandled: 490 }
  },
  {
    id: 'A26',
    name: 'Customer Onboarding AI',
    department: 'CRM',
    role: 'Tenant Implementation Specialist (AI)',
    skills: ['Tenant provisioning', 'Config validation', 'User training schedules'],
    responsibilities: ['Automate Stage 17 tenant onboarding wizard', 'Validate seed policies'],
    guardrails: ['No live data ingest without DPA signature'],
    permissions: { read: ['tenant_configs'], write: ['onboarding_status'], execute: [] },
    hitl_gates: ['Tenant tenant_id provisioning'],
    telemetry: { logging: true, versioning: true, lastActive: '18m ago', tasksHandled: 110 }
  },
  {
    id: 'A27',
    name: 'Churn Prevention AI',
    department: 'CRM',
    role: 'Account Health Sentinel (AI)',
    skills: ['Predictive churn scoring', 'Usage pattern analysis', 'At-risk flagging'],
    responsibilities: ['Score tenant engagement daily', 'Alert account managers of drop-offs'],
    guardrails: ['No unsolicited marketing outreach to flagged accounts'],
    permissions: { read: ['usage_telemetry'], write: ['churn_alerts'], execute: [] },
    hitl_gates: ['Intervention playbook triggers'],
    telemetry: { logging: true, versioning: true, lastActive: '22m ago', tasksHandled: 310 }
  },
  {
    id: 'A28',
    name: 'Account Growth AI',
    department: 'CRM',
    role: 'Expansion Strategist (AI)',
    skills: ['Usage headroom analysis', 'Feature tier upsell mapping', 'ROI calculation'],
    responsibilities: ['Identify Pilot Seed accounts ready for Standard upgrade', 'Draft value summaries'],
    guardrails: ['Must base recommendations on verified token telemetry'],
    permissions: { read: ['billing_metering'], write: ['expansion_proposals'], execute: [] },
    hitl_gates: ['Commercial proposal sending'],
    telemetry: { logging: true, versioning: true, lastActive: '30m ago', tasksHandled: 145 }
  },

  // 6. Sales
  {
    id: 'A09',
    name: 'Sales Enablement AI',
    department: 'Sales',
    role: 'Sales Strategist (AI)',
    skills: ['Sales funnel design', 'Pitch creation', 'Lead scoring', 'Competitive teardowns'],
    responsibilities: ['Draft sales scripts', 'Analyse leads', 'Support sales teams'],
    guardrails: ['No direct selling'],
    permissions: { read: ['sales'], write: ['sales_materials'], execute: [] },
    hitl_gates: ['Sales strategy changes'],
    telemetry: { logging: true, versioning: true, lastActive: '5m ago', tasksHandled: 380 }
  },
  {
    id: 'A29',
    name: 'Inbound Lead Qualification AI',
    department: 'Sales',
    role: 'Lead Triage Specialist (AI)',
    skills: ['BANT qualification', 'Firmographic enrichment', 'ICP scoring'],
    responsibilities: ['Score inbound website prospects', 'Assign leads to human account reps'],
    guardrails: ['No spamming unverified email addresses'],
    permissions: { read: ['lead_queue'], write: ['lead_scores'], execute: [] },
    hitl_gates: ['Enterprise tier classification'],
    telemetry: { logging: true, versioning: true, lastActive: '12m ago', tasksHandled: 420 }
  },
  {
    id: 'A30',
    name: 'Proposal & RFP Drafter AI',
    department: 'Sales',
    role: 'RFP Proposal Specialist (AI)',
    skills: ['RFP response drafting', 'Security questionnaire mapping', 'Brain L0 grounding'],
    responsibilities: ['Compile double-verified RFP answers referencing ISO/POPIA policies'],
    guardrails: ['All compliance claims must be verified against L0 Constitution'],
    permissions: { read: ['rfp_specs', 'brain_l0'], write: ['proposals'], execute: [] },
    hitl_gates: ['RFP executive countersignature'],
    telemetry: { logging: true, versioning: true, lastActive: '8m ago', tasksHandled: 290 }
  },
  {
    id: 'A31',
    name: 'Deal Closing Strategist AI',
    department: 'Sales',
    role: 'Commercial Deal Architect (AI)',
    skills: ['Pricing concessions matrix', 'Multi-year discount modeling', 'Contract terms review'],
    responsibilities: ['Model pilot conversion terms', 'Draft SOW pricing structures'],
    guardrails: ['Cannot commit discounts exceeding 15% without CFO HITL approval'],
    permissions: { read: ['pricing_tables'], write: ['deal_terms'], execute: [] },
    hitl_gates: ['Custom discount approvals'],
    telemetry: { logging: true, versioning: true, lastActive: '16m ago', tasksHandled: 165 }
  },

  // 7. Marketing
  {
    id: 'A10',
    name: 'Marketing Intelligence AI',
    department: 'Marketing',
    role: 'Marketing Analyst (AI)',
    skills: ['Campaign design', 'Market research', 'Brand strategy'],
    responsibilities: ['Draft campaigns', 'Analyse market trends'],
    guardrails: ['No ad purchases'],
    permissions: { read: ['marketing'], write: ['campaign_docs'], execute: [] },
    hitl_gates: ['Campaign launches'],
    telemetry: { logging: true, versioning: true, lastActive: '7m ago', tasksHandled: 275 }
  },
  {
    id: 'A32',
    name: 'Content & Thought Leadership AI',
    department: 'Marketing',
    role: 'Enterprise Editorial Lead (AI)',
    skills: ['Whitepaper authoring', 'Case study drafting', 'Technical SEO'],
    responsibilities: ['Draft case studies on POPIA AI operations', 'Author technical articles'],
    guardrails: ['Zero AI clichés or buzzword fluff'],
    permissions: { read: ['marketing'], write: ['whitepapers'], execute: [] },
    hitl_gates: ['Content publishing'],
    telemetry: { logging: true, versioning: true, lastActive: '19m ago', tasksHandled: 210 }
  },
  {
    id: 'A33',
    name: 'Brand Governance AI',
    department: 'Marketing',
    role: 'Brand Integrity Guardian (AI)',
    skills: ['Styleguide enforcement', 'Voice calibration', 'Asset licensing verification'],
    responsibilities: ['Verify public materials against brand voice guidelines and logo rules'],
    guardrails: ['Cannot modify core brand assets autonomously'],
    permissions: { read: ['brand_guidelines'], write: ['audit_reports'], execute: [] },
    hitl_gates: ['Brand asset updates'],
    telemetry: { logging: true, versioning: true, lastActive: '25m ago', tasksHandled: 130 }
  },
  {
    id: 'A34',
    name: 'Social & Community AI',
    department: 'Marketing',
    role: 'Ecosystem Community Manager (AI)',
    skills: ['LinkedIn outreach', 'Community digest creation', 'User forum synthesis'],
    responsibilities: ['Synthesize practitioner feedback', 'Draft monthly community updates'],
    guardrails: ['No automated direct messaging'],
    permissions: { read: ['community_feedback'], write: ['digests'], execute: [] },
    hitl_gates: ['Public post release'],
    telemetry: { logging: true, versioning: true, lastActive: '34m ago', tasksHandled: 95 }
  },

  // 8. Finance & Accounting
  {
    id: 'A11',
    name: 'Finance Analysis AI',
    department: 'Finance',
    role: 'Financial Analyst (AI)',
    skills: ['Cashflow modelling', 'Forecasting', 'Cost analysis', 'SaaS unit economics'],
    responsibilities: ['Draft financial reports', 'Analyse budgets', 'Track gross margins'],
    guardrails: ['No transactions'],
    permissions: { read: ['finance'], write: ['finance_reports'], execute: [] },
    hitl_gates: ['Financial strategy', 'Pricing tier updates'],
    telemetry: { logging: true, versioning: true, lastActive: '4m ago', tasksHandled: 490 }
  },
  {
    id: 'A35',
    name: 'Revenue Assurance AI',
    department: 'Finance',
    role: 'Billing & Metering Specialist (AI)',
    skills: ['Usage metering reconciliation', 'Paystack/Stripe ledger audit', 'Dunning logic'],
    responsibilities: ['Match token consumption to invoice records', 'Audit uncollected balances'],
    guardrails: ['Cannot cancel accounts autonomously for late payment'],
    permissions: { read: ['billing_records'], write: ['invoice_adjustments'], execute: [] },
    hitl_gates: ['Credit memo issuance'],
    telemetry: { logging: true, versioning: true, lastActive: '14m ago', tasksHandled: 310 }
  },
  {
    id: 'A36',
    name: 'Expense Audit AI',
    department: 'Finance',
    role: 'Cost Optimization Specialist (AI)',
    skills: ['Cloud infrastructure spend audit', 'LLM token cost breakdown', 'Vendor invoice check'],
    responsibilities: ['Detect AWS unattached volumes', 'Track model caching cost savings'],
    guardrails: ['Cannot terminate infrastructure resources directly'],
    permissions: { read: ['cloud_bills'], write: ['savings_recommendations'], execute: [] },
    hitl_gates: ['Reserved instance purchase decisions'],
    telemetry: { logging: true, versioning: true, lastActive: '2m ago', tasksHandled: 440 }
  },
  {
    id: 'A37',
    name: 'Tax & Compliance Modeler AI',
    department: 'Finance',
    role: 'Statutory Finance Analyst (AI)',
    skills: ['South African VAT (15%)', 'Withholding tax modeling', 'Corporate tax provisions'],
    responsibilities: ['Draft tax schedule projections for South African enterprise operations'],
    guardrails: ['No official filing without licensed human CA(SA) approval'],
    permissions: { read: ['statutory_accounts'], write: ['tax_projections'], execute: [] },
    hitl_gates: ['Statutory tax reporting sign-off'],
    telemetry: { logging: true, versioning: true, lastActive: '45m ago', tasksHandled: 85 }
  },

  // 9. HR & People Ops
  {
    id: 'A12',
    name: 'HR Operations AI',
    department: 'HR',
    role: 'HR Coordinator (AI)',
    skills: ['Policy drafting', 'Role design', 'Training plans'],
    responsibilities: ['Draft HR policies', 'Support onboarding', 'Align role specs'],
    guardrails: ['No hiring/firing', 'No disciplinary actions'],
    permissions: { read: ['hr_docs'], write: ['hr_materials'], execute: [] },
    hitl_gates: ['Policy changes', 'Compensation bands'],
    telemetry: { logging: true, versioning: true, lastActive: '10m ago', tasksHandled: 230 }
  },
  {
    id: 'A38',
    name: 'Talent Acquisition AI',
    department: 'HR',
    role: 'Recruitment Intelligence Lead (AI)',
    skills: ['Job specification drafting', 'Blind resume screening', 'Interview guide synthesis'],
    responsibilities: ['Draft competency-based interview rubrics', 'Screen candidates without bias'],
    guardrails: ['PII scrubbed; zero demographic bias factors'],
    permissions: { read: ['job_specs'], write: ['interview_kits'], execute: [] },
    hitl_gates: ['Candidate offer generation'],
    telemetry: { logging: true, versioning: true, lastActive: '28m ago', tasksHandled: 175 }
  },
  {
    id: 'A39',
    name: 'Employee Experience AI',
    department: 'HR',
    role: 'Internal Culture & Feedback Analyst (AI)',
    skills: ['Pulse survey analysis', 'Sentiment clustering', 'Onboarding check-ins'],
    responsibilities: ['Analyze anonymous team feedback', 'Suggest workflow adjustments'],
    guardrails: ['Strictly preserves employee anonymity; no individual attribution'],
    permissions: { read: ['anonymous_surveys'], write: ['culture_reports'], execute: [] },
    hitl_gates: ['Workplace policy updates'],
    telemetry: { logging: true, versioning: true, lastActive: '38m ago', tasksHandled: 120 }
  },
  {
    id: 'A40',
    name: 'Learning & Development AI',
    department: 'HR',
    role: 'MOD-05 Training Architect (AI)',
    skills: ['Instructional design', 'Accreditation alignment', 'Skill matrix mapping'],
    responsibilities: ['Design modular micro-courses for internal team capability growth'],
    guardrails: ['No punitive rankings; purely capability development focused'],
    permissions: { read: ['competency_models'], write: ['course_modules'], execute: [] },
    hitl_gates: ['Course curriculum ratification'],
    telemetry: { logging: true, versioning: true, lastActive: '6m ago', tasksHandled: 310 }
  },

  // 10. Legal & Compliance
  {
    id: 'A13',
    name: 'Legal Advisory AI',
    department: 'Legal',
    role: 'Legal Analyst (AI)',
    skills: ['Policy review', 'Risk analysis', 'Contract drafting', 'POPIA Section 72'],
    responsibilities: ['Draft legal summaries', 'Support compliance', 'Audit standard terms'],
    guardrails: ['No formal legal advice', 'No contract signing'],
    permissions: { read: ['legal'], write: ['legal_summaries'], execute: [] },
    hitl_gates: ['Legal interpretations', 'Contract signing'],
    telemetry: { logging: true, versioning: true, lastActive: '5m ago', tasksHandled: 410 }
  },
  {
    id: 'A41',
    name: 'Contract Review AI',
    department: 'Legal',
    role: 'Commercial Counsel Assistant (AI)',
    skills: ['Redlining', 'Liability limitation checks', 'SLA clause validation', 'DPA checks'],
    responsibilities: ['Review enterprise customer DPAs and NDAs against corporate bylaws'],
    guardrails: ['Flags non-standard indemnities for human legal review'],
    permissions: { read: ['contracts'], write: ['redlines'], execute: [] },
    hitl_gates: ['Enterprise contract execution'],
    telemetry: { logging: true, versioning: true, lastActive: '15m ago', tasksHandled: 260 }
  },
  {
    id: 'A42',
    name: 'Privacy & POPIA Officer AI',
    department: 'Legal',
    role: 'Information Officer Delegate (AI)',
    skills: ['POPIA 8 Conditions', 'Information Officer registration', 'Breach notification protocols'],
    responsibilities: ['Audit L5 PII Membrane', 'Maintain Section 51 PAIA manual', 'Track data flows'],
    guardrails: ['Cannot dismiss privacy breach incidents'],
    permissions: { read: ['privacy_logs'], write: ['popia_assessments'], execute: [] },
    hitl_gates: ['Regulatory breach disclosures'],
    telemetry: { logging: true, versioning: true, lastActive: 'Just now', tasksHandled: 520 }
  },
  {
    id: 'A43',
    name: 'Intellectual Property AI',
    department: 'Legal',
    role: 'IP & Patent Portfolio Analyst (AI)',
    skills: ['Software patent mapping', 'Trademark monitoring', 'Open source license compliance'],
    responsibilities: ['Audit pnpm dependency licenses (MIT/Apache 2.0 vs copyleft GPL)', 'Maintain IP registry'],
    guardrails: ['Flags AGPL or non-commercial licenses immediately'],
    permissions: { read: ['package_manifests'], write: ['ip_reports'], execute: [] },
    hitl_gates: ['Third-party library approval'],
    telemetry: { logging: true, versioning: true, lastActive: '50m ago', tasksHandled: 95 }
  },

  // 11. Security & Risk
  {
    id: 'A14',
    name: 'Security & Risk AI',
    department: 'Security',
    role: 'Chief Information Security Officer (AI)',
    skills: ['Threat modelling', 'Risk scoring', 'Security policy drafting', 'STRIDE'],
    responsibilities: ['Monitor risks', 'Draft security policies', 'Update 5x5 heatmap'],
    guardrails: ['No system access changes without approval'],
    permissions: { read: ['security'], write: ['risk_reports'], execute: [] },
    hitl_gates: ['Security escalations', 'Firewall rule edits'],
    telemetry: { logging: true, versioning: true, lastActive: 'Just now', tasksHandled: 920 }
  },
  {
    id: 'A44',
    name: 'Vulnerability Scanner AI',
    department: 'Security',
    role: 'SecOps Penetration Tester (AI)',
    skills: ['CVE auditing', 'Dependency check', 'SAST/DAST report synthesis', 'CSP testing'],
    responsibilities: ['Scan npm supply chain', 'Test LLM prompt injection attack vectors (40+ test cases)'],
    guardrails: ['Strictly isolated test sandbox execution only'],
    permissions: { read: ['vuln_reports'], write: ['remediation_plans'], execute: [] },
    hitl_gates: ['Security patch deployment'],
    telemetry: { logging: true, versioning: true, lastActive: '3m ago', tasksHandled: 670 }
  },
  {
    id: 'A45',
    name: 'Incident Response Commander AI',
    department: 'Security',
    role: 'Emergency Response Lead (AI)',
    skills: ['SOP-03 Incident Response', 'PagerDuty dispatching', 'Containment isolation'],
    responsibilities: ['Orchestrate Tier 3 critical alerts', 'Page on-call human commander', 'Draft post-mortem'],
    guardrails: ['Cannot suppress P1 paging alarms'],
    permissions: { read: ['incident_telemetry'], write: ['incident_logs'], execute: [] },
    hitl_gates: ['Incident closure & post-mortem signoff'],
    telemetry: { logging: true, versioning: true, lastActive: '1m ago', tasksHandled: 540 }
  },
  {
    id: 'A46',
    name: 'Threat Intelligence AI',
    department: 'Security',
    role: 'Cyber Threat Analyst (AI)',
    skills: ['Zero-day tracking', 'Cloud threat feeds', 'Egress traffic anomaly detection'],
    responsibilities: ['Track emerging AI gateway jailbreaks', 'Update prompt injection filters'],
    guardrails: ['Must test all filter updates against golden test sets first'],
    permissions: { read: ['threat_feeds'], write: ['filter_updates'], execute: [] },
    hitl_gates: ['Global gateway filter updates'],
    telemetry: { logging: true, versioning: true, lastActive: '11m ago', tasksHandled: 390 }
  },

  // 12. Operations & Logistics
  {
    id: 'A15',
    name: 'Operations Workflow AI',
    department: 'Operations',
    role: 'Operations Analyst (AI)',
    skills: ['Workflow mapping', 'Process optimisation', 'Resource planning', 'SOP creation'],
    responsibilities: ['Draft workflows', 'Analyse bottlenecks', 'Maintain SOP library'],
    guardrails: ['No operational overrides'],
    permissions: { read: ['ops'], write: ['ops_docs'], execute: [] },
    hitl_gates: ['Process changes', 'SOP publication'],
    telemetry: { logging: true, versioning: true, lastActive: '6m ago', tasksHandled: 340 }
  },
  {
    id: 'A47',
    name: 'Supply Chain & Vendor AI',
    department: 'Operations',
    role: 'Procurement Specialist (AI)',
    skills: ['Vendor SLA auditing', 'Hardware inventory tracking', 'License provisioning'],
    responsibilities: ['Track third-party SaaS licenses', 'Audit cloud provider invoice tiers'],
    guardrails: ['No payment approvals or card authorizations'],
    permissions: { read: ['vendor_contracts'], write: ['procurement_orders'], execute: [] },
    hitl_gates: ['Vendor contract signoff'],
    telemetry: { logging: true, versioning: true, lastActive: '41m ago', tasksHandled: 150 }
  },

  // 13. Support & Helpdesk
  {
    id: 'A16',
    name: 'Helpdesk Support AI',
    department: 'Support',
    role: 'Support Analyst (AI)',
    skills: ['Ticket triage', 'Knowledge base drafting', 'Issue categorisation'],
    responsibilities: ['Draft KB articles', 'Analyse support trends', 'Route tier 1 tickets'],
    guardrails: ['No direct customer communication'],
    permissions: { read: ['support'], write: ['kb_articles'], execute: [] },
    hitl_gates: ['Support escalations', 'KB public release'],
    telemetry: { logging: true, versioning: true, lastActive: '2m ago', tasksHandled: 780 }
  },
  {
    id: 'A48',
    name: 'Tier-2 Technical Support AI',
    department: 'Support',
    role: 'Senior Technical Resolver (AI)',
    skills: ['Log bundle diagnosis', 'API payload debugging', 'Database replication check'],
    responsibilities: ['Investigate tenant webhook failures', 'Isolate client sync discrepancies'],
    guardrails: ['Cannot modify customer database records directly'],
    permissions: { read: ['debug_logs'], write: ['reproduction_steps'], execute: [] },
    hitl_gates: ['Customer data repair approval'],
    telemetry: { logging: true, versioning: true, lastActive: '5m ago', tasksHandled: 460 }
  }
];

export const HUMAN_LEADERSHIP = [
  {
    name: 'Sarah-Jane',
    role: 'Chief Executive Officer & Founder',
    department: 'Executive Management',
    status: 'Active (On-Call)',
    email: '0487sarah@gmail.com',
    responsibilities: ['Enterprise vision', 'L0 policy ratification', 'Final signature authority']
  },
  {
    name: 'David K.',
    role: 'Chief Technology Officer & Lead Architect',
    department: 'Software Engineering',
    status: 'Active',
    email: 'david.k@infinite-ai.internal',
    responsibilities: ['19-stage pipeline integrity', 'AWS af-south-1 IaC', 'Model gateway failover']
  },
  {
    name: 'Naledi M.',
    role: 'VP Legal, Privacy & Compliance (Information Officer)',
    department: 'Legal & Compliance',
    status: 'Active',
    email: 'naledi.m@infinite-ai.internal',
    responsibilities: ['POPIA compliance', 'PAIA manual', 'Operator agreements', 'Audit reviews']
  },
  {
    name: 'Thabo R.',
    role: 'Head of Customer Success & Enterprise Pilots',
    department: 'CRM & Customer Success',
    status: 'Active',
    email: 'thabo.r@infinite-ai.internal',
    responsibilities: ['Beacon Ridge pilot lead', 'SLA governance', 'Tenant onboarding']
  }
];
