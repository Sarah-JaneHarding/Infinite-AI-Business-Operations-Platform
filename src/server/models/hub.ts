import { createHash } from 'node:crypto';
import type { Purpose } from '../../core/types';
import type { AgentContract } from '../../core/agent';
import { deidentify, detectPii, LearnerDataRefused } from '../../core/guardrails/pii';
import { newId } from '../../core/crypto';
import { RateLimiter } from '../rate';
import { appendLedger, type LedgerStore } from '../ledgerService';
import type { Rec } from '../../core/warehouse';
import { LIMITS, ModelRefused, checkModelOutput, checkRequest, checkToolResult, RULES, type ModelRequest, type RuleId } from './rules';
import { ADAPTERS, SETUP, readOrder, readProviders, ProviderError, type ChatMessage, type ProviderConfig, type ProviderId, type ToolCall, type ToolResult } from './providers';
import { TOOLS, TOOL_NAMES, executeTool, readReadable } from './tools';
import { fallbackCopilot, getDeterministicRecommendations, type AgentRecommendationResult, type ToolInvocationRecord } from './local';

export interface HubStore extends LedgerStore { load(): Record<string, readonly Rec[]> }
export interface HubOptions {
  env: Record<string, string | undefined>;
  store: HubStore;
  fetchImpl?: typeof fetch;
  limiter?: RateLimiter;
}

export interface ModelResult {
  text: string;
  /** Always true. Nothing in this module can approve, ratify or ingest model output (rule M8). */
  draft: true;
  provider: ProviderId | 'local';
  model: string;
  flags: string[];
  toolInvocations: ToolInvocationRecord[];
  usage: { inputTokens: number; outputTokens: number };
}

export type ProviderState = 'not_configured' | 'needs_attestation' | 'reattest' | 'ready';
export interface ProviderStatus {
  id: ProviderId;
  label: string;
  state: ProviderState;
  configured: boolean;
  model: string;
  keyEnv: string;
  modelEnv: string;
  attestation: { by: string; at: string; note: string; model: string } | null;
  lastTest: { ok: boolean; at: string; ms: number; error?: string } | null;
  callsToday: number;
  setup: { where: string; url: string; steps: string[]; envExample: string[] };
}

/** Unavailable is not a refusal by a rule: every ready provider failed. */
export class ModelUnavailable extends Error {
  readonly status = 502;
}

const sha = (s: string) => createHash('sha256').update(s).digest('hex');
const today = (iso: string) => iso.slice(0, 10);

export class ModelHub {
  private providers: ProviderConfig[];
  private order: ProviderId[];
  private readable: ReadonlySet<string>;
  private dailyBudget: number;
  private limiter: RateLimiter;
  private fetchImpl: typeof fetch;
  private store: HubStore;

  /** Throws on a bad configuration (unknown provider in the order, an unreadable collection on the never-list, a bad base URL). */
  constructor(o: HubOptions) {
    this.store = o.store;
    this.providers = readProviders(o.env);
    this.order = readOrder(o.env);
    this.readable = readReadable(o.env);
    const budget = o.env.OPS_MODEL_DAILY_CALLS?.trim();
    this.dailyBudget = budget ? Number(budget) : 500;
    if (!Number.isInteger(this.dailyBudget) || this.dailyBudget < 1) throw new Error('OPS_MODEL_DAILY_CALLS must be a whole number of at least 1');
    this.limiter = o.limiter ?? new RateLimiter(20, 60_000);
    this.fetchImpl = o.fetchImpl ?? fetch;
  }

  // ---------------------------------------------------------------- status

  private cfg(id: ProviderId) {
    return this.providers.find((p) => p.id === id)!;
  }

  private latestAttestation(id: ProviderId): Rec | undefined {
    return this.store.list('model_attestations').filter((r) => r.provider === id).at(-1);
  }

  private stateOf(p: ProviderConfig): ProviderState {
    if (!p.configured) return 'not_configured';
    const a = this.latestAttestation(p.id);
    if (!a || a.status !== 'ATTESTED') return 'needs_attestation';
    return a.model === p.model ? 'ready' : 'reattest';
  }

