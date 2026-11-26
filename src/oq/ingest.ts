import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { Rec } from '../core/warehouse';
import { OQ_REPOS, OQ_STATUSES, type OqRepo, type OqStatus, type Question } from './types';

export const SEED_PATH = join('docs', 'open-questions-register', 'questions.seed.json');
const ID = /^[A-Za-z0-9._-]{2,40}$/;
const str = (v: unknown, max: number) => typeof v === 'string' && v.length <= max;

/** Strict: a malformed row is named and refused, never silently dropped. Unknown fields are ignored (the live register carries history and review). */
export function parseSeed(raw: unknown): { ok: true; questions: Question[] } | { ok: false; error: string } {
  if (!Array.isArray(raw)) return { ok: false, error: 'seed must be a list of questions' };
  const seen = new Set<string>();
  const out: Question[] = [];
  for (const [i, r] of raw.entries()) {
    const q = r as Record<string, unknown>;
    const at = `row ${i + 1}`;
    if (typeof q?.id !== 'string' || !ID.test(q.id)) return { ok: false, error: `${at}: bad id` };
    if (seen.has(q.id)) return { ok: false, error: `${at}: duplicate id ${q.id}` };
    seen.add(q.id);
    if (!OQ_REPOS.includes(q.repo as OqRepo)) return { ok: false, error: `${q.id}: repo must be one of ${OQ_REPOS.join(', ')}` };
    if (!OQ_STATUSES.includes(q.status as OqStatus)) return { ok: false, error: `${q.id}: bad status` };
    if (!str(q.title, 300) || !q.title || !str(q.question, 4000) || !q.question || !str(q.reason, 4000)) return { ok: false, error: `${q.id}: title, question and reason must be text` };
    const options = Array.isArray(q.options) ? q.options : [];
    if (!options.every((o) => str(o, 300))) return { ok: false, error: `${q.id}: options must be text` };
    const ri = q.recommendedIndex;
    if (ri != null && (!Number.isInteger(ri) || (ri as number) < 0 || (ri as number) >= options.length)) return { ok: false, error: `${q.id}: recommendedIndex is outside the options` };
    out.push({
      id: q.id, repo: q.repo as OqRepo, order: typeof q.order === 'number' ? q.order : 0, title: q.title as string, stage: str(q.stage, 80) ? (q.stage as string) : '',
      raised: str(q.raised, 40) ? (q.raised as string) : '', status: q.status as OqStatus, blocks: str(q.blocks, 500) ? (q.blocks as string) : '', question: q.question as string,
      reason: q.reason as string, suggestions: Array.isArray(q.suggestions) ? q.suggestions.filter((s): s is string => typeof s === 'string') : [],
      recommendation: str(q.recommendation, 4000) ? (q.recommendation as string) : '', options: options as string[], recommendedIndex: (ri as number | null | undefined) ?? null,
      source: str(q.source, 300) ? (q.source as string) : '',
    });
  }
  return { ok: true, questions: out };
}

export function loadSeed(root = process.cwd()): Question[] {
  const p = parseSeed(JSON.parse(readFileSync(join(root, SEED_PATH), 'utf8')));
  if (!p.ok) throw new Error(`question seed: ${p.error}`);
  return p.questions;
}

export interface QStore { list(c: string): readonly Rec[]; append(c: string, r: Rec): void }

/** Newest row per id. The collection is append-only, so a question's history is every row it ever had. */
export function currentQuestions(store: Pick<QStore, 'list'>): Question[] {
  const m = new Map<string, Question>();
  for (const r of store.list('oq_questions')) m.set(r.id, r as unknown as Question);
  return [...m.values()].sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
}

/** Idempotent: a question already held is never overwritten, so a decision recorded here survives a re-ingest. Returns the ids added. */
export function ingest(store: QStore, seed: Question[], by: string, at = new Date().toISOString()): { added: string[]; kept: number } {
  const have = new Set(store.list('oq_questions').map((r) => r.id));
  const added: string[] = [];
  for (const q of seed) {
    if (have.has(q.id)) continue;
    store.append('oq_questions', { ...q, ingestedBy: by, ingestedAt: at } as unknown as Rec);
    added.push(q.id);
  }
  return { added, kept: have.size };
}
