import { describe, expect, it } from 'vitest';
import { Platform, RunRefused, type Artefact } from '../src/core/platform';
import { SINGLE_SIGNER } from '../src/core/signing';
import { LIBRARY_DOC_AGENT, needsReview, saveRecord, type DocRecord } from '../src/core/documents';
import { ratifiedProblem } from '../src/server/finality';
import { validateAppend } from '../src/server/validate';
import { singleSignerReport } from '../src/server/signing';
import { buildCeoState } from '../src/core/ceo';
import { DEPARTMENTS, agentById } from '../src/departments';
import { contractFor } from '../src/departments/custom';
import { can, signingHint } from '../src/ui/boardGate';
import { sourceOf } from '../src/library/sourceOf';
import { canonical, sha256Hex } from '../src/core/crypto';
import type { Actor, Doc } from '../src/core/types';
import type { Rec } from '../src/core/warehouse';

const human = (id: string): Actor => ({ id, name: id, kind: 'human', roles: ['founder'] });
const sarah = human('sarah');
const dan = human('dan');
const bot: Actor = { id: 'OPS-X-01', name: 'bot', kind: 'agent', roles: [] };
const auto: Actor = { id: 'auto:order-1', name: 'auto', kind: 'human', roles: [] };

const DOC: Doc = { title: 'Privacy policy', blocks: [{ type: 'h', level: 2, text: 'Scope' }, { type: 'p', text: 'We keep school contact details only.' }], meta: { owner: 'library' } };
const solo = { signing: { mode: 'solo' as const, waitMs: 600_000 } };
const after = (a: Artefact, minutes: number) => new Date(Date.parse(a.at) + minutes * 60_000);

async function withRecord(p: Platform, over: Partial<DocRecord> = {}): Promise<DocRecord> {
  const rec: DocRecord = { id: 'lib-privacy-1', title: DOC.title, origin: 'template', name: 'lib-privacy-1.docx', kind: 'docx', doc: structuredClone(DOC), scan: { scanned: true, notes: ['No review flag'] }, dept: 'legal', by: 'library-seed', at: '2026-11-26T00:00:00.000Z', ...over };
  return saveRecord(p.warehouse, rec);
}
const rowOf = (a: Artefact) => a as unknown as Rec;
const refused = async (pr: Promise<unknown>) => { try { await pr; } catch (e) { return e as Error; } return undefined; };

describe('needsReview', () => {
  const rec = (notes: string[]): DocRecord => ({ id: 'x', title: 't', origin: 'template', scan: { scanned: true, notes }, by: 'b', at: 'a' });
  it('is true when any scan note starts with "Needs review by"', () => {
    expect(needsReview(rec(['Needs review by a POPIA attorney']))).toBe(true);
    expect(needsReview(rec(['Contains personal details (email).', 'Needs review by an accountant']))).toBe(true);
  });
  it('is false for no flag, an empty list, or the phrase in the middle of a note', () => {
    expect(needsReview(rec(['No review flag']))).toBe(false);
    expect(needsReview(rec([]))).toBe(false);
    expect(needsReview(rec(['This one Needs review by nobody']))).toBe(false);
  });
});

