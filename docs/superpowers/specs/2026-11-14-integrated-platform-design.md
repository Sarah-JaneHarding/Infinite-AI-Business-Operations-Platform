# Integrated platform: Operations Platform as control plane for the Education Ecosystem

Status: **DRAFT for approval** · 2026-11-14 · Owner and sole signer: Sarah-Jane Harding

## 1. Intent and why

Infinite-AI runs two codebases: the **Operations Platform** (this repo: 16 departments, 100 agents, Review Board,
autonomy, Model Hub, connector) and the **Education Ecosystem** (`infinite-ai-ecosystem`: the multi-tenant, POPIA-safe
SaaS for South African primary schools). The owner wants one integrated platform in which:

1. the Operations Platform is where the company, and the Ecosystem product, are *run from*;
2. autonomous agents cover **every department** and get tasks done without being prompted;
3. every final agent output is **reviewed, countersigned by a named person and ratified** before it is ingested;
4. every code change reaches a repo only through a **draft PR that a named person reviews before merge**;
5. a **public marketing website** is built from the Ecosystem Showcase;
6. the Operations Platform's **brand** (colours, design, style) is used across the Ops app, the Ecosystem app and the public site.

The *why*: one person is currently the whole company. Agents should carry the routine work; the person's time goes to
judgement, signing and merging. Nothing the agents make may reach the platform, a repo or a customer without that person.

## 2. Goals, non-goals, anti-goals

**Goals**
- G1 Agents in all 16 departments can pick up queued tasks (and run on standing orders) and produce drafts.
- G2 Single human accountability: a named-person registry says who may sign for which department/agent.
- G3 Ops console shows live Ecosystem health, PRs, CI, stages, open questions and can *propose* changes to it.
- G4 One brand source; Ops, Ecosystem and the public site render the same identity.
- G5 Public site live, content ratified, accessible (WCAG 2.2 AA), fast, no invented claims.

**Non-goals (this design)**
- Merging the two codebases or storage layers (rejected approach, see section 4).
- Taking payments, sending email/WhatsApp, or any outbound channel (OPQ-003/004 stay open).
- Replacing Ops JSON-lines storage with Postgres (OPQ-010 stays open).
- Any learner data crossing into Ops (OPQ-007 stays closed).

**Anti-goals (failure even if it technically works)**
- An agent that approves, countersigns, ratifies, ingests or merges anything.
- A second path to a model provider, or learner PII in any prompt.
- Marketing copy with figures nobody ratified (pricing, agent counts, school counts, funding).
- Loosening the Ecosystem's tenant isolation, stage gates or its `CLAUDE.md` rules to make integration easier.
- Child or learner images anywhere (brand rule).

## 3. Constraints (verified in the code)

- Ops: Vite + React 19 + Express + npm, JSON-lines warehouse, hash-chained server ledger, Review Board, autonomy
  runner (off by default, fixed inputs only, drafts only), GitHub connector that is **GET-only** plus one gated
  issue publisher. Brand source of truth: `src/brand.ts` (Deep Space `#05070F`, Midnight `#0C1224`, Plasma Cyan
  `#5BC8EC`, Neural Violet `#8D6CFF`, Spark Gold `#F5B841`, Ice White `#E9F6FF`; Space Grotesk / Inter / Space Mono).
- Ecosystem: pnpm + Turbo monorepo, Next.js 16, Postgres 16 with forced RLS, Keycloak, gateway as the only model
  path. Its own identity today: Playfair Display / DM Sans / Space Mono and a light spectrum
  (`packages/design-system/src/tokens.{ts,css}`). Its API surface today: `api/admin/staff`, `api/approvals`,
  `api/caps-canon`, `api/auth`, `api/health`. Ecosystem `CLAUDE.md` rules bind every change there (stage gates,
  Definition of Done, <= ~400 changed lines per PR, no `any`, new dependency recorded, docs in the same commit).
- Both repos: GitHub is the source of truth; changes land by PR; CI must pass. AI Studio exports are working copies.
- Session scope: only these two repos can be changed from here. The public site therefore lives in the Ops repo.
- Provisional facts that must not be published as fact: pricing (D-1/OPQ-006/OPQ-026), agent counts (OPQ-005),
  VAT (D-6), funding leads (unverified).

## 4. Approaches considered

