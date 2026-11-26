# INFINITE-AI Ecosystem — Repository Audit

**Date:** 2026-09-25
**Branch audited:** `claude/determined-turing-6vgp01` (HEAD `333fb4f`)
**Scope:** Full fresh audit — build status, gaps, prioritized task list, local Docker setup, AWS staging setup.

---

## 1. Executive Summary

This is **not** an early-stage project. It is a mature, well-tested, 18-stage-manual-complete
multi-tenant SaaS platform, currently mid-way through a proposed "Phase 4" extension (stages
19–63 in the running log). Concretely, as of this audit:

- **`pnpm install`, `typecheck`, `lint`, and `test` all pass cleanly.** 4,402 unit tests across
  260 test files, 0 failures, 0 skips, 0 `.only`. 53/53 packages typecheck under strict mode
  with zero `any`/`@ts-ignore`.
- **All 19 stages of `INFINITEAI_BUILD_MANUAL.md` (Stage 00–18) have shipped code**, backed by
  66 recorded stage entries in `docs/STAGE_LOG.md` (the log continues numbering past 18 into
  Phase‑4/sub-stage work). No stage entry records an unambiguous exit-gate FAIL.
- **Infrastructure-as-code is fully written but never applied.** 18 Terraform modules exist for
  `af-south-1`; zero real AWS resources exist today. This is the single biggest gap between
  "built" and "running."
- **One safety-relevant guardrail is a stub that fails open.** The age-appropriateness judge
  (OQ-015) currently lets every output pass by default because the model-gateway call that
  should render a verdict was never implemented — see §3.1, this is the top-priority fix.
- **Curriculum content coverage is partial by design** (SA education policy is ingested only
  from real, ratified sources — the manual explicitly forbids inventing curriculum content), but
  8 of 11 official SA languages and Grades 10–12 are not yet ingested.

The rest of this report details what exists, what's missing and why, a prioritized task list,
and two how-to guides (local Docker, AWS staging).

---

## 2. What's Already Built

### 2.1 Architecture layers (per `CLAUDE.md`'s L0–L8 stack)

| Layer                  | Package(s)                                   | Status                                                                                                                                                                                                                                                                                                                                                  |
| ---------------------- | -------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| L0/L1 integrations     | curriculum-seed, contracts/popia             | CAPS/ATP/POPIA source material ingested from real DBE documents; partial coverage (see §3.5)                                                                                                                                                                                                                                                            |
| L2 Model Gateway       | `apps/gateway`                               | **Mature.** 16 src files / 15 tests. Sole egress point to model providers — Anthropic, Google, OpenAI-compatible adapters, SSE streaming, credential pooling, budget enforcement, circuit breaker, response caching.                                                                                                                                    |
| L3 data plane          | `packages/db`                                | **Mature.** 17 src / 23 tests. `withTenant()` tenant-scoped client, RLS on every tenant table, append-only audit/consent ledgers via DB trigger, erasure/provenance/conflict-queue tables. Implements 3 of CLAUDE.md's 4 named invariants directly.                                                                                                     |
| L4 Infinite Brain      | `packages/brain`                             | **Mature.** 15 src / 17 tests. Five memory tiers, retrieval (assembly/rerank/policy-gate/intent-router), write-path state machine, working memory, age-appropriateness/forgetting logic. Testcontainers-backed integration suite (not runnable in this sandbox, runs in CI).                                                                            |
| L5 guardrail plane     | `guardrails`, `policy`, `deident`            | **Mature.** guardrails: 10 src/11 tests (PII egress guard, prompt-injection detection, refusal policy). policy: 5 src/6 tests (RBAC, consent replay, tombstone→purpose→lawful-basis access gate). deident: 3 src/3 tests (tokenisation/scrubbing behind the `deidentified: true` stamp).                                                                |
| L6 agent runtime       | `agents`, `orchestrator`, `prompts`, `evals` | **Mature and dense.** `agents`: 63 src files, ~56 agent contracts (CE/AC/DW/TB/PD/LE), 38 tests. `prompts`: one versioned `.prompt.md` per agent (~56 files) + loader/lock. `orchestrator`: DAG runner, human-gate enforcement, per-module pipelines, 13 src/12 tests. `evals`: golden-set runner, champion/challenger promotion gate, 13 src/12 tests. |
| L7 modules (MOD-01…05) | see §2.2                                     | Built out with executor + agent-contract coverage for every module; some support packages (billing, provisioning, compliance) still shallow.                                                                                                                                                                                                            |
| L8 experience surfaces | `apps/web`                                   | **Broad but test-light.** 53 src files across 10+ role-scoped UI areas (teacher, learner, guardian, HOD, SMT, SBST, district, admin, platform, auth) but only 7 test files (Playwright/axe-core devDeps suggest supplementary E2E/a11y coverage exists at a different tier).                                                                            |

### 2.2 The five product modules + Learning Engine

