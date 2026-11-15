# Autonomous agents

Specialist agents can do routine work without being asked: on a schedule, when something happens on GitHub, or when a person
asks an order to run. **They only ever produce drafts.** A draft is tested automatically, and only one that passes reaches
the [Review Board](REVIEW_BOARD.md), where people approve it, a different person countersigns it (except in solo mode, where one registered person may do both steps, flagged; never for `twoPerson` or `professionalReview` agents; see [REVIEW_BOARD.md](REVIEW_BOARD.md)), and it is ratified and
ingested. Open it from the sidebar: **Autonomous Agents**.

```
standing order ─ proposed by A ─ dry run passes ─ activated by B ─┐
                                                                   ▼
trigger (schedule / GitHub event) ─▶ task queue ─▶ run ─▶ draft ─▶ acceptance suite ─┬─ pass ─▶ IN_REVIEW ─▶ board
a person asks ("Run now") ─────────────────────────▶ run                              └─ fail ─▶ quarantined (stays DRAFT)
```

## Switching it on

Autonomy is **off** until the operator turns it on, in the server's `.env`, then restarts:

```
OPS_AUTONOMY=on
OPS_AUTONOMY_MAX_RUNS_PER_DAY=20     # platform-wide daily cap (default 20)
```

With it off, orders can still be proposed and activated, but nothing runs and "Run now" says why. Tasks can still be queued, but none run, and they do not expire, until an operator switches autonomy on. It needs `OPS_USERS`:
open dev mode has no signed-in person, so it cannot propose, activate or run orders. A bad value stops the server with a
`FATAL:` message.

## Standing orders

An agent runs without a person **only** under an active standing order. An order fixes everything that matters:

