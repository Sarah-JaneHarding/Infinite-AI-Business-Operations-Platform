import { defineAgent as A, long, num, pick, src, txt, v, blankRows, TBC } from './kit';
import type { Department } from './types';
import { burnMultiple, grossMargin, breakEven, nrr, runway, unitEconomics, variance, MEDDICC } from './calc';

const POPIA_CONDITIONS = ['Accountability', 'Processing limitation', 'Purpose specification', 'Further processing limitation', 'Information quality', 'Openness', 'Security safeguards', 'Data subject participation'];

export const security: Department = {
  id: 'security', name: 'Security & POPIA Compliance', icon: 'ShieldCheck',
  mission: 'Keep the company and the Ecosystem compliant with POPIA and secure by design. Compliance is a precondition, not a feature.',
  frameworks: ['POPIA eight conditions for lawful processing', 'Privacy impact assessment', 'ISO/IEC 27001-style control mapping', 'NIST CSF (Identify, Protect, Detect, Respond, Recover)', 'Breach response (POPIA s22)'],
  widgets: [
    { id: 'popia', title: 'POPIA eight conditions', type: 'checklist', collection: 'popia_conditions', items: POPIA_CONDITIONS.map((c) => `${c}: evidence recorded and reviewed`) },
    { id: 'oqs', title: 'Open questions (live from snapshot)', type: 'live', source: 'oq', note: 'Includes security items such as OQ-036 (MFA not shown as enforced in the Keycloak realm). Raised in the repository on 2026-10-24.' },
    { id: 'risks', title: 'Risk register', type: 'tracker', collection: 'risk', columns: [{ key: 'risk', label: 'Risk', kind: 'text' }, { key: 'category', label: 'Category', kind: 'select', options: ['Privacy', 'Security', 'Legal', 'Operational', 'Reputational', 'Financial'] }, { key: 'likelihood', label: 'Likelihood (L/M/H)', kind: 'select', options: ['Low', 'Medium', 'High'] }, { key: 'impact', label: 'Impact (L/M/H)', kind: 'select', options: ['Low', 'Medium', 'High'] }, { key: 'owner', label: 'Owner (role)', kind: 'text' }, { key: 'treatment', label: 'Treatment', kind: 'text' }] },
    { id: 'breach', title: 'Incident / breach log', type: 'tracker', collection: 'breach_log', columns: [{ key: 'what', label: 'What happened (no personal data)', kind: 'text' }, { key: 'detected', label: 'Detected', kind: 'date' }, { key: 'regulator', label: 'Regulator told?', kind: 'select', options: ['Not required', 'Decision pending', 'Yes'] }, { key: 'subjects', label: 'Data subjects told?', kind: 'select', options: ['Not required', 'Decision pending', 'Yes'] }] },
  ],
  agents: [
    A('security', 'SEC', { n: 1, name: 'POPIA conditions assessment', summary: 'Assess a process or system against the eight conditions for lawful processing.', framework: 'POPIA eight conditions', purpose: 'compliance_review', secondApprover: true, formats: ['md', 'docx', 'xlsx', 'html', 'pdf'],
      warning: 'This is a working assessment, not legal advice. The Information Officer and counsel decide.',
      inputs: [txt('process', 'Process or system assessed', true), long('data', 'Categories of personal information involved (categories only, no real data)', true), long('purpose', 'Purpose of processing'), txt('basis', 'Lawful basis you rely on')],
      sections: (c) => [
        { h: 'Scope', kv: [['Process', v(c, 'process')], ['Purpose', v(c, 'purpose')], ['Lawful basis', v(c, 'basis')]] },
        { h: 'Personal information involved', input: c.input.data ?? '' },
        { h: 'Assessment against the eight conditions', table: { headers: ['Condition', 'Question', 'Finding', 'Evidence', 'Action / owner'], rows: [['Accountability', 'Is a responsible party and Information Officer named?', '', '', ''], ['Processing limitation', 'Lawful, minimal, with a justification (s11) and consent where needed?', '', '', ''], ['Purpose specification', 'Is the purpose specific and retention defined?', '', '', ''], ['Further processing limitation', 'Is any new use compatible with the original purpose?', '', '', ''], ['Information quality', 'Is the data complete, accurate and updated?', '', '', ''], ['Openness', 'Are data subjects informed and records maintained?', '', '', ''], ['Security safeguards', 'Are technical and organisational measures in place, and operators bound by written contract?', '', '', ''], ['Data subject participation', 'Can people access, correct and delete?', '', '', '']] } },
        { h: 'Special categories and children', callout: { tone: 'warn', text: 'Information about children and other special personal information carries extra conditions. Escalate to the Information Officer before any processing. The Ecosystem’s rule is that learner-level data never enters the operations platform.' } },
        { h: 'Cross-border and operators', checks: ['Every operator (hosting, AI provider) has a written contract', 'Any transfer outside South Africa meets the cross-border conditions (s72)', 'Sub-processors are listed'] },
      ] }),
    A('security', 'SEC', { n: 2, name: 'Breach response plan', summary: 'Decision record and checklist for a suspected security compromise.', framework: 'POPIA s22 + NIST CSF Respond', purpose: 'compliance_review', secondApprover: true,
      warning: 'POPIA s22 requires notification to the Regulator and affected data subjects as soon as reasonably possible after discovery. Confirm the current requirements and form with counsel and the Information Regulator.',
      inputs: [long('incident', 'What happened (facts only, no personal data)', true), txt('detected', 'When detected'), long('systems', 'Systems affected')],
      sections: (c) => [
        { h: 'Facts', input: c.input.incident ?? '' }, { h: 'Systems affected', input: c.input.systems ?? '' },
        { h: 'Response checklist', checks: ['Contain: stop the compromise and preserve evidence', 'Assess: what personal information, how many data subjects, what risk of harm', 'Decide: notify the Information Regulator and affected data subjects (record who decided and when)', 'Notify: with the information the law requires', 'Operators informed where they hold the data', 'Eradicate and recover; confirm with a test', 'Blameless review within an agreed time; record lessons'] },
        { h: 'Decision record', kv: [['Decision maker (role)', TBC], ['Regulator notified', TBC], ['Data subjects notified', TBC], ['Time of decision', TBC]] },
      ] }),
    A('security', 'SEC', { n: 3, name: 'Security control mapping', summary: 'Map an open security question to controls and an owner (ISO 27001-style).', framework: 'ISO/IEC 27001-style Annex A mapping', purpose: 'compliance_review',
      inputs: [txt('issue', 'Issue or control gap (for example OQ-036 MFA)', true), long('context', 'Context')],
      sections: (c) => [{ h: 'Issue', input: c.input.issue ?? '' }, { h: 'Context', input: c.input.context ?? '' }, { h: 'Control mapping', table: { headers: ['Domain', 'Control objective', 'Current state (evidence)', 'Gap', 'Owner (role)', 'Target date'], rows: [['Access control', 'Strong authentication for privileged and school-admin access', '', '', '', ''], ['Cryptography', 'Keys and secrets managed outside the repo', '', '', '', ''], ['Operations', 'Logging and monitoring of access', '', '', '', ''], ['Supplier relationships', 'Operators bound by contract', '', '', '', '']] } }, { h: 'Risk treatment', p: 'Choose one for each gap: mitigate, accept (named owner), transfer or avoid. Record the decision in the risk register.' }] }),
  ],
};

