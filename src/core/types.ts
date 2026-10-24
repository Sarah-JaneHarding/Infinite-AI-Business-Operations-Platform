// Shared contracts for the platform core. Everything else imports from here.

export type OrgId = string;

/** Closed list. An agent may only run for purposes its contract lists (purpose limitation). */
export const PURPOSES = [
  'strategy_planning',
  'engineering_governance',
  'content_review',
  'ai_governance',
  'compliance_review',
  'contract_review',
  'financial_planning',
  'sales_pipeline',
  'marketing_content',
  'customer_success',
  'service_desk',
  'public_sector_relations',
  'people_ops',
  'infrastructure_ops',
  'vendor_management',
  'research_evaluation',
] as const;
export type Purpose = (typeof PURPOSES)[number];

export const LAWFUL_BASES = ['legitimate_interest', 'contract', 'consent', 'legal_obligation'] as const;
export type LawfulBasis = (typeof LAWFUL_BASES)[number];

/** `learner` data is never admitted to this platform: the gate refuses it outright. */
export type DataClass = 'public' | 'internal' | 'confidential' | 'personal' | 'learner';

export type BrainTier = 'L0' | 'L1' | 'L2' | 'L3' | 'L4';

export type ArtefactFormat = 'md' | 'html' | 'pdf' | 'csv' | 'json' | 'docx' | 'xlsx';

export type Status = 'DRAFT' | 'IN_REVIEW' | 'APPROVED' | 'REJECTED';

export interface Provenance {
  /** Set only by deidentify(); the gateway refuses anything else. */
  deidentified: boolean;
  /** Where the facts came from, e.g. `repo@3c2511a`, `user-input`, `warehouse:artefact/…`. */
  sources: string[];
}

export interface Actor {
  id: string;
  name: string;
  kind: 'human' | 'agent' | 'system';
  roles: string[];
}

/** A canonical, format-neutral document. Every renderer works from this. */
export interface Block {
  type: 'h' | 'p' | 'ul' | 'ol' | 'table' | 'kv' | 'callout' | 'checklist';
  level?: number;
  text?: string;
  items?: string[];
  headers?: string[];
  rows?: (string | number)[][];
  pairs?: [string, string][];
  tone?: 'info' | 'warn' | 'ok';
  checks?: { label: string; done: boolean }[];
}
export interface Doc {
  title: string;
  subtitle?: string;
  blocks: Block[];
  meta: Record<string, string>;
}

export interface LedgerEntry {
  seq: number;
  at: string;
  orgId: OrgId;
  actor: string;
  action: string;
  subject: string;
  detail: Record<string, unknown>;
  prevHash: string;
  hash: string;
}