- **MOD-01 Curriculum Engine** — `packages/curriculum-seed` implements CE‑01…CE‑09 executors
  (20 src / 18 tests) — seeding, ratification, ATP/CAPS loading, publish/tombstone flows. This is
  one of the most complete modules in the repo.
- **MOD-02 Support Analytics Centre** (RTI-MTSS-SIAS) — `packages/analytics`: SIAS tier state
  machine, case-file management, bias monitoring, reporting (7 src / 7 tests, ~1:1 coverage).
- **MOD-03 Data Collection & Warehouse** — `packages/warehouse`: ingestion, schema mapping, data
  quality sentinel, Learner-360 builder, insight synthesizer, next-step recommender (10 src / 9
  tests).
- **MOD-04 Teaching & Learning Toolbox** — agent contracts + prompts exist (TB‑01…TB‑11 in
  `packages/agents`); execution wiring lives in `orchestrator`/`worker`.
- **MOD-05 Teaching Analytics & PD Studio** — agent contracts (PD‑01…PD‑08) plus
  `packages/pd-journal` (CPTD cycle tracking, 3 src / 1 test — thin) and `packages/compliance`
  (policy compliance engine checking attendance/fees/SIAS/WSE/conduct/PD against ingested SA
  policy sources, 9 src / **1 test** — breadth outpaces depth here).
- **Learning Engine (LE‑01…LE‑09)** — `packages/learning`: the full corrections → pattern-mining
  → prompt-evolution → eval-gated promotion → k-anonymity commons-publish pipeline (14 src / 13
  tests). This is the most recently completed subsystem (Stage 53–62 in the log).

### 2.3 Supporting/commercial packages

`billing` (subscriptions, metering, invoicing, dunning — 6 src/5 tests), `provisioning` (tenant
onboarding wizard, lifecycle, readiness scoring, pilot management — 5 src/4 tests), `security`
(CSP/CSRF/rate-limiting/tool allow-lists — 6 src/5 tests, near 1:1), `telemetry` (OTel, audit
client, the one sanctioned logger — 8 src/7 tests), `config` (the single Zod env loader per
CLAUDE.md rule — 3 src/2 tests), `gamification`, `design-system`, `agent-builder`,
`prompt-builder`, `system-prompt-builder`, `document-annotation`, `learner-client`,
`low-tech-assessment`, `school-setup` — these last several are smaller, newer, or explicitly
scoped-thin packages (see §3.6 for the test-coverage gap list).

**`apps/worker`** (11 src/7 tests) hosts the BullMQ queue workers and DAG runner: step execution,
condition evaluation, approval handling, SNS escalation, Learning Engine signal triggers.

### 2.4 Quality gates today

- `pnpm install --frozen-lockfile` → clean (one benign warning: 4 native build scripts
  (`cpu-features`, `msgpackr-extract`, `protobufjs`, `ssh2`) are pnpm-blocked pending
  `pnpm approve-builds`).
- `pnpm typecheck` → 53/53 packages pass, strict mode, zero errors.
- `pnpm lint` → zero errors/warnings across the monorepo.
- `pnpm test` → **4,402/4,402 tests passing**, 0 failures, 0 skips, across 260 files. Largest
  suites: `contracts` (1,172 tests), `agents` (460), `curriculum-seed` (200), `policy` (223),
  `guardrails` (194), `orchestrator` (189), `warehouse` (188).
- Integration tier (Testcontainers, needs Docker) was **not run** in this sandbox — it has no
  Docker daemon — but is wired into `.github/workflows/ci.yml`'s `database` job and runs there.
- CI (`.github/workflows/ci.yml`) currently gates on `pnpm verify:stage 52` — see §3.2, this is
  stale relative to the actual latest completed stage (63).

---

## 3. What Still Needs to Be Built, and Why

### 3.1 🔴 Safety gap — Age-Appropriateness Judge is unimplemented (OQ-015)

**What's missing:** `packages/guardrails` has the plumbing (grade/phase context now flows
correctly — "Gap 1" was resolved) and the Brain now holds 206 ingested DBE developmental-
readiness clauses to judge against. But the actual `AgeAppropriatenessJudge` — the model-gateway
call that takes those clauses plus a candidate output and renders an allow/refuse verdict — was
never written. **Every output currently passes this guardrail by default.**

**Why it matters:** this is a content-safety control for a primary-school product; a fail-open
guardrail is worse than no guardrail because it looks like protection is in place. This should be
the first thing fixed before any pilot goes live with real learners.

**How to fix:** implement the judge as a Model Gateway call (per CLAUDE.md rule 3 — through the
gateway, never a raw provider SDK) inside `packages/guardrails`, wire it into the same
retrieval/verdict pattern the Brain's other L5 checks already use, add unit tests for both allow
and refuse paths plus a fail-closed test (gateway error → refuse, not pass), and update
`docs/OPEN_QUESTIONS.md` to mark OQ-015 resolved with the stage-log entry that closed it.

