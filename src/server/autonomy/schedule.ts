/** When a standing order is due. Pure functions of the clock, so they can be tested without waiting. All times are UTC. */
export const EVENT_KINDS = ['push', 'pull_request', 'workflow_run', 'issues'] as const;
export type EventKind = (typeof EVENT_KINDS)[number];

export type Trigger =
  | { kind: 'schedule'; every: 'daily'; hourUtc: number }
  | { kind: 'schedule'; every: 'weekly'; weekday: number; hourUtc: number }
  | { kind: 'event'; events: EventKind[]; cooldownMinutes: number }
  | { kind: 'request' };

/** If the server was down at the slot, it still runs when it comes back within this window; after that the slot is skipped. */
export const CATCH_UP_MS = 3 * 3_600_000;

export class TriggerInvalid extends Error {}

const int = (v: unknown, lo: number, hi: number, what: string) => {
  if (typeof v !== 'number' || !Number.isInteger(v) || v < lo || v > hi) throw new TriggerInvalid(`${what} must be a whole number from ${lo} to ${hi}`);
  return v;
};

export function parseTrigger(v: unknown): Trigger {
  if (typeof v !== 'object' || v === null) throw new TriggerInvalid('a trigger is required');
  const t = v as Record<string, unknown>;
  if (t.kind === 'request') return { kind: 'request' };
  if (t.kind === 'schedule') {
    if (t.every === 'daily') return { kind: 'schedule', every: 'daily', hourUtc: int(t.hourUtc, 0, 23, 'hour (UTC)') };
    if (t.every === 'weekly') return { kind: 'schedule', every: 'weekly', weekday: int(t.weekday, 0, 6, 'weekday (0 is Sunday)'), hourUtc: int(t.hourUtc, 0, 23, 'hour (UTC)') };
    throw new TriggerInvalid('a schedule is daily or weekly');
  }
  if (t.kind === 'event') {
    const events = Array.isArray(t.events) ? [...new Set(t.events)] : [];
    if (!events.length || events.some((e) => !EVENT_KINDS.includes(e as EventKind))) throw new TriggerInvalid(`events must be a non-empty list from: ${EVENT_KINDS.join(', ')}`);
    return { kind: 'event', events: events as EventKind[], cooldownMinutes: int(t.cooldownMinutes ?? 60, 15, 1440, 'cooldown (minutes)') };
  }
  throw new TriggerInvalid('a trigger is a schedule, an event or a request');
}

/** The most recent slot start at or before `now`. */
export function latestSlot(t: Extract<Trigger, { kind: 'schedule' }>, now: Date): Date {
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), t.hourUtc));
  if (t.every === 'daily') return today > now ? new Date(today.getTime() - 86_400_000) : today;
  const back = (today.getUTCDay() - t.weekday + 7) % 7;
  const slot = new Date(today.getTime() - back * 86_400_000);
  return slot > now ? new Date(slot.getTime() - 7 * 86_400_000) : slot;
}

/** The slot key to run now, or null: nothing is due, it already ran, or the slot is too old to catch up on. */
export function dueSlot(t: Extract<Trigger, { kind: 'schedule' }>, now: Date, alreadyRan: ReadonlySet<string>): string | null {
  const slot = latestSlot(t, now);
  const key = slot.toISOString();
  if (alreadyRan.has(key)) return null;
  return now.getTime() - slot.getTime() <= CATCH_UP_MS ? key : null;
}
