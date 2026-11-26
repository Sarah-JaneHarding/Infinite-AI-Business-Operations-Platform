# Security

## 1. Security model in one page

The platform holds children's personal information. The controls below are architectural,
not configurable: there is no environment variable, feature flag or support override that
turns any of them off.

| Control          | Where it lives                                                                                                                                             | Proven by                                                        |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- |
| Tenant isolation | `tenant_id` on every tenant-owned row; Postgres RLS with `FORCE ROW LEVEL SECURITY`; a tenant-scoped client that is the only exported database entry point | Exhaustive RLS suite (Stage 01, re-run on every change)          |
| Authentication   | Keycloak OIDC, short-lived sessions, server-side refresh, MFA for `admin`, `smt`, `sbst_chair`, `platform_*` (configured; see §7)                          | Stage 02 auth suite                                              |
| Authorisation    | A declarative permission matrix — resource × action × role × scope — behind a single `authorize()` call                                                    | Generated authorisation-matrix test over every role × permission |
| Audit            | Append-only, hash-chained ledger written through an INSERT-only database role                                                                              | Hash-chain verification test + tamper-detection job              |
| PII egress       | The De-identification Service plus a mandatory PII guard on the only path to the Model Gateway                                                             | Fuzz + red-team suites; a test asserting no second path exists   |
| Model egress     | One self-hosted gateway; no provider SDK outside `apps/gateway`                                                                                            | ESLint rule + repo-wide test                                     |
| Human gates      | Approval record must exist before a guarded transition commits                                                                                             | Bypass test attempting every known vector                        |
| Secrets          | SOPS + age for config, AWS Secrets Manager in production; nothing in the repository                                                                        | Secret scanning in CI and over git history                       |

## 2. Trust boundaries

```
Browser → Web App (apps/web) → Worker (apps/worker) → Model Gateway (apps/gateway)
                                                      → Provider (external)
Web App / Worker → Database (Postgres + RLS)
Worker → Object Storage (Brain snapshots)
Connectors (L0/L1) → Raw Landing Zone (raw_ingest_record)
Tenant data → Infinite Brain (L2–L4)
Tenant → School Commons (shared ratified policy sources)
```

Each boundary receives a STRIDE pass below with mitigations mapped to named tests.

## 3. Threat model (STRIDE per trust boundary)

Completed in Stage 16.

### 3.1 Browser → Web App

| Threat                             | STRIDE | Mitigation                                                                                                           | Test                                                                                           |
| ---------------------------------- | ------ | -------------------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| XSS via rendered agent output      | T      | CSP with per-request nonce (`proxy.ts` + `buildCsp()`); `isOutputSafe()` in `packages/security/src/agent-surface.ts` | `test:security` (headers, agent-surface tests); `apps/web` `proxy.spec.ts` (real request path) |
| XSS via reflected input            | T      | React's JSX escaping; no `dangerouslySetInnerHTML` in production code                                                | ESLint rule (no `dangerouslySetInnerHTML`); code review                                        |
| Clickjacking                       | T      | `X-Frame-Options: DENY` + `frame-ancestors 'none'` in CSP                                                            | `test:security` (headers.spec.ts)                                                              |
| CSRF on state-changing requests    | T/E    | Double-submit cookie pattern (`generateCsrfToken`, `validateCsrfToken`); `SameSite=Strict`                           | `test:security` (csrf.spec.ts)                                                                 |
| Session fixation                   | E      | Session ID regenerated on login (Auth.js/Keycloak)                                                                   | Stage 02 auth suite                                                                            |
| Cookie theft                       | I      | `Secure`, `HttpOnly`, `SameSite=Strict` on session cookie                                                            | `test:security` (cookie flag assertions)                                                       |
| Brute force / credential stuffing  | D      | Keycloak brute-force protection + account lockout                                                                    | Keycloak configuration; Stage 02 suite                                                         |
| Mixed content downgrade            | T      | `Strict-Transport-Security` + `upgrade-insecure-requests` in CSP                                                     | `test:security` (headers.spec.ts)                                                              |
| MIME-type confusion                | T      | `X-Content-Type-Options: nosniff`                                                                                    | `test:security` (headers.spec.ts)                                                              |
| Prompt injection via uploaded file | T/E    | File-type verification by content (magic bytes) not extension; content sanitisation before agent injection           | `test:injection` (guardrails suite)                                                            |

### 3.2 Web App → Worker (internal service-to-service)

