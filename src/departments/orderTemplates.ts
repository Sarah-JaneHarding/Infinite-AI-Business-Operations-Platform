import { agentById } from './index';

/**
 * One standing-order template per department. A template pre-selects an agent and a trigger; the person still types the
 * inputs, and a different person still activates the order. Templates carry no prices and no figures: they are plain data.
 */
export type TemplateTrigger =
  | { kind: 'schedule'; every: 'daily'; hourUtc: number }
  | { kind: 'schedule'; every: 'weekly'; weekday: number; hourUtc: number }
  | { kind: 'request' };

export interface OrderTemplate {
  id: string;
  dept: string;
  agentId: string;
  name: string;
  trigger: TemplateTrigger;
  maxRunsPerDay: number;
  /** What recurs, and that the inputs a person types when the order is made are fixed for every run of it. */
  why: string;
}

/** weekday 1 is Monday; hours are UTC. */
export const ORDER_TEMPLATES: readonly OrderTemplate[] = [
  { id: 'tpl-executive', dept: 'executive', agentId: 'OPS-EXEC-01', name: 'Weekly board update pack', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The board pack recurs every week, on the points a person typed when the order was made. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-product', dept: 'product', agentId: 'OPS-PROD-04', name: 'Weekly release readiness checklist', trigger: { kind: 'schedule', every: 'weekly', weekday: 5, hourUtc: 12 }, maxRunsPerDay: 1, why: 'Release readiness is checked before each weekend, on the release details typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-curriculum', dept: 'curriculum', agentId: 'OPS-CURR-02', name: 'Weekly backward-design unit planner', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Unit planning recurs each week, on the topic and outcomes typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-ai', dept: 'ai', agentId: 'OPS-AI-01', name: 'Weekly agent roster reconciliation', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'The roster is reconciled against the platform every week. This agent needs no typed inputs, so nothing goes stale. The inputs typed when the order is made are fixed for every run of it.' },
  { id: 'tpl-security', dept: 'security', agentId: 'OPS-SEC-05', name: 'Weekly access review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Access is reviewed every week, on the systems and roles typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-legal', dept: 'legal', agentId: 'OPS-LEG-06', name: 'Weekly obligation and renewal register', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Obligations and renewals are tracked every week, on the contracts typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-finance', dept: 'finance', agentId: 'OPS-FIN-04', name: 'Weekly month-end close checklist', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The close checklist is refreshed weekly because no monthly trigger exists, on the period typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-sales', dept: 'sales', agentId: 'OPS-SALES-04', name: 'Weekly pipeline review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The pipeline is reviewed every week, on the deals and stages typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-marketing', dept: 'marketing', agentId: 'OPS-MKT-04', name: 'Weekly content calendar builder', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The content calendar is rebuilt every week, on the themes and channels typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-success', dept: 'success', agentId: 'OPS-CS-02', name: 'Quarterly business review draft, refreshed weekly', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Review drafts are prepared every week ahead of each quarter, on the account and period typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-support', dept: 'support', agentId: 'OPS-SUP-06', name: 'Ticket trend review', trigger: { kind: 'request' }, maxRunsPerDay: 1, why: 'A ticket trend review is run when a person asks, because its typed period and counts go stale. The inputs typed when the order is made are fixed for every run of it, so a scheduled order would repeat old counts.' },
  { id: 'tpl-government', dept: 'government', agentId: 'OPS-GOV-06', name: 'Weekly funding pipeline review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The funding pipeline is reviewed every week, on the opportunities typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-people', dept: 'people', agentId: 'OPS-PPL-06', name: 'Weekly staff development plan', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Development plans are revisited every week, on the role and goals typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-devops', dept: 'devops', agentId: 'OPS-SRE-04', name: 'Backup and restore test record', trigger: { kind: 'request' }, maxRunsPerDay: 1, why: 'A restore test is recorded when a person asks, because its typed date and result go stale. The inputs typed when the order is made are fixed for every run of it, so a scheduled order would repeat an old result.' },
  { id: 'tpl-procurement', dept: 'procurement', agentId: 'OPS-PRO-03', name: 'Weekly supplier review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Suppliers are reviewed every week, on the supplier and criteria typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
  { id: 'tpl-research', dept: 'research', agentId: 'OPS-RES-06', name: 'Weekly evidence claims register', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The claims register is updated every week, on the claims and sources typed once. The inputs are fixed for every run, so the period or facts typed once are reused every week; to refresh them, propose a new order, or tick \'Allow task inputs\' and queue a task with new inputs.' },
];

export const templatesFor = (dept: string): OrderTemplate[] => ORDER_TEMPLATES.filter((t) => t.dept === dept);

/** Department ids that have no template. The coverage gate: this must be empty for the real lists. */
export const uncovered = (templates: readonly OrderTemplate[], departments: readonly { id: string }[]): string[] =>
  departments.filter((d) => !templates.some((t) => t.dept === d.id)).map((d) => d.id);

/** Agent ids of templates whose agent is gated (twoPerson or professionalReview) or does not exist. A template may not name one. */
export const gatedAgents = (templates: readonly OrderTemplate[]): string[] =>
  templates.filter((t) => {
    const a = agentById(t.agentId);
    return !a || a.twoPerson === true || a.professionalReview !== undefined;
  }).map((t) => t.agentId);
