# Dependencies

Rule 9: no new dependency without recording its name, version, licence, why it is needed
and what it replaces. Anything outside MIT / Apache-2.0 / BSD / ISC needs explicit
approval before it is added.

## Stage 00 — toolchain

| Package                  | Version | Licence    | Why                                                                                                                         | Replaces |
| ------------------------ | ------- | ---------- | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| `typescript`             | 5.9.3   | Apache-2.0 | The language. Strict mode is rule 8.                                                                                        | —        |
| `turbo`                  | 2.10.7  | MIT        | Task graph and caching across the workspace. Remote cache stays off until Stage 15.                                         | —        |
| `eslint`                 | 9.39.5  | MIT        | Mechanically enforces Part 0 rather than relying on memory.                                                                 | —        |
| `@eslint/js`             | 9.39.5  | MIT        | ESLint's own recommended rule set.                                                                                          | —        |
| `typescript-eslint`      | 8.65.0  | MIT        | TypeScript rules: no-explicit-any, ban-ts-comment (rule 8).                                                                 | —        |
| `eslint-config-prettier` | 10.1.8  | MIT        | Turns off stylistic rules that fight the formatter.                                                                         | —        |
| `prettier`               | 3.9.6   | MIT        | One formatter, no formatting debates in review.                                                                             | —        |
| `lint-staged`            | 16.4.0  | MIT        | Runs lint and format on staged files only, so the hook stays fast.                                                          | —        |
| `husky`                  | 9.1.7   | MIT        | Git hooks: pre-commit lint, pre-push unit suite (Stage 00 step 5).                                                          | —        |
| `vitest`                 | 5.0.5   | MIT        | Unit and integration test runner (Part 4 §4.1).                                                                             | —        |
| `tsx`                    | 4.23.1  | MIT        | Runs `scripts/verify-stage.ts` without a build step.                                                                        | —        |
| `@types/node`            | 22.20.1 | MIT        | Node type definitions.                                                                                                      | —        |
| `zod`                    | 4.6.7   | MIT        | Runtime validation. `unknown` + a Zod parse is the sanctioned pattern under rule 8, and every API contract is a Zod schema. | —        |

All licences above are MIT or Apache-2.0. Nothing on this list needs an approval
exception.

## Stage 01 — data foundation

| Package                      | Version | Licence    | Why                                                                                                                                    | Replaces |
| ---------------------------- | ------- | ---------- | -------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `prisma`                     | 7.10.1  | Apache-2.0 | ORM and migration engine, locked by §1.1.                                                                                              | —        |
| `@prisma/client`             | 7.10.1  | Apache-2.0 | The generated client the tenant-scoped wrapper wraps.                                                                                  | —        |
| `@prisma/adapter-pg`         | 7.10.1  | Apache-2.0 | Prisma 7's required Postgres driver adapter (brings `pg`, MIT, and `@types/pg`). Replaces Prisma 6's built-in query engine connection. | —        |
| `testcontainers`             | 12.0.4  | MIT        | Real Postgres per test run, locked by §1.1 and Part 4 §4.1.                                                                            | —        |
| `@testcontainers/postgresql` | 12.0.4  | MIT        | The Postgres module for the above.                                                                                                     | —        |
| `@vitest/coverage-v8`        | 5.0.5   | MIT        | Coverage, to hold `packages/db` to the ≥ 95% line threshold in §4.2. Pinned to the Vitest minor.                                       | —        |

### Prisma 7 (adopted 2026-10-23; was "Why Prisma 6 rather than 7")

This section used to defer Prisma 7 for one reason: it removes the Rust query engine and requires a driver adapter for
Postgres, and that connection path carries the transaction-local `app.tenant_id` setting every RLS policy depends on, so it
should not be adopted without "a working RLS suite to prove it did not break isolation". That precondition is now met, and the
upgrade was made as its own change:

- `packages/db/src/client.ts` builds every client with `new PrismaPg({ connectionString })` (`createPrismaClient`, package
  internal); the URL comes from `loadDatabaseUrl()` in `packages/config`, the one place `process.env` is read. `datasource.url`
  left `schema.prisma` for `packages/db/prisma.config.ts`, which the CLI (migrate, generate) reads and the running app never does.
- Proof against a real Postgres 16 with pgvector: the 20 `packages/db` integration suites (676 tests, including the exhaustive
  RLS suite, tenant deletion and POPIA), plus the `brain`, `orchestrator`, `curriculum-seed` and `guardrails` integration suites;
  `prisma migrate deploy` of all migrations; the seed run twice (idempotent); and a direct check that a query with no tenant
  context still raises `unrecognised configuration parameter "app.tenant_id"` instead of returning rows.
- New dependency recorded above: `@prisma/adapter-pg` 7.10.1 (Apache-2.0; pulls `pg`, MIT).

## Stage 04 — Model Gateway

Steps 1–7, 9 and 10 needed no new dependency: `apps/gateway` uses `zod` (schemas for the
OpenAI-compatible wire contract), `tsx` (the `start` script) and `@vitest/coverage-v8`
(coverage), all already recorded above at the versions pinned there. Provider calls go
over the platform `fetch`, not a provider SDK — rule 3 confines the one exception
(`apps/gateway/src/adapters/`) to adapter code, and there is nothing in it to add here,
since no SDK was pulled in at all.

Step 8 (OTel spans, Langfuse traces) added the official OpenTelemetry JS SDK to
`packages/telemetry`:

