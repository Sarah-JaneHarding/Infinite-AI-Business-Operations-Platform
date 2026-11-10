export type NavTab = 
  | 'command' 
  | 'studio'
  | 'warehouse'
  | 'depts'
  | 'brain' 
  | 'ledger' 
  | 'infra' 
  | 'website'
  | 'guardrails'
  | 'connector';

export interface DocumentItem {
  id: string;
  title: string;
  type: 'PLAN' | 'AUDIT' | 'SPEC' | 'POLICY' | 'SOP' | 'PLAYBOOK' | 'LOG' | 'CONTRACT' | 'AGREEMENT';
  category?: 'OPERATIONS' | 'GOVERNANCE' | 'ECOSYSTEM' | 'COMMERCIAL' | 'TECHNICAL' | 'LEGAL';
  version: string;
  owner: string;
  status: 'LIVE' | 'REVIEW' | 'DRAFT' | 'RATIFIED' | 'NEEDS_SIGNATURE';
  reviewStatus?: 'DRAFT' | 'IN_REVIEW' | 'LEGAL_APPROVED' | 'READY_TO_SIGN' | 'RATIFIED';
  reviewNotes?: string;
  lastUpdated: string;
  content?: string;
  hash?: string;
  tags?: string[];
  linkedTenantId?: string;
  countersignedBy?: string;
  countersignedAt?: string;
  countersignHash?: string;
  changeLog?: {
    version: string;
    date: string;
    author: string;
    summary: string;
  }[];
}

export interface WarehouseContract {
  id: string;
  title: string;
  tenantId: string;
  tenantName: string;
  type: 'SCHOOL_SAAS' | 'PILOT_SEED' | 'ENTERPRISE_MSA' | 'SLA_ADDENDUM';
  tier: 'Standard' | 'Pilot Seed' | 'Enterprise';
  monthlyValueZar: number;
  annualValueZar: number;
  startDate: string;
  renewalDate: string;
  status: 'ACTIVE' | 'PENDING_RATIFICATION' | 'DRAFT' | 'RENEWAL_DUE';
  signatories: {
    name: string;
    role: string;
    status: 'SIGNED' | 'PENDING';
    signedAt?: string;
  }[];
  documentRefId: string;
  sha256Hash: string;
  termsSummary: string;
}

export interface WarehouseTenant {
  id: string;
  name: string;
  category: 'PRIMARY_SCHOOL' | 'HIGH_SCHOOL' | 'DISTRICT_OFFICE' | 'ENTERPRISE';
  province: string;
  city: string;
  contactPerson: string;
  contactEmail: string;
  learnersCount: number;
  educatorsCount: number;
  tier: 'Standard' | 'Pilot Seed' | 'Enterprise';
  monthlyFeeZar: number;
  status: 'ACTIVE' | 'ONBOARDING' | 'PILOT_GATED' | 'CHURN_RISK';
  onboardingDate: string;
  kmsKeyId: string;
  dbSchema: string;
  healthScore: number;
  complianceRating: 'POPIA_VERIFIED' | 'REVIEW_REQUIRED' | 'PROVISIONAL';
  assignedAgentsCount: number;
  storageGb: number;
}

export interface WarehousePolicyAgreement {
  id: string;
  title: string;
  jurisdiction: string;
  scope: string;
  enforcementLevel: 'L0_IMMUTABLE' | 'L1_RESTRICTIVE' | 'L2_OPERATIONAL';
  status: 'ACTIVE_RATIFIED' | 'PENDING_RATIFICATION' | 'UNDER_REVISION';
  effectiveDate: string;
  nextReviewDate: string;
  governingBody: string;
  documentRefId: string;
  retentionYears: number;
  tombstoneEligible: boolean;
}

export interface WarehouseAuditRecord {
  id: string;
  timestamp: string;
  entityType: 'DOCUMENT' | 'CONTRACT' | 'TENANT' | 'POLICY' | 'LEDGER' | 'WAREHOUSE';
  entityId: string;
  action: 'CREATE' | 'UPDATE' | 'REVIEW' | 'RATIFY' | 'COUNTERSIGN' | 'ARCHIVE' | 'DELETE' | 'INITIALIZE';
  actor: string;
  actorRole: string;
  details: string;
  merkleHash: string;
}
