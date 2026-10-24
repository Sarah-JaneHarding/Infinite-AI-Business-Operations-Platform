import { PURPOSES } from '../types';
import type { DataClass, LawfulBasis, Purpose } from '../types';
import { deidentify, detectPii, LearnerDataRefused, type Deidentified, type PiiFinding } from './pii';
import { detectInjection, type InjectionFinding } from './injection';
import { enforceSourcing, type ClaimResult } from './claims';

export type GateFailure =
  | { gate: 'tombstone'; reason: string }
  | { gate: 'purpose'; reason: string }
  | { gate: 'lawful_basis'; reason: string }
  | { gate: 'data_class'; reason: string };

export interface GateInput {
  subjectId?: string;
  tombstoned?: ReadonlySet<string>;
  purpose: Purpose;
  allowedPurposes: readonly Purpose[];
  dataClass: DataClass;
  lawfulBasis?: LawfulBasis;
}

/** Gate order is fixed — tombstone → purpose → lawful basis — mirroring the ecosystem's policy plane. */
export function runGates(g: GateInput): GateFailure | null {
  if (g.dataClass === 'learner') return { gate: 'data_class', reason: 'Learner-level data is never admitted to the operations platform.' };
  if (g.subjectId && g.tombstoned?.has(g.subjectId)) return { gate: 'tombstone', reason: `Subject ${g.subjectId} has been erased; no processing is permitted.` };
  if (!PURPOSES.includes(g.purpose) || !g.allowedPurposes.includes(g.purpose))
    return { gate: 'purpose', reason: `Purpose "${g.purpose}" is not permitted for this agent.` };
  if (g.dataClass === 'personal' && !g.lawfulBasis) return { gate: 'lawful_basis', reason: 'Personal data requires a stated lawful basis (POPIA s11).' };
  return null;
}

export type InputVerdict =
  | { ok: true; clean: Deidentified; injection: InjectionFinding[] }
  | { ok: false; refusal: 'injection' | 'learner_data'; injection?: InjectionFinding[]; pii?: PiiFinding[] };

export function checkInput(text: string, sources: string[], knownNames: string[] = []): InputVerdict {
  const injection = detectInjection(text);
  if (injection.length) return { ok: false, refusal: 'injection', injection };
  try {
    return { ok: true, clean: deidentify(text, sources, knownNames), injection };
  } catch (e) {
    if (e instanceof LearnerDataRefused) return { ok: false, refusal: 'learner_data', pii: e.findings };
    throw e;
  }
}

export interface OutputVerdict {
  text: string;
  claims: ClaimResult;
  piiRedacted: number;
  flags: string[];
}

export function checkOutput(text: string, allowedNumbers: Iterable<string | number>, knownNames: string[] = []): OutputVerdict {
  const pii = detectPii(text, knownNames).filter((f) => f.kind !== 'titled_name' || false);
  let redacted = text;
  for (const f of [...pii].sort((a, b) => b.start - a.start)) redacted = redacted.slice(0, f.start) + `[REDACTED_${f.kind.toUpperCase()}]` + redacted.slice(f.end);
  const claims = enforceSourcing(redacted, allowedNumbers);
  const flags: string[] = [];
  if (pii.length) flags.push(`pii_echo:${pii.length}`);
  if (claims.stripped.length) flags.push(`unsourced_claims:${claims.stripped.length}`);
  return { text: claims.text, claims, piiRedacted: pii.length, flags };
}
