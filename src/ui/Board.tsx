import { useState } from 'react';
import { CheckCircle2, FileText, GitFork, PackageCheck, PenLine, Send, ShieldCheck, XCircle } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, statusTone } from './primitives';
import { agentById } from '../departments';
import { isAutonomous, RunRefused, type Artefact } from '../core/platform';
import { failedChecks, runAcceptance } from '../core/acceptance';

/** Failed acceptance checks for an autonomous draft, or none. The same suite the server re-runs before it accepts a submission. */
const failures = (a: Artefact) => (a.status === 'DRAFT' && isAutonomous(a.requestedBy) ? failedChecks(runAcceptance({ doc: a.doc, agentId: a.agentId, flags: a.flags, requestedBy: a.requestedBy }, agentById(a.agentId))) : []);

const COLUMNS: { status: Artefact['status']; title: string; hint: string }[] = [
  { status: 'IN_REVIEW', title: 'Needs review', hint: 'A reviewer approves or rejects the exact content.' },
  { status: 'APPROVED', title: 'Needs countersignature', hint: 'A different person countersigns, which ratifies it.' },
  { status: 'RATIFIED', title: 'Ratified, not yet ingested', hint: 'Final. Ingestion into the library and Brain is pending or was not relevant.' },
  { status: 'INGESTED', title: 'Ratified and ingested', hint: 'Final. In the document library and recorded in the Brain.' },
  { status: 'DRAFT', title: 'Drafts', hint: 'Nothing here is approved. Edit, save, then submit for review.' },
  { status: 'REJECTED', title: 'Rejected', hint: 'Kept for the record. Edit and resubmit, or leave.' },
];

/** What this person may do to this artefact now, or why not. Mirrors the rules the server enforces. */
function can(a: Artefact, me: string) {
  const agent = agentById(a.agentId);
  if (a.status === 'IN_REVIEW') return agent?.secondApprover && a.requestedBy === me ? { ok: false, why: 'This agent needs someone other than its author to approve.' } : { ok: true, why: '' };
  if (a.status === 'APPROVED') return a.approvedBy === me ? { ok: false, why: 'You approved this. A different person must countersign.' } : { ok: true, why: '' };
  return { ok: true, why: '' };
}

