# CEO Command Centre

The first screen of the platform. It reads what the departments have **recorded**, never what they might be doing, and shows how each department is doing, one consolidated task list, and a calendar of the tasks that need a person.

## Source of truth
The v1.4 Business Planning Package (Word and HTML) is stored in `docs/business-plan/` and in the Library (`npm run seed:business`). `src/core/ceo/plan.ts` holds the figures the platform uses (school pricing, founder pay, funding need) and its decisions (D-1 to D-6 and the open questions). A test fails if the plan and `SCHOOL_PRICING` drift apart. Anything in the package that has no recorded source is shown as a decision for a person, not as a fact.

## How a department's light is decided
| Light | Rule |
| ----- | ---- |
| Red | Any overdue task, or 3 or more blocked tasks |
| Amber | Any blocked task, an artefact waiting for review more than 3 days, or open tasks with no activity for 14 days |
| Green | Something recorded, and none of the above |
| Nothing recorded | No tracker rows, checklist ticks or artefacts. Never shown as green |

Thresholds live in `HEALTH_RULES` (`src/core/ceo/health.ts`).

## Tasks
One list, derived from recorded work: tracker rows (rule table `TRACKER_RULES`), unticked checklist items, artefacts waiting on a person, plan decisions, tasks added by hand, and tasks arriving from connected tools. Tracker, checklist and artefact tasks are finished where they are recorded; plan, hand-added and inbound tasks are finished from the list.

A task is **flagged for a person** when it needs a human to complete it (every inbound task, every plan decision, every checklist item, every artefact waiting for review). Flagged tasks are booked on the calendar.

## Calendar rules
Monday to Friday, 08:00 to 17:00 SAST; 12:00 to 13:00 kept free; 30-minute blocks (a placeholder length, OPQ-029); at most 8 blocks a day; 15-day horizon; earliest due date first, overdue first; undated priority-3 tasks are not booked; pinned times and events are respected. South African time has no daylight saving.

## The monitor
`OPS-CEO-01` "Operations review" is an agent that writes a review from the live figures. Every number carries an `[src:ops.*]` tag, and like every agent it only **drafts**: a person reviews and approves. The dashboard itself recomputes every 30 seconds with no model involved.

## Connecting tools
1. **Calendar feed.** Set `OPS_CALENDAR_TOKEN` (24+ characters). Subscribe to `/api/ceo/calendar.ics?token=<token>` in Google Calendar, Outlook or Apple Calendar. The URL is a secret: anyone with it can read the task titles. Rotate by changing the token.
2. **Inbound webhook** (Zapier, Make, Slack workflows, forms). Set `OPS_INBOUND_SECRET`. `POST /api/integrations/inbound` with a JSON body and the header `x-ops-signature: sha256=<hex HMAC-SHA256 of the raw body>`. Maximum 16 KiB. Repeating the same `externalId` creates nothing new. Tasks containing ID numbers or learner identifiers are refused.
3. **Daily digest.** Uses the existing outbound allowlist; sends `{"text": ...}` to a Slack-style incoming webhook. Button "Send digest" in Integrations, or `POST /api/ceo/digest/send`.

Never put a secret in the repository: `.env.example` lists the names only.

## Not built
OAuth connectors (Google/Microsoft calendar write-back, Slack/Teams apps) are not built (OPQ-027). Slack, Teams and Zapier work through the webhook and the digest.

## Seeding
`npm run seed:business` stores the library and the package. Safe to run twice.
