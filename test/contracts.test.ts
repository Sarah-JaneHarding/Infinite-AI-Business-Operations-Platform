import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import type { AgentContract } from '../src/core/agent';
import { CONTRACT_MAX_PROMPT_CHARS, CONTRACT_RULES, KNOWN_PROVIDERS, checkContract, checkRegistry, formatProblems, type ContractRuleId } from '../src/core/contract';
import { AGENTS, DEPARTMENTS } from '../src/departments';
import { buildCustomAgent, type CustomAgentDef } from '../src/departments/custom';
import { PROVIDER_IDS } from '../src/server/models/providers';
import { LIMITS, ModelRefused } from '../src/server/models/rules';
import { ModelHub, type HubStore } from '../src/server/models/hub';
import type { Rec } from '../src/core/warehouse';

const env = { departments: DEPARTMENTS.map((d) => d.id) };
const base = AGENTS[0]!;
const mutate = (o: Record<string, unknown>): AgentContract => ({ ...base, ...o }) as AgentContract;
const rulesOf = (a: AgentContract) => [...new Set(checkContract(a, env).map((p) => p.rule))];

describe('every registered agent keeps its contract', () => {
  it('has no problems across the whole registry', () => {
    const r = checkRegistry(AGENTS, env);
    expect(formatProblems(r)).toBe('');
    expect(AGENTS.length).toBeGreaterThanOrEqual(100);
  });
  it('points each agent at an evaluation file that exists', () => {
    for (const a of AGENTS) expect(existsSync(a.evalRef), `${a.id} → ${a.evalRef}`).toBe(true);
  });
  it('keeps the contract budget ceiling within the model hub input limit, and provider names in step', () => {
    expect(CONTRACT_MAX_PROMPT_CHARS).toBeLessThanOrEqual(LIMITS.maxInputChars);
    expect([...KNOWN_PROVIDERS].sort()).toEqual([...PROVIDER_IDS].sort());
  });
  it('documents every rule it enforces', () => {
    const doc = readFileSync('docs/AGENT_CONTRACTS.md', 'utf8');
    for (const r of CONTRACT_RULES) expect(doc).toContain(`**${r.id}**`);
  });
});

describe('each rule fires on its own violation (and a good contract is clean)', () => {
  it('accepts the baseline', () => expect(checkContract(base, env)).toEqual([]));
  const cases: [ContractRuleId, string, Record<string, unknown>][] = [
    ['C1', 'bad id', { id: 'x' }],
    ['C1', 'bad version', { version: 'one' }],
    ['C1', 'unknown department', { dept: 'nowhere' }],
    ['C1', 'empty summary', { summary: '' }],
    ['C2', 'no owner', { owner: '' }],
    ['C2', 'owner is a person with an email', { owner: 'Pat Smith pat@example.com' }],
    ['C3', 'purpose off the list', { purpose: 'selling_data', allowedPurposes: ['selling_data'] }],
    ['C3', 'purpose not in allowed', { allowedPurposes: ['people_ops'], purpose: 'strategy_planning' }],
    ['C3', 'no allowed purposes', { allowedPurposes: [] }],
    ['C4', 'learner ceiling', { dataClass: 'learner' }],
    ['C4', 'personal with no lawful basis', { dataClass: 'personal', lawfulBasis: undefined }],
    ['C5', 'approval skipped', { requiresApproval: false }],
    ['C5', 'custom agent without a second approver', { id: 'agt-abc1', secondApprover: false }],
    ['C6', 'empty provider list', { models: [] }],
    ['C6', 'unknown provider', { models: ['openai'] }],
    ['C7', 'budget too big', { budget: { maxPromptChars: CONTRACT_MAX_PROMPT_CHARS + 1 } }],
    ['C7', 'budget not a number', { budget: { maxPromptChars: '6000' } }],
    ['C8', 'eval outside test/', { evalRef: '../secrets.test.ts' }],
    ['C8', 'no eval', { evalRef: '' }],
    ['C9', 'duplicate input keys', { inputs: [{ key: 'a', label: 'A', kind: 'text' }, { key: 'a', label: 'B', kind: 'text' }] }],
    ['C9', 'choice without options', { inputs: [{ key: 'a', label: 'A', kind: 'select' }] }],
    ['C10', 'unknown Brain tier', { reads: ['L9'] }],
    ['C10', 'no formats', { formats: [] }],
    ['C10', 'bad ingestion', { ingestion: 'sometimes' }],
    ['C10', 'build is not a function', { build: 'rm -rf' }],
  ];
  for (const [rule, label, o] of cases) it(`${rule}: ${label}`, () => expect(rulesOf(mutate(o))).toContain(rule));

  it('never throws on a malformed object and reports duplicates in a registry', () => {
    expect(() => checkContract({} as AgentContract, env)).not.toThrow();
    expect(checkContract({} as AgentContract, env).length).toBeGreaterThan(5);
    expect(Object.keys(checkRegistry([base, base], env))).toEqual([base.id]);
  });
});