  /** Providers that may be called, in routing order (rule M5). */
  private ready(only?: ProviderId): ProviderConfig[] {
    return this.order.filter((id) => !only || id === only).map((id) => this.cfg(id)).filter((p) => this.stateOf(p) === 'ready');
  }

  private entriesToday(action: string, prefix?: string) {
    const ledger = this.store.list('ledger');
    const day = today(new Date().toISOString());
    const out: Rec[] = [];
    for (let i = ledger.length - 1; i >= 0; i--) {
      const e = ledger[i]!;
      if (today(String(e.at)) < day) break;
      if (e.action === action && (!prefix || String(e.subject).startsWith(prefix))) out.push(e);
    }
    return out;
  }
  private callsToday(id: ProviderId) {
    return this.entriesToday('model.request', `${id}:`).length;
  }

  status(): { providers: ProviderStatus[]; order: ProviderId[]; rules: typeof RULES; limits: typeof LIMITS & { dailyCallsPerProvider: number }; readableCollections: string[]; toolNames: string[]; usage: { calls: number; inputTokens: number; outputTokens: number } } {
    const tests = this.store.list('ledger').filter((e) => e.action === 'model.test');
    const providers = this.order.map((id): ProviderStatus => {
      const p = this.cfg(id);
      const a = this.latestAttestation(id);
      const t = tests.filter((e) => String(e.subject) === `${id}:${p.model}`).at(-1);
      const d = (t?.detail ?? {}) as { ok?: boolean; ms?: number; error?: string };
      const ok = a?.status === 'ATTESTED';
      return {
        id, label: p.label, state: this.stateOf(p), configured: p.configured, model: p.model, keyEnv: p.keyEnv, modelEnv: p.modelEnv,
        attestation: ok ? { by: String(a!.by), at: String(a!.at), note: String(a!.note), model: String(a!.model) } : null,
        lastTest: t ? { ok: d.ok === true, at: String(t.at), ms: Number(d.ms ?? 0), error: d.error } : null,
        callsToday: this.callsToday(id),
        setup: { ...SETUP[id], envExample: [`${p.keyEnv}=<paste the key here>`, `${p.modelEnv}=${p.model}`, `OPS_MODEL_ORDER=${this.order.join(',')}`] },
      };
    });
    const responses = this.entriesToday('model.response');
    return {
      providers, order: this.order, rules: RULES,
      limits: { ...LIMITS, dailyCallsPerProvider: this.dailyBudget },
      readableCollections: [...this.readable],
      toolNames: [...TOOL_NAMES],
      usage: { calls: this.entriesToday('model.request').length, inputTokens: responses.reduce((n, e) => n + Number((e.detail as { inputTokens?: number }).inputTokens ?? 0), 0), outputTokens: responses.reduce((n, e) => n + Number((e.detail as { outputTokens?: number }).outputTokens ?? 0), 0) },
    };
  }

  // ----------------------------------------------------------- attestation

  /** A named person confirms they reviewed the provider's terms for this exact model. Recorded in the warehouse and the ledger. */
  async attest(id: ProviderId, by: string | null, note: string) {
    const p = this.cfg(id);
    if (!p.configured) throw new ModelRefused('M5', `${p.label} has no key configured (${p.keyEnv}). Add it and restart first.`, 409);
    const n = (note ?? '').trim();
    if (n.length < 10 || n.length > 300) throw new ModelRefused('M5', 'Say what you reviewed, in 10 to 300 characters (for example: "Reviewed the provider\'s data-processing terms and retention settings").', 400);
    if (detectPii(n).length) throw new ModelRefused('M2', 'The note must not contain personal data.', 400);
    const rec = { id: newId('att'), provider: id, model: p.model, status: 'ATTESTED', by: by ?? 'open-dev', note: n, at: new Date().toISOString() };
    this.store.append('model_attestations', rec);
    await this.audit('model.attested', rec.by, `${id}:${p.model}`, { note: n });
    return rec;
  }

