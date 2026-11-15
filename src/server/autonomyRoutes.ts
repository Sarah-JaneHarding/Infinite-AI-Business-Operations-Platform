import { Router, type Request, type RequestHandler, type Response } from 'express';
import { AutonomyService } from './autonomy/service';
import { OrderRefused } from './autonomy/orders';
import type { TaskStatus } from './autonomy/tasks';
import { DEPARTMENTS } from '../departments';

const TASK_STATUSES: readonly TaskStatus[] = ['QUEUED', 'RUNNING', 'SUBMITTED', 'QUARANTINED', 'FAILED', 'CANCELLED', 'EXPIRED'];
/** A filter value is absent, or one known string. An unknown or repeated value is a 400 that names the field, never an empty list. */
function oneOf<T extends string>(field: string, v: unknown, allowed: readonly T[]): T | undefined {
  if (v === undefined) return undefined;
  const hit = typeof v === 'string' ? allowed.find((a) => a === v) : undefined;
  if (!hit) throw new OrderRefused(400, `${field} is not one of: ${allowed.join(', ')}`);
  return hit;
}

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
  r.get('/autonomy/tasks', wrap((req, res) => {
    const dept = oneOf('dept', req.query.dept, DEPARTMENTS.map((d) => d.id));
    const status = oneOf('status', req.query.status, TASK_STATUSES);
    res.json({ tasks: autonomy.tasks({ ...(dept ? { dept } : {}), ...(status ? { status } : {}) }) });
  }));
  r.post('/autonomy/tasks', wrap(async (req, res) => res.json(await autonomy.enqueue(actorOf(res), req.body))));
  r.post('/autonomy/tasks/:id/cancel', wrap(async (req, res) => res.json(await autonomy.cancelTask(actorOf(res), req.params.id, String(req.body?.reason ?? '')))));
  return r;
}
