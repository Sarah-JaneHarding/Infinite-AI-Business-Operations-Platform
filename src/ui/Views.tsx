import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, Download, RefreshCw } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, download, Icon, statusTone } from './primitives';
import { WidgetCard } from './Widgets';
import { AgentRunner } from './AgentRunner';
import { DEPARTMENTS, deptById } from '../departments';
import { snapshot, snapshotFacts } from '../connector/snapshot';
import { checkInput, checkOutput } from '../core/guardrails/engine';
import { detectPii } from '../core/guardrails/pii';
import { detectInjection } from '../core/guardrails/injection';

const INVARIANTS = [
  ['No PII in a prompt', 'Gateway refuses anything not stamped de-identified; learner identifiers abort the run.'],
  ['Purpose limitation', 'Gate order: erased subject, purpose, lawful basis. Closed list of sixteen purposes.'],
  ['Append-only', 'Hash-chained ledger; Brain supersedes, never overwrites; erasure is a tombstone.'],
  ['Human decides', 'Every artefact is a DRAFT. Only a named human approves; some agents need a second person.'],
  ['No invented numbers', 'Unsourced figures are stripped to [UNSOURCED] and the run is flagged.'],
  ['Read-only connector', 'The ecosystem repo is read with GET only. The one write is a human-approved issue.'],
  ['Tenancy', 'Everything is scoped by org id from day one.'],
];

export function Overview() {
  const { p, tick, go, live, mode } = useOps();
  const [chain, setChain] = useState<string>('checking…');
  useEffect(() => { p?.ledger.verify().then((r) => setChain(r === null ? 'intact' : `BROKEN at #${r}`)); }, [p, tick]);
  const arts = p?.artefacts() ?? [];
  const review = arts.filter((a) => a.status === 'IN_REVIEW');
  const f = snapshotFacts();
  const stat = (label: string, value: string | number, src: string, warn = false) => (
    <div className="card p-3"><div className="mono text-2xl font-bold" style={{ color: warn ? 'var(--amber)' : 'var(--violet)' }}>{value}</div><div className="text-xs">{label}</div><div className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{src}</div></div>
  );
  return (
    <div className="space-y-4">
      <div><h1 className="text-2xl font-bold">Command centre</h1><p style={{ color: 'var(--muted)' }}>AI drafts. The human decides. Sixteen departments, one Brain, one ledger.</p></div>
      <Card title="Education Ecosystem · development stage" right={<Badge tone="info">snapshot @ {snapshot.repo.head} · {snapshot.repo.headDate}</Badge>}>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {stat('Build stages logged', f['eco.stages'], 'docs/STAGE_LOG.md')}
          {stat('Source lines (non-test)', Number(f['eco.srcLoc']).toLocaleString('en-ZA'), `${f['eco.units']} workspace units`)}
          {stat('Test files', f['eco.testFiles'], `${Number(f['eco.testLoc']).toLocaleString('en-ZA')} test lines`)}
          {stat('Agent contracts', f['eco.agents.contracts'], `docs say ${f['eco.agents.documented']}`, true)}
          {stat('Open questions', `${f['eco.oq.open']}/${f['eco.oq.total']}`, 'docs/OPEN_QUESTIONS.md', true)}
          {stat('Runbooks', f['eco.runbooks'], 'docs/RUNBOOKS')}
          {stat('CI workflows', f['eco.ciWorkflows'], snapshot.docs.ciWorkflows.join(', '))}
          {stat('Docs', f['eco.docs'], 'docs/')}
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>Counted from files, not estimated. Test pass rates are not claimed here; they come from CI via the live connector{mode === 'server' && live ? ` (fetched ${new Date(live.status.fetchedAt).toLocaleTimeString('en-ZA')})` : ''}. The snapshot is from a shallow checkout, so commit counts are not shown.</p>
        {Number(f['eco.agents.contracts']) !== Number(f['eco.agents.documented']) && (
          <div className="mt-3 flex items-start gap-2 rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--amber)' }}><AlertTriangle size={16} /> The agent roster disagrees: {f['eco.agents.contracts']} contract files counted, docs/AGENTS.md says {f['eco.agents.documented']}. Reconcile before quoting a number externally.<button className="btn ml-auto" onClick={() => go({ name: 'dept', id: 'ai' })}>Open AI department</button></div>
        )}
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Awaiting a human decision" right={<Badge tone="review">{review.length}</Badge>}>
          {review.length ? <ul className="space-y-1">{review.map((a) => <li key={a.id}><button className="underline" onClick={() => go({ name: 'studio', id: a.id })}>{a.title}</button> <span className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{a.agentId}</span></li>)}</ul> : <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing waiting.</p>}
        </Card>
        <Card title="Integrity" right={<Badge tone={chain === 'intact' ? 'ok' : 'bad'}>ledger {chain}</Badge>}>
          <p className="text-sm">{p?.ledger.all.length ?? 0} ledger entries · {p?.brain.all.length ?? 0} Brain facts · {arts.length} artefacts · storage: <b>{mode}</b></p>
        </Card>
      </div>

      <Card title="Unbreakable guardrails (enforced in code, covered by tests)">
        <ul className="grid gap-2 md:grid-cols-2">{INVARIANTS.map(([t, d]) => <li key={t} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}><b>{t}</b><div className="text-xs" style={{ color: 'var(--muted)' }}>{d}</div></li>)}</ul>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {DEPARTMENTS.map((d) => <button key={d.id} className="card p-3 text-left hover:border-[var(--violet)]" onClick={() => go({ name: 'dept', id: d.id })}><div className="flex items-center gap-2 font-semibold"><Icon name={d.icon} /> {d.name}</div><div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{d.agents.length} agents · {d.widgets.length} widgets</div></button>)}
      </div>
    </div>
  );
}

