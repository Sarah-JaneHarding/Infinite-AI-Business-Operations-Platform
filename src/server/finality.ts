import type { Rec } from '../core/warehouse';
import type { ReadStore } from './validate';

/**
 * Anything that leaves the platform (an issue, a message to another system) must be ratified: approved by one person and
 * countersigned by a different one, with both signatures on record for the exact content. Approved alone is not final.
 */
export function ratifiedProblem(store: ReadStore, art: Rec | undefined): string | null {
  if (!art) return 'unknown artefact';
  if (art.status !== 'RATIFIED' && art.status !== 'INGESTED') return 'Only a ratified artefact (approved and countersigned) can leave the platform.';
  if (!art.approvedBy || !art.countersignedBy || art.approvedBy === art.countersignedBy) return 'The artefact does not carry two different signers.';
  const approved = store.list('approvals').some((r) => r.artefactId === art.id && r.decision === 'APPROVED' && r.approver === art.approvedBy);
  const countersigned = store.list('countersignatures').some((r) => r.artefactId === art.id && r.signer === art.countersignedBy && r.docHash === art.docHash);
  if (!approved || !countersigned) return 'No recorded approval and countersignature for this artefact.';
  return null;
}
