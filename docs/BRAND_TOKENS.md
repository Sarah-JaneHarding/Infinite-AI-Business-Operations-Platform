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
- `colour`: 15 roles: `bg`, `surface`, `surfaceRaised`, `border`, `borderStrong`, `text`, `textSoft`, `textMuted`, `textSubtle`, `primary`, `primaryText`, `accent`, `highlight`, `success`, `danger`.
- `font`: `display`, `body` and `mono`, each with `family` and `stack`.
- `radius`: `card` (`14px`).

### CSS variables (`brand.tokens.css`)

Colours: `--iai-bg`, `--iai-surface`, `--iai-surface-raised`, `--iai-border`, `--iai-border-strong`, `--iai-text`, `--iai-text-soft`, `--iai-text-muted`, `--iai-text-subtle`, `--iai-primary`, `--iai-primary-text`, `--iai-accent`, `--iai-highlight`, `--iai-success`, `--iai-danger`.
Fonts: `--iai-font-display` (Space Grotesk), `--iai-font-body` (Inter), `--iai-font-mono` (Space Mono). Radius: `--iai-radius-card`.

### Fonts (`fonts.manifest.json`)

Display: Space Grotesk 500, 600, 700. Body: Inter 400, 500, 600, 700. Mono: Space Mono 400, 700. Licence for all three: SIL Open Font License 1.1. Source: Google Fonts. `selfHosted` is `false` for each.

## The `version` rule

`version` is the first 16 hexadecimal characters of the SHA-256 of the canonical JSON of the tokens. Canonical JSON has sorted keys and fixed formatting, so the value is the same on every machine. It changes whenever any token value changes. It is also written in the header comment of the CSS file.

## Regenerate and check

```bash
npm run brand:export   # writes the three files in brand/
npm run brand:check    # writes nothing; lists differing files and exits 1 on any difference
```

When a file differs, `brand:check` prints `Brand tokens are out of date. Run: npm run brand:export`. A checkout that has Windows line endings (`\r\n`) is treated as equal to `\n`; any other difference counts.

## Guards that run in `npm test`

- Drift (`test/brand-drift.test.ts`): each committed file must equal freshly generated output.
- Source agreement (`test/brand-tokens.test.ts`): token values equal `src/brand.ts`, and `src/index.css` agrees with the tokens.
- Fonts: the manifest's families and weights must equal the Google Fonts link in `index.html`.
- Contact details: every generated file is scanned for the nine contact strings (address parts, phone numbers, email, founder name). None may appear.
- Contrast: 13 text and background pairs must be at least 4.5:1, with no exceptions and no allow-list. The lowest is Neural Violet on Midnight at 5.07.
- `public/brand-kit/brand-tokens.json` must still agree with the palette.

The contrast gate is a numeric check of those 13 pairs against the 4.5:1 ratio. It is not an accessibility audit and not a claim of accessibility compliance.

## Consumer contract for the Ecosystem (Phase 2)

This is the agreed design. `brand:sync` and the Ecosystem side do not exist yet; Phase 2 builds them.

- The Ecosystem repository vendors the three files into `packages/design-system/src/generated/`.
- A `brand:sync` script there copies them from a local Operations Platform checkout, the same pattern as `npm run audit:ecosystem -- /path` in this repository.
- The Ecosystem's own test recomputes the hash of the vendored JSON, to catch hand edits to the copy.
- Staleness across the two repositories (the Ops tokens changed and the Ecosystem has not synced) is a manual check until a decision is made.

## What is not included

- The Ecosystem's eight-colour subject spectrum, spacing ladder, shadows and light theme are not defined by the Ops brand. See OPQ-034 and OPQ-035 in `docs/OPEN_QUESTIONS.md`.
- Fonts are listed, not self-hosted. They load from Google Fonts through the link in `index.html`.
- `src/index.css` is checked against the tokens but is not generated from them.
- No contact details are in the token files. They stay in `public/brand-kit/brand-tokens.json`.
