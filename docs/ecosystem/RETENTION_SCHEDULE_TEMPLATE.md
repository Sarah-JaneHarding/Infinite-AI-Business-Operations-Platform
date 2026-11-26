# Retention schedule — ratification template

**For:** the governing body of **\*\***\_\_\_\_**\*\***
**Prepared:** **\_\_\_\_** **Ratified:** **\_\_\_\_**

---

## What this document is

POPIA §14(1) says personal information must not be kept longer than is necessary for the
purpose it was collected for, **unless a law requires or permits a longer period**. For a
school that exception does a great deal of the work: several learner records carry
retention periods set by statute, not by the school's preference.

INFINITE-AI enforces a retention schedule. It does not supply one, and it will not.

The periods are a legal determination about your school's records. A default shipped in
software would be wrong in a way nobody checks, and it would destroy records on a timetable
no person ever agreed to. So the system holds the shape of a schedule and the arithmetic to
apply it, and this form is where the numbers come from.

**Until a category has a ratified rule below, nothing in it is ever deleted
automatically.** It appears instead on an "unscheduled categories" report on every
retention run. That is deliberate: erring toward keeping data is itself a §14 exposure, so
the gap is made loud rather than silent.

> **This template is not legal advice.** It is a form for recording a decision your school
> takes with its own advisors. Nothing in it has been checked against South African law by
> the people who built this system.

---

## Demo/pilot release: a starting point, not an exception

Everything above still holds. What changed for the demo/pilot release is that a school no
longer has to arrive at the `ratify_retention_schedule` onboarding step with a blank page:
it is pre-filled with `@infinite-ai/contracts`' `DEMO_RETENTION_ESTIMATES` — one round-number
estimate per category (7 years for identifiers/enrolment/marks, 3 years for
attendance/behaviour/staff-practice, 5 years for support-need/special-personal, 2 years for
family-context) — the same role this document's own blank table already plays, pre-filled
instead of blank.

Every one of those estimates carries an `authority` field that says, in full, **"INFINITE-AI
DEMO ESTIMATE — not a legal citation; confirm or replace with your own governing body's
determination."** That is not decoration: it is what stops "an admin clicked accept during
onboarding" from ever being mistaken for "the school's governing body researched and cited a
real retention law." Those are both real events. They are not the same event.

A school at onboarding has exactly three honest options, in order of how much this document
still matters:

1. **Accept the estimates as-is** to unblock a demo or pilot quickly. The resulting rules
   are real (`ratifiedBy`/`ratifiedAt` capture who did this and when), but every `authority`
   still reads as a demo estimate — nothing here claims to be a legal citation.
2. **Override one or more categories** during the same onboarding step, supplying a real
   `authority` for just the categories the school has already settled.
3. **Fill in this template for real** — the process this whole document describes — and
   have the school's own legal advisor supersede every estimate before go-live.

None of this changes what the rest of this document says: the actual determination is still
each school's own, nothing here is a legal opinion, and a rule with a placeholder authority is
still refused by `pnpm check:retention` and by `reviewSchedule()`. See
`packages/contracts/src/popia/retention-demo-defaults.ts` for the estimates themselves, and
OQ-007's 2026-08-31 update in `docs/OPEN_QUESTIONS.md`.

---

## What each row needs

A rule is only accepted by the system if it carries all four. The fourth is the one people
try to skip.

| Field               | What it means                                                                                                                                                                     |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Category**        | Which kind of information. Fixed list — see below.                                                                                                                                |
| **Anchor**          | The event the clock runs from. "Five years" means nothing until you say five years from what.                                                                                     |
| **Retain (months)** | Whole months from the anchor.                                                                                                                                                     |
| **Authority**       | The Act, regulation, circular or minuted resolution this period rests on. A period nobody can source gets withdrawn the first time it is challenged, usually at the worst moment. |

### The anchors

| Anchor              | Runs from                                                     | Typically suits                  |
| ------------------- | ------------------------------------------------------------- | -------------------------------- |
| `RECORD_CREATED`    | The day the record was written.                               | Transient operational data.      |
| `ACADEMIC_YEAR_END` | The end of the academic year the record belongs to.           | Marks, attendance.               |
| `SUBJECT_EXIT`      | The day the learner left — transferred, graduated, withdrawn. | Enrolment and admission records. |
| `CASE_CLOSED`       | The day the support case was formally closed.                 | SIAS intervention records.       |

