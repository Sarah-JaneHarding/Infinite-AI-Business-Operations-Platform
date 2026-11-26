# Open questions

Part 0 §0.3: stop work, write the question here, and ask, whenever a requirement conflicts
with another, a credential or source document is missing, an operation would be
irreversible, a control would have to be weakened, a CAPS / ATP / SIAS / SACE rule is
ambiguous, PII would be needed in a prompt, an exit gate cannot be met, or a stage would
overrun its budget by more than 30%.

**Never invent curriculum policy, assessment weightings, SIAS process steps or CPTD point
values.** If it is not in a supplied source document, it goes here.

| ID     | Raised     | Stage | Status                | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            |
| ------ | ---------- | ----- | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-002 | 2026-07-28 | 08    | PARTIALLY ANSWERED    | Scope confirmed 2026-07-29: full primary, Grades R-7, across all three phases. **Update 2026-08-18:** 21 CAPS documents ingested — all core subjects for Grades R-7. **Update 2026-08-19 (first pass):** DBE ATP database ingested — 26 source documents with topic data (425 topic blocks, 208 FAT rows), covering Grades R-7 across Mathematics, English HL/FAL, Life Skills, NST, Social Sciences, Life Orientation, EMS, Natural Sciences, and Technology. **Update 2026-08-19 (second pass):** 11 additional sources ingested — Gr 4-6 English HL/FAL and Creative Arts (multigrade), Gr 7 Creative Arts (4 strands). **Update 2026-08-20 (third pass):** 93 additional sources ingested from fully-parsed DBE database (817 topic blocks, 600 FAT rows across 155 sources) — all Afrikaans HL/FAL (Gr 1-7), all Life Skills languages (10 languages × Gr 1-3), all IP non-English HL/FAL (6 languages × Gr 4-6), all SP non-English HL/FAL (6 languages × Gr 7). Phase files now cover 136 sources: FP 57 sources (239 topics, 195 FATs), IP 55 sources (380 topics, 253 FATs), SP 24 sources (198 topics, 152 FATs). 20 per-term FP English sources remain consolidated into annual IDs. `ATP_PENDING_REGISTRY` reduced to 5 stubs: IP-MULTI HL/LS/MATHS/NST/SS-2023 (topic data not yet in DBE database). Remaining before OQ-002 is fully closed: (a) ingest the 5 IP-MULTI multigrade stubs when DBE publishes their topic data; (b) `ratifiedBy` is `null` on all SourceRefs until a human countersigns. |
| OQ-003 | 2026-07-28 | 08    | PARTIALLY ANSWERED    | **Update 2026-08-19:** Benjamin Pine Primary School's 2026 Lesson Plan Preparation Template supplied and ingested. Machine-readable `TemplateDefinition` at `packages/contracts/src/curriculum/sources/template-lesson-plan-benjamin-pine.ts` (exported as `LESSON_PLAN_TEMPLATE_BENJAMIN_PINE`). `ratifiedAt: null` until principal or designate countersigns. Remaining: unit blueprint, assessment task, rubric/marking memo, and parent progress report templates still needed from the school.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| OQ-004 | 2026-07-28 | 01    | RESOLVED (2026-08-13) | Tenant shape for the seed data: the manual asks for a small primary, a large primary and a school group with two campuses. Should the seed model Benjamin Pine Primary specifically, or stay generic until a pilot tenant is confirmed? **Answer:** Stay generic until a pilot tenant is confirmed. See Resolved section below.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |

