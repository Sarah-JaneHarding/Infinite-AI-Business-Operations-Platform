import type { Rec } from '../warehouse';
import type { Department } from '../../departments/types';
import { deriveTasks, latestById } from './tasks';
import { schedule, type ScheduleResult } from './schedule';
import { deptHealth } from './health';
import type { CalEvent, CeoTask, DeptHealth, TaskState } from './types';

export * from './types';
export * from './plan';
export { deriveTasks, TRACKER_RULES, OPS_REVIEW_AGENT, latestById } from './tasks';
export { schedule, CALENDAR_RULES } from './schedule';
export { toIcs } from './ics';
export { deptHealth, HEALTH_RULES } from './health';
export { sastDate } from './time';

export interface CeoState extends ScheduleResult {
  tasks: CeoTask[];
  health: DeptHealth[];
  events: CalEvent[];
  facts: Record<string, string | number>;
  at: string;
}

export interface CeoInput { departments: Department[]; collections: Record<string, readonly Rec[]>; agentSecondApprover?: (agentId: string) => boolean; now: number }

/** Counts the operations review agent may quote. Each is a plain count of recorded work, named `ops.*` so a figure can be traced. */
export function opsFacts(tasks: CeoTask[], health: DeptHealth[], blocksCount: number): Record<string, string | number> {
  const f: Record<string, string | number> = {
    'ops.tasks.total': tasks.length,
    'ops.tasks.open': tasks.filter((t) => t.status === 'open' || t.status === 'in_progress').length,
    'ops.tasks.blocked': tasks.filter((t) => t.status === 'blocked').length,
    'ops.tasks.overdue': tasks.filter((t) => t.status === 'overdue').length,
    'ops.tasks.done': tasks.filter((t) => t.status === 'done').length,
    'ops.tasks.humanOpen': tasks.filter((t) => t.requiresHuman && t.status !== 'done').length,
    'ops.calendar.blocks': blocksCount,
    'ops.depts.red': health.filter((h) => h.light === 'red').length,
    'ops.depts.amber': health.filter((h) => h.light === 'amber').length,
    'ops.depts.green': health.filter((h) => h.light === 'green').length,
    'ops.depts.none': health.filter((h) => h.light === 'none').length,
  };
  for (const h of health) { f[`ops.${h.dept}.light`] = h.light; f[`ops.${h.dept}.open`] = h.open; f[`ops.${h.dept}.overdue`] = h.overdue; f[`ops.${h.dept}.blocked`] = h.blocked; f[`ops.${h.dept}.inReview`] = h.inReview; }
  return f;
}

/** One pass of the monitor: tasks, calendar, health and facts from the warehouse. Pure and deterministic for a given `now`. */
export function buildCeoState(inp: CeoInput): CeoState {
  const tasks = deriveTasks(inp);
  const events = latestById<CalEvent>(inp.collections['ceo_events']).filter((e) => !e.deleted);
  const states = latestById<TaskState>(inp.collections['ceo_task_state']);
  const sched = schedule(tasks, events, states, inp.now);
  const health = deptHealth(inp.departments, tasks, inp.collections, inp.now);
  return { tasks, ...sched, health, events, facts: opsFacts(tasks, health, sched.blocks.length), at: new Date(inp.now).toISOString() };
}

/** Two copies of the warehouse (this browser's and the server's) as one: records are de-duplicated by content hash and ordered by when they were stored, so the newest version of a row wins. */
export function mergeCollections(a: Record<string, readonly Rec[]>, b: Record<string, readonly Rec[]>): Record<string, Rec[]> {
  const out: Record<string, Rec[]> = {};
  for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) {
    const seen = new Set<string>();
    const rows: Rec[] = [];
    for (const r of [...(a[k] ?? []), ...(b[k] ?? [])]) {
      const key = typeof r['hash'] === 'string' ? (r['hash'] as string) : JSON.stringify(r);
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push(r);
    }
    out[k] = rows.map((r, i) => ({ r, i })).sort((x, y) => String(x.r['storedAt'] ?? x.r['at'] ?? '').localeCompare(String(y.r['storedAt'] ?? y.r['at'] ?? '')) || x.i - y.i).map((x) => x.r);
  }
  return out;
}
