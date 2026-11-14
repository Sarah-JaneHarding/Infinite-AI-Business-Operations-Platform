/**
 * Business Planning Package v1.4 (13 November 2026) as data. The platform reads these figures; a test fails if
 * they drift from the working price formula in src/departments/calc.ts. Amounts are South African rand.
 */
import { SCHOOL_PRICING } from '../../departments/calc';

export const PLAN_VERSION = '1.4';
export const PLAN_DATE = '2026-11-13';

export const PLAN = {
  version: PLAN_VERSION,
  date: PLAN_DATE,
  currency: 'ZAR',
  pricing: {
    minMonthly: 750, platformFee: 300, perEducator: 75, perLearnerFirst: 4.0, tierBreak: 500, perLearnerBeyond: 1.5,
    communityFactor: 0.5, annualDiscount: 0.1, vat: 0.15,
    /** Decision D-1: provisional until three schools have seen it. */
    status: 'working price, provisional until three schools have seen it',
  },
  founder: { monthlyPay: 35_000, monthsInModel: 12, note: 'Decision D-5: half-time; reviewed after the pilot phase.' },
  funding: { baseNeedMillion: 14.3, note: 'Base case, trough plus 25 per cent, rounded up to R0.1m (package v1.4, section 12).' },
} as const;

export interface PlanDecision {
  id: string;
  question: string;
  decision: string;
  status: 'decided' | 'deferred' | 'open';
  /** What a person still has to do. Absent when nothing is left. */
  humanAction?: string;
  /** Free text from the package, for example "December". Never turned into a date. */
  when?: string;
  dept: string;
}

/** Section 15 of the package: decisions and the follow-up each one still needs from a person. */
export const PLAN_DECISIONS: PlanDecision[] = [
  { id: 'D-1', question: 'Which price card is authoritative?', decision: 'Per-school formula is the working price, provisional until three schools have seen it.', status: 'decided', dept: 'finance' },
  { id: 'D-2', question: 'Publish VAT-inclusive prices rounded or exact?', decision: 'Exact VAT-inclusive prices with the ex-VAT split shown.', status: 'decided', dept: 'finance' },
  { id: 'D-3', question: 'Is teacher training a second line?', decision: 'No. Teacher training is included in the ecosystem.', status: 'decided', dept: 'product' },
  { id: 'D-4', question: 'Who are pilot schools #2 and #3?', decision: 'Defer #2 and #3 until pre-pilot testing with #1 is complete.', status: 'decided', dept: 'success' },
  { id: 'D-5', question: 'Founder salary and time commitment', decision: 'R35,000 per month, half-time, pre-pilot and pilot phase.', status: 'decided', humanAction: 'Decide what happens to founder pay after month 12 (pilot-phase review).', dept: 'executive' },
  { id: 'D-6', question: 'VAT registration route', decision: 'Voluntary registration from launch, subject to the accountant.', status: 'decided', humanAction: 'Confirm the VAT route and timing with the accountant.', dept: 'finance' },
  { id: 'OQ-003', question: 'School-supplied templates and countersignature', decision: 'Defer until school onboarding.', status: 'deferred', humanAction: 'Ask the Benjamin Pine principal for the unit blueprint, assessment task, rubric/memo and parent report templates, with a date.', dept: 'success' },
  { id: 'OQ-016', question: 'Calibrate LLM judges (50+ human labels per module)', decision: 'December-holiday labelling sprint with primary school staff; two people label a sample.', status: 'decided', humanAction: 'Schedule the labelling sprint.', when: 'December', dept: 'curriculum' },
  { id: 'OQ-017', question: 'Run k6 peak and spike tests in staging', decision: 'Apply Terraform to a small staging environment, then run k6.', status: 'decided', humanAction: 'Schedule the staging environment and the k6 run.', when: 'Nov-Dec', dept: 'devops' },
  { id: 'OQ-020', question: 'Record architecture walkthrough', decision: '30-45 minutes using HOW_TO_ADD_AN_AGENT.md.', status: 'decided', humanAction: 'Schedule and record the architecture walkthrough.', when: 'December', dept: 'devops' },
  { id: 'OQ-036', question: 'Is MFA enforced for admin, SMT and platform roles?', decision: 'Keycloak OTP and email verification with a drift test.', status: 'decided', humanAction: 'Run it against a live Keycloak and confirm.', dept: 'security' },
  { id: 'OQ-044', question: 'Serve the widget archive from the app?', decision: 'Yes, from the ecosystem app, behind a gated route.', status: 'decided', humanAction: 'Decide the CSP approach and sign off.', dept: 'security' },
  { id: 'TOK', question: 'Sign-in tokens that were in an uploaded .env file', decision: 'Rotate them.', status: 'open', humanAction: 'Rotate the sign-in tokens.', dept: 'security' },
];

/** Plan figures that must equal the code. Returned as differences, so an empty list means aligned. */
export function planDrift(): string[] {
  const diffs: string[] = [];
  for (const [k, v] of Object.entries(SCHOOL_PRICING)) {
    const p = (PLAN.pricing as Record<string, unknown>)[k];
    if (p !== undefined && p !== v) diffs.push(`pricing.${k}: plan ${String(p)} vs code ${String(v)}`);
  }
  return diffs;
}
