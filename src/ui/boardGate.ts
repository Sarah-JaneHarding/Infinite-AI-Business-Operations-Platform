import { contractFor, type DefStore } from '../departments/custom';
import type { Artefact } from '../core/platform';
import type { LedgerEntry } from '../core/types';
import { requiresTwoPerson, soloWaitRemainingMs, type SigningPolicy } from '../core/signing';

export interface GateContext {
  signing: SigningPolicy;
  now: Date;
  /** Where custom agent definitions live (the Platform's warehouse), so a custom agent's contract is known. */
  defs: Pick<DefStore, 'latest'>;
  /** Server-stamped time of the latest `hitl.approved` ledger entry for this artefact version, if the ledger holds one yet. */
  approvedAtFromLedger?: string;
}

const prof = (p: string) => p.replace('_', ' ');

/** Server-stamped time of the latest (by seq) `hitl.approved` entry for this artefact whose detail names this version. */
export function approvedAtFromLedger(entries: readonly LedgerEntry[], artefactId: string, version: number): string | undefined {
  let found: LedgerEntry | undefined;
  for (const e of entries) if (e.action === 'hitl.approved' && e.subject === artefactId && e.detail.version === version && (!found || e.seq > found.seq)) found = e;
  return found?.at;
}

/** The standing rule for an agent whose output always needs a second person, or '' when none applies. A hint only: the server decides. */
export function signingHint(agent: { twoPerson?: boolean; professionalReview?: string } | undefined): string {
  if (!agent) return '';
  if (agent.professionalReview) return `Needs a registered ${prof(agent.professionalReview)} to countersign.`;
  if (agent.twoPerson) return 'A different person must countersign this.';
  return '';
}

/** What this person may do to this artefact now, or why not. Mirrors the rules the server enforces; the server stays the authority. */
export function can(a: Artefact, me: string, ctx: GateContext): { ok: boolean; why: string } {
  const agent = contractFor(a.agentId, ctx.defs);
  if (a.status === 'IN_REVIEW') {
    if (agent?.secondApprover && a.requestedBy === me && (ctx.signing.mode !== 'solo' || requiresTwoPerson(agent))) return { ok: false, why: 'This agent needs someone other than its author to approve.' };
    return { ok: true, why: '' };
  }
  if (a.status === 'APPROVED' && a.approvedBy === me) {
    if (agent && requiresTwoPerson(agent)) return { ok: false, why: `A different person must countersign this: ${signingHint(agent)}` };
    if (ctx.signing.mode !== 'solo') return { ok: false, why: 'You approved this. A different person must countersign.' };
    if (ctx.approvedAtFromLedger === undefined) return { ok: false, why: 'The approval was saved but is not recorded in the ledger. If this does not change after a reload, edit the artefact and approve it again.' };
    const left = soloWaitRemainingMs(ctx.approvedAtFromLedger, ctx.now, ctx.signing);
    if (left > 0) {
      const mins = Math.ceil(left / 60_000);
      return { ok: false, why: `Solo signing: ${mins} minute${mins === 1 ? '' : 's'} left before you can countersign your own approval.` };
    }
  }
  return { ok: true, why: '' };
}

export interface SingleSignerReportItem { artefactId: string; title: string; agentId: string; kind: 'self-countersign' | 'self-approval'; signer: string; ratifiedAt: string; docHash: string }

/** Display fields for one report row: plain words for the kind, the date part of the timestamp, and a short hash. */
export function reportRow(i: SingleSignerReportItem): { kindLabel: string; date: string; hash: string } {
  return {
    kindLabel: i.kind === 'self-countersign' ? 'countersigned own approval' : 'approved own draft',
    date: i.ratifiedAt.slice(0, 10),
    hash: i.docHash.slice(0, 12)
  };
}
