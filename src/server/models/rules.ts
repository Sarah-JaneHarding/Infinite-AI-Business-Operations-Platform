import { PURPOSES, type Provenance, type Purpose } from '../../core/types';
import { detectPii } from '../../core/guardrails/pii';
import { detectInjection } from '../../core/guardrails/injection';
import { checkOutput } from '../../core/guardrails/engine';

/**
 * The model rules. They are code, not configuration: they apply identically to every provider and every model,
 * configuration can only tighten them (a smaller budget, a narrower tool allow-list), and the only code that can reach a
 * provider is ModelHub, which runs them. A test fails if anything else imports a provider client.
 */
export const RULES = [
  { id: 'M1', title: 'Provenance first', text: 'Every request must carry a de-identified stamp with its sources. An unstamped payload is refused even when the detector finds nothing.' },
  { id: 'M2', title: 'No personal data or injection in any prompt', text: 'The system text, the prompt, every history message and every tool result are scanned. Names with titles, emails, phone numbers, ID numbers and learner identifiers are refused; instruction-override patterns are refused.' },
  { id: 'M3', title: 'Purpose limitation', text: 'A request declares one purpose from the closed list, and when it comes from an agent the purpose must be one that agent is contracted for.' },
  { id: 'M4', title: 'Size limits', text: 'Input, history, tool results, tool turns and output are capped, so a request cannot be used to move bulk data to a provider.' },
  { id: 'M5', title: 'A human must attest each provider and model', text: 'A provider cannot be used until a named person has attested that they reviewed its terms for the exact model configured. Changing the model requires a new attestation. If an agent\'s contract lists the providers it may use, only those are tried. There is no override.' },
  { id: 'M6', title: 'Rate and daily budget', text: 'Each user is rate limited and each provider has a daily call budget, counted from the audit ledger so a restart does not reset it.' },
  { id: 'M7', title: 'Every call is audited, and the audit comes first', text: 'A ledger entry is written before the provider is called and another after it answers, refuses or fails. They record who, which model, purpose, sizes and a hash of the prompt, never its content. If the ledger cannot be written the call is not made.' },
  { id: 'M8', title: 'Output is always a draft', text: 'Model output is scanned for personal data and has unsourced figures stripped. It is returned marked as a draft and nothing in this module can approve, ratify or ingest it.' },
  { id: 'M9', title: 'Tools see only what is allowed, and only de-identified', text: 'Tools read an allow-list of collections that is empty by default, can never include the ledger, erasure records, integration settings or approvals, and every tool result is scanned before it reaches the model.' },
  { id: 'M10', title: 'One door', text: 'The model hub is the only code that can call a model provider. Keys stay on the server and are never returned by any API.' },
] as const;
export type RuleId = (typeof RULES)[number]['id'];

export const LIMITS = {
  maxInputChars: 20_000,
  maxHistory: 6,
  maxToolResultChars: 12_000,
  maxToolTurns: 3,
  maxOutputTokens: 1_024,
} as const;

/** Collections a tool may never read for a model, whatever the configuration says. */
export const NEVER_MODEL_READABLE: ReadonlySet<string> = new Set(['ledger', 'tombstones', 'erasure_requests', 'integration_settings', 'chat_log', 'connector_events', 'approvals', 'brain', 'model_attestations', 'custom_defs', 'standing_orders', 'draft_checks']);

export class ModelRefused extends Error {
  constructor(public readonly rule: RuleId, message: string, public readonly status = 422) {
    super(message);
  }
}

export type Capability = 'complete' | 'copilot' | 'recommend' | 'self-test';
export interface HistoryMessage { role: 'user' | 'assistant'; text: string }
export interface ModelRequest {
  capability: Capability;
  purpose: Purpose;
  system: string;
  prompt: string;
  history: HistoryMessage[];
  provenance: Provenance | undefined;
  actor: string | null;
  /** The contracted agent, when the request comes from one. */
  agentId?: string;
  agentPurposes?: readonly Purpose[];
  /** Providers the agent's contract allows. Absent means any attested provider (rule M5). */
  agentProviders?: readonly string[];
  json?: boolean;
}

/** M1 → M3 → M4 → M2, in that order. Throws ModelRefused. Never includes the offending text in the message. */
export function checkRequest(req: ModelRequest): void {
  const p = req.provenance;
  if (!p || p.deidentified !== true || !Array.isArray(p.sources) || !p.sources.length || p.sources.some((s) => typeof s !== 'string' || !s)) {
    throw new ModelRefused('M1', 'Refused: the payload is not stamped de-identified with sources.');
  }
  if (!PURPOSES.includes(req.purpose)) throw new ModelRefused('M3', 'Refused: the purpose is not on the closed purpose list.');
  if (req.agentPurposes && !req.agentPurposes.includes(req.purpose)) throw new ModelRefused('M3', `Refused: purpose "${req.purpose}" is not permitted for agent ${req.agentId ?? ''}.`.replace(' .', '.'));

  if (typeof req.system !== 'string' || typeof req.prompt !== 'string' || !req.prompt.trim()) throw new ModelRefused('M4', 'Refused: a prompt is required.', 400);
  if (!Array.isArray(req.history) || req.history.length > LIMITS.maxHistory || req.history.some((h) => (h.role !== 'user' && h.role !== 'assistant') || typeof h.text !== 'string')) throw new ModelRefused('M4', `Refused: history must be at most ${LIMITS.maxHistory} messages of text.`, 400);
  const total = req.system.length + req.prompt.length + req.history.reduce((n, h) => n + h.text.length, 0);
  if (total > LIMITS.maxInputChars) throw new ModelRefused('M4', `Refused: input exceeds ${LIMITS.maxInputChars} characters.`, 400);

  const texts = [req.system, req.prompt, ...req.history.map((h) => h.text)];
  const found = texts.flatMap((t) => detectPii(t));
  if (found.some((f) => f.kind === 'learner_identifier')) throw new ModelRefused('M2', 'Refused: learner-level identifiers are never sent to a model.');
  if (found.length) throw new ModelRefused('M2', `Refused: personal data detected (${[...new Set(found.map((f) => f.kind))].join(', ')}). Remove it and retry.`);
  // The system text is ours; user-controlled text (prompt and history) is checked for instruction-override patterns.
  if ([req.prompt, ...req.history.map((h) => h.text)].some((t) => detectInjection(t).length)) throw new ModelRefused('M2', 'Refused: the text looks like an attempt to override platform controls.');
}

/** M9: a tool result goes to the model only if it is small and clean. Returns the reason it was withheld, or null. */
export function checkToolResult(result: unknown): string | null {
  const s = JSON.stringify(result) ?? '';
  if (s.length > LIMITS.maxToolResultChars) return 'result too large; narrow the query';
  const found = detectPii(s);
  if (found.some((f) => f.kind === 'learner_identifier')) return 'withheld: contained learner-level identifiers';
  if (found.length) return `withheld: contained personal data (${[...new Set(found.map((f) => f.kind))].join(', ')})`;
  return null;
}

const numbersIn = (s: string) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, ''));

/** M8: personal data echoed by the model is redacted and figures that appear nowhere in the inputs are stripped. */
export function checkModelOutput(text: string, inputs: string[]): { text: string; flags: string[] } {
  const allowed = inputs.flatMap(numbersIn);
  const o = checkOutput(text, allowed, []);
  return { text: o.text, flags: o.flags };
}
