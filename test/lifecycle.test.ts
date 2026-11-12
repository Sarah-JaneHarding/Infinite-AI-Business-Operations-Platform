import { describe, expect, it } from 'vitest';
import { Platform, RunRefused, type Artefact } from '../src/core/platform';
import { MemoryAdapter, Warehouse, type Rec } from '../src/core/warehouse';
import { AGENTS } from '../src/departments';
import { Rejected, validateAppend, type ReadStore } from '../src/server/validate';
import { appendLedger, type LedgerStore } from '../src/server/ledgerService';
import type { Actor } from '../src/core/types';

const human = (id: string): Actor => ({ id, name: id, kind: 'human', roles: ['Founder'] });
const [sarah, dan, eve] = [human('sarah'), human('dan'), human('eve')];
const bot: Actor = { id: 'bot', name: 'bot', kind: 'agent', roles: [] };
const plain = AGENTS.find((a) => !a.secondApprover)!;
const strict = AGENTS.find((a) => a.secondApprover)!;
const inputsFor = (a: typeof plain) => Object.fromEntries(a.inputs.map((i) => [i.key, i.kind === 'number' ? '5' : i.kind === 'select' ? i.options![0]! : 'Pilot school onboarding process']));
const refused = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as RunRefused | null;

/** A draft that a reviewer has approved. */
async function approved(p: Platform, agent = plain, author = sarah, reviewer = dan) {
  const a = await p.runAgent(agent, inputsFor(agent), author);
  await p.submitForReview(a.id, author);
  await p.decide(a.id, reviewer, 'APPROVED', 'looks right', agent);
  return p.artefact(a.id)!;
}

