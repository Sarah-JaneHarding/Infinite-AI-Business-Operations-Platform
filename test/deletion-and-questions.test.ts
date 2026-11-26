import { describe, expect, it } from 'vitest';
import { Platform, RunRefused } from '../src/core/platform';
import { canonical, sha256Hex } from '../src/core/crypto';
import type { Actor } from '../src/core/types';
import { agentById, DEPARTMENTS } from '../src/departments';
import { buildCeoState, deriveTasks } from '../src/core/ceo';
import { Rejected, validateAppend, type AppendCtx } from '../src/server/validate';
import {
  OPEN_QUESTIONS,
  generateTaskManifest,
  latestQuestionDecisions,
  latestTaskManifests,
  recordDecisionAndManifest,
  routeQuestion,
} from '../src/core/openQuestions';
import type { Rec } from '../src/core/warehouse';

const human = (id: string, name = id): Actor => ({ id, name, kind: 'human', roles: ['Founder'] });

const testAgent = agentById('OPS-EXEC-03')!;
const twoPersonAgent = agentById('OPS-PROD-01')!;

function ctxOf(initial: Record<string, Rec[]> = {}, actor: string | null = 'sarah'): AppendCtx {
  return {
    actor,
    store: {
      list: (c) => initial[c] ?? [],
    },
  };
}

