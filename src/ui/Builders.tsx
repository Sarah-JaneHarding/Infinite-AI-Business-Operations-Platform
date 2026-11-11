import { useEffect, useMemo, useState } from 'react';
import { useOps } from './store';
import { Badge, Card } from './primitives';
import { BlockEditor } from './Studio';
import { DEPARTMENTS } from '../departments';
import { TEMPLATES } from '../departments/templates';
import { ALL_PURPOSES, checkDef, deptName, keyOf, listDefs, newDefId, saveDef, type CSec, type CustomAgentDef, type CustomArtefactDef, type CustomDef, type CustomWidgetDef } from '../departments/custom';
import type { InputField } from '../core/agent';
import type { Col } from '../departments/types';
import type { Doc, Purpose } from '../core/types';
import { pending } from './nav';

type Kind = 'agent' | 'widget' | 'artefact';
const lines = (s: string) => s.split('\n').map((x) => x.trim()).filter(Boolean);
const now = () => new Date().toISOString();

function AgentForm({ dept, done }: { dept: string; done: (d: CustomAgentDef) => Promise<void> }) {
  const { actor } = useOps();
  const [name, setName] = useState(''); const [summary, setSummary] = useState(''); const [purpose, setPurpose] = useState<Purpose>('strategy_planning');
  const [inputs, setInputs] = useState('What is this about? | text | required\nDetails | longtext');
  const [secs, setSecs] = useState('Summary | input | what_is_this_about\nSteps | steps | Do the first thing\nDo the second thing\nChecks | checks | Facts checked\nWho approved it?');
  const parsed = useMemo(() => {
    const inp: InputField[] = lines(inputs).map((l) => { const [label, kind = 'text', ...rest] = l.split('|').map((x) => x.trim()); const k = (['text', 'longtext', 'number', 'select'].includes(kind) ? kind : 'text') as InputField['kind']; return { key: keyOf(label), label, kind: k, required: rest.includes('required'), options: k === 'select' ? rest.filter((x) => x !== 'required') : undefined }; });
    const out: CSec[] = []; let cur: CSec | null = null;
    for (const l of lines(secs)) {
      const m = l.split('|').map((x) => x.trim());
      if (m.length >= 2 && ['text', 'input', 'bullets', 'steps', 'checks', 'table'].includes(m[1])) {
        const [h, kind, ...rest] = m;
        cur = kind === 'text' ? { h, kind, text: rest.join(' | ') } : kind === 'input' ? { h, kind, ref: rest[0] ?? '' } : kind === 'table' ? { h, kind, headers: rest.length ? rest : ['Item', 'Notes'], blankRows: 3 } : { h, kind: kind as 'bullets', items: rest.filter(Boolean) };
        out.push(cur);
      } else if (cur && 'items' in cur) cur.items.push(l);
    }
    return { inp, out };
  }, [inputs, secs]);
  const draft: CustomAgentDef = { id: newDefId('agent'), kind: 'agent', dept, name, summary, purpose, inputs: parsed.inp, sections: parsed.out, by: actor.name, at: now() };
  const err = checkDef(draft);
  return (
    <div className="space-y-2">
      <input className="input" placeholder="Agent name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Agent name" />
      <input className="input" placeholder="What it drafts, in one line" value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Summary" />
      <label className="block text-xs">Purpose (what the data may be used for)<select className="select mt-1" value={purpose} onChange={(e) => setPurpose(e.target.value as Purpose)}>{ALL_PURPOSES.map((x) => <option key={x}>{x}</option>)}</select></label>
      <label className="block text-xs">Inputs, one per line: <span className="mono">label | text, longtext, number or select | required | options…</span><textarea className="textarea mt-1" rows={4} value={inputs} onChange={(e) => setInputs(e.target.value)} /></label>
      <label className="block text-xs">Sections, one per line: <span className="mono">heading | text, input, bullets, steps, checks or table | content</span>. For input, give the input’s key. Extra lines add list items.<textarea className="textarea mt-1" rows={6} value={secs} onChange={(e) => setSecs(e.target.value)} /></label>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>Input keys: {parsed.inp.map((i) => i.key).join(', ') || 'none yet'}. Figures in your fixed text need a source tag or they are marked [UNSOURCED]. Custom agents always need a human decision and a second approver.</p>
      {err && name && <p role="alert" className="text-xs" style={{ color: 'var(--rose)' }}>{err}</p>}
      <button className="btn primary" disabled={Boolean(err)} onClick={() => done(draft)}>Save agent</button>
    </div>
  );
}

