import { SINGLE_SIGNER, requiresTwoPerson } from '../core/signing';
import type { Rec } from '../core/warehouse';
import { agentById } from '../departments';
import type { ReadStore } from './validate';

/**
 * Anything that leaves the platform (an issue, a message to another system) must be ratified: approved by one person and
 * countersigned by a different one, with both signatures on record for the exact content. Approved alone is not final.
 * The one exception is a solo single-signer ratification, read from the record (not the current mode), and never for a
 * two-person or professional-review agent.
 */
export function ratifiedProblem(store: ReadStore, art: Rec | undefined): string | null {
  if (!art) return 'unknown artefact';
  if (art.status !== 'RATIFIED' && art.status !== 'INGESTED') return 'Only a ratified artefact (approved and countersigned) can leave the platform.';
  const contract = agentById(String(art.agentId));
  const twoPerson = contract !== undefined && requiresTwoPerson(contract);
  if (art.signing !== undefined && (art.signing !== SINGLE_SIGNER || twoPerson)) return 'This artefact needs two different people and cannot carry the single-signer marker.';
  if (!art.approvedBy || !art.countersignedBy || (art.approvedBy === art.countersignedBy && art.signing !== SINGLE_SIGNER)) return 'The artefact does not carry two different signers.';
  const approved = store.list('approvals').some((r) => r.artefactId === art.id && r.decision === 'APPROVED' && r.approver === art.approvedBy);
  const countersigned = store.list('countersignatures').some((r) => r.artefactId === art.id && r.signer === art.countersignedBy && r.docHash === art.docHash);
  if (!approved || !countersigned) return 'No recorded approval and countersignature for this artefact.';
  const required = contract?.professionalReview;
  if (required && !store.list('countersignatures').some((r) => r.artefactId === art.id && r.signer === art.countersignedBy && r.docHash === art.docHash && r.profession === required)) {
    return `No recorded countersignature by a registered ${required.replace('_', ' ')} for this artefact.`;
  }
  return null;
}
