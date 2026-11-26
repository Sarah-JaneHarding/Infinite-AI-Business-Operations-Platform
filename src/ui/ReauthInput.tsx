import type { Platform, Artefact } from '../core/platform';
import type { Actor } from '../core/types';
import type { AgentContract } from '../core/agent';
import { withReauth } from '../core/api';

/** The token field for countersigning your own approval (solo mode). Shared by the Review Board and the Studio. */
export function ReauthInput({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input className="input" type="password" autoComplete="off" value={value} onChange={(e) => onChange(e.target.value)} placeholder="Your token (needed to countersign your own approval)" aria-label="Re-enter your token to countersign" />;
}

/** Countersign. When the signer is the approver, their own token travels in the `x-ops-reauth` header for this one call. */
export function countersignWith(p: Platform, a: Artefact, actor: Actor, note: string, agent: AgentContract | undefined, token: string) {
  return a.approvedBy === actor.id ? withReauth(token, () => p.countersign(a.id, actor, note, agent)) : p.countersign(a.id, actor, note, agent);
}
