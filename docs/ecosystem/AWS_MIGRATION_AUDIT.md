# AWS Migration Audit & Cost Estimate

**Region:** `af-south-1` (Cape Town) — POPIA data-residency requirement  
**Date:** 2026-09-09  
**Exchange rate:** R18.50 / USD

---

## Repository Audit Summary

| Metric              | Value                                   |
| ------------------- | --------------------------------------- |
| Applications        | 3 (apps/web, apps/worker, apps/gateway) |
| Packages            | 28                                      |
| Source files        | 1,197                                   |
| Architecture layers | 9 (L0–L8)                               |
| Modules             | 5 (MOD-01 through MOD-05)               |
| Stages complete     | 15+ of 19                               |

### Architecture → AWS mapping

| Layer | Description                                        | AWS service                      |
| ----- | -------------------------------------------------- | -------------------------------- |
| L8    | apps/web — Next.js App Router, 6 role-scoped UIs   | ECS Fargate + CloudFront + ALB   |
| L7    | MOD-01…MOD-05 — all five product modules           | Within ECS tasks                 |
| L6    | apps/worker — BullMQ, DAG orchestrator, HITL gates | ECS Fargate + ElastiCache        |
| L5    | Guardrails, RBAC, consent, de-identification       | In-process (no separate service) |
| L4    | Infinite Brain — 5 memory tiers, append-only       | RDS PostgreSQL + pgvector + S3   |
| L3    | Data plane — Prisma + RLS, tenant-scoped client    | RDS PostgreSQL 16 Multi-AZ       |
| L2    | apps/gateway — sole path to Anthropic              | ECS Fargate (private subnet)     |
| L1    | Langfuse LLM observability + ClickHouse            | ECS Fargate + EC2 + S3           |
| L0    | Keycloak OIDC, school connectors                   | ECS Fargate + Secrets Manager    |

---

## AWS Services Required

### Compute

| Service                      | Purpose                                                                    | Cost model      |
| ---------------------------- | -------------------------------------------------------------------------- | --------------- |
| **ECS Fargate**              | apps/web, apps/worker, apps/gateway, Keycloak, Langfuse web/worker         | Shared baseline |
| **EC2 t4g.large**            | ClickHouse (Langfuse analytics — cannot Fargate-ize)                       | Shared baseline |
| **Application Auto Scaling** | Scale Fargate on CPU/memory; critical for school-day peak 07:00–15:00 SAST | Free            |

### Database

| Service                       | Purpose                                                                          | Config                                        |
| ----------------------------- | -------------------------------------------------------------------------------- | --------------------------------------------- |
| **RDS PostgreSQL 16**         | App DB: tenants, consent ledger, Brain, audit_event. pgvector, pg_trgm, pgcrypto | Multi-AZ, db.t4g.medium → r6g.large at Growth |
| **RDS PostgreSQL (Langfuse)** | Langfuse internal DB — separated by design                                       | db.t4g.small, Multi-AZ                        |
| **ElastiCache Redis 7**       | BullMQ queues, rate limiting, idempotency keys. Two clusters: app + Langfuse     | cache.t4g.small, Multi-AZ                     |

### Storage

| Service             | Purpose                                                             | Notes                     |
| ------------------- | ------------------------------------------------------------------- | ------------------------- |
| **S3 (af-south-1)** | Brain snapshots, artefacts, uploads, exports. Replaces MinIO in dev | SSE-KMS required (POPIA)  |
| **EBS gp3**         | ClickHouse data volumes                                             | 200 GB pilot → 2 TB scale |
| **ECR**             | Docker images — immutable tags (commit SHA), 20-image lifecycle     | Scan on push              |

### Networking

