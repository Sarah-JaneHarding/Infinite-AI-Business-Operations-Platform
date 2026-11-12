import 'dotenv/config';
import express, { type NextFunction, type Request, type RequestHandler, type Response } from 'express';
import path from 'node:path';
import { GithubReader, liveFacts, type LiveStatus } from './src/connector/github';
import { lookup } from 'node:dns/promises';
import { checkTarget, isPrivateIp, parseAllowlist, payloadFor, sign } from './src/server/outbound';
import { summariseEvent, verifySignature, type EcoEvent } from './src/connector/webhook';
import { ProposalPublisher, proposalFromArtefact, PublishRefused } from './src/connector/proposals';
import { FileStore } from './src/server/fileAdapter';
import { completeWithClaude, ClaudeError } from './src/server/claude';
import { authenticate, parseAuth } from './src/server/auth';
import { Rejected, validateAppend } from './src/server/validate';
import { RateLimiter } from './src/server/rate';
import { appendLedger } from './src/server/ledgerService';
import { detectPii } from './src/core/guardrails/pii';
import { detectInjection } from './src/core/guardrails/injection';
import type { Artefact } from './src/core/platform';
import type { Rec } from './src/core/warehouse';
import { GeminiOperationsService, GEMINI_OPERATIONS_TOOLS } from './src/server/geminiService';
import { agentById } from './src/departments';

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

const store = new FileStore();
const reader = new GithubReader(REPO, env.GITHUB_TOKEN);
const publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true');
const geminiService = new GeminiOperationsService(env.GEMINI_API_KEY);

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
app.get('/api/health', (_q, res) => res.json({
  ok: true,
  repo: REPO,
  auth: auth.mode,
  githubToken: Boolean(env.GITHUB_TOKEN),
  llm: Boolean(env.ANTHROPIC_API_KEY || geminiService.isAvailable()),
  gemini: geminiService.isAvailable(),
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
  if (art.status !== 'APPROVED' || !store.list('approvals').some((r) => r.artefactId === id && r.decision === 'APPROVED' && r.approver === art.approvedBy)) return res.status(403).json({ error: 'Only an approved artefact with a recorded human approval can be sent.' });
  try { const addrs = await lookup(t.url.hostname, { all: true }); if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return res.status(403).json({ error: 'That host resolves to a non-public address.' }); } catch { return res.status(502).json({ error: 'Could not resolve that host.' }); }
  const body = JSON.stringify(payloadFor(art));
  const headers: Record<string, string> = { 'content-type': 'application/json', 'user-agent': 'infinite-ai-ops' };
  if (env.OPS_OUTBOUND_SECRET) headers['x-ops-signature'] = sign(env.OPS_OUTBOUND_SECRET, body);
  const r = await fetch(t.url, { method: 'POST', headers, body, redirect: 'error', signal: AbortSignal.timeout(10_000) }).catch((e: Error) => ({ ok: false, status: 0, statusText: e.message }));
  store.append('connector_events', { id: `out_${Date.now()}`, kind: 'artefact_sent', summary: `${art.id} v${art.version} to ${t.url.hostname}: ${r.status}`, by: actor, at: new Date().toISOString() });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, host: t.url.hostname });
}));

// ---- gateway upstream: holds the key; needs provenance, refuses anything that looks personal or hostile ----
const limiter = new RateLimiter(20, 60_000);
app.post('/api/gateway/complete', wrap(async (req, res) => {
  const { system = '', prompt = '', provenance } = req.body ?? {};
  if (!env.ANTHROPIC_API_KEY && !geminiService.isAvailable()) return res.status(503).json({ error: 'No LLM configured (ANTHROPIC_API_KEY or GEMINI_API_KEY)' });
  if (typeof system !== 'string' || typeof prompt !== 'string' || !prompt || system.length + prompt.length > 20_000) return res.status(400).json({ error: 'system and prompt must be strings (prompt required, 20k characters in total at most)' });
  // Provenance first, as in the in-browser gateway: an unstamped payload is refused even if the detector finds nothing.
  if (provenance?.deidentified !== true || !Array.isArray(provenance.sources) || !provenance.sources.length) return res.status(422).json({ error: 'refused: payload is not stamped de-identified with sources' });
  if (!limiter.allow(actorOf(res) ?? 'open')) return res.status(429).json({ error: 'rate limit: try again in a minute' });
  if (detectPii(`${system}\n${prompt}`).length || detectInjection(prompt).length) return res.status(422).json({ error: 'refused: personal data or injection pattern' });
  try {
    if (env.ANTHROPIC_API_KEY) {
      const text = await completeWithClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL ?? 'claude-sonnet-5-5', system, prompt });
      return res.json({ text });
    }
    // Fall back to Gemini 3.8 Flash
    const { text } = await geminiService.runCopilot(`${system ? `System: ${system}\n\n` : ''}${prompt}`, [], store);
    res.json({ text });
  } catch (e) {
    res.status(e instanceof ClaudeError ? 502 : 500).json({ error: (e as Error).message });
  }
}));

// ---- ai: generative capabilities, tools, and agent recommendations ----
app.get('/api/ai/tools', (_q, res) => {
  res.json({
    model: 'gemini-3.8-flash',
    geminiActive: geminiService.isAvailable(),
    tools: GEMINI_OPERATIONS_TOOLS
  });
});

app.post('/api/ai/agent-recommendations', wrap(async (req, res) => {
  const { agentId, currentValues = {} } = req.body ?? {};
  if (typeof agentId !== 'string' || !agentId) {
    return res.status(400).json({ error: 'agentId is required' });
  }
  const agent = agentById(agentId);
  if (!agent) {
    return res.status(404).json({ error: `Agent ${agentId} not found` });
  }
  const result = await geminiService.getAgentRecommendations(agent, currentValues, store);
  res.json(result);
}));

app.post('/api/ai/copilot', wrap(async (req, res) => {
  const { message = '', history = [] } = req.body ?? {};
  if (typeof message !== 'string' || !message.trim()) {
    return res.status(400).json({ error: 'message string is required' });
  }
  if (!limiter.allow(actorOf(res) ?? 'open')) {
    return res.status(429).json({ error: 'rate limit: try again in a minute' });
  }
  if (detectPii(message).length || detectInjection(message).length) {
    return res.status(422).json({ error: 'refused: personal data or prompt injection detected' });
  }
  const result = await geminiService.runCopilot(message, history, store);
  res.json(result);
}));

// ---- ledger: the server authors every entry (seq, hash, time), so the chain cannot fork or be forged ----
app.post('/api/ledger', wrap(async (req, res) => {
  try {
    const out = await appendLedger(store, req.body?.input, req.body?.knownSeq, actorOf(res));
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
  app.listen(PORT, HOST, () => {
    console.log(`Infinite-AI Ops Platform on http://${HOST}:${PORT}  (repo: ${REPO}; auth: ${auth.mode})`);
    if (auth.mode === 'open') console.warn('WARNING: no users configured (OPS_USERS). Open dev mode: identity is self-declared and publishing is disabled.');
  });
}
start();