| Package                                   | Version | Licence    | Why                                                                                                                                                                                                                                                                                                     | Replaces |
| ----------------------------------------- | ------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@opentelemetry/api`                      | 1.9.1   | Apache-2.0 | The stable OTel API surface (`Span`, `SpanStatusCode`) that `packages/telemetry/src/tracing.ts` wraps.                                                                                                                                                                                                  | —        |
| `@opentelemetry/sdk-trace-base`           | 2.10.0  | Apache-2.0 | `BasicTracerProvider`, `BatchSpanProcessor` and the in-memory exporter used by tests. The base (non-Node) SDK is enough — this module passes an explicit `Span` through call sites rather than relying on `AsyncLocalStorage` context propagation, so `sdk-trace-node`'s context manager is not needed. | —        |
| `@opentelemetry/exporter-trace-otlp-http` | 0.221.0 | Apache-2.0 | Ships spans over OTLP/HTTP. Langfuse ingests OTLP directly at its own endpoint, so no Langfuse-specific SDK is needed — see `tracing.ts`'s file header.                                                                                                                                                 | —        |
| `@opentelemetry/resources`                | 2.10.0  | Apache-2.0 | `resourceFromAttributes()`, to tag every span with `service.name`.                                                                                                                                                                                                                                      | —        |
| `@opentelemetry/semantic-conventions`     | 1.43.0  | Apache-2.0 | The standard `service.name` attribute key, rather than a hand-typed string.                                                                                                                                                                                                                             | —        |

All five are the official CNCF OpenTelemetry JS packages, Apache-2.0, and none needs an
approval exception. `apps/gateway` takes `@opentelemetry/sdk-trace-base` as a devDependency
only, to build an in-memory span exporter in its own tests — the real exporter is built
once in `packages/telemetry` and consumed through its `Tracer`/`Span` interface, never
imported directly by application code.

## Stage 05 step 1 — Infinite Brain, L0-L4 tables

No new dependency. L0-L3 are Prisma models in `packages/db`, on the same `zod`/`prisma`
already recorded above. `pgvector` (the `vector` extension `brain_embedding` uses) was
already installed by `infra/docker/initdb/01-extensions.sql` in Stage 00, reserved for
this stage.

L4 Working memory (`packages/brain/src/working-memory.ts`) is a `WorkingMemoryStore`
interface plus an in-memory implementation, deliberately not a Redis client. The manual
does name Redis for this tier, but there is no concrete per-run scratchpad to wire one to
until Stage 06's orchestrator produces an actual run — adding `ioredis` (or `redis`) now,
before anything calls it, is exactly what rule 9 exists to stop. The choice between them
is Stage 06's to make, when there is a real caller to make it against.

## Stage 05 step 2 — the write path

No new dependency, only reuse at pinned versions already recorded above. `packages/brain`
took `@infinite-ai/db` (workspace) as a runtime dependency for the first time — it now
calls `withTenant()` itself rather than only being called through it — and `zod` for the
"extracted+typed" transition's per-tier schemas, the same `zod` recorded in Stage 00.

Its integration suite needed a real Postgres the same way `packages/db`'s own suite does,
so `packages/brain` took `@testcontainers/postgresql` and `testcontainers` as
devDependencies, both already recorded in Stage 01 at the same versions. It does not take
`@prisma/client`: its harness (`test/support/database.ts`) shells out to the Prisma CLI
already installed in `packages/db` to run migrations, and every actual query in the suite
goes through `@infinite-ai/db`'s own `withTenant()` — there was never a reason to construct
a second Prisma client.

## Stage 05 step 3 — contradiction resolution

No new dependency. `brain_conflict_queue` is another Prisma model in `packages/db`, on the
same `prisma`/`zod` already recorded; the provenance comparison it depends on
(`resolveContradiction`) is pure TypeScript in `packages/brain`, with nothing to add.

## Stage 05 step 4 — the retrieval path

No new dependency — every addition is a workspace package already built, taken as a real
runtime dependency for the first time. `packages/brain` took `@infinite-ai/policy`
(`authorize()`/`resolveAccess()`, composed for the first time anywhere in the repo — see
`retrieval-policy-gate.ts`'s own header for why no composed gate existed before this),
`@infinite-ai/contracts` (`Purpose`/`DataCategory`/`ConsentEntry` types the policy gate
needs), and `@infinite-ai/telemetry` (`Tracer`/`Span`, the same interface `apps/gateway`
already threads through its own request handling — "every stage individually testable and
traced" is this stage's own exit-gate text).

Its integration suite proves tracing against a real span, the same way `apps/gateway`'s
own tests do: `@opentelemetry/sdk-trace-base`'s `InMemorySpanExporter` as a devDependency,
already recorded in Stage 04 at 2.10.0 and taken there the same way (devDependency only,
for an in-memory exporter in tests — never the real OTLP path).

## Stage 05 step 5 — token-budgeted assembly's real packer

No new dependency. `packages/db/src/brain-retrieval.ts` gained two read functions
(`listEffectiveConstitution`, `listEffectiveExemplars`) on the same Prisma client already
recorded in Stage 01; `packages/brain`'s `assembleContext` rewrite and the two new
retrieval-path stages that feed it (`constitution_fetched`, `exemplars_fetched`) are pure
additions to code already built in step 4, on packages already taken as dependencies
there. The one internal change worth recording: `write-path-schemas.ts`'s
`BrainConstitutionKind` Zod enum, previously module-private, is now exported and imported
by `retrieval-types.ts` — the same reasoning `BrainEntityType` was already exported for in
step 4, so `packages/brain` keeps not taking `@prisma/client` as a dependency of its own.

## Stage 05 step 6 — provenance

No new dependency. `packages/db/src/brain-provenance.ts` is a new file, but its one export
(`getFactProvenance`) is a read against the same five Prisma models every other Brain
module in this package already queries, on the same client recorded in Stage 01. No
package outside `packages/db` takes a new dependency for this step: nothing in
`packages/brain` calls it yet — that caller is step 9's `explain()`.

## Stage 05 step 7 — never-forget guarantees

`packages/db` takes `@infinite-ai/telemetry` (Stage 04, already pinned there) as a real
runtime dependency for the first time — a workspace package already built, not a new
external one. `packages/db/src/audit.ts`'s `appendAuditEvent` calls
`@infinite-ai/telemetry`'s `chainEvent` (the pure hash-chain logic Stage 02 built but that
nothing in `packages/db` had called until now) to actually chain and persist an
`audit_event` row, closing the gap `erasure.ts`'s own `writeErasureEvent` comment
(Stage 03) already flagged: "the tamper-evident chain... is Stage 02's, and this call site
links into it when that lands." No dependency cycle: `@infinite-ai/telemetry` takes no
workspace dependencies of its own.

## Stage 05 step 8 — forgetting by design

No new dependency. `packages/db` gained two files (`retention.ts`'s `getRetentionRule`,
`brain-forgetting.ts`'s `tombstoneBrainFact`), both reads/writes against Prisma models
already recorded (`RetentionRule` from Stage 03, `BrainNode`/`BrainEdge` from Stage 05
step 1) plus the `appendAuditEvent` this package already took a dependency on for step 7.
`packages/brain`'s `forgetting.ts` reuses `@infinite-ai/contracts`'s `evaluateRetention`
(Stage 03) — the first real caller anywhere in the repo, closing that stage's own OQ-007
gap for the Brain's own tables, though not for Stage 03's own, which remains its own
follow-up.

## Stage 05 step 9 — the Brain API

No new dependency. `packages/brain/src/api.ts` is a new file, but it introduces no import
that was not already reachable from this package: `remember`/`supersede` compose
`openWrite`/`run` (step 2), `recall` is `retrieve` (steps 4-5), `ratify` composes
`write-path.ts`'s own `ratify` with `run`, `forget` wraps `@infinite-ai/db`'s
`tombstoneBrainFact` (step 8), and `explain` is the first real caller of
`@infinite-ai/db`'s `getFactProvenance` (step 6) that module's own header already named
this step as owning.

## Stage 05 step 10 — the stage's own test suite

No new dependency. The restore drill (`packages/brain/test/restore.integration.spec.ts`)
calls `snapshot()`/`restoreSnapshot()` on the `StartedPostgreSqlContainer`
`@testcontainers/postgresql` (pinned since step 2) already returns from `.start()` —
methods that library ships, not new surface added here. Everything else this step adds
(the temporal test, the episodes-specific policy-gate test, three more `explain()` chain
tests) composes functions steps 2, 4, 6, 8 and 9 already built.

## Stage 06 step 1 — the Agent contract

No new dependency. `packages/agents` takes `@infinite-ai/contracts` (already pinned
throughout the tree) as a real runtime dependency for the first time — for `Purpose` (the
manual's own "purpose, from the taxonomy") and `LogicalModel` (Stage 04's own logical-model
naming, reused rather than re-invented so an agent's `model` field can never name a
concrete provider model). `zod` is pinned at the same version (`3.25.76`) every other
package in the tree already uses.

## Stage 06 step 2 — the Agent Registry

No new dependency. `packages/agents/src/registry.ts` is a new file, but it only calls
`validateAgentContract` (step 1, same package) and holds a plain in-memory `Map` — no
new package needed for either.

## Stage 06 step 3 — the Prompt Registry

`packages/prompts` takes `@infinite-ai/contracts` (`LogicalModel`) and `zod`, both already
pinned throughout the tree — no new package for either. Deliberately **not** added: a YAML
parsing library (`js-yaml`, `gray-matter`, etc.). Every prompt file's front matter is
hand-authored to Part 3.1's own flat `key: value` shape (the one exception, `ratified_by:
null`, is a bare literal, not a YAML feature this format actually needs) — never arbitrary
external YAML — so `loader.ts` parses it with a two-line splitter instead. Rule 9's first
question ("check whether something already in the tree does the job") has no candidate in
the tree either way; the second question is whether the job needs one at all, and this one
does not.

## Stage 06 step 4 — the DAG orchestrator

No new dependency. `packages/orchestrator` takes `@infinite-ai/db` (the tenant-scoped
client and the new `orchestrator.ts` persistence primitives) and `@infinite-ai/telemetry`
(`Tracer`/`Span`, the same interface Stage 05's retrieval path and `apps/gateway` already
thread through) as real runtime dependencies for the first time, plus `zod` — all three
already pinned throughout the tree. Its devDependencies are the same pair every other
Testcontainers-backed package in this repo already carries at the same pinned versions:
`testcontainers`/`@testcontainers/postgresql` (12.0.4, first recorded Stage 01) for its own
integration suite's Postgres, and `@opentelemetry/sdk-trace-base` (2.10.0, first recorded
Stage 04) for `InMemorySpanExporter`, proving the run's one `trace_id` lands on every step
span the same way Stage 05 step 4's own integration suite already proves tracing.

## Stage 06 step 5 — Human-in-the-loop gates

No new dependency. `packages/db/src/approval.ts` and `packages/db/src/roles.ts` are new
files, but both are built entirely on `@prisma/client` (already pinned) and this package's
own `TenantClient`; `packages/orchestrator/src/runner.ts`'s `decideHumanGate` composes
`zod` (already a runtime dependency of this package since step 4) for input validation and
`@infinite-ai/db`'s own `appendAuditEvent` (Stage 05 step 7) for the decision's audit-event
record — no package gained a dependency it did not already have.

## Stage 06 step 6 — the Guardrail engine

No new dependency. `packages/guardrails` takes `@infinite-ai/contracts` (`DataCategory`),
`@infinite-ai/policy` (`resolveAccess`, `AccessRequest` — Stage 03 step 3) and
`@infinite-ai/telemetry` (`Tracer`, the same interface every other traced call site in this
repo already threads through) as real runtime dependencies for the first time, plus `zod`
— all four already pinned throughout the tree. Its devDependency is the same
`@opentelemetry/sdk-trace-base` (2.10.0, first recorded Stage 04) every other traced
package already carries, for `InMemorySpanExporter` in `test/engine.spec.ts`. Deliberately
**not** added: a tokenizer library, for the same reason `packages/brain/src/retrieval-
assembly.ts`'s own `estimateTokens` gave in Stage 05 step 5 — a `Math.ceil(length / 4)`
estimate is honest about being approximate and a conservative overestimate never silently
lets a budget be exceeded, so a real tokenizer is a dependency this stage still does not
justify. This package deliberately takes no dependency on `@infinite-ai/agents` or
`@infinite-ai/db` — see `docs/STAGE_LOG.md`'s step 6 entry for why (the layer diagram has
the agent runtime sit above this package, and nothing yet calls this engine at a point
where a tenant transaction is open).

## Stage 06 step 7 — the Tool registry

No new dependency. `packages/agents/src/tool-registry.ts` only calls `ToolDeclaration`
(step 1, same package) and holds a plain in-memory `Map`, the same shape
`AgentRegistry` (step 2) already uses. `packages/orchestrator/src/dag.ts`'s
`validatePipelineGating` takes its irreversible-tool check as a plain injected callback
rather than a dependency on `@infinite-ai/agents` — see `docs/STAGE_LOG.md`'s step 7 entry
for why a cross-package dependency between two peer packages in the same architectural
layer was the wrong shape here.

## Stage 06 step 8 — Cost and rate control

No new dependency. `packages/orchestrator/src/concurrency.ts` and `fairness.ts` are new
files holding only plain in-memory data structures (`Map`, arrays) — no package needed for
either. `apps/gateway/src/circuit-breaker.ts` is the same: a hand-written state machine,
no dependency added. A production-grade circuit-breaker or rate-limiting library (e.g.
`opossum`, `cockatiel`, `bottleneck`) was considered and rejected for the same reason
`packages/brain`'s own token estimate stayed a one-line heuristic rather than pulling in a
tokenizer: the state machine step 8 actually needs (three states, one threshold, one
cooldown) is small enough that a library would trade a real dependency (a licence to
track, a supply-chain surface, an API to learn) for less clarity than fifty lines of plain
TypeScript this team already owns end to end.

## Stage 06 step 9 — the Run Inspector

No new dependency. `packages/orchestrator/src/inspector.ts` only calls `getRun`/
`listStepRuns` (`@infinite-ai/db`, already a dependency) and reshapes their result with
plain object/array operations. The four new `OrchestratorStepRun` columns are a plain
Prisma migration, no new package.

## Stage 07 step 1 — the eval case format

No new dependency. `packages/evals/src/case.ts` only calls `zod`, already declared
repo-wide in Stage 00 ("every API contract is a Zod schema") — this is simply that
package's first real use of it.

## Stage 07 step 2 — the scorers

No new external dependency. `packages/evals` now depends on `@infinite-ai/guardrails`
(workspace package, already in the tree since Stage 06 step 6) — `scorers.ts` reuses its
`scoreReadability`, `checkGrounding` and `checkRefusalPolicy` directly for the readability,
citation-validity and refusal-correctness scorers, rather than reimplementing any of the
three and risking this package's notion of "correct" drifting from what the guardrail
engine enforces at runtime.

## Stage 07 step 3 — the runner

No new dependency. `packages/evals/src/runner.ts` only calls `scoreExpectation` (step 2,
same package) and holds plain in-memory data structures — no package needed for either
`runEvalSet` or `diffAgainstChampion`.

## Stage 07 step 4 — champion / challenger

No new external dependency. `packages/evals` now also depends on `@infinite-ai/agents`
(workspace package, already in the tree since Stage 06 step 1) — `promotion.ts` reuses its
`AgentBudget` type directly for the budget gate, rather than declaring a second, possibly
divergent budget shape.

## Stage 07 steps 5-8 — CI wiring, growth loop, safety set, dashboard

No new dependency. `discovery.ts` and `champion-store.ts` use only `node:fs`/`node:path`;
`affected.ts`, `gate.ts`, `agent-executors.ts`, `safety-set.ts`, `growth-loop.ts` and
`dashboard.ts` are all plain functions over this package's own existing types. The two new
root-level CLI scripts (`scripts/evals-run.ts`, `scripts/evals-gate.ts`) reuse `tsx`
(already a root dependency since Stage 00, the same runner `scripts/verify-stage.ts` and
`scripts/check-retention-schedule.ts` already use) and add `@infinite-ai/evals` itself as a
new root `devDependency` — a workspace package, not an external one.

## Stage 08 step 1 — machine-readable template definitions, versioned in L0

No new dependency, external or workspace. `packages/contracts/src/curriculum/template.ts`
only calls `zod`, already declared. `packages/guardrails/src/template-fidelity.ts` adds no
new package.json entry either — `@infinite-ai/contracts` was already a `guardrails`
dependency (Stage 03). `packages/brain/src/curriculum-templates.ts` calls only `remember()`
(this package's own `api.ts`, Stage 05) and `@infinite-ai/contracts`, already a `brain`
dependency. No real template instance was added: `docs/SOURCE_DOCUMENTS.md` OQ-003 records
that no school has supplied one yet, so this step ships only the schema and the mechanism
that will version a real definition into L0 once one exists — the same "empty vessel"
shape `curriculum/framework.ts` already established for CAPS content itself.

## Stage 09 — MOD-03 Data Collection & Warehouse

No new external dependency. `@infinite-ai/warehouse` (workspace package, created this
stage) is taken as a runtime dependency by `@infinite-ai/agents` for the DW-01 through
DW-08 contracts.

## Stage 10 step 2 — AC-01 and AC-02 agent contracts, prompts and eval sets

No new external dependency. `@infinite-ai/analytics` (workspace package, created in Stage
10 step 1) is taken as a runtime dependency by `@infinite-ai/agents` for the first time —
it provides the `AC01Input`, `AC01Result`, `AC02Input`, and `AC02Result` Zod schemas used
in the AC-01 and AC-02 contracts. The analytics package itself depends only on `zod`
(already in the tree since Stage 02).

## Stage 10 steps 5–7 — case file, reporting, bias monitor, safeguarding drill

No new external dependency. `@infinite-ai/analytics` now takes `@infinite-ai/guardrails`
as a runtime dependency (workspace package, `workspace:*`) so that the safeguarding-drill
test can call `runOutputGuardrails`, `defaultEscalationNotifier`, and `GuardrailEscalationError`
from the guardrail plane. The guardrails package itself is already in the tree since Stage 06.

## Stage 14 — Experience surfaces

### packages/design-system — React component library

| Package        | Version | Licence | Why                                                                                                                                          | Replaces |
| -------------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `react`        | 19.2.8  | MIT     | Peer dependency for the component library. Components are pure RSC-compatible functions where possible; interactive ones use `'use client'`. | —        |
| `@types/react` | 19.2.18 | MIT     | TypeScript types for React. Pinned to the matching React 19 minor.                                                                           | —        |

No new runtime dependencies in `packages/design-system` itself — all styling is CSS custom
properties (zero-runtime). `react` is a peer dependency that the consuming app (`apps/web`)
already brings. The dev dependency on `react` is solely so Vitest can import the JSX
components in the test environment; no React runtime ships with the package.

### apps/web — Next.js front-end

| Package                | Version | Licence    | Why                                                                                                                                                                                                                                                                          | Replaces |
| ---------------------- | ------- | ---------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `next`                 | 16.4.2  | MIT        | The App Router framework. Server components by default; Turbopack for the dev server. Required by Stage 14 step 1. Bumped from 16.3.0 — see the supply-chain audit note below.                                                                                               | —        |
| `react`                | 19.2.8  | MIT        | React 19 — required by Next.js 16. Provides concurrent features, form actions and the compiler the framework depends on.                                                                                                                                                     | —        |
| `react-dom`            | 19.2.8  | MIT        | The DOM renderer for React 19.                                                                                                                                                                                                                                               | —        |
| `@types/react`         | 19.2.18 | MIT        | TypeScript types for React 19.                                                                                                                                                                                                                                               | —        |
| `@types/react-dom`     | 19.2.4  | MIT        | TypeScript types for react-dom.                                                                                                                                                                                                                                              | —        |
| `next-auth`            | 4.24.15 | ISC        | Auth.js v4 — Keycloak OIDC provider, JWT session strategy, role claim extraction. Chosen over v5 beta because v4 is stable and the ISC licence is approved.                                                                                                                  | —        |
| `zod`                  | 3.25.76 | MIT        | Web-specific env schema validation in `apps/web/src/lib/env.ts`. Same version already recorded at Stage 00.                                                                                                                                                                  | —        |
| `tailwindcss`          | 4.3.3   | MIT        | CSS utility classes. v4 CSS-first approach consumes the design token custom properties directly; no `tailwind.config.ts` required.                                                                                                                                           | —        |
| `@tailwindcss/postcss` | 4.3.3   | MIT        | PostCSS plugin that integrates Tailwind v4 into the Next.js build pipeline.                                                                                                                                                                                                  | —        |
| `postcss`              | 8.5.26  | MIT        | PostCSS itself. Required peer of `@tailwindcss/postcss`.                                                                                                                                                                                                                     | —        |
| `autoprefixer`         | 10.5.4  | MIT        | Adds vendor prefixes; companion to PostCSS for broader browser coverage.                                                                                                                                                                                                     | —        |
| `@playwright/test`     | 1.62.1  | Apache-2.0 | E2E and accessibility test runner. Pre-installed Chromium at `/opt/pw-browsers/chromium` is used in CI to avoid downloading a separate browser.                                                                                                                              | —        |
| `@axe-core/playwright` | 4.13.0  | MPL-2.0    | Playwright integration for axe-core. Runs WCAG 2.2 AA scans from within Playwright tests. MPL-2.0 is a weak copyleft that applies only to the axe-core source itself — no proprietary source is combined with it; approved by the same rationale as similar MPL-2.0 tooling. | —        |

### Why next-auth v4 rather than v5

Auth.js v5 (`next-auth@5`) was in public beta at the time this stage was built. It ships
a materially different session and callback API, and the JWT claim extraction for Keycloak
realm roles (`realm_access.roles`) is not documented for v5's new route handler interface.
v4 is supported, MIT-licenced (ISC is equivalent for our purposes), and the upgrade to v5
should be its own change when v5 is fully stable — the same logic that drove the Prisma 6
decision at Stage 01.

### Why `@axe-core/playwright` (MPL-2.0)

MPL-2.0 requires modifications to the axe-core source to be made available; it does not
require the consuming application's source to be opened. This is standard copyleft limited
to the library itself. No proprietary source is combined with axe-core; the package is a
dev dependency only and ships no code to end users. The exception is recorded here
explicitly as rule 9 requires.

## Stage 16 — Security hardening and pen-test readiness

No new dependencies were added for `packages/security` itself. Two `pnpm.overrides`
entries in the root `package.json` — not new dependencies in their own right, but
version pins rule 9 requires recording since each replaces a vulnerable transitive
resolution with a patched one:

| Override       | Pinned to | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| -------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `nanoid`       | `3.3.18`  | `pnpm audit:supply-chain`'s first real run (this stage) found GHSA-2v37-7h3g-55p8 (high) in the `next → postcss → nanoid` transitive chain. Recorded in `docs/STAGE_LOG.md`'s own Stage 16 entry at the time; not previously recorded here — added now as part of closing that gap.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| `deepmerge-ts` | `8.0.2`   | GHSA-ggr8-5vv4-36mx (high, stack exhaustion merging recursive object graphs) in the `packages/db → prisma → @prisma/config → deepmerge-ts` transitive chain, versions `<8.0.0`. `@prisma/config@6.19.3` pins `deepmerge-ts` to an exact `7.1.5` — no newer Prisma 6.x release exists to pick up a fix (6.19.3 is the last 6.x version; see "Why Prisma 6 rather than 7" above for why this repo is not yet on 7), so an override is the only remediation short of the Prisma-major-version upgrade already deferred. `deepmerge-ts` is a build-time-only dependency of Prisma's own config-loading tooling, never imported by this codebase directly — `prisma generate` and `packages/db`'s own test suite were re-verified against the override before it was adopted. |

Found while making the CI stage gate actually track the repository's current stage
(this same commit) — the very first time `pnpm audit:supply-chain` (declared as part
of this stage's own verification set since it was written) had ever been executed by
CI, since `.github/workflows/ci.yml` had called `pnpm verify:stage 00` unconditionally
since Stage 00 itself.

### `next` 16.3.0 → 16.3.4 (2026-09-11)

`pnpm audit:supply-chain` found two critical, unauthenticated RCE advisories in
`next@16.3.0` (GHSA-p293-qw3h-jr36, Windows-hosted servers; a second Image
Optimization API/AVIF advisory), both patched in `>=16.3.3`. This had gone
uncaught for the same reason as the `nanoid`/`deepmerge-ts` overrides above: CI
has not completed a run since 2026-09-02 (see `docs/OPEN_QUESTIONS.md` OQ-029),
so no push since then had actually run the audit. Bumped the direct dependency
in `apps/web/package.json` to `16.3.4` (latest patch on the 16.3.x line at the
time of this fix) and regenerated `pnpm-lock.yaml`; `pnpm --filter @infinite-ai/web`
typecheck/test/build all re-verified green after the bump.

### `next` 16.3.4 → 16.3.6 (2026-10-01)

`pnpm audit:supply-chain` (Stage 16 step, part of the cumulative `verify:stage 65`
gate) reported one critical advisory against `next@16.3.4`: GHSA-vcvr-r3jv-pc5j,
remote code execution in `next/og` `ImageResponse`, affecting `>=16.2.0 <16.3.6`
and patched in `>=16.3.6`. Bumped the direct dependency in `apps/web/package.json`
to `16.3.6` (exact, as the audit's pinning check requires) and regenerated
`pnpm-lock.yaml` and `docs/sbom.json`; the lockfile diff touches only `next`,
`@next/env` and the `@next/swc-*` platform binaries. Re-run of
`pnpm audit:supply-chain` after the bump: PASS, no known vulnerabilities.

### `next` 16.3.6 → 16.3.8 (2026-10-08)

`pnpm audit:supply-chain` (part of the cumulative `verify:stage 65` gate) started failing on `main` with one new **high**
advisory against `next@16.3.6`: GHSA-cjq9-62q9-8jv4, server-side request forgery in Image Optimization, affecting
`>=16.0.0 <16.3.8` and patched in `>=16.3.8`. Bumped the direct dependency in `apps/web/package.json` to `16.3.8` (exact, as the
audit's pinning check requires; licence unchanged, MIT) and regenerated `pnpm-lock.yaml`; the diff touches only the `next`, `@next/env`
and `@next/swc-*` entries. Replaces nothing; same minor, patch bump. `docs/sbom.json` changes by its timestamp only and is not
committed. Re-run of `pnpm audit:supply-chain` after the bump: PASS, no known vulnerabilities.

### `next` 16.4.0 → 16.4.2 (2026-10-23)

`pnpm audit:supply-chain` (part of the cumulative `verify:stage 65` gate) failed against `next@16.4.0` with new **critical**
advisories, including GHSA-2464-fhr4-w9xw (unauthenticated remote code execution in `use cache` functions returning typed arrays),
affecting `>=16.0.0 <=16.4.0` and patched in `>=16.4.1`. `main` already carries `16.4.2` (exact pin, MIT, no replacement), which
clears them; this entry records it (the row above read 16.3.8 because the move to 16.4.0 and then 16.4.2 was not recorded here).
After merging `main`: `pnpm audit:supply-chain` PASS.

### `zod` 3.25.76 → 4.6.7 (2026-10-23)

Exact-pinned in every workspace manifest that declares it; licence unchanged (MIT); replaces nothing. What the major bump
changed in this repository:

- `z.record(value)` needs a key schema: `z.record(z.string(), value)` (18 sites).
- `z.SafeParseReturnType<unknown, T>` is now `z.ZodSafeParseResult<T>` (one site, the Brain write-path unwrap).
- `z.string().uuid()` now enforces RFC 9562 version and variant bits, which rejects the all-zero and patterned ids this
  codebase and its tests use (183 contract tests failed on it). Every site became `z.guid()` (296 sites), which keeps zod 3's
  accept-any-8-4-4-4-12-hex behaviour exactly. Stricter validation is a separate decision; the database layer's own check in
  `withTenant` is already RFC-shaped.
- Schema introspection moved from `_def.typeName` to `_zod.def.type`. The one consumer, `apps/worker/src/dev/schema-template.ts`
  (the input-skeleton generator behind `--template`), was rewritten for it and gained tests for the new shapes.

After the bump: lint, format, typecheck (53 packages), unit tests with coverage thresholds and
`pnpm audit:supply-chain` pass locally; the database integration suites run in CI.

### `vitest` 3.2.7 → 5.0.5 and `@vitest/coverage-v8` 3.2.7 → 5.0.5 (2026-10-23)

Dependabot proposed these as two PRs; they must move together (the coverage provider imports Vitest's own `./coverage` entry
point), so they land as one change, exact-pinned, licences unchanged (MIT), replacing the 3.2.7 pair. Two packages
(`learner-client`, `document-annotation`) declared the provider as `^3.2.7`; they are now exact like the rest. What the major
bump changed in this repository:

- `vi.fn()` now returns `Mock<Procedure | Constructable>`, not assignable to a concrete function type. Two typed-mock fixes
  in test files (`apps/gateway/test/server.spec.ts`, `packages/curriculum-seed/test/brain-publish-executor.spec.ts`).
- Branch coverage is measured more precisely, which exposed branches earlier versions did not count. `packages/analytics`
  fell to 93.75% against its 95% threshold. Rather than lower the threshold, five tests now cover the missing paths
  (a learner with no current tier; classes and grades with no known intervention rate) and one provably dead ternary in
  `rollupClass` (the cohort-size guard above it makes `length > 0` always true) was replaced by the plain division.

- `vitest --merge-reports` no longer defaults to `.vitest-reports`; it reads `.vitest/blob` unless told otherwise, so
  `packages/db`'s `coverage:merged` (the unit and integration tiers merged for its 95% gate) failed in CI with ENOENT. The
  script now passes the directory its two tiers write to. Verified with the real two-tier run against a local Postgres 16:
  905 tests, 98.05% lines, 96.06% branches.

After the bump: lint, format, typecheck, unit tests with coverage thresholds, build and `pnpm audit:supply-chain` pass locally.

### `sharp` 0.35.4 → 0.35.5 and `source-map-js` 1.2.1 → 1.2.2 (2026-10-07)

`pnpm audit:supply-chain` started failing on `main` with two new high advisories, both transitive
through `next` (so neither is a dependency this repository declares), both patched within the
version range `next` already accepts:

- `source-map-js` `>=1.0.0 <1.2.2` — event-loop denial of service through indexed source-map
  section offsets (GHSA-68fv-2mgg-jv7q), reached via `next > postcss`. Patched in `1.2.2`.
- `sharp` `<0.35.5` — a vulnerability in its librsvg dependency (CVE-2026-96889), reached via
  `next`'s optional `sharp ^0.35.4`. Patched in `0.35.5`, which also moves its bundled
  `@img/sharp-libvips-*` from 1.3.3 to 1.3.4.

Fixed with `pnpm update source-map-js sharp -r`: **lockfile and `docs/sbom.json` only**. No
`package.json` changed, no `overrides` were added, and the lockfile diff touches only the `sharp`
family, the libvips binaries and `source-map-js`. Licences unchanged (Apache-2.0 for `sharp` and
the libvips packages, MIT for `source-map-js`). `pnpm audit:supply-chain` after: PASS, no known
vulnerabilities.

## Stage 17 — Tenant lifecycle, provisioning, billing

No new external runtime dependencies were added. Both `packages/provisioning` and
`packages/billing` use only `zod` (already in the tree, MIT) plus standard Node.js.
Their `devDependencies` (`typescript`, `vitest`) are already present in the workspace.

## Stage 08 — CAPS Canon Ingestion Console (`apps/web`)

`apps/web` gains two new workspace dependencies for the CAPS Canon Ingestion Console
admin page (`/admin/curriculum/caps-canon`):

| Package                        | Version       | Licence | Why                                                                                                                                                                                                                                                                                           | Replaces |
| ------------------------------ | ------------- | ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@infinite-ai/brain`           | `workspace:*` | —       | `ratify()` (from `packages/brain/src/api.ts`) — called from the `/api/caps-canon/[id]/ratify` route handler to drive a Brain write candidate from `AWAITING_RATIFICATION` to `COMMITTED`; `BrainApiError` and `BrainWriteStatus` for error handling and type-safe status comparisons.         | —        |
| `@infinite-ai/curriculum-seed` | `workspace:*` | —       | `submitCapsSource()`, `ALL_CAPS_SOURCES`, and `CurriculumSeedError` — called from the `/api/caps-canon/[id]/ingest` route handler to create a Brain L0 write candidate from a structured `CapsSourceInfo`; `findCapsSourceByBrainDocId()` to locate the matching source by Brain document ID. | —        |