export const legal: Department = {
  id: 'legal', name: 'Legal & Contracts', icon: 'Scale',
  mission: 'Standard terms, school agreements and operator agreements, drafted for a lawyer to review. The platform never gives legal advice.',
  frameworks: ['Contract lifecycle management', 'Clause playbook with fall-backs', 'POPIA operator agreement (s20–21)', 'ECTA electronic signatures'],
  widgets: [
    { id: 'contracts', title: 'Contract register', type: 'tracker', collection: 'contracts', columns: [{ key: 'counterparty', label: 'Counterparty (organisation)', kind: 'text' }, { key: 'type', label: 'Type', kind: 'select', options: ['School agreement', 'Operator agreement', 'NDA', 'Supplier', 'Partnership', 'Employment'] }, { key: 'status', label: 'Status', kind: 'select', options: ['Drafting', 'Counsel review', 'Negotiation', 'Signed', 'Expired'] }, { key: 'renewal', label: 'Renewal / expiry', kind: 'date' }, { key: 'owner', label: 'Owner (role)', kind: 'text' }] },
    { id: 'clauses', title: 'Core clause checklist', type: 'checklist', collection: 'clause_check', items: ['Parties, scope and term', 'Fees, invoicing and VAT treatment', 'Data protection: roles (responsible party / operator) and instructions', 'Security measures and breach notification duties', 'Cross-border transfer terms', 'Intellectual property and licence of content', 'Service levels and support', 'Limitation of liability', 'Termination and data return / deletion', 'Governing law and dispute resolution'] },
  ],
  agents: [
    A('legal', 'LEG', { n: 1, name: 'Contract review sheet', summary: 'Clause-by-clause review sheet for a counterparty contract you paste in.', framework: 'Clause playbook with fall-backs', purpose: 'contract_review', secondApprover: true,
      warning: 'Not legal advice. A qualified South African attorney must review before signature.',
      inputs: [txt('counterparty', 'Counterparty (organisation)', true), pick('kind', 'Contract type', ['School agreement', 'Operator agreement', 'NDA', 'Supplier', 'Partnership'], true), long('text', 'Contract text or key clauses (no personal data)', true)],
      sections: (c) => [{ h: 'Contract under review', input: c.input.text ?? '' }, { h: 'Clause review', table: { headers: ['Clause', 'What it says', 'Risk (H/M/L)', 'Preferred position', 'Fall-back'], rows: blankRows(['Term and renewal', 'Fees and payment', 'Data protection roles', 'Security and breach', 'IP and licence', 'Liability cap', 'Termination and exit', 'Governing law'], 5) } }, { h: 'Questions for counsel', ol: [TBC, TBC] }] }),
    A('legal', 'LEG', { n: 2, name: 'Operator agreement outline (POPIA)', summary: 'Outline of the terms a school (responsible party) and Infinite-AI (operator) should settle in writing.', framework: 'POPIA operator obligations', purpose: 'contract_review', secondApprover: true,
      warning: 'Outline for counsel to turn into a contract. Not legal advice.',
      inputs: [txt('party', 'School / responsible party (organisation)', true), long('processing', 'Processing the operator will do')],
      sections: (c) => [{ h: 'Parties', kv: [['Responsible party', v(c, 'party')], ['Operator', 'Infinite-AI']] }, { h: 'Processing', input: c.input.processing ?? '' }, { h: 'Terms to settle', checks: ['Process only on documented instructions', 'Confidentiality of personnel', 'Security measures and how they are evidenced', 'Notification of any security compromise to the responsible party', 'Sub-operators and approval', 'Cross-border transfers', 'Assistance with data subject requests', 'Return or deletion at the end', 'Audit and information rights'] }] }),
    A('legal', 'LEG', { n: 3, name: 'NDA triage', summary: 'Quick triage of an incoming NDA against a standard position.', framework: 'Clause playbook', purpose: 'contract_review',
      warning: 'Triage only. Counsel decides.', inputs: [txt('counterparty', 'Counterparty', true), long('text', 'NDA text', true)],
      sections: (c) => [{ h: 'Text', input: c.input.text ?? '' }, { h: 'Triage', table: { headers: ['Point', 'Standard position', 'This NDA', 'Flag'], rows: [['Mutual or one-way', 'Mutual', '', ''], ['Definition of confidential information', 'Reasonably narrow', '', ''], ['Term and survival', 'Fixed, with defined survival', '', ''], ['Permitted disclosures', 'Advisers, law, regulators', '', ''], ['Return / destruction', 'On request', '', ''], ['Governing law', 'South Africa', '', '']] } }] }),
  ],
};

