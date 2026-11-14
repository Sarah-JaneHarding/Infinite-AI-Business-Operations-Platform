/** Signing policy shared by server and browser. Pure: no node imports. */
export const SINGLE_SIGNER = 'single-signer' as const;

export type SigningMode = 'solo' | 'dual';
export interface SigningPolicy { mode: SigningMode; waitMs: number }
export const DEFAULT_SIGNING: SigningPolicy = { mode: 'dual', waitMs: 600_000 };

export const PROFESSIONS = ['attorney', 'accountant', 'tax_practitioner'] as const;
export type Profession = (typeof PROFESSIONS)[number];

/** Milliseconds left before a solo approval may be released; 0 once elapsed, never negative. */
export function soloWaitRemainingMs(approvedAt: string, now: Date, policy: SigningPolicy): number {
  const start = Date.parse(approvedAt);
  if (Number.isNaN(start)) return policy.waitMs; // fail closed: an unreadable timestamp never shortens the wait
  const nowMs = now.getTime();
  if (Number.isNaN(nowMs)) return policy.waitMs; // fail closed: an invalid clock never shortens the wait
  const left = Math.max(0, start + policy.waitMs - nowMs);
  return Number.isFinite(left) ? left : Number.MAX_SAFE_INTEGER; // never NaN or Infinity
}

/** An agent whose output always needs two different people, whatever the signing mode. professionalReview implies it. */
export const requiresTwoPerson = (a: { twoPerson?: boolean; professionalReview?: Profession }): boolean => a.twoPerson === true || a.professionalReview !== undefined;

/** True only if this person is in the list with exactly the required profession. Pure, so the browser Platform can use it. */
export function holdsProfession(signers: readonly { id: string; profession?: Profession }[], personId: string, required: Profession): boolean {
  return signers.some((s) => s.id === personId && s.profession === required);
}
