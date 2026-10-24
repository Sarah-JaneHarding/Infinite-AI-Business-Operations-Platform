import { defineAgent as A, long, num, pick, src, txt, v, blankRows, TBC } from './kit';
import type { Department } from './types';
import { rice } from './calc';

const ecoStats = (f: Record<string, string | number>) => [
  { label: 'Workspace units', value: f['eco.units'], source: 'snapshot' },
  { label: 'Source lines (non-test)', value: Number(f['eco.srcLoc']).toLocaleString('en-ZA'), source: 'snapshot' },
  { label: 'Test files', value: f['eco.testFiles'], source: 'snapshot' },
  { label: 'Build stages logged', value: f['eco.stages'], source: 'snapshot' },
  { label: 'Open questions', value: `${f['eco.oq.open']} of ${f['eco.oq.total']}`, source: 'snapshot', tone: 'warn' as const },
  { label: 'Agent contracts', value: f['eco.agents.contracts'], source: 'snapshot' },
];

export const executive: Department = {
  id: 'executive', name: 'Executive & Strategy', icon: 'Compass',
  mission: 'One view of the company and the product. Decisions recorded, objectives owned, the board informed from real data.',
  frameworks: ['OKRs (Doerr)', 'Balanced Scorecard (Kaplan & Norton)', 'One-way / two-way door decisions (Amazon)', 'Six-page narrative memo', 'Decision log'],
  widgets: [
    { id: 'eco-pulse', title: 'Ecosystem pulse (snapshot)', type: 'stats', note: 'Counted from the repository by scripts/audit-ecosystem.mjs. Not estimates.', stats: ecoStats },
    { id: 'okr', title: 'OKR tracker', type: 'tracker', collection: 'okr', columns: [{ key: 'objective', label: 'Objective', kind: 'text' }, { key: 'kr', label: 'Key result', kind: 'text' }, { key: 'owner', label: 'Owner (role)', kind: 'text' }, { key: 'target', label: 'Target', kind: 'text' }, { key: 'status', label: 'Status', kind: 'select', options: ['Not started', 'On track', 'At risk', 'Done'] }] },
    { id: 'decisions', title: 'Decision log', type: 'tracker', collection: 'decisions', columns: [{ key: 'decision', label: 'Decision', kind: 'text' }, { key: 'door', label: 'Door', kind: 'select', options: ['One-way', 'Two-way'] }, { key: 'decider', label: 'Decider (role)', kind: 'text' }, { key: 'date', label: 'Date', kind: 'date' }, { key: 'review', label: 'Review on', kind: 'date' }] },
  ],
  agents: [
    A('executive', 'EXEC', { n: 1, name: 'Board update pack', summary: 'Quarterly board / advisor update seeded with real ecosystem facts.', framework: 'Balanced Scorecard + narrative memo', purpose: 'strategy_planning', formats: ['md', 'docx', 'html', 'pdf', 'json'],
      inputs: [txt('period', 'Reporting period', true), long('wins', 'Wins this period (your words)'), long('risks', 'Top risks (your words)'), long('asks', 'Asks of the board / advisors')],
      narrative: (c) => ({ 'eco.stages': c.facts['eco.stages'] ?? 0, 'eco.oq.open': c.facts['eco.oq.open'] ?? 0 }),
      sections: (c) => [
        { h: 'Product & engineering (from the repository)', table: { headers: ['Measure', 'Value', 'Source'], rows: [['Build stages logged', src(c, 'eco.stages'), 'docs/STAGE_LOG.md'], ['Latest stage', src(c, 'eco.latestStage'), 'docs/STAGE_LOG.md'], ['Open questions', `${src(c, 'eco.oq.open')} of ${src(c, 'eco.oq.total')}`, 'docs/OPEN_QUESTIONS.md'], ['Agent contracts', src(c, 'eco.agents.contracts'), 'packages/agents'], ['Commit audited', src(c, 'eco.head'), 'git']] } },
        { h: 'Wins', input: c.input.wins ?? '' }, { h: 'Risks', input: c.input.risks ?? '' },
        { h: 'Customer, finance and people', callout: { tone: 'warn', text: 'No customer, revenue or headcount figures are generated. Add them yourself from your records, with a source.' }, table: { headers: ['Perspective', 'Measure (you define)', 'Value (you supply)', 'Source'], rows: blankRows(['Customer', 'Financial', 'Internal process', 'Learning & growth'], 4) } },
        { h: 'Asks', input: c.input.asks ?? '' },
      ] }),
    A('executive', 'EXEC', { n: 2, name: 'OKR drafter', summary: 'Turn a direction into objectives and measurable key results, with owners and check-in cadence.', framework: 'OKRs (Doerr)', purpose: 'strategy_planning',
      inputs: [txt('quarter', 'Quarter / period', true), long('direction', 'Strategic direction in one or two sentences', true), long('constraints', 'Constraints (budget, time, people)')],
      sections: (c) => [
        { h: 'Direction', input: c.input.direction ?? '' },
        { h: 'Rules for good OKRs', bullets: ['Objective: qualitative, inspiring, time-bound.', 'Key results: measurable outcomes, not tasks; each has a baseline and a target you can verify.', 'Few objectives, few key results each.', 'Aspirational (stretch) and committed OKRs are labelled differently.', 'Score honestly at the end; do not edit targets after the fact.'] },
        { h: 'Draft OKRs (complete the targets from your own data)', table: { headers: ['Objective', 'Key result', 'Baseline (source)', 'Target', 'Owner (role)', 'Check-in'], rows: [['O1', 'KR1.1', '', '', '', 'Weekly'], ['O1', 'KR1.2', '', '', '', 'Weekly'], ['O2', 'KR2.1', '', '', '', 'Weekly']] } },
        { h: 'Constraints', input: c.input.constraints ?? '' },
      ] }),
    A('executive', 'EXEC', { n: 3, name: 'Decision memo', summary: 'Structured decision record: options, trade-offs, reversibility, owner and review date.', framework: 'One-way / two-way door + decision log', purpose: 'strategy_planning',
      inputs: [txt('decision', 'Decision to make', true), long('options', 'Options considered (one per line)', true), long('criteria', 'Criteria that matter'), pick('door', 'Reversibility', ['Two-way (easily reversed)', 'One-way (hard to reverse)'])],
      sections: (c) => [
        { h: 'Decision', input: c.input.decision ?? '' },
        { h: 'Reversibility', callout: { tone: c.input.door?.startsWith('One') ? 'warn' : 'info', text: c.input.door?.startsWith('One') ? 'One-way door: slow down, gather evidence, name a second reviewer.' : 'Two-way door: decide quickly with the information in hand, and review after.' } },
        { h: 'Options', input: c.input.options ?? '' },
        { h: 'Assessment', table: { headers: ['Option', 'Benefits', 'Costs / risks', 'Reversible?', 'Evidence (source)'], rows: blankRows(['Option A', 'Option B', 'Do nothing'], 5) } },
        { h: 'Criteria', input: c.input.criteria ?? '' },
        { h: 'Recommendation and owner', kv: [['Recommendation', TBC], ['Decider (role)', TBC], ['Decision date', TBC], ['Review date', TBC]] },
      ] }),
  ],
};