The anchor choice matters more than it looks. For a learner who joins in Grade R and leaves
after Grade 7, `RECORD_CREATED` and `SUBJECT_EXIT` are about **seven years apart** for the
same record.

---

## The schedule

Fill in one row per category. Leave a row blank if the school has not decided — blank is a
safe state, and the system will keep reporting it.

| #   | Category               | What it covers                                                      | Anchor   | Retain (months) | Authority    |
| --- | ---------------------- | ------------------------------------------------------------------- | -------- | --------------- | ------------ |
| 1   | `IDENTIFIER_TOKEN`     | The pseudonym itself. Holds no personal information on its own.     | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 2   | `DIRECT_IDENTIFIER`    | Name, ID number, date of birth, address, contact details.           | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 3   | `ENROLMENT`            | Grade, class, subjects, enrolment status.                           | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 4   | `ACADEMIC_PERFORMANCE` | Marks, assessment results, academic progress.                       | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 5   | `ATTENDANCE`           | Presence, absence, punctuality.                                     | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 6   | `BEHAVIOUR`            | Conduct records, incidents.                                         | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 7   | `SUPPORT_NEED`         | Screening scores, tier decisions, intervention history.             | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 8   | `SPECIAL_PERSONAL`     | **POPIA §26** — health, disability, biometrics. Strictest handling. | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 9   | `FAMILY_CONTEXT`       | Home language, guardian relationships, communication preferences.   | **\_\_** | **\_\_**        | **\_\_\_\_** |
| 10  | `STAFF_PRACTICE`       | Teacher-level practice data. Developmental only.                    | **\_\_** | **\_\_**        | **\_\_\_\_** |

### Notes for whoever fills this in

- **Row 8 deserves its own conversation.** Special personal information under §26 carries
  stricter handling and, ordinarily, a shorter life than the rest. If it ends up with the
  longest period on this page, that is worth a second look.
- **Row 1 is not like the others.** A token is meaningless once the identifiers it points at
  are gone. Keeping tokens longer is what lets the school say "a learner in this class was
  referred in Term 3" after the child can no longer be identified — which is usually the
  intent, not an oversight.
- **One category, one period.** There is deliberately no catch-all row. A default would
  quietly govern categories nobody discussed, which is how §26 material ends up on the same
  clock as a class list.

---

## Where the answers usually come from

Starting points only — **each must be confirmed by the school's own legal advisor.** These
have not been verified against current law by the people who built this system, and the
specific periods they set are not reproduced here for exactly that reason.

- **Protection of Personal Information Act 4 of 2013**, §14 — the general rule and its
  exceptions.
- **South African Schools Act 84 of 1996** and its provincial regulations — admission and
  attendance registers.
- **National Archives and Record Service of South Africa Act 43 of 1996** — applies to
  public bodies' records and may set disposal authorities relevant to a public school.
- Your **provincial education department's** records-management directives and circulars.
- The school's own minuted governing-body resolutions, where no external rule applies.

If two sources conflict, record the longer period and note the conflict in the Authority
column. The system will enforce whatever is written here.

---

## Entering a ratified schedule

Once signed, each row becomes one record. The system validates the whole schedule before
accepting it and refuses a rule with a missing or placeholder authority.

```jsonc
{
  "tenantId": "<the school's tenant id>",
  "rules": [
    {
      "category": "ATTENDANCE",
      "anchor": "ACADEMIC_YEAR_END",
      "retainMonths": 0, // ← the ratified figure from the table above
      "authority": "<Act, regulation, circular or minuted resolution>",
      "ratifiedAt": "2026-__-__T00:00:00.000Z",
      "ratifiedBy": "<governing body>",
    },
  ],
}
```

Check it before it goes anywhere near the database:

```bash
pnpm check:retention path/to/schedule.json
```

That reports every category still unscheduled, and refuses anything malformed or
placeholder-filled. A schedule that does not pass this check is not loaded.

---

## Signatures

| Role                        | Name | Signature | Date |
| --------------------------- | ---- | --------- | ---- |
| Chairperson, governing body |      |           |      |
| Principal                   |      |           |      |
| Information Officer         |      |           |      |

---

Tracked as **OQ-007** in `docs/OPEN_QUESTIONS.md`. Enforcement lives in
`packages/contracts/src/popia/retention.ts`; the reasoning behind shipping no periods is in
`docs/POPIA.md` §5.1.
