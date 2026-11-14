import { describe, it, expect } from 'vitest';
import { parseAuth } from '../src/server/auth';
import { parseSigners, parseSigningPolicy, maySignFor, maySignProfessional } from '../src/server/signing';
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
    expect(() => parseSigners('nobody|Nobody|*', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('sarah|A|*;sarah|B|*', auth, depts)).toThrow(/^OPS_SIGNERS:.*duplicate/);
    expect(() => parseSigners('dan|Dan|hr', auth, depts)).toThrow(/^OPS_SIGNERS:.*department/);
    expect(() => parseSigners('dan|Dan', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan||finance', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|finance|attorney', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|finance|attorney|R|extra', auth, depts)).toThrow(/^OPS_SIGNERS:/);
    expect(() => parseSigners('dan|Dan|*', open, depts)).toThrow(/^OPS_SIGNERS:.*OPS_USERS/);
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

  it('fails closed on bad configuration', () => {
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, [], auth)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, two, auth)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'solo' }, one, open)).toThrow(/^OPS_SIGNING_MODE:/);
    expect(() => parseSigningPolicy({ OPS_SIGNING_MODE: 'triple' }, one, auth)).toThrow(/^OPS_SIGNING_MODE:/);
    for (const w of ['0', '1441', '1.5', 'abc', '']) {
      expect(() => parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: w }, one, auth)).toThrow(/^OPS_SIGNING_MODE:/);
    }
  });

  it('accepts the wait bounds', () => {
    expect(parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: '1' }, [], auth).waitMs).toBe(60000);
    expect(parseSigningPolicy({ OPS_SOLO_WAIT_MINUTES: '1440' }, [], auth).waitMs).toBe(86400000);
  });
});

describe('maySignFor', () => {
  const signers = parseSigners('sarah|Sarah|*;dan|Dan|finance+legal', auth, depts);
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
