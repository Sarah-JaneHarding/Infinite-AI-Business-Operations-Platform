/**
 * Agent catalogue: roles, tasks and the specialist agent for each task, for all 16 departments.
 *
 * Roles are DRAFTED for the founder to review (the repo defines none). Each task has exactly one agent.
 * `id` follows defineAgent: OPS-<CODE>-nn. Tasks that already exist in code keep their number; new ones continue
 * from n=4. A catalogue entry is "built" when DEPARTMENTS contains an agent with that id (test/catalogue.test.ts
 * keeps the two in step). Every agent drafts for a human, needs approval, and invents no numbers or policy.
 */
export interface CatTask {
  id: string;
  name: string;
  /** What the agent produces and for whom. */
  summary: string;
  /** What the human must supply. */
  inputs: string[];
  /** Artefact formats offered. */
  out: string;
  /** Widget the agent pairs with, or that it is built around. */
  widget?: string;
  /** Needs a second approver (legal, employment, security or board-level documents). */
  two?: boolean;
  /** Build batch (1 = Finance and Government, built first). Later batches follow on request. */
  batch: number;
}
export interface CatRole { role: string; tasks: CatTask[] }
export interface CatDept { dept: string; code: string; roles: CatRole[] }

const T = (id: string, name: string, summary: string, inputs: string[], out = 'md, docx, pdf', opt: { widget?: string; two?: boolean; batch?: number } = {}): CatTask => ({ id, name, summary, inputs, out, batch: opt.batch ?? 0, widget: opt.widget, two: opt.two });
const OUT_X = 'md, xlsx, csv';

