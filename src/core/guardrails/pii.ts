import type { Provenance } from '../types';

export type PiiKind = 'sa_id' | 'email' | 'phone_za' | 'titled_name' | 'known_name' | 'learner_identifier';
export interface PiiFinding {
  kind: PiiKind;
  match: string;
  start: number;
  end: number;
}

/** Luhn check used by the South African ID number (13 digits, YYMMDD SSSS C A Z). */
export function validSaId(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
const PHONE = /(?:\+27|\b0)[\s-]?[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b|(?:\+27|\b0)[\s-]?[1-5]\d[\s-]?\d{3}[\s-]?\d{4}\b/g;
const TITLED = /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Principal|Mnr|Mev)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g;
const LEARNER_ID = /\b(?:EMIS|learner\s*(?:no|number|id|name)|student\s*(?:no|number|id)|pupil\s*(?:no|number|id))\b[\s:#-]*[\w-]+/gi;
const THIRTEEN = /(?<!\d)\d{13}(?!\d)/g;

function collect(re: RegExp, text: string, kind: PiiKind, keep: (m: string) => boolean = () => true): PiiFinding[] {
  const out: PiiFinding[] = [];
  for (const m of text.matchAll(re)) {
    if (keep(m[0])) out.push({ kind, match: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}

export function detectPii(text: string, knownNames: string[] = []): PiiFinding[] {
  const found = [
    ...collect(THIRTEEN, text, 'sa_id', validSaId),
    ...collect(EMAIL, text, 'email'),
    ...collect(PHONE, text, 'phone_za'),
    ...collect(TITLED, text, 'titled_name'),
    ...collect(LEARNER_ID, text, 'learner_identifier'),
  ];
  for (const name of knownNames.filter((n) => n.trim().length >= 3)) {
    const re = new RegExp('\\b' + name.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '\\b', 'gi');
    found.push(...collect(re, text, 'known_name'));
  }
  return found.sort((a, b) => a.start - b.start);
}

export class LearnerDataRefused extends Error {
  constructor(public readonly findings: PiiFinding[]) {
    super('Learner-level identifiers are never admitted to the operations platform.');
  }
}

export interface Deidentified {
  text: string;
  /** token → original. Kept by the caller in memory only; never sent anywhere, never stored in the Brain. */
  tokens: Record<string, string>;
  findings: PiiFinding[];
  provenance: Provenance;
}

/**
 * Replace personal data with stable tokens. The only producer of `deidentified: true`.
 * Learner identifiers are not tokenised: they abort, because this platform must never hold them.
 */
export function deidentify(text: string, sources: string[], knownNames: string[] = []): Deidentified {
  const findings = detectPii(text, knownNames);
  const learner = findings.filter((f) => f.kind === 'learner_identifier');
  if (learner.length) throw new LearnerDataRefused(learner);

  const tokens: Record<string, string> = {};
  const seen = new Map<string, string>();
  const counters: Record<string, number> = {};
  let out = '';
  let cursor = 0;
  for (const f of findings) {
    if (f.start < cursor) continue; // overlapping finding already replaced
    out += text.slice(cursor, f.start);
    const key = f.kind + ':' + f.match.toLowerCase();
    let tok = seen.get(key);
    if (!tok) {
      counters[f.kind] = (counters[f.kind] ?? 0) + 1;
      tok = `[${f.kind.toUpperCase()}_${counters[f.kind]}]`;
      seen.set(key, tok);
      tokens[tok] = f.match;
    }
    out += tok;
    cursor = f.end;
  }
  out += text.slice(cursor);
  return { text: out, tokens, findings, provenance: { deidentified: true, sources } };
}

/** Put the original values back (for the human-facing artefact only, after the model call). */
export function reidentify(text: string, tokens: Record<string, string>): string {
  return Object.entries(tokens).reduce((acc, [tok, orig]) => acc.split(tok).join(orig), text);
}
