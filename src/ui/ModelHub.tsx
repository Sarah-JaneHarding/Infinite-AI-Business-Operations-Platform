import { useCallback, useEffect, useState } from 'react';
import { CheckCircle2, ClipboardCopy, ExternalLink, FlaskConical, Lock, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Card } from './primitives';
import { apiFetch } from '../core/api';
import { useOps } from './store';

interface ProviderStatus {
  id: string; label: string; state: 'not_configured' | 'needs_attestation' | 'reattest' | 'ready';
  configured: boolean; model: string; keyEnv: string; modelEnv: string; callsToday: number;
  attestation: { by: string; at: string; note: string; model: string } | null;
  lastTest: { ok: boolean; at: string; ms: number; error?: string } | null;
  setup: { where: string; url: string; steps: string[]; envExample: string[] };
}
interface HubStatus {
  providers: ProviderStatus[]; order: string[];
  rules: { id: string; title: string; text: string }[];
  limits: { maxInputChars: number; maxHistory: number; maxToolResultChars: number; maxToolTurns: number; maxOutputTokens: number; dailyCallsPerProvider: number };
  readableCollections: string[]; toolNames: string[];
  usage: { calls: number; inputTokens: number; outputTokens: number };
}

const STATE: Record<ProviderStatus['state'], { tone: string; text: string }> = {
  not_configured: { tone: '', text: 'Not configured' },
  needs_attestation: { tone: 'review', text: 'Configured · needs attestation' },
  reattest: { tone: 'review', text: 'Model changed · re-attest' },
  ready: { tone: 'ok', text: 'Ready' },
};

const copy = async (text: string) => {
  try { await navigator.clipboard.writeText(text); } catch { /* clipboard blocked: the text is visible to select */ }
};

export function ModelHub() {
  const { mode } = useOps();
  const [hub, setHub] = useState<HubStatus | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/models/hub');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setHub((await r.json()) as HubStatus);
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (mode === 'server') void load(); }, [mode, load]);

  const post = async (path: string, body: unknown, ok: string) => {
    try {
      const r = await apiFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; ok?: boolean; ms?: number };
      if (!r.ok) throw new Error(j.error ?? `HTTP ${r.status}`);
      setMsg(j.ok === false ? { tone: 'bad', text: `Test failed: ${(j as { error?: string }).error ?? 'no answer'}` } : { tone: 'ok', text: ok });
    } catch (e) { setMsg({ tone: 'bad', text: (e as Error).message }); }
    await load();
  };

  if (mode !== 'server') return <Card title="Model Hub"><p className="text-sm">The Model Hub needs the server. Start it with <code>npm run dev</code> and open the platform from there.</p></Card>;
  if (err && !hub) return <Card title="Model Hub"><p className="text-sm">Could not load the hub: {err}</p></Card>;
  if (!hub) return <div className="p-4">Loading the Model Hub…</div>;

  const anyReady = hub.providers.some((p) => p.state === 'ready');
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Model Hub</h1>
        <p style={{ color: 'var(--muted)' }}>Every AI model the platform uses is connected here, and every call passes the same rules. Output is always a draft: a person reviews, edits and saves it, and a second person countersigns before anything is ratified.</p>
      </div>
      {msg && <div role="status" className={`callout ${msg.tone === 'ok' ? 'ok' : 'warn'}`}>{msg.text}</div>}
      {!anyReady && <div className="callout warn">No provider is ready, so agents and the copilot use their built-in templates and a deterministic engine. Follow the steps on a card below to connect one.</div>}

      <Card title="Quick start">
        <ol className="list-decimal space-y-1 pl-5 text-sm">
          <li><b>Pick a provider</b> below and create an API key in its console, one dedicated to this platform.</li>
          <li><b>Add the key to the server's <code>.env</code></b> (the card shows the exact line). Keys live only on the server: they are never shown here, never stored in the data warehouse, and never sent to the browser.</li>
          <li><b>Restart the server</b>, then refresh this page: the card says "Configured".</li>
          <li><b>Attest</b>: confirm you reviewed the provider's terms for the exact model shown. A named person's attestation is required, recorded in the audit ledger, and has to be repeated if the model changes.</li>
          <li><b>Test</b>: sends a harmless fixed prompt through the full rule path to prove it works.</li>
        </ol>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {hub.providers.map((p) => <ProviderCard key={p.id} p={p} post={post} order={hub.order} />)}
      </div>

      <Card title="Rules that apply to every model call" right={<Badge tone="info"><Lock size={11} className="mr-1 inline" />cannot be turned off</Badge>}>
        <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>These are code, not settings. Configuration can only make them stricter. A test fails if any other code path can reach a provider.</p>
        <ul className="space-y-2">
          {hub.rules.map((r) => (
            <li key={r.id} className="flex gap-3 text-sm"><span className="mono mt-0.5 h-fit rounded bg-violet-100 px-1.5 py-0.5 text-[11px] font-bold text-violet-800">{r.id}</span><span><b>{r.title}.</b> {r.text}</span></li>
          ))}
        </ul>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Limits and use today">
          <dl className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1 text-sm">
            <dt>Calls today (all providers)</dt><dd className="mono">{hub.usage.calls}</dd>
            <dt>Tokens in / out today</dt><dd className="mono">{hub.usage.inputTokens} / {hub.usage.outputTokens}</dd>
            <dt>Daily calls per provider</dt><dd className="mono">{hub.limits.dailyCallsPerProvider}</dd>
            <dt>Largest input</dt><dd className="mono">{hub.limits.maxInputChars} characters</dd>
            <dt>Largest answer</dt><dd className="mono">{hub.limits.maxOutputTokens} tokens</dd>
            <dt>Tool turns per question</dt><dd className="mono">{hub.limits.maxToolTurns}</dd>
          </dl>
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Change the daily budget with <code>OPS_MODEL_DAILY_CALLS</code>. Use is counted from the audit ledger, so a restart does not reset it.</p>
        </Card>
        <Card title="What the tools can see">
          <div className="flex flex-wrap items-center gap-1 text-sm">Tools: {hub.toolNames.map((t) => <code key={t} className="break-all">{t}</code>)}</div>
          <p className="mt-2 text-sm">Collections a model may read: {hub.readableCollections.length ? hub.readableCollections.map((c) => <code key={c} className="mr-1 break-all">{c}</code>) : <b>none (counts only)</b>}</p>
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Allow a collection with <code>OPS_MODEL_READABLE_COLLECTIONS=vendors,pilots</code>. Its contents are de-identified and trimmed before a model sees them. The ledger, erasure records, integration settings, approvals, the Brain and custom definitions can never be allowed.</p>
        </Card>
      </div>
    </div>
  );
}

