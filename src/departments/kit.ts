import type { AgentContract, InputField, RunContext } from '../core/agent';
import type { Block, Doc, Purpose, ArtefactFormat } from '../core/types';

export const TBC = '— to complete —';

export interface Sec {
  h: string;
  p?: string;
  bullets?: string[];
  ol?: string[];
  table?: { headers: string[]; rows: (string | number)[][] };
  kv?: [string, string][];
  checks?: string[];
  callout?: { tone: 'info' | 'warn' | 'ok'; text: string };
  /** Quote the human's own input back, under the heading. */
  input?: string;
}

export const src = (ctx: RunContext, key: string, fallback = 'unknown'): string => (key in ctx.facts ? `${ctx.facts[key]} [src:${key}]` : fallback);

export interface AgentDef {
  n: number; // → OPS-<DEPT>-nn
  name: string;
  summary: string;
  framework: string;
  purpose: Purpose;
  formats?: ArtefactFormat[];
  inputs: InputField[];
  secondApprover?: boolean;
  sections: (ctx: RunContext) => Sec[];
  narrative?: (ctx: RunContext) => Record<string, string | number>;
  title?: (ctx: RunContext) => string;
  /** Extra warning shown at the top of the document (e.g. legal disclaimer). */
  warning?: string;
}

export function blocksFrom(secs: Sec[]): Block[] {
  const out: Block[] = [];
  for (const s of secs) {
    out.push({ type: 'h', level: 2, text: s.h });
    if (s.callout) out.push({ type: 'callout', tone: s.callout.tone, text: s.callout.text });
    if (s.p) out.push({ type: 'p', text: s.p });
    if (s.input !== undefined) out.push({ type: 'p', text: s.input.trim() ? s.input : TBC });
    if (s.kv) out.push({ type: 'kv', pairs: s.kv });
    if (s.bullets) out.push({ type: 'ul', items: s.bullets });
    if (s.ol) out.push({ type: 'ol', items: s.ol });
    if (s.checks) out.push({ type: 'checklist', checks: s.checks.map((label) => ({ label, done: false })) });
    if (s.table) out.push({ type: 'table', headers: s.table.headers, rows: s.table.rows });
  }
  return out;
}

export function defineAgent(dept: string, code: string, d: AgentDef): AgentContract {
  const id = `OPS-${code}-${String(d.n).padStart(2, '0')}`;
  return {
    id,
    version: '1.0.0',
    dept,
    name: d.name,
    summary: d.summary,
    framework: d.framework,
    purpose: d.purpose,
    allowedPurposes: [d.purpose],
    dataClass: 'internal',
    reads: ['L1', 'L2', 'L3'],
    formats: d.formats ?? ['md', 'docx', 'html', 'pdf', 'json'],
    inputs: d.inputs,
    requiresApproval: true,
    secondApprover: d.secondApprover,
    budget: { maxPromptChars: 6000 },
    evalRef: 'test/departments.test.ts',
    narrativeFacts: d.narrative,
    build(ctx): Doc {
      const provided = d.inputs.map((i) => [i.label, ctx.input[i.key]?.trim() ? ctx.input[i.key] : TBC] as [string, string]);
      const head: Block[] = [
        { type: 'callout', tone: 'info', text: `Draft for human review. Method: ${d.framework}. Agent ${id} v1.0.0. Figures are either sourced from the ecosystem snapshot, typed in by you, or removed and flagged as unsourced.` },
      ];
      if (d.warning) head.push({ type: 'callout', tone: 'warn', text: d.warning });
      head.push({ type: 'h', level: 2, text: 'Inputs provided' }, { type: 'kv', pairs: provided });
      const tail: Block[] = [
        { type: 'h', level: 2, text: 'Human review before this is used' },
        { type: 'checklist', checks: ['Facts checked against their sources', 'Every number traced or removed', 'No personal or learner information included', 'Approver named in the platform'].map((label) => ({ label, done: false })) },
      ];
      return { title: d.title ? d.title(ctx) : d.name, subtitle: d.summary, blocks: [...head, ...blocksFrom(d.sections(ctx)), ...tail], meta: { generated: new Date().toISOString().slice(0, 10) } };
    },
  };
}

export const txt = (key: string, label: string, required = false, help?: string): InputField => ({ key, label, kind: 'text', required, help });
export const long = (key: string, label: string, required = false, help?: string): InputField => ({ key, label, kind: 'longtext', required, help });
export const num = (key: string, label: string, required = false, help?: string): InputField => ({ key, label, kind: 'number', required, help });
export const pick = (key: string, label: string, options: string[], required = false): InputField => ({ key, label, kind: 'select', options, required });

/** Table with blank rows for the human to complete. */
export const blankRows = (labels: string[], cols: number): (string | number)[][] => labels.map((l) => [l, ...Array(cols - 1).fill('')]);
export const v = (ctx: RunContext, k: string) => ctx.input[k]?.trim() || TBC;
