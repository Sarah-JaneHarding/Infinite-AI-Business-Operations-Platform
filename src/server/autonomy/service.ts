import { newId } from '../../core/crypto';
import { failedChecks, type Acceptance } from '../../core/acceptance';
import type { Rec } from '../../core/warehouse';
import { appendLedger, type LedgerStore } from '../ledgerService';
import { CATCH_UP_MS, dueSlot, type EventKind } from './schedule';
import { agentById } from '../../departments';
import { OrderRefused, parseInputs, parseProposal, type StandingOrder } from './orders';
import { MAX_QUEUED_PER_ORDER, TASK_EXPIRY_MS, compareTasks, parseEnqueue, type Task, type TaskOrigin, type TaskStatus } from './tasks';
import type { RunOutcome, RunVia, Runner } from './runner';

export interface AutonomyDeps {
  env: Record<string, string | undefined>;
  store: LedgerStore;
  runner: Runner;
  now?: () => Date;
}

const DAY = 86_400_000;
const RUN_TIMEOUT_MS = 180_000;

/**
 * Autonomy, with every limit in one place. An agent runs without a person only under an ACTIVE standing order, only when
 * the operator has switched autonomy on, within the order's and the platform's daily budgets, one run at a time, and it only
 * ever produces a draft. No code here can approve, countersign or ratify.
 */
export class AutonomyService {
  readonly enabled: boolean;
  readonly maxRunsPerDay: number;
  private chain: Promise<unknown> = Promise.resolve();
  private now: () => Date;

  /** Throws on a bad configuration, so the server stops rather than starting with a different limit than the operator meant. */
  constructor(private deps: AutonomyDeps) {
    this.enabled = deps.env.OPS_AUTONOMY === 'on';
    if (deps.env.OPS_AUTONOMY && !['on', 'off'].includes(deps.env.OPS_AUTONOMY)) throw new Error('OPS_AUTONOMY must be "on" or "off"');
    const max = deps.env.OPS_AUTONOMY_MAX_RUNS_PER_DAY?.trim();
    this.maxRunsPerDay = max ? Number(max) : 20;
    if (!Number.isInteger(this.maxRunsPerDay) || this.maxRunsPerDay < 1) throw new Error('OPS_AUTONOMY_MAX_RUNS_PER_DAY must be a whole number of at least 1');
    this.now = deps.now ?? (() => new Date());
  }

  // ------------------------------------------------------------ storage

  private orders(): StandingOrder[] {
    const m = new Map<string, StandingOrder>();
    for (const r of this.deps.store.list('standing_orders')) m.set(String(r.id), r as unknown as StandingOrder);
    return [...m.values()];
  }
  private order(id: string): StandingOrder {
    const o = this.orders().find((x) => x.id === id);
    if (!o) throw new OrderRefused(404, 'unknown order');
    return o;
  }
  private save(o: StandingOrder, patch: Partial<StandingOrder>): StandingOrder {
    const { statusNote: _drop, ...keep } = o;
    const next: StandingOrder = { ...keep, ...patch, version: o.version + 1, at: this.now().toISOString() };
    this.deps.store.append('standing_orders', next as unknown as Rec);
    return next;
  }
  private async audit(action: string, actor: string, subject: string, detail: Record<string, unknown> = {}) {
    const last = this.deps.store.list('ledger').at(-1);
    await appendLedger(this.deps.store, { orgId: 'infinite-ai', actor, action, subject, detail }, Number(last?.seq ?? 0), null, () => this.now().toISOString());
  }

  /** Ledger entries of one action since a time, newest first. Entries are in time order, so the scan stops early. */
  private since(action: string, from: Date, subject?: string): Rec[] {
    const out: Rec[] = [];
    const ledger = this.deps.store.list('ledger');
    for (let i = ledger.length - 1; i >= 0; i--) {
      const e = ledger[i]!;
      if (new Date(String(e.at)) < from) break;
      if (e.action === action && (!subject || e.subject === subject)) out.push(e);
    }
    return out;
  }
  private startOfDay() {
    const n = this.now();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }
  private runsToday(orderId?: string) {
    return this.since('autonomy.started', this.startOfDay(), orderId).length;
  }

