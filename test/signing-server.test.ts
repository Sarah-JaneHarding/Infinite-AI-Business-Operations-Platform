import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { canonical } from '../src/core/crypto';
import { MemoryAdapter, type Rec } from '../src/core/warehouse';
import { Platform } from '../src/core/platform';
import type { Actor } from '../src/core/types';
import type { SigningPolicy } from '../src/core/signing';
import { agentById } from '../src/departments';
import { Rejected, validateAppend, type AppendCtx, type ReadStore } from '../src/server/validate';
import { appendLedger, type LedgerStore } from '../src/server/ledgerService';
import { ratifiedProblem } from '../src/server/finality';
import type { Signer } from '../src/server/signing';
import { contractFor, customAgents, saveDef, type CustomAgentDef } from '../src/departments/custom';
import { can } from '../src/ui/boardGate';

type Row = Record<string, unknown>;
const DOC = { title: 'one', blocks: [], meta: {} };
const H = createHash('sha256').update(canonical(DOC)).digest('hex');
const store = (rows: Record<string, Row[]> = {}): ReadStore & LedgerStore => ({ list: (c) => (rows[c] ?? []) as unknown as Rec[], append: (c, r) => void (rows[c] ??= []).push(r as Row) });
const rej = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as Rejected | null;

// Real agents, checked so a change to the catalogue fails here rather than silently testing something else.
const need = (id: string) => {
  const a = agentById(id);
  if (!a) throw new Error(`agent ${id} is missing`);
  return a;
};
const PLAIN = need('OPS-EXEC-01'); // executive, no second approver
const FIN = need('OPS-FIN-01'); // finance, no second approver
const SA = need('OPS-FIN-02'); // finance, secondApprover only
const TWO = need('OPS-SEC-01'); // security, secondApprover + twoPerson
const LEGAL = need('OPS-LEG-01'); // legal, secondApprover + professionalReview attorney
const LEGAL_PLAIN = need('OPS-LEG-06'); // legal, no flags
const CUSTOM = 'cust_agent_1';
const customDefs = [{ id: CUSTOM, kind: 'agent' }];

const SOLO: SigningPolicy = { mode: 'solo', waitMs: 600_000 };
const DUAL: SigningPolicy = { mode: 'dual', waitMs: 600_000 };
const APPROVED_AT = '2026-11-14T10:00:00.000Z';
const plus = (minutes: number) => new Date(Date.parse(APPROVED_AT) + minutes * 60_000);

const art = (o: Row = {}): Rec => ({ id: 'art_1', orgId: 'infinite-ai', agentId: PLAIN.id, status: 'DRAFT', version: 1, requestedBy: 'sarah', doc: DOC, docHash: H, ...o }) as Rec;
const inReview = (agentId: string, requestedBy = 'sarah'): Record<string, Row[]> => ({ artefact_versions: [art({ agentId, requestedBy }), art({ agentId, requestedBy, status: 'IN_REVIEW' })], custom_defs: customDefs });
const approvedRows = (agentId: string, approvedBy: string, o: Row = {}): Record<string, Row[]> => ({
  artefact_versions: [art({ agentId }), art({ agentId, status: 'IN_REVIEW' }), art({ agentId, status: 'APPROVED', approvedBy, at: APPROVED_AT, ...o })],
  custom_defs: customDefs,
});
const ratifiedRows = (agentId: string, approvedBy: string, countersignedBy: string, o: Row = {}): Record<string, Row[]> => ({
  artefact_versions: [art({ agentId, status: 'RATIFIED', approvedBy, countersignedBy, ratifiedAt: 't', at: 't', ...o })],
  custom_defs: customDefs,
});
/** The server-authored ledger entry for an approval: its `at` is the server's clock, so the solo wait is timed from it. */
const approvalEntry = (at: string, actor = 'dan', subject = 'art_1', version = 1, docHash = H): Row => ({ id: `L_${at}_${actor}_${version}`, action: 'hitl.approved', subject, actor, at, detail: { note: '', version, docHash } });
const ledgered = (rows: Record<string, Row[]>, ...entries: Row[]): Record<string, Row[]> => ({ ...rows, ledger: entries });
const V = (rows: Record<string, Row[]>, rec: Rec, actor: string | null, extra: Partial<AppendCtx> = {}, c = 'artefact_versions') => validateAppend(c, rec, { actor, store: store(rows), ...extra });
const decision = (agentId: string, approvedBy: string, o: Row = {}) => art({ agentId, status: 'APPROVED', approvedBy, at: APPROVED_AT, ...o });
const ratify = (agentId: string, approvedBy: string, countersignedBy: string, o: Row = {}) => art({ agentId, status: 'RATIFIED', approvedBy, countersignedBy, ratifiedAt: 't', at: 't', ...o });

const signer = (id: string, scope: Signer['scope'], profession?: Signer['profession']): Signer => (profession ? { id, name: id, scope, profession, registration: 'reg' } : { id, name: id, scope });

describe('fixtures', () => {
  it('uses agents with the expected contracts', () => {
    expect([PLAIN.secondApprover, PLAIN.twoPerson, PLAIN.professionalReview]).toEqual([undefined, undefined, undefined]);
    expect(FIN.dept).toBe('finance');
    expect(FIN.secondApprover).toBeFalsy();
    expect([SA.dept, SA.secondApprover, SA.twoPerson, SA.professionalReview]).toEqual(['finance', true, undefined, undefined]);
    expect([TWO.dept, TWO.secondApprover, TWO.twoPerson]).toEqual(['security', true, true]);
    expect([LEGAL.dept, LEGAL.secondApprover, LEGAL.professionalReview]).toEqual(['legal', true, 'attorney']);
    expect([LEGAL_PLAIN.dept, LEGAL_PLAIN.secondApprover, LEGAL_PLAIN.professionalReview]).toEqual(['legal', undefined, undefined]);
  });
});

