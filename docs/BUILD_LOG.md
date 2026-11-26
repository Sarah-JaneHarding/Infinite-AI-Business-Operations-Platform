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

## 2026-11-11: library, builders, assistants, integrations
- All 100 catalogue agents built.
- Document library: upload any format (Word, Excel, Markdown, CSV, JSON, HTML, text read and editable; PDF, images and others stored as-is with an honest "cannot preview or scan" note). Learner data and prompt injection refused. 5 MB limit, stored in 120k-character chunks.
- Export bar on every document: choose Word, PDF (print), Markdown, CSV, JSON, HTML or Excel; download, print, or save a copy to the library.
- 25 editable templates (12 business, 13 customer). Blanks marked "[Fill in: …]"; no invented figures; legal-weight ones carry a "needs review" note.
- Builders (agent, widget, artefact template) store plain data in `custom_defs`. Calculator formulas use a small parser, never eval. Custom agents always need a second approver.
- Department assistants are rule-based (no language model). Chat text is not stored.
- Integrations page with honest states; outbound send of APPROVED artefacts to allowlisted https hosts (SSRF guarded, off unless OPS_OUTBOUND_ALLOWLIST is set).
- Not built: SSO (OPQ-002), email/WhatsApp (OPQ-003), payments (OPQ-004), live Google/Microsoft connectors.
- Known and unchanged: `src/components/*` still imports missing `src/data/*`, so `vite build` fails and `tsc` reports 65 errors, all in those files. The new UI is in `src/ui/*` and adds none. UI was type-checked and bundles with esbuild but was not exercised in a browser.

## 2026-11-13: document library (120 documents)
- `src/library` holds 120 business and customer documents as canonical Docs: customer contracts (MSA, order form, DPA, SLA, pilot, AUP, terms of use, NDA, partner, variation, cancellation, data return and erasure certificate), privacy and POPIA (notices, consent, data subject requests, breach SOP and notices, PAIA manual outline, impact assessment, retention, AI use, learner data, complaints, safeguarding outline), finance (tax invoice, credit note, statement, expense claim, PO, requisition, month-end and collections SOPs, VAT checklist), sales and marketing, customer success and support, people, security, product and engineering, procurement and government.
- 22 are native spreadsheets built with exceljs, with live formulas, validation lists and totals. The school quote calculator reads its rates from `SCHOOL_PRICING`, so there is one place to change a price.
- They join `TEMPLATES`, so the Library, Builders and department assistants see them with no UI change.
- `npm run build:library` writes `library/<dept>/<id>.{docx,html,md,json[,xlsx]}`, `library/manifest.json` (sha256 per file) and `library/README.md`. A test fails if the manifest and files disagree.
- `npm run seed:library` saves each document into the warehouse as a `documents` record (origin `template`) with its editable .docx or .xlsx as `document_chunks`. It skips ids already stored, so a second run writes nothing and a person's edit is never overwritten.
- Same rules as the quick templates: every blank is "[Fill in: …]", no rand amounts or personal data in document text, every document that carries legal weight names its reviewer. The safeguarding outline invents no reporting steps.
- Not done: PDF originals (print the HTML); the seed is a script, not run on server start (OPQ-025).

## 2026-11-13: brand alignment
- `src/brand.ts` is the single brand source. Logo, tagline, address, phone and email now appear in the app sidebar, favicon and share tags, every library HTML and Word document (header and footer), and a new Brand Kit screen.
- `public/brand-kit/` holds guidelines (HTML, PDF), editable letterhead (docx, PDF), email signatures with install guide, and design tokens. The full asset kit (social banners for LinkedIn, Facebook, YouTube, X, Instagram, slides, web, print, icons) is shipped as a separate zip.
- `test/brand.test.ts` checks exact values, every library document, the docx footer, assets and kit files.
- Limits: founder photo is 360 px; CMYK values are approximate; registration and VAT numbers pending.

## 2026-11-14: AI Studio install failure
- "Dependency installation failed" came from the tracked `bun.lock`, which still listed `@google/genai` (removed from `package.json` when the model path moved to Claude). A frozen bun install rejected it. Regenerated `bun.lock` (79 lines removed, nothing added); `bun install --frozen-lockfile`, `npm ci`, `npm install` and the build all pass on a clean copy. `package-lock.json` remains the lockfile CI and Docker use.

