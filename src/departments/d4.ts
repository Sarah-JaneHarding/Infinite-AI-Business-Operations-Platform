import { defineAgent as A, long, num, pick, src, txt, v, blankRows, TBC } from './kit';
import type { Department } from './types';
import { weightedScore } from './calc';

export const people: Department = {
  id: 'people', name: 'People & Culture', icon: 'Users',
  mission: 'Hire well, onboard clearly, review fairly. Employment decisions go to a human and, where needed, labour counsel.',
  frameworks: ['Structured interviews with scorecards', '30-60-90 onboarding', 'SMART goals', 'Role scorecard (mission, outcomes, competencies)'],
  widgets: [
    { id: 'hiring', title: 'Hiring pipeline', type: 'tracker', note: 'Use candidate reference codes, not names.', collection: 'hiring', columns: [{ key: 'role', label: 'Role', kind: 'text' }, { key: 'ref', label: 'Candidate ref', kind: 'text' }, { key: 'stage', label: 'Stage', kind: 'select', options: ['Applied', 'Screen', 'Interview', 'Offer', 'Hired', 'Closed'] }, { key: 'next', label: 'Next step', kind: 'text' }] },
    { id: 'onb', title: 'New starter checklist', type: 'checklist', collection: 'starter', items: ['Contract signed', 'POPIA and confidentiality briefing', 'Accounts created with least privilege', 'Equipment issued', 'First-week plan agreed', 'Buddy named'] },
  ],
  agents: [
    A('people', 'PPL', { n: 1, name: 'Role scorecard and job description', summary: 'Outcomes-first role definition.', framework: 'Role scorecard', purpose: 'people_ops',
      warning: 'Employment terms and selection criteria must comply with South African labour law. Have counsel review.',
      inputs: [txt('role', 'Role title', true), long('mission', 'Mission of the role', true), long('outcomes', 'Outcomes expected in the first year'), long('skills', 'Skills and competencies')],
      title: (c) => `Role scorecard: ${c.input.role ?? ''}`,
      sections: (c) => [{ h: 'Mission', input: c.input.mission ?? '' }, { h: 'Outcomes', input: c.input.outcomes ?? '' }, { h: 'Competencies', input: c.input.skills ?? '' }, { h: 'Scorecard', table: { headers: ['Outcome', 'Measure', 'Timeframe'], rows: blankRows(['Outcome 1', 'Outcome 2', 'Outcome 3'], 3) } }] }),
    A('people', 'PPL', { n: 2, name: 'Interview scorecard', summary: 'Structured, comparable interview guide.', framework: 'Structured interviews', purpose: 'people_ops',
      inputs: [txt('role', 'Role', true), long('competencies', 'Competencies to assess (one per line)', true)],
      sections: (c) => [{ h: 'Competencies', input: c.input.competencies ?? '' }, { h: 'Scoring', table: { headers: ['Competency', 'Question (same for every candidate)', 'Evidence heard', 'Score 1–5'], rows: blankRows(['Competency 1', 'Competency 2', 'Competency 3'], 4) } }, { h: 'Fairness', checks: ['Same questions for all candidates', 'Score before discussing', 'No questions on protected characteristics', 'Decision recorded with reasons'] }] }),
    A('people', 'PPL', { n: 3, name: '30-60-90 onboarding plan', summary: 'First three months with outcomes and check-ins.', framework: '30-60-90 plan', purpose: 'people_ops',
      inputs: [txt('role', 'Role', true), long('priorities', 'Priorities for the first three months')],
      sections: (c) => [{ h: 'Priorities', input: c.input.priorities ?? '' }, { h: 'Plan', table: { headers: ['Period', 'Learn', 'Contribute', 'Check-in'], rows: [['First month', '', '', ''], ['Second month', '', '', ''], ['Third month', '', '', '']] } }] }),
  ],
};

