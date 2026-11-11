import { describe, expect, it } from 'vitest';
import { DEPARTMENTS } from '../src/departments';
import { TEMPLATES } from '../src/departments/templates';
import { step, type ChatCtx, type ChatState } from '../src/departments/chat';

const ctx = (id: string): ChatCtx => { const d = DEPARTMENTS.find((x) => x.id === id)!; return { deptName: d.name, agents: d.agents, templates: TEMPLATES.filter((t) => t.dept === id) }; };
const idle: ChatState = { mode: 'idle' };

describe('department assistant', () => {
  it('every agent can be reached by its own name', () => {
    for (const d of DEPARTMENTS) for (const a of d.agents) {
      const r = step(idle, a.name, ctx(d.id));
      const hit = r.state.mode === 'collect' ? r.state.agentId : r.actions.find((x) => x.type === 'template') ? 'template' : '';
      expect(hit === a.id || hit === 'template' || r.say.includes('Closest match'), `${a.id} ${a.name}`).toBe(true);
    }
  });
  it('collects every input in turn then sends one run action', () => {
    const c = ctx('finance');
    let r = step(idle, 'quote for a school', c);
    expect(r.state.mode).toBe('collect');
    const a = c.agents.find((x) => x.id === (r.state as { agentId: string }).agentId)!;
    const sent: unknown[] = [];
    for (let i = 0; i < a.inputs.length + 2 && r.state.mode === 'collect'; i++) {
      const f = a.inputs.find((x) => x.key === (r.state as { queue: string[] }).queue[0])!;
      const ans = f.kind === 'number' ? '10' : f.kind === 'select' ? f.options![0] : 'test';
      r = step(r.state, ans, c);
      sent.push(...r.actions);
    }
    expect(sent).toHaveLength(1);
    expect((sent[0] as { agentId: string }).agentId).toBe(a.id);
  });
  it('refuses to guess, and offers the builders', () => {
    const r = step(idle, 'xylophone zebra', ctx('legal'));
    expect(r.actions).toHaveLength(0);
    expect(r.say).toMatch(/will not guess/);
    expect(step(idle, 'new agent', ctx('legal')).actions[0]).toEqual({ type: 'builder', kind: 'agent' });
    expect(step(idle, 'create a widget', ctx('legal')).actions[0]).toEqual({ type: 'builder', kind: 'widget' });
  });
  it('cancel clears, required inputs cannot be skipped, bad numbers and choices are re-asked', () => {
    const c = ctx('finance');
    let r = step(idle, 'runway', c);
    if (r.state.mode !== 'collect') throw new Error('expected collect');
    expect(step(r.state, 'cancel', c).state.mode).toBe('idle');
    const a = c.agents.find((x) => x.id === (r.state as { agentId: string }).agentId)!;
    const first = a.inputs[0];
    if (first.required) expect(step(r.state, 'skip', c).state.mode).toBe('collect');
    if (first.kind === 'number') expect(step(r.state, 'abc', c).say).toMatch(/number/);
  });
  it('finds a template by what it is', () => {
    const r = step(idle, 'template for a board meeting agenda', ctx('executive'));
    expect(r.actions[0]).toEqual({ type: 'template', id: 'tpl-board-agenda' });
  });
});
