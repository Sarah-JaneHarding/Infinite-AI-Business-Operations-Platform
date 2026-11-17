# Phase 2: Ecosystem Re-skin Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** The Ecosystem web app and its design system use the Ops brand (Deep Space and Midnight surfaces, Plasma Cyan, Neural Violet, Space Grotesk, Inter, Space Mono, the lemniscate mark), switchable between dark (the default) and light, with every colour pair contrast-tested in both themes.

**Architecture:** The Ops brand tokens (`brand/` in the Ops repo, Phase 1) are vendored byte for byte into `packages/design-system/src/brand/` by a sync script, and a drift test keeps the vendored copy self-consistent. The Ecosystem's stale `tokens.css` (it still carries the retired eight-hue draft) is rewritten to import the vendored colours and fonts and to keep only the Ecosystem's own scales (space, radius, shadow, motion). Components and the web app then use tokens only. Fonts are self-hosted because the Content-Security-Policy blocks Google Fonts.

**Tech Stack:** pnpm and Turbo monorepo, Next.js 16, Tailwind 4, Vitest, Playwright with axe, TypeScript strict. No new runtime dependency.

**Spec:** `docs/superpowers/specs/2026-11-14-integrated-platform-design.md` section 5.5, in the Ops repo. Token contract: `docs/BRAND_TOKENS.md` (Ops repo). All work in this plan is in the **Ecosystem repo** (`/home/user/infinite-ai-ecosystem`), whose `CLAUDE.md` binds every task.

## What the audit found (2026-11-16, read-only; facts, not assumptions)

- The premise of OPQ-034 was wrong. The Ecosystem's own `docs/BRAND_KIT.md` was ratified 2026-08-26 and already uses the Ops direction (Ink, Violet, Cyan, Space Grotesk, Inter, the lemniscate), and it retires the eight-hue palette, Playfair Display and the tagline "Educate · Innovate · Transform". `packages/design-system/src/tokens.css` is stale: 71 unique `--iai-*` names, 87 declarations, light by default, eight hues, Playfair and DM Sans, and it calls the kit "candidate". There are no subject colours.
- The two kits agree on structure and disagree on four hex values: Plasma Cyan `#5BC8EC` (Ops) against `#2DD4BF` (Ecosystem kit), Neural Violet `#8D6CFF` against `#7C5CFF`, text `#F8FAFC` against `#E9EDF8`, muted `#94A3B8` and `#CBD5E1` against `#8FA0C2`. Deep Space `#05070F`, Midnight `#0C1224`, Spark Gold `#F5B841` and Rose `#FB7185` agree. The owner's instruction ("use the Ops branding throughout the Ecosystem") makes the Ops values win; the Ecosystem kit is amended to match (Task 6, owner confirms).
- `tokens.ts` is hand-written and nothing checks it against `tokens.css`. `tokens.spec.ts` asserts the retired values (Playfair, DM Sans, eight hues, red, blue, violet hex). `design-system-styles.spec.ts` needs at least 16 `from-[#hex]` classes in `Card.tsx`. `Card.tsx` hard-codes 16 hex values and `InfinityMark.tsx` 8.
- `apps/web/src` has no hard-coded hex colours and 41 files using `--iai-*`, but 13 files use Tailwind palette classes (text-white 25 times, emerald, green, amber, cyan, sky). The app loads no fonts at all (system fallbacks). Dark mode is OS-driven; there is no switch.
- Content-Security-Policy (`packages/security/src/headers.ts`) has `font-src 'self'` and `style-src 'self' 'unsafe-inline'`: Google Fonts is blocked; same-origin font files pass.
- Tests: Playwright axe covers only `/sign-in`; its spec sits outside the Playwright `testDir`; CI has no Playwright step; no contrast assertions and no visual snapshots anywhere; `teacher.spec.ts:16` asserts the retired tagline; the sign-in page shows it (`sign-in/page.tsx:74`).
- Gates: CI runs `pnpm verify:stage 65`; no gate checks brand values, contrast or `tokens.ts` against `tokens.css`. Rule 9 of `CLAUDE.md`: nothing outside MIT, Apache-2.0, BSD or ISC without explicit approval; Space Grotesk, Inter and Space Mono are OFL-1.1, so the fonts need the owner's approval.
- 88 static HTML files in `apps/web/public` carry 2,665 hex values and their own fonts (Montserrat, Lora). They are not part of the app UI as far as the audit could tell. Out of scope here; recorded as a question.

