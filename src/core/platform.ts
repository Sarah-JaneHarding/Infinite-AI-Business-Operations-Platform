import { newId, sha256Hex, canonical } from './crypto';
import { Ledger } from './ledger';
import { Brain, type Fact } from './brain';
import { Warehouse, MemoryAdapter, type StorageAdapter, type Rec } from './warehouse';
import { Gateway, type Engine } from './gateway';
import { checkInput, checkOutput, runGates } from './guardrails/engine';
import type { AgentContract, RunContext } from './agent';
import type { Actor, Doc, LedgerEntry, Status } from './types';
import { deidentify, LearnerDataRefused } from './guardrails/pii';

export interface Artefact {
  id: string;
  orgId: string;
  agentId: string;
  dept: string;
  title: string;
  status: Status;
  version: number;
  requestedBy: string;
  formats: string[];
  doc: Doc;
  flags: string[];
  engine: string;
  at: string;
  approvedBy?: string;
  note?: string;
}

export class RunRefused extends Error {
  constructor(public readonly kind: string, message: string) {
    super(message);
  }
}

export interface PlatformOptions {
  orgId?: string;
  adapter?: StorageAdapter;
  engine?: Engine;
  /** Real facts available to every run (connector snapshot etc.). */
  facts?: () => Record<string, string | number>;
  knownNames?: string[];
}

/** One object wiring departments → guardrails → brain → gateway → warehouse → ledger → HITL → learning. */
export class Platform {
  readonly orgId: string;
  ledger!: Ledger;
  brain!: Brain;
  readonly warehouse: Warehouse;
  gateway!: Gateway;
  private engine?: Engine;
  private factsFn: () => Record<string, string | number>;
  private knownNames: string[];
  private tombstoned = new Set<string>();

  constructor(o: PlatformOptions = {}) {
    this.orgId = o.orgId ?? 'infinite-ai';
    this.warehouse = new Warehouse(o.adapter ?? new MemoryAdapter());
    this.engine = o.engine;
    this.wire([], []);
    this.factsFn = o.facts ?? (() => ({}));
    this.knownNames = o.knownNames ?? [];
  }

  /** (Re)build ledger, Brain and gateway over the warehouse so state survives a reload. */
  private wire(ledger: LedgerEntry[], facts: Fact[]) {
    this.ledger = new Ledger(ledger, (e) => void this.warehouse.putRaw('ledger', { ...e, id: `L${e.seq}` } as unknown as Rec));
    this.brain = new Brain(this.ledger, this.orgId, facts, (f) => void this.warehouse.putRaw('brain', { ...f } as unknown as Rec));
    this.gateway = new Gateway(this.ledger, this.engine);
  }

  async init() {
    await this.warehouse.init();
    const ledger = this.warehouse.list<LedgerEntry>('ledger').map(({ id: _id, ...e }: LedgerEntry & { id?: string }) => e as LedgerEntry);
    const facts = this.warehouse.latest<Fact>('brain', 'id');
    this.wire(ledger, facts);
    return this;
  }

  /** Swap the model engine (undefined = the deterministic local engine). The gateway remains the only path. */
  useEngine(e?: Engine) {
    this.engine = e;
    this.gateway = new Gateway(this.ledger, e);
  }

  setFacts(fn: () => Record<string, string | number>) {
    this.factsFn = fn;
  }

  tombstone(subjectId: string) {
    this.tombstoned.add(subjectId);
  }

