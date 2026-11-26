import type { Decision, Question } from './types';

/** What a decision changes in the question's own repository. Pure, so the PR can be checked before anything is sent to GitHub. */
export interface PrPlan {
  repo: string;
  branch: string;
  title: string;
  body: string;
  /** docs/OPEN_QUESTIONS.md gets a row in its Decision log; the record file is new. */
  logPath: string;
  recordPath: string;
  logRow: string;
  recordContent: string;
}

export const REPO_SLUGS: Record<Question['repo'], string> = {
  ecosystem: 'Sarah-JaneHarding/infinite-ai-ecosystem',
  platform: 'Sarah-JaneHarding/Infinite-AI-Business-Operations-Platform',
};
/** Branches the writer may create. Never `main`, never anything else. */
export const BRANCH_PREFIX = 'oq/';

const cell = (s: string) => s.replace(/\r?\n/g, ' ').replace(/\|/g, '\\|').trim();
const slug = (id: string) => id.toLowerCase().replace(/[^a-z0-9]+/g, '-');

export function buildPlan(q: Question, d: Decision, repos: Record<string, string> = REPO_SLUGS): PrPlan {
  const date = d.at.slice(0, 10);
  const what = [d.choice, d.text].filter(Boolean).join(': ');
  const recordPath = `docs/decisions/${q.id}.md`;
  const recordContent = [
    `# ${q.id}: ${q.title}`, '',
    `> Proposed by the Infinite-AI Ops Platform. **Not adopted until a person merges the pull request that adds this file.**`, '',
    `- Decided by: ${d.by} on ${date}`, `- Repository: ${q.repo}`, `- Accountable department: ${d.routing.dept} (${d.routing.why})`,
    `- Departs from the recommendation: ${d.departs ? 'yes' : 'no'}`, '',
    '## Question', '', q.question, '', '## Why it was open', '', q.reason, '',
    ...(q.recommendation ? ['## Recommendation at the time', '', q.recommendation, ''] : []),
    '## Decision', '', d.choice ? `**${d.choice}**` : '', d.text, '', ...(d.reason ? ['## Reason', '', d.reason, ''] : []),
    '## Follow-up', '', `- Task for ${d.routing.dept}: \`${d.ceoTaskId}\``, ...d.agentTaskIds.map((t) => `- Proposed for agent: \`${t}\` (runs only under an active standing order)`), '',
  ].join('\n');
  const body = [
    `> Drafted by the Infinite-AI Ops Platform from a decision recorded by ${d.by}. AI drafts. The human decides.`, '',
    `**Task:** ${d.ceoTaskId} · **Question:** ${q.id}${q.stage ? ` · **Stage:** ${q.stage}` : ''}`, '',
    '### What changed', `- Adds \`${recordPath}\` recording the decision.`, `- Adds one row to the Decision log in \`docs/OPEN_QUESTIONS.md\`. No existing row is edited.`, '',
    '### How it was tested', '- The platform builds this change from a checked decision (option or text, a reason when it departs from the recommendation, no ID numbers, no instructions to the platform).', '- CI on this PR must be green before merge.', '',
    '### Guardrails touched', '- None changed. Documents only. A person reviews, edits and merges; no agent merges or approves.', '',
    `Decision: ${what.slice(0, 600)}`,
  ].join('\n');
  return {
    repo: repos[q.repo] ?? REPO_SLUGS[q.repo], branch: `${BRANCH_PREFIX}${slug(q.id)}-${d.id.split('_').pop()}`, title: `docs(decisions): record ${q.id} decision`.slice(0, 120), body, logPath: 'docs/OPEN_QUESTIONS.md', recordPath, recordContent,
    logRow: `| ${date} | ${q.id} | ${cell(what).slice(0, 300)} | ${cell(d.reason || '')} | ${cell(d.by)} | \`${recordPath}\` |`,
  };
}

const LOG_HEAD = ['## Decision log', '', '| Date | Question | Decision | Reason | Decided by | Record |', '| ---- | -------- | -------- | ------ | ---------- | ------ |'];

/**
 * Adds one row to the Decision log, creating the section at the end of the file if it is missing. Never edits an existing line.
 * Returns null when the question already has a row, so a retry cannot add it twice.
 */
export function addLogRow(markdown: string, qid: string, row: string): string | null {
  const lines = markdown.replace(/\s+$/, '').split('\n');
  const at = lines.findIndex((l) => /^##\s+Decision log\s*$/i.test(l));
  if (at < 0) return [...lines, '', ...LOG_HEAD, row, ''].join('\n');
  let end = at + 1;
  while (end < lines.length && !/^#{1,6}\s/.test(lines[end])) end++;
  const section = lines.slice(at, end);
  if (section.some((l) => l.split('|')[2]?.trim() === qid)) return null;
  let last = at;
  for (let i = at + 1; i < end; i++) if (lines[i].startsWith('|')) last = i;
  if (last === at) return null; // a heading with no table: refuse to guess where a row goes
  lines.splice(last + 1, 0, row);
  return lines.join('\n') + '\n';
}
