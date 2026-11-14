import type { CeoState } from './index';

/** A short plain-text summary for Slack, Teams or an email. Counts and titles only; titles were checked on entry. */
export function digestText(s: CeoState, name = 'Infinite-AI'): string {
  const c = s.facts;
  const lines = [
    `${name} operations digest (${s.at.slice(0, 16).replace('T', ' ')} UTC)`,
    `Tasks: ${c['ops.tasks.open']} open, ${c['ops.tasks.blocked']} blocked, ${c['ops.tasks.overdue']} overdue, ${c['ops.tasks.humanOpen']} waiting for a person.`,
    `Departments: ${c['ops.depts.red']} red, ${c['ops.depts.amber']} amber, ${c['ops.depts.green']} green, ${c['ops.depts.none']} with nothing recorded.`,
  ];
  const urgent = s.tasks.filter((t) => t.requiresHuman && t.status !== 'done' && t.priority === 1).slice(0, 5);
  if (urgent.length) { lines.push('Needs you first:'); for (const t of urgent) lines.push(`- ${t.title}${t.due ? ` (due ${t.due})` : ''}`); }
  return lines.join('\n').slice(0, 1500);
}
