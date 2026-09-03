import React, { useState } from 'react';
import { NavTab } from '../types';
import { LAUNCH_SEQUENCE } from '../data/mockData';
import { 
  CheckCircle2, 
  AlertTriangle, 
  Shield, 
  FileText, 
  ArrowRight, 
  Sparkles, 
  Check, 
  ExternalLink,
  Zap,
  Lock,
  GitPullRequest
} from 'lucide-react';

interface CommandCenterProps {
  onNavigate: (tab: NavTab) => void;
  stage02Resolved: boolean;
  ratifiedCount: number;
  onRatifyAll: () => void;
  pendingApprovalsCount?: number;
}

export const CommandCenter: React.FC<CommandCenterProps> = ({ 
  onNavigate, 
  stage02Resolved, 
  ratifiedCount,
  onRatifyAll,
  pendingApprovalsCount = 2
}) => {
  // Local state for launch sequence checkboxes
  const [checkedTasks, setCheckedTasks] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('ia_launch_tasks');
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  const toggleTask = (key: string) => {
    const updated = { ...checkedTasks, [key]: !checkedTasks[key] };
    setCheckedTasks(updated);
    try {
      localStorage.setItem('ia_launch_tasks', JSON.stringify(updated));
    } catch {}
  };

  const totalTasks = LAUNCH_SEQUENCE.reduce((acc, ph) => acc + ph.items.length, 0);
  const completedTasks = Object.values(checkedTasks).filter(Boolean).length;
  const launchProgressPct = Math.round((completedTasks / totalTasks) * 100);

  return (
    <div className="space-y-6 pb-12">
      {/* Top Banner & Highlights */}
      <div className="grid lg:grid-cols-3 gap-5">
        {/* Main Executive Briefing */}
        <div className="lg:col-span-2 panel p-7 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-purple-500/10 via-teal-500/5 to-transparent pointer-events-none" />
          <div className="flex items-center justify-between gap-3">
            <p className="kick">CEO Command Center · Internal Operations Suite</p>
            <span className="chip border-rose-500/30 text-rose-400 bg-rose-950/20 text-[10px]">
              Confidential · Internal
            </span>
          </div>

          <h1 className="text-2xl md:text-3xl font-bold mt-2.5 text-[#E9EDF8] leading-tight">
            Good morning, Sarah-Jane. <span className="grad">Three signatures unblock the engine.</span>
          </h1>

          <p className="text-xs md:text-sm mt-3 text-[#8FA0C2] leading-relaxed">
            Verified Audit v2 confirms: 136 core business policy frameworks and operational sprint templates are{' '}
            <strong className="text-[#E9EDF8]">already ingested</strong> into the Infinite Brain — what is missing is{' '}
            <strong className="text-[#E9EDF8]">executive countersignature, not sourcing</strong>. Safeguarding paging is wired in code
            and ready for PagerDuty configuration.
          </p>

          {/* Three Priority Callout Pillars */}
          <div className="grid sm:grid-cols-3 gap-3 mt-6">
            <div className="panel2 p-3.5 border-l-2 border-l-emerald-400">
              <p className="text-[10px] font-bold text-emerald-400 tracking-wider">THIS WEEK</p>
              <p className="text-xs mt-1 text-[#8FA0C2]">
                Ratify 136 policies in Brain L0 · finalize multi-lingual ops scope (OQ-013).
              </p>
              <button 
                onClick={() => onNavigate('docs')}
                className="text-[11px] text-[#22D3EE] font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                Sign Queue <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="panel2 p-3.5 border-l-2 border-l-amber-400">
              <p className="text-[10px] font-bold text-amber-400 tracking-wider">BLOCKED ON YOU</p>
              <p className="text-xs mt-1 text-[#8FA0C2]">
                OQ-014 PagerDuty paging key + named human on-call → gates pilot customer onboarding.
              </p>
              <button 
                onClick={() => onNavigate('gov')}
                className="text-[11px] text-[#22D3EE] font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                View OQ <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className={`panel2 p-3.5 border-l-2 ${stage02Resolved ? 'border-l-emerald-400' : 'border-l-rose-400'}`}>
              <p className={`text-[10px] font-bold tracking-wider ${stage02Resolved ? 'text-emerald-400' : 'text-rose-400'}`}>
                {stage02Resolved ? 'INTEGRITY VERIFIED' : 'INTEGRITY ALERT'}
              </p>
              <p className="text-xs mt-1 text-[#8FA0C2]">
                {stage02Resolved 
                  ? 'Stage 02 audit ledger hash chain verified and merged into main.' 
                  : 'Stage 02 has no exit gate recorded. Audit ledger hash chain pending merge.'}
              </p>
              <button 
                onClick={() => onNavigate('dev')}
                className="text-[11px] text-[#22D3EE] font-semibold mt-2 inline-flex items-center gap-1 hover:underline"
              >
                {stage02Resolved ? 'Inspect Gate' : 'Resolve in Dev Studio'} <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>

          {/* Product Development & Infinite-AI Education Ecosystem Connection Callout */}
          <div className="panel2 p-3.5 mt-3 border border-[#22D3EE]/30 bg-[#0A162B] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-lg bg-[#22D3EE]/10 text-[#22D3EE] shrink-0">
                <GitPullRequest className="w-4 h-4" />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-[#E9EDF8]">
                    Product in Dev: Infinite-AI Education Ecosystem
                  </span>
                  <a
                    href="https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="chip text-[9px] bg-emerald-950/40 text-emerald-300 border-emerald-500/30 flex items-center gap-1 font-mono hover:text-white"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>Sarah-JaneHarding/infinite-ai-ecosystem</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                  {pendingApprovalsCount > 0 && (
                    <span className="chip text-[9px] bg-amber-950/40 text-amber-300 border-amber-500/30 font-bold">
                      {pendingApprovalsCount} PRs Awaiting Your Law 02 Sign-off
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-[#8FA0C2] mt-0.5">
                  Infinite-AI Business Operations is autonomously driving product development, automated testing, and release gating in <code className="text-[#22D3EE] font-mono">Sarah-JaneHarding/infinite-ai-ecosystem</code>.
                </p>
              </div>
            </div>

            <button
              onClick={() => onNavigate('product')}
              className="btn btn-p text-xs py-1.5 px-3 flex items-center gap-1.5 shrink-0 whitespace-nowrap"
            >
              <span>Manage Product Dev</span>
              <ArrowRight className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Live Metrics Gauge Box */}
        <div className="panel p-6 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <p className="kick">LIVE PLATFORM KPIS</p>
              <span className="text-[10px] font-mono text-[#8FA0C2]">Real-time telemetry</span>
            </div>

            <div className="space-y-3.5 text-xs">
              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8FA0C2]">Build Stages Gated (00–18)</span>
                  <strong className={stage02Resolved ? 'text-emerald-400' : 'text-amber-300'}>
                    {stage02Resolved ? '18 / 19 (95%)' : '17 / 19 (89%)'}
                  </strong>
                </div>
                <div className="bar">
                  <i style={{ width: stage02Resolved ? '95%' : '89%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8FA0C2]">Corporate Policies Ingested</span>
                  <strong className="text-[#22D3EE]">136 / 136 (100%)</strong>
                </div>
                <div className="bar">
                  <i style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8FA0C2]">Policies Ratified (L0)</span>
                  <strong className={ratifiedCount === 136 ? 'text-emerald-400' : 'text-amber-300'}>
                    {ratifiedCount} / 136 ({Math.round((ratifiedCount / 136) * 100)}%)
                  </strong>
                </div>
                <div className="bar">
                  <i style={{ width: `${Math.round((ratifiedCount / 136) * 100)}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8FA0C2]">Launch Readiness Progress</span>
                  <strong className="text-amber-300">{launchProgressPct}%</strong>
                </div>
                <div className="bar">
                  <i style={{ width: `${launchProgressPct}%` }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between mb-1.5">
                  <span className="text-[#8FA0C2]">Enterprise Pilot Prospects</span>
                  <strong className="text-rose-400">4 (Gated on OQ-014)</strong>
                </div>
                <div className="bar">
                  <i style={{ width: '25%' }} />
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-[rgba(148,163,255,0.1)] mt-4 flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2]">Quick Ratify All Policies:</span>
            <button 
              onClick={onRatifyAll}
              disabled={ratifiedCount === 136}
              className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-all ${
                ratifiedCount === 136
                  ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-500/30 cursor-default'
                  : 'bg-[#13203C] hover:bg-[#22D3EE]/20 text-[#22D3EE] border border-[rgba(34,211,238,0.3)]'
              }`}
            >
              {ratifiedCount === 136 ? '✓ 136 Ratified' : '⚡ Countersign All (136)'}
            </button>
          </div>
        </div>
      </div>

      {/* Two Column Grid: Launch Sequence vs Standing Rules */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Launch Sequence */}
        <div className="panel p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <p className="kick">LAUNCH SEQUENCE (AUDIT PART D)</p>
              <p className="text-xs text-[#8FA0C2] mt-0.5">Check off milestones as completed to unlock live operations</p>
            </div>
            <span className="chip text-[10px] border-amber-500/30 text-amber-300">
              {completedTasks} of {totalTasks} Complete
            </span>
          </div>

          <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
            {LAUNCH_SEQUENCE.map((phase) => (
              <div key={phase.phase} className="space-y-2">
                <p className="text-[10px] font-mono font-bold tracking-wider text-[#FBBF24]">
                  PHASE {phase.phase} · {phase.title}
                </p>
                <div className="space-y-1.5">
                  {phase.items.map((item, idx) => {
                    const key = `${phase.phase}_${idx}`;
                    const isChecked = !!checkedTasks[key];
                    return (
                      <label 
                        key={idx}
                        className={`flex items-start gap-2.5 p-2.5 rounded-lg text-xs cursor-pointer border transition-all ${
                          isChecked 
                            ? 'bg-emerald-950/20 border-emerald-500/30 text-[#E9EDF8]' 
                            : 'bg-[#13203C] border-[rgba(148,163,255,0.1)] text-[#8FA0C2] hover:border-[#22D3EE]/40'
                        }`}
                      >
                        <input 
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleTask(key)}
                          className="task mt-0.5"
                        />
                        <span className={isChecked ? 'line-through opacity-80' : ''}>
                          {item}
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Standing Architecture Rules & Quick Links */}
        <div className="space-y-5">
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <p className="kick">FOUR UNBREAKABLE LAWS (BUILD MANUAL §0.2)</p>
              <Shield className="w-4 h-4 text-[#22D3EE]" />
            </div>

            <div className="space-y-2.5 text-xs text-[#8FA0C2]">
              <div className="panel2 p-3 border-l-2 border-l-[#22D3EE]">
                <strong className="text-[#E9EDF8] block mb-0.5">Law 01 · The Membrane (Zero PII in Prompts)</strong>
                No learner or confidential customer PII can ever enter a prompt. Egress guard checks provenance stamps; fail-closed red-team suite blocks all injection leaks.
              </div>

              <div className="panel2 p-3 border-l-2 border-l-[#FBBF24]">
                <strong className="text-[#E9EDF8] block mb-0.5">Law 02 · The Keystone (The Human Decides)</strong>
                Human-in-the-loop gates cannot be bypassed in production. No <code className="text-[#22D3EE] font-mono">SKIP_APPROVAL</code> flag exists in the orchestrator runtime.
              </div>

              <div className="panel2 p-3 border-l-2 border-l-[#8B5CF6]">
                <strong className="text-[#E9EDF8] block mb-0.5">Law 03 · Tree Rings (Append-Only Brain)</strong>
                Nothing in the Infinite Brain is ever destructively overwritten. Historical decisions are superseded, timestamped, point-in-time restorable, and fully explainable.
              </div>

              <div className="panel2 p-3 border-l-2 border-l-[#86EFAC]">
                <strong className="text-[#E9EDF8] block mb-0.5">Law 04 · Equally (Tenant Isolation)</strong>
                Every database query executes through <code className="text-[#22D3EE] font-mono">withTenant()</code> using transaction-local RLS. Context-less queries error automatically.
              </div>
            </div>
          </div>

          {/* Direct Module Shortcuts */}
          <div className="panel p-6">
            <p className="kick mb-3">SYSTEM MODULE SHORTCUTS</p>
            <div className="grid grid-cols-2 gap-2.5">
              <button 
                onClick={() => onNavigate('product')}
                className="btn-s text-left p-2.5 flex items-center justify-between border-emerald-500/30 bg-emerald-950/20"
              >
                <span className="text-emerald-300 font-semibold">🚀 Infinite-AI Ecosystem (Dev)</span>
                <ArrowRight className="w-3 h-3 text-emerald-400" />
              </button>

              <button 
                onClick={() => onNavigate('brain')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>🌱 Infinite Brain L0–L4</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>

              <button 
                onClick={() => onNavigate('dev')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>🛠️ Stage Verifier (00–18)</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>

              <button 
                onClick={() => onNavigate('gateway')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>⚡ Model Gateway Routing</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>

              <button 
                onClick={() => onNavigate('infra')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>☁️ 3-Year SaaS Financials</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>

              <button 
                onClick={() => onNavigate('gov')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>⚖️ 5x5 Risk Heatmap</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>

              <button 
                onClick={() => onNavigate('crm')}
                className="btn-s text-left p-2.5 flex items-center justify-between"
              >
                <span>🤝 Pilot Pipeline & Deals</span>
                <ArrowRight className="w-3 h-3 text-[#22D3EE]" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
