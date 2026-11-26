/**
 * The consolidated task list. Every task is derived from something a person or an agent already recorded:
 * tracker rows, unticked checklist items, artefacts waiting on a person, decisions from the business plan,
 * and tasks added by hand or arriving through the inbound webhook. The platform never makes up a task.
 *
 * What "needs a human" means: the platform can draft, but it cannot decide, sign, send, pay or confirm anything
 * on the official source. So every task is flagged requiresHuman except an `ai_draft` task, which an agent can prepare
 * (a person still approves the result).
 */
import type { Rec } from '../warehouse';
import type { Artefact } from '../platform';
import type { Department } from '../../departments/types';
import type { CeoTask, ManualTask, TaskState, TaskStatus } from './types';
import { PLAN_DECISIONS } from './plan';
import { isDate, sastDate } from './time';

type Row = Record<string, unknown> & { id: string; deleted?: boolean };

/** How each tracker's columns map to a task. Data, not code: read top to bottom. */
export interface TrackerRule {
  collection: string;
  /** Columns joined with ": " to make the title. */
  title: string[];
  status?: string;
  due?: string;
  owner?: string;
  /** Status values that mean finished. */
  done?: string[];
  blocked?: string[];
  progress?: string[];
  /** Rows with these status values are not tasks at all (for example a restore test that passed). */
  skip?: string[];
  /** A column and value that makes the task a decision for a person. */
  decisionWhen?: [string, string];
  /** A column and value that makes the task top priority. */
  urgentWhen?: [string, string];
  /** Rows without this column filled in are skipped. */
  requires?: string;
  verb: string;
}

export const TRACKER_RULES: TrackerRule[] = [
  { collection: 'actions', title: ['action'], status: 'status', due: 'due', owner: 'owner', done: ['Done'], blocked: ['Blocked'], verb: 'Action' },
  { collection: 'okr', title: ['objective', 'kr'], status: 'status', owner: 'owner', done: ['Done'], blocked: ['At risk'], progress: ['On track'], skip: ['Not started'], verb: 'Objective' },
  { collection: 'compliance_calendar', title: ['item'], status: 'status', due: 'date', done: ['Done'], verb: 'Compliance date' },
  { collection: 'obligations', title: ['contract', 'obligation'], status: 'status', due: 'due', owner: 'owner', done: ['Done'], verb: 'Obligation' },
  { collection: 'tickets', title: ['summary'], status: 'status', done: ['Resolved'], blocked: ['Waiting'], progress: ['In progress'], urgentWhen: ['priority', 'P1'], verb: 'Support ticket' },
  { collection: 'tender_requirements', title: ['tender', 'req'], status: 'status', owner: 'owner', done: ['Checked'], progress: ['In progress', 'Ready'], verb: 'Tender requirement' },
  { collection: 'content_calendar', title: ['channel', 'piece'], status: 'status', due: 'date', done: ['Published'], progress: ['Drafting', 'Review', 'Approved'], requires: 'piece', verb: 'Content' },
  { collection: 'content_review', title: ['asset'], status: 'status', owner: 'reviewer', done: ['Approved'], blocked: ['Changes needed'], verb: 'Content review' },
  { collection: 'usability_findings', title: ['finding'], status: 'status', done: ['Fixed'], progress: ['Planned'], urgentWhen: ['severity', 'Blocker'], verb: 'Usability finding' },
  { collection: 'contracts', title: ['counterparty', 'type'], status: 'status', due: 'renewal', owner: 'owner', done: ['Signed'], blocked: ['Expired'], progress: ['Counsel review', 'Negotiation'], decisionWhen: ['status', 'Counsel review'], verb: 'Contract' },
  { collection: 'debtors', title: ['school', 'invoice'], status: 'status', due: 'due', done: ['Paid'], blocked: ['Disputed'], progress: ['Promised'], verb: 'Debtor' },
  { collection: 'dsr_log', title: ['type', 'ref'], status: 'status', done: ['Responded', 'Closed'], urgentWhen: ['status', 'Open'], verb: 'Data subject request' },
  { collection: 'breach_log', title: ['what'], decisionWhen: ['regulator', 'Decision pending'], urgentWhen: ['regulator', 'Decision pending'], verb: 'Incident' },
  { collection: 'restore_tests', title: ['system'], status: 'result', done: ['Passed'], blocked: ['Failed'], progress: ['Partly'], skip: ['Passed'], verb: 'Restore test' },
  { collection: 'operator_register', title: ['operator', 'service'], status: 'agreement', done: ['Signed'], progress: ['In progress'], verb: 'Operator agreement' },
  { collection: 'claims_register', title: ['claim'], status: 'status', done: ['Checked'], progress: ['Evidence given'], verb: 'Claim' },
  { collection: 'evals', title: ['agent', 'suite'], status: 'status', done: ['Passing'], blocked: ['Failing'], progress: ['Defined'], verb: 'Eval' },
  { collection: 'crm_pipeline', title: ['school', 'next'], status: 'stage', due: 'due', done: ['Won', 'Lost'], requires: 'next', verb: 'Sales next step' },
];

