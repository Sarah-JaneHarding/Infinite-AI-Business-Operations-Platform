# POPIA

## 1. Roles under the Act

The **school or its governing body is the responsible party** for learner personal
information. **INFINITE-AI is the operator**, processing only on the school's documented
instruction, within the school's tenant, inside `af-south-1`.

That split drives the architecture: the school ratifies its own constitution (L0), owns
its consent ledger, and can export or erase its data without our involvement.

## 2. The privacy invariants

These are enforced by code and proven by tests, not by policy documents:

1. **No learner personal information enters a prompt.** Everything derived from learner
   data passes through the De-identification Service and carries
   `{ deidentified: true, salt_version, dropped: [...] }`. The PII egress guard sits on
   the only path to the Model Gateway and rejects anything without that provenance.
   Rejection is a hard error, never a warning.
2. **Purpose limitation is enforced at query time.** Every query for learner data takes a
   `purpose`. The data layer intersects the requested columns with the purpose's
   allow-list and the subject's consent, and **drops** disallowed columns. Every drop is
   logged.
3. **Minimality.** The smallest field set that answers the question, never the whole
   profile.
4. **Re-identification happens only inside the school boundary**, for an authorised role,
   against a stated purpose, and writes an audit event.
5. **Special personal information** (health, disability, biometrics) sits under stricter
   handling, application-level encryption and shorter retention.
6. **Row-level tenant isolation.** No cross-school inference on identifiable data, ever.

## 3. Purpose taxonomy

Defined in `packages/contracts` in Stage 03. Each purpose declares the data categories it
may touch:

`planning` · `screening` · `intervention` · `reporting_parent` · `reporting_district` ·
`pd_analytics` · `product_improvement`

A purpose that is not on this list does not exist. Adding one requires updating this
document and the consent model **first**, and having that ratified before code is written.

## 4. Consent ledger

Per data subject, per data category, per purpose: lawful basis, source of consent,
timestamp, evidence reference, and withdrawal. Consent is versioned and never deleted.

**Shape** — `packages/contracts/src/popia/consent.ts`. **Evaluation** —
`packages/policy/src/consent.ts`. **Storage** — the `consent_record` table, whose write
path is `appendConsentEntry` in `packages/db`.

### 4.1 Consent is not the only lawful basis

This is the part that is easiest to get backwards, and getting it backwards causes harm in
both directions.

A school processes a learner's marks under its public-law duty, not because a guardian
ticked a box. Recording that processing as consent-based would mean a withdrawal could
oblige the school to stop keeping a record the law requires it to keep. Conversely,
recording genuinely optional processing as statutory would deny a family a choice they
actually have.

So the ledger records which of POPIA §11(1)'s six bases applies to each combination of
subject, category and purpose:

| Basis                 | §11(1) | Ends on the subject's say-so? |
| --------------------- | ------ | ----------------------------- |
| `CONSENT`             | (a)    | Yes — §11(2)(b)               |
| `CONTRACT`            | (b)    | No                            |
| `LEGAL_OBLIGATION`    | (c)    | No                            |
| `SUBJECT_INTEREST`    | (d)    | No                            |
| `PUBLIC_LAW_DUTY`     | (e)    | No                            |
| `LEGITIMATE_INTEREST` | (f)    | Yes — §11(3)(b)               |

A withdrawal against one of the four that a subject cannot unilaterally end is recorded as
an **objection**. It does not stop the processing, and it is not swallowed either: it is
returned on every access decision for that subject and appears in the information
officer's queue via `unresolvedObjections()` until someone answers it. An objection
mechanism whose objections disappear is worse than none.

### 4.2 The ledger is a log, not a state table

Nothing is updated and nothing is deleted — enforced by a database trigger, not by
convention, so a bug, a careless migration or a compromised application cannot rewrite what
a school was permitted to do. There is no way to tidy this table. That is the entire value
of it.

Effective consent at any moment is derived by replaying entries up to that moment, which
makes "were we permitted to do this on the day we did it?" an answerable question. A
mutable `consent_granted` boolean cannot answer it, and that is the question an Information
Regulator enquiry asks.

`effectiveFrom` and `recordedAt` are separate fields. A form signed on Monday and captured
on Thursday is effective from Monday; evaluation uses `effectiveFrom` and the three-day gap
stays visible. Future-dating is refused outright — an entry that switches itself on later
cannot be withdrawn before it does.

## 5. Retention and erasure

- Learner personal information carries a TTL from the retention schedule. Policy and
  curriculum do not expire.
- A nightly job tombstones expired PII.
- `subject_erasure` (a) tombstones personal data, (b) **preserves the decision record**
  with the subject replaced by its token, (c) triggers reindexing, (d) emits an audit
  event. The memory of the decision survives; the personal data does not.
