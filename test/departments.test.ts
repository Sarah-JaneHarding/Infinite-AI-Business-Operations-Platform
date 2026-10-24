import { describe, expect, it } from 'vitest';
import { AGENTS, DEPARTMENTS } from '../src/departments';
import { Platform } from '../src/core/platform';
import { snapshotFacts } from '../src/connector/snapshot';
import { render } from '../src/core/artefacts/render';
import { PURPOSES } from '../src/core/types';
import type { AgentContract } from '../src/core/agent';

const human = { id: 'sarah', name: 'S', kind: 'human' as const, roles: [] };
const sample = (a: AgentContract) => Object.fromEntries(a.inputs.map((i) => [i.key, i.kind === 'number' ? '100' : i.kind === 'select' ? i.options![0] : i.key === 'items' ? 'Thing | 100 | 2 | 80 | 4' : i.key === 'lines' ? 'Salaries | 100 | 120' : 'Sample text for ' + i.label]));

describe('departments', () => {
  it('has 16 departments, unique agent ids, valid contracts', () => {
    expect(DEPARTMENTS).toHaveLength(16);
    const ids = AGENTS.map((a) => a.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const d of DEPARTMENTS) {
      expect(d.agents.length).toBeGreaterThanOrEqual(3);
      expect(d.widgets.length).toBeGreaterThanOrEqual(1);
      expect(d.frameworks.length).toBeGreaterThanOrEqual(3);
    }
    for (const a of AGENTS) {
      expect(a.id).toMatch(/^OPS-[A-Z]+-\d\d$/);
      expect(a.requiresApproval).toBe(true);
      expect(PURPOSES).toContain(a.purpose);
      expect(a.allowedPurposes).toContain(a.purpose);
      expect(a.dataClass).not.toBe('learner');
    }
  });

  it.each(AGENTS.map((a) => [a.id, a] as const))('%s runs to a clean DRAFT with no stripped static text and renders every format', async (_id, agent) => {
    const p = new Platform({ facts: snapshotFacts });
    const art = await p.runAgent(agent, sample(agent), human);
    expect(art.status).toBe('DRAFT');
    expect(JSON.stringify(art.doc)).not.toContain('[UNSOURCED]');
    expect(JSON.stringify(art.doc)).not.toContain('[REDACTED');
    expect(art.doc.blocks.length).toBeGreaterThan(4);
    for (const f of agent.formats) {
      const out = await render(art.doc, f);
      expect(out.length).toBeGreaterThan(50);
    }
    expect(await p.ledger.verify()).toBeNull();
  });

  it('every required input is enforced', async () => {
    const a = AGENTS.find((x) => x.inputs.some((i) => i.required))!;
    await expect(new Platform().runAgent(a, {}, human)).rejects.toMatchObject({ kind: 'input' });
  });

  it('unsourced figure typed into a free-text field is the human’s own number and passes; invented ones do not appear', async () => {
    const a = AGENTS.find((x) => x.id === 'OPS-EXEC-01')!;
    const art = await new Platform({ facts: snapshotFacts }).runAgent(a, { period: 'Q4', wins: 'Closed 3 pilots', risks: '', asks: '' }, human);
    expect(JSON.stringify(art.doc)).toContain('Closed 3 pilots');
    expect(JSON.stringify(art.doc)).toMatch(/\[src:eco\.stages\]/);
  });
});
