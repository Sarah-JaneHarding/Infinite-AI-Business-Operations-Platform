import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { Rec } from '../core/warehouse';
import { DecisionRefused, recordDecision, type DecideDeps } from '../oq/decide';
import { currentQuestions, ingest, parseSeed, type QStore } from '../oq/ingest';
import { buildPlan } from '../oq/plan';
import type { AgentTaskProposal, Decision, PrRecord, Question } from '../oq/types';
import { PrRefused, type PrWriter } from '../connector/prWriter';
import { checkTaskText } from '../core/ceo/guard';

export interface OqDeps extends DecideDeps {
  store: QStore;
  writer: PrWriter;
  seed: () => Question[];
  /** repo key -> owner/name, so the ecosystem override in ECOSYSTEM_REPO is honoured. */
  repos: Record<string, string>;
  flags: { writes: boolean; merge: boolean };
}

const latest = <T extends { id: string }>(rows: readonly Rec[]): T[] => {
  const m = new Map<string, T>();
  for (const r of rows) m.set(r.id, r as unknown as T);
  return [...m.values()];
};

/** Register routes. They sit behind the /api auth middleware, so `res.locals.actor` is the signed-in person (null only in open dev mode, which cannot decide or write). */
export function oqRoutes(d: OqDeps): Router {
  const r = Router();
  const actorOf = (res: Response) => res.locals.actor as string | null;
  const wrap = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((e: unknown) => {
      if (e instanceof DecisionRefused) return void res.status(e.status).json({ error: e.message });
      if (e instanceof PrRefused) return void res.status(e.status).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: 'internal error' });
    });
  };
  const need = (res: Response) => {
    const a = actorOf(res);
    if (!a) throw new DecisionRefused(403, 'This needs a signed-in person (set OPS_USERS).');
    return a;
  };
  const prById = (id: string) => {
    const p = latest<PrRecord>(d.store.list('oq_prs')).find((x) => x.id === id);
    if (!p) throw new DecisionRefused(404, 'unknown pull request');
    return p;
  };

  r.get('/oq', (_q, res) => res.json({
    questions: currentQuestions(d.store), decisions: latest<Decision>(d.store.list('oq_decisions')), agentTasks: latest<AgentTaskProposal>(d.store.list('oq_agent_tasks')), prs: latest<PrRecord>(d.store.list('oq_prs')),
    config: { prWrites: d.writer.enabled, prMerge: d.writer.enabled && d.flags.merge },
  }));

  r.post('/oq/ingest', wrap((_q, res) => res.json(ingest(d.store, d.seed(), need(res)))));

  r.post('/oq/questions', wrap((req, res) => {
    const by = need(res);
    const b = (req.body ?? {}) as Record<string, unknown>;
    const p = parseSeed([{ status: 'open', suggestions: [], options: [], recommendedIndex: null, ...b, raised: new Date().toISOString().slice(0, 10) }]);
    if (!p.ok) throw new DecisionRefused(400, p.error);
    const q = p.questions[0];
    const gate = checkTaskText(q.title, q.question, q.reason);
    if (gate) throw new DecisionRefused(400, gate);
    if (currentQuestions(d.store).some((x) => x.id === q.id)) throw new DecisionRefused(409, `${q.id} already exists`);
    d.store.append('oq_questions', { ...q, ingestedBy: by, ingestedAt: new Date().toISOString() } as unknown as Rec);
    res.json({ id: q.id });
  }));

  r.post('/oq/questions/:id/decide', wrap(async (req, res) => res.json(await recordDecision(d, actorOf(res), req.params.id, req.body))));

  const planFor = (decisionId: string) => {
    const dec = latest<Decision>(d.store.list('oq_decisions')).find((x) => x.id === decisionId);
    const q = dec && currentQuestions(d.store).find((x) => x.id === dec.qid);
    if (!dec || !q) throw new DecisionRefused(404, 'unknown decision');
    return { dec, q, plan: buildPlan(q, dec, d.repos) };
  };
  r.get('/oq/decisions/:id/plan', wrap((req, res) => res.json(planFor(req.params.id).plan)));

  r.post('/oq/decisions/:id/pr', wrap(async (req, res) => {
    const by = need(res);
    const { dec, q, plan } = planFor(req.params.id);
    if (latest<PrRecord>(d.store.list('oq_prs')).some((p) => p.decisionId === dec.id)) throw new DecisionRefused(409, 'a pull request already exists for this decision');
    const out = await d.writer.openDraft(plan);
    const rec: PrRecord = { id: `oqpr_${dec.id}`, qid: q.id, decisionId: dec.id, repo: plan.repo, number: out.number, url: out.url, branch: out.branch, by, at: new Date().toISOString() };
    d.store.append('oq_prs', rec as unknown as Rec);
    await d.ledger('oq.pr_opened', q.id, { decisionId: dec.id, repo: plan.repo, number: out.number }, by);
    res.json(rec);
  }));

  r.get('/oq/prs/:id', wrap(async (req, res) => {
    const p = prById(req.params.id);
    const view = await d.writer.view(p.repo, p.number);
    // A decision is only resolved once its pull request is merged on GitHub, whoever merged it.
    if (view.state === 'merged') {
      const q = currentQuestions(d.store).find((x) => x.id === p.qid);
      if (q && q.status !== 'resolved') {
        d.store.append('oq_questions', { ...q, status: 'resolved' } as unknown as Rec);
        await d.ledger('oq.resolved', q.id, { number: p.number, repo: p.repo }, 'system');
      }
    }
    res.json({ pr: p, view });
  }));
  r.post('/oq/prs/:id/comment', wrap(async (req, res) => {
    const by = need(res);
    const p = prById(req.params.id);
    const text = String(req.body?.text ?? '').trim();
    if (text.length < 2 || text.length > 4000) throw new DecisionRefused(400, 'a comment is 2 to 4000 characters');
    const gate = checkTaskText(text);
    if (gate) throw new DecisionRefused(400, gate);
    await d.writer.comment(p.repo, p.number, `${text}\n\n_Commenter: ${by}_`);
    await d.ledger('oq.pr_commented', p.qid, { repo: p.repo, number: p.number }, by);
    res.json({ ok: true });
  }));
  r.post('/oq/prs/:id/edit', wrap(async (req, res) => {
    const by = need(res);
    const p = prById(req.params.id);
    const path = String(req.body?.path ?? '');
    const text = String(req.body?.text ?? '');
    if (!text.trim() || text.length > 100_000) throw new DecisionRefused(400, 'the file text is required (up to 100000 characters)');
    const gate = checkTaskText(text);
    if (gate) throw new DecisionRefused(400, gate);
    await d.writer.editFile(p.repo, p.number, path, text, `docs(decisions): edit ${path} (by ${by})`);
    await d.ledger('oq.pr_edited', p.qid, { repo: p.repo, number: p.number, path }, by);
    res.json({ ok: true });
  }));
  r.post('/oq/prs/:id/ready', wrap(async (req, res) => {
    const by = need(res);
    const p = prById(req.params.id);
    await d.writer.markReady(p.repo, p.number);
    await d.ledger('oq.pr_ready', p.qid, { repo: p.repo, number: p.number }, by);
    res.json({ ok: true });
  }));
  r.post('/oq/prs/:id/merge', wrap(async (req, res) => {
    const by = need(res);
    const p = prById(req.params.id);
    if (Number(req.body?.confirmNumber) !== p.number) throw new DecisionRefused(400, `type the pull request number (${p.number}) to confirm`);
    await d.writer.merge(p.repo, p.number, String(req.body?.headSha ?? ''));
    await d.ledger('oq.pr_merged', p.qid, { repo: p.repo, number: p.number }, by);
    const q = currentQuestions(d.store).find((x) => x.id === p.qid);
    if (q && q.status !== 'resolved') d.store.append('oq_questions', { ...q, status: 'resolved' } as unknown as Rec);
    res.json({ ok: true });
  }));
  return r;
}