  async revoke(id: ProviderId, by: string | null, reason: string) {
    const r = (reason ?? '').trim();
    if (r.length < 5 || r.length > 300) throw new ModelRefused('M5', 'Give a reason, in 5 to 300 characters.', 400);
    if (detectPii(r).length) throw new ModelRefused('M2', 'The reason must not contain personal data.', 400);
    const rec = { id: newId('att'), provider: id, model: this.cfg(id).model, status: 'REVOKED', by: by ?? 'open-dev', note: r, at: new Date().toISOString() };
    this.store.append('model_attestations', rec);
    await this.audit('model.revoked', rec.by, `${id}:${rec.model}`, { reason: r });
    return rec;
  }

  // ----------------------------------------------------------------- audit

  private async audit(action: string, actor: string, subject: string, detail: Record<string, unknown>) {
    const last = this.store.list('ledger').at(-1);
    await appendLedger(this.store, { orgId: 'infinite-ai', actor, action, subject, detail }, Number(last?.seq ?? 0), null);
  }
  /** Rule M7: if the audit cannot be written, the model is not called (or its answer is withheld). */
  private async auditStrict(action: string, actor: string, subject: string, detail: Record<string, unknown>) {
    try {
      await this.audit(action, actor, subject, detail);
    } catch {
      throw new ModelRefused('M7', 'The audit ledger could not be written, so the model was not used.', 503);
    }
  }

  // -------------------------------------------------------------- the door

  /**
   * Every model call in the platform goes through here (rule M10). The order is fixed: rules M1-M4, a ready provider (M5),
   * rate and budget (M6), audit before the call (M7), the call, the output scan (M8), audit after.
   */
  private async execute(req: ModelRequest, useTools: boolean, only?: ProviderId): Promise<ModelResult> {
    const who = req.actor ?? 'open';
    const refuse = async (e: ModelRefused, subject = 'none'): Promise<never> => {
      await this.audit('model.refused', who, subject, { rule: e.rule, capability: req.capability, purpose: req.purpose }).catch(() => undefined);
      throw e;
    };
    try {
      checkRequest(req);
    } catch (e) {
      if (e instanceof ModelRefused) return refuse(e);
      throw e;
    }
    const allowed = req.agentProviders;
    const candidates = this.ready(only).filter((p) => !allowed || allowed.includes(p.id));
    if (allowed && !candidates.length && this.ready(only).length) return refuse(new ModelRefused('M5', `None of the providers this agent's contract allows (${allowed.join(', ')}) is ready.`, 503));
    if (!candidates.length) return refuse(new ModelRefused('M5', only ? 'That provider is not ready: configure it and attest it first.' : 'No model provider is ready. Open the Model Hub to configure and attest one.', 503));
    if (!this.limiter.allow(who)) return refuse(new ModelRefused('M6', 'Rate limit: try again in a minute.', 429));

    const inputs = [req.system, req.prompt, ...req.history.map((h) => h.text)];
    let budgetHit = false;
    let lastStatus = 0;
    for (const p of candidates) {
      if (this.callsToday(p.id) >= this.dailyBudget) {
        budgetHit = true;
        await this.audit('model.refused', who, `${p.id}:${p.model}`, { rule: 'M6', capability: req.capability, purpose: req.purpose, reason: 'daily budget' }).catch(() => undefined);
        continue;
      }
      const subject = `${p.id}:${p.model}`;
      await this.auditStrict('model.request', who, subject, { capability: req.capability, purpose: req.purpose, agentId: req.agentId, inputChars: inputs.reduce((n, s) => n + s.length, 0), promptSha256: sha(inputs.join('\n')), sources: req.provenance?.sources, tools: useTools });
      const started = Date.now();
      try {
        const r = await this.loop(p, req, useTools, who, subject, inputs);
        const out = checkModelOutput(r.text, [...inputs, ...r.invocations.map((i) => JSON.stringify(i.result))]);
        await this.auditStrict('model.response', who, subject, { outputChars: out.text.length, flags: out.flags, ms: Date.now() - started, inputTokens: r.inputTokens, outputTokens: r.outputTokens, toolCalls: r.invocations.length });
        return { text: out.text, draft: true, provider: p.id, model: p.model, flags: out.flags, toolInvocations: r.invocations, usage: { inputTokens: r.inputTokens, outputTokens: r.outputTokens } };
      } catch (e) {
        if (e instanceof ProviderError) {
          lastStatus = e.status;
          await this.audit('model.failed', who, subject, { status: e.status, ms: Date.now() - started, capability: req.capability }).catch(() => undefined);
          continue; // fall back to the next ready provider
        }
        throw e;
      }
    }
    if (budgetHit && !lastStatus) throw new ModelRefused('M6', 'The daily model budget is used up for every ready provider.', 429);
    throw new ModelUnavailable(`No provider could answer${lastStatus ? ` (last status ${lastStatus})` : ''}.`);
  }

