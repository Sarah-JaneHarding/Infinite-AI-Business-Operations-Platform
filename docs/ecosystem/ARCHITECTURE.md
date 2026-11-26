# Architecture

## 1. The shape of the system

One brain, five modules, a pipeline that never forgets. Every agent call in the system
crosses the same layers, in the same order, and nothing is allowed to route around them.

```
L8  Experience surfaces   Teacher Studio · HoD Console · SMT Dashboard · SBST Casebook
                          Parent Portal · Learner Space · District Rollup · Prompt Builder
L7  Modules               MOD-01 Curriculum Engine (9 agents)
                          MOD-02 Support Analytics Centre (10 agents)
                          MOD-03 Data Collection & Warehouse (8 agents)
                          MOD-04 Teaching & Learning Toolbox (11 agents)
                          MOD-05 Teaching Analytics & PD Studio (8 agents)
L6  Agent runtime         Agent registry · Prompt registry · DAG orchestrator
                          Schedulers · Tool registry · Retry/fallback · ◆ Approval queue
                          Eval harness · Traces, cost, latency
L5  Guardrail & policy    Input validator · PII redactor · Curriculum fidelity
                          Template fidelity · Grounding/citation · Age & safeguarding
                          Refusal & escalation · Output schema · Rate & cost · RBAC
                          Audit-ledger writer
L4+ Learning Engine       9 agents. Signal → attribution → pattern → challenger → ◆ ratify
L4  Infinite Brain        L0 Constitution · L1 Semantic · L2 Episodic · L3 Procedural
                          L4 Working
L3  Data plane            Event log · raw lake · conformed warehouse · Learner-360
                          Feature store · vector index (HNSW) · graph · object store
                          Snapshot archive (PITR) · consent ledger
L2  Model Gateway         Self-hosted, OpenAI-compatible. Pooling, fallback, budgets, cache
L1/0 Integrations & infra SA-SAMS · DBE ATP · CAPS · Google/Teams · WhatsApp · LTI 1.3
                          OneRoster/ClassLink · screeners · SSO · per-tenant isolation
```

Everything sits inside a **POPIA governance boundary**: responsible party is the school
or SGB, operator is INFINITE-AI, tenant-isolated, ZA data residency.

## 2. The six flows

1. **Planning lifecycle** — CAPS + ATP ingest → topic graph → term plan → unit blueprint
   → lesson set + differentiation → assessment + rubric + memo → ◆ HoD approval → publish
   and version to the Brain → coverage audit.
2. **Learner data loop** — source sync → validate and conform → ◆ consent and purpose
   check → de-identify → Learner-360 → screening → tier recommendation → ◆ SBST review →
   intervention plan → monitor → report.
3. **Teacher loop** — need → brief → grounding retrieved → draft → fidelity, readability
   and accessibility checks → ◆ teacher approves → delivered → evidence captured → back
   into the Brain.
4. **PD loop** — teaching signals → practice analytics → gap detection → ◆ SMT review →
   micro-course composed → coaching cycle → CPTD logged → impact re-measured.
5. **Memory loop** — candidate fact → extract and type → contradiction resolution →
   provenance stamp → ◆ ratify if L0/L3 → commit and version → reindex → retention.
6. **Learning loop** — signal captured → diff and classify → outcome attribution →
   pattern mining → challenger proposed → offline eval vs champion → ◆ ratify promotion →
   promote to L3 → publish to commons (opt-in, k-anonymous) → decay and revalidate.

`◆` marks a human-in-the-loop gate. Rule 6: none of them can be bypassed in production.

## 3. Repository layout

```
infinite-ai/
  apps/       web/ (Next.js, all role surfaces) · worker/ (BullMQ, DAG host) · gateway/
  packages/   db · brain · agents · prompts · guardrails · orchestrator · deident
              policy · contracts · evals · design-system · telemetry · testkit · config
  infra/      docker/ (compose) · terraform/ (environments)
  docs/       this file and its siblings, plus RUNBOOKS/
  scripts/    verify-stage.ts and other gate tooling
  CLAUDE.md   condensed operating rules — read first
```

## 4. Locked technical decisions

Monorepo pnpm + Turborepo · TypeScript 5.x strict · Next.js App Router · tRPC for
first-party, REST/OpenAPI 3.1 for integrations · Tailwind + design tokens · shadcn/ui
vendored · PostgreSQL 16 with RLS · Prisma · pgvector/HNSW · graph as `brain_node` /
`brain_edge` + recursive CTEs · Redis 7 + BullMQ · in-house DAG runner · S3-compatible
storage (MinIO dev, S3 `af-south-1` prod) · Keycloak + Auth.js · self-hosted model gateway
· Langfuse · OpenTelemetry → Grafana · Promptfoo · SOPS + age, AWS Secrets Manager in prod
· Vitest, Playwright, Testcontainers, k6, fast-check · GitHub Actions → OIDC → AWS ·
Docker Compose dev, Terraform + ECS Fargate or EKS prod, region `af-south-1`.

None of these is substituted without asking.

## 5. Cross-cutting requirements

- **Tenant isolation** — every tenant-owned row carries `tenant_id`; RLS on every such
  table; no service-role query without an explicit, logged justification.
- **Data residency** — all learner data at rest in `af-south-1`. Sending de-identified
  text outside the region needs a per-tenant setting, default off, and is logged.
- **Encryption** — TLS 1.3 in transit, AES-256 at rest, application-level encryption for
  special personal information columns.
- **Audit** — append-only ledger of every read and write of learner data, every agent run,
  every approval, every prompt or exemplar promotion.
- **Least privilege** — separate database roles for app, worker, migration and
  analytics-read.
- **Reversibility** — every automated promotion is versioned and one command from
  rollback.

## 6. Build status

See `STAGE_LOG.md`. Stages are worked in order, 00 through 18, and a stage does not begin
until the previous stage's exit gate has passed.