| Threat                              | STRIDE | Mitigation                                                                          | Test                                              |
| ----------------------------------- | ------ | ----------------------------------------------------------------------------------- | ------------------------------------------------- |
| Unauthorised job submission         | E      | Worker accepts jobs only from the orchestrator queue; no public HTTP surface        | Architecture constraint; no public port on worker |
| Job payload tampering               | T      | Zod schema validation on every job payload at dequeue time                          | `packages/orchestrator` unit tests                |
| SSRF via job parameters             | T      | No HTTP fetch in job handlers; tool allow-lists per agent (`AGENT_TOOL_ALLOWLISTS`) | `test:security` (agent-surface.spec.ts)           |
| Privilege escalation via agent tool | E      | Tool allow-lists enforced before agent turn; `isToolAllowed()` check                | `test:security` (agent-surface.spec.ts)           |

### 3.3 Worker / Web App → Database

| Threat                        | STRIDE | Mitigation                                                                                       | Test                                              |
| ----------------------------- | ------ | ------------------------------------------------------------------------------------------------ | ------------------------------------------------- |
| Cross-tenant data access      | I/E    | Postgres RLS with `FORCE ROW LEVEL SECURITY`; `withTenant()` is the only client entry point      | `test:rls:exhaustive` + `rls.integration.spec.ts` |
| SQL injection                 | T      | Prisma parameterised queries; raw SQL uses tagged template literals (never string concatenation) | ESLint `no-sql-injection` rule; code review       |
| Context-less background query | I      | `withTenant()` throws on missing context; worker always provides context                         | `test:rls:exhaustive` (worker-role tests)         |
| Append-only ledger tampering  | T      | `app_forbid_mutation()` trigger on `audit_event`, `consent_record`, Brain tables                 | `test:rls:exhaustive` (append-only tests)         |
| Credential leak in logs       | I      | PII scrubber in `log-scrub.ts` applied before every log sink                                     | `test:log-scrubbing`                              |

### 3.4 Worker → Model Gateway

| Threat                                 | STRIDE | Mitigation                                                                                                  | Test                                                  |
| -------------------------------------- | ------ | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------- |
| PII entering a prompt                  | I      | De-identification Service + PII guard (`assertEgressAllowed`); `deidentified: true` provenance required     | `test:injection`; PII guard fuzz suite                |
| Prompt injection via retrieved content | T/E    | Retrieved Brain content treated as data (not instruction); system prompt nonce; `isOutputSafe()` validation | `test:injection`; agent-surface tests                 |
| Model provider impersonation           | S/T    | TLS verification required; provider credentials rotated; no client-controlled provider selection            | Gateway adapter tests; chaos suite                    |
| Cost exhaustion                        | D      | Per-tenant token budget enforced before routing; `checkQuota()` gate                                        | `test:security` (quota.spec.ts); gateway budget tests |
| Noisy-neighbour throughput starvation  | D      | Per-tenant rate limiting (`checkRateLimit()`); sliding-window counter                                       | `test:security` (rate-limit.spec.ts)                  |

### 3.5 Gateway → External Provider

| Threat                           | STRIDE | Mitigation                                                                   | Test                                              |
| -------------------------------- | ------ | ---------------------------------------------------------------------------- | ------------------------------------------------- |
| API key leak                     | I      | Keys in AWS Secrets Manager; rotated quarterly; never in logs (PII scrubber) | Secret scanning CI job                            |
| Provider outage / unavailability | D      | Automatic failover across providers; circuit breaker                         | Gateway chaos suite; `provider-outage.md` runbook |
| Response manipulation            | T      | Response validated against Zod schema; malformed responses rejected          | Gateway unit tests                                |

### 3.6 Connectors → Raw Landing Zone

| Threat                                 | STRIDE | Mitigation                                                                           | Test                                |
| -------------------------------------- | ------ | ------------------------------------------------------------------------------------ | ----------------------------------- |
| Malicious data injection via connector | T      | Zod validation + size limits at ingest boundary; connector credentials school-scoped | `packages/warehouse` unit tests     |
| Connector credential theft             | I      | Credentials stored in AWS Secrets Manager; scoped to one school's source system      | Supply-chain audit; secret scanning |
| Cross-tenant data bleed via connector  | I      | Each connector bound to one `tenant_id`; RLS applies to all warehouse tables         | `test:rls:exhaustive`               |

### 3.7 Tenant → School Commons (shared policy sources)

