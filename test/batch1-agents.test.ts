import { describe, expect, it } from 'vitest';
import { AGENTS } from '../src/departments';
import { Platform } from '../src/core/platform';
import { snapshotFacts } from '../src/connector/snapshot';

const human = { id: 'sarah', name: 'S', kind: 'human' as const, roles: [] };
const run = async (id: string, input: Record<string, string>) => {
  const a = AGENTS.find((x) => x.id === id)!;
  const art = await new Platform({ facts: snapshotFacts }).runAgent(a, input, human);
  return JSON.stringify(art.doc);
};

describe('Finance batch 1', () => {
  it('FIN-05 quotes a community school on annual prepay from the formula', async () => {
    const d = await run('OPS-FIN-05', { school: 'Test Primary', learners: '400', educators: '16', rate: 'Community', billing: 'Annual prepay' });
    expect(d).toContain('R1550.00');   // community monthly ex VAT (standard R3,100 × 50%)
    expect(d).toContain('R16740.00');  // 1,550 × 12 × 0.9
    expect(d).toContain('D-1');
  });
  it('FIN-05 does not invent a price when counts are missing or invalid', async () => {
    const d = await run('OPS-FIN-05', { school: 'X', learners: 'abc', educators: '5', rate: 'Standard', billing: 'Monthly' });
    expect(d).not.toMatch(/R\d+\.\d\d \[src/);
  });
  it('FIN-06 extends runway only for funding that arrives before cash runs out', async () => {
    const d = await run('OPS-FIN-06', { cash: '600000', burn: '100000', scenarios: 'Grant | 300000 | 3\nLate award | 500000 | 9' });
    expect(d).toContain('9.0 months');
    expect(d).toContain('does not extend runway');
    expect(d).toContain('6.0 months');
  });
  it('FIN-07 computes days overdue from the dates you give and sends nothing', async () => {
    const d = await run('OPS-FIN-07', { asof: '2026-11-11', accounts: 'School A | 3000 | 2026-10-12 | 2026-10-20' });
    expect(d).toContain('30 [src:computed from your dates]');
    expect(d).toContain('Draft only');
  });
  it('FIN-08 totals budget, spend and drawdowns from typed figures', async () => {
    const d = await run('OPS-FIN-08', { funder: 'Funder X', lines: 'Staff | 100000 | 40000\nData | 50000 | 10000', drawn: '2026-09-01 | 75000' });
    expect(d).toContain('"Total",150000,50000,100000');
    expect(d).toContain('R 25000.00');
  });
});

describe('Government batch 1', () => {
  it('GOV-04 flags a fact with no source', async () => {
    const d = await run('OPS-GOV-04', { audience: 'Circuit manager', purpose: 'Introduce pilot', facts: 'A cited fact | Gazette p.4\nAn uncited fact' });
    expect(d).toContain('Unsourced: cite or remove');
    expect(d).toContain('Sourced');
  });
  it('GOV-06 counts leads by stage and flags a live lead with no next action', async () => {
    const d = await run('OPS-GOV-06', { leads: 'A | In talks | Send deck\nB | Contacted |\nC | Not started | x\nD | Maybe | y' });
    expect(d).toContain('No next action recorded');
    expect(d).toContain('Needs a valid stage');
    expect(d).toContain('["In talks",1]');
  });
  it('GOV-07 marks a statement without a location as unverified', async () => {
    const d = await run('OPS-GOV-07', { policy: 'Circular 1', link: 'https://example.org/c1', statements: 'Schools must X | s.3\nSchools must Y' });
    expect(d).toContain('Unverified: add the section or page');
    expect(d).toContain('Located in source');
  });
  it('GOV-08 adds no requirement the human did not supply', async () => {
    const d = await run('OPS-GOV-08', { tender: 'T1 Dept', closing: 'as stated', reqs: 'Req one\nReq two' });
    expect(d).toContain('Req one');
    expect(d).toContain('Req two');
    expect(d).not.toMatch(/B-BBEE|CSD|tax compliance/i);
  });
});
