# Phase 3: Task Queue and Department Coverage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Every one of the 16 departments has a ready standing-order template, and work can be queued per department (by a person, a schedule or a GitHub event) and run in priority order, still as drafts that a named person must approve, countersign and ratify.

**Architecture:** The existing autonomy runner, acceptance suite, budgets-from-ledger and dry run are reused unchanged. A task is a queued instance of an ACTIVE standing order (so the two-person activation of the order still gates everything). Schedule and event triggers enqueue a task instead of running directly; one drain step takes tasks in priority, due, then arrival order and runs them one at a time through the existing `startRun`. A person who asks "run now" still runs immediately, outside the queue.

**Tech Stack:** TypeScript (strict), Express, Vitest, JSON-lines warehouse store (`LedgerStore`), no new dependency.

**Spec:** `docs/superpowers/specs/2026-11-14-integrated-platform-design.md` section 5.2 and the Phase 3 row of section 6.

## Audit finding (measured, not assumed)

Run on 2026-11-15 over `DEPARTMENTS`: all 100 registered agents across all 16 departments have `requiresApproval: true` and `dataClass !== 'learner'`, so every one is already **eligible** under `parseProposal`. Spec 5.2's "gaps become new agents" therefore does not arise at the contract level: **no new agent is needed.** The real gaps are (1) there is no standing-order template for any department, and (2) there is no queue. The one agent with no required input is `OPS-AI-01`; every other agent needs a person to type its inputs once when the order is made.

## Global Constraints

