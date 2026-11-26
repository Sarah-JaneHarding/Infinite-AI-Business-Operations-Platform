import { describe, expect, it } from 'vitest';
import { countersignState } from '../src/ui/boardGate';
import { AGENTS } from '../src/departments';
import type { Artefact } from '../src/core/platform';
import type { SigningPolicy } from '../src/core/signing';

const SOLO: SigningPolicy = { mode: 'solo', waitMs: 600_000 };
const DUAL: SigningPolicy = { mode: 'dual', waitMs: 600_000 };
const T0 = '2026-01-01T00:00:00.000Z';
const at = (ms: number) => new Date(Date.parse(T0) + ms);
const art = (over: Partial<Artefact> = {}): Artefact => ({ id: 'A1', orgId: 'o', agentId: 'LIBRARY-DOC', dept: 'd', title: 't', status: 'APPROVED', version: 2, requestedBy: 'sarah', formats: [], doc: {} as Artefact['doc'], flags: [], engine: 'e', at: T0, approvedBy: 'sarah', ...over });
const twoPerson = AGENTS.find((a) => a.twoPerson && !a.professionalReview)!;
const pro = AGENTS.find((a) => a.professionalReview)!;

describe('countersignState', () => {
  it('solo, before the wait: disabled with the minutes left', () => {
    const s = countersignState(art(), 'sarah', SOLO, at(2 * 60_000 + 1));
    expect(s.enabled).toBe(false);
    expect(s.minutesLeft).toBe(8);
    expect(s.reason).toMatch(/8 minutes/);
  });
  it('solo, one minute left uses the singular', () => {
    expect(countersignState(art(), 'sarah', SOLO, at(9 * 60_000)).reason).toMatch(/1 minute\b/);
  });
  it('solo, after the wait: enabled, no reason', () => {
    expect(countersignState(art(), 'sarah', SOLO, at(600_000))).toEqual({ enabled: true, reason: null, minutesLeft: 0 });
  });
  it('dual mode: the approver may not countersign', () => {
    const s = countersignState(art(), 'sarah', DUAL, at(10_000_000));
    expect(s.enabled).toBe(false);
    expect(s.reason).toBe('A different person must countersign');
  });
  it('a different person is enabled in either mode, with no wait', () => {
    expect(countersignState(art(), 'peter', DUAL, at(0)).enabled).toBe(true);
    expect(countersignState(art(), 'peter', SOLO, at(0))).toEqual({ enabled: true, reason: null, minutesLeft: 0 });
  });
  it('a twoPerson or professional-review agent never lets the approver countersign, even in solo after the wait', () => {
    for (const agent of [twoPerson, pro]) {
      const s = countersignState(art({ agentId: agent.id }), 'sarah', SOLO, at(99_000_000), agent);
      expect(s.enabled).toBe(false);
      expect(s.reason).toMatch(/different person/i);
    }
  });
  it('any status other than APPROVED is disabled', () => {
    for (const status of ['DRAFT', 'IN_REVIEW', 'REJECTED', 'RATIFIED', 'INGESTED'] as const) {
      const s = countersignState(art({ status }), 'peter', SOLO, at(99_000_000));
      expect(s.enabled).toBe(false);
      expect(s.reason).toBeTruthy();
    }
  });
  it('an unreadable approval time fails closed', () => {
    expect(countersignState(art({ at: 'garbage' }), 'sarah', SOLO, at(99_000_000)).enabled).toBe(false);
  });
});