## Global Constraints

- Strict TypeScript, no `any`, no `@ts-ignore`, no `.skip` or `.only`, no `console.log`, no secrets, no new dependency (rule 9). `process.env` stays inside `packages/config`.
- Vendored brand files are copied from the Ops repo unchanged; the `version` hash recipe is the one in Ops `docs/BRAND_TOKENS.md`: SHA-256, first 16 lowercase hex characters, over `{colour, font, radius}` as 2-space JSON with sorted keys, one trailing newline, UTF-8. The committed Ops version today is `75b604bbd6368008`.
- No `--iai-*` name may be defined twice across the CSS files the app loads (Ops `docs/BRAND_TOKENS.md`, "Ecosystem overlap").
- Contrast: every text-on-background pair at least 4.5:1, large text and UI borders at least 3:1, in both themes, computed from the tokens by a test (WCAG 2.2 AA).
- Dark is the default. Light applies only when the person chose it (a `data-theme="light"` attribute set from their saved choice); the OS setting is not used.
- Tagline everywhere: "AI drafts. The teacher decides. Always." No learner imagery. No prices, no invented figures.
- The Ecosystem's `CLAUDE.md`: one logical change per commit, about 400 changed lines per PR (generated and vendored files, lockfiles and snapshots excluded), Conventional Commits, draft PRs only, docs updated in the same commit, `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm verify:stage 65` green. Pushes are limited to the session branch, so the three PRs below are built one at a time: the owner merges one, then the branch is restarted from `main` for the next.
- Rule 2 (never weaken a failing test): assertions that encode the retired brand (Playfair, eight hues, the old tagline, hue hex values) are replaced by stronger assertions on the ratified values in the same commit, and each such replacement is a `Ruling:` in the ledger. No threshold is lowered and no test is deleted without a replacement.

## Rulings made in this plan (the owner can overturn any of them)

1. **Ops hex values win** over the four differing values in the Ecosystem's `docs/BRAND_KIT.md`, because the owner asked for the Ops branding throughout. `BRAND_KIT.md` is amended to match and says so. Cost if wrong: the Ecosystem looks like Ops rather than like its own earlier kit.
2. **Dark by default; light only by explicit choice.** The OS preference is ignored. Cost if wrong: people who set their device to light and never open the switch see dark.
3. **The light theme is derived, not designed from scratch:** page and surface colours come from the brand's on-light colours (`inkLight`, `cyanOnLight`, `violetOnLight`, `mutedLight`) plus white and a pale grey, and every pair is contrast-tested. The owner ratifies the light palette in the PR before merge (OPQ-035). Cost if wrong: a light theme to redo.
4. **Status colours** map success to the brand's success green, warning to Spark Gold, error to Rose, and information to Plasma Cyan, each with text, background, border and dot tokens derived and contrast-tested. Colour is never the only signal: the existing text and icon in `Badge` and `StatusPill` stay. Cost if wrong: status hues change again.
5. **Role colours:** the per-role card header gradients (eight hues) are retired. A card header is a neutral surface with a 3 px accent line taken from a small brand set (`primary`, `accent`, `highlight`, `success`, `danger`, `textSubtle`); roles beyond six share a colour and always show their name as text. The Brand Arc gradient is reserved for the mark and primary buttons, as the kit says. Cost if wrong: roles are less distinguishable by colour.
6. **Theme choice is stored in a functional cookie** (`iai-theme`, value `dark` or `light`, no identifier) read on the server so the page renders in the right theme without an inline script (the Content-Security-Policy allows no inline script without a nonce). It holds no personal information. Cost if wrong: replace with local storage and accept a flash of the wrong theme.
7. **Fonts are self-hosted woff2 files committed to the repo** (Space Grotesk, Inter, Space Mono, with their OFL licence texts and the source package name, version and file hashes recorded in `docs/DEPENDENCIES.md`), loaded with `next/font/local`. No npm font package. They need the owner's approval of the OFL licence (rule 9); Task 4 does not start until OQ-050 is answered. If declined, the system font stack stays and the fonts task is dropped.
8. **Authenticated-page axe coverage is not built in this phase.** Those routes need a Keycloak session fixture. Axe runs on the public routes in both themes, and components are checked by unit tests; authenticated coverage is a follow-up (OQ-052).
9. **The cross-repository drift check (OPQ-036) is built only once the owner has created the read-only credential.** Until then Task 6 builds the self-consistency test only. A scheduled workflow that fails or silently skips for want of a secret would be worse than none.
10. **The 88 static HTML files in `apps/web/public` are out of scope.** Cost if wrong: they keep their own palettes.

