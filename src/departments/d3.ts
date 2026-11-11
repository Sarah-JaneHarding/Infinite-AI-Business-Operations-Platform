import { defineAgent as A, long, pick, src, txt, v, blankRows, TBC } from './kit';
import type { Department } from './types';
import { priority } from './calc';
import { FUNDING_LEAD_SEED } from './fundingLeads';

export const marketing: Department = {
  id: 'marketing', name: 'Marketing & Brand', icon: 'Megaphone',
  mission: 'Teacher-first, honest marketing in the Infinite-AI voice. Direct marketing follows POPIA s69.',
  frameworks: ['Jobs-to-be-done messaging', 'AARRR funnel', 'Content pillars and calendar', 'Brand voice guardrails', 'POPIA s69 direct marketing'],
  widgets: [
    { id: 'calendar', title: 'Content calendar', type: 'tracker', collection: 'content_calendar', columns: [{ key: 'date', label: 'Date', kind: 'date' }, { key: 'channel', label: 'Channel', kind: 'select', options: ['LinkedIn', 'Facebook', 'Email', 'Blog', 'WhatsApp (opt-in only)', 'Event'] }, { key: 'pillar', label: 'Pillar', kind: 'text' }, { key: 'piece', label: 'Piece', kind: 'text' }, { key: 'status', label: 'Status', kind: 'select', options: ['Idea', 'Drafting', 'Review', 'Approved', 'Published'] }] },
    { id: 's69', title: 'Direct-marketing check (POPIA s69)', type: 'checklist', collection: 's69', items: ['Recipient is an existing customer for similar products, or has opted in', 'Every message offers a simple way to opt out', 'No purchased lists', 'Sender identity and contact details are clear', 'Opt-in evidence is stored (who, when, how)'] },
    { id: 'voice', title: 'Brand voice check', type: 'checklist', collection: 'voice', items: ['Teacher is the decision-maker; AI assists', 'No claim of results without a cited source', 'No learner names or photos without consent', 'South African English; plain language', 'Does not overpromise on CAPS compliance'] },
  ],
  agents: [
    A('marketing', 'MKT', { n: 1, name: 'Campaign brief', summary: 'Audience, message, channels and measures for one campaign.', framework: 'Jobs-to-be-done + AARRR', purpose: 'marketing_content',
      inputs: [txt('goal', 'Campaign goal', true), long('audience', 'Audience (role, not individuals)', true), long('offer', 'What you are offering'), long('proof', 'Proof points you can cite, with source')],
      sections: (c) => [{ h: 'Goal', input: c.input.goal ?? '' }, { h: 'Audience and job to be done', input: c.input.audience ?? '' }, { h: 'Offer', input: c.input.offer ?? '' }, { h: 'Proof (cited only)', input: c.input.proof ?? '' }, { h: 'Message house', table: { headers: ['Level', 'Message'], rows: [['Promise', ''], ['Pillar 1', ''], ['Pillar 2', ''], ['Pillar 3', '']] } }, { h: 'Funnel and measures', table: { headers: ['Stage', 'Tactic', 'Measure (you define)'], rows: blankRows(['Acquisition', 'Activation', 'Retention', 'Referral', 'Revenue'], 3) } }, { h: 'Compliance', checks: ['POPIA s69 check complete', 'Brand voice check complete', 'Claims sourced'] }] }),
    A('marketing', 'MKT', { n: 2, name: 'Post / email draft', summary: 'A first draft for a human to rewrite in their own voice.', framework: 'Brand voice guardrails', purpose: 'marketing_content', formats: ['md', 'docx', 'html'],
      inputs: [pick('channel', 'Channel', ['LinkedIn', 'Facebook', 'Email', 'Blog'], true), long('message', 'Core message in your words', true), long('proof', 'Facts you may cite (with source)')],
      sections: (c) => [{ h: `Draft for ${v(c, 'channel')}`, input: c.input.message ?? '' }, { h: 'Facts that may be cited', input: c.input.proof ?? '' }, { h: 'Edit notes', bullets: ['Rewrite in your own voice.', 'Remove any claim you cannot source.', 'Add an opt-out line if this is an email to a list.'] }] }),
    A('marketing', 'MKT', { n: 3, name: 'Brand and claims review', summary: 'Check a piece of copy against voice and claim rules.', framework: 'Brand voice guardrails', purpose: 'marketing_content',
      inputs: [long('copy', 'Copy to review', true)],
      sections: (c) => [{ h: 'Copy', input: c.input.copy ?? '' }, { h: 'Review', table: { headers: ['Rule', 'Pass?', 'Note'], rows: [['The teacher decides; AI assists', '', ''], ['Every claim has a cited source', '', ''], ['No guaranteed outcomes', '', ''], ['POPIA: no personal data, opt-out present', '', ''], ['Plain South African English', '', '']] } }] }),
  ],
};

