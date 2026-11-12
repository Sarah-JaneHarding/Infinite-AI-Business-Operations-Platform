# Recommendations for the open questions

My recommendation for each item in `docs/OPEN_QUESTIONS.md`, with what it would cost to build. These are
suggestions for you to accept, change or reject. Where something is a legal call I say so and do not pick for you.
"Decide" is what I need from you; "Then I" is what I would do after.

## Do these first (they unblock the most)

| Order | Question | Recommendation | Decide | Then I |
| ----- | -------- | -------------- | ------ | ------ |
| 1 | **OPQ-001** credentials | Create a fine-grained, read-only GitHub token on the ecosystem repo only (Contents, Pull requests, Issues, Actions: read), 90-day expiry. Create a dedicated Anthropic workspace key with a monthly spend limit. Put both in `.env` or your host's secret store. Never paste them in chat or commit them. | Who holds the keys. | Nothing in code; you restart and attest in the Model Hub. |
| 2 | **OPQ-016** live verification | Before anything else uses a provider, run the hub's **Test** button against the live Anthropic account, then Gemini if used. Pin `GEMINI_MODEL` to a model name copied from your own console (the default is unverified). | Who runs it; whether you want Gemini at all. | Fix any request-shape differences the Test reveals. |
| 3 | **OPQ-015 / OPQ-019 / OPQ-013(1)** roles | Name your **Information Officer** and one deputy, set `OPS_ROLES=io-id:officer,deputy-id:officer`. Officers attest providers, activate autonomous orders and decide erasure requests (built, off until set). Keep *stopping* things open to everyone: revoke and pause are always allowed. One attestation by an officer is enough; the ledger records who and when. | The two people. | Add more roles only if a real need appears. |
| 4 | **OPQ-002 / OPQ-011** sign-in, MFA | Keep `OPS_USERS` + `OPS_ROLES` for the pilot, rotate tokens quarterly, and do **not** expose the site publicly. Move to Keycloak OIDC (the ecosystem already runs it) before any wider rollout, and have Security enforce MFA in the realm first. | Whether to reuse the ecosystem realm. | Build OIDC login and per-user sessions with expiry (a stage of its own). |

## Content and policy questions

| Question | Recommendation | Why |
| -------- | -------------- | --- |
| **OPQ-014** made-up sample values | **Replace them with blanks that name the source needed** ("Number of schools: from the CRM export, dated…"). Remove "Apply to Form" copying of illustrative values. | The platform's rule is no invented numbers; a placeholder that looks like data is how invented numbers get ratified. Cost: small; touches `local.ts` and tool defaults. |
| **OPQ-017** signer independence | Two tiers. Default: two distinct people (as now). For **finance, legal, security, government** agents: the author may not approve *or* countersign, so a third person is involved. Add a contract field `signers: 'two' | 'independent'`. | Four-eyes where a mistake is costly, no extra weight elsewhere. Cost: small (contract field, validator, board check, tests). |
| **OPQ-018** what to ingest | Ingest knowledge: policies, SOPs, decisions, research, plans, reports. Opt out (`ingestion: 'none'`) for one-off outbound messages, drafts of social posts, meeting agendas and checklists. | The Brain should hold what you would want to recall in a year. You tell me which agents; I can propose a list by agent id. |
| **OPQ-019** (second half) who may run autonomously | Add a contract field `autonomy: 'allowed' | 'never'`. **Never:** legal, finance, security response, people/HR, government relations. **Allowed:** digests, status reports, research summaries, roster reconciliation. Activation by an officer. | Autonomy multiplies one mistake; keep it to low-stakes, easily reviewed drafts first. Cost: small. |
| **OPQ-020** fixed inputs | Keep fixed inputs. If you later need fresh data, add a separate **reviewed input channel** (a person approves the data snapshot an order may use). | Removes the prompt-injection route from GitHub events. |
| **OPQ-021** quarantine | Auto-pause an order after **3 consecutive** quarantined runs and show why; a human resumes it. | Stops a broken order filling the board. Cost: small. |
| **OPQ-022** agent owners | Accept the placeholder "Head of <dept>" now and replace with real role titles once you list them (I will take a table: dept → role). | The check only needs a role; the real names are yours. |
| **OPQ-023** provider limits | For legal, finance, security and people agents, restrict `models` to a provider whose written terms you have reviewed (retention and training use). | Provider terms differ. This is for you and your attorney; I will not assert what any provider's terms say. |

## Infrastructure and scope

| Question | Recommendation | Why |
| -------- | -------------- | --- |
| **OPQ-010** warehouse | JSON-lines is fine for a one-instance pilot. **Move to Postgres with row-level security before a second team uses it** or anything needs backup and point-in-time restore. Keep the ledger append-only by trigger. | Durability, scoped reads (closes the biggest gap in the compliance map), backups. A stage of its own. |
| **OPQ-008** ecosystem writes | Keep off until roles are on and the token has Issues: write on that one repo; then enable and watch a fortnight of ratified proposals. | The write path already needs two signers; roles tighten who. |
| **OPQ-003** outbound | Keep off. If you enable it, only to organisations and staff (never learners or parents), only after an opt-in record exists (POPIA s69). | **Legal** decides consent evidence. |
| **OPQ-004** payments | Defer. If needed, start with *read-only* accounting import; VAT treatment is for your accountant. | Money movement is irreversible. |
| **OPQ-005** roster | Treat the contract files in code as authoritative (they are what runs). Let OPS-AI-01 draft the doc correction and stop quoting a count externally until reconciled. | Code is the thing that runs. |
| **OPQ-006** pricing | The platform generates no prices (keep it so). Reconcile in the marketing source and have a commercial owner sign it. | Not an engineering decision. |
| **OPQ-007** tenant data | Stay out of scope until there is a de-identification design with a **minimum group size** (for example no figure for fewer than N schools) and a POPIA impact assessment. | Aggregates can re-identify small groups. |
| **OPQ-009** PDF | Keep print-to-PDF. Revisit only if customers need PDFs generated automatically. | A server renderer adds a browser dependency and attack surface. |
| **OPQ-012** ledger | Resolved. If you want external tamper-evidence, publish the ledger head hash daily somewhere you control. | Small add-on. |
| **OPQ-013** erasure | (2) Ask your Information Officer or attorney for an internal response target; I will model reminders from it. (3) Write a **runbook** for removing already-held data, then I can add a checklist step to the request. | Deadlines and removal scope are legal. |

## Suggested next builds, in order

1. Replace illustrative values with source-naming blanks (OPQ-014).
2. Contract fields `signers`, `autonomy`, `ingestion` per agent + auto-pause (OPQ-017/018/019/021) once you confirm the agent lists.
3. Scope warehouse reads by collection and role, and self-host the fonts (compliance-map gaps 2 and 9).
4. OIDC sign-in, then the Postgres warehouse (OPQ-002, OPQ-010).
