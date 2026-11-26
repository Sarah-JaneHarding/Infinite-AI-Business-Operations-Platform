import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { Purpose } from '../core/types';
import { agentById } from '../departments';
import { ModelHub, ModelUnavailable } from './models/hub';
import { ModelRefused } from './models/rules';
import { PROVIDER_IDS, type ProviderId } from './models/providers';
import { TOOLS } from './models/tools';
import { SUGGEST_LIMITS, parseDoc } from '../core/suggest';

/** Every model route. They sit behind the /api auth middleware and call only ModelHub (rule M10). */
export function modelRoutes(hub: ModelHub): Router {
  const r = Router();
  const actorOf = (res: Response) => res.locals.actor as string | null;
  const wrap = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((e: unknown) => {
      if (e instanceof ModelRefused) return void res.status(e.status).json({ error: e.message, rule: e.rule });
      if (e instanceof ModelUnavailable) return void res.status(e.status).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: 'internal error' });
    });
  };
  const provider = (req: Request): ProviderId => {
    const id = req.params.id as ProviderId;
    if (!PROVIDER_IDS.includes(id)) throw new ModelRefused('M5', 'Unknown provider.', 404);
    return id;
  };

  // ---- the hub: status, rules, setup, attestation, test (no secrets are ever returned) ----
  r.get('/models/hub', (_q, res) => res.json(hub.status()));
  r.post('/models/providers/:id/attest', wrap(async (req, res) => res.json(await hub.attest(provider(req), actorOf(res), String(req.body?.note ?? '')))));
  r.post('/models/providers/:id/revoke', wrap(async (req, res) => res.json(await hub.revoke(provider(req), actorOf(res), String(req.body?.reason ?? '')))));
  r.post('/models/providers/:id/test', wrap(async (req, res) => res.json(await hub.selfTest(provider(req), actorOf(res)))));

  // ---- the in-browser gateway: payload already de-identified and stamped by the Platform ----
  r.post('/gateway/complete', wrap(async (req, res) => {
    const { system = '', prompt = '', provenance, purpose, agentId } = req.body ?? {};
    // A built-in agent's contract binds the call (purpose and providers). Custom agents live in the browser's warehouse, so their id is only logged.
    const agent = typeof agentId === 'string' ? agentById(agentId) : undefined;
    const out = await hub.complete({ system: typeof system === 'string' ? system : '', prompt: typeof prompt === 'string' ? prompt : '', purpose: purpose as Purpose, provenance, actor: actorOf(res), agent });
    res.json({ text: out.text, draft: out.draft, provider: out.provider, model: out.model, flags: out.flags });
  }));

  // ---- copilot and agent recommendations ----
  r.get('/ai/tools', (_q, res) => res.json({ providerReady: hub.anyReady(), tools: TOOLS.map((t) => ({ name: t.name, description: t.description })) }));
  r.post('/ai/copilot', wrap(async (req, res) => {
    const { message = '', history = [] } = req.body ?? {};
    if (typeof message !== 'string' || !message.trim()) return void res.status(400).json({ error: 'message string is required' });
    const out = await hub.copilot(message, history, actorOf(res));
    res.json({ text: out.text, toolInvocations: out.toolInvocations, draft: out.draft, provider: out.provider, model: out.model, flags: out.flags });
  }));
  /** `round` (whole number, 0 to 50) and `exclude` (at most 200 strings of at most 500 characters). A message is returned for a bad value. */
  const refresh = (body: Record<string, unknown>): { round: number; exclude: string[] } | string => {
    const round = body.round ?? 0;
    if (typeof round !== 'number' || !Number.isInteger(round) || round < 0 || round > SUGGEST_LIMITS.maxRound) return `round must be a whole number from 0 to ${SUGGEST_LIMITS.maxRound}`;
    const exclude = body.exclude ?? [];
    if (!Array.isArray(exclude) || exclude.length > SUGGEST_LIMITS.maxExclude || exclude.some((t) => typeof t !== 'string' || t.length > SUGGEST_LIMITS.maxExcludeChars)) return `exclude must be at most ${SUGGEST_LIMITS.maxExclude} strings of at most ${SUGGEST_LIMITS.maxExcludeChars} characters`;
    return { round, exclude: exclude as string[] };
  };
  r.post('/ai/document-suggestions', wrap(async (req, res) => {
    const body = (req.body ?? {}) as Record<string, unknown>;
    if (body.doc === undefined || body.doc === null) return void res.status(400).json({ error: 'doc is required' });
    if ((JSON.stringify(body.doc) ?? '').length > SUGGEST_LIMITS.maxDocJson) return void res.status(400).json({ error: `doc is too large (over ${SUGGEST_LIMITS.maxDocJson} characters)` });
    const doc = parseDoc(body.doc);
    if (!doc) return void res.status(400).json({ error: 'doc must be a document with a title and blocks' });
    const ask = refresh(body);
    if (typeof ask === 'string') return void res.status(400).json({ error: ask });
    res.json(await hub.suggestForDocument(doc, ask.round, ask.exclude, actorOf(res)));
  }));
  r.post('/ai/agent-recommendations', wrap(async (req, res) => {
    const { agentId, currentValues = {} } = req.body ?? {};
    if (typeof agentId !== 'string' || !agentId) return void res.status(400).json({ error: 'agentId is required' });
    const agent = agentById(agentId);
    if (!agent) return void res.status(404).json({ error: `Agent ${agentId} not found` });
    const ask = refresh(req.body ?? {});
    if (typeof ask === 'string') return void res.status(400).json({ error: ask });
    res.json(await hub.recommend(agent, currentValues, actorOf(res), ask.round, ask.exclude));
  }));

  return r;
}