  async runAgent(agent: AgentContract, rawInput: Record<string, string>, requester: Actor, opts: { subjectId?: string } = {}): Promise<Artefact> {
    const log = (action: string, subject: string, detail: Record<string, unknown> = {}) => this.ledger.append({ orgId: this.orgId, actor: requester.id, action, subject, detail });

    // 1. gates: tombstone → purpose → lawful basis
    const gate = runGates({ subjectId: opts.subjectId, tombstoned: this.tombstoned, purpose: agent.purpose, allowedPurposes: agent.allowedPurposes, dataClass: agent.dataClass, lawfulBasis: agent.lawfulBasis });
    if (gate) {
      await log('run.refused', agent.id, { gate: gate.gate });
      throw new RunRefused(gate.gate, gate.reason);
    }
    for (const f of agent.inputs.filter((i) => i.required)) {
      if (!rawInput[f.key]?.trim()) throw new RunRefused('input', `Missing required input: ${f.label}`);
    }

    // 2. input guardrails: injection → learner data → de-identify
    const cleanInput: Record<string, string> = {};
    const inputNumbers: number[] = [];
    let promptChars = 0;
    for (const [k, v] of Object.entries(rawInput)) {
      const field = agent.inputs.find((i) => i.key === k);
      if (!field) continue;
      const verdict = checkInput(v, ['user-input'], this.knownNames);
      if (!verdict.ok) {
        await log('run.refused', agent.id, { reason: verdict.refusal, field: k });
        throw new RunRefused(verdict.refusal, verdict.refusal === 'injection' ? 'Input looks like an attempt to override platform controls.' : 'Learner-level identifiers are never admitted. Remove them and retry.');
      }
      cleanInput[k] = verdict.clean.text;
      promptChars += verdict.clean.text.length;
      if (field.kind === 'number') {
        const n = Number(v.replace(/[,\s]/g, ''));
        if (!Number.isNaN(n)) inputNumbers.push(n);
      } else for (const m of v.matchAll(/\d[\d,]*(?:\.\d+)?/g)) inputNumbers.push(Number(m[0].replace(/,/g, '')));
    }
    if (promptChars > agent.budget.maxPromptChars) throw new RunRefused('budget', `Input exceeds the agent's budget (${agent.budget.maxPromptChars} characters).`);

    // 3. brain.recall (ratified facts only)
    const brain = this.brain.recall(['L0', ...agent.reads]).map((f) => ({ id: f.id, topic: f.topic, text: f.text }));
    const facts = this.factsFn();
    const ctx: RunContext = { facts, input: cleanInput, inputNumbers, brain };

    // 4. build the structured draft from real facts + human input
    let doc = agent.build(ctx);

    // 5. gateway narrative (the only model path). Facts are de-identified before they leave this function.
    let engineName = this.gateway.engineName;
    const nf = agent.narrativeFacts?.(ctx);
    if (nf) {
      const prompt = `Summarise for a South African education-company operations reader. Do not add numbers or facts not listed.\n${Object.entries(nf).map(([k, v]) => `${k}: ${v}`).join('\n')}`;
      const d = deidentify(prompt, ['agent:' + agent.id, ...Object.keys(facts).slice(0, 0)], this.knownNames);
      const res = await this.gateway.complete({ orgId: this.orgId, agentId: agent.id, purpose: agent.purpose, system: 'You draft. A human decides. Never invent numbers.', prompt: d.text, provenance: d.provenance, context: nf });
      engineName = res.engine;
      doc = { ...doc, blocks: [...doc.blocks, { type: 'h', level: 2, text: 'Narrative (AI draft)' }, { type: 'p', text: res.text }] };
    }

    // 6. output guardrails (claim sourcing + PII echo) over every text-bearing block
    // Only numbers the human typed, or numbers carrying an explicit [src:…] tag, survive. Fact values are NOT
    // blanket-allowed: a coincidental match must not let an invented figure through.
    const allowed = [...inputNumbers];
    const flags: string[] = [];
    const guard = (s: string) => {
      const o = checkOutput(s, allowed, this.knownNames);
      flags.push(...o.flags);
      return o.text;
    };
    const blocks = doc.blocks.map((b) => ({
      ...b,
      text: b.text !== undefined ? guard(b.text) : undefined,
      items: b.items?.map(guard),
      rows: b.rows?.map((r) => r.map((c) => (typeof c === 'string' ? guard(c) : c))),
      pairs: b.pairs?.map(([k, v]) => [k, guard(v)] as [string, string]),
    }));
    doc = { ...doc, title: guard(doc.title), blocks: blocks.map((b) => JSON.parse(JSON.stringify(b))), meta: { ...doc.meta, agent: agent.id, version: agent.version, framework: agent.framework, engine: engineName, status: 'DRAFT', purpose: agent.purpose } };

    // 7. artefact DRAFT → warehouse, ledger
    const art: Artefact = { id: newId('art'), orgId: this.orgId, agentId: agent.id, dept: agent.dept, title: doc.title, status: 'DRAFT', version: 1, requestedBy: requester.id, formats: agent.formats, doc, flags: [...new Set(flags)], engine: engineName, at: new Date().toISOString() };
    await this.saveVersion(art, requester.id);
    await this.warehouse.put('runs', { id: newId('run'), agentId: agent.id, artefactId: art.id, requester: requester.id, flags: art.flags, engine: engineName, at: art.at });
    await log('run.complete', art.id, { agent: agent.id, flags: art.flags, status: 'DRAFT' });
    return art;
  }