export const success: Department = {
  id: 'success', name: 'Customer Success & Pilots', icon: 'HeartHandshake',
  mission: 'Get schools to value quickly and keep them. Pilots follow the ecosystem’s own pilot protocol.',
  frameworks: ['Onboarding milestones', 'Customer health scoring (you define the signals)', 'Quarterly business review', 'Pilot protocol (docs/PILOT_PROTOCOL.md)'],
  widgets: [
    { id: 'pilots', title: 'Pilot tracker', type: 'tracker', collection: 'pilots', columns: [{ key: 'school', label: 'School', kind: 'text' }, { key: 'phase', label: 'Phase', kind: 'select', options: ['Agreed', 'Onboarding', 'Running', 'Review', 'Decision'] }, { key: 'start', label: 'Start', kind: 'date' }, { key: 'champion', label: 'Champion (role)', kind: 'text' }, { key: 'health', label: 'Health', kind: 'select', options: ['Green', 'Amber', 'Red'] }, { key: 'note', label: 'Note', kind: 'text' }] },
    { id: 'onboard', title: 'Onboarding checklist', type: 'checklist', collection: 'onboarding', items: ['Operator agreement signed', 'Administrator accounts created', 'Teachers invited', 'Training session held', 'First lesson planned with the tool', 'Success criteria agreed in writing', 'Review date booked'] },
  ],
  agents: [
    A('success', 'CS', { n: 1, name: 'Pilot plan', summary: 'A pilot plan for one school with success criteria they agree to.', framework: 'Pilot protocol + onboarding milestones', purpose: 'customer_success',
      inputs: [txt('school', 'School', true), long('goals', 'What the school wants to learn or achieve', true), txt('duration', 'Duration (terms/weeks)')],
      sections: (c) => [{ h: 'Pilot', kv: [['School', v(c, 'school')], ['Duration', v(c, 'duration')]] }, { h: 'Goals', input: c.input.goals ?? '' }, { h: 'Success criteria (agreed in writing, measurable)', table: { headers: ['Criterion', 'How measured', 'Evidence source', 'Agreed by'], rows: blankRows(['Teacher time', 'Usage', 'Teacher confidence', 'Quality of output'], 4) } }, { h: 'Milestones', table: { headers: ['Milestone', 'Date', 'Owner'], rows: blankRows(['Kick-off', 'Training', 'Mid-point check-in', 'Review', 'Decision'], 3) } }, { h: 'Source protocol', p: 'Align with the pilot protocol in the ecosystem repository (docs/PILOT_PROTOCOL.md). Any difference must be recorded.' }, { h: 'Data protection', checks: ['Operator agreement signed before any data flows', 'No learner-level data enters the operations platform', 'Teacher decisions are recorded'] }] }),
    A('success', 'CS', { n: 2, name: 'Quarterly business review', summary: 'Review pack for a school using only measures you have and can show.', framework: 'QBR', purpose: 'customer_success',
      inputs: [txt('school', 'School', true), long('usage', 'What the usage data shows (your words, with source)'), long('feedback', 'Teacher feedback (summarised, no names)')],
      sections: (c) => [{ h: 'Usage', input: c.input.usage ?? '' }, { h: 'Teacher feedback', input: c.input.feedback ?? '' }, { h: 'Goals vs outcomes', table: { headers: ['Goal', 'Outcome (evidence)', 'Status'], rows: blankRows(['Goal 1', 'Goal 2'], 3) } }, { h: 'Next period', ol: [TBC, TBC] }] }),
    A('success', 'CS', { n: 3, name: 'Renewal playbook', summary: 'Plan for a renewal conversation, risks and asks.', framework: 'Renewal playbook', purpose: 'customer_success',
      inputs: [txt('school', 'School', true), long('value', 'Value the school has gained (their words)'), long('risks', 'Risks to renewal')],
      sections: (c) => [{ h: 'Value delivered', input: c.input.value ?? '' }, { h: 'Risks', input: c.input.risks ?? '' }, { h: 'Plan', table: { headers: ['Action', 'Owner', 'Date'], rows: blankRows(['Review with sponsor', 'Confirm budget cycle', 'Send renewal paperwork'], 3) } }] }),
  ],
};

