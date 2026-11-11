import { describe, expect, it } from 'vitest';
import { AGENTS } from '../src/departments';
import { Platform } from '../src/core/platform';
import { snapshotFacts } from '../src/connector/snapshot';

const human = { id: 'sarah', name: 'S', kind: 'human' as const, roles: [] };
const run = async (id: string, input: Record<string, string>) => JSON.stringify((await new Platform({ facts: snapshotFacts }).runAgent(AGENTS.find((x) => x.id === id)!, input, human)).doc);

describe('computed and gated agents', () => {
  it('AI-04 compares results to thresholds', async () => {
    const d = await run('OPS-AI-04', { agent: 'X', results: 'accuracy | 0.9\nsafety | 0.5', thresholds: 'accuracy | 0.8\nsafety | 0.7\nlatency | 1' });
    expect(d).toContain('Pass [src'); expect(d).toContain('Fail [src'); expect(d).toContain('No result');
  });
  it('SEC-06 flags operators without both agreement and measures', async () => {
    const d = await run('OPS-SEC-06', { operators: 'A | hosting | yes | yes\nB | email | no | yes' });
    expect(d).toContain('Complete'); expect(d).toContain('Gap: fix before relying');
  });
  it('SALES-04 counts MEDDICC elements and lists the gaps', async () => {
    const d = await run('OPS-SALES-04', { opps: 'School A | Proposal | Send quote | Metrics, Champion' });
    expect(d).toContain('2 of 8'); expect(d).toContain('Economic buyer');
  });
  it('SUP-06 computes shares', async () => {
    const d = await run('OPS-SUP-06', { period: 'Oct', counts: 'Login | 30\nReports | 10' });
    expect(d).toContain('75.0%'); expect(d).toContain('25.0%');
  });
  it('LEG-06 sorts by days to due', async () => {
    const d = await run('OPS-LEG-06', { asof: '2026-11-11', items: 'C1 | later | 2026-12-31 | Ops\nC2 | sooner | 2026-11-20 | Ops' });
    const t = d.slice(d.indexOf('Obligations, soonest first')); expect(t.indexOf('sooner')).toBeLessThan(t.indexOf('later')); expect(d).toContain('9 [src');
  });
  it('MKT-05 and MKT-06 stop when consent or basis is missing', async () => {
    expect(await run('OPS-MKT-05', { school: 'S', consent: 'Not yet', evidence: 'x' })).toContain('Do not publish');
    expect(await run('OPS-MKT-06', { source: 's', message: 'm', basis: 'Neither, or not sure' })).toContain('Do not send');
  });
  it('RES-06 refuses claims with no evidence', async () => {
    const d = await run('OPS-RES-06', { claims: 'Raises marks | | Website' });
    expect(d).toContain('No evidence: do not publish');
  });
  it('SRE-06 computes variance from bill figures', async () => {
    expect(await run('OPS-SRE-06', { period: 'Oct', lines: 'Compute | 1000 | 1200' })).toContain('20.0%');
  });
});
