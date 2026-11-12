import { Router, type Request, type RequestHandler, type Response } from 'express';
import { AutonomyService } from './autonomy/service';
import { OrderRefused } from './autonomy/orders';

/** Autonomy routes. They sit behind the /api auth middleware; open dev mode has no signed-in person, so the service refuses there. */
export function autonomyRoutes(autonomy: AutonomyService): Router {
  const r = Router();
  const actorOf = (res: Response) => res.locals.actor as string | null;
  const wrap = (fn: (req: Request, res: Response) => unknown): RequestHandler => (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((e: unknown) => {
      if (e instanceof OrderRefused) return void res.status(e.status).json({ error: e.message, checks: e.checks });
      console.error(e);
      res.status(500).json({ error: 'internal error' });
    });
  };
  r.get('/autonomy', (_q, res) => res.json(autonomy.status()));
  r.post('/autonomy/orders', wrap(async (req, res) => res.json(await autonomy.propose(actorOf(res), req.body))));
  r.post('/autonomy/orders/:id/activate', wrap(async (req, res) => res.json(await autonomy.activate(actorOf(res), req.params.id, String(req.body?.note ?? '')))));
  r.post('/autonomy/orders/:id/pause', wrap(async (req, res) => res.json(await autonomy.pause(actorOf(res), req.params.id, String(req.body?.reason ?? '')))));
  r.post('/autonomy/orders/:id/revoke', wrap(async (req, res) => res.json(await autonomy.revoke(actorOf(res), req.params.id, String(req.body?.reason ?? '')))));
  r.post('/autonomy/orders/:id/run', wrap(async (req, res) => res.json(await autonomy.runNow(actorOf(res), req.params.id))));
  return r;
}
