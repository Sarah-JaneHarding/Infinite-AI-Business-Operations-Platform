import type { Block, Doc } from './types';

/**
 * Suggestions for the inputs (blanks) and prompts of a document. Pure and shared: the server uses it for the built-in
 * fallback and for checking a model's reply, the browser for the panel's state. Nothing here writes anywhere.
 */
export interface Suggestion { text: string; why: string }
export interface InputSuggestion { blank: string; value: string; why: string }
export interface DocSuggestions {
  inputs: InputSuggestion[];
  prompts: Suggestion[];
  round: number;
  /** `provider:model`, or `deterministic-fallback`. */
  generatedWith: string;
  /** Always true: a suggestion is a draft for a person to read, edit and use. */
  draft: true;
  flags: string[];
}

export const SUGGEST_LIMITS = { docChars: 8_000, blanks: 20, excludeSent: 40, excludeChars: 160, maxInputs: 8, promptsPerRound: 4, maxRound: 50, maxExclude: 200, maxExcludeChars: 500, maxDocJson: 200_000 } as const;

const norm = (s: string) => s.replace(/\s+/g, ' ').trim().toLowerCase();

/** Items whose normalised text is not among `seen` (case, surrounding and repeated space ignored). */
export function excludeSeen(items: readonly string[], seen: readonly string[]): string[] {
  const s = new Set(seen.map(norm));
  return items.filter((i) => !s.has(norm(i)));
}

export const textsOf = (r: { inputs: readonly { value: string }[]; prompts: readonly { text: string }[] }): string[] => [...r.inputs.map((i) => i.value), ...r.prompts.map((p) => p.text)];

// ------------------------------------------------------------------ the document

const FILL = /\[Fill in:\s*([^\]]*?)\s*\]/g;
const labelsIn = (s: string) => [...s.matchAll(FILL)].map((m) => m[1]!.trim()).filter(Boolean);
const cellText = (c: string | number | undefined) => String(c ?? '');

/** Every `[Fill in: …]` placeholder and every empty key/value value or table cell, labelled by its placeholder text, key or header; document order, no repeats. */
export function blanksOf(doc: Doc): string[] {
  const out: string[] = [];
  const add = (l: string) => { if (!out.includes(l)) out.push(l); };
  for (const b of doc.blocks ?? []) {
    for (const s of [b.text, ...(b.items ?? []), ...(b.checks ?? []).map((c) => c.label)]) for (const l of labelsIn(s ?? '')) add(l);
    for (const h of b.headers ?? []) for (const l of labelsIn(h)) add(l);
    for (const [k, v] of b.pairs ?? []) {
      for (const l of [...labelsIn(k), ...labelsIn(v)]) add(l);
      if (!v.trim() && k.trim()) add(k.trim());
    }
    for (const row of b.rows ?? []) row.forEach((c, ci) => {
      for (const l of labelsIn(cellText(c))) add(l);
      if (!cellText(c).trim()) add((b.headers?.[ci] ?? '').trim() || `Column ${ci + 1}`);
    });
  }
  return out;
}

/** Applies `f` to every string in a block, keeping its shape. */
function mapStrings(b: Block, f: (s: string) => string): Block {
  const n: Block = { ...b };
  if (b.text !== undefined) n.text = f(b.text);
  if (b.items) n.items = b.items.map(f);
  if (b.headers) n.headers = b.headers.map(f);
  if (b.rows) n.rows = b.rows.map((r) => r.map((c) => (typeof c === 'string' ? f(c) : c)));
  if (b.pairs) n.pairs = b.pairs.map(([k, v]): [string, string] => [f(k), f(v)]);
  if (b.checks) n.checks = b.checks.map((c) => ({ ...c, label: f(c.label) }));
  return n;
}

/**
 * A copy of `doc` with one blank filled. A placeholder is replaced inside the text that holds it (first one only);
 * otherwise the first empty value or cell with that key or header is filled. Not found: the same document back. Never mutates.
 */
