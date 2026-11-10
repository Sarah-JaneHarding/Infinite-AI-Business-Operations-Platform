import { describe, expect, it } from 'vitest';
import { Ledger, type Sequencer } from '../src/core/ledger';
import { appendLedger, type LedgerStore } from '../src/server/ledgerService';
import { Rejected } from '../src/server/validate';
import type { Rec } from '../src/core/warehouse';

const memStore = (seed: Record<string, Rec[]> = {}): LedgerStore & { rows: Record<string, Rec[]> } => {
  const rows = seed;
  return { rows, list: (c) => rows[c] ?? [], append: (c, r) => void (rows[c] ??= []).push(r) };
};
const input = (o: Record<string, unknown> = {}) => ({ orgId: 'o', actor: 'sarah', action: 'note', subject: 's', ...o });
const reject = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as Rejected | null;

describe('appendLedger (server)', () => {
  it('assigns seq, prevHash, hash and time itself, and persists with an id', async () => {
    const s = memStore();
    const a = await appendLedger(s, input({ at: 'ignored', seq: 9, hash: 'x' }), 0, 'sarah', () => 'T1');
    const b = await appendLedger(s, input(), 1, 'sarah', () => 'T2');
    expect([a.entry.seq, b.entry.seq, a.entry.at]).toEqual([1, 2, 'T1']);
    expect(b.entry.prevHash).toBe(a.entry.hash);
    expect(s.rows['ledger']?.map((r) => r.id)).toEqual(['L1', 'L2']);
  });
  it('returns what the caller missed, and nothing it already has', async () => {
    const s = memStore();
    for (let i = 0; i < 3; i++) await appendLedger(s, input({ subject: `s${i}` }), i, 'sarah');
    const r = await appendLedger(s, input({ subject: 'late' }), 1, 'sarah'); // a client that only knows seq 1
    expect(r.entry.seq).toBe(4);
    expect(r.earlier.map((e) => e.seq)).toEqual([2, 3]);
    expect('id' in (r.earlier[0] as object)).toBe(false);
  });
  it('refuses a bad shape, a knownSeq outside the ledger, and an oversized detail', async () => {
    const s = memStore();
    expect((await reject(appendLedger(s, 'x', 0, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input({ action: '' }), 0, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input({ detail: [1] }), 0, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input({ detail: { pad: 'z'.repeat(20_000) } }), 0, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input(), 5, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input(), -1, null)))?.status).toBe(400);
    expect((await reject(appendLedger(s, input(), 'a', null)))?.status).toBe(400);
    expect(s.rows['ledger']).toBeUndefined();
  });
  it('records human acts only under the caller, and only when the warehouse holds the matching state', async () => {
    const art = (status: string, extra: Record<string, unknown> = {}) => ({ id: 'art_1', status, ...extra }) as Rec;
    const inReview = memStore({ artefact_versions: [art('IN_REVIEW')] });
    expect((await reject(appendLedger(inReview, input({ actor: 'dan', action: 'artefact.edit' }), 0, 'sarah')))?.status).toBe(403);
    expect((await reject(appendLedger(inReview, input({ actor: 'dan', action: 'hitl.approved', subject: 'art_1' }), 0, 'dan')))?.status).toBe(409);
    expect((await reject(appendLedger(memStore({ artefact_versions: [art('DRAFT')] }), input({ action: 'artefact.submit', subject: 'art_1' }), 0, 'sarah')))?.status).toBe(409);
    await expect(appendLedger(inReview, input({ action: 'artefact.submit', subject: 'art_1' }), 0, 'sarah')).resolves.toBeDefined();
    const decided = memStore({ artefact_versions: [art('APPROVED', { approvedBy: 'dan' })] });
    expect((await reject(appendLedger(decided, input({ actor: 'sarah', action: 'hitl.approved', subject: 'art_1' }), 0, 'sarah')))?.status).toBe(409); // approver differs
    await expect(appendLedger(decided, input({ actor: 'dan', action: 'hitl.approved', subject: 'art_1' }), 0, 'dan')).resolves.toBeDefined();
  });
  it('lets an agent act under its own id in open mode, but never as a human act', async () => {
    await expect(appendLedger(memStore(), input({ actor: 'OPS-SEC-01', action: 'gateway.complete' }), 0, 'sarah')).resolves.toBeDefined();
    await expect(appendLedger(memStore(), input({ actor: 'anyone', action: 'hitl.approved' }), 0, null)).rejects.toMatchObject({ status: 409 });
  });
});

describe('Ledger with a server sequencer (client)', () => {
  const clientsOf = (s: ReturnType<typeof memStore>) => {
    const seq: Sequencer = (i, known) => appendLedger(s, i, known, null);
    return () => new Ledger(s.rows['ledger']?.map(({ id: _id, ...e }) => e) as never ?? [], undefined, seq);
  };
  it('adopts the server entry and keeps a verifiable chain', async () => {
    const mk = clientsOf(memStore());
    const l = mk();
    await l.append({ orgId: 'o', actor: 'a', action: 'x', subject: '1' });
    await l.append({ orgId: 'o', actor: 'a', action: 'x', subject: '2' });
    expect(l.all.map((e) => e.seq)).toEqual([1, 2]);
    expect(await l.verify()).toBeNull();
  });
  it('two clients writing at once both end up with the full, intact chain', async () => {
    const s = memStore();
    const mk = clientsOf(s);
    const [a, b] = [mk(), mk()];
    await Promise.all([...[1, 2, 3].map((n) => a.append({ orgId: 'o', actor: 'a', action: 'x', subject: `a${n}` })), ...[1, 2, 3].map((n) => b.append({ orgId: 'o', actor: 'b', action: 'x', subject: `b${n}` }))]);
    expect(s.rows['ledger']).toHaveLength(6);
    expect(await a.verify()).toBeNull();
    expect(await b.verify()).toBeNull();
    const last = await a.append({ orgId: 'o', actor: 'a', action: 'x', subject: 'end' });
    expect(last.seq).toBe(7);
    expect(a.all).toHaveLength(7);
  });
  it('propagates a server refusal without adding a local entry, and keeps working afterwards', async () => {
    let fail = true;
    const s = memStore();
    const l = new Ledger([], undefined, (i, k) => (fail ? Promise.reject(new Error('ledger append failed (409)')) : appendLedger(s, i, k, null)));
    await expect(l.append({ orgId: 'o', actor: 'a', action: 'x', subject: '1' })).rejects.toThrow(/409/);
    expect(l.all).toHaveLength(0);
    fail = false;
    await expect(l.append({ orgId: 'o', actor: 'a', action: 'x', subject: '2' })).resolves.toMatchObject({ seq: 1 });
  });
  it('rejects a server reply that does not continue the local chain', async () => {
    const l = new Ledger([], undefined, async () => ({ entry: { seq: 5, at: '', orgId: 'o', actor: 'a', action: 'x', subject: '', detail: {}, prevHash: '', hash: '' }, earlier: [] }));
    await expect(l.append({ orgId: 'o', actor: 'a', action: 'x', subject: '1' })).rejects.toThrow(/does not continue/);
    expect(l.all).toHaveLength(0);
  });
});
