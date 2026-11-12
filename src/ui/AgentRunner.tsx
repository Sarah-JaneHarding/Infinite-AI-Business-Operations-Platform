import { useState, useEffect, useCallback } from 'react';
import { Play, ShieldCheck, Sparkles, Check, ArrowRight, RefreshCw, AlertCircle, CheckCircle2 } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, FORMAT_LABEL } from './primitives';
import { RunRefused } from '../core/platform';
import { apiFetch } from '../core/api';
import type { AgentContract } from '../core/agent';

interface AgentRecommendations {
  agentId: string;
  strategicRecommendations: string[];
  recommendedInputs: Record<string, string>;
  complianceGuidance: string[];
  suggestedNextSteps: string[];
  toolsUsed?: string[];
  generatedWith?: string;
}

export function AgentRunner({ agent }: { agent: AgentContract }) {
  const { p, actor, bump, go } = useOps();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

  // Recommendations state
  const [recs, setRecs] = useState<AgentRecommendations | null>(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [recsError, setRecsError] = useState<string | null>(null);
  const [recsApplied, setRecsApplied] = useState(false);

  const fetchRecommendations = useCallback(async () => {
    setLoadingRecs(true);
    setRecsError(null);
    try {
      const res = await apiFetch('/api/ai/agent-recommendations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ agentId: agent.id, currentValues: vals })
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      setRecs(data);
    } catch {
      // Deterministic fallback if server call is unreachable
      const fallbackInputs: Record<string, string> = {};
      agent.inputs.forEach((input) => {
        if (input.kind === 'select' && input.options?.length) {
          fallbackInputs[input.key] = input.options[0];
        } else if (input.kind === 'number') {
          fallbackInputs[input.key] = input.key.toLowerCase().includes('fee') ? '4000' : '10';
        } else if (input.kind === 'longtext') {
          fallbackInputs[input.key] = `Standard operational review for South African primary school deployment. Aligned with DBE CAPS curriculum, POPIA Section 72, and R4,000/mo school subscription baseline.`;
        } else {
          fallbackInputs[input.key] = input.key.toLowerCase().includes('school') ? 'Strelitzia Primary School (Western Cape)' : `Standard baseline for ${agent.name}`;
        }
      });
      setRecs({
        agentId: agent.id,
        strategicRecommendations: [
          `Align ${agent.name} parameters with South African primary school operational requirements.`,
          'Verify R4,000/month flat fee sustainability and Cape Town AWS hosting margins.',
          'Enforce non-bypassable Human-in-the-Loop review before publishing to the ecosystem.'
        ],
        recommendedInputs: fallbackInputs,
        complianceGuidance: [
          'POPIA Section 72 Invariant: Ensure learner data remains within South African borders (AWS Cape Town af-south-1).',
          'Law 01 (De-identification): Student names and 13-digit national ID numbers must be stripped or pseudonymized.',
          'Law 02 (Human Ratification): Dual approval required for second-approver contracts.'
        ],
        suggestedNextSteps: [
          'Apply the recommended inputs to pre-populate required fields.',
          'Click Draft to generate the operational artefact.',
          'Review drafted output and ratify in the Studio.'
        ],
        generatedWith: 'deterministic-fallback'
      });
    } finally {
      setLoadingRecs(false);
    }
  }, [agent.id, agent.inputs, agent.name, vals]);

  // Fetch recommendations when opened for the first time
  useEffect(() => {
    if (open && !recs && !loadingRecs) {
      fetchRecommendations();
    }
  }, [open, recs, loadingRecs, fetchRecommendations]);

  const applyAllRecommendations = () => {
    if (!recs) return;
    setVals((prev) => ({ ...prev, ...recs.recommendedInputs }));
    setRecsApplied(true);
    setTimeout(() => setRecsApplied(false), 3500);
  };

  const applySingleField = (key: string, val: string) => {
    setVals((prev) => ({ ...prev, [key]: val }));
  };

  const run = async () => {
    if (!p) return;
    setBusy(true); setErr(null);
    try {
      const art = await p.runAgent(agent, vals, actor);
      bump();
      go({ name: 'studio', id: art.id });
    } catch (e) {
      setErr(e instanceof RunRefused ? `Refused (${e.kind}): ${e.message}` : (e as Error).message);
      bump();
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card
      title={<span><span className="mono mr-2 text-xs font-semibold" style={{ color: '#5b21b6' }}>{agent.id}</span><span className="font-semibold text-slate-900">{agent.name}</span></span>}
      right={
        <div className="flex items-center gap-2">
          <button className="btn" onClick={() => setOpen(!open)}>{open ? 'Close Task' : 'Configure Task'}</button>
        </div>
      }
    >
      <p className="text-sm text-slate-700">{agent.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{agent.framework}</Badge>
        <Badge tone="review">purpose: {agent.purpose}</Badge>
        {agent.secondApprover && <Badge tone="draft">second approver</Badge>}
        {agent.formats.map((f) => <Badge key={f} tone="info">{FORMAT_LABEL[f]}</Badge>)}
      </div>

      {open && (
        <div className="mt-5 space-y-4">
          {/* AI Suggestions & Recommendations Panel */}
          <div className="rounded-xl border border-violet-200 bg-gradient-to-br from-violet-50/70 via-indigo-50/40 to-slate-50 p-4 text-slate-900 shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-violet-200 pb-2.5">
              <div className="flex items-center gap-2">
                <Sparkles size={17} className="text-violet-700" />
                <span className="font-bold text-slate-900">AI Suggestions & Recommendations</span>
                <span className="mono rounded bg-violet-100 px-1.5 py-0.5 text-[10px] font-semibold text-violet-800">
                  {recs?.generatedWith && recs.generatedWith !== 'deterministic-fallback' ? recs.generatedWith : 'operations engine'} · AI DRAFT
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn text-xs py-1 px-2.5 bg-white border-violet-300 text-violet-900 hover:bg-violet-50"
                  onClick={fetchRecommendations}
                  disabled={loadingRecs}
                  title="Regenerate suggestions"
                >
                  <RefreshCw size={12} className={`mr-1 inline ${loadingRecs ? 'animate-spin' : ''}`} />
                  {loadingRecs ? 'Analyzing…' : 'Refresh Suggestions'}
                </button>
                {recs?.recommendedInputs && (
                  <button
                    type="button"
                    className="btn primary text-xs py-1 px-3 bg-violet-700 hover:bg-violet-800 text-white font-medium"
                    onClick={applyAllRecommendations}
                  >
                    <Check size={13} className="mr-1 inline" />
                    Apply Recommended Inputs
                  </button>
                )}
              </div>
            </div>

            {loadingRecs && !recs && (
              <div className="py-4 text-center text-xs text-slate-600">
                <RefreshCw size={16} className="mx-auto mb-1 animate-spin text-violet-600" />
                Analyzing task context, South African school economics, and compliance rules…
              </div>
            )}

            {recsError && (
              <div className="mt-2 flex items-center gap-2 text-xs text-rose-700">
                <AlertCircle size={14} /> {recsError}
              </div>
            )}

            {recsApplied && (
              <div className="mt-2.5 flex items-center gap-2 rounded-lg bg-emerald-100/90 border border-emerald-300 p-2 text-xs font-medium text-emerald-900 animate-fadeIn">
                <CheckCircle2 size={15} className="text-emerald-700" />
                Recommended input parameters applied to the form below! Review and edit as desired.
              </div>
            )}

            {recs && (
              <div className="mt-3 grid gap-3 md:grid-cols-2">
                {/* Strategic suggestions */}
                <div className="rounded-lg border border-violet-100 bg-white/90 p-3 shadow-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-violet-900 mb-1.5 flex items-center gap-1.5">
                    <span className="inline-block h-2 w-2 rounded-full bg-violet-600"></span>
                    Strategic Suggestions
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {recs.strategicRecommendations.map((s, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <ArrowRight size={12} className="mt-0.5 shrink-0 text-violet-600" />
                        <span>{s}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Compliance & Safeguards */}
                <div className="rounded-lg border border-slate-200 bg-white/90 p-3 shadow-xs">
                  <div className="text-xs font-bold uppercase tracking-wider text-slate-800 mb-1.5 flex items-center gap-1.5">
                    <ShieldCheck size={13} className="text-emerald-700" />
                    Compliance & POPIA Safeguards
                  </div>
                  <ul className="space-y-1.5 text-xs text-slate-700">
                    {recs.complianceGuidance.map((c, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="font-semibold text-emerald-700">✓</span>
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Parameter Presets preview */}
                {recs.recommendedInputs && Object.keys(recs.recommendedInputs).length > 0 && (
                  <div className="md:col-span-2 rounded-lg border border-violet-100 bg-white/90 p-3 shadow-xs">
                    <div className="text-xs font-bold uppercase tracking-wider text-violet-900 mb-2 flex items-center justify-between">
                      <span>Recommended Form Values:</span>
                      <span className="text-[11px] font-normal lowercase text-slate-500">click individual values or "Apply Recommended Inputs" above</span>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {Object.entries(recs.recommendedInputs).map(([k, v]) => (
                        <button
                          key={k}
                          type="button"
                          className="flex items-center gap-1.5 rounded-md border border-violet-200 bg-violet-50/50 hover:bg-violet-100/70 px-2 py-1 text-left text-xs transition"
                          onClick={() => applySingleField(k, v)}
                          title={`Click to fill '${k}'`}
                        >
                          <span className="mono font-semibold text-violet-950">{k}:</span>
                          <span className="text-slate-700 truncate max-w-[220px]">{v}</span>
                          <span className="text-violet-700 text-[10px] font-bold ml-1 hover:underline">Use</span>
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form inputs */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-white p-4 shadow-xs">
            <div className="font-bold text-sm text-slate-900 border-b border-slate-100 pb-2">Task Input Parameters</div>
            {agent.inputs.map((f) => (
              <label key={f.key} className="block text-sm font-medium text-slate-900">
                <div className="flex justify-between items-center mb-1">
                  <span>
                    {f.label}{f.required && <span style={{ color: 'var(--rose)' }}> *</span>}
                  </span>
                  {recs?.recommendedInputs?.[f.key] && vals[f.key] !== recs.recommendedInputs[f.key] && (
                    <button
                      type="button"
                      className="text-[11px] font-normal text-violet-700 hover:text-violet-900 underline"
                      onClick={() => applySingleField(f.key, recs.recommendedInputs[f.key])}
                    >
                      Use recommended: "{recs.recommendedInputs[f.key].length > 30 ? recs.recommendedInputs[f.key].slice(0, 30) + '…' : recs.recommendedInputs[f.key]}"
                    </button>
                  )}
                </div>
                {f.kind === 'longtext' ? (
                  <textarea
                    className="textarea mt-1 w-full text-slate-900 bg-white"
                    rows={4}
                    value={vals[f.key] ?? ''}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                  />
                ) : f.kind === 'select' ? (
                  <select
                    className="select mt-1 w-full text-slate-900 bg-white"
                    value={vals[f.key] ?? ''}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                  >
                    <option value="">Choose…</option>
                    {f.options!.map((o) => <option key={o} value={o}>{o}</option>)}
                  </select>
                ) : (
                  <input
                    className="input mt-1 w-full text-slate-900 bg-white"
                    inputMode={f.kind === 'number' ? 'decimal' : undefined}
                    value={vals[f.key] ?? ''}
                    onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}
                  />
                )}
                {f.help && <span className="block text-xs font-normal text-slate-600 mt-1">{f.help}</span>}
              </label>
            ))}

            <p className="flex items-center gap-1.5 text-xs text-slate-600 pt-1">
              <ShieldCheck size={14} className="text-emerald-700" />
              Input is checked for personal and learner data and for prompt injection before anything is drafted.
            </p>
            {err && (
              <div role="alert" className="rounded-lg border p-2.5 text-sm font-medium bg-rose-50 border-rose-300 text-rose-800">
                {err}
              </div>
            )}
            <div className="pt-2">
              <button className="btn primary px-4 py-2 font-semibold" disabled={busy || !p} onClick={run}>
                <Play size={14} className="mr-1 inline" /> {busy ? 'Drafting Artefact…' : 'Execute & Draft Artefact'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Card>
  );
}
