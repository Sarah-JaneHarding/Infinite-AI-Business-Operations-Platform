# Document Studio: load every document, sign and ratify as founder, print, save as chosen type, AI suggestions

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every business-operations and ecosystem document is in the Document Studio, can be reviewed, edited, saved in a chosen file type, printed, countersigned and ratified by the founder and CEO alone, and the studio offers AI suggestions whose Refresh button always returns new ones.

**Architecture:** Reuse what exists: the Library tab and `ExportBar` (file types, print), the Review Board in `src/core/platform.ts` (approve, countersign, ratify, ingest, solo mode), the warehouse `Store`, and the Model Hub in `src/server/models/hub.ts`. Add (1) a deterministic, idempotent loader for the three document sets, (2) a promotion step that puts a library document on the Review Board as an artefact, (3) honest studio counters, save-in-chosen-format and notices, (4) a document-suggestions endpoint and panel with refresh that cannot repeat itself.

**Tech Stack:** TypeScript (strict), React 19 + Vite, Express, Vitest, existing `docx` and `exceljs`. No new dependency is expected; if one is needed, stop and report.

**Spec:** none separate. The requirements are the owner's message of 2026-11-26 ("Load all three, and go ahead") and the findings in the ops-repo survey: `docs/REVIEW_BOARD.md` (solo signing), `docs/MODEL_HUB.md`, `docs/PR_POLICY.md`.

## Global Constraints

- Every code change is a draft PR; nothing is pushed to `main`; no agent merges or approves (`docs/PR_POLICY.md`). About 400 changed lines per PR excluding generated files, lockfiles and copied documents. Conventional Commits.
- Stacked branches, each based on the previous: `ccr-doc-studio-1-load`, `-2-review`, `-3-studio`, `-4-ai`. PR N targets branch N-1 (PR 1 targets `main`).
- `npm run lint` (tsc) and `npm test` must pass before each commit. Baseline: 48 files, 1450 tests passing.
- Nothing new may let an agent, a model or an `auto:` actor approve, countersign, ratify or ingest. Model output is always a draft (Model Hub rule M8).
- No learner-level data: every readable file passes the existing input gate (`checkInput`, `detectPii`); a refused file is reported, never silently dropped.
- No invented numbers: counters shown in the studio are counted from stored records.
- No secret in the repo. `.env.example` holds names with empty values only.
- A ratified artefact is final; edits start a revision (existing rule).

## Review Focus

- **Loading twice** (server restart, repeated script) creates no duplicate and never overwrites a person's later edit. Tested in Task 1.
- **A document the gate refuses or cannot make editable** (learner identifier, over `MAX_DOC_JSON`) is listed with its reason and, where allowed, stored as-is. Tested in Task 1.
- **Founder alone, too early:** countersigning your own approval inside the wait window is refused with the minutes left; after it, ratify and ingest succeed and carry the single-signer flag. Tested in Task 2.
- **A needs-review (professional) document ratified by the founder alone** shows "no professional review recorded" on screen, print and export, and cannot leave the platform. Tested in Tasks 2 and 3.
- **Refresh with a model that repeats itself, or no model key:** the next suggestions never equal the previous set; the panel says which source produced them. Tested in Task 4.

---

### Task 1: Load all three document sets (branch `ccr-doc-studio-1-load`)

**Files:**
- Create: `docs/ecosystem/` (copy of the 35 `*.md` and `*.html` files from `/home/user/infinite-ai-ecosystem/docs/`, unmodified) and `docs/ecosystem/SOURCE.md` (source repo `Sarah-JaneHarding/infinite-ai-ecosystem`, the commit it was copied from, date, "copy; the source repo is authoritative")
- Create: `src/library/seedEcosystem.ts`, `src/library/loadAll.ts`, `scripts/seed-all.ts`
- Modify: `package.json` (`"seed:all": "tsx scripts/seed-all.ts"`), `server.ts` (run `loadAll` once at boot, skipped when `OPS_SEED_ON_START=false`), `.env.example` (`OPS_SEED_ON_START=` empty), `src/ui/Library.tsx` (source filter chips with counts), `docs/BUILD_LOG.md`, `docs/OPEN_QUESTIONS.md` (mark OPQ-025 answered)
- Test: `test/ecosystem-seed.test.ts`, `test/load-all.test.ts`

