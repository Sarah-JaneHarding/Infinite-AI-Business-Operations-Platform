# How to add an agent

This is the handover tutorial for Stage 18 §3.3. It walks through adding a real agent
from scratch, using the CE-01 ATP Sequencer as the worked example. Follow these steps in
order; each one has a checklist item in the Definition of Done.

---

## 1. Decide the module, ID, and purpose

Every agent belongs to a module (CE, AC, TB, PD, LE, or a new one). Pick an ID that
continues the module's sequence (e.g., `CE-10` follows `CE-09`). Write a single sentence
that states what the agent produces and why — this becomes the `purpose` field.

```typescript
// packages/agents/src/mod-01/CE-10-example.agent.ts
export const CE10Agent: AgentDefinition = {
  id: 'CE-10',
  module: 'MOD-01',
  purpose: 'Generates a term overview from a ratified ATP for a given grade and subject.',
  // ...
};
```

---

## 2. Define the input and output Zod schemas

All agent I/O lives in `packages/contracts/src/`. Name the schemas after the agent ID.

```typescript
// packages/contracts/src/mod-01/CE-10.schema.ts
import { z } from 'zod';

export const CE10InputSchema = z.object({
  tenantId: z.string().uuid(),
  gradeId: z.string().uuid(),
  subjectId: z.string().uuid(),
  termId: z.string().uuid(),
  atpId: z.string().uuid(),
  deidentified: z.literal(true), // PII guard — mandatory on every input schema
});

export const CE10OutputSchema = z.discriminatedUnion('status', [
  z.object({ status: z.literal('ok'), overview: z.string().min(1) }),
  z.object({ status: z.literal('no_atp'), reason: z.string() }),
]);

export type CE10Input = z.infer<typeof CE10InputSchema>;
export type CE10Output = z.infer<typeof CE10OutputSchema>;
```

Export from the `contracts` barrel (`packages/contracts/src/index.ts`). Add a contract
test that validates the schema shape and the barrel export.

---

## 3. Register the agent in `packages/agents`

```typescript
// packages/agents/src/mod-01/CE-10-example.agent.ts
import { CE10InputSchema, CE10OutputSchema } from '@infinite-ai/contracts';
import type { AgentDefinition } from '../types.js';

export const CE10Agent: AgentDefinition = {
  id: 'CE-10',
  module: 'MOD-01',
  purpose: 'Generates a term overview from a ratified ATP for a given grade and subject.',
  inputSchema: CE10InputSchema,
  outputSchema: CE10OutputSchema,
  guardrails: ['pii_guard', 'purpose_check', 'output_safety'],
  requiresApproval: false,
  writesToBrain: true,
  costBudgetCents: 5_00, // 500 c = R 5.00 per call
  promptRef: 'CE-10/v1',
  evalSetRef: 'ce/CE-10-term-overview.eval.json',
};
```

Add the agent to the module's barrel export and to the full agent registry in
`packages/agents/src/index.ts`. The `AgentRegistry` contract test will fail loudly if
you skip this.

---

## 4. Write and version the prompt

Prompts live in `packages/prompts/src/`. Every prompt is a versioned file; the lock file
(`packages/prompts/src/lock.json`) records its SHA-256 hash.

```
packages/prompts/src/mod-01/CE-10/v1.md
```

Run `pnpm --filter @infinite-ai/prompts exec tsx src/lock-prompts.ts` after writing the
prompt. The lock test (`pnpm --filter @infinite-ai/prompts test`) will fail if the hash
is missing or stale.

**Prompt rules (non-negotiable):**

- No learner name, SA ID, date of birth, or any other direct identifier in the prompt.
  The input schema's `deidentified: true` stamp is the proof; the PII guard checks it.
- No invented curriculum policy. Every claim about CAPS must cite a supplied document.
- Every output must go through `packages/guardrails` before leaving the system.

---

## 5. Create the eval set

At least 20 cases are required (CLAUDE.md Definition of Done). Cases live in
`packages/evals/src/sets/`.

