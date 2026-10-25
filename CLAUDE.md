# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

The company operating system for **Infinite-AI** and its SaaS product, the **Infinite-AI Education
Ecosystem** (`Sarah-JaneHarding/infinite-ai-ecosystem`). Sixteen departments, each with agents and
widgets, all wired through one Brain, one model gateway, one guardrail plane, and one hash-chained
ledger. **AI drafts. The human decides.** POPIA (South African data-protection law) compliance is a
first-class constraint, not an afterthought.

This repo is deliberately mirrored on the ecosystem product it manages — read `docs/PLATFORM_DESIGN.md`
section 1 for the correspondence table before making structural changes.

## Commands

```bash
npm install
cp .env.example.example .env   # fill in only what you need; never commit .env
npm run dev                    # vite dev server + express API, http://127.0.0.1:3000
npm run server                 # express only (tsx server.ts), no vite dev middleware
npm test                       # vitest run — unit + end-to-end agent tests
npm run lint                   # tsc --noEmit, strict
npm run build                  # vite build (production bundle to dist/)
npm run audit:ecosystem -- /path/to/infinite-ai-ecosystem   # refresh src/generated/ecosystem-snapshot.json
```

Run a single test file: `npx vitest run test/platform.test.ts`. Run by name: `npx vitest run -t "pattern"`.

The platform works with **zero API keys**: the committed ecosystem snapshot
(`src/generated/ecosystem-snapshot.json`) supplies real numbers and a deterministic local engine
(`localDraftEngine` in `src/core/gateway.ts`) drafts narrative text without calling any model.

## Architecture

### The pipeline (the only way an artefact gets produced)

Every agent run goes through `Platform.runAgent()` in `src/core/platform.ts`, in this fixed order:

1. **Gates** — tombstone (erased subject) → purpose → lawful basis (`src/core/guardrails/engine.ts`).
2. **Input guardrails** — injection detection, then a hard refusal on any learner-level identifier
   (`src/core/guardrails/pii.ts`), then de-identification. There is no bypass.
3. **Brain recall** — `brain.recall(tier, topic)` returns only ratified facts (L0 constitution, L1
   graph, L2 episodes, L3 procedures). Agents cannot read context any other way.
4. **Build** — the agent's pure `build(ctx)` function assembles a structured `Doc` from real facts
   (`ctx.facts`, sourced via `[src:key]` tags) and the human's own typed input. No model call here.
5. **Gateway narrative** — if the agent declares `narrativeFacts`, the **gateway is the only code in
   the platform that can produce model text** (`src/core/gateway.ts`). It refuses anything not
   de-identified and falls back to the deterministic local engine on any upstream failure (fail-closed,
   never fail-open to raw text).
6. **Output guardrails** — every text-bearing block is checked for unsourced numeric claims; a number
   survives only if the human typed it or it carries a `[src:...]` tag. Everything else becomes
   `[UNSOURCED]` and the artefact is flagged.
7. **Warehouse + ledger** — the artefact is saved as an immutable, versioned record
   (`artefact_versions`) and every action is appended to the hash-chained `Ledger`
   (`src/core/ledger.ts`, `ledger.verify()` checks the whole chain).
8. **HITL** — artefacts start `DRAFT`. A human calls `submitForReview` then `decide(...)`. Agents
   marked `secondApprover` refuse self-approval. There is no skip flag anywhere in this path.
9. **Learning capture** — human edits to a draft are diffed and written to Brain tier `L4` as a
   *proposal* only; nothing is auto-promoted into ratified facts.

When changing agent behaviour, guardrail logic, or the Brain/ledger/gateway, trace the effect through
this whole sequence — most bugs in this codebase are "a later guardrail stage let something through"
or "a step was skipped," not isolated logic errors.

### Departments and agents

- `src/departments/kit.ts` — `defineAgent()` is the factory every agent goes through. It assigns the
  `OPS-<DEPT>-nn` id, forces `requiresApproval: true` (literal type, cannot be relaxed), injects the
  standard "Draft for human review" callout and the human-review checklist into every document, and
  renders `Sec[]` (a small section DSL: heading, prose, bullets, table, checklist, callout, raw human
  input) into `Block[]`.
- `src/departments/d1.ts`..`d4.ts` group the 16 departments (4 per file) and their agent contracts;
  `src/departments/index.ts` flattens them into `DEPARTMENTS` and `AGENTS` and exposes `agentById` /
  `deptById`. Add a new department/agent by extending the appropriate `dN.ts` file and the array in
  `index.ts` — don't create a new top-level registry.
- `src/departments/calc.ts` holds shared calculators (e.g. RICE scoring). Calculators take typed human
  inputs and show them; per the no-invented-numbers rule they ship with **no pre-filled assumptions**.
- Each agent names a real named framework (OKRs, Stage-Gate, RACI, ISO 27001-style control mapping,
  ITIL, MEDDICC, AARRR, NRR/CAC payback, 3-statement forecast, NIST-style risk register, etc.) in its
  `framework` field — this is intentional, not decorative; keep new agents aligned to a named method.

### Core (`src/core/`)

