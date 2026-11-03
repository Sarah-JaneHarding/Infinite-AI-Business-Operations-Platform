import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { authenticate, parseAuth } from '../src/server/auth';
import { RateLimiter } from '../src/server/rate';
import { FileStore } from '../src/server/fileAdapter';
import { MAX_RECORDS, Rejected, validateAppend, type ReadStore } from '../src/server/validate';
import { Ledger } from '../src/core/ledger';
import { AGENTS } from '../src/departments';
import type { Rec } from '../src/core/warehouse';

const T1 = 'a'.repeat(24);
const T2 = 'b'.repeat(24);

describe('auth', () => {
  it('maps a token to its user and nothing else', () => {
    const a = parseAuth({ OPS_USERS: `sarah:${T1}, dan:${T2}` });
    expect(authenticate(a, T1)).toBe('sarah');
    expect(authenticate(a, T2)).toBe('dan');
    expect(authenticate(a, T1 + 'x')).toBeNull();
    expect(authenticate(a, undefined)).toBeNull();
    expect(authenticate(a, '')).toBeNull();
  });
  it('fails closed on a bad config', () => {
    expect(() => parseAuth({ OPS_USERS: 'sarah:short' })).toThrow(/20 characters/);
    expect(() => parseAuth({ OPS_USERS: `Sarah:${T1}` })).toThrow(/bad user id/);
    expect(() => parseAuth({ OPS_USERS: `a1:${T1},b2:${T1}` })).toThrow(/share a token/);
    expect(() => parseAuth({ OPS_USERS: `a1:${T1},a1:${T2}` })).toThrow(/duplicate/);
    expect(() => parseAuth({ OPS_USERS: 'nocolon' })).toThrow(/id:token/);
  });
  it('refuses to start open on a non-loopback host unless explicitly allowed', () => {
    expect(() => parseAuth({ HOST: '0.0.0.0' })).toThrow(/OPS_USERS/);
    expect(parseAuth({ HOST: '0.0.0.0', OPS_OPEN_DEV: 'true' }).mode).toBe('open');
    expect(parseAuth({}).mode).toBe('open');
    expect(authenticate(parseAuth({}), T1)).toBeNull();
  });
  it('keeps the legacy single token working as "operator"', () => {
    expect(authenticate(parseAuth({ OPS_API_TOKEN: T1, HOST: '0.0.0.0' }), T1)).toBe('operator');
  });
});

describe('rate limiter', () => {
  it('allows max per window, per key, then recovers', () => {
    let t = 0;
    const r = new RateLimiter(2, 1000, () => t);
    expect([r.allow('a'), r.allow('a'), r.allow('a'), r.allow('b')]).toEqual([true, true, false, true]);
    t = 1001;
    expect(r.allow('a')).toBe(true);
  });
});

describe('FileStore', () => {
  it('keeps appends in memory, survives a restart, and fails loudly on a corrupt file', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ops-'));
    const s = new FileStore(dir);
    s.append('runs', { id: 'r1' });
    expect(s.list('runs')).toHaveLength(1);
    expect(new FileStore(dir).list('runs')).toHaveLength(1);
    expect(() => s.append('../x', { id: 'x' })).toThrow(/bad collection/);
    writeFileSync(join(dir, 'broken.jsonl'), '{"id":"a"}\n{nope\n');
    expect(() => new FileStore(dir)).toThrow(/broken\.jsonl line 2/);
  });
});

// ---- append validation: the approval gate, ledger chain, Brain constitution, quotas ----
const store = (rows: Record<string, Rec[]> = {}): ReadStore => ({ list: (c) => rows[c] ?? [] });
const reject = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as Rejected | null;
const sec = AGENTS.find((a) => a.id === 'OPS-SEC-01')!;
const second = AGENTS.find((a) => a.secondApprover)!;
const art = (over: Record<string, unknown> = {}): Rec => ({ id: 'art_1', orgId: 'infinite-ai', agentId: sec.id, status: 'DRAFT', version: 1, requestedBy: 'sarah', docHash: 'h1', ...over }) as Rec;

