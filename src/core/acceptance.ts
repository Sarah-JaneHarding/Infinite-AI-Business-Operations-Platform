import type { AgentContract } from './agent';
import { PURPOSES, type Doc } from './types';
import { detectPii } from './guardrails/pii';
import { detectInjection } from './guardrails/injection';
import { toCsv, toHtml, toJson, toMarkdown } from './artefacts/render';

/**
 * The acceptance suite. Every autonomous draft must pass it before it can be sent for review, and a standing order must pass
 * it in a dry run before it can be activated. It is deterministic and pure, so the runner, the server (which re-checks it
 * before accepting a submission) and the board all reach the same answer. A detail never contains the text that failed.
 */
export interface CheckResult { id: string; title: string; pass: boolean; detail: string }
export interface Acceptance { passed: boolean; results: CheckResult[] }
export interface Candidate {
  doc: Doc;
  agentId: string;
  /** Flags the guardrails raised while the draft was produced (for example `pii_echo:1`). */
  flags?: string[];
  requestedBy?: string;
}

const MAX_DOC_JSON = 200_000;
const BLOCK_TYPES = new Set(['h', 'p', 'ul', 'ol', 'table', 'kv', 'callout', 'checklist']);

/** Every string a reader would see. */
export function textOf(doc: Doc): string[] {
  const out: string[] = [doc.title, doc.subtitle ?? ''];
  for (const b of doc.blocks) {
    out.push(b.text ?? '', ...(b.items ?? []), ...(b.headers ?? []), ...(b.checks ?? []).map((c) => c.label));
    for (const r of b.rows ?? []) out.push(...r.map(String));
    for (const [k, v] of b.pairs ?? []) out.push(k, v);
  }
  out.push(...Object.values(doc.meta ?? {}).map(String));
  return out.filter(Boolean);
}

const check = (id: string, title: string, fn: () => string | null): CheckResult => {
  try {
    const fail = fn();
    return { id, title, pass: fail === null, detail: fail ?? 'ok' };
  } catch (e) {
    return { id, title, pass: false, detail: `check could not run: ${(e as Error).message.slice(0, 80)}` };
  }
};

export function runAcceptance(c: Candidate, agent: AgentContract | undefined): Acceptance {
  const doc = c.doc;
  // The size check comes first and is cheap: the other checks scan every character, so an oversize document is refused before they run.
  const tooBig = (() => { try { return JSON.stringify(doc).length > MAX_DOC_JSON; } catch { return true; } })();
  if (tooBig) return { passed: false, results: [{ id: 'A7', title: 'It fits the storage limit', pass: false, detail: `larger than ${MAX_DOC_JSON} characters, so the other checks were not run` }] };
  const texts = (() => { try { return textOf(doc); } catch { return []; } })();
  const joined = texts.join('\n');
  const results: CheckResult[] = [
    check('A1', 'The agent contract holds', () => {
      if (!agent) return `no registered agent ${c.agentId}`;
      if (agent.requiresApproval !== true) return 'the contract does not require approval';
      if (agent.dataClass === 'learner') return 'the contract handles learner data, which is never admitted';
      if (!PURPOSES.includes(agent.purpose) || !agent.allowedPurposes.includes(agent.purpose)) return 'the contract purpose is not one it is allowed';
      return null;
    }),
    check('A2', 'The document is well formed', () => {
      if (typeof doc?.title !== 'string' || !doc.title.trim() || doc.title.length > 200) return 'the title is missing or longer than 200 characters';
      if (!Array.isArray(doc.blocks) || !doc.blocks.length) return 'the document has no content';
      const bad = doc.blocks.filter((b) => !BLOCK_TYPES.has(b.type)).length;
      if (bad) return `${bad} block(s) have an unknown type`;
      if (doc.blocks.some((b) => b.type === 'h' && !(b.text ?? '').trim())) return 'a heading is empty';
      return null;
    }),
    check('A3', 'It says something', () => {
      const body = doc.blocks.filter((b) => b.type !== 'h').flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.pairs ?? []).map(([, v]) => v), ...(b.rows ?? []).flat().map(String)]).join(' ').trim();
      return body.length >= 40 ? null : 'there is almost no content outside headings';
    }),
    check('A4', 'No personal data', () => {
      const found = detectPii(joined);
      return found.length ? `personal data present (${[...new Set(found.map((f) => f.kind))].join(', ')})` : null;
    }),
    check('A5', 'No instruction-override text', () => (detectInjection(joined).length ? 'the text contains an instruction-override pattern' : null)),
    check('A6', 'Every figure is sourced and nothing was redacted', () => {
      const flagged = (c.flags ?? []).filter((f) => /^(pii_echo|unsourced_claims)/.test(f));
      if (flagged.length) return `the guardrails flagged it while drafting (${flagged.join(', ')})`;
      if (/\[UNSOURCED\]/.test(joined)) return 'it still contains [UNSOURCED] figures';
      if (/\[REDACTED_[A-Z_]+\]/.test(joined)) return 'it still contains redacted personal data';
      return null;
    }),
    check('A7', 'It fits the storage limit', () => null),
    check('A8', 'It renders safely in every text format', () => {
      const md = toMarkdown(doc);
      const html = toHtml(doc);
      const csv = toCsv(doc);
      const json = toJson(doc);
      if (![md, html, csv, json].every((s) => s.trim().length > 0)) return 'a format rendered empty';
      JSON.parse(json);
      const markup = html.replace(/<style[\s\S]*?<\/style>/i, '');
      if (/<script/i.test(markup) || /<[a-z][^>]*\son[a-z]+\s*=/i.test(markup) || /\b(?:href|src)\s*=\s*["']?\s*javascript:/i.test(markup)) return 'the HTML export contains script or an event handler';
      return null;
    }),
    check('A9', 'It is marked as a draft with its provenance', () => {
      const m = doc.meta ?? {};
      if (m.status !== 'DRAFT') return 'meta.status is not DRAFT';
      if (!m.agent || m.agent !== c.agentId) return 'meta.agent does not match the agent';
      if (!m.engine) return 'meta.engine is missing';
      if (agent && m.purpose !== agent.purpose) return 'meta.purpose does not match the contract';
      return null;
    }),
    check('A10', 'An autonomous draft names its standing order', () => {
      if (!c.requestedBy?.startsWith('auto:')) return null;
      return doc.meta?.order === c.requestedBy.slice(5) ? null : 'meta.order does not match the autonomous actor';
    }),
  ];
  return { passed: results.every((r) => r.pass), results };
}

export const failedChecks = (a: Acceptance) => a.results.filter((r) => !r.pass);
