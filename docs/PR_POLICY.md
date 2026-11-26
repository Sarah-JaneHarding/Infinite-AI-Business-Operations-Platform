# Pull request policy

How code changes reach `main` in this repository.

## Rules

- Every code change is a **draft pull request**. Nothing is pushed to `main`.
- The named owner, Sarah-Jane Harding (`@Sarah-JaneHarding`, the sole code owner in `.github/CODEOWNERS`), reviews and merges.
- No agent, bot or Claude session merges or approves a pull request.
- CI must be green before merge.
- The PR body states what changed, how it was tested, and which guardrails it touches.
- Keep PRs small: a guideline of about 400 changed lines, excluding generated files and lockfiles. One logical change per commit.
- Commits follow Conventional Commits, for example `docs: solo signing, PR policy`.

## OPQ-032: who approves the owner's own pull requests (resolved 2026-11-14)

GitHub does not let an author approve their own pull request. Pull requests opened through the owner's account have the owner
as author, and the owner is the sole code owner. A "require code-owner review" rule alone would therefore block every such PR.

Owner decision, 2026-11-14: the owner merges their own PRs using a repository admin bypass on the branch ruleset. That is the
owner's own repository setting; Claude does not change it. The draft PR, the CI gate and the owner's own review remain required.

Said plainly: one person reviews and merges. This is the same single-person arrangement as solo signing
(`docs/REVIEW_BOARD.md`). When a second reviewer exists, add them as a code owner and stop using the bypass.

## Decision pull requests opened by the platform (OPQ-039)

The Open Questions Register can open a pull request when a person records a decision
(`docs/OPEN_QUESTIONS_REGISTER.md`). It stays inside these rules:

- It is a **draft**, on a branch starting `oq/`, and changes documents only: a new `docs/decisions/<ID>.md` and one added row in the
  Decision log of `docs/OPEN_QUESTIONS.md`. No existing line is edited.
- It never writes to the default branch, never approves a review, and never touches another branch or repository.
- A person can comment on it, edit markdown under `docs/` on its branch, and mark it ready, from the platform. Each act is in the audit ledger under that person.
- Merging from the platform is **off** unless `OPS_ALLOW_PR_MERGE=true`. When on, it needs the officer role (once roles exist), a ready PR,
  green CI, the head the person saw, and the PR number typed to confirm. It squashes. This is the owner merging, by their own click; no agent merges.
- The write token is separate from the read-only `GITHUB_TOKEN`.
