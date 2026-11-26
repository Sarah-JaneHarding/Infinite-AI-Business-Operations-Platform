import seedData from '../../docs/open-questions-register/questions.seed.json';
import { agentById, DEPARTMENTS } from '../departments';
import type { Platform } from './platform';
import type { Warehouse } from './warehouse';
import type { Actor } from './types';
import { checkTaskText, MAX_NOTES, MAX_TITLE } from './ceo/guard';
import type { ManualTask } from './ceo/types';

export interface OpenQuestionHistory {
  at: string;
  kind: string;
  text: string;
}

export interface OpenQuestionReview {
  actions?: string[];
  at?: string;
  summary?: string;
  verdict?: string;
}

export interface OpenQuestion {
  id: string;
  order: number;
  repo: 'ecosystem' | 'platform';
  stage: string;
  status: 'open' | 'partial' | 'parked' | 'resolved';
  title: string;
  question: string;
  reason: string;
  blocks: string;
  source: string;
  raised: string;
  options: string[];
  suggestions: string[];
  recommendation: string;
  recommendedIndex: number | null;
  recBy?: string;
  history?: OpenQuestionHistory[];
  review?: OpenQuestionReview;
}

export interface QuestionRouting {
  primaryDept: string;
  secondaryDepts: string[];
  primaryAgentId: string;
  secondaryAgentIds: string[];
  rationale: string;
}

export interface ManifestTaskSpec {
  id: string;
  title: string;
  dept: string;
  agentId?: string;
  kind: 'ai_draft' | 'decision' | 'action';
  priority: 1 | 2 | 3;
  due?: string;
  owner?: string;
  deliverable: string;
  notes: string;
  include: boolean;
}

export interface QuestionDecisionRecord {
  id: string;
  questionId: string;
  questionTitle: string;
  repo: 'ecosystem' | 'platform';
  stage: string;
  decision: string;
  selectedOptionIndex?: number;
  rationale?: string;
  decidedBy: string;
  signedAt: string;
  targetDept: string;
  targetAgentId?: string;
  manifestId: string;
  status: 'decided';
  at: string;
}

export interface TaskManifestRecord {
  id: string;
  questionId: string;
  decisionId: string;
  targetDept: string;
  targetAgentId?: string;
  summary: string;
  tasks: ManifestTaskSpec[];
  createdBy: string;
  at: string;
}

export const OPEN_QUESTIONS: readonly OpenQuestion[] = seedData as OpenQuestion[];