| | Approach | Trade-off | Outcome |
|---|---|---|---|
| 1 | **Control plane.** Ops stays its own app; drives the Ecosystem through a typed, authenticated contract and through GitHub (issues, draft PRs). One brand source. Static site from the showcase. | Two stacks stay; stage gates and tenant isolation untouched. Needs a new narrow API in the Ecosystem. | **Chosen by the owner.** |
| 2 | One monorepo (Ops into pnpm workspace). | Tidy, but rewrites Ops storage/auth and every change passes Ecosystem stage gates. | Rejected. |
| 3 | Ops imports Ecosystem packages. | Breaks the Ecosystem's tenant-isolated Postgres model. | Rejected. |

## 5. Design (as decided)

### 5.1 Sign-off model: solo-signer mode (PROPOSED, needs explicit approval)

Today the server refuses one person approving *and* countersigning (the "nobody signs twice" rule; OPQ-017). With one
signer that rule makes the platform unusable, and the owner has said they sign everything for now. Proposal:

- A **named-person registry** (config, not code): person id, display name, roles, departments/agents they may sign for.
- `OPS_SIGNING_MODE=solo` is opt-in and visible in the UI. In solo mode one registered person may complete both steps,
  but only as **two separate actions**: *approve*, then *countersign* after a fresh re-authentication and a minimum wait
  (default 10 minutes, configurable). Both signatures stay bound to the same content hash; any edit voids both.
- Every ledger entry written under solo mode carries `signing: "single-signer"`; the Board and any published artefact
  show it. A report lists all single-signer ratifications for later second review.
- Setting the mode to `dual` (default for any registry with two or more signers) restores the existing rule with no
  code change. Agents and `auto:` actors still can never sign, ratify, ingest or merge.
- **Drafting is never gated, and two-person is a hard rule for legal documents and policies** (owner, 2026-11-14).
  Agents draft them in every mode, solo included. An agent contract with `twoPerson` (implied by `professionalReview`)
  can only be ratified by a different person from the approver, in every mode. If no second registered signer exists
  it stays approved and unratified; it never falls back to solo.
- **Professional review is never solo.** Owner decision 2026-11-14: solo applies "unless it needs a registered lawyer,
  accountant or tax consultant to countersign it". An agent contract may set `professionalReview` (`attorney`,
  `accountant` or `tax_practitioner`). Such an artefact is only ratified by a different person registered in the signer
  registry with that profession; the owner cannot countersign it unless registered in it, and the solo `single-signer`
  path and the author-approves-own-work relaxation never apply. Registration numbers are recorded as text for the owner's
  own record; the platform does not validate or invent them. Which agents need this is OPQ-028 (default: legal agents need
  an attorney).
- This is a temporary relaxation of a control: record it in `docs/OPEN_QUESTIONS.md` against OPQ-017 and OPQ-019.

### 5.2 Autonomous agents across every department

- Add a **task queue** per department (typed task: department, agent, fixed inputs, due, priority). A standing order
  or a person enqueues; the runner dequeues. Reuse the existing runner, budgets-from-ledger, dry run and acceptance suite.
- Coverage audit: map the 16 departments to the 100 catalogue agents; every department gets at least one standing-order
  template that is *autonomy-eligible* (contract requires approval, no learner data). Gaps become new agents with the
  full contract (owner, purpose, data ceiling, budget, eval set >= 20 cases).
- Rules unchanged: drafts only; inputs fixed when the order is made; nothing from a trigger enters a prompt; one run at a
  time; failed acceptance quarantines the draft.
- Output path unchanged: IN_REVIEW, approve, countersign, ratify, ingest (library + Brain episode).

### 5.3 Ecosystem control plane

- **Read:** a new read-only, authenticated `GET /api/platform/ops/*` surface in the Ecosystem (Zod contract plus contract
  test, per its Definition of Done) exposing *aggregate, non-identifying* health only: version, CI/stage status,
  migrations applied, queue depth, tenant **counts** (never tenant or learner identifiers), gateway budget burn.
  Ops consumes it with a typed client; the existing GitHub reader stays as the fallback.
- **Act:** Ops never calls an Ecosystem write endpoint. Anything it wants changed becomes (a) a ratified issue via the
  existing gated publisher, or (b) a **draft PR** (5.4). Operational actions inside the Ecosystem (staff, approvals)
  stay in the Ecosystem's own UI behind Keycloak and its own approvals.
