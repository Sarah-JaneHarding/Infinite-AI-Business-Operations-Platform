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
  /** What recurs, and that a person still supplies the inputs. */
  why: string;
}

/** weekday 1 is Monday; hours are UTC. */
export const ORDER_TEMPLATES: readonly OrderTemplate[] = [
  { id: 'tpl-executive', dept: 'executive', agentId: 'OPS-EXEC-01', name: 'Weekly board update pack', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The board pack recurs every week; a person still supplies the period and the points to cover.' },
  { id: 'tpl-product', dept: 'product', agentId: 'OPS-PROD-04', name: 'Weekly release readiness checklist', trigger: { kind: 'schedule', every: 'weekly', weekday: 5, hourUtc: 12 }, maxRunsPerDay: 1, why: 'Release readiness is checked before each weekend; a person still supplies the release details.' },
  { id: 'tpl-curriculum', dept: 'curriculum', agentId: 'OPS-CURR-02', name: 'Weekly backward-design unit planner', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Unit planning recurs each week; a person still supplies the topic and the outcomes.' },
  { id: 'tpl-ai', dept: 'ai', agentId: 'OPS-AI-01', name: 'Weekly agent roster reconciliation', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'The roster is reconciled against the platform every week; this agent needs no inputs from a person.' },
  { id: 'tpl-security', dept: 'security', agentId: 'OPS-SEC-05', name: 'Weekly access review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Access is reviewed every week; a person still supplies the systems and roles in scope.' },
  { id: 'tpl-legal', dept: 'legal', agentId: 'OPS-LEG-06', name: 'Weekly obligation and renewal register', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'Obligations and renewals are tracked every week; a person still supplies the contracts in scope.' },
  { id: 'tpl-finance', dept: 'finance', agentId: 'OPS-FIN-04', name: 'Weekly month-end close checklist', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The close checklist is refreshed weekly because no monthly trigger exists; a person still supplies the period.' },
  { id: 'tpl-sales', dept: 'sales', agentId: 'OPS-SALES-04', name: 'Weekly pipeline review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The pipeline is reviewed every week; a person still supplies the deals and stages to cover.' },
  { id: 'tpl-marketing', dept: 'marketing', agentId: 'OPS-MKT-04', name: 'Weekly content calendar builder', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The content calendar is rebuilt every week; a person still supplies the themes and channels.' },
  { id: 'tpl-success', dept: 'success', agentId: 'OPS-CS-02', name: 'Quarterly business review draft, refreshed weekly', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Review drafts are prepared ahead of each quarter; a person still supplies the account and the period.' },
  { id: 'tpl-support', dept: 'support', agentId: 'OPS-SUP-06', name: 'Weekly ticket trend review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Ticket trends are reviewed every week; a person still supplies the period and the categories.' },
  { id: 'tpl-government', dept: 'government', agentId: 'OPS-GOV-06', name: 'Weekly funding pipeline review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The funding pipeline is reviewed every week; a person still supplies the opportunities in scope.' },
  { id: 'tpl-people', dept: 'people', agentId: 'OPS-PPL-06', name: 'Weekly staff development plan', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Development plans are revisited every week; a person still supplies the role and the goals.' },
  { id: 'tpl-devops', dept: 'devops', agentId: 'OPS-SRE-04', name: 'Weekly backup and restore test record', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 5 }, maxRunsPerDay: 1, why: 'A restore test is recorded every week; a person still supplies the system and the result.' },
  { id: 'tpl-procurement', dept: 'procurement', agentId: 'OPS-PRO-03', name: 'Weekly supplier review', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'Suppliers are reviewed every week; a person still supplies the supplier and the criteria.' },
  { id: 'tpl-research', dept: 'research', agentId: 'OPS-RES-06', name: 'Weekly evidence claims register', trigger: { kind: 'schedule', every: 'weekly', weekday: 1, hourUtc: 6 }, maxRunsPerDay: 1, why: 'The claims register is updated every week; a person still supplies the claims and their sources.' },
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
