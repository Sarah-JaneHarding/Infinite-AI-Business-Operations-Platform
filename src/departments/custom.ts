/**
 * Builders: agents, widgets and artefact templates defined by users in the platform.
 * Definitions are plain data kept in the `custom_defs` collection. No user text is ever executed:
 * calculator formulas go through a small arithmetic parser (numbers, + - * / and brackets), not eval.
 * A custom agent always needs a human decision and a second approver, and passes the same input gates as a built-in one.
 */
import type { AgentContract, InputField } from '../core/agent';
import { PURPOSES, type Doc, type Purpose } from '../core/types';
import { defineAgent, v, type Sec } from './kit';
import { DEPARTMENTS } from './index';
import type { CalcOut } from './calc';
import type { Col, Widget } from './types';

export const DEPT_CODE: Record<string, string> = { executive: 'EXEC', product: 'PROD', curriculum: 'CURR', ai: 'AI', security: 'SEC', legal: 'LEG', finance: 'FIN', sales: 'SALES', marketing: 'MKT', success: 'CS', support: 'SUP', government: 'GOV', people: 'PPL', devops: 'SRE', procurement: 'PRO', research: 'RES' };
export const ALL_PURPOSES: readonly Purpose[] = PURPOSES;

export type CSec =
  | { h: string; kind: 'text'; text: string }
  | { h: string; kind: 'input'; ref: string }
  | { h: string; kind: 'bullets'; items: string[] }
  | { h: string; kind: 'steps'; items: string[] }
  | { h: string; kind: 'checks'; items: string[] }
  | { h: string; kind: 'table'; headers: string[]; blankRows: number };

interface Base { id: string; dept: string; by: string; at: string; deleted?: boolean }
export interface CustomAgentDef extends Base { kind: 'agent'; name: string; summary: string; purpose: Purpose; inputs: InputField[]; sections: CSec[] }
export interface CalcOutDef { label: string; expr: string; unit: string }
export interface CustomWidgetDef extends Base { kind: 'widget'; title: string; wtype: 'checklist' | 'tracker' | 'calc'; note?: string; items?: string[]; columns?: Col[]; inputs?: { key: string; label: string; unit?: string }[]; outputs?: CalcOutDef[] }
export interface CustomArtefactDef extends Base { kind: 'artefact'; title: string; summary: string; doc: Doc }
export type CustomDef = CustomAgentDef | CustomWidgetDef | CustomArtefactDef;

export const keyOf = (label: string) => label.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 30) || 'field';

// ---------- safe arithmetic ----------
type Tok = { t: 'n'; v: number } | { t: 'id'; v: string } | { t: 'op'; v: string };
function tokenize(s: string): Tok[] | null {
  const out: Tok[] = [];
  const re = /\s*(?:(\d+(?:\.\d+)?)|([a-z_][a-z0-9_]*)|([-+*/()]))/gy;
  let i = 0;
  while (i < s.length) {
    re.lastIndex = i;
    const m = re.exec(s);
    if (!m) return /^\s*$/.test(s.slice(i)) ? out : null;
    out.push(m[1] !== undefined ? { t: 'n', v: Number(m[1]) } : m[2] !== undefined ? { t: 'id', v: m[2] } : { t: 'op', v: m[3] });
    i = re.lastIndex;
  }
  return out;
}
/** Evaluate `a / b * 100`-style formulas. Returns null on any error, unknown name or division by zero. */
export function evalExpr(expr: string, vars: Record<string, number>): number | null {
  const toks = tokenize(expr);
  if (!toks || !toks.length) return null;
  let p = 0;
  let bad = false;
  const peek = () => toks[p];
  const primary = (): number => {
    const t = toks[p++];
    if (!t) { bad = true; return 0; }
    if (t.t === 'n') return t.v;
    if (t.t === 'id') { if (!(t.v in vars) || !Number.isFinite(vars[t.v])) bad = true; return vars[t.v] ?? 0; }
    if (t.v === '(') { const x = sum(); if (toks[p]?.t === 'op' && (toks[p] as { v: string }).v === ')') p++; else bad = true; return x; }
    if (t.v === '-') return -primary();
    if (t.v === '+') return primary();
    bad = true; return 0;
  };
  const prod = (): number => {
    let x = primary();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '*' || t.v === '/')) { p++; const y = primary(); if (t.v === '*') x *= y; else if (y === 0) { bad = true; } else x /= y; } else return x;
    }
  };
  const sum = (): number => {
    let x = prod();
    for (;;) {
      const t = peek();
      if (t?.t === 'op' && (t.v === '+' || t.v === '-')) { p++; const y = prod(); x = t.v === '+' ? x + y : x - y; } else return x;
    }
  };
  const r = sum();
  if (bad || p !== toks.length || !Number.isFinite(r)) return null;
  return r;
}
/** Names a formula uses, or null if it will not parse. */
export function exprNames(expr: string): string[] | null {
  const t = tokenize(expr);
  if (!t || !t.length) return null;
  const names = [...new Set(t.filter((x): x is { t: 'id'; v: string } => x.t === 'id').map((x) => x.v))];
  const probe = (n: number) => evalExpr(expr, Object.fromEntries(names.map((k) => [k, n])));
  return probe(2) === null && probe(3) === null ? null : names;
}

