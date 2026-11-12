import { newId } from '../../core/crypto';
import { failedChecks, type Acceptance } from '../../core/acceptance';
import type { Rec } from '../../core/warehouse';
import { appendLedger, type LedgerStore } from '../ledgerService';
import { CATCH_UP_MS, dueSlot, type EventKind } from './schedule';
import { OrderRefused, parseProposal, type StandingOrder } from './orders';
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
    await this.audit('autonomy.order.proposed', by, o.id, { agentId: o.agentId, trigger: o.trigger.kind, maxRunsPerDay: o.maxRunsPerDay });
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
    return next;
  }

  // --------------------------------------------------------------- runs

  /** One run at a time, and the budget check and the "started" record are one step, so two triggers cannot both squeeze under a limit. */
  private exclusive<T>(fn: () => Promise<T>): Promise<T> {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => undefined);
    return run;
  }

  private async startRun(orderId: string, via: RunVia, by: string): Promise<RunOutcome> {
    return this.exclusive(async () => {
      if (!this.enabled) throw new OrderRefused(503, 'Autonomy is switched off. The operator enables it with OPS_AUTONOMY=on.');
      const o = this.order(orderId);
      if (o.status !== 'ACTIVE') throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
      const perOrder = this.runsToday(o.id);
      if (perOrder >= o.maxRunsPerDay) throw new OrderRefused(429, `This order has used its ${o.maxRunsPerDay} run(s) for today.`);
      if (this.runsToday() >= this.maxRunsPerDay) throw new OrderRefused(429, `The platform's autonomous runs for today (${this.maxRunsPerDay}) are used up.`);
      const actor = `auto:${o.id}`;
      // Written before the agent runs and counted from the ledger, so a crash or restart cannot hand out extra runs.
      await this.audit('autonomy.started', actor, o.id, { via, by });
      let outcome: RunOutcome;
      try {
        outcome = await Promise.race([
          this.deps.runner.run(o, via),
          new Promise<never>((_, rej) => setTimeout(() => rej(new Error('the run took too long')), RUN_TIMEOUT_MS).unref()),
        ]);
      } catch (e) {
        await this.audit('autonomy.failed', actor, o.id, { error: (e as Error).message.slice(0, 200) }).catch(() => undefined);
        throw e;
      }
      await this.audit(outcome.outcome === 'submitted' ? 'autonomy.submitted' : 'autonomy.quarantined', actor, o.id, { artefactId: outcome.artefactId, failed: failedChecks({ passed: false, results: outcome.checks }).map((c) => c.id) });
      return outcome;
    });
  }

  /** By request: a person asks an active order to run now. It still counts against the budgets. */
  async runNow(actor: string | null, id: string): Promise<RunOutcome> {
    const by = this.human(actor);
    return this.startRun(id, { kind: 'request', by }, by);
  }

  /** Called when a signed webhook event arrives. Only active orders listening for it run, no more than once per cooldown. */
  async onEvent(kind: string): Promise<RunOutcome[]> {
    if (!this.enabled) return [];
    const out: RunOutcome[] = [];
    for (const o of this.orders()) {
      if (o.status !== 'ACTIVE' || o.trigger.kind !== 'event' || !o.trigger.events.includes(kind as EventKind)) continue;
      const cool = new Date(this.now().getTime() - o.trigger.cooldownMinutes * 60_000);
      if (this.since('autonomy.started', cool, o.id).length) continue; // inside the cooldown: silent, so an event storm writes nothing
      try {
        out.push(await this.startRun(o.id, { kind: 'event', event: kind }, 'webhook'));
      } catch (e) {
        if (!(e instanceof OrderRefused)) await this.audit('autonomy.failed', `auto:${o.id}`, o.id, { error: (e as Error).message.slice(0, 200) }).catch(() => undefined);
      }
    }
    return out;
  }

  /** Called every minute. Runs each scheduled order whose slot is due and has not run, one after another. */
  async tick(now: Date = this.now()): Promise<RunOutcome[]> {
    if (!this.enabled) return [];
    const out: RunOutcome[] = [];
    for (const o of this.orders()) {
      if (o.status !== 'ACTIVE' || o.trigger.kind !== 'schedule') continue;
      const ran = new Set(this.since('autonomy.started', new Date(now.getTime() - 9 * DAY - CATCH_UP_MS), o.id).map((e) => String((e.detail as { via?: { slot?: string } }).via?.slot ?? '')));
      const slot = dueSlot(o.trigger, now, ran);
      if (!slot) continue;
      try {
        out.push(await this.startRun(o.id, { kind: 'schedule', slot }, 'schedule'));
      } catch (e) {
        if (!(e instanceof OrderRefused)) await this.audit('autonomy.failed', `auto:${o.id}`, o.id, { error: (e as Error).message.slice(0, 200) }).catch(() => undefined);
      }
    }
    return out;
  }

  // ------------------------------------------------------------- status

  status() {
    const day = this.startOfDay();
    const orders = this.orders().map((o) => ({ ...o, runsToday: this.runsToday(o.id), lastRunAt: this.since('autonomy.started', new Date(this.now().getTime() - 30 * DAY), o.id)[0]?.at ?? null }));
    const recent: { at: string; action: string; orderId: string; detail: Record<string, unknown> }[] = [];
    const ledger = this.deps.store.list('ledger');
    for (let i = ledger.length - 1; i >= 0 && recent.length < 40; i--) {
      const e = ledger[i]!;
      if (/^autonomy\.(submitted|quarantined|failed)$/.test(String(e.action))) recent.push({ at: String(e.at), action: String(e.action), orderId: String(e.subject), detail: e.detail as Record<string, unknown> });
    }
    return { enabled: this.enabled, maxRunsPerDay: this.maxRunsPerDay, runsToday: this.runsToday(), since: day.toISOString(), orders, recent };
  }
}
