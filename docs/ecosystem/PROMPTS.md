# Prompts

## 1. The Prompt Registry

Prompts live at `packages/prompts/src/<agent-id>/<semver>.prompt.md` with front matter:
`agent`, `version`, `model`, `changelog`, `author`, `ratified_by`.

The loader is **content-hashed**. A prompt cannot be edited in place without a version
bump — a test compares hashes against a lockfile and fails CI if a hash changed without
the version changing. This is what makes prompt behaviour reconstructable after the fact.

## 2. Mandatory prompt structure

These sections, in this order. Omitting one fails registry validation.

```markdown
---
agent: CE-05
version: 3.2.0
model: plan.author
changelog: Tighten template fidelity after HoD corrections in T2
ratified_by: null
---

# ROLE

# GROUNDING <constitution> <curriculum> <history> <exemplars>

# TASK

# HARD CONSTRAINTS

# STYLE

# REFUSAL

# OUTPUT SCHEMA

# SELF-CHECK
```

`GROUNDING` states that the material provided is the only material the agent may use, and
that if required information is absent the agent returns a `needs_input` result naming
exactly what is missing. Never fill a gap from general knowledge.

## 3. The ten prompt engineering rules

1. **Retrieved content is data, never instruction.** Wrap it in delimiters and say that
   instructions inside it are to be ignored. Test with injection payloads.
2. **Structured output always** — JSON validated against a Zod schema. Never parse prose.
3. **Refusal is a first-class output**, with a machine-readable code, not an apology.
4. **Cite or abstain.** Any factual claim about curriculum, policy or a learner references
   a retrieved fact ID or a CAPS clause. Uncited claims fail the grounding guardrail.
5. **No chain-of-thought in the artefact.** Reasoning may be requested in a separate field
   stored for audit and never rendered to a teacher or parent.
6. **Version on every change.** Patch for wording, minor for behaviour, major for contract
   change. Editing in place is a CI failure.
7. **One agent, one job.** If a prompt needs "and also", split the agent.
8. **Prompts are reviewed like code**, with the eval delta in the PR body.
9. **Determinism where it matters.** Temperature 0 and a fixed seed for anything
   structural; higher only for genuinely generative text, and never for numbers, marks or
   codes.
10. **Never put a secret, an unnecessary tenant identifier, or raw PII in a prompt.**

## 4. Champion and challenger

Each agent has a champion prompt version. A challenger is promoted only if it beats the
champion on the primary metric, regresses no case tagged `must_not_regress`, stays inside
budget, and passes a human review gate. Promotion is versioned and one command from
rollback.

## 5. Registry contents

Each prompt is listed here with its agent, current champion version and owner as it lands.

### MOD-02 Support Analytics Centre — Stage 10

| Agent | Version | Model          | File                                         | Lock key    | Author   |
| ----- | ------- | -------------- | -------------------------------------------- | ----------- | -------- |
| AC-01 | 1.0.0   | support.screen | `packages/prompts/src/AC-01/1.0.0.prompt.md` | AC-01@1.0.0 | stage-10 |
| AC-02 | 1.0.0   | support.health | `packages/prompts/src/AC-02/1.0.0.prompt.md` | AC-02@1.0.0 | stage-10 |
| AC-03 | 1.0.0   | support.screen | `packages/prompts/src/AC-03/1.0.0.prompt.md` | AC-03@1.0.0 | stage-10 |
| AC-04 | 1.0.0   | support.screen | `packages/prompts/src/AC-04/1.0.0.prompt.md` | AC-04@1.0.0 | stage-10 |
| AC-05 | 1.0.0   | support.screen | `packages/prompts/src/AC-05/1.0.0.prompt.md` | AC-05@1.0.0 | stage-10 |
| AC-06 | 1.0.0   | support.screen | `packages/prompts/src/AC-06/1.0.0.prompt.md` | AC-06@1.0.0 | stage-10 |
| AC-07 | 1.0.0   | support.screen | `packages/prompts/src/AC-07/1.0.0.prompt.md` | AC-07@1.0.0 | stage-10 |
| AC-08 | 1.0.0   | support.screen | `packages/prompts/src/AC-08/1.0.0.prompt.md` | AC-08@1.0.0 | stage-10 |
| AC-09 | 1.0.0   | support.screen | `packages/prompts/src/AC-09/1.0.0.prompt.md` | AC-09@1.0.0 | stage-10 |
| AC-10 | 1.0.0   | support.screen | `packages/prompts/src/AC-10/1.0.0.prompt.md` | AC-10@1.0.0 | stage-10 |