describe('the board: approve → countersign → ratify → ingest', () => {
  it('a different person countersigns, which ratifies and ingests it into the library and the Brain, in order', async () => {
    const p = await new Platform().init();
    const a = await approved(p);
    expect(a.status).toBe('APPROVED');
    const done = await p.countersign(a.id, eve, 'Checked the sources', plain);
    expect(done).toMatchObject({ status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'eve' });
    expect(done.docHash).toMatch(/^[0-9a-f]{64}$/);

    const lib = p.warehouse.list<Rec & { origin: string; ratifiedFrom: { docHash: string } }>('documents');
    expect(lib).toHaveLength(1);
    expect(lib[0]).toMatchObject({ id: `rat_${a.id}_v1`, origin: 'ratified', ratifiedFrom: { docHash: done.docHash, approvedBy: 'dan', countersignedBy: 'eve' } });
    const episode = p.brain.all.find((f) => f.topic === `ratified.${plain.id}`);
    expect(episode).toMatchObject({ tier: 'L2', status: 'ratified', provenance: { deidentified: true } });
    expect(episode?.provenance.sources[0]).toContain(`artefact:${a.id}@`);

    const acts = p.ledger.all.map((e) => e.action);
    const order = ['hitl.approved', 'artefact.countersigned', 'artefact.ratified', 'brain.remember', 'artefact.ingested'].map((x) => acts.lastIndexOf(x));
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((x, y) => x - y)).toEqual(order); // the board's steps are recorded in sequence
    expect(await p.ledger.verify()).toBeNull();
    expect(p.warehouse.list('countersignatures')).toHaveLength(1);
  });

  it('refuses a countersignature from the approver, a bot, an autonomous actor, or on anything but an approved artefact', async () => {
    const p = await new Platform().init();
    const a = await approved(p);
    expect((await refused(p.countersign(a.id, dan, '', plain)))?.message).toMatch(/different person from the approver/);
    expect((await refused(p.countersign(a.id, bot, '', plain)))?.message).toMatch(/named human/);
    expect((await refused(p.countersign(a.id, { ...eve, id: 'auto:weekly-digest' }, '', plain)))?.message).toMatch(/named human/);
    expect((await refused(p.countersign(a.id, eve, 'x'.repeat(301), plain)))?.message).toMatch(/300/);
    expect(p.artefact(a.id)?.status).toBe('APPROVED'); // nothing changed
    const draft = await p.runAgent(plain, inputsFor(plain), sarah);
    expect((await refused(p.countersign(draft.id, eve, '', plain)))?.message).toMatch(/approved artefact/);
    await p.submitForReview(draft.id, sarah);
    expect((await refused(p.countersign(draft.id, eve, '', plain)))?.message).toMatch(/approved artefact/); // in review is not enough
  });

  it('works with two people: the author may be one signer, but nobody signs twice; an agent that needs a second approver still does', async () => {
    const p = await new Platform().init();
    const a = await approved(p, plain, sarah, dan);
    await expect(p.countersign(a.id, sarah, 'author countersigns', plain)).resolves.toMatchObject({ status: 'INGESTED', countersignedBy: 'sarah' });
    const s = await p.runAgent(strict, inputsFor(strict), sarah);
    await p.submitForReview(s.id, sarah);
    expect((await refused(p.decide(s.id, sarah, 'APPROVED', '', strict)))?.message).toMatch(/second person/);
  });

  it('an edit voids the signatures: it returns to DRAFT and has to be reviewed and countersigned again', async () => {
    const p = await new Platform().init();
    const a = await approved(p);
    const edited = await p.edit(a.id, { ...a.doc, title: 'Reworded title' }, dan);
    expect(edited).toMatchObject({ status: 'DRAFT', version: 2, approvedBy: undefined });
    expect((await refused(p.countersign(a.id, eve, '', plain)))?.message).toMatch(/approved artefact/);
    expect(p.history(a.id).map((h) => h.status)).toEqual(expect.arrayContaining(['APPROVED', 'DRAFT']));
  });

  it('ratified output is final: it cannot be edited, only revised into a new draft that goes through the board again', async () => {
    const p = await new Platform().init();
    const a = await approved(p);
    const done = await p.countersign(a.id, eve, '', plain);
    expect((await refused(p.edit(a.id, { ...done.doc, title: 'Sneaky' }, sarah)))?.message).toMatch(/final/);
    const rev = await p.revise(a.id, sarah);
    expect(rev).toMatchObject({ status: 'DRAFT', version: 1, revisionOf: a.id, requestedBy: 'sarah' });
    for (const k of ['approvedBy', 'countersignedBy', 'ratifiedAt', 'ingestedAt'] as const) expect(rev[k], k).toBeUndefined(); // no signature carries over
    expect(rev.id).not.toBe(a.id);
    expect(p.artefact(a.id)?.status).toBe('INGESTED'); // the ratified original is untouched
    expect((await refused(p.revise(rev.id, sarah)))?.message).toMatch(/ratified artefact needs a revision/);
    expect((await refused(p.revise(a.id, bot)))?.message).toMatch(/named human/);
  });

  it('skips ingestion when the agent contract says it is not relevant: ratified, no library document, no Brain episode', async () => {
    const p = await new Platform().init();
    const none = { ...plain, ingestion: 'none' as const };
    const a = await approved(p, none);
    const done = await p.countersign(a.id, eve, '', none);
    expect(done.status).toBe('RATIFIED');
    expect(p.warehouse.list('documents')).toHaveLength(0);
    expect(p.brain.all.some((f) => f.topic.startsWith('ratified.'))).toBe(false);
    expect((await refused(p.revise(a.id, sarah))) ).toBeNull(); // a ratified artefact can still be revised
  });

  it('if ingesting fails after ratification, it stays ratified and a retry completes it once, with no duplicates', async () => {
    const adapter = new MemoryAdapter();
    let failDocs = true;
    const orig = adapter.append.bind(adapter);
    adapter.append = async (c: string, r: Rec) => { if (c === 'documents' && failDocs) throw new Error('disk full'); return orig(c, r); };
    const p = await new Platform({ adapter }).init();
    const a = await approved(p);
    await expect(p.countersign(a.id, eve, '', plain)).rejects.toThrow(/disk full/);
    expect(p.artefact(a.id)).toMatchObject({ status: 'RATIFIED', countersignedBy: 'eve' }); // the signatures stand
    expect(p.warehouse.list('documents')).toHaveLength(0); // no phantom record from the failed save
    failDocs = false;
    expect((await p.ingest(a.id, eve)).status).toBe('INGESTED');
    expect((await p.ingest(a.id, eve)).status).toBe('INGESTED'); // repeating is safe
    expect(p.warehouse.list('documents')).toHaveLength(1);
    expect(p.brain.all.filter((f) => f.topic === `ratified.${plain.id}`)).toHaveLength(1);
    expect((await refused(p.ingest(a.id, bot)))?.message).toMatch(/named human/);
  });

  it('survives a reload: ratified and ingested state, the library document and the Brain episode all come back', async () => {
    const adapter = new MemoryAdapter();
    const p1 = await new Platform({ adapter }).init();
    const a = await approved(p1);
    await p1.countersign(a.id, eve, '', plain);
    await p1.flush();
    const p2 = await new Platform({ adapter }).init();
    expect(p2.artefact(a.id)).toMatchObject({ status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'eve' });
    expect(p2.warehouse.list('documents')).toHaveLength(1);
    expect(p2.brain.all.some((f) => f.topic === `ratified.${plain.id}`)).toBe(true);
  });
});

