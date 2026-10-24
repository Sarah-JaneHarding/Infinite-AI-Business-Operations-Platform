import { useEffect, useMemo, useState } from 'react';
import { Plus, Trash2, Download } from 'lucide-react';
import { useOps } from './store';
import { Badge, Card, download } from './primitives';
import { snapshot } from '../connector/snapshot';
import { snapshotFacts } from '../connector/snapshot';
import { toCsv } from '../core/artefacts/render';
import { newId } from '../core/crypto';
import type { Widget } from '../departments/types';
import type { Doc } from '../core/types';

type Row = { id: string; deleted?: boolean } & Record<string, string | number | boolean | undefined>;

function StatsW({ w }: { w: Extract<Widget, { type: 'stats' }> }) {
  const { live } = useOps();
  const stats = w.stats({ ...snapshotFacts(), ...(live?.facts ?? {}) });
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
      {stats.map((s) => (
        <div key={s.label} className="rounded-xl border p-3" style={{ borderColor: 'var(--line)' }}>
          <div className="mono text-xl font-bold" style={{ color: s.tone === 'warn' ? 'var(--amber)' : 'var(--violet)' }}>{s.value}</div>
          <div className="text-xs" style={{ color: 'var(--muted)' }}>{s.label}</div>
          <div className="mono text-[10px]" style={{ color: 'var(--muted)' }}>src: {s.source}</div>
        </div>
      ))}
    </div>
  );
}

function CalcW({ w }: { w: Extract<Widget, { type: 'calc' }> }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const filled = w.inputs.every((i) => vals[i.key] !== undefined && vals[i.key] !== '');
  const nums = Object.fromEntries(w.inputs.map((i) => [i.key, Number((vals[i.key] ?? '').replace(/[\s,]/g, ''))]));
  const out = filled && Object.values(nums).every(Number.isFinite) ? w.compute(nums) : null;
  return (
    <div>
      <div className="grid gap-2 sm:grid-cols-2">
        {w.inputs.map((i) => (
          <label key={i.key} className="text-xs">
            {i.label} {i.unit && <span className="mono">({i.unit})</span>}
            <input className="input mt-1" inputMode="decimal" value={vals[i.key] ?? ''} onChange={(e) => setVals({ ...vals, [i.key]: e.target.value })} />
          </label>
        ))}
      </div>
      <div className="mt-3 space-y-1">
        {out ? out.map((o) => (
          <div key={o.label} className="flex items-baseline justify-between rounded-lg border px-3 py-2" style={{ borderColor: 'var(--line)' }}>
            <div><b>{o.label}</b> <span className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{o.formula}</span></div>
            <div className="mono text-lg font-bold" style={{ color: 'var(--violet)' }}>{o.value === null ? 'n/a' : `${Math.round(o.value * 100) / 100} ${o.unit === 'currency' ? '' : o.unit}`}</div>
          </div>
        )) : <p className="text-xs" style={{ color: 'var(--muted)' }}>Enter every value to calculate. Nothing is pre-filled.</p>}
      </div>
    </div>
  );
}

function useRows(collection: string) {
  const { p, tick, bump, actor } = useOps();
  const rows = useMemo(() => (p ? (p.warehouse.latest<Row>(collection, 'id').filter((r) => !r.deleted)) : []), [p, collection, tick]);
  const save = async (r: Row) => { await p!.warehouse.put(collection, { ...r, updatedBy: actor.id, at: new Date().toISOString() } as never); bump(); };
  return { rows, save };
}

function TrackerW({ w }: { w: Extract<Widget, { type: 'tracker' }> }) {
  const { rows, save } = useRows(w.collection);
  const add = () => save({ id: newId('row'), ...Object.fromEntries(w.columns.map((c) => [c.key, c.kind === 'select' ? c.options![0] : ''])) });
  const doc: Doc = { title: w.title, blocks: [{ type: 'table', headers: w.columns.map((c) => c.label), rows: rows.map((r) => w.columns.map((c) => (r[c.key] ?? '') as string | number)) }], meta: {} };
  return (
    <div>
      {w.note && <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{w.note}</p>}
      <div className="overflow-x-auto">
        <table className="t">
          <thead><tr>{w.columns.map((c) => <th key={c.key}>{c.label}</th>)}<th /></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                {w.columns.map((c) => (
                  <td key={c.key}>
                    {c.kind === 'select' ? (
                      <select className="select" value={String(r[c.key] ?? '')} onChange={(e) => save({ ...r, [c.key]: e.target.value })}>{c.options!.map((o) => <option key={o}>{o}</option>)}</select>
                    ) : (
                      <input className="input" type={c.kind === 'date' ? 'date' : 'text'} inputMode={c.kind === 'number' ? 'decimal' : undefined} defaultValue={String(r[c.key] ?? '')} onBlur={(e) => e.target.value !== String(r[c.key] ?? '') && save({ ...r, [c.key]: c.kind === 'number' && e.target.value !== '' && Number.isFinite(Number(e.target.value)) ? Number(e.target.value) : e.target.value })} />
                    )}
                  </td>
                ))}
                <td><button className="btn" aria-label="Remove row" onClick={() => save({ ...r, deleted: true })}><Trash2 size={14} /></button></td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={w.columns.length + 1} style={{ color: 'var(--muted)' }}>No rows yet.</td></tr>}
          </tbody>
        </table>
      </div>
      <div className="mt-2 flex gap-2">
        <button className="btn primary" onClick={add}><Plus size={14} /> Add row</button>
        <button className="btn" disabled={!rows.length} onClick={() => download(`${w.collection}.csv`, toCsv(doc), 'text/csv')}><Download size={14} /> CSV</button>
      </div>
      <p className="mono mt-2 text-[10.5px]" style={{ color: 'var(--muted)' }}>Stored in the warehouse collection “{w.collection}”. Edits append new versions; removals are tombstones.</p>
    </div>
  );
}