export const product: Department = {
  id: 'product', name: 'Product & Engineering', icon: 'Boxes',
  mission: 'Plan and govern work on the Education Ecosystem using its own stage-gate rules, with live repository status.',
  frameworks: ['Stage-Gate (Cooper)', 'RICE prioritisation (Intercom)', 'Architecture Decision Records (Nygard)', 'DORA delivery metrics (from CI only)', 'Definition of Done'],
  widgets: [
    { id: 'pulls', title: 'Open pull requests (live)', type: 'live', source: 'pulls' },
    { id: 'ci', title: 'CI runs (live)', type: 'live', source: 'ci' },
    { id: 'stages', title: 'Latest build stages', type: 'live', source: 'stages' },
    { id: 'rice', title: 'RICE calculator', type: 'calc', note: 'Reach, impact, confidence and effort come from you. Nothing is pre-filled.', inputs: [{ key: 'reach', label: 'Reach (people per period)' }, { key: 'impact', label: 'Impact (your scale)' }, { key: 'conf', label: 'Confidence', unit: '%' }, { key: 'effort', label: 'Effort (person-weeks)' }], compute: (x) => rice(x.reach, x.impact, x.conf, x.effort) },
    { id: 'backlog', title: 'Roadmap backlog', type: 'tracker', collection: 'roadmap', columns: [{ key: 'item', label: 'Item', kind: 'text' }, { key: 'rice', label: 'RICE', kind: 'number' }, { key: 'stage', label: 'Stage-gate', kind: 'select', options: ['Idea', 'Scoped', 'Build', 'Test', 'Launch'] }, { key: 'oq', label: 'Linked OQ', kind: 'text' }] },
  ],
  agents: [
    A('product', 'PROD', { n: 1, name: 'Ecosystem stage-gate proposal', summary: 'A change proposal that follows the ecosystem’s own CLAUDE.md rules, ready to open as a GitHub issue after approval.', framework: 'Stage-Gate + Definition of Done', purpose: 'engineering_governance', formats: ['md', 'docx', 'json'], secondApprover: true,
      inputs: [txt('title', 'Proposal title', true), long('problem', 'Problem / outcome wanted', true), long('scope', 'In scope / out of scope'), long('risks', 'Risks and open questions')],
      title: (c) => `Proposal: ${c.input.title ?? ''}`,
      sections: (c) => [
        { h: 'Context (from the repository)', kv: [['Audited commit', src(c, 'eco.head')], ['Latest stage', src(c, 'eco.latestStage')], ['Open questions', src(c, 'eco.oq.open')]] },
        { h: 'Problem', input: c.input.problem ?? '' }, { h: 'Scope', input: c.input.scope ?? '' },
        { h: 'Ecosystem rules this change must respect', checks: ['One stage, one PR; docs/STAGE_LOG.md updated in the same commit', 'Unit tests: happy path plus at least two failure paths', 'No second model path; human approval cannot be bypassed', 'No PII in prompts; tenant isolation preserved', 'No secrets in the repository; new dependencies recorded in docs', 'Strict TypeScript, no `any`', 'If unsure: stop and add the question to docs/OPEN_QUESTIONS.md'] },
        { h: 'Risks and open questions', input: c.input.risks ?? '' },
        { h: 'Acceptance criteria', ol: [TBC, TBC, TBC] },
      ] }),
    A('product', 'PROD', { n: 2, name: 'RICE backlog prioritiser', summary: 'Score and rank candidate work from numbers you supply.', framework: 'RICE (Intercom)', purpose: 'engineering_governance', formats: ['md', 'csv', 'xlsx', 'json'],
      inputs: [long('items', 'Candidates, one per line: name | reach | impact | confidence% | effort', true, 'Example: Parent report | 400 | 2 | 80 | 3')],
      sections: (c) => {
        const rows = (c.input.items ?? '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p.length >= 5 && p[0]).map((p) => {
          const [r, i, cf, e] = [Number(p[1]), Number(p[2]), Number(p[3]), Number(p[4])];
          const s = e > 0 && [r, i, cf].every(Number.isFinite) ? (r * i * (cf / 100)) / e : NaN;
          return [p[0], p[1], p[2], p[3], p[4], Number.isFinite(s) ? Math.round(s * 100) / 100 : 'n/a'] as (string | number)[];
        }).sort((a, b) => (typeof b[5] === 'number' ? b[5] : -1) - (typeof a[5] === 'number' ? a[5] : -1));
        return [{ h: 'Ranked backlog', table: { headers: ['Item', 'Reach', 'Impact', 'Confidence %', 'Effort', 'RICE'], rows: rows.length ? rows : [[TBC, '', '', '', '', '']] } }, { h: 'Method', p: 'RICE = reach × impact × confidence ÷ effort. A score is a conversation starter, not a decision. Low-confidence items need evidence before they are built.' }];
      } }),
    A('product', 'PROD', { n: 3, name: 'Architecture decision record', summary: 'ADR: the decision, context, options and consequences, kept with the code.', framework: 'ADR (Nygard)', purpose: 'engineering_governance', formats: ['md', 'docx', 'json'],
      inputs: [txt('title', 'Decision title', true), long('context', 'Context and forces', true), long('options', 'Options considered'), txt('decision', 'Decision taken')],
      title: (c) => `ADR: ${c.input.title ?? ''}`,
      sections: (c) => [{ h: 'Status', p: 'Proposed' }, { h: 'Context', input: c.input.context ?? '' }, { h: 'Options considered', input: c.input.options ?? '' }, { h: 'Decision', input: c.input.decision ?? '' }, { h: 'Consequences', kv: [['Positive', TBC], ['Negative / cost', TBC], ['Follow-ups', TBC]] }, { h: 'Ecosystem invariants checked', checks: ['Tenant isolation', 'No PII in prompts', 'Purpose limitation', 'Append-only ledgers'] }] }),
  ],
};

