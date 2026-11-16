# Brand tokens

The Operations Platform publishes its brand as three generated files in `brand/`, so another repository can use the same colours and fonts without copying values by hand. The source is `src/brandTokens.ts` (`BRAND_TOKENS`), which takes each value from `src/brand.ts` (`BRAND.colours`, `BRAND.fonts`) or copies it from `src/index.css`, with a comment naming the source. See `docs/BRAND.md` for the brand itself.

## The three files

| File | What it is |
| --- | --- |
| `brand/brand.tokens.json` | The tokens as data: schema, name, version, colours, fonts, radius. |
| `brand/brand.tokens.css` | The same values as CSS custom properties in one `:root` block, with a header comment carrying the version. |
| `brand/fonts.manifest.json` | The fonts: family, role, weights, licence, source and whether they are self-hosted. |

All three are generated and committed. Do not edit them by hand.

### JSON fields (`brand.tokens.json`)

- `schema`: `1`.
- `name`: `Infinite-AI`.
- `version`: see the rule below.
- `colour`: 15 roles: `bg`, `surface`, `surfaceRaised`, `border`, `borderStrong`, `text`, `textSoft`, `textMuted`, `textSubtle`, `primary`, `primaryText`, `accent`, `highlight`, `success`, `danger`. The `text` token is `#F8FAFC` (`--ink` in `src/index.css`). It is not `iceWhite` (`#E9F6FF`), which the brand guidelines call "text on dark".
- `font`: `display`, `body` and `mono`, each with `family` and `stack`.
- `radius`: `card` (`14px`).

### CSS variables (`brand.tokens.css`)

Colours: `--iai-bg`, `--iai-surface`, `--iai-surface-raised`, `--iai-border`, `--iai-border-strong`, `--iai-text`, `--iai-text-soft`, `--iai-text-muted`, `--iai-text-subtle`, `--iai-primary`, `--iai-primary-text`, `--iai-accent`, `--iai-highlight`, `--iai-success`, `--iai-danger`.
Fonts: `--iai-font-display` (Space Grotesk), `--iai-font-body` (Inter), `--iai-font-mono` (Space Mono). Radius: `--iai-radius-card`.

### Fonts (`fonts.manifest.json`)

Display: Space Grotesk 500, 600, 700. Body: Inter 400, 500, 600, 700. Mono: Space Mono 400, 700. Licence for all three: SIL Open Font License 1.1. Source: Google Fonts. `selfHosted` is `false` for each.

## The `version` rule

`version` is computed like this, and only like this:

1. Read `brand/brand.tokens.json` and take its `colour`, `font` and `radius` objects. Leave out `schema`, `name` and `version`.
2. Put those three in one object and serialise it with `JSON.stringify` using a 2-space indent, with the keys sorted alphabetically at every level.
3. Append exactly one line feed (`\n`).
4. Take the SHA-256 of that text encoded as UTF-8.
5. `version` is the first 16 characters of the hash, as lowercase hexadecimal.

Other readings give a different value: hashing the whole file, hashing without the trailing line feed, or compact JSON. The same value is written in the header comment of `brand/brand.tokens.css`. It changes whenever a colour, font family, font stack or radius changes.

`fonts.manifest.json` is not covered by `version`. A change to a weight, licence or source there leaves `version` unchanged, so a consumer that needs to notice those changes must compare the manifest itself.

## Regenerate and check

```bash
npm run brand:export   # writes the three files in brand/
npm run brand:check    # writes nothing; lists differing files and exits 1 on any difference
```

When a file differs, `brand:check` prints `Brand tokens are out of date. Run: npm run brand:export`. A checkout that has Windows line endings (`\r\n`) is treated as equal to `\n`; any other difference counts.

## Guards that run in `npm test`

- Drift (`test/brand-drift.test.ts`): each committed file must equal freshly generated output.
- Source agreement (`test/brand-tokens.test.ts`): token values equal `src/brand.ts`, and `src/index.css` agrees with the tokens.
- Version: the committed `version` (in the JSON and in the CSS header) must equal the value recomputed with the five-step rule above, written out separately from the export code.
- CSS completeness (`test/brand-export.test.ts`): the `--iai-` colour variables equal the colour keys of the JSON, and the CSS carries the radius and all three font stacks. `radius` values must look like `14px` or `0.5rem`.
- Fonts: the manifest's families and weights must equal the Google Fonts link in `index.html`.
- Contact details: every generated file is scanned for the nine contact strings (address parts, phone numbers, email, founder name). None may appear.
- Contrast: 16 text and background pairs must be at least 4.5:1, with no exceptions and no allow-list. The lowest is Neural Violet on `surfaceRaised` (`#0B132B`) at 5.01.
- `public/brand-kit/brand-tokens.json` must still agree with the palette.

