import { useState } from 'react';
import { Play, ShieldCheck } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, FORMAT_LABEL } from './primitives';
import { RunRefused } from '../core/platform';
import type { AgentContract } from '../core/agent';

export function AgentRunner({ agent }: { agent: AgentContract }) {
  const { p, actor, bump, go } = useOps();
  const [vals, setVals] = useState<Record<string, string>>({});
  const [err, setErr] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [open, setOpen] = useState(false);

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
      title={<span><span className="mono mr-2 text-xs" style={{ color: 'var(--violet)' }}>{agent.id}</span>{agent.name}</span>}
      right={<button className="btn" onClick={() => setOpen(!open)}>{open ? 'Close' : 'Open'}</button>}
    >
      <p className="text-sm" style={{ color: 'var(--muted)' }}>{agent.summary}</p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        <Badge>{agent.framework}</Badge>
        <Badge tone="review">purpose: {agent.purpose}</Badge>
        {agent.secondApprover && <Badge tone="draft">second approver</Badge>}
        {agent.formats.map((f) => <Badge key={f} tone="info">{FORMAT_LABEL[f]}</Badge>)}
      </div>
      {open && (
        <div className="mt-4 space-y-3">
          {agent.inputs.map((f) => (
            <label key={f.key} className="block text-sm font-medium">
              {f.label}{f.required && <span style={{ color: 'var(--rose)' }}> *</span>}
              {f.kind === 'longtext' ? <textarea className="textarea mt-1" rows={4} value={vals[f.key] ?? ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />
                : f.kind === 'select' ? <select className="select mt-1" value={vals[f.key] ?? ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })}><option value="">Choose…</option>{f.options!.map((o) => <option key={o}>{o}</option>)}</select>
                : <input className="input mt-1" inputMode={f.kind === 'number' ? 'decimal' : undefined} value={vals[f.key] ?? ''} onChange={(e) => setVals({ ...vals, [f.key]: e.target.value })} />}
              {f.help && <span className="block text-xs font-normal" style={{ color: 'var(--muted)' }}>{f.help}</span>}
            </label>
          ))}
          <p className="flex items-center gap-1.5 text-xs" style={{ color: 'var(--muted)' }}><ShieldCheck size={14} /> Input is checked for personal and learner data and for prompt injection before anything is drafted.</p>
          {err && <div role="alert" className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--rose)', color: 'var(--rose)' }}>{err}</div>}
          <button className="btn primary" disabled={busy || !p} onClick={run}><Play size={14} /> {busy ? 'Drafting…' : 'Draft'}</button>
        </div>
      )}
    </Card>
  );
}