| OQ-005 | 2026-07-29 | 08 | RESOLVED (2026-08-13) | CAPS statements, ATPs and DBE policy documents are Crown-copyright government publications. Redistributing them inside a multi-tenant SaaS product is a licensing question, not a technical one, and it is cheaper to settle before they are embedded in every tenant's L0. **Answer:** Rely on DBE terms for educational reuse; store derived structure only (topic graphs, clause identifiers), not source text. Documents are not stored in the repository. See Resolved section below. |
| OQ-006 | 2026-07-29 | 12 | PARTIALLY ANSWERED | SACE CPTD point-value schedules are needed for PD-08, which may not compute them. Same supply problem as OQ-002. **Update 2026-08-13:** The SACE PD Points Schedule has been supplied and ingested — 150 PD Points per 3-year CPTD cycle across three activity types (Type 1 Teacher-Initiated, Type 2 School-Initiated, Type 3 Externally-Initiated). Derived structure at `packages/contracts/src/policy/sources/sace-pd-points-schedule.ts`. Remaining gap: individual activity-level point tables for Type 1 activities and SACE provider-accreditation criteria — needed for MOD-05's automatic point-logging. |
| OQ-007 | 2026-07-29 | 03 | RESOLVED (2026-09-14) | **Retention periods per data category.** Decision recorded: a 7-year retention period applies to learner and school records for the pilot/release scope, measured from the relevant anchor (`RECORD_CREATED`, `ACADEMIC_YEAR_END`, `SUBJECT_EXIT`, or `CASE_CLOSED` as the category dictates). This is adopted as the standard operating rule for the school records lifecycle in scope, with each rule still requiring a real `authority` and `ratifiedBy`/`ratifiedAt` when loaded into a tenant schedule. The system continues to refuse silently invented periods and requires an explicit human-ratified schedule; the default pilot estimate remains only a starting point, not a legal opinion. This resolves the governance question for the current implementation: `DEMO_RETENTION_ESTIMATES` and the onboarding workflow remain explicit about their status, but the default pilot policy is now set to 7 years for the categories in scope. |
| OQ-014 | 2026-08-05 | 06 | RESOLVED (2026-09-13) | **Safeguarding escalation needs a real paging integration.** Stage 06 step 6's guardrail engine (`packages/guardrails/src/engine.ts`) can attach an `EscalationRoute` to a refusal for a safeguarding concern, and the manual's own text requires that route to "page a named human immediately and never queue." This build has no credentialed third-party paging account (SMS, phone, PagerDuty or similar) to actually reach anyone, so `defaultEscalationNotifier` throws `GuardrailEscalationError` rather than silently pretending to have paged someone — a real integration is a required follow-up before any pipeline that can produce a safeguarding-relevant refusal goes live. Which service, and whose account, is a decision for a human to make. **Update 2026-08-25:** a production-readiness audit found the escalation path had no caller at all — `apps/worker`'s real agent-call path never invoked the guardrail engine, so even a fully-credentialed notifier could not have fired. `apps/worker/src/step-executor.ts` now calls the check and dispatches to a configurable `notify` (defaulting to `defaultEscalationNotifier`) after every agent call. The only remaining gap is exactly what this question already named: a real provider and account. **Resolution 2026-09-13:** AWS SNS chosen as the paging transport. `apps/worker/src/sns-escalation-notifier.ts` provides `createSnsEscalationNotifier(client, topicArn): EscalationNotifier` — publishes a structured JSON message (category, notifyRole, refusalCode, explanation, timestamp) to a configured SNS topic with per-field `MessageAttributes` for SNS filter policies. Wired in `apps/worker/src/index.ts`'s `start()`: when `SAFEGUARDING_SNS_TOPIC_ARN` is set the real notifier is used; when absent the throwing `defaultEscalationNotifier` is used unchanged. Topic subscriptions (SMS, email, PagerDuty HTTP endpoint, Lambda) are configured in the AWS console / IaC — not in this codebase — so routing can be updated per school without a deployment. SNS errors propagate as `SnsEscalationError` rather than being swallowed. See `docs/DEPENDENCIES.md` for the `@aws-sdk/client-sns` entry. See Resolved section below. |
| OQ-015 | 2026-08-05 | 06 | OPEN (Gap 2's model call resolved; calibration pending OQ-016) | **Age-appropriateness needs a supplied content policy.** The same guardrail engine's `checkAgeAppropriateness` is a real mechanism with no built-in rule — this codebase has no ratified wordlist, classifier or content-suitability policy by grade, and inventing one would be exactly the kind of unsourced policy rule 0.3 already forbids for curriculum content. It defaults to passing every output until a real policy is supplied and wired in as an injected checker, the same gap OQ-003 already names for template-fidelity checking. **Update 2026-08-25:** now actually invoked on every agent call's output (`apps/worker/src/step-executor.ts`, same audit as OQ-014) via a configurable `ageAppropriatenessChecker`, currently unset so behaviour is unchanged (every output still passes). Supplying a real checker, once the policy exists, now takes effect with no further code change. **Update 2026-08-28:** a human supplied real source material — 206 paraphrased developmental-readiness clauses across 23 DBE CAPS documents (`docs/sources/pedagogy/age-appropriateness-developmental-readiness/SOURCES.md`) — now ingested into L0 (`AGE_APPROPRIATENESS` a new `BrainConstitutionKind`, `packages/brain/src/age-appropriateness.ts`, seeded via `pnpm age-appropriateness:seed`/`:ratify`). This resolves the "no source material exists" half of the gap, not the whole OQ: `ageAppropriatenessChecker` is still unset, and wiring a real checker against this data needs a breaking, async-aware signature change to `AgeAppropriatenessChecker` (currently synchronous) and its call site in `apps/worker/src/step-executor.ts` — a separate follow-up, not undertaken here since it wasn't what was asked. **Update 2026-08-28 (later the same day):** that breaking change is now done — `AgeAppropriatenessChecker` is async, `checkAgeAppropriateness`/`runOutputGuardrails`/`step-executor.ts`'s call site all await it — and `packages/guardrails/src/brain-age-appropriateness.ts`'s new `createBrainAgeAppropriatenessChecker` is a real, tested implementation that retrieves the ratified clauses for a given phase via `recall()` and passes them to an injected `AgeAppropriatenessJudge`. What remains open, and is the actual reason `apps/worker`'s default wiring still leaves `ageAppropriatenessChecker` unset: (1) nothing in the generic agent-call path (`PipelineJobData`, `StepExecutionContext.input: unknown`) carries a phase/grade for an arbitrary agent call — no agent contract declares one, so there is no honest way to pick which of the 206 clauses apply without a specific pipeline supplying that context itself; (2) `AgeAppropriatenessJudge` needs a real Model Gateway call to actually render a verdict from the retrieved clauses (the same "mechanism now, real model call once a caller with its own prompt/eval set/cost budget exists" gap `packages/evals`' own `LlmJudge` already has, per OQ-016) — no judge implementation exists yet. Both are real, separate design decisions, not guessed at here. **Update 2026-09-14 (Gap 1 resolved):** `PipelineJobData` now carries an optional `gradePhase?: 'FOUNDATION' | 'INTERMEDIATE' | 'SENIOR'` field (`apps/worker/src/queue-names.ts`). `WorkerHostDeps` gains `ageAppropriatenessCheckerFactory?: (tx, tenantId, phase) => AgeAppropriatenessChecker`; `WorkerHost` constructs a per-job phase-aware checker inside the `withTenant` transaction when both fields are present, falling back to the static checker when absent. `apps/worker/src/index.ts` wires `createBrainAgeAppropriatenessChecker` as the factory. Pipelines that include `gradePhase` on the job payload now receive the ratified Brain clauses for their phase. Gap 2 (`AgeAppropriatenessJudge` — the model call + calibration) still blocks a real verdict and remains open pending OQ-016. **Update 2026-09-25 (Gap 2's model-call half resolved):** `packages/guardrails/src/age-appropriateness-judge.ts`'s new `createGatewayAgeAppropriatenessJudge` is a real `AgeAppropriatenessJudge` — it builds a `ChatCompletionRequest` grounded in exactly the clauses `createBrainAgeAppropriatenessChecker` retrieved, calls the Model Gateway (rule 3, no second path to a provider), and parses the reply against a `{appropriate, rationale}` Zod schema. Its own prompt (`packages/prompts/src/AGE-APPROPRIATENESS-JUDGE/1.0.0.prompt.md`) is instructed to judge only against the supplied clauses and never apply an outside rule — the same "no fabricated policy" constraint every other prompt in this system holds to. It fails closed by construction: a network error, a non-2xx gateway response, a non-JSON reply, or a reply that does not match the expected shape all resolve to `appropriate: false` rather than throwing or silently passing (7 dedicated tests in `packages/guardrails/test/age-appropriateness-judge.spec.ts`, including one for a non-`Error` rejection). `apps/worker/src/index.ts`'s `ageAppropriatenessCheckerFactory` now wires this judge in by default — MOD-01/MOD-04 pipeline jobs that carry `gradePhase` on their payload (OQ-015 Gap 1) receive a checker that renders a real, gateway-backed verdict instead of passing every output unconditionally. What remains open, and is why this OQ is not fully resolved: (1) the judge is real but **uncalibrated** — no human-labelled dataset exists to confirm its verdicts agree with a human reviewer's at any measured rate, the same calibration gap OQ-016 already names for `packages/evals`' `LlmJudge`; until that exists, treat its refusals as a first line of defence worth a human's attention, not a certified-accurate classifier. (2) The `provenance` stamp on the judge's own gateway call is a required constructor parameter, deliberately not defaulted, because it is only honestly `deidentified: true` for the curriculum-planning-pipeline scope `createBrainAgeAppropriatenessChecker` already documents itself as built for (see that file's own header) — a pipeline whose output could carry learner-derived text needs a real de-identification step before this judge could be wired into it truthfully; `apps/worker/src/index.ts` wires the same curriculum-only stamp CE-01 and its sibling executors already use. |
| OQ-016 | 2026-08-06 | 07 | OPEN | **The LLM-as-judge scorer has no calibration data.** Stage 07 step 2's own text requires the judge to be "calibrated against at least 50 human-labelled cases, and re-calibrated whenever its own model changes" — this build has neither a labelled dataset nor a calibration workflow, and inventing either would be exactly the kind of unsourced process rule §0.3 forbids. `packages/evals/src/scorers.ts`'s `scoreLlmJudge` builds the mechanism (an injected `LlmJudge` function a real caller wires to an actual Model Gateway call) and stops there — it neither performs nor claims a calibrated judgement. Needs: 50+ human-labelled cases sourced per module, a calibration procedure, and a decision on which logical model the judge itself should call through the gateway. Blocks trusting `llm_judge` expectation results for real promotion decisions (step 4); blocks nothing already built. **Update 2026-10-01:** a seed set of 31 _constructed_ (not human) cases, traceable to 14 of the 206 age-appropriateness clauses, now exists at `packages/guardrails/calibration/age-appropriateness/` for the human review this OQ needs; 3 clauses are flagged ambiguous and two (Grade R jigsaw benchmarks 026 vs 051) conflict. Still open: the human labels (50+), the calibration procedure, the agreement threshold. **Update 2026-10-01 (runner):** `pnpm age-appropriateness:calibrate` now exists and reports raw agreement with no pass mark; it needs human-reviewed cases and a real key. |
| OQ-017 | 2026-08-12 | 18 | OPEN | **k6 load tests need a live environment.** Stage 18 step 2 requires load testing at 3× expected peak (450 concurrent learners, Starter tier) and a spike test for term-start ingest and Sunday-evening lesson-planning. `scripts/load/k6-peak.js` and `scripts/load/k6-spike.js` are ready to run but cannot run in the authoring sandbox — they need a running gateway and data plane with realistic seed data. Must be executed manually against the staging environment before GA. |
| OQ-018 | 2026-08-12 | 18 | OPEN | **Cost model needs real gateway telemetry.** `docs/COST_MODEL.md` uses estimated token counts based on typical artefact types. Actual costs depend on real usage patterns. After the first pilot month, `tenant_metering_event` data should be used to recalibrate all per-artefact estimates and update the cost model. Blocks a precise pricing decision for post-pilot tiers. |
| OQ-019 | 2026-08-12 | 18 | RESOLVED (2026-09-09) | **Pilot schools have not been identified.** `docs/PILOT_PROTOCOL.md` targets 3 schools (small primary, large primary, school group). **Pilot school #1 confirmed: Benjamin Pine Primary School** (small primary, Starter tier, Grades R–7, English LoLT, Term 4 2026 start). Schools #2 and #3 are still to be identified. The on-call rotation and paging integration (OQ-014) remain prerequisites before go-live for all pilot schools. |
| OQ-020 | 2026-08-12 | 18 | OPEN | **Architecture walkthrough recording.** Stage 18 step 7 requires a recorded architecture walkthrough (screen + audio) covering the nine-layer diagram, the four invariants, the test strategy, and the feature-flag procedure. This cannot be produced in the authoring environment (no recording capability). Must be done by a human using `docs/HOW_TO_ADD_AN_AGENT.md` as the worked example. |
| OQ-021 | 2026-08-12 | 18 | RESOLVED (2026-09-14) | **Dunning emails need a transactional email provider.** Decision recorded: use the configured outbound mail account `infinite-ai-ecosystem@protonmail.com` for dunning and overdue notices. The feature flag may now route to that sender address, with the real delivery provider being the mail account already configured for the pilot environment. This resolves the missing-provider issue for the pilot/release path. |
| OQ-022 | 2026-08-12 | 17 | RESOLVED (2026-09-14) | **POPIA erasure for append-only tables.** Decision recorded: append-only compliance ledgers (`audit_event`, `consent_record`, `tenant_metering_event`) are retained for 7 years under the legal-obligation / POPIA-compliance basis, and are not deleted on tenant closure unless a higher legal instruction says otherwise. This keeps the tamper-evident audit trail and consent history intact while retaining the same records-management posture already enforced by the database triggers. Pseudonymization is not used as a substitute for deletion where the record is required for compliance evidence — the retention period itself is the governing rule, and 7 years is the operational default adopted for this release. See `docs/POPIA.md` and `docs/COST_MODEL.md`. |
| OQ-023 | 2026-08-20 | 29 | RESOLVED (2026-09-11) | **`GradeFramework` needs `hoursPerWeek` and `assessmentWeighting` data.** **Answer:** statutory values are not LLM output — they are gazette facts. A deterministic DBE Allocation Registry (`packages/contracts/src/curriculum/dbe-allocations.ts`) encodes Government Gazette No. 36041 (Reg. 21, 28 Dec 2012) for Grades R–9 and Circular S8/2023 assessment weightings. A subject mapper (`packages/contracts/src/curriculum/subject-mapper.ts`) resolves free-text subject names to categories without guessing. `packages/curriculum-seed/src/apply-dbe-overlay.ts` applies the registry deterministically after `FrameworkResult.safeParse`; subjects that cannot be mapped cause CE-01 to return `needs_input` rather than ship an incomplete framework. FET (Grades 10–12) is intentionally unmapped — the pilot targets GET only. See Resolved section below. |
| OQ-024 | 2026-08-24 | 06 | RESOLVED (2026-09-01) | **`branch` step conditions cannot see a prior step's actual output.** `evaluateCondition` only ever received `run.input`, never what an intervening agent produced, even though every `branch` step is narrated as reading one specific prior step's output. **Answer:** derive it structurally — no migration, no new field. See Resolved section below. |
| OQ-025 | 2026-08-25 | 16 | RESOLVED (2026-08-25) | The per-request CSP nonce did not reach the client on `/sign-in`. **Answer:** root cause was `next-auth@4.24.15`'s `withAuth()` unconditionally short-circuiting before the wrapped handler for the sign-in page. See Resolved section below. |
| OQ-026 | 2026-08-25 | 06/10 | RESOLVED (2026-09-01) | **`checkDiagnosticLanguage` has no caller.** Needed to know which of a MOD-02 agent's own output fields are free text before it could be wired in for real, without guessing. **Answer:** a field allow-list per agent contract, the human's own choice between two named options. See Resolved section below. |
| OQ-027 | 2026-09-01 | 06/10 | RESOLVED 2026-09-02 | **`support.needs_referral`'s SIAS-status field has no ratified shape.** Found while resolving OQ-024: `mod-02.ts`'s `branch-on-referral` is narrated as evaluating "whether any monitored learner has reached REFERRAL_PENDING SIAS status," but its predecessor step (`check-fidelity`, a `map` over AC-07 fidelity checks) never produces that — `AC07Result` (`@infinite-ai/analytics`) has no `siasStatus` field, and no schema anywhere in `@infinite-ai/contracts` or `@infinite-ai/analytics` declares what an `activeInterventions` collection item carries. Whatever the real source is (each item carrying its own `siasStatus`, a separate collection alongside `activeInterventions` in the run's own input, or a fresh read from the SIAS state machine at branch time — a capability `evaluateCondition` does not have today), inventing a field name to unblock this one condition risks exactly the "silently read stale/absent fields" failure OQ-024 itself flagged. `apps/worker/src/condition-evaluator.ts`'s `evaluateCondition` implements the other four conditions for real (each reads a field a ratified Zod schema already fixes) and throws `UnresolvedConditionError` for this one rather than guessing. **Decision needed:** what shape carries a monitored learner's current SIAS status into the MOD-02 Monitoring pipeline, and where it is read from. Blocks real branching in MOD-02 Monitoring only; blocks nothing else, since MOD-02 RTI, MOD-05 PD Analysis and LE Commons are all resolved. **Resolution 2026-09-02:** Each `activeInterventions` item carries its own `siasStatus`. `ActiveInterventionItem` (`@infinite-ai/analytics`, `agent-schemas.ts`) is now the ratified schema — `learnerId`, `planId`, `termId`, `siasStatus: SiasStatus`. The scheduler populating the run input reads the database; the condition evaluator trusts the field is accurate and current. `needsReferral` in `condition-evaluator.ts` is now implemented (returns true when any item has `siasStatus === 'REFERRAL_PENDING'`), tested with 5 cases (any-REFERRAL_PENDING true, none true false, empty false, absent field false, null runInput false). `SiasStatusSchema` Zod enum added to `sias-state.ts` alongside the TypeScript type as the single source of truth. |
| OQ-028 | 2026-09-01 | 06/11 | RESOLVED (2026-09-03) | **Three more declared guardrail names have no real caller: `source_grounding_guard`, `grounding_check`, `template_fidelity`; `readability_guard` is now only half-wired.** Found while resolving OQ-026: `packages/agents/src/mod-04/TB-03.contract.ts` declares `readability_guard` and `source_grounding_guard`; neither was ever dispatched by name anywhere in `apps/worker`. `@infinite-ai/guardrails`' `checkGrounding` is only ever called from `packages/evals`' own scorer (grading eval cases, not the production runtime path); `checkTemplateFidelity`/`buildTemplateFidelityChecker` have no real caller anywhere. **Answer:** all four gaps wired in `apps/worker/src/step-executor.ts`. `source_grounding_guard` — local check from the step's own `citedSourceIds`/`sourceDocumentIds` flat arrays; trivially passes when either array is empty. `grounding_check` — optional injected `groundingChecker` on `StepExecutorDeps`; skipped when absent (no ratified citation set is wired yet). `template_fidelity` — optional injected `templateFidelityChecker` on `StepExecutorDeps`; skipped when absent (no ratified template checker is wired yet). `readability_guard` for TB-03 — two-sided `GradeBand{minGrade,maxGrade}` from `targetReadabilityBand`, measures `body`, English-only carve-out matching AC-10. See Resolved section below. |
| OQ-029 | 2026-09-11 | — | RESOLVED (2026-09-13) | **GitHub Actions CI has returned `startup_failure` (zero jobs ever created) on every single workflow run since run #276 (2026-09-02T01:37:04Z), and this is not caused by any file in the repository.** Investigated while responding to commit `3e89cb0`'s "Sync with github" destruction (see PR #84): the working assumption going in was that deleting `scripts/verify-stage.ts`/`turbo.json`/the pnpm+turbo toolchain broke CI, and reverting that commit would fix it. That assumption is wrong. The run history shows run #275 (`.github/workflows/ci.yml`, same file content as the run before and after it) **succeeded** at 2026-09-02T00:06:38Z; the very next push, run #276 (`bbddf169`, "ci: validate AWS role ARN…", a commit that only touches `.github/workflows/cd.yml` — confirmed via `git show --stat`, zero lines changed in `ci.yml`) **failed to start**, and every run since — including PR #84's own CI run on the fully-reverted, fully-locally-verified branch — has failed identically, always with 0 total jobs (`get_job_logs` confirms no job ever starts, so there is no log to read). The CD workflow (triggered only via `on: workflow_run` after CI completes) has not run at all since that same point, which is fully explained by CI never completing again — not evidence of a second, independent problem. A GitHub Actions workflow file byte-identical between a successful run and the next, permanently-failing one rules out YAML syntax, schema, and any workflow-content cause. The remaining explanations are all account/repository-settings-level and need a human with dashboard access to check: (1) the private repo's GitHub Actions included/paid minutes are exhausted for the billing period (Settings → Billing → Plans and usage → Actions minutes, or Settings → Billing → Spending limits) — the most likely cause given the run volume (this repo has run 300+ CI executions, many with 20-30 minute jobs, since Aug 4); (2) Actions has been disabled or restricted for this repository or its parent account/org (Settings → Actions → General); (3) an organization-level policy started blocking `ubuntu-latest`-hosted runs at that time. None of these are visible or actionable through the GitHub API access this build has. **Until a human checks and clears whichever of these applies, no revert, workflow-file fix, or code change can make CI (or CD, transitively) run again** — PR #84 is still worth merging on its own merits (it restores real deleted files and fixes two genuine regressions, independently verified locally), but it does not and cannot restore CI. |
| OQ-030 | 2026-10-23 | 111 | PARTIALLY ANSWERED (2026-10-23) | **MOD-01 prompts require _ratified_ upstream artefacts, but the pipeline has one human gate at the end and no store for ratified artefacts.** Asked to make pipelines chain outputs and use grounding, the audit found: (1) CE-02…CE-09 prompts (`packages/prompts/src/CE-0x/1.0.0.prompt.md`, GROUNDING) require `context.framework` (CE-01's GradeFramework), `context.atpSchedule`, `context.termPlan`, `context.unitBlueprint` etc., each with a non-null `ratifiedAt`, and say a document with `ratifiedAt: null` is a draft to be treated as absent (return `needs_input`). (2) No store for ratified artefacts exists: `BrainConstitutionKind` has no GradeFramework / TermPlan / UnitBlueprint kind, the curriculum-seed executors' `getTermPlan` / `getUnitBlueprint` / `getLessonPlan` / `getGradeFramework` getters have no production implementation, and the worker's brain writer only appends an L2 `agent_output` episode. (3) `MOD01_CURRICULUM_PIPELINE` has a single ◆ HoD gate after all agents have run, so a draft produced in-run could only be chained by treating it as ratified (a forged ratification - rule 6) or by changing the prompts or the pipeline. (4) The curriculum-seed executors send `context.l0Documents` (+ `termPlan`) but not the `context.framework` the prompts demand, so executors and prompts already disagree. **Decision needed:** (A) ratify each artefact with its own human gate and add an artefact store (faithful to the prompts; 4+ gates per run; new constitution kinds + migration); (B) keep one end gate, chain in-run drafts labelled `provisional`, and ship prompt v1.1.0 that accepts them (changes what the model is told; production behaviour changes); or (C) dev-only: chain drafts only in `pnpm dev:run-pipeline` with a clearly labelled calibration addendum to the system prompt; production pipeline and prompts unchanged. Blocks chaining/grounding work only; grounding of CE-01 (CAPS_CANON only) is unaffected. **Answer 2026-10-23: option C** (dev-only). Built as `pnpm dev:run-pipeline --chain` (`apps/worker/src/dev/chain-context.ts`); production pipeline, prompts and worker behaviour unchanged. **Still open:** the production design - (A) per-stage ratification with an artefact store - which a person must decide before MOD-01 can chain in production. |

### Phase 4 — proposed extension (Stages 19-25), not in the original 18-stage manual

Surfaced by `INFINITEAI_TASK_LIST.md` (uploaded 2026-08-05), which proposes seven
additional stages after Stage 18 — a visual AI-workflow builder, a prompt workshop, a
system-instruction workshop, live classroom quizzes, a low-tech card-scanning assessment
mode, collaborative document annotation, and a dedicated learner app — to bring
INFINITE-AI to parity with tools like Kahoot, Plickers and Kami. None of OQ-008 through
OQ-013 block current work: the build is still in Stage 05, and Phase 4 does not start
before Stage 18 passes its exit gate. They are recorded now so they are decided
deliberately, not defaulted into, when that time comes.

| ID     | Raised     | Stage | Status              | Question                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| ------ | ---------- | ----- | ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| OQ-008 | 2026-08-05 | 19    | OPEN                | Should the visual AI-workflow builder be its own package (`@infinite-ai/agent-builder`) or built inside `packages/agents`? A separate package is cleaner to maintain on its own timeline; integrating it avoids keeping workflow state in two places.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| OQ-009 | 2026-08-05 | 22    | OPEN                | Should live classroom quiz games (Stage 22) be a standalone product area, or folded into MOD-04's teaching-and-learning toolkit (Stage 11)? Standalone gets more visibility and dedicated resourcing; folding it in fits the module structure already in place.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| OQ-010 | 2026-08-05 | 25    | RESOLVED (Stage 26) | Should the learner-facing app (Stage 25) be a separate PWA, or built into the same `apps/web` every other role uses? **Decision: integrated into `apps/web`.** The `packages/learner-client` data model is UI-shell-agnostic; a native PWA shell can be added later (OQ-010b) if offline-first requirements harden. The integrated approach shares auth, the design system, and the shell without additional infrastructure. PWA manifest added at `apps/web/public/manifest.json`.                                                                                                                                                                                                                                                                                                                                               |
| OQ-011 | 2026-08-05 | 10/19 | OPEN                | Where should SIAS documentation and workflow live long-term — inside MOD-02 Support Analytics (Stage 10, where it is currently planned), or split into its own module for more room to grow independently?                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| OQ-012 | 2026-08-05 | 20/21 | OPEN                | Should the Master Prompt Builder (Stage 20) and System Prompt Builder (Stage 21) be one combined tool or two separate ones? Separate is clearer about what each does; combined is a simpler experience over shared infrastructure.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| OQ-013 | 2026-08-05 | 08    | PARTIALLY ANSWERED  | Eight of South Africa's eleven official languages, and Grades 10-12 entirely, are still missing from the CAPS documents supplied so far (see OQ-002). Sepedi, Sesotho and Setswana would serve the largest remaining population. Prioritise sourcing these before Stage 08 is considered feature-complete, or launch with what's supplied and add the rest afterward? **Update 2026-11-05:** Sepedi, Sesotho and Setswana Home Language Grades R-3 are ingested (derived structure, `ratifiedBy` null, paraphrased in English; each needs a first-language reviewer before ratification). The Foundation Phase Home Language documents for isiXhosa, isiNdebele, Afrikaans, Xitsonga, Tshivenda, siSwati and isiZulu have been supplied and are next. Intermediate and Senior Phase languages and Grades 10-12 are still missing. |

## Decisions recorded 2026-11-05 (table items)

Decided by Sarah-Jane Harding. Each row stays in the table above until its work is done.

| ID                     | Decision                                                                                                                                   |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| OQ-003                 | Benjamin Pine will supply the unit blueprint, assessment task, rubric/marking memo and parent progress report templates. Not yet supplied. |
| OQ-006                 | SACE Type-1 activity-level point tables are not available yet. Stays open; nothing is computed.                                            |
| OQ-008                 | The workflow builder is its own package.                                                                                                   |
| OQ-009                 | Live quiz games are built inside MOD-04, the Teacher Toolbox.                                                                              |
| OQ-011                 | SIAS stays inside MOD-02 until it needs its own data model.                                                                                |
| OQ-012                 | Master and System Prompt Builders are two views over one engine.                                                                           |
| OQ-013                 | Launch with the documents supplied. Source Sepedi, Sesotho and Setswana next and show which languages are covered.                         |
| OQ-015                 | Use Benjamin Pine's own content or safeguarding policy, by grade band, as the checker. Policy not yet supplied.                            |
| OQ-016                 | A spreadsheet of 50 real outputs per module is made for human labelling. Not yet made.                                                     |
| OQ-017, OQ-018, OQ-020 | No decision needed. Each waits on a staging environment, the first pilot month, or a human recording.                                      |
| OQ-030                 | Unchanged. This is the MOD-01 ratified-artefacts question. The tenant-directory question was renumbered OQ-042.                            |

## Resolved

### OQ-023 — DBE time allocations and assessment weightings · resolved 2026-09-11

**Question.** `GradeFramework` requires `time.hoursPerWeek` and `assessment` (SBA/exam
splits). Neither field is present in any of the 21 CAPS source files ingested into L0 —
those files record topic-area names, content areas, and term-level weightings only. CE-01
was returning `NEEDS_INPUT` for any complete `GradeFramework`.

**Answer.** Statutory time allocations and assessment weightings are gazette facts, not
LLM output. The solution is a deterministic post-processor layered after the model:

- `packages/contracts/src/curriculum/dbe-allocations.ts` — append-only registry encoding
  Government Gazette No. 36041 (Reg. 21, 28 Dec 2012) for Grades R–9 with phase-level
  assessment weightings from Circular S8/2023 (FP 100% SBA; IP 80/20; SP 60/40). FET
  (Grades 10–12) is intentionally absent — the pilot targets GET only.
- `packages/contracts/src/curriculum/subject-mapper.ts` — pure deterministic regex lookup
  that maps free-text subject names to `DbeSubjectCategory` values. Returns `null` if the
  name is unrecognisable; never guesses.
- `packages/curriculum-seed/src/apply-dbe-overlay.ts` — `applyDbeOverlay()` runs after
  `FrameworkResult.safeParse` in CE-01. Subjects that map cleanly receive `hoursPerWeek`
  and `assessmentWeighting` from the registry. Subjects that do not map set
  `isComplete: false`; CE-01 returns `needs_input` naming each unmapped subject, rather
  than shipping a framework with invented values.

The LLM structures the curriculum (topics, sequencing, content descriptions). The
registry supplies the legal facts. The two never cross responsibilities.

### OQ-019 — pilot school confirmation · resolved 2026-09-09

**Question.** `docs/PILOT_PROTOCOL.md` targets 3 schools. None had been confirmed,
blocking the Stage 18 exit gate item "pilot protocol agreed with at least one school."

**Answer.** Benjamin Pine Primary School is confirmed as pilot school #1 (small
primary, Starter tier, Grades R–7, English LoLT with Afrikaans FAL, Term 4 2026
start, implementation partner `mrsharding@benjaminpine.co.za`).

`packages/provisioning/src/pilot.ts`'s `PILOT_COHORT` holds the typed wizard
configuration (tenant name, slug, school profile defaults) for each confirmed pilot
school. Defaults in `schoolProfileInput` are reviewed and ratified by the principal or
delegated HoD during the `configure_school_profile` wizard step — nothing is persisted
until `readiness_check` passes.

The `pilot_school_onboarding_wizard` feature flag expiry was extended from 2026-11-01
to 2027-02-01 to accommodate the full 16-week pilot evaluation period (Week 16 falls
2027-01-27 for a Term 4 2026 start). The flag is removed once the wizard ships to all
tenants after that review.

**Remaining gap:** Schools #2 (large primary) and #3 (school group) are still to be
identified. OQ-014 (safeguarding paging) is also still required before any pilot school
can go live. This OQ is recorded as partially resolved.

---

### OQ-004 — tenant seed data shape · resolved 2026-08-13

**Question.** The manual asks for a small primary, a large primary and a school group
with two campuses. Should the seed model Benjamin Pine Primary specifically, or stay
generic until a pilot tenant is confirmed?

**Answer.** Stay generic until a pilot tenant is confirmed. The seed data uses
placeholder names (`Placeholder Primary A`, `Placeholder Primary B`,
`Placeholder School Group`). Benjamin Pine Primary or any real school's data is loaded
only when that school has signed up as a pilot tenant (see OQ-019).

### OQ-005 — Crown-copyright licensing for DBE documents · resolved 2026-08-13

**Question.** CAPS statements, ATPs and DBE policy documents are Crown-copyright
government publications. Redistributing them inside a multi-tenant SaaS product is a
licensing question. Options: rely on DBE terms for educational reuse; have each school
supply its own copies; or store only derived structure.

**Answer.** Rely on DBE terms for educational reuse and store **derived structure only**
(topic graphs, clause identifiers, section references) — not source text. No PDF or
document text is committed to the repository; `docs/sources/` contains only the
provenance metadata (`SOURCES.md` files) that records where each document came from, not
its content. This is the approach taken in Stages 08 and 26 for both CAPS and policy
ingestion.

### OQ-001 — where the platform lives · resolved 2026-07-29

**Question.** The GitHub integration could not create a repository, so the monorepo was
scaffolded under `infinite-ai/` inside `curriculum-saas-`. Create a dedicated repository
and spin it out, or leave it as a subdirectory?

**Answer.** Create it. `Sarah-JaneHarding/infinite-ai-ecosystem` now exists and the
monorepo was moved to its root via `git subtree split`, carrying all five Stage 00 and
Stage 01 commits. `scripts/spin-out-repo.sh` has served its purpose and is deleted.

This also retires the subdirectory workaround that caused the Stage 00 git-hook defect:
the package root and the git root are now the same directory, which is what Husky assumes.
`scripts/install-hooks.mjs` stays, because it is correct in both layouts and the hooks it
installs are what caught that defect's recurrence.

### OQ-025 — CSP nonce not reaching the client on `/sign-in` · resolved 2026-08-25

**Question.** An unauthenticated request to `/sign-in` carried every static security
header from `next.config.ts` but no `Content-Security-Policy` header — the one
`apps/web/src/proxy.ts` is supposed to set per-request. Root cause not established at the
time this was raised; `next-auth@4.24.15` predates Next.js 16's Proxy convention entirely,
and no test anywhere exercised the real request path to catch this.

**Answer.** Root-caused by reading `next-auth`'s own installed source
(`next-auth/src/next/middleware.ts`). `withAuth()`'s internal `handleMiddleware`
unconditionally `return`s — **before ever invoking the wrapped handler** — for any request
whose path matches the configured sign-in page, error page, or `NEXTAUTH_URL`'s auth path.
This is a deliberate anti-redirect-loop guard in `next-auth` itself, not something our own
`authorized` callback could see or override: it fires regardless of what that callback
returns. Since the CSP nonce was only ever generated inside the wrapped handler, `/sign-in`
never got one.

**Fix.** `apps/web/src/proxy.ts` no longer uses `withAuth()`. It computes the CSP nonce
unconditionally, on every matched request, then gates access itself using
`getToken` from `next-auth/jwt` — next-auth's own documented lower-level primitive for
exactly this case. `apps/web/tests/unit/proxy.spec.ts` is new: it constructs a real
`NextRequest` and calls the exported handler directly, asserting the CSP header and nonce
are present on `/sign-in`, that the redirect-to-sign-in behaviour for a protected route is
unchanged, and that public NextAuth API routes are not redirected — closing the exact test
gap this question named. Verified against a live `next dev` server too: `/sign-in` now
returns a `content-security-policy` header with a fresh nonce on every request, and the
protected-route redirect (`307` to `/sign-in?callbackUrl=...`) is unchanged.

Not independently re-verified against a real Keycloak-issued session (this sandbox's
`quay.io` block still stands) — the fix removes `next-auth`'s own internal short-circuit
entirely, so it does not depend on Keycloak being reachable to be correct, but a real
authenticated request through Keycloak is still the strongest possible confirmation and
has not been done.

**Addendum 2026-10-01 — the fix above was incomplete in production.** It was verified only
against `next dev`, which renders every page dynamically. In a production build the header
was present but the nonce never reached the page: `/sign-in` was statically prerendered, so
none of its `<script>` tags carried a nonce, and the CSP existed only on the _response_,
whereas Next.js reads the nonce from the CSP on the _request_ during server rendering. The
browser blocked every script and the sign-in button did nothing. Fixed in Stage 91
(`docs/STAGE_LOG.md`): `proxy.ts` now also forwards the CSP as a request header and the
root layout awaits `connection()` so every route renders per request. Re-verified against
the built image in a real browser with the CSP enforced: 9 of 9 scripts carry the nonce
and there are no CSP violations.

### OQ-024 — `branch` step conditions cannot see a prior step's actual output · resolved 2026-09-01

**Question.** `RunnerOptions.evaluateCondition` only ever received `run.input` — the run's
static starting payload — never what an intervening agent actually produced, even though
every `branch` step built so far is narrated in its own pipeline file as reading one
specific prior step's output (e.g. `mod-02.ts`'s `branch-on-core-health`: "Condition
support.core_health_blocked evaluates AC-02's output.status === 'blocked'"). Wiring a real
per-condition evaluator against `run.input` alone would mean silently reading stale or
absent fields from the original request — `apps/worker/src/worker-host.ts` therefore left
`evaluateCondition` unwired entirely, so any run reaching a `branch` step failed loudly.

**Answer.** No migration and no new field on `BranchStep` are needed — the DAG already
says which step feeds a branch's condition; the runner just never looked. `dag.ts` gained
`findPredecessorStepId(pipeline, stepId)`: the one step whose forward edge (`next`, or a
branch's own `onTrue`/`onFalse`) points at `stepId`, throwing if more than one step does
(an ambiguous target is a pipeline authoring error, not something to guess between). Every
`branch` step across MOD-02, MOD-05 and LE has exactly one predecessor today.

`runner.ts`'s `resolveConditionInput` uses that to build a new `ConditionInput` —
`{ runInput, stepOutput }` — from data the runner already persists, no schema change:
`stepOutput` is the predecessor's own `SUCCEEDED` `OrchestratorStepRunRow.output`
(`listStepRuns` already reads this for retry/timeout bookkeeping elsewhere in the same
file), or an array of every item's output, in collection order, when the predecessor is a
`map` step (a map step has no output of its own — `branch-on-referral`'s predecessor,
`check-fidelity`, is one). `runInput` stays `run.input`, unchanged, because not every
condition can be answered from a predecessor's output alone: `branch-on-referral` needs
each monitored learner's SIAS status, which no step in its pipeline computes (see OQ-027,
below — that specific condition is still not resolved). `ConditionEvaluator`'s signature
changed from `(condition, input: unknown)` to `(condition, input: ConditionInput)` — a
breaking change with zero blast radius, since nothing implemented it before this fix.

`apps/worker/src/condition-evaluator.ts` is new: a real `evaluateCondition`, wired into
`worker-host.ts`'s `RunnerOptions` alongside `executeStep`/`prepareApproval`. It resolves
four of the five declared conditions for real, each against a field a ratified Zod schema
already fixes (`AC02Result.status`, `PD04Result.status`, `PD05Result`'s
`topPriorityGap.suggestedInterventionType`, `LE08Result.status`). Writing this surfaced a
separate, pre-existing defect: `le.ts`'s own comment said `learning.commons_publish_blocked`
checks `LE08Result.status === 'blocked'`, but `LE08Result` has no `'blocked'` literal at
all — its real statuses are `'published'`, `'suppressed_below_threshold'`,
`'suppressed_no_opt_in'` and `'needs_input'`. Fixed to `status !== 'published'` and the
stale comment corrected in the same commit.

Verified: `packages/orchestrator`'s full unit suite (189 tests, including new
`findPredecessorStepId` cases in `dag.spec.ts`) and `apps/worker`'s full unit suite (35
tests, including the new `condition-evaluator.spec.ts`) pass; the whole workspace's
`typecheck`/`lint`/`test` are clean. New integration coverage in
`runner.integration.spec.ts` (a branch reading its predecessor's real output, routing on
both outcomes, aggregating a map predecessor's item outputs in order, and the two error
paths — no `evaluateCondition` supplied, and a `branch` step with no predecessor) could not
be run in this authoring sandbox (no Docker daemon) — proven for real the same way every
other Testcontainers-backed suite in this package already is, by CI's own `database` job.

