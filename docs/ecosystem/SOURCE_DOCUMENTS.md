# Source documents — the intake contract for Stage 08

Stage 08 (MOD-01 Curriculum Engine) opens with a ground rule that governs this whole file:

> Before any agent: ingest the supplied CAPS subject statements and ATP files into L0 as
> ratified constitution. **If a source document is missing, stop and ask — do not
> synthesise curriculum.**

So Stage 08 cannot begin until the documents below exist in the repository. This file is
the checklist for obtaining them and the contract for where they go.

## Why this file exists rather than the documents

The authoring environment has no route to the public internet. Direct HTTPS is refused by
the sandbox network policy at the CONNECT stage, and the fetch tool returns 403 for every
host, including ones known to be reachable. `WebSearch` works and returns URLs; nothing
available here can retrieve a file. The documents have to be supplied by a human.

One correction worth recording: **`www.dbe.org.za` does not exist** — it fails DNS
resolution. The Department of Basic Education publishes at **`www.education.gov.za`**.

## Where to get them

| What                                | Where                                                                                        |
| ----------------------------------- | -------------------------------------------------------------------------------------------- |
| CAPS subject statements             | <https://www.education.gov.za/Curriculum/CurriculumAssessmentPolicyStatements(CAPS).aspx>    |
| National Curriculum Statements R–12 | <https://www.education.gov.za/Curriculum/NationalCurriculumStatementsGradesR-12.aspx>        |
| Policy documents portal (Thutong)   | <https://www.thutong.doe.gov.za/Home/PolicyDocuments/tabid/1952/Default.aspx?PolicyTypeid=1> |

**Take these from the DBE directly, not from a re-hosting site.** Search surfaces several
sites that mirror ATPs. A re-uploaded PDF of unknown vintage is how a curriculum engine
ends up confidently teaching a superseded syllabus, and for a system whose entire claim is
CAPS fidelity, the canon has to be traceable to the department that issued it.

## Scope: full primary, Grades R–7

Confirmed 2026-07-29. This spans three phases, because Grade 7 sits in the Senior Phase:
Foundation (R–3), Intermediate (4–6), Senior (7).

### A note on the subject lists below

The lists are a **procurement checklist, not an authority**. They exist so nothing is
missed when collecting files. The system's understanding of phases, subjects, topics,
weightings and cognitive levels must come from parsing the ingested documents — never from
this file and never from a model's recollection. If a list here disagrees with a document,
the document is right and this file is wrong.

### 1. CAPS subject statements

| Phase        | Grades | Subjects to obtain                                                                                                                                                              |
| ------------ | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Foundation   | R–3    | Home Language · First Additional Language · Mathematics · Life Skills                                                                                                           |
| Intermediate | 4–6    | Home Language · First Additional Language · Mathematics · Natural Sciences and Technology · Social Sciences · Life Skills                                                       |
| Senior       | 7      | Home Language · First Additional Language · Mathematics · Natural Sciences · Technology · Social Sciences · Economic and Management Sciences · Life Orientation · Creative Arts |

**Languages — supply only what the school teaches.** CAPS publishes a Home Language
statement per official language, so requesting "all languages" multiplies the set roughly
twelvefold for no benefit. Supply the school's LoLT plus the additional languages it
offers. MOD-04's Home-Language Adapter (Stage 11) is where broader language coverage
becomes relevant, and it is gated on per-language eval sets anyway.

### 2. Annual Teaching Plans

ATPs for the same grades and subjects, for the academic year being planned. ATP pacing is
authoritative in Stage 08 — a deviation requires a stored reason and surfaces in the
coverage audit — so the year must match the year the school is planning.

### 3. Assessment and promotion policy ("grading")

Needed because the manual forbids agents computing or inventing mark allocations:
_"Assessment weightings and mark allocations come from policy in L0. The agent may not
compute or invent them."_ Without these, CE-06 and CE-07 cannot be built.

- National Policy Pertaining to the Programme and Promotion Requirements (NPPPPR)
- School-Based Assessment requirements and weightings for the Foundation, Intermediate and
  Senior Phases
- The national protocol for assessment, Grades R–12
- Any provincial or school-level assessment policy the school actually applies

### 4. Professional development policy ("training")

