import { timingSafeEqual } from 'node:crypto';
import type { Rec } from '../core/warehouse';
import { agentById, DEPARTMENTS } from '../departments';
import { buildCeoState, toIcs } from '../core/ceo';

/** The calendar feed token is a shared secret in the URL (calendar apps cannot send headers). It must be long, and is compared in constant time. */
export const MIN_TOKEN = 24;
export function tokenOk(expected: string | undefined, given: unknown): boolean {
  if (!expected || expected.length < MIN_TOKEN || typeof given !== 'string' || given.length !== expected.length) return false;
  return timingSafeEqual(Buffer.from(expected), Buffer.from(given));
}

export const ceoStateFromStore = (all: Record<string, readonly Rec[]>, now = Date.now()) =>
  buildCeoState({ departments: DEPARTMENTS, collections: all, agentSecondApprover: (id) => Boolean(agentById(id)?.secondApprover), now });

export function calendarFeed(all: Record<string, readonly Rec[]>, now = Date.now()): string {
  const s = ceoStateFromStore(all, now);
  return toIcs(s.blocks, s.events, now);
}

/** Collections the dashboard needs, so a refresh fetches these and not the document library. */
export const CEO_COLLECTIONS: string[] = [...new Set([...DEPARTMENTS.flatMap((d) => d.widgets).flatMap((w) => ('collection' in w ? [w.collection] : [])), 'artefact_versions', 'ceo_tasks', 'ceo_task_state', 'ceo_events'])];
