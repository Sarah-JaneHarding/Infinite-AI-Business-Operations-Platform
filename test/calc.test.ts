import { describe, expect, it } from 'vitest';
import * as c from '../src/departments/calc';

describe('calculators take inputs only', () => {
  it('runway, burn multiple, unit economics, NRR, margin, break-even, RICE', () => {
    expect(c.runway(1200, 100)[0].value).toBe(12);
    expect(c.burnMultiple(300, 100)[0].value).toBe(3);
    const u = c.unitEconomics(600, 100, 80, 2);
    expect(u[0].value).toBe(4000);
    expect(u[2].value).toBe(7.5);
    expect(c.nrr(1000, 100, 50, 50)[0].value).toBe(100);
    expect(c.grossMargin(200, 50)[0].value).toBe(75);
    expect(c.breakEven(1000, 30, 20)[0].value).toBe(100);
    expect(c.rice(1000, 2, 80, 4)[0].value).toBe(400);
  });
  it('returns null (n/a) instead of Infinity/NaN on bad denominators', () => {
    expect(c.runway(100, 0)[0].value).toBeNull();
    expect(c.unitEconomics(1, 0, 0, 0).every((o) => o.value === null)).toBe(true);
    expect(c.nrr(0, 1, 1, 1)[0].value).toBeNull();
    expect(c.grossMargin(0, 5)[0].value).toBeNull();
    expect(c.breakEven(10, 5, 5)[0].value).toBeNull();
    expect(c.weightedScore([])[0].value).toBeNull();
  });
  it('weighted score, priority, MEDDICC, variance', () => {
    expect(c.weightedScore([{ weight: 3, score: 4 }, { weight: 1, score: 2 }])[0].value).toBe(3.5);
    expect(c.priority(1, 1)).toBe('P1');
    expect(c.priority(3, 3)).toBe('P4');
    expect(c.meddiccCoverage([true, false, true, false, false, false, false, false])).toMatchObject({ evidenced: 2, of: 8 });
    expect(c.variance(100, 120)[1].value).toBe(20);
  });
});
