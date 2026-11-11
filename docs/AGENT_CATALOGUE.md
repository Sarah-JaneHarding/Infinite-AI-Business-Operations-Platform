# Agent catalogue

Roles, tasks and specialist agents for the 16 business operations departments. **Roles are drafted for the founder to review**: the repository defines none, so rename, merge or drop any of them. Each role has two tasks, and each task has one agent.

- 100 agents in total: 100 built, 0 planned.
- Every agent drafts for a human, needs approval, and invents no numbers or policy. Agents marked **2nd** need a second approver.
- Ids follow `OPS-<CODE>-nn`. Existing agents keep their numbers. New ones continue from 04.
- All 100 agents are built. The Batch number in the source is the order they were built: Finance and Government first, then one department per batch.

| Department | Roles | Agents | Built | Planned |
|---|---|---|---|---|
| Executive & Strategy | 3 | 6 | 6 | 0 |
| Product & Engineering | 3 | 6 | 6 | 0 |
| Curriculum & Pedagogy QA | 3 | 6 | 6 | 0 |
| AI, Brain & Evals | 3 | 6 | 6 | 0 |
| Security & POPIA Compliance | 3 | 6 | 6 | 0 |
| Legal & Contracts | 3 | 6 | 6 | 0 |
| Finance | 4 | 8 | 8 | 0 |
| Sales & CRM | 3 | 6 | 6 | 0 |
| Marketing & Brand | 3 | 6 | 6 | 0 |
| Customer Success & Pilots | 3 | 6 | 6 | 0 |
| Support & Service Desk | 3 | 6 | 6 | 0 |
| Government & Partnerships | 4 | 8 | 8 | 0 |
| People & Culture | 3 | 6 | 6 | 0 |
| IT, DevOps & SRE | 3 | 6 | 6 | 0 |
| Procurement & Vendors | 3 | 6 | 6 | 0 |
| Research, Impact & Knowledge | 3 | 6 | 6 | 0 |

## Executive & Strategy

### Chief of Staff

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-EXEC-01 | Board update pack | Board pack from the ecosystem snapshot and the figures you supply. | Period; Highlights; Asks of the board | md, docx, pdf |  | Built |
| OPS-EXEC-02 | OKR drafter | Objectives and key results with owners and a check-in rhythm. | Focus area; Candidate objectives | md, docx, xlsx | OKR tracker | Built |

### Strategy Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-EXEC-03 | Decision memo | Six-page-style memo with options, the one-way or two-way door call and a decision record. | Decision; Options; Evidence | md, docx, pdf | Decision log | Built |
| OPS-EXEC-04 | Scenario and risk review | Two or three scenarios with typed assumptions, risks, triggers and an owner for each. | Decision at stake; Scenarios; Assumptions with sources | md, docx, xlsx |  | Built |

### Company Secretary

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-EXEC-05 | Meeting minutes and action log | Minutes from your notes, with actions, owners and due dates ready for the action tracker. | Agenda; Notes; Attendees (roles) | md, docx, csv | Action tracker (new) | Built |
| OPS-EXEC-06 | Statutory and compliance calendar | Calendar of filings and renewals to confirm. Every date is marked "confirm with the official source". | Entity facts; Known deadlines | md, xlsx, csv | Compliance calendar checklist (new) | Built |

## Product & Engineering

### Product Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PROD-01 (2nd) | Ecosystem stage-gate proposal | Proposal using the ecosystem’s own stage-gate rules and live repository status. | Initiative; Gate sought | md, docx, pdf | Live pull requests | Built |
| OPS-PROD-02 | RICE backlog prioritiser | Backlog ranked by RICE from the reach, impact, confidence and effort you type. | Backlog items; RICE inputs | md, xlsx, csv | RICE calculator | Built |

### Engineering Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PROD-03 | Architecture decision record | ADR with context, options, decision and consequences. | Context; Options; Decision | md, docx |  | Built |
| OPS-PROD-04 | Release readiness checklist | Go or no-go sheet from release scope, live CI status and open questions. | Release scope; Known risks | md, docx, pdf | Live CI | Built |

