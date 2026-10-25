import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { GithubReader, liveFacts, type LiveStatus } from './src/connector/github';
import { summariseEvent, verifySignature, type EcoEvent } from './src/connector/webhook';
import { ProposalPublisher, proposalFromArtefact, PublishRefused } from './src/connector/proposals';
import { FileStore } from './src/server/fileAdapter';
import { detectPii } from './src/core/guardrails/pii';
import { detectInjection } from './src/core/guardrails/injection';
import type { Artefact } from './src/core/platform';

const env = process.env;
const REPO = env.ECOSYSTEM_REPO ?? 'Sarah-JaneHarding/infinite-ai-ecosystem';
const PORT = Number(env.PORT ?? 3000);
const OPS_TOKEN = env.OPS_API_TOKEN; // optional shared secret for the API
const store = new FileStore();
const reader = new GithubReader(REPO, env.GITHUB_TOKEN);
const publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true');

const app = express();
app.disable('x-powered-by');

// ---- webhook first: it needs the RAW body for the HMAC ----
const events: EcoEvent[] = [];
app.post('/api/connector/webhook', express.raw({ type: '*/*', limit: '1mb' }), async (req, res) => {
  const secret = env.GITHUB_WEBHOOK_SECRET ?? '';
  const body = (req.body as Buffer).toString('utf8');
  if (!(await verifySignature(secret, body, req.header('x-hub-signature-256')))) return res.status(401).json({ error: 'bad signature' });
  const ev = summariseEvent(req.header('x-github-event') ?? 'unknown', JSON.parse(body));
  events.unshift(ev);
  events.length = Math.min(events.length, 100);
  store.append('connector_events', { id: `ev_${Date.now()}`, ...ev });
  cache = null; // next status call refetches
  res.json({ ok: true });
});

app.use(express.json({ limit: '2mb' }));
app.use('/api', (req, res, next) => {
  if (OPS_TOKEN && req.header('x-ops-token') !== OPS_TOKEN) return res.status(401).json({ error: 'unauthorised' });
  next();
});

app.get('/api/health', (_q, res) => res.json({ ok: true, repo: REPO, githubToken: Boolean(env.GITHUB_TOKEN), gemini: Boolean(env.GEMINI_API_KEY), claude: Boolean(env.ANTHROPIC_API_KEY), ecosystemWrites: env.OPS_ALLOW_ECOSYSTEM_WRITES === 'true', webhook: Boolean(env.GITHUB_WEBHOOK_SECRET) }));

// ---- connector: read-only live status, cached briefly ----
let cache: { at: number; status: LiveStatus } | null = null;
app.get('/api/connector/status', async (_q, res) => {
  if (!cache || Date.now() - cache.at > 60_000) cache = { at: Date.now(), status: await reader.status() };
  res.json({ status: cache.status, facts: liveFacts(cache.status) });
});
app.get('/api/connector/events', (_q, res) => res.json(events));

// ---- publish: the only write to the ecosystem. Gate is checked against the SERVER's copy of the artefact. ----
app.post('/api/connector/publish', async (req, res) => {
  try {
    const id = String(req.body?.artefactId ?? '');
    const versions = (store.load()['artefact_versions'] ?? []).filter((r) => r.id === id) as unknown as Artefact[];
    const art = versions.at(-1);
    if (!art) return res.status(404).json({ error: 'unknown artefact' });
    const summary = String(req.body?.summary ?? '').slice(0, 4000);
    const out = await publisher.openIssue(art, proposalFromArtefact(art, summary));
    store.append('connector_events', { id: `pub_${Date.now()}`, kind: 'issue_opened', summary: out.url, at: new Date().toISOString() });
    res.json(out);
  } catch (e) {
    res.status(e instanceof PublishRefused ? 403 : 500).json({ error: (e as Error).message });
  }
});

// ---- gateway upstream: holds the key; refuses anything that looks personal or hostile ----
app.post('/api/gateway/gemini', async (req, res) => {
  const { system = '', prompt = '' } = req.body ?? {};
  if (!env.GEMINI_API_KEY) return res.status(503).json({ error: 'GEMINI_API_KEY not configured' });
  if (detectPii(`${system}\n${prompt}`).length || detectInjection(prompt).length) return res.status(422).json({ error: 'refused: personal data or injection pattern' });
  try {
    const { GoogleGenAI } = await import('@google/genai');
    const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });
    const r = await ai.models.generateContent({ model: env.GEMINI_MODEL ?? 'gemini-2.5-flash', contents: String(prompt), config: { systemInstruction: String(system) } });
    res.json({ text: r.text ?? '' });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---- gateway upstream: Claude (Anthropic) — holds the key; refuses anything that looks personal or hostile ----
app.post('/api/gateway/claude', async (req, res) => {
  const { system = '', prompt = '' } = req.body ?? {};
  if (!env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'ANTHROPIC_API_KEY not configured' });
  if (detectPii(`${system}\n${prompt}`).length || detectInjection(prompt).length) return res.status(422).json({ error: 'refused: personal data or injection pattern' });
  try {
    const { default: Anthropic } = await import('@anthropic-ai/sdk');
    const anthropic = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY });
    const r = await anthropic.messages.create({
      model: env.ANTHROPIC_MODEL ?? 'claude-opus-5',
      max_tokens: 1024,
      system: String(system),
      messages: [{ role: 'user', content: String(prompt) }],
    });
    const text = r.content.filter((b) => b.type === 'text').map((b) => b.text).join('\n');
    res.json({ text });
  } catch (e) {
    res.status(502).json({ error: (e as Error).message });
  }
});

// ---- warehouse (append-only) ----
app.get('/api/warehouse', (_q, res) => res.json(store.load()));
app.post('/api/warehouse/:collection', (req, res) => {
  try {
    if (typeof req.body?.id !== 'string') return res.status(400).json({ error: 'record needs an id' });
    store.append(req.params.collection, req.body);
    res.json({ ok: true });
  } catch (e) {
    res.status(400).json({ error: (e as Error).message });
  }
});
app.get('/api/warehouse-export.jsonl', (_q, res) => {
  const all = store.load();
  res.type('application/x-ndjson').send(Object.entries(all).flatMap(([c, rs]) => rs.map((r) => JSON.stringify({ collection: c, ...r }))).join('\n'));
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
  app.listen(PORT, env.HOST ?? '127.0.0.1', () => console.log(`Infinite-AI Ops Platform on http://${env.HOST ?? '127.0.0.1'}:${PORT}  (repo: ${REPO})`));
}
start();
