import { describe, expect, it, vi } from 'vitest';
import { AutonomyService } from '../src/server/autonomy/service';
import { OrderRefused } from '../src/server/autonomy/orders';
import { MAX_QUEUED_PER_ORDER, TASK_EXPIRY_MS, type Task } from '../src/server/autonomy/tasks';
import type { Runner, RunOutcome } from '../src/server/autonomy/runner';
import type { LedgerStore } from '../src/server/ledgerService';
import type { Rec } from '../src/core/warehouse';
import { AGENTS } from '../src/departments';

const agent = AGENTS.find((a) => a.inputs.some((i) => i.required && (i.kind === 'text' || i.kind === 'longtext')))!;
const textKey = agent.inputs.find((i) => i.required && (i.kind === 'text' || i.kind === 'longtext'))!.key;
const inputs = Object.fromEntries(agent.inputs.filter((i) => i.required).map((i) => [i.key, i.kind === 'number' ? '5' : i.kind === 'select' ? i.options![0]! : 'Pilot school onboarding process']));
const body = (o: Record<string, unknown> = {}) => ({ name: 'Weekly onboarding review', agentId: agent.id, trigger: { kind: 'request' }, inputs, ...o });
const NOW = '2026-11-12T10:00:00Z';

function setup(env: Record<string, string> = { OPS_AUTONOMY: 'on' }, rows: Record<string, Rec[]> = {}) {
  const store: LedgerStore & { rows: Record<string, Rec[]> } = { rows, list: (c) => rows[c] ?? [], append: (c, r) => void (rows[c] ??= []).push(r) };
  const clock = { t: new Date(NOW) };
  const ok: RunOutcome = { outcome: 'submitted', artefactId: 'art_1', checks: [], flags: [] };
  const runner = { run: vi.fn(async () => ok), dryRun: vi.fn(async () => ({ passed: true, results: [] })) } as unknown as Runner & { run: ReturnType<typeof vi.fn>; dryRun: ReturnType<typeof vi.fn> };
  const make = (e = env) => new AutonomyService({ env: e, store, runner, now: () => clock.t });
  return { svc: make(), make, store, runner, clock };
}
type H = ReturnType<typeof setup>;
const refused = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as OrderRefused | null;
const actions = (s: { rows: Record<string, Rec[]> }) => (s.rows['ledger'] ?? []).map((e) => String(e.action));
const count = (h: H, a: string) => actions(h.store).filter((x) => x === a).length;
async function active(h: H, trigger: unknown = { kind: 'request' }, extra: Record<string, unknown> = {}) {
  const o = await h.svc.propose('sarah', body({ trigger, ...extra }));
  return h.svc.activate('dan', o.id, 'looks right');
}
const task = (orderId: string, o: Record<string, unknown> = {}) => ({ orderId, priority: 2, due: NOW, ...o });
const byId = (h: H, id: string) => h.svc.tasks().find((t) => t.id === id)!;