describe('validateAppend: approval gate', () => {
  it('rejects a forged APPROVED artefact that never went through review', async () => {
    const e = await reject(validateAppend('artefact_versions', art({ status: 'APPROVED', approvedBy: 'nobody' }), { actor: 'sarah', store: store() }));
    expect(e?.status).toBe(400);
    expect(e?.message).toMatch(/DRAFT v1/);
  });
  it('rejects a decision on a DRAFT, an edited document, someone else’s name, and a missing reason', async () => {
    const draft = [art()];
    const review = [art(), art({ status: 'IN_REVIEW' })];
    expect((await reject(validateAppend('artefact_versions', art({ status: 'APPROVED', approvedBy: 'dan' }), { actor: 'dan', store: store({ artefact_versions: draft }) })))?.status).toBe(409);
    expect((await reject(validateAppend('artefact_versions', art({ status: 'APPROVED', approvedBy: 'dan', docHash: 'swapped' }), { actor: 'dan', store: store({ artefact_versions: review }) })))?.message).toMatch(/cannot change the document/);
    expect((await reject(validateAppend('artefact_versions', art({ status: 'APPROVED', approvedBy: 'dan' }), { actor: 'sarah', store: store({ artefact_versions: review }) })))?.status).toBe(403);
    expect((await reject(validateAppend('artefact_versions', art({ status: 'REJECTED', approvedBy: 'dan', note: ' ' }), { actor: 'dan', store: store({ artefact_versions: review }) })))?.message).toMatch(/reason/);
  });
  it('enforces the second-approver rule on the server, and accepts a legitimate decision', async () => {
    const review = [art({ agentId: second.id }), art({ agentId: second.id, status: 'IN_REVIEW' })];
    const self = await reject(validateAppend('artefact_versions', art({ agentId: second.id, status: 'APPROVED', approvedBy: 'sarah' }), { actor: 'sarah', store: store({ artefact_versions: review }) }));
    expect(self?.status).toBe(403);
    await expect(validateAppend('artefact_versions', art({ agentId: second.id, status: 'APPROVED', approvedBy: 'dan' }), { actor: 'dan', store: store({ artefact_versions: review }) })).resolves.toBeDefined();
  });
  it('rejects an approvals row that has no matching decision', async () => {
    const e = await reject(validateAppend('approvals', { id: 'apr_1', artefactId: 'art_1', decision: 'APPROVED', approver: 'dan' }, { actor: 'dan', store: store({ artefact_versions: [art()] }) }));
    expect(e?.status).toBe(409);
  });
  it('in open dev mode the structure is still enforced even though identity is self-declared', async () => {
    const e = await reject(validateAppend('artefact_versions', art({ status: 'APPROVED', approvedBy: 'x' }), { actor: null, store: store() }));
    expect(e?.status).toBe(400);
  });
});

describe('validateAppend: ledger, Brain, quotas', () => {
  it('accepts a correctly chained ledger entry and rejects a gap, a bad hash and a forged human actor', async () => {
    const l = new Ledger();
    const e1 = await l.append({ orgId: 'o', actor: 'sarah', action: 'artefact.submit', subject: 'a' });
    const rec = { ...e1, id: 'L1' } as unknown as Rec;
    await expect(validateAppend('ledger', rec, { actor: 'sarah', store: store() })).resolves.toBeDefined();
    expect((await reject(validateAppend('ledger', { ...rec, id: 'L2', seq: 2 }, { actor: 'sarah', store: store() })))?.status).toBe(409);
    expect((await reject(validateAppend('ledger', { ...rec, detail: { tampered: true } }, { actor: 'sarah', store: store() })))?.message).toMatch(/hash/);
    expect((await reject(validateAppend('ledger', rec, { actor: 'dan', store: store() })))?.status).toBe(403);
    const e2 = await l.append({ orgId: 'o', actor: 'agent-x', action: 'gateway.complete', subject: 's' });
    await expect(validateAppend('ledger', { ...e2, id: 'L2' } as unknown as Rec, { actor: 'sarah', store: store({ ledger: [rec] }) })).resolves.toBeDefined();
  });
  it('protects the Brain constitution and the human-ratification rule', async () => {
    const f = (o: Record<string, unknown>) => ({ id: 'fact_1', tier: 'L1', topic: 't', text: 'x', status: 'ratified', by: 'sarah', provenance: { deidentified: true, sources: ['s'] }, ...o }) as Rec;
    expect((await reject(validateAppend('brain', f({ tier: 'L0' }), { actor: 'sarah', store: store() })))?.status).toBe(403);
    expect((await reject(validateAppend('brain', f({ provenance: { deidentified: false, sources: ['s'] } }), { actor: 'sarah', store: store() })))?.message).toMatch(/de-identified/);
    expect((await reject(validateAppend('brain', f({ tier: 'L4' }), { actor: 'sarah', store: store() })))?.status).toBe(403);
    const proposed = f({ id: 'p1', tier: 'L4', status: 'proposed' });
    await expect(validateAppend('brain', f({ tier: 'L4', supersedes: 'p1' }), { actor: 'sarah', store: store({ brain: [proposed] }) })).resolves.toBeDefined();
    await expect(validateAppend('brain', f({ tier: 'L1' }), { actor: 'sarah', store: store() })).resolves.toBeDefined();
  });
  it('rejects unknown collections, oversized and malformed records, and full collections', async () => {
    const ctx = { actor: 'sarah', store: store() };
    expect((await reject(validateAppend('connector_events', { id: 'x' }, ctx)))?.status).toBe(404);
    expect((await reject(validateAppend('made_up', { id: 'x' }, ctx)))?.status).toBe(404);
    expect((await reject(validateAppend('runs', { id: 'x', pad: 'z'.repeat(300_000) }, ctx)))?.status).toBe(413);
    expect((await reject(validateAppend('runs', [1], ctx)))?.status).toBe(400);
    expect((await reject(validateAppend('runs', { nope: 1 }, ctx)))?.status).toBe(400);
    expect((await reject(validateAppend('tombstones', { id: 't', subjectHash: 'not-a-hash' }, ctx)))?.status).toBe(400);
    const full = Array.from({ length: MAX_RECORDS }, (_, i) => ({ id: `r${i}` }) as Rec);
    expect((await reject(validateAppend('runs', { id: 'one-more' }, { actor: 'sarah', store: store({ runs: full }) })))?.status).toBe(507);
    await expect(validateAppend('okr', { id: 'w1', anything: 'goes' }, ctx)).resolves.toBeDefined();
  });
});
