# Cost Model

Per-school, per-artefact, and per-learner cost estimates in ZAR for the INFINITE-AI
platform. All figures are estimates based on the OQ-043 per-school price and typical usage
patterns. Actual costs depend on model pricing, learner counts, and artefact generation
frequency.

**OQ-018 blocks a precise model:** real gateway telemetry from a live school is needed to
calibrate artefact-generation costs. Figures below use conservative estimates.

---

## Subscription price

Schools pay a per-school formula price, not a fixed tier price. See "School subscription
price" below. Tiers remain only as model-usage (token) quotas.

---

## Cost per artefact (model gateway)

Artefact generation cost is driven by the model gateway. Claude Sonnet 4 is the default
model for all CE, TB, PD, and LE agents. Estimated token usage per artefact type:

| Artefact type                  | Avg input tokens | Avg output tokens | Est. cost (USD) | Est. cost (ZAR)\* |
| ------------------------------ | ---------------- | ----------------- | --------------- | ----------------- |
| Lesson plan (CE-03)            | 2 500            | 1 500             | $ 0.022         | R 0.40            |
| Unit blueprint (CE-02)         | 4 000            | 2 500             | $ 0.037         | R 0.67            |
| Assessment task (CE-04)        | 3 000            | 2 000             | $ 0.029         | R 0.53            |
| Rubric (CE-06)                 | 2 000            | 1 200             | $ 0.018         | R 0.33            |
| Simplified explanation (TB-01) | 1 500            | 800               | $ 0.012         | R 0.22            |
| Practice worksheet (TB-03)     | 2 000            | 1 500             | $ 0.018         | R 0.33            |
| PD micro-course (PD-07)        | 5 000            | 3 000             | $ 0.047         | R 0.85            |

\* Exchange rate: 1 USD = R 18. This will vary.

---

## Cost per learner per month

Estimated model cost per learner per month, assuming typical usage patterns:

| Size band | Learners | Artefacts / learner / month | Model cost / month |
| --------- | -------- | --------------------------- | ------------------ |
| Small     | 150      | 8                           | ~ R 480            |
| Medium    | 500      | 8                           | ~ R 1 600          |
| Large     | 1 000    | 8                           | ~ R 3 200          |

**Margin estimate (120 learners / 8 educators, formula price):**

- Revenue: R 1 380 ex VAT (R 1 587 inc VAT)
- Estimated model cost: depends on usage per learner and educator; see the OQ-018 caveat below
- Infrastructure (hosting, DB, Redis): shared across tenants
- Gross margin: not stated. The earlier "~ R 420 / month (35 %)" figure was computed on the
  retired R 1 200 card and has been withdrawn.

These are rough estimates. Infrastructure costs are shared across tenants and depend on
the hosting provider. Per decision OQ-018 (2026-11-11) the platform logs tokens per agent
and per tenant from day one; after month one, check whether model cost follows learners
or educators and revise the formula's per-learner and per-educator rates if it does not.

---

## School subscription price (OQ-043, decided 2026-11-11, provisional)

The working price is a per-school formula, provisional until three schools have seen it.
Source of truth: `packages/billing/src/pricing.ts`. `packages/billing/test/price-parity.spec.ts`
fails when this file, `ONBOARDING_GUIDE.md` or `financial-model.html` disagree with it.

Monthly price ex VAT = R300 platform fee + R75 per educator + R4.00 per learner (first 500)
\+ R1.50 per learner above 500. Minimum R750 per school per month. Community rate: 50 % of
the standard price (applied after the minimum). Annual prepay: 10 % off twelve months.
Sponsored schools pay the standard rate. VAT is 15 % and invoices show the ex VAT split.

| Reference school  | Learners / educators | Ex VAT / month | VAT        | Inc VAT / month |
| ----------------- | -------------------- | -------------- | ---------- | --------------- |
| Small             | 120 / 8              | R 1 380.00     | R 207.00   | R 1 587.00      |
| Professional-size | 400 / 16             | R 3 100.00     | R 465.00   | R 3 565.00      |
| Group campus      | 1 500 / 55           | R 7 925.00     | R 1 188.75 | R 9 113.75      |

Plan-mix blend (30 % small / 60 % professional-size / 10 % group campus, per the business plan): R 3 066.50 ex VAT.

---

## Metering and reconciliation

The billing system reconciles at month-end:

1. `metering_period` accumulates `tenant_metering_event` rows (one per gateway call).
2. At month-end, the reconciliation job (`pnpm test:billing:reconcile`) computes
   `total_cost_cents` from events and compares to the subscription tier ceiling.
3. If actual cost exceeds the tier ceiling, the school is notified and may be offered an
   upgrade.
4. An invoice (`tenant_invoice`) is generated with line items:
   - Platform fee, educators, learners (first 500) and learners above 500.
   - Minimum monthly charge top-up and community-rate reduction, where they apply.
   - Token overage if usage exceeds the tier's token quota.
5. 15 % VAT is applied to all line items.

---

## Budget alerts

Per-agent cost budgets are set in `packages/agents` (`costBudgetCents`). When a single
call would exceed the budget, the gateway refuses the call with `cost_budget_exceeded`.
The orchestrator logs the refusal and the human-in-the-loop gate fires for review.

Recommended alerts:

- Monthly model cost exceeds 60 % of subscription tier price → warning.
- Monthly model cost exceeds 90 % of subscription tier price → page on-call.

---

## Open questions

See OQ-018 in `docs/OPEN_QUESTIONS.md`: real gateway telemetry from a live school is
needed to replace the estimates above with calibrated figures. The cost model should be
re-validated after the first pilot month.
