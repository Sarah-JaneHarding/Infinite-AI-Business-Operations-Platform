import { DEPARTMENTS, agentById } from '../departments';
import type { Rec } from '../core/warehouse';

export const MAX_RECORD_BYTES = 256 * 1024;
export const MAX_RECORDS = 20_000;
const CORE = ['ledger', 'brain', 'artefact_versions', 'runs', 'approvals', 'tombstones'];
/** Document library, builder definitions, chat history and integration settings (no secrets are ever stored here). */
const LIBRARY = ['documents', 'document_chunks', 'custom_defs', 'chat_log', 'integration_settings'];
/** Collections behind widgets made in the widget builder. */
export const CUSTOM_WIDGET_COLLECTION = /^cw_[a-z0-9_]{1,40}$/;

/** Only these collections can be appended to by a client. `connector_events` is written by the server alone. */
export const CLIENT_COLLECTIONS: ReadonlySet<string> = new Set([
  ...CORE,
  ...LIBRARY,
  ...DEPARTMENTS.flatMap((d) => d.widgets).flatMap((w) => ('collection' in w ? [w.collection] : [])),
]);

export class Rejected extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}
const bad = (message: string, status = 400): never => {
  throw new Rejected(status, message);
};

export interface ReadStore { list(collection: string): readonly Rec[] }
/** `actor` is the authenticated user, or null in open dev mode (identity is then only what the client claims). */
export interface AppendCtx { actor: string | null; store: ReadStore }

const latestById = (rows: readonly Rec[], id: unknown) => rows.filter((r) => r.id === id).at(-1);
const isHash = (v: unknown) => typeof v === 'string' && /^[0-9a-f]{64}$/.test(v);

/**
 * Server-side rules for every client append. The browser runs the Platform, so none of its checks can be trusted
 * on their own; this re-checks the ones that matter (the approval gate, the Brain constitution; the ledger is not client-appendable at all).
 */
export async function validateAppend(collection: string, body: unknown, ctx: AppendCtx): Promise<Rec> {
  if (collection === 'ledger') bad('ledger entries are authored by the server: POST /api/ledger', 403);
  if (!CLIENT_COLLECTIONS.has(collection) && !CUSTOM_WIDGET_COLLECTION.test(collection)) bad('unknown collection', 404);
  if (typeof body !== 'object' || body === null || Array.isArray(body)) bad('record must be an object');
  const rec = body as Rec;
  if (typeof rec.id !== 'string' || rec.id.length < 1 || rec.id.length > 200) bad('record needs a string id (1-200 chars)');
  if (JSON.stringify(rec).length > MAX_RECORD_BYTES) bad('record too large', 413);
  if (ctx.store.list(collection).length >= MAX_RECORDS) bad('collection is full', 507);

  switch (collection) {
    case 'artefact_versions': artefact(rec, ctx); break;
    case 'approvals': approval(rec, ctx); break;
    case 'brain': brain(rec, ctx); break;
    case 'tombstones': if (!isHash(rec.subjectHash)) bad('tombstone needs a subjectHash (sha-256 hex)'); break;
  }
  return rec;
}

function artefact(rec: Rec, ctx: AppendCtx) {
  const status = rec.status;
  if (status !== 'DRAFT' && status !== 'IN_REVIEW' && status !== 'APPROVED' && status !== 'REJECTED') bad('bad artefact status');
  const customIds = new Set(ctx.store.list('custom_defs').filter((d) => d.kind === 'agent' && !d.deleted).map((d) => d.id));
  if (typeof rec.agentId !== 'string' || !(agentById(rec.agentId) || customIds.has(rec.agentId))) bad('unknown agent');
  if (status !== 'APPROVED' && status !== 'REJECTED' && rec.approvedBy !== undefined) bad('only a decision carries approvedBy');
  const cur = latestById(ctx.store.list('artefact_versions'), rec.id);

  if (!cur) {
    if (status !== 'DRAFT' || rec.version !== 1) bad('a new artefact starts as DRAFT v1');
    if (ctx.actor && rec.requestedBy !== ctx.actor) bad('requestedBy is not you', 403);
    return;
  }
  if (rec.requestedBy !== cur.requestedBy || rec.agentId !== cur.agentId || rec.orgId !== cur.orgId) bad('requestedBy, agent and org cannot change');
  const sameDoc = rec.docHash === cur.docHash && rec.version === cur.version;

  if (status === 'DRAFT') {
    if (rec.version !== Number(cur.version) + 1) bad('an edit is a new version');
  } else if (cur.status === 'DRAFT' && status === 'IN_REVIEW') {
    if (!sameDoc) bad('submitting for review cannot change the document');
  } else if (cur.status === 'IN_REVIEW' && (status === 'APPROVED' || status === 'REJECTED')) {
    if (!sameDoc) bad('a decision cannot change the document');
    const approver = rec.approvedBy;
    if (typeof approver !== 'string' || !approver) bad('a decision needs approvedBy');
    if (ctx.actor && approver !== ctx.actor) bad('approvedBy is not you', 403);
    if ((agentById(String(cur.agentId))?.secondApprover || customIds.has(String(cur.agentId))) && approver === cur.requestedBy) bad('this agent requires a second person to approve', 403);
    if (status === 'REJECTED' && !String(rec.note ?? '').trim()) bad('a rejection needs a reason');
  } else {
    bad(`cannot go from ${String(cur.status)} to ${status}`, 409);
  }
}

function approval(rec: Rec, ctx: AppendCtx) {
  const art = latestById(ctx.store.list('artefact_versions'), rec.artefactId);
  if (!art || art.status !== rec.decision || art.approvedBy !== rec.approver) bad('approval does not match a recorded decision', 409);
  if (ctx.actor && rec.approver !== ctx.actor) bad('approver is not you', 403);
}

function brain(rec: Rec, ctx: AppendCtx) {
  const tier = rec.tier;
  if (tier !== 'L1' && tier !== 'L2' && tier !== 'L3' && tier !== 'L4') bad('L0 is the constitution and cannot be written', 403);
  const p = rec.provenance as { deidentified?: unknown; sources?: unknown } | undefined;
  if (p?.deidentified !== true || !Array.isArray(p.sources) || !p.sources.length) bad('Brain refuses facts that are not de-identified and sourced');
  if (rec.status === 'ratified' && (tier === 'L3' || tier === 'L4')) {
    // The only way a procedure or learned policy becomes ratified is a human superseding a proposed fact.
    const from = typeof rec.supersedes === 'string' ? ctx.store.list('brain').filter((f) => f.id === rec.supersedes).at(-1) : undefined;
    if (!from || from.status !== 'proposed') bad('L3/L4 facts are ratified only by a human ratifying a proposed fact', 403);
    if (ctx.actor && rec.by !== ctx.actor) bad('ratifier is not you', 403);
  }
}