## Review Focus

1. **Light theme contrast.** The dark primary Plasma Cyan `#5BC8EC` on white is about 1.9:1. The light theme must use `cyanOnLight` for text and links and keep cyan fills only behind dark text. Test: every semantic pair in `[data-theme="light"]`.
2. **Focus visibility.** A 2 px focus ring that meets 3:1 against both the page and the control in both themes, on every interactive component. Test: a computed contrast check on the ring token, plus an axe run with keyboard focus on `/sign-in`.
3. **Flash of the wrong theme and cookie handling.** A missing, empty or tampered `iai-theme` cookie falls back to dark; only `dark` and `light` are accepted. Test: the pure parse function.
4. **Learner-screen performance.** Self-hosted fonts must not push first contentful paint past 1.5 s on the existing Lighthouse budget (`pnpm test:lighthouse`): `font-display: swap`, only the weights the brand uses (Inter 400 500 600 700, Space Grotesk 500 600 700, Space Mono 400 700 per the vendored `fonts.manifest.json`), woff2 only.
5. **Stale references to the retired brand.** After the change no file under `apps/web/src` or `packages/design-system` mentions Playfair, DM Sans, the eight hue names or the old tagline. Test: a repository scan in the design-system tests.

---

## PR 2A: vendored brand tokens and the rewritten token layer

### Task 1: Vendor the Ops tokens and keep them self-consistent

**Files:**
- Create: `packages/design-system/src/brand/brand.tokens.json`, `brand.tokens.css`, `fonts.manifest.json` (byte copies of the Ops files)
- Create: `scripts/brand-sync.ts` (`pnpm brand:sync <path to an Ops checkout>`; add the script to the root `package.json`)
- Test: `packages/design-system/test/brand-vendored.spec.ts`
- Modify: `docs/DEV_SETUP.md`, `docs/BRAND_KIT.md` (pointer only), `CHANGELOG.md`

**Interfaces:**
- Produces: `brand.tokens.css` defining the `--iai-*` colour and font variables for the dark theme; `brand.tokens.json` (`colour`, `font`, `radius`, `name`, `schema`, `version`).
- Produces: `readBrand(): BrandTokens` and `brandVersion(b: BrandTokens): string` in `packages/design-system/src/brand/index.ts` (parse and version recompute, used by tests and docs).

