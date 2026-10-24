import { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Download, Eye, FilePlus2, Pencil, Save, Send, XCircle, UploadCloud } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, downloadDoc, FORMAT_LABEL, statusTone } from './primitives';
import { toHtml, toMarkdown } from '../core/artefacts/render';
import { AGENTS, agentById } from '../departments';
import { RunRefused, type Artefact } from '../core/platform';
import type { Block, Doc } from '../core/types';
import { download } from './primitives';
import { proposalFromArtefact } from '../connector/proposals';

function BlockEditor({ b, set }: { b: Block; set: (n: Block) => void }) {
  const lines = (a?: string[]) => (a ?? []).join('\n');
  switch (b.type) {
    case 'h': return <input className="input font-semibold" value={b.text ?? ''} onChange={(e) => set({ ...b, text: e.target.value })} aria-label="Heading" />;
    case 'p': case 'callout': return <textarea className="textarea" rows={Math.min(8, Math.max(2, Math.ceil((b.text ?? '').length / 90)))} value={b.text ?? ''} onChange={(e) => set({ ...b, text: e.target.value })} aria-label={b.type === 'p' ? 'Paragraph' : 'Callout'} />;
    case 'ul': case 'ol': return <textarea className="textarea" rows={Math.max(2, (b.items ?? []).length)} value={lines(b.items)} onChange={(e) => set({ ...b, items: e.target.value.split('\n') })} aria-label="List, one item per line" />;
    case 'checklist': return <div className="space-y-1">{(b.checks ?? []).map((c, i) => <div key={i} className="flex gap-2"><input type="checkbox" checked={c.done} onChange={(e) => set({ ...b, checks: b.checks!.map((x, j) => (j === i ? { ...x, done: e.target.checked } : x)) })} /><input className="input" value={c.label} onChange={(e) => set({ ...b, checks: b.checks!.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)) })} /></div>)}</div>;
    case 'kv': return <div className="space-y-1">{(b.pairs ?? []).map(([k, v], i) => <div key={i} className="grid grid-cols-[1fr_2fr] gap-2"><input className="input" value={k} onChange={(e) => set({ ...b, pairs: b.pairs!.map((x, j) => (j === i ? [e.target.value, x[1]] : x)) })} /><input className="input" value={v} onChange={(e) => set({ ...b, pairs: b.pairs!.map((x, j) => (j === i ? [x[0], e.target.value] : x)) })} /></div>)}</div>;
    case 'table': return (
      <div className="overflow-x-auto">
        <table className="t">
          <thead><tr>{(b.headers ?? []).map((h, i) => <th key={i}><input className="input" value={h} onChange={(e) => set({ ...b, headers: b.headers!.map((x, j) => (j === i ? e.target.value : x)) })} /></th>)}</tr></thead>
          <tbody>{(b.rows ?? []).map((r, ri) => <tr key={ri}>{r.map((c, ci) => <td key={ci}><input className="input" value={String(c)} onChange={(e) => set({ ...b, rows: b.rows!.map((rr, i) => (i === ri ? rr.map((cc, j) => (j === ci ? (typeof cc === 'number' && e.target.value !== '' && Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value) : cc)) : rr)) })} /></td>)}</tr>)}</tbody>
        </table>
        <button className="btn mt-1" onClick={() => set({ ...b, rows: [...(b.rows ?? []), (b.headers ?? []).map(() => '')] })}>+ row</button>
      </div>
    );
  }
}