### 3.2 🟡 `verify:stage` gate script is 9 stages behind the log

`scripts/verify-stage.ts` defines stage ids `'00'`–`'54'` only. `docs/STAGE_LOG.md`'s most
recent completed work goes through Stage 63 (LE-03 through LE-09, the LE maturity report, and
the Stage‑14‑step‑1 design-system token work). Stages 55–63 are not represented as
gate-checkable entries, and CI's `verify` job still runs `pnpm verify:stage 52` — meaning the 11
most recently merged stages are not covered by the automated cumulative gate at all.

**How to fix:** add entries 55–63 to the `stages` array in `scripts/verify-stage.ts` (one
`{id, name, commands[]}` per stage, mirroring the test/lint/typecheck commands each stage's
`STAGE_LOG.md` entry already documents it ran), bump `ci.yml`'s `verify:stage` argument to the
new highest id, and confirm `pnpm verify:stage 63` exits 0 before treating this as done.

### 3.3 🔴 AWS infrastructure is written but never applied — no real staging/production exists

18 Terraform modules exist under `infra/terraform/modules/` targeting `af-south-1`
(POPIA data-residency requirement), and `infra/terraform/environments/{dev,staging,production}`
have real non-empty `main.tf`/`variables.tf`/`outputs.tf`. But per the Terraform README, this has
only ever been `terraform fmt -check`'d — **`init`/`plan`/`apply` have never run against AWS**
(sandbox egress blocks `registry.terraform.io`). No AWS account has these resources yet.

**Before applying**, resolve a module-duplication issue found in this audit:
`modules/vpc` and `modules/network` create near-identical VPC/subnet/NAT resources; likewise
`modules/database` vs `modules/rds`, and `modules/cache` vs `modules/elasticache`. Confirm which
of each pair is actually referenced by `modules/stack`/the environment root modules before
running `apply` — provisioning both would mean paying for and managing duplicate infrastructure.

See §5 (AWS how-to) for the concrete step-by-step to stand up a real staging environment.

### 3.4 🟡 Dead/inconsistent deployment scaffolding at repo root

`appspec.yml` and `buildspec.yml` at the repo root are generic CodeDeploy/CodeBuild boilerplate
(deploys to `/var/www/html` on a bare EC2 instance, Node 18, `npm install`/`npm run build`,
placeholder comments like "change to your runtime"). This does not match the real, working
deployment path (`cd.yml` → Docker images → ECR → ECS Fargate, Node 22, pnpm monorepo). They
appear to be stale scaffolding from an earlier design that was superseded by the ECS approach.

**How to fix:** either delete both files (the real pipeline is `.github/workflows/cd.yml` +
Terraform), or, if CodeDeploy/CodeBuild is still wanted as an alternate path, rewrite them to
match the actual ECS/ECR deployment. Confirm with the repo owner which is intended — this is a
one-line decision, not engineering work, so it's a good candidate for a quick human call rather
than a guess.

### 3.5 🟡 Curriculum/compliance source-data coverage is intentionally partial

Per the manual's rule ("never invent curriculum policy... if it is not in a supplied source
document, ask"), the following are open and tracked in `docs/OPEN_QUESTIONS.md`, not guessed:

- **OQ-013 (open):** 8 of 11 official South African languages, and Grades 10–12, are not yet
  ingested into the CAPS/ATP source corpus (currently Foundation/Intermediate/Senior Phase in a
  subset of languages).
- **OQ-002 (partially answered):** 5 multigrade (`IP-MULTI`) curriculum stubs remain unpublished
  because DBE has not released the source material for them.
- **OQ-006 (partially answered):** SACE Type‑1 CPTD activity-level point tables are still
  missing, which limits `packages/pd-journal`'s CPTD cycle computation to what's already sourced.
- **OQ-016 (open):** the LLM-as-judge eval scorer has no human-labelled calibration dataset yet
  (manual requires ≥50 cases) — this doesn't block anything already built, but blocks trusting
  `llm_judge`-type eval expectations for real promotion decisions going forward.

**Why this is "still needs to be built" rather than a bug:** these are all cases where the system
correctly refuses to fabricate policy content and is waiting on a human to supply or ratify a
real source document — exactly per CLAUDE.md's "stop and ask" rule. The task is sourcing the
documents, not writing more code.

### 3.6 🟡 Test coverage is thin in several newer/smaller packages

Packages where the test-file count trails the source-file count enough to be worth closing before
they carry more production weight: `compliance` (9 src / 1 test), `gamification` (5/1),
`pd-journal` (3/1), `school-setup` (3/1), `document-annotation` (4/1), `learner-client` (4/1),
`low-tech-assessment` (4/1), `prompt-builder` (4/1), `system-prompt-builder` (4/1), and
`apps/web` (53 src files / 7 test files — though Playwright/axe-core devDeps suggest some of this
gap is covered by an E2E/a11y tier not counted here). Per CLAUDE.md's Definition of Done ("unit
tests for the happy path plus at least two failure paths"), each of these should get failure-path
tests added, prioritizing `compliance` and `apps/web` first since they sit closest to
learner-facing behavior and policy-accuracy claims.

