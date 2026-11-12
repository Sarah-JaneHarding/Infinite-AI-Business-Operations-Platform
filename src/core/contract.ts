/**
 * Agent contract rules. A contract is data a machine can check, so the checks run when an agent is registered
 * (the server refuses to start on a bad built-in), when a custom agent is loaded, and in the tests over every agent.
 * Each rule has an id so a failure says which promise was broken. Rules read top to bottom; none is clever.
 */
import type { AgentContract } from './agent';
import { detectPii } from './guardrails/pii';
import { PURPOSES, LAWFUL_BASES, type BrainTier, type ArtefactFormat } from './types';

export const CONTRACT_RULES = [
  { id: 'C1', title: 'Identity', text: 'A built-in id looks like OPS-DEPT-nn, a custom one like agt-xxxx. The version is semver. The name, summary and method are present and plain.' },
  { id: 'C2', title: 'Owner', text: 'Every agent names an accountable owner role (not a person, no personal data) who answers for what it drafts.' },
  { id: 'C3', title: 'Purpose', text: 'One declared purpose from the closed list, and it is among the purposes the contract allows. Nothing outside the list exists.' },
  { id: 'C4', title: 'Data-class ceiling', text: 'The ceiling is public, internal, confidential or personal. Learner data is never a ceiling. Personal data names a lawful basis.' },
  { id: 'C5', title: 'Approval cannot be skipped', text: 'requiresApproval is true. Custom agents also need a second approver.' },
  { id: 'C6', title: 'Allowed models', text: 'If the contract lists providers, they are known ones and the list is not empty. If it lists none, any attested provider may serve it. Every model call is still checked by the model rules.' },
  { id: 'C7', title: 'Budget', text: 'A whole-number prompt budget, small enough to pass the hub size limit.' },
  { id: 'C8', title: 'Evaluation', text: 'The contract points at a test file that exercises it (the tests check the file exists and names the agent family).' },
  { id: 'C9', title: 'Inputs', text: 'Up to 12 inputs with unique keys and labels; a choice has options.' },
  { id: 'C10', title: 'Reads and outputs', text: 'Brain tiers and output formats are from the known lists; ingestion is library or none.' },
] as const;
export type ContractRuleId = (typeof CONTRACT_RULES)[number]['id'];

export interface ContractProblem { rule: ContractRuleId; message: string }

/** Largest prompt budget a contract may ask for. Kept at or below the model hub's input limit (a test checks this). */
export const CONTRACT_MAX_PROMPT_CHARS = 20_000;
export const KNOWN_PROVIDERS: readonly string[] = ['anthropic', 'gemini'];
const TIERS: readonly BrainTier[] = ['L0', 'L1', 'L2', 'L3', 'L4'];
const FORMATS: readonly ArtefactFormat[] = ['md', 'html', 'pdf', 'csv', 'json', 'docx', 'xlsx'];
const CEILINGS = ['public', 'internal', 'confidential', 'personal'];

export interface ContractEnv { departments: readonly string[]; providers?: readonly string[] }

