import 'dotenv/config';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import path from 'node:path';
import { GithubReader, liveFacts, type LiveStatus } from './src/connector/github';
import { summariseEvent, verifySignature, type EcoEvent } from './src/connector/webhook';
import { ProposalPublisher, proposalFromArtefact, PublishRefused } from './src/connector/proposals';
import { FileStore } from './src/server/fileAdapter';
import { completeWithClaude, ClaudeError } from './src/server/claude';
import { authenticate, parseAuth } from './src/server/auth';
import { Rejected, validateAppend } from './src/server/validate';
import { RateLimiter } from './src/server/rate';
import { detectPii } from './src/core/guardrails/pii';
import { detectInjection } from './src/core/guardrails/injection';
import type { Artefact } from './src/core/platform';
import type { Rec } from './src/core/warehouse';

const env = process.env;
const REPO = env.ECOSYSTEM_REPO ?? 'Sarah-JaneHarding/infinite-ai-ecosystem';
const PORT = Number(env.PORT ?? 3000);
const auth = parseAuth(env); // throws on a bad config: the server does not start half-secured
const store = new FileStore();
const reader = new GithubReader(REPO, env.GITHUB_TOKEN);
const publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true');

const app = express();
app.disable('x-powered-by');

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
app.get('/api/health', (_q, res) => res.json({ ok: true, repo: REPO, auth: auth.mode, githubToken: Boolean(env.GITHUB_TOKEN), llm: Boolean(env.ANTHROPIC_API_KEY), ecosystemWrites: env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true', webhook: Boolean(env.GITHUB_WEBHOOK_SECRET) }));

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
  res.json({ ok: true });
}));

app.use(express.json({ limit: '512kb' }));
app.use('/api', (req, res, next) => {
  const actor = authenticate(auth, req.header('x-ops-token'));
  if (auth.mode === 'users' && !actor) return res.status(401).json({ error: 'unauthorised' });
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
    // The decision must also exist in the approvals record, made by the person named on the artefact.
    if (!store.list('approvals').some((r) => r.artefactId === id && r.decision === 'APPROVED' && r.approver === art.approvedBy)) return res.status(403).json({ error: 'No recorded human approval for this artefact.' });
    const summary = String(req.body?.summary ?? '').slice(0, 4000);
    const out = await publisher.openIssue(art, proposalFromArtefact(art, summary));
    store.append('connector_events', { id: `pub_${Date.now()}`, kind: 'issue_opened', summary: out.url, by: actor, at: new Date().toISOString() });
    res.json(out);
  } catch (e) {
    if (e instanceof PublishRefused) return res.status(403).json({ error: e.message });
    throw e;
  }
}));

// ---- gateway upstream: holds the key; needs provenance, refuses anything that looks personal or hostile ----
const limiter = new RateLimiter(20, 60_000);
app.post('/api/gateway/complete', wrap(async (req, res) => {
  const { system = '', prompt = '', provenance } = req.body ?? {};
  if (!env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  if (typeof system !== 'string' || typeof prompt !== 'string' || !prompt || system.length + prompt.length > 20_000) return res.status(400).json({ error: 'system and prompt must be strings (prompt required, 20k characters in total at most)' });
  // Provenance first, as in the in-browser gateway: an unstamped payload is refused even if the detector finds nothing.
  if (provenance?.deidentified !== true || !Array.isArray(provenance.sources) || !provenance.sources.length) return res.status(422).json({ error: 'refused: payload is not stamped de-identified with sources' });
  if (!limiter.allow(actorOf(res) ?? 'open')) return res.status(429).json({ error: 'rate limit: try again in a minute' });
  if (detectPii(`${system}\n${prompt}`).length || detectInjection(prompt).length) return res.status(422).json({ error: 'refused: personal data or injection pattern' });
  try {
    const text = await completeWithClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5', system, prompt });
    res.json({ text });
  } catch (e) {
    res.status(e instanceof ClaudeError ? 502 : 500).json({ error: (e as Error).message });
  }
}));

// ---- warehouse (append-only, validated) ----
app.get('/api/warehouse', (_q, res) => res.json(store.load()));
app.post('/api/warehouse/:collection', wrap(async (req, res) => {
  try {
    await serial(async () => {
      const rec = await validateAppend(req.params.collection, req.body, { actor: actorOf(res), store });
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
  app.listen(PORT, env.HOST ?? '127.0.0.1', () => {
    console.log(`Infinite-AI Ops Platform on http://${env.HOST ?? '127.0.0.1'}:${PORT}  (repo: ${REPO}; auth: ${auth.mode})`);
    if (auth.mode === 'open') console.warn('WARNING: no users configured (OPS_USERS). Open dev mode: identity is self-declared and publishing is disabled.');
  });
}
start();
