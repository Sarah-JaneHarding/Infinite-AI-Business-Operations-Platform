import { describe, expect, it } from 'vitest';
import { groupTasksByDept, templateToForm } from '../src/ui/autonomyView';
import { ORDER_TEMPLATES } from '../src/departments/orderTemplates';
import { compareTasks, type Task } from '../src/server/autonomy/tasks';

const task = (id: string, dept: string, over: Partial<Task> = {}): Task => ({
  id, orderId: 'O1', agentId: 'A', dept, priority: 2, due: '2026-11-20T08:00:00Z', origin: { kind: 'person', by: 'sarah' },
  status: 'QUEUED', version: 1, at: '2026-11-15T08:00:00.000Z', ...over,
});

describe('templateToForm', () => {
  it('carries the template agent, name, trigger and runs, and leaves inputs empty', () => {
    for (const t of ORDER_TEMPLATES) {
      const f = templateToForm(t);
      expect(f).toEqual({ name: t.name, agentId: t.agentId, trigger: t.trigger, runs: t.maxRunsPerDay, inputs: {} });
    }
  });
  it('returns a fresh inputs map each time so one form cannot leak into the next', () => {
    const t = ORDER_TEMPLATES[0]!;
    expect(templateToForm(t).inputs).not.toBe(templateToForm(t).inputs);
  });
});

describe('groupTasksByDept', () => {
  it('keeps compareTasks order inside a department', () => {
    const a = task('a', 'sales', { priority: 3 });
    const b = task('b', 'sales', { priority: 1 });
    const c = task('c', 'sales', { priority: 1, due: '2026-11-19T08:00:00Z' });
    const g = groupTasksByDept([a, b, c]);
    expect(g.sales!.map((t) => t.id)).toEqual(['c', 'b', 'a']);
    expect(g.sales).toEqual([a, b, c].sort(compareTasks));
  });
  it('matches compareTasks on every tie-break, whatever order the input arrives in', () => {
    const base: Partial<Task> = { priority: 2, due: '2026-11-20T08:00:00Z' };
    const set = [
      task('e', 'sales', { ...base, at: '2026-11-15T09:00:00.000Z' }),
      task('d', 'sales', { ...base, at: '2026-11-15T07:00:00.000Z' }),
      task('b', 'sales', { ...base, at: '2026-11-15T08:00:00.000Z' }),
      task('a', 'sales', { ...base, at: '2026-11-15T08:00:00.000Z' }),
      task('c', 'sales', { ...base, at: '2026-11-15T08:00:00.000Z' }),
      task('f', 'sales', { priority: 1, due: '2026-11-25T08:00:00Z' }),
    ];
    const want = [...set].sort(compareTasks).map((t) => t.id);
    expect(want).toEqual(['f', 'd', 'a', 'b', 'c', 'e']);
    const orders = [set, [...set].reverse(), [set[3]!, set[5]!, set[1]!, set[4]!, set[0]!, set[2]!], [set[2]!, set[4]!, set[0]!, set[5]!, set[1]!, set[3]!]];
    for (const o of orders) expect(groupTasksByDept(o).sales!.map((t) => t.id)).toEqual(want);
  });
  it('omits departments with no tasks and does not mutate its input', () => {
    const input = [task('a', 'sales', { priority: 3 }), task('b', 'sales', { priority: 1 })];
    const copy = [...input];
    expect(Object.keys(groupTasksByDept(input))).toEqual(['sales']);
    expect(groupTasksByDept([])).toEqual({});
    expect(input).toEqual(copy);
  });
  it('keeps a task for an unknown department under its own id', () => {
    const g = groupTasksByDept([task('a', 'sales'), task('z', 'no-such-dept')]);
    expect(g['no-such-dept']!.map((t) => t.id)).toEqual(['z']);
    expect(g.sales).toHaveLength(1);
  });
});