describe('promoteDocument', () => {
  it('creates a DRAFT with the same title and doc, the library agent id, and a ledger entry', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    expect(a).toMatchObject({ status: 'DRAFT', version: 1, title: 'Privacy policy', agentId: 'LIBRARY-DOC', dept: 'legal', engine: 'library', requestedBy: 'sarah', flags: [] });
    expect(LIBRARY_DOC_AGENT).toBe('LIBRARY-DOC');
    expect(a.formats).toEqual(['docx', 'pdf', 'md', 'csv', 'json', 'html', 'xlsx']);
    expect(a.doc.blocks).toEqual(DOC.blocks);
    expect(a.doc.meta.sourceDocId).toBe('lib-privacy-1');
    expect(p.artefact(a.id)?.docHash).toMatch(/^[0-9a-f]{64}$/);
    const e = p.ledger.all.find((x) => x.action === 'document.promote');
    expect(e).toMatchObject({ actor: 'sarah', subject: a.id });
    expect(await p.ledger.verify()).toBeNull();
  });

  it('never changes the library record, and the artefact does not share its objects', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    const before = JSON.stringify(p.warehouse.latest('documents'));
    const a = await p.promoteDocument(rec.id, sarah);
    expect(JSON.stringify(p.warehouse.latest('documents'))).toBe(before);
    a.doc.blocks[1].text = 'changed';
    expect(p.warehouse.latest<DocRecord>('documents')[0].doc?.blocks[1].text).toBe('We keep school contact details only.');
    expect(p.warehouse.latest<DocRecord>('documents')[0].doc?.meta.sourceDocId).toBeUndefined();
  });

  it('defaults the department to library', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p, { dept: undefined });
    expect((await p.promoteDocument(rec.id, sarah)).dept).toBe('library');
  });

  it('is idempotent: the same artefact comes back at every stage, including ratified', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    expect((await p.promoteDocument(rec.id, sarah)).id).toBe(a.id);
    await p.submitForReview(a.id, sarah);
    expect((await p.promoteDocument(rec.id, sarah)).id).toBe(a.id);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    expect((await p.promoteDocument(rec.id, dan)).id).toBe(a.id);
    await p.countersign(a.id, sarah, '', undefined, after(ap, 11));
    const again = await p.promoteDocument(rec.id, sarah);
    expect(again.id).toBe(a.id);
    expect(again.status).toBe('INGESTED');
    expect(p.artefacts().filter((x) => x.doc.meta.sourceDocId === rec.id)).toHaveLength(1);
  });

  it('artefactForDocument returns the newest artefact for a document, or undefined', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    expect(p.artefactForDocument(rec.id)).toBeUndefined();
    const a = await p.promoteDocument(rec.id, sarah);
    expect(p.artefactForDocument(rec.id)?.id).toBe(a.id);
    await p.submitForReview(a.id, sarah);
    expect(p.artefactForDocument(rec.id)?.status).toBe('IN_REVIEW');
  });

  it('refuses agents, autonomous actors and anything that is not a human', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    for (const who of [bot, auto]) {
      const e = await refused(p.promoteDocument(rec.id, who));
      expect(e).toBeInstanceOf(RunRefused);
      expect((e as RunRefused).kind).toBe('hitl');
    }
    expect(p.artefacts()).toHaveLength(0);
  });

  it('refuses an unknown document, a stored-as-is file and a deleted record', async () => {
    const p = await new Platform().init();
    const pdf = await withRecord(p, { id: 'doc-pdf', kind: 'pdf', doc: undefined });
    const gone = await withRecord(p, { id: 'doc-gone', deleted: true });
    expect((await refused(p.promoteDocument('nope', sarah)))?.message).toMatch(/unknown document/i);
    expect((await refused(p.promoteDocument(pdf.id, sarah)))?.message).toMatch(/cannot be edited|stored as/i);
    expect((await refused(p.promoteDocument(gone.id, sarah)))?.message).toMatch(/unknown document/i);
    expect(p.artefacts()).toHaveLength(0);
  });

  it('refuses a document that carries learner identifiers, as an edit would', async () => {
    const p = await new Platform().init();
    const bad: Doc = { title: 'Register', blocks: [{ type: 'p', text: 'Learner ID number 0101015009087 attended.' }], meta: {} };
    const rec = await withRecord(p, { id: 'doc-learner', doc: bad });
    const e = await refused(p.promoteDocument(rec.id, sarah));
    expect(e).toBeInstanceOf(RunRefused);
    expect((e as RunRefused).kind).toBe('learner_data');
    expect(p.artefacts()).toHaveLength(0);
  });
});