describe('Signed deletion across artefacts, documents, tasks, and custom defs', () => {
  it('Platform.deleteArtefact deletes DRAFT and IN_REVIEW artefacts with reason & signature and hides them from CEO state', async () => {
    const p = await new Platform().init();
    const sarah = human('sarah', 'Sarah-Jane Harding');
    const draft = await p.runAgent(testAgent, { decision: 'Pilot', options: 'A or B', evidence: 'Stage log' }, sarah);
    expect(p.artefacts().some((a) => a.id === draft.id)).toBe(true);

    // Requires reason and signature
    await expect(p.deleteArtefact(draft.id, sarah, '', 'Sarah-Jane Harding')).rejects.toThrow(RunRefused);
    await expect(p.deleteArtefact(draft.id, sarah, 'Obsolete', '')).rejects.toThrow(RunRefused);

    // Delete in REVIEW also succeeds
    await p.submitForReview(draft.id, sarah);
    const deleted = await p.deleteArtefact(draft.id, sarah, 'Superseded by Q4 memo', 'Sarah-Jane Harding');
    expect(deleted.deleted).toBe(true);
    expect(deleted.deleteReason).toBe('Superseded by Q4 memo');
    expect(deleted.signedBy).toBe('Sarah-Jane Harding');
    expect(p.artefacts().some((a) => a.id === draft.id)).toBe(false);

    // Audit ledger holds intact chain with artefact.deleted
    expect(await p.ledger.verify()).toBeNull();
    const entry = p.ledger.all.find((e) => e.action === 'artefact.deleted' && e.subject === draft.id);
    expect(entry).toBeDefined();
    expect(entry?.detail).toMatchObject({ reason: 'Superseded by Q4 memo', signature: 'Sarah-Jane Harding' });

    // CEO derived tasks and dept health exclude deleted artefact
    const ceo = buildCeoState({ departments: DEPARTMENTS, collections: p.warehouse.all(), now: Date.now() });
    expect(ceo.tasks.some((t) => t.sourceRef === draft.id)).toBe(false);
  });

  it('Platform.deleteArtefact refuses RATIFIED and INGESTED artefacts under Law 02', async () => {
    const p = await new Platform().init();
    const dan = human('dan', 'Dan');
    const sarah = human('sarah', 'Sarah-Jane Harding');
    const art = await p.runAgent(twoPersonAgent, { title: 'Stage gate policy', problem: 'Align Stage 18 rules' }, dan);
    await p.submitForReview(art.id, dan);
    await p.decide(art.id, sarah, 'APPROVED', 'Checked', twoPersonAgent);
    await p.countersign(art.id, dan, 'Ratified', twoPersonAgent);

    await expect(p.deleteArtefact(art.id, sarah, 'Cannot remove final record', 'Sarah-Jane Harding')).rejects.toThrow(RunRefused);
    expect(p.artefacts().some((a) => a.id === art.id)).toBe(true);
  });

  it('validateAppend enforces signed deletion rules on server across collections', async () => {
    const doc = { title: 'Draft Doc', blocks: [{ type: 'p', text: 'Body' }], meta: {} };
    const docHash = await sha256Hex(canonical(doc));
    const draftRec: Rec = {
      id: 'art_1',
      orgId: 'infinite-ai',
      agentId: 'OPS-EXEC-03',
      dept: 'executive',
      title: 'Draft',
      status: 'DRAFT',
      version: 1,
      requestedBy: 'sarah',
      formats: ['md'],
      doc,
      docHash,
      flags: [],
      engine: 'local',
      at: '2026-11-25T00:00:00.000Z',
    };

    // Missing reason/signature on artefact deletion fails 400
    await expect(
      validateAppend(
        'artefact_versions',
        { ...draftRec, version: 2, deleted: true, deleteReason: '', signedBy: 'Sarah', signedAt: '2026-11-25T00:01:00.000Z' },
        ctxOf({ artefact_versions: [draftRec] }),
      ),
    ).rejects.toBeInstanceOf(Rejected);

    // Valid signed deletion passes
    const okArt = await validateAppend(
      'artefact_versions',
      { ...draftRec, version: 2, deleted: true, deleteReason: 'Duplicate draft', signedBy: 'Sarah-Jane Harding', signedAt: '2026-11-25T00:01:00.000Z' },
      ctxOf({ artefact_versions: [draftRec] }),
    );
    expect(okArt.deleted).toBe(true);

    // Cannot re-delete or modify already-deleted artefact (409)
    await expect(
      validateAppend(
        'artefact_versions',
        { ...draftRec, version: 3, deleted: true, deleteReason: 'Again', signedBy: 'Sarah', signedAt: '2026-11-25T00:02:00.000Z' },
        ctxOf({ artefact_versions: [{ ...draftRec, deleted: true }] }),
      ),
    ).rejects.toMatchObject({ status: 409 });

    // Tasks, docs, and custom_defs require deleteReason + signedBy when deleted: true
    await expect(
      validateAppend('ceo_tasks', { id: 't1', title: 'Task', dept: 'executive', deleted: true }, ctxOf()),
    ).rejects.toBeInstanceOf(Rejected);
    await expect(
      validateAppend('ceo_tasks', { id: 't1', title: 'Task', dept: 'executive', deleted: true, deleteReason: 'Done elsewhere', signedBy: 'Sarah-Jane Harding' }, ctxOf()),
    ).resolves.toMatchObject({ deleted: true });

    await expect(
      validateAppend('documents', { id: 'doc_1', origin: 'created', title: 'Draft', deleted: true }, ctxOf()),
    ).rejects.toBeInstanceOf(Rejected);
    await expect(
      validateAppend('documents', { id: 'doc_1', origin: 'created', title: 'Draft', deleted: true, deleteReason: 'Outdated', signedBy: 'Sarah-Jane Harding' }, ctxOf()),
    ).resolves.toMatchObject({ deleted: true });

    await expect(
      validateAppend('custom_defs', { id: 'agt-1', kind: 'agent', dept: 'executive', deleted: true }, ctxOf()),
    ).rejects.toBeInstanceOf(Rejected);
    await expect(
      validateAppend('custom_defs', { id: 'agt-1', kind: 'agent', dept: 'executive', deleted: true, deleteReason: 'Retired agent', signedBy: 'Sarah-Jane Harding' }, ctxOf()),
    ).resolves.toMatchObject({ deleted: true });
  });
});

