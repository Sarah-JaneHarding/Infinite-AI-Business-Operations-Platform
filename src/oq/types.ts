/** Open Questions Register: the shapes held in the server-only collections oq_questions, oq_decisions, oq_agent_tasks and oq_prs. */
export const OQ_REPOS = ['ecosystem', 'platform'] as const;
export type OqRepo = (typeof OQ_REPOS)[number];
export const OQ_STATUSES = ['open', 'partial', 'answered', 'followup', 'resolved', 'parked'] as const;
export type OqStatus = (typeof OQ_STATUSES)[number];

export interface Question {
  id: string;
  repo: OqRepo;
  order?: number;
  title: string;
  stage?: string;
  raised?: string;
  status: OqStatus;
  blocks?: string;
  question: string;
  reason: string;
  suggestions?: string[];
  recommendation?: string;
  options?: string[];
  recommendedIndex?: number | null;
  source?: string;
  /** Written by the platform when a decision is recorded. */
  decisionId?: string;
}

/** The accountable department (a Department id) and the agents that can prepare the follow-up. */
export interface Routing { dept: string; agents: string[]; why: string }

export interface Decision {
  id: string;
  qid: string;
  repo: OqRepo;
  choice: string;
  text: string;
  reason: string;
  /** True when the choice differs from the recommended option, so a reason was required. */
  departs: boolean;
  by: string;
  at: string;
  routing: Routing;
  ceoTaskId: string;
  agentTaskIds: string[];
}

/** A proposal for an agent to prepare the follow-up. It only becomes a run if an active standing order covers the agent (docs/AUTONOMY.md). */
export interface AgentTaskProposal {
  id: string;
  qid: string;
  decisionId: string;
  agentId: string;
  dept: string;
  brief: string;
  status: 'PROPOSED' | 'DISMISSED';
  at: string;
}

export interface PrRecord {
  id: string;
  qid: string;
  decisionId: string;
  repo: string;
  number: number;
  url: string;
  branch: string;
  by: string;
  at: string;
}