No new external dependencies. Both packages are already in the workspace tree (first
recorded at their respective stages above). The CAPS Canon page calls only `withTenant()`
(rule 5) and performs no model calls. The human-ratification gate (rule 6) is enforced in
the ratify route: it checks the candidate's status and records the ratifiedBy actor before
the response is returned.

## Adding a dependency

1. Check whether something already in the tree does the job.
2. Check the licence. If it is not MIT / Apache-2.0 / BSD / ISC, stop and ask.
3. Pin the exact version. No ranges — Stage 16 requires reproducible builds and lockfile
   integrity.
4. Add a row above, in the stage's section, in the same commit that adds the dependency.

## Stage 26 — Learner Experience

`apps/web` gains one new workspace dependency:

| Package                       | Version       | Licence | Why                                                                                                                              | Replaces |
| ----------------------------- | ------------- | ------- | -------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@infinite-ai/learner-client` | `workspace:*` | —       | Provides the `LearnerProfile`, `CourseGraph`, `GamificationSnapshot` schemas and navigation helpers used by the learner surface. | —        |

No new external runtime dependencies. The workspace package itself depends only on `zod`
(already in the tree, MIT, since Stage 00).

## P0 — Worker host and CE-01 end-to-end wiring

`apps/worker` is promoted from a stub to a full BullMQ consumer host. Two new external
runtime dependencies:

| Package   | Version | Licence | Why                                                                                                                                                                                                                                                                        | Replaces |
| --------- | ------- | ------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `bullmq`  | `6.1.2` | MIT     | Redis-backed job queue. Provides `Worker` and `Queue` classes used by the worker host to consume MOD-01, MOD-04, and MOD-05 pipeline job payloads.                                                                                                                         | —        |
| `ioredis` | `6.0.0` | MIT     | `bullmq`'s own `peerDependencies` require it (`>=5.0.0`) to build a Redis client from connection options — undeclared until a real local run against Redis surfaced it (`WorkerHost.register()` throws `BullMQ could not load the optional 'ioredis' package` without it). | —        |

No other new external dependencies. `apps/worker` consumes `@infinite-ai/*` workspace
packages already in the tree, plus `zod` (MIT, Stage 00) for job-payload validation.

## Post-Stage-52 — guardrail engine wired into the live agent-call path

One new workspace dependency, added when an audit found `runInputGuardrails`/
`runOutputGuardrails` (Stage 06) had no caller anywhere in `apps/worker` or
`apps/gateway` — the age-appropriateness check and safeguarding-escalation dispatch
could not fire on a real agent call regardless of OQ-014/OQ-015's status.

| Package                   | Version       | Licence | Why                                                                                                                                                                    | Replaces |
| ------------------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@infinite-ai/guardrails` | `workspace:*` | —       | `checkAgeAppropriateness`, `defaultEscalationNotifier`, and their types, now called from `apps/worker/src/step-executor.ts` after every agent call's output is parsed. | —        |

## Age-appropriateness/developmental-readiness clauses ingested into L0

One new workspace dependency, added when a human supplied a real, sourced dataset (206
paraphrased DBE CAPS clauses across Foundation/Intermediate/Senior Phase — see
`docs/sources/pedagogy/age-appropriateness-developmental-readiness/SOURCES.md`) that the
root package's new seed scripts needed to submit into L0_CONSTITUTION.

| Package              | Version       | Licence | Why                                                                                                                                                                                                                                                                                      | Replaces |
| -------------------- | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@infinite-ai/brain` | `workspace:*` | —       | `submitAgeAppropriatenessEntry` (packages/brain/src/age-appropriateness.ts), called from `scripts/seed-age-appropriateness.ts` for the first time — the root package.json had never taken the Brain package as a dependency of its own before (only via `@infinite-ai/curriculum-seed`). | —        |

`@infinite-ai/curriculum-seed`'s existing `ratifyCurriculumForTenant` is reused as-is by
the new `scripts/ratify-age-appropriateness.ts` (it already ratifies every
AWAITING_RATIFICATION L0_CONSTITUTION candidate for a tenant regardless of kind) — no new
dependency for that half.

## Wiring `AgeAppropriatenessChecker` to the ingested data (OQ-015's runtime-checker half)

`packages/guardrails` takes two new workspace dependencies, plus the same
Testcontainers pair `packages/brain`/`packages/orchestrator`/`packages/curriculum-seed`
already pin, for its own copy of the same integration-tier harness.

| Package                      | Version       | Licence | Why                                                                                                                                                                                                                            | Replaces |
| ---------------------------- | ------------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `@infinite-ai/brain`         | `workspace:*` | —       | `recall()` and `selectAgeAppropriatenessEntries()`, called from the new `brain-age-appropriateness.ts` — the first time this package has read Brain data rather than only validating and refusing on caller-supplied payloads. | —        |
| `@infinite-ai/db`            | `workspace:*` | —       | `TenantClient` — the type `createBrainAgeAppropriatenessChecker` takes so its caller's already-open `withTenant()` transaction is what the Brain read runs inside (rule 5), not a second connection.                           | —        |
| `@testcontainers/postgresql` | `12.0.4`      | MIT     | Same pinned version every other package's integration-tier harness already uses; spins up a real Postgres for `brain-age-appropriateness.integration.spec.ts`.                                                                 | —        |
| `testcontainers`             | `12.0.4`      | MIT     | `@testcontainers/postgresql`'s own peer dependency, same version already pinned elsewhere in the tree.                                                                                                                         | —        |

No cycle: `@infinite-ai/brain` does not depend on `@infinite-ai/guardrails`, confirmed
before adding this.

## Demo/pilot retention-schedule estimates wired into onboarding (OQ-007)

One new workspace dependency, added when the onboarding wizard's new
`ratify_retention_schedule` step needed to validate its input against the real
`RetentionSchedule` shape rather than duplicating it — the same shape
`packages/db`'s `upsertRetentionRule` ultimately persists.

| Package                  | Version       | Licence | Why                                                                                                                                                                                                        | Replaces |
| ------------------------ | ------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------- |
| `@infinite-ai/contracts` | `workspace:*` | —       | `RetentionSchedule` (validates the new `ratify_retention_schedule` step's input in `packages/provisioning/src/wizard.ts`) and `buildDemoRetentionSchedule`/`DEMO_RETENTION_ESTIMATES` (used by its tests). | —        |

No cycle: `@infinite-ai/contracts` depends on nothing in the workspace, confirmed before
adding this.

## CD pipeline (`.github/workflows/cd.yml`)

Two new GitHub Actions — the first recorded here; `ci.yml`'s own `actions/checkout`,
`actions/setup-node` and `pnpm/action-setup` predate this practice and are already
relied on by every job in this repository's CI.

| Package                                 | Version  | Licence | Why                                                                                                                                                                                                                                        | Replaces |
| --------------------------------------- | -------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------- |
| `aws-actions/configure-aws-credentials` | `v6.2.3` | MIT     | Exchanges the workflow's OIDC token for temporary AWS credentials scoped to `infra/terraform/bootstrap`'s `github_deploy_role_arn` — the "no long-lived cloud credentials" standing constraint `infra/terraform/README.md` already states. | —        |
| `aws-actions/amazon-ecr-login`          | `v2.1.7` | MIT     | Authenticates `docker push`/`docker pull` against ECR using those same temporary credentials, and provides the registry hostname the workflow builds each image tag from.                                                                  | —        |

No new npm dependency: `scripts/cd/deploy-ecs-service.sh` and `scripts/cd/promote-image.sh`
are plain bash, using the `aws` and `docker`/`jq` CLIs already available on
`ubuntu-latest` GitHub-hosted runners.

## OQ-014 close — SNS-backed safeguarding escalation notifier

`apps/worker` takes one new external runtime dependency to close OQ-014:

| Package               | Version    | Licence    | Why                                                                                                                                                                                                                                                                                                    | Replaces                                                                                        |
| --------------------- | ---------- | ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------- |
| `@aws-sdk/client-sns` | `3.1131.0` | Apache-2.0 | Publishes structured JSON messages to an SNS topic when the guardrail engine produces a safeguarding-relevant refusal with a non-null `EscalationRoute`. Topic subscriptions (SMS, email, PagerDuty endpoint, Lambda) are configured in AWS, not in this code. OQ-014's "real paging integration" gap. | `defaultEscalationNotifier` (still used as fallback when `SAFEGUARDING_SNS_TOPIC_ARN` is unset) |

No new runtime dependency is added to any other package. The notifier implementation
lives in `apps/worker/src/sns-escalation-notifier.ts`; the topic ARN is configured via
the new `SAFEGUARDING_SNS_TOPIC_ARN` environment variable in `packages/config/src/env.ts`
(optional; unset means the throwing default is used, matching existing behaviour).

AWS SDK v3 (`@aws-sdk/*`) follows Apache-2.0. No approval exception needed.

## Stage 132b — the development and testing sandbox

No package is added to any workspace. The sandbox adds **container base images and system packages**, used only
inside a throwaway development container and never shipped:

| Item                               | Version              | Licence              | Why                                                                                             | Replaces |
| ---------------------------------- | -------------------- | -------------------- | ----------------------------------------------------------------------------------------------- | -------- |
| `node` (Docker image)              | `22-bookworm-slim`   | MIT                  | The toolbox base; matches `engines.node` (>=22).                                                | —        |
| `pnpm` (via corepack)              | `10.33.0`            | MIT                  | The package manager `package.json` pins.                                                        | —        |
| `postgresql-client` (apt)          | Debian bookworm (16) | PostgreSQL           | `psql` for `sandbox psql` and `sandbox verify`.                                                 | —        |
| `curl` (apt)                       | Debian bookworm      | curl (MIT-style)     | Health and readiness checks.                                                                    | —        |
| `openssl`, `ca-certificates` (apt) | Debian bookworm      | Apache-2.0 / MPL-2.0 | TLS for corepack's download.                                                                    | —        |
| `rsync` (apt)                      | Debian bookworm      | **GPL-3.0-or-later** | Copies the read-only repository mount into the work volume, deleting files removed on the host. | —        |

**Approved 2026-11-12 by the owner (rule 9): `rsync`, GPL-3.0.** It is run as a standalone command inside a disposable
container: not linked into anything, not part of any image the platform ships, and no code of ours is derived
from it. If that is not acceptable, the alternative is a `tar` copy without deletion of removed files (a stale
file could then survive between runs). The owner approved it on that basis; the `tar` alternative was not chosen. The database and Redis images are the ones
`compose.dev.yml` already records.

## Overrides added 2026-11-24: `effect` and `vite`

Two more root `overrides` / `pnpm.overrides` entries (kept identical, as `packages/config/test/workspace-install-compat.spec.ts`
requires). Neither is a new dependency of this repository; each pins a transitive package.

| Override | Pinned to | Licence | Why                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | Replaces                                 |
| -------- | --------- | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------- |
| `effect` | `3.22.5`  | MIT     | GHSA-7589-6fvf-x4pw (high, ReDoS in `Schema.TemplateLiteral`'s compiled regex), versions `<=3.22.0`, patched in `>=3.22.1`. Reached only through `packages/db → @prisma/client → prisma → @prisma/config → effect`; `@prisma/config` pins `effect` to an exact `3.20.0`, so an override is the only remediation without a Prisma release. `effect` is Prisma's own config-loading tooling and is never imported by this codebase. `prisma generate` and the db unit tier were re-run against it. | `effect` `3.20.0` (transitive)           |
| `vite`   | `7.3.6`   | MIT     | **Not a security pin.** `vitest` declares `vite` as a peer. pnpm follows `pnpm-lock.yaml` (`7.3.6`); npm resolves the highest match, `8.x`, whose new optional `@vitejs/devtools` peer pulls `@vitejs/devtools-vitest`, which peers back on `vitest@*`. arborist cannot resolve that cycle and `npm install` aborts with `Cannot read properties of null (reading 'edgesOut')` (OQ-049's CI job). Pinning to the lockfile version removes the cycle. No version moves under pnpm.                | `vite` peer range (`^6 \|\| ^7 \|\| ^8`) |

A guard test (`workspace-install-compat.spec.ts`) fails if the `vite` override stops matching the one version `pnpm-lock.yaml`
resolves. When `vite` is bumped on purpose, change the override and the lockfile together.