```json
// packages/evals/src/sets/ce/CE-10-term-overview.eval.json
{
  "agentId": "CE-10",
  "cases": [
    {
      "id": "CE10-001",
      "description": "Grade 6 Mathematics term 1 overview",
      "input": {
        "tenantId": "...",
        "gradeId": "...",
        "subjectId": "...",
        "termId": "...",
        "atpId": "...",
        "deidentified": true
      },
      "expectations": [
        { "type": "exact_match", "field": "status", "value": "ok" },
        { "type": "contains", "field": "overview", "value": "Mathematics" }
      ]
    }
    // ... 19 more cases
  ]
}
```

Run `pnpm evals:run --all` and `pnpm evals:gate` to confirm the eval set is recognised
and the score gate passes.

---

## 6. Wire the guardrails

Every agent call must pass through the guardrail plane. The guardrail engine is in
`packages/guardrails/src/engine.ts`. Ensure your agent's `guardrails` array includes:

- `pii_guard` — refuses any input without `deidentified: true` (mandatory).
- `purpose_check` — validates that the calling purpose is in the purpose allow-list.
- `output_safety` — scans the model output for refusal patterns and unsafe content.

If the agent touches learner data: add `age_appropriateness` (requires OQ-015 to be
resolved before it does anything useful).

---

## 7. Register the pipeline (if orchestrated)

If the agent is part of a pipeline (DAG), register it in `packages/orchestrator/src/`:

```typescript
// packages/orchestrator/src/pipelines/mod-01/CE-10-pipeline.ts
export const CE10Pipeline: Pipeline = {
  id: 'CE-10-term-overview',
  steps: [
    { id: 'fetch-atp', agent: null, action: 'db:fetch' },
    { id: 'generate', agent: 'CE-10', after: ['fetch-atp'] },
    {
      id: 'save-to-brain',
      agent: null,
      action: 'brain:write',
      after: ['generate'],
      requiresApproval: false,
    },
  ],
};
```

The `validatePipelineDag` utility checks for cycles and missing steps. The orchestrator
contract test asserts the pipeline shape.

---

## 8. Emit telemetry

Every agent execution must emit:

- A trace span: `packages/telemetry` `startSpan('agent.execute', { agentId: 'CE-10' })`.
- A cost metric: `recordCost(costCents)` after the model call.
- An audit event: `packages/db`'s `withTenant()` client, action `'agent_executed'`.

The trace-coverage contract test (`pnpm test:telemetry-coverage`) will fail if the span
is missing.

---

## 9. Set a cost budget

`costBudgetCents` in the agent definition is enforced by the gateway. A call that would
exceed the budget is refused with `cost_budget_exceeded`. Set it conservatively — you
can raise it after eval data confirms the typical cost.

Pilot school tier (Starter): 150 learners × 20 artefacts × R 5.00 = R 15 000 / month
upper bound. Budget each agent so the sum stays within the tier's monthly cost ceiling.

---

## 10. Update the docs

- `docs/DEPENDENCIES.md` if you added a package.
- `CHANGELOG.md` under `[Unreleased] → Added`.
- The relevant module's section in `INFINITEAI_BUILD_MANUAL.md` (if a new module).

---

## Definition of Done checklist

- [ ] Input and output Zod schemas in `packages/contracts`, with a contract test.
- [ ] Agent registered in `packages/agents` with `id`, `module`, `purpose`, `guardrails`,
      `budget`, `promptRef`, and `evalSetRef`.
- [ ] Prompt versioned in `packages/prompts`, hash in `lock.json`.
- [ ] Eval set with ≥ 20 cases in `packages/evals/src/sets/`.
- [ ] `pnpm --filter @infinite-ai/agents test` passes.
- [ ] `pnpm --filter @infinite-ai/prompts test` passes.
- [ ] `pnpm evals:run --all && pnpm evals:gate` both exit 0.
- [ ] Guardrails wired: `pii_guard`, `purpose_check`, `output_safety` at minimum.
- [ ] Trace span, cost metric, and audit event emitted.
- [ ] `pnpm test:telemetry-coverage` passes.
- [ ] `docs/DEPENDENCIES.md` and `CHANGELOG.md` updated in the same commit.
- [ ] `pnpm lint && pnpm typecheck` both pass.