  // ---------------------------------------------------- order lifecycle

  private human(actor: string | null): string {
    if (!actor || actor.startsWith('auto:')) throw new OrderRefused(403, 'Standing orders need a signed-in person (set OPS_USERS).');
    return actor;
  }
  private dryRunFailure(a: Acceptance) {
    return new OrderRefused(422, `The dry run failed: ${failedChecks(a).map((c) => `${c.id} ${c.detail}`).join('; ')}`, a.results);
  }

  async propose(actor: string | null, body: unknown): Promise<StandingOrder> {
    const by = this.human(actor);
    const p = parseProposal(body);
    const dry = await this.deps.runner.dryRun(p);
    if (!dry.passed) throw this.dryRunFailure(dry);
    const o: StandingOrder = { id: newId('ord'), ...p, status: 'PROPOSED', proposedBy: by, version: 1, at: this.now().toISOString() };
    this.deps.store.append('standing_orders', o as unknown as Rec);
    await this.audit('autonomy.order.proposed', by, o.id, { agentId: o.agentId, trigger: o.trigger.kind, maxRunsPerDay: o.maxRunsPerDay, allowTaskInputs: o.allowTaskInputs });
    return o;
  }

  /** A different person activates it, and it is dry-run again first: contracts and facts may have changed since it was proposed. */
  async activate(actor: string | null, id: string, note: string): Promise<StandingOrder> {
    const by = this.human(actor);
    const o = this.order(id);
    if (o.status === 'REVOKED') throw new OrderRefused(409, 'a revoked order cannot be activated');
    if (o.status === 'ACTIVE') throw new OrderRefused(409, 'the order is already active');
    if (o.status === 'PROPOSED' && by === o.proposedBy) throw new OrderRefused(403, 'A different person from the proposer must activate an order.');
    const dry = await this.deps.runner.dryRun(o);
    if (!dry.passed) throw this.dryRunFailure(dry);
    const next = this.save(o, { status: 'ACTIVE', activatedBy: by, statusNote: (note ?? '').trim().slice(0, 300) });
    await this.audit(o.status === 'PAUSED' ? 'autonomy.order.resumed' : 'autonomy.order.activated', by, id, { note: next.statusNote });
    return next;
  }

  async pause(actor: string | null, id: string, reason: string): Promise<StandingOrder> {
    return this.stop(actor, id, reason, 'PAUSED', 'autonomy.order.paused');
  }
  async revoke(actor: string | null, id: string, reason: string): Promise<StandingOrder> {
    return this.stop(actor, id, reason, 'REVOKED', 'autonomy.order.revoked');
  }
  private async stop(actor: string | null, id: string, reason: string, status: 'PAUSED' | 'REVOKED', action: string) {
    const by = this.human(actor);
    const o = this.order(id);
    const r = (reason ?? '').trim();
    if (r.length < 5 || r.length > 300) throw new OrderRefused(400, 'Give a reason, in 5 to 300 characters.');
    if (o.status === 'REVOKED' || (status === 'PAUSED' && o.status !== 'ACTIVE')) throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
    const next = this.save(o, { status, statusNote: r });
    await this.audit(action, by, id, { reason: r });
    for (const t of this.tasks()) if (t.orderId === id && t.status === 'QUEUED') await this.finish(t, 'CANCELLED', r, 'autonomy.task.cancelled', by);
    return next;
  }

  // -------------------------------------------------------------- tasks