Needed for Stage 12 (MOD-05), where CPTD point values come from supplied policy and are
never computed by a model.

- SACE CPTD Management System policy and the point-value schedule
- SACE professional development provider and activity criteria

### 5. The school's own documents

Not from the DBE — from the school. These are OQ-003, and Stage 08's template-fidelity
checking is validated structurally against them, so approximations are useless:

- Lesson plan template
- Unit or term plan template
- Formal assessment task template
- Rubric and marking memo template
- Parent progress report template
- The school's assessment policy, if it differs from or extends the national one

## Where to put them

```
docs/sources/
  caps/<phase>/<subject>/<filename>.pdf
  atp/<year>/<phase>/<subject>/<filename>.pdf
  policy/assessment/<filename>.pdf
  policy/cptd/<filename>.pdf
  templates/<artefact-type>/<filename>.<ext>
```

Alongside each directory, a `SOURCES.md` recording for every file: its title, the URL or
person it came from, the publication or revision date, and the date it was retrieved.
Provenance is not bureaucracy here — `explain()` has to be able to trace a lesson plan's
outcome back to a clause in a specific version of a specific document, and that chain
starts at intake.

## A question to settle before ingestion, not after

These are Crown-copyright government publications. Redistributing them inside a
multi-tenant SaaS product is a licensing question rather than a technical one, and it is
cheaper to answer now than after they are embedded in every tenant's L0. The options are
roughly: rely on the DBE's terms for educational reuse, have each school supply its own
copies, or store only derived structure (topic graphs, clause identifiers) rather than the
source text. Recorded as OQ-005.

## Status

**Update 2026-08-18.** Twenty-one documents have been supplied across Foundation, Intermediate and Senior phases (Gr R–7 scope):

| Document                                                                              | Phase        | Grades    | Date   | Status   | Stored                                                                                                |
| ------------------------------------------------------------------------------------- | ------------ | --------- | ------ | -------- | ----------------------------------------------------------------------------------------------------- |
| Draft CAPS — Coding and Robotics, Grades R-3 (DBE)                                    | Foundation   | R–3       | 2021   | DRAFT    | Derived structure only — `packages/contracts/src/curriculum/sources/caps-coding-robotics-r3.ts`       |
| CAPS — IsiZulu First Additional Language, Grades 1-3 (DBE)                            | Foundation   | 1–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-isizulu-fal-gr1-3.ts`        |
| CAPS — Life Skills, Grades R-3 (DBE, ISBN 978-1-4315-0422-0)                          | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-life-skills-r3.ts`           |
| CAPS — English Home Language, Grades R-3 (DBE, ISBN 978-1-4315-0400-8)                | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-english-hl-fp-gr-r3.ts`      |
| CAPS — Sepedi Home Language, Grades R-3 (DBE, ISBN 978-1-4315-0404-6)                 | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-sepedi-hl-fp-gr-r3.ts`       |
| CAPS — Sesotho Home Language, Grades R-3 (DBE, ISBN 978-1-4315-0403-9)                | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-sesotho-hl-fp-gr-r3.ts`      |
| CAPS — Setswana Home Language, Grades R-3 (DBE, ISBN 978-1-4315-0402-2)               | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-setswana-hl-fp-gr-r3.ts`     |
| CAPS — First Additional Language, Grades R-3 (DBE, 2011 Final Draft)                  | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-fal-fp-gr-r3.ts`             |
| CAPS — Mathematics, Grades R-3 (DBE, ISBN 978-1-4315-0433-6)                          | Foundation   | R–3       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-mathematics-fp-gr-r3.ts`     |
| CAPS — Life Skills, Grades 4-6 (DBE, ISBN 978-1-4315-0491-6)                          | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-life-skills-ip-gr46.ts`      |
| CAPS — English Home Language, Grades 4-6 (DBE, ISBN 978-1-4315-0455-8)                | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-english-hl-ip-gr46.ts`       |
| CAPS — English First Additional Language, Grades 4-6 (DBE, ISBN 978-1-4315-0466-4)    | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-english-fal-ip-gr46.ts`      |
| CAPS — Mathematics, Grades 4-6 (DBE, ISBN 978-1-4315-0491-6)                          | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-mathematics-ip-gr46.ts`      |
| CAPS — Natural Sciences and Technology, Grades 4-6 (DBE, 2011 Final Draft)            | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-nst-ip-gr46.ts`              |
| CAPS — Social Sciences, Grades 4-6 (DBE, ISBN 978-1-4315-0489-3)                      | Intermediate | 4–6       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-social-sciences-ip-gr46.ts`  |
| CAPS — Life Orientation, Grades 7-9 (DBE, © 2011)                                     | Senior       | 7–9       | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-life-orientation-sp-gr79.ts` |
| CAPS — Home Language, Grades 7-9 (DBE, generic across official languages)             | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-hl-sp-gr7.ts`                |
| CAPS — First Additional Language, Grades 7-9 (DBE, generic across official languages) | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-fal-sp-gr7.ts`               |
| CAPS — Mathematics, Grades 7-9 (DBE, ISBN 978-1-4315-0525-8)                          | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-mathematics-sp-gr7.ts`       |
| CAPS — Natural Sciences, Grades 7-9 (DBE, © 2011)                                     | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-natural-sciences-sp-gr7.ts`  |
| CAPS — Social Sciences, Grades 7-9 (DBE, © 2011)                                      | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-social-sciences-sp-gr7.ts`   |
| CAPS — Technology, Grades 7-9 (DBE, © 2011)                                           | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-technology-sp-gr7.ts`        |
| CAPS — Economic and Management Sciences, Grades 7-9 (DBE, © 2011)                     | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-ems-sp-gr7.ts`               |
| CAPS — Creative Arts, Grades 7-9 (DBE, © 2011)                                        | Senior       | 7 (scope) | © 2011 | RATIFIED | Derived structure only — `packages/contracts/src/curriculum/sources/caps-creative-arts-sp-gr7.ts`     |