function ProviderCard({ p, post, order }: { p: ProviderStatus; post: (path: string, body: unknown, ok: string) => Promise<void>; order: string[] }) {
  const [note, setNote] = useState('');
  const [reviewed, setReviewed] = useState(false);
  const [reason, setReason] = useState('');
  const st = STATE[p.state];
  return (
    <Card title={<span className="flex flex-wrap items-center gap-2">{p.label}<Badge tone={st.tone}>{st.text}</Badge>{order[0] === p.id && <Badge tone="info">first choice</Badge>}</span>}>
      <p className="text-sm">Model: <code>{p.model}</code> · calls today: <b>{p.callsToday}</b></p>

      {p.state === 'not_configured' && (
        <div className="mt-3 space-y-2">
          <ol className="list-decimal space-y-1 pl-5 text-sm">{p.setup.steps.map((s) => <li key={s}>{s}</li>)}</ol>
          <p className="text-sm"><a className="underline" href={p.setup.url} target="_blank" rel="noopener noreferrer">Open the {p.setup.where} <ExternalLink size={12} className="inline" /></a></p>
          <div className="rounded border p-2" style={{ borderColor: 'var(--line)' }}>
            <div className="mb-1 flex items-center justify-between text-xs"><b>Add to the server's .env</b><button className="btn" onClick={() => copy(p.setup.envExample.join('\n'))}><ClipboardCopy size={12} /> Copy</button></div>
            <pre className="mono whitespace-pre-wrap text-xs">{p.setup.envExample.join('\n')}</pre>
          </div>
        </div>
      )}

      {(p.state === 'needs_attestation' || p.state === 'reattest') && (
        <div className="mt-3 space-y-2">
          {p.state === 'reattest' && p.attestation && <p className="text-sm">It was attested for <code>{p.attestation.model}</code>. The model is now <code>{p.model}</code>, so it needs a new attestation.</p>}
          <label className="block text-sm font-semibold">What did you review?
            <textarea className="textarea mt-1" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Reviewed the provider's data-processing terms, retention and training settings" aria-label={`Attestation note for ${p.label}`} />
          </label>
          <label className="flex items-start gap-2 text-sm"><input type="checkbox" checked={reviewed} onChange={(e) => setReviewed(e.target.checked)} /> I reviewed this provider's terms for <code>{p.model}</code> and I am authorised to allow it.</label>
          <button className="btn primary" disabled={!reviewed || note.trim().length < 10} onClick={() => post(`/api/models/providers/${p.id}/attest`, { note }, `${p.label} attested.`).then(() => { setNote(''); setReviewed(false); })}><ShieldCheck size={14} /> Attest {p.label}</button>
        </div>
      )}

      {p.state === 'ready' && (
        <div className="mt-3 space-y-2">
          {p.attestation && <p className="text-xs" style={{ color: 'var(--muted)' }}>Attested by <b>{p.attestation.by}</b> on {p.attestation.at.slice(0, 10)}: {p.attestation.note}</p>}
          <div className="flex flex-wrap items-center gap-2">
            <button className="btn" onClick={() => post(`/api/models/providers/${p.id}/test`, {}, 'Test passed: the provider answered through the full rule path.')}><FlaskConical size={14} /> Run test</button>
            {p.lastTest && <span className="text-xs">{p.lastTest.ok ? <CheckCircle2 size={13} className="inline text-green-600" /> : <XCircle size={13} className="inline text-red-600" />} last test {p.lastTest.at.slice(0, 16).replace('T', ' ')}{p.lastTest.ok ? ` · ${p.lastTest.ms} ms` : ` · ${p.lastTest.error ?? 'failed'}`}</span>}
          </div>
          <div className="flex gap-2">
            <input className="input" value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason to stop using it (required)" aria-label={`Revoke reason for ${p.label}`} />
            <button className="btn danger" disabled={reason.trim().length < 5} onClick={() => post(`/api/models/providers/${p.id}/revoke`, { reason }, `${p.label} revoked.`).then(() => setReason(''))}>Revoke</button>
          </div>
        </div>
      )}
    </Card>
  );
}