describe('the signer registry at approval (IN_REVIEW -> APPROVED/REJECTED)', () => {
  const signers = [signer('sarah', '*'), signer('dan', ['finance'])];

  it('refuses an approver who is not a registered signer', async () => {
    const e = await rej(V(inReview(PLAIN.id), decision(PLAIN.id, 'zed'), 'zed', { signers }));
    expect(e?.status).toBe(403);
    expect(e?.message).toMatch(/not a registered signer/);
  });

  it('refuses a signer whose scope does not cover the agent department, and accepts one whose scope does', async () => {
    const e = await rej(V(inReview(LEGAL_PLAIN.id), decision(LEGAL_PLAIN.id, 'dan'), 'dan', { signers }));
    expect(e?.status).toBe(403);
    expect(e?.message).toMatch(/not a registered signer for this department/);
    const ok = await V(inReview(FIN.id), decision(FIN.id, 'dan'), 'dan', { signers });
    expect(ok).toMatchObject({ status: 'APPROVED', approvedBy: 'dan' });
    expect(ok.signing).toBeUndefined();
  });

  it('a custom agent needs a "*" signer (the server ignores the department on its definition)', async () => {
    const e = await rej(V(inReview(CUSTOM, 'mo'), decision(CUSTOM, 'dan', { requestedBy: 'mo' }), 'dan', { signers }));
    expect(e?.status).toBe(403);
    expect(e?.message).toMatch(/not a registered signer/);
    await expect(V(inReview(CUSTOM, 'mo'), decision(CUSTOM, 'sarah', { requestedBy: 'mo' }), 'sarah', { signers })).resolves.toMatchObject({ status: 'APPROVED', approvedBy: 'sarah' });
  });

  it('applies the scope to a rejection too', async () => {
    const e = await rej(V(inReview(LEGAL_PLAIN.id), decision(LEGAL_PLAIN.id, 'dan', { status: 'REJECTED', note: 'no' }), 'dan', { signers }));
    expect(e?.status).toBe(403);
  });

  it('skips the registry when no signers are configured (legacy)', async () => {
    await expect(V(inReview(PLAIN.id), decision(PLAIN.id, 'zed'), 'zed')).resolves.toMatchObject({ approvedBy: 'zed' });
    await expect(V(inReview(PLAIN.id), decision(PLAIN.id, 'zed'), 'zed', { signers: [] })).resolves.toMatchObject({ approvedBy: 'zed' });
  });
});

describe('the author approving their own work', () => {
  it('a plain agent: allowed, and the record carries no marker', async () => {
    const ok = await V(inReview(PLAIN.id), decision(PLAIN.id, 'sarah'), 'sarah', { signing: SOLO });
    expect(ok).toMatchObject({ status: 'APPROVED', approvedBy: 'sarah' });
    expect('signing' in ok).toBe(false);
    const e = await rej(V(inReview(PLAIN.id), decision(PLAIN.id, 'sarah', { signing: 'single-signer' }), 'sarah', { signing: SOLO }));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/single-signer marker/);
  });

  it('a secondApprover agent in dual (or with no policy given): 403', async () => {
    for (const extra of [{}, { signing: DUAL }]) {
      const e = await rej(V(inReview(SA.id), decision(SA.id, 'sarah', { signing: 'single-signer' }), 'sarah', extra));
      expect(e?.status).toBe(403);
      expect(e?.message).toMatch(/requires a second person to approve/);
    }
  });

  it('a secondApprover agent in solo: accepted with the single-signer marker; 400 without it', async () => {
    const ok = await V(inReview(SA.id), decision(SA.id, 'sarah', { signing: 'single-signer' }), 'sarah', { signing: SOLO });
    expect(ok).toMatchObject({ status: 'APPROVED', approvedBy: 'sarah', signing: 'single-signer' });
    const e = await rej(V(inReview(SA.id), decision(SA.id, 'sarah'), 'sarah', { signing: SOLO }));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/must carry the single-signer marker/);
  });

  it('a twoPerson or professionalReview agent in solo: 403', async () => {
    for (const a of [TWO, LEGAL]) {
      const e = await rej(V(inReview(a.id), decision(a.id, 'sarah', { signing: 'single-signer' }), 'sarah', { signing: SOLO }));
      expect(e?.status).toBe(403);
      expect(e?.message).toMatch(/requires a second person to approve/);
    }
  });

  it('a custom agent: solo self-approval accepted with the marker; dual 403', async () => {
    await expect(V(inReview(CUSTOM), decision(CUSTOM, 'sarah', { signing: 'single-signer' }), 'sarah', { signing: SOLO })).resolves.toMatchObject({ signing: 'single-signer' });
    expect((await rej(V(inReview(CUSTOM), decision(CUSTOM, 'sarah', { signing: 'single-signer' }), 'sarah', { signing: DUAL })))?.status).toBe(403);
  });

  it('a solo self-rejection of a secondApprover agent is allowed but never carries the marker', async () => {
    await expect(V(inReview(SA.id), decision(SA.id, 'sarah', { status: 'REJECTED', note: 'no' }), 'sarah', { signing: SOLO })).resolves.toMatchObject({ status: 'REJECTED' });
    expect((await rej(V(inReview(SA.id), decision(SA.id, 'sarah', { status: 'REJECTED', note: 'no' }), 'sarah', { signing: DUAL })))?.status).toBe(403);
    const e = await rej(V(inReview(SA.id), decision(SA.id, 'sarah', { status: 'REJECTED', note: 'no', signing: 'single-signer' }), 'sarah', { signing: SOLO }));
    expect(e?.status).toBe(400);
  });

  it('an approval by someone other than the author carries no marker', async () => {
    await expect(V(inReview(SA.id), decision(SA.id, 'dan'), 'dan', { signing: SOLO })).resolves.toMatchObject({ approvedBy: 'dan' });
    const e = await rej(V(inReview(SA.id), decision(SA.id, 'dan', { signing: 'single-signer' }), 'dan', { signing: SOLO }));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/single-signer marker/);
  });
});

describe('where the marker may appear', () => {
  it('a DRAFT, IN_REVIEW or REJECTED version cannot carry it, and only the one value is accepted', async () => {
    const draft = await rej(V({}, art({ signing: 'single-signer' }), 'sarah'));
    expect(draft?.status).toBe(400);
    expect(draft?.message).toMatch(/marker/);
    const edit = await rej(V(approvedRows(SA.id, 'sarah', { signing: 'single-signer' }), art({ agentId: SA.id, version: 2, signing: 'single-signer' }), 'sarah'));
    expect(edit?.status).toBe(400);
    expect(edit?.message).toMatch(/marker/);
    await expect(V(approvedRows(SA.id, 'sarah', { signing: 'single-signer' }), art({ agentId: SA.id, version: 2 }), 'sarah')).resolves.toMatchObject({ status: 'DRAFT' });
    const submit = await rej(V({ artefact_versions: [art()] }, art({ status: 'IN_REVIEW', signing: 'single-signer' }), 'sarah'));
    expect(submit?.status).toBe(400);
    const rejected = await rej(V(inReview(PLAIN.id), decision(PLAIN.id, 'dan', { status: 'REJECTED', note: 'no', signing: 'single-signer' }), 'dan'));
    expect(rejected?.status).toBe(400);
    const garbage = await rej(V(inReview(SA.id), decision(SA.id, 'sarah', { signing: 'yes' }), 'sarah', { signing: SOLO }));
    expect(garbage?.status).toBe(400);
  });
});

