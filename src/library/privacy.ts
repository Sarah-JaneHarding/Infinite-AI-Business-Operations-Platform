import { F, blank, checks, clause, h, kv, lib, note, options, ol, p, table, ul, type LibraryItem } from './kit';

const POPIA = 'POPIA (Act 4 of 2013)';
const COUNSEL = 'a South African attorney or the appointed Information Officer';

export const PRIVACY: LibraryItem[] = [
  lib({ id: 'lib-privacy-notice', title: 'Privacy Notice (for parents and educators)', group: 'customer', dept: 'legal', kind: 'notice', summary: 'Plain-language notice of what the platform does with personal information.', review: COUNSEL, law: [`${POPIA} sections 18 and 34`] }, [
    h('Who is responsible'), kv(['The school (responsible party)', F('school name and contact')], ['The platform provider (operator)', F('company name and contact')], ['Information Officer', F('name, role, email')]),
    h('What we collect and why'), table(['What', 'Why', 'Who sees it'], ['Learner name, class and grade', F('purpose'), F('roles')], ['Educator name and role', F('purpose'), F('roles')], ['Learner support notes', F('purpose'), F('roles')]),
    h('AI and your child’s information'), p('Learner personal information is never put into an AI prompt. It is replaced with codes first. A teacher reviews any AI draft, and nothing that affects a learner is final until a person approves it.'),
    h('How long we keep it'), p(F('retention periods set by the school; the platform ships none')),
    h('Your rights'), ul('Ask what we hold about you or your child.', 'Ask us to correct it.', 'Ask us to delete it where the law allows.', 'Complain to the school’s Information Officer, or to the Information Regulator.'),
    p(`Regulator contact: ${F('current contact details taken from the Regulator’s website on the day of issue')}`),
  ]),

  lib({ id: 'lib-parent-info-letter', title: 'Parent Information Letter and Consent', group: 'customer', dept: 'success', kind: 'letter', summary: 'Letter to parents before a school uses the platform, with a consent slip.', review: COUNSEL, law: [`${POPIA} section 35 (children, where consent is the ground)`, 'Children’s Act 38 of 2005'] }, [
    p(`Dear parent or guardian of ${F('learner name, written by the school by hand')},`),
    p(`${F('school name')} is starting to use an education platform called Infinite-AI to help teachers plan lessons and support learners. This letter explains what will happen with your child’s information.`),
    ul('What we use: ' + F('data items'), 'Why: ' + F('purpose'), 'Who can see it: ' + F('roles'), 'Your child’s details are never typed into an AI tool. They are replaced with codes first.', 'A teacher checks anything the AI drafts.'),
    note('Whether consent is needed depends on the ground the school relies on. Counsel or the Information Officer must decide this before the slip is used.', 'warn'),
    h('Consent slip (if the school relies on consent)'), table(['', ''], ['Learner', ''], ['Grade and class', ''], ['I consent to the uses above', 'Yes / No'], ['Parent or guardian name', ''], ['Signature', ''], ['Date', '']),
    p(`Questions: ${F('Information Officer name, email')}. You may withdraw consent at any time by telling the school.`),
  ]),

  lib({ id: 'lib-consent-withdrawal', title: 'Consent Withdrawal Form', group: 'customer', dept: 'legal', kind: 'form', summary: 'Lets a parent or educator withdraw consent.', review: COUNSEL, law: [`${POPIA} section 11`] }, [
    table(['', ''], ['Name', ''], ['Relationship to learner', ''], ['Learner', ''], ['What consent is withdrawn', ''], ['Date', ''], ['Signature', '']),
    h('School use'), kv(['Received by', F('role')], ['Date recorded in the consent ledger', F('date')], ['Systems updated', F('list')]),
    p('Withdrawal is recorded as a new entry in the consent ledger. Earlier entries are not changed.'),
  ]),

  lib({ id: 'lib-dsr-form', title: 'Data Subject Request Form', group: 'customer', dept: 'legal', kind: 'form', summary: 'Request to access, correct or delete personal information.', review: COUNSEL, law: [`${POPIA} sections 23 to 25`, 'PAIA (Act 2 of 2000)'] }, [
    table(['', ''], ['Request type', 'Access / Correction / Deletion / Objection'], ['Requester name', ''], ['Relationship to the data subject', ''], ['Learner or person concerned', ''], ['Details of the request', ''], ['Date', ''], ['Signature', '']),
    h('Identity check'), p(F('what proof the school will accept; decided by the Information Officer')),
    h('Office use'), kv(['Received', F('date')], ['Due by', F('date set by the response-time rule in lib-dsr-sop')], ['Outcome', F('granted, partly, refused with reason')], ['Handled by (role)', F('role')]),
  ]),

  lib({ id: 'lib-dsr-sop', title: 'Data Subject Request SOP', group: 'business', dept: 'legal', kind: 'sop', summary: 'Steps for handling access, correction and deletion requests.', review: COUNSEL, law: [`${POPIA} sections 23 to 25`] }, [
    h('Steps'), ol('Log the request on the day it arrives (lib-dsr-form).', 'Confirm the requester’s identity.', 'Decide who is responsible: the school or the company. If the school, pass it on the same day.', 'Find the data. Use the platform’s purpose-checked access, not a direct database query.', 'Check for a legal reason to refuse or limit. Counsel decides.', 'Respond in writing within ' + F('response time set by counsel') + '.', 'Record the outcome. A deletion goes through the retention and tombstone path, never a manual delete.'),
    h('Do not'), ul('Delete anything by hand in the data store.', 'Send personal information by unprotected email.'),
    h('Record'), table(['Date in', 'Requester', 'Type', 'Owner', 'Due', 'Outcome', 'Date out'], ...blank(5, 7)),
  ]),

  lib({ id: 'lib-breach-sop', title: 'Security Compromise (Breach) Response SOP', group: 'business', dept: 'security', kind: 'sop', summary: 'What to do the moment a data breach is suspected.', review: COUNSEL, law: [`${POPIA} section 22`] }, [
    h('First hour'), ol('Stop the harm: revoke access, rotate affected secrets, isolate the system.', 'Tell the incident lead (' + F('role') + ').', 'Start a log. Write down times and facts, not guesses.', 'Preserve evidence; do not wipe systems.'),
    h('Assess'), ul('What data? Whose? How many people?', 'Was learner information involved?', 'Is the data readable by the person who got it?', 'Is it still happening?'),
    h('Notify'), p('Where the law requires it, the responsible party notifies the Regulator and the affected people. As operator the company tells the school without undue delay. Counsel decides what is notified and when.'),
    table(['Who', 'When', 'Template', 'Done by'], ['The school', F('window from the DPA'), 'lib-breach-notice-school', ''], ['The Regulator', F('as counsel advises'), 'lib-breach-notice-regulator', ''], ['Affected people', F('as counsel advises'), 'lib-breach-notice-subjects', '']),
    h('Afterwards'), ul('Postmortem (lib-postmortem).', 'Fix the cause.', 'Update the risk register and this SOP.', 'Record the entry in the breach register (lib-breach-register).'),
  ]),

  lib({ id: 'lib-breach-notice-school', title: 'Breach Notice to a School', group: 'customer', dept: 'security', kind: 'notice', summary: 'Operator’s notice to the school’s Information Officer.', review: COUNSEL, law: [`${POPIA} section 21(2)`] }, [
    p(`To: ${F('Information Officer, school')}`), p(`We have identified a security compromise affecting information we hold for your school. Details so far:`),
    table(['', ''], ['Date and time discovered', F('date and time')], ['What happened', F('facts only')], ['Data involved', F('categories')], ['People affected', F('number if known')], ['What we have done', F('actions')], ['What we recommend you do', F('actions')], ['Next update', F('time')], ['Contact', F('name, role, phone')]),
  ]),
  lib({ id: 'lib-breach-notice-regulator', title: 'Breach Notice to the Information Regulator', group: 'business', dept: 'legal', kind: 'notice', summary: 'Outline of the notification to the Regulator, for the responsible party to send.', review: COUNSEL, law: [`${POPIA} section 22(2)`] }, [
    note('The responsible party (normally the school) notifies the Regulator. Use the Regulator’s current form and channel, taken from its website on the day.', 'warn'),
    table(['', ''], ['Responsible party', F('name, contact')], ['Information Officer', F('name, contact')], ['Nature of the compromise', F('')], ['Date discovered', F('date')], ['Categories and number affected', F('')], ['Likely consequences', F('')], ['Measures taken', F('')]),
  ]),
  lib({ id: 'lib-breach-notice-subjects', title: 'Breach Notice to Affected People', group: 'customer', dept: 'legal', kind: 'notice', summary: 'Plain-language notice to parents or educators.', review: COUNSEL, law: [`${POPIA} section 22(4)`] }, [
    p(`Dear ${F('name')},`), p('We are writing because some of your information was involved in a security incident.'),
    ul('What happened: ' + F('plain description'), 'What information: ' + F('categories'), 'What we have done: ' + F('actions'), 'What you can do: ' + F('advice'), 'Who to contact: ' + F('name, role, email, phone')),
  ]),
  lib({ id: 'lib-info-officer-appointment', title: 'Information Officer Appointment Letter', group: 'business', dept: 'legal', kind: 'letter', summary: 'Appoints and registers the Information Officer.', review: COUNSEL, law: [`${POPIA} sections 55 and 56`] }, [
    kv(['Appointee', F('name')], ['Role', F('title')], ['Appointed by', F('who has the authority')], ['Date', F('date')], ['Deputy', F('name or none')]),
    h('Duties'), ul('Encourage compliance with the conditions for lawful processing.', 'Deal with requests and complaints.', 'Work with the Regulator.', 'Keep the PAIA manual and records of processing current.'),
    p(F('registration with the Regulator: date and reference, once done')),
  ]),
  lib({ id: 'lib-paia-manual', title: 'PAIA Manual Outline', group: 'business', dept: 'legal', kind: 'policy', summary: 'Outline of the manual required for access to records.', review: COUNSEL, law: ['PAIA (Act 2 of 2000) section 51'] }, [
    ol('Company details and contact of the information officer.', 'The guide of the Information Regulator and how to get it.', 'Records held, by subject and category.', 'Records available without a request.', 'Records available under other law.', 'How to request access, form and fee.', 'Processing of personal information: purposes, categories, recipients, transfers, security.', 'Updating the manual.'),
    table(['Record category', 'Held by', 'Availability'], ...blank(8, 3)),
  ]),
  lib({ id: 'lib-dpia', title: 'Privacy Impact Assessment', group: 'business', dept: 'legal', kind: 'template', summary: 'Assess privacy risk before a new feature or data use goes live.', review: COUNSEL, law: [POPIA] }, [
    kv(['Feature or change', F('name')], ['Assessor', F('role')], ['Date', F('date')]),
    h('Questions'), table(['Question', 'Answer', 'Evidence'], ['What personal information is used?', '', ''], ['Does any of it relate to children?', '', ''], ['Which declared purpose does it serve?', '', ''], ['Could it enter a prompt? If so, how is it de-identified?', '', ''], ['Who can see it?', '', ''], ['How long is it kept?', '', ''], ['What could go wrong for a learner?', '', '']),
    h('Decision'), kv(['Proceed, change or stop', F('decision')], ['Approved by (role)', F('role')]),
  ]),
  lib({ id: 'lib-popia-checklist', title: 'POPIA Compliance Checklist', group: 'business', dept: 'legal', kind: 'checklist', summary: 'Self-check against the eight conditions for lawful processing.', review: COUNSEL, law: [`${POPIA} chapter 3`] }, [
    checks('Accountability: Information Officer appointed and registered', 'Processing limitation: lawful ground recorded for each purpose', 'Purpose specification: purposes written down, retention set by the school', 'Further processing limitation: new uses checked against the declared purpose', 'Information quality: correction route exists', 'Openness: privacy notice and PAIA manual published', 'Security safeguards: policy, access control, breach SOP tested', 'Data subject participation: request route and SOP in use', 'Operator agreements signed with every school', 'Children’s information: extra care documented', 'Direct marketing rules followed', 'Transfers outside the country checked'),
  ]),
  lib({ id: 'lib-retention-policy', title: 'Records Retention Policy', group: 'business', dept: 'legal', kind: 'policy', summary: 'How long records are kept and how they are removed. Periods are each school’s decision.', review: COUNSEL, law: [`${POPIA} section 14`] }, [
    p('The platform ships no retention periods. Each school sets its own with its adviser, using the retention schedule template, and the platform checks it before loading.'),
    table(['Record class', 'Owner', 'Period', 'Legal basis', 'Disposal method'], ...blank(8, 5).map((r) => r.map(() => F('')))),
    h('Disposal'), p('Deletion goes through the tombstone path. The audit and consent ledgers are append-only by design and are described in the privacy notice.'),
  ]),
  lib({ id: 'lib-ai-use-policy', title: 'AI Use Policy', group: 'business', dept: 'security', kind: 'policy', summary: 'The rules for using AI in the product and by staff, grounded in how the platform is built.', review: COUNSEL, law: [POPIA] }, [
    h('Rules built into the platform'), ul('Every model call goes through the Model Gateway. There is no second route.', 'No learner personal information enters a prompt. Data is de-identified and stamped first.', 'Anything that affects a learner needs a human approval record before it takes effect.', 'AI output is a draft, never a decision.', 'Facts in the Brain are superseded with a new version, not overwritten.'),
    h('Rules for staff'), ul('Do not paste learner information into any outside AI tool.', 'Do not accept AI output without reading it.', 'Report mistakes and unsafe output.'),
    h('Review'), kv(['Owner', F('role')], ['Review cycle', F('interval')]),
  ]),
  lib({ id: 'lib-learner-data-policy', title: 'Learner Data Policy', group: 'business', dept: 'legal', kind: 'policy', summary: 'How learner information is handled.', review: COUNSEL, law: [`${POPIA} section 34`] }, [
    ul('Used only for the declared purposes.', 'Seen only by roles that need it.', 'Never in a prompt.', 'Never used for marketing.', 'Never sold.', 'Returned and erased on exit.'),
    p(F('anything else the school and counsel require')),
  ]),
  lib({ id: 'lib-complaints-policy', title: 'Complaints Policy and Form', group: 'customer', dept: 'support', kind: 'policy', summary: 'How customers complain and how complaints are handled.', review: COUNSEL, law: ['Consumer Protection Act 68 of 2008'] }, [
    ol('Receive in writing or by phone.', 'Log it and confirm receipt within ' + F('time') + '.', 'Assign an owner.', 'Investigate and reply within ' + F('time') + '.', 'Escalate if unresolved to ' + F('role') + '.', 'Record the outcome and any fix.'),
    table(['Complaint form', ''], ['Name and school', ''], ['Date', ''], ['What happened', ''], ['What you would like us to do', ''], ['Contact', '']),
  ]),
  lib({ id: 'lib-safeguarding-sop', title: 'Safeguarding Concern Handling (outline)', group: 'customer', dept: 'support', kind: 'sop', summary: 'Outline for the platform’s part in a safeguarding concern. The school’s own procedure governs.', review: 'the school’s designated safeguarding lead and counsel', law: ['Children’s Act 38 of 2005'] }, [
    note('This outline invents no reporting steps. The reporting route, timeframes and duties come from the school’s own policy and the law, supplied by the school and counsel.', 'warn'),
    table(['Decision needed', 'Owner decision'], ['Who is the school’s safeguarding lead?', F('name and role')], ['What must staff do on a concern?', F('steps from the school policy')], ['What may the platform record, and who may see it?', F('rule')], ['How is a concern passed on?', F('route')]),
    p('Platform staff never investigate. They pass a concern to the school’s lead immediately and record only what the school’s policy allows.'),
  ]),
  lib({ id: 'lib-coi-declaration', title: 'Conflict of Interest Declaration', group: 'business', dept: 'legal', kind: 'form', summary: 'Annual and ad hoc declaration.', review: COUNSEL, law: ['Companies Act 71 of 2008 section 75'] }, [
    table(['', ''], ['Name', ''], ['Role', ''], ['Interests declared', ''], ['Relationship to suppliers, customers or schools', ''], ['Date', ''], ['Signature', '']),
  ]),
  lib({ id: 'lib-delegation-matrix', title: 'Delegation of Authority Matrix', group: 'business', dept: 'executive', kind: 'template', summary: 'Who may approve what.', review: COUNSEL }, [
    table(['Decision', 'Who decides', 'Limit', 'Second approver'], ['Sign a customer contract', F('role'), F('limit'), F('role')], ['Approve a payment', F('role'), F('limit'), F('role')], ['Hire', F('role'), F('limit'), F('role')], ['Approve an AI artefact for release', 'A named human, never the system', '', F('role')], ['Respond to the Regulator', F('role'), '', F('role')]),
  ]),
  lib({ id: 'lib-board-resolution', title: 'Written Resolution Template', group: 'business', dept: 'executive', kind: 'template', summary: 'Record of a decision of the directors.', review: COUNSEL, law: ['Companies Act 71 of 2008'] }, [
    kv(['Company', F('name and registration')], ['Date', F('date')]), p('RESOLVED THAT:'), ol(F('resolution'), F('authority given and to whom')),
    table(['Director', 'For or against', 'Signature', 'Date'], ...blank(3, 4)),
  ]),
];