describe('the task queue: enqueue and drain', () => {
  it('runs the most urgent task first, one at a time, and every run is audited with its task', async () => {
    const h = setup();
    const o = await active(h);
    const slow = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    const urgent = await h.svc.enqueue('sarah', task(o.id, { priority: 1 }));
    expect(slow).toMatchObject({ status: 'QUEUED', dept: agent.dept, agentId: agent.id, origin: { kind: 'person', by: 'sarah' }, version: 1 });
    expect(h.svc.status().queue).toEqual({ queued: 2, byDept: { [agent.dept]: 2 } });
    const out = await h.svc.drain();
    expect(out).toHaveLength(1); // maxRunsPerDay of the order is 1
    expect(byId(h, urgent.id).status).toBe('SUBMITTED');
    expect(byId(h, slow.id).status).toBe('QUEUED');
    h.clock.t = new Date('2026-11-13T10:00:00Z');
    expect(await h.svc.drain()).toHaveLength(1);
    expect(byId(h, slow.id)).toMatchObject({ status: 'SUBMITTED', artefactId: 'art_1' });
    expect(h.svc.status().queue.queued).toBe(0);
    const started = h.store.rows['ledger']!.filter((e) => e.action === 'autonomy.started');
    expect(started.map((e) => (e.detail as { taskId?: string }).taskId)).toEqual([urgent.id, slow.id]);
    expect(count(h, 'autonomy.task.queued')).toBe(2);
  });

  it('runs two tasks of an order with a larger budget, priority 1 first, both submitted', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { maxRunsPerDay: 2 });
    const a = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    const b = await h.svc.enqueue('sarah', task(o.id, { priority: 1 }));
    expect(await h.svc.drain()).toHaveLength(2);
    expect(byId(h, b.id).status).toBe('SUBMITTED');
    expect(byId(h, a.id).status).toBe('SUBMITTED');
    expect(count(h, 'autonomy.started')).toBe(2);
    expect(h.svc.status().queue.queued).toBe(0);
    const started = h.store.rows['ledger']!.filter((e) => e.action === 'autonomy.started');
    expect((started[0]!.detail as { taskId: string }).taskId).toBe(b.id);
  });

  it('refuses a task: no person, an auto actor, an unknown or inactive order, a full queue, and bad inputs; nothing is stored', async () => {
    const h = setup();
    const o = await active(h);
    expect((await refused(h.svc.enqueue(null, task(o.id))))?.status).toBe(403);
    expect((await refused(h.svc.enqueue('auto:ord_x', task(o.id))))?.status).toBe(403);
    expect((await refused(h.svc.enqueue('sarah', task('ord_missing'))))?.status).toBe(404);
    expect((await refused(h.svc.enqueue('sarah', task(o.id, { priority: 9 }))))?.status).toBe(400);
    const proposed = await h.svc.propose('sarah', body());
    expect((await refused(h.svc.enqueue('sarah', task(proposed.id))))?.status).toBe(409);
    const paused = await active(h);
    await h.svc.pause('eve', paused.id, 'Holding it for now');
    expect((await refused(h.svc.enqueue('sarah', task(paused.id))))?.status).toBe(409);
    const revoked = await active(h);
    await h.svc.revoke('eve', revoked.id, 'No longer needed');
    expect((await refused(h.svc.enqueue('sarah', task(revoked.id))))?.status).toBe(409);
    expect((await refused(h.svc.enqueue('sarah', task(o.id, { inputs: { [textKey]: 'Something else entirely' } }))))?.status).toBe(422);
    expect(h.store.rows['autonomy_tasks']).toBeUndefined();
    const ok = await active(h, { kind: 'request' }, { allowTaskInputs: true });
    const bad = await refused(h.svc.enqueue('sarah', task(ok.id, { inputs: { [textKey]: 'send it to someone@example.com' } })));
    expect(bad?.status).toBe(422);
    expect(bad?.message).not.toMatch(/someone@example/);
    expect((await refused(h.svc.enqueue('sarah', task(ok.id, { inputs: { nope: 'x' } }))))?.status).toBe(400);
    expect(h.store.rows['autonomy_tasks']).toBeUndefined();
    for (let i = 0; i < MAX_QUEUED_PER_ORDER; i++) await h.svc.enqueue('sarah', task(o.id));
    expect((await refused(h.svc.enqueue('sarah', task(o.id))))?.status).toBe(429);
    expect(h.store.rows['autonomy_tasks']).toHaveLength(MAX_QUEUED_PER_ORDER);
  });

  it('refuses bad due dates and stores nothing: not ISO, a date that does not exist, too far ahead, long past', async () => {
    const h = setup();
    const o = await active(h);
    for (const due of ['tomorrow', '2026-02-30T08:00:00Z', '2027-06-01T08:00:00Z', '2026-11-01T08:00:00Z', 12, undefined]) {
      expect((await refused(h.svc.enqueue('sarah', task(o.id, { due }))))?.status, String(due)).toBe(400);
    }
    expect(h.store.rows['autonomy_tasks']).toBeUndefined();
  });

  it('passes task inputs to the runner without changing the order', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { allowTaskInputs: true });
    const t = await h.svc.enqueue('sarah', task(o.id, { inputs: { [textKey]: 'Quarterly supplier review' } }));
    expect(t.inputs).toEqual({ [textKey]: 'Quarterly supplier review' });
    await h.svc.drain();
    const passed = h.runner.run.mock.calls[0]![0] as { inputs: Record<string, string>; id: string };
    expect(passed).toMatchObject({ id: o.id, inputs: { ...inputs, [textKey]: 'Quarterly supplier review' } });
    expect(h.svc.status().orders.find((x) => x.id === o.id)!.inputs).toEqual(inputs);
    expect(h.store.rows['standing_orders']!.at(-1)!.inputs).toEqual(inputs);
  });

  it('stores only the fields of a task', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { allowTaskInputs: true });
    await h.svc.enqueue('sarah', task(o.id, { inputs: { [textKey]: 'Quarterly supplier review' }, extra: 'ignored' }));
    const allowed = ['id', 'orderId', 'agentId', 'dept', 'priority', 'due', 'inputs', 'origin', 'dedupeKey', 'status', 'note', 'artefactId', 'version', 'at'];
    for (const r of h.store.rows['autonomy_tasks']!) expect(Object.keys(r).filter((k) => !allowed.includes(k))).toEqual([]);
  });
});

