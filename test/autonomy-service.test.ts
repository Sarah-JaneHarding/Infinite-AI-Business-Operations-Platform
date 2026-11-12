import { describe, expect, it, vi } from 'vitest';
import { AutonomyService } from '../src/server/autonomy/service';
import { OrderRefused } from '../src/server/autonomy/orders';
import type { Runner, RunOutcome } from '../src/server/autonomy/runner';
import type { LedgerStore } from '../src/server/ledgerService';
import type { Rec } from '../src/core/warehouse';
import { AGENTS } from '../src/departments';

const agent = AGENTS.find((a) => a.inputs.some((i) => i.required && (i.kind === 'text' || i.kind === 'longtext')))!;
const inputs = Object.fromEntries(agent.inputs.filter((i) => i.required).map((i) => [i.key, i.kind === 'number' ? '5' : i.kind === 'select' ? i.options![0]! : 'Pilot school onboarding process']));
const body = (o: Record<string, unknown> = {}) => ({ name: 'Weekly onboarding review', agentId: agent.id, trigger: { kind: 'request' }, inputs, ...o });

function setup(env: Record<string, string> = { OPS_AUTONOMY: 'on' }, rows: Record<string, Rec[]> = {}) {
  const store: LedgerStore & { rows: Record<string, Rec[]> } = { rows, list: (c) => rows[c] ?? [], append: (c, r) => void (rows[c] ??= []).push(r) };
  const clock = { t: new Date('2026-11-12T10:00:00Z') };
  const ok: RunOutcome = { outcome: 'submitted', artefactId: 'art_1', checks: [], flags: [] };
  const runner = { run: vi.fn(async () => ok), dryRun: vi.fn(async () => ({ passed: true, results: [] })) } as unknown as Runner & { run: ReturnType<typeof vi.fn>; dryRun: ReturnType<typeof vi.fn> };
  const make = (e = env) => new AutonomyService({ env: e, store, runner, now: () => clock.t });
  return { svc: make(), make, store, runner, clock };
}
const refused = async (p: Promise<unknown>) => (await p.then(() => null, (e: unknown) => e)) as OrderRefused | null;
const actions = (s: { rows: Record<string, Rec[]> }) => (s.rows['ledger'] ?? []).map((e) => String(e.action));
/** A proposed, activated order (proposed by sarah, activated by dan). */
async function active(h: ReturnType<typeof setup>, trigger: unknown = { kind: 'request' }, extra: Record<string, unknown> = {}) {
  const o = await h.svc.propose('sarah', body({ trigger, ...extra }));
  return h.svc.activate('dan', o.id, 'looks right');
}

