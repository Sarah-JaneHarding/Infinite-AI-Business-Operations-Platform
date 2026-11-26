import type { Fetch } from './github';
import { addLogRow, BRANCH_PREFIX, type PrPlan } from '../oq/plan';

export class PrRefused extends Error {
  constructor(message: string, public readonly status = 403) { super(message); }
}

export interface PrFlags { writes: boolean; merge: boolean }
export interface PrView {
  number: number; url: string; title: string; state: 'open' | 'closed' | 'merged'; draft: boolean; headSha: string; branch: string;
  ci: 'success' | 'failure' | 'pending' | 'none'; mergeable: boolean | null;
  files: { path: string; status: string; patch: string }[];
  comments: { by: string; at: string; text: string }[];
}

export const COMMENT_FOOTER = '\n\n---\n_Posted from the Infinite-AI Ops Platform on behalf of a signed-in person._';
const EDITABLE = /^docs\/[A-Za-z0-9._\/-]+\.md$/;

/**
 * The narrow write path to GitHub for decisions. It can ONLY, on the two allowed repositories:
 *  - create a branch whose name starts with `oq/`, add or change markdown under `docs/` on that branch, and open a DRAFT pull request;
 *  - comment on, and edit markdown in, an open pull request whose branch starts with `oq/`;
 *  - mark such a pull request ready, and merge it when merging is enabled, CI is green and the head is the one the person saw.
 * It never writes to the default branch directly, never approves a review, and never touches any other branch or repository.
 * Both flags are off unless the operator turns them on; a separate write token keeps the read-only token read-only.
 */
export class PrWriter {
  constructor(private repos: readonly string[], private token: string | undefined, private flags: PrFlags, private f: Fetch = fetch, private api = 'https://api.github.com') {}

  get enabled() { return this.flags.writes && Boolean(this.token); }

  private async call<T>(method: string, repo: string, path: string, body?: unknown, accept = 'application/vnd.github+json'): Promise<T> {
    if (!this.repos.includes(repo)) throw new PrRefused('That repository is not one the platform may write to.');
    const r = await this.f(`${this.api}${path}`, { method, headers: { accept, authorization: `Bearer ${this.token}`, 'content-type': 'application/json', 'user-agent': 'infinite-ai-ops' }, ...(body === undefined ? {} : { body: JSON.stringify(body) }) });
    if (!r.ok) throw new PrRefused(`GitHub refused (${r.status}) for ${method} ${path.split('?')[0]}`, r.status === 404 || r.status === 422 || r.status === 409 ? r.status : 502);
    return (r.status === 204 ? undefined : await r.json()) as T;
  }
  private need(kind: 'writes' | 'merge') {
    if (!this.flags.writes) throw new PrRefused('Pull request writes are disabled (OPS_ALLOW_PR_WRITES is not "true"). Download the proposed change instead.');
    if (kind === 'merge' && !this.flags.merge) throw new PrRefused('Merging from the platform is disabled (OPS_ALLOW_PR_MERGE is not "true"). Merge on GitHub.');
    if (!this.token) throw new PrRefused('No GitHub write token is configured (GITHUB_WRITE_TOKEN).');
  }
  private async file(repo: string, path: string, ref: string) {
    const j = await this.call<{ content: string; sha: string }>('GET', repo, `/repos/${repo}/contents/${path}?ref=${encodeURIComponent(ref)}`);
    return { text: Buffer.from(j.content, 'base64').toString('utf8'), sha: j.sha };
  }
  private put(repo: string, path: string, branch: string, text: string, message: string, sha?: string) {
    return this.call('PUT', repo, `/repos/${repo}/contents/${path}`, { message, branch, content: Buffer.from(text, 'utf8').toString('base64'), ...(sha ? { sha } : {}) });
  }
  private async ownPull(repo: string, number: number) {
    const p = await this.call<{ state: string; merged: boolean; draft: boolean; node_id: string; head: { ref: string; sha: string; repo: { full_name: string } | null }; base: { ref: string } }>('GET', repo, `/repos/${repo}/pulls/${number}`);
    if (!p.head.ref.startsWith(BRANCH_PREFIX) || p.head.repo?.full_name !== repo) throw new PrRefused('That is not a decision pull request, so the platform will not touch it.');
    return p;
  }