export function Dept({ id }: { id: string }) {
  const d = deptById(id);
  if (!d) return null;
  return (
    <div className="space-y-4">
      <div><h1 className="flex items-center gap-2 text-2xl font-bold"><Icon name={d.icon} size={24} /> {d.name}</h1><p style={{ color: 'var(--muted)' }}>{d.mission}</p>
        <div className="mt-2 flex flex-wrap gap-1.5">{d.frameworks.map((f) => <Badge key={f}>{f}</Badge>)}</div></div>
      <h2 className="text-lg font-semibold">Agents</h2>
      <div className="grid gap-3 xl:grid-cols-2">{d.agents.map((a) => <AgentRunner key={a.id} agent={a} />)}</div>
      <h2 className="text-lg font-semibold">Widgets</h2>
      <div className="grid gap-3 xl:grid-cols-2">{d.widgets.map((w) => <WidgetCard key={w.id} w={w} />)}</div>
    </div>
  );
}

export function BrainView() {
  const { p, actor, bump, tick } = useOps();
  const [err, setErr] = useState('');
  const facts = p?.brain.all ?? [];
  void tick;
  const act = async (fn: () => Promise<unknown>) => { try { setErr(''); await fn(); } catch (e) { setErr((e as Error).message); } bump(); };
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Infinite Brain</h1>
      <p style={{ color: 'var(--muted)' }}>L0 constitution · L1 knowledge · L2 episodes · L3 procedures · L4 learning. Append-only: facts are superseded, never overwritten. Only ratified facts reach agents.</p>
      {err && <div role="alert" className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--rose)' }}>{err}</div>}
      {(['L0', 'L1', 'L2', 'L3', 'L4'] as const).map((tier) => (
        <Card key={tier} title={`${tier}`} right={<Badge>{facts.filter((f) => f.tier === tier).length}</Badge>}>
          <ul className="space-y-2">
            {facts.filter((f) => f.tier === tier).map((f) => (
              <li key={f.id} className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--line)' }}>
                <div className="flex flex-wrap items-center gap-2"><Badge tone={f.status === 'ratified' ? 'ok' : f.status === 'proposed' ? 'draft' : 'bad'}>{f.status}</Badge><span className="mono text-[11px]">{f.topic}</span><span className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{f.id}</span></div>
                <div className="mt-1">{f.text}</div>
                <div className="mono mt-1 text-[10.5px]" style={{ color: 'var(--muted)' }}>by {f.by} · sources: {f.provenance.sources.join(', ')}</div>
                {f.tier !== 'L0' && f.status === 'proposed' && <button className="btn ok mt-2" onClick={() => act(() => p!.brain.ratify(f.id, actor))}>Ratify as {actor.name}</button>}
                {f.tier !== 'L0' && f.status !== 'tombstoned' && <button className="btn ml-2 mt-2" onClick={() => act(() => p!.brain.forget(f.id, actor.id))}>Erase (tombstone)</button>}
              </li>
            ))}
            {!facts.some((f) => f.tier === tier) && <li className="text-sm" style={{ color: 'var(--muted)' }}>Empty.</li>}
          </ul>
        </Card>
      ))}
    </div>
  );
}