**Interfaces:**
- Consumes: `Store`, `DocRecord`, `saveRecord`, `kindOf`, the readers behind `uploadFile` in `src/core/documents.ts`; `seedLibrary` (`src/library/seed.ts`); `seedPackage`, `PACKAGE_FILES` (`src/library/seedPackage.ts`).
- Produces:
  - `ECOSYSTEM_DIR = 'docs/ecosystem'`; `seedEcosystem(store: Store, files: {name: string; bytes: Uint8Array}[], by?: string, at?: string): Promise<{written: string[]; skipped: string[]; refused: {name: string; reason: string}[]}>`. Ids are deterministic: `eco_<slug of file name>`. Existing ids are skipped. Markdown and HTML become editable `Doc`s with `dept: 'ecosystem'`, `origin: 'uploaded'`; a file whose editable view exceeds `MAX_DOC_JSON` is stored as-is with the scan note "Too large to edit here; stored as supplied".
  - `loadAll(store: Store, readFile: (relativePath: string) => Uint8Array): Promise<{library: Result; businessPlan: Result; ecosystem: Result & {refused: {name: string; reason: string}[]}}>` where `Result = {written: string[]; skipped: string[]}`.
  - Library tab: `sourceOf(rec: DocRecord): 'library' | 'business-plan' | 'ecosystem' | 'other'` (exported, pure) and chips showing `All (n)`, `Library (n)`, `Business plan (n)`, `Ecosystem (n)`.

- [ ] **Step 1: Write the failing tests.** `ecosystem-seed.test.ts`: seeding the real 35 files into an in-memory `Store` yields `written.length + refused.length === 35`; a second run yields `written.length === 0` and the same `skipped` count; ids match `/^eco_[a-z0-9-]+$/`; a file containing a learner-identifier pattern (use the fixture the existing guardrail tests use) is in `refused` with a reason and not in the store; `STAGE_LOG.md` is stored with the "Too large to edit here" note and `doc` undefined; editing a stored record then re-seeding leaves the edit. `load-all.test.ts`: against the real files, library has 120 ids `lib-*`, business plan matches `PACKAGE_FILES`, `sourceOf` classifies each into exactly one source and the four counts sum to the store's document count; `loadAll` with `OPS_SEED_ON_START` unset runs once per call (no global state).
- [ ] **Step 2: Run** `npx vitest run test/ecosystem-seed.test.ts test/load-all.test.ts` → FAIL (modules missing).
- [ ] **Step 3: Implement** the files above. Reuse the reader functions `uploadFile` already uses rather than writing new parsers; if they are not exported, export them without changing behaviour.
- [ ] **Step 4: Run** `npm run lint` and `npm test` → all pass (baseline plus the new tests). Run `npx tsx scripts/seed-all.ts` against a temp data directory (set the warehouse path the way `scripts/seed-business.ts` does, or run in a temp copy of the repo) and record the written/skipped/refused counts in the report.
- [ ] **Step 5: Commit** `feat(library): load library, business plan and ecosystem documents on start`.

### Task 2: Library documents on the Review Board, founder-only signing (branch `ccr-doc-studio-2-review`)

**Files:**
- Modify: `src/core/platform.ts` (`promoteDocument`), `src/server/finality.ts` (needs-review check), `src/ui/Library.tsx` ("Send to review" button and status chip), `.env.example` (`OPS_SIGNING_MODE`, `OPS_SIGNERS`, `OPS_SOLO_WAIT_MINUTES` already documented; add a commented founder example using empty values only), `docs/REVIEW_BOARD.md` (new section "Founder-only setup"), `docs/BUILD_LOG.md`
- Test: `test/library-review.test.ts`

**Interfaces:**
- Consumes: `Platform.submitForReview`, `decide`, `countersign`, `ingest`, `artefact`, `artefacts`, `saveVersion` (`src/core/platform.ts`); `DocRecord` (`src/core/documents.ts`); `Actor`, `SINGLE_SIGNER`.
- Produces:
  - `Platform.promoteDocument(docId: string, by: Actor): Promise<Artefact>`: human actors only (agents and `auto:` refused with `RunRefused('hitl', …)`); the document must have an editable `doc`; creates a `DRAFT` artefact with `agentId: 'LIBRARY-DOC'`, `dept` from the record (default `'library'`), `engine: 'library'`, `flags` containing `'needs-review'` when the record's scan notes start with "Needs review by", `doc.meta.sourceDocId` set; idempotent per document: returns the existing non-final artefact, or the ratified one, instead of creating another; ledger action `document.promote`.
  - `artefactForDocument(docId: string): Artefact | undefined` on `Platform` (newest artefact whose `doc.meta.sourceDocId === docId`).
  - `ratifiedProblem` (finality.ts): an artefact with the `'needs-review'` flag returns `'This document is marked for professional review and none is recorded; it cannot leave the platform.'` unless a countersignature on the same hash carries a `profession`.
  - Library UI: for the selected document a **Send to review** button calls `promoteDocument` then navigates to the Studio artefacts tab for that artefact; a status chip shows Draft, In review, Approved, Ratified or Ingested from `artefactForDocument`.