describe('Warehouse: a failed save leaves no phantom record', () => {
  it('rolls the record back out of the local view', async () => {
    const a = new MemoryAdapter();
    a.append = async () => { throw new Error('nope'); };
    const w = new Warehouse(a);
    await expect(w.put('x', { id: '1' })).rejects.toThrow('nope');
    await expect(w.putRaw('x', { id: '2' })).rejects.toThrow('nope');
    expect(w.list('x')).toEqual([]);
  });
});

// ---------------------------------------------------------------------- the server's rules
type Row = Record<string, unknown>;
const H = 'a'.repeat(64);
const store = (rows: Record<string, Row[]> = {}): ReadStore & LedgerStore => ({ list: (c) => (rows[c] ?? []) as unknown as Rec[], append: (c, r) => void (rows[c] ??= []).push(r as Row) });
const art = (o: Row = {}): Rec => ({ id: 'art_1', orgId: 'infinite-ai', agentId: plain.id, status: 'DRAFT', version: 1, requestedBy: 'sarah', docHash: H, ...o }) as Rec;
const chain = (...states: Row[]): Rec[] => states.map((s) => art(s));
const rej = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as Rejected | null;
const V = (rows: Record<string, Row[]>, rec: Rec, actor: string | null, c = 'artefact_versions') => validateAppend(c, rec, { actor, store: store(rows) });

