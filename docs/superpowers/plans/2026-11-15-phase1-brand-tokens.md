# Phase 1: Brand tokens, one source for Ops, the Ecosystem and the public site Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Turn the Operations Platform's brand into a generated, versioned, drift-tested token set (JSON, CSS variables, font manifest) that the Ecosystem (Phase 2) and the public site (Phase 5) can consume without copying values by hand.

**Architecture:** `src/brand.ts` stays the source for names, contact details and the six brand colours. A new `src/brandTokens.ts` adds the semantic design tokens that `src/index.css` hard-codes today (surfaces, borders, text shades, status colours), expressed in terms of `BRAND.colours` where they match. A pure module `src/brandExport.ts` builds the three output files; a script writes them to a new `brand/` folder; tests fail CI if the committed files, `BRAND`, or `src/index.css` disagree, or if a text/background pair drops below WCAG AA contrast. Nothing is changed in the Ecosystem in this phase.

**Tech Stack:** TypeScript (strict), Node `crypto` and `fs` only, Vitest. No new dependency.

**Spec:** `docs/superpowers/specs/2026-11-14-integrated-platform-design.md` section 5.5 (Brand). Phases 2 (Ecosystem re-skin) and 5 (public site) get their own plans.

## Global Constraints

- Strict TypeScript: no `any`, no `@ts-ignore`, no `console.log` (the export script may print with `process.stdout.write`). `npm run lint`, `npm test` and `npm run build` must pass.
- No new dependency. Fonts are listed in a manifest only; **no font files are added or self-hosted in this phase** (that needs a dependency record and a licence check, decided in Phase 2).
- Brand rules from `docs/BRAND.md` stay: name Infinite-AI, tagline `EDUCATE - INNOVATE - TRANSFORM`, colours Deep Space `#05070F`, Midnight `#0C1224`, Plasma Cyan `#5BC8EC`, Neural Violet `#8D6CFF`, Spark Gold `#F5B841`, Ice White `#E9F6FF`; fonts Space Grotesk, Inter, Space Mono; never learner or child images.
- The token files carry **design tokens only**: no address, phone, email, founder name or any personal or contact detail (those stay in `brand-kit/brand-tokens.json`).
- Do not invent values. Every token value is either in `BRAND.colours` / `BRAND.fonts` or is copied from `src/index.css` as it is today (the plan names each one). Anything the brand does not define is raised as an open question, not made up.
- `src/index.css` and the existing `public/brand-kit/brand-tokens.json` keep working and are not restructured; they are checked against the tokens instead.
- Generated files are deterministic: sorted keys, two-space JSON, LF line endings, one trailing newline, no timestamps.
- Draft PRs only; the owner reviews and merges. Conventional Commits, one logical change per commit.

## Review Focus

- A value changed in `BRAND` or `brandTokens.ts` without re-running `npm run brand:export`: the drift test fails and its message names the command to run.
- Windows checkouts (CRLF) or editors adding a trailing space: comparison normalises line endings, so the test is not flaky, but a real value difference still fails.
- A token value that is not a 6-digit hex colour, or a font name with characters that could break out of a CSS declaration: the export refuses to build (throws) rather than writing it.
- The version hash must not change when nothing changed (stable across machines and runs) and must change when any value changes.
- A colour edit that drops text contrast under 4.5:1 for a documented text/background pair fails a test; the threshold is never lowered to pass.
- `src/index.css` drifting from the tokens (for example `--cream` no longer equal to the background token) fails a test.
- The token files must not contain contact details or any string from `BRAND.address`, `phone`, `email` or `founder`.

---

## Task 1: Semantic brand tokens

**Files:**
- Create: `src/brandTokens.ts`, `test/brand-tokens.test.ts`

**Interfaces:**
- Consumes: `BRAND` from `src/brand.ts`.
- Produces (`src/brandTokens.ts`):
  `export type ColourRole = 'bg' | 'surface' | 'surfaceRaised' | 'border' | 'borderStrong' | 'text' | 'textSoft' | 'textMuted' | 'textSubtle' | 'primary' | 'primaryText' | 'accent' | 'highlight' | 'success' | 'danger'`
  `export interface FontToken { family: string; stack: string }`
  `export interface BrandTokens { colour: Record<ColourRole, string>; font: { display: FontToken; body: FontToken; mono: FontToken }; radius: { card: string } }`
  `export const BRAND_TOKENS: BrandTokens`
  `export const HEX = /^#[0-9A-Fa-f]{6}$/`