export function applyInput(doc: Doc, blank: string, value: string): Doc {
  const want = blank.trim();
  let done = false;
  const replace = (s: string) => {
    if (done) return s;
    for (const m of s.matchAll(FILL)) {
      if (m[1]!.trim() === want) { done = true; return s.slice(0, m.index) + value + s.slice(m.index! + m[0].length); }
    }
    return s;
  };
  const blocks = doc.blocks.map((b) => mapStrings(b, replace));
  if (!done) {
    for (const b of blocks) {
      if (b.pairs) {
        const i = b.pairs.findIndex(([k, v]) => k.trim() === want && !v.trim());
        if (i >= 0) { b.pairs = b.pairs.map((p, j): [string, string] => (j === i ? [p[0], value] : p)); done = true; }
      } else if (b.rows) {
        for (let ri = 0; ri < b.rows.length && !done; ri++) {
          const ci = b.rows[ri]!.findIndex((c, i) => !cellText(c).trim() && ((b.headers?.[i] ?? '').trim() || `Column ${i + 1}`) === want);
          if (ci >= 0) { b.rows = b.rows.map((r, i) => (i === ri ? r.map((c, j) => (j === ci ? value : c)) : r)); done = true; }
        }
      }
      if (done) break;
    }
  }
  return done ? { ...doc, blocks } : doc;
}

const BLOCK_TYPES = new Set(['h', 'p', 'ul', 'ol', 'table', 'kv', 'callout', 'checklist']);
const isStr = (x: unknown): x is string => typeof x === 'string';

/** Checks the shape of a document received over the wire. Null when it is not a Doc; otherwise a copy with `meta` defaulted. */
export function parseDoc(x: unknown): Doc | null {
  if (typeof x !== 'object' || x === null) return null;
  const d = x as Record<string, unknown>;
  if (!isStr(d.title) || !Array.isArray(d.blocks) || (d.subtitle !== undefined && !isStr(d.subtitle))) return null;
  if (d.meta !== undefined && (typeof d.meta !== 'object' || d.meta === null || Object.values(d.meta).some((v) => !isStr(v)))) return null;
  for (const b of d.blocks as unknown[]) {
    if (typeof b !== 'object' || b === null) return null;
    const k = b as Record<string, unknown>;
    if (!isStr(k.type) || !BLOCK_TYPES.has(k.type)) return null;
    if ((k.text !== undefined && !isStr(k.text)) || (k.level !== undefined && typeof k.level !== 'number')) return null;
    if ((k.items !== undefined && !(Array.isArray(k.items) && k.items.every(isStr))) || (k.headers !== undefined && !(Array.isArray(k.headers) && k.headers.every(isStr)))) return null;
    if (k.rows !== undefined && !(Array.isArray(k.rows) && k.rows.every((r) => Array.isArray(r) && r.every((c) => isStr(c) || typeof c === 'number')))) return null;
    if (k.pairs !== undefined && !(Array.isArray(k.pairs) && k.pairs.every((p) => Array.isArray(p) && p.length === 2 && isStr(p[0]) && isStr(p[1])))) return null;
    if (k.checks !== undefined && !(Array.isArray(k.checks) && k.checks.every((c) => typeof c === 'object' && c !== null && isStr((c as { label?: unknown }).label) && typeof (c as { done?: unknown }).done === 'boolean'))) return null;
  }
  return { title: d.title, subtitle: d.subtitle as string | undefined, blocks: d.blocks as Block[], meta: (d.meta as Record<string, string> | undefined) ?? {} };
}

/** The plain text of a document: title, subtitle and every block's strings, one per line. */
export function docText(doc: Doc): string {
  const lines = [doc.title, doc.subtitle ?? ''];
  for (const b of doc.blocks) {
    mapStrings(b, (s) => { lines.push(s); return s; });
  }
  return lines.filter((l) => l.trim()).join('\n');
}

/** A short noun for the kind of document, used in wording. */
export function docKind(doc: Doc): string {
  const t = doc.title.toLowerCase();
  if (/contract|agreement|nda|terms/.test(t)) return 'agreement';
  if (/policy|procedure|protocol/.test(t)) return 'policy';
  if (/plan|roadmap|strategy/.test(t)) return 'plan';
  if (/report|review|summary/.test(t)) return 'report';
  if (/minutes|agenda/.test(t)) return 'meeting record';
  if (/invoice|quote|order/.test(t)) return 'quote';
  if (/letter|notice|newsletter/.test(t)) return 'letter';
  return 'document';
}