### Product Designer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PROD-05 | Teacher usability test plan | Task script and observation grid for sessions with teachers. No learner data. | Feature; Tasks to test; Participant roles | md, docx, csv | Findings tracker (new) | Built |
| OPS-PROD-06 | Accessibility review sheet | WCAG 2.2 checklist per screen with space for evidence and fixes. | Screens or flows; Assistive technology used | md, xlsx | Accessibility checklist (new) | Built |

## Curriculum & Pedagogy QA

### Curriculum Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CURR-01 | Lesson plan QA review | Quality review of a lesson plan against the CAPS reference you cite. | Lesson plan; CAPS reference | md, docx, pdf |  | Built |
| OPS-CURR-02 | Backward-design unit planner | Unit plan built from outcomes back to activities. | Grade and term; Outcomes from CAPS | md, docx |  | Built |

### Assessment Specialist

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CURR-04 | CAPS-aligned assessment task and rubric | Task, rubric and memo template for a topic you cite from CAPS. | Grade, subject, term; CAPS topic and page | md, docx, pdf |  | Built |
| OPS-CURR-05 | Moderation record | Moderation checklist and record for sampled tasks, by learner code only. | Tasks sampled; Moderator role | md, docx, csv | Moderation checklist (new) | Built |

### Inclusion and Language Specialist

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CURR-03 | Differentiation and support sheet | Support and extension strategies for a lesson. | Lesson; Barriers to learning (general) | md, docx |  | Built |
| OPS-CURR-06 | Home-language glossary check | Term list laid out for a first-language speaker to verify. Unreviewed machine translation is never used. | Term list; Languages | md, docx, csv |  | Built |

## AI, Brain & Evals

### Brain Governance Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-AI-01 | Agent roster reconciliation | Reconciles what the docs say with the contracts in the repository (OPQ-005). | Docs count; Repository count | md, docx |  | Built |
| OPS-AI-02 (2nd) | Model risk assessment | Risk assessment for a model or use case. | Use case; Data involved | md, docx, pdf |  | Built |

### Evaluation Engineer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-AI-03 | Eval plan | Evaluation plan with test sets, thresholds you set, and an owner. | Agent; Thresholds | md, docx |  | Built |
| OPS-AI-04 | Eval results review | Pass or fail table against your thresholds from results you type. | Eval run results; Thresholds | md, xlsx, csv |  | Built |

### Guardrail Engineer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-AI-05 (2nd) | Guardrail rule change proposal | Proposed change to a guardrail with the risk it addresses and a test to prove it. | Rule; Reason; Test | md, docx |  | Built |
| OPS-AI-06 | Prompt change review | Risk notes on a prompt diff: scope creep, data exposure, claims. | Prompt diff; Agent | md, docx |  | Built |

## Security & POPIA Compliance

### Information Officer Support

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SEC-01 (2nd) | POPIA conditions assessment | Assessment against the eight conditions for lawful processing. | Processing activity | md, docx, pdf | POPIA eight conditions | Built |
| OPS-SEC-02 (2nd) | Breach response plan | Plan for detecting, containing and notifying. | Systems in scope | md, docx, pdf |  | Built |

### Security Engineer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SEC-03 | Security control mapping | Maps controls to ISO/IEC 27001-style themes and NIST CSF. | Controls in place | md, xlsx, csv | Risk register | Built |
| OPS-SEC-05 | Access review | Least-privilege review of roles and who holds them, by role not name. | Roles and access list | md, xlsx, csv | Access review checklist (new) | Built |

### Privacy Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SEC-04 (2nd) | Data subject request response | Response checklist for a POPIA access, correction or deletion request, by reference code only. | Request type; Date received | md, docx | Request log (new) | Built |
| OPS-SEC-06 | Operator register review | Checks that each operator has a written agreement and security measures recorded. | Operator list | md, xlsx, csv |  | Built |

## Legal & Contracts

### Contracts Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-LEG-01 (2nd) | Contract review sheet | Issue list for counsel. Not legal advice. | Contract text or terms | md, docx |  | Built |
| OPS-LEG-03 | NDA triage | First-pass triage of an NDA against your standard positions. | NDA terms | md, docx |  | Built |

### Data Protection Counsel Liaison

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-LEG-02 (2nd) | Operator agreement outline (POPIA) | Outline of a POPIA operator agreement for counsel. | Operator; Processing | md, docx |  | Built |
| OPS-LEG-05 (2nd) | Privacy notice outline | Outline of a notice covering what POPIA requires you to tell people, for counsel to finalise. | Data collected; Purposes | md, docx |  | Built |