export function LedgerView() {
  const { p, tick } = useOps();
  const [res, setRes] = useState<number | null | undefined>(undefined);
  const entries = useMemo(() => [...(p?.ledger.all ?? [])].reverse(), [p, tick]);
  useEffect(() => { p?.ledger.verify().then(setRes); }, [p, tick]);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Audit ledger</h1>
      <Card title="Chain verification" right={<Badge tone={res === null ? 'ok' : res === undefined ? '' : 'bad'}>{res === null ? 'intact' : res === undefined ? 'checking' : `broken at #${res}`}</Badge>}>
        <p className="text-sm">Every entry hashes the one before it. Any edit to a stored entry breaks the chain from that point.</p>
      </Card>
      <Card>
        <div className="overflow-x-auto"><table className="t"><thead><tr><th>#</th><th>When</th><th>Actor</th><th>Action</th><th>Subject</th><th>Hash</th></tr></thead><tbody>{entries.slice(0, 300).map((e) => <tr key={e.seq}><td className="mono">{e.seq}</td><td className="mono text-[11px]">{e.at.slice(0, 19).replace('T', ' ')}</td><td>{e.actor}</td><td>{e.action}</td><td className="mono text-[11px]">{e.subject}</td><td className="mono text-[11px]">{e.hash.slice(0, 10)}</td></tr>)}</tbody></table></div>
        <button className="btn mt-3" onClick={() => download('ledger.json', JSON.stringify(p!.ledger.all, null, 2), 'application/json')}><Download size={14} /> Export ledger</button>
      </Card>
    </div>
  );
}

export function WarehouseView() {
  const { p, tick, mode } = useOps();
  void tick;
  const cols = p?.warehouse.collections() ?? {};
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Data warehouse</h1>
      <p style={{ color: 'var(--muted)' }}>Every artefact version, run, approval, ledger entry, Brain fact and department record lives here. Append-only; hash-addressed. Storage: <b>{mode === 'server' ? 'server JSON-lines files (data/warehouse)' : 'this browser only (localStorage)'}</b>.</p>
      <Card title="Collections">
        <table className="t"><thead><tr><th>Collection</th><th>Records</th></tr></thead><tbody>{Object.entries(cols).map(([c, n]) => <tr key={c}><td className="mono">{c}</td><td>{n}</td></tr>)}{!Object.keys(cols).length && <tr><td colSpan={2}>Empty.</td></tr>}</tbody></table>
        <button className="btn mt-3" onClick={() => download('infinite-ai-warehouse.jsonl', p!.warehouse.exportJsonl(), 'application/x-ndjson')}><Download size={14} /> Download full export (.jsonl)</button>
      </Card>
      {mode === 'local' && <Card><p className="text-sm">Browser storage can be cleared by the browser. Run the server (<span className="mono">npm run dev</span>) for durable files, and download exports regularly.</p></Card>}
    </div>
  );
}

