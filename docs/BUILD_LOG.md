# Build log — Operations Platform

Honest record of what was built and verified on 2026-10-24 (branch `claude/ops-platform-build`).

## Verified (run in this session)

* `npx tsc --noEmit` (strict) — clean.
* `npx vitest run` — 112 tests in 8 files pass (2026-10-25: adds server auth, validation and end-to-end suites). Original list: guardrails, ledger, Brain, gateway, platform pipeline, HITL, persistence,
  renderers, connector (parsers, GET-only client, HMAC webhook, gated publisher), calculators, and **every one of the
  48 agents run end-to-end** (clean DRAFT, no stripped static text, every declared format renders).
* `npx vite build` — succeeds.
* Browser smoke test (Chromium, against the running server): sign-in, draft from the Security department, injection
  refusal, same-person approval refused for a second-approver agent, Word/Excel/Markdown downloads, edit → new version,
  history, ledger verifies intact.

## Not verified / known limits

* **Live GitHub connector** could not be exercised against the real repo: the sandbox has no valid read token
  (requests returned 401 and the connector degraded as designed). The client is covered by tests using a stubbed fetch.
  First real run needs `GITHUB_TOKEN` (see `.env.example`).
* **Claude narrative** not exercised against the real API (no key); the client is unit-tested with a stubbed fetch. The deterministic local engine is what ran.
* **Webhook** verified only by unit test, not by a real GitHub delivery.
* **PDF** is "print to PDF" from the HTML artefact, not a server-rendered PDF.
* **Auth:** none. Approvals are against a typed name. See OPQ-002.
* The ecosystem snapshot comes from a shallow clone at `3c2511a`; commit counts are therefore not reported.
* Test pass counts for the ecosystem are deliberately not claimed; they must come from CI via the connector.

## Dependencies added (recorded per the ecosystem rule)

`vitest` (dev), `docx`, `exceljs` (artefact export), `@types/react`, `@types/react-dom` (dev, needed once `strict` was
enabled). Existing: Vite, React 19, Tailwind 4, express, tsx, lucide-react. `@google/genai` was removed when the model path moved to Claude (plain `fetch`, no SDK).

## Removed

The earlier prototype UI (`src/App.tsx`, `src/components/*`, `src/data/*`, `src/types/*`) used random and invented
telemetry, which conflicts with the no-invented-metrics rule. It remains in git history.