- [ ] **Step 1: Write the failing tests** in `library-review.test.ts` using the platform fixtures the existing signing tests use (see `test/signing.test.ts`): promote creates a `DRAFT` with the same title and doc and `agentId 'LIBRARY-DOC'`; promoting twice returns the same artefact id; an `auto:x` actor and a non-human actor are refused; solo mode, one registered signer: submit, approve, then countersign by the same person before the wait → refused with a message containing "minute" and "left"; with `now` past the wait → status `RATIFIED`/`INGESTED` and `signing === SINGLE_SIGNER`; the `rat_<id>_v1` library record and a Brain L2 fact exist; dual mode, same person countersigns → refused; edit after ratification → refused; a needs-review document: promote sets the flag and `ratifiedProblem` is non-null after ratification, and null when a countersignature carries a profession.
- [ ] **Step 2: Run** `npx vitest run test/library-review.test.ts` → FAIL.
- [ ] **Step 3: Implement** as specified. Do not change `decide` or `countersign` semantics; the founder-only behaviour comes from configuration, which the doc section explains (`OPS_USERS`, `OPS_SIGNERS=<id>|<Display Name>|*`, `OPS_SIGNING_MODE=solo`).
- [ ] **Step 4: Run** `npm run lint` and `npm test` → pass.
- [ ] **Step 5: Commit** `feat(studio): put library documents on the review board with founder-only signing`.

### Task 3: Honest studio, save in the chosen file type, print and notices everywhere (branch `ccr-doc-studio-3-studio`)

**Files:**
- Modify: `src/ui/DocumentStudio.tsx`, `legacy/components/DocsAndRatify.tsx` (minimal edits: the 136 constant, the default counts, the fixed signer), `src/ui/ExportBar.tsx`, `src/ui/Studio.tsx` (pass the notice), `src/ui/Library.tsx`, `src/core/documents.ts` (`saveExport`, `countRatified`), `docs/BUILD_LOG.md`
- Create: `src/core/notice.ts`
- Test: `test/studio-honesty.test.ts`, `test/save-export.test.ts`

**Interfaces:**
- Consumes: `downloadDoc` and `FORMAT_LABEL` (`src/ui/primitives.tsx`), the renderers in `src/core/artefacts/render.ts`, `saveRecord`, `Platform.artefacts`, `promoteDocument` (Task 2).
- Produces:
  - `withNotice(doc: Doc, notice: string | null): Doc` (pure; prepends a `callout` block; returns the input unchanged for `null`); `NEEDS_REVIEW_NOTICE = 'No professional review recorded.'`. Print, download and save all use `withNotice` when the artefact carries `'needs-review'`, so a printout cannot hide it.
  - `saveExport(store: Store, rec: DocRecord, format: ArtefactFormat, by: string, at?: string): Promise<DocRecord>`: renders the document in `format`, stores a new record `origin: 'saved'`, `name: <slug>.<ext>`, correct `mime`/`kind`, bytes via `saveRecord`; `pdf` is refused with "PDF is produced by printing; use Print" (no silent substitute).
  - `countRatified(artefacts: readonly {status: string}[]): number` (RATIFIED or INGESTED).
  - `ExportBar` gains props `notice?: string | null` and a **Save in chosen type** button that calls `saveExport`; keeps Download and Print.
  - `DocumentStudio`: default tab is Library; `ratifiedCount` is `countRatified(p.artefacts())`; `onRatifyPolicy` no longer increments anything or writes a ledger entry: it calls `promoteDocument` for that document and navigates to the Board. `DocsAndRatify`: `totalPolicies` becomes `documents.length`, default counts `0`, signer name taken from a new optional prop `signerName` (passed from the signed-in actor), no hard-coded person.

- [ ] **Step 1: Write the failing tests.** `save-export.test.ts`: for `md`, `html`, `json`, `csv`, `docx`, `xlsx` the stored record has the matching extension and mime, non-empty bytes, `origin 'saved'`, and the original record is untouched; `pdf` refused with the message above; `withNotice` prepends exactly one callout and is idempotent when applied twice to the same doc; `notice` text appears in the HTML and Markdown exports and in the print HTML. `studio-honesty.test.ts`: `countRatified` of `[]` is 0 and counts only RATIFIED/INGESTED; the source of `DocumentStudio.tsx` and `DocsAndRatify.tsx` contains no `136`, no `useState<number>(58)` and no hard-coded signer string (read the files and assert).
- [ ] **Step 2: Run** `npx vitest run test/save-export.test.ts test/studio-honesty.test.ts` → FAIL.
- [ ] **Step 3: Implement** as specified, reusing `downloadDoc`'s rendering path so a download and a saved copy are byte-identical for the same format.
- [ ] **Step 4: Run** `npm run lint` and `npm test` → pass.
- [ ] **Step 5: Commit** `feat(studio): honest counters, save in the chosen file type, notices on print and export`.