### 3.7 🟢 Governance/repo-hygiene gaps

- **No `CODEOWNERS` file** — no enforced review ownership per area of the codebase.
- **No Dependabot or Renovate config** — CLAUDE.md rule 9 requires manually recording every new
  dependency in `docs/DEPENDENCIES.md`, but nothing automatically flags outdated or CVE-affected
  dependencies already in the lockfile.
- **`SECURITY.md` lives at `docs/SECURITY.md`**, not repo root — GitHub's Security tab only
  auto-surfaces a root-level (or `.github/`) `SECURITY.md`.
- **`pnpm approve-builds` has never been run** — 4 packages' native install scripts
  (`cpu-features`, `msgpackr-extract`, `protobufjs`, `ssh2`) are silently skipped by pnpm's
  build-script allowlist rather than explicitly reviewed and approved/denied.
- **No package has a `README.md`** — 36/36 packages and apps rely on `package.json`
  `description` fields only. Not urgent, but worth doing per-package as each is touched.

### 3.8 🟢 Cost model and load testing need a live environment to finish (OQ-017, OQ-018)

`docs/AWS_MIGRATION_AUDIT.md` already contains detailed cost projections (Pilot $823/mo → Scale
$3,518/mo infra spend) and k6 load/spike test scripts exist (`scripts/load/k6-peak.js`,
`k6-spike.js`), but neither can be finished until a real staging environment exists to run
against and produce real telemetry. This is naturally sequenced after §3.3.

### 3.9 Phase 4 extension — scope decision pending, not blocking

`docs/OPEN_QUESTIONS.md` records a proposed 7-stage extension (visual agent builder, prompt/
system-prompt workshops, live quizzes, card-scanning assessment, doc annotation, learner app) —
several of the "thin" packages in §3.6 (`agent-builder`, `prompt-builder`,
`system-prompt-builder`, `document-annotation`, `learner-client`, `low-tech-assessment`) are early
work toward this. The decision to formally commit to Phase 4 is explicitly deferred until Stage
18's exit gate passes and is a product decision, not an engineering blocker.

---

## 4. Step-by-Step Task List

Ordered by priority. Each task names the files involved, the concrete steps, and how to verify
it's done.

### P0 — Safety and infrastructure blockers (do before any real learner touches this)

**Task 1 — Implement the Age-Appropriateness Judge (closes OQ-015)**

1. Read the current guardrail scaffolding in `packages/guardrails/src/` and the retrieval helper
   already used by other L5 checks against the 206 ingested DBE readiness clauses in the Brain.
2. Add an `AgeAppropriatenessJudge` module that: takes `(candidateOutput, learnerGradeContext)`,
   retrieves the relevant readiness clauses via the existing Brain retrieval path, makes a single
   Model Gateway call (never a raw provider SDK — CLAUDE.md rule 3) asking for an allow/refuse
   verdict with reasoning, and returns a typed verdict.
3. Wire it into the guardrail pipeline at the same point the other L5 checks run, so it's part of
   the guardrail chain rather than a bolt-on.
4. Write tests: allow-path (age-appropriate content passes), refuse-path (inappropriate content
   is blocked), and a **fail-closed test** — if the gateway call errors or times out, the verdict
   must be refuse, not pass-through. This directly fixes the current fail-open behavior.
5. Update `docs/OPEN_QUESTIONS.md` (mark OQ-015 resolved, cite the stage-log entry) and append a
   new entry to `docs/STAGE_LOG.md` recording the exit gate.
6. Verify: `pnpm --filter @infinite-ai/guardrails test` green, `pnpm verify:stage 06` (Stage 06
   owns the guardrail plane) still exits 0.

**Task 2 — Resolve Terraform module duplication before first apply**

1. Diff `infra/terraform/modules/vpc` vs `modules/network`, `modules/database` vs `modules/rds`,
   `modules/cache` vs `modules/elasticache`.
2. Grep `infra/terraform/modules/stack/main.tf` and each `environments/*/main.tf` for which
   module of each pair is actually referenced by `source = "../modules/..."`.
