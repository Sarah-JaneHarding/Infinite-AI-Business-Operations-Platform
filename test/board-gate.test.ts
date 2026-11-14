import { describe, expect, it } from 'vitest';
import { can, signingHint } from '../src/ui/boardGate';
import { AGENTS } from '../src/departments';
import type { Artefact } from '../src/core/platform';
import type { SigningPolicy } from '../src/core/signing';
import type { CustomAgentDef } from '../src/departments/custom';

const DUAL: SigningPolicy = { mode: 'dual', waitMs: 600_000 };
const SOLO: SigningPolicy = { mode: 'solo', waitMs: 600_000 };
const plain = AGENTS.find((a) => !a.secondApprover)!;
const second = AGENTS.find((a) => a.secondApprover && !a.twoPerson && !a.professionalReview)!;
const twoPerson = AGENTS.find((a) => a.twoPerson && !a.professionalReview)!;
const pro = AGENTS.find((a) => a.professionalReview)!;

const art = (agentId: string, over: Partial<Artefact>): Artefact => ({
  id: 'A1', orgId: 'org', agentId, dept: 'd', title: 't', status: 'APPROVED', version: 2, requestedBy: 'sarah',
  formats: [], doc: {} as Artefact['doc'], flags: [], engine: 'e', at: '2026-01-01T00:00:00.000Z', approvedBy: 'sarah', ...over,
});
const T0 = '2026-01-01T00:00:00.000Z';
/** No custom definitions: only built-in agents are known. */
const NO_DEFS = { latest: <T>(): T[] => [] };
const CUSTOM: CustomAgentDef = { id: 'agt-custom1', kind: 'agent', dept: 'finance', name: 'Petty cash note', summary: 'Records a petty cash purchase', purpose: 'financial_planning', inputs: [{ key: 'what', label: 'What', kind: 'text' }], sections: [{ h: 'What', kind: 'input', ref: 'what' }], by: 'sarah', at: '2026-11-11T08:00:00Z' };
const WITH_CUSTOM = { latest: <T>(c: string): T[] => (c === 'custom_defs' ? [CUSTOM as unknown as T] : []) };
const at = (ms: number) => new Date(Date.parse(T0) + ms);

describe('can(): approving', () => {
  it('lets anyone approve an agent without a second approver', () => {
    expect(can(art(plain.id, { status: 'IN_REVIEW' }), 'sarah', { defs: NO_DEFS, signing: DUAL, now: at(0) }).ok).toBe(true);
  });
  it('refuses the author in dual mode', () => {
    const g = can(art(second.id, { status: 'IN_REVIEW' }), 'sarah', { defs: NO_DEFS, signing: DUAL, now: at(0) });
    expect(g).toEqual({ ok: false, why: 'This agent needs someone other than its author to approve.' });
  });
  it('allows the author in solo mode for a plain secondApprover agent', () => {
    expect(can(art(second.id, { status: 'IN_REVIEW' }), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(0) }).ok).toBe(true);
  });
  it('still refuses the author in solo mode for a twoPerson agent and a professionalReview agent', () => {
    expect(can(art(twoPerson.id, { status: 'IN_REVIEW' }), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(0) }).ok).toBe(false);
    expect(can(art(pro.id, { status: 'IN_REVIEW' }), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(0) }).ok).toBe(false);
  });
  it('lets a different person approve', () => {
    expect(can(art(second.id, { status: 'IN_REVIEW' }), 'dan', { defs: NO_DEFS, signing: DUAL, now: at(0) }).ok).toBe(true);
  });
});

describe('can(): a custom agent (contract from the warehouse custom definitions)', () => {
  it('refuses its author in dual mode, as the server does', () => {
    const g = can(art(CUSTOM.id, { status: 'IN_REVIEW' }), 'sarah', { defs: WITH_CUSTOM, signing: DUAL, now: at(0) });
    expect(g).toEqual({ ok: false, why: 'This agent needs someone other than its author to approve.' });
  });
  it('allows its author in solo mode, and anyone else in dual', () => {
    expect(can(art(CUSTOM.id, { status: 'IN_REVIEW' }), 'sarah', { defs: WITH_CUSTOM, signing: SOLO, now: at(0) }).ok).toBe(true);
    expect(can(art(CUSTOM.id, { status: 'IN_REVIEW' }), 'dan', { defs: WITH_CUSTOM, signing: DUAL, now: at(0) }).ok).toBe(true);
  });
});

describe('can(): countersigning your own approval', () => {
  it('is refused in dual mode with the existing text', () => {
    expect(can(art(plain.id, {}), 'sarah', { defs: NO_DEFS, signing: DUAL, now: at(0), approvedAtFromLedger: T0 })).toEqual({ ok: false, why: 'You approved this. A different person must countersign.' });
  });
  it('lets a different person countersign', () => {
    expect(can(art(plain.id, {}), 'dan', { defs: NO_DEFS, signing: DUAL, now: at(0) }).ok).toBe(true);
  });
  it('waits in solo mode and says how many minutes are left', () => {
    const g = can(art(plain.id, {}), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(4 * 60_000 + 1), approvedAtFromLedger: T0 });
    expect(g.ok).toBe(false);
    expect(g.why).toMatch(/6 minutes/);
  });
  it('is allowed in solo mode once the wait is over', () => {
    expect(can(art(plain.id, {}), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(600_000), approvedAtFromLedger: T0 }).ok).toBe(true);
  });
  it('is refused while the ledger time is unknown', () => {
    expect(can(art(plain.id, {}), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(9_999_999) })).toEqual({ ok: false, why: 'Waiting for the approval to be recorded in the ledger.' });
  });
  it('is refused for a twoPerson agent even in solo after the wait', () => {
    const g = can(art(twoPerson.id, {}), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(9_999_999), approvedAtFromLedger: T0 });
    expect(g.ok).toBe(false);
    expect(g.why).toMatch(/^A different person must countersign this/);
  });
  it('hints at the registered profession for a professionalReview agent', () => {
    const g = can(art(pro.id, {}), 'sarah', { defs: NO_DEFS, signing: SOLO, now: at(9_999_999), approvedAtFromLedger: T0 });
    expect(g.ok).toBe(false);
    expect(g.why).toMatch(new RegExp(`registered ${pro.professionalReview!.replace('_', ' ')}`));
  });
});

describe('signingHint()', () => {
  it('is empty for a plain agent, names the rule for twoPerson and the profession for professionalReview', () => {
    expect(signingHint(plain)).toBe('');
    expect(signingHint(twoPerson)).toBe('A different person must countersign this.');
    expect(signingHint(pro)).toBe(`Needs a registered ${pro.professionalReview!.replace('_', ' ')} to countersign.`);
    expect(signingHint(undefined)).toBe('');
  });
});
