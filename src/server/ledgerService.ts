import { canonical, sha256Hex } from '../core/crypto';
import type { LedgerEntry } from '../core/types';
import type { Rec } from '../core/warehouse';
import { MAX_RECORDS, Rejected, type ReadStore } from './validate';

const GENESIS = '0'.repeat(64);
const MAX_DETAIL_BYTES = 16 * 1024;
const short = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 200;

export interface LedgerStore extends ReadStore { append(collection: string, rec: Rec): void }
export interface LedgerResult { entry: LedgerEntry; earlier: LedgerEntry[] }

const strip = (r: Rec): LedgerEntry => {
  const { id: _id, ...e } = r;
  return e as unknown as LedgerEntry;
};

/**
 * The server is the only author of ledger entries: it assigns `seq`, `prevHash`, `hash` and the time, so the chain
 * cannot fork or be forged by a client. Calls on one store run one at a time (read tip → hash → write must not
 * interleave), whoever the caller is. `knownSeq` is the newest entry the client has; everything it missed is returned
 * so a second writer catches up instead of forking.
 */
export function appendLedger(store: LedgerStore, input: unknown, knownSeq: unknown, actor: string | null, now: () => string = () => new Date().toISOString()): Promise<LedgerResult> {
  const run = (tails.get(store) ?? Promise.resolve()).then(() => write(store, input, knownSeq, actor, now));
  tails.set(store, run.catch(() => undefined));
  return run;
}

const tails = new WeakMap<object, Promise<unknown>>();

async function write(store: LedgerStore, input: unknown, knownSeq: unknown, actor: string | null, now: () => string = () => new Date().toISOString()): Promise<LedgerResult> {
  const bad = (m: string, status = 400): never => {
    throw new Rejected(status, m);
  };
  if (typeof input !== 'object' || input === null || Array.isArray(input)) bad('ledger input must be an object');
  const i = input as Record<string, unknown>;
  if (!short(i.orgId) || !short(i.actor) || !short(i.action) || !short(i.subject)) bad('orgId, actor, action and subject are required strings (1-200 chars)');
  const detail = i.detail ?? {};
  if (typeof detail !== 'object' || detail === null || Array.isArray(detail) || JSON.stringify(detail).length > MAX_DETAIL_BYTES) bad('detail must be a small object');
  const action = i.action as string;
  const who = i.actor as string;
  const subject = i.subject as string;

  // Human acts are recorded under the authenticated person, never a name the client picked.
  if (actor && /^(hitl|artefact|subject|erasure)\./.test(action) && who !== actor) bad('ledger actor is not you', 403);
  // A decision or submission is only ledgered if the warehouse already holds the matching state.
  const art = store.list('artefact_versions').filter((r) => r.id === subject).at(-1);
  if (/^hitl\.(approved|rejected)$/.test(action) && (art?.status !== action.slice(5).toUpperCase() || art.approvedBy !== who)) bad('no recorded decision matches this ledger entry', 409);
  if (action === 'artefact.submit' && art?.status !== 'IN_REVIEW') bad('artefact is not in review', 409);
  // Erasure acts are only ledgered when the warehouse holds the matching state, by the same person.
  const er = store.list('erasure_requests').filter((r) => r.id === subject).at(-1);
  if (action === 'erasure.requested' && (er?.status !== 'REQUESTED' || er.requestedBy !== who)) bad('no recorded erasure request matches this ledger entry', 409);
  if (/^erasure\.(approved|rejected)$/.test(action)) {
    const want = action === 'erasure.approved' ? ['APPROVED', 'EXECUTED'] : ['REJECTED']; // approval is ledgered before the tombstone is applied, but a retry may come after
    if (!er || !want.includes(er.status as string) || er.decidedBy !== who) bad('no recorded erasure decision matches this ledger entry', 409);
  }
  if (action === 'subject.tombstone' && !store.list('tombstones').some((t) => t.id === subject)) bad('no recorded tombstone matches this ledger entry', 409);

  const ledger = store.list('ledger');
  if (ledger.length >= MAX_RECORDS) bad('collection is full', 507);
  const last = ledger.at(-1);
  const lastSeq = Number(last?.seq ?? 0);
  if (typeof knownSeq !== 'number' || !Number.isInteger(knownSeq) || knownSeq < 0 || knownSeq > lastSeq) bad('knownSeq is not a position in the ledger');

  const base = { seq: lastSeq + 1, at: now(), orgId: i.orgId as string, actor: who, action, subject, detail: detail as Record<string, unknown>, prevHash: (last?.hash as string | undefined) ?? GENESIS };
  const entry: LedgerEntry = { ...base, hash: await sha256Hex(canonical(base)) };
  store.append('ledger', { ...entry, id: `L${entry.seq}` } as unknown as Rec);
  return { entry, earlier: ledger.filter((r) => Number(r.seq) > (knownSeq as number) && Number(r.seq) < entry.seq).map(strip) };
}