3. Delete or clearly mark deprecated the unused module of each pair (don't leave both wired up —
   that's how you end up paying for two VPCs).
4. Re-run `terraform fmt -check -recursive` and `terraform validate` (offline, no AWS creds
   needed) to confirm the environment roots still resolve cleanly after the cleanup.

**Task 3 — Stand up the real staging environment**
Follow §5 (AWS how-to) in full. High-level: AWS Organizations/account setup → Terraform state
backend bootstrap → GitHub OIDC role → `terraform apply` for `environments/staging` → DB role
bootstrap + Prisma migration → build/push images → `cd.yml`'s `deploy-staging` job → first tenant
provisioning → `pnpm test:rls:exhaustive` against the real database.

**Task 4 — Run load and spike tests against staging (closes OQ-017)**
Once Task 3 is done: `k6 run scripts/load/k6-peak.js` and `k6 run scripts/load/k6-spike.js`
against the staging URL. Target P99 < 2s page load, P99 < 8s artefact generation (gateway calls).
Record results in `docs/STAGE_LOG.md` under Stage 18 (Launch readiness) and update
`docs/OPEN_QUESTIONS.md`.

**Task 5 — Recalibrate the cost model with real telemetry (closes OQ-018)**
After staging has run for a representative period (recommend ≥1 week of synthetic pilot-scale
traffic), pull real gateway token-usage telemetry (Langfuse) and reconcile against
`docs/COST_MODEL.md` / `docs/AWS_MIGRATION_AUDIT.md`'s estimates. Update both docs with actuals.

### P1 — Engineering hygiene

**Task 6 — Extend `verify:stage` to cover Stages 55–63**

1. Open `scripts/verify-stage.ts`, find the `stages` array's last entry (id `'54'`).
2. For each of Stages 55–63, look up its `STAGE_LOG.md` entry to see which package(s) and
   commands it verified, and add a matching `{id: '55', name: '...', commands: [...]}` entry
   (repeat through `'63'`).
3. Update `.github/workflows/ci.yml`'s `verify` job to run `pnpm verify:stage 63` instead of `52`.
4. Verify: `pnpm verify:stage 63` exits 0 locally.

**Task 7 — Remove or fix `appspec.yml` / `buildspec.yml`**
Confirm with the repo owner whether CodeDeploy-to-EC2 is still a wanted deployment path
alongside ECS Fargate. If not: `git rm appspec.yml buildspec.yml`. If yes: rewrite both to match
the actual Node 22/pnpm/Docker/ECS pipeline instead of the current generic placeholder content.

**Task 8 — Add `CODEOWNERS`**
Add a `.github/CODEOWNERS` file mapping key paths to owners, e.g. `packages/db/` and
`packages/guardrails/` (the invariant-enforcing packages) to whoever owns security/compliance
review, `infra/terraform/` to whoever owns infra, etc. Even a single `* @sarah-janeharding` entry
as a starting point is better than none.

**Task 9 — Add automated dependency scanning**
Add `.github/dependabot.yml` (or `renovate.json`) configured for the `npm`/pnpm ecosystem across
the monorepo's workspace packages, on at least a weekly schedule, security-updates-only or full
version-bump PRs per the repo owner's preference. This complements (doesn't replace) the manual
`docs/DEPENDENCIES.md` tracking rule 9 already requires.

**Task 10 — Move or mirror `SECURITY.md` to repo root**
Either move `docs/SECURITY.md` to the repo root, or add a root `SECURITY.md` that briefly points
to `docs/SECURITY.md`, so GitHub's Security tab picks it up.

**Task 11 — Review and approve pnpm build scripts**
Run `pnpm approve-builds` locally, review what `cpu-features`, `msgpackr-extract`, `protobufjs`,
and `ssh2` actually try to run at install time (these are common native-binding packages — check
they're pulled in by legitimate deps like `ssh2`/`sharp`-adjacent tooling, not something
unexpected), and commit the resulting `pnpm-workspace.yaml`/`.npmrc` approval state so CI and
other machines don't hit the same warning silently.

### P2 — Content completeness

**Task 12 — Source and ingest remaining CAPS languages + Grades 10–12 (OQ-013)**
This is a sourcing task, not a coding task: obtain the official DBE CAPS/ATP documents for the
8 missing official languages and Grades 10–12, then run the existing ingestion pipeline
(`packages/curriculum-seed`'s CE executors) against the new source material — the pipeline
already exists, it just needs input documents. Do not fabricate content in the meantime; leave
those grades/languages absent rather than guessing, per CLAUDE.md's explicit rule.

**Task 13 — Source the 5 missing multigrade (`IP-MULTI`) stubs and SACE Type-1 point tables**
Same pattern as Task 12 — these are blocked on DBE/SACE publishing the source documents, not on
engineering work. Track status in `docs/OPEN_QUESTIONS.md` (OQ-002, OQ-006) until sourced.

**Task 14 — Decide Phase 4 scope**
Once Stage 18's exit gate is confirmed fully passed (it appears to be, per §2, but do a final
walk-through against the manual's literal Stage 18 checklist), the repo owner should make an
explicit go/no-go call on the 7-stage Phase 4 extension and record it in
`docs/OPEN_QUESTIONS.md`, resolving OQ-008/009/011/012/013.

### P3 — Coverage and documentation debt

**Task 15 — Add failure-path tests to thin packages**
Starting with `compliance` and `apps/web` (highest production exposure), then `gamification`,
`pd-journal`, `school-setup`, `document-annotation`, `learner-client`, `low-tech-assessment`,
`prompt-builder`, `system-prompt-builder` — for each, add at minimum two failure-path tests per
CLAUDE.md's Definition of Done, targeting the riskiest branches first (invalid tenant context,
malformed input, policy-check rejection).