  /** Branch from the default branch, add the record and the log row, open a draft PR. If any step fails after the branch exists, the branch is left for a person to inspect; nothing reaches the default branch. */
  async openDraft(plan: PrPlan): Promise<{ number: number; url: string; branch: string }> {
    this.need('writes');
    if (!plan.branch.startsWith(BRANCH_PREFIX)) throw new PrRefused('Decision branches must start with oq/.');
    const repo = plan.repo;
    const info = await this.call<{ default_branch: string }>('GET', repo, `/repos/${repo}`);
    const base = info.default_branch;
    const head = await this.call<{ object: { sha: string } }>('GET', repo, `/repos/${repo}/git/ref/heads/${base}`);
    const log = await this.file(repo, plan.logPath, base);
    const next = addLogRow(log.text, plan.logRow.split('|')[2]?.trim() ?? '', plan.logRow);
    if (next === null) throw new PrRefused('That question already has a row in the Decision log.', 409);
    await this.call('POST', repo, `/repos/${repo}/git/refs`, { ref: `refs/heads/${plan.branch}`, sha: head.object.sha });
    await this.put(repo, plan.recordPath, plan.branch, plan.recordContent, `docs(decisions): add ${plan.recordPath}`);
    await this.put(repo, plan.logPath, plan.branch, next, `docs(decisions): log ${plan.recordPath}`, log.sha);
    const pr = await this.call<{ number: number; html_url: string }>('POST', repo, `/repos/${repo}/pulls`, { title: plan.title, head: plan.branch, base, body: plan.body, draft: true });
    return { number: pr.number, url: pr.html_url, branch: plan.branch };
  }

  async view(repo: string, number: number): Promise<PrView> {
    const p = await this.call<{ html_url: string; title: string; state: string; merged: boolean; draft: boolean; mergeable: boolean | null; head: { ref: string; sha: string } }>('GET', repo, `/repos/${repo}/pulls/${number}`);
    const [files, comments, checks] = await Promise.all([
      this.call<{ filename: string; status: string; patch?: string }[]>('GET', repo, `/repos/${repo}/pulls/${number}/files?per_page=30`),
      this.call<{ user: { login: string }; created_at: string; body: string }[]>('GET', repo, `/repos/${repo}/issues/${number}/comments?per_page=50`),
      this.call<{ check_runs: { status: string; conclusion: string | null }[] }>('GET', repo, `/repos/${repo}/commits/${p.head.sha}/check-runs`),
    ]);
    const runs = checks.check_runs;
    const ci = !runs.length ? 'none' : runs.some((r) => r.status !== 'completed') ? 'pending' : runs.every((r) => r.conclusion === 'success' || r.conclusion === 'skipped' || r.conclusion === 'neutral') ? 'success' : 'failure';
    return {
      number, url: p.html_url, title: p.title, state: p.merged ? 'merged' : p.state === 'open' ? 'open' : 'closed', draft: p.draft, headSha: p.head.sha, branch: p.head.ref, ci, mergeable: p.mergeable,
      files: files.map((x) => ({ path: x.filename, status: x.status, patch: (x.patch ?? '').slice(0, 20_000) })),
      comments: comments.map((c) => ({ by: c.user.login, at: c.created_at, text: c.body.slice(0, 2000) })),
    };
  }

  async comment(repo: string, number: number, text: string) {
    this.need('writes');
    await this.ownPull(repo, number);
    await this.call('POST', repo, `/repos/${repo}/issues/${number}/comments`, { body: text.trim().slice(0, 4000) + COMMENT_FOOTER });
  }

  /** Replace the text of one markdown file under docs/ on the PR's branch. This is how a person edits the record from the platform. */
  async editFile(repo: string, number: number, path: string, text: string, message: string) {
    this.need('writes');
    if (!EDITABLE.test(path) || path.includes('..')) throw new PrRefused('Only markdown files under docs/ can be edited here.');
    const p = await this.ownPull(repo, number);
    if (p.state !== 'open') throw new PrRefused('That pull request is not open.', 409);
    const cur = await this.file(repo, path, p.head.ref);
    await this.put(repo, path, p.head.ref, text, message.slice(0, 200) || `docs(decisions): edit ${path}`, cur.sha);
  }

  /** Draft to ready for review. GitHub only offers this through GraphQL. */
  async markReady(repo: string, number: number) {
    this.need('writes');
    const p = await this.ownPull(repo, number);
    if (!p.draft) return;
    await this.call('POST', repo, '/graphql', { query: 'mutation($id:ID!){markPullRequestReadyForReview(input:{pullRequestId:$id}){pullRequest{number}}}', variables: { id: p.node_id } });
  }

  /** Merge only a decision PR into its default branch, ready for review, green, and still at the head the person saw. Squash, so the history stays one commit per decision. */
  async merge(repo: string, number: number, seenHeadSha: string) {
    this.need('merge');
    const p = await this.ownPull(repo, number);
    const info = await this.call<{ default_branch: string }>('GET', repo, `/repos/${repo}`);
    if (p.base.ref !== info.default_branch) throw new PrRefused('That pull request does not target the default branch.', 409);
    if (p.state !== 'open' || p.merged) throw new PrRefused('That pull request is not open.', 409);
    if (p.draft) throw new PrRefused('Mark it ready for review first.', 409);
    if (p.head.sha !== seenHeadSha) throw new PrRefused('The pull request changed after you looked at it. Reload and review it again.', 409);
    const v = await this.view(repo, number);
    if (v.ci !== 'success') throw new PrRefused(`CI is ${v.ci}, so it cannot be merged. CI must be green.`, 409);
    await this.call('PUT', repo, `/repos/${repo}/pulls/${number}/merge`, { merge_method: 'squash', sha: seenHeadSha });
  }
}
