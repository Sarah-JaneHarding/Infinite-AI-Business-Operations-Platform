/**
 * Department health, computed only from recorded work. The thresholds are fixed and shown to the CEO.
 * A department with nothing recorded is "none" (grey), never green: no data is not good news.
 */
import type { Rec } from '../warehouse';
import type { Artefact } from '../platform';
import type { Department } from '../../departments/types';
import type { CeoTask, DeptHealth, Light } from './types';
import { latestById } from './tasks';

export const HEALTH_RULES = {
  red: 'Any overdue task, or 3 or more blocked tasks.',
  amber: 'Any blocked task, an artefact waiting for review for more than 3 days, or open tasks with no activity for 14 days.',
  green: 'Activity recorded and none of the above.',
  none: 'Nothing recorded yet: no tracker rows, checklist ticks or artefacts.',
  reviewDays: 3, quietDays: 14, redBlocked: 3,
} as const;

const DAY = 86_400_000;

export function deptHealth(departments: Department[], tasks: CeoTask[], collections: Record<string, readonly Rec[]>, now: number): DeptHealth[] {
  const arts = latestById<Artefact>(collections['artefact_versions']).filter((a) => !a.deleted);
  return departments.map((d) => {
    const mine = tasks.filter((t) => t.dept === d.id);
    const colls = d.widgets.filter((w) => w.type === 'tracker' || w.type === 'checklist').map((w) => ('collection' in w ? w.collection : ''));
    const stamps: number[] = [];
    for (const c of colls) for (const r of collections[c] ?? []) { const t = Date.parse(String(r['at'] ?? r['storedAt'] ?? '')); if (Number.isFinite(t)) stamps.push(t); }
    const dArts = arts.filter((a) => a.dept === d.id);
    for (const a of dArts) { const t = Date.parse(a.at); if (Number.isFinite(t)) stamps.push(t); }
    const last = stamps.length ? Math.max(...stamps) : undefined;
    const overdue = mine.filter((t) => t.status === 'overdue').length;
    const blocked = mine.filter((t) => t.status === 'blocked').length;
    const open = mine.filter((t) => t.status !== 'done').length;
    const staleReview = dArts.filter((a) => a.status === 'IN_REVIEW' && now - Date.parse(a.at) > HEALTH_RULES.reviewDays * DAY).length;
    const quiet = last !== undefined && now - last > HEALTH_RULES.quietDays * DAY && open > 0;
    const reasons: string[] = [];
    if (overdue) reasons.push(`${overdue} overdue`);
    if (blocked) reasons.push(`${blocked} blocked`);
    if (staleReview) reasons.push(`${staleReview} artefact(s) waiting for review over ${HEALTH_RULES.reviewDays} days`);
    if (quiet) reasons.push(`no activity for over ${HEALTH_RULES.quietDays} days`);
    let light: Light;
    if (last === undefined) light = 'none';
    else if (overdue >= 1 || blocked >= HEALTH_RULES.redBlocked) light = 'red';
    else if (blocked >= 1 || staleReview || quiet) light = 'amber';
    else light = 'green';
    if (light === 'none') reasons.push('nothing recorded yet');
    return {
      dept: d.id, name: d.name, light, open, blocked, overdue, done: mine.filter((t) => t.status === 'done').length, total: mine.length,
      inReview: dArts.filter((a) => a.status === 'IN_REVIEW').length, humanOpen: mine.filter((t) => t.requiresHuman && t.status !== 'done').length,
      lastActivity: last === undefined ? undefined : new Date(last).toISOString(), reasons,
    };
  });
}
