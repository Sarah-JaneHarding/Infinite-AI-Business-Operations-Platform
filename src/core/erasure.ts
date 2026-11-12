/** POPIA erasure requests: raised by one person, decided by a different one. Only a hash of the subject reference is ever stored. */
export const ERASURE_CATEGORIES = ['data_subject_request', 'consent_withdrawn', 'retention_expired', 'unlawfully_obtained', 'other'] as const;
export type ErasureCategory = (typeof ERASURE_CATEGORIES)[number];
export const CATEGORY_LABEL: Record<ErasureCategory, string> = {
  data_subject_request: 'Data subject asked for erasure',
  consent_withdrawn: 'Consent withdrawn',
  retention_expired: 'Retention period ended',
  unlawfully_obtained: 'Obtained unlawfully',
  other: 'Other (explain in the note)',
};

export type ErasureStatus = 'REQUESTED' | 'APPROVED' | 'REJECTED' | 'EXECUTED';

export interface ErasureRequest {
  id: string;
  /** sha-256 of the trimmed subject reference. The reference itself is never stored. */
  subjectHash: string;
  category: ErasureCategory;
  note: string;
  status: ErasureStatus;
  requestedBy: string;
  decidedBy?: string;
  decisionNote?: string;
  version: number;
  at: string;
}

/** The same normalisation everywhere a subject reference is hashed, so a request and a later run always agree. */
export const normalizeSubject = (s: string) => s.trim();
