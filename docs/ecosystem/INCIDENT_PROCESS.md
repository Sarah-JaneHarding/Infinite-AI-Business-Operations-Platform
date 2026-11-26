# Incident Process

On-call rotation, severity classification, and response procedures for INFINITE-AI.

---

## Severity levels

| Severity | Definition                                                  | Response time     | Examples                                                |
| -------- | ----------------------------------------------------------- | ----------------- | ------------------------------------------------------- |
| **P1**   | Complete service unavailability or confirmed data breach    | 15 minutes        | Gateway down, RLS bypass detected, PII in logs          |
| **P2**   | Significant degradation for ≥ 1 tenant, or security concern | 1 hour            | Artefact generation failing for one school, auth errors |
| **P3**   | Minor degradation or cosmetic issue                         | Next business day | Slow page loads, UI glitch, non-critical bug            |
| **P4**   | Enhancement request or question                             | Within 1 week     | Feature feedback, documentation gaps                    |

---

## On-call rotation

**Minimum viable rotation:** 2 engineers. Each engineer is on-call for one week at a
time, rotating on Monday 08:00 SAST.

| Role              | Responsibility                                                    |
| ----------------- | ----------------------------------------------------------------- |
| Primary on-call   | First responder for all P1/P2 alerts. Pages within 15 min for P1. |
| Secondary on-call | Backup if primary is unreachable within 15 minutes.               |

**Decision 2026-11-11 (Sarah-Jane Harding): the founder is the on-call responder until the
pilot phase is complete.** There is no rota and no second person until then, so the
"2 engineers" minimum above does not apply during the pilot. To be reviewed when more
schools are onboarded. Until the review, treat the secondary-on-call row as unfilled, and
do not promise a school a response time that depends on a second person.

**OQ-019:** The actual rotation schedule is not populated until pilot engineers are
confirmed. The tooling (PagerDuty or equivalent) is blocked on OQ-014 (paging
integration).

### Alert routing

All alerts flow from the monitoring system → PagerDuty → on-call engineer's phone.
Safeguarding escalations skip PagerDuty and page immediately (OQ-014).

---

## Incident response procedure

### P1 — 15 minute SLA

1. **Acknowledge** the alert in PagerDuty.
2. **Assess**: confirm the nature of the incident. Check the runbooks in `docs/RUNBOOKS/`.
3. **Communicate**: post to the `#incidents` channel:
   ```
   [P1 INCIDENT OPEN] <short description>
   Impact: <who is affected>
   Current status: Investigating
   Next update: <15 min>
   ```
4. **Mitigate**: apply the relevant runbook. Rollback if a recent deploy is the cause
   (see `RUNBOOKS/canary-deploy.md`).
5. **Escalate** to security lead if PII may have been exposed (within 30 minutes).
6. **Resolve**: confirm resolution, post to `#incidents`.
7. **Post-mortem**: within 48 hours. See post-mortem template below.

### P2 — 1 hour SLA

Same flow as P1 but with a 1-hour initial response and 4-hour resolution target.
Communication is in `#incidents` but does not require a 15-minute update cadence.

### P3 / P4

Log as a GitHub issue with the appropriate severity label. No on-call escalation.

---

## Data breach response (POPIA §22)

If personal information of learners, educators, or staff may have been compromised:

1. **Immediately** page the security lead (do not wait for normal on-call response).
2. Preserve evidence: do not modify logs or rotate secrets without guidance.
3. **Within 72 hours**: notify the Information Regulator (POPIA §22(1)).
4. **Notify affected data subjects** as soon as reasonably practicable.
5. Open a confidential incident record in `docs/RUNBOOKS/` (not a public GitHub issue).
6. Engage legal counsel.

---

## Post-mortem template

```
# Post-mortem: <incident title>
Date: YYYY-MM-DD
Severity: P1 / P2
Duration: HH:MM
Impact: <tenants affected, features degraded>

## Timeline
- HH:MM: <event>
- HH:MM: alert triggered
- HH:MM: on-call acknowledged
- HH:MM: root cause identified
- HH:MM: mitigation applied
- HH:MM: resolved

## Root cause
<one paragraph>

## Contributing factors
- <factor 1>
- <factor 2>

## What went well
- <item>

## Action items
| Action | Owner | Due date | Status |
|---|---|---|---|
| | | | |

## Lessons learned
<paragraph>
```

---

## Runbooks

| Scenario                       | Runbook                              |
| ------------------------------ | ------------------------------------ |
| Canary deploy and rollback     | `docs/RUNBOOKS/canary-deploy.md`     |
| Gateway latency spike          | `docs/RUNBOOKS/gateway-latency.md`   |
| Database restore (DR)          | `docs/RUNBOOKS/db-restore.md`        |
| RLS isolation breach           | `docs/RUNBOOKS/rls-breach.md`        |
| PII in logs                    | `docs/RUNBOOKS/pii-in-logs.md`       |
| Safeguarding escalation        | `docs/RUNBOOKS/safeguarding.md`      |
| POPIA data-subject request     | `docs/RUNBOOKS/popia-dsr.md`         |
| Billing reconciliation failure | `docs/RUNBOOKS/billing-reconcile.md` |

Runbooks are validated in CI by `pnpm drill:restore`, which checks that each runbook
file exists and declares an `RTO` and `RPO` in its header.
