# Open Questions Register

One screen (**Open Questions** in the sidebar) to manage every question that is waiting on a person, across the Ecosystem and this repository.
It replaces the Claude artifact as the place you answer. `docs/open-questions-register/` keeps the artifact's page and its starting data as a snapshot.
`docs/OPEN_QUESTIONS.md` in each repository stays the record of authority: a decision is only final when its pull request is merged.

## The path of a decision

```
questions.seed.json ─ ingest (at boot, idempotent) ─▶ oq_questions
person records a decision ─▶ oq_decisions ─┬─▶ task for the accountable department  (ceo_tasks, appears in the CEO command centre)
                                           ├─▶ proposal for each relevant agent      (oq_agent_tasks, status PROPOSED)
                                           ├─▶ question becomes "Decided"            (oq_questions)
                                           └─▶ ledger entry oq.decided
person opens the draft PR ─▶ branch oq/<id>-<n> in the question's own repository ─▶ DRAFT pull request ─▶ oq_prs, ledger oq.pr_opened
review in the platform: see the diff and CI, comment, edit the record, mark ready, merge ─▶ question "Resolved" (also when merged on GitHub)
```

## What the platform creates

| Output | Where | Rule |
| ------ | ----- | ---- |
| Department task | `ceo_tasks`, kind `action`, always needs a person | Placed by `src/oq/routing.ts`: a data table of words → department and agent. Nothing matched means Executive. The reason is shown. |
| Agent proposal | `oq_agent_tasks`, `PROPOSED` | **Not a run.** It becomes work only under an active standing order for that agent, which a different person activated (`docs/AUTONOMY.md`). Nothing from a decision is put into a prompt by this feature. |
| Draft pull request | the question's repository | Documents only: `docs/decisions/<ID>.md` plus one new row in the Decision log of `docs/OPEN_QUESTIONS.md`. No existing line is edited. |

## Checks on what a person types

A signed-in person is required. With options, one must be chosen; without, the answer needs 10+ characters. A **reason is required when the choice departs from the
recommendation**. Text goes through the same gate as task text: ID numbers and instructions aimed at the platform are refused. A question can be answered once; a
second answer is refused (409). Reopen it in the markdown.

## Switching the GitHub writes on

Off by default. Decisions, tasks and downloads of the proposed change work without them.

| Setting | Effect |
| ------- | ------ |
| `GITHUB_WRITE_TOKEN` | Fine-grained token for the two repositories only: Contents and Pull requests write. Separate from the read-only `GITHUB_TOKEN`. |
| `OPS_ALLOW_PR_WRITES=true` | Open the draft PR; comment on it; edit markdown under `docs/` on its branch; mark it ready. |
| `OPS_ALLOW_PR_MERGE=true` | Also squash-merge from the platform: officer role, ready PR, green CI, the head the person saw, PR number typed to confirm. |
| `OPS_PLATFORM_REPO` | Overrides this repository's slug. The Ecosystem uses `ECOSYSTEM_REPO`. |

The writer (`src/connector/prWriter.ts`) can only touch the two configured repositories, only branches starting `oq/`, and PRs whose head is such a branch in the same
repository. It never writes to the default branch and never approves a review. See `docs/PR_POLICY.md` and OPQ-039.

## Routes

`GET /api/oq`, `POST /api/oq/ingest`, `POST /api/oq/questions`, `POST /api/oq/questions/:id/decide`, `GET /api/oq/decisions/:id/plan`, `POST /api/oq/decisions/:id/pr`,
`GET /api/oq/prs/:id`, `POST /api/oq/prs/:id/{comment,edit,ready,merge}`. Ready and merge need the officer role once `OPS_ROLES` is set. Ledger actions `oq.*` are server-only.

## Limits, stated plainly

- The register is a working view. If it and the markdown differ, the markdown wins.
- The snapshot has 61 questions; ingest adds only ids it does not hold, so later edits to the seed file do not change a question already ingested.
- The recommendations were written from the question text and need a person's judgement.
- Answers recorded in the Claude artifact's own database are not imported; the live data matched the snapshot (no answers) when this was built.
- Not verified against real GitHub: the writer is tested against a recording double. Try it on a throwaway question first.
- Decisions on the Ecosystem's questions open a PR in the Ecosystem; its `CLAUDE.md` stage-gate and PR-size rules apply to a person who edits it further.
