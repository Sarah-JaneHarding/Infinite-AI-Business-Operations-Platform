import { checkTaskText } from '../core/ceo/guard';
import type { Rec } from '../core/warehouse';
import { currentQuestions, type QStore } from './ingest';
import { routeQuestion } from './routing';
import type { AgentTaskProposal, Decision, Question } from './types';

export class DecisionRefused extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
const refuse = (m: string, status = 400): never => { throw new DecisionRefused(status, m); };

export const MAX_TEXT = 2000;
export const MIN_REASON = 10;
/** Only these can still be answered. An answered question already has a decision; a resolved or parked one is reopened in the markdown, not here. */
export const ANSWERABLE = ['open', 'partial', 'followup'] as const;

export interface DecisionInput { optionIndex?: number; text?: string; reason?: string }
export interface Checked { choice: string; text: string; reason: string; departs: boolean }

/** Pure: what a person typed, checked against the question. The same text gate as task text applies (no ID numbers, no instructions aimed at the platform). */
export function checkDecision(q: Question, body: unknown): Checked {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) return refuse('body must be an object');
  const b = body as Record<string, unknown>;
  const extra = Object.keys(b).filter((k) => !['optionIndex', 'text', 'reason'].includes(k));
  if (extra.length) return refuse(`unknown field: ${extra[0]}`);
  const text = typeof b.text === 'string' ? b.text.trim() : '';
  const reason = typeof b.reason === 'string' ? b.reason.trim() : '';
  if (text.length > MAX_TEXT || reason.length > MAX_TEXT) return refuse(`text and reason are limited to ${MAX_TEXT} characters`);
  const options = q.options ?? [];
  let choice = '';
  if (options.length) {
    const i = b.optionIndex;
    if (typeof i !== 'number' || !Number.isInteger(i) || i < 0 || i >= options.length) return refuse('choose one of the listed options');
    choice = options[i];
  } else {
    if (b.optionIndex !== undefined) return refuse('this question has no options');
    if (text.length < 10) return refuse('write your answer (at least 10 characters)');
  }
  const departs = typeof q.recommendedIndex === 'number' && options.length > 0 && options[q.recommendedIndex] !== choice;
  if (departs && reason.length < MIN_REASON) return refuse(`a reason is required (at least ${MIN_REASON} characters) because this departs from the recommendation`);
  const gate = checkTaskText(choice, text, reason);
  if (gate) return refuse(gate);
  return { choice, text, reason, departs };
}

export interface DecideDeps {
  store: QStore;
  /** The validated, serialised warehouse write (server.ts `appendValidated`). */
  appendValidated(collection: string, rec: Rec, actor: string): Promise<void>;
  /** The server-authored ledger entry. */
  ledger(action: string, subject: string, detail: Record<string, unknown>, actor: string): Promise<void>;
  now?(): Date;
}

const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-');

/**
 * Records a decision and everything it creates, in this order: the decision, the task for the accountable department,
 * a proposal for each relevant agent, the question's new state, the ledger entry. Everything is append-only.
 * A signed-in person is required. The agents only receive a proposal: a run still needs an active standing order that a different person activated.
 */
export async function recordDecision(d: DecideDeps, actor: string | null, qid: string, body: unknown): Promise<Decision> {
  if (!actor) return refuse('Deciding needs a signed-in person (set OPS_USERS).', 403);
  const q = currentQuestions(d.store).find((x) => x.id === qid);
  if (!q) return refuse('unknown question', 404);
  if (!(ANSWERABLE as readonly string[]).includes(q.status)) return refuse(`${qid} is ${q.status}, so it cannot be answered here`, 409);
  const c = checkDecision(q, body);
  const at = (d.now?.() ?? new Date()).toISOString();
  const routing = routeQuestion(q);
  const n = d.store.list('oq_decisions').filter((r) => r.qid === qid).length + 1;
  const id = `dec_${slug(qid)}_${n}`;
  const ceoTaskId = `oq_${slug(qid)}_${n}`;
  const detail = [c.choice && `Decision: ${c.choice}`, c.text && `Answer: ${c.text}`, c.reason && `Reason: ${c.reason}`].filter(Boolean).join('\n');
  const agentTasks: AgentTaskProposal[] = routing.agents.map((agentId) => ({
    id: `oqa_${slug(qid)}_${n}_${agentId.toLowerCase()}`, qid, decisionId: id, agentId, dept: routing.dept, status: 'PROPOSED', at,
    brief: `Prepare the follow-up for ${qid} (${q.title}) as a draft for a person to review. ${detail}`.slice(0, 1500),
  }));
  const decision: Decision = { id, qid, repo: q.repo, choice: c.choice, text: c.text, reason: c.reason, departs: c.departs, by: actor, at, routing, ceoTaskId, agentTaskIds: agentTasks.map((t) => t.id) };

  d.store.append('oq_decisions', decision as unknown as Rec);
  await d.appendValidated('ceo_tasks', {
    id: ceoTaskId, title: `Carry out ${qid}: ${q.title}`.slice(0, 200), dept: routing.dept, kind: 'action', requiresHuman: true, source: 'manual', at,
    notes: `${detail}\nRouted to ${routing.dept}: ${routing.why}. Repository: ${q.repo}. A draft pull request records the decision.`.slice(0, 1000),
  } as unknown as Rec, actor);
  for (const t of agentTasks) d.store.append('oq_agent_tasks', t as unknown as Rec);
  d.store.append('oq_questions', { ...q, status: 'answered', decisionId: id } as unknown as Rec);
  await d.ledger('oq.decided', qid, { decisionId: id, departs: c.departs, dept: routing.dept, repo: q.repo }, actor);
  return decision;
}