**Update 2026-11-05.** Sepedi Home Language, Grades R-3 added (22nd CAPS ingestion). Sesotho Home Language, Grades R-3 added (23rd). Setswana Home Language, Grades R-3 added (24th). Provenance is in `docs/sources/caps/foundation/<language>-hl/SOURCES.md`.

All 21 CAPS ingestions store derived topic/content identifiers, content-area slugs, weighting_percent values, and SourceRef citations only — no source text (OQ-005). `ratifiedBy` is `null` on every SourceRef until a human countersigns (per OQ-002). ATPs for IP Mathematics (Gr 5–6) and NST (Gr 6) were also ingested as supplementary sources in `caps-mathematics-ip-gr46.ts` and `caps-nst-ip-gr46.ts` respectively.

**Stage 08 is now unblocked for Gr R–7.** All core CAPS subjects for Grades R–7 are ingested. Per-term ATPs are still needed for Foundation Phase and Senior Phase subjects to enable full ATP sequencing. See OQ-002 for remaining items.

## DBE Annual Teaching Plans (ATPs) — 2026-08-19

32 ATP source documents ingested from the `infinite_ai_atp_brain.db` SQLite database (supplied 2026-08-19). 425 topic blocks and 208 FAT schedule rows. Derived structure only — topic names, content areas, week ranges, assessment types, and SourceRef citations. No source text (OQ-005). `ratifiedBy: null` on all SourceRefs until a human countersigns. DBE Circular S19 of 2025 confirms 2023/24 ATPs remain in force until further notice.