Values (each is already in the repo; do not change them):
`bg` = `BRAND.colours.deepSpace`; `surface` = `BRAND.colours.midnight`; `surfaceRaised` = `#0B132B` (`--card2`); `border` = `#1E293B` (`--line`); `borderStrong` = `#334155` (`--line-strong`); `text` = `#F8FAFC` (`--ink`); `textSoft` = `#E2E8F0` (the `p` colour); `textMuted` = `#CBD5E1` (`--muted`); `textSubtle` = `#94A3B8` (`--muted-soft`); `primary` = `BRAND.colours.plasmaCyan`; `primaryText` = `BRAND.colours.deepSpace`; `accent` = `BRAND.colours.neuralViolet`; `highlight` = `BRAND.colours.sparkGold`; `success` = `#34D399` (`--emerald`); `danger` = `#FB7185` (`--rose`). Fonts: families from `BRAND.fonts`, stacks exactly as `--fd`, `--fb`, `--fm` in `src/index.css`. `radius.card` = the `border-radius` of `.card` in `src/index.css` (14px).

- [ ] **Step 1: Write failing tests** in `test/brand-tokens.test.ts`:
  - every `colour` value matches `HEX`; the 15 roles listed above are exactly the keys (no more, no fewer).
  - `bg`, `surface`, `primary`, `accent`, `highlight`, `primaryText` equal the matching `BRAND.colours` values; `font.display.family === BRAND.fonts.display` and likewise body and mono.
  - each font `stack` starts with its quoted or bare family name and ends with a generic family (`sans-serif` or `monospace`).
  - source check: read `src/index.css` and assert `:root` has `--cream`, `--card`, `--card2`, `--line`, `--line-strong`, `--ink`, `--muted`, `--muted-soft`, `--violet`, `--amber`, `--emerald`, `--rose`, `--cyan`, `--fd`, `--fb`, `--fm` with the same values as the tokens (case-insensitive hex; font stacks equal after whitespace normalisation), and that `.card` has `border-radius: 14px`.
  - no token value contains `;`, `}`, `{`, `"` outside a font stack's quoted family name, or a newline.
- [ ] **Step 2: Run** `npx vitest run test/brand-tokens.test.ts`. Expected: FAIL (module missing).
- [ ] **Step 3: Implement** `src/brandTokens.ts` to the interface and values above, with a comment per value naming its source (`BRAND.colours.x` or `src/index.css --name`).
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npm run lint`.
- [ ] **Step 5: Commit** `feat(brand): semantic design tokens read from the brand source`.

## Task 2: Export module and script

**Files:**
- Create: `src/brandExport.ts`, `scripts/export-brand-tokens.ts`, `brand/brand.tokens.json`, `brand/brand.tokens.css`, `brand/fonts.manifest.json` (generated)
- Modify: `package.json` (scripts)
- Test: `test/brand-export.test.ts`

**Interfaces:**
- Consumes: `BRAND_TOKENS`, `HEX`, `BrandTokens`, `BRAND` (only `BRAND.name`).
- Produces (`src/brandExport.ts`, pure, no `fs`):
  `export interface TokenFile { schema: 1; name: string; version: string; colour: Record<string, string>; font: Record<string, { family: string; stack: string }>; radius: Record<string, string> }`
  `export function canonicalJson(value: unknown): string` (sorted keys at every level, two-space indent, LF, one trailing newline)
  `export function tokenVersion(t: BrandTokens): string` (first 16 hex characters of the SHA-256 of `canonicalJson(t)` without the `version` field)
  `export function buildTokenFile(t?: BrandTokens): TokenFile` (throws `Error` naming the role if any colour fails `HEX`, or if a font stack contains `;`, `{`, `}` or a newline)
  `export function renderCss(file: TokenFile): string` (a header comment saying generated by `npm run brand:export` and giving `version`; one `:root { ... }` block with `--iai-` variables: `--iai-bg`, `--iai-surface`, `--iai-surface-raised`, `--iai-border`, `--iai-border-strong`, `--iai-text`, `--iai-text-soft`, `--iai-text-muted`, `--iai-text-subtle`, `--iai-primary`, `--iai-primary-text`, `--iai-accent`, `--iai-highlight`, `--iai-success`, `--iai-danger`, `--iai-font-display`, `--iai-font-body`, `--iai-font-mono`, `--iai-radius-card`; kebab-case of the role names, sorted as listed)
  `export function renderFontsManifest(): string` (canonical JSON of `{ schema: 1, fonts: [{ role, family, licence: 'SIL Open Font License 1.1', source: 'Google Fonts', selfHosted: false, weights }] }` for display, body, mono; `weights` is the list of numeric weights `src/index.css` and the Board UI actually request, found by grep, or `[400, 500, 600, 700]` only if the repo never narrows them, with the choice recorded in the report)
  `export function contrastRatio(foreground: string, background: string): number` (WCAG 2.x relative-luminance formula)
- Script: `npm run brand:export` writes the three files under `brand/` (creating the folder); `npm run brand:export -- --check` writes nothing, prints which files differ, and exits 1 on any difference (0 otherwise).

- [ ] **Step 1: Write failing tests** in `test/brand-export.test.ts`:
  - `canonicalJson({ b: 1, a: { d: 2, c: 3 } })` equals `'{\n  "a": {\n    "c": 3,\n    "d": 2\n  },\n  "b": 1\n}\n'`.
  - `tokenVersion(BRAND_TOKENS)` is a 16-character hex string, equal on two calls, and different when `colour.primary` is changed to `#000000` in a copy.
  - `buildTokenFile()` returns `schema: 1`, `name: 'Infinite-AI'`, the 15 colour roles, three fonts, `radius.card` and a `version` equal to `tokenVersion(BRAND_TOKENS)`; its JSON string contains none of `BRAND.email`, `BRAND.phone`, `BRAND.address.street`, `BRAND.founder.name`.
  - `buildTokenFile` throws for a colour `'red'`, for `'#12345'`, and for a font stack containing `;`; the error message names the offending role or font.
  - `renderCss` output contains `--iai-bg: #05070F;`, `--iai-primary: #5BC8EC;`, `--iai-font-display:` with the Space Grotesk stack, begins with the generated-file comment, and contains exactly one `:root`.
  - `contrastRatio('#000000', '#FFFFFF')` is 21 (to two decimals); `contrastRatio('#FFFFFF', '#FFFFFF')` is 1; order of arguments does not matter.
  - `renderFontsManifest` lists exactly Space Grotesk, Inter and Space Mono with `selfHosted: false`.
