# Brand Identity System

**Status: design direction ratified (2026-08-26), implementation deferred to Stage 14.**
Design-system component work remains at Stage 14 (Experience surfaces) per build order.
The tokens below are already in active use throughout the codebase — in the business
package, the web app scaffolding, and all documentation. They are not a draft; they are
what this product already looks like.

The interactive brand identity system (mark, narrative, colour, type, voice, motion) lives
at `docs/brand-identity.html` — open it in a browser for the full animated specification.

**Previous draft (2026-07-31) superseded.** The eight-hue spectrum palette, Playfair
Display typeface, and "Educate · Innovate · Transform" tagline are retired. They were
pasted from an unspecified external source and never implemented; the direction below is
what the product actually uses.

---

## Mark

The **Lemniscate** — a single continuous cubic bezier path with no start and no end.

```
SVG path (viewBox 0 0 64 32):
M16 8 C 5 8 5 24 16 24 C 27 24 37 8 48 8
       C 59 8 59 24 48 24 C 37 24 27 8 16 8 Z
```

- **Gradient direction:** Violet (`#7C5CFF`) originates at the left loop; Cyan (`#2DD4BF`) closes the right loop. The gradient travels left → right and always moves in this direction. Never reverse it.
- **Convergence point:** The two loops cross at coordinates (32, 16) in the mark's coordinate space — the geometric centre. This is the brand's most structurally significant point; in the animated version, particles from both loops converge here.
- **Animation:** Canvas-based particle system. 36 particles travel the path at slightly variable speeds, leaving luminous trails that shift violet → cyan as they cross the midpoint. A breathing glow (0.7 Hz) pulses the path. A radial ripple emanates from (32, 16). See `docs/brand-identity.html` for the full specification and `apps/web` for the eventual component.
- **Wordmark:** `INFINITE` in regular weight + `AI` with the gradient applied. Space Grotesk 700, letter-spacing 0.12em, all caps. Never break across two lines.
- **Tagline:** "AI drafts. The teacher decides. Always." — not a marketing line, a product law.
- **Clear space:** Mark height on all four sides, minimum. Minimum display width: 80 px. Below 80 px, use wordmark only.

## Colour system

Six tokens. All surfaces derive from these; no colour is invented at component level.

| Token   | Hex                     | Role                                                    |
| ------- | ----------------------- | ------------------------------------------------------- |
| Ink     | `#05070F`               | Primary ground. Every surface rests on this.            |
| Panel   | `#0C1224`               | Card surface — one step above Ink.                      |
| Panel-2 | `#111A36`               | Secondary surface — nested panels.                      |
| Violet  | `#7C5CFF`               | Brand primary. Gradient origin. Potential.              |
| Cyan    | `#2DD4BF`               | Brand secondary. Gradient close. Realisation.           |
| Gold    | `#F5B841`               | Human moment. Ratification. Teacher decision confirmed. |
| Rose    | `#FB7185`               | Risk. Safeguarding. Never decorative.                   |
| Text    | `#E9EDF8`               | Primary text on Ink.                                    |
| Muted   | `#8FA0C2`               | Secondary text, labels, captions.                       |
| Line    | `rgba(148,163,255,.14)` | Borders and dividers.                                   |

**The Brand Arc** — `linear-gradient(90deg, #7C5CFF, #2DD4BF)` — is reserved for the mark, primary CTAs, and key data moments. Do not apply it to decorative borders or background fills where it would lose its signal value.

## Typography

Two typefaces. No others are permitted.

| Role    | Face          | Weights in use     | Use                                |
| ------- | ------------- | ------------------ | ---------------------------------- |
| Display | Space Grotesk | 300, 500, 600, 700 | Headings, wordmark, section labels |
| Body    | Inter         | 300, 400, 500, 600 | Body, UI, captions, data           |

Source: Google Fonts (both faces). Declare full fallback stacks (`system-ui, sans-serif`).

**Type scale** (clamp-based; Stage 14 will formalise as CSS custom properties):

| Step    | Expression                     | Notes                        |
| ------- | ------------------------------ | ---------------------------- |
| Hero    | `clamp(2.6rem, 7vw, 6rem)`     | Space Grotesk 700, ls −.03em |
| H1      | `clamp(1.9rem, 4vw, 3rem)`     | Space Grotesk 700            |
| H2      | `clamp(1.2rem, 2.5vw, 1.6rem)` | Space Grotesk 600            |
| Body    | `1rem / 1.75`                  | Inter 400, max-width 62ch    |
| Eyebrow | `.65rem / .2em ls / uppercase` | Inter 600, Gold              |
| Caption | `.73rem / .04em ls`            | Inter 400, Muted             |