  private async saveVersion(a: Artefact, by: string) {
    const docHash = await sha256Hex(canonical(a.doc));
    await this.warehouse.put('artefact_versions', { ...a, docHash, editedBy: by });
  }

  /** Newest record per artefact (every state change and edit is a new immutable record). */
  artefacts(): Artefact[] {
    return this.warehouse.latest<Artefact>('artefact_versions', 'id').sort((x, y) => y.at.localeCompare(x.at));
  }

  artefact(id: string): Artefact | undefined {
    return this.artefacts().find((a) => a.id === id);
  }

  history(id: string): Artefact[] {
    return this.warehouse.list<Artefact>('artefact_versions', (r) => r['id'] === id);
  }

  /** Human edit → new version (status returns to DRAFT) + learning proposal. */
  async edit(artefactId: string, doc: Doc, editor: Actor): Promise<Artefact> {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error('Unknown artefact.');
    if (editor.kind !== 'human') throw new Error('Only a human can edit an artefact.');
    const clean = JSON.parse(JSON.stringify(doc)) as Doc;
    const next: Artefact = { ...cur, id: artefactId, doc: clean, title: clean.title, version: cur.version + 1, status: 'DRAFT', approvedBy: undefined, at: new Date().toISOString() };
    // learner identifiers can never be saved via an edit either
    try {
      deidentify(JSON.stringify(clean), ['edit']);
    } catch (e) {
      if (e instanceof LearnerDataRefused) throw new RunRefused('learner_data', 'Learner-level identifiers cannot be saved.');
      throw e;
    }
    await this.saveVersion(next, editor.id);
    await this.ledger.append({ orgId: this.orgId, actor: editor.id, action: 'artefact.edit', subject: artefactId, detail: { version: next.version } });
    await this.captureLearning(cur.doc, clean, cur.agentId, editor.id, artefactId);
    return next;
  }

  async submitForReview(artefactId: string, by: Actor) {
    const cur = this.artefact(artefactId);
    if (!cur || cur.status !== 'DRAFT') throw new Error('Only a DRAFT can be submitted.');
    const next: Artefact = { ...cur, id: artefactId, status: 'IN_REVIEW', version: cur.version, at: new Date().toISOString() };
    await this.warehouse.put('artefact_versions', { ...next, editedBy: by.id });
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: 'artefact.submit', subject: artefactId });
    return next;
  }

  /** HITL. No agent, no self-approval where the contract demands a second person, no skip flag. */
  async decide(artefactId: string, approver: Actor, decision: 'APPROVED' | 'REJECTED', note: string, agent?: AgentContract) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error('Unknown artefact.');
    if (approver.kind !== 'human') throw new RunRefused('hitl', 'Only a named human can approve or reject.');
    if (cur.status !== 'IN_REVIEW') throw new RunRefused('hitl', 'Artefact must be submitted for review first.');
    if (agent?.secondApprover && approver.id === cur.requestedBy) throw new RunRefused('hitl', 'This agent requires a second person to approve.');
    if (decision === 'REJECTED' && !note.trim()) throw new RunRefused('hitl', 'A rejection needs a reason.');
    const next: Artefact = { ...cur, id: artefactId, status: decision, approvedBy: approver.id, note, at: new Date().toISOString() };
    await this.warehouse.put('artefact_versions', { ...next, editedBy: approver.id });
    await this.warehouse.put('approvals', { id: newId('apr'), artefactId, decision, approver: approver.id, note, at: next.at });
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: 'hitl.' + decision.toLowerCase(), subject: artefactId, detail: { note } });
    return next;
  }

  /** Learning engine: proposals only. A human must ratify before it enters the Brain (L3/L4). */
  private async captureLearning(before: Doc, after: Doc, agentId: string, by: string, artefactId: string) {
    const was = before.blocks.map((b) => b.text ?? '').filter(Boolean);
    const now = after.blocks.map((b) => b.text ?? '').filter(Boolean);
    const changed = now.filter((t) => !was.includes(t));
    if (!changed.length) return;
    try {
      const d = deidentify(changed.slice(0, 5).join('\n'), ['human-edit:' + artefactId]);
      await this.brain.remember({ tier: 'L4', topic: `learning.${agentId}`, text: `Human edited ${changed.length} block(s). Sample: ${d.text.slice(0, 280)}`, provenance: d.provenance, by });
    } catch {
      /* never let learning capture break an edit */
    }
  }
}