| Service            | Purpose                                                     | Cost note         |
| ------------------ | ----------------------------------------------------------- | ----------------- |
| **VPC**            | Private/public subnets, 2 AZs. Flow logs enabled            | Required          |
| **ALB**            | HTTPS termination, WAF attachment point, path-based routing | ~$25/month        |
| **NAT Gateway ×2** | Outbound internet for private subnets (one per AZ for HA)   | ~$100/month fixed |
| **Route 53**       | DNS for SaaS domain + school subdomains                     | $0.50/zone/month  |
| **CloudFront**     | CDN for Next.js static assets                               | Reduces ALB load  |
| **VPC Endpoints**  | S3 gateway (free) + Secrets Manager/ECR interface endpoints | Reduces NAT cost  |

### Security & Identity

| Service             | Purpose                                                            | Obligation                   |
| ------------------- | ------------------------------------------------------------------ | ---------------------------- |
| **WAF**             | OWASP top-10, rate limiting, SQLi/XSS rules on ALB                 | POPIA / STRIDE               |
| **Shield Standard** | DDoS protection on ALB and CloudFront                              | Free, mandatory              |
| **Secrets Manager** | All credentials. RDS master password auto-rotated                  | Rule 7 of 11                 |
| **ACM**             | TLS certificates for ALB and CloudFront                            | Free                         |
| **KMS**             | Encryption CMKs for RDS, S3, Secrets Manager                       | POPIA                        |
| **IAM**             | ECS task roles + GitHub OIDC federation. No long-lived access keys | Required                     |
| **GuardDuty**       | Threat detection on CloudTrail / VPC flow logs / DNS               | Required for children's data |

### Observability

| Service        | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| **CloudWatch** | Container logs (all services), metrics, alarms, dashboards               |
| **CloudTrail** | AWS API audit log. Mandatory for POPIA compliance trail                  |
| **AWS Config** | Encryption-at-rest and public-S3 compliance rules (defer to Growth tier) |

> LLM observability (traces, datasets, evals) is handled by self-hosted **Langfuse** via OTel OTLP. CloudWatch is for infrastructure only.

### CI/CD

| Service               | Purpose                                                                    |
| --------------------- | -------------------------------------------------------------------------- |
| **S3 + DynamoDB**     | Terraform state backend (one per environment)                              |
| **IAM OIDC Provider** | GitHub Actions token exchange. STS short-lived credentials, no stored keys |

### Email & Messaging

| Service | Purpose                                          |
| ------- | ------------------------------------------------ |
| **SES** | Invoices, guardian comms, budget alerts          |
| **SNS** | GuardDuty → on-call; CloudWatch alarms → on-call |

### Business Operations

| Service                     | Purpose                                                                 |
| --------------------------- | ----------------------------------------------------------------------- |
| **Cost Explorer + Budgets** | Tag-based cost allocation; 80% / 100% spend alerts                      |
| **AWS Backup**              | Automated RDS (14-day), ElastiCache, and EBS backups                    |
| **AWS Support — Business**  | 24/7 support, Trusted Advisor, Health Dashboard                         |
| **AWS Organizations**       | Multi-account isolation (prod / staging / dev). SCPs for POPIA controls |

---

## Infrastructure Cost Estimates (af-south-1, USD/month)