  private latestTasks(): Task[] {
    const m = new Map<string, Task>();
    for (const r of this.deps.store.list('autonomy_tasks')) m.set(String(r.id), r as unknown as Task);
    return [...m.values()];
  }
  /** The latest version of each task, most urgent first. */
  tasks(filter: { dept?: string; status?: TaskStatus } = {}): Task[] {
    return this.latestTasks().filter((t) => (!filter.dept || t.dept === filter.dept) && (!filter.status || t.status === filter.status)).sort(compareTasks);
  }
  private saveTask(t: Task, patch: Partial<Task>): Task {
    const { note: _drop, ...keep } = t;
    const next: Task = { ...keep, ...patch, version: t.version + 1, at: this.now().toISOString() };
    if (next.note === undefined) delete next.note;
    this.deps.store.append('autonomy_tasks', next as unknown as Rec);
    return next;
  }
  /** Moves a task to a final state and says so in the ledger. */
  private async finish(t: Task, status: TaskStatus, note: string, action: string, by: string): Promise<Task> {
    const next = this.saveTask(t, { status, note });
    await this.audit(action, by, t.orderId, { taskId: t.id, note });
    return next;
  }
  private queue(o: StandingOrder, req: { priority: 1 | 2 | 3; due: string; inputs?: Record<string, string>; origin: TaskOrigin; dedupeKey?: string }): Task {
    const agent = agentById(o.agentId);
    if (!agent) throw new OrderRefused(409, 'the order names an agent that is no longer registered');
    const t: Task = { id: newId('tsk'), orderId: o.id, agentId: o.agentId, dept: agent.dept, priority: req.priority, due: req.due, ...(req.inputs ? { inputs: req.inputs } : {}), origin: req.origin, ...(req.dedupeKey ? { dedupeKey: req.dedupeKey } : {}), status: 'QUEUED', version: 1, at: this.now().toISOString() };
    this.deps.store.append('autonomy_tasks', t as unknown as Rec);
    return t;
  }

  /** A person queues work under an ACTIVE order. Their inputs, if the order allows any, are checked like the order's own. */
  async enqueue(actor: string | null, body: unknown): Promise<Task> {
    const by = this.human(actor);
    const req = parseEnqueue(body, this.now());
    const o = this.order(req.orderId);
    if (o.status !== 'ACTIVE') throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
    const agent = agentById(o.agentId);
    if (!agent) throw new OrderRefused(409, 'the order names an agent that is no longer registered');
    const given = req.inputs ?? {};
    let own: Record<string, string> | undefined;
    if (Object.keys(given).length) {
      if (!o.allowTaskInputs) throw new OrderRefused(422, 'this order does not accept inputs on a task');
      const parsed = parseInputs(agent, { ...o.inputs, ...given });
      own = Object.fromEntries(Object.keys(given).filter((k) => k in parsed).map((k) => [k, parsed[k]!]));
    }
    if (this.latestTasks().filter((t) => t.orderId === o.id && t.status === 'QUEUED').length >= MAX_QUEUED_PER_ORDER) throw new OrderRefused(429, `This order already has ${MAX_QUEUED_PER_ORDER} queued tasks.`);
    const t = this.queue(o, { priority: req.priority, due: req.due, ...(own && Object.keys(own).length ? { inputs: own } : {}), origin: { kind: 'person', by } });
    await this.audit('autonomy.task.queued', by, o.id, { taskId: t.id, priority: t.priority, due: t.due, origin: 'person' });
    return t;
  }

  async cancelTask(actor: string | null, id: string, reason: string): Promise<Task> {
    const by = this.human(actor);
    const t = this.latestTasks().find((x) => x.id === id);
    if (!t) throw new OrderRefused(404, 'unknown task');
    const r = (reason ?? '').trim();
    if (r.length < 5 || r.length > 300) throw new OrderRefused(400, 'Give a reason, in 5 to 300 characters.');
    if (t.status !== 'QUEUED') throw new OrderRefused(409, `the task is ${t.status.toLowerCase()}`);
    return this.finish(t, 'CANCELLED', r, 'autonomy.task.cancelled', by);
  }

  /** A trigger asks for a task. Nothing from the trigger but its kind, slot or event name is kept. Returns null when one is already there. */
  private async enqueueFromTrigger(o: StandingOrder, origin: Exclude<TaskOrigin, { kind: 'person' }>): Promise<Task | null> {
    const dedupeKey = origin.kind === 'schedule' ? `schedule:${origin.slot}` : `event:${origin.event}`;
    const mine = this.latestTasks().filter((t) => t.orderId === o.id && t.dedupeKey === dedupeKey);
    if (origin.kind === 'schedule' ? mine.length : mine.some((t) => t.status === 'QUEUED')) return null;
    const t = this.queue(o, { priority: 2, due: this.now().toISOString(), origin, dedupeKey });
    await this.audit('autonomy.task.queued', `auto:${o.id}`, o.id, { taskId: t.id, priority: t.priority, due: t.due, origin: origin.kind });
    return t;
  }

