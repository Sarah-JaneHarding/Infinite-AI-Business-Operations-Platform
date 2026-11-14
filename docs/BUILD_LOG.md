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
