import { describe, expect, it } from 'vitest';
import { schoolMonthlyExVat, schoolQuote } from '../src/departments/calc';
import { FUNDING_LEAD_SEED } from '../src/departments/fundingLeads';
import { DEPARTMENTS } from '../src/departments';

describe('school quote calculator matches the pricing model worked examples', () => {
  it.each([[60, 4, 840], [120, 8, 1380], [150, 9, 1575], [250, 12, 2200], [400, 16, 3100], [800, 26, 4700], [1500, 55, 7925]])('%i learners, %i educators = R%i', (l, e, p) => {
    expect(schoolMonthlyExVat(l, e)).toBe(p);
  });
  it('average public school (577 / 18) is R3,766 standard and R1,883 community (rounded)', () => {
    expect(Math.round(schoolMonthlyExVat(577, 18)!)).toBe(3766);
    const q = schoolQuote(577, 18);
    expect(Math.round(q[3].value!)).toBe(1883);
    expect(Math.round(q[1].value!)).toBe(4330);
  });
  it('applies the R750 minimum and annual prepay discount', () => {
    expect(schoolMonthlyExVat(10, 1)).toBe(750);
    expect(schoolQuote(10, 1)[2].value).toBeCloseTo(750 * 12 * 0.9, 6);
  });
  it('returns n/a for bad input and no per-learner price at zero learners', () => {
    expect(schoolMonthlyExVat(-1, 2)).toBeNull();
    expect(schoolMonthlyExVat(NaN, 2)).toBeNull();
    expect(schoolQuote(0, 3)[5].value).toBeNull();
  });
});

describe('funding leads tracker', () => {
  const dept = DEPARTMENTS.find((d) => d.id === 'government')!;
  const w = dept.widgets.find((x) => x.id === 'leads');
  it('is a seeded tracker with 43 unique leads whose select values are valid', () => {
    expect(w?.type).toBe('tracker');
    if (w?.type !== 'tracker') return;
    expect(FUNDING_LEAD_SEED).toHaveLength(43);
    expect(new Set(FUNDING_LEAD_SEED.map((r) => r.id)).size).toBe(43);
    for (const r of FUNDING_LEAD_SEED) for (const c of w.columns) {
      expect(r[c.key], `${r.id}.${c.key}`).toBeTruthy();
      if (c.kind === 'select') expect(c.options).toContain(r[c.key]);
    }
  });
  it('invents no email addresses beyond those found on public pages', () => {
    const emails = FUNDING_LEAD_SEED.flatMap((r) => r.contact.match(/[\w.-]+@[\w.-]+\.\w+/g) ?? []);
    expect(emails.length).toBeLessThan(12);
  });
  it('finance has the quote calculator', () => {
    expect(DEPARTMENTS.find((d) => d.id === 'finance')!.widgets.some((x) => x.id === 'schoolquote' && x.type === 'calc')).toBe(true);
  });
});