## 2026-11-14: Phase 0, signer registry and solo mode
Built:
- Signing core (`src/core/signing.ts`): signer registry, professions, `single-signer` marker, solo wait, two-person rules.
- Contracts: `twoPerson` and `professionalReview` fields and check C11; default mapping (OPS-LEG-01 to 05 attorney; OPS-SEC-01 and OPS-PPL-04 two-person).
- Server enforcement (`src/server/validate.ts`, `finality.ts`): registry scope, re-authentication header `x-ops-reauth`, server-timed wait from the `hitl.approved` ledger entry, marker checks.
- Server wiring (`src/server/signing.ts`): `OPS_SIGNERS`, `OPS_SIGNING_MODE`, `OPS_SOLO_WAIT_MINUTES`; `/api/whoami` reports `signing`, `signer` and own `profession`.
- UI: solo banner, token prompt for re-authentication, single-signer badge on the Board.
- `GET /api/signing/report`: single-signer ratifications for later second review.
- Docs and policy: `docs/REVIEW_BOARD.md` section, `docs/PR_POLICY.md`, `.github/CODEOWNERS`, OPQ-017/019 notes, OPQ-032 resolved, OPQ-033 raised, design doc corrections (IONOS, no prices, no registration numbers yet), `test/docs.test.ts`.

Tests: `npx vitest run`: 37 files, 1212 tests passed (before the final review fixes).

Final review fixes (2026-11-14): blank signing keys mean unset; solo allows registered professionals beside one non-professional signer; one contract resolver (`contractFor`) for built-in and custom agents in the Board, Studio, board gate and Platform; actionable lost-ledger-entry text; `signingCtx` shared by both server write paths; docs corrected. Tests: `npx vitest run`: 37 files, 1231 tests passed.

Not verified / known limits:
- The solo countersign success path is not driven end to end with a real wait; it is covered at validator level with an injected clock.
- Registration numbers are free text and unverified.
- The second signer and the professionals are not registered (OPQ-033), so two-person and professional artefacts stay approved and unratified.
- With `OPS_SIGNERS` unset, behaviour is as before except that `professionalReview` agents (OPS-LEG-01 to 05) can never be ratified and `twoPerson` agents need a second person, in every mode. Legal artefacts approved but not countersigned stay approved until an attorney is registered; legal artefacts ratified before this change lack `profession` on the countersignature and will not pass the outbound gate without a revision through the board.
- The ledger names the professional and their profession, not their registration text (kept in the registry).
- Re-authentication is token re-entry (the token the browser already holds), proof of a deliberate act, not a second factor.
- After deploying, reload open tabs: an older bundle writes approvals without `version`, and that approval then cannot pass the outbound gate.
- The Board countdown is computed at render, not live.
- `withReauth` sets the header module-wide for the duration of one countersign call.
- Signing and profession markers must now match exactly on re-appended rows.
- `hitl.approved` ledger entries written before this change have no version, so a solo self-countersign for an artefact approved earlier needs a re-approval.
- `|` and `;` cannot appear in a registration.
- An empty or blank `OPS_SIGNERS`, `OPS_SIGNING_MODE` or `OPS_SOLO_WAIT_MINUTES` means unset (no registry, dual, 10 minutes), so `cp .env.example .env` starts the server. (Corrected in the final review fix: an empty mode or wait used to stop the server.)
- Solo needs exactly one non-professional signer; any number of registered professionals may sit beside them (final review fix).
- The single-signer report trusts stored fields that write-time validation enforces.
- The `server.js` bundle was not regenerated.
- The Dependabot `uuid` alert via exceljs (GHSA-w5hq-g745-h8pq) is handled by an npm override, see the 2026-11-15 entry below; it needs the owner's review.

## 2026-11-14: CEO Command Centre and v1.4 alignment
- New first screen, `CEO Command Centre`: 16 department lights, one consolidated task list with status badges, a human-flag marker, and a SAST calendar of flagged tasks. Recomputed every 30 seconds from recorded data. See `docs/CEO_COMMAND_CENTRE.md`.
- v1.4 package (HTML, Word) and library index stored in `docs/business-plan/` and seeded by `npm run seed:business`; plan figures in `src/core/ceo/plan.ts` are checked against `SCHOOL_PRICING`.
- `OPS-CEO-01` drafts an operations review with `[src:ops.*]` tags (service agent, OPQ-028).
- Connections: signed calendar feed (.ics), HMAC inbound webhook, outgoing digest. OAuth connectors not built (OPQ-027).
- Visually checked in the dark theme at 1440 px with sample data; not tested against a live multi-user server.