**Task 16 — Add a `README.md` per package**
Low priority, but do it incrementally as each package is next touched for other work rather than
as a standalone sweep — a short "what this package does, how it fits the L0–L8 stack, how to run
its tests" is enough.

**Task 17 — Produce the recorded architecture walkthrough (OQ-020)**
This needs a human with screen+audio recording capability — not something the coding agent can
produce. Once recorded, link it from `docs/ONBOARDING_GUIDE.md` and close OQ-020.

---

## 5. How-To: Docker Setup for Local Testing

The documented process (`docs/DEV_SETUP.md`) in full, condensed to the commands you'll actually
run:

### 5.1 Prerequisites

- Node 22+, pnpm 10+
- A running Docker daemon — confirm with `docker info`
- `pnpm install --frozen-lockfile` from repo root

### 5.2 Bring up the data plane

```bash
cp infra/docker/.env.example infra/docker/.env
# Fill in every value. For passwords/secrets, generate with:
openssl rand -base64 24
# (Do this for each *_PASSWORD, SALT, ENCRYPTION_KEY, NEXTAUTH_SECRET, etc. — the .env.example
#  file only has names, per CLAUDE.md rule 7: no secrets in the repo, ever.)

docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml up -d
```

This starts 9 containers:

| Service                            | Image                                     | Port                        | Purpose                                                           |
| ---------------------------------- | ----------------------------------------- | --------------------------- | ----------------------------------------------------------------- |
| `postgres`                         | `pgvector/pgvector:pg16`                  | 5432                        | App DB + pgvector (Brain L1 embeddings)                           |
| `redis`                            | `redis:7-alpine`                          | 6379                        | Queues/cache (AOF persistence)                                    |
| `keycloak`                         | `quay.io/keycloak/keycloak:26.0`          | 8180→8080                   | Auth (OIDC), realm auto-imported from `infra/keycloak/realm.json` |
| `minio`                            | `minio/minio`                             | 9000 (API) / 9001 (console) | S3-compatible object storage (dev stand-in for real S3)           |
| `minio-init`                       | `minio/mc`                                | —                           | One-shot: creates app bucket + `langfuse` bucket, then exits      |
| `langfuse-clickhouse`              | `clickhouse/clickhouse-server:25.12`      | —                           | Langfuse's analytics store                                        |
| `langfuse-postgres`                | `postgres:17-alpine`                      | —                           | Langfuse's own metadata DB                                        |
| `langfuse-redis`                   | `redis:7-alpine`                          | —                           | Langfuse's own queue                                              |
| `langfuse-worker` / `langfuse-web` | `docker.langfuse.com/langfuse/langfuse-*` | 3001→3000 (web)             | Self-hosted LLM observability (traces, evals)                     |

Notes:

- Keycloak realm import takes 20–30s. If client-secret substitution fails, open
  `http://localhost:8180` (admin console), copy the real client secret, and paste it into
  `apps/web/.env` manually.
- Langfuse UI is on `http://localhost:3001` (moved off its default 3000 because `apps/web`'s dev
  server owns 3000).

### 5.3 Run migrations

```bash
# DATABASE_URL here must use the migrator role (DDL-only, per infra/docker/initdb/02-roles.sh)
pnpm --filter @infinite-ai/db db:migrate:deploy
```

### 5.4 Configure per-app `.env` files

Three separate `.env` files, each scoped differently — **do not reuse the same `DATABASE_URL`
across them**, the roles have different privileges:

- Root `.env` — `DATABASE_URL` using the `app_rw` role (least-privilege, RLS-enforced — this is
  what most local scripts/tests use).
- `apps/gateway/.env` — provider API keys (`ANTHROPIC_API_KEYS`). Optional if you're not doing
  model-calling work.
- `apps/web/.env` — NextAuth + Keycloak client config.

Point `OTEL_EXPORTER_OTLP_ENDPOINT` at `http://localhost:3001/api/public/otel` with a Basic-auth
header built from the Langfuse public/secret key pair (visible in the Langfuse UI after first
boot — `LANGFUSE_INIT_*` env vars auto-create an org/project/user/API key on startup).

### 5.5 (Optional) seed curriculum data

```bash
pnpm curriculum:seed
pnpm curriculum:ratify
```

Writes into three fixed dev tenant UUIDs (`10000000-…001/002/003`).

### 5.6 Start the three apps (three terminals — env is not auto-loaded)

```bash
# terminal 1
source .env && pnpm --filter @infinite-ai/gateway start

# terminal 2
source .env && pnpm --filter @infinite-ai/worker start

# terminal 3
pnpm --filter @infinite-ai/web dev   # http://localhost:3000
```