const FIN_NOTE = 'Calculators use only the numbers you type in. No benchmarks or assumptions are pre-filled.';
export const finance: Department = {
  id: 'finance', name: 'Finance', icon: 'Landmark',
  mission: 'Plan, forecast and report from your own numbers. Nothing here invents a financial figure.',
  frameworks: ['Three-statement forecast', 'Unit economics (CAC, LTV, payback)', 'Net revenue retention', 'Burn multiple', 'Budget vs actual variance analysis', 'Rolling cash forecast'],
  widgets: [
    { id: 'runway', title: 'Runway', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'cash', label: 'Cash on hand', unit: 'R' }, { key: 'burn', label: 'Monthly net burn', unit: 'R' }], compute: (x) => runway(x.cash, x.burn) },
    { id: 'unit', title: 'Unit economics', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'cac', label: 'CAC', unit: 'R' }, { key: 'arpa', label: 'Monthly revenue per account', unit: 'R' }, { key: 'gm', label: 'Gross margin', unit: '%' }, { key: 'churn', label: 'Monthly churn', unit: '%' }], compute: (x) => unitEconomics(x.cac, x.arpa, x.gm, x.churn) },
    { id: 'nrr', title: 'Net revenue retention', type: 'calc', note: FIN_NOTE, inputs: [{ key: 's', label: 'Starting MRR', unit: 'R' }, { key: 'e', label: 'Expansion', unit: 'R' }, { key: 'c', label: 'Contraction', unit: 'R' }, { key: 'ch', label: 'Churned', unit: 'R' }], compute: (x) => nrr(x.s, x.e, x.c, x.ch) },
    { id: 'burnm', title: 'Burn multiple', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'b', label: 'Net burn', unit: 'R' }, { key: 'n', label: 'Net new ARR', unit: 'R' }], compute: (x) => burnMultiple(x.b, x.n) },
    { id: 'margin', title: 'Gross margin', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'r', label: 'Revenue', unit: 'R' }, { key: 'c', label: 'Cost of revenue', unit: 'R' }], compute: (x) => grossMargin(x.r, x.c) },
    { id: 'be', title: 'Break-even', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'f', label: 'Fixed costs', unit: 'R' }, { key: 'p', label: 'Price per unit', unit: 'R' }, { key: 'v', label: 'Variable cost per unit', unit: 'R' }], compute: (x) => breakEven(x.f, x.p, x.v) },
    { id: 'var', title: 'Budget vs actual', type: 'calc', note: FIN_NOTE, inputs: [{ key: 'b', label: 'Budget', unit: 'R' }, { key: 'a', label: 'Actual', unit: 'R' }], compute: (x) => variance(x.b, x.a) },
    { id: 'budget', title: 'Budget lines', type: 'tracker', collection: 'budget', columns: [{ key: 'line', label: 'Line', kind: 'text' }, { key: 'budget', label: 'Budget (R)', kind: 'number' }, { key: 'actual', label: 'Actual (R)', kind: 'number' }, { key: 'note', label: 'Note', kind: 'text' }] },
  ],
  agents: [
    A('finance', 'FIN', { n: 1, name: 'Monthly management commentary', summary: 'Variance commentary built from figures you supply.', framework: 'Budget vs actual variance analysis', purpose: 'financial_planning', formats: ['md', 'docx', 'xlsx', 'html', 'pdf'],
      inputs: [txt('month', 'Month', true), long('lines', 'Lines, one per row: name | budget | actual', true), long('notes', 'Context for the variances')],
      sections: (c) => {
        const rows = (c.input.lines ?? '').split('\n').map((l) => l.split('|').map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]).map((p) => {
          const [b, a] = [Number(p[1].replace(/[R,\s]/g, '')), Number(p[2].replace(/[R,\s]/g, ''))];
          const ok = Number.isFinite(b) && Number.isFinite(a);
          return [p[0], p[1], p[2], ok ? a - b : 'n/a', ok && b !== 0 ? `${(((a - b) / b) * 100).toFixed(1)}% [src:computed from your inputs]` : 'n/a'] as (string | number)[];
        });
        return [{ h: 'Variance table (computed from your figures)', table: { headers: ['Line', 'Budget', 'Actual', 'Variance', 'Variance %'], rows: rows.length ? rows : [[TBC, '', '', '', '']] } }, { h: 'Drivers', input: c.input.notes ?? '' }, { h: 'Actions', ol: [TBC, TBC] }];
      } }),
    A('finance', 'FIN', { n: 2, name: 'Pricing options analysis', summary: 'Compare pricing structures using your own costs and assumptions. The platform supplies the structure, never the prices.', framework: 'Value-based pricing + unit economics', purpose: 'financial_planning', secondApprover: true,
      inputs: [long('options', 'Pricing options (for example per-learner, per-school flat, tiered)', true), long('costs', 'Your cost per school / per learner and how you know'), long('buyers', 'What a school can pay and how it budgets')],
      sections: (c) => [{ h: 'Options', input: c.input.options ?? '' }, { h: 'Cost to serve', input: c.input.costs ?? '' }, { h: 'Buyer context', input: c.input.buyers ?? '' }, { h: 'Comparison', table: { headers: ['Option', 'Price (you set)', 'Gross margin (calculator)', 'Fit for school budgeting', 'Risks'], rows: blankRows(['Option A', 'Option B', 'Option C'], 5) } }, { h: 'Note', callout: { tone: 'warn', text: 'Reconcile any pricing language in marketing material with the approved price list before it is used externally.' } }] }),
    A('finance', 'FIN', { n: 3, name: 'Rolling 13-week cash forecast', summary: 'Template for weekly cash in and out with an opening balance you enter.', framework: 'Rolling cash forecast', purpose: 'financial_planning', formats: ['md', 'xlsx', 'csv'],
      inputs: [num('opening', 'Opening cash balance (R)', true), long('assumptions', 'Assumptions and sources')],
      sections: (c) => [{ h: 'Opening balance', kv: [['Opening cash', `R ${c.input.opening ?? ''}`]] }, { h: 'Weekly forecast (fill each week)', table: { headers: ['Week', 'Cash in', 'Cash out', 'Net', 'Closing'], rows: Array.from({ length: 13 }, (_, i) => [`Week ${i + 1}`, '', '', '', '']) } }, { h: 'Assumptions', input: c.input.assumptions ?? '' }] }),
  ],
};

