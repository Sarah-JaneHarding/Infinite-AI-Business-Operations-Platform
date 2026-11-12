# Autonomous agents

Specialist agents can do routine work without being asked: on a schedule, when something happens on GitHub, or when a person
asks an order to run. **They only ever produce drafts.** A draft is tested automatically, and only one that passes reaches
the [Review Board](REVIEW_BOARD.md), where people approve it, a different person countersigns it, and it is ratified and
ingested. Open it from the sidebar: **Autonomous Agents**.

```
standing order ─ proposed by A ─ dry run passes ─ activated by B ─┐
                                                                   ▼
trigger (schedule / GitHub event / a person asks) ─▶ run ─▶ draft ─▶ acceptance suite ─┬─ pass ─▶ IN_REVIEW ─▶ board
                                                                                        └─ fail ─▶ quarantined (stays DRAFT)
```

## Switching it on

Autonomy is **off** until the operator turns it on, in the server's `.env`, then restarts:

```
OPS_AUTONOMY=on
OPS_AUTONOMY_MAX_RUNS_PER_DAY=20     # platform-wide daily cap (default 20)
```

With it off, orders can still be proposed and activated, but nothing runs and "Run now" says why. It needs `OPS_USERS`:
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

Lifecycle: **PROPOSED** by one person → dry-run (the agent runs on its inputs in memory; nothing is stored, no model is
called; the draft has to pass the acceptance suite) → **ACTIVE** when a *different* person activates it (and it is dry-run
again, since contracts and facts may have changed). Anyone signed in can **pause** (resume later) or **revoke** (final) an
order at once, with a reason. Every step is in the audit ledger under the person who did it.

## What runs, and the limits that always apply

- One run at a time. The budget check and the "started" ledger entry are one step, and budgets are **counted from the
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
- Orders use fixed inputs. An agent that needs fresh human input each time cannot run on its own.
- GitHub events need the webhook configured (`GITHUB_WEBHOOK_SECRET`, see Integrations); schedules need the server running.
- Runs have only been tested against local stand-ins for the model providers, not the live ones (see `docs/MODEL_HUB.md`).
