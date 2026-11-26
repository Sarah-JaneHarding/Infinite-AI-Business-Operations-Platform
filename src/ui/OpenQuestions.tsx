import { useCallback, useEffect, useMemo, useState } from 'react';
import { GitPullRequest, HelpCircle } from 'lucide-react';
import { Badge, Card, download } from './primitives';
import { apiFetch } from '../core/api';
import { useOps } from './store';
import { DEPARTMENTS } from '../departments';
import type { AgentTaskProposal, Decision, PrRecord, Question } from '../oq/types';

interface Data { questions: Question[]; decisions: Decision[]; agentTasks: AgentTaskProposal[]; prs: PrRecord[]; config: { prWrites: boolean; prMerge: boolean } }
interface PrView { number: number; url: string; state: 'open' | 'closed' | 'merged'; draft: boolean; headSha: string; ci: string; mergeable: boolean | null; files: { path: string; status: string; patch: string }[]; comments: { by: string; at: string; text: string }[] }

const TABS = [
  { key: 'needs', label: 'Needs an answer', match: ['open', 'partial', 'followup'] },
  { key: 'decided', label: 'Decided, PR pending', match: ['answered'] },
  { key: 'parked', label: 'Parked', match: ['parked'] },
  { key: 'resolved', label: 'Resolved', match: ['resolved'] },
  { key: 'all', label: 'All', match: null as string[] | null },
];
const STATUS: Record<string, string> = { open: 'Open', partial: 'Partly answered', answered: 'Decided', followup: 'Follow-up', resolved: 'Resolved', parked: 'Parked' };
const TONE: Record<string, string> = { open: 'review', partial: 'info', answered: 'draft', followup: 'bad', resolved: 'ok', parked: 'draft' };
const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
/** An added file's patch is `@@ header` then `+line` rows; the text a person edits is those lines without the plus. */
const textOfAddedPatch = (patch: string) => patch.split('\n').slice(1).filter((l) => l.startsWith('+')).map((l) => l.slice(1)).join('\n');

