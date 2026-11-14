import { describe, expect, it } from 'vitest';
import { AGENTS, DEPARTMENTS, SERVICE_AGENTS, agentById } from '../src/departments';
import { Platform } from '../src/core/platform';
import { buildCeoState, OPS_REVIEW_AGENT } from '../src/core/ceo';
import type { Rec } from '../src/core/warehouse';
import { CATALOGUE } from '../src/departments/catalogue';

const human = { id: 'sarah', name: 'S', kind: 'human' as const, roles: [] };
const NOW = Date.UTC(2026, 10, 18, 5, 0);
const r = (id: string, o: Record<string, unknown>): Rec => ({ id, at: '2026-11-17T10:00:00.000Z', ...o }) as Rec;
const review = async (collections: Record<string, Rec[]>, input: Record<string, string> = {}) => {
  const facts = buildCeoState({ departments: DEPARTMENTS, collections, now: NOW }).facts;
  return new Platform({ facts: () => facts }).runAgent(agentById(OPS_REVIEW_AGENT)!, input, human);
};

describe('Operations review (platform service agent)', () => {
  it('is found by agentById but is not part of the 100-agent roster', () => {
    expect(agentById(OPS_REVIEW_AGENT)?.name).toBe('Operations review');
    expect(AGENTS.some((a) => a.id === OPS_REVIEW_AGENT)).toBe(false);
    expect(SERVICE_AGENTS).toHaveLength(1);
    expect(AGENTS).toHaveLength(CATALOGUE.flatMap((d) => d.roles.flatMap((x) => x.tasks)).length);
  });
  it('always drafts and needs approval, and names an accountable role', () => {
    const a = agentById(OPS_REVIEW_AGENT)!;
    expect(a.requiresApproval).toBe(true);
    expect(a.owner).toMatch(/^Head of/);
  });
  it('drafts a review whose figures come from the monitor and carry their source tags', async () => {
    const art = await review({ actions: [r('a1', { action: 'Late thing', status: 'Open', due: '2026-11-01' })] }, { focus: 'Look at the pilot' });
    const doc = JSON.stringify(art.doc);
    expect(art.status).toBe('DRAFT');
    expect(doc).toContain('[src:ops.tasks.overdue]');
    expect(doc).toContain('Executive & Strategy is red');
    expect(doc).toContain('Look at the pilot');
    expect(art.flags.filter((f) => /UNSOURCED/i.test(f))).toEqual([]);
  });
  it('says so when no department has anything recorded, and does not call that good news', async () => {
    const doc = JSON.stringify((await review({})).doc);
    expect(doc).toContain('is not good news');
    expect(doc).not.toMatch(/is green/);
  });
  it('refuses learner identifiers in the free-text note, like every agent', async () => {
    await expect(review({}, { focus: 'Learner ID 8001015009087 is stuck' })).rejects.toThrow();
  });
});