### Commercial Counsel Liaison

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-LEG-04 (2nd) | School agreement term sheet | Term sheet for a school agreement using the approved price card and your own terms. | Pricing option chosen; Term and renewal | md, docx |  | Built |
| OPS-LEG-06 | Obligation and renewal register | Register of dates and duties from signed contracts. | Contracts and dates | md, xlsx, csv | Obligation register (new) | Built |

## Finance

### Financial Controller

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-FIN-01 | Monthly management commentary | Variance commentary built from the figures you supply. | Month; Budget and actual lines | md, docx, xlsx, html, pdf | Budget vs actual | Built |
| OPS-FIN-04 | Month-end close checklist | Close checklist with owners and sign-off, for the accountant to complete. | Month; Systems and accounts in scope | md, xlsx | Close checklist (new) | Built |

### FP&A Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-FIN-02 (2nd) | Pricing options analysis | Compares pricing structures from your own costs and assumptions. | Options; Costs; Buyer context | md, docx, xlsx | School quote calculator | Built |
| OPS-FIN-05 (2nd) | School quote pack | Customer-ready quote for one school from learners and educators, computed by the platform’s pricing formula. Standard and community rates, annual prepay, VAT. | School; Learners; Educators; Rate type | md, docx, pdf | School quote calculator | Built |

### Treasury Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-FIN-03 | Rolling 13-week cash forecast | Weekly cash in and out from an opening balance you enter. | Opening balance; Assumptions | md, xlsx, csv | Runway | Built |
| OPS-FIN-06 | Runway and funding scenarios | Runway under funding scenarios you type, showing the month cash runs out in each. | Cash on hand; Monthly burn; Funding scenarios | md, xlsx, csv | Runway | Built |

### Revenue and Grants Accountant

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-FIN-07 | Debtors follow-up schedule | Follow-up schedule and draft reminder wording for overdue school accounts. Draft only: nothing is sent (OPQ-003, OPQ-004). | Accounts overdue (school and amount); Terms agreed | md, docx, csv | Debtors tracker (new) | Built |
| OPS-FIN-08 (2nd) | Grant budget and drawdown report | Budget against drawdowns for a funder, laid out the way the funder asks. | Funder; Approved budget; Spend to date | md, xlsx, csv | Grant tracker (new) | Built |

## Sales & CRM

### Account Executive

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SALES-01 | School account plan | Plan for one school: roles, needs, next steps. | School; Roles known | md, docx | MEDDICC | Built |
| OPS-SALES-02 | Discovery call prep | Questions and goals for a discovery call. | School; Attendees (roles) | md, docx |  | Built |

### Sales Operations

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SALES-04 | Pipeline review | Weekly review with MEDDICC coverage per opportunity from what the rep can evidence. | Opportunities; MEDDICC evidence | md, xlsx, csv | MEDDICC | Built |
| OPS-SALES-05 | Win and loss review | Structured review of why a school bought or did not, from the rep’s notes. | Outcome; Notes | md, docx |  | Built |

### Solutions Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SALES-03 (2nd) | Proposal outline | Outline of a proposal using the approved price card. | School; Needs | md, docx, pdf | School quote calculator | Built |
| OPS-SALES-06 | Teacher demo script | Demo script built around a teacher’s day, with no learner data on screen. | Audience; Features to show | md, docx |  | Built |

## Marketing & Brand

### Campaign Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-MKT-01 | Campaign brief | Brief with audience, message and measures. | Goal; Audience | md, docx |  | Built |
| OPS-MKT-04 | Content calendar builder | Month of posts across channels, ready for the calendar tracker. | Month; Pillars; Channels | md, csv | Content calendar | Built |

### Content Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-MKT-02 | Post / email draft | Draft in the Infinite-AI voice, to be checked against the claims review. | Topic; Audience | md, docx | Brand voice check | Built |
| OPS-MKT-05 | Case study draft | Case study built only from pilot evidence you supply, with a consent checklist for the school. | School (with consent); Evidence | md, docx |  | Built |

