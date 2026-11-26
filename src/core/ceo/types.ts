/** Shared types for the CEO command centre. Everything here is derived from warehouse records; nothing is invented. */
export type TaskStatus = 'open' | 'in_progress' | 'blocked' | 'overdue' | 'done';
/** decision: only a person can decide it. action: a person does or records it. ai_draft: an agent can prepare it (a person still approves). */
export type TaskKind = 'decision' | 'action' | 'ai_draft';
export type TaskSource = 'tracker' | 'checklist' | 'artefact' | 'plan' | 'manual' | 'inbound' | 'monitor';

export interface CeoTask {
  id: string;
  dept: string;
  title: string;
  source: TaskSource;
  /** Where to fix it: a collection name, an artefact id or a plan decision id. */
  sourceRef: string;
  status: TaskStatus;
  kind: TaskKind;
  /** True unless an agent can prepare it. Flagged tasks are scheduled on the CEO calendar. */
  requiresHuman: boolean;
  /** 1 = act first (overdue, blocked, a decision), 2 = dated or in progress, 3 = everything else. */
  priority: 1 | 2 | 3;
  /** YYYY-MM-DD in South African time. */
  due?: string;
  owner?: string;
  /** Why it is on the list and why it needs a person. */
  reason: string;
  /** Optional assigned agent id or originating open question / manifest id. */
  agentId?: string;
  questionId?: string;
  manifestId?: string;
}

/** A manual or inbound task record (collection ceo_tasks). */
export interface ManualTask {
  id: string;
  title: string;
  dept: string;
  due?: string;
  owner?: string;
  kind?: TaskKind;
  requiresHuman?: boolean;
  source?: 'manual' | 'inbound';
  notes?: string;
  agentId?: string;
  questionId?: string;
  manifestId?: string;
  deleted?: boolean;
  deleteReason?: string;
  signedBy?: string;
  signedAt?: string;
  at?: string;
}

/** A person's override of one task: done, or pinned to a time. Collection ceo_task_state. */
export interface TaskState {
  id: string;
  status?: 'open' | 'in_progress' | 'blocked' | 'done';
  scheduledStart?: string;
  minutes?: number;
  note?: string;
  at?: string;
}

/** A fixed calendar event the CEO entered (collection ceo_events). */
export interface CalEvent { id: string; title: string; start: string; end: string; deleted?: boolean }

export interface Block { id: string; taskId?: string; title: string; dept?: string; start: string; end: string; fixed: boolean; late?: boolean; reason?: string }

export type Light = 'green' | 'amber' | 'red' | 'none';
export interface DeptHealth {
  dept: string;
  name: string;
  light: Light;
  open: number;
  blocked: number;
  overdue: number;
  done: number;
  total: number;
  inReview: number;
  humanOpen: number;
  lastActivity?: string;
  reasons: string[];
}