  private budgetRefusal(o: StandingOrder): OrderRefused | null {
    if (this.runsToday(o.id) >= o.maxRunsPerDay) return new OrderRefused(429, `This order has used its ${o.maxRunsPerDay} run(s) for today.`);
    if (this.runsToday() >= this.maxRunsPerDay) return new OrderRefused(429, `The platform's autonomous runs for today (${this.maxRunsPerDay}) are used up.`);
    return null;
  }

  /**
   * Runs ready tasks one at a time, most urgent first. Anything left RUNNING was cut off by a restart: it is failed, never rerun.
   * A task held back only by a budget stays queued; failed and quarantined runs are final.
   */
  drain(now: Date = this.now()): Promise<RunOutcome[]> {
    if (!this.enabled) return Promise.resolve([]);
    return this.exclusive(async () => {
      for (const t of this.latestTasks().filter((x) => x.status === 'RUNNING')) await this.finish(t, 'FAILED', 'interrupted by a restart; not retried', 'autonomy.failed', `auto:${t.orderId}`);
      const out: RunOutcome[] = [];
      for (;;) {
        let next: Task | undefined;
        for (const t of this.tasks({ status: 'QUEUED' })) {
          const o = this.orders().find((x) => x.id === t.orderId);
          if (!o || o.status !== 'ACTIVE') {
            await this.finish(t, 'CANCELLED', `the order is ${(o?.status ?? 'missing').toLowerCase()}`, 'autonomy.task.cancelled', `auto:${t.orderId}`);
            continue;
          }
          if (now.getTime() - Date.parse(t.due) > TASK_EXPIRY_MS) {
            await this.finish(t, 'EXPIRED', 'not run within 7 days of its due time', 'autonomy.task.expired', `auto:${o.id}`);
            continue;
          }
          if (Date.parse(t.due) > now.getTime() || this.budgetRefusal(o)) continue;
          next = t;
          break;
        }
        if (!next) return out;
        const o = this.order(next.orderId);
        const running = this.saveTask(next, { status: 'RUNNING' });
        try {
          const outcome = await this.runLocked(o, this.viaFor(running.origin), this.byFor(running.origin), running);
          out.push(outcome);
          this.saveTask(running, { status: outcome.outcome === 'submitted' ? 'SUBMITTED' : 'QUARANTINED', artefactId: outcome.artefactId });
        } catch (e) {
          const msg = e instanceof OrderRefused ? e.message : (e as Error).message.slice(0, 200);
          this.saveTask(running, { status: 'FAILED', note: `the run failed: ${msg}` });
        }
      }
    });
  }
  private byFor(origin: TaskOrigin): string {
    return origin.kind === 'person' ? origin.by : origin.kind === 'event' ? 'webhook' : 'schedule';
  }
  private viaFor(origin: TaskOrigin): RunVia {
    return origin.kind === 'person' ? { kind: 'request', by: origin.by } : origin;
  }

  // --------------------------------------------------------------- runs