### Brand and Compliance Reviewer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-MKT-03 | Brand and claims review | Checks claims against evidence and the brand voice. | Draft to review | md, docx | Brand voice check | Built |
| OPS-MKT-06 | Direct-marketing consent audit (POPIA s69) | Checks each list and message against the section 69 conditions. | List source; Message | md, docx | Direct-marketing check | Built |

## Customer Success & Pilots

### Onboarding Specialist

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CS-01 | Pilot plan | Plan following the ecosystem’s pilot protocol. | School; Pilot scope | md, docx |  | Built |
| OPS-CS-04 | School onboarding checklist | Checklist from agreement to first lesson, with owners. | School; Start date | md, xlsx | Onboarding checklist (new) | Built |

### Customer Success Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CS-02 | Quarterly business review | Review pack from usage figures and feedback you supply. | School; Usage figures | md, docx, pdf |  | Built |
| OPS-CS-03 | Renewal playbook | Steps and talking points ahead of a renewal. | School; Renewal date | md, docx |  | Built |

### Training Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-CS-05 | Teacher training session plan | Session plan with outcomes, activities and a short feedback form. | Audience; Duration | md, docx |  | Built |
| OPS-CS-06 | Training feedback summary | Summary of feedback results you type in, with no names. | Survey results | md, docx, csv |  | Built |

## Support & Service Desk

### Support Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SUP-01 | Ticket triage | Priority and routing for a ticket described without personal data. | Ticket summary | md, json | Priority matrix | Built |
| OPS-SUP-06 | Ticket trend review | Themes and counts from ticket categories you type. | Period; Category counts | md, xlsx, csv |  | Built |

### Knowledge Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SUP-02 | Knowledge base article | How-to article for teachers. | Question; Steps | md, html |  | Built |
| OPS-SUP-05 | Response macro library | Reusable reply wording for common questions, for the support lead to approve. | Common questions | md, docx |  | Built |

### Incident Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SUP-03 | Incident update | Customer-facing update for an incident. | Incident; Status | md, html |  | Built |
| OPS-SUP-04 | Escalation handoff note | Handoff from support to engineering with the facts and what has been tried. | Ticket summary; Steps tried | md, docx |  | Built |

## Government & Partnerships

### Public Sector Relations Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-GOV-01 | Stakeholder engagement plan | Who to engage, why and how, for one objective. | Objective; Stakeholders | md, docx | Stakeholder map | Built |
| OPS-GOV-04 | District and provincial briefing note | One-page briefing for an official, using only facts you can cite. | Audience; Purpose; Facts with sources | md, docx, pdf |  | Built |

### Partnerships Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-GOV-02 (2nd) | Partnership MoU outline | Outline of a memorandum of understanding for counsel. | Partner; Shared aim | md, docx |  | Built |
| OPS-GOV-05 | Partner onboarding checklist | Steps to bring a partner in: agreement, data roles, contacts, communications. | Partner; Scope | md, xlsx | Onboarding checklist (new) | Built |

### Funding and Grants Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-GOV-03 | Funding application skeleton | Structure for a grant or tender response using facts you can cite. | Funder; Need; Activities | md, docx | Funding and partnership leads | Built |
| OPS-GOV-06 | Funding pipeline review | Counts leads by stage and lists the next action for each live lead, flagging any with none recorded. | Leads, one per line (name, stage, next action); Priorities | md, docx, csv | Funding and partnership leads | Built |

### Policy Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-GOV-07 | Policy watch note | Note on a policy or circular. Every statement cites the official source, and unverified statements are flagged. | Policy or circular; Source link; Relevance | md, docx |  | Built |
| OPS-GOV-08 | Tender and RFQ response checklist | Checklist of what a tender asks for, taken from the tender document you supply. | Tender document text; Closing date | md, xlsx | Tender checklist (new) | Built |

## People & Culture

### Talent Partner

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PPL-01 | Role scorecard and job description | Scorecard and job description for a role. | Role; Outcomes | md, docx |  | Built |
| OPS-PPL-02 | Interview scorecard | Structured interview questions and a scoring guide. | Role; Competencies | md, docx |  | Built |

### People Operations

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PPL-03 | 30-60-90 onboarding plan | Onboarding plan for a new hire. | Role; Start date | md, docx |  | Built |
| OPS-PPL-04 (2nd) | Offer and contract checklist | Checklist for a labour lawyer to review before an offer goes out. | Role; Terms | md, docx |  | Built |

