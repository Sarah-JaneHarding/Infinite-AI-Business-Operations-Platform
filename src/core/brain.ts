import { newId } from './crypto';
import type { BrainTier, OrgId, Provenance } from './types';
import type { Ledger } from './ledger';

export type FactStatus = 'proposed' | 'ratified' | 'superseded' | 'tombstoned';
export interface Fact {
  id: string;
  orgId: OrgId;
  tier: BrainTier;
  topic: string;
  text: string;
  provenance: Provenance;
  status: FactStatus;
  supersedes?: string;
  by: string;
  at: string;
}

/** L0 is the constitution: seeded, immutable, never writable at runtime. */
export const CONSTITUTION: { topic: string; text: string }[] = [
  { topic: 'invariant.pii', text: 'No personal information reaches a model. Only de-identified text is admitted.' },
  { topic: 'invariant.learner', text: 'Learner-level data is never held or processed by the operations platform.' },
  { topic: 'invariant.purpose', text: 'Every run declares a purpose and may only use agents permitted for it.' },
  { topic: 'invariant.append_only', text: 'Ledger and Brain are append-only. Corrections supersede; erasure is a tombstone.' },
  { topic: 'invariant.human', text: 'AI drafts. The human decides. Nothing is approved without a named human.' },
  { topic: 'invariant.numbers', text: 'No invented numbers. Every figure is sourced or stripped.' },
  { topic: 'invariant.curriculum', text: 'Never invent curriculum policy; cite CAPS/DBE sources or mark as unverified.' },
];

const TIER_NEEDS_RATIFY: BrainTier[] = ['L3', 'L4']; // procedures and learned policy need a human

export class Brain {
  private facts: Fact[] = [];
  constructor(private ledger: Ledger, private orgId: OrgId = 'infinite-ai', restored: Fact[] = [], private onChange?: (f: Fact) => void) {
    const at = '2026-01-01T00:00:00.000Z';
    if (restored.length) this.facts.push(...restored.filter((f) => f.tier !== 'L0'));
    CONSTITUTION.forEach((c, i) =>
      this.facts.push({ id: `L0-${String(i + 1).padStart(2, '0')}`, orgId, tier: 'L0', topic: c.topic, text: c.text, provenance: { deidentified: true, sources: ['constitution'] }, status: 'ratified', by: 'system', at }),
    );
  }

  get all(): readonly Fact[] {
    return this.facts;
  }

  async remember(f: { tier: Exclude<BrainTier, 'L0'>; topic: string; text: string; provenance: Provenance; by: string }): Promise<Fact> {
    if ((f.tier as string) === 'L0') throw new Error('L0 is the constitution and cannot be written.');
    if (!f.provenance.deidentified) throw new Error('Brain refuses facts that are not de-identified.');
    if (!f.provenance.sources.length) throw new Error('Brain refuses facts without a source.');
    const fact: Fact = { id: newId('fact'), orgId: this.orgId, tier: f.tier, topic: f.topic, text: f.text, provenance: f.provenance, status: TIER_NEEDS_RATIFY.includes(f.tier) ? 'proposed' : 'ratified', by: f.by, at: new Date().toISOString() };
    this.facts.push(fact);
    this.onChange?.(fact);
    await this.ledger.append({ orgId: this.orgId, actor: f.by, action: 'brain.remember', subject: fact.id, detail: { tier: f.tier, topic: f.topic, status: fact.status } });
    return fact;
  }

  /** Only a named human can ratify a proposed fact. */
  async ratify(id: string, approver: { id: string; kind: string }): Promise<Fact> {
    if (approver.kind !== 'human') throw new Error('Only a human can ratify a Brain fact.');
    const f = this.facts.find((x) => x.id === id);
    if (!f || f.status !== 'proposed') throw new Error('No proposed fact with that id.');
    const next: Fact = { ...f, id: newId('fact'), status: 'ratified', supersedes: f.id, by: approver.id, at: new Date().toISOString() };
    this.mark(f, 'superseded');
    this.facts.push(next);
    this.onChange?.(next);
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: 'brain.ratify', subject: next.id, detail: { supersedes: f.id } });
    return next;
  }

  async supersede(id: string, text: string, provenance: Provenance, by: string): Promise<Fact> {
    const old = this.facts.find((x) => x.id === id);
    if (!old || old.tier === 'L0' || old.status === 'tombstoned') throw new Error('Cannot supersede that fact.');
    if (!provenance.deidentified) throw new Error('Brain refuses facts that are not de-identified.');
    const next: Fact = { ...old, id: newId('fact'), text, provenance, supersedes: id, by, at: new Date().toISOString(), status: TIER_NEEDS_RATIFY.includes(old.tier) ? 'proposed' : 'ratified' };
    this.mark(old, 'superseded');
    this.facts.push(next);
    this.onChange?.(next);
    await this.ledger.append({ orgId: this.orgId, actor: by, action: 'brain.supersede', subject: next.id, detail: { supersedes: id } });
    return next;
  }

  /** Erasure: keep the audit fact (id, topic, who/when), drop the content. */
  async forget(id: string, by: string): Promise<void> {
    const f = this.facts.find((x) => x.id === id);
    if (!f || f.tier === 'L0') throw new Error('Cannot forget that fact.');
    this.mark(f, 'tombstoned', { text: '[erased]' });
    await this.ledger.append({ orgId: this.orgId, actor: by, action: 'brain.forget', subject: id, detail: { topic: f.topic } });
  }

  /** Recall only ratified, live facts. Proposed facts are never fed to agents. */
  recall(tiers: BrainTier[], topicPrefix = ''): Fact[] {
    return this.facts.filter((f) => f.status === 'ratified' && tiers.includes(f.tier) && f.topic.startsWith(topicPrefix));
  }

  explain(id: string): Fact[] {
    const chain: Fact[] = [];
    let cur = this.facts.find((f) => f.id === id);
    while (cur) {
      chain.push(cur);
      const prev: string | undefined = cur.supersedes;
      cur = prev ? this.facts.find((f) => f.id === prev) : undefined;
    }
    return chain;
  }

  private mark(f: Fact, status: FactStatus, patch: Partial<Fact> = {}) {
    // Status flips are the only in-place change, and each is mirrored by a ledger entry above.
    Object.assign(f, patch, { status });
    this.onChange?.(f);
  }
}