  /** One run at a time, and the budget check and the "started" record are one step, so two triggers cannot both squeeze under a limit. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private startRun(orderId: string, via: RunVia, by: string): Promise<RunOutcome> {
    return this.exclusive(() => {
      if (!this.enabled) throw new OrderRefused(503, 'Autonomy is switched off. The operator enables it with OPS_AUTONOMY=on.');
      const o = this.order(orderId);
      if (o.status !== 'ACTIVE') throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
      const refusal = this.budgetRefusal(o);
      if (refusal) throw refusal;
      return this.runLocked(o, via, by);
    });
  }

  /** Must be called inside `exclusive` with the budgets already checked. A task's own inputs go to the runner; the stored order is not touched. */
  private async runLocked(o: StandingOrder, via: RunVia, by: string, task?: Task): Promise<RunOutcome> {
    const actor = `auto:${o.id}`;
    const extra = task ? { taskId: task.id } : {};
    // Written before the agent runs and counted from the ledger, so a crash or restart cannot hand out extra runs.
    await this.audit('autonomy.started', actor, o.id, { via, by, ...extra });
    let outcome: RunOutcome;
    try {
      outcome = await Promise.race([
        this.deps.runner.run(task?.inputs ? { ...o, inputs: { ...o.inputs, ...task.inputs } } : o, via),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('the run took too long')), RUN_TIMEOUT_MS).unref()),
      ]);
    } catch (e) {
      await this.audit('autonomy.failed', actor, o.id, { error: (e as Error).message.slice(0, 200), ...extra }).catch(() => undefined);
      throw e;
    }
    await this.audit(outcome.outcome === 'submitted' ? 'autonomy.submitted' : 'autonomy.quarantined', actor, o.id, { artefactId: outcome.artefactId, failed: failedChecks({ passed: false, results: outcome.checks }).map((c) => c.id), ...extra });
    return outcome;
  }

  /** By request: a person asks an active order to run now. It still counts against the budgets. */
  async runNow(actor: string | null, id: string): Promise<RunOutcome> {
    const by = this.human(actor);
    return this.startRun(id, { kind: 'request', by }, by);
  }

  /** Called when a signed webhook event arrives. Only active orders listening for it queue a task, no more than once per cooldown. */
  async onEvent(kind: string): Promise<RunOutcome[]> {
    if (!this.enabled) return [];
    for (const o of this.orders()) {
      if (o.status !== 'ACTIVE' || o.trigger.kind !== 'event' || !o.trigger.events.includes(kind as EventKind)) continue;
      const cool = new Date(this.now().getTime() - o.trigger.cooldownMinutes * 60_000);
      if (this.since('autonomy.started', cool, o.id).length) continue; // inside the cooldown: silent, so an event storm writes nothing
      await this.enqueueFromTrigger(o, { kind: 'event', event: kind }).catch((e) => this.triggerFailed(o, e));
    }
    return this.drain();
  }

  /** Called every minute. Queues each scheduled order whose slot is due and has not been queued or run, then drains. */
  async tick(now: Date = this.now()): Promise<RunOutcome[]> {
    if (!this.enabled) return [];
    for (const o of this.orders()) {
      if (o.status !== 'ACTIVE' || o.trigger.kind !== 'schedule') continue;
      const ran = new Set(this.since('autonomy.started', new Date(now.getTime() - 9 * DAY - CATCH_UP_MS), o.id).map((e) => String((e.detail as { via?: { slot?: string } }).via?.slot ?? '')));
      const slot = dueSlot(o.trigger, now, ran);
      if (!slot) continue;
      await this.enqueueFromTrigger(o, { kind: 'schedule', slot }).catch((e) => this.triggerFailed(o, e));
    }
    return this.drain(now);
  }
  private async triggerFailed(o: StandingOrder, e: unknown) {
    if (!(e instanceof OrderRefused)) await this.audit('autonomy.failed', `auto:${o.id}`, o.id, { error: (e as Error).message.slice(0, 200) }).catch(() => undefined);
  }
  // ------------------------------------------------------------- status

  private queueSummary() {
    const byDept: Record<string, number> = {};
    const queued = this.tasks({ status: 'QUEUED' });
    for (const t of queued) byDept[t.dept] = (byDept[t.dept] ?? 0) + 1;
    return { queued: queued.length, byDept };
  }

  status() {
    const day = this.startOfDay();
    const orders = this.orders().map((o) => ({ ...o, runsToday: this.runsToday(o.id), lastRunAt: this.since('autonomy.started', new Date(this.now().getTime() - 30 * DAY), o.id)[0]?.at ?? null }));
    const recent: { at: string; action: string; orderId: string; detail: Record<string, unknown> }[] = [];
    const ledger = this.deps.store.list('ledger');
    for (let i = ledger.length - 1; i >= 0 && recent.length < 40; i--) {
      const e = ledger[i]!;
      if (/^autonomy\.(submitted|quarantined|failed)$/.test(String(e.action))) recent.push({ at: String(e.at), action: String(e.action), orderId: String(e.subject), detail: e.detail as Record<string, unknown> });
    }
    return { enabled: this.enabled, maxRunsPerDay: this.maxRunsPerDay, runsToday: this.runsToday(), since: day.toISOString(), orders, recent, queue: this.queueSummary() };
  }
}