describe('founder-only signing of a library document', () => {
  it('solo: refused before the wait, then ratified and ingested alone, flagged single-signer', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', 'ok');
    expect(ap.signing).toBeUndefined(); // the library agent has no second-approver rule, so approval alone carries no flag
    const early = await refused(p.countersign(a.id, sarah, '', undefined, after(ap, 3)));
    expect(early).toBeInstanceOf(RunRefused);
    expect(early?.message).toMatch(/minute/);
    expect(early?.message).toMatch(/left/);
    expect(p.artefact(a.id)?.status).toBe('APPROVED');
    const done = await p.countersign(a.id, sarah, '', undefined, after(ap, 11));
    expect(['RATIFIED', 'INGESTED']).toContain(done.status);
    expect(done.status).toBe('INGESTED');
    expect(done.signing).toBe(SINGLE_SIGNER);
    expect(p.warehouse.list('documents', (r) => r['id'] === `rat_${a.id}_v1`)).toHaveLength(1);
    expect(p.brain.all.some((f) => f.tier === 'L2' && f.topic === 'ratified.LIBRARY-DOC')).toBe(true);
    expect(p.warehouse.list<{ signing?: string }>('countersignatures')[0]?.signing).toBe(SINGLE_SIGNER);
  });

  it('solo: the wait is not skipped by editing; any edit voids the approval and returns it to DRAFT', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    await p.decide(a.id, sarah, 'APPROVED', '');
    const edited = await p.edit(a.id, { ...DOC, blocks: [...DOC.blocks, { type: 'p', text: 'More.' }] }, sarah);
    expect(edited.status).toBe('DRAFT');
    expect((await refused(p.countersign(a.id, sarah, '', undefined, after(edited, 60))))?.message).toMatch(/approved artefact/);
  });

  it('dual (default): the approver countersigning their own approval is refused', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    const e = await refused(p.countersign(a.id, sarah, '', undefined, after(ap, 60)));
    expect(e).toBeInstanceOf(RunRefused);
    expect(e?.message).toBe('A different person from the approver must countersign.');
    const ok = await p.countersign(a.id, dan, '', undefined, after(ap, 60));
    expect(ok.status).toBe('INGESTED');
    expect(ok.signing).toBeUndefined();
  });

  it('an edit after ratification is refused, and a revision starts a new draft', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    await p.countersign(a.id, sarah, '', undefined, after(ap, 11));
    const e = await refused(p.edit(a.id, DOC, sarah));
    expect(e).toBeInstanceOf(RunRefused);
    expect(e?.message).toMatch(/final/);
    const rev = await p.revise(a.id, sarah);
    expect(rev).toMatchObject({ status: 'DRAFT', agentId: 'LIBRARY-DOC', revisionOf: a.id });
    expect(rev.doc.meta.sourceDocId).toBe(rec.id);
  });

  it('agents and autonomous actors can never sign a library document', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    for (const who of [bot, auto]) expect(await refused(p.decide(a.id, who, 'APPROVED', ''))).toBeInstanceOf(RunRefused);
  });
});

describe('needs-review documents', () => {
  const flagged = { scan: { scanned: true, notes: ['Needs review by a registered attorney'] } };

  async function ratify(p: Platform, over: Partial<DocRecord>) {
    const rec = await withRecord(p, over);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    return p.countersign(a.id, sarah, '', undefined, after(ap, 11));
  }

  it('promote sets the needs-review flag', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p, flagged);
    expect((await p.promoteDocument(rec.id, sarah)).flags).toEqual(['needs-review']);
  });

  it('the outbound gate refuses a needs-review artefact with no professional countersignature', async () => {
    const p = await new Platform(solo).init();
    const done = await ratify(p, flagged);
    expect(ratifiedProblem(p.warehouse, rowOf(done))).toBe('This document is marked for professional review and none is recorded; it cannot leave the platform.');
  });

  it('the gate passes it once a countersignature on the same hash carries a profession', async () => {
    const p = await new Platform(solo).init();
    const done = await ratify(p, flagged);
    expect(ratifiedProblem(p.warehouse, rowOf(done))).not.toBeNull();
    const row = p.warehouse.list<Rec>('countersignatures')[0];
    await p.warehouse.put('countersignatures', { ...row, id: 'sig_pro', profession: 'attorney' });
    expect(ratifiedProblem(p.warehouse, rowOf(done))).toBeNull();
  });

  it('a profession on a countersignature for a different hash does not count', async () => {
    const p = await new Platform(solo).init();
    const done = await ratify(p, flagged);
    const row = p.warehouse.list<Rec>('countersignatures')[0];
    await p.warehouse.put('countersignatures', { ...row, id: 'sig_other', docHash: 'f'.repeat(64), profession: 'attorney' });
    expect(ratifiedProblem(p.warehouse, rowOf(done))).not.toBeNull();
  });

  it('pin: an artefact without the flag behaves exactly as before', async () => {
    const p = await new Platform(solo).init();
    const plain = await ratify(p, {});
    expect(ratifiedProblem(p.warehouse, rowOf(plain))).toBeNull();
    // other flags (the guardrails'), or an unratified artefact, give the same answers as before the rule existed
    expect(ratifiedProblem(p.warehouse, { ...plain, flags: ['unsourced_claims:2'] } as unknown as Rec)).toBeNull();
    expect(ratifiedProblem(p.warehouse, { ...plain, status: 'APPROVED' } as unknown as Rec)).toBe('Only a ratified artefact (approved and countersigned) can leave the platform.');
    expect(ratifiedProblem(p.warehouse, undefined)).toBe('unknown artefact');
    expect(ratifiedProblem(p.warehouse, { ...plain, flags: undefined } as unknown as Rec)).toBeNull();
  });
});

