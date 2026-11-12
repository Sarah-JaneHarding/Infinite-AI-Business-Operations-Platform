import type { Artefact } from '../core/platform';
import type { Fetch } from './github';

export interface IssueProposal { title: string; body: string; labels: string[] }

/** Ecosystem rules from its own CLAUDE.md, baked into every proposal the platform drafts for it. */
export const ECOSYSTEM_RULES_CHECKLIST = [
  'Stage-gate: one stage, one PR; update docs/STAGE_LOG.md in the same commit',
  'Definition of Done: unit tests with happy path + at least two failure paths',
  'No second model path; HITL cannot be bypassed; no secrets in the repo',
  'Strict TypeScript, no `any`; record new dependencies in docs',
  'Unsure? Stop and write the question to docs/OPEN_QUESTIONS.md',
];

export function proposalFromArtefact(a: Artefact, summary: string): IssueProposal {
  const body = [
    `> Drafted by the Infinite-AI Ops Platform (${a.agentId}) and approved by ${a.approvedBy ?? 'n/a'} and countersigned by ${a.countersignedBy ?? 'n/a'}. AI drafts. The human decides.`,
    '',
    summary,
    '',
    '### Ecosystem rules this change must respect',
    ...ECOSYSTEM_RULES_CHECKLIST.map((r) => `- [ ] ${r}`),
    '',
    `Artefact: \`${a.id}\` v${a.version}`,
  ].join('\n');
  return { title: a.title.slice(0, 120), body, labels: ['ops-platform-proposal'] };
}

export class PublishRefused extends Error {}

/**
 * The ONLY write path to the ecosystem repo, and it can only open an ISSUE.
 * It refuses unless the artefact is ratified (approved by one human and countersigned by a different one) and writes are explicitly enabled.
 * It never pushes commits, never touches branches, never reads secrets.
 */
export class ProposalPublisher {
  constructor(private repo: string, private token: string | undefined, private writesEnabled: boolean, private f: Fetch = fetch, private api = 'https://api.github.com') {}

  async openIssue(a: Artefact, p: IssueProposal): Promise<{ url: string }> {
    if ((a.status !== 'RATIFIED' && a.status !== 'INGESTED') || !a.approvedBy || !a.countersignedBy || a.approvedBy === a.countersignedBy) throw new PublishRefused('Only a ratified artefact (approved and countersigned by two different people) can be published.');
    if (!this.writesEnabled) throw new PublishRefused('Ecosystem writes are disabled (OPS_ALLOW_ECOSYSTEM_WRITES is not "true"). Download the proposal instead.');
    if (!this.token) throw new PublishRefused('No GitHub token is configured on the server.');
    const r = await this.f(`${this.api}/repos/${this.repo}/issues`, { method: 'POST', headers: { authorization: `Bearer ${this.token}`, accept: 'application/vnd.github+json', 'content-type': 'application/json', 'user-agent': 'infinite-ai-ops' }, body: JSON.stringify(p) });
    if (!r.ok) throw new PublishRefused(`GitHub refused: ${r.status}`);
    return { url: ((await r.json()) as { html_url: string }).html_url };
  }
}