| Line item                                   | Pilot (5)   | Startup (25) | Growth (100) | Scale (500) |
| ------------------------------------------- | ----------- | ------------ | ------------ | ----------- |
| ECS Fargate — 3 apps                        | $180        | $280         | $540         | $1,180      |
| ECS Fargate — Keycloak + Langfuse           | $90         | $110         | $150         | $220        |
| EC2 ClickHouse + EBS                        | $100        | $120         | $200         | $420        |
| RDS PostgreSQL 16 Multi-AZ (app)            | $110        | $140         | $220         | $390        |
| RDS PostgreSQL Multi-AZ (Langfuse)          | $55         | $65          | $90          | $160        |
| ElastiCache Redis Multi-AZ (app + Langfuse) | $60         | $75          | $120         | $230        |
| ALB + WAF                                   | $28         | $32          | $45          | $80         |
| NAT Gateway ×2                              | $100        | $105         | $115         | $145        |
| CloudFront                                  | $12         | $18          | $45          | $130        |
| Secrets Manager + KMS                       | $20         | $25          | $32          | $50         |
| GuardDuty + CloudWatch + CloudTrail         | $30         | $40          | $75          | $160        |
| Route 53 + ECR + SNS + misc                 | $12         | $18          | $28          | $55         |
| S3 (baseline + school artefacts)            | $16         | $30          | $78          | $263        |
| AWS Backup                                  | $10         | $12          | $18          | $35         |
| **Total infra (USD)**                       | **$823**    | **$1,070**   | **$1,756**   | **$3,518**  |
| **Total infra (ZAR @ R18.50)**              | **R15,226** | **R19,795**  | **R32,486**  | **R65,083** |
| **Infra per school (ZAR)**                  | **R3,045**  | **R792**     | **R325**     | **R130**    |

### Total monthly OpEx including LLM

Anthropic LLM cost: **R3.20 per learner per month** (8 artefacts × avg R0.40/artefact, with prompt caching). Average learners per school: ~300.

|                       | Pilot (5)   | Startup (25) | Growth (100) | Scale (500)  |
| --------------------- | ----------- | ------------ | ------------ | ------------ |
| AWS infra (ZAR)       | R15,226     | R19,795      | R32,486      | R65,083      |
| AWS Support           | R1,850      | R2,274       | R4,137       | R9,935       |
| Anthropic LLM         | R4,800      | R24,000      | R112,000     | R560,000     |
| Platform tooling      | R2,082      | R2,082       | R2,500       | R4,000       |
| Security & compliance | R8,729      | R8,729       | R10,000      | R15,000      |
| **Total OpEx (ZAR)**  | **R32,687** | **R56,880**  | **R161,123** | **R654,018** |
| **OpEx per school**   | **R6,537**  | **R2,275**   | **R1,611**   | **R1,308**   |

---

## Business Operations Costs (monthly, at 25 schools)

| Item                                       | Cost (ZAR)  |
| ------------------------------------------ | ----------- |
| GitHub Teams (5 devs)                      | R1,480      |
| GitHub Actions extra minutes               | R560        |
| WhatsApp Business API (guardian comms)     | R740        |
| SES transactional email                    | R93         |
| PagerDuty on-call (2 persons)              | R1,554      |
| Annual POPIA compliance review (amortised) | R4,167      |
| Annual penetration test (amortised)        | R2,083      |
| Domain & DNS                               | R23         |
| **Total business operations**              | **R10,700** |

---

## Per-School Economics & Gross Margin

### School price (ex VAT) — per-school formula (OQ-043, provisional)

Monthly price = R300 platform fee + R75 per educator + R4.00 per learner (first 500) + R1.50 per
learner above 500; minimum R750. See `COST_MODEL.md` for the full rules.

| Reference school              | Price / month | Annual / school |
| ----------------------------- | ------------- | --------------- |
| 120 learners / 8 educators    | R1,380        | R16,560         |
| 400 learners / 16 educators   | R3,100        | R37,200         |
| 1,500 learners / 55 educators | R7,925        | R95,100         |

VAT (15%) adds R207 / R465 / R1,188.75 per month respectively.

> The gross-margin table below was computed on the retired R1,200 / R3,500 / R8,500 card and is
> kept for the COGS figures only. Re-derive revenue from the table above before quoting margins.

### Gross margin by scale

Mix assumption: 50% Professional, 35% Starter, 15% Enterprise.

| Scale                | Monthly revenue | Monthly COGS | Gross profit | Gross margin |
| -------------------- | --------------- | ------------ | ------------ | ------------ |
| Pilot (5 schools)    | R17,225         | R32,687      | –R15,462     | –90%         |
| Startup (25 schools) | R86,125         | R56,880      | R29,245      | 34%          |
| Growth (100 schools) | R344,500        | R161,123     | R183,377     | 53%          |
| Scale (500 schools)  | R1,722,500      | R654,018     | R1,068,482   | 62%          |

