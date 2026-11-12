import { agentById } from '../../departments';
import { detectPii } from '../../core/guardrails/pii';
import { detectInjection } from '../../core/guardrails/injection';
import { parseTrigger, TriggerInvalid, type Trigger } from './schedule';

export type OrderStatus = 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'REVOKED';

/**
 * A standing order is the only way an agent may run without a person starting it. A person proposes it, a different person
 * activates it, and it fixes the agent, the trigger, the inputs and the run budget. It can only ever produce drafts.
 */
export interface StandingOrder {
  id: string;
  name: string;
  agentId: string;
  trigger: Trigger;
  /** Fixed text typed by a person and checked once. Nothing from a trigger is ever put into a prompt. */
  inputs: Record<string, string>;
  maxRunsPerDay: number;
  status: OrderStatus;
  proposedBy: string;
  activatedBy?: string;
  statusNote?: string;
  version: number;
  at: string;
}

export const MAX_RUNS_PER_DAY_CEILING = 5;

export class OrderRefused extends Error {
  constructor(public readonly status: number, message: string, public readonly checks?: unknown) {
    super(message);
  }
}

export interface Proposal { name: string; agentId: string; trigger: Trigger; inputs: Record<string, string>; maxRunsPerDay: number }

/** Refuses anything an order must not contain. Messages say which field and why, never repeat the offending text. */
export function parseProposal(body: unknown): Proposal {
  if (typeof body !== 'object' || body === null || Array.isArray(body)) throw new OrderRefused(400, 'the order must be an object');
  const b = body as Record<string, unknown>;
  const name = typeof b.name === 'string' ? b.name.trim() : '';
  if (name.length < 3 || name.length > 80) throw new OrderRefused(400, 'the name must be 3 to 80 characters');
  if (detectPii(name).length) throw new OrderRefused(422, 'the name must not contain personal data');
  const agent = typeof b.agentId === 'string' ? agentById(b.agentId) : undefined;
  if (!agent) throw new OrderRefused(404, 'unknown agent');
  if (agent.dataClass === 'learner') throw new OrderRefused(422, 'this agent handles learner data, which is never admitted');
  if (agent.requiresApproval !== true) throw new OrderRefused(422, 'this agent does not require approval, so it cannot run autonomously');
  let trigger: Trigger;
  try {
    trigger = parseTrigger(b.trigger);
  } catch (e) {
    if (e instanceof TriggerInvalid) throw new OrderRefused(400, e.message);
    throw e;
  }
  const given = typeof b.inputs === 'object' && b.inputs !== null && !Array.isArray(b.inputs) ? (b.inputs as Record<string, unknown>) : {};
  const unknown = Object.keys(given).filter((k) => !agent.inputs.some((i) => i.key === k));
  if (unknown.length) throw new OrderRefused(400, `unknown input(s): ${unknown.join(', ')}`);
  const inputs: Record<string, string> = {};
  for (const f of agent.inputs) {
    const v = given[f.key];
    if (v === undefined || v === '') {
      if (f.required) throw new OrderRefused(400, `the input "${f.label}" is required`);
      continue;
    }
    if (typeof v !== 'string' || v.length > 1000) throw new OrderRefused(400, `the input "${f.label}" must be text of at most 1000 characters`);
    if (f.kind === 'number' && !Number.isFinite(Number(v.replace(/[,\s]/g, '')))) throw new OrderRefused(400, `the input "${f.label}" must be a number`);
    if (f.kind === 'select' && !(f.options ?? []).includes(v)) throw new OrderRefused(400, `the input "${f.label}" must be one of its options`);
    if (detectPii(v).some((x) => x.kind === 'learner_identifier')) throw new OrderRefused(422, `the input "${f.label}" contains a learner identifier, which is never admitted`);
    if (detectPii(v).length) throw new OrderRefused(422, `the input "${f.label}" contains personal data`);
    if (detectInjection(v).length) throw new OrderRefused(422, `the input "${f.label}" looks like an attempt to override platform controls`);
    inputs[f.key] = v;
  }
  const runs = b.maxRunsPerDay === undefined ? 1 : b.maxRunsPerDay;
  if (typeof runs !== 'number' || !Number.isInteger(runs) || runs < 1 || runs > MAX_RUNS_PER_DAY_CEILING) throw new OrderRefused(400, `maxRunsPerDay must be a whole number from 1 to ${MAX_RUNS_PER_DAY_CEILING}`);
  return { name, agentId: agent.id, trigger, inputs, maxRunsPerDay: runs };
}