describe('the server enforces the board', () => {
  const approvedRows = { artefact_versions: chain({}, { status: 'IN_REVIEW' }, { status: 'APPROVED', approvedBy: 'dan' }) as unknown as Row[] };
  const ratify = (o: Row = {}) => art({ status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't', ...o });

  it('accepts a countersignature by a different caller on exactly the approved content', async () => {
    await expect(V(approvedRows, ratify(), 'eve')).resolves.toBeDefined();
  });

  it('rejects ratifying as the approver, as someone else, as an autonomous actor, with changed content, or from the wrong state', async () => {
    expect((await rej(V(approvedRows, ratify({ countersignedBy: 'dan' }), 'dan')))?.status).toBe(403);
    expect((await rej(V(approvedRows, ratify(), 'sarah')))?.status).toBe(403); // countersignedBy is not the caller
    expect((await rej(V(approvedRows, ratify({ countersignedBy: 'auto:digest' }), 'auto:digest')))?.status).toBe(403);
    expect((await rej(V(approvedRows, ratify({ docHash: 'b'.repeat(64) }), 'eve')))?.message).toMatch(/cannot change the document/);
    expect((await rej(V(approvedRows, ratify({ version: 2 }), 'eve')))?.message).toMatch(/cannot change the document/);
    expect((await rej(V(approvedRows, ratify({ approvedBy: 'sarah' }), 'eve')))?.message).toMatch(/approvedBy cannot change/);
    expect((await rej(V(approvedRows, ratify({ ratifiedAt: undefined }), 'eve')))?.status).toBe(400);
    const inReview = { artefact_versions: chain({}, { status: 'IN_REVIEW' }) as unknown as Row[] };
    expect((await rej(V(inReview, ratify(), 'eve')))?.status).toBe(409); // cannot skip the approval
    expect((await rej(V({ artefact_versions: chain({}) as unknown as Row[] }, ratify(), 'eve')))?.status).toBe(409);
  });

  it('never lets an autonomous actor approve, and rejects countersignedBy before ratification', async () => {
    const inReview = { artefact_versions: chain({}, { status: 'IN_REVIEW' }) as unknown as Row[] };
    expect((await rej(V(inReview, art({ status: 'APPROVED', approvedBy: 'auto:digest' }), 'auto:digest')))?.status).toBe(403);
    expect((await rej(V(inReview, art({ status: 'APPROVED', approvedBy: 'dan', countersignedBy: 'eve' }), 'dan')))?.message).toMatch(/only a ratified artefact carries countersignedBy/);
  });

  it('ingestion needs the exact ratified library document, and respects an agent that is not ingested', async () => {
    const ratified = chain({}, { status: 'IN_REVIEW' }, { status: 'APPROVED', approvedBy: 'dan' }, { status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't' }) as unknown as Row[];
    const ingest = (o: Row = {}) => art({ status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't', ingestedAt: 't2', ...o });
    const libDoc = { id: 'rat_art_1_v1', origin: 'ratified', ratifiedFrom: { docHash: H } };
    expect((await rej(V({ artefact_versions: ratified }, ingest(), 'eve')))?.message).toMatch(/not in the library/);
    expect((await rej(V({ artefact_versions: ratified, documents: [{ ...libDoc, ratifiedFrom: { docHash: 'c'.repeat(64) } }] }, ingest(), 'eve')))?.status).toBe(409);
    await expect(V({ artefact_versions: ratified, documents: [libDoc] }, ingest(), 'eve')).resolves.toBeDefined();
    expect((await rej(V({ artefact_versions: ratified, documents: [libDoc] }, ingest({ countersignedBy: 'sarah' }), 'eve')))?.message).toMatch(/signers cannot change/);
    expect((await rej(V({ artefact_versions: ratified, documents: [libDoc] }, ingest({ docHash: 'd'.repeat(64) }), 'eve')))?.message).toMatch(/cannot change the document/);
  });

  it('a ratified or ingested artefact cannot be edited back to a draft, and a revision must come from a ratified artefact', async () => {
    const final = { artefact_versions: chain({}, { status: 'IN_REVIEW' }, { status: 'APPROVED', approvedBy: 'dan' }, { status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't' }) as unknown as Row[] };
    expect((await rej(V(final, art({ status: 'DRAFT', version: 2 }), 'sarah')))?.status).toBe(409);
    const open = { artefact_versions: chain({}) as unknown as Row[] };
    await expect(V(open, art({ id: 'art_2', requestedBy: 'sarah', revisionOf: 'art_1' }), 'sarah')).rejects.toMatchObject({ status: 409 }); // art_1 is only a draft
    await expect(V(final, art({ id: 'art_2', requestedBy: 'sarah', revisionOf: 'art_1' }), 'sarah')).resolves.toBeDefined();
  });

  it('a countersignature row and a ratified document are only accepted for a matching ratified artefact, and the document never changes', async () => {
    const ratified = { artefact_versions: chain({}, { status: 'IN_REVIEW' }, { status: 'APPROVED', approvedBy: 'dan' }, { status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't' }) as unknown as Row[] };
    const sig = { id: 'sig_1', artefactId: 'art_1', version: 1, docHash: H, signer: 'eve' } as Rec;
    await expect(V(ratified, sig, 'eve', 'countersignatures')).resolves.toBeDefined();
    expect((await rej(V(ratified, { ...sig, signer: 'dan' }, 'dan', 'countersignatures')))?.status).toBe(409);
    expect((await rej(V(ratified, sig, 'sarah', 'countersignatures')))?.status).toBe(403);
    expect((await rej(V({ artefact_versions: chain({}) as unknown as Row[] }, sig, 'eve', 'countersignatures')))?.status).toBe(409);

    const doc = { title: 't', blocks: [], meta: {} };
    const hashOf = async (d: unknown) => (await import('../src/core/crypto')).sha256Hex((await import('../src/core/crypto')).canonical(d));
    const real = (await hashOf(doc));
    const rows = { artefact_versions: chain({}, { status: 'IN_REVIEW' }, { status: 'APPROVED', approvedBy: 'dan', doc, docHash: real }, { status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve', ratifiedAt: 't', doc, docHash: real }) as unknown as Row[] };
    const ld = (o: Row = {}) => ({ id: 'rat_art_1_v1', origin: 'ratified', title: 't', doc, by: 'eve', ratifiedFrom: { artefactId: 'art_1', docHash: real }, ...o }) as Rec;
    await expect(V(rows, ld(), 'eve', 'documents')).resolves.toBeDefined();
    expect((await rej(V(rows, ld({ doc: { ...doc, title: 'tampered' } }), 'eve', 'documents')))?.message).toMatch(/does not match what was ratified/);
    expect((await rej(V(rows, ld({ id: 'rat_art_1_v9' }), 'eve', 'documents')))?.status).toBe(409);
    expect((await rej(V(rows, ld(), 'sarah', 'documents')))?.status).toBe(403);
    expect((await rej(V({ ...rows, documents: [ld() as unknown as Row] }, ld({ title: 'again' }), 'eve', 'documents')))?.message).toMatch(/immutable/);
    expect((await rej(V({ ...rows, documents: [ld() as unknown as Row] }, { id: 'rat_art_1_v1', origin: 'saved', deleted: true } as Rec, 'eve', 'documents')))?.status).toBe(409); // cannot be "deleted" either
    expect((await rej(V({ artefact_versions: chain({}) as unknown as Row[] }, ld(), 'eve', 'documents')))?.status).toBe(409); // not from a ratified artefact
    await expect(V({}, { id: 'doc_free', origin: 'created', title: 'x' } as Rec, 'sarah', 'documents')).resolves.toBeDefined(); // ordinary library documents are untouched
  });

  it('the ledger only records board acts the warehouse already holds, under the right person', async () => {
    const l = (action: string, actor: string) => ({ orgId: 'o', actor, action, subject: 'art_1' });
    const ratified = () => store({ artefact_versions: chain({}, { status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'eve' }) as unknown as Row[] });
    await expect(appendLedger(ratified(), l('artefact.countersigned', 'eve'), 0, 'eve')).resolves.toBeDefined();
    await expect(appendLedger(ratified(), l('artefact.ratified', 'eve'), 0, 'eve')).resolves.toBeDefined();
    expect((await rej(appendLedger(ratified(), l('artefact.ratified', 'dan'), 0, 'dan')))?.status).toBe(409); // dan did not countersign
    expect((await rej(appendLedger(ratified(), l('artefact.ratified', 'eve'), 0, 'dan')))?.status).toBe(403); // not you
    expect((await rej(appendLedger(store({ artefact_versions: chain({}, { status: 'APPROVED', approvedBy: 'dan' }) as unknown as Row[] }), l('artefact.ratified', 'eve'), 0, 'eve')))?.status).toBe(409);
    expect((await rej(appendLedger(ratified(), l('artefact.ingested', 'eve'), 0, 'eve')))?.status).toBe(409); // ratified, not yet ingested
    const ingested = store({ artefact_versions: chain({}, { status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'eve' }) as unknown as Row[] });
    await expect(appendLedger(ingested, l('artefact.ingested', 'eve'), 0, 'eve')).resolves.toBeDefined();
  });
});