### Learning and Development Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PPL-05 (2nd) | Performance review guide | Structured review guide. Ratings are the manager’s alone. | Role; Goals for the period | md, docx |  | Built |
| OPS-PPL-06 | Staff development plan | Development plan from goals the person and manager agree. | Role; Goals | md, docx |  | Built |

## IT, DevOps & SRE

### Site Reliability Engineer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SRE-02 | Blameless postmortem | Postmortem with timeline, causes and actions, without blame. | Incident; Timeline | md, docx | Live CI | Built |
| OPS-SRE-03 | SLO and recovery targets | SLOs and recovery targets you set, with how each is measured. | Service; Targets | md, docx |  | Built |

### Release Engineer

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SRE-01 (2nd) | Change request | Change request with risk, rollback and approver. | Change; Rollback | md, docx |  | Built |
| OPS-SRE-05 | Release runbook | Step-by-step runbook for a release, taken from the ecosystem’s runbooks. | Release; Environment | md, docx | Runbooks | Built |

### Cloud Platform Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-SRE-04 | Backup and restore test record | Record of a restore test with result and evidence. | System; Date tested; Result | md, xlsx | Restore test log (new) | Built |
| OPS-SRE-06 | Cloud cost review | Budget against actual from bill figures you type. Never estimated. | Bill lines | md, xlsx, csv | Budget vs actual | Built |

## Procurement & Vendors

### Vendor Manager

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PRO-01 (2nd) | Vendor due diligence | Due diligence questions and findings for a supplier. | Supplier; Service | md, docx |  | Built |
| OPS-PRO-03 | Supplier review | Periodic review of a supplier against what was agreed. | Supplier; Evidence | md, docx |  | Built |

### Sourcing Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PRO-02 | RFQ and scoring matrix | Request for quotation and a weighted scoring matrix. | Need; Criteria | md, docx, xlsx | Weighted score | Built |
| OPS-PRO-05 | Purchase request and approval log | Purchase request with approvals recorded. | Item; Reason; Approver role | md, csv | Purchase log (new) | Built |

### Operator Agreements Controller

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-PRO-04 (2nd) | Operator register update | Updates the register of operators and their written agreements (POPIA). | Operator; Agreement status | md, xlsx, csv | Operator register (new) | Built |
| OPS-PRO-06 (2nd) | Exit and data-return plan | Plan to leave a supplier and get data returned or deleted. | Supplier; Data held | md, docx |  | Built |

## Research, Impact & Knowledge

### Research Lead

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-RES-01 | Theory of change | Theory of change with assumptions to test. | Programme; Outcomes | md, docx |  | Built |
| OPS-RES-02 (2nd) | Evaluation plan | Evaluation plan with questions, measures and ethics notes. | Programme; Questions | md, docx |  | Built |

### Evaluation Analyst

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-RES-05 (2nd) | Pilot data collection plan | What to collect, from whom, with a consent checklist. No learner-identifying data on this platform. | Pilot; Measures | md, docx |  | Built |
| OPS-RES-03 (2nd) | Impact report skeleton | Report structure. No impact claim without evidence. | Programme; Evidence | md, docx, pdf |  | Built |

### Evidence Librarian

| Agent | Task | What it produces | You supply | Formats | Widget | Status |
|---|---|---|---|---|---|---|
| OPS-RES-04 | Literature scan summary | Summary of sources you supply, each cited. Nothing added from memory. | Question; Sources | md, docx |  | Built |
| OPS-RES-06 | Evidence claims register | Register tying each public claim to its evidence, shared with Marketing. | Claims; Evidence | md, xlsx, csv | Claims register (new) | Built |

## Widgets added with this catalogue

- **Finance:** School quote calculator (calc), Month-end close (checklist), Debtors (tracker), Grants (tracker).
- **Government:** Funding and partnership leads (tracker, seeded with 43 leads), Partner onboarding (checklist), Tender requirements (tracker).
- Widgets marked “(new)” in the tables for other departments are proposed and built with their batch.

## Decisions for you

1. Do the drafted roles suit how you will run each department? Rename, merge or drop any.
2. FIN-05 quotes use the pricing formula, which is still a proposal (decision D-1). Approve D-1 before any quote leaves the company.
3. Departments with legal, employment or funder-facing output carry a second approver. Say if you want more or fewer.