export const devops: Department = {
  id: 'devops', name: 'IT, DevOps & SRE', icon: 'ServerCog',
  mission: 'Reliable, observable, recoverable. Operate from the ecosystem’s runbooks and live CI results.',
  frameworks: ['SRE: SLOs and error budgets', 'ITIL change enablement', 'Blameless postmortems', 'Disaster recovery (RPO / RTO)', 'Runbooks'],
  widgets: [
    { id: 'ci', title: 'CI runs (live)', type: 'live', source: 'ci' },
    { id: 'runbooks', title: 'Ecosystem runbooks', type: 'live', source: 'runbooks' },
    { id: 'changes', title: 'Change log', type: 'tracker', collection: 'changes', columns: [{ key: 'change', label: 'Change', kind: 'text' }, { key: 'risk', label: 'Risk', kind: 'select', options: ['Low', 'Medium', 'High'] }, { key: 'rollback', label: 'Rollback plan', kind: 'text' }, { key: 'approver', label: 'Approver (role)', kind: 'text' }, { key: 'when', label: 'When', kind: 'date' }] },
  ],
  agents: [
    A('devops', 'SRE', { n: 1, name: 'Change request', summary: 'Change record with risk, test and rollback.', framework: 'ITIL change enablement', purpose: 'infrastructure_ops', secondApprover: true,
      inputs: [txt('change', 'Change', true), long('reason', 'Why', true), long('rollback', 'Rollback plan', true)],
      sections: (c) => [{ h: 'Change', input: c.input.change ?? '' }, { h: 'Reason', input: c.input.reason ?? '' }, { h: 'Rollback', input: c.input.rollback ?? '' }, { h: 'Checks', checks: ['Tested outside production', 'Secrets not in the repository', 'Runbook updated', 'Approver is not the implementer', 'CI green on the release commit'] }, { h: 'Ecosystem runbooks available', p: `${src(c, 'eco.runbooks')} runbooks are listed in the repository. Link the relevant one.` }] }),
    A('devops', 'SRE', { n: 2, name: 'Blameless postmortem', summary: 'Timeline, contributing factors and actions without blame.', framework: 'Blameless postmortem', purpose: 'infrastructure_ops',
      inputs: [txt('incident', 'Incident', true), long('timeline', 'Timeline (time | event)', true), long('factors', 'Contributing factors')],
      sections: (c) => [{ h: 'Summary', input: c.input.incident ?? '' }, { h: 'Timeline', input: c.input.timeline ?? '' }, { h: 'Contributing factors', input: c.input.factors ?? '' }, { h: 'What went well, what did not', table: { headers: ['Went well', 'Went badly', 'Got lucky'], rows: [['', '', '']] } }, { h: 'Actions', table: { headers: ['Action', 'Owner (role)', 'Due', 'Type'], rows: blankRows(['Prevent', 'Detect', 'Mitigate'], 4) } }] }),
    A('devops', 'SRE', { n: 3, name: 'SLO and recovery targets', summary: 'Define SLOs and recovery objectives from targets you choose.', framework: 'SRE SLOs + DR', purpose: 'infrastructure_ops',
      inputs: [long('services', 'Services in scope', true), long('targets', 'Availability / recovery targets you have decided, with reasoning')],
      sections: (c) => [{ h: 'Services', input: c.input.services ?? '' }, { h: 'Targets', input: c.input.targets ?? '' }, { h: 'Definitions', table: { headers: ['Service', 'SLI (what is measured)', 'SLO (target you set)', 'RPO', 'RTO', 'Test of recovery (date)'], rows: blankRows(['Service 1', 'Service 2'], 6) } }, { h: 'Error budget policy', p: 'When the budget is spent, reliability work takes priority over new features until it recovers.' }] }),
  ],
};

export const procurement: Department = {
  id: 'procurement', name: 'Procurement & Vendors', icon: 'PackageSearch',
  mission: 'Choose and govern suppliers, especially anything that touches data. Every operator is bound in writing.',
  frameworks: ['Weighted decision matrix', 'Total cost of ownership', 'Vendor due diligence (POPIA operator, cross-border)', 'Supplier performance review'],
  widgets: [
    { id: 'vendors', title: 'Vendor register', type: 'tracker', collection: 'vendors', columns: [{ key: 'vendor', label: 'Vendor', kind: 'text' }, { key: 'service', label: 'Service', kind: 'text' }, { key: 'data', label: 'Touches personal data?', kind: 'select', options: ['No', 'Yes', 'Unknown'] }, { key: 'contract', label: 'Written operator contract?', kind: 'select', options: ['N/A', 'Yes', 'No'] }, { key: 'location', label: 'Data location', kind: 'text' }, { key: 'review', label: 'Next review', kind: 'date' }] },
    { id: 'score', title: 'Weighted score (3 criteria)', type: 'calc', note: 'Weights and scores are yours.', inputs: [{ key: 'w1', label: 'Weight 1' }, { key: 's1', label: 'Score 1' }, { key: 'w2', label: 'Weight 2' }, { key: 's2', label: 'Score 2' }, { key: 'w3', label: 'Weight 3' }, { key: 's3', label: 'Score 3' }], compute: (x) => weightedScore([{ weight: x.w1 || 0, score: x.s1 || 0 }, { weight: x.w2 || 0, score: x.s2 || 0 }, { weight: x.w3 || 0, score: x.s3 || 0 }]) },
  ],
  agents: [
    A('procurement', 'PRO', { n: 1, name: 'Vendor due diligence', summary: 'Due-diligence questionnaire for a supplier that may touch personal data.', framework: 'POPIA operator due diligence', purpose: 'vendor_management', secondApprover: true,
      inputs: [txt('vendor', 'Vendor', true), long('service', 'Service and data involved', true)],
      sections: (c) => [{ h: 'Service', input: c.input.service ?? '' }, { h: 'Questions', table: { headers: ['Area', 'Question', 'Answer', 'Evidence'], rows: [['Data', 'What personal information is processed and where is it stored?', '', ''], ['Contract', 'Will you sign a written operator agreement?', '', ''], ['Security', 'Which independent assurance do you hold?', '', ''], ['Transfers', 'Is data sent outside South Africa, and under what safeguards?', '', ''], ['Sub-processors', 'Who else touches the data?', '', ''], ['Breach', 'How and how fast will you tell us?', '', ''], ['Exit', 'How is data returned or deleted?', '', '']] } }] }),
    A('procurement', 'PRO', { n: 2, name: 'RFQ and scoring matrix', summary: 'Request for quotation and a weighted scoring matrix.', framework: 'Weighted decision matrix', purpose: 'vendor_management',
      inputs: [txt('item', 'What you are buying', true), long('criteria', 'Criteria and weights you have decided', true)],
      sections: (c) => [{ h: 'Requirement', input: c.input.item ?? '' }, { h: 'Criteria and weights', input: c.input.criteria ?? '' }, { h: 'Matrix', table: { headers: ['Criterion', 'Weight', 'Vendor A score', 'Vendor B score', 'Vendor C score'], rows: blankRows(['Criterion 1', 'Criterion 2', 'Criterion 3', 'Total cost of ownership'], 5) } }] }),
    A('procurement', 'PRO', { n: 3, name: 'Supplier review', summary: 'Periodic performance and risk review of an existing supplier.', framework: 'Supplier performance review', purpose: 'vendor_management',
      inputs: [txt('vendor', 'Vendor', true), long('performance', 'How they have performed')],
      sections: (c) => [{ h: 'Performance', input: c.input.performance ?? '' }, { h: 'Review', table: { headers: ['Area', 'Rating', 'Evidence', 'Action'], rows: blankRows(['Delivery', 'Quality', 'Security / data protection', 'Cost', 'Relationship'], 4) } }, { h: 'Decision', kv: [['Continue / change / exit', TBC], ['Decided by (role)', TBC]] }] }),
  ],
};