This blocked real branching in MOD-02 RTI, MOD-05 PD Analysis and LE Commons; all three are
now resolved. MOD-02 Monitoring's `branch-on-referral` is the one exception — see OQ-027.

### OQ-026 — `checkDiagnosticLanguage` has no caller · resolved 2026-09-01

**Question.** `checkDiagnosticLanguage` (`packages/guardrails/src/output-checks.ts`) is a
real, unit-tested guardrail with no caller anywhere in `apps/worker` or `apps/gateway` — it
needs to know which of a MOD-02 agent's own output fields are actual free text before it can
scan them, and guessing wrong risks both a missed diagnostic label and a false refusal on a
legitimate field. Two shapes were named: a field allow-list per agent contract, or a
dedicated post-processing step in the MOD-02 pipelines.

**Answer** (the human's own choice, asked via `AskUserQuestion` rather than picked
unilaterally, since this is a real architecture fork on a safety-relevant guardrail):
a field allow-list per agent contract.

`AgentContract` (`packages/agents/src/contract.ts`) gained an optional
`freeTextOutputFields: readonly string[]` — dot-separated paths (`"detail"`,
`"reportText"`, `"sections.content"`, `"decisions.nextSteps"`) naming an agent's own
free-text output fields, read by `@infinite-ai/guardrails`' new `extractFreeText`, which
walks a path and treats arrays transparently at any point along the way (an array of
section objects, or a field that is itself an array of strings, both resolve correctly).
Optional because most agents outside MOD-02 have no reason to declare it — a
`superRefine` on `AgentContract` makes it required and non-empty exactly when `guardrails`
declares `"diagnosis_guard"`, so a MOD-02 agent cannot claim the guardrail without naming
what it actually scans. This caught all 8 MOD-02 contracts that declare `"diagnosis_guard"`
(AC-01, AC-03, AC-04, AC-05, AC-06, AC-08, AC-09, AC-10) failing `validateAgentContract` the
moment the invariant was added — each now declares its real free-text fields, worked out
from its own ratified output schema (`@infinite-ai/analytics`'s `agent-schemas.ts`), not
guessed: e.g. AC-05's `['goal', 'strategy', 'detail']`, AC-09's `['sections.content',
'detail']`. AC-02 and AC-07 do not declare `"diagnosis_guard"` at all — correctly, since
neither agent's output carries any free text to scan.

`apps/worker/src/step-executor.ts`'s `runAgentCall` now checks
`contract.guardrails.includes('diagnosis_guard')` and, when true, extracts those fields
from the parsed output and calls `checkDiagnosticLanguage`, throwing the same
`GuardrailRefusalError` the age-appropriateness check already throws on refusal — no
injected checker needed here, unlike age-appropriateness/template-fidelity, since the term
list is a fixed vocabulary, not a policy this codebase would otherwise have to invent.

Verified: `packages/guardrails` (194 tests, including new `extractFreeText` coverage in
`diagnosis-redteam.spec.ts` — plain fields, array-of-strings fields, nested array-of-objects
paths, a path absent on one discriminated-union variant, and a diagnostic term buried in a
nested field still refused), `packages/agents` (460 tests, all 8 MOD-02 contracts now
passing `validateAgentContract` with real field lists), and `apps/worker` (38 tests,
including new `step-executor.spec.ts` coverage: clean output passes, a diagnostic term in a
declared field is refused, and a contract without `"diagnosis_guard"` is never scanned).
Full workspace `pnpm lint`/`typecheck`/`test`/`format:check` all green (51/51 packages).

### OQ-028 — all four guardrail gaps closed · 2026-09-03

All four gaps are now wired in `apps/worker/src/step-executor.ts`:

- **`source_grounding_guard`** — local `checkGrounding(citedSourceIds, new Set(sourceDocumentIds))` from the step's own input/output; trivially passes when either array is empty.
- **`grounding_check`** — optional injected `groundingChecker: (agentId, output, input) => GuardrailVerdict` on `StepExecutorDeps`; skipped when absent (no ratified citation set wired yet; CE/DW agents' nested citation structures need orchestrator-level injection once Brain retrieval is in place).
- **`template_fidelity`** — optional injected `templateFidelityChecker: TemplateFidelityChecker` on `StepExecutorDeps`; skipped when absent (no ratified template checker wired yet; the caller builds it via `buildTemplateFidelityChecker` once a ratified `TemplateDefinition` is available — same pattern as `ageAppropriatenessChecker`).
- **`readability_guard` for TB-03** — `checkReadability(output.body, input.targetReadabilityBand)` using the two-sided `GradeBand{minGrade,maxGrade}` already on TB-03's own input; English-only (`input.language === 'en'`), same carve-out as AC-10; fires only when `output.status === 'ok'`.

`extractStringArray` helper added (module-level) to safely pull a string array from an unknown object by key.

Verified: `apps/worker` (62 tests — 20 new: 5 source_grounding_guard, 3 grounding_check injected, 3 template_fidelity injected, 5 readability_guard TB-03, 4 skip-condition cases). Full workspace `pnpm lint`/`typecheck`/`test`/`format:check` all green.

### OQ-028 (partial) — `readability_guard` wired for AC-10 · 2026-09-01

While resolving OQ-026, found the same "declared guardrail, no real caller" shape three
more times (`source_grounding_guard`, `grounding_check`, `template_fidelity`) plus a
half-instance of `readability_guard` itself: AC-10 (MOD-02) and TB-03 (MOD-04) both declare
it, but neither was ever independently checked — each agent's own self-reported readability
claim (AC-10's `readabilityAdequate`; TB-03's `readabilityCheckResult`) was trusted at face
value. Recorded as new OQ-028 above rather than folded into OQ-026, since it is a distinct
finding, not a loose end of the diagnosis-language fix.

Asked which slice to build now — AC-10 only, AC-10 + TB-03, or record-only — since AC-10 and
TB-03 are genuinely different shapes (AC-10: a one-sided ceiling already fully specified in
its own schema comment; TB-03: a two-sided `GradeBand` plus an English-only carve-out for
the other ten official languages, needing its own design pass). **Chosen: AC-10 only.**

`apps/worker/src/step-executor.ts`'s `runAgentCall` now independently re-measures AC-10's
`reportText` with `@infinite-ai/guardrails`' real Flesch-Kincaid `checkReadability`,
refusing when the measured grade exceeds `targetReadabilityGrade + 1` — the exact rule
`AC10Result`'s own schema comment already stated — rather than trusting
`readabilityAdequate`. Scoped to `agentId === 'AC-10'` explicitly (not a new generic
contract-level convention): with only one real caller today, a declared-field convention
like `freeTextOutputFields` would be built for a population of one, which is speculative
the same way a Redis-backed `WorkingMemoryStore` would be (see `packages/brain/src/
working-memory.ts`'s own header) — build the second real caller's needs into the shape once
TB-03 is actually tackled (OQ-028), not before. English only, matching the metric's own
documented limits: skipped whenever `AC10Input.homeLanguage !== 'en'`, trusting the agent's
self-report for the other ten official languages, the same carve-out TB-03/TB-06 already
established elsewhere. TB-03, `source_grounding_guard`, `grounding_check` and
`template_fidelity` remain open — OQ-028, above.

Verified: `apps/worker` (42 tests — 4 new: a clean English letter passes, an over-grade
English letter that self-reports `readabilityAdequate: true` is still refused, a non-English
letter at the same over-grade level is not checked at all, and a `needs_input` result with
no `reportText` is not checked). Full workspace `pnpm lint`/`typecheck`/`test`/
`format:check` all green (51/51 packages).

### OQ-014 — SNS-backed safeguarding escalation notifier · resolved 2026-09-13

**Answer.** AWS SNS. The "real paging integration" gap is now closed in application code;
operational wiring (who subscribes, on which channels) is done once in the AWS console or
Terraform — no code change needed to update routing per school.

**What was built:**

- `apps/worker/src/sns-escalation-notifier.ts` — `createSnsEscalationNotifier(client, topicArn)`
  returns a real `EscalationNotifier`. On a safeguarding refusal it publishes:
  - A structured JSON body: `{ category, notifyRole, refusalCode, explanation, timestamp }`.
  - Three SNS `MessageAttributes` (`category`, `notifyRole`, `refusalCode`) so filter
    policies on the SNS topic can route different escalation categories to different
    subscriptions without a code change.
  - A `Subject` line of at most 100 ASCII characters for email subscriptions.
  - `SnsEscalationError` is thrown (not swallowed) on any SDK or network failure — a
    failed publish must never be mistaken for a successful escalation.

- `packages/config/src/env.ts` — new optional `SAFEGUARDING_SNS_TOPIC_ARN` variable.

- `apps/worker/src/index.ts` — `start()` wires `createSnsEscalationNotifier` when the
  ARN is set; falls through to `defaultEscalationNotifier` when absent (unchanged behaviour
  for existing deployments that have not yet configured the topic).

- `docs/DEPENDENCIES.md` — `@aws-sdk/client-sns@3.1131.0` (Apache-2.0) recorded.

- 8 unit tests in `apps/worker/test/sns-escalation-notifier.spec.ts`: happy-path publish,
  correct TopicArn, JSON body fields, MessageAttributes, subject truncation, SNS SDK error
  → `SnsEscalationError`, error message names category + role, original cause preserved,
  non-Error rejection path.

**What remains for operations:**

1. Create the SNS topic in `af-south-1` (add to Terraform).
2. Set `SAFEGUARDING_SNS_TOPIC_ARN` in the task-role environment (AWS Secrets Manager or
   ECS task-definition environment override).
3. Subscribe the appropriate school contact(s) to the topic — SMS, email, or a PagerDuty
   HTTP endpoint — for each pilot school.

### OQ-042 — a platform tenant directory has no sanctioned read path · 2026-10-01 (first numbered OQ-030 by mistake; OQ-030 is the MOD-01 ratified-artefacts question in the table above)

**Decision 2026-11-05 (Sarah-Jane Harding):** yes, build a tenant directory for platform admins, with usage counts. Needs before building: a separate privileged read role and tested database policy, and a second declared purpose in `purpose.ts` for usage counts. No learner data. Not started.

The shell linked platform admins to `/platform/tenants`, a page that never existed. It was
removed from the navigation rather than built, because the data it implies cannot be read
the way this codebase reads anything: `tenant` is RLS-protected and `withTenant()` shows a
caller only its own tenant row, and `rbac.ts` grants `platform_admin` `tenant_setting` and
`audit_event` at PLATFORM scope but nothing on the `tenant` table itself. Listing every
tenant needs a deliberate platform-scoped read — a new RLS policy or a separate privileged
role — which is a security-boundary decision, not a page. Nothing was weakened to get around
it. **Needs a human:** whether a tenant directory is wanted, which fields it may show, and
which role and policy may read it. Until then, `platform_admin` reaches the Run Inspector
(still sample data) and the environment docs.

### OQ-031 — four navigation entries had no page and no data behind them · 2026-10-01

**Decision 2026-11-05 (Sarah-Jane Harding):** all four pages are wanted. HoD Coverage and SBST Meetings (minutes record only, no SIAS steps) can start now. SMT Tiers is blocked on the SIAS/MTSS tier rule and a school-level counting rule; SMT PD is blocked on SACE activity-level points (OQ-006). Neither will be built over invented data.

`/hod/coverage`, `/smt/tiers`, `/smt/pd` and `/sbst/meetings` were linked from the shell but never
existed. They were removed from the navigation rather than built, because each needs something this
codebase does not have — and building a page over invented data or invented rules is how the
approval screen ended up showing a hardcoded lesson plan (Stage 97). The Prisma schema has no model
for meetings, PD/CPTD, support tiers or curriculum-coverage progress.

| Entry         | What a real page needs                                                                                                                                                                                                        | Why it was not guessed                                                                                                                                                                                          |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| HoD Coverage  | A record of what has actually been taught or assessed against each ATP topic, per class. The ATP itself (what _should_ be taught when) is stored and shown in the Teacher Studio; progress against it is not stored anywhere. | No progress data exists. A percentage from nothing would be invented.                                                                                                                                           |
| SMT Tiers     | A rule for placing a learner in a support tier, and an aggregation rule for what a school-level view may show. The sample dashboard uses a generic 80/15/5 RTI split.                                                         | Tier placement is a SIAS/MTSS process decision (OQ list: "never invent SIAS process steps"), and a school-wide count of identifiable support cases is the aggregation question `mod-05-suppression` exists for. |
| SMT PD        | The CPTD point-value schedule and the PD records it would total.                                                                                                                                                              | CPTD point values are unsourced (OQ-006). Never invented.                                                                                                                                                       |
| SBST Meetings | A meeting/minutes record and the SIAS meeting steps it supports. `packages/analytics` models a `MeetingEntry` inside a learner case file, but nothing persists one.                                                           | No stored data; SIAS steps are not to be guessed.                                                                                                                                                               |

**Needs a human:** which of these are wanted, and for each the missing source (a progress-capture
design, the SIAS/MTSS tier rule, the SACE schedule, a minutes record). Each can be re-added to
`ROLE_NAV` together with its page; the navigation test then requires the page to exist.

### OQ-032 — which role wins when an account holds more than one · 2026-10-01

**Decision 2026-11-05 (Sarah-Jane Harding):** multi-role accounts are allowed. The person chooses the active role at sign-in and every action is checked against that role. **Built 2026-11-12 (Stages 123–124):** the chooser, eligibility as the intersection of claim and `role_assignment` (`roleFromProfile` is gone; `rolesFromProfile` returns every role), and gate decisions checked against the active role (`actingAs`, §4.8 item 5). **Proposal 2026-11-11:** how to build it, including what "every action is checked against that role" has to mean for human-gate decisions, is `docs/PROVISIONING_DESIGN.md` §4.8, with five decisions for the owner.

Stage 99 removed the silent `teacher` default for accounts with no recognised role. It did not
change how an account holding **several** of our roles is handled: the first one in Keycloak's
`realm_access.roles` order wins, and that order is not meaningful. If the same account can be both,
say, `learner` and `admin`, which one it signs in as depends on claim ordering. The dev realm gives
every user exactly one role, so nothing exercises this today.

Neither "first wins" nor "refuse" is safe to pick without a policy: refusing locks out anyone
legitimately holding two roles (a head of department who is also a teacher); precedence by privilege
needs a ranking nobody has ratified. **Needs a human:** are multi-role accounts allowed, and if so
what is the precedence (or should the person choose at sign-in)? Superseded by the decision above: the
person chooses, and nothing is inferred from claim order.

### OQ-033 — no real person can decide an approval gate: identity mismatch and no provisioning · 2026-10-07

**Decision 2026-11-05 (Sarah-Jane Harding):** provisioning: the school administrator invites; first sign-in only links an invited account by verified email and never grants a role from a token claim. Still to build: invite flow, `email_verified` check, first-administrator route, session end on suspension.

Found by approving a gate in a browser, not by any test. With the dev stack running and a gate genuinely open (run
`WAITING_FOR_APPROVAL`), signing in as the SMT dev user and pressing **Approve** returns **HTTP 422**:
`Actor b53b1ae8-… does not hold the required role "smt" for this gate.` Nothing is recorded (the task's decision stays null and
no audit event is written), so the gate fails closed — rule 6 holds — but the human-gate feature cannot be used end to end.

Two separate causes, both visible in the code:

1. **Two id spaces.** `POST /api/approvals/[id]/decide` passes the session's OIDC `sub` as `decidedBy`.
   `decideHumanGate` hands it to `hasActiveRoleAssignment(tx, userAccountId, role, now)`, which looks for a
   `role_assignment` whose `user_account_id` equals it. But `role_assignment.user_account_id` references
   `user_account.id` (a database UUID); the OIDC `sub` is stored in the **separate** `user_account.subject` column. The
   two are different values, so the lookup cannot match for a real sign-in even once an account exists. (The orchestrator's own
   tests pass a `user_account.id` as the actor, which is why they pass.)
2. **No provisioning.** Nothing creates a `user_account` or `role_assignment` for a Keycloak user — not the app at first
   sign-in, not the dev seed (it creates generated teacher accounts with invented subjects, none for the nine dev users).

**Needs a human** — this is the identity model for a security gate, so it is not mine to pick:

- Which id identifies the deciding actor everywhere (the `sub`, which the audit trail and `app.actor_id` already use, or
  `user_account.id`)? Either (a) resolve `(tenant, sub)` → `user_account` in the decide route and check roles on that account, or
  (b) change the role lookup to join through `user_account.subject`. Both keep the check as strict as today.
- How do accounts and role assignments come to exist: create on first sign-in from the Keycloak claims, or only by a school
  administrator (the onboarding wizard)? Creating them from a token's role claim would let the identity provider grant
  gate authority, which may or may not be intended.

Until decided, nothing was weakened and no fixture user was given a role assignment to make the button work.

**Decision 2026-10-23 (actor id): `user_account.id`.** The deciding actor is the school's own account id, not the OIDC `sub`.
Implemented in Stage 112: the sign-in `jwt` callback resolves `(tenant, sub)` → the ACTIVE `user_account` once
(`findActiveUserAccountId`, `@@unique([tenantId, subject])`), stores it as `token.userId`, and the session and every API
route use that; `token.sub` is never an actor (a test scans the routes for it). No active account → `''` → pages show
nothing and routes answer 403; a database fault fails the sign-in rather than issuing a session with no actor. The dev stack
gets fixed Keycloak ids and seeded accounts (`db:seed:identities`).

**Still open — provisioning** (designed in `docs/PROVISIONING_DESIGN.md`; decisions recorded in its §12.1; step 1, the `user_invitation` table, is built). Nothing yet creates a `user_account` or `role_assignment` for a real person. My recommendation,
not yet decided: the school administrator creates accounts and role assignments; first sign-in only **links** an invited
account by _verified_ email within the tenant (setting its `subject`), and never grants a role from a token claim. That
needs: an invite flow, an `email_verified` check, and a way to create the first administrator. Until then a real person at
a real school has no actor, so cannot decide a gate (fails closed, as intended). Also open: a session's account is fixed
at sign-in, so suspending an account does not end an existing session; `decideHumanGate` now re-checks the account is `ACTIVE`
at decision time (Stage 125), so a suspended person with a live session can no longer decide a gate; pages and
reads still honour the session until it ends.

**Fixed 2026-11-11 (found in OQ-033 step 3b, closed in Stage 119):** the CHECK constraint on `user_invitation.roles`
(`cardinality("roles") >= 1 AND "roles" <@ ARRAY[…]`, migration `20261024090000_oq033_user_invitation`) **accepted a `NULL`**: the
column is nullable, the expression is then `NULL`, and a CHECK that evaluates to `NULL` passes. Nothing in the application wrote
one (Prisma list columns default to empty, which the CHECK refuses), so the exposure was a hand-written insert only. Migration
`20261111110000_oq033_user_invitation_roles_not_null` re-adds the constraint with an explicit `"roles" IS NOT NULL`, with a
rollback, an integration test for the `NULL` insert, and a drift test; the `role_grant_request` table (Stage 118) was written
with it from the start. Nothing remains open here.

### OQ-034 — what a district rollup would be, if the product wants one · 2026-10-08

**Decision 2026-11-05 (Sarah-Jane Harding):** parked. No district page until a district office exists as a role. If revived, schools publish their own aggregates upward (no cross-school read of identifiable data); the minimum group size is still a policy number to be supplied.

`/district` (reachable by both platform roles, no nav link) used to show three invented schools with learner counts and tier
percentages under "Aggregated, de-identified data only. Minimum cohort size enforced." It now says it is not available. There is no
district concept in the data model, no cross-school read in `packages/db`, and no cohort-size rule anywhere in the codebase; the
access matrix gives neither platform role any right to learner records or tier placements.

**Needs a human** before anything is built:

- Is a cross-school rollup wanted at all, and for whom (platform staff, or a district office that is not yet a role)?
- If yes: which measures, under which declared purpose (`packages/contracts/src/popia/purpose.ts` has none for it), computed how
  without a cross-tenant query on identifiable data (per-school aggregates published upward, rather than a platform read)?
- The smallest group that may be reported (the "minimum cohort size") is a policy number. I have not picked one.

Until decided, the page asserts no control it does not exercise.

### OQ-035 — the EGRA screening tab's benchmarks and tier rule have no supplied source · 2026-10-08

**Decision 2026-11-05 (Sarah-Jane Harding):** the tab shows scores against benchmarks the school types in, and recommends no tier. The SBST person assigns the tier. The built-in benchmark table and 0 / 1-2 / 3+ rule are to be removed. **Done (Stage 142, audit R01/T02):** the tab compares scores with school-typed benchmarks and shows no tier; blank or invalid input gives no result. **Still open:** the subtest list, labels and units were carried over unchanged and do not match the EGRA MTSS reference, and a qualified SBST person must confirm the tab before it is used for real decisions.

Found while removing the sample data from the SBST tabs. `EgraScreeningView.tsx` carries a benchmark table (per grade, per subtest) and
a rule that turns the number of below-benchmark subtests into a tier recommendation (0 → Tier 1, 1–2 → Tier 2, 3+ → Tier 3). Its
comment said the benchmarks were "sourced from the EGRA MTSS Data System reference" (`docs/examples/mod-02-analytics/`). They are not:

- The reference uses different subtests (initial sound, letter sound, nonword decoding, familiar words, oral passage WCPM, reading and
  listening comprehension) on different scales (e.g. `/10`, `/5`), and **two cut-points per grade** (well-below, benchmark) — the view
  uses one number and different subtests (LSI, PA, NWF, WR, ORF, LC, RC) with other values (e.g. Grade 2 letter sounds 72 vs 30/50).
- The reference says its values are "starting reference values only … Recalibrate these using your own baseline data, DBE guidance, or
  a district norm-referencing exercise." EGRA has no single fixed cut-score.
- In the reference a **person** assigns the tier ("Assign / Update Intervention"); there is no flag-count rule. The 0 / 1–2 / 3+ rule
  was written into the view.

The tab is a calculator (nothing is stored) and says its output is a screening recommendation the SBST must confirm, so I left its
behaviour alone and only corrected the false "sourced from" comment. But it does put an invented threshold and an invented tier rule in
front of a support team.

**Needs a human:** which benchmark set and cut-points the school (or DBE guidance) actually uses, and whether the app should recommend a
tier at all or only show scores against the school's own benchmarks. Until decided the numbers are placeholders, not policy.

### OQ-036 — is MFA actually enforced for `admin`, `smt` and the platform roles? · 2026-10-24

**Decision 2026-11-05 (Sarah-Jane Harding):** treat MFA as **not enforced** until verified. Correct `docs/SECURITY.md` section 7 to say so, and add the Keycloak configuration to the repo with a drift test (provisioning step 7).

`docs/SECURITY.md` §7 states that MFA is enforced in Keycloak for the `admin`, `smt` and `platform_*` roles. Nothing
in the repository shows it: `infra/keycloak/realm.json` configures no OTP / required action / browser-flow step and
no email verification, and the production realm is not stored here. Found while designing account provisioning
(OQ-033, `docs/PROVISIONING_DESIGN.md` §5), which depends on `email_verified` meaning something and on MFA keying
off a role that Keycloak still carries.

**Needs a human who operates Keycloak:** is MFA enforced in the real environment, how (which flow / required
action, keyed on what), and is email verification required? If yes, record where it is configured; if no, say so in
`SECURITY.md`. Until answered, treat MFA as not enforced. The provisioning design's step 7 will add the realm
configuration to the repository with a drift test, so this does not depend on memory again.

**Decided 2026-11-11 (Sarah-Jane Harding): build second, after OQ-033.** Keycloak OTP and email verification, with a drift test, and `SECURITY.md` §7 corrected. **Built (Stage 121):** `realm.json` now sets `verifyEmail`, the `browser-mfa` flow with one conditional OTP step per role (`admin`, `smt`, `platform_support`, `platform_admin`), and the `CONFIGURE_TOTP` and `VERIFY_EMAIL` required actions; `keycloak-realm-mfa.spec.ts` guards it. **Still to do, needs a running Keycloak:** (1) `docker compose -f infra/docker/compose.dev.yml up -d keycloak`, wait for `healthy`; (2) sign in as `admin.dev`, confirm Keycloak asks you to set up an authenticator app and then for a code; (3) sign in as `teacher.dev`, confirm no code is asked; (4) record the result here. The production realm must be created from this file (or its differences recorded) before `SECURITY.md` may claim production enforcement. The configuration was written without a live Keycloak and has not been run.

**Recommended way to answer it** (detail in `docs/PROVISIONING_DESIGN.md` §12.2): export the production realm and check four things — OTP required for `admin`, `smt` and the platform roles (or `CONFIGURE_TOTP` on creation), Verify email on, brute-force detection on, no federated provider that skips email verification — then commit the sanitised export with a drift test, or configure what is missing and correct `SECURITY.md`.

### OQ-037 — a public widget catalogue puts one school's code in front of other schools · 2026-10-25 · **decided 2026-10-26 (partly)**

**Decision 2026-11-05 (Sarah-Jane Harding):** reviewed before public release by Infinite-AI appointed staff (see OQ-039), and every public widget runs in a sandbox with no network.

**Decision (Sarah-Jane Harding):** yes, widgets may be shared publicly, but school-specific information is removed first. Built: the Wiring Board removes listed school details and contact patterns, a named SMT member confirms the cleaned version, and the offer file records counts only, never the removed words. `mayOfferToOtherSchools` refuses a public offer that is not marked cleaned. **Still open:** whether shared code runs only after platform review in a sandbox (see OQ-039), and how the platform detects school details a word list misses.

The request is that a widget a school makes can be published "publicly" and offered to every school to accept or
reject. A widget is HTML and JavaScript. Offering it across schools means one tenant's code running in another
tenant's session, which `CLAUDE.md` rule 1 (a tenant never sees another tenant's data) and the security model
do not currently cover: the code can read whatever the page can.

**Needs a human:** decide what may be shared. Options: (a) share only a declarative description (manifest, schemas,
agent contract) and let the platform build the widget from a reviewed kit; (b) share code only after the platform
operator reviews and signs it, and run it sandboxed with no network; (c) do not offer cross-school code at all.
Until decided, `packages/widget-registry` only models the states and does no cross-school work.

### OQ-038 — a typed name is not the actor of record · 2026-10-25 · **decided 2026-10-26**

**Decision (Sarah-Jane Harding):** the signed-in account is the actor of record. The typed name is display only. Built: the registry refuses a ratification, wiring or roll back with no `accountId`; the browser kit takes the signed-in identity from the host page (`window.IAI_IDENTITY`), locks the name field to it, and marks a package with no sign-in `ratified_unverified_identity`. **Still open:** the platform must supply that identity to the page (depends on OQ-033).

The browser Studio asks the person ratifying to type a name and role. The repo's rule is that every decision records
`user_account.id`, and OQ-033 already notes no real person can decide a gate yet. A typed name can be anyone's.

**Needs a human:** accept a typed name only as a label beside the authenticated account, or require the signed-in
`user_account.id` and treat the typed name as display text. The registry package already carries `accountId`
(nullable while only the browser kit exists) and refuses codes and single words as names.

### OQ-039 — who reviews a widget before it goes public · 2026-10-25 · **decided 2026-10-26**

**Decision 2026-11-05 (Sarah-Jane Harding):** you alone are the appointed reviewer to start. Public releases need two reviewers once a second person is appointed. The list is held by the platform, not by schools. Checklist (suggested, to confirm): school information left, POPIA, contract, no network or dynamic code.

**Decision (Sarah-Jane Harding):** Infinite-AI appointed staff review it. Built: `applyPlatformReview` accepts a decision only from a signed-in account on the platform's appointed-reviewer list (a school cannot supply that list), with a reason; a public offer stays `submitted_for_platform_review` until then. **Still open:** who is appointed, how the list is kept, and what the reviewer checks (suggested: school information left, POPIA, contract, no network or dynamic code).

A school-made widget that passes the automatic audit (POPIA scan, agent contract present) has still not been read
by a person outside the school. The request names SMT ratification and public/private choice but no platform
review before release to other schools.

**Needs a human:** confirm a platform operator reviews before any public release, who that role is, and what it
checks. Until then the design treats "public" as "submitted for platform review", not "live".

### OQ-040 — widget output uses learner codes; agent results use platform record ids · 2026-10-26

**Decision 2026-11-05 (Sarah-Jane Harding):** the platform resolves learner codes and run ids to record ids at ingest, using a per-school mapping it holds. Widgets never hold real ids. Mapping store and ingest step not yet designed.

Most MOD-02 agents (AC-01 to AC-10) and DW-06, DW-07, DW-08 return per-learner results naming `learnerId`, `termId`,
`planId`, `insightId` or `sbstRatificationId` as UUIDs. The browser widgets only hold learner codes (for example
`L001`) and run ids, by design (POPIA: no learner names, no real ids in a widget). A widget therefore cannot produce a
schema-valid agent result, and inventing UUIDs would be wrong.

**Needs a human:** confirm that the platform resolves learner codes and run ids to record ids when it ingests a
widget's output (the same step that fills `tenantId`), and where that mapping lives. Until then the Studio marks these
widgets "cannot be laid out from this page" and shows the reason. New artefact ids (worksheets, passages, plans) are
minted by the adapter because the artefact is created there.

### OQ-041 — CE agents cite sources by document id, version and clause; the widgets hold typed references · 2026-10-26

**Decision 2026-11-05 (Sarah-Jane Harding):** CE widgets will let the teacher pick the ratified source document (id and version) from the Brain's L0 list and type the clause, so output cites properly. Not yet built.

CE-01 to CE-09 cite every source as `{documentId, documentVersion, clause, page?, ratifiedBy}` taken from ratified L0
documents. The CE widgets carry a typed source reference (for example "DEMO ATP Grade 2 Term 1, weeks 1-3"), which does
not split into those three parts, and "ratifiedBy" is a Brain fact the widget does not have.

**Needs a human:** decide whether CE widgets should take the ratified source documents as an input (from the Brain's
L0 list, by id and version) so their output can cite them properly, or whether the platform resolves a typed reference
to a document at ingest. Until then the Studio shows the reason and the fields the agent asks for.

### OQ-042 — the marketing site and the reference links in the Unit Blueprint · 2026-11-05

Nine HTML files were supplied to ingest. Six were already in the repo as identical copies (Parent Progress Report,
Lesson Plan Blueprint, Marking Memorandum, Provider Setup Guide, Provider Hub, SBA Blueprint apart from one flag
emoji, fixed). The CAPS Canon Console is already built as the admin page and registry. Two things need a person:

1. **The marketing site** (`docs/marketing/educators-ecosystem/`) is archived, not served. On 2026-11-05 its stale
   claims were corrected, the Google Form was removed (the form now only opens the visitor's email app) and a POPIA
   privacy notice was added. Still open: the legal entity name and Information Officer registration for the notice,
   a concrete retention period, whether to publish roadmap dates for stages 2 to 4, and where it is hosted.
2. **The Unit Blueprint upload** has `[1]` reference links on its field labels that the repo copy lacks. Seven distinct
   targets: three are DBE or DBE-style sources, the rest are Scribd, YouTube and a Brisk Teaching blog post.

**Needs a human:** (a) where the marketing site is hosted, who approves its claims, and the entity and Information
Officer details for its privacy notice; (b) whether the Unit Blueprint should carry the reference links, and if
so only the DBE ones. Until then the site stays archived and the Unit Blueprint stays as it is.

### OQ-043 — provider names in the Provider Hub, Azure wiring, and the price card · 2026-11-06

Checked while ingesting the supplied Provider Setup Guide and Provider Hub against `apps/gateway/src/config/env.ts`.

1. **Setup Guide: fixed.** Five variable names did not match what the gateway reads (`GEMINI_*`, `QWEN_*`, `LMSTUDIO_*`,
   `AZURE_OPENAI_BASE_URL`). They are now `GOOGLE_*`, `DASHSCOPE_*`, `LM_STUDIO_*` and `AZURE_OPENAI_ENDPOINT`
   (plus `AZURE_OPENAI_DEPLOYMENT`). Every variable the guide names is now in `env.ts`.
2. **Provider Hub: not fixed.** It uses singular `*_API_KEY`, `GEMINI_API_KEY`, `QWEN_BASE_URL` and `*_MODEL_ID` names
   (`LM_STUDIO_MODEL_ID`, `OLLAMA_MODEL_ID`, `QWEN_MODEL_ID`) that `env.ts` does not define. It is 300 KB of generated
   markup, so it was left alone. **Needs a human:** is the Hub meant to produce a `.env` file? If so its names must change.
3. **Azure.** `providers.ts` passes `AZURE_OPENAI_ENDPOINT` to the generic OpenAI-compatible adapter and uses the
   deployment as the model name. No code builds Azure's `/openai/deployments/<name>/...?api-version=` path, so Azure may
   not work end to end. Test it against a real resource before telling a school to use it.
4. **Price card.** The billing code, `docs/COST_MODEL.md` and `docs/financial-model.html` carry different price cards.
   **Needs a human:** choose one, then update `packages/billing/src/tiers.ts` and the documents together.

   **Decided 2026-11-11 (provisional).** Adopt the per-school formula as the working price: R300 platform fee + R75 per
   educator + R4.00 per learner (first 500) + R1.50 per learner above 500, minimum R750, community rate 50 %, annual prepay
   10 % off, VAT 15 % shown as an ex VAT split. Provisional until three schools have seen it. Implemented in
   `packages/billing/src/pricing.ts`; `COST_MODEL.md`, `ONBOARDING_GUIDE.md`, `AWS_MIGRATION_AUDIT.md` and
   `financial-model.html` updated in the same change; `packages/billing/test/price-parity.spec.ts` fails if they drift.
   Funding effect: about R1.6m more in the Base case than the old card (business planning package v1.2).

### OQ-044 — the widget archive is not served, and the app's CSP would block it · 2026-11-10

`apps/web/public/widgets/` holds 80 single-file widgets. Two things in the app stop a signed-in person opening them
from the site: `src/lib/route-access.ts` denies every unlisted route (default deny), and `buildCsp` allows scripts only
with the per-request nonce plus `strict-dynamic`, which blocks the widgets' inline `<script>`. The existing static pages
under `public/` have the same property, so this follows the repo's current convention: the files are archived and handed
to schools, not served.

**Needs a human:** do schools open widgets from the platform, or as downloaded files? If from the platform, a gated route
(for example `/teacher/tools/<id>`) and a CSP decision are needed, and the CSP change is a security-control change that
needs your sign-off. Options: serve each widget in a sandboxed iframe with its own hash-based CSP, or stamp the nonce into
the page on serve. Until decided, nothing changes.

### OQ-045 — who ratifies the first release of each widget · 2026-11-10

The registry refuses a release without a named, signed-in ratifier whose ratification matches the content hash. No release
of any of the 80 widgets exists, so nothing can be wired. The archive index records each file's SHA-256, which is what a
ratifier would be ratifying.

**Needs a human:** name who ratifies each module's widgets (for example the HoD for CE, the SBST lead for SA, the PD
coordinator for PD, the teacher lead for TB), and whether the 7 deterministic classroom tools (no agent, no learner data)
can be ratified as one batch. Ratification is done in the Studio panel by that person; the release packages are then added
with `addRelease`.

## Decisions recorded 2026-11-11

Recorded from the owner's instructions. Each is a decision, not yet built unless stated.

| ID     | Decision                                                                                                                                                         |
| ------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| D-1    | OQ-043 formula price adopted, provisional (above). Built in Stage 120b.                                                                                          |
| D-2    | Prices are shown VAT-inclusive with the ex VAT split.                                                                                                            |
| D-3    | Teacher training is part of the ecosystem, not a second product line.                                                                                            |
| D-4    | Pilot schools #2 and #3 are deferred until pre-pilot testing with school #1 is complete.                                                                         |
| D-5    | Founder salary R35,000 per month during the pre-pilot and pilot phases, half-time commitment. Reviewed after the pilot phase.                                    |
| D-6    | Voluntary VAT registration from launch, subject to the accountant.                                                                                               |
| OQ-033 | Build first. Built: provisioning steps 1 to 3b, in Stages 112, 113 and 115 to 119 (the `NULL` gap in `user_invitation.roles` closed in Stage 119).               |
| OQ-036 | Build second. Correct `SECURITY.md` section 7. Keycloak OTP and email verification, with a drift test.                                                           |
| OQ-016 | December-holiday labelling sprint with Primary school staff. Two people label a sample to measure agreement.                                                     |
| OQ-017 | Apply Terraform to a small staging environment in Nov-Dec, then run k6.                                                                                          |
| OQ-018 | Log tokens per agent and per tenant from day one. After month one, check whether cost follows learners or educators.                                             |
| OQ-020 | December, 30-45 minutes, using `HOW_TO_ADD_AN_AGENT.md`.                                                                                                         |
| OQ-003 | Deferred until school onboarding. Ask the Benjamin Pine principal for the unit blueprint, assessment task, rubric/memo and parent report templates, with a date. |
| OQ-044 | Decided: serve from the ecosystem app. Still to do: a gated route, a CSP decision (sandboxed iframe suggested) and sign-off.                                     |

### OQ-046 — three human gates require roles that do not exist, so nobody can decide them · 2026-11-11

Found while reading how gate decisions check roles (OQ-032, `docs/PROVISIONING_DESIGN.md` §4.8). `decideHumanGate` refuses
unless the deciding account holds a live `role_assignment` for the gate's `requiredRole`. Three pipeline steps name roles
that are not in the `Role` list and that provisioning cannot grant (an invitation, or a grant request, may carry only
`teacher`, `hod`, `smt`, `sbst` and `admin`; the invitation table refuses anything else):

- MOD-02 `parent-letter-review` — `requiredRole: 'lse'` (the Learning Support Educator; `packages/orchestrator/src/pipelines/mod-02.ts`)
- MOD-02, the step at `requiredRole: 'sbst_chair'` (same file)
- MOD-03 `requiredRole: 'data_manager'` (`pipelines/mod-03.ts`)

Until these are decided, a run that reaches one of those gates waits for an approval no real account can give (it times out
or stays open). The other gates use `teacher`, `hod`, `smt` and `sbst`, which exist. Nothing here is invented policy to fix:
which school role should decide each is the school's and the owner's to say.

**Decided 2026-11-12 (Sarah-Jane Harding):** `lse` → `sbst`; `data_manager` → `admin` (both built, Stage 126); `sbst_chair` → a **new role**, designed in `docs/PROVISIONING_DESIGN.md` §4.9; the four recommendations there were accepted the same day and the role is built (Stage 128). The CI check now exists (`apps/web/tests/unit/pipeline-gate-roles.spec.ts`); `sbst_chair` was its one awaiting entry; the list is now empty, and the check still fails if a gate names a role nobody can be granted. Consequences of the first two: any SBST member (not only the LSE) can sign off the parent letter, and the school administrator confirms new data-source mappings.

**MFA for `sbst_chair`: decided 2026-11-12 (Sarah-Jane Harding): yes.** The realm now requires a one-time code for the role (Stage 133).

**Originally needed a human:** for each of the three, which existing role decides it (for example `sbst` for the SBST chair step), or
whether a new role is wanted, which is its own design (guardians and learners were treated that way in §12.2 item 10). A
CI check that every pipeline's `requiredRole` is a role provisioning can grant would stop this recurring; it needs the
answer above first, since today three steps would fail it.

### OQ-047 — reinstating a suspended account · 2026-11-12 · DECIDED 2026-11-12 (Stage 135)

Found building the suspend and offboard actions (`docs/PROVISIONING_DESIGN.md` §4.5, Stage 131). `setAccountStatus` moves an
account to `SUSPENDED` or `OFFBOARDED` and nothing moves it back: a suspended account stays suspended, and the data layer refuses to
set the state it is already in. Offboarding is final by design (it ends every role); suspension is not obviously meant to be. The
admin UI therefore offers Suspend with a warning that it cannot be undone from there, and no reinstate.

**Needs a human:** may a suspended account be reinstated, and by whom? Suggested for the owner to accept or change: an administrator
other than the person (the same rule as suspending), roles unchanged by the suspension itself, audited as its own event; and whether
reinstating needs a second administrator (the argument for it is that it restores the ability to decide gates; the argument against is
that suspending needed none). Until then a wrongly suspended person needs a database change by an operator.

### OQ-048 — the Keycloak integration needs four owner decisions before step 7 is built · 2026-11-12

Found writing the delivery plan for steps 7 and 8 (`docs/PROVISIONING_DESIGN.md` §11.1). These are security and operations
choices, so they are the owner's; recommendations are given so a one-line answer is enough.

- **(a) Which client holds the power to create users?** The worker's service account (`infinite-ai-worker`) has no
  `realm-management` roles. _Recommend:_ a new dedicated client, `infinite-ai-provisioner`, whose service account has only
  `manage-users`, `query-users` and `view-users` (nothing realm-wide), secret `KEYCLOAK_PROVISIONER_CLIENT_SECRET`. Widening the
  worker instead would give the model-facing worker process the power to mint identities.
- **(b) Failure semantics.** The Admin API call cannot share the database transaction. _Recommend:_ commit first, then call; record
  `idp_state` (PENDING / SYNCED / FAILED) on the row so a failure is visible and an administrator can retry. This needs a migration.
  The alternative (call first, then commit) can leave a Keycloak user that the database has never heard of.
- **(c) Disable in Keycloak on suspend/offboard?** _Recommend yes_, with session revocation: it is the only thing that ends a
  session already in flight (§6), and the ACTIVE-account gate cannot.
- **(d) Email delivery.** `execute-actions-email` needs SMTP configured on Keycloak. OQ-021 names a mailbox for dunning, not for
  Keycloak, and I have not verified that Keycloak can use it. _Recommend:_ for the pilot, an operator sends the first sign-in
  link by hand (as §5 already allows for three schools), and SMTP is a separate, later decision.

**Residual risk of (a), stated plainly.** A dedicated client limits the blast radius to identity management, but `manage-users` can map _any_
realm role to a user — including `platform_admin`. The application's client refuses to (only school-staff roles can be mirrored, tested), but that
protects against our own bugs, not against the secret leaking. So the secret is as sensitive as an administrator credential: keep it in AWS Secrets
Manager in production, rotate it, keep Keycloak's Admin API reachable from the application only, and turn on Keycloak admin events with an alert on
any realm-role mapping to a platform role. Keycloak's fine-grained admin permissions could narrow which roles it may map; I have not designed that.

Nothing in 7a (the unwired client and its fake) depends on these answers, so it can start now; 7b onward waits on (a) and (b).
**Decision (2026-11-12, the owner):** "Yes they can be reinstated." Built in Stage 135 as `reinstateAccount` and
`POST /api/admin/staff/accounts/[id]/reinstate`.

**Assumptions I made, which the owner has not confirmed and may change:** the owner decided _whether_, not the details. I used the
suggested ones: (1) the same rule as suspending — an active administrator other than the person; (2) roles untouched, so a person
comes back with what they held; (3) **no second administrator** (suspending needed none); (4) audited as `user_account.reinstated`;
(5) only `SUSPENDED` goes back — `OFFBOARDED` stays final, and bringing such a person back is a new invitation. If (3) should be
stricter, reinstating needs a confirmation step like `smt`/`admin` grants; say so and it becomes its own change.

### OQ-049 — the repository now also installs with npm; what should that cover? · 2026-11-15 · RESOLVED (2026-11-16)

A hosted build tool that runs `npm install` failed with `EUNSUPPORTEDPROTOCOL: Unsupported URL Type "workspace:"`, because every
internal dependency was declared `workspace:*`, which only pnpm (and bun) understand. pnpm and bun installed the repository fine; npm
could not.

**What changed:** the 71 internal dependency declarations (22 workspace manifests and the root) are now the exact version of the
workspace package they point to (`"0.1.0"` today). `"*"` was tried first and rejected: `pnpm audit:supply-chain` (Stage 16) forbids
range specifiers, and the audit was not changed. The root `package.json` gains `workspaces` (the same two globs as
`pnpm-workspace.yaml`) and an `overrides` block that mirrors `pnpm.overrides`. pnpm still links the local folders because `.npmrc` sets
`link-workspace-packages=true`; npm links them through `workspaces`. Checked on clean copies: `pnpm install --frozen-lockfile` and
`npm install` both succeed, every `@infinite-ai/*` package is a symlink to its folder, none is resolved from the registry, and the pnpm
lockfile changed only in its 71 `specifier` lines (no package version moved).
`packages/config/test/workspace-install-compat.spec.ts` keeps it that way: it fails if an internal dependency is not exactly the
workspace package's version (so a `workspace:` protocol, a range, `"*"` or a stale version all fail), if `workspaces` and
`pnpm-workspace.yaml` differ, or if the two `overrides` blocks drift.

**What this costs and what an npm install does not give you (decide whether that matters):**

1. **Version bumps touch more files.** When a workspace package's version changes, every package that depends on it must change to the
   new version, or the test fails (it names the files). Today all 35 packages are at `0.1.0` and nothing bumps them.
2. **No build-script allow-list under npm.** pnpm 10 runs install scripts only for the eight packages in `pnpm.onlyBuiltDependencies`;
   npm runs the install scripts of every dependency. This is a supply-chain control that only applies under pnpm.
3. **No committed lockfile for npm.** Direct dependencies are exact pins in the manifests, so only transitive versions can differ from
   what pnpm resolves. A second lockfile would need keeping in step with `pnpm-lock.yaml`.
4. **A name must resolve locally.** An exact version is linked from the folder only while the package exists in the workspace at that
   version. If an internal package were renamed or removed while something still depended on the old name, the tools could resolve a
   package of that name from the public registry. The new test checks only names that exist in the workspace, so it would not notice a
   removed or renamed package; rename a package by searching for the old name everywhere.

**Questions for the owner:** should npm stay a supported way to install, or only a way to run hosted previews? Should CI also run an
`npm install` job (about a minute) so this cannot regress unseen? Should a `package-lock.json` be committed? The recommendation is: keep
pnpm as the only supported path for development, release and CI; keep npm working for previews; add the CI job; do not commit a second
lockfile.

**Resolved (2026-11-16, the owner):** keep npm as a supported install path. CI now has an `npm install compatibility` job
(`npm-install` in `.github/workflows/ci.yml`) that runs `npm install --ignore-scripts --no-package-lock` and fails unless every
`node_modules/@infinite-ai/*` entry is a symlink to its workspace folder. No `package-lock.json` is committed. The job does not run
install scripts (so it cannot show that a dependency's install script works under npm), and the missing build-script allow-list
(point 2 above) remains true for npm; CI still installs, lints, typechecks, tests and builds with pnpm only. The job is not added to any
required-checks list by this change.

### OQ-050 — monthly AWS budget limits (provisional, in rand) and who is alerted · 2026-11-15

`staging.tfvars` sets `monthly_budget_zar = 10000` and `production.tfvars` sets `13000`, with `zar_per_usd = 18.5`. Basis:
`docs/aws-cost-estimate.html` puts the shared baseline at R5,180-R7,770 a month; staging takes the top plus 20% headroom
(R9,324, rounded to R10,000), production adds the estimate's own high-availability extras (+R2,220 and +R592) then 20%
(R12,698, rounded to R13,000). That estimate predates the self-hosted Langfuse stack and excludes LLM spend, so both figures
are probably low.

**Decisions (2026-11-15, the owner):** (1) the figures are **provisional**: keep them until the full business load has been
tested (the k6 run in OQ-017), then reset both limits from the real bill. (2) All budgets are in **rand**. (3) **The founder
receives budget alerts by email and by text message.**

How those were built, and what is still open:

- **Rand and USD.** AWS Budgets measures cost in USD; its documentation shows only USD cost budgets, and a rand figure sent as
  the limit could be compared against USD costs and alert far too late. So Terraform converts: limit = rand / `zar_per_usd`,
  rounded down to the cent, exposed as the `budget_limit_usd` output. AWS's own alerts will show USD. The effective rand limit
  drifts with the exchange rate, so `zar_per_usd` needs updating if the rand moves materially.
- **The founder's contact details are not in the repository or in Terraform state.** Alerts go to an SNS topic
  (`budget_alert_topic_arn`); the founder's email and mobile number are subscribed to it by hand
  (`docs/RUNBOOKS/aws-setup.md` step 6). **Still needed from the owner: the founder's email address and mobile number, given
  to whoever runs that step, not written here.** Until that is done, only the ops mailbox (`alert_email`) is alerted.
- **Unverified, to be tested with the step-6 publish test:** that SNS can text South African numbers from `af-south-1` (the account
  starts in the SNS SMS sandbox, so the number must be verified, and an origination identity may be needed); and that AWS Budgets
  can publish to a topic in an opt-in Region. If either fails the founder gets no alert, so the test matters.
- A merge to `main` runs the production apply behind its reviewer gate and would create the production budget and the topic.

### OQ-051 — existing modules keep generated passwords in Terraform state · 2026-11-15

`modules/cache`, `modules/langfuse`, `modules/clickhouse` and the `modules/database` application roles create
`aws_secretsmanager_secret_version` resources from generated values, so those values sit in the state file. The new
`modules/app-secrets` avoids this (empty shells). The state bucket is private and encrypted, so this is tolerable for a pilot with
one operator, but access to the state bucket is access to those secrets. _Recommend:_ decide, before a second person gets state
access, whether to move these to empty shells set out-of-band, or to RDS-managed rotation where the service supports it.

### OQ-052 — customer-managed KMS key, and billing access for the apply role · 2026-11-15

(a) Secrets Manager uses the AWS-managed key (`aws/secretsmanager`), as `modules/encryption-key` already records. A
customer-managed key would add key-policy control and an audit trail of who decrypted what, at about $1/month and a key-policy
change on every execution role. _Recommend:_ stay on the managed key for the pilot; revisit with the second school. (b) Creating
the budget as a non-root role may require the account setting "IAM user and role access to Billing information" to be activated by
the root user. I could not check this without credentials; `docs/RUNBOOKS/aws-setup.md` step 6 says what to do if `apply` is refused.

### OQ-053 — there is no procedure to re-encrypt learner data under a new `DB_ENCRYPTION_KEY` · 2026-11-15

`docs/RUNBOOKS/secrets-rotation.md` tells the operator never to rotate this key, because replacing the secret makes every
existing encrypted identifier undecryptable and nothing in the repository describes re-encrypting them. Needed before the key can
ever be rotated (including after a suspected exposure): a written, tested re-encryption procedure that uses
`DB_ENCRYPTION_KEY_VERSION`, runs per tenant, and can be resumed if interrupted. _Recommend:_ design it before production go-live.

### OQ-054 — `commons_pattern_sharing` expired on 2026-11-15; ship it, remove it, or extend it? · 2026-11-24 · RESOLVED (2026-11-24)

`pnpm check:flags` (Stage 18's gate) fails because the flag's `expiresAt` (`packages/config/src/flags.ts`) passed on 2026-11-15, and its
own rule is: "ship behind the flag and remove it, or remove it if the feature is off. Do not extend `expiresAt` without a review."
Nothing in `apps/*` or `packages/*` reads `isEnabled('commons_pattern_sharing')` (only `flags.ts` and `flags.spec.ts` mention it), so the
flag currently gates no code. It describes tenant opt-in sharing of anonymised learning patterns to the Commons pool (LE-08, k-anonymity
threshold), which touches POPIA purpose limitation, so this is the owner's call, not a clean-up. Options:

1. **Feature is off / not being built yet:** delete the flag from `FLAGS` and update the three `flags.spec.ts` cases that name it
   (the registry test counts `FLAGS.length`). Re-add it, with a fresh expiry, when LE-08 sharing is actually built.
2. **Feature is shipping:** it needs its consumer wired behind the flag first; the flag is then removed once it ships to all tenants.
3. **Needs more time:** extend `expiresAt` to a stated date with a recorded reason. Allowed only after a review.

_Recommend:_ option 1, since no code uses it. Nothing was changed; Stage 18's gate stays red until this is decided (rule 1: do not proceed).

**Resolution 2026-11-24:** the owner chose option 1. The flag was removed from `FLAGS`, with its tests and the `FLAG_COMMONS_PATTERN_SHARING` line in `docs/OPERATOR_MANUAL.md`. Re-add a flag, with a fresh expiry, when LE-08 pattern sharing is built.

### OQ-055 — decisions the one-school pilot protocol needs from you · 2026-11-26

Source: audit tasks T01, T04, T32. `docs/PILOT_PROTOCOL_ONE_SCHOOL_DRAFT.md` (draft, not adopted) leaves these blank on purpose; the existing
`docs/PILOT_PROTOCOL.md` stays in force until you adopt it. In the order they unblock work: **D2** the school's written agreement, signatory and date
(Benjamin Pine is recorded as school 1 but current approval is unconfirmed) · **D4** product owner and who may restart a paused pilot · **D5** privacy and
safeguarding leads · **D3** first workflow (recommended: the offline classroom-kit widgets while the generation journey is built) · **D1** start date and phase
lengths (the 2026-10-06 start has passed) · **D6** thresholds (recommended: no NPS gate; safety is the only hard stop) · **D7** a cost ceiling, plus model
pricing and a budget for T16 · **D8** who decides at the end.

### OQ-056 — the Parent Portal shows invented school notices · 2026-11-26

Found while writing `docs/FEATURE_MATRIX.md`; not in the audit. `GuardianPortal.tsx` hard-codes "Term 3 results available from 25 August" and "Parent evening:
3 September 18:00" under "School notices", and a progress line that promises results "once Term 3 assessments are completed". None comes from the school. The
SBST, HoD, SMT, district and run-inspector pages had the same kind of content removed and now say plainly that there is nothing to show; this page was missed.

**Needs a human:** confirm that it should be treated the same way (remove the notices and say nothing real is shown yet), or say where genuine school notices
would come from. Until then no guardian may be given access (guardian access is switched off in the pilot scope in any case).