function WidgetForm({ dept, done }: { dept: string; done: (d: CustomWidgetDef) => Promise<void> }) {
  const { actor } = useOps();
  const [wtype, setW] = useState<CustomWidgetDef['wtype']>('checklist'); const [title, setTitle] = useState(''); const [body, setBody] = useState('');
  const [calcOut, setCalcOut] = useState('');
  const base = { id: newDefId('widget'), kind: 'widget' as const, dept, title, wtype, by: actor.name, at: now() };
  const draft: CustomWidgetDef = wtype === 'checklist' ? { ...base, items: lines(body) }
    : wtype === 'tracker' ? { ...base, columns: lines(body).map((l): Col => { const [label, kind = 'text', ...opts] = l.split('|').map((x) => x.trim()); const k = (['text', 'number', 'date', 'select'].includes(kind) ? kind : 'text') as Col['kind']; return { key: keyOf(label), label, kind: k, options: k === 'select' ? opts : undefined }; }) }
      : { ...base, inputs: lines(body).map((l) => { const m = /^(.*?)(?:\s*\((.*)\))?$/.exec(l)!; return { key: keyOf(m[1]), label: m[1], unit: m[2] }; }), outputs: lines(calcOut).map((l) => { const [lab, rest = ''] = l.split('='); const [expr, unit = ''] = rest.split('|'); return { label: lab.trim(), expr: expr.trim(), unit: unit.trim() }; }) };
  const err = checkDef(draft);
  return (
    <div className="space-y-2">
      <select className="select" value={wtype} onChange={(e) => setW(e.target.value as typeof wtype)} aria-label="Widget type"><option value="checklist">Checklist</option><option value="tracker">Tracker (table you add rows to)</option><option value="calc">Calculator</option></select>
      <input className="input" placeholder="Widget title" value={title} onChange={(e) => setTitle(e.target.value)} aria-label="Widget title" />
      <textarea className="textarea" rows={5} value={body} onChange={(e) => setBody(e.target.value)} placeholder={wtype === 'checklist' ? 'One item per line' : wtype === 'tracker' ? 'One column per line: Label | text, number, date or select | options…' : 'One input per line, e.g. Revenue (R)'} aria-label="Widget definition" />
      {wtype === 'calc' && <><textarea className="textarea" rows={3} value={calcOut} onChange={(e) => setCalcOut(e.target.value)} placeholder="One result per line: Label = formula | unit   e.g. Margin = (revenue - cost) / revenue * 100 | %" aria-label="Results" /><p className="text-xs" style={{ color: 'var(--muted)' }}>Formulas use input keys ({draft.inputs?.map((i) => i.key).join(', ') || 'none yet'}), numbers, + - * / and brackets. Nothing is pre-filled and a result shows n/a rather than a wrong number.</p></>}
      {err && title && <p role="alert" className="text-xs" style={{ color: 'var(--rose)' }}>{err}</p>}
      <button className="btn primary" disabled={Boolean(err)} onClick={() => done(draft)}>Save widget</button>
    </div>
  );
}

