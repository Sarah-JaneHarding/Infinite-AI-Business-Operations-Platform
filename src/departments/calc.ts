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