describe('the approvals row and hitl ledger entry follow the artefact', () => {
  const row = (o: Row = {}) => ({ id: 'apr_1', artefactId: 'art_1', decision: 'APPROVED', approver: 'sarah', version: 1, ...o }) as Rec;
  const flagged = () => approvedRows(SA.id, 'sarah', { signing: 'single-signer' });

  it('an approvals row must carry the marker exactly when the artefact does', async () => {
    await expect(V(flagged(), row({ signing: 'single-signer' }), 'sarah', {}, 'approvals')).resolves.toBeDefined();
    expect((await rej(V(flagged(), row(), 'sarah', {}, 'approvals')))?.status).toBe(409);
    expect((await rej(V(approvedRows(SA.id, 'sarah'), row({ signing: 'single-signer' }), 'sarah', {}, 'approvals')))?.status).toBe(409);
  });

  it('a hitl.approved entry must carry detail.signing exactly when the artefact does', async () => {
    const l = (detail: Row) => ({ orgId: 'o', actor: 'sarah', action: 'hitl.approved', subject: 'art_1', detail: { version: 1, docHash: H, ...detail } });
    await expect(appendLedger(store(flagged()), l({ note: '', signing: 'single-signer' }), 0, 'sarah')).resolves.toBeDefined();
    const missing = await rej(appendLedger(store(flagged()), l({ note: '' }), 0, 'sarah'));
    expect(missing?.status).toBe(409);
    expect(missing?.message).toMatch(/marker/);
    expect((await rej(appendLedger(store(approvedRows(SA.id, 'sarah')), l({ signing: 'single-signer' }), 0, 'sarah')))?.status).toBe(409);
  });
});

describe('hitl.approved entries and approvals rows are bound to the approved version', () => {
  const iso = (m: number) => plus(m).toISOString();
  const entry = (version: unknown, detail: Row = {}) => ({ orgId: 'o', actor: 'dan', action: 'hitl.approved', subject: 'art_1', detail: { note: '', version, docHash: H, ...detail } });
  const approvalRow = (id: string, version: number) => ({ id, artefactId: 'art_1', decision: 'APPROVED', approver: 'dan', version }) as Rec;
  /** Append through the server's validators, as POST /api/warehouse does. */
  const post = async (rows: Record<string, Row[]>, c: string, rec: Rec) => { (rows[c] ??= []).push(await V(rows, rec, 'dan', {}, c)); };
  /** Edit and re-approve: a new DRAFT, review and APPROVED version (the client may claim any `at`). */
  const reapprove = (rows: Record<string, Row[]>, at: string) => rows.artefact_versions!.push(art({ version: 2 }), art({ version: 2, status: 'IN_REVIEW' }), art({ version: 2, status: 'APPROVED', approvedBy: 'dan', at }));
  const countersign = (rows: Record<string, Row[]>, version: number, now: Date) => V(rows, ratify(PLAIN.id, 'dan', 'dan', { version, signing: 'single-signer' }), 'dan', { signing: SOLO, reauthed: true, now });
  const v1 = (): Record<string, Row[]> => approvedRows(PLAIN.id, 'dan', { at: iso(0) });

  it('a hitl.approved entry with the wrong or no version is refused 409', async () => {
    for (const version of [2, 0, '1', undefined]) {
      const e = await rej(appendLedger(store(v1()), entry(version), 0, 'dan'));
      expect(e?.status).toBe(409);
      expect(e?.message).toMatch(/version/);
    }
  });

  it('a duplicate hitl.approved entry for the same version is refused 409', async () => {
    const rows = v1();
    await expect(appendLedger(store(rows), entry(1), 0, 'dan')).resolves.toBeDefined();
    const again = await rej(appendLedger(store(rows), entry(1), 1, 'dan'));
    expect(again?.status).toBe(409);
    expect(again?.message).toMatch(/already in the ledger/);
    expect(rows.ledger).toHaveLength(1);
  });

  it('a duplicate APPROVED approvals row for the same version is refused 409, and the row must name the current version', async () => {
    const rows = v1();
    await post(rows, 'approvals', approvalRow('apr_1', 1));
    const dup = await rej(post(rows, 'approvals', approvalRow('apr_2', 1)));
    expect(dup?.status).toBe(409);
    expect(dup?.message).toMatch(/already recorded/);
    const same = await rej(post(rows, 'approvals', approvalRow('apr_1', 1)));
    expect(same?.status).toBe(409);
    expect((await rej(post(v1(), 'approvals', approvalRow('apr_1', 2))))?.status).toBe(409);
    expect(rows.approvals).toHaveLength(1);
  });

  it("the reviewer's attack: pad approvals rows and ledger entries, edit, re-approve v2 unledgered: the solo countersign is refused 409", async () => {
    const rows = v1();
    await post(rows, 'approvals', approvalRow('apr_1', 1));
    expect((await rej(post(rows, 'approvals', approvalRow('apr_pad', 1))))?.status).toBe(409);
    await expect(appendLedger(store(rows), entry(1), 0, 'dan', () => iso(0))).resolves.toBeDefined();
    expect((await rej(appendLedger(store(rows), entry(1), 1, 'dan', () => iso(0))))?.status).toBe(409);
    reapprove(rows, iso(60));
    await post(rows, 'approvals', approvalRow('apr_2', 2));
    const e = await rej(countersign(rows, 2, plus(61)));
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/saved but is not recorded in the ledger/);
  });

  it('an entry for an old version is never accepted for the current version, even a forged one in the store', async () => {
    const rows = v1();
    reapprove(rows, iso(0));
    rows.ledger = [approvalEntry(iso(0), 'dan', 'art_1', 1), approvalEntry(iso(0), 'dan', 'art_1', 1)];
    const e = await rej(countersign(rows, 2, plus(60)));
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/saved but is not recorded in the ledger/);
  });

  it('an entry whose docHash differs from the artefact is not accepted', async () => {
    const rows = ledgered(v1(), approvalEntry(iso(0), 'dan', 'art_1', 1, 'f'.repeat(64)));
    const e = await rej(countersign(rows, 1, plus(60)));
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/saved but is not recorded in the ledger/);
  });

  it('the normal flow: approve, entry, countersign after the wait; and again after an edit with its own entry', async () => {
    const rows = v1();
    await post(rows, 'approvals', approvalRow('apr_1', 1));
    await expect(appendLedger(store(rows), entry(1), 0, 'dan', () => iso(0))).resolves.toBeDefined();
    await expect(countersign(rows, 1, plus(10))).resolves.toMatchObject({ status: 'RATIFIED', version: 1 });

    const again = v1();
    await post(again, 'approvals', approvalRow('apr_1', 1));
    await expect(appendLedger(store(again), entry(1), 0, 'dan', () => iso(0))).resolves.toBeDefined();
    reapprove(again, iso(0));
    await post(again, 'approvals', approvalRow('apr_2', 2));
    await expect(appendLedger(store(again), entry(2), 1, 'dan', () => iso(20))).resolves.toBeDefined();
    expect((await rej(countersign(again, 2, plus(25))))?.message).toMatch(/5 minutes left/); // timed from the v2 entry, not the v1 one
    await expect(countersign(again, 2, plus(30))).resolves.toMatchObject({ status: 'RATIFIED', version: 2, signing: 'single-signer' });
  });
});