describe('an artefact with no agent contract (LIBRARY-DOC) on the main read paths', () => {
  it('has no built-in or custom contract, and every reader copes', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    expect(agentById(a.agentId)).toBeUndefined();
    expect(contractFor(a.agentId, p.warehouse)).toBeUndefined();
    expect(signingHint(contractFor(a.agentId, p.warehouse))).toBe('');

    // Board and Studio gates: the author may approve in review, and the solo wait applies to the self-countersign
    await p.submitForReview(a.id, sarah);
    const gate = { signing: solo.signing, now: new Date(), defs: p.warehouse };
    expect(can(p.artefact(a.id)!, 'sarah', gate)).toEqual({ ok: true, why: '' });
    await p.decide(a.id, sarah, 'APPROVED', '');
    const approvedAt = p.ledger.all.find((e) => e.action === 'hitl.approved')!.at;
    expect(can(p.artefact(a.id)!, 'sarah', { ...gate, approvedAtFromLedger: approvedAt }).ok).toBe(false);
    expect(can(p.artefact(a.id)!, 'sarah', { ...gate, now: new Date(Date.parse(approvedAt) + 11 * 60_000), approvedAtFromLedger: approvedAt }).ok).toBe(true);

    // CEO command centre, department health and tasks
    const state = buildCeoState({ departments: DEPARTMENTS, collections: p.warehouse.all(), agentSecondApprover: (id) => Boolean(agentById(id)?.secondApprover), now: Date.now() });
    expect(state.tasks.some((t) => t.title.includes(a.title))).toBe(false); // APPROVED with no second-approver rule needs no countersign task
    expect(state.health.length).toBe(DEPARTMENTS.length);

    // Outbound gate, report, source chip
    const done = await p.countersign(a.id, sarah, '', undefined, new Date(Date.parse(approvedAt) + 11 * 60_000));
    expect(ratifiedProblem(p.warehouse, rowOf(done))).toBeNull();
    expect(singleSignerReport(p.warehouse).items.map((i) => i.agentId)).toEqual(['LIBRARY-DOC']);
    expect(sourceOf(rec)).toBe('library'); // lib- ids keep their source chip
  });

  it('the server accepts a new LIBRARY-DOC draft and still refuses an unknown agent id', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    const row = p.warehouse.list<Rec>('artefact_versions')[0];
    const ok = await validateAppend('artefact_versions', { ...row, id: 'art_new_ok' }, { actor: 'sarah', store: { list: () => [] } });
    expect(ok.agentId).toBe('LIBRARY-DOC');
    await expect(validateAppend('artefact_versions', { ...row, id: 'art_new_bad', agentId: 'LIBRARY-DOC-2' }, { actor: 'sarah', store: { list: () => [] } })).rejects.toMatchObject({ message: 'unknown agent' });
    expect(a.agentId).toBe('LIBRARY-DOC');
  });

  it('the server runs the solo rules for it: re-entry, the wait, and the marker', async () => {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    await p.decide(a.id, sarah, 'APPROVED', '');
    const t0 = Date.parse(p.ledger.all.find((e) => e.action === 'hitl.approved')!.at);
    const done = await p.countersign(a.id, sarah, '', undefined, new Date(t0 + 11 * 60_000));
    const rows = p.warehouse.list<Rec>('artefact_versions');
    const approvedRow = rows.filter((r) => r.status === 'APPROVED').at(-1)!;
    const ratifiedRow = rows.filter((r) => r.status === 'RATIFIED').at(-1)!;
    const store = { list: (c: string) => (c === 'artefact_versions' ? [approvedRow] : c === 'ledger' ? (p.ledger.all as unknown as Rec[]) : []) };
    const ctx = { actor: 'sarah', store, signing: solo.signing, now: new Date(t0 + 11 * 60_000) };
    await expect(validateAppend('artefact_versions', ratifiedRow, { ...ctx, reauthed: false })).rejects.toMatchObject({ message: /sign in again/ });
    await expect(validateAppend('artefact_versions', ratifiedRow, { ...ctx, reauthed: true, now: new Date(t0 + 60_000) })).rejects.toMatchObject({ message: /minutes? left/ });
    await expect(validateAppend('artefact_versions', ratifiedRow, { ...ctx, reauthed: true })).resolves.toBeDefined();
    expect(done.signing).toBe(SINGLE_SIGNER);
  });
});