describe('the task queue: triggers feed it without duplicates', () => {
  it('a schedule slot enqueues once: not while a task for it is queued, not on a second tick in the same minute', async () => {
    const h = setup();
    const o = await active(h, { kind: 'schedule', every: 'daily', hourUtc: 10 }, { maxRunsPerDay: 1 });
    // Fill the budget with a manual run so the slot's task cannot run and stays queued.
    await h.svc.runNow('sarah', o.id);
    await h.svc.tick(h.clock.t);
    expect(h.svc.tasks({ status: 'QUEUED' })).toHaveLength(1);
    expect(h.svc.tasks()[0]).toMatchObject({ origin: { kind: 'schedule', slot: '2026-11-12T10:00:00.000Z' }, dedupeKey: 'schedule:2026-11-12T10:00:00.000Z' });
    await h.svc.tick(h.clock.t);
    h.clock.t = new Date('2026-11-12T10:00:40Z');
    await h.svc.tick(h.clock.t);
    expect(h.svc.tasks()).toHaveLength(1);
    expect(count(h, 'autonomy.task.queued')).toBe(1);
  });

  it('a schedule slot runs through the queue, once, and does not come back after it has run', async () => {
    const h = setup();
    const o = await active(h, { kind: 'schedule', every: 'daily', hourUtc: 10 });
    expect(await h.svc.tick(h.clock.t)).toHaveLength(1);
    expect(await h.svc.tick(h.clock.t)).toEqual([]);
    expect(h.runner.run).toHaveBeenCalledTimes(1);
    expect(h.runner.run.mock.calls[0]![1]).toEqual({ kind: 'schedule', slot: '2026-11-12T10:00:00.000Z' });
    expect(h.svc.tasks()).toMatchObject([{ orderId: o.id, status: 'SUBMITTED' }]);
  });

  it('an event inside the cooldown, or while one is queued, enqueues nothing', async () => {
    const h = setup();
    const o = await active(h, { kind: 'event', events: ['push'], cooldownMinutes: 60 }, { maxRunsPerDay: 1 });
    await h.svc.runNow('sarah', o.id); // uses the budget, and is itself inside the cooldown
    expect(await h.svc.onEvent('push')).toEqual([]);
    expect(h.svc.tasks()).toHaveLength(0);
    h.clock.t = new Date('2026-11-12T12:00:00Z'); // cooldown over, budget used: the task waits
    expect(await h.svc.onEvent('push')).toEqual([]);
    expect(h.svc.tasks({ status: 'QUEUED' })).toHaveLength(1);
    h.clock.t = new Date('2026-11-12T12:05:00Z');
    await h.svc.onEvent('push');
    await h.svc.onEvent('push');
    expect(h.svc.tasks()).toHaveLength(1);
    expect(await h.svc.onEvent('issues')).toEqual([]); // not listening for it
    expect(h.svc.tasks()[0]!.origin).toEqual({ kind: 'event', event: 'push' });
  });

  it('an event runs through the queue when the order has budget, and its content never reaches the task', async () => {
    const h = setup();
    await active(h, { kind: 'event', events: ['push'], cooldownMinutes: 60 });
    expect(await h.svc.onEvent('push')).toHaveLength(1);
    expect(h.runner.run.mock.calls[0]![1]).toEqual({ kind: 'event', event: 'push' });
    expect(Object.keys(h.svc.tasks()[0]!).sort()).toEqual(['agentId', 'at', 'artefactId', 'dedupeKey', 'dept', 'due', 'id', 'orderId', 'origin', 'priority', 'status', 'version'].sort());
  });
});

