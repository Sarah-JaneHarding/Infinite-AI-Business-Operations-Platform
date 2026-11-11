import { useMemo, useRef, useState } from 'react';
import { Download, FilePlus2, Trash2, Upload } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, download } from './primitives';
import { BlockEditor } from './Studio';
import { ExportBar } from './ExportBar';
import { toHtml } from '../core/artefacts/render';
import { listDocuments, loadOriginal, MAX_UPLOAD_BYTES, newDocId, saveRecord, uploadFile, UploadRefused, type DocRecord } from '../core/documents';
import { TEMPLATES, templateById, type Template } from '../departments/templates';
import type { Doc } from '../core/types';

const blankDoc = (): Doc => ({ title: 'Untitled document', blocks: [{ type: 'h', level: 2, text: 'Heading' }, { type: 'p', text: '' }], meta: {} });
const ADD: Record<string, () => Doc['blocks'][number]> = {
  Heading: () => ({ type: 'h', level: 2, text: '' }), Paragraph: () => ({ type: 'p', text: '' }), 'Bullet list': () => ({ type: 'ul', items: [''] }), 'Numbered list': () => ({ type: 'ol', items: [''] }),
  Table: () => ({ type: 'table', headers: ['Column 1', 'Column 2'], rows: [['', '']] }), 'Key / value': () => ({ type: 'kv', pairs: [['', '']] }), Checklist: () => ({ type: 'checklist', checks: [{ label: '', done: false }] }), Note: () => ({ type: 'callout', tone: 'info', text: '' }),
};