function ArtefactForm({ dept, done }: { dept: string; done: (d: CustomArtefactDef) => Promise<void> }) {
  const { actor } = useOps();
  const [doc, setDoc] = useState<Doc>({ title: '', blocks: [{ type: 'h', level: 2, text: 'Heading' }, { type: 'p', text: '' }], meta: {} });
  const [summary, setSummary] = useState('');
  const draft: CustomArtefactDef = { id: newDefId('artefact'), kind: 'artefact', dept, title: doc.title, summary, doc, by: actor.name, at: now() };
  const err = checkDef(draft);
  return (
    <div className="space-y-2">
      <select className="select" defaultValue="" onChange={(e) => { const t = TEMPLATES.find((x) => x.id === e.target.value); if (t) setDoc(structuredClone(t.doc)); }} aria-label="Start from a template"><option value="">Start blank, or copy a template…</option>{TEMPLATES.map((t) => <option key={t.id} value={t.id}>{t.title}</option>)}</select>
      <input className="input font-bold" placeholder="Template title" value={doc.title} onChange={(e) => setDoc({ ...doc, title: e.target.value })} aria-label="Template title" />
      <input className="input" placeholder="What it is for" value={summary} onChange={(e) => setSummary(e.target.value)} aria-label="Summary" />
      {doc.blocks.map((b, i) => <div key={i}><div className="flex justify-between"><span className="mono text-[10px]" style={{ color: 'var(--muted)' }}>{b.type}</span><button className="btn !py-0 text-xs" onClick={() => setDoc({ ...doc, blocks: doc.blocks.filter((_, j) => j !== i) })}>remove</button></div><BlockEditor b={b} set={(nb) => setDoc({ ...doc, blocks: doc.blocks.map((x, j) => (j === i ? nb : x)) })} /></div>)}
      <div className="flex flex-wrap gap-1">{(['h', 'p', 'ul', 'table', 'checklist'] as const).map((t) => <button key={t} className="btn text-xs" onClick={() => setDoc({ ...doc, blocks: [...doc.blocks, t === 'h' ? { type: 'h', level: 2, text: '' } : t === 'p' ? { type: 'p', text: '' } : t === 'ul' ? { type: 'ul', items: [''] } : t === 'table' ? { type: 'table', headers: ['A', 'B'], rows: [['', '']] } : { type: 'checklist', checks: [{ label: '', done: false }] }] })}>+ {t}</button>)}</div>
      {err && doc.title && <p role="alert" className="text-xs" style={{ color: 'var(--rose)' }}>{err}</p>}
      <button className="btn primary" disabled={Boolean(err)} onClick={() => done(draft)}>Save artefact template</button>
    </div>
  );
}

export function Builders() {
  const { p, tick, bump } = useOps();
  const [kind, setKind] = useState<Kind>('agent');
  const [dept, setDept] = useState('executive');
  const [msg, setMsg] = useState('');
  useEffect(() => { if (pending.builder) { setKind(pending.builder); if (pending.dept) setDept(pending.dept); pending.builder = undefined; } }, []);
  const defs = useMemo(() => listDefs(p!.warehouse), [p, tick]);
  const save = async (d: CustomDef) => { try { await saveDef(p!.warehouse, d); bump(); setMsg(`Saved. It now appears in ${deptName(d.dept)}${d.kind === 'artefact' ? ' and the template library' : ''}.`); } catch (e) { setMsg((e as Error).message); } };
  const remove = async (d: CustomDef) => { await p!.warehouse.put('custom_defs', { ...d, deleted: true, at: now() } as never); bump(); };
  const title = (d: CustomDef) => (d.kind === 'agent' ? d.name : d.title);
  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_340px]">
      <Card title="Builders" right={<select className="select !w-auto" value={dept} onChange={(e) => setDept(e.target.value)} aria-label="Department">{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>}>
        <div role="tablist" className="mb-3 flex gap-1">{(['agent', 'widget', 'artefact'] as Kind[]).map((k) => <button key={k} role="tab" aria-selected={kind === k} className={`btn ${kind === k ? 'primary' : ''}`} onClick={() => { setKind(k); setMsg(''); }}>{k[0].toUpperCase() + k.slice(1)} builder</button>)}</div>
        {kind === 'agent' && <AgentForm dept={dept} done={save as never} />}
        {kind === 'widget' && <WidgetForm dept={dept} done={save as never} />}
        {kind === 'artefact' && <ArtefactForm dept={dept} done={save as never} />}
        {msg && <div role="status" className="mt-3 rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--line)' }}>{msg}</div>}
      </Card>
      <Card title={`Your definitions (${defs.length})`}>
        <ul className="space-y-1">{defs.map((d) => <li key={d.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--line)' }}><span><b>{title(d)}</b><br /><Badge>{d.kind}</Badge> <span className="text-xs">{deptName(d.dept)}</span></span><button className="btn danger text-xs" onClick={() => remove(d)}>Remove</button></li>)}{!defs.length && <li className="text-sm" style={{ color: 'var(--muted)' }}>Nothing yet.</li>}</ul>
      </Card>
    </div>
  );
}
