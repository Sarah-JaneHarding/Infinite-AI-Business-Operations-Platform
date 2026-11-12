# Compliance map (POPIA)

**This is an engineering map, not legal advice and not a claim of compliance.** It lists what the platform *does* that
supports each of POPIA's eight conditions for lawful processing, what it does **not** do, and what needs a lawyer or your
Information Officer. Whether the platform, your organisation and your contracts comply with POPIA is a legal determination
this document cannot make. Status words: **Built** (code and tests exist), **Partial**, **Not built**, **Legal** (a human
or legal decision is needed before any claim is made).

Scope today: an internal operations platform for the company. By design it **refuses learner-level data** and drafts only;
named people review, countersign and ratify. The design reasoning is in `docs/PLATFORM_DESIGN.md`.

## The eight conditions

| # | Condition | Supporting controls (evidence) | Status | Gaps and what is needed |
| - | --------- | ------------------------------ | ------ | ----------------------- |
| 1 | Accountability (s8) | Named human on every approval, countersignature and decision; hash-chained, server-sequenced audit ledger (`src/core/ledger.ts`, `src/server/ledgerService.ts`); officer role for sensitive decisions (`src/server/security.ts`, opt-in) | Partial | No appointed Information Officer recorded in the system. Roles are interim (OPQ-002, OPQ-015). **Legal:** appoint and register the Information Officer. |
| 2 | Processing limitation (s9-12) | Learner data refused at the gate (`src/core/guardrails/engine.ts`); personal data needs a lawful basis (contract rule C4); drafts are minimised by PII detection (`src/core/guardrails/pii.ts`); erasure request with tombstone blocks future processing (`src/core/erasure.ts`) | Partial | Consent and lawful-basis *records* for staff or customer contacts are not captured. **Legal:** confirm lawful basis per processing activity. |
| 3 | Purpose specification (s13-14) | Closed purpose list; each agent contracted for one purpose; model calls checked against it (rules M3, C3) | Partial | **Retention is not implemented.** No schedule, no automatic deletion; the ledger and warehouse only grow (OPQ-010). **Legal:** retention periods are a legal determination. |
| 4 | Further processing limitation (s15) | Purpose enforced again at the model door (M3) and at the board (a draft cannot be repurposed; ratified output is immutable) | Partial | No compatibility assessment workflow for new uses. |
| 5 | Information quality (s16) | Claim-checking: figures must be sourced or typed (acceptance A1-A10, `src/core/acceptance.ts`); drafts are always drafts; human review and countersign before anything is final | Partial | The deterministic fallback still contains illustrative sample values (OPQ-014). No correction workflow for ratified records beyond `revise()`. |
| 6 | Openness (s17-18) | `docs/` describe the data flows, model rules, and board | Partial | No data-subject-facing notice; no PAIA manual from this system. **Legal.** |
| 7 | Security safeguards (s19-22) | Per-user token sign-in, fail-closed config (`src/server/auth.ts`); input validation on every write (`src/server/validate.ts`); append-only ledger; no PII to models (M1/M2, `deidentified` stamp); every model call audited before and after (M7); security headers, CSP, request and bad-token limits (`src/server/security.ts`); secrets only in env, and CI fails if a `.env` is committed | Partial | See **Known security gaps** below. **No breach detection or notification process** (s22). **Legal:** written agreements with model providers as operators (s20-21). |
| 8 | Data-subject participation (s23-25) | Erasure request flow with two-person decision (OPQ-013) | Partial | **No access or correction request flow.** Erasure applies a tombstone for future processing; deleting data already held is a manual step. Deadlines are not modelled (legal determination). |

## Other provisions to check

| Provision | Position | Status |
| --------- | -------- | ------ |
| Children's personal information (s34-35) | Learner data is refused by design, so the platform should never hold it. This is a *refusal control*, not a guarantee: detection is pattern-based and can miss. | Partial. **Legal:** confirm what the company may process for schools. |
| Cross-border transfer (s72) | Model providers (Anthropic, Google) are likely outside South Africa. Only de-identified, stamped text is sent. | **Legal:** confirm the basis for sending even de-identified business data abroad, and the providers' terms. |
| Operators (s20-21) | Providers act as operators when they process prompts. | **Legal:** written contracts; check retention and training-use terms. The hub's attestation records that a person reviewed terms; it does not review them. |
| Direct marketing (s69) | No outbound email/WhatsApp/social is built (OPQ-003). Sending needs a ratified artefact with two signers. | Not built, by choice. |
| Information Regulator (registration, prior authorisation) | Not handled by the platform. | **Legal.** |

## Known security gaps (as of this stage)

1. **Data at rest is not encrypted by the application.** Records are JSON-lines files (`data/warehouse`); rely on disk encryption and host controls until the warehouse moves to Postgres (OPQ-010).
2. **Any signed-in user can read the whole warehouse** (`GET /api/warehouse`, `/api/warehouse-export.jsonl`). Reads are not scoped by role or collection. This is the largest open access gap.
3. **Tokens are static.** `OPS_USERS` tokens do not expire; rotation means editing the environment and restarting. No SSO, no MFA (OPQ-002, OPQ-011).
4. **Roles are one flag.** Only `officer` exists, and it is off unless `OPS_ROLES` is set. There is no per-department access control.
5. **Single instance, in-memory limits.** Rate limits reset on restart and are per process.
6. **No tamper-evidence outside the application.** The ledger chain detects edits inside the data, but nobody external anchors its head hash.
7. **No backup, restore or disaster-recovery procedure** is documented or tested.
8. **The browser keeps the sign-in token in `sessionStorage`** (`src/core/api.ts`), so a cross-site-scripting bug would expose it. The CSP (scripts from this origin only) is the mitigation; it is applied to the built app only, not the dev server. Provider keys never reach the browser. Without a server (local mode) the whole warehouse sits unencrypted in the browser's `localStorage`.
9. **Third-party request:** the page loads fonts from Google Fonts, which discloses visitors' addresses to Google. Self-host the fonts to remove this.
10. **Provider adapters are unverified against live accounts** (OPQ-016).

## What is enforced, and where

| Control | Enforced by | Test |
| ------- | ----------- | ---- |
| No learner data into a prompt | `src/core/guardrails/pii.ts`, hub M1/M2 | `test/guardrails.test.ts`, `test/models-rules.test.ts` |
| One door to every model | `src/server/models/hub.ts` | `test/models-door.test.ts` |
| Provider and purpose limited per agent | contract C3, C6 | `test/contracts.test.ts` |
| Human decision cannot be skipped | `src/core/platform.ts`, `src/server/validate.ts`, contract C5 | `test/lifecycle.test.ts` |
| Ledger cannot be forged by a client | `src/server/ledgerService.ts` | `test/ledger-sequencing.test.ts` |
| Hardening headers, limits, roles | `src/server/security.ts` | `test/security.test.ts` |

## Not claimed

The platform does not claim to be "POPIA compliant". It claims only the controls above, each with a test. A readiness review by
a South African privacy attorney or your Information Officer should walk the **Legal** items before any such statement is made.