- Consent withdrawal makes the subject's PII unreadable within one job cycle.

### 5.1 The retention schedule is the school's to set, and this system ships none

POPIA §14(1) requires that personal information not be kept longer than necessary, unless
a law requires otherwise — and for a South African school, "unless a law requires
otherwise" does most of the work. Admission registers, attendance registers and mark
schedules carry statutory retention periods set outside this system.

`packages/contracts/src/popia/retention.ts` therefore defines the **shape** of a schedule
and the arithmetic that evaluates it, and contains no periods. Not one. A plausible-looking
default would be wrong in a way nobody checks and would destroy records on a schedule no
human agreed to. A test asserts the package exports no schedule, so this stays true rather
than merely being written down here. **See OQ-007.**

**The form is `docs/RETENTION_SCHEDULE_TEMPLATE.md`** — one row per category, with the
anchor and authority fields explained in the language a governing body meeting uses. A
filled-in schedule is checked with `pnpm check:retention <file>` before it is loaded: that
refuses anything malformed, and refuses a rule whose Authority column is still a
placeholder, because a rule with no real source will delete records just as effectively as
one with a good one.

Each rule a school ratifies carries four things:

| Field          | Why it is required                                                                                                                                                                                |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `category`     | One rule per data category. There is no catch-all, and there will not be one — a default would silently govern categories nobody considered.                                                      |
| `anchor`       | The event the period runs from. "Five years" means nothing until you say five years from what; for a Grade R learner who stays to Grade 7, record-creation and school-exit are seven years apart. |
| `retainMonths` | Whole months, because schedules are written that way.                                                                                                                                             |
| `authority`    | The Act, regulation, circular or minuted resolution that makes the period defensible. A period nobody can source is a period that gets withdrawn under pressure at the worst moment.              |

**A category with no ratified rule is never tombstoned.** It is reported as unscheduled on
every retention run instead. Erring toward retention is itself a §14 exposure, which is why
the gap is a loud finding rather than a silence.

`evaluateRetention()` has exactly one path to `tombstone`: a ratified rule, whose anchor
matches the record's, whose period has elapsed. Every other outcome retains and says why.

### 5.2 What erasure actually destroys

A naive erasure deletes the learner row and with it every record of the school's own
decisions — the screening that flagged a reading difficulty, the support plan the SBST
agreed, the referral it made. That does not protect the child. It destroys the evidence of
how the child was treated, which is what an inquiry would need.

So `eraseSubject()` destroys the mapping and keeps the record:

**Destroyed** — every `learner_identifier` row (name, ID number, date of birth, SA-SAMS
reference), deleted rather than tombstoned, because a tombstoned ciphertext is still a
decryptable ciphertext for anyone holding the key. Home language goes too; in the South
African context it is a proxy for ethnicity and a §26 special category by that route.

**Kept, keyed by token** — enrolment history, the decision record, the guardian link, the
audit trail, and the consent ledger itself. Section 24 does not entitle a subject to erase
the responsible party's record of its own lawful acts, and §14(5) expressly contemplates
de-identification as the alternative to destruction.

Afterwards the school can still say "LNR_7F3A2C was screened in Term 2 and referred in
Term 3", and can no longer say who that was.

Erasure is idempotent, runs inside the caller's tenant transaction so it cannot succeed
without its audit event, and refuses to report success for a subject the caller cannot see
— a retention job must not be able to claim it erased records it never touched.

## 6. Data subject rights

Access, correction, objection, erasure and portability export are modelled as **cases with
a state**, not as endpoints that act immediately — the `data_subject_request` table.

Erasure and correction change a school's records, and a school is entitled to establish
that the person asking is who they say they are before that happens. The verification gate
is a human one (`verifiedBy`, `verifiedAt`) and is recorded rather than assumed. The §23(1)
response clock is stored as `dueAt` so a request cannot quietly age out, and a refusal is
an outcome the model can express, because a refusal with a reason is an answer and silence
is not.

**Not yet built:** the HTTP surface. The request model, its states and the erasure it
drives are in place; the authorised, audited, rate-limited endpoints land with the API app.
Recorded in `docs/STAGE_LOG.md` rather than left to be discovered.

## 7. Cross-border processing

Default off. Sending even de-identified text outside `af-south-1` requires a per-tenant
setting and is logged on every call.

## 8. Sections still to be completed

The operator agreement template and the incident procedure. Retention **periods** are
deliberately not among them — they are each school's determination to make and ratify, and
§5.1 explains why this system will not supply them. Anything ambiguous goes to
`OPEN_QUESTIONS.md`; POPIA rules are not guessed at.
