# Phase 0: Signer registry and solo-signer mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One registered person can approve and then countersign their own agent output, only in an opt-in, visible, re-authenticated, time-delayed solo mode, with every such ratification flagged and reportable.

**Architecture:** Pure signing helpers live in `src/core/signing.ts` (shared by browser Platform and server). Env parsing and the report live in `src/server/signing.ts`. The server (`validate.ts`, `ledgerService.ts`, `finality.ts`) is authoritative; the Platform and Board UI mirror its rules. Default stays `dual` (today's behaviour) and nothing changes unless `OPS_SIGNING_MODE=solo`.

**Tech Stack:** TypeScript (strict), Express, React 19, Vitest. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-11-14-integrated-platform-design.md` (section 5.1). This is Phase 0 only; phases 1 to 5 get their own plans.

## Global Constraints

- Strict TypeScript: no `any`, no `@ts-ignore`. `npm run lint`, `npm test` and `npm run build` must pass before each PR.
- Default mode is `dual`. Solo is opt-in via `OPS_SIGNING_MODE=solo`; never default, never inferred.
- Solo wait default **10 minutes** (`OPS_SOLO_WAIT_MINUTES`, integer 1 to 1440). Measured by the **server clock** from the approval record's `at`.
- Re-authentication = the signer's own token sent in header `x-ops-reauth`, checked with `authenticate()`.
- Ledger/record marker is exactly `signing: "single-signer"`.
- Agents and `auto:` actors can never approve, countersign, ratify, ingest or merge. Not relaxed anywhere.
- An edit after approval still voids both signatures. A ratified artefact is still final.
- Owner decision 2026-11-14: "not in the beginning unless it needs a registered lawyer, accountant or tax consultant to countersign it." So in solo mode the `secondApprover` rule (approver must differ from author) is also relaxed, **except** for an artefact whose agent contract sets `professionalReview`. Those always need a countersigner who is a registered professional of that profession (`attorney`, `accountant` or `tax_practitioner`) and is a different person from the approver, in every mode. Solo never ratifies them, and the owner cannot countersign them unless the owner is registered in that profession.
- Owner clarification 2026-11-14: **drafting is never gated.** Agents draft legal documents and policies in every mode, including solo. **The two-person rule is a hard rule** for ratifying them: an agent contract with `twoPerson: true` (implied by `professionalReview`) needs a countersigner who is a *different person* from the approver in every mode; solo mode, the `single-signer` path and the author-approves-own-work relaxation never apply to it. If no second registered signer exists the artefact simply stays `APPROVED` (fails closed, never falls back to solo).
- Professional registration numbers are stored as free text for the owner's own record and are **not** validated or invented by the platform; the owner verifies them with the relevant body.
- No new dependency. Commit style: Conventional Commits, one logical change per commit. One PR per group below, each at most ~400 changed lines, opened as a **draft**; the owner reviews and merges.
- Unregistered setups (`OPS_SIGNERS` unset) behave exactly as today.

## Review Focus

- Wrong, missing or someone else's `x-ops-reauth` on a solo countersign: refuse 403, nothing written.
- Countersign attempted before the wait has elapsed (server clock, not a client-supplied time): refuse 409.
- Server restarted in `dual` after solo ratifications: those artefacts stay valid and can leave the platform; the flag is read from the record, not the current mode.
- A client forging `signing: "single-signer"` on a different-person countersign, or omitting it on a same-person one: refuse.
- `solo` with two or more signers, a signer not in `OPS_USERS`, or `OPS_SIGNING_MODE=solo` without `OPS_USERS`: the server refuses to start with a `FATAL`-style message.
- A signer scoped to one department approving or countersigning another department's artefact: refuse 403.
- A `professionalReview` artefact countersigned by the owner (no profession), by the wrong profession, by the same person who approved it, or in solo mode: refuse 403 every time.
- A `professionalReview` artefact ratified correctly by a registered professional: succeeds, carries no `single-signer` marker, and names the profession and registration text in the ledger detail.

---

## PR 1: Pure policy, registry parsing, Platform behaviour (Tasks 1 and 2)

### Task 1: Signing policy and registry parsing

**Files:**
- Create: `src/core/signing.ts`, `src/server/signing.ts`, `test/signing.test.ts`

**Interfaces:**
- Produces (`src/core/signing.ts`, no node imports):
  `export const SINGLE_SIGNER = 'single-signer' as const;`
  `export type SigningMode = 'solo' | 'dual';`
  `export interface SigningPolicy { mode: SigningMode; waitMs: number }`
  `export const DEFAULT_SIGNING: SigningPolicy` (`{ mode: 'dual', waitMs: 600_000 }`)
  `export function soloWaitRemainingMs(approvedAt: string, now: Date, policy: SigningPolicy): number` (0 when elapsed, never negative)
- Produces (`src/server/signing.ts`):
  `export interface Signer { id: string; name: string; scope: '*' | readonly string[]; profession?: Profession; registration?: string }`
  (`Profession` and `PROFESSIONS = ['attorney', 'accountant', 'tax_practitioner'] as const` are exported from `src/core/signing.ts`)
  `export interface SigningEnv { OPS_SIGNERS?: string; OPS_SIGNING_MODE?: string; OPS_SOLO_WAIT_MINUTES?: string }`
  `export function parseSigners(raw: string | undefined, auth: Auth, knownDepartments: readonly string[]): Signer[]`
  `export function parseSigningPolicy(env: SigningEnv, signers: readonly Signer[], auth: Auth): SigningPolicy`
  `export function maySignFor(signers: readonly Signer[], personId: string, department: string | undefined): boolean`
- Consumes: `Auth` from `src/server/auth.ts`.

`OPS_SIGNERS` format: entries separated by `;`, each `id|Display Name|scope` with two optional trailing fields `|profession|registration`. Scope is `*` or department ids joined by `+`. Examples: `sarah|Sarah-Jane Harding|*` and `lerato|Lerato Mokoena|legal|attorney|<registration text>`. A professional entry must have a department scope, never `*`.
  Also produced here: `maySignProfessional(signers: readonly Signer[], personId: string, required: Profession): boolean` (true only if that person is registered with exactly that profession).

- [ ] **Step 1: Write failing tests** in `test/signing.test.ts` (use `parseAuth({ OPS_USERS: 'sarah:<20+ char token>,dan:<token>' })` for `auth`):
  - `parseSigners` returns `[]` for undefined or empty (legacy: no registry).
  - parses `sarah|Sarah-Jane Harding|*` to `{ id: 'sarah', name: 'Sarah-Jane Harding', scope: '*' }`; parses `dan|Dan|finance+legal` to `scope: ['finance','legal']`.
  - throws on: unknown user id (not in `OPS_USERS`), duplicate id, unknown department, malformed entry, any entry when `auth.mode === 'open'`.
  - `parseSigningPolicy`: default `{ mode: 'dual', waitMs: 600000 }`; `solo` + exactly one signer gives `{ mode: 'solo', waitMs: 600000 }`; `OPS_SOLO_WAIT_MINUTES=15` gives `900000`.
  - throws on: `solo` with 0 or 2+ signers, `solo` with open auth, unknown mode string, wait outside 1 to 1440 or non-integer.
  - `maySignFor`: `'*'` scope allows any department and `undefined`; a department-scoped signer allows only its departments and refuses `undefined`; unlisted person refused.
  - `soloWaitRemainingMs('2026-11-14T10:00:00Z', new Date('2026-11-14T10:04:00Z'), policy)` is `360000`; at 10:10 and after it is `0`.
  - parses `lerato|Lerato Mokoena|legal|attorney|REG-TEXT` to `profession: 'attorney'`, `registration: 'REG-TEXT'`; throws on an unknown profession, a profession with scope `*`, or a profession with no registration text.
  - `maySignProfessional`: true for the matching profession only; false for the owner (no profession), for a different profession, and for an unknown person.
- [ ] **Step 2: Run** `npx vitest run test/signing.test.ts`. Expected: FAIL (modules missing).
- [ ] **Step 3: Implement** both files to the signatures above. Error messages start with `OPS_SIGNERS:` / `OPS_SIGNING_MODE:` like the existing `OPS_USERS:` ones.
- [ ] **Step 4: Run** the same command. Expected: PASS. Then `npm run lint`.
- [ ] **Step 5: Commit** `feat(signing): signer registry and solo-mode policy parsing`.

### Task 2: Platform allows a same-person countersign only in solo, after the wait

**Files:**
- Modify: `src/core/platform.ts` (`PlatformOptions`, `Artefact`, `countersign` at ~346-363), `src/core/types.ts` if `Artefact` fields are declared there
- Test: `test/lifecycle.test.ts` (add a `describe('solo signing')` block; reuse its `approved()` helper)

**Interfaces:**
- Consumes: `SigningPolicy`, `DEFAULT_SIGNING`, `SINGLE_SIGNER`, `soloWaitRemainingMs`.
- Produces: `PlatformOptions.signing?: SigningPolicy`; `Artefact.signing?: typeof SINGLE_SIGNER`; `Platform.countersign(artefactId, signer, note, agent?, now?: Date)`; the countersignature record and the `artefact.countersigned` / `artefact.ratified` ledger `detail` carry `signing: 'single-signer'` when the signer is the approver.

- [ ] **Step 1: Write failing tests** (`new Platform({ signing: { mode: 'solo', waitMs: 600000 } })`; approve as `dan`, then call `countersign(a.id, dan, '', plain, now)`):
  - dual (default): same person still refused with `'A different person from the approver must countersign.'` (existing test must keep passing).
  - solo, 11 minutes after `cur.at`: succeeds; result `status` is `INGESTED`, `signing` is `'single-signer'`, the `countersignatures` row and both ledger entries have `detail.signing === 'single-signer'`.
  - solo, 9 minutes after: refused with kind `hitl` and a message naming the minutes left; artefact stays `APPROVED`.
  - solo, different person countersigns: succeeds with **no** `signing` field anywhere.
  - solo, agent actor (`kind: 'agent'`) and `auto:x` actor: still refused.
  - solo, edit after approval returns the artefact to `DRAFT` with `approvedBy` cleared (existing behaviour unchanged).
- [ ] **Step 2: Run** `npx vitest run test/lifecycle.test.ts -t "solo signing"`. Expected: FAIL.
- [ ] **Step 3: Implement.** Store `policy` from options (default `DEFAULT_SIGNING`). In `countersign`, replace the same-person refusal with: refuse unless `policy.mode === 'solo'`; if solo, compute remaining wait from `cur.at` and `now ?? new Date()`, refuse if above 0; set `single = signer.id === cur.approvedBy` and add the marker where listed above.
- [ ] **Step 4: Run** `npx vitest run test/lifecycle.test.ts` and `npm run lint`. Expected: PASS, no type errors.
- [ ] **Step 5: Commit** `feat(board): solo countersign in the platform, flagged single-signer`.

### Task 2b: `professionalReview` on the agent contract, and the professional countersign

**Files:**
- Modify: `src/core/contract.ts` (add the field and a validity check, next to the existing C-codes at ~48-69), `src/departments/types.ts` (the `AgentContract` type), `src/core/platform.ts` (`decide` ~328-340 and `countersign`), the legal-department agents' contract data
- Test: `test/contracts.test.ts` and `test/lifecycle.test.ts`

**Interfaces:**
- Consumes: `Profession`, `PROFESSIONS`.
- Produces: `AgentContract.professionalReview?: Profession; AgentContract.twoPerson?: true` and `export const requiresTwoPerson = (a: { twoPerson?: boolean; professionalReview?: Profession }): boolean` in `src/core/signing.ts` (true when either is set); `PlatformOptions.signers?: readonly { id: string; profession?: Profession }[]` (the browser Platform needs only who holds which profession; the server remains authoritative); `countersign` records `profession` on the countersignature row and in both ledger `detail`s when `professionalReview` applies.

- [ ] **Step 1: Write failing tests**:
  - contract check: a contract with `professionalReview: 'barrister'` fails with a new code `C9`; each of the three valid values passes; absent passes.
  - platform, an agent with `professionalReview: 'attorney'`, `signers` includes `lerato` (attorney): the owner approves, then `countersign` by the owner is refused (`hitl`), also in solo after the wait; `countersign` by `lerato` succeeds, status `INGESTED`, **no** `signing` marker, and `detail.profession === 'attorney'`; `lerato` approving then countersigning herself is refused.
  - platform, solo, agent with `secondApprover: true` and **no** `professionalReview`: the author approving their own run succeeds and the artefact carries `signing: 'single-signer'`; in dual it is still refused (existing test unchanged).
  - platform, solo, `professionalReview` agent, author approves own run: refused (the `secondApprover` relaxation does not apply).
  - drafting is open: in solo mode a legal-department agent runs and submits for review normally (`runAgent` and `submitForReview` succeed, status `IN_REVIEW`).
  - `twoPerson: true` agent (no profession), solo, one registered signer: the owner approves, and `countersign` by the owner is refused even after the wait; a second registered signer (no profession) countersigns and it ratifies with no `single-signer` marker; with only the owner registered the artefact stays `APPROVED` after every attempt.
- [ ] **Step 2: Run** `npx vitest run test/contracts.test.ts test/lifecycle.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Default mapping (my call, to confirm in OPQ-028): every agent whose department is `legal` (OPS-LEG-01 to 05) gets `professionalReview: 'attorney'`; OPS-SEC-01 (POPIA conditions assessment) and OPS-PPL-04 (offer and contract checklist) get `twoPerson: true`. No other agent is gated until the owner decides. `solo` with exactly one signer means a `twoPerson` artefact can be drafted and approved but not ratified until a second signer is registered. Library documents are seeded and already immutable; their `review` text is not changed here.
- [ ] **Step 4: Run** the same command plus `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(contracts): professionalReview and professional countersign`.

---

## PR 2: Server authority (Tasks 3 and 4)

### Task 3: validate.ts, ledgerService.ts and finality.ts enforce the policy

**Files:**
- Modify: `src/server/validate.ts` (`AppendCtx`, APPROVED and RATIFIED branches ~112-127), `src/server/ledgerService.ts` (~55), `src/server/finality.ts`
- Test: `test/signing-server.test.ts` (reuse the harness style of `test/lifecycle.test.ts`: `validateAppend`, `appendLedger`, `MemoryAdapter`)

**Interfaces:**
- Consumes: `Signer`, `maySignFor`, `SigningPolicy`, `soloWaitRemainingMs`, `SINGLE_SIGNER`.
- Produces: `AppendCtx` gains `signing?: SigningPolicy; signers?: readonly Signer[]; reauthed?: boolean; now?: Date`. `ratifiedProblem(store: ReadStore, art: Rec | undefined): string | null` keeps its signature; it now accepts equal signers only when `art.signing === 'single-signer'` and a matching approval and countersignature exist.

- [ ] **Step 1: Write failing tests**, each asserting `Rejected` with the given `status`:
  - registry set, approver not a signer: 403; signer scoped to `finance` approving a `legal`-department agent's artefact: 403; custom agent (no department) needs a `'*'` signer.
  - same-person RATIFIED append in `dual`: 403 (existing message).
  - solo, same person, `reauthed: false`: 403; `reauthed: true` but wait not elapsed (`now` = approval `at` + 9 minutes): 409; elapsed + reauthed + `signing: 'single-signer'`: accepted.
  - solo, same person, record **missing** `signing`: 400; different person **with** `signing`: 400.
  - `appendLedger` for `artefact.countersigned` with `detail.signing` that differs from the artefact's `signing`: 409.
  - `twoPerson: true` agent in solo: RATIFIED append by the approver: 403; by a different registered signer: accepted; a `single-signer` marker on it: 400.
  - `professionalReview: 'attorney'` agent: RATIFIED append by the owner: 403; by a signer registered as `accountant`: 403; by the approver even if registered as attorney: 403; by a different registered attorney whose scope covers the department: accepted with no `signing` field and `profession` recorded; in solo mode the same results (solo never applies).
  - solo, `secondApprover` agent without `professionalReview`, approver equals author: accepted and the record carries `signing: 'single-signer'`; without the marker: 400; in dual: 403.
  - `ratifiedProblem` on a `professionalReview` artefact rejects a record flagged `single-signer`.
  - `ratifiedProblem`: flagged single-signer artefact with both records passes (even when mode is now dual); unflagged equal signers fails; flag without a recorded approval and countersignature fails.
- [ ] **Step 2: Run** `npx vitest run test/signing-server.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement** the checks. Order in the RATIFIED branch: registry scope, then (if signer equals approver) mode, reauth, wait, flag consistency; keep existing checks. Registry scope also applies in the APPROVED branch. When `ctx.signers` is empty or undefined the registry check is skipped (legacy).
- [ ] **Step 4: Run** `npx vitest run` (whole suite) and `npm run lint`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(signing): server enforces registry, reauth, wait and the single-signer marker`.

### Task 4: server.ts wiring, startup checks, whoami

**Files:**
- Modify: `server.ts` (parse near `parseAuth` at ~37 and `parseRoles` at ~76; warehouse route ~224; `/api/whoami` ~149), `.env.example`
- Test: `test/server.test.ts` (existing end-to-end harness)

**Interfaces:**
- Consumes: Task 1 parsers, Task 3 context fields.
- Produces: `GET /api/whoami` returns `{ actor, mode, signing: { mode: 'solo' | 'dual', waitMinutes: number }, signer: boolean }`. Warehouse append passes `reauthed = authenticate(auth, req.header('x-ops-reauth')) === actorOf(res)` (false when open mode) plus `signing`, `signers`.

- [ ] **Step 1: Write failing tests**: whoami in default config returns `signing.mode === 'dual'` and `signer === false`; with solo config and the right header the countersign append succeeds, with a wrong or missing header it returns 403; each bad-config case from Review Focus makes startup throw (test the parse step, not a real process).
- [ ] **Step 2: Run** `npx vitest run test/server.test.ts -t "signing"`. Expected: FAIL.
- [ ] **Step 3: Implement** the wiring; startup errors follow the existing `FATAL:` handling. Add `OPS_SIGNERS`, `OPS_SIGNING_MODE`, `OPS_SOLO_WAIT_MINUTES` to `.env.example` as names with empty values (no secrets).
- [ ] **Step 4: Run** `npx vitest run` and `npm run lint` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(server): wire signer registry and signing mode, whoami reports them`.

---

## PR 3: Board UI and report (Tasks 5 and 6)

### Task 5: Board shows the mode, asks for re-authentication, marks single-signer

**Files:**
- Modify: `src/core/api.ts` (add `withReauth`), `src/ui/store.tsx` (read `signing` and `signer` from whoami, ~78), `src/ui/Board.tsx` (`can()` ~22-27, countersign button ~104, status text ~83)
- Test: `test/app-contract.test.ts` and a new `test/board-gate.test.ts` for `can()` (export it)

**Interfaces:**
- Produces: `export function withReauth<T>(token: string, fn: () => Promise<T>): Promise<T>` (sends `x-ops-reauth` on every `apiFetch` made inside `fn`, then clears it, including on error); `export function can(a: Artefact, me: string, signing: SigningPolicy)`.

- [ ] **Step 1: Write failing tests**: `can()` for an APPROVED artefact you approved: `{ ok: false }` in dual; in solo `{ ok: false, why }` while waiting (mentions minutes left) and `{ ok: true }` after; `withReauth` sets the header only during `fn` and clears it when `fn` throws.
- [ ] **Step 2: Run** `npx vitest run test/board-gate.test.ts`. Expected: FAIL.
- [ ] **Step 3: Implement.** Board shows a banner when mode is solo: "Solo signing is on. You approve, then countersign after N minutes with your token. Every such ratification is flagged." The countersign button asks for the token in a password input only when you are the approver, and wraps the call in `withReauth`. Ratified items show a **single-signer** badge.
- [ ] **Step 4: Run** `npx vitest run` and `npm run lint` and `npm run build`. Expected: PASS.
- [ ] **Step 5: Commit** `feat(ui): solo signing banner, token prompt and single-signer badge`.

### Task 6: Single-signer report

**Files:**
- Modify: `src/server/signing.ts` (add report), `server.ts` (route), `src/ui/Board.tsx` (small table)
- Test: `test/signing.test.ts`

**Interfaces:**
- Produces: `export function singleSignerReport(store: ReadStore): { count: number; items: { artefactId: string; title: string; agentId: string; signer: string; ratifiedAt: string; docHash: string }[] }`; `GET /api/signing/report` returns it (any signed-in person; read-only).

- [ ] **Step 1: Write failing tests**: empty store gives `{ count: 0, items: [] }`; two ratified (one flagged, one two-person) lists only the flagged; an artefact that was later revised lists the original once (latest version per id only).
- [ ] **Step 2: Run** `npx vitest run test/signing.test.ts -t "report"`. Expected: FAIL.
- [ ] **Step 3: Implement** the function, route and a "Single-signer ratifications (for second review)" table on the Board.
- [ ] **Step 4: Run** `npx vitest run`, lint and build. Expected: PASS.
- [ ] **Step 5: Commit** `feat(signing): report of single-signer ratifications`.

---

## PR 4: Governance and docs (Task 7)

### Task 7: Docs, CODEOWNERS, PR policy, design corrections

**Files:**
- Create: `.github/CODEOWNERS`, `docs/PR_POLICY.md`
- Modify: `docs/REVIEW_BOARD.md`, `docs/OPEN_QUESTIONS.md` (OPQ-017, OPQ-019 notes plus new OPQ-027), `docs/superpowers/specs/2026-11-14-integrated-platform-design.md` (sections 5.6, 8, 9), `README.md` env list, `docs/BUILD_LOG.md`
- Test: `test/docs.test.ts` asserting `.env.example` names every `OPS_SIGNING*`/`OPS_SOLO*`/`OPS_SIGNERS` key and `.github/CODEOWNERS` exists and names `@Sarah-JaneHarding`.

- [ ] **Step 1: Write the failing docs test** above.
- [ ] **Step 2: Run** `npx vitest run test/docs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the docs.**
  - `CODEOWNERS`: `* @Sarah-JaneHarding`.
  - `PR_POLICY.md`: draft PR only, owner reviews, no agent merges, CI green, size and body rules from the Ecosystem `CLAUDE.md`.
  - `REVIEW_BOARD.md`: add the solo section (what it is, the wait, the token, the flag, how to return to dual by adding a second signer and removing `OPS_SIGNING_MODE=solo`).
  - `OPEN_QUESTIONS.md`: record the temporary relaxation against OPQ-017 and OPQ-019 (owner approved on 2026-11-14), and **OPQ-027**: GitHub does not let a PR author approve their own PR; PRs opened through the owner's account cannot satisfy "require code-owner review" without admin bypass or a separate bot identity. Owner to decide.
  - `OPEN_QUESTIONS.md` **OPQ-028**: which agents beyond `legal` need a registered attorney, accountant or tax practitioner to countersign (finance, tax, contracts, procurement)? Who are those professionals and how will the owner verify their registration? Default until answered: legal-department agents need an attorney (OPS-LEG-01 to 05); OPS-SEC-01 and OPS-PPL-04 are `twoPerson` (any different registered signer); nothing else is gated. Candidates the owner may add: finance, tax and procurement agents, and the policy documents in the library. Library `review` text names the reviewer for 65 of 120 documents (about 44 an attorney, 4 a registered tax practitioner or the accountant); those drafts are not yet gated by the platform.
  - Design doc section 5.1: add the professional-review rule. Hosting: **IONOS** (not Cloudflare Pages); payments not finalised so no pricing page and no price anywhere; company and VAT numbers not yet available, so footers omit them rather than invent them.
- [ ] **Step 4: Run** `npx vitest run`, lint and build. Expected: PASS.
- [ ] **Step 5: Commit** `docs: solo signing, PR policy, CODEOWNERS, design corrections (IONOS, no prices)`.

## Self-review

- Spec 5.1 coverage: registry (Tasks 1, 3, 4), opt-in visible mode (4, 5), two separate actions with re-auth and wait (2, 3, 5), `single-signer` flag (2, 3), report (6), return to dual (1, 7), OPEN_QUESTIONS note (7), agents never sign (2, 3 tests). Hosting/pricing/registration-number corrections (7).
- Names are consistent across tasks: `SigningPolicy`, `Signer`, `SINGLE_SIGNER`, `soloWaitRemainingMs`, `maySignFor`, `withReauth`, header `x-ops-reauth`.
- Owner's rule (solo unless a registered lawyer, accountant or tax consultant must countersign): Task 2b (contract field, platform), Task 3 (server), Task 1 (registry and `maySignProfessional`), Task 7 (OPQ-028). The `secondApprover` relaxation is in Tasks 2b and 3.
- Open for the owner: which agents beyond legal need a professional (OPQ-028), who the professionals are, and how their registration is verified. The platform stores registration text but cannot check it.