- Ops "Ecosystem" console: live status, open PRs/issues, stage gate, open questions, and "propose change".

### 5.4 Code changes: draft PRs only

- Agents and Claude sessions push to a feature branch and open a **draft** PR; they never push to `main` or merge.
- Both repos get `CODEOWNERS` naming the owner and branch protection: PR required, CI required, code-owner review
  required, no force-push. (Ecosystem has CODEOWNERS already; Ops does not.) **Branch protection is a repo setting the
  owner must switch on.**
- Ops "Code review" view lists draft PRs from both repos with CI state and a link; the merge button stays on GitHub.
- PR size and body rules follow the Ecosystem `CLAUDE.md` in both repos.

### 5.5 Brand

- `src/brand.ts` stays the single source. A script emits `brand.tokens.json` + CSS variables + a font manifest; the
  Ecosystem consumes a **generated, checked-in** `packages/design-system` token layer from it, and a drift test in each
  repo fails CI if they diverge (same pattern Ops already uses for its brand kit).
- Ecosystem re-skin: swap tokens and fonts (Space Grotesk / Inter / Space Mono), then audit every component for contrast
  on the dark palette (WCAG 2.2 AA), focus rings, charts, and the role surfaces; Playwright + axe tests updated.
  Brand rules carry over: tagline "EDUCATE - INNOVATE - TRANSFORM", no learner imagery.
- New dependency (fonts, if self-hosted) recorded in `docs/DEPENDENCIES.md` with licence (OFL).

### 5.6 Public marketing site

- `site/` in the Ops repo: static build (Vite) of the **Ecosystem Showcase** content, extracted from the in-app
  `EducationEcosystemWebsite` view and `src/data/educationEcosystemData.ts` into a data file plus pages: Home,
  Ecosystem (zones, Brain tiers, modules), Safety and POPIA, For schools, About, Contact.
- Every claim on the site is a ratified artefact: site copy is drafted by agents, goes through the Review Board, and only
  ratified text is built into the site. Unratified numbers render as nothing, never as a guess (`[UNSOURCED]` rule).
- No pricing page until D-1/OPQ-026 are confirmed; "request a demo" is a mailto to the brand address (no form, no tracking
  by default; any analytics is a separate decision).
- Deploy target: Cloudflare Pages (as the planning package recommends); deployment needs the owner's account and domain.

## 6. Delivery plan (each item is one or more draft PRs, <= ~400 lines each)

| Phase | Repo | Content | Done when |
|---|---|---|---|
| 0 | Ops | Signer registry + solo mode, OPQ-017/019 notes, CODEOWNERS, PR policy doc | Tests incl. 2 failure paths; ledger flags single-signer |
| 1 | Ops | Brand token export + drift test; brand docs | CI drift test green |
| 2 | Ecosystem | Token layer generated from brand; component re-skin; a11y/e2e updates | Ecosystem `pnpm verify:stage` and axe pass |
| 3 | Ops | Task queue + department coverage audit + new standing-order templates | Every department has an eligible template; runner tests |
| 4 | Ecosystem + Ops | `ops` read API + contract test; Ops Ecosystem console and Code Review view | Contract test; no identifiers in payload test |
| 5 | Ops | `site/` build from ratified content; a11y + Lighthouse; deploy config | Site builds from ratified data only |

## 7. Left to the builder

Task-queue schema and storage layout; exact re-auth mechanism in solo mode (OPS_USERS token re-entry is the minimum);
how to generate the font manifest; page copy drafts (they go through the Board); Lighthouse budgets; folder layout in `site/`.

## 8. Calls I made (check these)

1. The public site lives in the **Ops repo** (`site/`) because session access is limited to two repos.
2. Solo mode needs a **10-minute wait and re-authentication** between approve and countersign.
3. The Ecosystem's new API exposes **counts only**, never identifiers, to stay clear of OPQ-007.
4. **Cloudflare Pages** for hosting, from the planning package; not decided by the owner.
5. Ecosystem re-skin goes dark-first; any light mode is a follow-up.

## 9. Open items needing the owner (not guessed)

- Approve solo-signer mode (5.1).
- Enable branch protection and code-owner review on both repos (settings only the owner can change).
- Provide the domain, Cloudflare account, and confirm pricing/VAT status before any price is shown.
- Company registration and VAT numbers (brand letterhead blanks) for the site footer.
