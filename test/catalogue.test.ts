import { describe, expect, it } from 'vitest';
import { CATALOGUE, catalogueTasks } from '../src/departments/catalogue';
import { DEPARTMENTS } from '../src/departments';

describe('agent catalogue stays in step with the code', () => {
  const tasks = catalogueTasks();
  it('covers all 16 departments with 3 or 4 roles each and one agent per task', () => {
    expect(CATALOGUE).toHaveLength(16);
    expect(CATALOGUE.map((d) => d.dept)).toEqual(DEPARTMENTS.map((d) => d.id));
    for (const d of CATALOGUE) { expect(d.roles.length).toBeGreaterThanOrEqual(3); expect(d.roles.length).toBeLessThanOrEqual(4); for (const r of d.roles) expect(r.tasks.length).toBe(2); }
    expect(new Set(tasks.map((t) => t.id)).size).toBe(tasks.length);
  });
  it('every agent in code is in the catalogue under the same name', () => {
    for (const d of DEPARTMENTS) for (const a of d.agents) {
      const t = tasks.find((x) => x.id === a.id);
      expect(t, a.id).toBeTruthy();
      expect(t!.name, a.id).toBe(a.name);
      expect(t!.dept).toBe(d.id);
      expect(!!t!.two, `${a.id} second approver`).toBe(!!a.secondApprover);
    }
  });
  it('every catalogued task is built', () => {
    const built = new Set(DEPARTMENTS.flatMap((d) => d.agents.map((a) => a.id)));
    for (const t of tasks) expect(built.has(t.id), t.id).toBe(true);
    expect(built.size).toBe(tasks.length);
  });
  it('numbers continue without gaps within a department', () => {
    for (const d of CATALOGUE) {
      const ns = d.roles.flatMap((r) => r.tasks.map((t) => Number(t.id.split('-').pop()))).sort((a, b) => a - b);
      expect(ns).toEqual(ns.map((_, i) => i + 1));
    }
  });
});
