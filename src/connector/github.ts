import { parseOpenQuestions, parseStages, isOpen } from './parse';

export type Fetch = typeof fetch;

export interface LiveStatus {
  fetchedAt: string;
  repo: string;
  head: { sha: string; date: string; subject: string } | null;
  openPulls: { number: number; title: string; draft: boolean; updated: string }[];
  openIssues: number | null;
  ci: { name: string; status: string; conclusion: string | null; updated: string; url: string }[];
  stages: { count: number; latest: number; latestTitle: string };
  openQuestions: { total: number; open: number };
  errors: string[];
}

/**
 * READ-ONLY GitHub client. The only HTTP verb it can issue is GET (enforced in `get`).
 * Writes live in `ProposalPublisher` and require an approved artefact.
 */
export class GithubReader {
  constructor(private repo: string, private token?: string, private f: Fetch = fetch, private api = 'https://api.github.com') {}

  private async get<T>(path: string, accept = 'application/vnd.github+json'): Promise<T> {
    const r = await this.f(`${this.api}${path}`, { method: 'GET', headers: { accept, 'user-agent': 'infinite-ai-ops', ...(this.token ? { authorization: `Bearer ${this.token}` } : {}) } });
    if (!r.ok) throw new Error(`GitHub ${r.status} for ${path}`);
    return accept.includes('raw') ? ((await r.text()) as unknown as T) : ((await r.json()) as T);
  }

  async file(path: string, ref?: string): Promise<string> {
    return this.get<string>(`/repos/${this.repo}/contents/${path}${ref ? `?ref=${ref}` : ''}`, 'application/vnd.github.raw+json');
  }

  async status(): Promise<LiveStatus> {
    const errors: string[] = [];
    const safe = async <T>(label: string, p: Promise<T>): Promise<T | null> => {
      try { return await p; } catch (e) { errors.push(`${label}: ${(e as Error).message}`); return null; }
    };
    const [commits, pulls, repo, runs, stageLog, oq] = await Promise.all([
      safe('commits', this.get<{ sha: string; commit: { message: string; author: { date: string } } }[]>(`/repos/${this.repo}/commits?per_page=1`)),
      safe('pulls', this.get<{ number: number; title: string; draft: boolean; updated_at: string }[]>(`/repos/${this.repo}/pulls?state=open&per_page=30`)),
      safe('repo', this.get<{ open_issues_count: number }>(`/repos/${this.repo}`)),
      safe('ci', this.get<{ workflow_runs: { name: string; status: string; conclusion: string | null; updated_at: string; html_url: string }[] }>(`/repos/${this.repo}/actions/runs?per_page=8`)),
      safe('STAGE_LOG', this.file('docs/STAGE_LOG.md')),
      safe('OPEN_QUESTIONS', this.file('docs/OPEN_QUESTIONS.md')),
    ]);
    const stages = stageLog ? parseStages(stageLog) : [];
    const qs = oq ? parseOpenQuestions(oq) : [];
    const c = commits?.[0];
    return {
      fetchedAt: new Date().toISOString(),
      repo: this.repo,
      head: c ? { sha: c.sha.slice(0, 7), date: c.commit.author.date, subject: c.commit.message.split('\n')[0] } : null,
      openPulls: (pulls ?? []).map((p) => ({ number: p.number, title: p.title, draft: p.draft, updated: p.updated_at })),
      // GitHub counts PRs inside open_issues_count; subtract them so the number means issues only.
      openIssues: repo && pulls ? Math.max(0, repo.open_issues_count - pulls.length) : null,
      ci: (runs?.workflow_runs ?? []).map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion, updated: r.updated_at, url: r.html_url })),
      stages: { count: stages.length, latest: stages.at(-1)?.n ?? 0, latestTitle: stages.at(-1)?.title ?? '' },
      openQuestions: { total: qs.length, open: qs.filter(isOpen).length },
      errors,
    };
  }
}

export function liveFacts(s: LiveStatus): Record<string, string | number> {
  const f: Record<string, string | number> = { 'live.fetchedAt': s.fetchedAt, 'live.stages': s.stages.count, 'live.latestStage': s.stages.latest, 'live.oq.total': s.openQuestions.total, 'live.oq.open': s.openQuestions.open, 'live.openPulls': s.openPulls.length };
  if (s.head) f['live.head'] = s.head.sha;
  if (s.openIssues !== null) f['live.openIssues'] = s.openIssues;
  return f;
}