export function ConnectorView() {
  const { live, liveError, refreshLive, mode, health } = useOps();
  const s = live?.status;
  const f = snapshotFacts();
  const row = (label: string, snap: string | number, lv?: string | number) => <tr key={label}><td>{label}</td><td className="mono">{snap}</td><td className="mono">{lv ?? '—'}</td><td>{lv !== undefined && String(lv) !== String(snap) ? <Badge tone="draft">changed since snapshot</Badge> : lv !== undefined ? <Badge tone="ok">same</Badge> : null}</td></tr>;
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between"><h1 className="text-2xl font-bold">Ecosystem connector</h1><button className="btn" onClick={refreshLive}><RefreshCw size={14} /> Refresh</button></div>
      <Card title="Configuration (server-side; secrets never reach the browser)">
        {health ? <ul className="grid gap-1 text-sm sm:grid-cols-2">
          <li>Repository: <span className="mono">{health.repo}</span></li>
          <li>GitHub token: <Badge tone={health.githubToken ? 'ok' : 'draft'}>{health.githubToken ? 'set' : 'not set (60 req/hr, public data only)'}</Badge></li>
          <li>Webhook secret: <Badge tone={health.webhook ? 'ok' : 'draft'}>{health.webhook ? 'set' : 'not set (webhook rejects all)'}</Badge></li>
          <li>Ecosystem writes: <Badge tone={health.ecosystemWrites ? 'review' : ''}>{health.ecosystemWrites ? 'enabled (issues only)' : 'disabled'}</Badge></li>
          <li>Gemini key: <Badge tone={health.gemini ? 'ok' : ''}>{health.gemini ? 'set' : 'not set (local engine)'}</Badge></li>
          <li>Claude key: <Badge tone={health.claude ? 'ok' : ''}>{health.claude ? 'set' : 'not set (local engine)'}</Badge></li>
        </ul> : <p className="text-sm">The server is not running. Start it with <span className="mono">npm run dev</span> to enable live status, webhooks and issue publishing. The committed snapshot is used meanwhile.</p>}
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>Webhook URL: <span className="mono">/api/connector/webhook</span> · events: push, pull_request, workflow_run, issues · content type: application/json · secret = GITHUB_WEBHOOK_SECRET.</p>
      </Card>
      {mode === 'server' && (
        <Card title="Snapshot vs live">
          {liveError && <div className="mb-2 rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--amber)' }}>{liveError}</div>}
          <table className="t"><thead><tr><th>Measure</th><th>Snapshot</th><th>Live</th><th /></tr></thead><tbody>
            {row('Head commit', String(f['eco.head']), s?.head?.sha)}
            {row('Stages logged', f['eco.stages'], s?.stages.count)}
            {row('Latest stage', f['eco.latestStage'], s?.stages.latest)}
            {row('Open questions', f['eco.oq.open'], s?.openQuestions.open)}
            {s && <tr><td>Open pull requests</td><td>—</td><td className="mono">{s.openPulls.length}</td><td /></tr>}
            {s && s.openIssues !== null && <tr><td>Open issues</td><td>—</td><td className="mono">{s.openIssues}</td><td /></tr>}
          </tbody></table>
          {s?.head && <p className="mt-2 text-sm">Latest commit: <span className="mono">{s.head.sha}</span> — {s.head.subject}</p>}
        </Card>
      )}
      {mode === 'server' && <EventsCard />}
    </div>
  );
}
function EventsCard() {
  const [ev, setEv] = useState<{ kind: string; summary: string; at: string }[]>([]);
  useEffect(() => { const load = () => fetch('/api/connector/events').then((r) => r.json()).then(setEv).catch(() => undefined); load(); const t = setInterval(load, 15000); return () => clearInterval(t); }, []);
  return <Card title="Webhook events">{ev.length ? <ul className="space-y-1 text-sm">{ev.map((e, i) => <li key={i}><Badge tone="info">{e.kind}</Badge> {e.summary} <span className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{e.at.slice(11, 19)}</span></li>)}</ul> : <p className="text-sm" style={{ color: 'var(--muted)' }}>No events received yet.</p>}</Card>;
}

export function GuardrailLab() {
  const [text, setText] = useState('Please email Mrs Naidoo at naidoo@school.co.za about revenue of 40% growth.');
  const pii = detectPii(text);
  const inj = detectInjection(text);
  const inp = checkInput(text, ['lab']);
  const out = checkOutput(text, []);
  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Guardrail lab</h1>
      <p style={{ color: 'var(--muted)' }}>Try the same checks every agent run passes through. Nothing here is stored or sent anywhere.</p>
      <textarea className="textarea" rows={5} value={text} onChange={(e) => setText(e.target.value)} aria-label="Text to test" />
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="Personal information found">{pii.length ? <ul className="text-sm">{pii.map((f, i) => <li key={i}><Badge tone="bad">{f.kind}</Badge> <span className="mono">{f.match}</span></li>)}</ul> : <p className="text-sm">None.</p>}</Card>
        <Card title="Prompt injection">{inj.length ? <ul className="text-sm">{inj.map((f, i) => <li key={i}><Badge tone="bad">{f.rule}</Badge> <span className="mono">{f.match}</span></li>)}</ul> : <p className="text-sm">None.</p>}</Card>
        <Card title="What a model would receive (input check)">{inp.ok ? <pre className="mono whitespace-pre-wrap text-xs">{inp.clean.text}</pre> : <p className="text-sm"><Badge tone="bad">refused</Badge> {'refusal' in inp ? inp.refusal : ''}</p>}</Card>
        <Card title="What survives the output check">
          <pre className="mono whitespace-pre-wrap text-xs">{out.text}</pre>
          <div className="mt-2 flex flex-wrap gap-1">{out.flags.map((x) => <Badge key={x} tone="draft">{x}</Badge>)}</div>
        </Card>
      </div>
    </div>
  );
}
void statusTone;