const text = (r: Row, k: string) => String(r[k] ?? '').trim();
export const latestById = <T extends { id: string }>(rows: readonly Rec[] | undefined): T[] => {
  const m = new Map<string, Rec>();
  for (const r of rows ?? []) m.set(r.id, r);
  return [...m.values()] as unknown as T[];
};

export interface TaskInput {
  departments: Department[];
  /** Every collection's records, oldest first (history is fine: only the newest per id is used). */
  collections: Record<string, readonly Rec[]>;
  agentSecondApprover?: (agentId: string) => boolean;
  now: number;
}

const DEPT_OWNER = (d: Department) => `Head of ${d.name.split(' &')[0]}`;

function trackerTasks(inp: TaskInput, today: string): CeoTask[] {
  const out: CeoTask[] = [];
  for (const d of inp.departments) {
    for (const w of d.widgets) {
      if (w.type !== 'tracker') continue;
      const rule = TRACKER_RULES.find((r) => r.collection === w.collection);
      if (!rule) continue;
      for (const r of latestById<Row>(inp.collections[w.collection]).filter((x) => !x.deleted)) {
        const title = rule.title.map((k) => text(r, k)).filter(Boolean).join(': ');
        if (!title) continue;
        if (rule.requires && !text(r, rule.requires)) continue;
        const st = rule.status ? text(r, rule.status) : '';
        if (st && rule.skip?.includes(st)) continue;
        const due = rule.due && isDate(r[rule.due]) ? (r[rule.due] as string) : undefined;
        const decision = rule.decisionWhen ? text(r, rule.decisionWhen[0]) === rule.decisionWhen[1] : false;
        const urgent = rule.urgentWhen ? text(r, rule.urgentWhen[0]) === rule.urgentWhen[1] : false;
        out.push(finish({
          id: `trk:${w.collection}:${r.id}`, dept: d.id, title: `${rule.verb}: ${title}`, source: 'tracker', sourceRef: w.collection,
          status: st && rule.done?.includes(st) ? 'done' : st && rule.blocked?.includes(st) ? 'blocked' : st && rule.progress?.includes(st) ? 'in_progress' : 'open',
          kind: decision ? 'decision' : 'action', requiresHuman: true, priority: urgent ? 1 : 3, due, owner: rule.owner && text(r, rule.owner) ? text(r, rule.owner) : DEPT_OWNER(d),
          reason: `${rule.verb} recorded in ${d.name}${st ? ` with status "${st}"` : ''}. A person has to ${decision ? 'decide' : 'do or confirm'} it.`,
        }, today));
      }
    }
  }
  return out;
}

function checklistTasks(inp: TaskInput, today: string): CeoTask[] {
  const out: CeoTask[] = [];
  for (const d of inp.departments) {
    for (const w of d.widgets) {
      if (w.type !== 'checklist') continue;
      const state = new Map(latestById<Row>(inp.collections[w.collection]).map((r) => [r.id, r]));
      w.items.forEach((label, i) => {
        const done = Boolean(state.get(`item-${i}`)?.done);
        out.push(finish({
          id: `chk:${w.collection}:${i}`, dept: d.id, title: `${w.title}: ${label}`, source: 'checklist', sourceRef: w.collection,
          status: done ? 'done' : 'open', kind: 'action', requiresHuman: true, priority: 3, owner: DEPT_OWNER(d),
          reason: `Unticked item on the ${w.title} checklist in ${d.name}. Evidence is recorded by a person.`,
        }, today));
      });
    }
  }
  return out;
}

function artefactTasks(inp: TaskInput, today: string): CeoTask[] {
  const out: CeoTask[] = [];
  const deptName = new Map(inp.departments.map((d) => [d.id, d]));
  for (const a of latestById<Artefact>(inp.collections['artefact_versions']).filter((x) => !x.deleted)) {
    const d = deptName.get(a.dept);
    const owner = d ? DEPT_OWNER(d) : undefined;
    const base = { dept: a.dept, source: 'artefact' as const, sourceRef: a.id, owner, due: undefined, requiresHuman: true };
    if (a.status === 'IN_REVIEW') out.push(finish({ ...base, id: `art:${a.id}`, title: `Approve or reject: ${a.title}`, status: 'open', kind: 'decision', priority: 1, reason: `${a.agentId} drafted this. Only a named person can approve it.` }, today));
    else if (a.status === 'DRAFT') out.push(finish({ ...base, id: `art:${a.id}`, title: `Edit and submit for review: ${a.title}`, status: 'in_progress', kind: 'action', priority: 2, reason: `${a.agentId} left this as a draft. A person edits it and submits it.` }, today));
    else if (a.status === 'APPROVED' && inp.agentSecondApprover?.(a.agentId) && !a.countersignedBy) out.push(finish({ ...base, id: `art:${a.id}`, title: `Countersign: ${a.title}`, status: 'open', kind: 'decision', priority: 1, reason: 'This agent needs a second, different person to countersign.' }, today));
  }
  return out;
}