## Voice

**Core principle:** Plain, warm, honest. Write for the teacher reading at 6am who has not yet had coffee.

**Personality axes** (of five, closest to left):

- Warm ↔ Clinical → 25 % toward Clinical
- Plain ↔ Technical → 30 % toward Technical
- Hopeful ↔ Cautious → 40 % toward Cautious (ground every claim)
- Permanent ↔ Adaptive → 45 % (memory endures; approach evolves)

**Five writing rules:**

1. Name things by what they do, not what they are.
2. AI suggests; the teacher decides — state this, imply it, never contradict it.
3. Cite the evidence: PIRLS 2021, CAPS section, SIAS process step. Uncited claims are not made.
4. Use ecosystem language: soil, roots, seasons, habitats, harvest. It maps to the architecture.
5. Never claim learner outcomes until an independent randomised evaluation is published.

**Tagline hierarchy:**

- Product law: "AI drafts. The teacher decides. Always."
- Brand promise: "Evidence. System. Capacity — working together."
- Origin: "Fix the soil, not the buckets."

## Motion language

- **Continuous:** The lemniscate never stops. Loops are seamless.
- **Breathing:** Glow pulses at ~0.7 Hz — the resting breath rate. Never faster.
- **Gradient-directional:** Particles travel violet → cyan. Counter-flow is never decorative.
- **Reduced motion:** `prefers-reduced-motion` respected at all times; the static mark is always sufficient.

---

_Previous draft content (eight-hue spectrum, Playfair Display, Space Mono, Dashboard HTML sketch) removed 2026-08-26 — it was never implemented and the direction is superseded._

---

## Dashboard HTML sketch

Unstyled structure only — no CSS is defined anywhere for the `iai-*` classes below, so this
renders as plain HTML until (if) Stage 14 builds the actual stylesheet.

```html
<div class="infinite-ai-container">
  <header class="iai-header">
    <h1 class="iai-title">INFINITE-AI | Build Guide & Ecosystem Audit</h1>
    <p class="iai-subtitle">Production-Ready System Output</p>
  </header>
  <section class="iai-section">
    <h2 class="iai-heading">1. Input Analysis</h2>
    <p class="iai-body">
      Interpret and analyse all uploaded files. Extract structure, metadata, and ecosystem
      relationships.
    </p>
  </section>
  <section class="iai-section">
    <h2 class="iai-heading">2. Ecosystem Audit</h2>
    <ul class="iai-list">
      <li>Inventory of existing assets</li>
      <li>Readiness classification</li>
      <li>Recommendations (keep / refine / repurpose / discard)</li>
    </ul>
  </section>
  <section class="iai-section">
    <h2 class="iai-heading">3. Comprehensive Build Guide</h2>
    <p class="iai-body">
      Architecture overview, module instructions, integration points, and design system
      standards.
    </p>
  </section>
  <section class="iai-section">
    <h2 class="iai-heading">4. Step-by-Step Build Plan</h2>
    <ul class="iai-list">
      <li>Phases & sub-phases</li>
      <li>Task breakdowns</li>
      <li>Dependencies & workflows</li>
    </ul>
  </section>
  <section class="iai-section">
    <h2 class="iai-heading">5. Production Roadmap</h2>
    <ul class="iai-list">
      <li>Milestones & timelines</li>
      <li>Risk analysis</li>
      <li>Launch sequence</li>
    </ul>
  </section>
  <footer class="iai-footer">
    <p class="iai-footer-text">
      INFINITE-AI Design System • Brand Kit Embedded • Dashboard Ready
    </p>
  </footer>
</div>
```

## What was deliberately left out of this file

The source document also included a "SUPER-PROMPT / SYSTEM DIRECTIVE," a "Multi-Agent
Orchestration Engine" system prompt, a "Developer Prompt" for internal tooling, and a
reusable "Build Cycle Template" (input analysis → ecosystem audit → build guide → build
plan → roadmap → brand enforcement → deliverables). Those describe a generic prompt-
engineering workflow for producing brand-compliant documents via a different, unspecified
AI system — they are not instructions for this repository and are not reproduced here.
This repository already has its own equivalents that are ratified and in use:
`INFINITEAI_BUILD_MANUAL.md` for the build plan, `docs/STAGE_LOG.md` for the audit trail,
and `docs/OPEN_QUESTIONS.md` for what is still undecided.

The marketing site draft is archived at `docs/marketing/educators-ecosystem/` (not served; see its README and OQ-042).
