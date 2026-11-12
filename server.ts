import 'dotenv/config';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import path from 'node:path';
import { GithubReader, liveFacts, type LiveStatus } from './src/connector/github';
import { lookup } from 'node:dns/promises';
import { checkTarget, isPrivateIp, parseAllowlist, payloadFor, sign } from './src/server/outbound';
import { summariseEvent, verifySignature, type EcoEvent } from './src/connector/webhook';
import { ProposalPublisher, proposalFromArtefact, PublishRefused } from './src/connector/proposals';
import { FileStore } from './src/server/fileAdapter';
import { authenticate, parseAuth } from './src/server/auth';
import { Rejected, validateAppend } from './src/server/validate';
import { RateLimiter } from './src/server/rate';
import { appendLedger } from './src/server/ledgerService';
import { ratifiedProblem } from './src/server/finality';
import { AutonomyService } from './src/server/autonomy/service';
import { makeRunner } from './src/server/autonomy/runner';
import { autonomyRoutes } from './src/server/autonomyRoutes';
import { parseRoles, requestLimits, requireRole, rolesOf, securityHeaders, type RoleTable } from './src/server/security';
import { snapshotFacts } from './src/connector/snapshot';
import type { Artefact } from './src/core/platform';
import type { Rec } from './src/core/warehouse';
import { ModelHub } from './src/server/models/hub';
import { AGENTS, DEPARTMENTS } from './src/departments';
import { checkRegistry, formatProblems } from './src/core/contract';
import { modelRoutes } from './src/server/modelRoutes';

const env = process.env;
const REPO = env.ECOSYSTEM_REPO ?? 'Sarah-JaneHarding/infinite-ai-ecosystem';
const PORT = Number(env.PORT ?? 3000);
const HOST = env.HOST || '127.0.0.1'; // an empty HOST= counts as unset

// Fail closed. A missing or malformed auth config stops the server; it never falls back to open mode on its own.
// Open dev mode (no authentication, self-declared identity, publishing disabled) is only allowed on a loopback HOST
// or when OPS_OPEN_DEV=true is set explicitly.
let auth: ReturnType<typeof parseAuth>;
try {
  auth = parseAuth({ ...env, HOST });
} catch (err) {
  console.error(`FATAL: ${(err as Error).message}`);
  process.exit(1);
}

// A built-in agent that breaks its contract stops the boot: better no server than an agent without its promises.
const contractProblems = checkRegistry(AGENTS, { departments: DEPARTMENTS.map((d) => d.id) });
if (Object.keys(contractProblems).length) {
  console.error(`FATAL: agent contracts do not hold:\n${formatProblems(contractProblems)}`);
  process.exit(1);
}

const store = new FileStore();
const reader = new GithubReader(REPO, env.GITHUB_TOKEN);
const publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true');
let hub: ModelHub;
try {
  hub = new ModelHub({ env, store, limiter: new RateLimiter(20, 60_000) });
} catch (err) {
  console.error(`FATAL: model hub configuration: ${(err as Error).message}`);
  process.exit(1);
}

/** A server-side write takes the same validated, serialised path a client write takes. */
const appendValidated = (collection: string, rec: Rec, actor: string) => serial(async () => {
  const v = await validateAppend(collection, rec, { actor, store });
  store.append(collection, v);
});
let autonomy: AutonomyService;
try {
  autonomy = new AutonomyService({ env, store, runner: makeRunner({ store, appendValidated, hub, facts: () => ({ ...snapshotFacts(), ...(cache ? liveFacts(cache.status) : {}) }) }) });
} catch (err) {
  console.error(`FATAL: autonomy configuration: ${(err as Error).message}`);
  process.exit(1);
}

let roles: RoleTable;
try {
  roles = parseRoles(env.OPS_ROLES, auth);
} catch (err) {
  console.error(`FATAL: ${(err as Error).message}`);
  process.exit(1);
}
const limits = requestLimits({ perMinute: Number(env.OPS_RATE_PER_MINUTE) > 0 ? Number(env.OPS_RATE_PER_MINUTE) : 300, badTokensPerMinute: 10 });

const app = express();
app.disable('x-powered-by');
// Behind one reverse proxy, set OPS_TRUST_PROXY=1 so limits see the caller's address, not the proxy's.
if (env.OPS_TRUST_PROXY === '1') app.set('trust proxy', 1);
app.use(securityHeaders({ csp: env.NODE_ENV === 'production', hsts: env.OPS_HSTS === 'on' }));
app.use('/api', limits.general); // before the webhook and health too: every API address is limited