## 2026-11-14: outbound requests rebuilt from the allow-list (CodeQL js/request-forgery)
- `checkTarget` now builds the request URL from the operator's own allow-list host string plus a validated path, so typed text never becomes the hostname. The path is checked as typed: no `.`/`..` segments (plain or percent-encoded), no encoded or raw slashes or backslashes inside a segment, no control characters, at most 512 characters. Query and fragment are dropped (webhook keys live in the path).
- Applies to both artefact send and the CEO digest. Address checks, https-only, no redirects and the private-IP test are unchanged.
- Still open: a hostname could change its address between the check and the connection (DNS rebinding). Closing it means connecting to the checked IP; not done here.

## 2026-11-15: `uuid` override (Dependabot GHSA-w5hq-g745-h8pq)
- Alert: `uuid` below 11.1.1 has a missing buffer bounds check in `v3`, `v5` and `v6` when a `buf` argument is passed. The only copy here is `uuid@8.3.2`, pulled in by `exceljs@4.4.0` (a runtime dependency).
- Exposure: none that we can find. `exceljs` calls only `v4()` (to make an `x14Id`), and this repository's own code never imports `uuid`. The change removes the alert; it does not fix a reachable bug.
- Change: `package.json` gains `"overrides": { "uuid": "^11.1.1" }`; `package-lock.json` and `bun.lock` were regenerated. `uuid@11.1.1` is the patched release on the 11.x line and still ships CommonJS, which `exceljs` needs (`uuid` 12 and later are ESM only). Licence: MIT. No new package is added; one transitive package moves from 8.3.2 to 11.1.1.
- Not done on purpose: `npm audit fix` (it offers to downgrade `exceljs` to 3.4.0), and editing files inside `node_modules` (the patch would be lost on the next install).
- Checked: `npm audit` reports 0 vulnerabilities (was 2 moderate); `npm ls uuid` shows `uuid@11.1.1 overridden`; `bun install --frozen-lockfile` and `npm ci` both pass on a clean copy; the full test suite (41 files, 1287 tests), `tsc --noEmit` and the build pass. The Excel export tests are part of that suite.
- Open: `exceljs` itself still declares `uuid ^8.3.0`. If `exceljs` is upgraded or replaced later, remove the override and re-run `npm audit`.