export const curriculum: Department = {
  id: 'curriculum', name: 'Curriculum & Pedagogy QA', icon: 'BookOpenCheck',
  mission: 'Quality assurance for the learning content the Ecosystem will serve. CAPS is the authority; this department never invents policy.',
  frameworks: ["Bloom's revised taxonomy", 'Universal Design for Learning (CAST)', 'Backward design (Wiggins & McTighe)', 'CAPS alignment review', 'Teacher-in-the-loop review'],
  widgets: [
    { id: 'caps-qa', title: 'Lesson QA checklist', type: 'checklist', collection: 'curriculum_qa', items: ['Aligned to a named CAPS topic and term (cite the CAPS document and page)', 'Learning outcome is observable and assessable', 'Language level suits the grade and home-language policy', 'Activities include concrete, visual or practical work', 'Differentiation: support and extension are both present', 'Assessment matches the outcome', 'Examples are South African and culturally respectful', 'No learner names or identifiers in the material', 'Teacher guidance is clear: AI drafts, the teacher decides'] },
    { id: 'qa-log', title: 'Content review log', type: 'tracker', collection: 'content_review', columns: [{ key: 'asset', label: 'Asset', kind: 'text' }, { key: 'grade', label: 'Grade', kind: 'select', options: ['R', '1', '2', '3', '4', '5', '6', '7'] }, { key: 'caps', label: 'CAPS reference', kind: 'text' }, { key: 'status', label: 'Status', kind: 'select', options: ['To review', 'Changes needed', 'Approved'] }, { key: 'reviewer', label: 'Reviewer (role)', kind: 'text' }] },
  ],
  agents: [
    A('curriculum', 'CURR', { n: 1, name: 'Lesson plan QA review', summary: 'A structured review of a lesson plan you paste in. It flags what to check against CAPS; it does not decide compliance.', framework: 'CAPS alignment review + Bloom + UDL', purpose: 'content_review', formats: ['md', 'docx', 'html', 'pdf'],
      warning: 'This review cannot confirm CAPS compliance. Verify every alignment claim against the official CAPS document.',
      inputs: [pick('grade', 'Grade', ['R', '1', '2', '3', '4', '5', '6', '7'], true), txt('subject', 'Subject', true), txt('caps', 'CAPS topic and page you believe it matches'), long('lesson', 'Lesson plan text (no learner names)', true)],
      sections: (c) => [
        { h: 'Lesson under review', input: c.input.lesson ?? '' },
        { h: 'CAPS alignment (human to verify)', table: { headers: ['Check', 'Result', 'Evidence / CAPS page'], rows: [['Topic and term match the CAPS document', 'To verify', c.input.caps ?? ''], ['Content depth fits the grade', 'To verify', ''], ['Assessment type fits CAPS requirements', 'To verify', '']] } },
        { h: "Cognitive demand (Bloom's)", p: 'Mark the verbs used in the outcomes and activities, then check the spread suits the grade.', table: { headers: ['Level', 'Present in lesson?', 'Example from the lesson'], rows: blankRows(['Remember', 'Understand', 'Apply', 'Analyse', 'Evaluate', 'Create'], 3) } },
        { h: 'Access for all learners (UDL)', checks: ['Multiple ways to present the idea', 'Multiple ways for learners to respond', 'Multiple ways to engage and motivate', 'Language support for additional-language learners'] },
        { h: 'Teacher decision', kv: [['Outcome', 'Approve / Revise / Reject'], ['Reviewer (role)', TBC], ['Date', TBC]] },
      ] }),
    A('curriculum', 'CURR', { n: 2, name: 'Backward-design unit planner', summary: 'Outcome first, then evidence, then activities.', framework: 'Backward design (Wiggins & McTighe)', purpose: 'content_review',
      inputs: [pick('grade', 'Grade', ['R', '1', '2', '3', '4', '5', '6', '7'], true), txt('topic', 'Topic', true), long('outcome', 'Intended learning outcome (from CAPS)', true)],
      sections: (c) => [{ h: 'Stage 1 · Desired results', input: c.input.outcome ?? '' }, { h: 'Stage 2 · Evidence of learning', table: { headers: ['Evidence', 'Type', 'Success looks like'], rows: blankRows(['Performance task', 'Quick check', 'Observation'], 3) } }, { h: 'Stage 3 · Learning plan', table: { headers: ['Lesson', 'Activity', 'Resources', 'Differentiation'], rows: blankRows(['Lesson 1', 'Lesson 2', 'Lesson 3'], 4) } }, { h: 'Sources used', callout: { tone: 'warn', text: 'List the CAPS document and any resource used. Content without a source stays marked unverified.' } }] }),
    A('curriculum', 'CURR', { n: 3, name: 'Differentiation and support sheet', summary: 'Support, core and extension versions of one task.', framework: 'UDL + tiered tasks', purpose: 'content_review',
      inputs: [txt('task', 'Task / activity', true), pick('grade', 'Grade', ['R', '1', '2', '3', '4', '5', '6', '7'], true), long('needs', 'Typical range of needs in the class (no names)')],
      sections: (c) => [{ h: 'Core task', input: c.input.task ?? '' }, { h: 'Tiers', table: { headers: ['Tier', 'What changes', 'Scaffold or stretch'], rows: blankRows(['Support', 'Core', 'Extension'], 3) } }, { h: 'Range of needs', input: c.input.needs ?? '' }] }),
  ],
};