  private async loop(p: ProviderConfig, req: ModelRequest, useTools: boolean, who: string, subject: string, inputs: string[]) {
    const adapter = ADAPTERS[p.id];
    const messages: ChatMessage[] = [...req.history.map((h): ChatMessage => (h.role === 'user' ? { role: 'user', text: h.text } : { role: 'assistant', text: h.text, toolCalls: [] })), { role: 'user', text: req.prompt }];
    const invocations: ToolInvocationRecord[] = [];
    let inputTokens = 0;
    let outputTokens = 0;
    const ctx = { apiKey: p.apiKey!, base: p.base, fetchImpl: this.fetchImpl };
    for (let turn = 0; turn <= LIMITS.maxToolTurns; turn++) {
      const tools = useTools && turn < LIMITS.maxToolTurns ? TOOLS : []; // the last turn must answer in text
      const step = await adapter.step({ model: p.model, system: req.system, messages, tools, maxTokens: LIMITS.maxOutputTokens, json: Boolean(req.json) }, ctx);
      inputTokens += step.inputTokens ?? 0;
      outputTokens += step.outputTokens ?? 0;
      if (!step.toolCalls.length) return { text: step.text, invocations, inputTokens, outputTokens };
      // No tools were offered on the last turn, so a model that still asks for one has not answered.
      if (turn === LIMITS.maxToolTurns) return { text: 'No final answer was produced within the tool limit. Narrow the question and try again.', invocations, inputTokens, outputTokens };
      // Rule M2 covers what we send back too: a call whose arguments hold personal data is not run, and its arguments are blanked.
      const calls = step.toolCalls.slice(0, 4).map((c) => ({ call: c, dirty: detectPii(JSON.stringify(c.args)).length > 0 }));
      messages.push({ role: 'assistant', text: step.text, toolCalls: calls.map(({ call, dirty }) => (dirty ? { ...call, args: {} } : call)) });
      const results: ToolResult[] = [];
      for (const { call, dirty } of calls) results.push(await this.runTool(dirty ? { ...call, args: {} } : call, who, subject, invocations, dirty));
      messages.push({ role: 'tool', results });
    }
    return { text: '', invocations, inputTokens, outputTokens };
  }

  /** Rule M9: the tool runs, and its result reaches the model only if it passes the scan. */
  private async runTool(call: ToolCall, who: string, subject: string, invocations: ToolInvocationRecord[], dirtyArgs = false): Promise<ToolResult> {
    let result: Record<string, unknown>;
    let withheld: string | null = null;
    if (dirtyArgs) {
      result = { error: 'rejected: the arguments contained personal data' };
      withheld = 'rejected: arguments contained personal data';
    } else if (!TOOL_NAMES.has(call.name) || JSON.stringify(call.args).length > 2_000) {
      result = { error: 'unknown tool or arguments too large' };
      withheld = 'rejected';
    } else {
      try {
        result = await executeTool(call.name, call.args, { load: () => this.store.load(), readable: this.readable });
        withheld = checkToolResult(result);
      } catch (e) {
        if (!(e instanceof LearnerDataRefused)) throw e;
        result = {};
        withheld = 'withheld: contained learner-level identifiers';
      }
      if (withheld) result = { error: withheld };
    }
    await this.auditStrict('model.tool', who, subject, { tool: call.name, resultChars: JSON.stringify(result).length, withheld });
    invocations.push({ name: call.name, args: call.args, result });
    return { id: call.id, name: call.name, result };
  }

