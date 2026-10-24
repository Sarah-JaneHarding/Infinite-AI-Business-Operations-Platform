# Infinite-AI Business Operations Platform — design

Status: first full build on branch `claude/ops-platform-build`. `docs/BUILD_LOG.md` records what is verified and
what is not; `docs/OPEN_QUESTIONS.md` lists the decisions still needed.

## 1. What this is

The company operating system for Infinite-AI and its SaaS product, the Infinite-AI Education Ecosystem
(`Sarah-JaneHarding/infinite-ai-ecosystem`). It mirrors the ecosystem's own shape so one mental model
covers both:

| Ecosystem (product)                  | Ops platform (company)                                              |
| ------------------------------------ | ------------------------------------------------------------------- |
| Infinite Brain L0–L4, append-only    | `core/brain.ts` — same five tiers, supersede-never-overwrite        |
| Model gateway, only path to a model  | `core/gateway.ts` — the only code that can produce model text       |
| Guardrail plane (PII, purpose, etc.) | `core/guardrails/*` — runs before and after every gateway call      |
| Audit + consent ledgers, append-only | `core/ledger.ts` — hash-chained, verifiable                         |
| Data warehouse (MOD-03)              | `core/warehouse.ts` — every artefact, version, run and decision     |
| Agents with contracts, HITL gates    | `departments/*` — 16 departments, each with agents + widgets        |
| Learning Engine                      | `core/learning.ts` — captures human edits to drafts (no auto-promote) |

Every department is wired **through** the Brain: an agent cannot read context except via `brain.recall`,
cannot reach a model except via the gateway, cannot publish except via a human approval, and cannot skip
the ledger. There is no second path.

## 2. Invariants (unbreakable; each has a test)

1. **No personal information in a prompt.** The gateway refuses any request whose provenance is not
   `deidentified: true`, and the only way to get that stamp is to pass `deidentify()`. Learner-level
   data is *out of scope for this platform entirely*: the connector reads the repository, never a tenant
   database, and the PII guard hard-refuses learner identifiers.
2. **Purpose limitation.** Every run declares a `purpose` from a closed list; an agent may only run for
   purposes in its contract. Gate order: tombstone → purpose → lawful basis (mirrors the ecosystem).
3. **Append-only.** Ledger and Brain never update or delete. Corrections supersede; erasure is a
   tombstone that keeps the audit fact and drops the content.
4. **Human decides.** Every artefact is a `DRAFT`. Only a named human approver (not the agent, not the
   requester when the contract demands a second person) can move it to `APPROVED`. There is no skip flag.
5. **No invented numbers.** Any numeric claim in a draft must carry a source reference
   (`[src:snapshot.stages.count]`, a user-supplied input, or a warehouse record). Unsourced numerals are
   stripped to `[UNSOURCED]` and the run is flagged. Financial calculators take user inputs and show
   them; they ship with **no pre-filled assumptions**.
6. **Read-only connector by default.** The connector may read the ecosystem repo. Writing is limited to
   *proposals* (an issue body or draft-PR plan) that a human approves; it never pushes to `main`, never
   touches secrets, never reads tenant data.
7. **Tenancy.** Everything is scoped by `orgId` (default `infinite-ai`). The structure is multi-tenant
   from day one so the same platform can later run another venture.

## 3. Architecture

```
 widgets / UI  ──►  orchestrator.runAgent()
                      1 gate: tombstone → purpose → contract
                      2 input guardrails: PII → injection → deidentify
                      3 brain.recall(tier, topic)         ◄── L0 constitution / L1 graph / L2 episodes / L3 procedures
                      4 gateway.complete()                ◄── only model path (local draft engine | Gemini via server)
                      5 output guardrails: claim-sourcing, template shape, PII echo
                      6 artefact DRAFT → warehouse.put (versioned)
                      7 ledger.append (hash-chained)      ──► HITL queue ──► approve/reject (named human)
                      8 learning.capture(edits)           ──► proposals only, never auto-promoted
 connector ──► GitHub (read-only) ──► snapshot/live status ──► brain L1/L2 facts (provenance: repo@sha)
```

### Connector (ops ⇄ ecosystem)

* **Snapshot** (`scripts/audit-ecosystem.mjs`): counts from a local checkout; committed as
  `src/generated/ecosystem-snapshot.json` so the UI always shows *real* numbers, labelled with the commit.
* **Live** (`server.ts` → `/api/connector/*`): GitHub REST with a server-side token. Reads HEAD, recent
  commits, open PRs and issues, CI workflow runs, and `docs/STAGE_LOG.md` + `docs/OPEN_QUESTIONS.md`
  head. Polling plus an HMAC-verified webhook endpoint for push/PR/workflow events. Results are written to
  the Brain with provenance `repo@sha` so any dashboard number is explainable.
* **Work on the ecosystem**: agents draft *change proposals* (stage-gate plan, issue, draft PR body,
  OQ entry) following the ecosystem's own rules in `CLAUDE.md` (stage-gate, DoD, no skipped tests, OQ
  protocol). A human approves; the connector then opens an **issue** (default) or **draft PR** via the API.
  No direct commits. Without a token the proposal is downloaded instead.

### Departments (16)

Executive & Strategy · Product & Engineering · Curriculum & Pedagogy QA · AI, Brain & Evals · Security &
POPIA Compliance · Legal & Contracts · Finance · Sales & CRM · Marketing & Brand · Customer Success &
Pilots · Support & Service Desk · Government & Partnerships · People & Culture · IT, DevOps & SRE ·
Procurement & Vendors · Research, Impact & Knowledge.

Each has agents (`OPS-<DEPT>-nn`) declared to the same contract shape as ecosystem agents (id, version,
purpose, model, guardrails, budget, `requiresApproval`, evalRef, reads/writes) and widgets bound to real
data. The frameworks per department are named in `src/departments/*` and are applied as templates
(OKRs, Stage-Gate, RACI, ISO 27001-style control mapping, ITIL incident/change, MEDDICC, AARRR, NRR/CAC
payback, 3-statement forecast, NIST-style risk register, etc.).

### Outputs

Every agent declares its artefact formats. The artefact studio renders from one canonical structure
(title, sections, tables, metadata) to: Markdown, HTML (also printable to PDF), CSV, JSON, DOCX, XLSX.
Each is **previewable** (in-app), **editable** (section/table editing, new version on save),
**stored** (warehouse, versioned, hash-addressed) and **downloadable** (local file).

## 4. Data warehouse

Collections: `artefacts`, `artefact_versions`, `runs`, `approvals`, `ledger`, `brain`, `connector_events`,
`crm_*`, `okr`, `risk`, `contracts`. Storage adapter is pluggable: in-memory (tests), IndexedDB/localStorage
(browser), and a server-side JSON-lines file store (`data/warehouse/*.jsonl`, gitignored). Warehouse
exports (`.jsonl` bundle) are a download so the data is never trapped.

## 5. What is deliberately not done (see `docs/OPEN_QUESTIONS.md`)

Production auth/SSO, real payments, outbound email/WhatsApp sending, and any tenant-data access need
decisions and credentials from a human; they are stubbed as clearly-labelled interfaces that refuse to
run, never as fake successes.
