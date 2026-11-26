# Feature matrix — what a pilot user can and cannot rely on

**Status: DRAFT for Sarah-Jane Harding's review (2026-11-26).** Built from a static read of this
repository at commit `12910b2` plus the 25 November 2026 audit. **Nothing here was run in a
browser or against a deployed environment.** A row says what the code does; it does not say a
school has used it.

Use this table to answer "may we show or promise this?" for any pilot conversation, demo or
public wording. Every claim must be backed by the evidence column. If the code changes, the row
changes in the same commit (`CLAUDE.md`, Definition of Done).

## Status vocabulary

| Status               | Meaning                                                                                                 |
| -------------------- | ------------------------------------------------------------------------------------------------------- |
| **Pilot-ready**      | Works for the pre-pilot scope with synthetic data, with its stated limits. No row has this yet.         |
| **Limited**          | Real code path, real data source, but a named gate (below) is unproven. Allowed in pre-pilot with care. |
| **Demonstration**    | Screen shows illustrative content. It must say so on screen and must not be offered as a working tool.  |
| **Not reachable**    | Code exists but nothing in the app can start it.                                                        |
| **Stub / not built** | Placeholder returns an error or says plainly that it does not exist.                                    |
| **Off**              | Deliberately disabled for the pilot.                                                                    |

## 1. Access and administration

| Feature                                        | Status       | Evidence                                                                            | What is unproven                                                                                                  |
| ---------------------------------------------- | ------------ | ----------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| Sign-in (Keycloak via NextAuth), role routing  | Limited      | `apps/web/src/auth.ts`, `lib/route-access.ts`; sessions with no role are refused    | The deployed realm, and MFA. `docs/OPEN_QUESTIONS.md` OQ-036: treat MFA as **not enforced** until verified (T13). |
| Staff accounts, invitations, role requests     | Limited      | `/api/admin/staff/*`; Stage 138–141 in `docs/STAGE_LOG.md`                          | Never run against a real Keycloak (slice 7e, OQ-048).                                                             |
| Tenant isolation (database row-level security) | Limited      | `packages/db`; audit E13: a main-branch CI run passed real-Postgres isolation tests | Historical CI only. Not proven on API, worker, object storage, exports and admin paths in a deployed setup (T15). |
| School setup, env and prompt admin pages       | Not reviewed | `/admin/setup`, `/admin/env`, `/admin/prompts`                                      | Not examined for this matrix.                                                                                     |

## 2. Approvals and leadership views

| Feature                          | Status           | Evidence                                                                               | What is unproven / note                                                                                                  |
| -------------------------------- | ---------------- | -------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------ |
| Approval queue and decide action | Limited          | `/approvals`, `/api/approvals/[id]/decide`, `approvals-loader.ts`                      | Reads real records, but **nothing in the app creates an approval** (see section 4), so the queue is empty in normal use. |
| HoD console, SMT dashboard       | Limited          | `HodConsole.tsx`, `SmdDashboard.tsx` (read real records, say plainly when they cannot) | Same: little to show until something generates work.                                                                     |
| District roll-up                 | Stub / not built | `DistrictRollup.tsx` says there is no cross-school roll-up and why                     | By design: no cross-tenant read of identifiable data.                                                                    |
| Platform run inspector           | Stub / not built | `RunInspector.tsx` says it shows nothing and why                                       | The approved-support-session flow it depends on is not built.                                                            |

## 3. Curriculum and teacher surfaces

| Feature                                                                             | Status        | Evidence                                                                                                     | What is unproven / note                                                                    |
| ----------------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------ |
| CAPS source ingest and ratify (admin)                                               | Limited       | `/api/caps-canon/*`, `/admin/curriculum/caps-canon`                                                          | Source documents must be supplied and independently validated; none is invented (T07/T08). |
| Curriculum map in Teacher Studio                                                    | Limited       | `CurriculumMapView`, `lib/atp-curriculum-loader.ts`                                                          | Read-only. Correctness depends on the ratified ATP source.                                 |
| Teacher Studio timetable                                                            | Demonstration | `TeacherStudio.tsx` banner: "your school's timetable is not connected yet"                                   | Fixed example.                                                                             |
| Teacher Studio lesson plan                                                          | Demonstration | Banner: "not read from, or saved to, your school's records"                                                  | Fixed example.                                                                             |
| Teacher Studio **AI Studio** ("Give me tomorrow's lesson", "This learner is stuck") | Demonstration | Banner: "nothing on this tab is generated by a model, and nothing is saved when you press Approve or Reject" | **No teacher can generate anything from the app today.**                                   |

## 4. Generation, safety and export (the engine behind the screens)