describe('ratifying (APPROVED -> RATIFIED)', () => {
  it('applies the registry scope to the countersigner', async () => {
    const signers = [signer('dan', '*'), signer('eve', ['legal'])];
    const notSigner = await rej(V(approvedRows(FIN.id, 'dan'), ratify(FIN.id, 'dan', 'zed'), 'zed', { signers }));
    expect(notSigner?.status).toBe(403);
    expect(notSigner?.message).toMatch(/not a registered signer/);
    const outOfScope = await rej(V(approvedRows(FIN.id, 'dan'), ratify(FIN.id, 'dan', 'eve'), 'eve', { signers }));
    expect(outOfScope?.status).toBe(403);
    await expect(V(approvedRows(LEGAL_PLAIN.id, 'dan'), ratify(LEGAL_PLAIN.id, 'dan', 'eve'), 'eve', { signers })).resolves.toMatchObject({ countersignedBy: 'eve' });
  });

  it('the approver countersigning in dual (or with no policy): 403 with the existing message', async () => {
    for (const extra of [{}, { signing: DUAL, reauthed: true, now: plus(60) }]) {
      const e = await rej(V(approvedRows(PLAIN.id, 'dan'), ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', extra));
      expect(e?.status).toBe(403);
      expect(e?.message).toMatch(/a different person from the approver must countersign/);
    }
  });

  it('solo, same person: needs a fresh sign-in', async () => {
    for (const reauthed of [false, undefined]) {
      const e = await rej(V(approvedRows(PLAIN.id, 'dan'), ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', { signing: SOLO, reauthed, now: plus(60) }));
      expect(e?.status).toBe(403);
      expect(e?.message).toMatch(/sign in again/);
    }
  });

  it('solo, same person: the wait must have elapsed since approval (409 with the minutes left)', async () => {
    const e = await rej(V(ledgered(approvedRows(PLAIN.id, 'dan'), approvalEntry(APPROVED_AT)), ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', { signing: SOLO, reauthed: true, now: plus(9) }));
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/1 minute left/);
  });

  it('solo, same person: an unreadable approval time never shortens the wait', async () => {
    const e = await rej(V(ledgered(approvedRows(PLAIN.id, 'dan'), approvalEntry('not a date')), ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', { signing: SOLO, reauthed: true, now: plus(600) }));
    expect(e?.status).toBe(409);
    expect(e?.message).toMatch(/left to wait/);
    const badClock = await rej(V(ledgered(approvedRows(PLAIN.id, 'dan'), approvalEntry(APPROVED_AT)), ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', { signing: SOLO, reauthed: true, now: new Date(NaN) }));
    expect(badClock?.status).toBe(409);
  });

  it('solo, same person, elapsed, reauthed, flagged: accepted as sent', async () => {
    const rec = ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' });
    const ok = await V(ledgered(approvedRows(PLAIN.id, 'dan'), approvalEntry(APPROVED_AT)), rec, 'dan', { signing: SOLO, reauthed: true, now: plus(10) });
    expect(ok).toEqual(rec);
    expect(ok).toMatchObject({ status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'dan', signing: 'single-signer' });
  });

  it('solo, same person: a record missing the marker is 400', async () => {
    const e = await rej(V(ledgered(approvedRows(PLAIN.id, 'dan'), approvalEntry(APPROVED_AT)), ratify(PLAIN.id, 'dan', 'dan'), 'dan', { signing: SOLO, reauthed: true, now: plus(10) }));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/must carry the single-signer marker/);
  });

  describe('the solo wait is timed from the server-authored ledger entry, never the client-supplied at', () => {
    const ctx = { signing: SOLO, reauthed: true, now: plus(30) };
    const rec = () => ratify(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' });
    const iso = (m: number) => plus(m).toISOString();
    // The approved version claims it was approved at plus(19): 11 minutes before now. Only the ledger tells the truth.
    const backdated = () => approvedRows(PLAIN.id, 'dan', { at: iso(19) });

    it('a backdated approved version with a ledger entry only 1 minute old is refused 409', async () => {
      const e = await rej(V(ledgered(backdated(), approvalEntry(iso(29))), rec(), 'dan', ctx));
      expect(e?.status).toBe(409);
      expect(e?.message).toMatch(/9 minutes left/);
    });

    it('the same with a ledger entry 11 minutes old is accepted', async () => {
      await expect(V(ledgered(backdated(), approvalEntry(iso(19))), rec(), 'dan', ctx)).resolves.toEqual(rec());
    });

    it('no hitl.approved ledger entry for the artefact (or only one for another artefact) is refused 409', async () => {
      for (const rows of [backdated(), ledgered(backdated(), approvalEntry(iso(0), 'dan', 'art_other'), { ...approvalEntry(iso(0)), action: 'hitl.rejected' })]) {
        const e = await rej(V(rows, rec(), 'dan', ctx));
        expect(e?.status).toBe(409);
        expect(e?.message).toMatch(/^solo signing: the approval was saved but is not recorded in the ledger for this version; .*edit the artefact and approve it again$/);
      }
    });

    it('an entry from an earlier approval voided by an edit does not count: the latest entry governs', async () => {
      const history = {
        artefact_versions: [
          art(), art({ status: 'IN_REVIEW' }), art({ status: 'APPROVED', approvedBy: 'dan', at: iso(0) }),
          art({ version: 2 }), art({ version: 2, status: 'IN_REVIEW' }), art({ version: 2, status: 'APPROVED', approvedBy: 'dan', at: iso(0) }),
        ],
      };
      const e = await rej(V(ledgered(history, approvalEntry(iso(0)), approvalEntry(iso(29), 'dan', 'art_1', 2)), ratify(PLAIN.id, 'dan', 'dan', { version: 2, signing: 'single-signer' }), 'dan', ctx));
      expect(e?.status).toBe(409);
      expect(e?.message).toMatch(/minutes left/);
      // and a re-approval that was never ledgered cannot borrow the earlier, voided entry
      const unledgered = await rej(V(ledgered(history, approvalEntry(iso(0))), ratify(PLAIN.id, 'dan', 'dan', { version: 2, signing: 'single-signer' }), 'dan', ctx));
      expect(unledgered?.status).toBe(409);
      expect(unledgered?.message).toMatch(/saved but is not recorded in the ledger/);
    });

    it('the latest entry must be by the current approver', async () => {
      const e = await rej(V(ledgered(backdated(), approvalEntry(iso(0), 'eve')), rec(), 'dan', ctx));
      expect(e?.status).toBe(409);
      expect(e?.message).toMatch(/saved but is not recorded in the ledger/);
    });
  });

  it('a different person: the marker must equal the approval (no forging, no dropping)', async () => {
    const forged = await rej(V(approvedRows(PLAIN.id, 'dan'), ratify(PLAIN.id, 'dan', 'eve', { signing: 'single-signer' }), 'eve', { signing: SOLO }));
    expect(forged?.status).toBe(400);
    expect(forged?.message).toMatch(/marker/);
    const flagged = approvedRows(SA.id, 'sarah', { signing: 'single-signer' });
    const dropped = await rej(V(flagged, ratify(SA.id, 'sarah', 'eve'), 'eve', { signing: SOLO }));
    expect(dropped?.status).toBe(400);
    await expect(V(flagged, ratify(SA.id, 'sarah', 'eve', { signing: 'single-signer' }), 'eve', { signing: SOLO })).resolves.toMatchObject({ signing: 'single-signer', countersignedBy: 'eve' });
  });

  it('a twoPerson agent in solo: the approver is refused, a different registered signer is accepted, a marker is refused', async () => {
    const signers = [signer('dan', ['security']), signer('eve', '*')];
    const ctx = { signing: SOLO, signers, reauthed: true, now: plus(60) };
    const self = await rej(V(approvedRows(TWO.id, 'dan'), ratify(TWO.id, 'dan', 'dan', { signing: 'single-signer' }), 'dan', ctx));
    expect(self?.status).toBe(403);
    expect(self?.message).toMatch(/a different person from the approver must countersign/);
    const ok = await V(approvedRows(TWO.id, 'dan'), ratify(TWO.id, 'dan', 'eve'), 'eve', ctx);
    expect(ok).toMatchObject({ status: 'RATIFIED', countersignedBy: 'eve' });
    expect('signing' in ok).toBe(false);
    const marked = await rej(V(approvedRows(TWO.id, 'dan'), ratify(TWO.id, 'dan', 'eve', { signing: 'single-signer' }), 'eve', ctx));
    expect(marked?.status).toBe(400);
  });

  describe('a professionalReview (attorney) agent', () => {
    const signers = [signer('sarah', '*'), signer('dan', ['legal']), signer('acc', ['legal'], 'accountant'), signer('eve', ['legal'], 'attorney'), signer('lerato', ['legal'], 'attorney'), signer('fin_att', ['finance'], 'attorney')];
    for (const signing of [DUAL, SOLO]) {
      const ctx = { signing, signers, reauthed: true, now: plus(60) };
      it(`${signing.mode}: refuses the owner, an accountant, the approver who is an attorney, and an attorney outside the department`, async () => {
        const owner = await rej(V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'sarah'), 'sarah', ctx));
        expect(owner?.status).toBe(403);
        expect(owner?.message).toMatch(/registered attorney/);
        const acc = await rej(V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'acc'), 'acc', ctx));
        expect(acc?.status).toBe(403);
        expect(acc?.message).toMatch(/registered attorney/);
        const approver = await rej(V(approvedRows(LEGAL.id, 'eve'), ratify(LEGAL.id, 'eve', 'eve', { signing: 'single-signer' }), 'eve', ctx));
        expect(approver?.status).toBe(403);
        expect(approver?.message).toMatch(/different person from the approver/);
        const elsewhere = await rej(V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'fin_att'), 'fin_att', ctx));
        expect(elsewhere?.status).toBe(403);
        expect(elsewhere?.message).toMatch(/not a registered signer for this department/);
      });
      it(`${signing.mode}: accepts a different registered attorney with no marker`, async () => {
        const ok = await V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'lerato'), 'lerato', ctx);
        expect(ok).toMatchObject({ status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'lerato' });
        expect('signing' in ok).toBe(false);
        expect((await rej(V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'lerato', { signing: 'single-signer' }), 'lerato', ctx)))?.status).toBe(400);
      });
    }
    it('solo with the owner and a registered attorney: the owner signs a normal agent alone; a legal artefact needs the attorney, never the owner', async () => {
      const both = [signer('sarah', '*'), signer('lerato', ['legal'], 'attorney')];
      const ctx = { signing: SOLO, signers: both, reauthed: true, now: plus(10) };
      // normal agent: the owner approves their own work and countersigns it after the wait, flagged single-signer
      const own = await V(ledgered(approvedRows(PLAIN.id, 'sarah'), approvalEntry(APPROVED_AT, 'sarah')), ratify(PLAIN.id, 'sarah', 'sarah', { signing: 'single-signer' }), 'sarah', ctx);
      expect(own).toMatchObject({ status: 'RATIFIED', approvedBy: 'sarah', countersignedBy: 'sarah', signing: 'single-signer' });
      // professionalReview: the owner may approve a draft the attorney wrote (a different person from the author) ...
      await expect(V(inReview(LEGAL.id, 'lerato'), decision(LEGAL.id, 'sarah', { requestedBy: 'lerato' }), 'sarah', ctx)).resolves.toMatchObject({ status: 'APPROVED', approvedBy: 'sarah' });
      // ... but never countersign it, even after the wait, re-authenticated and flagged
      const owner = await rej(V(ledgered(approvedRows(LEGAL.id, 'sarah'), approvalEntry(APPROVED_AT, 'sarah')), ratify(LEGAL.id, 'sarah', 'sarah', { signing: 'single-signer' }), 'sarah', ctx));
      expect(owner?.status).toBe(403);
      expect(owner?.message).toMatch(/different person from the approver/);
      const ownerUnflagged = await rej(V(approvedRows(LEGAL.id, 'sarah'), ratify(LEGAL.id, 'sarah', 'sarah'), 'sarah', ctx));
      expect(ownerUnflagged?.status).toBe(403);
      // the attorney, a different person from the approver, ratifies it with no marker
      const ok = await V(approvedRows(LEGAL.id, 'sarah'), ratify(LEGAL.id, 'sarah', 'lerato'), 'lerato', ctx);
      expect(ok).toMatchObject({ status: 'RATIFIED', approvedBy: 'sarah', countersignedBy: 'lerato' });
      expect('signing' in ok).toBe(false);
      // the attorney cannot countersign a legal artefact they approved themselves
      const self = await rej(V(approvedRows(LEGAL.id, 'lerato'), ratify(LEGAL.id, 'lerato', 'lerato', { signing: 'single-signer' }), 'lerato', ctx));
      expect(self?.status).toBe(403);
      // and the owner cannot approve a legal draft of their own in solo (the two-person rule is never relaxed)
      const selfApprove = await rej(V(inReview(LEGAL.id, 'sarah'), decision(LEGAL.id, 'sarah', { signing: 'single-signer' }), 'sarah', ctx));
      expect(selfApprove?.status).toBe(403);
    });

    it('fails closed with no signers configured: nobody holds the profession', async () => {
      for (const s of [undefined, []]) {
        const e = await rej(V(approvedRows(LEGAL.id, 'dan'), ratify(LEGAL.id, 'dan', 'lerato'), 'lerato', { signers: s }));
        expect(e?.status).toBe(403);
        expect(e?.message).toMatch(/registered attorney/);
      }
    });
  });
});

