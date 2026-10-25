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
3. Ledger and Brain are append-only; erasure is a tombstone.
4. Every output is a DRAFT; only a named human approves; some agents need a second person.
5. No invented numbers: unsourced figures become `[UNSOURCED]`.
6. The connector reads with GET only; its single write is a human-approved GitHub issue, off by default.
7. Everything is scoped by org id.