// ---------------------------------------------------------- the built-in suggestions

const SOURCES = (n: string) => [
  `copy it from the signed source for this ${n}`, 'take it from the latest approved record', `ask the person who owns this ${n}`, 'use the wording already agreed with the other party',
  "check it against the school's own records", 'state it exactly as it appears in the original', 'confirm it with the person named as responsible', `use the same form used elsewhere in this ${n}`,
  'quote it from the supporting document', 'read it from the current official source', 'get it in writing from whoever supplied it', `use the approved template wording for this ${n}`,
];
const CHECKS = (n: string) => [
  'have a second person confirm it', 'do not guess if it is unknown', 'mark it for review if unsure', 'keep it short and specific', 'use plain language', 'avoid abbreviations',
  'say where it came from', 'remove this note once it is filled in', 'leave it open rather than invent it', 'check the spelling', `make sure it matches the rest of the ${n}`, 'record who supplied it',
];
const flavour = (label: string): string => {
  if (/\b(date|day|deadline|year|term|period|time|duration)\b/i.test(label)) return 'A date or period: use one format throughout and take it from a source.';
  if (/\b(amount|fees?|price|cost|total|budget|rate|salary|value|payment)\b/i.test(label)) return 'An amount: state the unit and currency and take it from a source; do not estimate.';
  if (/\b(name|party|supplier|school|person|owner|signatory|contact|author|principal|title)\b/i.test(label)) return 'A name or role: use the full official form and confirm it.';
  return 'Fill this from a source you can name; a person confirms it.';
};

const LENSES = [
  'the school governing body', 'a parent reading it for the first time', 'a new staff member', 'the principal who must approve it', 'an auditor checking it', 'a reader with very little time',
  'a reader whose first language is not English', 'the person who has to act on it', 'a colleague taking over the work', 'a reviewer looking for gaps', "a reader comparing it with last year's version",
  'a sceptical reader', 'a member of the finance committee', 'a department head', 'a volunteer helping out', 'a visitor from another school',
];
const TEMPLATES: ((t: string, n: string, l: string) => Suggestion)[] = [
  (t, _n, l) => ({ text: `Rewrite the opening of ${t} so it works for ${l}.`, why: 'The opening decides whether people keep reading.' }),
  (_t, n, l) => ({ text: `List what a reader still has to decide after reading this ${n}, written for ${l}.`, why: 'Surfaces open decisions before they are missed.' }),
  (t, _n, l) => ({ text: `Which parts of ${t} would confuse ${l}, and how would you fix each?`, why: 'Finds unclear passages from a reader’s side.' }),
  (_t, n, l) => ({ text: `Draft a checklist of facts to verify in this ${n} before it goes to ${l}.`, why: 'Turns checking into steps a person can tick off.' }),
  (t, _n, l) => ({ text: `Summarise ${t} in five plain sentences for ${l}.`, why: 'A short version shows what the document really says.' }),
  (_t, n, l) => ({ text: `What questions would ${l} ask about this ${n}? Suggest answers I can check against a source.`, why: 'Prepares you for the questions that will come.' }),
  (t, _n, l) => ({ text: `Suggest a clearer heading structure for ${t} aimed at ${l}.`, why: 'Headings are how most people find their way.' }),
  (_t, n, l) => ({ text: `Point out any claim in this ${n} that needs a source, from the point of view of ${l}.`, why: 'Unsourced claims are what reviewers push back on.' }),
  (t, _n, l) => ({ text: `Suggest wording for the blanks in ${t} that ${l} would understand, marking each as a draft to confirm.`, why: 'Helps fill blanks without inventing facts.' }),
  (t, _n, l) => ({ text: `Check ${t} for terms that need defining for ${l}.`, why: 'Undefined terms cause disputes later.' }),
  (_t, n, l) => ({ text: `Propose what should be added to this ${n} so it is complete for ${l}.`, why: 'Catches missing sections.' }),
  (t, _n, l) => ({ text: `Rewrite the closing of ${t} with next steps written for ${l}.`, why: 'A clear ending says who does what next.' }),
  (t, _n, l) => ({ text: `Draft a short cover note to send with ${t} to ${l}.`, why: 'A cover note sets expectations for the reader.' }),
  (_t, n, l) => ({ text: `Find anything in this ${n} that ${l} could read two ways.`, why: 'Ambiguity is the usual source of disagreement.' }),
];
const PROMPT_POOL = TEMPLATES.length * LENSES.length;
const VALUE_POOL = 144;

