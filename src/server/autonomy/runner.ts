import { Platform } from '../../core/platform';
import { MemoryAdapter, type Rec, type StorageAdapter } from '../../core/warehouse';
import type { Engine } from '../../core/gateway';
import { agentById } from '../../departments';
import { appendLedger, type LedgerStore } from '../ledgerService';
import { runAcceptance, type Acceptance } from '../../core/acceptance';
import { canonical, newId, sha256Hex } from '../../core/crypto';
import type { Actor } from '../../core/types';
import type { ModelHub } from '../models/hub';
import type { Proposal, StandingOrder } from './orders';

export interface RunnerStore extends LedgerStore { load(): Record<string, readonly Rec[]> }
export type RunVia = { kind: 'schedule'; slot: string } | { kind: 'event'; event: string } | { kind: 'request'; by: string };
export interface RunOutcome {
  outcome: 'submitted' | 'quarantined';
  artefactId: string;
  checks: Acceptance['results'];
  flags: string[];
}

export interface RunnerDeps {
  store: RunnerStore;
  /** The same validated, serialised write path a client write takes. */
  appendValidated: (collection: string, rec: Rec, actor: string) => Promise<void>;
  hub?: Pick<ModelHub, 'anyReady' | 'complete'>;
  facts: () => Record<string, string | number>;
  /** Tests inject an engine; otherwise the model hub is used when a provider is ready. */
  engineFor?: (actorId: string) => Engine | undefined;
}

/** Narrative text goes through the model hub like every other model call, so all ten rules apply to autonomous runs too. */
const hubEngine = (hub: Pick<ModelHub, 'complete'>, actor: string): Engine => ({
  name: 'model-hub',
  async complete(req) {
    return (await hub.complete({ system: req.system, prompt: req.prompt, purpose: req.purpose, provenance: req.provenance, actor, agent: agentById(req.agentId) })).text;
  },
});

export function makeRunner(deps: RunnerDeps) {
  const requesterFor = (id: string, name: string): Actor => ({ id: `auto:${id}`, name: `Autonomous: ${name}`, kind: 'agent', roles: ['autonomous'] });

  /** Runs an active order once. Produces a draft, tests it, and sends it to review only if it passes. It never signs anything. */
  async function run(order: StandingOrder, via: RunVia): Promise<RunOutcome> {
    const agent = agentById(order.agentId);
    if (!agent) throw new Error(`agent ${order.agentId} is no longer registered`);
    const requester = requesterFor(order.id, order.name);
    const engine = deps.engineFor?.(requester.id) ?? (deps.hub?.anyReady() ? hubEngine(deps.hub, requester.id) : undefined);
    const adapter: StorageAdapter = {
      load: async () => Object.fromEntries(Object.entries(deps.store.load()).map(([k, v]) => [k, [...v]])),
      append: (c, rec) => deps.appendValidated(c, rec, requester.id),
    };
    const platform = await new Platform({ adapter, facts: deps.facts, engine, sequencer: (input, known) => appendLedger(deps.store, input, known, requester.id) }).init();
    const art = await platform.runAgent(agent, order.inputs, requester, { meta: { order: order.id, trigger: via.kind } });
    const acc = runAcceptance({ doc: art.doc, agentId: art.agentId, flags: art.flags, requestedBy: requester.id }, agent);
    const docHash = art.docHash ?? (await sha256Hex(canonical(art.doc)));
    deps.store.append('draft_checks', { id: newId('chk'), artefactId: art.id, docHash, orderId: order.id, passed: acc.passed, results: acc.results, at: new Date().toISOString() });
    if (!acc.passed) {
      await platform.flush();
      return { outcome: 'quarantined', artefactId: art.id, checks: acc.results, flags: art.flags };
    }
    await platform.submitForReview(art.id, requester);
    await platform.flush();
    return { outcome: 'submitted', artefactId: art.id, checks: acc.results, flags: art.flags };
  }

  /**
   * A proposed order is tried once before anyone can activate it: the agent runs on its fixed inputs in memory (nothing is
   * stored, no model is called) and the draft has to pass the acceptance suite. A bad order is refused when it is proposed.
   */
  async function dryRun(p: Proposal): Promise<Acceptance> {
    const agent = agentById(p.agentId);
    const requester = requesterFor('dryrun', p.name);
    if (!agent) return { passed: false, results: [{ id: 'RUN', title: 'The agent runs on these inputs', pass: false, detail: 'unknown agent' }] };
    try {
      const platform = await new Platform({ adapter: new MemoryAdapter(), facts: deps.facts }).init();
      const art = await platform.runAgent(agent, p.inputs, requester, { meta: { order: 'dryrun', trigger: 'dry-run' } });
      return runAcceptance({ doc: art.doc, agentId: art.agentId, flags: art.flags, requestedBy: requester.id }, agent);
    } catch (e) {
      return { passed: false, results: [{ id: 'RUN', title: 'The agent runs on these inputs', pass: false, detail: (e as Error).message.slice(0, 200) }] };
    }
  }

  return { run, dryRun };
}
export type Runner = ReturnType<typeof makeRunner>;