function planTasks(today: string): CeoTask[] {
  return PLAN_DECISIONS.filter((p) => p.humanAction).map((p) => finish({
    id: `plan:${p.id}`, dept: p.dept, title: `${p.id}: ${p.humanAction}`, source: 'plan', sourceRef: p.id, status: 'open', kind: 'decision', requiresHuman: true, priority: 2,
    owner: 'CEO', reason: `Business Planning Package v1.4, section 15${p.when ? ` (${p.when})` : ''}. ${p.decision}`,
  }, today));
}

function manualTasks(inp: TaskInput, today: string): CeoTask[] {
  return latestById<ManualTask>(inp.collections['ceo_tasks']).filter((t) => !t.deleted && t.title).map((t) => finish({
    id: `man:${t.id}`, dept: t.dept || 'executive', title: t.title, source: t.source === 'inbound' ? 'inbound' : 'manual', sourceRef: t.id, status: 'open',
    kind: t.kind ?? 'action', requiresHuman: t.requiresHuman ?? t.kind !== 'ai_draft', priority: 2, due: isDate(t.due) ? t.due : undefined, owner: t.owner || 'CEO',
    agentId: t.agentId, questionId: t.questionId, manifestId: t.manifestId,
    reason: t.questionId
      ? `Generated from open question ${t.questionId}${t.agentId ? ` · assigned to ${t.agentId}` : ''}.${t.notes ? ` ${t.notes}` : ''}`
      : t.source === 'inbound' ? 'Arrived through the inbound webhook.' : (t.notes || 'Added by hand.'),
  }, today));
}

/** The monitor's own task: the weekly review is an AI draft, so it does not need a person to prepare it. */
function monitorTasks(inp: TaskInput, today: string): CeoTask[] {
  const week = inp.now - 7 * 86_400_000;
  const ran = latestById<Artefact>(inp.collections['artefact_versions']).some((a) => !a.deleted && a.agentId === OPS_REVIEW_AGENT && Date.parse(a.at) >= week);
  return ran ? [] : [finish({
    id: 'mon:weekly-review', dept: 'executive', title: 'Run the weekly operations review (an agent drafts it; you approve it)', source: 'monitor', sourceRef: OPS_REVIEW_AGENT, status: 'open', kind: 'ai_draft', requiresHuman: false, priority: 2,
    reason: 'No operations review has been drafted in the last seven days.',
  }, today)];
}

export const OPS_REVIEW_AGENT = 'OPS-CEO-01';

/** Sets overdue, and sorts out priority for blocked and overdue work. */
function finish(t: Omit<CeoTask, 'priority'> & { priority: CeoTask['priority'] }, today: string): CeoTask {
  let { status, priority } = t;
  if (status !== 'done' && t.due && t.due < today) status = 'overdue';
  if ((status === 'overdue' || status === 'blocked') && priority > 1) priority = 1;
  else if (status !== 'done' && t.due && priority > 2) priority = 2;
  return { ...t, status, priority };
}

const STATE_STATUS: Record<NonNullable<TaskState['status']>, TaskStatus> = { open: 'open', in_progress: 'in_progress', blocked: 'blocked', done: 'done' };

export function deriveTasks(inp: TaskInput): CeoTask[] {
  const today = sastDate(inp.now);
  const states = new Map(latestById<TaskState>(inp.collections['ceo_task_state']).map((s) => [s.id, s]));
  const all = [...trackerTasks(inp, today), ...checklistTasks(inp, today), ...artefactTasks(inp, today), ...planTasks(today), ...manualTasks(inp, today), ...monitorTasks(inp, today)];
  return all.map((t) => {
    const s = states.get(t.id);
    // A person's note can finish a plan, manual or inbound task. A tracker, checklist or artefact task is finished at its source.
    if (s?.status && (t.source === 'plan' || t.source === 'manual' || t.source === 'inbound')) return finish({ ...t, status: STATE_STATUS[s.status] }, today);
    return t;
  }).sort((a, b) => a.priority - b.priority || (a.due ?? '9999').localeCompare(b.due ?? '9999') || a.title.localeCompare(b.title));
}
