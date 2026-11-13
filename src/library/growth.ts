import { F, blank, checks, h, kv, lib, note, ol, p, table, ul, type LibraryItem, type SheetSpec } from './kit';

const reg = (name: string, cols: SheetSpec['columns'], noteText?: string): SheetSpec => ({ name, columns: cols, note: noteText, rows: 100 });
const T = (header: string, type?: SheetSpec['columns'][number]['type'], extra: Partial<SheetSpec['columns'][number]> = {}) => ({ header, type, ...extra });
const MARKETING = 'POPIA (Act 4 of 2013) section 69, direct marketing; Consumer Protection Act 68 of 2008';

export const GROWTH: LibraryItem[] = [
  // ---- Sales and marketing
  lib({ id: 'lib-sales-playbook', title: 'Sales Playbook (schools)', group: 'business', dept: 'sales', kind: 'plan', summary: 'How the company finds, qualifies and signs schools.' }, [
    h('Who we sell to'), p(F('ideal school profile, agreed by the founder')),
    h('Stages'), table(['Stage', 'Exit test', 'Owner', 'Next step'], ['Lead', 'A named decision maker is identified', F('role'), ''], ['Qualified', 'Qualification form complete (lib-lead-qualification)', F('role'), ''], ['Demo', 'Demo held using lib-demo-script', F('role'), ''], ['Quote', 'Quote generated from lib-pricing-calculator', F('role'), ''], ['Agreement', 'Order Form and MSA signed', F('role'), ''], ['Onboarding', 'Handed to customer success', F('role'), '']),
    h('Qualification'), p('Use the MEDDICC prompts in the platform’s sales tools: metrics, economic buyer, decision criteria, decision process, identified pain, champion, competition.'),
    h('Rules'), ul('Prices come only from the quote calculator. Never quote from memory.', 'No promise about a feature that is not built.', 'No learner data is shown in a demo.'),
  ]),
  lib({ id: 'lib-discovery-guide', title: 'Discovery Call Guide', group: 'business', dept: 'sales', kind: 'template', summary: 'Questions for the first conversation with a school.' }, [
    table(['Topic', 'Question', 'Notes'], ['Current tools', 'How do teachers plan and report today?', ''], ['Pain', 'What takes the most time that should not?', ''], ['Support', 'How are learner support needs recorded?', ''], ['Data', 'What systems hold learner and staff records?', ''], ['Decision', 'Who decides, and by when?', ''], ['Budget', 'How is software paid for?', ''], ['Risks', 'What worries you about AI in school?', '']),
  ]),
  lib({ id: 'lib-demo-script', title: 'Demo Script', group: 'business', dept: 'sales', kind: 'template', summary: 'A repeatable demo that never shows learner data.' }, [
    ol('Open with the school’s own pain from discovery.', 'Show the planning tool with sample content.', 'Show a draft that needs teacher approval, and the approval step.', 'Show the privacy design: codes instead of names, audit trail.', 'Show the quote calculator output for the school.', 'Agree the next step and date.'),
    note('Use demonstration data only. Never load a real learner into a demo.', 'warn'),
  ]),
  lib({ id: 'lib-lead-qualification', title: 'Lead Qualification Form', group: 'business', dept: 'sales', kind: 'form', summary: 'MEDDICC-style form per school lead.' }, [
    table(['Field', 'Answer'], ['School', ''], ['Type and quintile if public', ''], ['Educators and learners (approximate)', ''], ['Metrics: what outcome matters', ''], ['Economic buyer', ''], ['Decision criteria', ''], ['Decision process and date', ''], ['Identified pain', ''], ['Champion', ''], ['Competition or status quo', ''], ['Next step and date', '']),
  ]),
  lib({ id: 'lib-proposal', title: 'Proposal Template', group: 'customer', dept: 'sales', kind: 'template', summary: 'Proposal to a school built around its stated pain.' }, [
    h('1. What we heard'), p(F('the school’s own words')), h('2. What we propose'), p(F('modules and outcomes')), h('3. How it works'), p(F('onboarding plan, summary of lib-onboarding-plan')), h('4. Your privacy'), p('Learner information is never put into an AI prompt. A teacher approves anything that affects a learner.'), h('5. Investment'), p('Attach the quote from the quote calculator. Pricing is provisional until approved.'), h('6. Next steps'), p(F('dates')),
  ]),
  lib({ id: 'lib-school-onboarding-questionnaire', title: 'School Onboarding Questionnaire', group: 'customer', dept: 'success', kind: 'form', summary: 'What the school tells us before setup.' }, [
    table(['Question', 'Answer'], ['School name and the department’s school reference', ''], ['Principal and deputy', ''], ['Information Officer', ''], ['Platform administrator at the school', ''], ['Grades and classes to include', ''], ['Systems the school uses today', ''], ['Internet and device situation', ''], ['Languages of instruction', ''], ['Retention schedule ready', 'Yes / No']),
    p('Do not send learner lists with this form. Learner data arrives only through the data import process (lib-data-import-request).'),
  ]),
  lib({ id: 'lib-press-release', title: 'Press Release Template', group: 'business', dept: 'marketing', kind: 'template', summary: 'Structure for announcements.', review: 'the founder, before anything is published' }, [
    table(['Part', 'Content'], ['Headline', F('headline')], ['Date and place', F('date, place')], ['Lead paragraph', F('who, what, why now')], ['Quote', F('spoken or written approval from the person quoted')], ['About the company', F('boilerplate')], ['Contact', F('name, email, phone')]),
    p('No learner, school or parent is named without their written consent.'),
  ]),
  lib({ id: 'lib-social-media-policy', title: 'Social Media Policy', group: 'business', dept: 'marketing', kind: 'policy', summary: 'What staff and the company post.', review: 'a South African attorney', law: [MARKETING] }, [
    ul('Never post a learner’s image, name or work without written consent.', 'Never post a screenshot with real school data.', 'Use the company voice; say nothing about a customer’s dispute.', 'Marketing messages follow direct-marketing rules: lawful, opt-out available.', 'Mistakes are corrected openly and quickly.'),
  ]),
  lib({ id: 'lib-case-study', title: 'Case Study Template', group: 'business', dept: 'marketing', kind: 'template', summary: 'Customer story, published only with consent.', review: 'a South African attorney', law: ['POPIA (Act 4 of 2013)'] }, [
    note('Do not publish until lib-consent-case-study is signed by the school.', 'warn'),
    table(['Section', 'Content'], ['School and context', F('with consent')], ['Challenge', F('')], ['What we did', F('')], ['Result', F('only what was measured and agreed')], ['Quote', F('approved by the person quoted')]),
  ]),
  lib({ id: 'lib-event-checklist', title: 'Event Checklist', group: 'business', dept: 'marketing', kind: 'checklist', summary: 'For conferences, workshops and webinars.' }, [
    checks('Goal and audience written down', 'Budget approved', 'Venue or platform confirmed', 'Materials prepared (demo data only)', 'Sign-up form follows direct-marketing rules', 'Follow-up emails drafted', 'Leads logged within a day', 'Review held afterwards'),
  ]),
  lib({ id: 'lib-referral-terms', title: 'Referral Programme Terms', group: 'customer', dept: 'sales', kind: 'contract', summary: 'Terms for schools that refer other schools.', review: 'a South African attorney', law: [MARKETING] }, [
    ul('Who qualifies: ' + F('rule'), 'Reward: ' + F('what is offered; finance to approve'), 'When it is earned: ' + F('rule'), 'No personal information of the referred school’s staff is shared without their agreement.'),
  ]),
  lib({ id: 'lib-consent-case-study', title: 'Case Study Consent Form', group: 'customer', dept: 'legal', kind: 'form', summary: 'Written consent to feature a school.', review: 'a South African attorney', law: ['POPIA (Act 4 of 2013)'] }, [
    table(['', ''], ['School', ''], ['What may be published', ''], ['Where', ''], ['For how long', ''], ['Named people', ''], ['Signed by', ''], ['Date', '']),
    p('Consent can be withdrawn. The company will remove the material from its own channels within ' + F('time') + '.'),
  ]),
  lib({ id: 'lib-pipeline-tracker', title: 'Sales Pipeline Tracker (workbook)', group: 'business', dept: 'sales', kind: 'workbook', summary: 'Pipeline with stage and next step.', workbook: { sheets: [reg('Pipeline', [T('School', 'text', { width: 30 }), T('Stage', 'list', { list: ['Lead', 'Qualified', 'Demo', 'Quote', 'Agreement', 'Onboarding', 'Lost'] }), T('Contact', 'text'), T('Educators', 'number', { total: 'sum' }), T('Learners', 'number', { total: 'sum' }), T('Monthly excl. VAT (from the quote)', 'money', { total: 'sum', width: 24 }), T('Next step', 'text', { width: 30 }), T('Next date', 'date'), T('Owner', 'text')])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-content-calendar', title: 'Content Calendar (workbook)', group: 'business', dept: 'marketing', kind: 'workbook', summary: 'Plan and track content.', workbook: { sheets: [reg('Calendar', [T('Date', 'date'), T('Channel', 'list', { list: ['Email', 'LinkedIn', 'Facebook', 'Website', 'Event'] }), T('Topic', 'text', { width: 36 }), T('Owner', 'text'), T('Status', 'list', { list: ['Idea', 'Drafting', 'Approved', 'Published'] }), T('Consent checked', 'list', { list: ['Yes', 'No', 'Not needed'] })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-campaign-tracker', title: 'Campaign Tracker (workbook)', group: 'business', dept: 'marketing', kind: 'workbook', summary: 'Spend and results per campaign.', workbook: { sheets: [reg('Campaigns', [T('Campaign', 'text', { width: 30 }), T('Start', 'date'), T('End', 'date'), T('Spend', 'money', { total: 'sum' }), T('Leads', 'number', { total: 'sum' }), T('Cost per lead', 'money', { formula: 'IF(E{r}=0,"",D{r}/E{r})' }), T('Schools signed', 'number', { total: 'sum' }), T('Notes', 'text', { width: 30 })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),

  // ---- Customer success and support
  lib({ id: 'lib-onboarding-plan', title: 'School Onboarding Plan', group: 'customer', dept: 'success', kind: 'plan', summary: 'Plan from signature to go-live.' }, [
    table(['Step', 'Owner', 'Due', 'Done'], ['Agreements signed', F('role'), F('date'), ''], ['Parent letters issued and consent recorded', F('role'), F('date'), ''], ['Retention schedule supplied', F('role'), F('date'), ''], ['Data import (lib-data-import-request)', F('role'), F('date'), ''], ['Administrator trained', F('role'), F('date'), ''], ['Educators trained (lib-training-register)', F('role'), F('date'), ''], ['Go-live checklist passed', F('role'), F('date'), ''], ['First check-in', F('role'), F('date'), '']),
  ]),
  lib({ id: 'lib-data-import-request', title: 'Data Import Request', group: 'customer', dept: 'success', kind: 'form', summary: 'Authorises loading school data and sets the rules.', review: 'the school’s Information Officer', law: ['POPIA (Act 4 of 2013)'] }, [
    table(['', ''], ['School', ''], ['Data sets to load', ''], ['Source system and file format', ''], ['Lawful ground recorded', ''], ['Consent recorded where needed', 'Yes / No'], ['Authorised by (school)', ''], ['Date', '']),
    p('Learner data is loaded only through the platform’s import, which checks tenant, purpose and consent. It is never sent by email or chat.'),
  ]),
  lib({ id: 'lib-training-register', title: 'Training Attendance Register', group: 'customer', dept: 'success', kind: 'register', summary: 'Attendance at a training session. Records attendance only; no professional-development points are stated.', workbook: { sheets: [reg('Attendance', [T('Date', 'date'), T('Session', 'text', { width: 30 }), T('Name', 'text', { width: 26 }), T('Role', 'text'), T('Signature or confirmed by', 'text'), T('Trainer', 'text')])] } }, [
    p('Attendance is recorded here. Any professional-development credit is a matter for the provider and the relevant body, and is not stated by the company.'),
    table(['Name', 'Role', 'Signature'], ...blank(10, 3)),
  ]),
  lib({ id: 'lib-go-live-checklist', title: 'Go-Live Checklist', group: 'customer', dept: 'success', kind: 'checklist', summary: 'Gate before a school starts using the platform.' }, [
    checks('Agreements signed', 'Information Officer named', 'Parent letters issued', 'Consent recorded where relied on', 'Retention schedule loaded', 'Roles assigned, least access', 'Multi-factor sign-in on for administrators', 'Import checked against the source', 'Staff trained', 'Support contacts shared', 'Backup and exit plan explained'),
  ]),
  lib({ id: 'lib-ticket-triage-sop', title: 'Support Ticket Triage SOP', group: 'business', dept: 'support', kind: 'sop', summary: 'Sort every ticket on arrival.' }, [
    ol('Log the ticket with school, contact and time.', 'Check for personal information in the message. Do not copy it into notes or tools.', 'Set severity using the table in the SLA.', 'Assign an owner.', 'Reply to confirm receipt.', 'Resolve or escalate (lib-escalation-matrix).', 'Close with the customer’s confirmation.'),
    note('A ticket that mentions a possible data breach goes to the breach SOP immediately.', 'warn'),
  ]),
  lib({ id: 'lib-escalation-matrix', title: 'Escalation Matrix', group: 'business', dept: 'support', kind: 'template', summary: 'Who to call and when.' }, [
    table(['Situation', 'First contact', 'Then', 'Within'], ['Platform down', F('role'), F('role'), F('time')], ['Suspected data breach', F('role'), F('Information Officer'), F('time')], ['Safeguarding concern', 'The school’s lead', F('role'), 'Immediately'], ['Unhappy customer', F('role'), F('role'), F('time')], ['Wrong AI output reaching a learner', F('role'), F('role'), F('time')]),
  ]),
  lib({ id: 'lib-kb-article', title: 'Knowledge Base Article Template', group: 'business', dept: 'support', kind: 'template', summary: 'How to write a help article.' }, [
    table(['Part', 'Content'], ['Title', F('what the user wants to do')], ['Audience', F('role')], ['Steps', F('numbered, one action each')], ['Result', F('what they should see')], ['If it fails', F('what to try, who to contact')], ['Last checked', F('date')]),
  ]),
  lib({ id: 'lib-sla-report', title: 'Monthly Service Report', group: 'customer', dept: 'support', kind: 'template', summary: 'Report to a school on service against the SLA.', workbook: { sheets: [reg('Tickets', [T('Ticket', 'text'), T('Opened', 'date'), T('Severity', 'list', { list: ['1', '2', '3', '4'] }), T('First response', 'date'), T('Resolved', 'date'), T('Met target', 'list', { list: ['Yes', 'No'] }), T('Summary', 'text', { width: 40 })])] } }, [
    kv(['School', F('name')], ['Month', F('month')]),
    table(['Measure', 'Result'], ['Tickets opened', ''], ['Tickets resolved', ''], ['Met response targets', ''], ['Availability', F('measured, not estimated')]), p('Actions for next month: ' + F('')),
  ]),
  lib({ id: 'lib-nps-survey', title: 'Customer Survey Template', group: 'customer', dept: 'success', kind: 'form', summary: 'Short satisfaction survey.' }, [
    ol('How likely are you to recommend us to another school? (0 to 10)', 'What is the main reason?', 'What is one thing we should fix first?', 'What do you value most?'),
    p('Responses are about the service, not about learners. Do not include learner names.'),
  ]),
  lib({ id: 'lib-health-scorecard', title: 'Customer Health Scorecard (workbook)', group: 'business', dept: 'success', kind: 'workbook', summary: 'Tracks adoption and risk per school.', workbook: { sheets: [reg('Health', [T('School', 'text', { width: 28 }), T('Active educators %', 'percent'), T('Sessions per week', 'number'), T('Open tickets', 'number'), T('Last contact', 'date'), T('Champion active', 'list', { list: ['Yes', 'No'] }), T('Payment status', 'list', { list: ['Current', 'Late', 'Disputed'] }), T('Health', 'list', { list: ['Green', 'Amber', 'Red'] }), T('Next action', 'text', { width: 30 })], 'Health is set by a person using the rules in lib-renewal-playbook. It is not computed from invented thresholds.')] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-renewal-playbook', title: 'Renewal Playbook', group: 'business', dept: 'success', kind: 'plan', summary: 'Steps ahead of a renewal date.' }, [
    table(['When', 'Action'], [F('time before renewal'), 'Review health scorecard and usage'], [F('time'), 'Meet the champion and economic buyer'], [F('time'), 'Send renewal quote generated from the quote calculator'], [F('time'), 'Follow up; escalate if no reply'], ['On renewal', 'Confirm and update records']),
    p('Define red, amber and green yourself: ' + F('criteria agreed by the founder; none are assumed here')),
  ]),
  lib({ id: 'lib-exit-interview', title: 'Customer Exit Interview', group: 'customer', dept: 'success', kind: 'form', summary: 'Why a school left.' }, [
    ol('What led to the decision?', 'What did we do well?', 'What should we have done differently?', 'Is there a path that would bring you back?'),
    table(['Reason', 'Notes'], ['Price', ''], ['Product gaps', ''], ['Support', ''], ['School circumstances', ''], ['Other', '']),
  ]),
  lib({ id: 'lib-offboarding-sop', title: 'Customer Offboarding SOP', group: 'business', dept: 'success', kind: 'sop', summary: 'Exit steps for a school leaving.', review: 'a South African attorney', law: ['POPIA (Act 4 of 2013) section 14'] }, [
    ol('Confirm the end date in writing (lib-cancellation-notice).', 'Agree how data is returned and who receives it.', 'Export the school’s data and check it.', 'Return it by a secure route.', 'Erase through the retention and tombstone path.', 'Issue the certificate (lib-data-return-erasure).', 'Send the final statement of account.', 'Hold the exit interview.', 'Close access and record the closure.'),
  ]),
  lib({ id: 'lib-ticket-log', title: 'Support Ticket Log (workbook)', group: 'business', dept: 'support', kind: 'register', summary: 'Ticket register.', workbook: { sheets: [reg('Tickets', [T('Ticket', 'text'), T('School', 'text', { width: 26 }), T('Opened', 'date'), T('Severity', 'list', { list: ['1', '2', '3', '4'] }), T('Owner', 'text'), T('Status', 'list', { list: ['Open', 'Waiting', 'Resolved', 'Closed'] }), T('Resolved', 'date'), T('Summary (no personal data)', 'text', { width: 40 })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-security-questionnaire-response', title: 'Security Questionnaire Response Template', group: 'customer', dept: 'security', kind: 'template', summary: 'Answers a school’s security questions from facts, not promises.', review: 'the security lead' }, [
    note('Answer only from what is built and evidenced. Link to a policy or a test. If a control does not exist, say so.', 'warn'),
    table(['Question', 'Answer', 'Evidence'], ['Where is data hosted?', F('region'), F('reference')], ['How is each school’s data separated?', 'Per-school isolation in the database, enforced in the database itself', F('test or doc reference')], ['Is learner information sent to AI models?', 'No. It is replaced with codes first.', F('reference')], ['Who can approve AI output for release?', 'A named person; the system cannot', F('reference')], ['Breach process?', 'lib-breach-sop', ''], ['Backups and recovery?', F('current position'), F('reference')]),
  ]),
];