| Source ID      | Grade | Subject                           | ATP Year | Status   | Stored in                                      |
| -------------- | ----- | --------------------------------- | -------- | -------- | ---------------------------------------------- |
| GR-FAL-EN-2023 | R     | First Additional Language         | 2023     | INGESTED | `atp-fp-gr-r3.ts` → `ATP_FOUNDATION_SOURCES`   |
| GR-LS-EN-2023  | R     | Life Skills                       | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| GR-MATHS-2023  | R     | Mathematics                       | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G1-FAL-EN-2023 | 1     | English First Additional Language | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G1-HL-EN-2023  | 1     | English Home Language             | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G1-MATHS-2023  | 1     | Mathematics                       | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G2-FAL-EN-2023 | 2     | English First Additional Language | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G2-HL-EN-2023  | 2     | English Home Language             | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G2-MATHS-2023  | 2     | Mathematics                       | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G3-FAL-EN-2023 | 3     | English First Additional Language | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G3-HL-EN-2023  | 3     | English Home Language             | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G3-MATHS-2023  | 3     | Mathematics                       | 2023     | INGESTED | `atp-fp-gr-r3.ts`                              |
| G4-LS-2023     | 4     | Life Skills                       | 2023     | INGESTED | `atp-ip-gr-46.ts` → `ATP_INTERMEDIATE_SOURCES` |
| G4-MATHS-2026  | 4     | Mathematics                       | 2026     | INGESTED | `atp-ip-gr-46.ts`                              |
| G4-NST-2026    | 4     | Natural Sciences and Technology   | 2026     | INGESTED | `atp-ip-gr-46.ts`                              |
| G4-SS-2023     | 4     | Social Sciences                   | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G5-LS-2023     | 5     | Life Skills                       | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G5-MATHS-2026  | 5     | Mathematics                       | 2026     | INGESTED | `atp-ip-gr-46.ts`                              |
| G5-NST-2026    | 5     | Natural Sciences and Technology   | 2026     | INGESTED | `atp-ip-gr-46.ts`                              |
| G5-SS-2023     | 5     | Social Sciences                   | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G6-LS-2023     | 6     | Life Skills                       | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G6-MATHS-2023  | 6     | Mathematics                       | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G6-NST-2026    | 6     | Natural Sciences and Technology   | 2026     | INGESTED | `atp-ip-gr-46.ts`                              |
| G6-SS-2023     | 6     | Social Sciences                   | 2023     | INGESTED | `atp-ip-gr-46.ts`                              |
| G7-EMS-2023    | 7     | Economic and Management Sciences  | 2023     | INGESTED | `atp-sp-gr-7.ts` → `ATP_SENIOR_SOURCES`        |
| G7-FAL-EN-2023 | 7     | English First Additional Language | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-HL-EN-2023  | 7     | English Home Language             | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-LO-2023     | 7     | Life Orientation                  | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-MATHS-2023  | 7     | Mathematics                       | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-NS-2026     | 7     | Natural Sciences                  | 2026     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-SS-2023     | 7     | Social Sciences                   | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |
| G7-TECH-2023   | 7     | Technology                        | 2023     | INGESTED | `atp-sp-gr-7.ts`                               |

Still pending (126 of 152 DBE catalogue entries): FP Home Language / FAL per-term-per-language (Gr 1–3, 11 languages each); Grade R ATPs not yet on FP listing page; IP Life Skills (Gr 4–6); FP Life Skills (Gr 1–3).

## School artefact templates — 2026-08-19

| Document                         | School                       | Kind        | Year | Status               | Stored at                                                                         |
| -------------------------------- | ---------------------------- | ----------- | ---- | -------------------- | --------------------------------------------------------------------------------- |
| Lesson Plan Preparation Template | Benjamin Pine Primary School | LESSON_PLAN | 2026 | PENDING RATIFICATION | `packages/contracts/src/curriculum/sources/template-lesson-plan-benjamin-pine.ts` |

`ratifiedAt: null` — awaiting principal or designate countersignature. Partially closes OQ-003. Remaining: unit blueprint, assessment task, rubric/marking memo, parent progress report.

## SIAS implementation documents — 2026-08-19 (Stage 10 source documents)

| Document                                                                | Publisher | Date  | Status   | Notes                                                                                                                                                                                                                                                            |
| ----------------------------------------------------------------------- | --------- | ----- | -------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Guideline document in respect of SIAS Implementation (Foundation Phase) | DBE / GDE | ~2023 | SUPPLIED | Describes SIAS process flow: Learner Profile → SNA 1 → SNA 2 → SNA 3 → DBE 123b referral. Defines SBST, DBST, ISP roles. Relevant to Stage 10 DW-03/DW-06 agents and MOD-02 SIAS state machine. Not yet ingested as structured source — pending Stage 10 review. |
| Individual Support Plan (ISP) — Foundation Phase                        | DBE / GDE | ~2023 | SUPPLIED | Rating-scale (1–5) per learning area: English, Mathematics, Life Skills, Afrikaans FAL. Structured for capture by DW-04/DW-06. Not yet ingested as structured source — pending Stage 10 review.                                                                  |