| Field | Rule |
| ----- | ---- |
| **Agent** | A registered agent whose contract requires approval and does not handle learner data. |
| **Inputs** | Typed once by a person, checked once (no personal data, no learner identifiers, no injection, only the agent's own fields, numbers and options validated) and used every time. **Nothing from a trigger is ever put into a prompt.** |
| **Trigger** | `request` (only when a person asks), `schedule` (daily, or weekly on a weekday, at an hour UTC), or `event` (GitHub `push`, `pull_request`, `workflow_run`, `issues`; at most once per cooldown, 15 minutes to 24 hours). |
| **Budget** | 1 to 5 runs a day for the order. The platform has its own daily cap. |
| **Task inputs** | `allowTaskInputs`, off by default. Set by the proposer and seen by the person who activates the order. Only when it is on may a person queue a task with its own inputs (see "The task queue"). |

Lifecycle: **PROPOSED** by one person → dry-run (the agent runs on its inputs in memory; nothing is stored, no model is
called; the draft has to pass the acceptance suite) → **ACTIVE** when a *different* person activates it (and it is dry-run
again, since contracts and facts may have changed). Anyone signed in can **pause** (resume later) or **revoke** (final) an
order at once, with a reason. Every step is in the audit ledger under the person who did it.

## Templates

Templates pre-select an agent and a trigger; the person still types the inputs. There is one for every department (see "Standing-order templates" in [AGENT_CATALOGUE.md](AGENT_CATALOGUE.md)), and none uses an agent that needs a second approver or a professional reviewer. A template is a starting point only: proposing, dry-running and a different person activating the order work exactly as above. The inputs a person types when the order is made are fixed for every scheduled run of it. A period-bound order therefore needs "Allow task inputs" plus a person-queued task with new inputs, or a new order; for this reason two templates (devops and support) are by request, not scheduled. Limitation: triggers are daily, weekly, event or request, so there is no monthly trigger; month-end work is scheduled weekly.

## The task queue

A **task** is one queued run of an **active** standing order. Each department's tasks show on the Autonomous Agents screen.

- **What queues a task.** A schedule slot that comes due, a GitHub event the order listens for, or a person (see below). A schedule slot is queued once: if its task is later cancelled or fails, the slot is not queued again. An event is not queued while a task for the same event is still waiting, and the cooldown still applies.
- **How tasks run.** One drain runs them one at a time, most urgent first: priority 1 to 3 (1 is most urgent), then the earlier due time, then the earlier arrival. A task whose due time has not come waits. Each task goes through the same budget checks, the same agent run and the same acceptance suite as any other run. A task only ever produces a draft, and the draft takes the same path to the Review Board.
- **When a task starts.** A person queuing a task does not start a run by itself. The next once-a-minute check, or a signed GitHub event, runs it, if autonomy is on and a budget allows. With `OPS_AUTONOMY` off, tasks can still be queued but never run and never expire; when autonomy is switched on, every task less than 7 days past its due time runs, within the budgets.
- **"Run now" does not use the queue.** It stays immediate and still counts against the budgets.
- **Triggers are daily or weekly only.** There is no monthly trigger, so agents whose work is month-based (the month-end close checklist) use weekly templates.

What a person may queue:

- A person queues a task by choosing an active order, a priority (1 to 3) and a due time. The due time is an ISO time such as `2026-11-20T08:00:00Z`, no more than 90 days ahead and no more than a day in the past.
- A person can queue at most 10 tasks per order; an 11th is refused (429). Schedule and event triggers may add a small number beyond that (one per schedule slot, and one per event kind while one is queued).
- A person's task carries its own inputs **only** if the order has `allowTaskInputs` on. They are checked by the same rules as an order's inputs (no personal data, no learner identifiers, no injection text, only the agent's own fields), laid over the order's inputs for that one run, and the order itself is not changed. With `allowTaskInputs` off, a task with inputs is refused (422). **Schedule and event tasks never carry their own inputs**: they use the order's, and nothing from a trigger is put into a prompt.

What happens to a task:

| Case | Result |
| ---- | ------ |
| Held back only by a budget (the order's or the platform's) | Stays queued, and runs when the budget allows. |
| Still queued 7 days after its due time | Expires. |
| The run fails or the draft is quarantined | Final. It is not retried. |
| The order is paused or revoked | Its queued tasks are cancelled. |
| A person cancels it (with a reason of 5 to 300 characters) | Cancelled. Only a queued task can be cancelled. |
| The server restarted while it was running | Marked FAILED by the next drain (which only runs while autonomy is on) and never run a second time. |

**Limits.** The task list returns every task ever written, and the screen shows them all and refreshes every 15 seconds. 16 weekly orders produce about 830 tasks a year (the 14 weekly templates, about 730). Each run now writes three ledger rows (queued, started, final), and the ledger holds at most 20,000 records. At the platform cap of 20 runs a day with 3 rows each, that is 60 rows a day, so the ledger would fill in roughly 11 months (an estimate: other writes use it too); after that writes fail closed and autonomy stops. The planned follow-up (show queued and running tasks plus the latest finished one per department, and/or default the list to exclude old finished tasks) is not built.

The queue is stored in the collection `autonomy_tasks`. It is server-only: clients cannot write it and no model can read it. Queueing, cancelling, expiring and each run are in the audit ledger.

Routes (in signed-in mode all three need a token; in open dev mode the two POST routes refuse with 403 and the list does not):

- `GET /api/autonomy/tasks` lists tasks, most urgent first. Optional filters: `dept` and `status`. An unknown or repeated value is a 400, not an empty list.
- `POST /api/autonomy/tasks` queues a task (`orderId`, `priority`, `due`, and `inputs` where allowed).
- `POST /api/autonomy/tasks/:id/cancel` cancels a queued task (`reason`).

Any signed-in person may queue or cancel a task. Who should be allowed to is an open question (OPQ-037), and so is whether a person may queue a task with its own inputs at all (OPQ-038). In open dev mode there is no signed-in person, so both POST routes refuse with 403. The GET list does not refuse there.

## What runs, and the limits that always apply

- One run at a time (tasks included). The budget check and the "started" ledger entry are one step, and budgets are **counted from the
  ledger**, so a crash or restart cannot hand out extra runs. A failed run still counts.
- A scheduled slot runs once. If the server was down it still runs within 3 hours of the slot; after that the slot is
  skipped rather than run late. A burst of GitHub events inside the cooldown runs once and writes nothing.
- The narrative text, if the agent has one, goes through the [Model Hub](MODEL_HUB.md) like every other model call, as the
  autonomous actor (`auto:<order>`), so all ten model rules apply. With no ready provider it uses the deterministic engine.
- An autonomous actor **can never approve, countersign, ratify or ingest.** Not in the browser, and not on the server: the
  server refuses any signature by an `auto:` actor, and any autonomous draft that was not created by the runner for an
  active order naming that agent.

## The acceptance suite ("strictly tested")

Every autonomous draft must pass ten deterministic checks (`src/core/acceptance.ts`). The runner uses them, the board uses
them, and **the server re-runs them itself before it accepts a submission**, so a client cannot claim a draft passed.

| | Check |
| - | ----- |
| A1 | The agent contract holds (approval required, no learner data, purpose allowed) |
| A2 | The document is well formed |
| A3 | It says something (not just headings) |
| A4 | No personal data |
| A5 | No instruction-override text |
| A6 | Every figure is sourced and nothing was redacted (the drafting guardrails raised no flags; no `[UNSOURCED]` or `[REDACTED_…]` left) |
| A7 | It fits the storage limit (checked first: an oversize document is refused without being scanned) |
| A8 | It renders safely as Markdown, HTML, CSV and JSON (no script or event handler) |
| A9 | It is marked as a draft, with its agent, engine and purpose |
| A10 | It names its standing order |

A draft that fails is **quarantined**: it stays a draft, never reaches review, and shows on the Review Board with the failed
checks. A person can edit it to fix what the checks name; the server re-runs the suite when they submit it. In a survey of
all 100 registered agents with plain inputs, all 100 now pass (one agent's own checklist wording tripped the learner-identifier
detector and was reworded); `test/acceptance.test.ts` keeps that true.

## What this does not do

- It does not decide *who* may propose, activate or pause orders (roles). Anyone signed in can, except that the proposer
  cannot activate their own order. That needs the role model (OPQ-002).
- It does not judge whether a draft is *right*, only that it is well formed, clean and sourced. People review for that.
- Orders use fixed inputs. Schedule and event tasks never carry their own inputs, so an agent that needs fresh human input each time cannot run on its own from a trigger. The one exception is a task a person queues on an order that has `allowTaskInputs` on.
- GitHub events need the webhook configured (`GITHUB_WEBHOOK_SECRET`, see Integrations); schedules need the server running.
- Runs have only been tested against local stand-ins for the model providers, not the live ones (see `docs/MODEL_HUB.md`).