describe('standing orders: proposing and activating', () => {
  it('needs a signed-in person, tries the order in a dry run first, and records the proposal', async () => {
    const h = setup();
    expect((await refused(h.svc.propose(null, body())))?.status).toBe(403);
    expect((await refused(h.svc.propose('auto:ord_x', body())))?.status).toBe(403);
    const o = await h.svc.propose('sarah', body());
    expect(o).toMatchObject({ status: 'PROPOSED', proposedBy: 'sarah', version: 1, maxRunsPerDay: 1 });
    expect(h.runner.dryRun).toHaveBeenCalledTimes(1);
    expect(actions(h.store)).toEqual(['autonomy.order.proposed']);
  });

  it('refuses a bad proposal without a dry run, and a failed dry run without storing anything', async () => {
    const h = setup();
    expect((await refused(h.svc.propose('sarah', body({ name: 'x' }))))?.status).toBe(400);
    expect(h.runner.dryRun).not.toHaveBeenCalled();
    h.runner.dryRun.mockResolvedValueOnce({ passed: false, results: [{ id: 'A4', title: 'No personal data', pass: false, detail: 'personal data present (email)' }] });
    const e = await refused(h.svc.propose('sarah', body()));
    expect([e?.status, e?.message]).toEqual([422, expect.stringMatching(/dry run failed: A4/)]);
    expect(e?.checks).toHaveLength(1);
    expect(h.store.rows['standing_orders']).toBeUndefined();
  });

  it('a different person activates it, after a second dry run; the proposer cannot, and a failed dry run blocks it', async () => {
    const h = setup();
    const o = await h.svc.propose('sarah', body());
    expect((await refused(h.svc.activate('sarah', o.id, '')))?.status).toBe(403);
    h.runner.dryRun.mockResolvedValueOnce({ passed: false, results: [{ id: 'A2', title: 'x', pass: false, detail: 'the title is missing' }] });
    expect((await refused(h.svc.activate('dan', o.id, '')))?.message).toMatch(/dry run failed: A2/);
    const on = await h.svc.activate('dan', o.id, 'checked the inputs');
    expect(on).toMatchObject({ status: 'ACTIVE', activatedBy: 'dan', statusNote: 'checked the inputs', version: 2 });
    expect(h.runner.dryRun).toHaveBeenCalledTimes(3); // propose, the failed activation, the real one
    expect((await refused(h.svc.activate('dan', o.id, '')))?.status).toBe(409); // already active
    expect((await refused(h.svc.activate(null, o.id, '')))?.status).toBe(403);
    expect((await refused(h.svc.activate('dan', 'ord_missing', '')))?.status).toBe(404);
    expect(actions(h.store)).toEqual(['autonomy.order.proposed', 'autonomy.order.activated']);
  });

  it('pause, resume and revoke need a reason; pausing stops runs, revoking is final, and anyone signed in can stop an order', async () => {
    const h = setup();
    const o = await active(h);
    expect((await refused(h.svc.pause('sarah', o.id, 'no')))?.status).toBe(400);
    await h.svc.pause('eve', o.id, 'Reviewing the inputs');
    expect((await refused(h.svc.runNow('sarah', o.id)))?.message).toMatch(/paused/);
    expect((await refused(h.svc.pause('eve', o.id, 'again please')))?.status).toBe(409); // not active
    expect((await h.svc.activate('sarah', o.id, 'back on')).status).toBe('ACTIVE'); // resume: any person, dry-run again
    await h.svc.revoke('eve', o.id, 'No longer needed');
    expect((await refused(h.svc.activate('dan', o.id, '')))?.status).toBe(409);
    expect((await refused(h.svc.revoke('eve', o.id, 'twice over')))?.status).toBe(409);
    expect(actions(h.store)).toEqual(['autonomy.order.proposed', 'autonomy.order.activated', 'autonomy.order.paused', 'autonomy.order.resumed', 'autonomy.order.revoked']);
  });

  it('a proposed order can be withdrawn, but not paused', async () => {
    const h = setup();
    const o = await h.svc.propose('sarah', body());
    expect((await refused(h.svc.pause('sarah', o.id, 'not yet please')))?.status).toBe(409);
    expect((await h.svc.revoke('sarah', o.id, 'Withdrawn by me')).status).toBe('REVOKED');
  });
});