describe('the needs-review flag cannot be dropped', () => {
  const flagged = { scan: { scanned: true, notes: ['Needs review by a registered attorney'] } };
  const asActor = { actor: 'sarah' };

  async function ratified(p: Platform, over: Partial<DocRecord>) {
    const rec = await withRecord(p, over);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    return { rec, done: await p.countersign(a.id, sarah, '', undefined, after(ap, 11)) };
  }

  it('a revision of a ratified needs-review artefact carries the flag, and stays blocked when ratified solo', async () => {
    const p = await new Platform(solo).init();
    const { done } = await ratified(p, flagged);
    const rev = await p.revise(done.id, sarah);
    expect(rev.flags).toEqual(['needs-review']);
    await p.submitForReview(rev.id, sarah);
    const ap = await p.decide(rev.id, sarah, 'APPROVED', '');
    const again = await p.countersign(rev.id, sarah, '', undefined, after(ap, 11));
    expect(ratifiedProblem(p.warehouse, rowOf(again))).toBe('This document is marked for professional review and none is recorded; it cannot leave the platform.');
  });

  it('pin: a revision copies only that flag, so an unflagged artefact still gets none', async () => {
    const p = await new Platform(solo).init();
    const { done } = await ratified(p, {});
    expect((await p.revise(done.id, sarah)).flags).toEqual([]);
    const q = await new Platform(solo).init();
    const rec = await withRecord(q);
    const a = await q.promoteDocument(rec.id, sarah);
    // another guardrail flag is not carried onto a revision
    await q.submitForReview(a.id, sarah);
    const ap = await q.decide(a.id, sarah, 'APPROVED', '');
    const d2 = await q.countersign(a.id, sarah, '', undefined, after(ap, 11));
    const withFlag = { ...d2, flags: ['unsourced_claims:1'] };
    await q.warehouse.put('artefact_versions', { ...withFlag, editedBy: 'sarah' } as unknown as Rec & { id: string });
    expect((await q.revise(a.id, sarah)).flags).toEqual([]);
  });

  it('the server refuses a version that drops the flag or adds it, and accepts one that keeps it', async () => {
    const p = await new Platform().init();
    const rec = await withRecord(p, flagged);
    const a = await p.promoteDocument(rec.id, sarah);
    const v2 = await p.edit(a.id, { ...DOC, blocks: [...DOC.blocks, { type: 'p', text: 'More.' }] }, sarah);
    const stored = p.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === a.id && r.version === 1);
    const row = p.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === a.id && r.version === 2).at(-1)!;
    const ctx = { ...asActor, store: { list: (c: string) => (c === 'artefact_versions' ? stored : []) } };
    expect(v2.flags).toEqual(['needs-review']);
    await expect(validateAppend('artefact_versions', row, ctx)).resolves.toBeDefined();
    await expect(validateAppend('artefact_versions', { ...row, flags: [] }, ctx)).rejects.toMatchObject({ message: 'the needs-review flag cannot be added or removed' });
    await expect(validateAppend('artefact_versions', { ...row, flags: ['unsourced_claims:1'] }, ctx)).rejects.toMatchObject({ message: 'the needs-review flag cannot be added or removed' });
    // the other way: an unflagged artefact cannot gain it
    const plain = await new Platform().init();
    const prec = await withRecord(plain);
    const pa = await plain.promoteDocument(prec.id, sarah);
    await plain.edit(pa.id, { ...DOC, blocks: [...DOC.blocks, { type: 'p', text: 'More.' }] }, sarah);
    const pstored = plain.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === pa.id && r.version === 1);
    const prow = plain.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === pa.id && r.version === 2).at(-1)!;
    const pctx = { ...asActor, store: { list: (c: string) => (c === 'artefact_versions' ? pstored : []) } };
    await expect(validateAppend('artefact_versions', prow, pctx)).resolves.toBeDefined(); // a normal edit of an unflagged artefact
    await expect(validateAppend('artefact_versions', { ...prow, flags: ['needs-review'] }, pctx)).rejects.toMatchObject({ message: 'the needs-review flag cannot be added or removed' });
  });

  it('a new artefact from a needs-review library document must carry the flag; other sources are unaffected', async () => {
    const p = await new Platform().init();
    const hot = await withRecord(p, { id: 'lib-hot', ...flagged });
    const cold = await withRecord(p, { id: 'lib-cold' });
    const hotArt = await p.promoteDocument(hot.id, sarah);
    const coldArt = await p.promoteDocument(cold.id, sarah);
    const rowFor = (id: string) => p.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === id)[0];
    const ctx = { ...asActor, store: { list: (c: string) => (c === 'documents' ? p.warehouse.list<Rec>('documents') : []) } };
    const fresh = (r: Rec, id: string, flags: string[]) => ({ ...r, id, flags });
    await expect(validateAppend('artefact_versions', fresh(rowFor(hotArt.id), 'art_n1', []), ctx)).rejects.toMatchObject({ message: /needs-review flag/ });
    await expect(validateAppend('artefact_versions', fresh(rowFor(hotArt.id), 'art_n2', ['needs-review']), ctx)).resolves.toBeDefined();
    await expect(validateAppend('artefact_versions', fresh(rowFor(coldArt.id), 'art_n3', []), ctx)).resolves.toBeDefined();
    // a source id that names no stored record is not blocked
    const orphan = { ...fresh(rowFor(coldArt.id), 'art_n4', []), doc: { ...(rowFor(coldArt.id).doc as Doc), meta: { sourceDocId: 'lib-missing' } } };
    const { sha256Hex, canonical } = await import('../src/core/crypto');
    await expect(validateAppend('artefact_versions', { ...orphan, docHash: await sha256Hex(canonical(orphan.doc)) }, ctx)).resolves.toBeDefined();
  });
});

