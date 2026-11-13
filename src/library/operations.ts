import { F, blank, checks, h, kv, lib, note, ol, p, table, ul, type LibraryItem, type SheetSpec } from './kit';

const reg = (name: string, cols: SheetSpec['columns'], noteText?: string): SheetSpec => ({ name, columns: cols, note: noteText, rows: 100 });
const T = (header: string, type?: SheetSpec['columns'][number]['type'], extra: Partial<SheetSpec['columns'][number]> = {}) => ({ header, type, ...extra });
const LABOUR = 'a labour-law practitioner or attorney';
const BCEA = 'Basic Conditions of Employment Act 75 of 1997';
const LRA = 'Labour Relations Act 66 of 1995';

export const OPERATIONS: LibraryItem[] = [
  // ---- People
  lib({ id: 'lib-employment-contract', title: 'Employment Contract (outline)', group: 'business', dept: 'people', kind: 'contract', summary: 'Outline with the particulars of employment the law requires.', review: LABOUR, law: [`${BCEA} section 29`, LRA] }, [
    kv(['Employer', F('name, registration, address')], ['Employee', F('name and address')], ['Job title and duties', F('')], ['Start date', F('date')], ['Place of work', F('')], ['Hours', F('')], ['Remuneration and how paid', F('agreed by the founder; not stated here')], ['Leave', F('as the law and the company agree')], ['Notice', F('')], ['Probation', F('if any')]),
    h('Clauses to include'), ul('Confidentiality and handling of personal information.', 'Intellectual property assignment (lib-ip-assignment).', 'Conflict of interest.', 'Acceptable use of company systems (lib-staff-it-policy).', 'Disciplinary and grievance procedures (lib-disciplinary-procedure).', 'Termination.'),
    table(['', 'Employer', 'Employee'], ['Name', '', ''], ['Signature', '', ''], ['Date', '', '']),
  ]),
  lib({ id: 'lib-offer-letter', title: 'Offer Letter', group: 'business', dept: 'people', kind: 'letter', summary: 'Conditional offer of employment.', review: LABOUR, law: [BCEA] }, [
    p(`Dear ${F('candidate')},`), p(`We are pleased to offer you the position of ${F('title')} starting ${F('date')}. The terms are in the attached employment contract.`),
    ul('Pay: ' + F('stated by the founder'), 'Conditions: ' + F('e.g. references, verification'), 'Reply by: ' + F('date')),
    table(['', ''], ['Accepted by', ''], ['Date', ''], ['Signature', '']),
  ]),
  lib({ id: 'lib-contractor-agreement', title: 'Independent Contractor Agreement (outline)', group: 'business', dept: 'people', kind: 'contract', summary: 'For contractors, not employees.', review: LABOUR, law: [BCEA, LRA] }, [
    kv(['Contractor', F('name')], ['Services', F('deliverables')], ['Fee and invoicing', F('agreed')], ['Term', F('')]),
    p('Counsel to check the relationship is genuinely one of independent contracting and not employment, and to set confidentiality, IP, personal information and termination terms.'),
    table(['', 'Company', 'Contractor'], ['Name', '', ''], ['Signature', '', ''], ['Date', '', '']),
  ]),
  lib({ id: 'lib-ip-assignment', title: 'Confidentiality and IP Assignment', group: 'business', dept: 'people', kind: 'contract', summary: 'Staff and contractors assign work product and keep secrets.', review: 'an intellectual property attorney', law: ['Copyright Act 98 of 1978'] }, [
    ul('What is assigned: ' + F('scope'), 'Prior work excluded: ' + F('list'), 'Open-source obligations are followed and recorded.', 'No customer or learner data leaves the platform.'),
    table(['', 'Company', 'Individual'], ['Name', '', ''], ['Signature', '', ''], ['Date', '', '']),
  ]),
  lib({ id: 'lib-staff-onboarding-checklist', title: 'Staff Onboarding Checklist', group: 'business', dept: 'people', kind: 'checklist', summary: 'First days for a new team member.' }, [
    checks('Contract signed', 'Confidentiality and IP signed', 'Policies read and acknowledged', 'Accounts created with least access', 'Multi-factor sign-in on', 'Device issued and recorded in the asset register', 'Security briefing done', 'Buddy assigned', 'First goals agreed'),
  ]),
  lib({ id: 'lib-staff-offboarding-checklist', title: 'Staff Offboarding Checklist', group: 'business', dept: 'people', kind: 'checklist', summary: 'Leaving steps.' }, [
    checks('Accounts and keys revoked on the last day', 'Secrets the person knew are rotated', 'Devices returned and wiped', 'Handover written', 'Final pay approved by the founder', 'Exit conversation held'),
  ]),
  lib({ id: 'lib-leave-application', title: 'Leave Application Form', group: 'business', dept: 'people', kind: 'form', summary: 'Request for leave.', review: LABOUR, law: [BCEA] }, [
    table(['', ''], ['Employee', ''], ['Leave type', ''], ['From', ''], ['To', ''], ['Approved by', ''], ['Date', '']),
  ]),
  lib({ id: 'lib-leave-register', title: 'Leave Register (workbook)', group: 'business', dept: 'people', kind: 'register', summary: 'Leave taken and balances.', workbook: { sheets: [reg('Leave', [T('Employee', 'text', { width: 26 }), T('Type', 'list', { list: ['Annual', 'Sick', 'Family responsibility', 'Maternity or parental', 'Unpaid', 'Other'] }), T('From', 'date'), T('To', 'date'), T('Working days', 'number', { total: 'sum' }), T('Approved by', 'text'), T('Notes', 'text', { width: 30 })], 'Entitlements come from the contract and the law; they are not set here.')] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-performance-review', title: 'Performance Review Form', group: 'business', dept: 'people', kind: 'form', summary: 'Periodic review against agreed goals.' }, [
    table(['Goal', 'Evidence', 'Rating', 'Comment'], ...blank(5, 4)), table(['', ''], ['Strengths', ''], ['Development', ''], ['Next goals', ''], ['Reviewer', ''], ['Employee', ''], ['Date', '']),
  ]),
  lib({ id: 'lib-disciplinary-procedure', title: 'Disciplinary and Grievance Procedure (outline)', group: 'business', dept: 'people', kind: 'policy', summary: 'Fair process for misconduct and grievances.', review: LABOUR, law: [LRA, 'Schedule 8 Code of Good Practice: Dismissal'] }, [
    p('Steps, rules, and sanctions are set by the company with its adviser; none are assumed here.'),
    table(['Stage', 'Who', 'Notes'], ['Informal discussion', F('role'), ''], ['Written notice of a hearing', F('role'), F('notice period')], ['Hearing', F('role'), F('rights of the employee')], ['Outcome and appeal', F('role'), F('')]),
    h('Grievance'), ol('Employee raises it in writing.', 'Manager responds in ' + F('time') + '.', 'Escalation to ' + F('role') + '.'),
  ]),
  lib({ id: 'lib-code-of-conduct', title: 'Code of Conduct', group: 'business', dept: 'people', kind: 'policy', summary: 'How we behave.' }, [
    ul('Treat children’s information as the most protected thing we hold.', 'Be honest about what the product can and cannot do.', 'Never bypass an approval step or a safeguard.', 'Declare conflicts of interest.', 'Speak up about mistakes early.'),
  ]),

  // ---- Security
  lib({ id: 'lib-infosec-policy', title: 'Information Security Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'Top-level security policy, consistent with how the platform is built.', review: 'the security lead', law: ['POPIA (Act 4 of 2013) sections 19 to 22'] }, [
    h('Principles'), ul('Each school’s data is isolated in the database, enforced by the database.', 'No learner personal information in any AI prompt.', 'Least access: roles get only what they need.', 'Every access to learner data has a declared purpose and a lawful basis.', 'Audit and consent records are append-only.', 'No secret in code or documents.'),
    h('Scope'), p(F('systems and people covered')), h('Responsibilities'), table(['Role', 'Responsibility'], [F('role'), 'Owns this policy'], ['All staff', 'Follow it and report incidents']),
  ]),
  lib({ id: 'lib-access-control-policy', title: 'Access Control Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'Who gets access and how it is reviewed.', review: 'the security lead' }, [
    ul('Access is by role, granted by an approver who is not the requester.', 'Multi-factor sign-in for administrators and staff.', 'Access reviewed ' + F('interval') + ' and removed on role change or exit.', 'Break-glass access is logged and reviewed.'),
  ]),
  lib({ id: 'lib-password-mfa-policy', title: 'Password and Multi-Factor Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'Sign-in standards.', review: 'the security lead' }, [
    ul('Unique passwords in a password manager.', 'Multi-factor authentication wherever offered.', 'No sharing of credentials.', 'Lost device reported at once.'), p('Minimum length and rules: ' + F('set by the security lead from the identity provider’s settings')),
  ]),
  lib({ id: 'lib-staff-it-policy', title: 'Staff IT Acceptable Use Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'Use of company devices and accounts.', review: 'the security lead' }, [
    ul('Company data stays on approved systems.', 'No learner data on personal devices or in outside AI tools.', 'Keep software updated.', 'Lock the screen.', 'Report lost devices and suspicious messages.'),
  ]),
  lib({ id: 'lib-backup-dr-policy', title: 'Backup and Disaster Recovery Plan', group: 'business', dept: 'security', kind: 'plan', summary: 'How data is backed up and restored.', review: 'the security lead' }, [
    table(['Item', 'Value'], ['What is backed up', F('systems')], ['How often', F('interval')], ['Where stored', F('location')], ['Recovery time target', F('only what has been tested')], ['Recovery point target', F('only what has been tested')], ['Last restore test', F('date and result')]),
    p('A backup that has not been restored in a test is not counted.'),
  ]),
  lib({ id: 'lib-bcp', title: 'Business Continuity Plan', group: 'business', dept: 'executive', kind: 'plan', summary: 'Keeping the service running through disruption.' }, [
    table(['Scenario', 'Impact', 'Response', 'Owner'], ['Hosting outage', F(''), F(''), F('role')], ['Key person unavailable', F(''), F(''), F('role')], ['Power or internet loss (load shedding)', F(''), F(''), F('role')], ['Provider failure', F(''), F(''), F('role')]),
  ]),
  lib({ id: 'lib-incident-response', title: 'Incident Response Plan', group: 'business', dept: 'devops', kind: 'plan', summary: 'Detect, contain, fix and learn from incidents.', review: 'the security lead' }, [
    ol('Detect and declare.', 'Name an incident lead.', 'Contain.', 'Communicate to affected schools.', 'Fix.', 'Review within ' + F('time') + ' (lib-postmortem).'),
    table(['Role', 'Who', 'Contact'], ['Incident lead', F('name'), F('')], ['Backup', F('name'), F('')], ['Communications', F('name'), F('')]),
  ]),
  lib({ id: 'lib-change-management', title: 'Change Management SOP', group: 'business', dept: 'devops', kind: 'sop', summary: 'How changes reach production.' }, [
    ol('Change proposed in a pull request with its tests.', 'Reviewed by someone other than the author.', 'Checks green.', 'Approved by a human.', 'Released using lib-release-sop.', 'Rollback ready.'),
  ]),
  lib({ id: 'lib-vuln-mgmt', title: 'Vulnerability Management SOP', group: 'business', dept: 'security', kind: 'sop', summary: 'Find and fix weaknesses.', review: 'the security lead' }, [
    ol('Scan dependencies and code regularly.', 'Record each finding with severity.', 'Decide fix, mitigate or accept, with a named approver.', 'Fix within ' + F('target set by the security lead') + '.', 'Record dependency changes as the repository rules require.'),
  ]),
  lib({ id: 'lib-secrets-handling', title: 'Secrets Handling Standard', group: 'business', dept: 'security', kind: 'policy', summary: 'How keys and tokens are kept.', review: 'the security lead' }, [
    ul('No secret in code, tests, fixtures, documents or example files.', 'Secrets live in the secrets store only.', 'A leaked secret is rotated at once, then investigated.', 'Rotation interval: ' + F('interval')),
  ]),
  lib({ id: 'lib-remote-work-byod', title: 'Remote Work and Personal Device Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'Working away from the office.', review: 'the security lead' }, [
    ul('Use a trusted network or the company’s secure access.', 'Personal devices only if they meet ' + F('minimum standard') + '.', 'No learner data stored locally.', 'Lost device reported at once.'),
  ]),
  lib({ id: 'lib-risk-register', title: 'Risk Register (workbook)', group: 'business', dept: 'executive', kind: 'register', summary: 'Risks, owners and treatments.', workbook: { sheets: [reg('Risks', [T('Ref', 'text'), T('Risk', 'text', { width: 40 }), T('Cause', 'text', { width: 28 }), T('Impact (1-5)', 'number'), T('Likelihood (1-5)', 'number'), T('Score', 'number', { formula: 'IF(OR(D{r}="",E{r}=""),"",D{r}*E{r})' }), T('Treatment', 'text', { width: 36 }), T('Owner', 'text'), T('Review date', 'date'), T('Status', 'list', { list: ['Open', 'Treated', 'Accepted', 'Closed'] })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-ropa', title: 'Record of Processing Activities (workbook)', group: 'business', dept: 'legal', kind: 'register', summary: 'What personal information is processed, why, and where.', review: 'the Information Officer', law: ['POPIA (Act 4 of 2013)'], workbook: { sheets: [reg('Processing', [T('Activity', 'text', { width: 30 }), T('Purpose', 'text', { width: 30 }), T('Data categories', 'text', { width: 30 }), T('Whose data', 'text'), T('Lawful basis', 'text'), T('Recipients', 'text'), T('Outside South Africa', 'list', { list: ['No', 'Yes'] }), T('Retention (school-set)', 'text'), T('Owner', 'text')])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-supplier-register', title: 'Supplier Register (workbook)', group: 'business', dept: 'procurement', kind: 'register', summary: 'Suppliers, what they touch and agreements in force.', workbook: { sheets: [reg('Suppliers', [T('Supplier', 'text', { width: 28 }), T('Service', 'text', { width: 28 }), T('Touches personal data', 'list', { list: ['No', 'Yes'] }), T('Operator agreement signed', 'list', { list: ['N/A', 'Yes', 'No'] }), T('Contract end', 'date'), T('Annual cost', 'money', { total: 'sum' }), T('Owner', 'text')])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-contract-register', title: 'Contract Register (workbook)', group: 'business', dept: 'legal', kind: 'register', summary: 'Every contract, its dates and renewal notice.', workbook: { sheets: [reg('Contracts', [T('Counterparty', 'text', { width: 28 }), T('Type', 'list', { list: ['School', 'Supplier', 'Partner', 'Employee', 'Contractor', 'Other'] }), T('Signed', 'date'), T('Start', 'date'), T('End', 'date'), T('Renewal notice by', 'date'), T('Document link', 'text', { width: 30 }), T('Owner', 'text')])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-breach-register', title: 'Security Incident and Breach Register (workbook)', group: 'business', dept: 'security', kind: 'register', summary: 'Every incident and its outcome.', review: 'the Information Officer', law: ['POPIA (Act 4 of 2013) section 22'], workbook: { sheets: [reg('Incidents', [T('Ref', 'text'), T('Discovered', 'date'), T('Description (no personal data)', 'text', { width: 40 }), T('Personal information involved', 'list', { list: ['No', 'Yes', 'Unknown'] }), T('Notified school', 'date'), T('Notified Regulator', 'date'), T('Notified people', 'date'), T('Cause', 'text', { width: 28 }), T('Fix', 'text', { width: 28 }), T('Closed', 'date')])] } }, [p('Spreadsheet. Open the .xlsx file.')]),

  // ---- Product and engineering
  lib({ id: 'lib-prd', title: 'Product Requirements Document', group: 'business', dept: 'product', kind: 'template', summary: 'Requirements for a feature.' }, [
    table(['Section', 'Content'], ['Problem and who has it', F('')], ['Goal and how we will know', F('measure agreed in advance')], ['Users and roles', F('')], ['Requirements', F('numbered')], ['Out of scope', F('')], ['Privacy and safety review', F('lib-dpia reference')], ['Open questions', F('')]),
  ]),
  lib({ id: 'lib-adr', title: 'Architecture Decision Record', group: 'business', dept: 'devops', kind: 'template', summary: 'Records a design decision and why.' }, [
    table(['', ''], ['Title', F('')], ['Status', F('proposed, accepted, superseded')], ['Context', F('')], ['Decision', F('')], ['Consequences', F('')], ['Alternatives rejected and why', F('')]),
  ]),
  lib({ id: 'lib-release-sop', title: 'Release SOP', group: 'business', dept: 'devops', kind: 'sop', summary: 'Ship a version safely.' }, [
    ol('All checks green on the branch.', 'Release notes written.', 'Approval recorded.', 'Deploy.', 'Smoke test.', 'Watch for ' + F('time') + '.', 'Roll back if the smoke test fails.'),
  ]),
  lib({ id: 'lib-test-plan', title: 'Test Plan Template', group: 'business', dept: 'devops', kind: 'template', summary: 'Plan tests for a change.' }, [
    table(['Area', 'Happy path', 'Failure paths', 'Security test needed'], ...blank(5, 4)),
  ]),
  lib({ id: 'lib-postmortem', title: 'Post-Incident Review', group: 'business', dept: 'devops', kind: 'template', summary: 'Blameless review after an incident.' }, [
    table(['Section', 'Content'], ['Summary', ''], ['Timeline', ''], ['Impact', ''], ['Cause', ''], ['What went well', ''], ['What did not', ''], ['Actions, owner, date', '']),
  ]),
  lib({ id: 'lib-runbook', title: 'Runbook Template', group: 'business', dept: 'devops', kind: 'template', summary: 'Steps to operate or recover a component.' }, [
    table(['Section', 'Content'], ['Component', ''], ['Symptoms', ''], ['Checks', ''], ['Fix steps', ''], ['Rollback', ''], ['Who to call', '']),
  ]),
  lib({ id: 'lib-oncall', title: 'On-Call Guide', group: 'business', dept: 'devops', kind: 'plan', summary: 'Who responds out of hours.' }, [
    table(['Item', 'Value'], ['Rota', F('who and when')], ['How alerts arrive', F('')], ['Response expectation', F('only what can be met')], ['Handover', F('')]),
  ]),
  lib({ id: 'lib-model-eval', title: 'Model Evaluation Report', group: 'business', dept: 'aibrain', kind: 'template', summary: 'Evidence for choosing or changing a model or prompt.' }, [
    table(['Section', 'Content'], ['What changed', ''], ['Evaluation set and size', ''], ['Results', 'Measured, with the run reference'], ['Failures reviewed', ''], ['Safety and privacy checks', ''], ['Cost per run', 'Measured'], ['Decision and approver', '']),
  ]),

  // ---- Procurement and government
  lib({ id: 'lib-rfq', title: 'Request for Quotation Template', group: 'business', dept: 'procurement', kind: 'template', summary: 'Ask suppliers to quote.' }, [
    table(['Section', 'Content'], ['What is needed', F('')], ['Specification', F('')], ['Delivery', F('date and place')], ['Evaluation criteria', F('')], ['Closing date', F('date')], ['Declarations', 'Conflict of interest, tax status']),
  ]),
  lib({ id: 'lib-tender-checklist', title: 'Tender Response Checklist', group: 'business', dept: 'government', kind: 'checklist', summary: 'Before submitting a tender.', review: 'a South African attorney or tender adviser' }, [
    checks('Read the full document and conditions', 'Compulsory briefing attended if required', 'Tax compliance evidenced', 'Registration and supplier-database status evidenced', 'Pricing from the quote calculator, approved', 'Declarations completed and signed', 'Copies and format as required', 'Delivered before closing'),
    p('Required documents differ per tender; use the list in the tender itself.'),
  ]),
  lib({ id: 'lib-grant-checklist', title: 'Grant Application Checklist', group: 'business', dept: 'government', kind: 'checklist', summary: 'Before submitting a funding application.' }, [
    checks('Eligibility checked in writing', 'Budget prepared and approved', 'Outcomes stated, measured not promised', 'Letters of support gathered', 'Reporting duties understood', 'Submitted before the deadline'),
  ]),
  lib({ id: 'lib-moa', title: 'Memorandum of Agreement (outline)', group: 'business', dept: 'government', kind: 'contract', summary: 'Agreement with a department, district or partner.', review: 'a South African attorney', law: ['Public Finance Management Act 1 of 1999 where a public body is party'] }, [
    kv(['Parties', F('')], ['Purpose', F('')], ['Roles', F('')], ['Funding', F('')], ['Data and privacy', 'A separate operator agreement applies where personal information is processed'], ['Term and exit', F('')]),
    table(['', 'Party A', 'Party B'], ['Name', '', ''], ['Signature', '', ''], ['Date', '', '']),
  ]),
];
