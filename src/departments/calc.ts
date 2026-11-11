// Pure business calculators. They take the numbers the human types in and nothing else:
// no defaults, no benchmarks, no assumptions. A missing or zero denominator returns null (shown as "n/a").

export interface CalcOut { label: string; value: number | null; unit: string; formula: string }
const div = (a: number, b: number) => (b === 0 || !Number.isFinite(a / b) ? null : a / b);

export const runway = (cash: number, monthlyNetBurn: number): CalcOut[] => [
  { label: 'Runway', value: monthlyNetBurn > 0 ? div(cash, monthlyNetBurn) : null, unit: 'months', formula: 'cash ÷ monthly net burn' },
];
export const burnMultiple = (netBurn: number, netNewArr: number): CalcOut[] => [
  { label: 'Burn multiple', value: div(netBurn, netNewArr), unit: '×', formula: 'net burn ÷ net new ARR' },
];
export const unitEconomics = (cac: number, arpaMonthly: number, grossMarginPct: number, monthlyChurnPct: number): CalcOut[] => {
  const gm = grossMarginPct / 100;
  const churn = monthlyChurnPct / 100;
  const ltv = churn > 0 ? div(arpaMonthly * gm, churn) : null;
  return [
    { label: 'LTV', value: ltv, unit: 'currency', formula: 'ARPA × gross margin ÷ monthly churn' },
    { label: 'LTV : CAC', value: ltv === null ? null : div(ltv, cac), unit: '×', formula: 'LTV ÷ CAC' },
    { label: 'CAC payback', value: div(cac, arpaMonthly * gm), unit: 'months', formula: 'CAC ÷ (ARPA × gross margin)' },
  ];
};
export const nrr = (startMrr: number, expansion: number, contraction: number, churned: number): CalcOut[] => [
  { label: 'Net revenue retention', value: div(startMrr + expansion - contraction - churned, startMrr) === null ? null : (div(startMrr + expansion - contraction - churned, startMrr) as number) * 100, unit: '%', formula: '(start + expansion − contraction − churn) ÷ start' },
  { label: 'Gross revenue retention', value: div(startMrr - contraction - churned, startMrr) === null ? null : (div(startMrr - contraction - churned, startMrr) as number) * 100, unit: '%', formula: '(start − contraction − churn) ÷ start' },
];
export const grossMargin = (revenue: number, cogs: number): CalcOut[] => [
  { label: 'Gross margin', value: revenue === 0 ? null : ((revenue - cogs) / revenue) * 100, unit: '%', formula: '(revenue − COGS) ÷ revenue' },
];
export const breakEven = (fixedCosts: number, pricePerUnit: number, variableCostPerUnit: number): CalcOut[] => [
  { label: 'Break-even units', value: pricePerUnit - variableCostPerUnit > 0 ? div(fixedCosts, pricePerUnit - variableCostPerUnit) : null, unit: 'units', formula: 'fixed costs ÷ (price − variable cost)' },
];
/** RICE = reach × impact × confidence ÷ effort (Intercom). Confidence as a percentage. */
export const rice = (reach: number, impact: number, confidencePct: number, effort: number): CalcOut[] => [
  { label: 'RICE score', value: div(reach * impact * (confidencePct / 100), effort), unit: 'points', formula: 'reach × impact × confidence ÷ effort' },
];
/** Weighted decision matrix: scores and weights are all typed in by the human. */
export const weightedScore = (rows: { weight: number; score: number }[]): CalcOut[] => {
  const w = rows.reduce((a, r) => a + r.weight, 0);
  return [{ label: 'Weighted score', value: div(rows.reduce((a, r) => a + r.weight * r.score, 0), w), unit: 'weighted avg', formula: 'Σ(weight × score) ÷ Σ weight' }];
};
/** ITIL-style priority from impact and urgency (1 = highest). Matrix is the standard 3×3 convention. */
export function priority(impact: 1 | 2 | 3, urgency: 1 | 2 | 3): 'P1' | 'P2' | 'P3' | 'P4' {
  const s = impact + urgency;
  return s <= 2 ? 'P1' : s === 3 ? 'P2' : s <= 4 ? 'P3' : 'P4';
}
/** MEDDICC: count of the eight elements the rep can evidence. Qualification gate, not a forecast. */
export const MEDDICC = ['Metrics', 'Economic buyer', 'Decision criteria', 'Decision process', 'Identify pain', 'Champion', 'Competition', 'Paper process'] as const;
export const meddiccCoverage = (evidenced: boolean[]) => ({ evidenced: evidenced.filter(Boolean).length, of: MEDDICC.length, gaps: MEDDICC.filter((_, i) => !evidenced[i]) });
export const variance = (budget: number, actual: number): CalcOut[] => [
  { label: 'Variance', value: actual - budget, unit: 'currency', formula: 'actual − budget' },
  { label: 'Variance %', value: budget === 0 ? null : ((actual - budget) / budget) * 100, unit: '%', formula: '(actual − budget) ÷ budget' },
];