No users ship in the imported Keycloak realm — create one via the Keycloak admin console
(`http://localhost:8180`) before signing in to `apps/web`.

### 5.7 Running the app containers themselves (instead of `pnpm dev`)

```bash
docker compose --env-file infra/docker/.env \
  -f infra/docker/compose.dev.yml -f infra/docker/compose.apps.yml up -d --build
```

`compose.apps.yml` builds `gateway` (port 8080), `worker` (port 127.0.0.1:8081, not publicly
exposed), and `web` (port 3000) from their respective Dockerfiles, on the same Docker network as
the data plane. Each app's Dockerfile builds from the repo root (pnpm workspace needs the full
monorepo tree — no pruned/multi-stage slim build exists yet, worth a future optimization but not
urgent for local testing).

### 5.8 Running tests against Docker

```bash
# Unit tier — no Docker needed
pnpm test

# Integration tier — needs Docker daemon, uses Testcontainers (self-contained, does NOT use
# the compose stack above — it spins up its own throwaway Postgres per test run)
pnpm --filter @infinite-ai/db test:integration
pnpm --filter @infinite-ai/db coverage:merged   # unit + integration merged, the honest number
```

### 5.9 Tearing down

```bash
docker compose -f infra/docker/compose.dev.yml -f infra/docker/compose.apps.yml down -v
```

`-v` removes the named volumes (`postgres-data`, `redis-data`, `minio-data`,
`langfuse-*-data/logs`) — omit `-v` if you want to keep local data between sessions.

---

## 6. How-To: AWS Staging Environment Setup

This follows the plan already laid out in `docs/AWS_MIGRATION_AUDIT.md`, updated with what this
audit found. **Nothing in this section has been executed yet** — Terraform has never been applied
against a real AWS account. Do Task 2 (§4, module-duplication cleanup) before starting step 3
below.

### 6.1 Account structure

Set up (or confirm) AWS Organizations with at least 3 accounts: `dev`, `staging`/`production`
management, and a shared services/logging account. All resources go in **`af-south-1`**
(Cape Town) — this is a hard requirement, not a default, because of POPIA data-residency (rule:
learner data must stay in-region).

### 6.2 Bootstrap Terraform remote state

```bash
cd infra/terraform/bootstrap
terraform init
terraform apply   # creates the S3 bucket + DynamoDB lock table for remote state
```

Each environment (`dev`/`staging`/`production`/`test`) has a `backend.hcl.example` — copy it to
`backend.hcl` and fill in the bucket/table names the bootstrap step just created.

### 6.3 Set up GitHub OIDC → AWS role (for CI/CD, no long-lived AWS keys in GitHub)

Create an IAM role trusted by GitHub's OIDC provider, scoped to this repo, with permissions to
assume the deploy role Terraform and the `cd.yml`/`terraform.yml` workflows need. Record its ARN
as the `AWS_DEPLOY_ROLE_ARN` repository variable, alongside `TF_STATE_BUCKET`, `TF_LOCK_TABLE`,
and `TF_VAR_ALERT_EMAIL` (all already referenced by `.github/workflows/terraform.yml`).

### 6.4 Apply the staging environment

```bash
cd infra/terraform/environments/staging
terraform init -backend-config=backend.hcl
terraform plan    # review carefully — first real apply
terraform apply
```

This provisions, per the module inventory in this audit (§3.3, after resolving duplicates):
VPC + subnets + NAT + route tables, RDS Postgres 16 Multi-AZ with pgvector + KMS encryption,
ElastiCache Redis, S3 (SSE-KMS, versioned, lifecycle-managed), ECR repositories, ECS cluster +
Fargate services for gateway/worker/web behind an ALB with ACM cert + Route53, a self-hosted
Langfuse stack (its own ALB/ECS/RDS/Redis + a ClickHouse EC2 instance), SES for outbound email,
an SNS topic + KMS key for safeguarding escalation (backs `SAFEGUARDING_SNS_TOPIC_ARN`), and
CloudWatch alarms + a log group per service. Expect roughly 15 minutes for a first apply, per the
AWS_MIGRATION_AUDIT estimate.

Alternatively, let CI do it: pushing to `main` with changes under `infra/terraform/**` triggers
`.github/workflows/terraform.yml`'s `plan` job on the PR (posts the plan as a PR comment) and its
`apply` job on merge to `main` — gated by the `production` GitHub Environment's required-reviewer
rule, so a human approves before anything real is provisioned.

### 6.5 Bootstrap database roles and run migrations

Connect as the RDS master user and run `infra/docker/initdb/01-extensions.sql` (installs
`vector`, `pg_trgm`, `pgcrypto`) and `02-roles.sh`'s equivalent (create `migrator`, `app_rw`,
`worker_rw`, `analytics_ro` roles — all `NOSUPERUSER NOCREATEDB NOCREATEROLE NOBYPASSRLS`) against
the real RDS instance, using passwords now stored in Secrets Manager (created by the `database`
Terraform module) rather than the local `.env` values.