const IMPACT = ['1 = whole school affected', '2 = a group affected', '3 = one user affected'];
export const support: Department = {
  id: 'support', name: 'Support & Service Desk', icon: 'LifeBuoy',
  mission: 'Teachers get help quickly and the platform learns from every ticket. No learner or personal data in tickets.',
  frameworks: ['ITIL incident and problem management', 'Impact × urgency priority matrix', 'Knowledge-centred service', 'Blameless post-incident review'],
  widgets: [
    { id: 'tickets', title: 'Tickets', type: 'tracker', note: 'Describe the problem without names or learner details.', collection: 'tickets', columns: [{ key: 'summary', label: 'Summary', kind: 'text' }, { key: 'impact', label: 'Impact (1-3)', kind: 'select', options: ['1', '2', '3'] }, { key: 'urgency', label: 'Urgency (1-3)', kind: 'select', options: ['1', '2', '3'] }, { key: 'priority', label: 'Priority', kind: 'select', options: ['P1', 'P2', 'P3', 'P4'] }, { key: 'status', label: 'Status', kind: 'select', options: ['New', 'In progress', 'Waiting', 'Resolved'] }] },
    { id: 'calc-p', title: 'Priority matrix', type: 'calc', note: `Impact: ${IMPACT.join('; ')}. Urgency uses the same 1–3 scale.`, inputs: [{ key: 'i', label: 'Impact (1-3)' }, { key: 'u', label: 'Urgency (1-3)' }], compute: (x) => [{ label: 'Priority (P1 highest)', value: [1, 2, 3].includes(x.i) && [1, 2, 3].includes(x.u) ? Number(priority(x.i as 1, x.u as 1).slice(1)) : null, unit: 'P-level', formula: 'ITIL impact × urgency' }] },
  ],
  agents: [
    A('support', 'SUP', { n: 1, name: 'Ticket triage', summary: 'Classify and prioritise a ticket, and suggest the first reply.', framework: 'ITIL priority matrix', purpose: 'service_desk',
      inputs: [long('ticket', 'Ticket text (remove names and learner details first)', true), pick('impact', 'Impact', ['1', '2', '3'], true), pick('urgency', 'Urgency', ['1', '2', '3'], true)],
      sections: (c) => {
        const p = priority(Number(c.input.impact || 3) as 1, Number(c.input.urgency || 3) as 1);
        return [{ h: 'Ticket', input: c.input.ticket ?? '' }, { h: 'Priority', callout: { tone: p === 'P1' ? 'warn' : 'info', text: `${p} (impact ${v(c, 'impact')}, urgency ${v(c, 'urgency')}). Matrix is the standard ITIL convention; set response targets in your own SLA.` } }, { h: 'Suggested first reply (edit before sending)', p: 'Thank you for telling us. We are looking into this and will update you. If anything changes on your side, please reply here.' }, { h: 'Routing', table: { headers: ['Question', 'Answer'], rows: blankRows(['Known issue / existing article?', 'Needs engineering?', 'Possible personal-data issue? (escalate to Security)'], 2) } }];
      } }),
    A('support', 'SUP', { n: 2, name: 'Knowledge base article', summary: 'Teacher-friendly how-to article from a resolved ticket.', framework: 'Knowledge-centred service', purpose: 'service_desk', formats: ['md', 'docx', 'html'],
      inputs: [txt('title', 'Article title', true), long('problem', 'Problem the teacher had', true), long('fix', 'Steps that solved it', true)],
      title: (c) => c.input.title ?? 'Help article',
      sections: (c) => [{ h: 'Problem', input: c.input.problem ?? '' }, { h: 'Steps', input: c.input.fix ?? '' }, { h: 'If it still does not work', p: 'Contact support and tell us what you see on screen. Do not include learner names.' }] }),
    A('support', 'SUP', { n: 3, name: 'Incident update', summary: 'Plain-language status update for users during an incident.', framework: 'ITIL incident communication', purpose: 'service_desk',
      inputs: [long('what', 'What is happening', true), long('impact', 'Who is affected'), long('next', 'Next update when')],
      sections: (c) => [{ h: 'What is happening', input: c.input.what ?? '' }, { h: 'Who is affected', input: c.input.impact ?? '' }, { h: 'What we are doing', input: '' }, { h: 'Next update', input: c.input.next ?? '' }] }),
  ],
};