describe('the task queue: pause, revoke and cancel', () => {
  it('pausing or revoking an order cancels its queued tasks with the reason; a person can cancel one task', async () => {
    const h = setup();
    const a = await active(h);
    const b = await active(h);
    const ta = await h.svc.enqueue('sarah', task(a.id));
    const tb = await h.svc.enqueue('sarah', task(b.id));
    const tc = await h.svc.enqueue('sarah', task(b.id));
    await h.svc.pause('eve', a.id, 'Reviewing the inputs');
    expect(byId(h, ta.id)).toMatchObject({ status: 'CANCELLED', note: 'Reviewing the inputs', version: 2 });
    await h.svc.revoke('eve', b.id, 'No longer needed');
    expect(byId(h, tb.id)).toMatchObject({ status: 'CANCELLED', note: 'No longer needed' });
    expect(byId(h, tc.id).status).toBe('CANCELLED');
    expect(count(h, 'autonomy.task.cancelled')).toBe(3);
    const c = await active(h);
    const t = await h.svc.enqueue('sarah', task(c.id));
    expect((await refused(h.svc.cancelTask(null, t.id, 'Not needed any more')))?.status).toBe(403);
    expect((await refused(h.svc.cancelTask('sarah', t.id, 'no')))?.status).toBe(400);
    expect((await refused(h.svc.cancelTask('sarah', 'tsk_missing', 'Not needed any more')))?.status).toBe(404);
    expect(await h.svc.cancelTask('sarah', t.id, 'Not needed any more')).toMatchObject({ status: 'CANCELLED', note: 'Not needed any more' });
    expect((await refused(h.svc.cancelTask('sarah', t.id, 'Not needed any more')))?.status).toBe(409); // already final
    expect(await h.svc.drain()).toEqual([]);
    expect(h.runner.run).not.toHaveBeenCalled();
  });

  it('an order paused behind the queue\'s back does not run, and its task ends cancelled', async () => {
    const h = setup();
    const o = await active(h);
    const t = await h.svc.enqueue('sarah', task(o.id));
    h.store.append('standing_orders', { ...(h.store.rows['standing_orders']!.at(-1) as Rec), status: 'PAUSED', version: 99 });
    expect(await h.svc.drain()).toEqual([]);
    expect(h.runner.run).not.toHaveBeenCalled();
    expect(byId(h, t.id)).toMatchObject({ status: 'CANCELLED', note: expect.stringMatching(/paused/) });
  });
});