- [ ] **Step 1: Write the failing tests** in `brand-vendored.spec.ts`: `brandVersion` of the vendored JSON equals its `version` field (recipe above); every colour key has a matching `--iai-<kebab-name>` in `brand.tokens.css` with the same value; the font families in `fonts.manifest.json` equal those in the JSON; every text-on-background pair listed in Ops `docs/BRAND_TOKENS.md` is at least 4.5:1 (compute with the standard relative-luminance formula; the pairs are written out in the test); failure paths: a tampered colour value, a changed `version`, and an extra CSS variable not in the JSON each make the check fail (call the pure check function with edited copies).
- [ ] **Step 2: Run** `pnpm --filter @infinite-ai/design-system test brand-vendored`. Expected: FAIL (files missing).
- [ ] **Step 3: Implement** `brand-sync.ts` (copy the three files from `<ops>/brand/`, refuse if `version` does not recompute, print the version) and `brand/index.ts`; run the sync against `/home/user/Infinite-AI-Business-Operations-Platform` once to create the files.
- [ ] **Step 4: Run** the test, `pnpm lint`, `pnpm typecheck`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(design-system): vendor the Ops brand tokens with a drift test`.

### Task 2: Rewrite `tokens.css` and `tokens.ts` to the ratified direction

**Files:**
- Modify: `packages/design-system/src/tokens.css`, `tokens.ts`, `index.ts`, `README.md`
- Test: `packages/design-system/test/tokens.spec.ts` (assertions on retired values replaced), new `packages/design-system/test/theme-contrast.spec.ts`
- Modify: `docs/BRAND_KIT.md`, `docs/STAGE_LOG.md`

**Interfaces:**
- Consumes: Task 1's `brand.tokens.css` and `brandVersion`.
- Produces: `tokens.css` that imports `./brand/brand.tokens.css` and defines only the Ecosystem's own scales (space 12 rungs, radius 7, shadow 3, motion 6), the status tokens (ruling 4), and the light theme under `:root[data-theme='light']` (ruling 3); no hue, spectrum, Playfair or DM Sans; `.iai-spectrum` removed, `.iai-card-lift` kept; a corrected header comment (no "candidate").
- Produces: `tokens.ts` exporting `COLORS` (the brand semantic colours), `FONTS` `{ display, body, mono }`, `SPACE`, `RADIUS`, `MOTION`, `STATUS_COLORS`, all derived from `brand.tokens.json` where they come from the brand; `HUE`, `SPECTRUM` and `CARD_GRADIENT` removed.

- [ ] **Step 1: Write the failing tests.** `tokens.spec.ts`: replace the Playfair, DM Sans, eight-hue, red, blue and violet assertions with assertions that `FONTS.display` contains Space Grotesk, `FONTS.body` Inter, `FONTS.mono` Space Mono, and `COLORS.primary` equals the vendored `colour.primary` (and likewise accent, bg, surface, text); keep the SPACE (12 ascending) and RADIUS (7 ascending) assertions. A new check parses `tokens.css` and `brand.tokens.css` together and asserts no `--iai-*` name is defined twice in one theme block, every name `tokens.ts` mentions exists in the CSS, and the retired words (Playfair, DM Sans, the hue names) appear nowhere in the package (Review Focus 5). `theme-contrast.spec.ts`: for the dark and the light theme, resolve every semantic token to a hex (parse the CSS) and assert the pair list from Global Constraints (text on bg, surface, surfaceRaised; muted and subtle text; primary-text on primary; links; status text on status background; the focus ring against page and control; borders at 3:1) meets its ratio; failure paths: a fixture theme with a low-contrast value fails the same function; the light theme using `primary` cyan for text fails (Review Focus 1).
- [ ] **Step 2: Run** the design-system tests. Expected: FAIL.
- [ ] **Step 3: Implement** the rewritten files. Light values: derived per ruling 3 and listed in the commit body for the owner to ratify. The theme switch is `:root[data-theme='light']`; there is no `prefers-color-scheme` block.
- [ ] **Step 4: Update `docs/BRAND_KIT.md`** to the Ops values (cyan `#5BC8EC`, violet `#8D6CFF`, text `#F8FAFC`, muted values) with a dated note that it was amended to match the Ops brand and awaits the owner's confirmation (ruling 1); add a `docs/STAGE_LOG.md` entry; update `packages/design-system/README.md` (no "candidate").
- [ ] **Step 5: Run** `pnpm --filter @infinite-ai/design-system test`, `pnpm lint`, `pnpm typecheck`, `pnpm format:check`. Expected: PASS (the web tests in Task 3 are expected to need the next task; do not push a red tree: if `design-system-styles.spec.ts` fails, fix it in Task 3 within the same PR before the draft is opened).
- [ ] **Step 6: Commit** `feat(design-system): rewrite the token layer to the ratified brand, dark first with a light theme`.

---

## PR 2B: components and the web app

### Task 3: Components on tokens only, with the lemniscate mark