describe('custom agents', () => {
  const def: CustomAgentDef = { id: 'agt-test1', kind: 'agent', dept: 'finance', name: 'Petty cash note', summary: 'Records a petty cash purchase', purpose: 'financial_planning', inputs: [{ key: 'what', label: 'What', kind: 'text' }], sections: [{ h: 'What', kind: 'input', ref: 'what' }], by: 'u', at: '2026-11-11T08:00:00Z' };
  it('build a contract that holds, with a second approver', () => {
    const a = buildCustomAgent(def, 1);
    expect(checkContract(a, env)).toEqual([]);
    expect(a.secondApprover).toBe(true);
  });
  it('are refused when the definition would break a rule', () => {
    expect(rulesOf(buildCustomAgent({ ...def, name: 'x' }, 1))).toContain('C1');
  });
});

describe('C6 is enforced by the model hub, not just recorded', () => {
  const mkStore = (): HubStore => { const rows: Record<string, Rec[]> = {}; return { list: (c) => rows[c] ?? [], append: (c, r) => { (rows[c] ??= []).push(r); }, load: () => rows }; };
  const mk = () => {
    const urls: string[] = [];
    const fetchImpl = (async (url: string) => { urls.push(url); return new Response(JSON.stringify(url.includes('/v1/messages') ? { content: [{ type: 'text', text: 'OK' }] } : { candidates: [{ content: { parts: [{ text: 'OK' }] } }] }), { status: 200 }); }) as unknown as typeof fetch;
    const hub = new ModelHub({ env: { ANTHROPIC_API_KEY: 'sk-a-SECRET-1', GEMINI_API_KEY: 'g-SECRET-2' }, store: mkStore(), fetchImpl });
    return { hub, urls };
  };
  const call = (hub: ModelHub, agent: Pick<AgentContract, 'id' | 'allowedPurposes' | 'models'>) => hub.complete({ system: 's', prompt: 'p', purpose: 'strategy_planning', provenance: { deidentified: true, sources: ['x'] }, actor: 'sarah', agent });
  it('tries only the providers the contract lists', async () => {
    const { hub, urls } = mk();
    await hub.attest('anthropic', 'sarah', 'Reviewed the terms'); await hub.attest('gemini', 'sarah', 'Reviewed the terms');
    const r = await call(hub, { id: 'OPS-T-01', allowedPurposes: ['strategy_planning'], models: ['gemini'] });
    expect(r.provider).toBe('gemini');
    expect(urls.every((u) => !u.includes('/v1/messages'))).toBe(true);
  });
  it('refuses, without calling anyone, when no listed provider is ready', async () => {
    const { hub, urls } = mk();
    await hub.attest('anthropic', 'sarah', 'Reviewed the terms');
    const e = await call(hub, { id: 'OPS-T-01', allowedPurposes: ['strategy_planning'], models: ['gemini'] }).then(() => null, (x: unknown) => x as ModelRefused);
    expect(e?.rule).toBe('M5');
    expect(urls).toEqual([]);
  });
  it('still binds the purpose to the contract', async () => {
    const { hub } = mk();
    await hub.attest('anthropic', 'sarah', 'Reviewed the terms');
    const e = await call(hub, { id: 'OPS-T-01', allowedPurposes: ['people_ops'], models: undefined }).then(() => null, (x: unknown) => x as ModelRefused);
    expect(e?.rule).toBe('M3');
  });
  it('lets an agent with no provider list use any attested provider', async () => {
    const { hub } = mk();
    await hub.attest('anthropic', 'sarah', 'Reviewed the terms');
    expect((await call(hub, { id: 'OPS-T-01', allowedPurposes: ['strategy_planning'] })).provider).toBe('anthropic');
  });
});