The contrast gate is a numeric check of those 16 pairs against the 4.5:1 ratio. It checks text and accent colours only. It is not an accessibility audit and not a claim of accessibility compliance.

`border` and `borderStrong` carry no 3:1 non-text contrast guarantee. Measured against `bg`, `surface` and `surfaceRaised`, `border` is between 1.26:1 and 1.38:1 and `borderStrong` between 1.78:1 and 1.94:1. A component whose boundary must be perceivable (an input, for example) cannot rely on these tokens alone.

## Consumer contract for the Ecosystem (Phase 2)

This is the agreed design. `brand:sync` and the Ecosystem side do not exist yet; Phase 2 builds them.

- The Ecosystem repository vendors the three files into `packages/design-system/src/generated/`.
- A `brand:sync` script there copies them from a local Operations Platform checkout, the same pattern as `npm run audit:ecosystem -- /path` in this repository.
- The Ecosystem's own test recomputes `version` from the vendored `brand.tokens.json` with the five-step rule above (the `colour`, `font` and `radius` objects, sorted 2-space JSON plus one line feed, SHA-256, first 16 hex characters) and compares it with the `version` in the JSON and in the CSS header comment. It catches hand edits to the copy. It does not cover `fonts.manifest.json`.
- Staleness across the two repositories (the Ops tokens changed and the Ecosystem has not synced) is caught by a scheduled check in the Ecosystem's CI that compares its vendored token `version` with the one on this repository's `main` (OPQ-036, resolved 2026-11-16). It needs a read-only credential for this repository, which only the owner can create, and the Ecosystem does not vendor the tokens yet, so the check is built in Phase 2 (the Ecosystem re-skin, blocked on OPQ-034 and OPQ-035). Until then the Ecosystem's test only catches hand edits to its vendored copy.
- The generated names overlap with the Ecosystem's current `packages/design-system/src/tokens.css`. Eight names are defined in both: `--iai-bg`, `--iai-text`, `--iai-text-subtle`, `--iai-border`, `--iai-primary`, `--iai-primary-text`, `--iai-font-body` and `--iai-font-mono`. There they carry light-theme values (for example `--iai-bg: #ffffff`, `--iai-text: #111827`, `--iai-font-body: 'DM Sans'`) and a separate dark variant with other values. The generated file is meant to replace those definitions. It must not be layered on top of them: whichever file loads last wins for the overlapping names, which gives a half re-skin and possibly low-contrast text. The Phase 2 drift test must assert that no `--iai-*` name is defined more than once across the CSS files the app loads.

## What is not included

- The Ecosystem's eight-colour subject spectrum, spacing ladder and shadows are not defined by the Ops brand. See OPQ-034 in `docs/OPEN_QUESTIONS.md`.
- Light colours. The brand defines on-light text and accent colours (`inkLight`, `cyanOnLight`, `violetOnLight`, `mutedLight`), used in the brand guidelines (`public/brand-kit/Infinite-AI-Brand-Guidelines.html`) and in Word documents. Phase 1 does not export them as tokens. No app light theme (page surfaces, borders) is defined in `BRAND`. See OPQ-035.
- Button colours. The app's `.btn.primary` colours in `src/index.css` are not exported.
- Fonts are listed, not self-hosted. They load from Google Fonts through the link in `index.html`. Self-hosting is a Phase 2 decision (spec 5.5). Do not assume the Google Fonts link is acceptable on learner-facing screens, because it sends requests to Google.
- `src/index.css` is checked against the tokens but is not generated from them.
- No contact details are in the token files. They stay in `public/brand-kit/brand-tokens.json`.

## Known gaps in the existing UI (not tokens; for the Phase 2 audit)

Measured with `contrastRatio` on the values in `src/index.css`, which this phase does not change:

- Text on the primary button (`.btn.primary`, `#FFFFFF` on `#0284C7`) is 4.10:1, under the 4.5:1 used for the token gate. The hover colour (`#0369A1`) gives 5.93:1.
- The input border (`--line-strong`, the `borderStrong` token, on an input background of `#0B132B`) is 1.78:1 against that background and 1.94:1 against `bg`, under 3:1.