## Policy and legislation documents

**Update 2026-08-13.** Fourteen policy and legislation documents have been supplied and
ingested as part of Stage 26 preparatory work. Derived structure (clause identifiers,
section references, typed constants, Zod schemas where relevant) is stored in
`packages/contracts/src/policy/sources/`. No document text is stored in the repository
(OQ-005 resolved).

| Document                                                                                          | Kind          | Version / Date | Gazette / ISBN        | Status   | Stored at                                                                  |
| ------------------------------------------------------------------------------------------------- | ------------- | -------------- | --------------------- | -------- | -------------------------------------------------------------------------- |
| South African Schools Act, No. 84 of 1996 (as amended by BELA Act 32/2024)                        | ACT           | 2024-12-24     | GG 51836, 24 Dec 2024 | RATIFIED | `packages/contracts/src/policy/sources/sasa-84-of-1996.ts`                 |
| National Education Policy Act, No. 27 of 1996                                                     | ACT           | 2011-09-19     | GG 34620, 19 Sep 2011 | RATIFIED | `packages/contracts/src/policy/sources/nepa-27-of-1996.ts`                 |
| Employment of Educators Act, No. 76 of 1998                                                       | ACT           | 2011-09-19     | GG 34620, 19 Sep 2011 | RATIFIED | `packages/contracts/src/policy/sources/eea-76-of-1998.ts`                  |
| General and Further Education and Training Quality Assurance Act, No. 58 of 2001                  | ACT           | 2011-09-19     | GG 34620, 19 Sep 2011 | RATIFIED | `packages/contracts/src/policy/sources/genfetqa-58-of-2001.ts`             |
| South African Council for Educators Act, No. 31 of 2000                                           | ACT           | 2011-09-19     | GG 34620, 19 Sep 2011 | RATIFIED | `packages/contracts/src/policy/sources/sace-act-31-of-2000.ts`             |
| Basic Education Laws Amendment Act, No. 32 of 2024                                                | AMENDMENT_ACT | 2024-09-13     | GG Vol 711 No 51258   | RATIFIED | `packages/contracts/src/policy/sources/bela-act-32-of-2024.ts`             |
| The National Policy on Whole-School Evaluation                                                    | POLICY        | 2001-07        | GG Vol 433 No 22512   | RATIFIED | `packages/contracts/src/policy/sources/doe-wse-policy-2001.ts`             |
| Policy on Screening, Identification, Assessment and Support (SIAS)                                | POLICY        | 2014-12-19     | —                     | RATIFIED | `packages/contracts/src/policy/sources/dbe-sias-2014.ts`                   |
| Department of Basic Education Privacy Policy                                                      | POLICY        | 2023-01-17     | —                     | RATIFIED | `packages/contracts/src/policy/sources/dbe-privacy-policy-2023.ts`         |
| The National Policy Framework for Teacher Education and Development in South Africa (NPFTED)      | FRAMEWORK     | 2007-04-26     | GG No 29832 Vol 502   | RATIFIED | `packages/contracts/src/policy/sources/dbe-npfted-2007.ts`                 |
| Plan of Action: Improving access to free and quality basic education for all (2003)               | PLAN          | 2003-06-14     | —                     | RATIFIED | `packages/contracts/src/policy/sources/doe-free-quality-education-2003.ts` |
| Guidelines for Responding to Learner Diversity in the Classroom Through CAPS (2011)               | GUIDELINE     | 2011           | —                     | RATIFIED | `packages/contracts/src/policy/sources/dbe-learner-diversity-caps-2011.ts` |
| Rights and Responsibilities of Parents, Learners and Public Schools: A Public School Policy Guide | GUIDELINE     | undated        | —                     | DRAFT    | `packages/contracts/src/policy/sources/doe-public-school-policy-guide.ts`  |
| SACE Professional Development Points Schedule                                                     | SCHEDULE      | undated        | —                     | DRAFT    | `packages/contracts/src/policy/sources/sace-pd-points-schedule.ts`         |

Provenance (title, publisher, date of document, date retrieved) for all fourteen documents
is at `docs/sources/policy/SOURCES.md`.
