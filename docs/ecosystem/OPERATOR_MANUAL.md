# Operator Manual

Platform administration guide for INFINITE-AI. Audience: platform engineers and the
operations team. For school-side administrators see `ONBOARDING_GUIDE.md`.

---

## Architecture overview

```
L8 apps/web           Role-scoped UIs (Next.js, port 3000)
L7 modules            MOD-01…MOD-05 product features
L6 agent runtime      packages/{agents,orchestrator,prompts} — DAGs, human gates
L5 guardrail plane    packages/{guardrails,policy,deident}
L4 Infinite Brain     packages/brain — five memory tiers, append-only
L3 data plane         packages/db — Prisma + RLS, tenant-scoped client
L2 model gateway      apps/gateway — the ONLY path to a provider
L0/L1 integrations    school systems, ratified policy sources
```

Data flows **up** through the layers. Each layer is a chokepoint; the layer above cannot
bypass it.

---

## Environment variables

All variables are validated at boot by `packages/config/src/env.ts` using Zod. A missing
or malformed variable causes `EnvironmentValidationError` and the process exits 1.

| Variable              | Required | Description                                    |
| --------------------- | -------- | ---------------------------------------------- |
| `DATABASE_URL`        | yes      | Prisma connection string (postgres://app_rw:…) |
| `DIRECT_DATABASE_URL` | yes      | Direct (non-pooled) URL for migrations         |
| `REDIS_URL`           | yes      | BullMQ queue and cache                         |
| `GATEWAY_API_KEY`     | yes      | Model gateway internal auth                    |
| `NODE_ENV`            | yes      | `production` \| `development` \| `test`        |
| `REGION`              | yes      | `af-south-1` (default) \| `eu-west-1`          |
| `LOG_LEVEL`           | no       | `info` (default), `debug`, `warn`, `error`     |

Feature flags can be overridden without a code deploy by setting:

```
FLAG_PILOT_SCHOOL_ONBOARDING_WIZARD=true
FLAG_BILLING_DUNNING_EMAILS=true
```

Run `pnpm check:flags` after adding an override to confirm the flag has not expired.

---

## Database roles

Four roles, each with least privilege (see `infra/docker/initdb/02-roles.sh`):

| Role           | Privileges                    | Used by                      |
| -------------- | ----------------------------- | ---------------------------- |
| `migrator`     | DDL, owns schema              | Prisma migrations, CI deploy |
| `app_rw`       | DML only, RLS enforced        | Web app and workers          |
| `worker_rw`    | DML only, RLS enforced        | BullMQ workers               |
| `analytics_ro` | SELECT on de-identified views | Analytics queries            |

**Never grant BYPASSRLS or SUPERUSER to `app_rw` or `worker_rw`.** That would silently
defeat every tenant-isolation policy.

---

## Tenant management

### Provisioning a new tenant

1. Create the tenant row with status `ACTIVE` through the admin API.
2. The provisioning wizard (7 steps) tracks onboarding progress in `provisioning_record`.
3. Readiness score must reach 100 before the tenant can go live.

### Lifecycle transitions

```
ACTIVE → SUSPENDED  (billing OVERDUE or admin action)
ACTIVE → CLOSED     (POPIA deletion or voluntary)
SUSPENDED → ACTIVE  (payment cleared)
SUSPENDED → CLOSED  (escalation or POPIA deletion)
```

`CLOSED` is terminal. The tenant row is retained; mutable data is erased on closure.
Audit and consent ledgers are retained under legal-obligation basis (see OQ-022).

### POPIA erasure procedure

When a school submits a right-to-erasure request:

1. Confirm the request is authenticated and in-scope.
2. Run the erasure job (see `RUNBOOKS/popia-erasure.md` — to be written before GA).
3. The job: marks tenant CLOSED, deletes mutable data in FK order, leaves
   `audit_event`, `consent_record`, and `tenant_metering_event` intact (legal retention).
4. Record the erasure in the audit ledger before the tenant row is marked CLOSED.
5. Notify the data subject within 30 days (POPIA §23).

---

## Monitoring and alerting

### Key metrics

| Metric               | Threshold        | Runbook                            |
| -------------------- | ---------------- | ---------------------------------- |
| Gateway p99 latency  | > 5 s            | `RUNBOOKS/gateway-latency.md`      |
| Gateway error rate   | > 1 % over 5 min | `RUNBOOKS/gateway-errors.md`       |
| RLS policy violation | any              | immediate page — security incident |
| Dunning transitions  | unexpected       | `RUNBOOKS/billing-dunning.md`      |
| Brain write failures | any              | `RUNBOOKS/brain-write.md`          |

### SLOs (production targets)

| SLO                                       | Target         |
| ----------------------------------------- | -------------- |
| Web UI availability                       | 99.5 % monthly |
| Gateway availability                      | 99.9 % monthly |
| Gateway p95 latency (artefact generation) | < 8 s          |
| Data plane read p99                       | < 100 ms       |

SLO burn budget: 0.5 % per month for web UI, 0.1 % for gateway. When burn exceeds
50 % of the budget within a 1-hour window, the canary rollback fires automatically
(see `RUNBOOKS/canary-deploy.md`).

### Log locations

| Component      | Log stream                                   |
| -------------- | -------------------------------------------- |
| `apps/gateway` | `infinite-ai/gateway`                        |
| `apps/web`     | `infinite-ai/web`                            |
| Worker jobs    | `infinite-ai/workers`                        |
| Database       | Postgres `log_min_duration_statement = 1000` |

PII scrubbing is applied before logs leave the process (`packages/telemetry`). SA ID
numbers, emails, phone numbers, and payment-card patterns are redacted automatically.

---

## Deployments

### Normal deploy

```bash
pnpm --filter @infinite-ai/db db:migrate:deploy   # migrations first
pnpm build                                          # then application
# deploy to your hosting platform
```

### Canary deploy

See `RUNBOOKS/canary-deploy.md`. Canary weight starts at 5 %; advances to 25 %, 50 %,
100 % on 15-minute checkpoints if SLO error budget is not burning. Automatic rollback
fires if error rate exceeds 1 % or p95 latency exceeds 10 s for two consecutive minutes.

### Rollback

```bash
git revert <sha>              # create a revert commit
git push origin main          # triggers the deploy pipeline
# verify rollback with pnpm verify:stage 18
```

A rollback to a previous migration is a destructive operation — see CLAUDE.md rule 10.

---

## Scaling

### Horizontal scaling

`apps/web` and `apps/gateway` are stateless; scale with replicas. The model gateway is
the bottleneck at peak: monitor `gateway.completion.tokens_per_second` and scale gateway
replicas before web replicas.

### Database connection pooling

Use PgBouncer in transaction mode in front of Postgres. Set `DIRECT_DATABASE_URL` to
bypass the pooler for migrations. `app_rw` pool size: `(2 × CPU cores) + 1`.

### Redis

BullMQ uses Redis for queue state. Use Redis Cluster or a managed Redis service with
AOF persistence. Eviction policy: `noeviction` (queue state must not be lost).

---

## Security operations

### Supply-chain audit

Run weekly:

```bash
pnpm audit:supply-chain
```

Output: `docs/sbom.json` (SPDX SBOM), `pnpm audit` findings, exact-pinning violations.

### Secrets rotation

1. Rotate the database role passwords (see `infra/docker/initdb/02-roles.sh` for names).
2. Rotate `GATEWAY_API_KEY`.
3. Redeploy with the new secrets — no restart without a deploy.

### Incident response

See `INCIDENT_PROCESS.md` for the full on-call process. For a security incident: page the
on-call engineer, escalate to the security lead within 30 minutes, and open an incident
record in `docs/RUNBOOKS/` before any remediation action.