describe('the server requires the needs-review flag on a revision of a flagged artefact', () => {
  const flagged = { scan: { scanned: true, notes: ['Needs review by a registered attorney'] } };
  async function setup(over: Partial<DocRecord>) {
    const p = await new Platform(solo).init();
    const rec = await withRecord(p, over);
    const a = await p.promoteDocument(rec.id, sarah);
    await p.submitForReview(a.id, sarah);
    const ap = await p.decide(a.id, sarah, 'APPROVED', '');
    const done = await p.countersign(a.id, sarah, '', undefined, after(ap, 11));
    const stored = p.warehouse.list<Rec>('artefact_versions');
    const ctx = { actor: 'sarah', store: { list: (c: string) => (c === 'artefact_versions' ? stored : []) } };
    return { p, done, ctx };
  }
  // A client-built revision with no sourceDocId in its doc, so only the revisionOf rule can catch it.
  const post = (done: Artefact, flags: string[]) => {
    const doc = { ...done.doc, meta: {} as Record<string, string> };
    return sha256Hex(canonical(doc)).then((docHash) => ({ ...rowOf(done), id: 'art_rev_client', version: 1, status: 'DRAFT', doc, docHash, flags, revisionOf: done.id, requestedBy: done.requestedBy, approvedBy: undefined, countersignedBy: undefined, signing: undefined }) as Rec);
  };

  it('refuses a revision of a flagged ratified artefact without the flag, accepts it with the flag', async () => {
    const { done, ctx } = await setup(flagged);
    await expect(validateAppend('artefact_versions', await post(done, []), ctx)).rejects.toMatchObject({ message: 'a revision of a needs-review artefact must carry the flag' });
    await expect(validateAppend('artefact_versions', await post(done, ['needs-review']), ctx)).resolves.toBeDefined();
  });

  it('pin: a revision of an unflagged ratified artefact is accepted with no flag', async () => {
    const { done, ctx } = await setup({});
    await expect(validateAppend('artefact_versions', await post(done, []), ctx)).resolves.toBeDefined();
  });

  it("the platform's own revise of a flagged artefact passes validation", async () => {
    const { p, done, ctx } = await setup(flagged);
    const rev = await p.revise(done.id, sarah);
    const row = p.warehouse.list<Rec>('artefact_versions').filter((r) => r.id === rev.id)[0];
    expect(rev.flags).toEqual(['needs-review']);
    await expect(validateAppend('artefact_versions', row, ctx)).resolves.toBeDefined();
  });
});