describe('the task queue: concurrent changes are never overwritten', () => {
  const noDuplicateVersions = (h: H) => {
    const keys = (h.store.rows['autonomy_tasks'] ?? []).map((r) => `${String(r.id)}@${String(r.version)}`);
    expect(new Set(keys).size).toBe(keys.length);
  };
  /** Runs `fn` the moment the first ledger row with `action` is written: that happens while a drain or stop is awaiting. */
  const onFirst = (h: H, action: string, fn: () => void) => {
    const append = h.store.append;
    let done = false;
    h.store.append = (c, r) => {
      append(c, r);
      if (!done && c === 'ledger' && r.action === action) { done = true; fn(); }
    };
  };

  it('a task cancelled while a drain is awaiting an earlier task is not run, and its CANCELLED row stands', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { maxRunsPerDay: 3 });
    h.clock.t = new Date('2026-11-05T09:30:00Z');
    const stale = await h.svc.enqueue('sarah', task(o.id, { priority: 1, due: '2026-11-05T09:00:00Z' }));
    h.clock.t = new Date(NOW);
    const target = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    let cancel: Promise<unknown> = Promise.resolve();
    onFirst(h, 'autonomy.task.expired', () => { cancel = h.svc.cancelTask('sarah', target.id, 'Not needed any more'); });
    expect(await h.svc.drain()).toEqual([]);
    await cancel;
    expect(byId(h, stale.id).status).toBe('EXPIRED');
    expect(byId(h, target.id)).toMatchObject({ status: 'CANCELLED', note: 'Not needed any more' });
    expect(h.runner.run).not.toHaveBeenCalled();
    expect(count(h, 'autonomy.started')).toBe(0);
    noDuplicateVersions(h);
  });

  it('a pause that is cancelling queued tasks does not overwrite a row a drain wrote in the meantime', async () => {
    const h = setup();
    const o = await active(h);
    const first = await h.svc.enqueue('sarah', task(o.id, { priority: 1 }));
    const second = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    onFirst(h, 'autonomy.task.cancelled', () => {
      const cur = h.store.rows['autonomy_tasks']!.filter((r) => r.id === second.id).at(-1) as unknown as Task;
      h.store.append('autonomy_tasks', { ...cur, status: 'EXPIRED', version: cur.version + 1 } as unknown as Rec);
    });
    await h.svc.pause('eve', o.id, 'Reviewing the inputs');
    expect(byId(h, first.id).status).toBe('CANCELLED');
    expect(byId(h, second.id).status).toBe('EXPIRED');
    expect(count(h, 'autonomy.task.cancelled')).toBe(1);
    noDuplicateVersions(h);
  });

  it('cancelTask refuses with 409 when the task moved on while it waited', async () => {
    const h = setup();
    const o = await active(h);
    const t = await h.svc.enqueue('sarah', task(o.id));
    const a = h.svc.cancelTask('sarah', t.id, 'Not needed any more');
    const b = await refused(h.svc.cancelTask('eve', t.id, 'Cancelled by someone'));
    await a;
    expect(b?.status).toBe(409);
    expect(count(h, 'autonomy.task.cancelled')).toBe(1);
    noDuplicateVersions(h);
  });
});