/** Per-school pricing model (project doc claude/per-school-pricing-model-2026-11-11.md). These are the
 * company's own proposed rates, held in one place so the quote widget and its tests share them. */
export const SCHOOL_PRICING = {
  minMonthly: 750, platformFee: 300, perEducator: 75, perLearnerFirst: 4.0, tierBreak: 500, perLearnerBeyond: 1.5,
  communityFactor: 0.5, annualDiscount: 0.1, vat: 0.15, variablePerLearner: 1.76, paymentFee: 0.01,
} as const;

/** Monthly price ex VAT for a school, standard rate. Learners and educators only. */
export const schoolMonthlyExVat = (learners: number, educators: number): number | null => {
  const P = SCHOOL_PRICING;
  if (![learners, educators].every((n) => Number.isFinite(n) && n >= 0)) return null;
  const raw = P.platformFee + P.perEducator * educators + P.perLearnerFirst * Math.min(learners, P.tierBreak) + P.perLearnerBeyond * Math.max(0, learners - P.tierBreak);
  return Math.max(P.minMonthly, raw);
};

/** Quote for one school: standard and community rates, monthly and annual prepay, VAT and internal margin. */
export const schoolQuote = (learners: number, educators: number): CalcOut[] => {
  const P = SCHOOL_PRICING;
  const std = schoolMonthlyExVat(learners, educators);
  if (std === null) return [{ label: 'Monthly price ex VAT', value: null, unit: 'R', formula: 'learners and educators must be zero or more' }];
  const com = std * P.communityFactor;
  const annual = (m: number) => m * 12 * (1 - P.annualDiscount);
  const margin = (m: number) => m - P.variablePerLearner * learners - P.paymentFee * m;
  return [
    { label: 'Standard: monthly ex VAT', value: std, unit: 'R', formula: 'max(R750, R300 + R75 × educators + R4.00 × first 500 learners + R1.50 × learners above 500)' },
    { label: 'Standard: monthly incl VAT', value: std * (1 + P.vat), unit: 'R', formula: 'ex VAT × 1.15' },
    { label: 'Standard: annual prepay ex VAT', value: annual(std), unit: 'R', formula: 'monthly × 12 × 0.90' },
    { label: 'Community rate: monthly ex VAT', value: com, unit: 'R', formula: 'standard × 50% (no-fee / low-budget public schools)' },
    { label: 'Community rate: annual prepay ex VAT', value: annual(com), unit: 'R', formula: 'community monthly × 12 × 0.90' },
    { label: 'Price per learner per month (standard, ex VAT)', value: div(std, learners), unit: 'R', formula: 'monthly ex VAT ÷ learners' },
    { label: 'Internal margin per month (standard, ex VAT)', value: margin(std), unit: 'R', formula: 'price − R1.76 × learners − 1% payment fee' },
  ];
};