| Threat                         | STRIDE | Mitigation                                                                   | Test                                      |
| ------------------------------ | ------ | ---------------------------------------------------------------------------- | ----------------------------------------- |
| Policy document tampering      | T      | Policy sources are ratified (append-only Brain entries) and hash-locked      | Brain integrity tests; audit-chain verify |
| Fabricated curriculum guidance | T/S    | Purpose limitation prevents tenant A's L0 from influencing tenant B's agents | RLS suite; policy access tests            |

## 4. The permanent safety suite

Runs on **every** change regardless of what changed (Part 4 §4.3). If any of these fails,
nothing merges, and there is no override:

1. Cross-tenant leakage (exhaustive, table-driven)
2. PII egress attempts through every agent
3. Prompt injection via retrieved documents, user input and uploaded files
4. Diagnosis and clinical-language refusal
5. Safeguarding escalation drill
6. HITL bypass attempts
7. Authorisation matrix
8. Log and trace scrubbing

## 5. Coverage thresholds for safety-critical packages

`packages/policy`, `packages/deident`, `packages/guardrails` and `packages/db` (tenant
client and RLS) hold line coverage ≥ 95%. Mutation testing runs against them before
Stage 16; every surviving mutant is justified in writing.

## 6. Input hardening (Stage 16 step 2)

Every system boundary applies:

- **Zod schema validation** — all request bodies are parsed through a named Zod schema
  before any logic runs. A request that fails parse is rejected with a 400 error; the
  raw input is never forwarded.
- **Size limits** — request bodies are capped at 1 MB at the gateway HTTP layer; file
  uploads are capped at 10 MB and verified by content (magic bytes), not by the
  `Content-Type` header or file extension.
- **Content-type enforcement** — every endpoint that accepts a body requires
  `Content-Type: application/json` (or `multipart/form-data` for file uploads);
  requests with wrong or missing content-type are rejected.

## 7. Identity hardening (Stage 16 step 4)

- **MFA** is required by the committed Keycloak realm for the `admin`, `smt`, `sbst_chair`,
  `platform_support` and `platform_admin` roles (OQ-036, 2026-11-11; `sbst_chair` added 2026-11-12
  because the chair's confirmation ratifies SBST minutes into the Brain). A person holding two of these
  roles is asked for a code once per role (the sub-flows are independent). `infra/keycloak/realm.json` sets the browser
  flow `browser-mfa`: password first, then a conditional one-time-code step keyed on each of those
  roles, with first-login enrolment (`CONFIGURE_TOTP`). `verifyEmail` is on. A drift test
  (`packages/policy/test/keycloak-realm-mfa.spec.ts`) fails if the file stops saying so.
  **Verified:** the configuration in this repository. **Not yet verified:** that Keycloak imports
  the flow and prompts for the code (needs one run against a live Keycloak, steps in
  `docs/OPEN_QUESTIONS.md` OQ-036), and that the production realm was created from this file.
  Until both are done, do not tell a school that MFA is enforced in production.
- **Session fixation** — Keycloak regenerates the session token on every login.
- **Session rotation** — access tokens expire in 5 minutes; refresh tokens in 30 minutes;
  the client must re-authenticate silently. A stolen short-lived token has a bounded
  blast radius.
- **Brute-force protection** — Keycloak locks an account after 5 failed attempts with
  a 15-minute cooldown.
- **Offboarding** — a staff member's `role_assignment` is tombstoned (not deleted) on
  departure; their session tokens expire at the next Keycloak sync (≤ 5 minutes); the
  audit ledger records every action they took while active.

## 8. Supply chain (Stage 16 step 7)

- All dependencies are pinned to exact versions (verified by `pnpm audit:supply-chain`).
- `pnpm-lock.yaml` is committed and verified in CI.
- `pnpm audit --prod --audit-level=high` runs in CI; any high or critical finding blocks
  the merge.
- A minimal SBOM (package list) is generated at `docs/sbom.json` on every audit run.
- Provenance attestation via GitHub Actions artifact attestation is a Stage 18 item.

## 9. Secrets handling (Stage 16 step 8)

- No secret is stored in the repository, `.env.example`, test fixtures, or seed data
  (enforced by `forbidden-patterns` CI job and `pnpm run:secret-scan`).
- Production secrets are stored in AWS Secrets Manager and rotated quarterly (API keys)
  or annually (database passwords).
- Secrets are never written to logs or traces — the PII scrubber catches patterns that
  look like credentials; the logger's `secret()` API redacts known keys at construction.
- A `gitleaks` scan runs over the full git history in CI to catch any accidental commit.

## 10. Reporting a vulnerability

Until the disclosure address is provisioned (tracked in `OPEN_QUESTIONS.md`), report to
the repository owner directly. Do not open a public issue for a security finding.