function ArtefactPanel({ a }: { a: Artefact }) {
  const { p, actor, bump, health, mode } = useOps();
  const agent = agentById(a.agentId);
  const [mode2, setMode2] = useState<'preview' | 'markdown' | 'edit' | 'history' | 'ledger'>('preview');
  const [doc, setDoc] = useState<Doc>(a.doc);
  const [note, setNote] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  useEffect(() => { setDoc(a.doc); setMsg(null); setMode2('preview'); }, [a.id, a.version, a.status]);
  const act = async (fn: () => Promise<unknown>, ok: string) => {
    try { await fn(); setMsg({ tone: 'ok', text: ok }); } catch (e) { setMsg({ tone: 'bad', text: e instanceof RunRefused ? e.message : (e as Error).message }); }
    bump();
  };
  const hist = p!.history(a.id);
  const ledger = p!.ledger.all.filter((e) => e.subject === a.id);
  const canPublish = a.agentId === 'OPS-PROD-01' && a.status === 'APPROVED';
  const preview = useMemo(() => toHtml(a.doc), [a.doc]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <h2 className="text-xl font-bold">{a.title}</h2>
        <Badge tone={statusTone(a.status)}>{a.status.replace('_', ' ')}</Badge>
        <Badge>v{a.version}</Badge>
        <Badge tone="info">{a.agentId}</Badge>
        {a.flags.map((f) => <Badge key={f} tone="draft">{f}</Badge>)}
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Requested by {a.requestedBy} · engine {a.engine}{a.approvedBy ? ` · decided by ${a.approvedBy}` : ''}{a.note ? ` · “${a.note}”` : ''}</p>

      <div role="tablist" className="flex flex-wrap gap-1">
        {(['preview', 'markdown', 'edit', 'history', 'ledger'] as const).map((m) => <button key={m} role="tab" aria-selected={mode2 === m} className={`btn ${mode2 === m ? 'primary' : ''}`} onClick={() => setMode2(m)}>{m === 'edit' ? <><Pencil size={13} /> Edit</> : m === 'preview' ? <><Eye size={13} /> Preview</> : m[0].toUpperCase() + m.slice(1)}</button>)}
      </div>

      {mode2 === 'preview' && <iframe title="Preview" sandbox="" srcDoc={preview} className="h-[520px] w-full rounded-xl border" style={{ borderColor: 'var(--line)', background: '#fff' }} />}
      {mode2 === 'markdown' && <pre className="mono max-h-[520px] overflow-auto whitespace-pre-wrap rounded-xl border p-3 text-xs" style={{ borderColor: 'var(--line)' }}>{toMarkdown(a.doc)}</pre>}
      {mode2 === 'edit' && (
        <div className="space-y-3">
          <input className="input text-lg font-bold" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} aria-label="Title" />
          {doc.blocks.map((b, i) => <div key={i}><span className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{b.type}</span><BlockEditor b={b} set={(nb) => setDoc({ ...doc, blocks: doc.blocks.map((x, j) => (j === i ? nb : x)) })} /></div>)}
          <div className="flex gap-2">
            <button className="btn primary" onClick={() => act(() => p!.edit(a.id, doc, actor), 'Saved as a new version. Status returned to DRAFT.')}><Save size={14} /> Save new version</button>
            <button className="btn" onClick={() => setDoc(a.doc)}>Discard changes</button>
          </div>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Your edits are recorded as a learning proposal. They never change the Brain until a human ratifies them.</p>
        </div>
      )}
      {mode2 === 'history' && <ul className="space-y-1 text-sm">{hist.map((h, i) => <li key={i}><Badge tone={statusTone(h.status)}>{h.status}</Badge> v{h.version} · {new Date(h.at).toLocaleString('en-ZA')} · <span className="mono text-[11px]">{String((h as unknown as { hash: string }).hash).slice(0, 12)}</span></li>)}</ul>}
      {mode2 === 'ledger' && <ul className="space-y-1 text-sm">{ledger.map((e) => <li key={e.seq}><span className="mono text-[11px]">#{e.seq}</span> {e.action} · {e.actor} · <span className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{e.hash.slice(0, 10)}</span></li>)}</ul>}

      <Card title="Download">
        <div className="flex flex-wrap gap-2">
          {a.formats.map((f) => <button key={f} className="btn" onClick={() => downloadDoc(a.doc, f as never)}><Download size={14} /> {FORMAT_LABEL[f as never]}</button>)}
        </div>
        <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>PDF opens your print dialog; choose “Save as PDF”. Every download is the version shown above.</p>
      </Card>

      <Card title="Human decision">
        <div className="space-y-2">
          <p className="text-sm">Signed in as <b>{actor.name}</b> ({actor.roles[0]}). {agent?.secondApprover ? 'This agent requires a different person to approve.' : ''}</p>
          <input className="input" placeholder="Reason / note (required to reject)" value={note} onChange={(e) => setNote(e.target.value)} />
          <div className="flex flex-wrap gap-2">
            <button className="btn" disabled={a.status !== 'DRAFT'} onClick={() => act(() => p!.submitForReview(a.id, actor), 'Submitted for review.')}><Send size={14} /> Submit for review</button>
            <button className="btn ok" disabled={a.status !== 'IN_REVIEW'} onClick={() => act(() => p!.decide(a.id, actor, 'APPROVED', note, agent), 'Approved.')}><CheckCircle2 size={14} /> Approve</button>
            <button className="btn danger" disabled={a.status !== 'IN_REVIEW'} onClick={() => act(() => p!.decide(a.id, actor, 'REJECTED', note, agent), 'Rejected.')}><XCircle size={14} /> Reject</button>
          </div>
          {msg && <div role="status" className="rounded-lg border p-2 text-sm" style={{ borderColor: msg.tone === 'ok' ? 'var(--emerald)' : 'var(--rose)' }}>{msg.text}</div>}
        </div>
      </Card>

      {canPublish && (
        <Card title="Send to the ecosystem repository">
          <p className="text-sm">Opens an <b>issue</b> on the ecosystem repo with the ecosystem’s own rules checklist. It never pushes code.</p>
          <div className="mt-2 flex gap-2">
            <button className="btn" onClick={() => { const pr = proposalFromArtefact(a, toMarkdown(a.doc)); download('ecosystem-issue.md', `# ${pr.title}\n\n${pr.body}\n`, 'text/markdown'); }}><Download size={14} /> Download issue text</button>
            <button className="btn primary" disabled={mode !== 'server' || !health?.ecosystemWrites} title={!health?.ecosystemWrites ? 'Disabled: OPS_ALLOW_ECOSYSTEM_WRITES is not true on the server' : ''} onClick={() => act(async () => { const r = await fetch('/api/connector/publish', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ artefactId: a.id, summary: toMarkdown(a.doc) }) }); const j = await r.json(); if (!r.ok) throw new Error(j.error); setMsg({ tone: 'ok', text: `Issue opened: ${j.url}` }); }, 'Published.')}><UploadCloud size={14} /> Open issue on GitHub</button>
          </div>
        </Card>
      )}
    </div>
  );
}