### Task 4: AI suggestions with a Refresh that always gives new ones (branch `ccr-doc-studio-4-ai`)

**Files:**
- Create: `src/core/suggest.ts`, `src/ui/SuggestPanel.tsx`
- Modify: `src/server/models/hub.ts` (`suggestForDocument`, and `recommend` accepts round/exclude), `src/server/models/local.ts` (`getDeterministicRecommendations(agent, values, round?)` rotates wording), `src/server/modelRoutes.ts` (`POST /ai/document-suggestions`; `/ai/agent-recommendations` accepts `round` and `exclude`), `src/ui/AgentRunner.tsx` (send them on refresh), `src/ui/Library.tsx` and `src/ui/Studio.tsx` (mount the panel), `docs/MODEL_HUB.md`, `docs/BUILD_LOG.md`
- Test: `test/suggest.test.ts`, additions to `test/models-hub.test.ts`

**Interfaces:**
- Consumes: `Hub.stamp`, `Hub.execute` and the guardrails in `src/server/models/rules.ts`; `deidentify`, `detectPii`; `Doc`, `Block`.
- Produces:
  - Types: `Suggestion = {text: string; why: string}`; `InputSuggestion = {blank: string; value: string; why: string}`; `DocSuggestions = {inputs: InputSuggestion[]; prompts: Suggestion[]; round: number; generatedWith: string; draft: true; flags: string[]}`.
  - `blanksOf(doc: Doc): string[]` (every `[Fill in: …]` placeholder and every empty key/value or table cell, labelled by its key or header, in document order, de-duplicated).
  - `deterministicSuggestions(doc: Doc, round: number, exclude: readonly string[]): {inputs: InputSuggestion[]; prompts: Suggestion[]}`: rotates through fixed pools by `round`; never returns a text present in `exclude` while any unused text remains; for consecutive rounds `r` and `r+1` the returned sets are not equal.
  - `excludeSeen(items: readonly string[], seen: readonly string[]): string[]` (normalised, case-insensitive).
  - `Hub.suggestForDocument(doc: Doc, round: number, exclude: readonly string[], actor: string | null): Promise<DocSuggestions>`: de-identifies the document text first (learner data → `ModelRefused`); the prompt carries the round number and the exclusion list ("Do not repeat any of these"); drops any returned item whose normalised text is in `exclude`; if nothing is left, or no provider is ready, or the provider fails, returns `deterministicSuggestions` with `generatedWith: 'deterministic-fallback'` and flag `'refresh_fallback'` where it replaced model output. Always `draft: true`. Never writes to the document.
  - Route `POST /ai/document-suggestions` body `{doc: Doc, round?: number, exclude?: string[]}`: 400 when `doc` is missing or its JSON is over 200,000 characters; `round` integer 0 to 50; `exclude` at most 200 strings of at most 500 characters; learner data → 422 with the refusal message.
  - `SuggestPanel({doc, onApply})`: shows suggested inputs (an **Apply** button per item calls `onApply(blank, value)`, which only edits the on-screen draft; a person still saves and signs) and suggested prompts (**Copy**); a **Refresh suggestions** button increments `round`, sends every text shown so far as `exclude`, marks new items with a "New" badge, shows `generatedWith`, disables itself while loading, and shows an error line (not stale items) on failure.

- [ ] **Step 1: Write the failing tests.** `suggest.test.ts`: `blanksOf` on a fixture with two placeholders, one empty cell and a repeated placeholder returns three entries in order; for rounds 0 to 5 the deterministic sets for consecutive rounds are never deep-equal; no text in `exclude` is returned while unused pool texts remain; `excludeSeen` ignores case and surrounding space. `models-hub.test.ts` additions (use the existing fake `fetchImpl`): with a provider that returns the same JSON every call, a second call with `exclude` set to the first call's texts returns no overlap and flag `refresh_fallback`; with no provider, five successive refreshes return five distinct sets; a document containing a learner identifier is refused; the route rejects a missing `doc`, `round: 99`, and a 201-item `exclude` with 400; the result always has `draft: true`; the agent-recommendations route with `round: 1` returns different `strategicRecommendations` than `round: 0` in deterministic mode.
- [ ] **Step 2: Run** `npx vitest run test/suggest.test.ts test/models-hub.test.ts` → FAIL.
- [ ] **Step 3: Implement** as specified. Reuse the hub's existing parsing helpers (`strings`, schema checks) for the model reply.
- [ ] **Step 4: Run** `npm run lint` and `npm test` → pass. Start the dev server (`npm run dev`) with no model key and call `POST /api/ai/document-suggestions` five times with rising `round` and the previous texts as `exclude`; record that each response differs.
- [ ] **Step 5: Commit** `feat(studio): AI suggestions for inputs and prompts with a refresh that never repeats`.