/** Returns every problem found (empty = the contract holds). Never throws on a malformed object. */
export function checkContract(a: AgentContract, env: ContractEnv): ContractProblem[] {
  const out: ContractProblem[] = [];
  const bad = (rule: ContractRuleId, message: string) => out.push({ rule, message });
  const str = (x: unknown, min: number, max: number) => typeof x === 'string' && x.trim().length >= min && x.length <= max;
  const x = a as unknown as Record<string, unknown>;

  // C1
  if (typeof a.id !== 'string' || !/^(OPS-[A-Z]+-\d{2}|CUS-[A-Z]+-\d{2}|agt-[a-z0-9]+)$/.test(a.id)) bad('C1', 'id must look like OPS-DEPT-nn or agt-xxxx');
  if (typeof a.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(a.version)) bad('C1', 'version must be semver (1.0.0)');
  if (!str(a.name, 3, 80)) bad('C1', 'name must be 3 to 80 characters');
  if (!str(a.summary, 5, 400)) bad('C1', 'summary must be 5 to 400 characters');
  if (!str(a.framework, 3, 200)) bad('C1', 'the method (framework) must be named');
  if (!env.departments.includes(a.dept)) bad('C1', `department "${String(a.dept)}" is not registered`);

  // C2
  if (!str(x.owner, 3, 60)) bad('C2', 'an owner role is required (3 to 60 characters)');
  else if (detectPii(String(x.owner)).length) bad('C2', 'the owner must be a role, not personal data');

  // C3
  if (!PURPOSES.includes(a.purpose)) bad('C3', 'purpose is not on the closed purpose list');
  if (!Array.isArray(a.allowedPurposes) || !a.allowedPurposes.length) bad('C3', 'allowedPurposes must not be empty');
  else {
    if (a.allowedPurposes.some((p) => !PURPOSES.includes(p))) bad('C3', 'allowedPurposes holds a purpose that is not on the list');
    if (new Set(a.allowedPurposes).size !== a.allowedPurposes.length) bad('C3', 'allowedPurposes has a duplicate');
    if (!a.allowedPurposes.includes(a.purpose)) bad('C3', 'purpose must be one of allowedPurposes');
  }

  // C4
  if (!CEILINGS.includes(a.dataClass)) bad('C4', a.dataClass === 'learner' ? 'learner data is never admitted to this platform' : 'unknown data class');
  if (a.dataClass === 'personal' && !(a.lawfulBasis && LAWFUL_BASES.includes(a.lawfulBasis))) bad('C4', 'personal data needs a lawful basis (POPIA s11)');

  // C5
  if (a.requiresApproval !== true) bad('C5', 'requiresApproval must be true: no agent skips the human');
  if (/^(agt-|CUS-)/.test(String(a.id)) && a.secondApprover !== true) bad('C5', 'a custom agent needs a second approver');

  // C6
  if (x.models !== undefined) {
    const known = env.providers ?? KNOWN_PROVIDERS;
    if (!Array.isArray(x.models) || !x.models.length) bad('C6', 'models, when present, must be a non-empty list of providers');
    else if (x.models.some((m) => typeof m !== 'string' || !known.includes(m))) bad('C6', 'models names a provider that is not known');
    else if (new Set(x.models).size !== x.models.length) bad('C6', 'models has a duplicate');
  }

  // C7
  const budget = (a.budget as { maxPromptChars?: unknown } | undefined)?.maxPromptChars;
  if (typeof budget !== 'number' || !Number.isInteger(budget) || budget < 100 || budget > CONTRACT_MAX_PROMPT_CHARS) bad('C7', `budget.maxPromptChars must be a whole number from 100 to ${CONTRACT_MAX_PROMPT_CHARS}`);

  // C8
  if (typeof a.evalRef !== 'string' || !/^test\/[A-Za-z0-9._/-]+\.test\.ts$/.test(a.evalRef) || a.evalRef.includes('..')) bad('C8', 'evalRef must point at a test file under test/');

  // C9
  if (!Array.isArray(a.inputs) || a.inputs.length > 12) bad('C9', 'an agent has at most 12 inputs');
  else {
    const keys = a.inputs.map((i) => i?.key);
    if (keys.some((k) => typeof k !== 'string' || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(k))) bad('C9', 'every input needs a simple key');
    if (new Set(keys).size !== keys.length) bad('C9', 'two inputs share a key');
    if (a.inputs.some((i) => !str(i?.label, 1, 120))) bad('C9', 'every input needs a label');
    if (a.inputs.some((i) => i?.kind === 'select' && !i.options?.length)) bad('C9', 'a choice input needs options');
    if (a.inputs.some((i) => !['text', 'longtext', 'number', 'select'].includes(String(i?.kind)))) bad('C9', 'an input has an unknown kind');
  }

  // C10
  if (!Array.isArray(a.reads) || a.reads.some((t) => !TIERS.includes(t))) bad('C10', 'reads holds an unknown Brain tier');
  if (!Array.isArray(a.formats) || !a.formats.length || a.formats.some((f) => !FORMATS.includes(f))) bad('C10', 'formats must be a non-empty list of known formats');
  if (a.ingestion !== undefined && a.ingestion !== 'library' && a.ingestion !== 'none') bad('C10', 'ingestion must be library or none');
  if (typeof a.build !== 'function') bad('C10', 'build must be a function');
  return out;
}

/** Registry check: every contract holds, ids are unique. Used at server start, so a bad built-in stops the boot. */
export function checkRegistry(agents: readonly AgentContract[], env: ContractEnv): Record<string, ContractProblem[]> {
  const out: Record<string, ContractProblem[]> = {};
  const seen = new Set<string>();
  for (const a of agents) {
    const p = checkContract(a, env);
    if (seen.has(a.id)) p.push({ rule: 'C1', message: 'duplicate id' });
    seen.add(a.id);
    if (p.length) out[String(a.id)] = p;
  }
  return out;
}

export const formatProblems = (r: Record<string, ContractProblem[]>) => Object.entries(r).map(([id, ps]) => `${id}: ${ps.map((p) => `${p.rule} ${p.message}`).join('; ')}`).join('\n');