export interface Deterministic { inputs: InputSuggestion[]; prompts: Suggestion[]; /** True when the unused pool ran out and rotation restarted. */ cycled: boolean }

/**
 * Suggestions with no model. Pools are large (224 prompts, 144 values per blank) and walked in a fixed scattered order
 * from an offset that moves with `round`, skipping anything in `exclude`, so a client that sends back every text it has seen
 * never gets one twice. Only if the unused pool runs out does it restart, avoiding the previous round's texts, and say so.
 */
export function deterministicSuggestions(doc: Doc, round: number, exclude: readonly string[]): Deterministic {
  const noun = docKind(doc);
  const title = doc.title.trim() ? `“${doc.title.trim().slice(0, 80)}”` : 'this document';
  const blanks = blanksOf(doc).slice(0, SUGGEST_LIMITS.maxInputs);
  const src = SOURCES(noun);
  const chk = CHECKS(noun);
  const build = (r: number, skip: Set<string>) => {
    let short = false;
    const inputs: InputSuggestion[] = blanks.flatMap((blank, b) => {
      const start = (r + b * 17) % VALUE_POOL;
      for (let i = 0; i < VALUE_POOL; i++) {
        const idx = ((start + i) * 53) % VALUE_POOL;
        const value = `[Fill in: ${blank.slice(0, 100)} — ${src[idx % 12]}; ${chk[Math.floor(idx / 12)]}]`;
        if (!skip.has(norm(value))) return [{ blank, value, why: flavour(blank) }];
      }
      short = true;
      return [];
    });
    const prompts: Suggestion[] = [];
    const start = (r * SUGGEST_LIMITS.promptsPerRound) % PROMPT_POOL;
    for (let i = 0; i < PROMPT_POOL && prompts.length < SUGGEST_LIMITS.promptsPerRound; i++) {
      const idx = ((start + i) * 89) % PROMPT_POOL;
      const p = TEMPLATES[idx % TEMPLATES.length]!(title, noun, LENSES[Math.floor(idx / TEMPLATES.length)]!);
      if (!skip.has(norm(p.text))) prompts.push(p);
    }
    if (prompts.length < SUGGEST_LIMITS.promptsPerRound) short = true;
    return { inputs, prompts, short };
  };
  const first = build(round, new Set(exclude.map(norm)));
  if (!first.short) return { inputs: first.inputs, prompts: first.prompts, cycled: false };
  const prev = round > 0 ? build(round - 1, new Set()) : { inputs: [], prompts: [] };
  const again = build(round, new Set(textsOf(prev).map(norm)));
  return { inputs: again.inputs, prompts: again.prompts, cycled: true };
}

/** A model's reply, checked: only blanks the document has, bounded text, nothing already seen. Null when it is not usable JSON. */
export function parseModelSuggestions(reply: string, blanks: readonly string[], exclude: readonly string[]): { inputs: InputSuggestion[]; prompts: Suggestion[] } | null {
  let j: unknown;
  try {
    j = JSON.parse(reply.replace(/^```(?:json)?\s*|\s*```$/g, ''));
  } catch {
    return null;
  }
  if (typeof j !== 'object' || j === null) return null;
  const o = j as { inputs?: unknown; prompts?: unknown };
  const seen = new Set(exclude.map(norm));
  const take = (text: unknown, max: number) => (isStr(text) && text.trim() && text.length <= max && !seen.has(norm(text)) ? (seen.add(norm(text)), text.trim()) : null);
  const inputs: InputSuggestion[] = [];
  for (const i of Array.isArray(o.inputs) ? o.inputs : []) {
    const r = i as { blank?: unknown; value?: unknown; why?: unknown };
    const blank = isStr(r.blank) ? blanks.find((b) => norm(b) === norm(r.blank as string)) : undefined;
    const value = blank ? take(r.value, 300) : null;
    if (blank && value) inputs.push({ blank, value, why: isStr(r.why) ? r.why.slice(0, 200) : '' });
  }
  const prompts: Suggestion[] = [];
  for (const p of Array.isArray(o.prompts) ? o.prompts : []) {
    const r = p as { text?: unknown; why?: unknown };
    const text = take(r.text, 300);
    if (text) prompts.push({ text, why: isStr(r.why) ? r.why.slice(0, 200) : '' });
  }
  return { inputs: inputs.slice(0, SUGGEST_LIMITS.maxInputs), prompts: prompts.slice(0, SUGGEST_LIMITS.promptsPerRound) };
}