**Break-even:** approximately 12 schools on Professional tier only, or 16 schools at the realistic mixed tier.

> The pilot is intentionally loss-making. The shared baseline (Multi-AZ RDS, dual NAT Gateways, Langfuse stack) is sized for 25+ schools. Pilot objective is product-market fit, not margin.

---

## Migration Steps (Dev → AWS)

1. **AWS Organizations setup** — create three member accounts (dev, staging, production). Apply SCPs: deny non-af-south-1 resources, deny public S3 ACLs.
2. **Terraform state bootstrap** — manually create S3 bucket + DynamoDB table per account for remote state.
3. **GitHub OIDC federation** — `terraform apply` to register the IAM OIDC provider and deploy role.
4. **Full `terraform apply` — production** — VPC, RDS, ElastiCache, ECS cluster, ALB, ECR, Secrets Manager, KMS, CloudTrail, GuardDuty. ~15 minutes.
5. **Bootstrap DB roles** — run `./bootstrap-roles.sh production` via VPN. Reads passwords from Secrets Manager, never writes to disk.
6. **Prisma migrations** — CI runs `db:migrate:deploy` with the `migrator` role. Seed curriculum data.
7. **Build + push images** — GitHub Actions builds and pushes to ECR with immutable commit-SHA tags.
8. **Deploy ECS services** — rolling deployment, 100% minimum healthy, 120s grace period.
9. **Provision Keycloak** — `--import-realm` from infra/keycloak/realm.json.
10. **First school tenant** — run provisioning job, validate with `pnpm test:rls:exhaustive` against live DB.
11. **Load test** — `pnpm load:peak` from af-south-1. Target: P99 < 2s page load, P99 < 8s artefact generation.

---

## POPIA Compliance — AWS Controls

| Obligation            | AWS control                                             | Status                       |
| --------------------- | ------------------------------------------------------- | ---------------------------- |
| Data residency        | Provider locked to af-south-1; SCP denies other regions | ✅ Implemented               |
| Encryption at rest    | RDS SSE-KMS, S3 SSE-KMS, EBS KMS                        | ✅ Implemented               |
| Encryption in transit | TLS 1.3 on ALB, RDS SSL required, Redis TLS             | ✅ Implemented               |
| Audit trail           | CloudTrail (all API calls) + app audit_event ledger     | ✅ Implemented               |
| Least privilege       | IAM task roles + 4 Postgres roles + RBAC                | ✅ Implemented               |
| Breach notification   | GuardDuty → SNS + CloudTrail forensics                  | ⚠ Runbook needed             |
| Retention & deletion  | S3 lifecycle, RDS TTL, app tombstone path               | ⚠ Per-school schedule needed |

---

## Priority Recommendations

1. **VPC Interface Endpoints immediately** — S3 gateway (free) + Secrets Manager/ECR endpoints (~$14/month each) reduce NAT Gateway charges from day one.
2. **Reserved Instances at month 2** — 1-year no-upfront for RDS and ElastiCache saves ~30%.
3. **Tag everything with `School` from day one** — feeds billing reconciliation and per-tenant cost attribution.
4. **Anthropic volume commitment at 50 schools** — ~R48K/month LLM spend warrants a discount conversation.
5. **ClickHouse cluster before 200 schools** — single-node has no HA; Langfuse traces are POPIA compliance evidence.
6. **School-hours auto-scaling** — scale in aggressively 18:00–06:00 SAST and weekends; saves ~20% on compute.

---

_Figures are estimates. Validate with the AWS Pricing Calculator before committing budgets. See also docs/COST_MODEL.md for per-artefact LLM cost breakdown and the financial model at docs/financial-model.html._