describe('running: the switch, the budgets and the audit', () => {
  it('refuses to run when the operator has not switched autonomy on, and never calls the runner', async () => {
    const h = setup({});
    const o = await active(h);
    const e = await refused(h.svc.runNow('sarah', o.id));
    expect([e?.status, e?.message]).toEqual([503, expect.stringMatching(/switched off/)]);
    expect(h.runner.run).not.toHaveBeenCalled();
    expect(await h.svc.tick(h.clock.t)).toEqual([]);
    expect(await h.svc.onEvent('push')).toEqual([]);
  });

  it('writes the "started" entry before the agent runs, then records the outcome (submitted, quarantined)', async () => {
    const h = setup();
    const o = await active(h);
    let seenDuringRun: string[] = [];
    h.runner.run.mockImplementationOnce(async () => { seenDuringRun = actions(h.store); return { outcome: 'submitted', artefactId: 'art_1', checks: [], flags: [] }; });
    await h.svc.runNow('sarah', o.id);
    expect(seenDuringRun.at(-1)).toBe('autonomy.started');
    expect(actions(h.store).at(-1)).toBe('autonomy.submitted');
    h.clock.t = new Date('2026-11-13T10:00:00Z');
    h.runner.run.mockResolvedValueOnce({ outcome: 'quarantined', artefactId: 'art_2', checks: [{ id: 'A6', title: 't', pass: false, detail: 'd' }], flags: [] });
    expect((await h.svc.runNow('sarah', o.id)).outcome).toBe('quarantined');
    expect(h.store.rows['ledger']!.at(-1)).toMatchObject({ action: 'autonomy.quarantined', detail: { artefactId: 'art_2', failed: ['A6'] } });
    const started = h.store.rows['ledger']!.find((e) => e.action === 'autonomy.started')!;
    expect(started).toMatchObject({ actor: `auto:${o.id}`, subject: o.id, detail: { via: { kind: 'request', by: 'sarah' } } });
  });

  it('records a failure and rethrows it, and the failed run still counts against the budget', async () => {
    const h = setup();
    const o = await active(h);
    h.runner.run.mockRejectedValueOnce(new Error('provider fell over'));
    await expect(h.svc.runNow('sarah', o.id)).rejects.toThrow('provider fell over');
    expect(actions(h.store)).toEqual(expect.arrayContaining(['autonomy.started', 'autonomy.failed']));
    expect((await refused(h.svc.runNow('sarah', o.id)))?.status).toBe(429);
  });

  it('enforces the per-order and the platform-wide daily budget, counted from the ledger so a restart does not reset them', async () => {
    const h = setup({ OPS_AUTONOMY: 'on', OPS_AUTONOMY_MAX_RUNS_PER_DAY: '3' });
    const a = await active(h, { kind: 'request' }, { maxRunsPerDay: 2 });
    await h.svc.runNow('sarah', a.id);
    await h.svc.runNow('sarah', a.id);
    expect((await refused(h.svc.runNow('sarah', a.id)))?.message).toMatch(/used its 2 run/);
    const restarted = h.make({ OPS_AUTONOMY: 'on', OPS_AUTONOMY_MAX_RUNS_PER_DAY: '3' });
    expect((await refused(restarted.runNow('sarah', a.id)))?.status).toBe(429); // same ledger, same count
    const b = await restarted.activate('dan', (await restarted.propose('sarah', body({ name: 'Second order' }))).id, 'ok');
    await restarted.runNow('sarah', b.id); // 3rd run of the day on the platform
    const c = await restarted.activate('dan', (await restarted.propose('sarah', body({ name: 'Third order' }))).id, 'ok');
    expect((await refused(restarted.runNow('sarah', c.id)))?.message).toMatch(/platform's autonomous runs for today \(3\)/);
    h.clock.t = new Date('2026-11-13T00:00:01Z');
    await expect(restarted.runNow('sarah', a.id)).resolves.toBeDefined(); // a new UTC day
  });

  it('runs one at a time: two triggers at once cannot both squeeze under a limit', async () => {
    const h = setup();
    const o = await active(h, { kind: 'request' }, { maxRunsPerDay: 1 });
    let running = 0; let overlap = false;
    h.runner.run.mockImplementation(async () => { running++; overlap ||= running > 1; await new Promise((r) => setTimeout(r, 15)); running--; return { outcome: 'submitted', artefactId: 'a', checks: [], flags: [] }; });
    const r = await Promise.all([refused(h.svc.runNow('sarah', o.id)), refused(h.svc.runNow('dan', o.id)), refused(h.svc.runNow('eve', o.id))]);
    expect(overlap).toBe(false);
    expect(r.filter((x) => x === null)).toHaveLength(1); // exactly one ran
    expect(r.filter((x) => x?.status === 429)).toHaveLength(2);
    expect(h.runner.run).toHaveBeenCalledTimes(1);
  });

  it('only an active order can run, and a person (not an autonomous actor) must ask', async () => {
    const h = setup();
    const o = await h.svc.propose('sarah', body());
    expect((await refused(h.svc.runNow('sarah', o.id)))?.message).toMatch(/proposed/);
    expect((await refused(h.svc.runNow(null, o.id)))?.status).toBe(403);
    expect((await refused(h.svc.runNow('auto:ord_x', o.id)))?.status).toBe(403);
    expect(h.runner.run).not.toHaveBeenCalled();
  });
});

describe('triggers', () => {
  it('an event starts only active orders listening for it, once per cooldown, so an event storm runs once', async () => {
    const h = setup();
    // A budget of 5 so that it is the cooldown, not the budget, that stops a storm.
    const push = await active(h, { kind: 'event', events: ['push'], cooldownMinutes: 60 }, { maxRunsPerDay: 5, name: 'Push watcher' });
    await active(h, { kind: 'event', events: ['issues'] }, { name: 'Issue watcher' });
    await active(h, { kind: 'request' }, { name: 'By request only' });
    const paused = await active(h, { kind: 'event', events: ['push'] }, { name: 'Paused push watcher' });
    await h.svc.pause('eve', paused.id, 'On hold for now');
    const first = await h.svc.onEvent('push');
    expect(first).toHaveLength(1);
    expect(h.runner.run).toHaveBeenCalledWith(expect.objectContaining({ id: push.id }), { kind: 'event', event: 'push' });
    for (let i = 0; i < 20; i++) await h.svc.onEvent('push'); // a storm of pushes
    expect(h.runner.run).toHaveBeenCalledTimes(1);
    expect(actions(h.store).filter((a) => a === 'autonomy.started')).toHaveLength(1); // and the storm wrote nothing
    h.clock.t = new Date(h.clock.t.getTime() + 61 * 60_000); // past the cooldown, same day: it may run again
    expect(await h.svc.onEvent('push')).toHaveLength(1);
    expect(h.runner.run).toHaveBeenCalledTimes(2);
    expect(await h.svc.onEvent('workflow_run')).toEqual([]); // nobody is listening
  });

  it('a scheduled order runs once per slot, survives a restart, skips a slot that is too old, and ignores the others', async () => {
    const h = setup();
    const daily = await active(h, { kind: 'schedule', every: 'daily', hourUtc: 6 });
    await active(h, { kind: 'request' }, { name: 'By request only' });
    h.clock.t = new Date('2026-11-12T05:00:00Z');
    expect(await h.svc.tick(h.clock.t)).toEqual([]); // before the slot
    h.clock.t = new Date('2026-11-12T06:01:00Z');
    expect(await h.svc.tick(h.clock.t)).toHaveLength(1);
    expect(h.runner.run).toHaveBeenLastCalledWith(expect.objectContaining({ id: daily.id }), { kind: 'schedule', slot: '2026-11-12T06:00:00.000Z' });
    h.clock.t = new Date('2026-11-12T06:05:00Z');
    expect(await h.svc.tick(h.clock.t)).toEqual([]); // already ran this slot
    expect(await h.make().tick(h.clock.t)).toEqual([]); // and a restarted server knows it from the ledger
    // the server was down through the next slot and came back far too late: skipped, not run late
    h.clock.t = new Date('2026-11-13T12:00:00Z');
    expect(await h.svc.tick(h.clock.t)).toEqual([]);
    h.clock.t = new Date('2026-11-14T06:30:00Z');
    expect(await h.svc.tick(h.clock.t)).toHaveLength(1); // the next slot is normal again
    expect(h.runner.run).toHaveBeenCalledTimes(2);
  });

  it('a paused or revoked order is never scheduled', async () => {
    const h = setup();
    const o = await active(h, { kind: 'schedule', every: 'daily', hourUtc: 6 });
    await h.svc.pause('eve', o.id, 'Holiday period');
    h.clock.t = new Date('2026-11-12T06:01:00Z');
    expect(await h.svc.tick(h.clock.t)).toEqual([]);
  });

  it('a failure while scheduled is audited and does not stop the other orders', async () => {
    const h = setup();
    await active(h, { kind: 'schedule', every: 'daily', hourUtc: 6 }, { name: 'First scheduled' });
    await active(h, { kind: 'schedule', every: 'daily', hourUtc: 6 }, { name: 'Second scheduled' });
    h.runner.run.mockRejectedValueOnce(new Error('boom'));
    h.clock.t = new Date('2026-11-12T06:01:00Z');
    const out = await h.svc.tick(h.clock.t);
    expect(out).toHaveLength(1); // the second still ran
    expect(actions(h.store)).toContain('autonomy.failed');
  });
});

describe('status and configuration', () => {
  it('reports the switch, the budgets, each order\'s runs today and last run, and recent outcomes', async () => {
    const h = setup();
    const o = await active(h);
    await h.svc.runNow('sarah', o.id);
    const s = h.svc.status();
    expect(s).toMatchObject({ enabled: true, maxRunsPerDay: 20, runsToday: 1 });
    expect(s.orders[0]).toMatchObject({ id: o.id, status: 'ACTIVE', runsToday: 1 });
    expect(s.orders[0]!.lastRunAt).toBeTruthy();
    expect(s.recent[0]).toMatchObject({ action: 'autonomy.submitted', orderId: o.id });
    expect(setup({}).svc.status().enabled).toBe(false);
  });

  it('refuses a bad switch or budget at construction, so the server does not start with a limit the operator did not mean', () => {
    const h = setup();
    expect(() => h.make({ OPS_AUTONOMY: 'maybe' })).toThrow(/OPS_AUTONOMY must be/);
    for (const v of ['0', '-1', 'many', '1.5']) expect(() => h.make({ OPS_AUTONOMY: 'on', OPS_AUTONOMY_MAX_RUNS_PER_DAY: v })).toThrow(/MAX_RUNS_PER_DAY/);
    expect(h.make({ OPS_AUTONOMY: 'off' }).enabled).toBe(false);
  });
});
