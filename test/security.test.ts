import { spawn, type ChildProcess } from 'node:child_process';
import { mkdtempSync, symlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';
import { CSP, parseRoles, requestLimits, requireRole, rolesOf, securityHeaders } from '../src/server/security';
import { parseAuth } from '../src/server/auth';

const auth = parseAuth({ OPS_USERS: `sarah:${'s'.repeat(24)},dan:${'d'.repeat(24)}` });
const fakeRes = () => {
  const r = { code: 200, body: undefined as unknown, headers: {} as Record<string, string>, locals: {} as Record<string, unknown>, setHeader(k: string, v: string) { r.headers[k] = v; return r; }, set(k: string, v: string) { r.headers[k] = v; return r; }, status(c: number) { r.code = c; return r; }, json(b: unknown) { r.body = b; return r; } };
  return r;
};

describe('parseRoles', () => {
  it('means "not configured" when empty, and then gates nothing', () => {
    expect(parseRoles('', auth)).toBeNull();
    const res = fakeRes(); let next = false;
    requireRole(null, 'officer')({} as never, res as never, () => { next = true; });
    expect(next).toBe(true);
    expect(rolesOf(null, 'sarah')).toBeUndefined();
  });
  it('maps users to roles', () => {
    const t = parseRoles('sarah:officer', auth);
    expect(rolesOf(t, 'sarah')).toEqual(['officer']);
    expect(rolesOf(t, 'dan')).toEqual([]);
    expect(rolesOf(t, null)).toEqual([]);
  });
  it('fails closed on a mistake', () => {
    expect(() => parseRoles('sarah:chief', auth)).toThrow(/unknown role/);
    expect(() => parseRoles('nobody:officer', auth)).toThrow(/not in OPS_USERS/);
    expect(() => parseRoles('sarah', auth)).toThrow(/id:officer/);
    expect(() => parseRoles('sarah:officer', parseAuth({ HOST: '127.0.0.1' }))).toThrow(/needs OPS_USERS/);
  });
  it('requireRole refuses a non-holder and an anonymous caller', () => {
    const t = parseRoles('sarah:officer', auth);
    for (const actor of ['dan', null]) {
      const res = fakeRes(); res.locals.actor = actor; let next = false;
      requireRole(t, 'officer')({} as never, res as never, () => { next = true; });
      expect(next).toBe(false);
      expect(res.code).toBe(403);
    }
    const ok = fakeRes(); ok.locals.actor = 'sarah'; let next = false;
    requireRole(t, 'officer')({} as never, ok as never, () => { next = true; });
    expect(next).toBe(true);
  });
});

describe('headers and limits', () => {
  it('sets the hardening headers, the CSP only when asked, and no-store on the API', () => {
    const res = fakeRes();
    securityHeaders({ csp: true, hsts: true })({ path: '/api/x' } as never, res as never, () => undefined);
    expect(res.headers['Content-Security-Policy']).toBe(CSP);
    expect(CSP).toMatch(/frame-ancestors 'none'/);
    expect(CSP).not.toMatch(/script-src[^;]*unsafe/);
    expect(res.headers['Strict-Transport-Security']).toMatch(/max-age/);
    expect(res.headers['Cache-Control']).toBe('no-store');
    const dev = fakeRes();
    securityHeaders({ csp: false, hsts: false })({ path: '/' } as never, dev as never, () => undefined);
    expect(dev.headers['Content-Security-Policy']).toBeUndefined();
    expect(dev.headers['Strict-Transport-Security']).toBeUndefined();
    expect(dev.headers['X-Content-Type-Options']).toBe('nosniff');
    expect(dev.headers['Cache-Control']).toBeUndefined();
  });
  it('limits an address overall and limits bad tokens separately, and recovers after the window', () => {
    let t = 0;
    const l = requestLimits({ perMinute: 3, badTokensPerMinute: 2, now: () => t });
    const req = { ip: '1.2.3.4' } as never;
    const pass = () => { let ok = false; l.general(req, fakeRes() as never, () => { ok = true; }); return ok; };
    expect([pass(), pass(), pass(), pass()]).toEqual([true, true, true, false]);
    expect([l.failure(req, fakeRes() as never), l.failure(req, fakeRes() as never), l.failure(req, fakeRes() as never)]).toEqual([false, false, true]);
    t = 61_000;
    expect(pass()).toBe(true);
  });
});

const ROOT = process.cwd();
const procs: ChildProcess[] = [];
const T_SARAH = 's'.repeat(24);
const T_DAN = 'd'.repeat(24);
async function boot(port: number, env: Record<string, string>) {
  const cwd = mkdtempSync(join(tmpdir(), 'ops-sec-'));
  symlinkSync(join(ROOT, 'dist'), join(cwd, 'dist'));
  const p = spawn(process.execPath, [join(ROOT, 'node_modules/tsx/dist/cli.mjs'), join(ROOT, 'server.ts')], { cwd, env: { PATH: process.env.PATH ?? '', NODE_ENV: 'production', HOST: '127.0.0.1', PORT: String(port), ...env }, stdio: 'ignore' });
  procs.push(p);
  const base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 100; i++) {
    if (p.exitCode !== null) throw new Error(`server exited early (${p.exitCode})`);
    try { if ((await fetch(`${base}/api/health`)).status < 500) return base; } catch { /* not up yet */ }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error('server did not start');
}
afterAll(() => { for (const p of procs) p.kill(); });
const api = (base: string, path: string, o: { token?: string; body?: unknown } = {}) =>
  fetch(base + path, { method: o.body === undefined ? 'GET' : 'POST', headers: { 'content-type': 'application/json', ...(o.token ? { 'x-ops-token': o.token } : {}) }, body: o.body === undefined ? undefined : JSON.stringify(o.body) });

describe('server: headers, limits and roles end to end', () => {
  const users = `sarah:${T_SARAH},dan:${T_DAN}`;
  it('serves the app and the API with the hardening headers', async () => {
    const base = await boot(3451, { OPS_USERS: users, OPS_HSTS: 'on' });
    const page = await fetch(base + '/');
    expect(page.status).toBe(200);
    expect(page.headers.get('content-security-policy')).toBe(CSP);
    expect(page.headers.get('x-frame-options')).toBe('DENY');
    expect(page.headers.get('strict-transport-security')).toMatch(/max-age/);
    expect(page.headers.get('x-powered-by')).toBeNull();
    const a = await api(base, '/api/whoami', { token: T_SARAH });
    expect(a.headers.get('cache-control')).toBe('no-store');
    expect(a.headers.get('content-security-policy')).toBe(CSP);
  }, 60_000);

  it('slows token guessing without locking out a good token, and caps overall requests', async () => {
    const base = await boot(3452, { OPS_USERS: users, OPS_RATE_PER_MINUTE: '40' });
    const codes: number[] = [];
    for (let i = 0; i < 12; i++) codes.push((await api(base, '/api/whoami', { token: `wrong-token-${i}-xxxxxxxxxxxx` })).status);
    expect(codes.slice(0, 10)).toEqual(Array(10).fill(401));
    expect(codes.slice(10)).toEqual([429, 429]);
    expect((await api(base, '/api/whoami', { token: T_SARAH })).status).toBe(200);
    let last = 0;
    for (let i = 0; i < 40; i++) last = (await api(base, '/api/health')).status;
    expect(last).toBe(429);
  }, 60_000);

  it('gates attestation, activation and erasure decisions on the officer role, and says whether roles are on', async () => {
    const base = await boot(3453, { OPS_USERS: users, OPS_ROLES: 'sarah:officer', ANTHROPIC_API_KEY: 'sk-ant-not-real-key-for-tests' });
    expect(((await (await api(base, '/api/health')).json()) as { roles: boolean }).roles).toBe(true);
    const note = { note: 'Reviewed the provider terms' };
    expect((await api(base, '/api/models/providers/anthropic/attest', { token: T_DAN, body: note })).status).toBe(403);
    expect((await api(base, '/api/autonomy/orders/ord_x/activate', { token: T_DAN, body: {} })).status).toBe(403);
    expect((await api(base, '/api/models/providers/anthropic/attest', { token: T_SARAH, body: note })).status).toBe(200);
    // stopping stays open to everyone signed in
    expect((await api(base, '/api/models/providers/anthropic/revoke', { token: T_DAN, body: { reason: 'stopping is always allowed' } })).status).toBe(200);

    const req = { id: 'er_role', subjectHash: 'a'.repeat(64), category: 'data_subject_request', note: 'role test', requestedBy: 'sarah', status: 'REQUESTED', version: 1, at: new Date().toISOString() };
    expect((await api(base, '/api/warehouse/erasure_requests', { token: T_SARAH, body: req })).status).toBe(200);
    const decide = { ...req, status: 'APPROVED', decidedBy: 'dan', version: 2 };
    const denied = await api(base, '/api/warehouse/erasure_requests', { token: T_DAN, body: decide });
    expect(denied.status).toBe(403);
    expect(((await denied.json()) as { error: string }).error).toMatch(/officer role/);
  }, 60_000);

  it('leaves everyone able to act when roles are not configured, and refuses to start on a bad role table', async () => {
    const base = await boot(3454, { OPS_USERS: users, ANTHROPIC_API_KEY: 'sk-ant-not-real-key-for-tests' });
    expect(((await (await api(base, '/api/health')).json()) as { roles: boolean }).roles).toBe(false);
    expect((await api(base, '/api/models/providers/anthropic/attest', { token: T_DAN, body: { note: 'Reviewed the provider terms' } })).status).toBe(200);
    const err = await new Promise<{ code: number | null; err: string }>((resolve) => {
      const p = spawn(process.execPath, [join(ROOT, 'node_modules/tsx/dist/cli.mjs'), join(ROOT, 'server.ts')], { cwd: mkdtempSync(join(tmpdir(), 'ops-sec-')), env: { PATH: process.env.PATH ?? '', NODE_ENV: 'production', HOST: '127.0.0.1', PORT: '3455', OPS_USERS: users, OPS_ROLES: 'sarah:chief' }, stdio: ['ignore', 'ignore', 'pipe'] });
      let e = ''; p.stderr?.on('data', (d) => (e += String(d)));
      p.on('exit', (code) => resolve({ code, err: e }));
    });
    expect(err.code).toBe(1);
    expect(err.err).toMatch(/FATAL.*unknown role/);
  }, 60_000);
});
