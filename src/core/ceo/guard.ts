import { checkInput } from '../guardrails/engine';
import { detectPii } from '../guardrails/pii';
import { isDate } from './time';
import { DEPARTMENTS } from '../../departments';
import type { ManualTask } from './types';

/** Task and event text passes the same input gate as agent input: no learner identifiers, no instructions aimed at the platform. */
export function checkTaskText(...parts: (string | undefined)[]): string | null {
  const text = parts.filter(Boolean).join('\n');
  if (!text) return null;
  // An ID number is tokenised by the de-identifier, but a task list is stored and shown as typed, so it is refused outright.
  if (detectPii(text).some((f) => f.kind === 'sa_id')) return 'That text contains an ID number, so it was refused.';
  const v = checkInput(text, ['ceo:text']);
  if (v.ok) return null;
  return v.refusal === 'injection' ? 'That text reads like an instruction to the platform, so it was refused.' : 'That text contains a learner identifier, so it was refused.';
}

export const MAX_TITLE = 200;
export const MAX_NOTES = 1000;
const ID = /^[A-Za-z0-9._:-]{1,100}$/;

export type Parsed<T> = { ok: true; value: T } | { ok: false; error: string };

/** The inbound webhook body. Strict: unknown fields are refused, and an outside system can never say "no person needed". */
export function parseInbound(body: unknown, newId: () => string): Parsed<ManualTask> {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return { ok: false, error: 'body must be a JSON object' };
  const b = body as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => !['externalId', 'title', 'dept', 'due', 'notes'].includes(k));
  if (extra.length) return { ok: false, error: `unknown field: ${extra[0]}` };
  if (typeof b['title'] !== 'string' || !b['title'].trim() || b['title'].length > MAX_TITLE) return { ok: false, error: `title is required (up to ${MAX_TITLE} characters)` };
  if (b['externalId'] !== undefined && (typeof b['externalId'] !== 'string' || !ID.test(b['externalId']))) return { ok: false, error: 'externalId must be 1-100 letters, digits or . _ : -' };
  if (b['dept'] !== undefined && !DEPARTMENTS.some((d) => d.id === b['dept'])) return { ok: false, error: 'dept is not a department id' };
  if (b['due'] !== undefined && !isDate(b['due'])) return { ok: false, error: 'due must be YYYY-MM-DD' };
  if (b['notes'] !== undefined && (typeof b['notes'] !== 'string' || b['notes'].length > MAX_NOTES)) return { ok: false, error: `notes must be text up to ${MAX_NOTES} characters` };
  const refused = checkTaskText(b['title'], b['notes'] as string | undefined);
  if (refused) return { ok: false, error: refused };
  return { ok: true, value: { id: `in_${(b['externalId'] as string | undefined) ?? newId()}`, title: b['title'].trim(), dept: (b['dept'] as string | undefined) ?? 'executive', due: b['due'] as string | undefined, notes: b['notes'] as string | undefined, source: 'inbound', kind: 'action', requiresHuman: true } };
}