export function OpenQuestions() {
  const { mode } = useOps();
  const [data, setData] = useState<Data | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [tab, setTab] = useState('needs');
  const [repo, setRepo] = useState('all');
  const [q, setQ] = useState('');
  const [open, setOpen] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/oq');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setData((await r.json()) as Data);
      setErr(null);
    } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => { if (mode === 'server') void load(); }, [mode, load]);

  const post = async (path: string, body: unknown, ok: string): Promise<unknown> => {
    const r = await apiFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    const j = (await r.json().catch(() => ({}))) as { error?: string };
    if (!r.ok) { setMsg({ tone: 'bad', text: j.error ?? `HTTP ${r.status}` }); return null; }
    setMsg({ tone: 'ok', text: ok });
    await load();
    return j;
  };

  const tabDef = TABS.find((t) => t.key === tab)!;
  const shown = useMemo(() => (data?.questions ?? []).filter((x) =>
    (repo === 'all' || x.repo === repo) && (!tabDef.match || tabDef.match.includes(x.status)) &&
    (!q.trim() || `${x.id} ${x.title} ${x.question} ${x.reason}`.toLowerCase().includes(q.trim().toLowerCase()))), [data, repo, tabDef, q]);
  const count = (m: string[] | null) => (data?.questions ?? []).filter((x) => (repo === 'all' || x.repo === repo) && (!m || m.includes(x.status))).length;

  if (mode !== 'server') return <Card title="Open Questions"><p className="text-sm">The register is stored on the server. Run the platform in server mode to use it.</p></Card>;
  return (
    <div className="space-y-4">
      <header>
        <h1 className="flex items-center gap-2 text-xl font-bold"><HelpCircle size={20} /> Open Questions Register</h1>
        <p className="text-sm" style={{ color: 'var(--muted)' }}>Every question waiting on a person, across both repositories. Record a decision and the platform creates a task for the accountable department, proposes work for the relevant agents, and drafts a pull request you can review, edit, comment on and merge. AI drafts. The human decides.</p>
      </header>
      {err && <div role="alert" className="card p-3 text-sm">Could not load the register: {err}</div>}
      {msg && <div role="status" className="card p-3 text-sm" style={{ color: msg.tone === 'bad' ? '#9b1c1c' : undefined }}>{msg.text}</div>}
      {data && !data.config.prWrites && <div className="card p-3 text-sm">Pull request writes are off (set <code>OPS_ALLOW_PR_WRITES=true</code> and <code>GITHUB_WRITE_TOKEN</code>). Decisions still create tasks, and you can download the proposed change for each.</div>}
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => <button key={t.key} className={`btn ${t.key === tab ? 'primary' : ''}`} aria-pressed={t.key === tab} onClick={() => setTab(t.key)}>{t.label} ({count(t.match)})</button>)}
        <select className="input w-auto" value={repo} onChange={(e) => setRepo(e.target.value)} aria-label="Repository">
          <option value="all">Both repositories</option><option value="ecosystem">Ecosystem</option><option value="platform">Operations Platform</option>
        </select>
        <input className="input w-56" type="search" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} aria-label="Search questions" />
      </div>
      {data && !data.questions.length && <Card><p className="text-sm">The register is empty. <button className="btn" onClick={() => post('/api/oq/ingest', {}, 'Ingested.')}>Load the questions</button></p></Card>}
      <ul className="space-y-2">
        {shown.map((x) => (
          <li key={x.id} className="card">
            <button className="flex w-full flex-wrap items-center gap-2 p-3 text-left" aria-expanded={open === x.id} onClick={() => setOpen(open === x.id ? null : x.id)}>
              <span className="mono text-xs">{x.id}</span><span className="font-semibold">{x.title}</span>
              <Badge tone={TONE[x.status]}>{STATUS[x.status] ?? x.status}</Badge>
              <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>{x.repo === 'ecosystem' ? 'Ecosystem' : 'Operations Platform'}{x.stage ? ` · ${x.stage}` : ''}</span>
            </button>
            {open === x.id && data && <Detail x={x} data={data} post={post} setMsg={setMsg} />}
          </li>
        ))}
        {data && !shown.length && data.questions.length > 0 && <li className="card p-4 text-sm">Nothing in this view.</li>}
      </ul>
    </div>
  );
}

type Post = (path: string, body: unknown, ok: string) => Promise<unknown>;

