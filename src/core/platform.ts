import { newId, sha256Hex, canonical } from './crypto';
import { Ledger, type Sequencer } from './ledger';
import { Brain, type Fact } from './brain';
import { Warehouse, MemoryAdapter, type StorageAdapter, type Rec } from './warehouse';
import { Gateway, type Engine } from './gateway';
import { checkInput, checkOutput, runGates } from './guardrails/engine';
import type { AgentContract, RunContext } from './agent';
import type { Actor, Doc, LedgerEntry, Status } from './types';
import { deidentify, detectPii, LearnerDataRefused } from './guardrails/pii';
import { ERASURE_CATEGORIES, normalizeSubject, type ErasureCategory, type ErasureRequest } from './erasure';

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
  /** sha-256 of the document: every signature is bound to it. */
  docHash?: string;
  countersignedBy?: string;
  ratifiedAt?: string;
  ingestedAt?: string;
  /** Set on a revision: the ratified artefact it was copied from. */
  revisionOf?: string;
}

/** Autonomous actors are named `auto:<order>`. They can draft and submit, and can never approve, countersign or ratify. */
export const isAutonomous = (id: string) => id.startsWith('auto:');

/** A stored request without the warehouse's own bookkeeping (hash, storedAt) and its timestamp, ready to become the next version. */
const erasureFields = (r: ErasureRequest): Omit<ErasureRequest, 'at'> => ({ id: r.id, subjectHash: r.subjectHash, category: r.category, note: r.note, status: r.status, requestedBy: r.requestedBy, decidedBy: r.decidedBy, decisionNote: r.decisionNote, version: r.version });

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
  /** Called when the storage adapter refuses or loses a ledger/Brain record, which is otherwise written in the background. */
  onPersistError?: (e: Error) => void;
  /** When set, the server authors and stores every ledger entry; the platform does not write the ledger itself. */
  sequencer?: Sequencer;
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
  /** sha-256 of each erased subject id. The raw id is never stored. */
  private tombstoned = new Set<string>();
  private onPersistError: (e: Error) => void;
  private sequencer?: Sequencer;
  private persistTail: Promise<void> = Promise.resolve();

  constructor(o: PlatformOptions = {}) {
    this.orgId = o.orgId ?? 'infinite-ai';
    this.warehouse = new Warehouse(o.adapter ?? new MemoryAdapter());
    this.engine = o.engine;
    this.sequencer = o.sequencer;
    this.wire([], []);
    this.factsFn = o.facts ?? (() => ({}));
    this.knownNames = o.knownNames ?? [];
    this.onPersistError = o.onPersistError ?? ((e) => console.error('persist failed:', e.message));
  }

  /** (Re)build ledger, Brain and gateway over the warehouse so state survives a reload. */
  private wire(ledger: LedgerEntry[], facts: Fact[]) {
    const fail = (e: unknown) => this.onPersistError(e instanceof Error ? e : new Error(String(e)));
    // Background writes go out one at a time, in order.
    const queue = (collection: string, rec: Rec) => {
      this.persistTail = this.persistTail.then(() => this.warehouse.putRaw(collection, rec)).catch(fail);
    };
    this.ledger = new Ledger(ledger, this.sequencer ? undefined : (e) => queue('ledger', { ...e, id: `L${e.seq}` } as unknown as Rec), this.sequencer);
    this.brain = new Brain(this.ledger, this.orgId, facts, (f) => queue('brain', { ...f } as unknown as Rec));
    this.gateway = new Gateway(this.ledger, this.engine);
  }

  async init() {
    await this.warehouse.init();
    const ledger = this.warehouse.list<LedgerEntry>('ledger').map(({ id: _id, ...e }: LedgerEntry & { id?: string }) => e as LedgerEntry);
    const facts = this.warehouse.latest<Fact>('brain', 'id');
    this.wire(ledger, facts);
    this.tombstoned = new Set(this.warehouse.list<{ subjectHash: string }>('tombstones').map((t) => t.subjectHash));
    return this;
  }

  /** Resolves once every queued ledger/Brain write has been handed to the storage adapter. */
  flush(): Promise<void> {
    return this.persistTail;
  }

  /** Swap the model engine (undefined = the deterministic local engine). The gateway remains the only path. */
  useEngine(e?: Engine) {
    this.engine = e;
    this.gateway = new Gateway(this.ledger, e);
  }

  setFacts(fn: () => Record<string, string | number>) {
    this.factsFn = fn;
  }

  /** Erase a data subject: recorded in the warehouse and the ledger, so it survives a reload. Only a hash is kept. */
  async tombstone(subjectId: string, by: string) {
    const subjectHash = await sha256Hex(normalizeSubject(subjectId));
    if (this.tombstoned.has(subjectHash)) return;
    await this.warehouse.put('tombstones', { id: `ts_${subjectHash.slice(0, 16)}`, subjectHash, by });
    this.tombstoned.add(subjectHash);
    await this.ledger.append({ orgId: this.orgId, actor: by, action: 'subject.tombstone', subject: `ts_${subjectHash.slice(0, 16)}` });
  }

  // ---- erasure requests: one person asks, a different person decides, approval applies the tombstone ----

  /** Newest version of each request, newest first. */
  erasureRequests(): ErasureRequest[] {
    return this.warehouse.latest<ErasureRequest>('erasure_requests').sort((a, b) => b.at.localeCompare(a.at));
  }

  private erasureRequest(id: string): ErasureRequest {
    const r = this.erasureRequests().find((x) => x.id === id);
    if (!r) throw new RunRefused('erasure', 'Unknown erasure request.');
    return r;
  }

  private async saveErasure(next: Omit<ErasureRequest, 'at'>): Promise<ErasureRequest> {
    return this.warehouse.put('erasure_requests', { ...next, at: new Date().toISOString() }) as unknown as Promise<ErasureRequest>;
  }

  async requestErasure(subjectRef: string, category: ErasureCategory, note: string, requester: Actor): Promise<ErasureRequest> {
    if (requester.kind !== 'human') throw new RunRefused('erasure', 'Only a named human can raise an erasure request.');
    const ref = normalizeSubject(subjectRef);
    const n = note.trim();
    if (ref.length < 3 || ref.length > 100) throw new RunRefused('erasure', 'Enter the subject reference (3 to 100 characters).');
    if (!ERASURE_CATEGORIES.includes(category)) throw new RunRefused('erasure', 'Choose a reason category.');
    if (n.length > 200) throw new RunRefused('erasure', 'Keep the note to 200 characters.');
    if (category === 'other' && !n) throw new RunRefused('erasure', 'Explain "other" in the note.');
    // Requests are append-only and kept forever, so they must never carry the personal data being erased.
    if (detectPii(ref, this.knownNames).length || detectPii(n, this.knownNames).length) throw new RunRefused('pii', 'Use an opaque reference. The reference and note must not contain a name, email, phone number or ID number.');
    const subjectHash = await sha256Hex(ref);
    if (this.tombstoned.has(subjectHash)) throw new RunRefused('erasure', 'That subject has already been erased.');
    if (this.erasureRequests().some((r) => r.subjectHash === subjectHash && (r.status === 'REQUESTED' || r.status === 'APPROVED'))) throw new RunRefused('erasure', 'There is already an open erasure request for that subject.');
    const req = await this.saveErasure({ id: newId('er'), subjectHash, category, note: n, status: 'REQUESTED', requestedBy: requester.id, version: 1 });
    await this.ledger.append({ orgId: this.orgId, actor: requester.id, action: 'erasure.requested', subject: req.id, detail: { category } });
    return req;
  }

  /**
   * HITL. A second person decides. To approve, they retype the subject reference, which must hash to the request's:
   * that proves they know exactly who is being erased. The approval is recorded before the tombstone is applied.
   */
  async decideErasure(id: string, approver: Actor, decision: 'APPROVED' | 'REJECTED', note: string, subjectRef = ''): Promise<ErasureRequest> {
    if (approver.kind !== 'human') throw new RunRefused('hitl', 'Only a named human can decide an erasure request.');
    const cur = this.erasureRequest(id);
    if (cur.status !== 'REQUESTED') throw new RunRefused('hitl', 'Only a request that is waiting for a decision can be decided.');
    if (approver.id === cur.requestedBy) throw new RunRefused('hitl', 'A second person must decide an erasure request.');
    if (decision === 'REJECTED' && !note.trim()) throw new RunRefused('hitl', 'A rejection needs a reason.');
    if (decision === 'APPROVED') await this.assertReference(cur, subjectRef);
    const next = await this.saveErasure({ ...erasureFields(cur), status: decision, decidedBy: approver.id, decisionNote: note.trim(), version: cur.version + 1 });
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: 'erasure.' + decision.toLowerCase(), subject: id, detail: { note: note.trim() } });
    return decision === 'APPROVED' ? this.applyErasure(id, approver, subjectRef) : next;
  }

  /** Applies an approved erasure. Also the retry if applying failed after the approval was recorded; safe to repeat. */
  async applyErasure(id: string, by: Actor, subjectRef: string): Promise<ErasureRequest> {
    if (by.kind !== 'human') throw new RunRefused('hitl', 'Only a named human can apply an erasure.');
    const cur = this.erasureRequest(id);
    if (cur.status !== 'APPROVED') throw new RunRefused('hitl', 'Only an approved request can be applied.');
    await this.assertReference(cur, subjectRef);
    await this.tombstone(subjectRef, by.id);
    return this.saveErasure({ ...erasureFields(cur), status: 'EXECUTED', version: cur.version + 1 });
  }

  private async assertReference(req: ErasureRequest, subjectRef: string) {
    if ((await sha256Hex(normalizeSubject(subjectRef))) !== req.subjectHash) throw new RunRefused('erasure', 'That reference does not match this request.');
  }

  async runAgent(agent: AgentContract, rawInput: Record<string, string>, requester: Actor, opts: { subjectId?: string } = {}): Promise<Artefact> {
    const log = (action: string, subject: string, detail: Record<string, unknown> = {}) => this.ledger.append({ orgId: this.orgId, actor: requester.id, action, subject, detail });

    // 1. gates: tombstone → purpose → lawful basis
    const gate = runGates({ subjectId: opts.subjectId ? await sha256Hex(normalizeSubject(opts.subjectId)) : undefined, tombstoned: this.tombstoned, purpose: agent.purpose, allowedPurposes: agent.allowedPurposes, dataClass: agent.dataClass, lawfulBasis: agent.lawfulBasis });
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
    if (cur.status === 'RATIFIED' || cur.status === 'INGESTED') throw new RunRefused('hitl', 'A ratified artefact is final. Start a revision instead.');
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
    if (approver.kind !== 'human' || isAutonomous(approver.id)) throw new RunRefused('hitl', 'Only a named human can approve or reject.');
    if (cur.status !== 'IN_REVIEW') throw new RunRefused('hitl', 'Artefact must be submitted for review first.');
    if (agent?.secondApprover && approver.id === cur.requestedBy) throw new RunRefused('hitl', 'This agent requires a second person to approve.');
    if (decision === 'REJECTED' && !note.trim()) throw new RunRefused('hitl', 'A rejection needs a reason.');
    const next: Artefact = { ...cur, id: artefactId, status: decision, approvedBy: approver.id, note, at: new Date().toISOString() };
    await this.warehouse.put('artefact_versions', { ...next, editedBy: approver.id });
    await this.warehouse.put('approvals', { id: newId('apr'), artefactId, decision, approver: approver.id, note, at: next.at });
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: 'hitl.' + decision.toLowerCase(), subject: artefactId, detail: { note } });
    return next;
  }

  /**
   * Second signature. A different human from the approver countersigns the exact content that was approved; that
   * ratifies it, and then (unless the agent's contract says it is not relevant) it is ingested.
   */
  async countersign(artefactId: string, signer: Actor, note: string, agent?: AgentContract): Promise<Artefact> {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error('Unknown artefact.');
    if (signer.kind !== 'human' || isAutonomous(signer.id)) throw new RunRefused('hitl', 'Only a named human can countersign.');
    if (cur.status !== 'APPROVED') throw new RunRefused('hitl', 'Only an approved artefact can be countersigned.');
    if (signer.id === cur.approvedBy) throw new RunRefused('hitl', 'A different person from the approver must countersign.');
    const n = (note ?? '').trim();
    if (n.length > 300) throw new RunRefused('hitl', 'Keep the countersignature note to 300 characters.');
    const docHash = cur.docHash ?? (await sha256Hex(canonical(cur.doc)));
    const at = new Date().toISOString();
    const next: Artefact = { ...cur, id: artefactId, docHash, status: 'RATIFIED', countersignedBy: signer.id, ratifiedAt: at, at };
    await this.warehouse.put('artefact_versions', { ...next, editedBy: signer.id });
    await this.warehouse.put('countersignatures', { id: newId('sig'), artefactId, version: cur.version, docHash, signer: signer.id, note: n, at });
    await this.ledger.append({ orgId: this.orgId, actor: signer.id, action: 'artefact.countersigned', subject: artefactId, detail: { note: n, docHash, approvedBy: cur.approvedBy } });
    await this.ledger.append({ orgId: this.orgId, actor: signer.id, action: 'artefact.ratified', subject: artefactId, detail: { docHash, approvedBy: cur.approvedBy, countersignedBy: signer.id } });
    if (agent?.ingestion === 'none') return next;
    return this.ingest(artefactId, signer);
  }

  /** Ratified output goes into the document library (exact content) and the Brain (an episode). Safe to repeat if it failed part-way. */
  async ingest(artefactId: string, by: Actor): Promise<Artefact> {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error('Unknown artefact.');
    if (by.kind !== 'human' || isAutonomous(by.id)) throw new RunRefused('hitl', 'Only a named human can ingest.');
    if (cur.status === 'INGESTED') return cur;
    if (cur.status !== 'RATIFIED') throw new RunRefused('hitl', 'Only a ratified artefact can be ingested.');
    const docHash = cur.docHash ?? (await sha256Hex(canonical(cur.doc)));
    const at = new Date().toISOString();
    const docId = `rat_${artefactId}_v${cur.version}`;
    if (!this.warehouse.list('documents', (r) => r['id'] === docId).length) {
      await this.warehouse.put('documents', { id: docId, title: cur.title, origin: 'ratified', doc: cur.doc, scan: { scanned: true, notes: ['Ratified artefact: approved and countersigned.'] }, dept: cur.dept, by: by.id, at, ratifiedFrom: { artefactId, version: cur.version, docHash, agentId: cur.agentId, approvedBy: cur.approvedBy, countersignedBy: cur.countersignedBy } });
    }
    const src = `artefact:${artefactId}@${docHash.slice(0, 12)}`;
    if (!this.brain.all.some((f) => f.provenance.sources.includes(src))) {
      const d = deidentify(`Ratified: ${cur.title} (version ${cur.version}), approved by ${cur.approvedBy} and countersigned by ${cur.countersignedBy}.`, [src], this.knownNames);
      await this.brain.remember({ tier: 'L2', topic: `ratified.${cur.agentId}`, text: d.text, provenance: d.provenance, by: by.id });
    }
    const next: Artefact = { ...cur, id: artefactId, docHash, status: 'INGESTED', ingestedAt: at, at };
    await this.warehouse.put('artefact_versions', { ...next, editedBy: by.id });
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: 'artefact.ingested', subject: artefactId, detail: { docId, docHash } });
    return next;
  }

  /** A ratified artefact is final. Changing it means a new artefact, copied as a draft, that goes through the whole board again. */
  async revise(artefactId: string, by: Actor): Promise<Artefact> {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error('Unknown artefact.');
    if (by.kind !== 'human' || isAutonomous(by.id)) throw new RunRefused('hitl', 'Only a named human can start a revision.');
    if (cur.status !== 'RATIFIED' && cur.status !== 'INGESTED') throw new RunRefused('hitl', 'Only a ratified artefact needs a revision; a draft can be edited directly.');
    const doc = JSON.parse(JSON.stringify(cur.doc)) as Doc;
    doc.meta = { ...doc.meta, status: 'DRAFT', revisionOf: artefactId };
    const art: Artefact = { id: newId('art'), orgId: cur.orgId, agentId: cur.agentId, dept: cur.dept, title: cur.title, status: 'DRAFT', version: 1, requestedBy: by.id, formats: cur.formats, doc, flags: [], engine: cur.engine, at: new Date().toISOString(), revisionOf: artefactId };
    await this.saveVersion(art, by.id);
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: 'artefact.revise', subject: art.id, detail: { of: artefactId } });
    return this.artefact(art.id)!;
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