describe('ingesting keeps the marker', () => {
  const rows = () => ({
    artefact_versions: [art({ status: 'RATIFIED', approvedBy: 'dan', countersignedBy: 'dan', ratifiedAt: 't', signing: 'single-signer' })],
    documents: [{ id: 'rat_art_1_v1', origin: 'ratified', ratifiedFrom: { docHash: H } }],
  });
  const ingest = (o: Row = {}) => art({ status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'dan', ratifiedAt: 't', ingestedAt: 't2', ...o });

  it('accepts the same marker and refuses a dropped one', async () => {
    await expect(V(rows(), ingest({ signing: 'single-signer' }), 'dan')).resolves.toMatchObject({ signing: 'single-signer' });
    const e = await rej(V(rows(), ingest(), 'dan'));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/marker cannot change/);
  });
});

describe('the countersignatures row and countersign ledger entries follow the artefact', () => {
  const sig = (o: Row = {}) => ({ id: 'sig_1', artefactId: 'art_1', version: 1, docHash: H, signer: 'dan', ...o }) as Rec;
  const single = () => ratifiedRows(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' });

  it('a countersignature row carries the marker exactly when the signer is the approver', async () => {
    await expect(V(single(), sig({ signing: 'single-signer' }), 'dan', {}, 'countersignatures')).resolves.toBeDefined();
    expect((await rej(V(single(), sig(), 'dan', {}, 'countersignatures')))?.status).toBe(409);
    const inherited = ratifiedRows(SA.id, 'sarah', 'eve', { signing: 'single-signer' });
    await expect(V(inherited, sig({ signer: 'eve' }), 'eve', {}, 'countersignatures')).resolves.toBeDefined();
    expect((await rej(V(inherited, sig({ signer: 'eve', signing: 'single-signer' }), 'eve', {}, 'countersignatures')))?.status).toBe(409);
  });

  it('a professionalReview countersignature row records the profession, and no other row does', async () => {
    const legal = ratifiedRows(LEGAL.id, 'dan', 'lerato');
    await expect(V(legal, sig({ signer: 'lerato', profession: 'attorney' }), 'lerato', {}, 'countersignatures')).resolves.toBeDefined();
    expect((await rej(V(legal, sig({ signer: 'lerato' }), 'lerato', {}, 'countersignatures')))?.status).toBe(409);
    expect((await rej(V(legal, sig({ signer: 'lerato', profession: 'accountant' }), 'lerato', {}, 'countersignatures')))?.status).toBe(409);
    expect((await rej(V(ratifiedRows(PLAIN.id, 'dan', 'eve'), sig({ signer: 'eve', profession: 'attorney' }), 'eve', {}, 'countersignatures')))?.status).toBe(409);
  });

  it('artefact.countersigned / ratified detail.signing must be present iff approver equals countersigner and the marker is set', async () => {
    const l = (action: string, actor: string, detail: Row) => ({ orgId: 'o', actor, action, subject: 'art_1', detail });
    for (const action of ['artefact.countersigned', 'artefact.ratified']) {
      await expect(appendLedger(store(single()), l(action, 'dan', { signing: 'single-signer' }), 0, 'dan')).resolves.toBeDefined();
      const missing = await rej(appendLedger(store(single()), l(action, 'dan', {}), 0, 'dan'));
      expect(missing?.status).toBe(409);
      expect(missing?.message).toMatch(/marker/);
      const inherited = ratifiedRows(SA.id, 'sarah', 'eve', { signing: 'single-signer' });
      await expect(appendLedger(store(inherited), l(action, 'eve', {}), 0, 'eve')).resolves.toBeDefined();
      expect((await rej(appendLedger(store(inherited), l(action, 'eve', { signing: 'single-signer' }), 0, 'eve')))?.status).toBe(409);
    }
  });

  it('a professional countersign ledger entry records the profession', async () => {
    const l = (detail: Row) => ({ orgId: 'o', actor: 'lerato', action: 'artefact.countersigned', subject: 'art_1', detail });
    await expect(appendLedger(store(ratifiedRows(LEGAL.id, 'dan', 'lerato')), l({ profession: 'attorney' }), 0, 'lerato')).resolves.toBeDefined();
    expect((await rej(appendLedger(store(ratifiedRows(LEGAL.id, 'dan', 'lerato')), l({}), 0, 'lerato')))?.status).toBe(409);
    expect((await rej(appendLedger(store(ratifiedRows(PLAIN.id, 'dan', 'lerato')), l({ profession: 'attorney' }), 0, 'lerato')))?.status).toBe(409);
  });
});

describe('ratifiedProblem: the outbound gate', () => {
  const ratified = (agentId: string, approvedBy: string, countersignedBy: string, o: Row = {}) => art({ agentId, status: 'RATIFIED', approvedBy, countersignedBy, ratifiedAt: 't', ...o });
  const records = (approver: string, signer: string, sigExtra: Row = {}) => store({
    approvals: [{ id: 'apr_1', artefactId: 'art_1', decision: 'APPROVED', approver }],
    countersignatures: [{ id: 'sig_1', artefactId: 'art_1', version: 1, docHash: H, signer, ...sigExtra }],
  });

  it('accepts a flagged single-signer artefact with both records (read from the record, whatever the mode is now)', () => {
    expect(ratifiedProblem(records('dan', 'dan', { signing: 'single-signer' }), ratified(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' }))).toBeNull();
    expect(ratifiedProblem(records('dan', 'dan'), ratified(PLAIN.id, 'dan', 'dan', { status: 'INGESTED', signing: 'single-signer' }))).toBeNull();
  });

  it('refuses unflagged equal signers', () => {
    expect(ratifiedProblem(records('dan', 'dan'), ratified(PLAIN.id, 'dan', 'dan'))).toMatch(/two different signers/);
  });

  it('refuses a flagged artefact without a recorded approval and countersignature', () => {
    const a = ratified(PLAIN.id, 'dan', 'dan', { signing: 'single-signer' });
    expect(ratifiedProblem(store({}), a)).toMatch(/No recorded approval/);
    expect(ratifiedProblem(store({ approvals: [{ id: 'apr_1', artefactId: 'art_1', decision: 'APPROVED', approver: 'dan' }] }), a)).toMatch(/No recorded approval/);
    expect(ratifiedProblem(store({ countersignatures: [{ id: 'sig_1', artefactId: 'art_1', docHash: H, signer: 'dan' }] }), a)).toMatch(/No recorded approval/);
  });

  it('accepts different signers with or without an inherited marker', () => {
    expect(ratifiedProblem(records('dan', 'eve'), ratified(PLAIN.id, 'dan', 'eve'))).toBeNull();
    expect(ratifiedProblem(records('sarah', 'eve'), ratified(SA.id, 'sarah', 'eve', { signing: 'single-signer' }))).toBeNull();
  });

  it('refuses a professionalReview artefact flagged single-signer, with equal signers, or without the professional row', () => {
    expect(ratifiedProblem(records('eve', 'eve', { profession: 'attorney' }), ratified(LEGAL.id, 'eve', 'eve', { signing: 'single-signer' }))).not.toBeNull();
    expect(ratifiedProblem(records('dan', 'lerato', { profession: 'attorney' }), ratified(LEGAL.id, 'dan', 'lerato', { signing: 'single-signer' }))).not.toBeNull();
    expect(ratifiedProblem(records('dan', 'lerato'), ratified(LEGAL.id, 'dan', 'lerato'))).toMatch(/attorney/);
    expect(ratifiedProblem(records('dan', 'lerato', { profession: 'accountant' }), ratified(LEGAL.id, 'dan', 'lerato'))).toMatch(/attorney/);
    expect(ratifiedProblem(records('dan', 'lerato', { profession: 'attorney' }), ratified(LEGAL.id, 'dan', 'lerato'))).toBeNull();
  });

  it('refuses a twoPerson artefact with equal signers even when flagged, or carrying a marker', () => {
    expect(ratifiedProblem(records('dan', 'dan'), ratified(TWO.id, 'dan', 'dan', { signing: 'single-signer' }))).not.toBeNull();
    expect(ratifiedProblem(records('dan', 'eve'), ratified(TWO.id, 'dan', 'eve', { signing: 'single-signer' }))).not.toBeNull();
    expect(ratifiedProblem(records('dan', 'eve'), ratified(TWO.id, 'dan', 'eve'))).toBeNull();
  });
});

describe('round trip: the server accepts exactly what a correct Platform writes', () => {
  const human = (id: string): Actor => ({ id, name: id, kind: 'human', roles: ['Founder'] });
  const inputsFor = (a: typeof PLAIN) => Object.fromEntries(a.inputs.map((i) => [i.key, i.kind === 'number' ? '5' : i.kind === 'select' ? i.options![0]! : 'Pilot school onboarding process']));

  /** A storage adapter that runs every write through the server's validators first, as POST /api/warehouse and /api/ledger do. */
  function serverBacked(ctx: () => Partial<AppendCtx>) {
    const rows: Record<string, Row[]> = {};
    const server = store(rows);
    const errors: unknown[] = [];
    const adapter = new MemoryAdapter();
    const orig = adapter.append.bind(adapter);
    adapter.append = async (c: string, r: Rec) => {
      try {
        if (c === 'ledger') {
          await appendLedger(server, { orgId: r.orgId, actor: r.actor, action: r.action, subject: r.subject, detail: r.detail }, server.list('ledger').length, null);
        } else {
          server.append(c, await validateAppend(c, structuredClone(r), { actor: null, store: server, ...ctx() }));
        }
      } catch (e) {
        errors.push(e);
        throw e;
      }
      return orig(c, r);
    };
    return { adapter, errors, rows };
  }

  it('solo: author self-approval of a secondApprover agent, then self-countersign after the wait, then ingest', async () => {
    const solo = { signing: SOLO, signers: [signer('sarah', '*')] };
    const { adapter, errors, rows } = serverBacked(() => ({ ...solo, reauthed: true, now: new Date(Date.now() + 11 * 60_000) }));
    const p = await new Platform({ adapter, signing: SOLO, signers: solo.signers, onPersistError: (e) => errors.push(e) }).init();
    const sarah = human('sarah');
    const a = await p.runAgent(SA, inputsFor(SA), sarah);
    await p.submitForReview(a.id, sarah);
    await p.decide(a.id, sarah, 'APPROVED', 'ok', SA);
    const done = await p.countersign(a.id, sarah, '', SA, new Date(Date.now() + 11 * 60_000));
    await p.flush();
    expect(errors).toEqual([]);
    expect(done).toMatchObject({ status: 'INGESTED', approvedBy: 'sarah', countersignedBy: 'sarah', signing: 'single-signer' });
    expect(rows.countersignatures).toEqual([expect.objectContaining({ signer: 'sarah', signing: 'single-signer' })]);
    expect(ratifiedProblem(store(rows), store(rows).list('artefact_versions').filter((r) => r.id === a.id).at(-1))).toBeNull();
  });

  it('dual: an attorney countersigns a professional-review artefact; the server records the profession and no marker', async () => {
    const signers = [signer('sarah', '*'), signer('dan', ['legal']), signer('lerato', ['legal'], 'attorney')];
    const { adapter, errors, rows } = serverBacked(() => ({ signing: DUAL, signers }));
    const p = await new Platform({ adapter, signers, onPersistError: (e) => errors.push(e) }).init();
    const a = await p.runAgent(LEGAL, inputsFor(LEGAL), human('sarah'));
    await p.submitForReview(a.id, human('sarah'));
    await p.decide(a.id, human('dan'), 'APPROVED', 'ok', LEGAL);
    const done = await p.countersign(a.id, human('lerato'), '', LEGAL);
    await p.flush();
    expect(errors).toEqual([]);
    expect(done).toMatchObject({ status: 'INGESTED', approvedBy: 'dan', countersignedBy: 'lerato' });
    expect('signing' in done).toBe(false);
    expect(rows.countersignatures).toEqual([expect.objectContaining({ signer: 'lerato', profession: 'attorney' })]);
    expect(ratifiedProblem(store(rows), store(rows).list('artefact_versions').filter((r) => r.id === a.id).at(-1))).toBeNull();
  });
  describe('a custom agent, decided and countersigned the way the Board calls the Platform', () => {
    const def: CustomAgentDef = { id: 'agt-roundtrip1', kind: 'agent', dept: 'finance', name: 'Petty cash note', summary: 'Records a petty cash purchase', purpose: 'financial_planning', inputs: [{ key: 'what', label: 'What', kind: 'text' }], sections: [{ h: 'What', kind: 'input', ref: 'what' }], by: 'sarah', at: '2026-11-11T08:00:00Z' };
    const later = () => new Date(Date.now() + 11 * 60_000);

    async function drafted(signing: SigningPolicy, signers: Signer[], extra: () => Partial<AppendCtx> = () => ({})) {
      const { adapter, errors, rows } = serverBacked(() => ({ signing, signers, ...extra() }));
      const p = await new Platform({ adapter, signing, signers, onPersistError: (e) => errors.push(e) }).init();
      await saveDef(p.warehouse, def);
      const contract = customAgents(p.warehouse).find((a) => a.id === def.id);
      if (!contract) throw new Error('the custom agent did not register');
      const sarah = human('sarah');
      const a = await p.runAgent(contract, { what: 'Printer paper' }, sarah);
      await p.submitForReview(a.id, sarah);
      return { p, a, errors, rows, sarah };
    }

    it('contractFor resolves the custom agent from the warehouse: second approver, never two-person or professional', async () => {
      const { p, a } = await drafted(DUAL, []);
      const c = contractFor(a.agentId, p.warehouse);
      expect(c).toMatchObject({ id: def.id, secondApprover: true });
      expect(c?.twoPerson).toBeUndefined();
      expect(c?.professionalReview).toBeUndefined();
      expect(contractFor('agt-no-such-agent', p.warehouse)).toBeUndefined();
    });

    it('dual: the author approving their own run is refused by the Board gate, the Platform and the server', async () => {
      const { p, a, errors, rows, sarah } = await drafted(DUAL, []);
      const cur = p.artefact(a.id)!;
      expect(can(cur, 'sarah', { signing: DUAL, now: new Date(), defs: p.warehouse })).toEqual({ ok: false, why: 'This agent needs someone other than its author to approve.' });
      // the Board passes contractFor(...); a caller that omits the agent gets the same answer, resolved from the artefact
      await expect(p.decide(a.id, sarah, 'APPROVED', 'mine', contractFor(a.agentId, p.warehouse))).rejects.toThrow(/second person to approve/);
      await expect(p.decide(a.id, sarah, 'APPROVED', 'mine')).rejects.toThrow(/second person to approve/);
      // a forged self-approval straight to the server is refused too
      const forged = await rej(validateAppend('artefact_versions', { ...cur, status: 'APPROVED', approvedBy: 'sarah' }, { actor: 'sarah', store: store(rows), signing: DUAL }));
      expect(forged?.status).toBe(403);
      await p.flush();
      expect(errors).toEqual([]);
      // a different person may approve it
      await expect(p.decide(a.id, human('dan'), 'APPROVED', 'ok', contractFor(a.agentId, p.warehouse))).resolves.toMatchObject({ status: 'APPROVED', approvedBy: 'dan' });
    });

    for (const how of ['with contractFor, as the Board calls it', 'without the agent (the Platform resolves it)'] as const) {
      it(`solo: the author self-approves (${how}), carrying the marker, then countersigns after the wait`, async () => {
        const signers = [signer('sarah', '*')];
        const { p, a, errors, rows, sarah } = await drafted(SOLO, signers, () => ({ reauthed: true, now: later() }));
        const agent = how === 'without the agent (the Platform resolves it)' ? undefined : contractFor(a.agentId, p.warehouse);
        expect(can(p.artefact(a.id)!, 'sarah', { signing: SOLO, now: new Date(), defs: p.warehouse }).ok).toBe(true);
        const approved = await p.decide(a.id, sarah, 'APPROVED', 'ok', agent);
        expect(approved).toMatchObject({ status: 'APPROVED', approvedBy: 'sarah', signing: 'single-signer' });
        const done = await p.countersign(a.id, sarah, '', agent, later());
        await p.flush();
        expect(errors).toEqual([]);
        expect(done).toMatchObject({ status: 'INGESTED', approvedBy: 'sarah', countersignedBy: 'sarah', signing: 'single-signer' });
        expect(rows.approvals).toEqual([expect.objectContaining({ approver: 'sarah', signing: 'single-signer' })]);
        expect(ratifiedProblem(store(rows), store(rows).list('artefact_versions').filter((r) => r.id === a.id).at(-1))).toBeNull();
      });
    }
  });
});