describe('Open Questions Register, Routing & Task Manifests', () => {
  it('routes all 61 open questions to valid departments and real agent contracts', () => {
    expect(OPEN_QUESTIONS.length).toBe(61);
    const deptIds = new Set(DEPARTMENTS.map((d) => d.id));
    for (const q of OPEN_QUESTIONS) {
      const r = routeQuestion(q);
      expect(deptIds.has(r.primaryDept)).toBe(true);
      expect(agentById(r.primaryAgentId)).toBeDefined();
      for (const sd of r.secondaryDepts) expect(deptIds.has(sd)).toBe(true);
      for (const sa of r.secondaryAgentIds) expect(agentById(sa)).toBeDefined();
    }
  });

  it('generates decision-specific task manifests and differentiates action vs defer decisions', () => {
    const kq = OPEN_QUESTIONS.find((q) => q.id === 'OQ-048a')!;
    const activeManifest = generateTaskManifest(kq, 'Dedicated provisioner client', 'Minimise blast radius in Keycloak');
    expect(activeManifest.length).toBeGreaterThanOrEqual(3);
    expect(activeManifest[0].dept).toBe('security');
    expect(activeManifest[0].agentId).toBe('OPS-SEC-03');
    expect(activeManifest[0].priority).toBe(1);
    expect(activeManifest[1].title).toContain('Execute');

    const deferQ = OPEN_QUESTIONS.find((q) => q.id === 'OPQ-004')!;
    const deferManifest = generateTaskManifest(deferQ, 'Defer', 'Wait until pilot closes');
    expect(deferManifest[0].priority).toBe(2);
    expect(deferManifest[0].title).toContain('review-trigger memo');
  });

  it('records decision & dispatches tasks into warehouse, CEO state, and audit ledger, supporting signed task deletion', async () => {
    const p = await new Platform().init();
    const sarah = human('sarah', 'Sarah-Jane Harding');
    const q = OPEN_QUESTIONS.find((x) => x.id === 'OQ-053')!;
    const routing = routeQuestion(q);
    const manifestTasks = generateTaskManifest(q, q.options[0], 'Critical before school pilot');

    const res = await recordDecisionAndManifest({
      platform: p,
      question: q,
      decisionText: q.options[0],
      selectedOptionIndex: 0,
      rationale: 'Critical before school pilot',
      targetDept: routing.primaryDept,
      targetAgentId: routing.primaryAgentId,
      tasks: manifestTasks,
      actor: sarah,
      signature: 'Sarah-Jane Harding',
    });

    expect(res.decision.questionId).toBe('OQ-053');
    expect(res.createdTasks.length).toBe(manifestTasks.length);
    expect(latestQuestionDecisions(p.warehouse).some((d) => d.questionId === 'OQ-053')).toBe(true);
    expect(latestTaskManifests(p.warehouse).some((m) => m.id === res.manifest.id)).toBe(true);

    // Server validateAppend accepts the generated records cleanly
    await expect(validateAppend('open_question_decisions', res.decision as unknown as Rec, ctxOf())).resolves.toBeDefined();
    await expect(validateAppend('task_manifests', res.manifest as unknown as Rec, ctxOf())).resolves.toBeDefined();

    // Check CEO derived tasks pick up dispatched tasks with agentId & questionId
    const derived = deriveTasks({ departments: DEPARTMENTS, collections: p.warehouse.all(), now: Date.now() });
    const firstTask = derived.find((t) => t.sourceRef === res.createdTasks[0].id);
    expect(firstTask).toBeDefined();
    expect(firstTask?.questionId).toBe('OQ-053');
    expect(firstTask?.agentId).toBe(routing.primaryAgentId);

    // Check ledger recorded oq.decided and hash chain is intact
    expect(p.ledger.all.some((e) => e.action === 'oq.decided' && e.subject === 'OQ-053')).toBe(true);
    expect(await p.ledger.verify()).toBeNull();

    // Verify signed deletion of one dispatched task removes it cleanly
    const toDelete = res.createdTasks[0];
    await p.warehouse.put('ceo_tasks', {
      ...toDelete,
      deleted: true,
      deleteReason: 'Merged with security sprint',
      signedBy: 'Sarah-Jane Harding',
      signedAt: new Date().toISOString(),
    } as never);
    const derivedAfter = deriveTasks({ departments: DEPARTMENTS, collections: p.warehouse.all(), now: Date.now() });
    expect(derivedAfter.some((t) => t.sourceRef === toDelete.id)).toBe(false);
  });

  it('validateAppend refuses PII/SA IDs inside open question decisions and manifests', async () => {
    await expect(
      validateAppend(
        'open_question_decisions',
        {
          id: 'OQ-048a',
          questionId: 'OQ-048a',
          decision: 'Assign to ID 8001015009087',
          decidedBy: 'Sarah-Jane Harding',
          manifestId: 'man_1',
          targetDept: 'security',
        },
        ctxOf(),
      ),
    ).rejects.toBeInstanceOf(Rejected);
  });
});