| Feature                                      | Status           | Evidence                                                                                                                                                                                    | What is unproven / note                                                                                                                             |
| -------------------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------- |
| MOD-01 and MOD-04 generation pipelines       | Not reachable    | `apps/worker`, `packages/orchestrator`. **No web route or action starts a run**: the only run starters are the worker's dev in-process runner and a producer that is not in this repository | This is the gap behind task T05. A teacher journey needs: UI action, tenant-scoped API route, Zod contract, enqueue with `gradePhase`, result view. |
| Age-appropriateness guard on those pipelines | Limited          | `apps/worker/src/age-check-policy.ts`, `job-processor.ts` (Stage 143)                                                                                                                       | Now fails closed when the phase or checker is missing. The judge itself is uncalibrated (T28), so it is not proof that outputs are safe.            |
| Safeguarding escalation to a named person    | Limited          | `sns-escalation-notifier.ts`, `SAFEGUARDING_SNS_TOPIC_ARN`                                                                                                                                  | Delivery to a named responder, and acknowledgement, never exercised (T10). Keep dependent features off until proven.                                |
| Model gateway spend limits                   | Not enforced     | `apps/gateway/src/index.ts`: `limitsFor: () => undefined`, `costEstimator: zeroCost`                                                                                                        | No ceiling works today (R04 / T16). Needs pricing and a budget figure.                                                                              |
| PII guard and de-identification              | Limited          | `packages/guardrails` `pii-guard.ts`, `packages/deident`                                                                                                                                    | Pattern-based; a `deidentified: true` stamp is not proof every input is clean (T27).                                                                |
| PDF / DOCX export                            | Stub / not built | `packages/orchestrator/src/export/dispatcher.ts` stub renderers return `needs_template`                                                                                                     | Needs a rendering library and a ratified school template (OQ-003).                                                                                  |
| LMS publish (LTI, Google Classroom, Teams)   | Stub / not built | Same file: stub publishers return an error                                                                                                                                                  | Needs credentials and a registered integration. Do not describe as available.                                                                       |

## 5. Learner support, learner and guardian surfaces

| Feature                           | Status                                     | Evidence                                                                                                          | What is unproven / note                                                                                                                         |
| --------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| EGRA screening comparison         | Limited                                    | `EgraScreeningView.tsx`, `egra-screening.ts` (PR #236, **not yet merged**)                                        | Compares scores to benchmarks the school types in; recommends **no tier**. Needs qualified SBST confirmation. Subtest list unverified (OQ-035). |
| MTSS overview, SIAS pipeline tabs | Stub / not built                           | `MtssOverviewView.tsx`, `SiasPipelineView.tsx`                                                                    | Deliberately empty; they show no learners, tiers or process claims.                                                                             |
| Learner Space                     | Demonstration                              | `LearnerSpace.tsx` builds a sample graph and a `learner-demo-token` profile                                       | Do not show to a learner or guardian as their own data.                                                                                         |
| **Parent Portal**                 | **Demonstration, and must be fixed first** | `GuardianPortal.tsx` hard-codes "Term 3 results available from 25 August" and "Parent evening: 3 September 18:00" | **Invented notices that look real.** Not in the audit; found while building this matrix. Remove or label before any guardian can see it.        |

## 6. Teacher Toolbox widgets (MOD-04 and others)

| Item                                                                                                 | Status                                         | Evidence                                                                    | Note                                                                                                                                              |
| ---------------------------------------------------------------------------------------------------- | ---------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 80 self-contained HTML widgets                                                                       | Limited                                        | `apps/web/public/widgets/*.html`, `index.json`                              | A static scan found **no network calls** in any of the 80 (the two hits are detector patterns inside PF-W06 and PF-W07). Not opened in a browser. |
| Classroom kit TB-W15 to TB-W20 (picker, groups, rotations timer, score keeper, noise levels, survey) | Limited, **recommended first pilot candidate** | `docs/TOOLBOX_CATALOGUE.md`: learner codes only, nothing stored, no network | The lowest-risk way to put something in an educator's hands with no learner data. Needs review in a browser, on a school device, offline.         |
| How widgets are reached                                                                              | Unknown                                        | No page in `apps/web/src` links to `/widgets/*`; served as static files     | Whether sign-in is required to open them was **not established**. Check before relying on it.                                                     |
| Other modules' widgets (CE, PD, DW, SA, PF)                                                          | Not reviewed                                   | `index.json` lists them                                                     | Excluded from the pilot until reviewed one by one.                                                                                                |

## 7. Switched off for the pilot

| Item                                 | Why                                                               |
| ------------------------------------ | ----------------------------------------------------------------- |
| Screening tier recommendations       | Removed (R01). The SBST assigns the tier.                         |
| Learner and guardian access          | No real authentication, consent or data path established.         |
| Public / cross-school widget sharing | OQ-037 / OQ-039: platform review and sandbox not complete.        |
| Any real learner-identifiable data   | Separate approval; see `docs/PILOT_PROTOCOL_ONE_SCHOOL_DRAFT.md`. |

## How to read the gaps

1. **Biggest build gap:** no teacher journey exists end to end (section 4, first row). Until it does,
   an educator pilot can offer the Toolbox widgets, the curriculum map, the approvals views and the
   EGRA comparison, and nothing that "generates".
2. **Biggest honesty gap:** the Parent Portal and Learner Space show content that looks real.
3. **Biggest safety gap that needs your input:** model spend limits (needs pricing and a budget).

_Operations platform:_ it lives in a separate repository and is not covered here.