function Detail({ x, data, post, setMsg }: { x: Question; data: Data; post: Post; setMsg: (m: { tone: 'ok' | 'bad'; text: string }) => void }) {
  const dec = data.decisions.filter((d) => d.qid === x.id).at(-1);
  const pr = dec && data.prs.find((p) => p.decisionId === dec.id);
  const [pick, setPick] = useState<number | null>(null);
  const [text, setText] = useState('');
  const [reason, setReason] = useState('');
  const opts = x.options ?? [];
  const rec = typeof x.recommendedIndex === 'number' ? x.recommendedIndex : -1;
  const departs = opts.length > 0 && rec >= 0 && pick !== null && pick !== rec;
  const answerable = ['open', 'partial', 'followup'].includes(x.status);
  return (
    <div className="space-y-3 border-t p-3" style={{ borderColor: 'var(--line)' }}>
      <div className="grid gap-3 md:grid-cols-2">
        <div><h4 className="text-xs font-bold uppercase">The question</h4><p className="whitespace-pre-wrap text-sm">{x.question}</p></div>
        <div><h4 className="text-xs font-bold uppercase">Why it is open</h4><p className="whitespace-pre-wrap text-sm">{x.reason}</p></div>
      </div>
      {x.blocks && <p className="text-sm"><b>Blocks:</b> {x.blocks}</p>}
      {!!x.suggestions?.length && <div><h4 className="text-xs font-bold uppercase">Options to consider</h4><ul className="list-disc pl-5 text-sm">{x.suggestions.map((s) => <li key={s}>{s}</li>)}</ul></div>}
      {x.recommendation && <div className="card p-3 text-sm"><b>Recommendation:</b> {x.recommendation}<div className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Written from the question text, not an authority. Source: {x.source || 'register'}.</div></div>}

      {answerable && (
        <form className="space-y-2" onSubmit={async (e) => { e.preventDefault(); const r = await post(`/api/oq/questions/${x.id}/decide`, { ...(pick !== null ? { optionIndex: pick } : {}), ...(text.trim() ? { text } : {}), ...(reason.trim() ? { reason } : {}) }, 'Decision recorded. Tasks created.'); if (r) { setText(''); setReason(''); } }}>
          {opts.length > 0 && <fieldset><legend className="text-sm font-semibold">Your decision</legend>
            {opts.map((o, i) => <label key={o} className="flex items-start gap-2 py-1 text-sm"><input type="radio" name={`o-${x.id}`} checked={pick === i} onChange={() => setPick(i)} /><span>{o}{i === rec && <b className="ml-2 text-xs">Recommended</b>}</span></label>)}
          </fieldset>}
          <label className="block text-sm font-semibold">{opts.length ? 'Anything to add (optional)' : 'Your answer'}<textarea className="input mt-1 w-full" rows={3} value={text} onChange={(e) => setText(e.target.value)} /></label>
          <label className="block text-sm font-semibold">Reason {departs ? '(required: this departs from the recommendation)' : '(optional)'}<textarea className="input mt-1 w-full" rows={2} value={reason} onChange={(e) => setReason(e.target.value)} /></label>
          <button className="btn primary" type="submit">Record decision and create tasks</button>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>No ID numbers or learner details. Text that reads like an instruction to the platform is refused.</p>
        </form>
      )}

      {dec && <Followup x={x} dec={dec} data={data} pr={pr} post={post} setMsg={setMsg} />}
    </div>
  );
}

function Followup({ x, dec, data, pr, post, setMsg }: { x: Question; dec: Decision; data: Data; pr?: PrRecord; post: Post; setMsg: (m: { tone: 'ok' | 'bad'; text: string }) => void }) {
  const tasks = data.agentTasks.filter((t) => t.decisionId === dec.id);
  const downloadPlan = async () => {
    const r = await apiFetch(`/api/oq/decisions/${dec.id}/plan`);
    if (!r.ok) return setMsg({ tone: 'bad', text: `HTTP ${r.status}` });
    const p = (await r.json()) as { recordPath: string; recordContent: string; logRow: string };
    download(`${x.id}-decision.md`, `<!-- ${p.recordPath} -->\n${p.recordContent}\n\n<!-- row for docs/OPEN_QUESTIONS.md Decision log -->\n${p.logRow}\n`, 'text/markdown');
  };
  return (
    <div className="space-y-2 rounded border p-3" style={{ borderColor: 'var(--line)' }}>
      <h4 className="text-sm font-bold">Decision by {dec.by}: {dec.choice || dec.text}</h4>
      {dec.reason && <p className="text-sm">Reason: {dec.reason}</p>}
      <p className="text-sm"><b>Task for {deptName(dec.routing.dept)}</b> ({dec.routing.why}) is on the CEO command centre as <code>{dec.ceoTaskId}</code>.</p>
      {tasks.map((t) => <p key={t.id} className="text-sm">Proposed for agent <code>{t.agentId}</code>. It runs only if an active standing order covers that agent.</p>)}
      {!pr && <div className="flex flex-wrap gap-2">
        <button className="btn primary" disabled={!data.config.prWrites} onClick={() => post(`/api/oq/decisions/${dec.id}/pr`, {}, 'Draft pull request opened.')}><GitPullRequest size={14} /> Open draft pull request</button>
        <button className="btn" onClick={downloadPlan}>Download the proposed change</button>
      </div>}
      {pr && <PrPanel pr={pr} data={data} post={post} />}
    </div>
  );
}

