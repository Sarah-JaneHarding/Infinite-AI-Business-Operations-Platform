import { useRef, useState } from 'react';
import { Check, Copy, RefreshCw, Sparkles } from 'lucide-react';
import { apiFetch } from '../core/api';
import { Badge, Card } from './primitives';
import { blanksOf, failPanelState, generatedWithLabel, initialPanelState, nextPanelState, requestRound, startLoading, type DocSuggestions } from '../core/suggest';
import type { Doc } from '../core/types';

/**
 * Suggested inputs and prompts for the document on screen. Apply only edits the draft the person is looking at (`onApply`);
 * they still save, submit and sign. Refresh asks for the next round and sends back every text shown, so it brings new ones.
 */
export function SuggestPanel({ doc, onApply }: { doc: Doc; onApply: (blank: string, value: string) => void }) {
  const [s, setS] = useState(initialPanelState);
  const [note, setNote] = useState('');
  const latest = useRef(s);
  latest.current = s;
  const open = new Set(blanksOf(doc));

  const refresh = async () => {
    const cur = latest.current;
    if (cur.loading) return;
    setS(startLoading(cur));
    setNote('');
    try {
      const res = await apiFetch('/api/ai/document-suggestions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ doc, round: requestRound(cur), exclude: cur.seen }) });
      const body = (await res.json().catch(() => ({}))) as Partial<DocSuggestions> & { error?: string };
      if (!res.ok) throw new Error(body.error ?? `HTTP ${res.status}`);
      setS((prev) => nextPanelState(prev, body as DocSuggestions));
    } catch (e) {
      setS((prev) => failPanelState(prev, `Could not get suggestions: ${(e as Error).message}`));
    }
  };
  const copy = async (text: string) => {
    try { await navigator.clipboard.writeText(text); setNote('Copied.'); } catch { setNote('Copy is not available here; select the text instead.'); }
  };
  const first = !s.seen.length;

  return (
    <Card title={<span className="flex items-center gap-2"><Sparkles size={15} /> Suggestions</span>} right={
      <button type="button" className="btn primary" onClick={refresh} disabled={s.loading}>
        <RefreshCw size={13} className={s.loading ? 'animate-spin' : ''} /> {s.loading ? 'Working…' : first ? 'Get suggestions' : 'Refresh suggestions'}
      </button>
    }>
      <div className="space-y-3">
        <p className="text-xs" style={{ color: 'var(--muted)' }}>Drafts to read and edit. Nothing is saved or signed until you do it yourself. Personal details are removed before anything is sent to a model.</p>
        {s.error && <div role="alert" className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--rose)' }}>{s.error}</div>}
        <div role="status" aria-live="polite" className="text-xs" style={{ color: 'var(--muted)' }}>
          {s.generatedWith && !s.error && <>Made by: <b>{generatedWithLabel(s.generatedWith, s.flags)}</b> · draft{s.flags.includes('pool_cycled') ? ' · started repeating from the beginning' : ''}</>}
          {note && <span className="ml-2">{note}</span>}
        </div>
        {first && !s.error && !s.loading && <p className="text-sm">{open.size ? `This document has ${open.size} blank${open.size === 1 ? '' : 's'} to fill. ` : ''}Choose Get suggestions.</p>}
        {s.inputs.length > 0 && (
          <section aria-labelledby="sg-inputs">
            <h3 id="sg-inputs" className="mb-1 text-sm font-semibold">Suggested inputs</h3>
            <ul className="space-y-1">
              {s.inputs.map((i) => (
                <li key={i.blank + i.value} className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex flex-wrap items-center gap-2"><span className="font-semibold">{i.blank}</span>{i.isNew && <Badge tone="info">New</Badge>}</div>
                  <div className="mt-1">{i.value}</div>
                  {i.why && <div className="text-xs" style={{ color: 'var(--muted)' }}>{i.why}</div>}
                  <button type="button" className="btn mt-1 !py-0 text-xs" disabled={!open.has(i.blank)} title={open.has(i.blank) ? '' : 'This blank is already filled or no longer in the document'} onClick={() => onApply(i.blank, i.value)} aria-label={`Apply to ${i.blank}`}><Check size={12} /> Apply</button>
                </li>
              ))}
            </ul>
          </section>
        )}
        {s.prompts.length > 0 && (
          <section aria-labelledby="sg-prompts">
            <h3 id="sg-prompts" className="mb-1 text-sm font-semibold">Suggested prompts</h3>
            <ul className="space-y-1">
              {s.prompts.map((p) => (
                <li key={p.text} className="rounded-lg border p-2 text-sm" style={{ borderColor: 'var(--line)' }}>
                  <div className="flex flex-wrap items-center gap-2">{p.isNew && <Badge tone="info">New</Badge>}<span>{p.text}</span></div>
                  {p.why && <div className="text-xs" style={{ color: 'var(--muted)' }}>{p.why}</div>}
                  <button type="button" className="btn mt-1 !py-0 text-xs" onClick={() => void copy(p.text)}><Copy size={12} /> Copy</button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </Card>
  );
}
