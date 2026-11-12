# Infinite-AI Operations Platform

The company operating system for **Infinite-AI** and its SaaS product, the **Infinite-AI Education Ecosystem**
(`Sarah-JaneHarding/infinite-ai-ecosystem`). Sixteen departments, each with agents and widgets, all wired through one
Brain, one gateway, one guardrail plane and one hash-chained ledger. **AI drafts. The human decides.** POPIA first.

## Run

```bash
npm install
cp .env.example .env     # fill in only what you need; never commit .env
npm run dev              # http://127.0.0.1:3000  (server + UI, loopback only)
npm test                 # unit + end-to-end agent tests
npm run lint             # strict TypeScript
npm run audit:ecosystem -- /path/to/infinite-ai-ecosystem   # refresh src/generated/ecosystem-snapshot.json
```

### Autonomous agents

Agents can run on schedules and events under standing orders (proposed by one person, activated by another). They only produce drafts, tested automatically, that go to the board. Off by default: `docs/AUTONOMY.md`.

### Review board

Output is a draft until a reviewer approves it, a different person countersigns it, and it is ratified and ingested. See `docs/REVIEW_BOARD.md`.

### AI models

Connect and configure models in the **Model Hub** (sidebar). Setup, rules and troubleshooting: `docs/MODEL_HUB.md`. Every model
call passes the same non-bypassable rules, is audited, and returns a draft; a provider can't be used until a named person
attests it.

### Docker

```bash
docker build --target test .        # lint + tests inside the build
docker compose up -d --build        # http://127.0.0.1:3000, loopback only; put secrets in .env
```

Set `OPS_USERS` in `.env` (see `.env.example`) to require a token per person; without it the server runs in open dev mode
(loopback only, identity self-declared, publishing disabled). SSO is still an open question (OPQ-002). Audit and fixes:
`docs/AUDIT_2026-10-24.md`.

Without any keys it still works: the committed ecosystem snapshot is used and a deterministic local engine drafts.

## What is in it

| Area | Where |
| ---- | ----- |
| Design and invariants | `docs/PLATFORM_DESIGN.md` |
| Guardrails (PII, learner refusal, injection, claim sourcing, gates) | `src/core/guardrails/` |
| Infinite Brain L0–L4, gateway, ledger, warehouse, orchestrator | `src/core/` |
| Artefact renderers: md, html, pdf (print), csv, json, docx, xlsx | `src/core/artefacts/render.ts` |
| 16 departments, 48 agents, widgets | `src/departments/` |
| Ecosystem connector (read-only GitHub, webhook, gated issue) | `src/connector/`, `server.ts` |
| Open decisions | `docs/OPEN_QUESTIONS.md` |
| What is verified and what is not | `docs/BUILD_LOG.md` |

## Rules this code enforces

1. No personal information reaches a model; learner identifiers are refused outright.
2. Purpose limitation: gate order erased-subject → purpose → lawful basis.
3. Ledger and Brain are append-only; erasure is a tombstone, raised in the UI by one person and approved by a different one.
4. Every output is a DRAFT; only a named human approves; some agents need a second person.
5. No invented numbers: unsourced figures become `[UNSOURCED]`.
6. The connector reads with GET only; its single write is a human-approved GitHub issue, off by default.
7. Everything is scoped by org id.

## Agent contracts

Every agent is a machine-checked contract (owner, purpose, data ceiling, allowed providers, budget, evaluation, no approval bypass). The server refuses to start if a built-in breaks one, and the model hub enforces the purpose and provider limits. See `docs/AGENT_CONTRACTS.md`; the register is under **Agent Contracts** in the app.

## Security and compliance

Hardening headers and a strict CSP, request and bad-token limits, and an opt-in `officer` role (`OPS_ROLES`) are in `src/server/security.ts`. `docs/COMPLIANCE_MAP.md` maps the controls to POPIA's conditions and lists the gaps honestly; it is not a compliance claim. `docs/OPQ_RECOMMENDATIONS.md` recommends an answer to each open question.
