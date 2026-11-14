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
