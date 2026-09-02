import React, { useState } from 'react';
import { StageGate, OpenQuestion } from '../types';
import { INITIAL_STAGES, INITIAL_OPEN_QUESTIONS } from '../data/mockData';
import { 
  Terminal, 
  Play, 
  CheckCircle, 
  AlertTriangle, 
  GitBranch, 
  Check, 
  ShieldCheck, 
  Clock,
  RotateCcw,
  UserCheck,
  XCircle,
  FileCode
} from 'lucide-react';

interface DeveloperStudioProps {
  stages: StageGate[];
  stage02Resolved: boolean;
  onResolveStage02: () => void;
  openQuestions: OpenQuestion[];
  onCycleOq: (id: string) => void;
}

export const DeveloperStudio: React.FC<DeveloperStudioProps> = ({
  stages,
  stage02Resolved,
  onResolveStage02,
  openQuestions,
  onCycleOq
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('02');
  const [testOutput, setTestOutput] = useState<string | null>(null);
  const [runningTest, setRunningTest] = useState<boolean>(false);

  // Agent DAG Orchestrator State
  const [dagWorkflow, setDagWorkflow] = useState<'strategy' | 'incident' | 'briefing'>('strategy');
  const [dagStep, setDagStep] = useState<number>(0); // 0=idle, 1=ingest, 2=guardrail, 3=gateway, 4=hitl, 5=ledger, 6=done
  const [dagRunning, setDagRunning] = useState<boolean>(false);
  const [hitlComment, setHitlComment] = useState<string>('Reviewed against corporate strategy bylaws. Approved for execution.');

  const activeStage = stages.find(s => s.id === selectedStageId) || stages[0];

  const runStageVerification = (stage: StageGate) => {
    setRunningTest(true);
    setTestOutput(null);

    setTimeout(() => {
      if (stage.id === '02' && !stage02Resolved) {
        setTestOutput(`> ${stage.command}

[VERIFY:STAGE 02] Running identity, RBAC & audit ledger test suite...
  ✔ packages/policy/src/rbac.spec.ts (18 tests) - 42ms
  ✔ packages/db/src/tenant-isolation.spec.ts (24 tests) - 68ms
  ✖ packages/db/src/audit-ledger-hashchain.spec.ts (22 tests) - FAILED
    ERROR: Exit gate entry missing in docs/STAGE_LOG.md.
    Hash chain exists on unmerged branch "feat/stage02-audit-chain".
    Dead guard remains in packages/policy/src/access.ts.

RESULT: Stage 02 gate FAILED (exit code 1).
Action required: Run retroactive verification and merge hash chain.`);
      } else {
        setTestOutput(`> ${stage.command}

[VERIFY:STAGE ${stage.id}] Cumulative gate check...
  ✔ Checking dependencies and topological build order... OK
  ✔ Running unit tests across ${stage.testCount} test suites... PASSED
  ✔ Verifying invariant: No bypass flags permitted in production runtime... PASSED
  ✔ Checking tenant Row Level Security & schema integrity... PASSED
  ✔ Stage gate recorded in docs/STAGE_LOG.md with timestamp... OK

========================================
STAGE ${stage.id} EXIT GATE PASSED (exit code 0)
========================================`);
      }
      setRunningTest(false);
    }, 800);
  };

  // Run DAG simulation
  const handleStartDag = () => {
    setDagRunning(true);
    setDagStep(1); // Ingestion

    setTimeout(() => {
      setDagStep(2); // Guardrail
      setTimeout(() => {
        setDagStep(3); // Model Gateway
        setTimeout(() => {
          setDagStep(4); // HITL approval gate (PAUSES here!)
        }, 800);
      }, 800);
    }, 800);
  };

  const handleApproveHitl = () => {
    setDagStep(5); // Append to Ledger
    setTimeout(() => {
      setDagStep(6); // Done
      setDagRunning(false);
    }, 900);
  };

  const handleRejectHitl = () => {
    alert('Workflow rejected and sent back to drafter agent with revision notes.');
    setDagStep(0);
    setDagRunning(false);
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">DEVELOPER ENVIRONMENT &amp; TOOLCHAIN</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Stage Verifier, DAG Orchestrator &amp; <span className="grad">Test Engine</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Nineteen core stages (00–18) worked strictly in dependency order. No stage begins until the previous
            exit gate has passed and recorded in <code className="text-[#22D3EE]">docs/STAGE_LOG.md</code>.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="chip border-purple-500/30 text-purple-300 bg-purple-950/20 text-xs">
            <Terminal className="w-3.5 h-3.5" />
            pnpm 10+ / Node 22+
          </span>
        </div>
      </div>

      {/* Stage Gate Grid */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="kick">NINETEEN BUILD STAGES (00–18) · CLICK TO INSPECT</p>
            <p className="text-xs text-[#8FA0C2]">Cumulative stage gates enforce invariants at every step</p>
          </div>
          <span className="chip text-xs border-cyan-500/30 text-cyan-400">
            {stage02Resolved ? '18 / 19 Gates Passed' : '17 / 19 Gates Passed (1 Integrity Gap)'}
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-7 gap-2.5">
          {stages.map((st) => {
            const isSelected = st.id === selectedStageId;
            const isResolved02 = st.id === '02' && stage02Resolved;
            const currentStatus = isResolved02 ? 'PASS' : st.status;

            return (
              <button
                key={st.id}
                onClick={() => setSelectedStageId(st.id)}
                className={`panel2 p-3 text-left transition-all relative ${
                  isSelected
                    ? 'border-[#22D3EE] bg-[#13203C] shadow-[0_0_12px_rgba(34,211,238,0.2)]'
                    : 'hover:border-[#8FA0C2]/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="disp font-bold text-sm text-[#E9EDF8]">{st.id}</span>
                  <span className={`st ${
                    currentStatus === 'PASS' 
                      ? 'st-pass' 
                      : currentStatus === 'GAP' 
                      ? 'st-gap animate-pulse' 
                      : currentStatus === 'PROG' 
                      ? 'st-prog' 
                      : 'st-block'
                  }`}>
                    {currentStatus}
                  </span>
                </div>
                <p className="text-[10px] text-[#8FA0C2] mt-1 line-clamp-2 leading-tight">
                  {st.name}
                </p>
              </button>
            );
          })}
        </div>

        {/* Selected Stage Detail & Terminal Output */}
        <div className="grid lg:grid-cols-2 gap-5 mt-5 pt-5 border-t border-[rgba(148,163,255,0.1)]">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] kick">Selected Stage Gate</span>
                <h3 className="text-base font-bold text-[#E9EDF8]">
                  Stage {activeStage.id} — {activeStage.name}
                </h3>
              </div>
              <span className={`st ${
                (activeStage.id === '02' && stage02Resolved) || activeStage.status === 'PASS' 
                  ? 'st-pass' 
                  : activeStage.status === 'GAP' 
                  ? 'st-gap' 
                  : 'st-prog'
              }`}>
                {(activeStage.id === '02' && stage02Resolved) ? 'PASS' : activeStage.status}
              </span>
            </div>

            <p className="text-xs text-[#8FA0C2] leading-relaxed">
              {activeStage.summary}
            </p>

            <div className="panel2 p-3 text-xs space-y-1">
              <span className="text-[10px] text-[#8FA0C2] uppercase font-mono">Architecture Enforcement:</span>
              <p className="text-[#E9EDF8]">{activeStage.details}</p>
            </div>

            {/* Special Action for Stage 02 */}
            {activeStage.id === '02' && !stage02Resolved && (
              <div className="p-3.5 rounded-xl bg-rose-950/40 border border-rose-500/40 text-rose-300 space-y-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <AlertTriangle className="w-4 h-4 text-rose-400" />
                  <span>Audit Alert: Unresolved Exit Gate in Repository</span>
                </div>
                <p className="text-[11px] text-[#8FA0C2]">
                  Stage 02 audit ledger hash chain was implemented on branch <code className="text-[#22D3EE]">feat/stage02-audit-chain</code> but
                  lacked an official exit gate entry in STAGE_LOG.md. Click below to retroactively verify the suite and merge the chain.
                </p>
                <button
                  onClick={onResolveStage02}
                  className="btn btn-p text-xs py-1.5 px-3 w-full justify-center"
                >
                  <GitBranch className="w-3.5 h-3.5 mr-1" />
                  Execute Retroactive Stage 02 Gate &amp; Merge Hash Chain
                </button>
              </div>
            )}

            {activeStage.id === '02' && stage02Resolved && (
              <div className="p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 flex items-center gap-2.5 text-xs">
                <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Stage 02 successfully ratified and merged. Immutable audit hash chain integrity 100% verified.</span>
              </div>
            )}

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => runStageVerification(activeStage)}
                disabled={runningTest}
                className="btn btn-p text-xs flex-1"
              >
                <Play className="w-3.5 h-3.5 mr-1" />
                {runningTest ? 'Running Suite...' : `Run ${activeStage.command}`}
              </button>
            </div>
          </div>

          {/* Simulated Terminal Output */}
          <div className="panel2 p-4 font-mono text-xs text-[#E9EDF8] bg-[#05070f] border border-[rgba(148,163,255,0.16)] flex flex-col justify-between min-h-[220px]">
            <div className="space-y-1">
              <div className="flex items-center justify-between pb-2 border-b border-[rgba(148,163,255,0.1)] text-[#8FA0C2] text-[10px]">
                <span>TERMINAL · BASH OUTPUT</span>
                <span>pnpm test tier</span>
              </div>
              <pre className="text-[11px] text-[#22D3EE] whitespace-pre-wrap mt-2">
                {testOutput || `> Click "Run ${activeStage.command}" to execute test suites and verify exit gate invariants.`}
              </pre>
            </div>
            <div className="text-[10px] text-[#8FA0C2] pt-2 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
              <span>Exit code: {testOutput ? (testOutput.includes('FAILED') ? '1' : '0') : '—'}</span>
              <span>Testcontainers: Active</span>
            </div>
          </div>
        </div>
      </div>

      {/* Agent DAG Orchestrator with Non-Bypassable HITL Approval Gates */}
      <div className="panel p-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
          <div>
            <p className="kick">L6 AGENT RUNTIME · INTERACTIVE DAG ORCHESTRATOR</p>
            <h2 className="text-base font-bold text-[#E9EDF8] mt-0.5">
              Human-in-the-Loop (HITL) Approval Execution Loop
            </h2>
          </div>
          <div className="flex items-center gap-2">
            <select
              value={dagWorkflow}
              onChange={(e) => setDagWorkflow(e.target.value as any)}
              disabled={dagRunning}
              className="inp text-xs py-1.5 w-auto"
            >
              <option value="strategy">Q3 Strategic Decomposition Workflow</option>
              <option value="incident">Critical SLA Incident Escalation DAG</option>
              <option value="briefing">Executive Board Briefing Generation</option>
            </select>
            <button
              onClick={handleStartDag}
              disabled={dagRunning && dagStep !== 4}
              className="btn btn-p text-xs px-4"
            >
              <Play className="w-3.5 h-3.5 mr-1" />
              {dagStep === 0 || dagStep === 6 ? 'Execute DAG Workflow' : 'Running...'}
            </button>
          </div>
        </div>

        <p className="text-xs text-[#8FA0C2] mb-6">
          Rule: Human-in-the-loop gates cannot be bypassed in production. The DAG automatically halts execution
          at Step 4 until an authorized human decision-maker reviews and approves the payload.
        </p>

        {/* 5-Step Visual Node DAG Flow */}
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 relative">
          {/* Step 1: Ingest */}
          <div className={`panel2 p-3 text-xs border transition-all ${
            dagStep === 1 
              ? 'border-cyan-400 bg-cyan-950/20 animate-pulse' 
              : dagStep > 1 
              ? 'border-emerald-500/40 text-emerald-300' 
              : 'text-[#8FA0C2]'
          }`}>
            <span className="text-[10px] font-mono text-cyan-400 block mb-1">NODE 01</span>
            <strong className="block text-[#E9EDF8]">1. Ingest Input</strong>
            <p className="text-[10px] text-[#8FA0C2] mt-1">Extract raw entities &amp; document metadata</p>
            {dagStep > 1 && <span className="text-[9px] text-emerald-400 font-mono mt-2 block">✓ Conformed</span>}
          </div>

          {/* Step 2: Guardrail */}
          <div className={`panel2 p-3 text-xs border transition-all ${
            dagStep === 2 
              ? 'border-cyan-400 bg-cyan-950/20 animate-pulse' 
              : dagStep > 2 
              ? 'border-emerald-500/40 text-emerald-300' 
              : 'text-[#8FA0C2]'
          }`}>
            <span className="text-[10px] font-mono text-rose-400 block mb-1">NODE 02</span>
            <strong className="block text-[#E9EDF8]">2. PII Guardrail</strong>
            <p className="text-[10px] text-[#8FA0C2] mt-1">POPIA tokenization &amp; provenance stamp</p>
            {dagStep > 2 && <span className="text-[9px] text-emerald-400 font-mono mt-2 block">✓ Zero PII Leak</span>}
          </div>

          {/* Step 3: Model Gateway */}
          <div className={`panel2 p-3 text-xs border transition-all ${
            dagStep === 3 
              ? 'border-cyan-400 bg-cyan-950/20 animate-pulse' 
              : dagStep > 3 
              ? 'border-emerald-500/40 text-emerald-300' 
              : 'text-[#8FA0C2]'
          }`}>
            <span className="text-[10px] font-mono text-magenta-400 block mb-1">NODE 03</span>
            <strong className="block text-[#E9EDF8]">3. Model Gateway</strong>
            <p className="text-[10px] text-[#8FA0C2] mt-1">Claude / Gemini synthesis with 5-min cache</p>
            {dagStep > 3 && <span className="text-[9px] text-emerald-400 font-mono mt-2 block">✓ Output Drafted</span>}
          </div>

          {/* Step 4: HITL Approval Gate */}
          <div className={`panel2 p-3 text-xs border transition-all ${
            dagStep === 4 
              ? 'border-amber-400 bg-amber-950/30 shadow-[0_0_16px_rgba(251,191,36,0.3)] animate-pulse' 
              : dagStep > 4 
              ? 'border-emerald-500/40 text-emerald-300' 
              : 'text-[#8FA0C2]'
          }`}>
            <span className="text-[10px] font-mono text-amber-400 block mb-1">NODE 04 · CHOKEPOINT</span>
            <strong className="block text-[#E9EDF8]">4. HITL Approval</strong>
            <p className="text-[10px] text-[#8FA0C2] mt-1">Human-in-the-loop executive gate</p>
            {dagStep === 4 && <span className="text-[9px] text-amber-400 font-bold mt-2 block">PAUSED (AWAITING SIGN-OFF)</span>}
            {dagStep > 4 && <span className="text-[9px] text-emerald-400 font-mono mt-2 block">✓ Human Approved</span>}
          </div>

          {/* Step 5: Append to Brain */}
          <div className={`panel2 p-3 text-xs border transition-all ${
            dagStep === 5 
              ? 'border-cyan-400 bg-cyan-950/20 animate-pulse' 
              : dagStep > 5 
              ? 'border-emerald-500/40 text-emerald-300' 
              : 'text-[#8FA0C2]'
          }`}>
            <span className="text-[10px] font-mono text-emerald-400 block mb-1">NODE 05</span>
            <strong className="block text-[#E9EDF8]">5. Immutable Ledger</strong>
            <p className="text-[10px] text-[#8FA0C2] mt-1">Append to Infinite Brain L4 hash chain</p>
            {dagStep > 5 && <span className="text-[9px] text-emerald-400 font-mono mt-2 block">✓ Written to Ledger</span>}
          </div>
        </div>

        {/* HITL Approval Modal / Bar (Displays when Step 4 is active) */}
        {dagStep === 4 && (
          <div className="mt-5 p-4 rounded-xl bg-[#13203C] border-2 border-amber-400/60 shadow-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-amber-400" />
                <strong className="text-sm text-[#E9EDF8]">Human Approval Gate Required: Please Review &amp; Sign</strong>
              </div>
              <span className="chip border-amber-500/40 text-amber-300 text-xs">
                Cannot Bypass in Production
              </span>
            </div>

            <p className="text-xs text-[#8FA0C2]">
              The Model Gateway has synthesized the output using ratified corporate policies. Before this draft is
              committed to the institutional memory and downstream systems, human sign-off is mandatory.
            </p>

            <div className="space-y-1">
              <label className="text-[11px] text-[#8FA0C2]">Executive Sign-off Notes / Rationale:</label>
              <input
                type="text"
                value={hitlComment}
                onChange={(e) => setHitlComment(e.target.value)}
                className="inp text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                onClick={handleRejectHitl}
                className="btn btn-g text-xs text-rose-400 border-rose-500/30 hover:bg-rose-950/20"
              >
                <XCircle className="w-3.5 h-3.5 mr-1" />
                Reject &amp; Send Back to Drafter
              </button>
              <button
                onClick={handleApproveHitl}
                className="btn btn-p text-xs px-5"
              >
                <Check className="w-3.5 h-3.5 mr-1" />
                Approve &amp; Commit to Brain L4
              </button>
            </div>
          </div>
        )}

        {dagStep === 6 && (
          <div className="mt-5 p-3.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>DAG Completed successfully. Event logged to append-only audit ledger with SHA-256 hash.</span>
            </div>
            <button
              onClick={() => setDagStep(0)}
              className="text-[11px] text-[#22D3EE] hover:underline"
            >
              Reset DAG
            </button>
          </div>
        )}
      </div>

      {/* Open Questions (OQ) Register */}
      <div className="panel p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <p className="kick">OPEN QUESTIONS (OQ) REGISTER</p>
            <p className="text-xs text-[#8FA0C2]">Human decision blockers and technical specifications pending resolution</p>
          </div>
          <span className="text-[10px] text-[#8FA0C2] font-mono">Click status tag to cycle</span>
        </div>

        <div className="overflow-x-auto">
          <table className="biz">
            <thead>
              <tr>
                <th>ID</th>
                <th>Question / Requirement</th>
                <th>Blocks</th>
                <th>Owner</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {openQuestions.map((oq) => (
                <tr key={oq.id}>
                  <td className="font-mono text-cyan-300 font-bold">{oq.id}</td>
                  <td className="text-[#E9EDF8] font-medium">{oq.question}</td>
                  <td className="text-xs text-[#8FA0C2]">{oq.blocks}</td>
                  <td className="text-xs">{oq.owner}</td>
                  <td>
                    <button
                      onClick={() => onCycleOq(oq.id)}
                      className={`st ${
                        oq.status === 'CRITICAL' ? 'st-gap' :
                        oq.status === 'BLOCKED' ? 'st-block' :
                        oq.status === 'DECISION' ? 'st-prog' :
                        oq.status === 'DONE' ? 'st-pass' : 'st-open'
                      } cursor-pointer hover:opacity-80`}
                      title="Click to cycle status"
                    >
                      {oq.status}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