```bash
DATABASE_URL=<migrator-role-url-from-secrets-manager> \
  pnpm --filter @infinite-ai/db db:migrate:deploy
```

### 6.6 Build and push images, then deploy

This is what `.github/workflows/cd.yml` automates on every successful CI run on `main`:

1. `build-and-push` — Docker builds `apps/gateway`, `apps/worker`, `apps/web`, tags each with the
   commit SHA, pushes to ECR.
2. `deploy-staging` — assumes the OIDC role from §6.3, runs `scripts/cd/deploy-ecs-service.sh`
   per service against the staging ECS cluster, watches CloudWatch alarms for gateway/web.
3. `promote-to-production` — only after a required reviewer approves the `production`
   GitHub Environment; promotes the **same already-built image** (never rebuilds) via
   `scripts/cd/promote-image.sh`.

To trigger manually instead of waiting for a CI run: use `workflow_dispatch` on `cd.yml`, or the
Docker-Hub-targeted `docker-publish.yml` (manual dispatch or `v*` tag push) if you want images
published outside of AWS ECR for some other reason.

### 6.7 Provision the first tenant and verify

1. Provision Keycloak on the real environment (realm import, first admin user).
2. Run the onboarding wizard (`docs/ONBOARDING_GUIDE.md`'s 7 steps) to create the first real
   tenant — school profile, phases/grades, staff/roles, POPIA consent + retention-schedule
   ratification (mandatory before go-live; even accepting the "DEMO ESTIMATE" defaults is
   required to unblock this).
3. Run the tenant-isolation proof against the real database:
   ```bash
   pnpm test:rls:exhaustive
   ```
4. Run load tests (§4 Task 4 above) once you're comfortable with steady-state correctness:
   ```bash
   k6 run scripts/load/k6-peak.js
   k6 run scripts/load/k6-spike.js
   ```

### 6.8 Cost expectations

Per `docs/AWS_MIGRATION_AUDIT.md` (dated 2026-09-09, `af-south-1`, R18.50/USD): a 5-school pilot
staging environment runs roughly **$823/mo** in AWS infra (~R15,226/mo), growing to ~$1,070/mo at
25 schools, ~$1,756/mo at 100, ~$3,518/mo at 500. This is infra only — total OpEx including
Anthropic model spend and business operations ranges from ~R32,687/mo (pilot) to ~R654,018/mo at
scale per that document. Treat the pilot tier as intentionally loss-making; break-even is
estimated around 12–16 paying schools at the documented pricing tiers (Starter R1,200/mo,
Professional R3,500/mo, Enterprise R8,500/mo).

### 6.9 Before going live: two "⚠" items from the AWS audit that are not yet done

The AWS_MIGRATION_AUDIT's own POPIA-controls table marks **breach notification runbook** and
**per-school retention-schedule ratification tooling** as "⚠ needed" even in the Terraform
design. Confirm `docs/RUNBOOKS/` has a breach-notification procedure and that every pilot school
has actually ratified a retention schedule via `pnpm check:retention` before treating staging as
production-ready.

---

## 7. Summary Table

| Area                                  | Status                                                              |
| ------------------------------------- | ------------------------------------------------------------------- |
| Core platform code (Stages 00–18)     | ✅ Built, tested, passing                                           |
| Learning Engine (Stage 13, LE-01…09)  | ✅ Built, tested, passing                                           |
| Unit test suite                       | ✅ 4,402/4,402 passing                                              |
| Typecheck / lint                      | ✅ Clean, strict mode                                               |
| Integration test suite                | ⚠️ Written, runs in CI only (needs Docker, not run in this sandbox) |
| Age-appropriateness guardrail         | 🔴 Stub — fails open, top priority fix                              |
| Real AWS environment                  | 🔴 Terraform written, never applied — nothing is live               |
| `verify:stage` gate coverage          | 🟡 9 stages behind the actual log                                   |
| Curriculum content coverage           | 🟡 Partial by design, pending real source docs                      |
| Governance (CODEOWNERS, dep scanning) | 🟡 Missing                                                          |
| Load testing, cost model calibration  | ⏸️ Blocked on staging existing (§6)                                 |
| Phase 4 extension                     | ⏸️ Scope decision deferred, not blocking                            |

---

_Generated by a fresh audit of the repository as of 2026-09-25. Sourced directly from
`INFINITEAI_BUILD_MANUAL.md`, `docs/STAGE_LOG.md`, `docs/OPEN_QUESTIONS.md`,
`docs/AWS_MIGRATION_AUDIT.md`, `docs/DEV_SETUP.md`, `infra/docker/`, `infra/terraform/`,
`.github/workflows/`, and a full package-by-package source/test inventory — plus live
`pnpm install`/`typecheck`/`lint`/`test` runs against the current branch._