export const research: Department = {
  id: 'research', name: 'Research, Impact & Knowledge', icon: 'FlaskConical',
  mission: 'Show whether it works, honestly. No impact claim without evidence. Research uses no learner-identifying data here.',
  frameworks: ['Theory of change', 'Kirkpatrick levels', 'Pre-registered evaluation plan', 'Evidence log with source grading'],
  widgets: [
    { id: 'evidence', title: 'Evidence log', type: 'tracker', collection: 'evidence', columns: [{ key: 'claim', label: 'Claim', kind: 'text' }, { key: 'source', label: 'Source (cite)', kind: 'text' }, { key: 'grade', label: 'Strength', kind: 'select', options: ['Anecdote', 'Internal data', 'Pilot study', 'Independent study'] }, { key: 'usable', label: 'OK to use externally?', kind: 'select', options: ['No', 'With caveat', 'Yes'] }] },
  ],
  agents: [
    A('research', 'RES', { n: 1, name: 'Theory of change', summary: 'Pathway from activities to outcomes with assumptions to test.', framework: 'Theory of change', purpose: 'research_evaluation',
      inputs: [txt('change', 'Change you want to see', true), long('activities', 'What you do', true), long('assumptions', 'Assumptions')],
      sections: (c) => [{ h: 'Change sought', input: c.input.change ?? '' }, { h: 'Pathway', table: { headers: ['Activity', 'Short-term outcome', 'Medium-term outcome', 'Long-term impact', 'Assumption to test'], rows: [[c.input.activities ?? '', '', '', '', c.input.assumptions ?? '']] } }] }),
    A('research', 'RES', { n: 2, name: 'Evaluation plan', summary: 'Design for judging whether a pilot worked, before it starts.', framework: 'Kirkpatrick + pre-registered plan', purpose: 'research_evaluation', secondApprover: true,
      inputs: [txt('question', 'Evaluation question', true), long('measures', 'Measures and data sources you will use'), long('ethics', 'Consent and data protection plan')],
      sections: (c) => [{ h: 'Question', input: c.input.question ?? '' }, { h: 'Measures', input: c.input.measures ?? '' }, { h: 'Levels', table: { headers: ['Level', 'Question', 'Measure', 'When'], rows: blankRows(['1 Reaction', '2 Learning', '3 Behaviour', '4 Results'], 4) } }, { h: 'Ethics and POPIA', input: c.input.ethics ?? '' }, { h: 'Analysis committed in advance', p: 'Write down how results will be judged before collecting them. Report null and negative results.' }] }),
    A('research', 'RES', { n: 3, name: 'Impact report skeleton', summary: 'Report structure that holds only evidence you supply.', framework: 'Evidence log with source grading', purpose: 'research_evaluation', secondApprover: true,
      inputs: [txt('title', 'Report title', true), long('findings', 'Findings, each with its source', true), long('limits', 'Limitations')],
      sections: (c) => [{ h: 'Findings (sourced)', input: c.input.findings ?? '' }, { h: 'Limitations', input: c.input.limits ?? '' }, { h: 'Claims check', callout: { tone: 'warn', text: 'Each claim above must appear in the evidence log with a source and a strength grade before external use.' } }, { h: 'Repository context', p: `Product facts come from the ecosystem snapshot: ${src(c, 'eco.stages')} logged stages at commit ${src(c, 'eco.head')}.` }] }),
  ],
};
void num; void pick; void txt; void long; void v;
