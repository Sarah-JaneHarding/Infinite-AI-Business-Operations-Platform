import { describe, expect, it } from 'vitest';
import { DEPARTMENTS, agentById } from '../src/departments';
import { ORDER_TEMPLATES, gatedAgents, templatesFor, uncovered, type OrderTemplate } from '../src/departments/orderTemplates';
import { parseProposal } from '../src/server/autonomy/orders';
import { makeRunner, type RunnerDeps } from '../src/server/autonomy/runner';

const FILL = 'Routine review of the standard process';

/** The neutral fixture a person would type: required text gets plain words, numbers a small number, selects their first option. */
function fixture(t: OrderTemplate) {
  const agent = agentById(t.agentId)!;
  const inputs: Record<string, string> = {};
  for (const f of agent.inputs) {
    if (!f.required) continue;
    inputs[f.key] = f.kind === 'number' ? '5' : f.kind === 'select' ? (f.options ?? [])[0]! : FILL;
  }
  return { name: t.name, agentId: t.agentId, trigger: t.trigger, inputs, maxRunsPerDay: t.maxRunsPerDay };
}

const runner = makeRunner({
  store: { load: () => ({}), list: () => [], append: () => undefined } as unknown as RunnerDeps['store'],
  appendValidated: async () => undefined,
  facts: () => ({ 'eco.stages': 116 }),
});

describe('standing-order templates', () => {
  it('every department has at least one template (the coverage gate)', () => {
    expect(uncovered(ORDER_TEMPLATES, DEPARTMENTS)).toEqual([]);
    expect(DEPARTMENTS.every((d) => templatesFor(d.id).length >= 1)).toBe(true);
  });

  it('every template names a real agent in its own department that parseProposal admits', () => {
    for (const t of ORDER_TEMPLATES) {
      const dept = DEPARTMENTS.find((d) => d.id === t.dept)!;
      expect(dept, t.id).toBeDefined();
      expect(dept.agents.some((a) => a.id === t.agentId), t.id).toBe(true);
      expect(() => parseProposal(fixture(t)), t.id).not.toThrow();
    }
  });

  it('no template uses a twoPerson or professionalReview agent', () => {
    expect(gatedAgents(ORDER_TEMPLATES)).toEqual([]);
  });

  it('template ids are unique and names are 3 to 80 characters with no prices', () => {
    expect(new Set(ORDER_TEMPLATES.map((t) => t.id)).size).toBe(ORDER_TEMPLATES.length);
    for (const t of ORDER_TEMPLATES) {
      expect(t.name.length, t.id).toBeGreaterThanOrEqual(3);
      expect(t.name.length, t.id).toBeLessThanOrEqual(80);
      expect(/\bR\s?\d/.test(t.name + t.why), t.id).toBe(false);
    }
  });

  it('every template dry run passes the acceptance suite', async () => {
    for (const t of ORDER_TEMPLATES) {
      const r = await runner.dryRun(fixture(t));
      expect(r.passed, `${t.id}: ${JSON.stringify(r.results.filter((x) => !x.pass))}`).toBe(true);
    }
  });

  it('failure path: a list without legal is reported as uncovered', () => {
    expect(uncovered(ORDER_TEMPLATES.filter((t) => t.dept !== 'legal'), DEPARTMENTS)).toEqual(['legal']);
    expect(uncovered([], [{ id: 'a' }, { id: 'b' }])).toEqual(['a', 'b']);
  });

  it('failure path: a template naming a gated or unknown agent is flagged', () => {
    const base = ORDER_TEMPLATES[0]!;
    expect(gatedAgents([{ ...base, agentId: 'OPS-LEG-01' }])).toEqual(['OPS-LEG-01']);
    expect(gatedAgents([{ ...base, agentId: 'OPS-NOPE-99' }])).toEqual(['OPS-NOPE-99']);
  });

  it('templatesFor returns only that department, and nothing for an unknown one', () => {
    expect(templatesFor('legal').every((t) => t.dept === 'legal')).toBe(true);
    expect(templatesFor('nope')).toEqual([]);
  });
});