## 2026-11-15: Phase 1, brand tokens
- Tokens: `src/brandTokens.ts` holds `BRAND_TOKENS` (15 colour roles, three fonts with stacks, `radius.card`), each value taken from `src/brand.ts` or copied from `src/index.css`, with a comment naming its source.
- Export: `src/brandExport.ts` and `scripts/export-brand-tokens.ts` write `brand/brand.tokens.json`, `brand/brand.tokens.css` and `brand/fonts.manifest.json`. `npm run brand:export` writes; `npm run brand:check` writes nothing and exits 1 when a file differs.
- Guards: `test/brand-tokens.test.ts`, `test/brand-export.test.ts` and `test/brand-drift.test.ts` check values against their sources and `src/index.css`, committed files against fresh output, font weights against the `index.html` link, the nine contact strings, the version recomputed from the committed JSON by the documented rule, and 16 contrast pairs at 4.5:1 or more (lowest: Neural Violet on `surfaceRaised`, 5.01).
- Docs: `docs/BRAND_TOKENS.md` (files, schema, `--iai-` variables, version rule, consumer contract for the Ecosystem), a link from `docs/BRAND.md`, a README line, and OPQ-034 to OPQ-036 in `docs/OPEN_QUESTIONS.md`. `test/docs.test.ts` checks the new docs.
- Verified: `npx vitest run` passes, 44 files and 1358 tests (baseline before this phase's docs task: 1355). Also run before the commit: `npm run lint`, `npm run build`, `npm run brand:check`.
- Not verified / known limits:
  - The Ecosystem repository is not touched. `brand:sync` and its hash test are Phase 2 and do not exist yet. Phase 2 waits on OPQ-034 and OPQ-035.
  - Fonts are not self-hosted; they load from Google Fonts.
  - `src/index.css` is checked against the tokens but is not generated from them.
  - The font-link parser in the drift test reads only the first Google Fonts link in `index.html`.
  - Existing UI, measured and not changed: white text on the `.btn.primary` background (`#0284C7`) is 4.10:1, under 4.5:1, and the input border (`--line-strong`) is 1.78:1 to 1.94:1 against the surfaces, under 3:1. Listed for the Phase 2 audit in `docs/BRAND_TOKENS.md`.
  - `fonts.manifest.json` is not covered by `version`. The generated `--iai-*` names overlap eight names in the Ecosystem's current `tokens.css`; Phase 2 must replace, not layer. See `docs/BRAND_TOKENS.md`.
  - The 4-character postcode is a substring match in the contact scan, so a future numeric token could trigger a loud false positive.
  - Cold-start flake: one unidentified test failure in the first of six full runs on the Phase 1 baseline, none in the following five. The test name was not captured. Seen and not fixed.
  - The contrast gate is a numeric check, not an accessibility audit.
  - Phase 1 commits share the branch and pull request with the `uuid` override.

## 2026-11-15: Phase 3, standing-order templates and the coverage gate
- Added `src/departments/orderTemplates.ts`: 16 templates, one per department, each a plain-data agent and trigger (13 weekly Monday, one weekly Friday and, after the Phase 3 fix wave, two by request: devops and support, whose typed inputs go stale), 1 run a day, no prices or figures. Also exports `templatesFor`, `uncovered` (departments with no template) and `gatedAgents` (templates naming a `twoPerson`, `professionalReview` or unknown agent).
- Audit: all 16 picked agents exist, are `internal` data class, and are not gated; none needed swapping. Gated agents in the repo are OPS-SEC-01, OPS-LEG-01 to OPS-LEG-05 and OPS-PPL-04.
- Gate: `test/order-templates.test.ts` (8 tests) checks coverage, department membership, `parseProposal` admission on a neutral fixture, no gated agents, unique ids, names and no prices, and a passing dry run for every template; the failure paths call `uncovered` and `gatedAgents` with bad lists.
- Docs: "Standing-order templates" in `docs/AGENT_CATALOGUE.md`, "Templates" in `docs/AUTONOMY.md`.
- Limit: no monthly trigger exists, so the month-end close template is weekly.


## 2026-11-15: Phase 3, the task type, its parsing and its ordering
- Added `src/server/autonomy/tasks.ts`: the `Task` type and statuses, `TASK_EXPIRY_MS` (7 days), `MAX_QUEUED_PER_ORDER` (10), `parseEnqueue` and `compareTasks`. Pure; no service or storage yet.
- `parseEnqueue` refuses with 400, naming the field and never repeating the value: priority not 1, 2 or 3; `due` missing, not an ISO timestamp, a date that rolls over (30 February, checked by round trip), more than 90 days ahead, or more than a day before now.
- `compareTasks` orders by priority, then earlier due, then earlier arrival, then id so the order is total.
- Moved the input loop out of `parseProposal` into an exported `parseInputs(agent, given)` in `orders.ts`, unchanged (same messages and status codes), for tasks to reuse. `tasks.ts` imports from `orders.ts`, not the reverse.
- Added `allowTaskInputs` to orders: `Proposal` carries a boolean (default false, a non-boolean is refused with 400); on a stored `StandingOrder` it is optional, absent meaning false.
- Tests: `test/autonomy-tasks.test.ts`; `allowTaskInputs` cases in `test/autonomy-schedule.test.ts`, where the `parseProposal` tests live.
- Limit: `parseEnqueue` checks only that `inputs` is an object; the values are checked by `parseInputs` once the service knows the agent.

## 2026-11-15: Phase 3, the task queue in the service
- `AutonomyService` gained `enqueue`, `cancelTask`, `drain` and `tasks`; `status()` gains `queue: { queued, byDept }`. Tasks are append-only versioned rows in the server-only collection `autonomy_tasks` (latest version per id wins), added to `NEVER_MODEL_READABLE`; clients cannot write it (404).
- Ledger: `autonomy.task.queued`, `autonomy.task.cancelled`, `autonomy.task.expired`. Runs still write `autonomy.started`, `submitted`, `quarantined` and `failed`, with `taskId` in `detail`. `autonomy.order.proposed` now records `allowTaskInputs`.
- A person enqueues under an ACTIVE order only (403 no person, 404, 409 not active, 422 inputs not allowed or rejected, 429 at 10 queued). Task inputs are checked by `parseInputs` merged over the order's inputs; only the task's own keys are stored. `EnqueueRequest.inputs` is now `Record<string, unknown>` until parsed.
- `tick()` and `onEvent()` queue a task (dedupe key `schedule:<slot>` or `event:<kind>`) and then call `drain()`. A schedule slot is queued once ever; an event is skipped while one with the same key is queued, and the existing cooldown still applies. `runNow` is unchanged: immediate, no task.
- `drain()` runs inside the existing `exclusive` chain. It fails any task found RUNNING (a restart), cancels queued tasks of an order that is no longer ACTIVE, expires tasks 7 days after their due time, and runs ready tasks most urgent first. A task held back only by a budget stays QUEUED; failed and quarantined runs are final. The run code was split into `startRun` (checks) and `runLocked` (runs) so drain can call it without re-entering the chain.
- Pausing or revoking an order cancels its queued tasks with the reason.
- Tests: `test/autonomy-queue.test.ts` (21); `autonomy_tasks` added to `test/models-rules.test.ts` and `test/server.test.ts`.
- Limits: the queue is not yet exposed over HTTP or the UI (later tasks). `service.ts` stays one file (about 360 lines).

## 2026-11-15: Phase 3, the task queue over HTTP
- `src/server/autonomyRoutes.ts`: `GET /api/autonomy/tasks?dept=&status=` returns `{ tasks }`; `POST /api/autonomy/tasks` (`orderId`, `priority`, `due`, `inputs?`) returns the `Task`; `POST /api/autonomy/tasks/:id/cancel` (`reason`) returns the `Task`. All sit behind the `/api` auth, use the existing `wrap` error handler, and add no role requirement (any signed-in person; OPQ-037; superseded by the 2026-11-16 entry below: `POST /api/autonomy/tasks` now needs the officer role when `OPS_ROLES` is set). In open dev mode the two POST routes get 403 from the service; the GET list does not refuse there (corrected in the Phase 3 documentation entry).
- An unknown or repeated `dept` or `status` query value is a 400 naming the field, never an empty list. No new timer: the minute `tick()` still drains.
- Tests (`test/server.test.ts`, "task queue"): enqueue, list by department, cancel; the response has exactly the keys of `Task` (`inputs` only when the order allows them and a person gave them); 401 without a token, 403 in open dev mode, an `auto:` token cannot enqueue; a draft produced from a queued task is `auto:<order>`-named, in review and unapproved, and the runner actor cannot countersign or ratify it (403).

## 2026-11-15: Phase 3, templates and the task queue on the Autonomous Agents screen
- `src/ui/autonomyView.ts`: `templateToForm` (a template's agent, name, trigger and runs, and an always-empty inputs map: templates pre-select, they never pre-fill) and `groupTasksByDept` (queue order within a department, empty departments omitted, an unknown department kept under its own id). Task is imported as a type only; the UI keeps its own copy of the comparator and a test holds it equal to the server's `compareTasks`. Tests: `test/autonomy-view.test.ts`.
- `src/ui/Autonomy.tsx`: a "Use a template" picker (department, then template) that fills the proposal form and leaves the agent's inputs empty; an "Allow task inputs" checkbox (off by default, sent as `allowTaskInputs`); each order shows whether tasks may carry inputs; a "Task queue" card grouped by department with an enqueue form (ACTIVE orders only, priority 1 to 3, due date and time, optional inputs when the order allows them) and a Cancel button with a 5 to 300 character reason on each queued task. Server refusals show in the existing banner.
- Checked in a browser at 390px and 1280px: propose from a template, activate as a second person, enqueue, cancel. No new colours, classes or dependencies.

## 2026-11-15: Phase 3, documentation and exit gate
- Docs: new "The task queue" section in `docs/AUTONOMY.md` (what a task is, what queues one, the order tasks run in, `allowTaskInputs`, the limit of 10 queued tasks per order, the due window, expiry after 7 days, final failures, cancellation on pause or revoke, restart recovery, the three routes, and that "Run now" does not use the queue); the weekly-only trigger limit is stated there and in "Templates". "What this does not do" now says fixed inputs hold for schedule and event tasks, with the one opt-in exception. `docs/AGENT_CATALOGUE.md` carries the coverage finding: all 100 registered agents across the 16 departments were already eligible, so no new agents were needed. One line in `docs/REVIEW_BOARD.md` (queued drafts take the same path) and one in `README.md`.
- Open questions added: OPQ-037 (who may queue and cancel tasks; any signed-in person today; recommendation: officers queue, anyone cancels) and OPQ-038 (a task with its own inputs on an order that allows it; built as opt-in per order, off by default; recommendation: keep as built; owner decision).
- Correction: the routes entry above said open dev mode gets 403. That is true of the two POST routes only. `GET /api/autonomy/tasks` has no signed-in-person check and does not refuse there. The entry now says so.
- The new collection `autonomy_tasks` is server-only and never model-readable.
- Tests: `test/docs.test.ts` gains 9 tests. The template agent ids, the queue limit and the expiry days are read from `ORDER_TEMPLATES`, `MAX_QUEUED_PER_ORDER` and `TASK_EXPIRY_MS`, so the docs cannot drift from the code.
- Exit gate: `npm test` 48 files, 1443 tests, all passing; `npx tsc --noEmit` clean; `npm run build` passes (the rewritten `server.js` was reverted, not committed); `npm run brand:check` reports the tokens are up to date.
- Phase 3 done when: every department has an eligible template (`test/order-templates.test.ts`) and the runner tests pass (`test/autonomy-queue.test.ts`).

## 2026-11-16: officers queue tasks, anyone cancels (OPQ-037); OPQ-036 decision recorded
- `server.ts`: `app.post('/api/autonomy/tasks', requireRole(roles, 'officer'))`, placed beside the activation guard and before the autonomy router is mounted. With `OPS_ROLES` set, a non-officer gets 403 and nothing is stored; cancelling a task and reading the list stay open to everyone signed in. With `OPS_ROLES` unset nothing changes: any signed-in person may queue, as with activation (OPQ-015, OPQ-019). `requireRole` is unchanged; no new role or environment variable.
- UI: unchanged. The screen does not know the signed-in person's role, so a non-officer sees the server's 403 in the existing banner.
- Tests: `test/server.test.ts` (roles set: 403 for a non-officer and nothing stored, an officer queues, a non-officer cancels and reads the list); `test/docs.test.ts` asserts the new wording in "The task queue" and the resolved OPQ rows.
- Docs: `docs/AUTONOMY.md` (task queue section and routes), OPQ-037 and OPQ-036 marked resolved in `docs/OPEN_QUESTIONS.md`, `docs/BRAND_TOKENS.md` names the scheduled check as the chosen approach, built in Phase 2 (blocked on OPQ-034 and OPQ-035). No code for OPQ-036 yet.

## 2026-11-26: every document set is loaded into the Document Studio
- `docs/ecosystem/`: a copy of the 35 top-level `*.md` and `*.html` files of `Sarah-JaneHarding/infinite-ai-ecosystem` at commit `f44d95c755f9e4159d028248d7e5b29e6e6ffc54`, unmodified, with `SOURCE.md` saying so. The source repository is authoritative.
- `src/library/seedEcosystem.ts`: `seedEcosystem` saves each file as an editable `Doc` (dept `ecosystem`, origin `uploaded`) with the original as chunks. Ids are `eco_<slug of file name>`, so a second run writes nothing and a later edit is never overwritten. Every file goes through the existing `importFile` gate; a refused file is reported with its reason and never stored. A file whose editable view is over `MAX_DOC_JSON` is stored as supplied with the note "Too large to edit here; stored as supplied".
- `src/library/loadAll.ts`: `loadAll(store, readFile)` runs `seedLibrary`, `seedPackage` and `seedEcosystem` and returns each result. It holds no state. `scripts/seed-all.ts` (`npm run seed:all`, optional first argument: a warehouse directory) runs it against the file store.
- `server.ts` calls `loadAll` once before listening. A failure is logged with `console.error` and does not stop the server. `OPS_SEED_ON_START=false` skips it (name added to `.env.example`, empty). OPQ-025 and OPQ-031 are marked answered.
- Library tab: `sourceOf` (pure, `src/library/sourceOf.ts`) puts every record in `library` (`lib-` ids), `ecosystem` (`eco_` ids), `business-plan` (the `PACKAGE_FILES` ids) or `other`; the tab shows All, Library, Business plan and Ecosystem chips with counts.
- Finding: 3 of the 35 ecosystem files are refused by the input gate: `STAGE_LOG.md` and `INCIDENT_PROCESS.md` (they describe bypass attempts and the `SKIP_APPROVAL` flag, which the injection rules match) and `ONBOARDING_GUIDE.md` (it contains learner-identifier-shaped text). The gate was not changed. They are listed in the seed output and the test; a person decides whether to load them by another route.
- Tests: `test/ecosystem-seed.test.ts` (7), `test/load-all.test.ts` (5).