// ---------- validation ----------
export function checkDef(d: CustomDef): string | null {
  if (!DEPT_CODE[d.dept]) return 'Choose a department.';
  const nm = d.kind === 'agent' ? d.name : d.title;
  if (!nm?.trim() || nm.length > 80) return 'Give it a name of 80 characters or fewer.';
  if (d.kind === 'agent') {
    if (!ALL_PURPOSES.includes(d.purpose)) return 'Choose a purpose.';
    if (!d.inputs.length || d.inputs.length > 12) return 'An agent needs 1 to 12 inputs.';
    const keys = d.inputs.map((i) => i.key);
    if (new Set(keys).size !== keys.length) return 'Two inputs have the same name.';
    if (d.inputs.some((i) => !i.label.trim())) return 'Every input needs a label.';
    if (d.inputs.some((i) => i.kind === 'select' && !(i.options?.length))) return 'A choice input needs options.';
    if (!d.sections.length || d.sections.length > 20) return 'An agent needs 1 to 20 sections.';
    for (const s of d.sections) { if (!s.h.trim()) return 'Every section needs a heading.'; if (s.kind === 'input' && !keys.includes(s.ref)) return `Section “${s.h}” points at an input that does not exist.`; }
  }
  if (d.kind === 'widget') {
    if (d.wtype === 'checklist' && !(d.items?.filter((x) => x.trim()).length)) return 'A checklist needs at least one item.';
    if (d.wtype === 'tracker' && !(d.columns?.length)) return 'A tracker needs at least one column.';
    if (d.wtype === 'calc') {
      const keys = (d.inputs ?? []).map((i) => i.key);
      if (!keys.length || !d.outputs?.length) return 'A calculator needs inputs and at least one result.';
      for (const o of d.outputs) { const n = exprNames(o.expr); if (!n) return `The formula for “${o.label}” cannot be read. Use numbers, input names, + - * / and brackets.`; const miss = n.find((x) => !keys.includes(x)); if (miss) return `The formula for “${o.label}” uses “${miss}”, which is not an input.`; }
    }
  }
  if (d.kind === 'artefact' && !d.doc.blocks.length) return 'The template needs at least one block.';
  return null;
}

// ---------- building ----------
export function buildCustomAgent(d: CustomAgentDef, n: number): AgentContract {
  const a = defineAgent(d.dept, `CUS-${DEPT_CODE[d.dept]}`, {
    n, name: d.name, summary: d.summary, framework: 'Custom agent defined in this platform', purpose: d.purpose, inputs: d.inputs, secondApprover: true,
    warning: 'Custom agent. Its sections were written by a person in this organisation. Treat it as a draft until a second person has approved it.',
    sections: (ctx): Sec[] => d.sections.map((s): Sec => s.kind === 'text' ? { h: s.h, p: s.text } : s.kind === 'input' ? { h: s.h, input: v(ctx, s.ref) === '— to complete —' ? '' : ctx.input[s.ref] } : s.kind === 'bullets' ? { h: s.h, bullets: s.items.filter(Boolean) } : s.kind === 'steps' ? { h: s.h, ol: s.items.filter(Boolean) } : s.kind === 'checks' ? { h: s.h, checks: s.items.filter(Boolean) } : { h: s.h, table: { headers: s.headers, rows: Array.from({ length: s.blankRows }, () => s.headers.map(() => '')) } }),
  });
  return { ...a, id: d.id };
}
export function buildCustomWidget(d: CustomWidgetDef): Widget {
  const collection = `cw_${d.id.replace(/[^a-z0-9]/gi, '_').toLowerCase()}`.slice(0, 43);
  if (d.wtype === 'checklist') return { id: d.id, title: d.title, type: 'checklist', note: d.note, collection, items: (d.items ?? []).filter((x) => x.trim()) };
  if (d.wtype === 'tracker') return { id: d.id, title: d.title, type: 'tracker', note: d.note, collection, columns: d.columns ?? [] };
  const outs = d.outputs ?? [];
  return { id: d.id, title: d.title, type: 'calc', note: d.note, inputs: d.inputs ?? [], compute: (vals): CalcOut[] => outs.map((o) => ({ label: o.label, value: evalExpr(o.expr, vals), unit: o.unit || '', formula: o.expr })) };
}

// ---------- storage ----------
export interface DefStore { put(c: string, r: Record<string, unknown> & { id: string }): Promise<unknown>; latest<T>(c: string, key?: string): T[] }
export const newDefId = (kind: CustomDef['kind']) => `${kind === 'agent' ? 'agt' : kind === 'widget' ? 'wid' : 'art'}-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`;
export const listDefs = (s: DefStore): CustomDef[] => s.latest<CustomDef>('custom_defs', 'id').filter((d) => !d.deleted);
export async function saveDef(s: DefStore, d: CustomDef): Promise<CustomDef> {
  const err = checkDef(d);
  if (err) throw new Error(err);
  await s.put('custom_defs', d as unknown as Record<string, unknown> & { id: string });
  return d;
}
/** Custom agents, numbered in creation order within their department. The id is the definition's own id, which the server recognises. */
export function customAgents(s: DefStore, dept?: string): AgentContract[] {
  const seen: Record<string, number> = {};
  const out: AgentContract[] = [];
  for (const d of s.latest<CustomDef>('custom_defs', 'id').filter((x): x is CustomAgentDef => x.kind === 'agent' && !x.deleted).sort((x, y) => x.at.localeCompare(y.at) || x.id.localeCompare(y.id))) {
    seen[d.dept] = (seen[d.dept] ?? 0) + 1;
    if (!dept || d.dept === dept) out.push(buildCustomAgent(d, seen[d.dept]));
  }
  return out;
}
export const customWidgets = (s: DefStore, dept?: string): Widget[] => listDefs(s).filter((d): d is CustomWidgetDef => d.kind === 'widget' && (!dept || d.dept === dept)).map(buildCustomWidget);
export const customArtefacts = (s: DefStore, dept?: string): CustomArtefactDef[] => listDefs(s).filter((d): d is CustomArtefactDef => d.kind === 'artefact' && (!dept || d.dept === dept));
export const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