/** Express 4 does not catch a rejected async handler; this routes it to the error handler instead of crashing. */
const wrap = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res)).catch(next);
};
const actorOf = (res: Response) => res.locals.actor as string | null;

/** Appends are checked against the current state, so they run one at a time. */
let tail: Promise<unknown> = Promise.resolve();
const serial = <T>(fn: () => Promise<T>): Promise<T> => {
  const run = tail.then(fn, fn);
  tail = run.catch(() => undefined);
  return run;
};

// ---- public: health (liveness probe, booleans only) ----
app.get('/api/health', (_q, res) => res.json({
  ok: true,
  repo: REPO,
  auth: auth.mode,
  githubToken: Boolean(env.GITHUB_TOKEN),
  llm: hub.anyReady(),
  autonomy: autonomy.enabled,
  roles: roles !== null,
  ecosystemWrites: env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true',
  webhook: Boolean(env.GITHUB_WEBHOOK_SECRET),
  outbound: parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST).length > 0
}));

// ---- webhook first: it needs the RAW body for the HMAC, and is authenticated by that signature ----
const events: EcoEvent[] = [];
app.post('/api/connector/webhook', express.raw({ type: '*/*', limit: '1mb' }), wrap(async (req, res) => {
  const secret = env.GITHUB_WEBHOOK_SECRET ?? '';
  const body = (req.body as Buffer).toString('utf8');
  if (!(await verifySignature(secret, body, req.header('x-hub-signature-256')))) return res.status(401).json({ error: 'bad signature' });
  let payload: unknown;
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: 'body is not JSON' });
  }
  if (typeof payload !== 'object' || payload === null || Array.isArray(payload)) return res.status(400).json({ error: 'payload must be a JSON object' });
  const ev = summariseEvent(req.header('x-github-event') ?? 'unknown', payload as Record<string, unknown>);
  events.unshift(ev);
  events.length = Math.min(events.length, 100);
  store.append('connector_events', { id: `ev_${Date.now()}`, ...ev });
  cache = null; // next status call refetches
  // A signed event can start the active standing orders listening for it. Not awaited: the webhook answers GitHub at once.
  void autonomy.onEvent(ev.kind).catch((e: Error) => console.error('autonomy event failed:', e.message));
  res.json({ ok: true });
}));

app.use(express.json({ limit: '512kb' }));
app.use('/api', (req, res, next) => {
  const actor = authenticate(auth, req.header('x-ops-token'));
  if (auth.mode === 'users' && !actor) return limits.failure(req, res) ? undefined : res.status(401).json({ error: 'unauthorised' });
  res.locals.actor = actor;
  next();
});

app.get('/api/whoami', (_q, res) => res.json({ actor: actorOf(res), mode: auth.mode }));

// ---- connector: read-only live status, cached briefly ----
let cache: { at: number; status: LiveStatus } | null = null;
app.get('/api/connector/status', wrap(async (_q, res) => {
  if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), status: await reader.status() };
  res.json({ status: cache.status, facts: liveFacts(cache.status) });
}));
app.get('/api/connector/events', (_q, res) => res.json(events));

// ---- publish: the only write to the ecosystem. Gate is checked against the SERVER's copy of the artefact. ----
app.post('/api/connector/publish', wrap(async (req, res) => {
  try {
    const actor = actorOf(res);
    if (!actor) return res.status(403).json({ error: 'Publishing needs an authenticated user (set OPS_USERS).' });
    const id = String(req.body?.artefactId ?? '');
    const art = store.list('artefact_versions').filter((r) => r.id === id).at(-1) as unknown as Artefact | undefined;
    if (!art) return res.status(404).json({ error: 'unknown artefact' });
    const problem = ratifiedProblem(store, art as unknown as Rec);
    if (problem) return res.status(403).json({ error: problem });
    const summary = String(req.body?.summary ?? '').slice(0, 4000);
    const out = await publisher.openIssue(art, proposalFromArtefact(art, summary));
    store.append('connector_events', { id: `pub_${Date.now()}`, kind: 'issue_opened', summary: out.url, by: actor, at: new Date().toISOString() });
    res.json(out);
  } catch (e) {
    if (e instanceof PublishRefused) return res.status(403).json({ error: e.message });
    throw e;
  }
}));


