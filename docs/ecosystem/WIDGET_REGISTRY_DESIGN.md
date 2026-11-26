# Widget registry design

Status: proposal, 2026-10-25. Nothing here is wired to a database, an API route or another school.
The rules that need no decision live in `packages/widget-registry` (pure TypeScript, tested). The parts that
need a human are in OQ-037 to OQ-039.

## What this is for

The browser widgets (INFINITE-AI-\*-W\*.html) assemble and check; they never decide. A school needs to
(1) improve a widget's output, (2) have a named person ratify the change, (3) wire it, (4) change it back
later, and (5) add widgets of its own and, if it wants, offer them to other schools.

## Release package

A release is one JSON file the browser Studio downloads and the registry stores:

| Field                                  | Meaning                                                          |
| -------------------------------------- | ---------------------------------------------------------------- |
| `widgetId`, `version`, `parentVersion` | Which widget and where it sits in the history                    |
| `changeKind`                           | `initial`, `edit`, `rollback`, `feature`                         |
| `reason`                               | Required after the first release                                 |
| `contentHash`                          | SHA-256 of the manifest, output schema and example output        |
| `ratification`                         | Named person, role, time, and the hash they ratified             |
| `agentId`, `contract`                  | The agent the output is laid out for and the result of the check |

Rules (tested in `packages/widget-registry/test/release.spec.ts`):

- Only a ratified release can be added or wired. The ratification must be for the same content hash.
- The ratifier is a signed-in account with a named person (first name and surname), never a code or number.
- Every change after the first needs a reason.
- **Roll back is a new forward release** that restores earlier content. History is never rewritten, so who
  rolled back, when and why stays on record. A roll back is ratified like any other change.

The widget files and their index are archived at `apps/web/public/widgets/` (see `docs/WIDGET_STUDIO_AND_BOARD.md`).
No release of them has been ratified yet (OQ-045).

## Output contract fit

Each widget has an adapter that lays its output out the way its agent contract asks. The adapter output is
validated against the agent's own JSON Schema (generated from `validateAgentContract`). Where the widget
cannot supply a required field it returns the contract's `needs_input` shape and names the field. It never
invents a value. `tenantId` is filled by the platform on ingest. Adapters exist for PD-W01 to PD-W08, TB-W01 to TB-W11 and DW-W01 to DW-W04. The rest cannot be done from a widget: MOD-02 and DW-W07 to W09 need platform record ids (OQ-040) and CE needs ratified source citations (OQ-041).

## Custom widgets and publishing (proposal)

1. The Wiring Board receives a custom widget and runs an audit: POPIA scan, widget contract, and an agent
   contract with an id, purpose, input and output schema, guardrails, a budget, `requiresApproval` and
   `writesToBrain` stated.
2. A passing audit alerts the named SMT members. They ratify, then choose **private** (stays in this school)
   or **public** (offered to other schools).
3. A school accepts or rejects a public widget. Accepting ingests it into that school's Wiring Board for
   testing, editing to the school's template, ratification by that school's named person, then wiring.
4. New platform features ship the same way; a school may decline.

## What this design will not do until decided

- Show a widget to other schools unless school-specific information was removed and a person confirmed it (OQ-037, decided).
- Record a typed name as the actor of record: the signed-in account is required (OQ-038, decided).
- Release a public widget without review by Infinite-AI appointed staff (OQ-039, decided; the appointed list is open).