- Drafts only. Nothing in this phase may approve, countersign, ratify or ingest; `auto:` actors can never sign (existing server rule, unchanged).
- Nothing from a trigger or a task row is ever put into a prompt. Task text fields are limited to those listed in Task 2.
- A task runs only under an order whose status is `ACTIVE` at the moment it starts. Pausing or revoking an order stops its queued tasks (they are cancelled with the order's reason).
- Budgets are counted from the ledger exactly as today (`autonomy.started`); a queued task that cannot start because a budget is used up stays `QUEUED`, it is never run over budget.
- One run at a time (the existing `exclusive` chain). The queue adds no second path to a run.
- `OPS_AUTONOMY=off` still means nothing runs; tasks may be queued but the drain does nothing.
- No prices, no invented figures, no registration numbers in any template or doc.
- Strict TypeScript, no `any`, no new dependency, ledger actions under `autonomy.` (already server-only via `SERVER_ONLY_ACTIONS`).
- New collection `autonomy_tasks` is server-only (absent from `CLIENT_COLLECTIONS`, so a client write returns 404) and added to `NEVER_MODEL_READABLE`.
- Docs for each change are updated in the same commit (`docs/AUTONOMY.md`, `docs/AGENT_CATALOGUE.md`, `docs/BUILD_LOG.md`, `docs/OPEN_QUESTIONS.md`).

## Rulings made in this plan (the owner can overturn any of them)

1. **Templates pre-select, they never pre-fill inputs.** A template fixes the agent, a suggested name, trigger and run budget, and a one-line reason. The person still types the agent's inputs, because a standing order's inputs are the facts a person vouches for, and "never invent curriculum policy or numbers" applies to a template as much as to an agent. Cost if wrong: one extra form step.
2. **One template per department, chosen for stable inputs, and never a `twoPerson` or `professionalReview` agent.** Those agents' drafts cannot be ratified in solo mode (OPQ-033), so a default template that produced them would only fill the Board with drafts nobody can finish. Cost if wrong: legal and security have a template for a less sensitive agent only.
3. **A task inherits the order's inputs.** It carries no free text of its own. Exception, ruling 4.
4. **Per-task inputs only when the order allows it.** A new optional order field `allowTaskInputs` (default `false`) is set by the proposer, seen by the activator, and fixed in the order's version. Only when it is `true` may a person enqueue a task with its own `inputs`, validated with the same rules as an order's inputs (no personal data, no learner identifiers, no injection, own fields only) and fixed at enqueue time. Schedule and event tasks never carry their own inputs. Cost if wrong: an order whose facts go stale can only be refreshed by proposing a new order. Owner decision recorded as OPQ-038.
5. **Run now stays immediate** and is not queued.
6. **Any signed-in person may enqueue or cancel a task**, as any may pause an order today (OPQ-002 role model still open; recorded as OPQ-037).
7. **A task blocked only by a budget waits.** It stays `QUEUED` and is retried on every drain; it becomes `EXPIRED` 7 days after its due time. A run that fails or is quarantined is final (`FAILED` or `QUARANTINED`); nothing retries it automatically.
8. **Monthly schedules do not exist** (triggers are daily or weekly). Month-based agents get a weekly template and the doc says so; adding monthly triggers is out of scope.

## Review Focus

1. A schedule slot or event arrives while an earlier task for the same slot is still `QUEUED` (budget used up): it must not enqueue a second task. Test: dedupe key.
2. The order is paused or revoked while its task is `QUEUED` or about to start: the task must not run. Test in Task 3.
3. The server restarts while a task is `RUNNING`: on the next drain it must not run twice and must not stay `RUNNING` forever. It is marked `FAILED` with a note, and the ledger's `autonomy.started` count still governs the budget.
4. A task with a due date in the past, or one far in the future, or an invalid priority: refused with a message that names the field. Test in Task 2.
5. A person enqueues a task with its own inputs on an order that does not allow it, or with inputs containing an email address or injection text: refused, nothing stored. Test in Task 3.

---

## File structure

- Create `src/departments/orderTemplates.ts`: the templates (plain data, no server imports).
- Create `src/server/autonomy/tasks.ts`: `Task` type, `parseEnqueue`, `compareTasks`, constants.
- Modify `src/server/autonomy/orders.ts`: add `allowTaskInputs` to `Proposal` and `StandingOrder`; export the input-validation part of `parseProposal` as `parseInputs(agent, given)` so tasks reuse it.
- Modify `src/server/autonomy/service.ts`: task storage, `enqueue`, `cancelTask`, `drain`, and triggers that enqueue; order pause or revoke cancels queued tasks.
- Modify `src/server/autonomyRoutes.ts` and `server.ts`: routes and the drain on the existing minute tick.
- Modify `src/server/models/rules.ts`: add `autonomy_tasks` to `NEVER_MODEL_READABLE`.
- Modify `src/ui/Autonomy.tsx`: "Use a template" and a department task queue panel.
- Tests: `test/order-templates.test.ts`, `test/autonomy-tasks.test.ts`, `test/autonomy-queue.test.ts`, additions to `test/models-rules.test.ts` and `test/server.test.ts`.
- Docs: `docs/AUTONOMY.md`, `docs/AGENT_CATALOGUE.md`, `docs/BUILD_LOG.md`, `docs/OPEN_QUESTIONS.md`.

---

### Task 1: Standing-order templates and the coverage gate

**Files:**
- Create: `src/departments/orderTemplates.ts`
- Test: `test/order-templates.test.ts`
- Modify: `docs/AGENT_CATALOGUE.md`, `docs/AUTONOMY.md`, `docs/BUILD_LOG.md`

**Interfaces:**
- Consumes: `DEPARTMENTS`, `agentById` from `src/departments`; `parseProposal` from `src/server/autonomy/orders`; `makeRunner(...).dryRun` from `src/server/autonomy/runner`.
- Produces:
  ```ts
  export type TemplateTrigger =
    | { kind: 'schedule'; every: 'daily'; hourUtc: number }
    | { kind: 'schedule'; every: 'weekly'; weekday: number; hourUtc: number }
    | { kind: 'request' };
  export interface OrderTemplate { id: string; dept: string; agentId: string; name: string; trigger: TemplateTrigger; maxRunsPerDay: number; why: string }
  export const ORDER_TEMPLATES: readonly OrderTemplate[];
  export const templatesFor: (dept: string) => OrderTemplate[];
  ```

- [ ] **Step 1: Write the failing tests** in `test/order-templates.test.ts`:
  - `every department has at least one template`: `DEPARTMENTS.every((d) => templatesFor(d.id).length >= 1)`.
  - `every template names a real agent in its own department that parseProposal admits`: build a proposal from the template plus a neutral fixture fill (required `text`/`longtext` fields get `'Routine review of the standard process'`, `number` fields `'5'`, `select` fields their first option) and expect `parseProposal` not to throw.
  - `no template uses a twoPerson or professionalReview agent` (ruling 2): `agentById(t.agentId)` has neither field.
  - `template ids are unique and names are 3 to 80 characters with no digits that look like prices`: assert uniqueness and `!/\bR\s?\d/.test(t.name + t.why)`.
  - `every template's dry run passes the acceptance suite`: use `makeRunner({ store, appendValidated, facts })` with an in-memory `LedgerStore` stub as in `test/autonomy-runner.test.ts`, call `dryRun` with the fixture proposal and expect `passed === true`.
  - Failure paths: a templates list with a department removed fails the coverage assertion (write the check as a pure function `uncovered(templates, departments)` exported from the test helper in the same file and assert it returns `['legal']` for a list without legal); a template naming `OPS-LEG-01` is flagged by the same rule function that powers the two-person test.

- [ ] **Step 2: Run** `npx vitest run test/order-templates.test.ts`. Expected: FAIL, module not found.

- [ ] **Step 3: Create `orderTemplates.ts`** with exactly these picks (agent, trigger, one-line `why`; each `why` says what recurs and that a person still supplies the inputs). `weekday` 1 is Monday.

  | Dept | Agent | Trigger | Runs/day |
  |---|---|---|---|
  | executive | OPS-EXEC-01 Board update pack | weekly Monday 06 | 1 |
  | product | OPS-PROD-04 Release readiness checklist | weekly Friday 12 | 1 |
  | curriculum | OPS-CURR-02 Backward-design unit planner | weekly Monday 05 | 1 |
  | ai | OPS-AI-01 Agent roster reconciliation (no inputs needed) | weekly Monday 05 | 1 |
  | security | OPS-SEC-05 Access review | weekly Monday 05 | 1 |
  | legal | OPS-LEG-06 Obligation and renewal register | weekly Monday 05 | 1 |
  | finance | OPS-FIN-04 Month-end close checklist (weekly: no monthly trigger exists) | weekly Monday 06 | 1 |
  | sales | OPS-SALES-04 Pipeline review | weekly Monday 06 | 1 |
  | marketing | OPS-MKT-04 Content calendar builder | weekly Monday 06 | 1 |
  | success | OPS-CS-02 Quarterly business review | weekly Monday 06 | 1 |
  | support | OPS-SUP-06 Ticket trend review | weekly Monday 06 | 1 |
  | government | OPS-GOV-06 Funding pipeline review | weekly Monday 06 | 1 |
  | people | OPS-PPL-06 Staff development plan | weekly Monday 06 | 1 |
  | devops | OPS-SRE-04 Backup and restore test record | weekly Monday 05 | 1 |
  | procurement | OPS-PRO-03 Supplier review | weekly Monday 06 | 1 |
  | research | OPS-RES-06 Evidence claims register | weekly Monday 06 | 1 |

  If a named agent turns out to be `twoPerson`, `professionalReview` or to fail its dry run, pick another agent in the same department and record the swap as a `Ruling:` in the ledger; do not weaken the tests.

- [ ] **Step 4: Run** `npx vitest run test/order-templates.test.ts`. Expected: PASS.

- [ ] **Step 5: Docs.** `docs/AGENT_CATALOGUE.md`: add a "Standing-order templates" section with the table above and the audit finding. `docs/AUTONOMY.md`: one paragraph "Templates pre-select an agent and a trigger; the person still types the inputs" and the monthly limitation. `docs/BUILD_LOG.md`: entry with the audit numbers. Run `npm test` and `npx tsc --noEmit`.

- [ ] **Step 6: Commit** `feat(autonomy): a standing-order template for every department`.

---

### Task 2: Task type, parsing and ordering (pure)

**Files:**
- Create: `src/server/autonomy/tasks.ts`
- Modify: `src/server/autonomy/orders.ts` (export `parseInputs`, add `allowTaskInputs`)
- Test: `test/autonomy-tasks.test.ts`; extend the order tests in `test/autonomy-service.test.ts` for `allowTaskInputs`

**Interfaces:**
- Consumes: `agentById`, `OrderRefused`, `detectPii`, `detectInjection`.
- Produces:
  ```ts
  export type TaskStatus = 'QUEUED' | 'RUNNING' | 'SUBMITTED' | 'QUARANTINED' | 'FAILED' | 'CANCELLED' | 'EXPIRED';
  export type TaskOrigin = { kind: 'person'; by: string } | { kind: 'schedule'; slot: string } | { kind: 'event'; event: string };
  export interface Task {
    id: string; orderId: string; agentId: string; dept: string;
    priority: 1 | 2 | 3;            // 1 is most urgent
    due: string;                    // ISO time
    inputs?: Record<string, string>; // only when the order allowed task inputs and a person enqueued it
    origin: TaskOrigin; dedupeKey?: string;
    status: TaskStatus; note?: string; artefactId?: string;
    version: number; at: string;
  }
  export const TASK_EXPIRY_MS: number;               // 7 days
  export const MAX_QUEUED_PER_ORDER: number;         // 10
  export interface EnqueueRequest { orderId: string; priority: 1 | 2 | 3; due: string; inputs?: Record<string, string> }
  export function parseEnqueue(body: unknown, now: Date): EnqueueRequest;   // throws OrderRefused
  export const compareTasks: (a: Task, b: Task) => number;                  // priority, then due, then at
  export function parseInputs(agent: AgentContract, given: unknown): Record<string, string>;  // in orders.ts, throws OrderRefused
  ```

- [ ] **Step 1: Write the failing tests.**
  - `parseEnqueue accepts priority 1 to 3 and an ISO due time within 90 days` (happy path).
  - Refusals, each with status 400 and a message naming the field: priority `0`, `4`, `1.5`, `'high'`; `due` missing, `'tomorrow'`, `'2026-02-30T00:00:00Z'`, more than 90 days ahead; due earlier than `now - 1 day`.
  - `compareTasks orders by priority, then earlier due, then earlier arrival` with three fixtures; a stable sort over 50 shuffled tasks equals the expected order.
  - `parseInputs` refuses an unknown key, an email address (422), a learner identifier (422), injection text (422), over 1000 characters (400), a missing required field (400); accepts a valid set. Existing `parseProposal` tests must still pass unchanged (it now calls `parseInputs`).
  - `parseProposal` accepts `allowTaskInputs: true` and defaults it to `false`; refuses a non-boolean (400).

- [ ] **Step 2: Run** the new test file. Expected: FAIL.

- [ ] **Step 3: Implement** the types and functions above. `parseInputs` is the existing loop in `parseProposal` moved out unchanged (same messages, same status codes); `parseProposal` calls it. Add `allowTaskInputs: boolean` to `Proposal` and an optional `allowTaskInputs?: boolean` to `StandingOrder` (absent means `false`, so existing stored orders stay valid).

- [ ] **Step 4: Run** `npx vitest run test/autonomy-tasks.test.ts test/autonomy-service.test.ts`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(autonomy): the task type, its parsing and its ordering`.

---

### Task 3: The queue in the service (enqueue, drain, cancel, triggers)

**Files:**
- Modify: `src/server/autonomy/service.ts`, `src/server/models/rules.ts`
- Test: `test/autonomy-queue.test.ts`; add `autonomy_tasks` to the lists in `test/models-rules.test.ts` and `test/server.test.ts` (404 for client writes)

**Interfaces:**
- Consumes: Task 2's `Task`, `parseEnqueue`, `compareTasks`, `TASK_EXPIRY_MS`, `MAX_QUEUED_PER_ORDER`, `parseInputs`; existing `startRun`, `exclusive`, `audit`, `since`.
- Produces on `AutonomyService`:
  ```ts
  enqueue(actor: string | null, body: unknown): Promise<Task>;     // person; order must be ACTIVE
  cancelTask(actor: string | null, id: string, reason: string): Promise<Task>;
  drain(now?: Date): Promise<RunOutcome[]>;                         // runs ready tasks one at a time
  tasks(filter?: { dept?: string; status?: TaskStatus }): Task[];   // latest version of each, in compareTasks order
  ```
  `status()` gains `queue: { queued: number; byDept: Record<string, number> }`. `tick()` and `onEvent()` now call a private `enqueueFromTrigger(order, origin)` then `drain()` instead of `startRun`. Ledger actions: `autonomy.task.queued`, `autonomy.task.cancelled`, `autonomy.task.expired`. Runs still write `autonomy.started`, `autonomy.submitted`, `autonomy.quarantined`, `autonomy.failed` with the task id added to `detail`.

- [ ] **Step 1: Write the failing tests** (use the `setup()` helper pattern of `test/autonomy-service.test.ts`: stub runner, in-memory store, injected clock):
  - Happy path: a person enqueues two tasks (priority 2 then priority 1) on an active order; `drain()` runs the priority 1 task first, then the other; both end `SUBMITTED`, each with an `autonomy.started` ledger row, and `status().queue.queued` is 0.
  - `enqueue` refuses: no person (403), an `auto:` actor (403), unknown order (404), an order that is `PROPOSED`, `PAUSED` or `REVOKED` (409), more than `MAX_QUEUED_PER_ORDER` queued tasks (429), `inputs` when the order does not allow them (422) and inputs with an email address on an order that does (422); nothing is stored after any refusal.
  - Per-task inputs: on an order with `allowTaskInputs: true` the task's inputs reach `runner.run` (assert the order object passed has those inputs and the order itself is unchanged in the store).
  - Review Focus 1: a schedule slot due while an earlier task for the same `dedupeKey` is `QUEUED` enqueues nothing; an event inside the cooldown enqueues nothing; a second tick in the same minute enqueues nothing.
  - Review Focus 2: pause the order while a task is `QUEUED` and the task is `CANCELLED` with the reason (and revoke likewise); an order paused between enqueue and drain does not run and the task ends `CANCELLED`.
  - Budgets: with the order's `maxRunsPerDay` of 1 and two queued tasks, the first runs and the second stays `QUEUED`; the next day's drain runs it; with the platform cap used up nothing runs; a task still `QUEUED` 7 days after its due time becomes `EXPIRED` with an `autonomy.task.expired` row.
  - Review Focus 3: a task left `RUNNING` by a crash (seed the store) is marked `FAILED` with a note on the next drain and the runner is not called for it again; `autonomy.started` counts are unchanged.
  - Runner failure: `runner.run` throws, so the task is `FAILED` and the next task still runs; a quarantined outcome gives `QUARANTINED`; neither is retried.
  - `OPS_AUTONOMY` off: `enqueue` still stores a task, `drain` runs nothing and returns `[]`.
  - Run now (`runNow`) still runs immediately and does not create a task.
  - `autonomy_tasks` is in `NEVER_MODEL_READABLE`, and a client `POST /api/warehouse/autonomy_tasks` returns 404.

- [ ] **Step 2: Run** `npx vitest run test/autonomy-queue.test.ts`. Expected: FAIL.

- [ ] **Step 3: Implement** the four methods and the trigger changes in `service.ts`. Approach: tasks are append-only versioned rows in `autonomy_tasks` (latest version per `id` wins, as for `standing_orders`); `drain` runs inside `exclusive`, first expires and fails stale tasks, then takes the head of the ready list (`QUEUED`, order `ACTIVE`, sorted by `compareTasks`) one at a time, marking it `RUNNING` before calling the existing `startRun` and mapping its outcome to a final status; a `429` from `startRun` puts the task back to `QUEUED` and stops the drain for that order only. `stop()` (pause or revoke) cancels the order's `QUEUED` tasks in the same call. Task rows never contain text beyond the fields in `Task`.

- [ ] **Step 4: Run** the new file, `test/autonomy-service.test.ts`, `test/autonomy-runner.test.ts`, `test/models-rules.test.ts`, `test/server.test.ts`. Expected: PASS. Then `npm test` and `npx tsc --noEmit`.

- [ ] **Step 5: Commit** `feat(autonomy): a per-department task queue that triggers feed and one drain runs`.

---

### Task 4: Routes, wiring and the contract test

**Files:**
- Modify: `src/server/autonomyRoutes.ts`, `server.ts`
- Test: add to `test/server.test.ts` (end-to-end, as the existing autonomy cases do)

**Interfaces:**
- Consumes: Task 3's service methods.
- Produces HTTP, all behind the existing `/api` auth and, like the other autonomy routes, with a `403` for open dev mode:
  - `GET /api/autonomy/tasks?dept=&status=` returns `{ tasks: Task[] }`.
  - `POST /api/autonomy/tasks` body `{ orderId, priority, due, inputs? }` returns the `Task`.
  - `POST /api/autonomy/tasks/:id/cancel` body `{ reason }` returns the `Task`.
  The minute `setInterval` calls `autonomy.tick()` (which now drains); no new timer.

- [ ] **Step 1: Write the failing end-to-end tests:** a signed-in person enqueues, lists by department and cancels; the response shape has exactly the keys of `Task` (contract assertion, no extra keys such as `inputs` unless allowed); no token gives 401; open dev mode gives 403; an `auto:` token cannot enqueue; a draft produced from a queued task still needs two different people (or solo rules) to ratify, asserted by trying to ratify as the runner actor and getting 403.

- [ ] **Step 2: Run** `npx vitest run test/server.test.ts -t "task queue"`. Expected: FAIL.

- [ ] **Step 3: Implement** the three routes with the existing `wrap` error handling and mount nothing new in `server.ts` beyond what the router needs.

- [ ] **Step 4: Run** the full suite, `npx tsc --noEmit`, `npm run build`. Expected: PASS.

- [ ] **Step 5: Commit** `feat(autonomy): task queue routes`.

---

### Task 5: The Autonomous Agents screen

**Files:**
- Modify: `src/ui/Autonomy.tsx` (and `src/core/api.ts` only if a typed helper already exists for the autonomy calls)
- Test: a UI-logic test in the style of `test/` for `src/ui/boardGate.ts` (pure helpers only; this repo does not render components in tests)

**Interfaces:**
- Consumes: `templatesFor`, `DEPARTMENTS`, Task 4's routes.
- Produces: pure helpers in a new `src/ui/autonomyView.ts`: `templateToForm(t: OrderTemplate): { name: string; agentId: string; trigger: TemplateTrigger; runs: number }` and `groupTasksByDept(tasks: Task[]): Record<string, Task[]>`.

- [ ] **Step 1: Write the failing tests** for the two helpers: `templateToForm` returns the template's agent, trigger and runs and an empty inputs map (ruling 1); `groupTasksByDept` keeps `compareTasks` order within a department and omits departments with no tasks; a task for an unknown department is kept under its id rather than dropped.
- [ ] **Step 2: Run** the new test. Expected: FAIL.
- [ ] **Step 3: Implement** the helpers, then in `Autonomy.tsx`: a "Use a template" picker (department, template, fills the existing proposal form, inputs left empty with the agent's own labels), an "Allow task inputs" checkbox on the proposal form (off by default, with one line explaining it), and a "Task queue" card grouped by department with an enqueue form (order, priority, due) and a cancel button per queued task. Use only existing classes and `--iai-*`/existing CSS variables; no new colours.
- [ ] **Step 4: Run** `npm test`, `npx tsc --noEmit`, `npm run build`, then start the dev server and check the screen in a browser at phone and desktop widths (screenshot at `deviceScaleFactor: 1`). Expected: PASS; record anything that does not look right.
- [ ] **Step 5: Commit** `feat(autonomy): templates and the task queue on the Autonomous Agents screen`.

---

### Task 6: Documentation, open questions and the Phase 3 exit gate

**Files:**
- Modify: `docs/AUTONOMY.md`, `docs/AGENT_CATALOGUE.md`, `docs/REVIEW_BOARD.md` (one line: queued drafts take the same path), `docs/OPEN_QUESTIONS.md`, `docs/BUILD_LOG.md`, `README.md` if it lists autonomy features
- Test: `test/docs.test.ts` additions

- [ ] **Step 1: Write the failing doc tests:** `docs/AUTONOMY.md` mentions the queue, `allowTaskInputs`, the 7-day expiry and the weekly-only limitation; `docs/AGENT_CATALOGUE.md` lists all 16 template agent ids from `ORDER_TEMPLATES` (derived in the test, so the doc cannot drift); `docs/OPEN_QUESTIONS.md` has OPQ-037 and OPQ-038.
- [ ] **Step 2: Run** `npx vitest run test/docs.test.ts`. Expected: FAIL.
- [ ] **Step 3: Write the docs.** Add OPQ-037 (who may enqueue and cancel: any signed-in person today, pending the role model OPQ-002; recommendation: officers enqueue, anyone cancels) and OPQ-038 (should a person be able to enqueue a task with its own inputs on an order that allows it; recommendation: keep it off by default as built). Update `docs/AUTONOMY.md` ("What this does not do" loses the line that fresh input is impossible only for orders that allow task inputs).
- [ ] **Step 4: Run the exit gate:** `npm test` (all pass), `npx tsc --noEmit`, `npm run build`, `npm run brand:check`. Expected: all pass; record counts in `docs/BUILD_LOG.md`.
- [ ] **Step 5: Commit** `docs(autonomy): task queue, templates, OPQ-037 and OPQ-038`.

---

## Self-review

- **Spec coverage (5.2):** task queue per department with department, agent, inputs, due, priority (Tasks 2 to 4); standing order or person enqueues, runner dequeues (Task 3); reuses runner, budgets-from-ledger, dry run, acceptance suite (Global Constraints, Task 3); coverage audit (finding above, Task 1 test as a permanent gate); every department has an eligible template (Task 1); gaps become new agents (none found, measured); rules unchanged (drafts only, fixed inputs, nothing from a trigger in a prompt, one run at a time, failed acceptance quarantines; Task 3 tests); output path unchanged (Task 4 ratify test). Phase 3 "Done when: every department has an eligible template; runner tests" is Task 1 plus Task 3.
- **Type consistency:** `Task`, `TaskStatus`, `TaskOrigin`, `EnqueueRequest`, `compareTasks`, `parseInputs`, `parseEnqueue`, `OrderTemplate`, `TemplateTrigger`, `templatesFor`, `ORDER_TEMPLATES` are defined once (Tasks 1 and 2) and used with the same names in Tasks 3 to 6.
- **Proportion:** the plan is larger than the spec section because the spec leaves the queue schema to the builder (spec section 7); every step names a signature, a test or a value rather than a body.
- **Size:** Tasks 1, 2 to 3, and 4 to 6 each fit a PR of about 400 changed lines or fewer; if Task 3 exceeds that, split enqueue and cancel from drain and the trigger change.
- **Branch note:** pushes are limited to the session branch, which already carries unmerged draft PR #19; building this phase there would grow that PR further. Recommendation: merge or split #19 first.