export function Board() {
  const { p, actor, bump, go } = useOps();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ tone: 'ok', text: ok }); } catch (e) { setMsg({ tone: 'bad', text: e instanceof RunRefused ? e.message : (e as Error).message }); } finally { bump(); }
  };
  const all = p!.artefacts();
  const quarantined = all.filter((a) => failures(a).length > 0);
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Review board</h1>
        <p style={{ color: 'var(--muted)' }}>Every output starts as a draft. A reviewer approves the exact content, a <b>different</b> person countersigns it, and only then is it ratified and ingested. Any edit voids the signatures. Ratified output is final: change it by starting a revision, which goes through the whole board again.</p>
      </div>
      {msg && <div role="status" className={`callout ${msg.tone === 'ok' ? 'ok' : 'warn'}`}>{msg.text}</div>}
      {quarantined.length > 0 && (
        <Card title={<span className="flex items-center gap-2">Quarantined: failed their tests<Badge tone="bad">{quarantined.length}</Badge></span>}>
          <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>An autonomous agent produced these, and they failed the automatic checks, so they cannot go to review. Open one, fix what the checks name, and save a new version.</p>
          <ul className="space-y-2">{quarantined.map((a) => <Item key={a.id} a={a} me={actor.id} act={act} open={() => go({ name: 'studio', id: a.id })} failed={failures(a)} />)}</ul>
        </Card>
      )}
      {COLUMNS.map((c) => {
        const items = all.filter((a) => a.status === c.status && !(c.status === 'DRAFT' && failures(a).length > 0));
        return (
          <Card key={c.status} title={<span className="flex items-center gap-2">{c.title}<Badge tone={statusTone(c.status)}>{items.length}</Badge></span>}>
            <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{c.hint}</p>
            {!items.length ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing here.</p> : (
              <ul className="space-y-2">{items.slice(0, c.status === 'INGESTED' ? 20 : 50).map((a) => <Item key={a.id} a={a} me={actor.id} act={act} open={() => go({ name: 'studio', id: a.id })} />)}</ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}

function Item({ a, me, act, open, failed = [] }: { a: Artefact; me: string; act: (fn: () => Promise<unknown>, ok: string) => Promise<void>; open: () => void; failed?: { id: string; title: string; detail: string }[] }) {
  const { p, actor } = useOps();
  const [note, setNote] = useState('');
  const agent = agentById(a.agentId);
  const gate = can(a, me);
  const auto = isAutonomous(a.requestedBy);
  return (
    <li className="card p-3" data-testid="board-item">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={statusTone(a.status)}>{a.status.replace('_', ' ')}</Badge>
        <b className="text-sm">{a.title}</b>
        <Badge tone="info">{a.agentId}</Badge>
        <Badge>v{a.version}</Badge>
        {auto ? <Badge tone="draft"><ShieldCheck size={11} className="mr-1 inline" />Autonomous draft</Badge> : <Badge>by {a.requestedBy}</Badge>}
        {a.revisionOf && <Badge><GitFork size={11} className="mr-1 inline" />revision</Badge>}
        <button className="btn ml-auto" onClick={open}><FileText size={13} /> Open</button>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>
        {a.approvedBy && <>Approved by <b>{a.approvedBy}</b>. </>}{a.countersignedBy && <>Countersigned by <b>{a.countersignedBy}</b>. </>}{a.flags.length > 0 && <>Flags: {a.flags.join(', ')}.</>}
      </p>

      {failed.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm">{failed.map((f) => <li key={f.id}><b>{f.id} {f.title}:</b> {f.detail}</li>)}</ul>}
      {a.status === 'DRAFT' && <div className="mt-2"><button className="btn" disabled={failed.length > 0} title={failed.length ? 'It has to pass its tests first' : ''} onClick={() => act(() => p!.submitForReview(a.id, actor), 'Submitted for review.')}><Send size={14} /> Submit for review</button></div>}

      {a.status === 'IN_REVIEW' && (
        <div className="mt-2 space-y-2">
          {!gate.ok && <p className="text-sm">{gate.why}</p>}
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason / note (required to reject)" aria-label="Review note" />
          <div className="flex gap-2">
            <button className="btn ok" disabled={!gate.ok} onClick={() => act(() => p!.decide(a.id, actor, 'APPROVED', note, agent), 'Approved. It now needs a countersignature from a different person.')}><CheckCircle2 size={14} /> Approve</button>
            <button className="btn danger" disabled={!note.trim()} onClick={() => act(() => p!.decide(a.id, actor, 'REJECTED', note, agent), 'Rejected.')}><XCircle size={14} /> Reject</button>
          </div>
        </div>
      )}

      {a.status === 'APPROVED' && (
        <div className="mt-2 space-y-2">
          {!gate.ok && <p className="text-sm">{gate.why}</p>}
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Countersignature note (optional)" aria-label="Countersignature note" />
          <button className="btn primary" disabled={!gate.ok} onClick={() => act(() => p!.countersign(a.id, actor, note, agent), agent?.ingestion === 'none' ? 'Countersigned and ratified.' : 'Countersigned, ratified and ingested into the library and the Brain.')}><PenLine size={14} /> Countersign and ratify</button>
        </div>
      )}

      {a.status === 'RATIFIED' && (
        <div className="mt-2 flex flex-wrap gap-2">
          {agent?.ingestion !== 'none' && <button className="btn primary" onClick={() => act(() => p!.ingest(a.id, actor), 'Ingested.')}><PackageCheck size={14} /> Ingest</button>}
          <button className="btn" onClick={() => act(() => p!.revise(a.id, actor), 'Revision started as a new draft.')}><GitFork size={14} /> Start a revision</button>
        </div>
      )}

      {a.status === 'INGESTED' && <div className="mt-2"><button className="btn" onClick={() => act(() => p!.revise(a.id, actor), 'Revision started as a new draft.')}><GitFork size={14} /> Start a revision</button></div>}
    </li>
  );
}