export const CATALOGUE: CatDept[] = [
  { dept: 'executive', code: 'EXEC', roles: [
    { role: 'Chief of Staff', tasks: [
      T('OPS-EXEC-01', 'Board update pack', 'Board pack from the ecosystem snapshot and the figures you supply.', ['Period', 'Highlights', 'Asks of the board'], 'md, docx, pdf'),
      T('OPS-EXEC-02', 'OKR drafter', 'Objectives and key results with owners and a check-in rhythm.', ['Focus area', 'Candidate objectives'], 'md, docx, xlsx', { widget: 'OKR tracker' }),
    ] },
    { role: 'Strategy Lead', tasks: [
      T('OPS-EXEC-03', 'Decision memo', 'Six-page-style memo with options, the one-way or two-way door call and a decision record.', ['Decision', 'Options', 'Evidence'], 'md, docx, pdf', { widget: 'Decision log' }),
      T('OPS-EXEC-04', 'Scenario and risk review', 'Two or three scenarios with typed assumptions, risks, triggers and an owner for each.', ['Decision at stake', 'Scenarios', 'Assumptions with sources'], 'md, docx, xlsx', { batch: 2 }),
    ] },
    { role: 'Company Secretary', tasks: [
      T('OPS-EXEC-05', 'Meeting minutes and action log', 'Minutes from your notes, with actions, owners and due dates ready for the action tracker.', ['Agenda', 'Notes', 'Attendees (roles)'], 'md, docx, csv', { widget: 'Action tracker (new)', batch: 2 }),
      T('OPS-EXEC-06', 'Statutory and compliance calendar', 'Calendar of filings and renewals to confirm. Every date is marked "confirm with the official source".', ['Entity facts', 'Known deadlines'], OUT_X, { widget: 'Compliance calendar checklist (new)', batch: 2 }),
    ] },
  ] },
  { dept: 'product', code: 'PROD', roles: [
    { role: 'Product Manager', tasks: [
      T('OPS-PROD-01', 'Ecosystem stage-gate proposal', 'Proposal using the ecosystem’s own stage-gate rules and live repository status.', ['Initiative', 'Gate sought'], 'md, docx, pdf', { widget: 'Live pull requests'  , two: true }),
      T('OPS-PROD-02', 'RICE backlog prioritiser', 'Backlog ranked by RICE from the reach, impact, confidence and effort you type.', ['Backlog items', 'RICE inputs'], OUT_X, { widget: 'RICE calculator' }),
    ] },
    { role: 'Engineering Manager', tasks: [
      T('OPS-PROD-03', 'Architecture decision record', 'ADR with context, options, decision and consequences.', ['Context', 'Options', 'Decision'], 'md, docx'),
      T('OPS-PROD-04', 'Release readiness checklist', 'Go or no-go sheet from release scope, live CI status and open questions.', ['Release scope', 'Known risks'], 'md, docx, pdf', { widget: 'Live CI', batch: 3 }),
    ] },
    { role: 'Product Designer', tasks: [
      T('OPS-PROD-05', 'Teacher usability test plan', 'Task script and observation grid for sessions with teachers. No learner data.', ['Feature', 'Tasks to test', 'Participant roles'], 'md, docx, csv', { widget: 'Findings tracker (new)', batch: 3 }),
      T('OPS-PROD-06', 'Accessibility review sheet', 'WCAG 2.2 checklist per screen with space for evidence and fixes.', ['Screens or flows', 'Assistive technology used'], 'md, xlsx', { widget: 'Accessibility checklist (new)', batch: 3 }),
    ] },
  ] },
  { dept: 'curriculum', code: 'CURR', roles: [
    { role: 'Curriculum Lead', tasks: [
      T('OPS-CURR-01', 'Lesson plan QA review', 'Quality review of a lesson plan against the CAPS reference you cite.', ['Lesson plan', 'CAPS reference'], 'md, docx, pdf'),
      T('OPS-CURR-02', 'Backward-design unit planner', 'Unit plan built from outcomes back to activities.', ['Grade and term', 'Outcomes from CAPS'], 'md, docx'),
    ] },
    { role: 'Assessment Specialist', tasks: [
      T('OPS-CURR-04', 'CAPS-aligned assessment task and rubric', 'Task, rubric and memo template for a topic you cite from CAPS.', ['Grade, subject, term', 'CAPS topic and page'], 'md, docx, pdf', { batch: 4 }),
      T('OPS-CURR-05', 'Moderation record', 'Moderation checklist and record for sampled tasks, by learner code only.', ['Tasks sampled', 'Moderator role'], 'md, docx, csv', { widget: 'Moderation checklist (new)', batch: 4 }),
    ] },
    { role: 'Inclusion and Language Specialist', tasks: [
      T('OPS-CURR-03', 'Differentiation and support sheet', 'Support and extension strategies for a lesson.', ['Lesson', 'Barriers to learning (general)'], 'md, docx'),
      T('OPS-CURR-06', 'Home-language glossary check', 'Term list laid out for a first-language speaker to verify. Unreviewed machine translation is never used.', ['Term list', 'Languages'], 'md, docx, csv', { batch: 4 }),
    ] },
  ] },
  { dept: 'ai', code: 'AI', roles: [
    { role: 'Brain Governance Lead', tasks: [
      T('OPS-AI-01', 'Agent roster reconciliation', 'Reconciles what the docs say with the contracts in the repository (OPQ-005).', ['Docs count', 'Repository count'], 'md, docx'),
      T('OPS-AI-02', 'Model risk assessment', 'Risk assessment for a model or use case.', ['Use case', 'Data involved'], 'md, docx, pdf', { two: true }),
    ] },
    { role: 'Evaluation Engineer', tasks: [
      T('OPS-AI-03', 'Eval plan', 'Evaluation plan with test sets, thresholds you set, and an owner.', ['Agent', 'Thresholds'], 'md, docx'),
      T('OPS-AI-04', 'Eval results review', 'Pass or fail table against your thresholds from results you type.', ['Eval run results', 'Thresholds'], OUT_X, { batch: 5 }),
    ] },
    { role: 'Guardrail Engineer', tasks: [
      T('OPS-AI-05', 'Guardrail rule change proposal', 'Proposed change to a guardrail with the risk it addresses and a test to prove it.', ['Rule', 'Reason', 'Test'], 'md, docx', { two: true, batch: 5 }),
      T('OPS-AI-06', 'Prompt change review', 'Risk notes on a prompt diff: scope creep, data exposure, claims.', ['Prompt diff', 'Agent'], 'md, docx', { batch: 5 }),
    ] },
  ] },
  { dept: 'security', code: 'SEC', roles: [
    { role: 'Information Officer Support', tasks: [
      T('OPS-SEC-01', 'POPIA conditions assessment', 'Assessment against the eight conditions for lawful processing.', ['Processing activity'], 'md, docx, pdf', { widget: 'POPIA eight conditions'  , two: true }),
      T('OPS-SEC-02', 'Breach response plan', 'Plan for detecting, containing and notifying.', ['Systems in scope'], 'md, docx, pdf', { two: true }),
    ] },
    { role: 'Security Engineer', tasks: [
      T('OPS-SEC-03', 'Security control mapping', 'Maps controls to ISO/IEC 27001-style themes and NIST CSF.', ['Controls in place'], OUT_X, { widget: 'Risk register' }),
      T('OPS-SEC-05', 'Access review', 'Least-privilege review of roles and who holds them, by role not name.', ['Roles and access list'], OUT_X, { widget: 'Access review checklist (new)', batch: 6 }),
    ] },
    { role: 'Privacy Analyst', tasks: [
      T('OPS-SEC-04', 'Data subject request response', 'Response checklist for a POPIA access, correction or deletion request, by reference code only.', ['Request type', 'Date received'], 'md, docx', { two: true, widget: 'Request log (new)', batch: 6 }),
      T('OPS-SEC-06', 'Operator register review', 'Checks that each operator has a written agreement and security measures recorded.', ['Operator list'], OUT_X, { batch: 6 }),
    ] },
  ] },
  { dept: 'legal', code: 'LEG', roles: [
    { role: 'Contracts Manager', tasks: [
      T('OPS-LEG-01', 'Contract review sheet', 'Issue list for counsel. Not legal advice.', ['Contract text or terms'], 'md, docx', { two: true }),
      T('OPS-LEG-03', 'NDA triage', 'First-pass triage of an NDA against your standard positions.', ['NDA terms'], 'md, docx'),
    ] },
    { role: 'Data Protection Counsel Liaison', tasks: [
      T('OPS-LEG-02', 'Operator agreement outline (POPIA)', 'Outline of a POPIA operator agreement for counsel.', ['Operator', 'Processing'], 'md, docx', { two: true }),
      T('OPS-LEG-05', 'Privacy notice outline', 'Outline of a notice covering what POPIA requires you to tell people, for counsel to finalise.', ['Data collected', 'Purposes'], 'md, docx', { two: true, batch: 7 }),
    ] },
    { role: 'Commercial Counsel Liaison', tasks: [
      T('OPS-LEG-04', 'School agreement term sheet', 'Term sheet for a school agreement using the approved price card and your own terms.', ['Pricing option chosen', 'Term and renewal'], 'md, docx', { two: true, batch: 7 }),
      T('OPS-LEG-06', 'Obligation and renewal register', 'Register of dates and duties from signed contracts.', ['Contracts and dates'], OUT_X, { widget: 'Obligation register (new)', batch: 7 }),
    ] },
  ] },
  { dept: 'finance', code: 'FIN', roles: [
    { role: 'Financial Controller', tasks: [
      T('OPS-FIN-01', 'Monthly management commentary', 'Variance commentary built from the figures you supply.', ['Month', 'Budget and actual lines'], 'md, docx, xlsx, html, pdf', { widget: 'Budget vs actual' }),
      T('OPS-FIN-04', 'Month-end close checklist', 'Close checklist with owners and sign-off, for the accountant to complete.', ['Month', 'Systems and accounts in scope'], 'md, xlsx', { widget: 'Close checklist (new)', batch: 1 }),
    ] },
    { role: 'FP&A Analyst', tasks: [
      T('OPS-FIN-02', 'Pricing options analysis', 'Compares pricing structures from your own costs and assumptions.', ['Options', 'Costs', 'Buyer context'], 'md, docx, xlsx', { widget: 'School quote calculator'  , two: true }),
      T('OPS-FIN-05', 'School quote pack', 'Customer-ready quote for one school from learners and educators, computed by the platform’s pricing formula. Standard and community rates, annual prepay, VAT.', ['School', 'Learners', 'Educators', 'Rate type'], 'md, docx, pdf', { widget: 'School quote calculator', two: true, batch: 1 }),
    ] },
    { role: 'Treasury Analyst', tasks: [
      T('OPS-FIN-03', 'Rolling 13-week cash forecast', 'Weekly cash in and out from an opening balance you enter.', ['Opening balance', 'Assumptions'], OUT_X, { widget: 'Runway' }),
      T('OPS-FIN-06', 'Runway and funding scenarios', 'Runway under funding scenarios you type, showing the month cash runs out in each.', ['Cash on hand', 'Monthly burn', 'Funding scenarios'], OUT_X, { widget: 'Runway', batch: 1 }),
    ] },
    { role: 'Revenue and Grants Accountant', tasks: [
      T('OPS-FIN-07', 'Debtors follow-up schedule', 'Follow-up schedule and draft reminder wording for overdue school accounts. Draft only: nothing is sent (OPQ-003, OPQ-004).', ['Accounts overdue (school and amount)', 'Terms agreed'], 'md, docx, csv', { widget: 'Debtors tracker (new)', batch: 1 }),
      T('OPS-FIN-08', 'Grant budget and drawdown report', 'Budget against drawdowns for a funder, laid out the way the funder asks.', ['Funder', 'Approved budget', 'Spend to date'], OUT_X, { widget: 'Grant tracker (new)', two: true, batch: 1 }),
    ] },
  ] },
  { dept: 'sales', code: 'SALES', roles: [
    { role: 'Account Executive', tasks: [
      T('OPS-SALES-01', 'School account plan', 'Plan for one school: roles, needs, next steps.', ['School', 'Roles known'], 'md, docx', { widget: 'MEDDICC' }),
      T('OPS-SALES-02', 'Discovery call prep', 'Questions and goals for a discovery call.', ['School', 'Attendees (roles)'], 'md, docx'),
    ] },
    { role: 'Sales Operations', tasks: [
      T('OPS-SALES-04', 'Pipeline review', 'Weekly review with MEDDICC coverage per opportunity from what the rep can evidence.', ['Opportunities', 'MEDDICC evidence'], OUT_X, { widget: 'MEDDICC', batch: 8 }),
      T('OPS-SALES-05', 'Win and loss review', 'Structured review of why a school bought or did not, from the rep’s notes.', ['Outcome', 'Notes'], 'md, docx', { batch: 8 }),
    ] },
    { role: 'Solutions Lead', tasks: [
      T('OPS-SALES-03', 'Proposal outline', 'Outline of a proposal using the approved price card.', ['School', 'Needs'], 'md, docx, pdf', { widget: 'School quote calculator'  , two: true }),
      T('OPS-SALES-06', 'Teacher demo script', 'Demo script built around a teacher’s day, with no learner data on screen.', ['Audience', 'Features to show'], 'md, docx', { batch: 8 }),
    ] },
  ] },
  { dept: 'marketing', code: 'MKT', roles: [
    { role: 'Campaign Manager', tasks: [
      T('OPS-MKT-01', 'Campaign brief', 'Brief with audience, message and measures.', ['Goal', 'Audience'], 'md, docx'),
      T('OPS-MKT-04', 'Content calendar builder', 'Month of posts across channels, ready for the calendar tracker.', ['Month', 'Pillars', 'Channels'], 'md, csv', { widget: 'Content calendar', batch: 9 }),
    ] },
    { role: 'Content Lead', tasks: [
      T('OPS-MKT-02', 'Post / email draft', 'Draft in the Infinite-AI voice, to be checked against the claims review.', ['Topic', 'Audience'], 'md, docx', { widget: 'Brand voice check' }),
      T('OPS-MKT-05', 'Case study draft', 'Case study built only from pilot evidence you supply, with a consent checklist for the school.', ['School (with consent)', 'Evidence'], 'md, docx', { batch: 9 }),
    ] },
    { role: 'Brand and Compliance Reviewer', tasks: [
      T('OPS-MKT-03', 'Brand and claims review', 'Checks claims against evidence and the brand voice.', ['Draft to review'], 'md, docx', { widget: 'Brand voice check' }),
      T('OPS-MKT-06', 'Direct-marketing consent audit (POPIA s69)', 'Checks each list and message against the section 69 conditions.', ['List source', 'Message'], 'md, docx', { widget: 'Direct-marketing check', batch: 9 }),
    ] },
  ] },
  { dept: 'success', code: 'CS', roles: [
    { role: 'Onboarding Specialist', tasks: [
      T('OPS-CS-01', 'Pilot plan', 'Plan following the ecosystem’s pilot protocol.', ['School', 'Pilot scope'], 'md, docx'),
      T('OPS-CS-04', 'School onboarding checklist', 'Checklist from agreement to first lesson, with owners.', ['School', 'Start date'], 'md, xlsx', { widget: 'Onboarding checklist (new)', batch: 10 }),
    ] },
    { role: 'Customer Success Manager', tasks: [
      T('OPS-CS-02', 'Quarterly business review', 'Review pack from usage figures and feedback you supply.', ['School', 'Usage figures'], 'md, docx, pdf'),
      T('OPS-CS-03', 'Renewal playbook', 'Steps and talking points ahead of a renewal.', ['School', 'Renewal date'], 'md, docx'),
    ] },
    { role: 'Training Lead', tasks: [
      T('OPS-CS-05', 'Teacher training session plan', 'Session plan with outcomes, activities and a short feedback form.', ['Audience', 'Duration'], 'md, docx', { batch: 10 }),
      T('OPS-CS-06', 'Training feedback summary', 'Summary of feedback results you type in, with no names.', ['Survey results'], 'md, docx, csv', { batch: 10 }),
    ] },
  ] },
  { dept: 'support', code: 'SUP', roles: [
    { role: 'Support Lead', tasks: [
      T('OPS-SUP-01', 'Ticket triage', 'Priority and routing for a ticket described without personal data.', ['Ticket summary'], 'md, json', { widget: 'Priority matrix' }),
      T('OPS-SUP-06', 'Ticket trend review', 'Themes and counts from ticket categories you type.', ['Period', 'Category counts'], OUT_X, { batch: 11 }),
    ] },
    { role: 'Knowledge Manager', tasks: [
      T('OPS-SUP-02', 'Knowledge base article', 'How-to article for teachers.', ['Question', 'Steps'], 'md, html'),
      T('OPS-SUP-05', 'Response macro library', 'Reusable reply wording for common questions, for the support lead to approve.', ['Common questions'], 'md, docx', { batch: 11 }),
    ] },
    { role: 'Incident Manager', tasks: [
      T('OPS-SUP-03', 'Incident update', 'Customer-facing update for an incident.', ['Incident', 'Status'], 'md, html'),
      T('OPS-SUP-04', 'Escalation handoff note', 'Handoff from support to engineering with the facts and what has been tried.', ['Ticket summary', 'Steps tried'], 'md, docx', { batch: 11 }),
    ] },
  ] },
  { dept: 'government', code: 'GOV', roles: [
    { role: 'Public Sector Relations Lead', tasks: [
      T('OPS-GOV-01', 'Stakeholder engagement plan', 'Who to engage, why and how, for one objective.', ['Objective', 'Stakeholders'], 'md, docx', { widget: 'Stakeholder map' }),
      T('OPS-GOV-04', 'District and provincial briefing note', 'One-page briefing for an official, using only facts you can cite.', ['Audience', 'Purpose', 'Facts with sources'], 'md, docx, pdf', { batch: 1 }),
    ] },
    { role: 'Partnerships Manager', tasks: [
      T('OPS-GOV-02', 'Partnership MoU outline', 'Outline of a memorandum of understanding for counsel.', ['Partner', 'Shared aim'], 'md, docx', { two: true }),
      T('OPS-GOV-05', 'Partner onboarding checklist', 'Steps to bring a partner in: agreement, data roles, contacts, communications.', ['Partner', 'Scope'], 'md, xlsx', { widget: 'Onboarding checklist (new)', batch: 1 }),
    ] },
    { role: 'Funding and Grants Lead', tasks: [
      T('OPS-GOV-03', 'Funding application skeleton', 'Structure for a grant or tender response using facts you can cite.', ['Funder', 'Need', 'Activities'], 'md, docx', { widget: 'Funding and partnership leads' }),
      T('OPS-GOV-06', 'Funding pipeline review', 'Counts leads by stage and lists the next action for each live lead, flagging any with none recorded.', ['Leads, one per line (name, stage, next action)', 'Priorities'], 'md, docx, csv', { widget: 'Funding and partnership leads', batch: 1 }),
    ] },
    { role: 'Policy Analyst', tasks: [
      T('OPS-GOV-07', 'Policy watch note', 'Note on a policy or circular. Every statement cites the official source, and unverified statements are flagged.', ['Policy or circular', 'Source link', 'Relevance'], 'md, docx', { batch: 1 }),
      T('OPS-GOV-08', 'Tender and RFQ response checklist', 'Checklist of what a tender asks for, taken from the tender document you supply.', ['Tender document text', 'Closing date'], 'md, xlsx', { widget: 'Tender checklist (new)', batch: 1 }),
    ] },
  ] },
  { dept: 'people', code: 'PPL', roles: [
    { role: 'Talent Partner', tasks: [
      T('OPS-PPL-01', 'Role scorecard and job description', 'Scorecard and job description for a role.', ['Role', 'Outcomes'], 'md, docx'),
      T('OPS-PPL-02', 'Interview scorecard', 'Structured interview questions and a scoring guide.', ['Role', 'Competencies'], 'md, docx'),
    ] },
    { role: 'People Operations', tasks: [
      T('OPS-PPL-03', '30-60-90 onboarding plan', 'Onboarding plan for a new hire.', ['Role', 'Start date'], 'md, docx'),
      T('OPS-PPL-04', 'Offer and contract checklist', 'Checklist for a labour lawyer to review before an offer goes out.', ['Role', 'Terms'], 'md, docx', { two: true, batch: 12 }),
    ] },
    { role: 'Learning and Development Lead', tasks: [
      T('OPS-PPL-05', 'Performance review guide', 'Structured review guide. Ratings are the manager’s alone.', ['Role', 'Goals for the period'], 'md, docx', { two: true, batch: 12 }),
      T('OPS-PPL-06', 'Staff development plan', 'Development plan from goals the person and manager agree.', ['Role', 'Goals'], 'md, docx', { batch: 12 }),
    ] },
  ] },
  { dept: 'devops', code: 'SRE', roles: [
    { role: 'Site Reliability Engineer', tasks: [
      T('OPS-SRE-02', 'Blameless postmortem', 'Postmortem with timeline, causes and actions, without blame.', ['Incident', 'Timeline'], 'md, docx', { widget: 'Live CI' }),
      T('OPS-SRE-03', 'SLO and recovery targets', 'SLOs and recovery targets you set, with how each is measured.', ['Service', 'Targets'], 'md, docx'),
    ] },
    { role: 'Release Engineer', tasks: [
      T('OPS-SRE-01', 'Change request', 'Change request with risk, rollback and approver.', ['Change', 'Rollback'], 'md, docx', { two: true }),
      T('OPS-SRE-05', 'Release runbook', 'Step-by-step runbook for a release, taken from the ecosystem’s runbooks.', ['Release', 'Environment'], 'md, docx', { widget: 'Runbooks', batch: 13 }),
    ] },
    { role: 'Cloud Platform Analyst', tasks: [
      T('OPS-SRE-04', 'Backup and restore test record', 'Record of a restore test with result and evidence.', ['System', 'Date tested', 'Result'], 'md, xlsx', { widget: 'Restore test log (new)', batch: 13 }),
      T('OPS-SRE-06', 'Cloud cost review', 'Budget against actual from bill figures you type. Never estimated.', ['Bill lines'], OUT_X, { widget: 'Budget vs actual', batch: 13 }),
    ] },
  ] },
  { dept: 'procurement', code: 'PRO', roles: [
    { role: 'Vendor Manager', tasks: [
      T('OPS-PRO-01', 'Vendor due diligence', 'Due diligence questions and findings for a supplier.', ['Supplier', 'Service'], 'md, docx', { two: true }),
      T('OPS-PRO-03', 'Supplier review', 'Periodic review of a supplier against what was agreed.', ['Supplier', 'Evidence'], 'md, docx'),
    ] },
    { role: 'Sourcing Analyst', tasks: [
      T('OPS-PRO-02', 'RFQ and scoring matrix', 'Request for quotation and a weighted scoring matrix.', ['Need', 'Criteria'], 'md, docx, xlsx', { widget: 'Weighted score' }),
      T('OPS-PRO-05', 'Purchase request and approval log', 'Purchase request with approvals recorded.', ['Item', 'Reason', 'Approver role'], 'md, csv', { widget: 'Purchase log (new)', batch: 14 }),
    ] },
    { role: 'Operator Agreements Controller', tasks: [
      T('OPS-PRO-04', 'Operator register update', 'Updates the register of operators and their written agreements (POPIA).', ['Operator', 'Agreement status'], OUT_X, { two: true, widget: 'Operator register (new)', batch: 14 }),
      T('OPS-PRO-06', 'Exit and data-return plan', 'Plan to leave a supplier and get data returned or deleted.', ['Supplier', 'Data held'], 'md, docx', { two: true, batch: 14 }),
    ] },
  ] },
  { dept: 'research', code: 'RES', roles: [
    { role: 'Research Lead', tasks: [
      T('OPS-RES-01', 'Theory of change', 'Theory of change with assumptions to test.', ['Programme', 'Outcomes'], 'md, docx'),
      T('OPS-RES-02', 'Evaluation plan', 'Evaluation plan with questions, measures and ethics notes.', ['Programme', 'Questions'], 'md, docx', { two: true }),
    ] },
    { role: 'Evaluation Analyst', tasks: [
      T('OPS-RES-05', 'Pilot data collection plan', 'What to collect, from whom, with a consent checklist. No learner-identifying data on this platform.', ['Pilot', 'Measures'], 'md, docx', { two: true, batch: 15 }),
      T('OPS-RES-03', 'Impact report skeleton', 'Report structure. No impact claim without evidence.', ['Programme', 'Evidence'], 'md, docx, pdf', { two: true }),
    ] },
    { role: 'Evidence Librarian', tasks: [
      T('OPS-RES-04', 'Literature scan summary', 'Summary of sources you supply, each cited. Nothing added from memory.', ['Question', 'Sources'], 'md, docx', { batch: 15 }),
      T('OPS-RES-06', 'Evidence claims register', 'Register tying each public claim to its evidence, shared with Marketing.', ['Claims', 'Evidence'], OUT_X, { widget: 'Claims register (new)', batch: 15 }),
    ] },
  ] },
];

export const catalogueTasks = (): (CatTask & { dept: string; role: string })[] =>
  CATALOGUE.flatMap((d) => d.roles.flatMap((r) => r.tasks.map((t) => ({ ...t, dept: d.dept, role: r.role }))));
