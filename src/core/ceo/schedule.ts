/**
 * The CEO calendar. Tasks that need a person are placed into working time, earliest-deadline first, around
 * the events the CEO entered and anything the CEO pinned. The rules are fixed and written down here:
 *
 * - Monday to Friday, 08:00-17:00 South African time, with 12:00-13:00 left free.
 * - Every block is 30 minutes unless the CEO set a length. The platform does not guess how long a task takes.
 * - At most 8 blocks a day (4 hours), so the day is never fully booked.
 * - Overdue work first, then by due date, then by priority. Undated priority-3 work (checklist items) stays on the
 *   list but is not booked: it would crowd out everything else.
 * - The horizon is 15 working days. Tasks that do not fit are returned as `unscheduled`.
 */
import type { Block, CalEvent, CeoTask, TaskState } from './types';
import { addDays, sastDate, sastToUtc, sastWeekday } from './time';

export const CALENDAR_RULES = { startHour: 8, endHour: 17, breakFrom: 12, breakTo: 13, blockMinutes: 30, maxBlocksPerDay: 8, horizonDays: 15 } as const;

export interface ScheduleResult { blocks: Block[]; unscheduled: CeoTask[] }

const overlaps = (a: { s: number; e: number }, b: { s: number; e: number }) => a.s < b.e && b.s < a.e;

export function schedule(tasks: CeoTask[], events: CalEvent[], states: TaskState[], now: number): ScheduleResult {
  const R = CALENDAR_RULES;
  const st = new Map(states.map((s) => [s.id, s]));
  const candidates = tasks.filter((t) => t.requiresHuman && t.status !== 'done' && !(t.priority === 3 && !t.due));
  const busy: { s: number; e: number }[] = events.filter((e) => !('deleted' in e && e.deleted)).map((e) => ({ s: Date.parse(e.start), e: Date.parse(e.end) })).filter((x) => Number.isFinite(x.s) && Number.isFinite(x.e) && x.e > x.s);
  const blocks: Block[] = [];

  // 1. Pinned tasks keep the time the CEO chose.
  const loose: CeoTask[] = [];
  for (const t of candidates) {
    const s = st.get(t.id);
    const start = s?.scheduledStart ? Date.parse(s.scheduledStart) : NaN;
    if (Number.isFinite(start)) {
      const end = start + (s?.minutes ?? R.blockMinutes) * 60_000;
      blocks.push({ id: `blk:${t.id}`, taskId: t.id, title: t.title, dept: t.dept, start: new Date(start).toISOString(), end: new Date(end).toISOString(), fixed: true, reason: 'Pinned by the CEO' });
      busy.push({ s: start, e: end });
    } else loose.push(t);
  }

  // 2. Everything else, earliest deadline first.
  const order = [...loose].sort((a, b) => (a.status === 'overdue' ? 0 : 1) - (b.status === 'overdue' ? 0 : 1) || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.priority - b.priority || a.title.localeCompare(b.title));
  const perDay = new Map<string, number>();
  for (const b of blocks) perDay.set(sastDate(Date.parse(b.start)), (perDay.get(sastDate(Date.parse(b.start))) ?? 0) + 1);
  const unscheduled: CeoTask[] = [];
  const first = sastDate(now);
  let queue = order;
  for (let day = 0; day < R.horizonDays + 4 && queue.length; day++) {
    const date = addDays(first, day);
    const wd = sastWeekday(date);
    if (wd === 0 || wd === 6) continue;
    if (day > R.horizonDays + 2) break;
    for (let mins = R.startHour * 60; mins + R.blockMinutes <= R.endHour * 60 && queue.length; mins += R.blockMinutes) {
      if (mins >= R.breakFrom * 60 && mins < R.breakTo * 60) continue;
      if ((perDay.get(date) ?? 0) >= R.maxBlocksPerDay) break;
      const s = sastToUtc(date, Math.floor(mins / 60), mins % 60);
      const slot = { s, e: s + R.blockMinutes * 60_000 };
      if (slot.s < now || busy.some((b) => overlaps(slot, b))) continue;
      const t = queue[0]!;
      queue = queue.slice(1);
      blocks.push({ id: `blk:${t.id}`, taskId: t.id, title: t.title, dept: t.dept, start: new Date(slot.s).toISOString(), end: new Date(slot.e).toISOString(), fixed: false, late: Boolean(t.due && date > t.due), reason: t.reason });
      busy.push(slot);
      perDay.set(date, (perDay.get(date) ?? 0) + 1);
    }
  }
  unscheduled.push(...queue);
  return { blocks: blocks.sort((a, b) => a.start.localeCompare(b.start)), unscheduled };
}
