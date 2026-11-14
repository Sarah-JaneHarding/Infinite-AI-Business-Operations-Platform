import { describe, it, expect } from 'vitest';
import { parseAuth } from '../src/server/auth';
import { parseSigners, parseSigningPolicy, maySignFor, maySignProfessional, singleSignerReport } from '../src/server/signing';
import { DEFAULT_SIGNING, SINGLE_SIGNER, soloWaitRemainingMs } from '../src/core/signing';

const auth = parseAuth({
  OPS_USERS: 'sarah:fake-token-sarah-0123456789,dan:fake-token-dan-abcdefghij,lerato:fake-token-lerato-klmnopqrs',
});
const open = parseAuth({});
const depts = ['finance', 'legal', 'sales'];

describe('parseSigners', () => {
  it('returns [] when there is no registry', () => {
    expect(parseSigners(undefined, auth, depts)).toEqual([]);
    expect(parseSigners('', auth, depts)).toEqual([]);
    expect(parseSigners('  ', auth, depts)).toEqual([]);
  });

  it('parses wildcard and department scopes', () => {
    expect(parseSigners('sarah|Sarah-Jane Harding|*', auth, depts)).toEqual([
      { id: 'sarah', name: 'Sarah-Jane Harding', scope: '*' },
    ]);
    const s = parseSigners('sarah|Sarah|*;dan|Dan|finance+legal', auth, depts);
    expect(s[1]).toEqual({ id: 'dan', name: 'Dan', scope: ['finance', 'legal'] });
  });

  it('exposes the single-signer constant', () => {
    expect(SINGLE_SIGNER).toBe('single-signer');
  });

  it('throws on unknown user, duplicate, unknown department, malformed, open auth', () => {
    expect(() => parseSigners('nobody|Nobody|*', auth, depts)).toThrow(/^OPS_SIGNERS: "nobody" is not a user in OPS_USERS/);
    expect(() => parseSigners('sarah|A|*;sarah|B|*', auth, depts)).toThrow(/^OPS_SIGNERS:.*duplicate/);
    expect(() => parseSigners('dan|Dan|hr', auth, depts)).toThrow(/^OPS_SIGNERS:.*department/);
    expect(() => parseSigners('dan|Dan', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan||finance', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|finance|attorney', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|finance|attorney|R|extra', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|*', open, depts)).toThrow(/^OPS_SIGNERS:.*OPS_USERS/);
  });

  it('throws on a duplicate department, an empty department segment, and * combined with others', () => {
    expect(() => parseSigners('dan|Dan|finance+finance', auth, depts)).toThrow(/^OPS_SIGNERS:.*duplicate department/);
    expect(() => parseSigners('dan|Dan|finance+', auth, depts)).toThrow(/^OPS_SIGNERS:.*empty department/);
    expect(() => parseSigners('dan|Dan|+finance', auth, depts)).toThrow(/^OPS_SIGNERS:.*empty department/);
    expect(() => parseSigners('dan|Dan|*+legal', auth, depts)).toThrow(/^OPS_SIGNERS:.*"\*" cannot be combined/);
  });

  it('parses professional entries and rejects bad ones', () => {
    const s = parseSigners('lerato|Lerato Mokoena|legal|attorney|REG-TEXT', auth, depts);
    expect(s[0]).toMatchObject({ profession: 'attorney', registration: 'REG-TEXT', scope: ['legal'] });
    expect(() => parseSigners('lerato|L|legal|judge|REG', auth, depts)).toThrow(/^OPS_SIGNERS:.*profession/);
    expect(() => parseSigners('lerato|L|*|attorney|REG', auth, depts)).toThrow(/^OPS_SIGNERS:.*department/);
    expect(() => parseSigners('lerato|L|legal|attorney|', auth, depts)).toThrow(/^OPS_SIGNERS:.*registration/);
    expect(() => parseSigners('lerato|L|legal|attorney| ', auth, depts)).toThrow(/^OPS_SIGNERS:.*registration/);
  });
});

describe('parseSigningPolicy', () => {
  const one = parseSigners('sarah|Sarah|*', auth, depts);
  const two = parseSigners('sarah|Sarah|*;dan|Dan|finance', auth, depts);

  it('defaults to dual with a ten minute wait', () => {
    expect(parseSigningPolicy({}, [], auth)).toEqual({ mode: 'dual', waitMs: 600000 });
    expect(DEFAULT_SIGNING).toEqual({ mode: 'dual', waitMs: 600_000 });
  });

  it('allows solo with exactly one signer and a configurable wait', () => {
    expect(parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, one, auth)).toEqual({ mode: 'solo', waitMs: 600000 });
    expect(parseSigningPolicy({ OPS_SIGNING_MODE: 'solo', OPS_SOLO_WAIT_MINUTES: '15' }, one, auth).waitMs).toBe(900000);
  });

  it('accepts a padded mode value', () => {
    expect(parseSigningPolicy({ OPS_SIGNING_MODE: ' solo ' }, one, auth).mode).toBe('solo');
  });

  it('fails closed on bad configuration', () => {
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, [], auth)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, two, auth)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, one, open)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'triple' }, one, auth)).toThrow(/^OPS_SIGNING_MODE:/);
    for (const w of ['0', '1441', '1.5', 'abc', '']) {
      expect(() => parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: w }, one, auth)).toThrow(/^OPS_SOLO_WAIT_MINUTES:/);
    }
  });

  it('accepts the wait bounds', () => {
    expect(parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: '1' }, [], auth).waitMs).toBe(60000);
    expect(parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: '1440' }, [], auth).waitMs).toBe(86400000);
  });
});