- [ ] **Step 2: Run** `npx vitest run test/brand-export.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** `src/brandExport.ts` to the signatures; implement `scripts/export-brand-tokens.ts` (run with `tsx`, like the other scripts) and add to `package.json`: `"brand:export": "tsx scripts/export-brand-tokens.ts"`, `"brand:check": "tsx scripts/export-brand-tokens.ts --check"`. Run `npm run brand:export` and commit the three generated files.
- [ ] **Step 4: Run** `npx vitest run test/brand-export.test.ts`, then `npm run brand:check` (expect exit 0) and `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(brand): export tokens as JSON, CSS variables and a font manifest`.

## Task 3: Drift and contrast tests

**Files:**
- Create: `test/brand-drift.test.ts`

**Interfaces:**
- Consumes: `buildTokenFile`, `renderCss`, `renderFontsManifest`, `canonicalJson`, `contrastRatio` from `src/brandExport.ts`; `BRAND`; the generated files in `brand/`.

- [ ] **Step 1: Write the tests** (they should pass once Task 2 is committed; prove each can fail by mutating a copy in memory, not the repo files):
  - the committed `brand/brand.tokens.json`, `brand/brand.tokens.css` and `brand/fonts.manifest.json` equal freshly generated output after normalising `\r\n` to `\n`; the failure message is exactly `Brand tokens are out of date. Run: npm run brand:export`.
  - a mutated `BRAND_TOKENS` copy (primary changed) produces output that differs from the committed file (proves the check can fail).
  - `colour` in the JSON file includes every `BRAND.colours` value that the tokens reuse (`deepSpace`, `midnight`, `plasmaCyan`, `neuralViolet`, `sparkGold`) under the roles listed in Task 1.
  - contrast, each pair at least 4.5 (WCAG AA for normal text). Measured on the current values, so all pass today: `text` on `bg` 19.23; `textSoft` on `bg` 16.32; `textMuted` on `bg` 13.55; `textMuted` on `surface` 12.54; `textSubtle` on `surface` 7.26; `primary` on `bg` 10.46; `accent` on `bg` 5.48; `accent` on `surface` 5.07; `highlight` on `bg` 11.32; `success` on `bg` 10.47; `danger` on `bg` 7.48; `danger` on `surface` 6.92; `primaryText` on `primary` 10.46. Put the measured values in a comment. The threshold is a constant `AA_NORMAL = 4.5`; there is no allow-list and no lower fallback. If a future colour change breaks a pair the test fails and the owner decides; the test is never loosened to pass. (The implementer re-measures with `contrastRatio` and reports any pair that differs from these numbers by more than 0.05.)
  - `public/brand-kit/brand-tokens.json` colours still equal `BRAND.colours` (the existing guarantee) and its `fonts` equal the token families.
- [ ] **Step 2: Run** `npx vitest run test/brand-drift.test.ts`. Expected: PASS (RED is shown by the in-memory mutation tests, which must fail when the mutation is applied to the comparison and pass when the assertion expects the difference).
- [ ] **Step 3: Run** the full suite `npx vitest run` and `npm run lint`. Expected: PASS.
- [ ] **Step 4: Commit** `test(brand): drift and contrast gates for the exported tokens`.

## Task 4: Docs, consumer contract, open questions

**Files:**
- Create: `docs/BRAND_TOKENS.md`
- Modify: `docs/BRAND.md`, `docs/OPEN_QUESTIONS.md`, `docs/BUILD_LOG.md`, `README.md` (one line), `test/docs.test.ts`

- [ ] **Step 1: Extend `test/docs.test.ts`** (fails first): `docs/BRAND_TOKENS.md` exists and mentions `brand.tokens.json`, `brand.tokens.css`, `fonts.manifest.json`, `npm run brand:export` and `version`; `docs/BRAND.md` links to `docs/BRAND_TOKENS.md`; the open-questions table test still passes.
- [ ] **Step 2: Run** `npx vitest run test/docs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the docs.**
  - `docs/BRAND_TOKENS.md`: what each file is, the schema and the `--iai-` variable names, the `version` rule, how to regenerate and check (`npm run brand:export`, `npm run brand:check`), the contrast gate, and the **consumer contract for the Ecosystem**: it vendors the three files into `packages/design-system/src/generated/` with a `brand:sync` script that copies from a local Ops checkout (the same pattern as `npm run audit:ecosystem -- /path`), and its own test recomputes the hash of the vendored JSON to catch hand edits; cross-repo staleness is a manual check until a decision is made. State plainly what is not included: the Ecosystem's eight-colour subject spectrum, spacing ladder, shadows and light theme are not defined by the Ops brand.
  - `docs/BRAND.md`: add a short "Tokens" section linking to `docs/BRAND_TOKENS.md`; keep the existing facts.
  - `docs/OPEN_QUESTIONS.md`, two new rows directly under the last table row (take the next two free numbers; check the file first; keep the table contiguous): (1) the Ecosystem's eight-hue subject spectrum, spacing, radius and shadow ladders, and its light theme are not in the Ops brand: which to keep, which to adapt for dark surfaces, and who ratifies, given the Ecosystem's own brand kit is marked "candidate, pending Stage 14 ratification"; (2) whether learner-facing screens (primary-school children) should be dark-only, light-only or switchable, given the Ops brand is dark and the owner asked for it everywhere; recommendation: switchable with dark as default, contrast-tested both ways in Phase 2. Both are owner decisions; Phase 2 does not start before they are answered.
  - `docs/BUILD_LOG.md`: dated entry for Phase 1 (what was built per task, test counts from the final `npx vitest run`, and a "Not verified / known limits" list: Ecosystem not touched; fonts not self-hosted; the CSS in `index.css` is checked against the tokens but not generated from them).
  - `README.md`: one line under the commands naming `npm run brand:export` and `brand:check`.
- [ ] **Step 4: Run** `npx vitest run`, `npm run lint`, `npm run build`. Expected: PASS (revert a regenerated `server.js`; do not commit it).
- [ ] **Step 5: Commit** `docs(brand): token contract for the Ecosystem, open questions, build log`.

## Self-review

- Spec 5.5: "a script emits `brand.tokens.json` + CSS variables + a font manifest" (Task 2); "a drift test in each repo fails CI if they diverge" (Task 3 here; the Ecosystem half is Phase 2); contrast/accessibility groundwork (Task 3); docs and the consumer contract (Task 4). The Ecosystem re-skin, font self-hosting and the public site are later phases.
- Names consistent across tasks: `BRAND_TOKENS`, `ColourRole`, `HEX`, `buildTokenFile`, `canonicalJson`, `tokenVersion`, `renderCss`, `renderFontsManifest`, `contrastRatio`, `npm run brand:export`, `npm run brand:check`.
- Open for the owner (not guessed): spectrum and light theme handling, learner-facing theme, who ratifies the Ecosystem brand kit (Stage 14). Phase 2 is blocked on those answers.
