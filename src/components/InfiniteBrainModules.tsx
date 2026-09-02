import React, { useState } from 'react';
import { INITIAL_MODULES } from '../data/mockData';
import { BusinessModule } from '../types';
import { 
  Cpu, 
  Layers, 
  Sparkles, 
  ShieldAlert, 
  Database, 
  FileCheck, 
  GraduationCap, 
  Send, 
  Clock, 
  AlertCircle,
  TrendingUp,
  CheckCircle,
  Copy,
  Download
} from 'lucide-react';

export const InfiniteBrainModules: React.FC = () => {
  const [selectedModuleId, setSelectedModuleId] = useState<string>('brain');
  
  // MOD-04 AI Toolbox Generator State
  const [toolboxType, setToolboxType] = useState<'rfp' | 'sla' | 'board' | 'compliance'>('rfp');
  const [toolboxPrompt, setToolboxPrompt] = useState<string>('Enterprise multi-tenant data isolation and disaster recovery RPO/RTO standards');
  const [toolboxGenerating, setToolboxGenerating] = useState<boolean>(false);
  const [generatedOutput, setGeneratedOutput] = useState<string | null>(null);

  // MOD-02 Incident Simulation State
  const [incidents, setIncidents] = useState([
    { id: 'INC-881', title: 'Payment Webhook Latency Spike (>850ms)', tier: 'Tier 2', status: 'Investigating', assigned: 'Payment Pod' },
    { id: 'INC-882', title: 'Non-Conforming Schema in Tenant B Ingest', tier: 'Tier 1', status: 'Auto-Quarantined', assigned: 'Ingest Worker' },
    { id: 'INC-880', title: 'Safeguarding Alert: High-Risk Keyword Flagged', tier: 'Tier 3 Critical', status: 'Paged (PagerDuty)', assigned: 'Incident Commander' }
  ]);
  const [pageTriggered, setPageTriggered] = useState<boolean>(false);

  // Handle AI Toolbox Generation
  const handleGenerateToolbox = () => {
    setToolboxGenerating(true);
    setGeneratedOutput(null);

    setTimeout(() => {
      let output = '';
      if (toolboxType === 'rfp') {
        output = `### VERIFIED RFP COMPLIANCE SPECIFICATION: DATA RESIDENCY & ISOLATION
**Document Reference:** IA-RFP-2026-SEC-04
**Audit Provenance:** Ingested from Brain L0 (Constitution) & L3 (Architecture Specs)
**Status:** Human-in-the-Loop Approved (Signed by Chief Architect)

1. **Multi-Tenant Isolation Architecture:**
   - Database layer utilizes PostgreSQL 16 with mandatory Row Level Security (RLS).
   - Execution context is strictly enforced via \`withTenant(tenant_id)\` wrapper; context-less queries explicitly raise SQL error 42704.
   - Cross-tenant data leakage is cryptographically and logically prohibited at runtime.

2. **Data Residency & Compliance:**
   - Primary data plane resides strictly in AWS region **af-south-1 (Cape Town)**, satisfying POPIA Section 72 and GDPR adequacy guidelines.
   - Data-at-rest is encrypted with customer-managed AWS KMS keys (AES-256).

3. **Disaster Recovery & High Availability:**
   - Recovery Point Objective (RPO): < 1 minute via automated transactional WAL archiving.
   - Recovery Time Objective (RTO): < 15 minutes utilizing containerized multi-AZ ECS Fargate task failover.
   - Quarterly automated restore drills recorded in Runbook RB-01 and RB-08.`;
      } else if (toolboxType === 'sla') {
        output = `### EXECUTIVE SLA AUDIT MEMORANDUM
**Incident Context:** Month-End Peak Traffic Window (08:00–12:00 SAST)
**System Monitored:** Model Gateway & Batch Document Annotation Pipeline
**Target SLA:** 99.9% Uptime | p95 Latency < 1,200ms

**Performance Findings:**
- Total Model Gateway requests served: 1,420,850
- Availability achieved: 99.98% (zero unhandled exceptions)
- Average p95 latency: 680ms (compliant with 1,200ms threshold)
- System Prompt Cache Hit Rate: 81.4% (yielding R24,800 cost savings)

**Root-Cause & Recommendations:**
- Micro-spike observed at 10:14 SAST during concurrent tenant batch upload; handled by SQS backpressure queuing.
- Recommendation: Maintain current Fargate auto-scaling target (CPU > 70%).`;
      } else if (toolboxType === 'board') {
        output = `### EXECUTIVE BOARD PACK: Q3 OPERATIONAL REVIEW
**Prepared for:** Board of Directors · Infinite AI Operations Platform
**Reporting Period:** FY2026 Q3

**1. Strategic Execution (MOD-01):**
- 18 divisional Annual Operating Plans successfully decomposed into quarterly OKR DAGs.
- Cross-functional milestone completion velocity increased by 4.5x compared to manual spreadsheet tracking.

**2. Financial & Unit Economics (Cost Engine):**
- Blended gross margin stabilized at 72.4% on R4,500/tenant/mo tier.
- LTV:CAC validated at 4.9 : 1 with 12-month payback period.
- LLM prompt caching reduced external token expenditure by 28% overall.

**3. Governance & Risk:**
- 136 core policy frameworks ratified in Brain L0.
- Zero POPIA compliance breaches; egress guard blocked 100% of PII probe test vectors.`;
      } else {
        output = `### CONTRACT COMPLIANCE & LEGAL BYLAW AUDIT
**Standard Assessed:** Enterprise Service Agreement & Data Processing Addendum (DPA)
**Evaluation Standard:** POPIA / GDPR / King IV Corporate Governance

- Clause 4.1 (Egress Restriction): PASS. Provenance stamp required on all outbound model requests.
- Clause 7.3 (Sub-Processor Disclosure): PASS. Multi-provider pool restricted to ratified list (Anthropic, Google).
- Clause 11.2 (Audit Ledger Immutability): PASS. SHA-256 hash-chained append-only event ledger verified.
- Clause 14.5 (Right to Erasure): COMPLIANT WITH LEGAL ADVISORY. Cryptographic salt deletion applied on append-only historical records.`;
      }

      setGeneratedOutput(output);
      setToolboxGenerating(false);
    }, 900);
  };

  const triggerPagerDutyTest = () => {
    setPageTriggered(true);
    const newInc = {
      id: `INC-${Math.floor(Math.random() * 100) + 900}`,
      title: 'TEST EMERGENCY PAGE: Safeguarding Protocol Triggered',
      tier: 'Tier 3 Critical',
      status: 'Dispatched to PagerDuty Webhook',
      assigned: 'Sarah-Jane (On-Call)'
    };
    setIncidents([newInc, ...incidents]);
    setTimeout(() => setPageTriggered(false), 3000);
  };

  const currentModule = INITIAL_MODULES.find(m => m.id === selectedModuleId) || INITIAL_MODULES[0];

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">Core Architecture & Ecosystem</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            The Infinite Brain &amp; <span className="grad">Five Operations Engines</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Adapted from the multi-tenant South African education ecosystem into an enterprise operations platform:
            one shared Brain, five specialized modules, running over an isolated data plane and model gateway.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="chip border-cyan-500/30 text-cyan-400 bg-cyan-950/20 text-xs">
            <Cpu className="w-3.5 h-3.5" />
            L0–L4 Memory Active
          </span>
        </div>
      </div>

      {/* 9-Layer Architecture Stack Overview */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <p className="kick">NINE-LAYER ENFORCEMENT STACK (NON-BYPASSABLE CHOKEPOINTS)</p>
          <span className="text-[10px] text-[#8FA0C2] font-mono">Data flows strictly UP through layers</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-9 gap-2 text-center text-xs">
          <div className="panel2 p-3 border-t-2 border-t-cyan-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#22D3EE] font-bold">L8 SURFACES</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">Role UIs</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">Next.js App Router</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-violet-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#8B5CF6] font-bold">L7 ENGINES</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">MOD-01..05</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">5 Core Engines</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-amber-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#FBBF24] font-bold">L6 RUNTIME</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">DAG Executor</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">HITL Gates</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-rose-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#FB7185] font-bold">L5 GUARDRAIL</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">PII Membrane</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">POPIA Filter</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-emerald-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#86EFAC] font-bold">L4 BRAIN</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">Memory Tiers</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">Append-Only</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-sky-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#38BDF8] font-bold">L3 DATA</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">Postgres + RLS</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">pgvector</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-magenta-400 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#E879F9] font-bold">L2 GATEWAY</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">Model Pool</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">Token Budgets</span>
          </div>

          <div className="panel2 p-3 border-t-2 border-t-slate-400 col-span-1 md:col-span-2 lg:col-span-2 flex flex-col justify-between">
            <span className="text-[10px] font-mono text-[#8FA0C2] font-bold">L0/L1 INTEGRATIONS</span>
            <p className="font-semibold text-[11px] text-[#E9EDF8] mt-1">Enterprise Systems</p>
            <span className="text-[9px] text-[#8FA0C2] mt-1">ERP · CRM · Cloud APIs</span>
          </div>
        </div>
      </div>

      {/* Module Selector Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2">
        {INITIAL_MODULES.map((mod) => {
          const isSelected = mod.id === selectedModuleId;
          return (
            <button
              key={mod.id}
              onClick={() => setSelectedModuleId(mod.id)}
              className={`px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isSelected
                  ? 'bg-[#13203C] text-[#22D3EE] border-[#22D3EE]/50 shadow-[0_0_16px_rgba(34,211,238,0.18)]'
                  : 'bg-[#0E1830] text-[#8FA0C2] border-[rgba(148,163,255,0.14)] hover:text-[#E9EDF8] hover:border-[#8FA0C2]'
              }`}
            >
              <span>{mod.habitatIcon}</span>
              <span>{mod.code}: {mod.name}</span>
            </button>
          );
        })}
      </div>

      {/* Selected Module Detail Workspace */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Module Spec & Metrics */}
        <div className="panel p-6 space-y-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl">{currentModule.habitatIcon}</span>
              <div>
                <p className="text-[10px] kick" style={{ color: currentModule.accentColor }}>
                  {currentModule.habitatName} · {currentModule.code}
                </p>
                <h2 className="text-lg font-bold text-[#E9EDF8]">{currentModule.name}</h2>
              </div>
            </div>
            <p className="text-xs text-[#8FA0C2] mt-2.5 leading-relaxed">
              {currentModule.purpose}
            </p>
          </div>

          <div className="panel2 p-3.5 space-y-1">
            <span className="text-[10px] text-[#8FA0C2] uppercase font-mono tracking-wider">Original Ecosystem Reference</span>
            <p className="text-xs font-semibold text-[#E9EDF8]">{currentModule.originalRef}</p>
          </div>

          <div>
            <p className="kick mb-2.5">SPECIALIST AGENT ROSTER</p>
            <div className="space-y-1.5">
              {currentModule.agents.map((agent, i) => (
                <div key={i} className="panel2 p-2.5 text-xs text-[#E9EDF8] flex items-center justify-between">
                  <span>{agent}</span>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/40 px-1.5 py-0.5 rounded border border-emerald-500/30">
                    Active
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div>
            <p className="kick mb-2.5">OPERATIONAL METRICS</p>
            <div className="grid grid-cols-2 gap-2">
              {currentModule.metrics.map((met, idx) => (
                <div key={idx} className="panel2 p-3">
                  <span className="text-[10px] text-[#8FA0C2] block">{met.label}</span>
                  <strong className="text-sm text-[#E9EDF8] mt-0.5 block">{met.value}</strong>
                  {met.change && <span className="text-[9px] text-emerald-400">{met.change}</span>}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Interactive Workspace Area */}
        <div className="lg:col-span-2 panel p-6">
          {selectedModuleId === 'brain' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick">INFINITE BRAIN · FIVE MEMORY TIERS (L0–L4)</p>
                  <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Durable Institutional Memory Engine</h3>
                </div>
                <span className="chip border-emerald-500/30 text-emerald-400 text-xs">
                  Zero Destructive Updates
                </span>
              </div>

              <p className="text-xs text-[#8FA0C2]">
                Unlike conventional AI systems that overwrite context, the Infinite Brain models organizational memory
                like tree rings. Every corporate policy, decision, and incident resolution is dated, provenanced, and reversible.
              </p>

              <div className="space-y-3 mt-4">
                <div className="panel2 p-3.5 border-l-4 border-l-cyan-400">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#E9EDF8]">L0 · Constitution &amp; Legal Bylaws</strong>
                    <span className="text-[10px] font-mono text-cyan-400">136 Ratified Policies</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Immutable governance rules, POPIA privacy purpose allow-lists, SACE accreditation tables, and board charters.
                  </p>
                </div>

                <div className="panel2 p-3.5 border-l-4 border-l-violet-400">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#E9EDF8]">L1 · Raw Evidence &amp; Ingested Data</strong>
                    <span className="text-[10px] font-mono text-violet-400">S3 Secure Bucket</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Cryptographically hashed source documents: curriculum frameworks, contracts, supplier agreements, and audit trails.
                  </p>
                </div>

                <div className="panel2 p-3.5 border-l-4 border-l-amber-400">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#E9EDF8]">L2 · Semantic Knowledge Graph &amp; Vector Index</strong>
                    <span className="text-[10px] font-mono text-amber-400">Postgres pgvector (1536-dim)</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Multi-dimensional semantic embeddings linking organizational concepts, departmental responsibilities, and past precedents.
                  </p>
                </div>

                <div className="panel2 p-3.5 border-l-4 border-l-emerald-400">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#E9EDF8]">L3 · Procedural Memory (SOPs &amp; Workflows)</strong>
                    <span className="text-[10px] font-mono text-emerald-400">Validated State Machines</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Standard Operating Procedures (SOP-01 to SOP-05) and operational runbooks (RB-01 to RB-08) for deterministic execution.
                  </p>
                </div>

                <div className="panel2 p-3.5 border-l-4 border-l-rose-400">
                  <div className="flex items-center justify-between">
                    <strong className="text-xs text-[#E9EDF8]">L4 · Episodic Working Memory &amp; Audit Trail</strong>
                    <span className="text-[10px] font-mono text-rose-400">SHA-256 Ledger</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Timestamped decision logs, human approval notes, and real-time execution context for active operations.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedModuleId === 'mod-01' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick">MOD-01 WORKSPACE</p>
                  <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Strategy &amp; Operations Planning Decomposition</h3>
                </div>
                <span className="chip border-violet-500/30 text-violet-400 text-xs">
                  Active Q3 Cycle
                </span>
              </div>

              <div className="space-y-3">
                <div className="panel2 p-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#E9EDF8]">Vision Level 1 · Annual Operating Plan (AOP)</span>
                    <span className="text-emerald-400 font-mono">100% Ratified</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Expand multi-tenant operations across 25 tier-1 schools and enterprise clusters with 99.9% SLA.
                  </p>
                </div>

                <div className="panel2 p-3 ml-4 border-l-2 border-l-violet-400">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#E9EDF8]">Objective Level 2 · Q3 Infrastructure &amp; Security Gate</span>
                    <span className="text-amber-300 font-mono">82% In Progress</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Complete AWS af-south-1 production Terraform deployment, external pen-test, and PagerDuty human on-call wiring.
                  </p>
                  <div className="bar mt-2">
                    <i style={{ width: '82%' }} />
                  </div>
                </div>

                <div className="panel2 p-3 ml-8 border-l-2 border-l-cyan-400">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#E9EDF8]">Sprint Workstream 3 · Stage 02 Audit Ledger Merge</span>
                    <span className="text-cyan-400 font-mono">Sprint 34 Active</span>
                  </div>
                  <p className="text-[11px] text-[#8FA0C2] mt-1">
                    Execute retroactive test suite, verify tamper-evident hash chain, and record gate in docs/STAGE_LOG.md.
                  </p>
                </div>
              </div>
            </div>
          )}

          {selectedModuleId === 'mod-02' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick">MOD-02 WORKSPACE</p>
                  <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Support, Incident &amp; Escalation Command</h3>
                </div>
                <button
                  onClick={triggerPagerDutyTest}
                  disabled={pageTriggered}
                  className="btn btn-p text-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 mr-1" />
                  {pageTriggered ? 'Dispatching Webhook...' : 'Simulate PagerDuty Alert'}
                </button>
              </div>

              {pageTriggered && (
                <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-pulse">
                  <AlertCircle className="w-4 h-4 text-rose-400" />
                  <span>Webhook dispatched to PagerDuty live endpoint (OQ-014 simulation: named human alerted).</span>
                </div>
              )}

              <div className="overflow-x-auto">
                <table className="biz">
                  <thead>
                    <tr>
                      <th>Incident ID</th>
                      <th>Description</th>
                      <th>Severity</th>
                      <th>Status</th>
                      <th>Assigned</th>
                    </tr>
                  </thead>
                  <tbody>
                    {incidents.map((inc) => (
                      <tr key={inc.id}>
                        <td className="font-mono text-cyan-300">{inc.id}</td>
                        <td className="font-medium text-[#E9EDF8]">{inc.title}</td>
                        <td>
                          <span className={`st ${inc.tier.includes('Critical') ? 'st-gap' : inc.tier.includes('2') ? 'st-prog' : 'st-pass'}`}>
                            {inc.tier}
                          </span>
                        </td>
                        <td>{inc.status}</td>
                        <td className="text-xs">{inc.assigned}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {selectedModuleId === 'mod-03' && (
            <div className="space-y-5">
              <div>
                <p className="kick">MOD-03 WORKSPACE</p>
                <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Tenant-360 &amp; POPIA De-Identification Pipeline</h3>
              </div>

              <div className="grid sm:grid-cols-3 gap-3">
                <div className="panel2 p-3 text-center">
                  <span className="text-[10px] text-[#8FA0C2]">PII Ingest Egress Check</span>
                  <p className="disp text-lg font-bold text-emerald-400 mt-1">100% BLOCKED</p>
                  <span className="text-[9px] text-[#8FA0C2]">Zero leaks to model gateway</span>
                </div>
                <div className="panel2 p-3 text-center">
                  <span className="text-[10px] text-[#8FA0C2]">Tenant Schema Conformance</span>
                  <p className="disp text-lg font-bold text-cyan-400 mt-1">99.98%</p>
                  <span className="text-[9px] text-[#8FA0C2]">Automated quarantine on mismatch</span>
                </div>
                <div className="panel2 p-3 text-center">
                  <span className="text-[10px] text-[#8FA0C2]">Tenant Health Index</span>
                  <p className="disp text-lg font-bold text-amber-300 mt-1">94.8 / 100</p>
                  <span className="text-[9px] text-[#8FA0C2]">Low churn risk (&lt;7%)</span>
                </div>
              </div>

              <div className="panel2 p-4">
                <p className="text-xs font-semibold text-[#E9EDF8] mb-2">Active Ingestion Pipeline: Beacon Ridge Primary</p>
                <div className="space-y-2 text-xs font-mono text-[#8FA0C2]">
                  <div className="flex items-center justify-between">
                    <span>1. Ingest Raw CSV / API payload</span>
                    <span className="text-emerald-400">✓ 520 records conformed</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>2. Tokenize &amp; Scrub Identification (ID/Name/DoB)</span>
                    <span className="text-emerald-400">✓ Cryptographic token assigned</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>3. Apply Purpose Limitation Table</span>
                    <span className="text-emerald-400">✓ Lawful basis: Consent verified</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span>4. Write to Tenant-Isolated Postgres Store</span>
                    <span className="text-emerald-400">✓ RLS app.tenant_id = 'ten_beacon_01'</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {selectedModuleId === 'mod-04' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick">MOD-04 WORKSPACE</p>
                  <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Generative AI Operations Toolbox</h3>
                </div>
                <span className="chip border-amber-500/30 text-amber-300 text-xs">
                  Double-Verification Loop
                </span>
              </div>

              {/* Tool Selection Tabs */}
              <div className="flex flex-wrap gap-2">
                {[
                  { id: 'rfp', label: 'RFP Answer Drafter' },
                  { id: 'sla', label: 'SLA Audit Memo' },
                  { id: 'board', label: 'Executive Board Pack' },
                  { id: 'compliance', label: 'Contract Compliance Checker' },
                ].map((tool) => (
                  <button
                    key={tool.id}
                    onClick={() => setToolboxType(tool.id as any)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                      toolboxType === tool.id
                        ? 'bg-amber-400 text-slate-950 font-bold'
                        : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8]'
                    }`}
                  >
                    {tool.label}
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <label className="text-xs text-[#8FA0C2] block">Operational Context &amp; Subject Matter:</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={toolboxPrompt}
                    onChange={(e) => setToolboxPrompt(e.target.value)}
                    className="inp flex-1"
                    placeholder="Enter operational topic or specification..."
                  />
                  <button
                    onClick={handleGenerateToolbox}
                    disabled={toolboxGenerating}
                    className="btn btn-p text-xs px-4"
                  >
                    {toolboxGenerating ? 'Synthesizing...' : 'Generate Verified Output'}
                  </button>
                </div>
              </div>

              {generatedOutput && (
                <div className="panel2 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-[rgba(148,163,255,0.1)] pb-2">
                    <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle className="w-3.5 h-3.5" />
                      Answer-Key &amp; Grounding Double-Checked
                    </span>
                    <button 
                      onClick={() => {
                        navigator.clipboard.writeText(generatedOutput);
                        alert('Copied to clipboard!');
                      }}
                      className="text-[11px] text-[#22D3EE] hover:underline flex items-center gap-1"
                    >
                      <Copy className="w-3 h-3" /> Copy
                    </button>
                  </div>
                  <pre className="text-xs text-[#E9EDF8] whitespace-pre-wrap font-sans leading-relaxed">
                    {generatedOutput}
                  </pre>
                </div>
              )}
            </div>
          )}

          {selectedModuleId === 'mod-05' && (
            <div className="space-y-5">
              <div>
                <p className="kick">MOD-05 WORKSPACE</p>
                <h3 className="text-base font-bold text-[#E9EDF8] mt-0.5">Workforce Performance &amp; Learning Studio</h3>
              </div>

              <p className="text-xs text-[#8FA0C2]">
                Continuous professional growth aligned to internal capability frameworks (or teacher SACE 150-point CPTD policy).
                Strictly avoids punitive rankings — focuses purely on skill growth and auditably traced credits.
              </p>

              <div className="grid sm:grid-cols-2 gap-3 mt-4">
                <div className="panel2 p-3.5 space-y-2">
                  <strong className="text-xs text-[#E9EDF8] block">Accredited Micro-Course 01</strong>
                  <p className="text-[11px] text-[#8FA0C2]">
                    POPIA-Safe Incident Response &amp; Escalation Protocols (SOP-02)
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-300">15 Credits</span>
                    <span className="text-emerald-400">88% Team Completion</span>
                  </div>
                </div>

                <div className="panel2 p-3.5 space-y-2">
                  <strong className="text-xs text-[#E9EDF8] block">Accredited Micro-Course 02</strong>
                  <p className="text-[11px] text-[#8FA0C2]">
                    Model Gateway Budgeting &amp; 5-Minute Prompt Caching Techniques
                  </p>
                  <div className="flex items-center justify-between text-[10px] font-mono">
                    <span className="text-cyan-300">10 Credits</span>
                    <span className="text-emerald-400">76% Team Completion</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
