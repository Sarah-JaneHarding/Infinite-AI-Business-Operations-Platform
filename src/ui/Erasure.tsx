import { useState } from 'react';
import { CheckCircle2, Eraser, Send, XCircle } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card } from './primitives';
import { RunRefused } from '../core/platform';
import { CATEGORY_LABEL, ERASURE_CATEGORIES, type ErasureCategory, type ErasureRequest } from '../core/erasure';

const TONE: Record<ErasureRequest['status'], string> = { REQUESTED: 'review', APPROVED: 'draft', REJECTED: 'bad', EXECUTED: 'ok' };
const STATUS_TEXT: Record<ErasureRequest['status'], string> = { REQUESTED: 'Waiting for a second person', APPROVED: 'Approved, not yet applied', REJECTED: 'Rejected', EXECUTED: 'Erased' };

export function ErasureView() {
  const { p, actor, bump } = useOps();
  const [ref, setRef] = useState('');
  const [category, setCategory] = useState<ErasureCategory>('data_subject_request');
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ tone: 'ok', text: ok }); return true; } catch (e) { setMsg({ tone: 'bad', text: e instanceof RunRefused ? e.message : (e as Error).message }); return false; } finally { bump(); }
  };
  const requests = p!.erasureRequests();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Erasure requests</h1>
        <p style={{ color: 'var(--muted)' }}>One person raises a request and a <b>different</b> person decides it. Approving stops all further processing for that subject, and this cannot be undone. It does not delete records that already exist (artefacts, Brain facts): remove those separately.</p>
      </div>
      {msg && <div role="status" className={`callout ${msg.tone === 'ok' ? 'ok' : 'warn'}`}>{msg.text}</div>}

      <Card title="Raise a request">
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Subject reference</span>
            <input className="input" type="password" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="An opaque reference, e.g. CONTACT-1042" aria-label="Subject reference" />
            <span className="block text-xs" style={{ color: 'var(--muted)' }}>Not a name, email, phone or ID number. Only a fingerprint (hash) of it is stored, so the approver will need to type the same reference.</span>
          </label>
          <label className="space-y-1 text-sm">
            <span className="font-semibold">Reason</span>
            <select className="input" value={category} onChange={(e) => setCategory(e.target.value as ErasureCategory)} aria-label="Reason">
              {ERASURE_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm md:col-span-2">
            <span className="font-semibold">Note (optional, 200 characters)</span>
            <input className="input" maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} aria-label="Note" />
          </label>
        </div>
        <button className="btn primary mt-3" disabled={ref.trim().length < 3} onClick={async () => { if (await act(() => p!.requestErasure(ref, category, note, actor), 'Request raised. A second person must now decide it.')) { setRef(''); setNote(''); } }}><Send size={14} /> Request erasure</button>
      </Card>

      <Card title={`Requests (${requests.length})`}>
        {!requests.length ? <p className="text-sm" style={{ color: 'var(--muted)' }}>No erasure requests yet.</p> : (
          <ul className="space-y-3">
            {requests.map((r) => <RequestRow key={r.id} r={r} me={actor.id} act={act} />)}
          </ul>
        )}
      </Card>
    </div>
  );
}

function RequestRow({ r, me, act }: { r: ErasureRequest; me: string; act: (fn: () => Promise<unknown>, ok: string) => Promise<boolean> }) {
  const { p, actor } = useOps();
  const [ref, setRef] = useState('');
  const [note, setNote] = useState('');
  const mine = r.requestedBy === me;
  return (
    <li className="card p-3" data-testid="erasure-request">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[r.status]}>{STATUS_TEXT[r.status]}</Badge>
        <span className="text-sm font-semibold">{CATEGORY_LABEL[r.category]}</span>
        <span className="mono text-xs" style={{ color: 'var(--muted)' }}>fingerprint {r.subjectHash.slice(0, 8)}…</span>
        <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>raised by {r.requestedBy} · {r.at.slice(0, 16).replace('T', ' ')}</span>
      </div>
      {r.note && <p className="mt-1 text-sm">{r.note}</p>}
      {r.decidedBy && <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{r.status === 'REJECTED' ? 'Rejected' : 'Approved'} by {r.decidedBy}{r.decisionNote ? ` — ${r.decisionNote}` : ''}</p>}

      {r.status === 'REQUESTED' && mine && <p className="mt-2 text-sm">You raised this, so someone else has to decide it.</p>}
      {r.status === 'REQUESTED' && !mine && (
        <div className="mt-2 space-y-2">
          <input className="input" type="password" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Retype the subject reference to approve" aria-label="Retype the subject reference" />
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Reason (required to reject)" aria-label="Decision note" />
          <div className="flex gap-2">
            <button className="btn ok" disabled={ref.trim().length < 3} onClick={async () => { if (await act(() => p!.decideErasure(r.id, actor, 'APPROVED', note, ref), 'Approved and applied: processing for that subject is now blocked.')) setRef(''); }}><CheckCircle2 size={14} /> Approve and erase</button>
            <button className="btn danger" disabled={!note.trim()} onClick={() => act(() => p!.decideErasure(r.id, actor, 'REJECTED', note), 'Request rejected.')}><XCircle size={14} /> Reject</button>
          </div>
        </div>
      )}
      {r.status === 'APPROVED' && (
        <div className="mt-2 space-y-2">
          <p className="text-sm">The approval is recorded but the erasure was not applied. Retype the reference to apply it.</p>
          <div className="flex gap-2">
            <input className="input" type="password" autoComplete="off" value={ref} onChange={(e) => setRef(e.target.value)} placeholder="Subject reference" aria-label="Subject reference to apply" />
            <button className="btn primary" disabled={ref.trim().length < 3} onClick={async () => { if (await act(() => p!.applyErasure(r.id, actor, ref), 'Erasure applied.')) setRef(''); }}><Eraser size={14} /> Apply erasure</button>
          </div>
        </div>
      )}
    </li>
  );
}