| File | Role |
| --- | --- |
| `platform.ts` | Orchestrator — the pipeline above; `Artefact` type; `RunRefused` error |
| `agent.ts` | `AgentContract` / `RunContext` / `InputField` shapes |
| `brain.ts` | Infinite Brain L0–L4, append-only, supersede-never-overwrite |
| `gateway.ts` | The only path to a model; `localDraftEngine` (deterministic, offline) and `remoteEngine` (calls `server.ts`, never holds the key client-side) |
| `ledger.ts` | Hash-chained audit/consent log; `verify()` checks the chain |
| `warehouse.ts` | Pluggable storage (`MemoryAdapter` for tests, browser storage, or `FileStore`); collections are append-only JSON records, "latest per id" is a query, not a mutation |
| `guardrails/pii.ts` | `deidentify()`, learner-identifier hard refusal (`LearnerDataRefused`) |
| `guardrails/injection.ts` | Prompt-injection pattern detection |
| `guardrails/claims.ts` | Unsourced-numeral detection/stripping |
| `guardrails/engine.ts` | Gate order: tombstone → purpose → lawful basis |
| `artefacts/render.ts` | Renders the canonical `Doc` structure to md, html (printable to PDF), csv, json, docx, xlsx |
| `serverAdapter.ts` | Server-side warehouse wiring used by `server.ts` |

### Connector (`src/connector/`, wired in `server.ts`)

Read-only by default against `Sarah-JaneHarding/infinite-ai-ecosystem`: `github.ts` (GET-only REST
client + `liveFacts`), `webhook.ts` (HMAC-verified push/PR/workflow events), `snapshot.ts`/`parse.ts`
(parsing the committed snapshot and ecosystem docs). The **only write** is `proposals.ts` —
`ProposalPublisher.openIssue()`, gated behind `OPS_ALLOW_ECOSYSTEM_WRITES` (default `false`) and a
human-approved artefact; it never pushes to `main` and never touches tenant data. Connector results are
written into the Brain with provenance `repo@sha` so any number shown in the UI is traceable to a
specific commit.

### Server (`server.ts`)

Single express app: raw-body HMAC webhook route *before* the JSON body parser, an `x-ops-token` guard
on `/api/*` if `OPS_API_TOKEN` is set, the Gemini gateway proxy (`/api/gateway/gemini`, refuses PII or
injection patterns before calling out, holds the only API key), connector status/events/publish routes,
and warehouse read/write/export routes. In dev it mounts Vite in middleware mode; in production it
serves `dist/` as static files with an SPA fallback.

### UI (`src/ui/`)

`store.tsx` holds the client-side `Platform` instance and app state; `Studio.tsx` is the artefact
preview/edit/export surface; `Widgets.tsx` renders department widgets (stats, trackers) bound to real
warehouse data — **no synthetic/random telemetry** (an earlier prototype UI using invented numbers was
deliberately removed; see `docs/BUILD_LOG.md` "Removed"); `AgentRunner.tsx` drives the input → run →
draft flow; `Views.tsx` composes department/agent navigation; `primitives.tsx` holds shared UI atoms.

## Invariants (unbreakable; each has a test)

1. No personal/learner information reaches a model; the gateway hard-refuses non-de-identified
   provenance, and learner identifiers are refused outright regardless of de-identification.
2. Purpose limitation: an agent may only run for a purpose in its own `allowedPurposes`.
3. Ledger and Brain are append-only; corrections supersede, erasure is a tombstone (audit fact kept,
   content dropped) — never a delete.
4. Every output is a `DRAFT`; only a named human approves; agents with `secondApprover: true` refuse
   approval by the original requester.
5. No invented numbers: any numeral not sourced via `[src:...]` or typed by the human becomes
   `[UNSOURCED]` and flags the run.
6. The connector reads with GET only; its single write path is a human-approved GitHub issue, off by
   default (`OPS_ALLOW_ECOSYSTEM_WRITES=false`).
7. Everything is scoped by `orgId` (default `infinite-ai`) — multi-tenant from day one.

Tests in `test/` map directly to these: `guardrails.test.ts`, `platform.test.ts` (full pipeline +
ledger verification), `connector.test.ts`, `departments.test.ts` (runs all 48 agents end-to-end),
`calc.test.ts`.

## Working on this repo

- `docs/PLATFORM_DESIGN.md` is the authoritative design doc — read it before changing pipeline order,
  gate order, or the ecosystem/ops mirroring.
- `docs/OPEN_QUESTIONS.md` lists decisions that need a human (credentials, auth/SSO, outbound channels,
  payments, agent-count reconciliation, PDF rendering, warehouse backing store). Don't silently resolve
  one of these in code — add to or update this file instead, in the same stop-and-ask style the linked
  ecosystem repo uses for its own open questions.
- `docs/BUILD_LOG.md` is an honest record of what has actually been verified (tests run, browser smoke
  test) versus what is stubbed/untested (live connector against the real repo, Gemini narrative, real
  webhook delivery, server-rendered PDF, auth). Keep it accurate when you add or verify something new —
  don't claim a check ran if it didn't.
- When adding a department agent, go through `defineAgent()` in `src/departments/kit.ts` rather than
  constructing an `AgentContract` by hand, so the standard review checklist/callout and the
  `requiresApproval` literal stay intact.
- `.env.example.example` documents every environment variable the server reads (`GITHUB_TOKEN`,
  `ECOSYSTEM_REPO`, `GITHUB_WEBHOOK_SECRET`, `OPS_ALLOW_ECOSYSTEM_WRITES`, `GEMINI_API_KEY`,
  `GEMINI_MODEL`, `OPS_API_TOKEN`, `HOST`, `PORT`). Copy it to `.env`, which is gitignored.