export const sales: Department = {
  id: 'sales', name: 'Sales & CRM', icon: 'Handshake',
  mission: 'Win schools with a clear qualification discipline. CRM holds organisations and roles, never learner data.',
  frameworks: ['MEDDICC qualification', 'Mutual action plan', 'Pipeline stages with exit criteria', 'Account planning'],
  widgets: [
    { id: 'pipeline', title: 'Pipeline (CRM)', type: 'tracker', note: 'Organisations and roles only. Do not store personal details of individuals or any learner data.', collection: 'crm_pipeline', columns: [{ key: 'school', label: 'School / organisation', kind: 'text' }, { key: 'province', label: 'Province', kind: 'text' }, { key: 'stage', label: 'Stage', kind: 'select', options: ['Lead', 'Qualified', 'Demo', 'Pilot', 'Proposal', 'Won', 'Lost'] }, { key: 'buyer', label: 'Economic buyer (role)', kind: 'text' }, { key: 'value', label: 'Value (R)', kind: 'number' }, { key: 'next', label: 'Next step', kind: 'text' }, { key: 'due', label: 'Due', kind: 'date' }] },
    { id: 'meddicc', title: 'MEDDICC qualification', type: 'checklist', collection: 'meddicc', items: [...MEDDICC].map((m) => `${m}: evidenced`) },
  ],
  agents: [
    A('sales', 'SALES', { n: 1, name: 'School account plan', summary: 'Account plan for one school, qualified with MEDDICC and a mutual action plan.', framework: 'MEDDICC + account planning', purpose: 'sales_pipeline',
      inputs: [txt('school', 'School / organisation', true), long('pain', 'Pain the school has told you about', true), long('buying', 'Who decides and how the school buys (roles, governing body, budget cycle)'), long('competition', 'Alternatives they use today')],
      sections: (c) => [{ h: 'Account', kv: [['School', v(c, 'school')]] }, { h: 'Pain', input: c.input.pain ?? '' }, { h: 'Buying process', input: c.input.buying ?? '' }, { h: 'MEDDICC', table: { headers: ['Element', 'What we know', 'Evidence', 'Gap to close'], rows: [...MEDDICC].map((m) => [m, '', '', '']) } }, { h: 'Alternatives', input: c.input.competition ?? '' }, { h: 'Mutual action plan', table: { headers: ['Step', 'Owner (school / us)', 'Date'], rows: blankRows(['Demo', 'Pilot agreement', 'Operator agreement signed', 'Onboarding', 'Review'], 3) } }] }),
    A('sales', 'SALES', { n: 2, name: 'Discovery call prep', summary: 'Questions and goals for a discovery call with a school leader.', framework: 'MEDDICC discovery', purpose: 'sales_pipeline',
      inputs: [txt('school', 'School', true), txt('role', 'Role of the person you are meeting', true), long('known', 'What you already know')],
      sections: (c) => [{ h: 'Goal of the call', p: 'Leave with: confirmed pain, the decision process, and an agreed next step.' }, { h: 'Known so far', input: c.input.known ?? '' }, { h: 'Questions', ol: ['How do teachers plan lessons today, and what takes the most time?', 'What does the school do about assessment evidence for CAPS?', 'Who needs to agree before the school adopts a new tool?', 'How does the school budget for software, and when?', 'How do you protect learner information today?', 'What would make a pilot a success for you?'] }, { h: 'Next step to propose', input: '' }] }),
    A('sales', 'SALES', { n: 3, name: 'Proposal outline', summary: 'Proposal structure for a school, with scope, responsibilities and POPIA positioning.', framework: 'Mutual action plan + consultative proposal', purpose: 'sales_pipeline', secondApprover: true,
      inputs: [txt('school', 'School', true), long('scope', 'Scope agreed in conversation', true), long('commercials', 'Commercial terms approved by Finance')],
      sections: (c) => [{ h: 'Their situation', p: 'Restate in the school’s own words.' }, { h: 'What we will do', input: c.input.scope ?? '' }, { h: 'How AI is used and controlled', bullets: ['AI drafts. The teacher decides.', 'No learner personal information in prompts', 'Every action is recorded in an audit trail', 'Operator agreement under POPIA'] }, { h: 'Commercials', input: c.input.commercials ?? '' }, { h: 'Timeline and responsibilities', table: { headers: ['Milestone', 'Date', 'School', 'Infinite-AI'], rows: blankRows(['Agreement', 'Onboarding', 'Pilot start', 'Review'], 4) } }] }),
  ],
};
void src;
