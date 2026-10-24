import { describe, expect, it } from 'vitest';
import { GithubReader, liveFacts } from '../src/connector/github';
import { parseOpenQuestions, parseStages, isOpen } from '../src/connector/parse';
import { verifySignature, summariseEvent } from '../src/connector/webhook';
import { ProposalPublisher, proposalFromArtefact, PublishRefused } from '../src/connector/proposals';
import { snapshot, snapshotFacts } from '../src/connector/snapshot';
import type { Artefact } from '../src/core/platform';

const stageLog = '## Stage 1 — Boot · 2026-01-01\n## Stage 2 — Brain\n';
const oq = '| OQ-001 | 2026-01-01 | 01 | OPEN | **Q** one |\n| OQ-002 | 2026-01-02 | 01 | RESOLVED | two |\n### OQ-003 — three · 2026-02-02\n';

describe('parsers', () => {
  it('parse stages and OQs', () => {
    expect(parseStages(stageLog)).toEqual([{ n: 1, title: 'Boot', date: '2026-01-01' }, { n: 2, title: 'Brain', date: null }]);
    const q = parseOpenQuestions(oq);
    expect(q.map((x) => x.id)).toEqual(['OQ-001', 'OQ-002', 'OQ-003']);
    expect(q.filter(isOpen).length).toBe(2);
  });
});

describe('snapshot', () => {
  it('has real, internally consistent counts', () => {
    const f = snapshotFacts();
    expect(f['eco.stages']).toBe(snapshot.stages.count);
    expect(Number(f['eco.srcLoc'])).toBeGreaterThan(0);
    expect(f['eco.agents.contracts']).toBe(Object.values(snapshot.agents.byModule).reduce((a, b) => a + b, 0));
  });
});

describe('GithubReader', () => {
  const mkFetch = (log: { method?: string; url: string }[]) =>
    (async (url: string, init?: RequestInit) => {
      log.push({ method: init?.method, url });
      const ok = (b: unknown, text = false) => new Response(text ? String(b) : JSON.stringify(b), { status: 200 });
      if (url.includes('/commits')) return ok([{ sha: 'abcdef123', commit: { message: 'hi\nbody', author: { date: 'd' } } }]);
      if (url.includes('/pulls')) return ok([{ number: 1, title: 'p', draft: true, updated_at: 'u' }]);
      if (url.includes('/actions/runs')) return ok({ workflow_runs: [{ name: 'ci', status: 'completed', conclusion: 'success', updated_at: 'u', html_url: 'h' }] });
      if (url.includes('STAGE_LOG')) return ok(stageLog, true);
      if (url.includes('OPEN_QUESTIONS')) return ok(oq, true);
      return ok({ open_issues_count: 4 });
    }) as unknown as typeof fetch;
  it('reads status using GET only and derives counts', async () => {
    const log: { method?: string; url: string }[] = [];
    const s = await new GithubReader('o/r', 't', mkFetch(log)).status();
    expect(log.every((l) => l.method === 'GET')).toBe(true);
    expect(s.head?.sha).toBe('abcdef1');
    expect(s.openIssues).toBe(3);
    expect(s.stages.latest).toBe(2);
    expect(liveFacts(s)['live.oq.open']).toBe(2);
  });
  it('degrades with errors instead of throwing', async () => {
    const s = await new GithubReader('o/r', undefined, (async () => new Response('no', { status: 404 })) as unknown as typeof fetch).status();
    expect(s.errors.length).toBeGreaterThan(0);
    expect(s.head).toBeNull();
  });
});

describe('webhook', () => {
  it('verifies HMAC and rejects tampering / missing header', async () => {
    const body = '{"a":1}';
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode('sec'), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const sig = [...new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)))].map((b) => b.toString(16).padStart(2, '0')).join('');
    expect(await verifySignature('sec', body, 'sha256=' + sig)).toBe(true);
    expect(await verifySignature('sec', body + ' ', 'sha256=' + sig)).toBe(false);
    expect(await verifySignature('sec', body, undefined)).toBe(false);
    expect(await verifySignature('', body, 'sha256=' + sig)).toBe(false);
  });
  it('summarises events', () => {
    expect(summariseEvent('pull_request', { number: 9, action: 'opened', pull_request: { title: 'x' } }).summary).toContain('#9');
  });
});

describe('ProposalPublisher', () => {
  const art = (over: Partial<Artefact>) => ({ id: 'a', title: 'T', agentId: 'X', version: 1, status: 'APPROVED', approvedBy: 'sarah', ...over }) as Artefact;
  it('refuses unapproved, disabled, or tokenless; opens an issue only when all hold', async () => {
    const p = proposalFromArtefact(art({}), 'Do it');
    expect(p.body).toContain('Definition of Done');
    const fetchOk = (async () => new Response(JSON.stringify({ html_url: 'https://x/1' }), { status: 201 })) as unknown as typeof fetch;
    await expect(new ProposalPublisher('o/r', 't', true, fetchOk).openIssue(art({ status: 'DRAFT' }), p)).rejects.toBeInstanceOf(PublishRefused);
    await expect(new ProposalPublisher('o/r', 't', false, fetchOk).openIssue(art({}), p)).rejects.toThrow(/disabled/);
    await expect(new ProposalPublisher('o/r', undefined, true, fetchOk).openIssue(art({}), p)).rejects.toThrow(/token/);
    expect((await new ProposalPublisher('o/r', 't', true, fetchOk).openIssue(art({}), p)).url).toBe('https://x/1');
  });
});
