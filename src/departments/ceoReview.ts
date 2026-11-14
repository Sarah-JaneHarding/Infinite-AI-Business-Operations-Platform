/**
 * The Operations review: an AI-assisted artefact that reads the monitor's counts (ops.* facts), assesses every department
 * against the fixed health rules and drafts the CEO's review. It is a platform service agent, not part of the 100-agent
 * roster (decision OQ-005: never add agents to the roster), so it is registered in SERVICE_AGENTS and found by agentById.
 * Like every agent it only drafts: a named person approves it. Every figure carries its [src:ops.*] tag.
 */
import { defineAgent as A, long, src } from './kit';
import type { AgentContract } from '../core/agent';

export const makeOpsReview = (depts: { id: string; name: string }[]): AgentContract => A('executive', 'CEO', {
  n: 1, name: 'Operations review', summary: 'Reads the live counts from every department, assesses each against the fixed health rules, and drafts the CEO review. A person approves it.', framework: 'Balanced Scorecard + exception-based management', purpose: 'strategy_planning', formats: ['md', 'docx', 'html', 'pdf', 'json'],
  inputs: [long('focus', 'Anything you want the review to look at (optional)')],
  narrative: (c) => ({ 'ops.tasks.overdue': c.facts['ops.tasks.overdue'] ?? 0, 'ops.tasks.blocked': c.facts['ops.tasks.blocked'] ?? 0, 'ops.depts.red': c.facts['ops.depts.red'] ?? 0 }),
  title: () => 'Operations review',
  sections: (c) => {
    const light = (id: string) => String(c.facts[`ops.${id}.light`] ?? 'unknown');
    const red = depts.filter((d) => light(d.id) === 'red');
    const amber = depts.filter((d) => light(d.id) === 'amber');
    const none = depts.filter((d) => light(d.id) === 'none');
    return [
      { h: 'Overall position', kv: [['Tasks tracked', src(c, 'ops.tasks.total')], ['Open or in progress', src(c, 'ops.tasks.open')], ['Blocked', src(c, 'ops.tasks.blocked')], ['Overdue', src(c, 'ops.tasks.overdue')], ['Done', src(c, 'ops.tasks.done')], ['Waiting for a person', src(c, 'ops.tasks.humanOpen')], ['Departments red / amber / green / nothing recorded', `${src(c, 'ops.depts.red')} / ${src(c, 'ops.depts.amber')} / ${src(c, 'ops.depts.green')} / ${src(c, 'ops.depts.none')}`]] },
      { h: 'Needs attention first', bullets: [...red.map((d) => `${d.name} is red: ${src(c, `ops.${d.id}.overdue`)} overdue, ${src(c, `ops.${d.id}.blocked`)} blocked.`), ...amber.map((d) => `${d.name} is amber: ${src(c, `ops.${d.id}.blocked`)} blocked, ${src(c, `ops.${d.id}.inReview`)} waiting for review.`), ...(red.length + amber.length ? [] : ['No department is red or amber on what has been recorded.'])] },
      { h: 'Department by department', table: { headers: ['Department', 'Status', 'Open', 'Blocked', 'Overdue', 'Waiting for review'], rows: depts.map((d) => [d.name, light(d.id), src(c, `ops.${d.id}.open`), src(c, `ops.${d.id}.blocked`), src(c, `ops.${d.id}.overdue`), src(c, `ops.${d.id}.inReview`)]) } },
      { h: 'Nothing recorded yet', p: none.length ? `${none.map((d) => d.name).join(', ')}. "Nothing recorded" is not good news: it means no tracker rows, checklist ticks or artefacts exist for the department.` : 'Every department has recorded work.' },
      { h: 'What this review cannot see', callout: { tone: 'warn', text: 'The monitor counts only what people and agents recorded in the platform. It has no revenue, customer, learner or school data and makes no judgement about quality. Add those from your own records, with a source.' } },
      { h: 'Your note', input: c.input.focus ?? '' },
    ];
  },
});