// ---- outbound: approved artefacts only, to hosts the operator allowed, with the address checked again before connecting ----
app.get('/api/integrations/targets', (_q, res) => res.json({ hosts: parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST), signed: Boolean(env.OPS_OUTBOUND_SECRET) }));
app.post('/api/integrations/send', wrap(async (req, res) => {
  const actor = actorOf(res);
  if (!actor) return res.status(403).json({ error: 'Sending needs an authenticated user (set OPS_USERS).' });
  const t = checkTarget(String(req.body?.url ?? ''), parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST));
  if (!t.ok) return res.status(403).json({ error: t.why });
  const id = String(req.body?.artefactId ?? '');
  const art = store.list('artefact_versions').filter((r) => r.id === id).at(-1) as unknown as Artefact | undefined;
  if (!art) return res.status(404).json({ error: 'unknown artefact' });
  const problem = ratifiedProblem(store, art as unknown as Rec);
  if (problem) return res.status(403).json({ error: problem });
  try { const addrs = await lookup(t.url.hostname, { all: true }); if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return res.status(403).json({ error: 'That host resolves to a non-public address.' }); } catch { return res.status(502).json({ error: 'Could not resolve that host.' }); }
  const body = JSON.stringify(payloadFor(art));
  const headers: Record<string, string> = { 'content-type': 'application/json', 'user-agent': 'infinite-ai-ops' };
  if (env.OPS_OUTBOUND_SECRET) headers['x-ops-signature'] = sign(env.OPS_OUTBOUND_SECRET, body);
  const r = await fetch(t.url, { method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(10_000) }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }));
  store.append('connector_events', { id: `out_${Date.now()}`, kind: 'artefact_sent', summary: `${art.id} v${art.version} to ${t.url.hostname}: ${r.status}`, by: actor, at: new Date().toISOString() });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, host: t.url.hostname });
}));

// ---- models: the hub is the only door to a model provider (docs/MODEL_HUB.md). Gateway, copilot, recommendations, setup. ----
// Provider attestation and activating an autonomous order are legal and security judgements: they need the officer role once roles exist (OPQ-015, OPQ-019).
// Stopping things (revoke, pause) stays open to everyone signed in: it is always the safe direction.
app.post('/api/models/providers/:id/attest', requireRole(roles, 'officer'));
app.post('/api/autonomy/orders/:id/activate', requireRole(roles, 'officer'));
app.use('/api', modelRoutes(hub));

// ---- autonomy: standing orders, runs by request, and the budgets. Agents only ever draft; people sign (docs/AUTONOMY.md). ----
app.use('/api', autonomyRoutes(autonomy));

// ---- ledger: the server authors every entry (seq, hash, time), so the chain cannot fork or be forged ----
app.post('/api/ledger', wrap(async (req, res) => {
  try {
    const out = await appendLedger(store, req.body?.input, req.body?.knownSeq, actorOf(res), undefined, { client: true });
    res.json(out);
  } catch (e) {
    if (e instanceof Rejected) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));

// ---- warehouse (append-only, validated) ----
app.get('/api/warehouse', (_q, res) => res.json(store.load()));
app.post('/api/warehouse/:collection', wrap(async (req, res) => {
  try {
    await serial(async () => {
      const rec = await validateAppend(req.params.collection, req.body, { actor: actorOf(res), store, roles: rolesOf(roles, actorOf(res)) });
      store.append(req.params.collection, rec);
    });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof Rejected) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));
app.get('/api/warehouse-export.jsonl', (_q, res) => {
  const all = store.load() as Record<string, readonly Rec[]>;
  res.type('application/x-ndjson').send(Object.entries(all).flatMap(([c, rs]) => rs.map((r) => JSON.stringify({ collection: c, ...r }))).join('\n'));
});

app.use('/api', (err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  const e = err as { status?: number; message?: string };
  const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? 'internal error' : (e.message ?? 'error') });
});

async function start() {
  if (env.NODE_ENV !== 'production') {
    const { createServer } = await import('vite');
    const vite = await createServer({ server: { middlewareMode: true }, appType: 'spa' });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), 'dist');
    app.use(express.static(dist));
    app.get('*', (_q, res) => res.sendFile(path.join(dist, 'index.html')));
  }
  if (autonomy.enabled) {
    // Scheduled orders are checked every minute. A failed check is logged and tried again next minute.
    setInterval(() => void autonomy.tick().catch((e: Error) => console.error('autonomy tick failed:', e.message)), 60_000).unref();
  }
  app.listen(PORT, HOST, () => {
    console.log(`Infinite-AI Ops Platform on http://${HOST}:${PORT}  (repo: ${REPO}; auth: ${auth.mode}; autonomy: ${autonomy.enabled ? 'on' : 'off'})`);
    if (auth.mode === 'open') console.warn('WARNING: no users configured (OPS_USERS). Open dev mode: identity is self-declared and publishing is disabled.');
  });
}
start();
