# School Onboarding Guide

This guide walks a school administrator through the seven-step onboarding wizard in
INFINITE-AI. By the end of step 7 the school's readiness score is 100 and the platform
is live.

The provisioning wizard is gated behind the `pilot_school_onboarding_wizard` feature flag.
When the flag is off, provisioning is done manually by the operations team via the admin
API. When the flag is on, school administrators see this wizard in `apps/web`.

---

## Before you start

You will need:

- Your school's EMIS number (from the Department of Basic Education).
- A list of your staff email addresses and their roles (principal, HoD, educator).
- Your school's current academic year calendar (term dates).
- The signed POPIA data-processing agreement.
- A school logo (PNG or SVG, square preferred).

---

## Step 1 — School profile

**What you fill in:** School name, EMIS number, kind (`SCHOOL` or part of a `SCHOOL_GROUP`),
physical address, and your school's preferred language of instruction (LoLT).

**What the system validates:**

- EMIS number format (`^\d{9}$`).
- Slug uniqueness across all tenants (derived from the school name, editable).

**What happens:** A `school` row is created inside your tenant. Your provisioning wizard
moves to step 2.

---

## Step 2 — Phases and grades

**What you fill in:** Which phases your school covers (Foundation, Intermediate, Senior,
FET) and which grades within each phase.

**What the system validates:**

- At least one phase must be selected.
- Grade numbers must be within the phase range (R–3, 4–6, 7–9, 10–12).

**What happens:** `phase` and `grade` rows are created. The curriculum graph for your
selected grades is prepared (source documents: OQ-002).

---

## Step 3 — Class groups and subjects

**What you fill in:** Class group names for each grade (e.g., "6A", "6B") and which
subjects are offered per grade.

**What the system validates:**

- At least one class group per grade.
- Subject names matched against the CAPS subject list for that phase.

**What happens:** `class_group` and `subject` rows are created. The subject-phase
curriculum graph is activated for lesson-plan generation.

---

## Step 4 — Staff and roles

**What you fill in:** Staff email addresses and their platform roles:

| Role                 | Access                                                    |
| -------------------- | --------------------------------------------------------- |
| `principal`          | All modules, school-wide data, staff management           |
| `head_of_department` | All modules, phase/grade data, artefact approval          |
| `educator`           | Own class group, own artefacts, learner data in own class |
| `support_educator`   | Support Analytics Centre (MOD-02), no curriculum data     |
| `admin_staff`        | Billing and provisioning only                             |

**What the system validates:**

- At least one `principal` role must be assigned.
- Email addresses must be resolvable (format check; DNS MX check in production).

**What happens:** `user_account` and `role_assignment` rows are created. Invitation
emails are displayed in the wizard for manual sending; automated sending is not
enabled until a transactional email provider is configured (OQ-021).

---

## Step 5 — Academic calendar

**What you fill in:** The current academic year label (e.g., "2026") and the four term
start/end dates.

**What the system validates:**

- Terms must not overlap.
- Terms must fall within the calendar year.

**What happens:** `academic_year` and `term` rows are created. The curriculum planning
calendar becomes available to educators.

---

## Step 6 — Consent and data-processing agreement

**What you fill in:** Confirmation that the school has read and signed the POPIA
data-processing agreement, and the name and role of the authorising officer.

**What the system records:**

- A `consent_record` with `decision = GRANTED`, `basis = LEGAL_OBLIGATION`, and
  `source = STAFF_CAPTURED` is created for the school-level consent.
- An `audit_event` records who authorised and when.

**Important:** This consent record cannot be deleted — it is the evidence that the school
lawfully authorised data processing. Revoking it requires contacting the operations
team, who will follow the POPIA data-subject request process.

### Retention schedule

Consent says the school may process learner data for a stated purpose. It does not say
for how long — that is a separate POPIA §14(1) question, and it is answered here, as
part of the same step, because both are decisions the authorising officer is making on
the school's behalf.

**What you see:** A pre-filled table, one row per data category (identifiers, enrolment,
academic performance, attendance, behaviour, support need, special personal information,
family context, staff practice), each with a suggested retention period and an anchor
event (record created, academic year end, learner exit, or case closed). Every row's
authority reads **"INFINITE-AI DEMO ESTIMATE — not a legal citation"** — these are
reasonable starting numbers for a demo or pilot release, not a researched legal
determination.

**What you can do:**

- **Accept the estimates as they stand**, to get through onboarding quickly. You can
  revisit and override them later.
- **Override any row** with your own school's determination and its source (an Act, a
  provincial circular, or a minuted governing-body resolution).
- **Do the full exercise properly**, using `docs/RETENTION_SCHEDULE_TEMPLATE.md` with your
  own legal advisor, and enter the ratified result here instead.

**What the system validates:** Every row must have a positive whole-month period, a
real anchor, and an authority that is not empty or a placeholder (`TBC`, `pending`, and
similar are rejected).

**What the system records:** One `retention_rule` row per category, stamped with who
accepted or ratified it and when (`ratifiedBy`/`ratifiedAt`) — whether that is "the
demo estimate, reviewed and accepted during onboarding" or "the governing body's own
researched determination." This step cannot be skipped: a tenant is not considered
ready for go-live (see Step 7) until a retention schedule — even the demo estimate — has
been ratified for it. See OQ-007 in `docs/OPEN_QUESTIONS.md`.

---

## Step 7 — Billing and subscription

**What you fill in:** Your billing contact email, billing address, and VAT number (if
registered). Your price is calculated from your school's size. There is no tier to pick for
seats (OQ-043, provisional until three schools have seen it):

Monthly price ex VAT = R300 platform fee + R75 per educator + R4.00 per learner (first 500)

- R1.50 per learner above 500. Minimum R750 per month. Community rate: 50 % of the standard
  price. Annual prepay: 10 % off.

| Example school               | Ex VAT / month | VAT (15 %) | Inc VAT / month |
| ---------------------------- | -------------- | ---------- | --------------- |
| 120 learners, 8 educators    | R 1 380.00     | R 207.00   | R 1 587.00      |
| 400 learners, 16 educators   | R 3 100.00     | R 465.00   | R 3 565.00      |
| 1 500 learners, 55 educators | R 7 925.00     | R 1 188.75 | R 9 113.75      |

Invoices show the ex VAT amount, the VAT and the total. Invoices are generated monthly in arrears.

**What the system records:**

- A `subscription` row with `status = ACTIVE`.
- A `metering_period` opens for the current calendar month.

**Readiness score:** After step 7 the readiness score reaches 100 and the school is live.
The wizard marks `provisioning_record.readiness = 100` and the platform is accessible.

---

## After onboarding

- Educators can log in and start creating artefacts immediately.
- The first invoice is generated at the end of the month.
- If your learner or educator count changes, the new price applies from the following billing period.
- For help, contact your assigned implementation partner or open a support ticket in the
  platform.

---

## Troubleshooting

| Problem                       | Solution                                                                  |
| ----------------------------- | ------------------------------------------------------------------------- |
| Wizard step won't advance     | Check the validation errors displayed below each field.                   |
| Staff invitation not received | Send the link manually from step 4's "copy link" button.                  |
| Wrong EMIS number             | Contact the operations team — EMIS number cannot be changed self-service. |
| Billing contact change        | Available in the billing settings after onboarding.                       |
| POPIA data-subject request    | Use the "Data subject requests" section in the admin panel.               |