describe('maySignFor', () => {
  const signers = parseSigners('sarah|Sarah|*;dan|Dan|finance+legal', auth, depts);
  it('an empty registry signs for nobody', () => {
    expect(maySignFor([], 'sarah', 'finance')).toBe(false);
    expect(maySignFor([], 'sarah', undefined)).toBe(false);
  });

  it('applies scope', () => {
    expect(maySignFor(signers, 'sarah', 'sales')).toBe(true);
    expect(maySignFor(signers, 'sarah', undefined)).toBe(true);
    expect(maySignFor(signers, 'dan', 'finance')).toBe(true);
    expect(maySignFor(signers, 'dan', 'sales')).toBe(false);
    expect(maySignFor(signers, 'dan', undefined)).toBe(false);
    expect(maySignFor(signers, 'stranger', 'finance')).toBe(false);
  });
});

describe('soloWaitRemainingMs', () => {
  const policy = { mode: 'solo' as const, waitMs: 600_000 };
  it('counts down and never goes negative', () => {
    expect(soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date('2026-11-14T10:04:00Z'), policy)).toBe(360000);
    expect(soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date('2026-11-14T10:10:00Z'), policy)).toBe(0);
    expect(soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date('2026-11-14T11:00:00Z'), policy)).toBe(0);
  });
  it('is exactly 0 at the boundary and 1 ms short of it', () => {
    const at = '2026-11-14T10:00:00.000Z';
    const edge = Date.parse(at) + 600_000;
    expect(soloWaitRemainingMs(at, new Date(edge), policy)).toBe(0);
    expect(soloWaitRemainingMs(at, new Date(edge - 1), policy)).toBe(1);
  });
  it('fails closed: an invalid clock or unreadable timestamp keeps the full wait, never NaN', () => {
    expect(soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date(NaN), policy)).toBe(600_000);
    expect(soloWaitRemainingMs('not a date', new Date('2026-11-14T11:00:00Z'), policy)).toBe(600_000);
    expect(soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date('2026-11-14T11:00:00Z'), { mode: 'solo', waitMs: NaN })).toBe(Number.MAX_SAFE_INTEGER);
  });
});

describe('maySignProfessional', () => {
  const signers = parseSigners('sarah|Sarah|*;lerato|Lerato|legal|attorney|REG-TEXT', auth, depts);
  it('matches only the exact registered profession', () => {
    expect(maySignProfessional(signers, 'lerato', 'attorney')).toBe(true);
    expect(maySignProfessional(signers, 'lerato', 'accountant')).toBe(false);
    expect(maySignProfessional(signers, 'sarah', 'attorney')).toBe(false);
    expect(maySignProfessional(signers, 'stranger', 'attorney')).toBe(false);
  });
});

describe('singleSignerReport', () => {
  type R = Record<string, unknown>;
  const store = (rows: R[]) => ({ list: (c: string) => (c === 'artefact_versions' ? (rows as never) : []) });
  const v = (o: R): R => ({ id: 'a1', title: 'T', agentId: 'ag', requestedBy: 'sarah', approvedBy: 'sarah', countersignedBy: 'sarah', docHash: 'h'.repeat(64), ratifiedAt: '2026-01-01T00:00:00.000Z', status: 'RATIFIED', signing: 'single-signer', ...o });

  it('report: an empty store gives no items', () => {
    expect(singleSignerReport(store([]))).toEqual({ count: 0, items: [] });
  });
  it('report: lists a flagged self-countersign with the approver as signer', () => {
    expect(singleSignerReport(store([v({})]))).toEqual({ count: 1, items: [{ artefactId: 'a1', title: 'T', agentId: 'ag', kind: 'self-countersign', signer: 'sarah', ratifiedAt: '2026-01-01T00:00:00.000Z', docHash: 'h'.repeat(64) }] });
  });
  it('report: lists a flagged self-approval with the author as signer', () => {
    const r = singleSignerReport(store([v({ status: 'INGESTED', approvedBy: 'sarah', countersignedBy: 'dan', requestedBy: 'sarah' })]));
    expect(r.items[0]).toMatchObject({ kind: 'self-approval', signer: 'sarah' });
  });
  it('report: a normal two-person ratification is not listed', () => {
    expect(singleSignerReport(store([v({ signing: undefined, countersignedBy: 'dan' })])).count).toBe(0);
  });
  it('report: draft, approved and other non-final flagged versions are not listed', () => {
    expect(singleSignerReport(store([v({ id: 'x', status: 'APPROVED' }), v({ id: 'y', status: 'DRAFT' }), v({ id: 'z', status: 'REJECTED' })])).count).toBe(0);
  });
  it('report: only the latest version per artefact counts, so it lists once', () => {
    const r = singleSignerReport(store([v({ status: 'RATIFIED' }), v({ status: 'INGESTED' })]));
    expect(r.count).toBe(1);
    expect(singleSignerReport(store([v({ status: 'RATIFIED' }), v({ status: 'DRAFT', signing: undefined })])).count).toBe(0);
  });
  it('report: items are ordered by ratifiedAt ascending', () => {
    const r = singleSignerReport(store([v({ id: 'late', ratifiedAt: '2026-03-01T00:00:00.000Z' }), v({ id: 'early', ratifiedAt: '2026-01-01T00:00:00.000Z' })]));
    expect(r.items.map((i) => i.artefactId)).toEqual(['early', 'late']);
  });
});

describe('reportRow', () => {
  it('report: shortens the hash to 12 characters and the timestamp to a date', async () => {
    const { reportRow } = await import('../src/ui/boardGate');
    expect(reportRow({ artefactId: 'a', title: 't', agentId: 'g', kind: 'self-approval', signer: 's', ratifiedAt: '2026-02-03T04:05:06.000Z', docHash: 'abcdef0123456789' })).toEqual({ kindLabel: 'approved own draft', date: '2026-02-03', hash: 'abcdef012345' });
  });
});