// ------------------------------------------------------------------- the panel

export type Shown<T> = T & { isNew: boolean };
export interface PanelState {
  /** The last round that succeeded (0 before any). The next request asks for `requestRound(state)`. */
  round: number;
  /** Every text shown so far (most recent 200): sent back as `exclude`. */
  seen: string[];
  inputs: Shown<InputSuggestion>[];
  prompts: Shown<Suggestion>[];
  generatedWith: string;
  flags: string[];
  error: string | null;
  loading: boolean;
}
const MAX_SHOWN = 12;

/** The round to ask for next: 0 until something has been shown, then the one after the last success; past the route's maximum the rotation restarts at 0 (the exclusion list is kept). */
export const requestRound = (s: PanelState): number => (s.seen.length ? (s.round + 1 > SUGGEST_LIMITS.maxRound ? 0 : s.round + 1) : 0);

/** The `exclude` list to send: the most recent 200 texts, whitespace normalised and cut to 500 characters, so the request is always valid. */
export const excludeFor = (seen: readonly string[]): string[] => seen.slice(-SUGGEST_LIMITS.maxExclude).map((t) => t.replace(/\s+/g, ' ').trim().slice(0, SUGGEST_LIMITS.maxExcludeChars));
export const initialPanelState = (): PanelState => ({ round: 0, seen: [], inputs: [], prompts: [], generatedWith: '', flags: [], error: null, loading: false });
export const startLoading = (s: PanelState): PanelState => ({ ...s, loading: true, error: null });
const stale = <T>(xs: Shown<T>[]) => xs.map((x) => ({ ...x, isNew: false }));

/** A success: the new items go first and are marked New, older ones stay but are no longer New, and the next request asks for the following round (`requestRound`). */
export function nextPanelState(prev: PanelState, r: DocSuggestions): PanelState {
  const fresh = <T>(xs: T[]): Shown<T>[] => xs.map((x) => ({ ...x, isNew: true }));
  return {
    round: r.round,
    seen: [...new Set([...prev.seen, ...textsOf(r)])].slice(-SUGGEST_LIMITS.maxExclude),
    inputs: [...fresh(r.inputs), ...stale(prev.inputs)].slice(0, MAX_SHOWN),
    prompts: [...fresh(r.prompts), ...stale(prev.prompts)].slice(0, MAX_SHOWN),
    generatedWith: r.generatedWith, flags: r.flags, error: null, loading: false,
  };
}

/** A failure: an error line, the same round again next time, and nothing left marked New. */
export const failPanelState = (prev: PanelState, message: string): PanelState => ({ ...prev, inputs: stale(prev.inputs), prompts: stale(prev.prompts), error: message, loading: false });

/** Where the suggestions came from, in words. */
export function generatedWithLabel(generatedWith: string, flags: readonly string[]): string {
  if (generatedWith !== 'deterministic-fallback') return flags.includes('mixed_source') ? `Model: ${generatedWith} (some suggestions are built-in)` : `Model: ${generatedWith}`;
  if (flags.includes('rate_limited')) return 'Built-in suggestions (model limit reached)';
  if (flags.includes('provider_failed')) return 'Built-in suggestions (model unavailable)';
  if (flags.includes('refresh_fallback')) return 'Built-in suggestions (the model had nothing new)';
  return 'Built-in suggestions (no model configured)';
}