export function Studio({ id }: { id?: string }) {
  const { p, go, tick } = useOps();
  const list = useMemo(() => p?.artefacts() ?? [], [p, tick]);
  const [filter, setFilter] = useState('ALL');
  const sel = list.find((a) => a.id === id);
  const shown = list.filter((a) => filter === 'ALL' || a.status === filter);
  void AGENTS; void FilePlus2;
  return (
    <div className="grid gap-4 lg:grid-cols-[320px_1fr]">
      <Card title="Artefacts" right={<select className="select !w-auto" value={filter} onChange={(e) => setFilter(e.target.value)} aria-label="Filter by status">{['ALL', 'DRAFT', 'IN_REVIEW', 'APPROVED', 'REJECTED'].map((s) => <option key={s}>{s}</option>)}</select>}>
        <ul className="max-h-[70vh] space-y-1 overflow-auto">
          {shown.map((a) => <li key={a.id}><button className="w-full rounded-lg border p-2 text-left" style={{ borderColor: a.id === id ? 'var(--violet)' : 'var(--line)' }} onClick={() => go({ name: 'studio', id: a.id })}><div className="text-sm font-semibold">{a.title}</div><div className="mt-1 flex gap-1.5"><Badge tone={statusTone(a.status)}>{a.status.replace('_', ' ')}</Badge><Badge>v{a.version}</Badge></div><div className="mono mt-1 text-[10.5px]" style={{ color: 'var(--muted)' }}>{a.agentId} · {new Date(a.at).toLocaleString('en-ZA')}</div></button></li>)}
          {!shown.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Nothing here yet. Open a department and draft something.</li>}
        </ul>
      </Card>
      <div>{sel ? <ArtefactPanel a={sel} /> : <Card><p>Select an artefact to preview, edit, approve, store and download it.</p></Card>}</div>
    </div>
  );
}