export const government: Department = {
  id: 'government', name: 'Government & Partnerships', icon: 'Building2',
  mission: 'Work with the DBE, provincial departments, districts and partners. Policy is cited from source, never invented.',
  frameworks: ['Stakeholder mapping (power / interest)', 'Theory of change', 'Partnership MoU outline', 'Grant application structure'],
  widgets: [
    { id: 'leads', title: 'Funding and partnership leads', type: 'tracker', collection: 'funding_leads', seed: FUNDING_LEAD_SEED,
      note: 'Seeded with 43 leads researched from public pages on 11 Nov 2026. Contacts are unverified, so confirm on the funder’s own page before reaching out. Programmes marked “Closed, watch” are closed now; “Confirm” means the current call needs checking.',
      columns: [{ key: 'name', label: 'Lead', kind: 'text' }, { key: 'category', label: 'Category', kind: 'select', options: ['Government', 'Accelerator', 'Credits', 'Investor', 'Philanthropy', 'Corporate'] }, { key: 'fit', label: 'Fit', kind: 'select', options: ['High', 'Medium', 'Low', 'Later'] }, { key: 'availability', label: 'Availability', kind: 'select', options: ['Open now', 'Closed, watch', 'Confirm'] }, { key: 'stage', label: 'Stage', kind: 'select', options: ['Not started', 'Researching', 'Contacted', 'In talks', 'Applied', 'Declined'] }, { key: 'type', label: 'Type', kind: 'text' }, { key: 'timing', label: 'Timing', kind: 'text' }, { key: 'person', label: 'Contact person', kind: 'text' }, { key: 'contact', label: 'Contact details', kind: 'text' }, { key: 'why', label: 'Why it fits', kind: 'text' }] },
    { id: 'stake', title: 'Stakeholder map', type: 'tracker', note: 'Roles and organisations only.', collection: 'stakeholders', columns: [{ key: 'org', label: 'Organisation / body', kind: 'text' }, { key: 'role', label: 'Role', kind: 'text' }, { key: 'power', label: 'Power', kind: 'select', options: ['High', 'Medium', 'Low'] }, { key: 'interest', label: 'Interest', kind: 'select', options: ['High', 'Medium', 'Low'] }, { key: 'next', label: 'Next engagement', kind: 'text' }] },
    { id: 'gonboard', title: 'Partner onboarding', type: 'checklist', collection: 'partner_onboarding', items: ['Agreement or MoU signed', 'Roles for personal information recorded', 'Named contacts by role on both sides', 'Communications and branding rules agreed', 'Reporting rhythm and format agreed', 'Exit terms and data return agreed', 'Partner added to the stakeholder map'] },
    { id: 'tender', title: 'Tender requirements', type: 'tracker', collection: 'tender_requirements', note: 'Copy each requirement from the tender document. Nothing is pre-filled.', columns: [{ key: 'tender', label: 'Tender', kind: 'text' }, { key: 'req', label: 'Requirement', kind: 'text' }, { key: 'evidence', label: 'Evidence or document', kind: 'text' }, { key: 'owner', label: 'Owner (role)', kind: 'text' }, { key: 'status', label: 'Status', kind: 'select', options: ['Not started', 'In progress', 'Ready', 'Checked'] }] },
  ],
  agents: [
    A('government', 'GOV', { n: 1, name: 'Stakeholder engagement plan', summary: 'Who to engage, why, and how, for one objective.', framework: 'Power / interest mapping', purpose: 'public_sector_relations',
      inputs: [txt('objective', 'Objective', true), long('stakeholders', 'Stakeholders (organisations and roles)', true)],
      sections: (c) => [{ h: 'Objective', input: c.input.objective ?? '' }, { h: 'Stakeholders', input: c.input.stakeholders ?? '' }, { h: 'Plan', table: { headers: ['Stakeholder', 'Power', 'Interest', 'Approach', 'Owner (role)'], rows: blankRows(['Stakeholder 1', 'Stakeholder 2', 'Stakeholder 3'], 5) } }] }),
    A('government', 'GOV', { n: 2, name: 'Partnership MoU outline', summary: 'Outline of a memorandum of understanding for counsel.', framework: 'MoU structure', purpose: 'public_sector_relations', secondApprover: true,
      warning: 'Outline only. A lawyer drafts the actual agreement.',
      inputs: [txt('partner', 'Partner (organisation)', true), long('aim', 'Shared aim', true)],
      sections: (c) => [{ h: 'Parties and aim', kv: [['Partner', v(c, 'partner')], ['Aim', v(c, 'aim')]] }, { h: 'Clauses to settle', checks: ['Roles and responsibilities', 'Resources each party commits', 'Intellectual property', 'Data protection roles and rules', 'Communications and branding', 'Duration, review and exit', 'Dispute resolution'] }] }),
    A('government', 'GOV', { n: 3, name: 'Funding application skeleton', summary: 'Structure for a grant or tender response using only facts you can cite.', framework: 'Logic model + grant structure', purpose: 'public_sector_relations',
      warning: 'Cite policy only from the official source. Unverified policy statements must be marked as such.',
      inputs: [txt('funder', 'Funder / programme', true), long('need', 'Need you address (cite evidence)', true), long('activities', 'Activities')],
      sections: (c) => [{ h: 'Need', input: c.input.need ?? '' }, { h: 'Logic model', table: { headers: ['Inputs', 'Activities', 'Outputs', 'Outcomes', 'Evidence'], rows: [['', c.input.activities ?? '', '', '', '']] } }, { h: 'Technology and data protection', p: `The Ecosystem’s repository is at commit ${src(c, 'eco.head')}, with ${src(c, 'eco.stages')} logged build stages. Describe controls only as documented in docs/POPIA.md and docs/SECURITY.md.` }, { h: 'Budget and sustainability', input: '' }] }),
    A('government', 'GOV', { n: 4, name: 'District and provincial briefing note', summary: 'One-page briefing for an official, using only facts you can cite.', framework: 'Briefing note', purpose: 'public_sector_relations', formats: ['md', 'docx', 'pdf'],
      warning: 'Cite policy only from the official source. A fact with no source is flagged and must be cited or removed before the note goes out.',
      inputs: [txt('audience', 'Audience (role and office)', true), txt('purpose', 'Purpose of the note', true), long('facts', 'Facts, one per line: fact | source (document and page, or link)', true), txt('ask', 'What you are asking for')],
      sections: (c) => {
        const rows = (c.input.facts ?? '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0]).map((p) => [p[0], p[1] || 'No source given', p[1] ? 'Sourced' : 'Unsourced: cite or remove'] as (string | number)[]);
        return [{ h: 'To and purpose', kv: [['Audience', v(c, 'audience')], ['Purpose', v(c, 'purpose')], ['Ask', v(c, 'ask')]] }, { h: 'Key facts', table: { headers: ['Fact', 'Source', 'Status'], rows: rows.length ? rows : [[TBC, '', '']] } }, { h: 'Proposed next steps', table: { headers: ['Step', 'Owner (role)', 'By when'], rows: blankRows(['Step 1', 'Step 2'], 3) } }, { h: 'Before this is sent', checks: ['Every fact traced to an official source', 'Tone and length suit the audience’s office', 'Sent by a named person on the company’s behalf'] }];
      } }),
    A('government', 'GOV', { n: 5, name: 'Partner onboarding checklist', summary: 'Steps to bring a partner in: agreement, data roles, contacts and communications.', framework: 'Partnership onboarding', purpose: 'public_sector_relations', formats: ['md', 'xlsx'],
      inputs: [txt('partner', 'Partner (organisation)', true), long('scope', 'What the partner will do with us'), txt('start', 'Planned start')],
      sections: (c) => [{ h: 'Partner', kv: [['Partner', v(c, 'partner')], ['Planned start', v(c, 'start')]] }, { h: 'Scope', input: c.input.scope ?? '' }, { h: 'Onboarding steps', checks: ['Agreement or MoU signed (see the MoU outline agent)', 'Roles for personal information recorded: who decides, who processes', 'Named contacts by role on both sides', 'Communications and branding rules agreed', 'Reporting rhythm and format agreed', 'Exit terms and data return agreed', 'Partner added to the stakeholder map'] }, { h: 'Step owners', table: { headers: ['Step', 'Owner (role)', 'Due', 'Evidence'], rows: blankRows(['Agreement', 'Data roles', 'Contacts', 'Communications'], 4) } }] }),
    A('government', 'GOV', { n: 6, name: 'Funding pipeline review', summary: 'Review of the funding leads: counts by stage and the next action for each live lead.', framework: 'Pipeline review', purpose: 'public_sector_relations', formats: ['md', 'docx', 'csv'],
      inputs: [long('leads', 'Leads, one per line: name | stage | next action', true, 'Stages are Not started, Researching, Contacted, In talks, Applied, Declined.'), long('priorities', 'What matters most this month')],
      sections: (c) => {
        const STAGES = ['Not started', 'Researching', 'Contacted', 'In talks', 'Applied', 'Declined'];
        const rows = (c.input.leads ?? '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0]);
        const count = (s: string) => rows.filter((p) => p[1] === s).length;
        const unknown = rows.filter((p) => !STAGES.includes(p[1] ?? ''));
        const live = rows.filter((p) => ['Researching', 'Contacted', 'In talks', 'Applied'].includes(p[1]));
        return [{ h: 'Leads by stage', table: { headers: ['Stage', 'Count'], rows: STAGES.map((s) => [s, count(s)]) } }, ...(unknown.length ? [{ h: 'Needs a valid stage', bullets: unknown.map((p) => `${p[0]}: stage “${p[1] ?? ''}”`) }] : []), { h: 'Live leads and next action', table: { headers: ['Lead', 'Stage', 'Next action', 'Flag'], rows: live.length ? live.map((p) => [p[0], p[1], p[2] ?? '', p[2] ? '' : 'No next action recorded']) : [[TBC, '', '', '']] } }, { h: 'Priorities', input: c.input.priorities ?? '' }, { h: 'Reminders', bullets: ['Contacts in the tracker are unverified: confirm on the funder’s own page before reaching out.', 'Check closing dates and eligibility on the funder’s page before applying.'] }];
      } }),
    A('government', 'GOV', { n: 7, name: 'Policy watch note', summary: 'Note on a policy or circular. Every statement cites the official source.', framework: 'Policy watch', purpose: 'public_sector_relations', formats: ['md', 'docx'],
      warning: 'Cite policy only from the official source. Check the document is the current version before relying on it.',
      inputs: [txt('policy', 'Policy, circular or notice', true), txt('link', 'Link to the official source', true), long('statements', 'Statements, one per line: statement | section or page', true), long('relevance', 'Why this matters to the company')],
      sections: (c) => {
        const rows = (c.input.statements ?? '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p[0]).map((p) => [p[0], p[1] || 'Not given', p[1] ? 'Located in source' : 'Unverified: add the section or page'] as (string | number)[]);
        return [{ h: 'Source', kv: [['Policy', v(c, 'policy')], ['Official source', v(c, 'link')]] }, { h: 'What it says', table: { headers: ['Statement', 'Where in the source', 'Status'], rows: rows.length ? rows : [[TBC, '', '']] } }, { h: 'Why it matters to us', input: c.input.relevance ?? '' }, { h: 'Actions', table: { headers: ['Action', 'Owner (role)', 'By when'], rows: blankRows(['Action 1', 'Action 2'], 3) } }, { h: 'Before this is used', checks: ['Document is the current version, checked on the official source', 'Each statement located in the source', 'Reviewed by someone who knows the policy area'] }];
      } }),
    A('government', 'GOV', { n: 8, name: 'Tender and RFQ response checklist', summary: 'Checklist of what a tender asks for, built from the tender text you supply.', framework: 'Tender compliance matrix', purpose: 'public_sector_relations', formats: ['md', 'xlsx'],
      warning: 'Take every requirement from the tender document itself. The platform adds none and does not know what any tender requires.',
      inputs: [txt('tender', 'Tender reference and issuer', true), txt('closing', 'Closing date and time, as stated in the tender', true), long('reqs', 'Requirements, one per line, copied from the tender document', true)],
      sections: (c) => {
        const reqs = (c.input.reqs ?? '').split('\n').map((s) => s.trim()).filter(Boolean);
        return [{ h: 'Tender', kv: [['Reference and issuer', v(c, 'tender')], ['Closing', v(c, 'closing')]] }, { h: 'Requirements matrix', table: { headers: ['#', 'Requirement (from the tender)', 'Evidence or document', 'Owner (role)', 'Status'], rows: reqs.length ? reqs.map((r, i) => [i + 1, r, '', '', 'Not started']) : [[1, TBC, '', '', '']] } }, { h: 'Submission checks', checks: ['Closing date, time and place confirmed on the tender document', 'Submission method follows the tender (electronic or hard copy)', 'All forms completed and signed as the tender requires', 'Pricing schedule checked by a second person', 'Supporting documents are current as the tender requires', 'Submission receipt kept'] }];
      } }),
  ],
};