**Files:**
- Modify: `packages/design-system/src/components/{Button,Card,Badge,StatusPill,InfinityMark}.tsx`, `apps/web/src/lib/roles.ts` (role to accent token), `apps/web/tests/unit/design-system-styles.spec.ts`
- Test: component tests next to the existing ones (`packages/design-system/test/components.spec.tsx`, using the repo's existing React test setup)

**Interfaces:**
- Produces: `InfinityMark` renders the lemniscate path from the Ecosystem's `docs/BRAND_KIT.md` (viewBox 0 0 64 32) with a left-to-right gradient from `--iai-accent` to `--iai-primary` and an accessible name; `Card` header takes `accent: 'primary' | 'accent' | 'highlight' | 'success' | 'danger' | 'muted'`; no hex literal and no Tailwind palette class remains in these files; `ROLE_ACCENT` replaces `ROLE_HUE` (ruling 5).

- [ ] **Step 1: Write the failing tests:** none of the five component files contains a hex literal or a Tailwind palette class (scan); `InfinityMark` has role `img` and an accessible name, a single path, and its gradient stops are token variables in left-to-right order (violet then cyan); `Card` renders a role name as text whatever its accent; `Button` danger text meets 4.5:1 on its background; `design-system-styles.spec.ts` now asserts that the compiled CSS contains the token variables and none of the retired hue variables (replaces the `>= 16 from-[#hex]` check, ruling under rule 2).
- [ ] **Step 2: Run** the tests. Expected: FAIL.
- [ ] **Step 3: Implement** the component changes and `ROLE_ACCENT`.
- [ ] **Step 4: Run** `pnpm --filter @infinite-ai/design-system test`, `pnpm --filter @infinite-ai/web test`, lint, typecheck. Expected: PASS.
- [ ] **Step 5: Commit** `feat(design-system): components use tokens only; lemniscate mark`.

### Task 4: Self-hosted fonts (starts only after OQ-050 is answered)

**Files:**
- Create: `apps/web/src/fonts/` (woff2 files and licence texts), `apps/web/src/app/fonts.ts` (`next/font/local` declarations)
- Modify: `apps/web/src/app/layout.tsx`, `apps/web/src/app/globals.css`, `docs/DEPENDENCIES.md`
- Test: `apps/web/tests/unit/fonts.spec.ts`

**Interfaces:**
- Produces: the three font families loaded as CSS variables that `tokens.css` and `brand.tokens.css` already name (`--iai-font-display`, `--iai-font-body`, `--iai-font-mono`), weights exactly as in the vendored `fonts.manifest.json`.

- [ ] **Step 1: Write the failing test:** every weight in `fonts.manifest.json` has a committed woff2 file; a licence text exists for each family; `fonts.ts` declares exactly those weights and `display: 'swap'`; `DEPENDENCIES.md` lists each family with licence OFL-1.1, source, version and the SHA-256 of each file (computed in the test and compared); the Content-Security-Policy still has `font-src 'self'` (read `buildCsp()`).
- [ ] **Step 2: Run** it. Expected: FAIL.
- [ ] **Step 3: Implement.** Obtain the woff2 files from a pinned release of the families' open-source distribution, record provenance, and do not add an npm dependency.
- [ ] **Step 4: Run** the web tests, `pnpm build`, and `pnpm test:lighthouse` (record first contentful paint against the 1.5 s budget; Review Focus 4). Expected: PASS.
- [ ] **Step 5: Commit** `feat(web): self-host the brand fonts (OFL, approved in OQ-050)`.

### Task 5: Web re-skin, theme switch and tagline

**Files:**
- Modify: the 13 `apps/web/src` files that use Tailwind palette classes, `apps/web/src/app/layout.tsx`, `apps/web/src/components/shell/Header.tsx`, `apps/web/src/app/sign-in/page.tsx`, `apps/web/tests/e2e/teacher.spec.ts`
- Create: `apps/web/src/lib/theme.ts`, `apps/web/src/components/shell/ThemeSwitch.tsx`
- Test: `apps/web/tests/unit/theme.spec.ts`, a scan test for palette classes

**Interfaces:**
- Produces: `parseTheme(value: unknown): 'dark' | 'light'` (anything but the exact string `light` is `dark`), `THEME_COOKIE = 'iai-theme'`; `ThemeSwitch` (a button with an accessible name and `aria-pressed`) that sets the cookie (path `/`, one year, `SameSite=Lax`, no `Secure` requirement in dev) and reloads the attribute; the layout reads the cookie on the server and sets `data-theme`.

- [ ] **Step 1: Write the failing tests:** `parseTheme` accepts `light` and `dark`, and returns `dark` for undefined, empty, `LIGHT`, `light ` and an object (Review Focus 3); no file under `apps/web/src` contains a Tailwind default-palette class (list the classes from the audit); the sign-in page and the e2e expectation use "AI drafts. The teacher decides. Always." and the string "Educate" appears nowhere in `apps/web/src` or `tests`; `ThemeSwitch` has an accessible name and reflects its state.
- [ ] **Step 2: Run** them. Expected: FAIL.
- [ ] **Step 3: Implement** the re-skin: replace each palette class with a token class, keep text and icons on status elements, and use the `ROLE_ACCENT` header accents from Task 3.
- [ ] **Step 4: Run** `pnpm --filter @infinite-ai/web test`, lint, typecheck, `pnpm build`; start the app and take screenshots of `/sign-in` and `/choose-role` at 390 px and 1280 px in both themes (deviceScaleFactor 1) and check them by eye. Expected: PASS; record anything that looks wrong.
- [ ] **Step 5: Commit** `feat(web): Ops brand across the app, theme switch, correct tagline`.

---

## PR 2C: accessibility gate and documentation

### Task 6: Accessibility in CI, the drift check, and documentation

**Files:**
- Modify: `apps/web/playwright.config.ts` (move or include `tests/a11y` in `testDir`), `apps/web/tests/a11y/axe.spec.ts`, `.github/workflows/ci.yml` (a Playwright job), `docs/OPEN_QUESTIONS.md`, `docs/BRAND_KIT.md`, `docs/DEV_SETUP.md`, `CHANGELOG.md`, `docs/STAGE_LOG.md`
- Create (only after the owner confirms the credential exists): `.github/workflows/brand-drift.yml`

- [ ] **Step 1: Write the failing tests:** axe (wcag2a, wcag2aa, wcag21aa, wcag22aa) on `/sign-in` and `/choose-role` in the dark and the light theme and at 390 px and 1280 px, failing on any serious or critical violation; the spec is inside `testDir` and `pnpm test:a11y` runs it (assert by listing tests); keyboard focus ring visible on the first focusable element in both themes (Review Focus 2).
- [ ] **Step 2: Run** `pnpm --filter @infinite-ai/web test:a11y`. Expected: FAIL before the config fix, then PASS.
- [ ] **Step 3: Add the CI job** that installs Playwright browsers and runs the a11y spec (new job, existing jobs untouched; say so in the PR).
- [ ] **Step 4: Docs.** Add OQ-050 (approve the OFL licence for the three font families; recommendation: yes, they are the brand's own fonts), OQ-051 (confirm the Ops hex values win over the Ecosystem kit; recommendation: yes), OQ-052 (axe coverage of authenticated pages needs a Keycloak test session; recommendation: add a fixture in a later phase), OQ-053 (what to do with the 88 static HTML files in `apps/web/public`; recommendation: audit which are linked, then restyle or retire). Record the light palette for the owner's ratification. Update `docs/BRAND_KIT.md`, `DEV_SETUP.md` (how to run `pnpm brand:sync`), `CHANGELOG.md`, `STAGE_LOG.md`.
- [ ] **Step 5: Drift workflow, only if the credential exists:** a weekly schedule plus manual trigger that reads `brand/brand.tokens.json` from the Ops repository's `main` with the read-only token and fails with a clear message if the `version` differs from the vendored one, and fails loudly (not skips) if the token is missing. If the credential does not exist yet, skip this step and say so in the PR.
- [ ] **Step 6: Run** the full checks (`pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm build`, `pnpm verify:stage 65`). Expected: PASS.
- [ ] **Step 7: Commit** `test(a11y): axe in both themes in CI; docs and open questions for the re-skin`.

---

## Self-review

- **Spec coverage (5.5):** a generated, checked-in token layer in `packages/design-system` (Task 1) with a drift test in each repository (Ops Phase 1; Task 1 here, plus the scheduled cross-repository check in Task 6 once the credential exists); swap tokens and fonts, Space Grotesk, Inter, Space Mono (Tasks 2 and 4); audit every component for contrast on the dark palette, focus rings, charts, role surfaces (Tasks 2, 3, 6); WCAG 2.2 AA (Task 6); Playwright and axe tests updated (Task 6); tagline carried over and no learner imagery (Task 5); fonts recorded in `docs/DEPENDENCIES.md` with licence (Task 4). "Charts": the audit found no chart components in `packages/design-system` or `apps/web/src` using hues beyond the card gradients; if the implementer finds any, they use the same tokens (record as a ruling).
- **Type consistency:** `readBrand`, `brandVersion`, `parseTheme`, `THEME_COOKIE`, `ROLE_ACCENT`, `FONTS.display` are defined once and used with the same names later.
- **Proportion and size:** each of the three PRs is meant to stay near the Ecosystem's 400 changed lines excluding vendored files; if Task 5 exceeds it, split the 13-file palette-class replacement from the theme switch.
- **Open decisions for you:** OQ-050 (OFL), OQ-051 (Ops hex values win), ratification of the derived light palette, and the credential for the drift check.
