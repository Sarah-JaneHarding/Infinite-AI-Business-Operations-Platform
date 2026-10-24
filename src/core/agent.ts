import type { ArtefactFormat, BrainTier, DataClass, Doc, LawfulBasis, Purpose } from './types';

export interface InputField {
  key: string;
  label: string;
  kind: 'text' | 'longtext' | 'number' | 'select';
  options?: string[];
  required?: boolean;
  help?: string;
}

export interface RunContext {
  /** Real, sourced facts: key → value (e.g. `eco.stages.count` → 116). Used for [src:] tags. */
  facts: Record<string, string | number>;
  /** Free text the agent may use, already de-identified. */
  input: Record<string, string>;
  /** Numbers the human typed in. These are the only other numbers a draft may contain. */
  inputNumbers: number[];
  /** Ratified Brain facts recalled for this run. */
  brain: { id: string; topic: string; text: string }[];
}

/** Same shape as an ecosystem agent contract: id, version, purpose, guardrails, budget, approval, reads/writes. */
export interface AgentContract {
  id: string; // OPS-<DEPT>-nn
  version: string;
  dept: string;
  name: string;
  summary: string;
  framework: string; // the named best-practice method this agent applies
  allowedPurposes: Purpose[];
  purpose: Purpose;
  dataClass: DataClass;
  lawfulBasis?: LawfulBasis;
  reads: BrainTier[];
  formats: ArtefactFormat[];
  inputs: InputField[];
  requiresApproval: true; // literal: there is no agent that skips the human
  secondApprover?: boolean; // approver must differ from requester
  budget: { maxPromptChars: number };
  evalRef: string;
  /** Pure function: builds the structured document from real facts + human input. */
  build(ctx: RunContext): Doc;
  /** Optional facts to send to the gateway for the narrative paragraph. */
  narrativeFacts?(ctx: RunContext): Record<string, string | number>;
}