describe('the task queue: budgets, expiry and recovery', () => {
  it('a task blocked only by the order budget stays queued and runs the next day', async () => {
    const h = setup();
    const o = await active(h);
    const a = await h.svc.enqueue('sarah', task(o.id, { priority: 1 }));
    const b = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    expect(await h.svc.drain()).toHaveLength(1);
    expect([byId(h, a.id).status, byId(h, b.id).status]).toEqual(['SUBMITTED', 'QUEUED']);
    expect(await h.svc.drain()).toEqual([]);
    h.clock.t = new Date('2026-11-13T00:00:01Z');
    expect(await h.svc.drain()).toHaveLength(1);
    expect(byId(h, b.id).status).toBe('SUBMITTED');
  });

  it('runs nothing once the platform cap is used up, and keeps the task queued', async () => {
    const h = setup({ OPS_AUTONOMY: 'on', OPS_AUTONOMY_MAX_RUNS_PER_DAY: '1' });
    const a = await active(h);
    const b = await active(h);
    await h.svc.runNow('sarah', a.id);
    const t = await h.svc.enqueue('sarah', task(b.id));
    expect(await h.svc.drain()).toEqual([]);
    expect(byId(h, t.id).status).toBe('QUEUED');
    expect(h.runner.run).toHaveBeenCalledTimes(1);
  });

  it('a task not run 7 days after its due time expires, with a ledger row', async () => {
    const h = setup();
    const o = await active(h);
    await h.svc.runNow('sarah', o.id);
    const t = await h.svc.enqueue('sarah', task(o.id));
    // The budget is still today's (the service clock does not move), so only the expiry rule can change the task.
    await h.svc.drain(new Date(Date.parse(NOW) + TASK_EXPIRY_MS - 1000));
    expect(byId(h, t.id).status).toBe('QUEUED');
    await h.svc.drain(new Date(Date.parse(NOW) + TASK_EXPIRY_MS + 1000));
    expect(byId(h, t.id)).toMatchObject({ status: 'EXPIRED', version: 2 });
    expect(count(h, 'autonomy.task.expired')).toBe(1);
  });

  it('does not run a task before it is due', async () => {
    const h = setup();
    const o = await active(h);
    const t = await h.svc.enqueue('sarah', task(o.id, { due: '2026-11-12T18:00:00Z' }));
    expect(await h.svc.drain()).toEqual([]);
    h.clock.t = new Date('2026-11-12T18:00:00Z');
    expect(await h.svc.drain()).toHaveLength(1);
    expect(byId(h, t.id).status).toBe('SUBMITTED');
  });

  it('a task left running by a crash is failed with a note, never rerun, and the started count is unchanged', async () => {
    const h = setup();
    const o = await active(h);
    const t = await h.svc.enqueue('sarah', task(o.id));
    h.store.append('autonomy_tasks', { ...(h.store.rows['autonomy_tasks']!.at(-1) as Rec), status: 'RUNNING', version: 2 });
    const before = count(h, 'autonomy.started');
    const restarted = h.make();
    expect(await restarted.drain()).toEqual([]);
    expect(h.runner.run).not.toHaveBeenCalled();
    expect(restarted.tasks()[0]).toMatchObject({ id: t.id, status: 'FAILED', note: expect.stringMatching(/restart/) });
    expect(count(h, 'autonomy.started')).toBe(before);
    expect(await restarted.drain()).toEqual([]);
  });

  it('a failing run fails its task, the next one still runs, and neither is retried; a quarantined run is final', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { maxRunsPerDay: 3 });
    const a = await h.svc.enqueue('sarah', task(o.id, { priority: 1 }));
    const b = await h.svc.enqueue('sarah', task(o.id, { priority: 2 }));
    const c = await h.svc.enqueue('sarah', task(o.id, { priority: 3 }));
    h.runner.run.mockRejectedValueOnce(new Error('provider fell over'));
    h.runner.run.mockResolvedValueOnce({ outcome: 'quarantined', artefactId: 'art_q', checks: [{ id: 'A6', title: 't', pass: false, detail: 'd' }], flags: [] });
    const out = await h.svc.drain();
    expect(out.map((x) => x.outcome)).toEqual(['quarantined', 'submitted']);
    expect(byId(h, a.id)).toMatchObject({ status: 'FAILED', note: expect.stringMatching(/provider fell over/) });
    expect(byId(h, b.id)).toMatchObject({ status: 'QUARANTINED', artefactId: 'art_q' });
    expect(byId(h, c.id).status).toBe('SUBMITTED');
    expect(h.runner.run).toHaveBeenCalledTimes(3);
    expect(await h.svc.drain()).toEqual([]);
    expect(count(h, 'autonomy.failed')).toBe(1);
    expect(h.store.rows['ledger']!.find((e) => e.action === 'autonomy.failed')!.detail).toMatchObject({ taskId: a.id });
  });
});

describe('the task queue: the switch and run now', () => {
  it('with autonomy off a task is stored but nothing drains', async () => {
    const h = setup({});
    const o = await active(h);
    const t = await h.svc.enqueue('sarah', task(o.id));
    expect(await h.svc.drain()).toEqual([]);
    expect(byId(h, t.id).status).toBe('QUEUED');
    expect(h.runner.run).not.toHaveBeenCalled();
  });

  it('run now stays immediate and creates no task', async () => {
    const h = setup();
    const o = await active(h);
    await h.svc.runNow('sarah', o.id);
    expect(h.runner.run).toHaveBeenCalledTimes(1);
    expect(h.store.rows['autonomy_tasks']).toBeUndefined();
    const started = h.store.rows['ledger']!.find((e) => e.action === 'autonomy.started')!;
    expect((started.detail as { taskId?: string }).taskId).toBeUndefined();
  });

  it('records allowTaskInputs in the proposal audit entry', async () => {
    const h = setup();
    await h.svc.propose('sarah', body({ allowTaskInputs: true }));
    expect(h.store.rows['ledger']!.at(-1)).toMatchObject({ action: 'autonomy.order.proposed', detail: { allowTaskInputs: true } });
    await h.svc.propose('sarah', body());
    expect(h.store.rows['ledger']!.at(-1)).toMatchObject({ detail: { allowTaskInputs: false } });
  });
});