const clamp = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max - 1).trimEnd()}…`);
const newId = (prefix: string) => `${prefix}_${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
const futureIsoDate = (daysAhead: number) => new Date(Date.now() + daysAhead * 86_400_000).toISOString().slice(0, 10);
const deptNameOf = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;

const EXPLICIT_ROUTING: Record<string, QuestionRouting> = {
  'OQ-048a': { primaryDept: 'security', secondaryDepts: ['devops'], primaryAgentId: 'OPS-SEC-03', secondaryAgentIds: ['OPS-SRE-01'], rationale: 'Keycloak user creation & role mapping privilege boundary.' },
  'OQ-048b': { primaryDept: 'devops', secondaryDepts: ['security'], primaryAgentId: 'OPS-SRE-01', secondaryAgentIds: ['OPS-SEC-03'], rationale: 'DB commit + idp_state outbox order and tested migration rollback.' },
  'OQ-048c': { primaryDept: 'security', secondaryDepts: ['people'], primaryAgentId: 'OPS-SEC-05', secondaryAgentIds: ['OPS-PPL-04'], rationale: 'Access revocation and live session termination on suspend/offboard.' },
  'OQ-048d': { primaryDept: 'success', secondaryDepts: ['devops'], primaryAgentId: 'OPS-CS-04', secondaryAgentIds: ['OPS-SRE-05'], rationale: 'Pilot user first sign-in link onboarding flow vs Keycloak SMTP.' },
  'OQ-044': { primaryDept: 'security', secondaryDepts: ['product'], primaryAgentId: 'OPS-SEC-03', secondaryAgentIds: ['OPS-PROD-03'], rationale: 'CSP security control change and sandboxed widget iframe isolation.' },
  'OQ-030': { primaryDept: 'ai', secondaryDepts: ['curriculum', 'product'], primaryAgentId: 'OPS-AI-05', secondaryAgentIds: ['OPS-CURR-01', 'OPS-PROD-03'], rationale: 'MOD-01 per-stage ratification gates and artefact store design.' },
  'OQ-047': { primaryDept: 'security', secondaryDepts: ['executive'], primaryAgentId: 'OPS-SEC-05', secondaryAgentIds: ['OPS-EXEC-03'], rationale: 'Access control rule for reinstating suspended gate-deciding accounts.' },
  'OQ-043': { primaryDept: 'ai', secondaryDepts: ['devops'], primaryAgentId: 'OPS-AI-02', secondaryAgentIds: ['OPS-SRE-05'], rationale: 'Provider Hub env alignment and Azure live verification status.' },
  'OQ-045': { primaryDept: 'product', secondaryDepts: ['curriculum', 'executive'], primaryAgentId: 'OPS-PROD-04', secondaryAgentIds: ['OPS-CURR-01', 'OPS-EXEC-03'], rationale: 'Module widget release ratifiers and deterministic batch sign-off.' },
  'OQ-039': { primaryDept: 'security', secondaryDepts: ['product'], primaryAgentId: 'OPS-SEC-01', secondaryAgentIds: ['OPS-PROD-06'], rationale: 'Public widget appointed reviewer registry and POPIA checklist.' },
  'OQ-042': { primaryDept: 'marketing', secondaryDepts: ['legal', 'security'], primaryAgentId: 'OPS-MKT-03', secondaryAgentIds: ['OPS-LEG-05', 'OPS-SEC-01'], rationale: 'Marketing site hosting, claims approval, and Information Officer notice.' },
  'OQ-002': { primaryDept: 'curriculum', secondaryDepts: ['government'], primaryAgentId: 'OPS-CURR-01', secondaryAgentIds: ['OPS-GOV-07'], rationale: 'Phase-by-phase countersigning of 21 CAPS documents and 136 ATP sources.' },
  'OQ-003': { primaryDept: 'success', secondaryDepts: ['curriculum'], primaryAgentId: 'OPS-CS-01', secondaryAgentIds: ['OPS-CURR-04'], rationale: 'Collecting missing unit, rubric, and parent report templates from pilot school.' },
  'OQ-015': { primaryDept: 'curriculum', secondaryDepts: ['security'], primaryAgentId: 'OPS-CURR-03', secondaryAgentIds: ['OPS-SEC-01'], rationale: 'School content & safeguarding policy by grade band for age-appropriateness checks.' },
  'OQ-016': { primaryDept: 'ai', secondaryDepts: ['research'], primaryAgentId: 'OPS-AI-03', secondaryAgentIds: ['OPS-RES-02'], rationale: '50-output calibration set labelling and human agreement threshold.' },
  'OQ-017': { primaryDept: 'devops', secondaryDepts: ['finance'], primaryAgentId: 'OPS-SRE-01', secondaryAgentIds: ['OPS-FIN-01'], rationale: 'Terraform staging apply approval, AWS budget cap, and k6 load test.' },
  'OQ-031': { primaryDept: 'curriculum', secondaryDepts: ['government'], primaryAgentId: 'OPS-CURR-03', secondaryAgentIds: ['OPS-GOV-07'], rationale: 'SIAS/MTSS tier rule and school-level counting source document.' },
  'OQ-006': { primaryDept: 'curriculum', secondaryDepts: ['government'], primaryAgentId: 'OPS-CURR-05', secondaryAgentIds: ['OPS-GOV-07'], rationale: 'SACE Type 1 CPTD activity-level point tables and manual fallback.' },
  'OQ-013': { primaryDept: 'curriculum', secondaryDepts: ['people'], primaryAgentId: 'OPS-CURR-06', secondaryAgentIds: ['OPS-PPL-01'], rationale: 'First-language reviewers for African-language CAPS paraphrases.' },
  'OQ-018': { primaryDept: 'finance', secondaryDepts: ['research'], primaryAgentId: 'OPS-FIN-02', secondaryAgentIds: ['OPS-RES-05'], rationale: 'Post-pilot month-1 cost driver calibration (learners vs educators).' },
  'OQ-020': { primaryDept: 'executive', secondaryDepts: ['product'], primaryAgentId: 'OPS-EXEC-05', secondaryAgentIds: ['OPS-PROD-03'], rationale: 'Scheduled 30-45 minute human architecture walkthrough recording.' },
  'OQ-034': { primaryDept: 'government', secondaryDepts: ['product'], primaryAgentId: 'OPS-GOV-04', secondaryAgentIds: ['OPS-PROD-01'], rationale: 'District rollup scope & minimum group size policy.' },
  'OQ-050': { primaryDept: 'devops', secondaryDepts: ['finance'], primaryAgentId: 'OPS-SRE-06', secondaryAgentIds: ['OPS-FIN-03'], rationale: 'Founder SNS budget alert contacts and af-south-1 SMS sandbox test.' },
  'OQ-051': { primaryDept: 'security', secondaryDepts: ['devops'], primaryAgentId: 'OPS-SEC-03', secondaryAgentIds: ['OPS-SRE-01'], rationale: 'Moving Secrets Manager generated secrets out of Terraform state.' },
  'OQ-052': { primaryDept: 'devops', secondaryDepts: ['security', 'finance'], primaryAgentId: 'OPS-SRE-06', secondaryAgentIds: ['OPS-SEC-03', 'OPS-FIN-04'], rationale: 'Customer-managed KMS key trade-off and IAM Billing access activation.' },
  'OQ-053': { primaryDept: 'security', secondaryDepts: ['devops'], primaryAgentId: 'OPS-SEC-02', secondaryAgentIds: ['OPS-SRE-04'], rationale: 'DB_ENCRYPTION_KEY versioned tenant re-encryption procedure before go-live.' },
  'OQ-054': { primaryDept: 'ai', secondaryDepts: ['security'], primaryAgentId: 'OPS-AI-05', secondaryAgentIds: ['OPS-SEC-01'], rationale: 'POPIA purpose-limitation lifecycle of commons_pattern_sharing feature flag.' },

  'OPQ-001': { primaryDept: 'devops', secondaryDepts: ['security'], primaryAgentId: 'OPS-SRE-05', secondaryAgentIds: ['OPS-SEC-05'], rationale: 'Provisioning and custody of read-only GitHub token and Anthropic workspace key.' },
  'OPQ-002': { primaryDept: 'security', secondaryDepts: ['devops'], primaryAgentId: 'OPS-SEC-05', secondaryAgentIds: ['OPS-SRE-01'], rationale: 'Staff SSO migration from OPS_USERS tokens to Keycloak OIDC with MFA.' },
  'OPQ-003': { primaryDept: 'marketing', secondaryDepts: ['legal'], primaryAgentId: 'OPS-MKT-06', secondaryAgentIds: ['OPS-LEG-05'], rationale: 'POPIA s69 consent evidence prerequisite for outbound email/WhatsApp/social.' },
  'OPQ-004': { primaryDept: 'finance', secondaryDepts: ['legal'], primaryAgentId: 'OPS-FIN-05', secondaryAgentIds: ['OPS-LEG-04'], rationale: 'Payment/invoicing integration boundary and VAT treatment confirmation.' },
  'OPQ-005': { primaryDept: 'ai', secondaryDepts: ['marketing'], primaryAgentId: 'OPS-AI-01', secondaryAgentIds: ['OPS-MKT-03'], rationale: 'Authoritative agent count reconciliation between contracts and docs.' },
  'OPQ-006': { primaryDept: 'marketing', secondaryDepts: ['finance'], primaryAgentId: 'OPS-MKT-03', secondaryAgentIds: ['OPS-FIN-02'], rationale: 'Reconciling marketing pricing claims with commercial price list.' },
  'OPQ-007': { primaryDept: 'security', secondaryDepts: ['research'], primaryAgentId: 'OPS-SEC-01', secondaryAgentIds: ['OPS-RES-05'], rationale: 'Minimum k-anonymity group size and POPIA impact assessment for tenant aggregates.' },
  'OPQ-008': { primaryDept: 'product', secondaryDepts: ['security'], primaryAgentId: 'OPS-PROD-01', secondaryAgentIds: ['OPS-SEC-05'], rationale: 'Enabling OPS_ALLOW_ECOSYSTEM_WRITES once role-based gates are active.' },
  'OPQ-009': { primaryDept: 'product', secondaryDepts: ['security'], primaryAgentId: 'OPS-PROD-03', secondaryAgentIds: ['OPS-SEC-03'], rationale: 'Print-to-PDF vs server-side browser renderer attack surface.' },
  'OPQ-010': { primaryDept: 'devops', secondaryDepts: ['security'], primaryAgentId: 'OPS-SRE-04', secondaryAgentIds: ['OPS-SEC-03'], rationale: 'Warehouse durability, PITR backup, and migration path to Postgres with RLS.' },
  'OPQ-011': { primaryDept: 'security', secondaryDepts: ['devops'], primaryAgentId: 'OPS-SEC-03', secondaryAgentIds: ['OPS-SRE-03'], rationale: 'Security ownership of ecosystem OQ-036 Keycloak MFA enforcement.' },
  'OPQ-013': { primaryDept: 'security', secondaryDepts: ['legal'], primaryAgentId: 'OPS-SEC-04', secondaryAgentIds: ['OPS-LEG-02'], rationale: 'Role restrictions, POPIA deadlines, and removal runbook for erasure requests.' },
  'OPQ-014': { primaryDept: 'ai', secondaryDepts: ['product'], primaryAgentId: 'OPS-AI-05', secondaryAgentIds: ['OPS-PROD-03'], rationale: 'Replacing placeholder sample figures in local engine & tool defaults.' },
  'OPQ-015': { primaryDept: 'ai', secondaryDepts: ['legal'], primaryAgentId: 'OPS-AI-02', secondaryAgentIds: ['OPS-LEG-02'], rationale: 'Officer role restriction on model provider attestation and revocation.' },
  'OPQ-016': { primaryDept: 'ai', secondaryDepts: ['devops'], primaryAgentId: 'OPS-AI-04', secondaryAgentIds: ['OPS-SRE-03'], rationale: 'Live model provider smoke test and pinning active production model alias.' },
  'OPQ-017': { primaryDept: 'executive', secondaryDepts: ['legal'], primaryAgentId: 'OPS-EXEC-03', secondaryAgentIds: ['OPS-LEG-01'], rationale: 'Two-tier four-eyes signing policy for legal, finance, security & government.' },
  'OPQ-018': { primaryDept: 'ai', secondaryDepts: ['research'], primaryAgentId: 'OPS-AI-01', secondaryAgentIds: ['OPS-RES-06'], rationale: 'Configuring ingestion opt-out list across one-off agent contracts.' },
  'OPQ-019': { primaryDept: 'executive', secondaryDepts: ['ai'], primaryAgentId: 'OPS-EXEC-03', secondaryAgentIds: ['OPS-AI-05'], rationale: 'Allow/never contract policy and officer gating for autonomous standing orders.' },
  'OPQ-020': { primaryDept: 'security', secondaryDepts: ['ai'], primaryAgentId: 'OPS-SEC-03', secondaryAgentIds: ['OPS-AI-05'], rationale: 'Prompt-injection isolation for autonomous standing-order inputs.' },
  'OPQ-021': { primaryDept: 'ai', secondaryDepts: ['devops'], primaryAgentId: 'OPS-AI-04', secondaryAgentIds: ['OPS-SRE-02'], rationale: 'Auto-pausing autonomous standing orders after 3 consecutive quarantined runs.' },
  'OPQ-022': { primaryDept: 'executive', secondaryDepts: ['people'], primaryAgentId: 'OPS-EXEC-02', secondaryAgentIds: ['OPS-PPL-01'], rationale: 'Mapping accountable role titles for all 100 agents in contracts.' },
  'OPQ-023': { primaryDept: 'procurement', secondaryDepts: ['legal'], primaryAgentId: 'OPS-PRO-04', secondaryAgentIds: ['OPS-LEG-02'], rationale: 'Restricting legal/finance/security/people agents to reviewed providers.' },
  'OPQ-024': { primaryDept: 'legal', secondaryDepts: ['executive', 'finance'], primaryAgentId: 'OPS-LEG-01', secondaryAgentIds: ['OPS-EXEC-06', 'OPS-FIN-04'], rationale: 'Appointing attorney, tax adviser, and Information Officer for 65 draft docs.' },
  'OPQ-025': { primaryDept: 'devops', secondaryDepts: ['product'], primaryAgentId: 'OPS-SRE-05', secondaryAgentIds: ['OPS-PROD-04'], rationale: 'Manual/idempotent policy for library warehouse seeding.' },
  'OPQ-026': { primaryDept: 'finance', secondaryDepts: ['sales', 'legal'], primaryAgentId: 'OPS-FIN-05', secondaryAgentIds: ['OPS-SALES-03', 'OPS-LEG-04'], rationale: 'Confirming D-1 school pricing & VAT registration before sending quotes.' },
  'OPQ-027': { primaryDept: 'devops', secondaryDepts: ['procurement', 'security'], primaryAgentId: 'OPS-SRE-01', secondaryAgentIds: ['OPS-PRO-01', 'OPS-SEC-03'], rationale: 'OAuth token secrets manager architecture & first external connector priority.' },
  'OPQ-028': { primaryDept: 'ai', secondaryDepts: ['executive'], primaryAgentId: 'OPS-AI-01', secondaryAgentIds: ['OPS-EXEC-03'], rationale: 'Whether OPS-CEO-01 joins the counted agent roster alongside OPQ-005.' },
  'OPQ-029': { primaryDept: 'executive', secondaryDepts: ['product'], primaryAgentId: 'OPS-EXEC-02', secondaryAgentIds: ['OPS-PROD-02'], rationale: 'Optional duration estimate per task vs fixed 30-minute calendar placeholder.' },
  'OPQ-030': { primaryDept: 'executive', secondaryDepts: ['product'], primaryAgentId: 'OPS-EXEC-03', secondaryAgentIds: ['OPS-PROD-02'], rationale: 'Human-in-the-loop flagging threshold for CEO calendar workload.' },
  'OPQ-031': { primaryDept: 'devops', secondaryDepts: ['product'], primaryAgentId: 'OPS-SRE-05', secondaryAgentIds: ['OPS-PROD-04'], rationale: 'Manual/idempotent policy for business warehouse seeding.' },
  'OPQ-033': { primaryDept: 'legal', secondaryDepts: ['finance', 'executive'], primaryAgentId: 'OPS-LEG-01', secondaryAgentIds: ['OPS-FIN-04', 'OPS-EXEC-06'], rationale: 'Professional registration verification and OPS_SIGNERS policy.' },
  'OPQ-034': { primaryDept: 'marketing', secondaryDepts: ['product'], primaryAgentId: 'OPS-MKT-03', secondaryAgentIds: ['OPS-PROD-06'], rationale: 'Adopting ratified Ecosystem spacing/radius/shadow scales into Ops brand.' },
  'OPQ-035': { primaryDept: 'product', secondaryDepts: ['marketing'], primaryAgentId: 'OPS-PROD-06', secondaryAgentIds: ['OPS-MKT-03'], rationale: 'Switchable dark-default UI theme & contrast verification for learner screens.' },
  'OPQ-036': { primaryDept: 'devops', secondaryDepts: ['marketing'], primaryAgentId: 'OPS-SRE-05', secondaryAgentIds: ['OPS-MKT-03'], rationale: 'Scheduled CI verification of vendored brand token version across repos.' },
};

export function routeQuestion(q: OpenQuestion): QuestionRouting {
  if (EXPLICIT_ROUTING[q.id]) return EXPLICIT_ROUTING[q.id];
  const hay = `${q.stage} ${q.title} ${q.question} ${q.blocks}`.toLowerCase();
  if (/popia|erasure|privacy|keycloak|mfa|kms|encryption|csp|secret/.test(hay)) {
    return { primaryDept: 'security', secondaryDepts: ['legal'], primaryAgentId: 'OPS-SEC-01', secondaryAgentIds: ['OPS-LEG-02'], rationale: 'Security and POPIA governance scope.' };
  }
  if (/caps|atp|curriculum|lesson|sias|sace|language/.test(hay)) {
    return { primaryDept: 'curriculum', secondaryDepts: ['success'], primaryAgentId: 'OPS-CURR-01', secondaryAgentIds: ['OPS-CS-01'], rationale: 'South African CAPS curriculum and pedagogy scope.' };
  }
  if (/price|pricing|vat|invoice|budget|cost|quote/.test(hay)) {
    return { primaryDept: 'finance', secondaryDepts: ['legal'], primaryAgentId: 'OPS-FIN-02', secondaryAgentIds: ['OPS-LEG-04'], rationale: 'Commercial pricing, VAT, and financial control scope.' };
  }
  if (/legal|attorney|contract|terms|officer/.test(hay)) {
    return { primaryDept: 'legal', secondaryDepts: ['executive'], primaryAgentId: 'OPS-LEG-01', secondaryAgentIds: ['OPS-EXEC-06'], rationale: 'Legal counsel and statutory compliance scope.' };
  }
  if (/terraform|aws|postgres|github|ci|webhook|token|seed|staging/.test(hay)) {
    return { primaryDept: 'devops', secondaryDepts: ['security'], primaryAgentId: 'OPS-SRE-01', secondaryAgentIds: ['OPS-SEC-03'], rationale: 'Infrastructure, release engineering, and operational tooling.' };
  }
  if (/brand|marketing|site|social|post/.test(hay)) {
    return { primaryDept: 'marketing', secondaryDepts: ['product'], primaryAgentId: 'OPS-MKT-03', secondaryAgentIds: ['OPS-PROD-06'], rationale: 'Brand consistency and external communications.' };
  }
  if (/model|agent|prompt|eval|autonomy|provider/.test(hay)) {
    return { primaryDept: 'ai', secondaryDepts: ['executive'], primaryAgentId: 'OPS-AI-01', secondaryAgentIds: ['OPS-EXEC-03'], rationale: 'AI governance, agent contracts, and model safety.' };
  }
  return { primaryDept: 'executive', secondaryDepts: ['product'], primaryAgentId: 'OPS-EXEC-03', secondaryAgentIds: ['OPS-PROD-01'], rationale: 'Executive governance and cross-functional coordination.' };
}

function isDeferOrHoldDecision(decisionText: string): boolean {
  const s = decisionText.toLowerCase();
  return /\b(defer|park|leave parked|keep off|keep archived|stay dev-only|stay on|accept for the pilot|leave manual|keep as is|manual and idempotent|keep print-to-pdf|keep fixed inputs)\b/.test(s);
}

export function generateTaskManifest(
  q: OpenQuestion,
  decisionText: string,
  rationale = '',
  opts: { targetDept?: string; targetAgentId?: string } = {},
): ManifestTaskSpec[] {
  const routing = routeQuestion(q);
  const dept = opts.targetDept && DEPARTMENTS.some((d) => d.id === opts.targetDept) ? opts.targetDept : routing.primaryDept;
  const primaryAgent = (opts.targetAgentId && agentById(opts.targetAgentId)) ? agentById(opts.targetAgentId)! : (agentById(routing.primaryAgentId) ?? DEPARTMENTS.find((d) => d.id === dept)!.agents[0]);
  const secondaryDept = routing.secondaryDepts.find((d) => d !== dept) ?? routing.secondaryDepts[0] ?? dept;
  const secondaryAgentId = routing.secondaryAgentIds[0] ?? DEPARTMENTS.find((d) => d.id === secondaryDept)!.agents[0].id;
  const secondaryAgent = agentById(secondaryAgentId);

  const decisionClean = decisionText.trim() || q.recommendation || q.title;
  const decisionShort = clamp(decisionClean, 68);
  const blocksShort = clamp(q.blocks || 'target gate', 55);
  const rationaleLine = rationale.trim() ? ` Rationale: ${rationale.trim()}` : '';
  const holdMode = isDeferOrHoldDecision(decisionClean);

  const tasks: ManifestTaskSpec[] = [];

  // 1. Agent-assisted draft / memo task in the target department
  tasks.push({
    id: newId('mt'),
    title: clamp(
      holdMode
        ? `${q.id}: Draft decision & review-trigger memo (${primaryAgent.id})`
        : `${q.id}: Run ${primaryAgent.id} to draft implementation brief`,
      MAX_TITLE,
    ),
    dept,
    agentId: primaryAgent.id,
    kind: 'ai_draft',
    priority: holdMode ? 2 : 1,
    due: futureIsoDate(holdMode ? 14 : 5),
    owner: primaryAgent.owner,
    deliverable: `${primaryAgent.name} (${primaryAgent.id}) draft artefact in Studio`,
    notes: clamp(
      `Decision for ${q.id} (${q.title}): "${decisionClean}".${rationaleLine} Use agent ${primaryAgent.id} (${primaryAgent.name}) to prepare the draft record covering: ${q.blocks}.${holdMode ? ' Include clear re-evaluation triggers.' : ''}`,
      MAX_NOTES,
    ),
    include: true,
  });

  // 2. Concrete operational execution / policy enforcement task
  tasks.push({
    id: newId('mt'),
    title: clamp(
      holdMode
        ? `${q.id}: Lock interim boundary — ${decisionShort}`
        : `${q.id}: Execute "${decisionShort}" (${blocksShort})`,
      MAX_TITLE,
    ),
    dept,
    agentId: primaryAgent.id,
    kind: 'action',
    priority: holdMode ? 2 : 1,
    due: futureIsoDate(holdMode ? 10 : 7),
    owner: `${deptNameOf(dept)} Lead`,
    deliverable: holdMode ? 'Documented guardrail & monitoring rule' : `Completed change unblocking ${blocksShort}`,
    notes: clamp(
      `Recorded decision: "${decisionClean}".${rationaleLine} Target scope: ${q.blocks}. Source: ${q.source}. Verification: confirm evidence is logged in the warehouse and open-question blocker is cleared.`,
      MAX_NOTES,
    ),
    include: true,
  });

  // 3. Cross-department or Law 02 countersignature verification task
  tasks.push({
    id: newId('mt'),
    title: clamp(
      `${q.id}: ${deptNameOf(secondaryDept)} review & Law 02 sign-off${secondaryAgent ? ` (${secondaryAgent.id})` : ''}`,
      MAX_TITLE,
    ),
    dept: secondaryDept,
    agentId: secondaryAgent?.id,
    kind: 'decision',
    priority: 2,
    due: futureIsoDate(holdMode ? 21 : 10),
    owner: secondaryAgent?.owner ?? `${deptNameOf(secondaryDept)} Reviewer`,
    deliverable: 'Human-ratified cross-department verification',
    notes: clamp(
      `Review "${decisionClean}" against ${deptNameOf(secondaryDept)} constraints and ratify under System Law 02 before production reliance.${rationaleLine}`,
      MAX_NOTES,
    ),
    include: true,
  });

  // 4. Add compliance / POPIA task if governance keywords present and Security/Legal aren't primary
  const complianceText = `${q.title} ${q.question} ${q.reason} ${decisionClean}`.toLowerCase();
  if (/popia|privacy|security|mfa|keycloak|kms|encryption|consent|law 02|attorney|information officer|safeguarding/.test(complianceText) && dept !== 'security' && secondaryDept !== 'security') {
    tasks.push({
      id: newId('mt'),
      title: clamp(`${q.id}: POPIA & Security compliance check (OPS-SEC-01)`, MAX_TITLE),
      dept: 'security',
      agentId: 'OPS-SEC-01',
      kind: 'decision',
      priority: 1,
      due: futureIsoDate(7),
      owner: 'Information Officer',
      deliverable: 'POPIA & Security clearance note',
      notes: clamp(
        `Verify POPIA s72 / s69 and Law 02 compliance for ${q.id} decision: "${decisionClean}".${rationaleLine}`,
        MAX_NOTES,
      ),
      include: true,
    });
  }

  return tasks;
}

export function latestQuestionDecisions(store: Pick<Warehouse, 'latest'>): QuestionDecisionRecord[] {
  return store.latest<QuestionDecisionRecord>('open_question_decisions', 'id');
}

export function latestTaskManifests(store: Pick<Warehouse, 'latest'>): TaskManifestRecord[] {
  return store.latest<TaskManifestRecord>('task_manifests', 'id');
}

export interface RecordDecisionInput {
  platform: Platform;
  question: OpenQuestion;
  decisionText: string;
  selectedOptionIndex?: number;
  rationale?: string;
  targetDept: string;
  targetAgentId?: string;
  tasks: ManifestTaskSpec[];
  actor: Actor;
  signature: string;
}

export async function recordDecisionAndManifest(input: RecordDecisionInput): Promise<{
  decision: QuestionDecisionRecord;
  manifest: TaskManifestRecord;
  createdTasks: ManualTask[];
}> {
  const { platform, question, decisionText, selectedOptionIndex, rationale, targetDept, targetAgentId, tasks, actor, signature } = input;
  const cleanDecision = decisionText.trim();
  const cleanSignature = signature.trim();
  const cleanRationale = rationale?.trim() ?? '';
  if (!cleanDecision) throw new Error('Enter or select a decision before recording.');
  if (!cleanSignature) throw new Error('A statutory signature is required to record this decision.');
  if (!DEPARTMENTS.some((d) => d.id === targetDept)) throw new Error('Select a valid target department.');

  const activeTasks = tasks.filter((t) => t.include && t.title.trim());
  if (!activeTasks.length) throw new Error('Keep at least one task in the manifest to dispatch.');

  const refused = checkTaskText(question.id, cleanDecision, cleanRationale, cleanSignature);
  if (refused) throw new Error(refused);
  for (const t of activeTasks) {
    const tRefused = checkTaskText(t.title, t.notes);
    if (tRefused) throw new Error(`Task "${t.title.slice(0, 40)}…": ${tRefused}`);
    if (t.title.length > MAX_TITLE) throw new Error(`Task title exceeds ${MAX_TITLE} characters.`);
    if (t.notes.length > MAX_NOTES) throw new Error(`Task notes exceed ${MAX_NOTES} characters.`);
    if (!DEPARTMENTS.some((d) => d.id === t.dept)) throw new Error(`Invalid department on task "${t.title}".`);
  }

  const at = new Date().toISOString();
  const decisionId = question.id;
  const manifestId = newId('man');

  const manifest: TaskManifestRecord = {
    id: manifestId,
    questionId: question.id,
    decisionId,
    targetDept,
    targetAgentId,
    summary: clamp(`${question.id} -> ${cleanDecision}`, MAX_NOTES),
    tasks: activeTasks.map((t) => ({ ...t, title: clamp(t.title.trim(), MAX_TITLE), notes: clamp(t.notes.trim(), MAX_NOTES) })),
    createdBy: cleanSignature,
    at,
  };

  const decision: QuestionDecisionRecord = {
    id: decisionId,
    questionId: question.id,
    questionTitle: clamp(question.title, MAX_TITLE),
    repo: question.repo,
    stage: question.stage,
    decision: clamp(cleanDecision, MAX_NOTES),
    selectedOptionIndex,
    rationale: cleanRationale ? clamp(cleanRationale, MAX_NOTES) : undefined,
    decidedBy: cleanSignature,
    signedAt: at,
    targetDept,
    targetAgentId,
    manifestId,
    status: 'decided',
    at,
  };

  await platform.warehouse.put('task_manifests', manifest as unknown as Record<string, unknown> & { id: string });
  await platform.warehouse.put('open_question_decisions', decision as unknown as Record<string, unknown> & { id: string });

  const createdTasks: ManualTask[] = [];
  for (const item of manifest.tasks) {
    const manual: ManualTask & { by: string; at: string } = {
      id: item.id,
      title: item.title,
      dept: item.dept,
      agentId: item.agentId,
      questionId: question.id,
      manifestId,
      due: item.due || undefined,
      owner: item.owner,
      notes: item.notes,
      source: 'manual',
      kind: item.kind,
      requiresHuman: item.kind !== 'ai_draft',
      by: actor.id,
      at,
    };
    await platform.warehouse.put('ceo_tasks', manual as unknown as Record<string, unknown> & { id: string });
    createdTasks.push(manual);
  }

  await platform.ledger.append({
    orgId: platform.orgId,
    actor: actor.id,
    action: 'oq.decided',
    subject: question.id,
    detail: {
      decision: decision.decision,
      signedBy: cleanSignature,
      targetDept,
      targetAgentId,
      manifestId,
      taskCount: createdTasks.length,
    },
  });

  return { decision, manifest, createdTasks };
}
