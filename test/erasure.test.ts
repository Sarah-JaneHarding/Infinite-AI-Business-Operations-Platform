import { describe, expect, it } from 'vitest';
import { Platform, RunRefused } from '../src/core/platform';
import { MemoryAdapter, type Rec } from '../src/core/warehouse';
import { sha256Hex } from '../src/core/crypto';
import { AGENTS } from '../src/departments';
import { Rejected, validateAppend, type ReadStore } from '../src/server/validate';
import { appendLedger, type LedgerStore } from '../src/server/ledgerService';
import type { Actor } from '../src/core/types';

const human = (id: string): Actor => ({ id, name: id, kind: 'human', roles: ['Founder'] });
const sarah = human('sarah');
const dan = human('dan');
const bot: Actor = { id: 'bot', name: 'bot', kind: 'agent', roles: [] };
const agent = AGENTS[0]!;
const REF = 'CONTACT-1042';
const refused = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as RunRefused | null;

describe('erasure requests (Platform)', () => {
  it('a second person approves with the retyped reference, which blocks the subject, is ledgered, and keeps the chain intact', async () => {
    const p = await new Platform().init();
    const r = await p.requestErasure(`  ${REF} `, 'data_subject_request', 'Asked by email', sarah);
    expect(r).toMatchObject({ status: 'REQUESTED', requestedBy: 'sarah', version: 1 });
    expect((await refused(p.decideErasure(r.id, sarah, 'APPROVED', '', REF)))?.message).toMatch(/second person/);
    expect((await refused(p.decideErasure(r.id, dan, 'APPROVED', '', 'CONTACT-9999')))?.message).toMatch(/does not match/);
    expect(p.erasureRequests()[0]?.status).toBe('REQUESTED'); // the wrong reference changed nothing
    await expect(p.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.not.toMatchObject({ kind: 'tombstone' }); // not blocked yet

    const done = await p.decideErasure(r.id, dan, 'APPROVED', 'checked', REF);
    expect(done).toMatchObject({ status: 'EXECUTED', decidedBy: 'dan', version: 3 });
    await expect(p.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.toMatchObject({ kind: 'tombstone' });
    await expect(p.runAgent(agent, {}, sarah, { subjectId: ` ${REF}` })).rejects.toMatchObject({ kind: 'tombstone' }); // same normalisation
    const actions = p.ledger.all.map((e) => e.action);
    expect(actions).toEqual(expect.arrayContaining(['erasure.requested', 'erasure.approved', 'subject.tombstone']));
    expect(actions.indexOf('erasure.approved')).toBeLessThan(actions.indexOf('subject.tombstone')); // approval first
    expect(await p.ledger.verify()).toBeNull();
  });

  it('a rejection needs a reason, applies nothing, and the subject can be requested again', async () => {
    const p = await new Platform().init();
    const r = await p.requestErasure(REF, 'retention_expired', '', sarah);
    expect((await refused(p.decideErasure(r.id, dan, 'REJECTED', ' ')))?.message).toMatch(/reason/);
    expect(await p.decideErasure(r.id, dan, 'REJECTED', 'still under contract')).toMatchObject({ status: 'REJECTED', decisionNote: 'still under contract' });
    await expect(p.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.not.toMatchObject({ kind: 'tombstone' });
    expect((await refused(p.decideErasure(r.id, dan, 'APPROVED', '', REF)))?.message).toMatch(/waiting for a decision/);
    await expect(p.requestErasure(REF, 'retention_expired', '', sarah)).resolves.toMatchObject({ status: 'REQUESTED' });
  });

  it('refuses a request that carries personal data, a bad shape, an agent, a duplicate, or an already-erased subject', async () => {
    const p = await new Platform({ knownNames: ['Thandi Nkosi'] }).init();
    for (const bad of ['thandi@school.co.za', '0821234567', 'Mrs Nkosi', 'learner id 5521', 'Thandi Nkosi']) {
      expect((await refused(p.requestErasure(bad, 'other', 'x', sarah)))?.kind).toBe('pii');
    }
    expect((await refused(p.requestErasure(REF, 'other', 'a call from Thandi Nkosi', sarah)))?.kind).toBe('pii'); // note too
    expect((await refused(p.requestErasure('ab', 'other', 'x', sarah)))?.message).toMatch(/3 to 100/);
    expect((await refused(p.requestErasure('x'.repeat(101), 'other', 'x', sarah)))?.message).toMatch(/3 to 100/);
    expect((await refused(p.requestErasure(REF, 'other', '', sarah)))?.message).toMatch(/Explain "other"/);
    expect((await refused(p.requestErasure(REF, 'data_subject_request', 'n'.repeat(201), sarah)))?.message).toMatch(/200/);
    expect((await refused(p.requestErasure(REF, 'nonsense' as never, '', sarah)))?.message).toMatch(/category/);
    expect((await refused(p.requestErasure(REF, 'data_subject_request', '', bot)))?.message).toMatch(/named human/);
    await p.requestErasure(REF, 'data_subject_request', '', sarah);
    expect((await refused(p.requestErasure(REF, 'data_subject_request', '', dan)))?.message).toMatch(/already an open/);
    const other = await p.requestErasure('CONTACT-2000', 'data_subject_request', '', sarah);
    await p.decideErasure(other.id, dan, 'APPROVED', '', 'CONTACT-2000');
    expect((await refused(p.requestErasure('CONTACT-2000', 'data_subject_request', '', dan)))?.message).toMatch(/already been erased/);
    expect((await refused(p.decideErasure(other.id, bot, 'REJECTED', 'x')))?.kind).toBe('hitl');
  });

  it('never stores the reference itself, and everything survives a reload', async () => {
    const adapter = new MemoryAdapter();
    const p1 = await new Platform({ adapter }).init();
    const r = await p1.requestErasure(REF, 'consent_withdrawn', 'Withdrew by letter', sarah);
    await p1.decideErasure(r.id, dan, 'APPROVED', 'ok', REF);
    await p1.flush();
    expect(JSON.stringify(adapter.data)).not.toContain(REF);
    expect(adapter.data['erasure_requests']?.every((x) => x['subjectHash'] === (r.subjectHash))).toBe(true);
    expect(r.subjectHash).toBe(await sha256Hex(REF));
    const p2 = await new Platform({ adapter }).init();
    expect(p2.erasureRequests()).toHaveLength(1);
    expect(p2.erasureRequests()[0]?.status).toBe('EXECUTED');
    await expect(p2.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.toMatchObject({ kind: 'tombstone' });
  });

  it('if applying fails after the approval is recorded, the request stays APPROVED and can be applied again safely', async () => {
    const adapter = new MemoryAdapter();
    let failTombstone = true;
    const orig = adapter.append.bind(adapter);
    adapter.append = async (c: string, rec: Rec) => { if (c === 'tombstones' && failTombstone) throw new Error('disk full'); return orig(c, rec); };
    const p = await new Platform({ adapter }).init();
    const r = await p.requestErasure(REF, 'data_subject_request', '', sarah);
    await expect(p.decideErasure(r.id, dan, 'APPROVED', 'ok', REF)).rejects.toThrow(/disk full/);
    expect(p.erasureRequests()[0]).toMatchObject({ status: 'APPROVED', decidedBy: 'dan' });
    await expect(p.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.not.toMatchObject({ kind: 'tombstone' }); // not erased yet, and the UI says so
    expect((await refused(p.applyErasure(r.id, dan, 'WRONG-REF')))?.message).toMatch(/does not match/);
    failTombstone = false;
    expect(await p.applyErasure(r.id, dan, REF)).toMatchObject({ status: 'EXECUTED' });
    await expect(p.runAgent(agent, {}, sarah, { subjectId: REF })).rejects.toMatchObject({ kind: 'tombstone' });
    expect((await refused(p.applyErasure(r.id, dan, REF)))?.message).toMatch(/approved request/);
  });
});

// ---- server-side rules ----
const memStore = (seed: Record<string, Rec[]> = {}): ReadStore & LedgerStore => ({ list: (c) => seed[c] ?? [], append: (c, r) => void (seed[c] ??= []).push(r) });
const rej = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as Rejected | null;
const H = 'a'.repeat(64);
const req = (o: Record<string, unknown> = {}): Rec => ({ id: 'er_1', subjectHash: H, category: 'data_subject_request', note: '', status: 'REQUESTED', requestedBy: 'sarah', version: 1, ...o }) as Rec;
const v = (rows: Record<string, Rec[]>, rec: Rec, actor: string | null, c = 'erasure_requests') => validateAppend(c, rec, { actor, store: memStore(rows) });

describe('erasure rules on the server', () => {
  it('a new request: REQUESTED v1, by the caller, once per subject, never for an erased subject', async () => {
    await expect(v({}, req(), 'sarah')).resolves.toBeDefined();
    expect((await rej(v({}, req(), 'dan')))?.status).toBe(403);
    expect((await rej(v({}, req({ status: 'APPROVED', decidedBy: 'dan' }), 'sarah')))?.status).toBe(400);
    expect((await rej(v({}, req({ version: 2 }), 'sarah')))?.status).toBe(400);
    expect((await rej(v({}, req({ subjectHash: 'nope' }), 'sarah')))?.status).toBe(400);
    expect((await rej(v({}, req({ category: 'whim' }), 'sarah')))?.status).toBe(400);
    expect((await rej(v({}, req({ note: 'x'.repeat(201) }), 'sarah')))?.status).toBe(400);
    expect((await rej(v({ erasure_requests: [req({ id: 'er_0' })] }, req(), 'sarah')))?.status).toBe(409); // open request exists
    expect((await rej(v({ tombstones: [{ id: 't', subjectHash: H }] }, req(), 'sarah')))?.status).toBe(409); // already erased
    await expect(v({ erasure_requests: [req({ id: 'er_0', status: 'REJECTED', decidedBy: 'dan', version: 2 })] }, req(), 'sarah')).resolves.toBeDefined();
  });

  it('a decision needs a different person who is the caller; the change must be the next version', async () => {
    const open = { erasure_requests: [req()] };
    const dec = (o: Record<string, unknown> = {}) => req({ status: 'APPROVED', decidedBy: 'dan', version: 2, ...o });
    await expect(v(open, dec(), 'dan')).resolves.toBeDefined();
    expect((await rej(v(open, dec({ decidedBy: 'sarah' }), 'sarah')))?.status).toBe(403); // self-decision
    expect((await rej(v(open, dec(), 'sarah')))?.status).toBe(403); // decidedBy is not the caller
    expect((await rej(v(open, dec({ decidedBy: undefined }), 'dan')))?.status).toBe(400);
    expect((await rej(v(open, dec({ status: 'REJECTED' }), 'dan')))?.message).toMatch(/reason/);
    expect((await rej(v(open, dec({ version: 3 }), 'dan')))?.message).toMatch(/new version/);
    expect((await rej(v(open, dec({ subjectHash: 'b'.repeat(64) }), 'dan')))?.message).toMatch(/cannot change/);
    expect((await rej(v(open, dec({ requestedBy: 'dan' }), 'dan')))?.message).toMatch(/cannot change/);
    expect((await rej(v({ erasure_requests: [req(), dec()] }, dec({ status: 'REJECTED', version: 3, decisionNote: 'x' }), 'dan')))?.status).toBe(409); // APPROVED cannot become REJECTED
    expect((await rej(v({ erasure_requests: [req()] }, dec({ status: 'EXECUTED' }), 'dan')))?.status).toBe(409); // cannot skip approval
  });

  it('EXECUTED only once the tombstone is on record', async () => {
    const approved = [req(), req({ status: 'APPROVED', decidedBy: 'dan', version: 2 })];
    const done = req({ status: 'EXECUTED', decidedBy: 'dan', version: 3 });
    expect((await rej(v({ erasure_requests: approved }, done, 'dan')))?.status).toBe(409);
    await expect(v({ erasure_requests: approved, tombstones: [{ id: 't', subjectHash: H }] }, done, 'dan')).resolves.toBeDefined();
  });

  it('a tombstone exists only for an approved request, by the caller (no more direct tombstones)', async () => {
    const t = { id: 'ts_1', subjectHash: H, by: 'dan' } as Rec;
    const approved = { erasure_requests: [req(), req({ status: 'APPROVED', decidedBy: 'dan', version: 2 })] };
    expect((await rej(v({}, t, 'dan', 'tombstones')))?.status).toBe(403);
    expect((await rej(v({ erasure_requests: [req()] }, t, 'dan', 'tombstones')))?.status).toBe(403); // only requested
    await expect(v(approved, t, 'dan', 'tombstones')).resolves.toBeDefined();
    expect((await rej(v(approved, { ...t, by: 'sarah' }, 'dan', 'tombstones')))?.status).toBe(403);
    expect((await rej(v({ erasure_requests: [req(), req({ status: 'APPROVED', decidedBy: 'dan', version: 2 }), req({ status: 'EXECUTED', decidedBy: 'dan', version: 3 })] }, t, 'dan', 'tombstones')))?.status).toBe(403); // already applied
  });

  it('the ledger only records erasure acts the warehouse already holds, under the right person', async () => {
    const l = (action: string, actor: string, subject = 'er_1') => ({ orgId: 'o', actor, action, subject });
    const none = memStore();
    expect((await rej(appendLedger(none, l('erasure.requested', 'sarah'), 0, 'sarah')))?.status).toBe(409);
    const asked = () => memStore({ erasure_requests: [req()] });
    await expect(appendLedger(asked(), l('erasure.requested', 'sarah'), 0, 'sarah')).resolves.toBeDefined();
    expect((await rej(appendLedger(asked(), l('erasure.requested', 'dan'), 0, 'dan')))?.status).toBe(409); // not the requester
    expect((await rej(appendLedger(asked(), l('erasure.requested', 'dan'), 0, 'sarah')))?.status).toBe(403); // not you
    const decided = () => memStore({ erasure_requests: [req(), req({ status: 'APPROVED', decidedBy: 'dan', version: 2 })] });
    await expect(appendLedger(decided(), l('erasure.approved', 'dan'), 0, 'dan')).resolves.toBeDefined();
    expect((await rej(appendLedger(decided(), l('erasure.approved', 'sarah'), 0, 'sarah')))?.status).toBe(409);
    expect((await rej(appendLedger(decided(), l('erasure.rejected', 'dan'), 0, 'dan')))?.status).toBe(409);
    expect((await rej(appendLedger(asked(), l('erasure.approved', 'dan'), 0, 'dan')))?.status).toBe(409);
    expect((await rej(appendLedger(memStore(), l('subject.tombstone', 'dan', 'ts_x'), 0, 'dan')))?.status).toBe(409);
    await expect(appendLedger(memStore({ tombstones: [{ id: 'ts_x', subjectHash: H }] }), l('subject.tombstone', 'dan', 'ts_x'), 0, 'dan')).resolves.toBeDefined();
  });
});