  // ------------------------------------------------- what the platform asks

  /** True when at least one provider could be called right now. */
  anyReady(): boolean {
    return this.ready().length > 0;
  }

  /** For text the server itself composes: refuse anything with personal data, then stamp it (the stamp's only producer is deidentify). Refusals are audited. */
  private async stamp(texts: string[], sources: string[], who: string | null, capability: ModelRequest['capability'], purpose: Purpose) {
    try {
      return this.stampSync(texts, sources);
    } catch (e) {
      if (e instanceof ModelRefused) await this.audit('model.refused', who ?? 'open', 'none', { rule: e.rule, capability, purpose }).catch(() => undefined);
      throw e;
    }
  }

  private stampSync(texts: string[], sources: string[]) {
    try {
      const d = deidentify(texts.join('\n'), sources);
      if (d.findings.length) throw new ModelRefused('M2', `Refused: personal data detected (${[...new Set(d.findings.map((f) => f.kind))].join(', ')}). Remove it and retry.`);
      return d.provenance;
    } catch (e) {
      if (e instanceof LearnerDataRefused) throw new ModelRefused('M2', 'Refused: learner-level identifiers are never sent to a model.');
      throw e;
    }
  }

  /** A plain completion for a payload the caller has already de-identified and stamped (the in-browser gateway). */
  complete(r: { system: string; prompt: string; purpose: Purpose; provenance: ModelRequest['provenance']; actor: string | null; agent?: Pick<AgentContract, 'id' | 'allowedPurposes' | 'models'> }) {
    return this.execute({ capability: 'complete', purpose: r.purpose, system: r.system, prompt: r.prompt, history: [], provenance: r.provenance, actor: r.actor, agentId: r.agent?.id, agentPurposes: r.agent?.allowedPurposes, agentProviders: r.agent?.models }, false);
  }

  /** The operations copilot: free text from a person, with tools. Falls back to the deterministic engine when no provider is ready. */
  async copilot(message: string, history: { role: 'user' | 'model' | 'assistant'; text: string }[], actor: string | null): Promise<ModelResult> {
    const h = (Array.isArray(history) ? history : []).slice(-LIMITS.maxHistory).map((m) => ({ role: (m?.role === 'user' ? 'user' : 'assistant') as 'user' | 'assistant', text: String(m?.text ?? '') }));
    const system = 'You are the Infinite-AI Operations Copilot for South African primary-school business operations. You recommend, analyse and draft; named humans review, edit, countersign and ratify. Never state a figure you were not given or did not get from a tool. Say when something needs a source. Use the tools to inspect counts, compute illustrative economics, screen text or inspect agent contracts.';
    const provenance = await this.stamp([message, ...h.map((m) => m.text)], [`copilot-input:${actor ?? 'open'}`], actor, 'copilot', 'strategy_planning');
    if (!this.ready().length) return this.local(fallbackCopilot(message, Object.keys(this.store.load())));
    return this.execute({ capability: 'copilot', purpose: 'strategy_planning', system, prompt: message, history: h, provenance, actor }, true);
  }