export const aibrain: Department = {
  id: 'ai', name: 'AI, Brain & Evals', icon: 'BrainCircuit',
  mission: 'Govern the Infinite Brain and agents: contracts, evals, model risk. Reconcile what the docs say with what the repository contains.',
  frameworks: ['NIST AI RMF (Govern, Map, Measure, Manage)', 'Model cards', 'Eval-driven development', 'Prompt change control'],
  widgets: [
    { id: 'roster', title: 'Agent contracts by module', type: 'live', source: 'roster' },
    { id: 'roster-check', title: 'Roster reconciliation', type: 'stats', note: 'The documented count and the counted contracts disagree until someone reconciles them.', stats: (f) => [{ label: 'Contract files counted', value: f['eco.agents.contracts'], source: 'snapshot' }, { label: 'Count stated in docs/AGENTS.md', value: f['eco.agents.documented'], source: 'snapshot', tone: 'warn' }] },
    { id: 'evals', title: 'Eval tracker', type: 'tracker', collection: 'evals', columns: [{ key: 'agent', label: 'Agent id', kind: 'text' }, { key: 'suite', label: 'Eval suite', kind: 'text' }, { key: 'result', label: 'Last result (from CI)', kind: 'text' }, { key: 'status', label: 'Status', kind: 'select', options: ['None', 'Defined', 'Passing', 'Failing'] }] },
  ],
  agents: [
    A('ai', 'AI', { n: 1, name: 'Agent roster reconciliation', summary: 'Compares counted agent contracts with the documented roster and flags differences to resolve.', framework: 'NIST AI RMF · Govern', purpose: 'ai_governance', formats: ['md', 'csv', 'xlsx', 'docx'],
      inputs: [txt('other', 'Any other roster figure you have seen (e.g. in a deck), with where')],
      sections: (c) => {
        const mods = Object.keys(c.facts).filter((k) => k.startsWith('eco.agents.') && !['eco.agents.contracts', 'eco.agents.documented'].includes(k));
        return [
          { h: 'Counted from the repository', table: { headers: ['Module', 'Contract files'], rows: mods.map((k) => [k.replace('eco.agents.', ''), src(c, k)]) } },
          { h: 'Comparison', table: { headers: ['Source', 'Count'], rows: [['Contract files (packages/agents)', src(c, 'eco.agents.contracts')], ['docs/AGENTS.md states', src(c, 'eco.agents.documented')], ['Other source you supplied', v(c, 'other')]] } },
          { h: 'Action', callout: { tone: 'warn', text: 'These sources should agree. Decide which is authoritative, update the others, and record the answer. Do not quote a roster number externally until they match.' } },
        ];
      } }),
    A('ai', 'AI', { n: 2, name: 'Model risk assessment', summary: 'Risk register entry for an agent or model use, mapped to NIST AI RMF functions.', framework: 'NIST AI RMF', purpose: 'ai_governance', secondApprover: true,
      inputs: [txt('agent', 'Agent or use case', true), long('use', 'What it does and who relies on it', true), long('harms', 'Foreseeable harms')],
      sections: (c) => [{ h: 'Use case', input: c.input.use ?? '' }, { h: 'Foreseeable harms', input: c.input.harms ?? '' }, { h: 'Risk register', table: { headers: ['Function', 'Question', 'Finding', 'Control / owner'], rows: [['Govern', 'Is there a named accountable human?', '', ''], ['Map', 'Who could be harmed, and how?', '', ''], ['Measure', 'Which eval shows the risk is controlled?', '', ''], ['Manage', 'What is the rollback / human override?', '', '']] } }, { h: 'Ecosystem guardrails to confirm', checks: ['De-identified input only', 'Purpose limitation enforced', 'Human approval before any output is used', 'Output logged in the audit ledger'] }] }),
    A('ai', 'AI', { n: 3, name: 'Eval plan', summary: 'Define what “good” means for an agent before changing it.', framework: 'Eval-driven development', purpose: 'ai_governance', formats: ['md', 'docx', 'csv', 'xlsx'],
      inputs: [txt('agent', 'Agent id', true), long('behaviour', 'Behaviour to protect', true), long('failures', 'Failure modes to test')],
      sections: (c) => [{ h: 'Behaviour to protect', input: c.input.behaviour ?? '' }, { h: 'Cases', table: { headers: ['Case', 'Type', 'Input (de-identified)', 'Expected', 'Pass rule'], rows: [['Happy path', 'Positive', '', '', ''], ['Failure 1', 'Negative', '', '', ''], ['Failure 2', 'Negative', '', '', ''], ['Injection attempt', 'Safety', '', '', '']] } }, { h: 'Failure modes', input: c.input.failures ?? '' }, { h: 'Gate', p: 'No prompt, model or contract change ships without these cases passing in CI.' }] }),
  ],
};
void num;