function ChecklistW({ w }: { w: Extract<Widget, { type: 'checklist' }> }) {
  const { rows, save } = useRows(w.collection);
  const state = new Map(rows.map((r) => [r.id, r]));
  return (
    <ul className="space-y-1.5">
      {w.items.map((it, i) => {
        const id = `item-${i}`;
        const r = state.get(id);
        return (
          <li key={id}>
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={Boolean(r?.done)} onChange={(e) => save({ id, done: e.target.checked, label: it })} />
              <span style={{ textDecoration: r?.done ? 'line-through' : 'none', opacity: r?.done ? 0.65 : 1 }}>{it}</span>
            </label>
          </li>
        );
      })}
    </ul>
  );
}

function LiveW({ w }: { w: Extract<Widget, { type: 'live' }> }) {
  const { live, liveError, refreshLive, mode } = useOps();
  const s = live?.status;
  const none = (txt: string) => <p className="text-sm" style={{ color: 'var(--muted)' }}>{txt}</p>;
  if (w.source === 'roster') {
    return <table className="t"><thead><tr><th>Module</th><th>Contracts</th></tr></thead><tbody>{Object.entries(snapshot.agents.byModule).map(([m, n]) => <tr key={m}><td className="mono">{m}</td><td>{n}</td></tr>)}</tbody></table>;
  }
  if (w.source === 'runbooks') return <ul className="list-disc pl-5 text-sm">{snapshot.docs.runbooks.map((r) => <li key={r} className="mono">{r}</li>)}</ul>;
  if (w.source === 'stages') return <ul className="space-y-1 text-sm">{[...snapshot.stages.latest].reverse().map((st) => <li key={st.n}><Badge>Stage {st.n}</Badge> {st.title}</li>)}<li className="mono text-[11px]" style={{ color: 'var(--muted)' }}>snapshot @ {snapshot.repo.head}</li></ul>;
  if (w.source === 'oq') {
    return <ul className="max-h-64 space-y-1 overflow-auto text-sm">{snapshot.openQuestions.openList.map((q) => <li key={q.id}><Badge tone="draft">{q.id}</Badge> <span style={{ color: 'var(--muted)' }}>{q.status}</span> {q.title}</li>)}</ul>;
  }
  if (mode !== 'server') return none('Live GitHub data needs the server (npm run dev). Showing the committed snapshot elsewhere.');
  if (!s) return <div>{liveError ? none(`Connector: ${liveError}`) : none('Loading…')}<button className="btn mt-2" onClick={refreshLive}>Retry</button></div>;
  if (w.source === 'pulls') return s.openPulls.length ? <ul className="space-y-1 text-sm">{s.openPulls.map((pr) => <li key={pr.number}><Badge tone={pr.draft ? 'draft' : 'info'}>#{pr.number}</Badge> {pr.title}</li>)}</ul> : none('No open pull requests.');
  if (w.source === 'ci') return s.ci.length ? <ul className="space-y-1 text-sm">{s.ci.map((r, i) => <li key={i}><Badge tone={r.conclusion === 'success' ? 'ok' : r.conclusion ? 'bad' : 'info'}>{r.conclusion ?? r.status}</Badge> {r.name} <a className="mono text-[11px] underline" href={r.url} target="_blank" rel="noreferrer">open</a></li>)}</ul> : none('No workflow runs returned (check token scope: Actions read).');
  return null;
}

export function WidgetCard({ w }: { w: Widget }) {
  const { tick } = useOps();
  void tick;
  const body = w.type === 'stats' ? <StatsW w={w} /> : w.type === 'calc' ? <CalcW w={w} /> : w.type === 'tracker' ? <TrackerW w={w} /> : w.type === 'checklist' ? <ChecklistW w={w} /> : <LiveW w={w} />;
  return (
    <Card title={w.title} right={<Badge>{w.type}</Badge>}>
      {w.note && w.type !== 'tracker' && <p className="mb-2 text-xs" style={{ color: 'var(--muted)' }}>{w.note}</p>}
      {body}
    </Card>
  );
}
