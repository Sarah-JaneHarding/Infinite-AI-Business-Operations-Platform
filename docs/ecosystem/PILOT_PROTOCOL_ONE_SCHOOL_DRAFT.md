# One-school pilot protocol — DRAFT

**Status: DRAFT proposed 2026-11-26. Not adopted.** `docs/PILOT_PROTOCOL.md` stays in force until
Sarah-Jane Harding adopts this. Every `DECISION` below is a choice that is hers (or the school's) to
make; the text beside it is a recommendation, not a decision. Names, dates and thresholds are left
blank on purpose: nothing here may be read as agreed, approved or achieved.

It answers audit task **T01** (agree and record scope), **T04** (accountable owners), **T32**
(reconcile pilot measures) and gives Gate A–D (audit section 9) a home. What the product can do is
in `docs/FEATURE_MATRIX.md`. This protocol never promises more than that file.

## 1. What is wrong with the current protocol

| #   | Problem in `docs/PILOT_PROTOCOL.md`                                                                                                                                 | Fixed here by                                           |
| --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| 1   | Pilot start is **Term 4 2026 (2026-10-06)**. That date has passed and the pre-pilot has not run.                                                                    | Week 0 is set by a decision (D1), not a calendar date.  |
| 2   | Schools 2 and 3 are deferred (D-4) but the metrics still count "of 3" (≥ 2 of 3 renewing, 0 of 3 no-go).                                                            | One school; sections 6 and 8.                           |
| 3   | Week-16 NPS target is **≥ 40**; the go/no-go table says **≥ 30** go, **< 10** no-go. Cost is **120 %** in one table and **130 % / 200 %** in the other.             | One threshold each, chosen once (D6, D7).               |
| 4   | Percentages (60 % weekly active, 70 % consent, NPS) are meaningless for a handful of educators: with 5 people, 60 % is 3 people and one absence moves it 20 points. | Counts and named people first (section 6).              |
| 5   | It assumes real learner data, guardian consent rates and invoicing from week 4–8.                                                                                   | Three phases; learner data is out of scope (section 3). |
| 6   | The audit's pilot targets were written as if met; they are proposals.                                                                                               | Every target is labelled a proposal until D6 and D7.    |

## 2. Purpose

Learn, with a small number of named adults and **no identifiable learner data**, whether one
teacher-facing workflow saves educator time and produces drafts a teacher will use after review, and
whether the product is safe and supportable enough to go further. It is not a sales trial and not a
test of learner outcomes.

## 3. Phases

| Phase                      | Who                                                                             | Data                                                                                                                | Starts only when                                                                                                                                                                                                      |
| -------------------------- | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0 · Internal pre-pilot** | Founder, the school's implementation partner, 1–3 educators                     | Synthetic or genuinely non-sensitive only                                                                           | Gate A and Gate B (section 4) are signed                                                                                                                                                                              |
| **1 · Educator pilot**     | The named educators at the school, real classroom use of approved features only | Teacher-authored, non-learner content (lesson ideas, timetable shape). **No learner names, codes, scores or notes** | Gate C passed and Phase 0 review says continue                                                                                                                                                                        |
| **2 · Learner data**       | Out of scope for this protocol                                                  | Identifiable learner data                                                                                           | A separate written approval: privacy and legal advice, school and guardian permissions, retention and deletion, key rotation, tenant isolation proven in deployment (T11, T14, T15, T24–T26). **Not requested here.** |

`DECISION D1` — Phase 0 start date, and the length of Phase 0 and Phase 1 (weeks). Check the
school's own calendar; no term dates are assumed here.

## 4. Entry gates (audit section 9)

A gate is passed only when its evidence exists and the named owner has signed. "Task" means a row
in the audit's task register.

| Gate  | Name                | Tasks                                       | Evidence that counts                                                                                                                    | Today                                                                                        |
| ----- | ------------------- | ------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------- |
| **A** | Scope and ownership | T01, T03, T04, T32                          | This protocol adopted; feature list frozen from the matrix; owners named and have accepted                                              | Draft only                                                                                   |
| **B** | Safety and security | T02, T09, T12, T13, T16 (+ T10 if it is on) | Screening tier removed; age check fails closed; unique accounts, no open dev mode; MFA verified in the real realm; spend ceilings wired | T02 and T09 done in code (both on PR #236, not yet merged); T12, T13, T16 open; **T10 open** |
| **C** | Working release     | T05, T17, T18, T19, T20                     | Pinned release, green checks, isolated staging, one human-reviewed educator journey, restore from backup, incident drill                | T05 not started (no entry point exists); CD failed at AWS credentials (R07)                  |
| **D** | Measure and decide  | T33, T34, T35                               | Orientation done; weekly reviews held; end-of-pilot comparison with the thresholds in section 6                                         | Not started                                                                                  |

Phase 0 needs A and B. If Phase 0 offers only the offline Toolbox widgets (no generation), the
generation-dependent items in B (T09, T16, T10) are not needed, but T12/T13 still are. That is the
quickest honest start, and the recommended one (D3).

## 5. Scope and rules of use

### 5.1 In scope for Phase 0 and 1 (subject to D3)

- The classroom-kit widgets TB-W15 to TB-W20, after review on a school device (feature matrix §6).
- The curriculum map and the approvals / HoD / SMT views, with whatever real records exist.
- The EGRA **comparison** only after PR #236 is merged **and** a qualified SBST person confirms it;
  it recommends no tier.
- One teacher-planning workflow (the audit's suggestion: a CAPS-informed lesson draft with educator
  review) **only once it exists end to end** (T05). Until then it is not offered.

### 5.2 Never in the pilot

Identifiable learner data · screening tiers or any automatic support recommendation · learner or
guardian logins · autonomy and external writes · export to LMS · PDF/DOCX export · public widget
sharing · claims of POPIA compliance or South African data residency · anything marked
Demonstration in the matrix being shown as working.

### 5.3 Rules

1. A named educator reviews every generated draft before it is used; the system records the
   approval before anything moves on.
2. Anything the system gets wrong or unsafe is reported through the route in section 7, the same day.
3. Participants are told plainly what is a demonstration and what is not (orientation, T33).
4. Nothing from the pilot is described outside the project as a result until section 8 is done.

`DECISION D2` — the school: Benjamin Pine Primary School is recorded as school 1 (OQ-019), but the
audit could not confirm current approval or participation. Record the school's current written
agreement to take part, who signed it for the school, and the date.

`DECISION D3` — the first workflow. Recommended: start Phase 0 with the offline classroom-kit
widgets (no data, no model, no cost; usable once reviewed in a browser and the way staff reach them is settled) while the generation journey (T05) is built, and
add generation in Phase 1 once Gate C is passed.

## 6. Measures (one school)

Small numbers: report counts with names withheld in any write-up, and never as a percentage when
fewer than about ten people are involved. Definitions are fixed before the start so they cannot move.

| Measure                    | Definition (fixed in advance)                                                                                                    | Proposed threshold (all subject to D6)                                  | Source                    |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------- | ------------------------- |
| Participation              | Number of named educators who used an approved feature in the week, out of those invited (show both numbers)                     | At least half of invited educators in most weeks                        | Usage record              |
| Drafts reviewed and used   | Drafts that a teacher approved and then used, out of drafts generated (only once T05 exists)                                     | Majority used, with the reasons for the rest recorded                   | Approval record + review  |
| Educator usefulness rating | Each educator's 1–5 score after each use, plus one free-text line                                                                | Average at least 3.5 **and** no unresolved safety comment               | Short form                |
| Time saved                 | Educator's own estimate in minutes against what the task took before, per use                                                    | Recorded; no threshold proposed (self-report, small sample)             | Short form                |
| Safety incidents           | Any harmful, inappropriate or age-unsuitable output; any identifier seen in a log or artefact; any access beyond a person's role | **Zero** unresolved; each one stops the affected feature until reviewed | Incident log              |
| Cost                       | Model and hosting spend for the pilot against the written estimate                                                               | Within the chosen limit (D7)                                            | Gateway and cloud billing |
| Support load               | Number of help requests and median time to first response                                                                        | Recorded; response within the times in section 7                        | Support log               |

`DECISION D6` — thresholds. Recommended: treat the table above as the working starting point, do
**not** use NPS as a gate (too few people; it adds nothing a conversation does not), and use the
safety row as the only hard stop. Replaces the NPS and "of 3 schools" rows.

`DECISION D7` — the cost limit: choose one of "within 120 %", "within 130 %", or a fixed rand/dollar
ceiling. A ceiling is recommended, because the gateway currently enforces no limit at all (R04).

## 7. Running the pilot

**Weekly review (30 min, same agenda as the current protocol):** usage, issues, educator feedback,
technical health, next steps. Participants: the implementation partner lead, the product owner, the
on-call engineer. Output: a short written summary and any decision needed logged in
`docs/OPEN_QUESTIONS.md`.

**Escalation** (keep the current table in `docs/PILOT_PROTOCOL.md`, and add):

| Situation                                      | Action                                                              | Owner             | Time                   |
| ---------------------------------------------- | ------------------------------------------------------------------- | ----------------- | ---------------------- |
| Unsafe or age-unsuitable output                | Switch that feature off, preserve the output, review before restart | Safeguarding lead | Same day               |
| Identifier seen anywhere                       | `docs/INCIDENT_PROCESS.md`                                          | Security lead     | Immediate              |
| Participant wants out, or a parent/school asks | Stop their use, no questions needed, offboarding below              | Product owner     | Within 5 business days |

**Stop authority.** Anyone listed in section 9 may pause the pilot, or any one feature, immediately.
Only the product owner (D4) restarts it, in writing, after the cause is understood.

**Offboarding** follows the current protocol (suspend, export on request, close after the notice
period, keep the audit and consent ledgers as the law requires).

## 8. Decision at the end

At the agreed end of Phase 1, compare observed evidence with section 6 and choose one of:
**stop**, **remediate and re-run**, or **extend to the next phase**. Record who decided and on what
evidence. Not allowed: counting a target as a result, or deciding on a metric that was not defined in
advance. `DECISION D8` — who decides, and whether the school has a vote. Recommended: the product
owner and the school lead decide together; either can stop.

## 9. Accountable people

Roles come from the audit; **names are blank until each person has agreed.** Backup cover is
required for every role.

| Role              | Name | Backup | Accepted (date) |
| ----------------- | ---- | ------ | --------------- |
| Product owner     |      |        |                 |
| School lead       |      |        |                 |
| Technical lead    |      |        |                 |
| Security lead     |      |        |                 |
| Privacy lead      |      |        |                 |
| Safeguarding lead |      |        |                 |
| Curriculum lead   |      |        |                 |
| Support owner     |      |        |                 |

`DECISION D4` — who is the product owner and who may restart a paused pilot.
`DECISION D5` — who are the privacy and safeguarding leads. The privacy lead should be able to get South
African privacy/legal advice (T11, T26); this document is not legal advice.

## 10. Decisions needed, in the order they unblock work

| #   | Decision                                            | Blocks                           |
| --- | --------------------------------------------------- | -------------------------------- |
| D2  | School's written agreement, signatory, date         | Gate A, anything with the school |
| D4  | Product owner and restart authority                 | Gate A                           |
| D5  | Privacy and safeguarding leads                      | Gate A, T10, T11                 |
| D3  | First workflow (recommended: offline widgets first) | Scope, feature freeze (T03)      |
| D1  | Start date and phase lengths                        | The calendar                     |
| D6  | Thresholds; NPS not a gate                          | Section 6, Gate D                |
| D7  | Cost ceiling (and pricing + budget for T16)         | Gate B for generation            |
| D8  | Who decides at the end                              | Section 8                        |

## 11. What this draft does not do

It does not approve anything, name anyone, set a date, give legal or privacy advice, or establish
that the school has agreed. It covers one school and the Education repository; the Operations platform
is a separate internal tool with its own gates (audit T14, T22, T23) and is out of scope here.