function PrPanel({ pr, data, post }: { pr: PrRecord; data: Data; post: Post }) {
  const [v, setV] = useState<PrView | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [comment, setComment] = useState('');
  const [editing, setEditing] = useState<{ path: string; text: string } | null>(null);
  const [confirm, setConfirm] = useState('');
  const refresh = useCallback(async () => {
    const r = await apiFetch(`/api/oq/prs/${pr.id}`);
    const j = (await r.json().catch(() => ({}))) as { view?: PrView; error?: string };
    if (!r.ok || !j.view) return setErr(j.error ?? `HTTP ${r.status}`);
    setV(j.view); setErr(null);
  }, [pr.id]);
  useEffect(() => { void refresh(); }, [refresh]);
  const act = async (path: string, body: unknown, ok: string) => { if (await post(`/api/oq/prs/${pr.id}/${path}`, body, ok)) await refresh(); };
  return (
    <div className="space-y-2">
      <p className="text-sm"><a href={pr.url} target="_blank" rel="noreferrer noopener" className="underline">Pull request {pr.number}</a> on {pr.repo} · branch <code>{pr.branch}</code>{v && <> · <Badge tone={v.state === 'merged' ? 'ok' : v.draft ? 'draft' : 'review'}>{v.state === 'open' ? (v.draft ? 'Draft' : 'Ready for review') : v.state}</Badge> · CI {v.ci}</>}</p>
      {err && <p className="text-sm" style={{ color: '#9b1c1c' }}>{err}</p>}
      {v?.files.map((f) => (
        <details key={f.path} className="text-sm"><summary className="mono cursor-pointer">{f.path} ({f.status})</summary>
          <pre className="mt-1 max-h-64 overflow-auto whitespace-pre-wrap rounded p-2 text-xs" style={{ background: 'var(--cream)' }}>{f.patch || '(no preview)'}</pre>
          {v.state === 'open' && f.path.startsWith('docs/decisions/') && f.status === 'added' && <button className="btn mt-1" onClick={() => setEditing({ path: f.path, text: textOfAddedPatch(f.patch) })}>Edit this file</button>}
        </details>
      ))}
      {editing && <div className="space-y-2">
        <textarea className="input w-full mono" rows={12} value={editing.text} onChange={(e) => setEditing({ ...editing, text: e.target.value })} aria-label={`Edit ${editing.path}`} />
        <div className="flex gap-2"><button className="btn primary" onClick={async () => { await act('edit', editing, 'Committed to the pull request branch.'); setEditing(null); }}>Commit edit</button><button className="btn" onClick={() => setEditing(null)}>Cancel</button></div>
      </div>}
      {v?.comments.map((c) => <p key={c.at + c.by} className="text-sm"><b>{c.by}</b> · {c.at.slice(0, 10)}: {c.text.split('\n---\n')[0]}</p>)}
      {v?.state === 'open' && <div className="flex gap-2"><input className="input flex-1" value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Comment on this pull request" aria-label="Comment" /><button className="btn" disabled={comment.trim().length < 2} onClick={async () => { await act('comment', { text: comment }, 'Comment posted.'); setComment(''); }}>Comment</button></div>}
      {v?.state === 'open' && v.draft && <button className="btn" onClick={() => act('ready', {}, 'Marked ready for review.')}>Mark ready for review</button>}
      {v?.state === 'open' && !v.draft && (
        <div className="flex flex-wrap items-center gap-2">
          <input className="input w-56" value={confirm} onChange={(e) => setConfirm(e.target.value)} placeholder={`Type ${pr.number} to confirm`} aria-label="Confirm pull request number" />
          <button className="btn ok" disabled={!data.config.prMerge || v.ci !== 'success' || confirm.trim() !== String(pr.number)} onClick={() => act('merge', { confirmNumber: Number(confirm), headSha: v.headSha }, 'Merged. The question is resolved.')}>Merge (squash)</button>
          {!data.config.prMerge && <span className="text-xs">Merging from the platform is off (OPS_ALLOW_PR_MERGE). Merge on GitHub.</span>}
          {data.config.prMerge && v.ci !== 'success' && <span className="text-xs">CI must be green first.</span>}
        </div>
      )}
      <button className="btn" onClick={refresh}>Refresh</button>
    </div>
  );
}