export function Library() {
  const { p, actor, tick, bump } = useOps();
  const store = p!.warehouse;
  const docs = useMemo(() => listDocuments(store), [store, tick]);
  const [sel, setSel] = useState<string | null>(null);
  const [draft, setDraft] = useState<Doc | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string }[]>([]);
  const [group, setGroup] = useState<'all' | 'business' | 'customer'>('all');
  const file = useRef<HTMLInputElement>(null);
  const rec = docs.find((d) => d.id === sel);
  const say = (tone: 'ok' | 'bad', text: string) => setMsg((m) => [{ tone, text }, ...m].slice(0, 6));

  const open = (d: DocRecord) => { setSel(d.id); setDraft(d.doc ? structuredClone(d.doc) : null); };
  const create = async (doc: Doc, origin: DocRecord['origin'], dept?: string) => {
    const r = await saveRecord(store, { id: newDocId(), title: doc.title, origin, doc, scan: { scanned: true, notes: [] }, dept, by: actor.name, at: new Date().toISOString() });
    bump(); setSel(r.id); setDraft(structuredClone(doc));
  };
  const onFiles = async (fl: FileList | null) => {
    for (const f of Array.from(fl ?? [])) {
      try {
        const r = await uploadFile(store, { name: f.name, type: f.type, bytes: new Uint8Array(await f.arrayBuffer()) }, actor.name);
        say('ok', `${f.name}: stored.${r.scan.notes.length ? ' ' + r.scan.notes.join(' ') : ''}`);
        if (fl && fl.length === 1) open(r);
      } catch (e) { say('bad', `${f.name}: ${e instanceof UploadRefused ? e.message : (e as Error).message}`); }
    }
    bump();
    if (file.current) file.current.value = '';
  };
  const saveEdit = async () => { if (!rec || !draft) return; await saveRecord(store, { ...rec, title: draft.title, doc: draft, at: new Date().toISOString(), by: actor.name }); bump(); say('ok', 'Saved.'); };
  const remove = async () => { if (!rec) return; await saveRecord(store, { ...rec, deleted: true, at: new Date().toISOString() }); setSel(null); setDraft(null); bump(); };
  const tpls = TEMPLATES.filter((t) => group === 'all' || t.group === group);
  const useTpl = (t: Template) => create(structuredClone(t.doc), 'template', t.dept);

  return (
    <div className="grid gap-4 lg:grid-cols-[340px_1fr]">
      <div className="space-y-4">
        <Card title="Add documents">
          <div className="space-y-2">
            <input ref={file} type="file" multiple className="hidden" onChange={(e) => onFiles(e.target.files)} aria-label="Upload documents" />
            <button className="btn primary w-full" onClick={() => file.current?.click()}><Upload size={14} /> Upload (any format)</button>
            <button className="btn w-full" onClick={() => create(blankDoc(), 'created')}><FilePlus2 size={14} /> New blank document</button>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Up to {MAX_UPLOAD_BYTES / 1024 / 1024} MB each. Word, Excel, Markdown, CSV, JSON, HTML and text are read and can be edited. PDFs, images and other files are stored as they are and cannot be previewed or scanned. Files containing learner details are refused.</p>
            {msg.map((m, i) => <div key={i} role="status" className="rounded-lg border p-2 text-xs" style={{ borderColor: m.tone === 'ok' ? 'var(--emerald)' : 'var(--rose)' }}>{m.text}</div>)}
          </div>
        </Card>
        <Card title={`Library (${docs.length})`}>
          <ul className="max-h-[40vh] space-y-1 overflow-auto">
            {docs.map((d) => <li key={d.id}><button className="w-full rounded-lg border p-2 text-left" style={{ borderColor: d.id === sel ? 'var(--violet)' : 'var(--line)' }} onClick={() => open(d)}><div className="text-sm font-semibold">{d.title}</div><div className="mt-1 flex gap-1.5"><Badge>{d.origin}</Badge>{d.kind && <Badge tone="info">{d.kind}</Badge>}</div></button></li>)}
            {!docs.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Nothing yet. Upload a file or start from a template.</li>}
          </ul>
        </Card>
      </div>
      <div className="space-y-4">
        {rec ? (
          <Card title={rec.title} right={<button className="btn danger" onClick={remove}><Trash2 size={13} /> Remove</button>}>
            <div className="space-y-3">
              {rec.scan.notes.length > 0 && <ul className="list-disc pl-5 text-xs">{rec.scan.notes.map((n, i) => <li key={i}>{n}</li>)}</ul>}
              {rec.chunks && <button className="btn" onClick={() => { const b = loadOriginal(store, rec.id); if (b) download(rec.name ?? rec.title, b, rec.mime ?? 'application/octet-stream'); }}><Download size={14} /> Download original{rec.name ? ` (${rec.name})` : ''}</button>}
              {draft ? (
                <>
                  <input className="input text-lg font-bold" value={draft.title} onChange={(e) => setDraft({ ...draft, title: e.target.value })} aria-label="Title" />
                  {draft.blocks.map((b, i) => (
                    <div key={i}>
                      <div className="flex items-center justify-between"><span className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{b.type}</span><button className="btn !py-0 text-xs" onClick={() => setDraft({ ...draft, blocks: draft.blocks.filter((_, j) => j !== i) })}>remove block</button></div>
                      <BlockEditor b={b} set={(nb) => setDraft({ ...draft, blocks: draft.blocks.map((x, j) => (j === i ? nb : x)) })} />
                    </div>
                  ))}
                  <div className="flex flex-wrap gap-1">{Object.keys(ADD).map((k) => <button key={k} className="btn text-xs" onClick={() => setDraft({ ...draft, blocks: [...draft.blocks, ADD[k]()] })}>+ {k}</button>)}</div>
                  <div className="flex gap-2"><button className="btn primary" onClick={saveEdit}>Save changes</button><button className="btn" onClick={() => setDraft(rec.doc ? structuredClone(rec.doc) : null)}>Discard</button></div>
                  <ExportBar doc={draft} onSave={async () => { await create({ ...structuredClone(draft), title: draft.title + ' (copy)' }, 'saved', rec.dept); say('ok', 'Copy saved.'); }} />
                  <details><summary className="cursor-pointer text-xs">Preview</summary><iframe title="Preview" sandbox="" srcDoc={toHtml(draft)} className="mt-2 h-[420px] w-full rounded-xl border" style={{ borderColor: 'var(--line)', background: '#fff' }} /></details>
                </>
              ) : <p className="text-sm">This file is stored as uploaded. It can be downloaded but not edited here.</p>}
            </div>
          </Card>
        ) : <Card><p>Select a document to edit it, or start from a template below.</p></Card>}
        <Card title="Templates" right={<select className="select !w-auto" value={group} onChange={(e) => setGroup(e.target.value as typeof group)} aria-label="Template group"><option value="all">All</option><option value="business">Business</option><option value="customer">Customer</option></select>}>
          <ul className="grid gap-2 md:grid-cols-2">
            {tpls.map((t) => <li key={t.id} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}><div className="text-sm font-semibold">{t.title}</div><div className="text-xs" style={{ color: 'var(--muted)' }}>{t.summary}</div>{t.review && <div className="mt-1 text-[11px]"><Badge tone="draft">needs review</Badge> {t.review}</div>}<button className="btn mt-2" onClick={() => useTpl(t)}>Use this template</button></li>)}
          </ul>
        </Card>
      </div>
    </div>
  );
}
void templateById;