  async recommend(agent: AgentContract, currentValues: Record<string, unknown>, actor: string | null): Promise<AgentRecommendationResult & { draft: true; flags: string[] }> {
    const values = Object.fromEntries(Object.entries(currentValues ?? {}).filter(([k, v]) => agent.inputs.some((i) => i.key === k) && typeof v === 'string').map(([k, v]) => [k, String(v).slice(0, 500)]));
    const fallback = () => ({ ...getDeterministicRecommendations(agent, values), toolsUsed: [] as string[], generatedWith: 'deterministic-fallback', draft: true as const, flags: ['deterministic', 'illustrative_defaults'] });
    const prompt = `Suggest how to complete this agent task. Agent: ${agent.id} (${agent.name}). Purpose: ${agent.purpose}. Summary: ${agent.summary}.\nInputs: ${JSON.stringify(agent.inputs.map((i) => ({ key: i.key, label: i.label, kind: i.kind, options: i.options })))}\nCurrent values: ${JSON.stringify(values)}\nReply with a JSON object: {"strategicRecommendations": string[], "recommendedInputs": {<input key>: string}, "complianceGuidance": string[], "suggestedNextSteps": string[]}. Do not invent figures, names or facts: where a value needs one, say what source is required.`;
    const provenance = await this.stamp([prompt], [`agent:${agent.id}`, `input:${actor ?? 'open'}`], actor, 'recommend', agent.purpose);
    if (!this.ready().length) return fallback();
    const r = await this.execute({ capability: 'recommend', purpose: agent.purpose, agentId: agent.id, agentPurposes: agent.allowedPurposes, agentProviders: agent.models, system: 'You are an operations specialist. You produce drafts for a human to review. Output only the JSON object asked for.', prompt, history: [], provenance, actor, json: true }, false);
    let parsed: Record<string, unknown> = {};
    try {
      parsed = JSON.parse(r.text.replace(/^```(?:json)?\s*|\s*```$/g, '')) as Record<string, unknown>;
    } catch {
      return { ...fallback(), flags: [...r.flags, 'model_reply_not_json', 'deterministic'] };
    }
    const det = getDeterministicRecommendations(agent, values);
    const strings = (v: unknown, d: string[]) => (Array.isArray(v) && v.length ? v.map(String).slice(0, 8) : d);
    const recIn = typeof parsed.recommendedInputs === 'object' && parsed.recommendedInputs !== null ? (parsed.recommendedInputs as Record<string, unknown>) : {};
    const recommendedInputs = Object.fromEntries(agent.inputs.map((i) => [i.key, typeof recIn[i.key] === 'string' ? String(recIn[i.key]) : det.recommendedInputs[i.key] ?? '']));
    return { agentId: agent.id, strategicRecommendations: strings(parsed.strategicRecommendations, det.strategicRecommendations), recommendedInputs, complianceGuidance: strings(parsed.complianceGuidance, det.complianceGuidance), suggestedNextSteps: strings(parsed.suggestedNextSteps, det.suggestedNextSteps), toolsUsed: [], generatedWith: `${r.provider}:${r.model}`, draft: true, flags: r.flags };
  }

  /** A fixed, harmless prompt through the full rule path, to prove a provider is wired up. It still needs attestation first. */
  async selfTest(id: ProviderId, actor: string | null) {
    const p = this.cfg(id);
    const started = Date.now();
    let out: { ok: boolean; error?: string; model: string };
    try {
      await this.execute({ capability: 'self-test', purpose: 'ai_governance', system: 'You are a connectivity check.', prompt: 'Reply with the single word OK.', history: [], provenance: { deidentified: true, sources: ['hub-self-test'] }, actor }, false, id);
      out = { ok: true, model: p.model };
    } catch (e) {
      if (e instanceof ModelRefused && e.rule !== 'M5' && e.rule !== 'M6' && e.rule !== 'M7') throw e;
      out = { ok: false, error: (e as Error).message, model: p.model };
    }
    const ms = Date.now() - started;
    await this.audit('model.test', actor ?? 'open', `${id}:${p.model}`, { ok: out.ok, ms, error: out.error }).catch(() => undefined);
    return { ...out, ms };
  }

  private local(r: { text: string; toolInvocations: ToolInvocationRecord[] }): ModelResult {
    return { text: r.text, draft: true, provider: 'local', model: 'deterministic', flags: ['deterministic'], toolInvocations: r.toolInvocations, usage: { inputTokens: 0, outputTokens: 0 } };
  }
}

export type { RuleId };
