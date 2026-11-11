export interface ZoneItem {
  id: string;
  icon: string;
  tag: string;
  name: string;
  hue: string;
  meta: string;
  plain: string;
  why?: string;
  who?: string;
  pipe: string[];
}

export interface BoundaryItem {
  icon: string;
  name: string;
  hue: string;
  d: string;
  say: string;
}

export interface StrataItem {
  id: string;
  name: string;
  hue: string;
  badges: string[];
  desc: string;
  ex: string;
}

export interface HabitatSurfaceItem {
  icon: string;
  name: string;
  meta: string;
  d: string;
  long: string;
}

export interface OrganismModule {
  id: string;
  icon: string;
  name: string;
  count: number;
  agents: [string, string][];
}

export interface CrackItem {
  n: string;
  t: string;
  d: string;
  eco: string;
}

export interface LawItem {
  n: string;
  icon: string;
  t: string;
  h: string;
  d: string;
  tech: string;
}

export interface MoveItem {
  short: string;
  name: string;
  hue: string;
  d: string;
  ex: string;
}

export interface LearnerSimItem {
  ref: string;
  ctx: string;
  pts: string[];
  core: { ok: boolean; txt: string };
  suff: boolean;
  tier: string;
  hue: string;
  plan: string;
  gate: string;
  review: string;
}

export interface LeLoopItem {
  k: string;
  n: string;
  t: string;
  d: string;
}

export interface RoleItem {
  id: string;
  icon: string;
  name: string;
  pitch: string;
  points: string[];
  before: string;
  after: string;
  habitat: string;
}

export interface CourseItem {
  part: string;
  title: string;
  sub: string;
  hue: string;
  chips: string[];
  mods: string[];
  del: string[];
}

export interface IntelItem {
  icon: string;
  name: string;
  sub: string;
  d: string;
  sup: string;
  ex: string;
}

export const ZONES: ZoneItem[] = [
  {
    id: 'roots',
    icon: '🌱',
    tag: 'L0–L4',
    name: 'The Root Network · Infinite Brain',
    hue: '#f5b841',
    meta: 'The memory every other habitat draws from',
    plain: 'Underneath everything sits a single memory system, like the mycorrhizal network beneath a forest floor connecting every tree’s roots. It holds the school’s non-negotiables — CAPS, ATPs, its own templates and policies — as permanent, human-approved ground truth, and quietly remembers everything that happens on top of it: every plan, every correction, every decision, dated and traceable.',
    why: 'Nothing the AI drafts is invented. It is always grounded in the curriculum documents and policies the school itself supplied — never in guesswork.',
    pipe: ['L0 Constitution', 'L1 Semantic', 'L2 Episodic', 'L3 Procedural', 'L4 Working']
  },
  {
    id: 'growing',
    icon: '☀️',
    tag: 'MOD-01',
    name: 'The Growing Season · Curriculum Engine',
    hue: '#7c5cff',
    meta: 'From CAPS clause to classroom-ready lesson',
    plain: 'This is where a CAPS subject statement and a DBE Annual Teaching Plan turn into an actual term of teaching: unit plans, differentiated lessons, assessments, rubrics and memos, in the school’s own template, with pacing and mark allocations pulled straight from policy — not invented by a model. A Head of Department signs off before anything is published, and a coverage report flags any topic drifting off pace.',
    who: 'Teachers get a full term of planning drafted in hours, not weeks — and HoDs get a single, always-current view of what’s actually been covered.',
    pipe: ['CAPS+ATP ingest', 'Topic graph', 'Term plan', 'Unit blueprint', 'Lessons', 'Assessment', '◆ HoD gate', 'Publish']
  },
  {
    id: 'waterhole',
    icon: '💧',
    tag: 'MOD-02',
    name: 'The Watering Hole · Support Analytics',
    hue: '#fb7185',
    meta: 'Where every learner is seen, early',
    plain: 'Built around South Africa’s own SIAS process and the MTSS/RTI model of tiered support: it screens learners, checks whether whole-class teaching itself needs attention before flagging any individual, and builds and monitors intervention plans. A trained team (SBST) ratifies every tier change and referral. Diagnostic or clinical language is refused outright — this system supports, it never diagnoses. Any safeguarding concern goes straight to a named human, immediately.',
    who: 'SBST teams get one shared case file instead of scattered notes; parents receive updates in their own home language, at a readable level.',
    pipe: ['Screen', 'Core-health', 'Tier rec', '◆ SBST', 'Plan', 'Monitor', 'Decide', 'Report']
  },
  {
    id: 'watershed',
    icon: '🏞',
    tag: 'MOD-03',
    name: 'The Watershed · Data Warehouse',
    hue: '#38bdf8',
    meta: 'Every stream of school data, reconciled to one truth',
    plain: 'Attendance registers, assessment results, behaviour logs — this habitat pulls in what a school already runs, checks it for quality, and reconciles it into one profile per learner. Every insight it surfaces has to show exactly what data it drew from and how confident it is. Nothing gets acted on blind.',
    who: 'SMTs finally see the whole picture of a learner or a grade in one place, instead of stitching together five spreadsheets before a meeting.',
    pipe: ['Source sync', 'Validate', 'Conform', '◆ Consent', 'De-identify', 'Learner-360', 'Insight', 'Next step']
  },
  {
    id: 'grove',
    icon: '🐝',
    tag: 'MOD-04',
    name: 'The Workshop Grove · Toolbox',
    hue: '#f5b841',
    meta: 'A classroom-ready resource, made to order',
    plain: 'Worksheets, decodable reading passages, assessment items, marking memos, home-language versions across all eleven official languages — each one built for a specific CAPS topic or a specific learner’s exact gap, checked for reading level and accuracy (answer keys are independently re-solved before a teacher ever sees them), and always waiting for a teacher’s approval.',
    who: 'A teacher can turn “this learner is stuck on fractions” into a ready-to-print remediation worksheet in minutes, not an evening.',
    pipe: ['Need', 'Brief', 'Grounding', 'Draft', 'Checks', '◆ Teacher', 'Deliver', 'Brain']
  },
  {
    id: 'nesting',
    icon: '🪺',
    tag: 'MOD-05',
    name: 'The Nesting Ground · PD Studio',
    hue: '#86efac',
    meta: 'Where teachers, not just learners, grow',
    plain: 'This habitat watches teaching patterns — pacing, assessment quality, classroom observation notes — and turns what it finds into short, practical courses built from the school’s own evidence, with real CPTD points calculated against official SACE policy, never guessed. Developmental by design: no rankings, no leaderboards, no individual exposure, and a human coach always owns the conversation.',
    who: 'Professional development stops being generic and once-a-term, and starts responding to what’s actually happening in that teacher’s classroom this week.',
    pipe: ['Signals', 'Analytics', 'Gap detect', '◆ SMT', 'Micro-course', 'Coaching', 'Re-measure']
  },
  {
    id: 'seasons',
    icon: '🍂',
    tag: 'LE',
    name: 'The Seasons · Learning Engine',
    hue: '#2dd4bf',
    meta: 'The ecosystem gets healthier the longer it grows',
    plain: 'Every time a teacher corrects an AI draft, that correction is captured, weighed against real outcomes, and — only after passing a strict quality bar and being formally approved by a human — becomes part of how the system drafts next time. No model is ever trained on a learner’s personal data. Every improvement is versioned and can be rolled back with a single command.',
    why: 'The system a school uses in its third year is measurably more attuned to that specific school than the one it started with — and every step of that growth is auditable.',
    pipe: ['Signal', 'Diff', 'Attribute', 'Mine', 'Challenger', 'Eval gate', '◆ Ratify', 'Publish']
  }
];

export const BOUNDARIES: BoundaryItem[] = [
  {
    icon: '🌦',
    name: 'The Climate · Guardrail & Policy Plane',
    hue: '#fb7185',
    d: 'Like weather, it bounds everything: consent, purpose limitation, a PII egress guard, prompt-injection defence, and human-in-the-loop gates. Every habitat lives inside it — no exceptions.',
    say: 'In plain terms: the rules of nature here. Nothing grows outside them.'
  },
  {
    icon: '🌊',
    name: 'One River Mouth · Model Gateway',
    hue: '#7c5cff',
    d: 'All AI traffic leaves through a single self-hosted gateway with budgets, fallbacks and caching — so cost is predictable and no provider key ever touches app code.',
    say: 'In plain terms: one gate to the outside sea, always watched.'
  },
  {
    icon: '🏞',
    name: 'Each School, Its Own Reserve · Tenant Isolation',
    hue: '#38bdf8',
    d: 'PostgreSQL Row-Level Security on every table: one school can never see another’s data — not by policy, by construction. All learner data at rest in af-south-1.',
    say: 'In plain terms: a fence with no gaps, tested by trying to break it.'
  }
];

export const STRATA: StrataItem[] = [
  {
    id: 'L0',
    name: 'Bedrock · Constitution',
    hue: '#f5b841',
    badges: ['Immutable', 'Human-ratified', 'Versioned'],
    desc: 'School policy, CAPS canon, ATP calendars, templates, assessment policy, POPIA rules, house voice. The rock everything else grows from.',
    ex: 'CAPS subject statements ratified by the HoD; mark weightings come from here only — a model may never compute its own.'
  },
  {
    id: 'L1',
    name: 'Root Web · Semantic',
    hue: '#7c5cff',
    badges: ['Graph', 'pgvector'],
    desc: 'The living network connecting everything: learners, classes, topics, CAPS codes, assessments, interventions — like mycorrhizal roots sharing nutrients.',
    ex: 'Recursive queries traverse “topic → sub-skill → missed skill” so remediation targets exactly what broke.'
  },
  {
    id: 'L2',
    name: 'Tree Rings · Episodic',
    hue: '#2dd4bf',
    badges: ['Temporal', 'Append-only'],
    desc: 'What happened, when, to whom, by whom, with outcome — and every human correction kept. Read any season back, exactly as it was.',
    ex: '“What did we decide about Learner A in Term 2 last year?” returns the version current then, not today’s.'
  },
  {
    id: 'L3',
    name: 'Game Trails · Procedural',
    hue: '#38bdf8',
    badges: ['Versioned', 'Ratified'],
    desc: 'Paths worn smooth by repetition: prompt versions, pipeline definitions, SOPs, approved exemplars — the school’s way of doing things.',
    ex: 'A prompt cannot be edited in place without a version bump; the loader is content-hashed against a lockfile.'
  },
  {
    id: 'L4',
    name: 'Morning Dew · Working',
    hue: '#e9edf8',
    badges: ['Ephemeral', 'Redis TTL'],
    desc: 'Per-run scratchpad that evaporates by design — only a provenance-stamped summary may soak into the soil above.',
    ex: 'A run’s scratch context expires; the summary graduates to L2/L3 with its sources attached.'
  }
];

export const HABITAT_SURFACES: HabitatSurfaceItem[] = [
  {
    icon: '💧',
    name: 'Teacher Studio',
    meta: 'The watering hole',
    d: 'The daily surface, optimised around two questions: “give me tomorrow’s lesson” and “this learner is stuck.”',
    long: 'Lesson drafts, remediation packs, rubric-grounded first-pass feedback and parent-email drafts — everything lands as a draft awaiting your approval. Optimised for poor connections with offline-safe edits that sync when signal returns, on a mid-range phone on 3G.'
  },
  {
    icon: '🌾',
    name: 'HoD Console',
    meta: 'The seed store',
    d: 'Approvals with diffs and evidence, coverage audits, assessment quality.',
    long: 'Every approval arrives with a diff against the previous version, the evidence used, and the required role. Coverage-vs-pacing audits compare planned vs taught vs assessed; template fidelity is validated structurally — wrong section order is a hard failure, so HoDs can finally approve without edits.'
  },
  {
    icon: '⛰',
    name: 'SMT Dashboard',
    meta: 'The kopje lookout',
    d: 'System health, tier picture, PD needs, readable budgets.',
    long: 'One honest view of the school: curriculum coverage grade by grade, tiered-support caseloads, staff development needs, approval-queue age, and model budgets a principal can actually read. Small groups are automatically suppressed in every aggregate to protect anonymity.'
  },
  {
    icon: '📒',
    name: 'SBST Casebook',
    meta: 'The ranger’s ledger',
    d: 'One case file per learner — everyone sees the same truth.',
    long: 'Screenings, interventions, meeting minutes, SIAS packs, decisions with dates and owners — one shared file per learner instead of notes scattered across meetings, emails and memory. Every tier change, referral and exit carries its SBST ratification.'
  },
  {
    icon: '🏡',
    name: 'Parent Portal',
    meta: 'The homestead',
    d: 'Home-language updates, strict data minimisation.',
    long: 'Progress letters in the family’s home language at a checked readability level, low-bandwidth rendering, and the strictest data minimisation on the platform. When AI is part of a learning interaction, that is visible — never hidden.'
  },
  {
    icon: '🌼',
    name: 'Learner Space',
    meta: 'The clearing',
    d: 'Socratic coaching and practice — the learner does the thinking.',
    long: 'The agent asks guiding questions and checks understanding rather than handing over answers; once a concept lands it turns the conversation into flashcards and practice. Age-appropriate, safeguarding-first, and never a place where a child’s data is used for anything but their own learning.'
  },
  {
    icon: '🗺',
    name: 'District Rollup',
    meta: 'The highveld view',
    d: 'De-identified aggregates only, purpose-limited.',
    long: 'Coverage, pacing and support patterns across schools — built on de-identified aggregates only, respecting purpose limitation, never exposing a single learner. Designed for oversight and planning, not surveillance.'
  }
];

export const ORGANISMS: OrganismModule[] = [
  {
    id: 'MOD-01',
    icon: '☀️',
    name: 'Curriculum Engine',
    count: 9,
    agents: [
      ['CE-01', 'CAPS Mapper'],
      ['CE-02', 'ATP Sequencer'],
      ['CE-03', 'Term Planner'],
      ['CE-04', 'Unit Architect'],
      ['CE-05', 'Lesson Plan Generator'],
      ['CE-06', 'Assessment Designer'],
      ['CE-07', 'Rubric Builder'],
      ['CE-08', 'Differentiation Agent'],
      ['CE-09', 'Coverage Auditor']
    ]
  },
  {
    id: 'MOD-02',
    icon: '💧',
    name: 'Support Analytics',
    count: 10,
    agents: [
      ['AC-01', 'Universal Screener'],
      ['AC-02', 'Core-Health Analyst'],
      ['AC-03', 'Tier Recommender'],
      ['AC-04', 'Early Warning Agent'],
      ['AC-05', 'Intervention Planner'],
      ['AC-06', 'Progress Monitor'],
      ['AC-07', 'Fidelity Checker'],
      ['AC-08', 'SBST Meeting Scribe'],
      ['AC-09', 'SIAS Compiler'],
      ['AC-10', 'Parent Report Writer']
    ]
  },
  {
    id: 'MOD-03',
    icon: '🏞',
    name: 'Data Warehouse',
    count: 8,
    agents: [
      ['DW-01', 'Ingestion Agent'],
      ['DW-02', 'Schema Mapper'],
      ['DW-03', 'Consent Ledger Agent'],
      ['DW-04', 'De-identification Agent'],
      ['DW-05', 'Data Quality Sentinel'],
      ['DW-06', 'Learner-360 Builder'],
      ['DW-07', 'Insight Synthesiser'],
      ['DW-08', 'Next-Step Recommender']
    ]
  },
  {
    id: 'MOD-04',
    icon: '🐝',
    name: 'Toolbox',
    count: 11,
    agents: [
      ['TB-01', 'Worksheet Builder'],
      ['TB-02', 'Board & Deck Builder'],
      ['TB-03', 'Reading Passage Generator'],
      ['TB-04', 'Item Writer'],
      ['TB-05', 'Memo & Marking Guide'],
      ['TB-06', 'Home-Language Adapter'],
      ['TB-07', 'Accessibility Adapter'],
      ['TB-08', 'Remediation Pack Builder'],
      ['TB-09', 'Extension & Enrichment'],
      ['TB-10', 'Resource-Light Activity'],
      ['TB-11', 'Visual Brief Writer']
    ]
  },
  {
    id: 'MOD-05',
    icon: '🪺',
    name: 'Analytics & PD Studio',
    count: 8,
    agents: [
      ['PD-01', 'Coverage vs Pacing Analyst'],
      ['PD-02', 'Assessment Quality Analyst'],
      ['PD-03', 'Observation Analyst'],
      ['PD-04', 'Practice Signal Aggregator'],
      ['PD-05', 'PD Gap Detector'],
      ['PD-06', 'Micro-Course Composer'],
      ['PD-07', 'Coaching Plan Agent'],
      ['PD-08', 'CPTD Tracker']
    ]
  }
];

export const CRACKS: CrackItem[] = [
  {
    n: '01',
    t: 'The paperwork drought',
    d: 'Term plans, ATPs, rubrics, memos, differentiated worksheets — teachers rebuild the same scaffolding every year, mostly alone, mostly after hours, because there’s no shared memory of what already works.',
    eco: 'The ecosystem’s answer: the Root Network keeps every approved plan and exemplar the school has ever ratified — nothing gets rebuilt from scratch.'
  },
  {
    n: '02',
    t: 'The learner who goes quiet',
    d: 'A child falls behind gradually, not all at once. Without a system that watches pacing and progress across a whole class, the early signs are the ones a stretched teacher has the least time to catch.',
    eco: 'The ecosystem’s answer: the Watering Hole screens every learner, watches trends weekly, and raises a quiet flag to the team — early, on evidence, before anyone goes quiet for good.'
  },
  {
    n: '03',
    t: 'Data everywhere, insight nowhere',
    d: 'Attendance in one spreadsheet, assessments in another, behaviour notes on paper. Schools don’t lack data. They lack one reconciled truth about each learner that anyone can act on.',
    eco: 'The ecosystem’s answer: the Watershed reconciles every source into one profile per learner, and every insight carries its data, its confidence, and a next step with an owner and a date.'
  },
  {
    n: '04',
    t: 'Teachers grow in isolation',
    d: 'Professional development is generic, once-a-term, and disconnected from what’s actually happening in that teacher’s own classroom this week.',
    eco: 'The ecosystem’s answer: the Nesting Ground builds short courses from the school’s own evidence, with CPTD points against real SACE policy — developmental, never punitive.'
  }
];

export const LAWS4: LawItem[] = [
  {
    n: 'Law 01',
    icon: '🫧',
    t: 'The Membrane',
    h: 'No child’s personal information ever reaches the AI.',
    d: 'Before any request touches a language model, a dedicated privacy layer strips names, ID numbers and identifying detail and replaces them with anonymous tokens. If anything slips through, the request is refused automatically — this isn’t a policy on paper, it’s a checkpoint no data can bypass. All learner data stays on South African soil, encrypted at rest and in transit, in line with POPIA.',
    tech: 'Enforced by the De-identification Service and the PII egress guard on the only code path to the Model Gateway — plus a fuzz test corpus that must block 100% of egress attempts and a red-team suite of 40+ adversarial prompts.'
  },
  {
    n: 'Law 02',
    icon: '🦁',
    t: 'The Keystone Species',
    h: 'The teacher is always the apex decision-maker.',
    d: 'At every point that matters — a term plan, a support recommendation, a report home to a parent — the system stops and waits for a human to approve, edit, or reject before anything moves forward. Nothing about a learner’s support pathway, a teacher’s development plan, or a curriculum decision is ever finalised by a machine alone.',
    tech: 'Human-in-the-loop gates are pipeline steps with stored approval records that must exist before the transition commits. Bypass attempts are tested in CI and fail; there is no flag, env var or SKIP_APPROVAL in production.'
  },
  {
    n: 'Law 03',
    icon: '🪵',
    t: 'Nothing Is Truly Lost',
    h: 'Every decision is remembered, dated, and reversible.',
    d: 'When something changes — a plan is updated, a recommendation is corrected by a teacher — the old version isn’t deleted, it’s kept and superseded, like tree rings. A school can always ask “what did we decide about this learner last term, and why?” and get a real, provable answer.',
    tech: 'The Brain is append-only with versioned supersession (a database trigger raises on destructive updates), nightly snapshots with point-in-time restore, and explain() provenance chains on every fact.'
  },
  {
    n: 'Law 04',
    icon: '🌦',
    t: 'Growth Serves Everyone Equally',
    h: 'The system learns from real corrections, never from guesswork.',
    d: 'When a teacher edits an AI-drafted worksheet or corrects a recommendation, that correction becomes part of the school’s own memory — making the next draft closer to right. Patterns are checked for bias across language, gender and circumstance before they’re ever allowed to repeat, so improvement never quietly favours one group of learners over another.',
    tech: 'The Learning Engine promotes nothing without passing eval gates, and bias monitoring compares recommendation and improvement rates across home language, gender and quintile — a divergent pattern is blocked from promotion as universal.'
  }
];

export const MOVES: MoveItem[] = [
  {
    short: 'PLAN',
    name: 'Plan · The Growing Season',
    hue: '#7c5cff',
    d: 'The term starts with a plan the HoD actually approves: CAPS and ATP ingested as ratified constitution, then term → unit → lesson → assessment in your school’s exact templates. Differentiation variants for support, on-level and extension ship with every lesson.',
    ex: '◆ Human gate: HoD approval before anything publishes. ◆ Teacher moment: freed from formatting, free to adapt the plan to the children in front of them.'
  },
  {
    short: 'KNOW',
    name: 'Know · The Watershed',
    hue: '#38bdf8',
    d: 'Data flows in from what the school already runs — consented, de-identified, quality-checked — into one reconciled Learner-360. Every insight carries provenance, confidence, and a next step with an owner and a date.',
    ex: '◆ Human gate: consent check before any learner data is used. ◆ Teacher moment: no more spreadsheets — one honest picture per child.'
  },
  {
    short: 'SUPPORT',
    name: 'Support · The Watering Hole',
    hue: '#fb7185',
    d: 'Termly universal screening, a core-health check (is Tier 1 enough for ≥80%?), tier recommendations with visible evidence, intervention plans, progress monitoring and SBST minutes — mapped onto DBE SIAS from screen to referral pack.',
    ex: '◆ Human gate: SBST ratifies every tier change, referral and exit. ◆ Teacher moment: struggling learners caught early, supported deliberately, moved on evidence.'
  },
  {
    short: 'CREATE',
    name: 'Create · The Workshop Grove',
    hue: '#f5b841',
    d: 'A need becomes a classroom-ready artefact in minutes: worksheets, decodable passages in all eleven official languages, remediation packs bound to the exact missed sub-skill, extension work, accessibility-adapted versions — answer keys independently re-solved.',
    ex: '◆ Human gate: teacher approval before delivery. ◆ Teacher moment: from “this learner is stuck on fractions” to a printed pack in under five minutes.'
  },
  {
    short: 'LEARN',
    name: 'Learn · The Seasons',
    hue: '#2dd4bf',
    d: 'The system watches its own usefulness: every edit becomes a signal; exemplars and prompt challengers are proposed, eval-gated and ratified; PD gaps become 20–40 minute micro-courses and coaching cycles — developmental, never punitive.',
    ex: '◆ Human gate: ratification surface for HoD/SMT, with rollback. ◆ Teacher moment: the ecosystem quietly becomes your school’s way of doing things.'
  }
];

export const LEARNERS: LearnerSimItem[] = [
  {
    ref: 'Learner A',
    ctx: 'Grade 3 · Reading',
    pts: ['Letter-sound fluency 12 cpm (benchmark 30)', 'Oral reading 18 wcpm · accuracy 84%', 'Attendance 96%', '6 data points · last 5 weeks'],
    core: { ok: true, txt: 'Class core health 82% at benchmark — Tier 1 sufficient ✓' },
    suff: true,
    tier: 'TIER 2 · TARGETED',
    hue: '#7c5cff',
    plan: 'Small-group decoding practice, 3×/week × 15 min — layered on top of Tier 1, never instead of it. Owner: class teacher + reading coach.',
    gate: '◆ SBST ratifies the placement — the team decides, not the agent.',
    review: 'Progress-monitor weekly · re-check tier in 4 weeks'
  },
  {
    ref: 'Learner B',
    ctx: 'Grade 5 · Maths',
    pts: ['Numeracy screener 38%', 'Fact-fluency probe 9/25 in 3 min', 'Attendance 88%', '5 data points'],
    core: { ok: false, txt: 'Class core health 74% at benchmark — below the 80% gate ✗' },
    suff: true,
    tier: 'TIERING SUPPRESSED',
    hue: '#f5b841',
    plan: 'When whole-class teaching isn’t enough for ≥80%, you restore the grass before treating individuals: whole-class explicit instruction + concrete→representational→abstract re-teach of fractions; a Tier 1 improvement task is raised instead of mass referral.',
    gate: 'Core-health gate blocks tiering automatically — enforced in code.',
    review: 'Re-screen whole class in 6 weeks'
  },
  {
    ref: 'Learner C',
    ctx: 'Grade 2 · Reading + attendance',
    pts: ['Decoding on-level · vocabulary & comprehension low', 'Attendance 76% and falling', 'Wellbeing flag from class teacher', '8 data points'],
    core: { ok: true, txt: 'Class core health 85% at benchmark ✓' },
    suff: true,
    tier: 'TIER 3 · INTENSIVE',
    hue: '#fb7185',
    plan: 'Diagnostic profile organised for specialist referral; SIAS pack compiled in process order; guardian letter in the family’s home language at a checked readability level.',
    gate: 'AI organises the evidence — it never diagnoses. Referral sign-off is human.',
    review: 'SBST case file opened · review fortnightly'
  },
  {
    ref: 'Learner D',
    ctx: 'Grade 4 · Reading',
    pts: ['2 data points · 1 week only'],
    core: { ok: true, txt: 'Class core health 81% at benchmark ✓' },
    suff: false,
    tier: 'NO RECOMMENDATION',
    hue: '#8fa0c2',
    plan: 'Below the stated minimum data points and recency window. The UI says “insufficient data” — not a guess. Keep collecting; the screener re-runs Friday.',
    gate: 'Minimum-data rule enforced in code, not in prompts.',
    review: 'Re-check Friday after fresh data lands'
  }
];

export const LE_LOOP: LeLoopItem[] = [
  { k: 'signal', n: '1 · Signal', t: 'Signal Collector', d: 'Every approval, edit, rejection and reason code captured as a labelled, de-identified event — the raw seed material of improvement.' },
  { k: 'diff', n: '2 · Diff', t: 'Correction Differ', d: 'What the human changed, and the type of correction. Edit diffs from every gate become first-class training signals.' },
  { k: 'mine', n: '3 · Attribute & Mine', t: 'Attributor + Pattern Miner', d: 'Artefact → delivery → learner outcome, with honest confidence. Effect sizes and minimum-sample thresholds — never correlation dressed as proof.' },
  { k: 'challenge', n: '4 · Challenge', t: 'Exemplar Curator + Prompt Evolver', d: 'Best artefacts and challenger prompt variants are proposed — candidates only. Nothing promotes itself.' },
  { k: 'eval', n: '5 · Eval Gate', t: 'Eval Gatekeeper', d: 'Challenger vs champion on the school’s golden sets. Must beat the primary metric, regress no protected case, and stay inside budget.' },
  { k: 'ratify', n: '6 · ◆ Ratify', t: 'Human ratification', d: 'HoD, SMT or a curriculum board sees the candidate, the evidence, the eval delta and the rollback command — then approves. Nothing enters L0/L3 without this.' },
  { k: 'publish', n: '7 · Publish', t: 'Commons Publisher', d: 'Opt-in, de-identified, aggregated patterns shared to the cross-school commons — only above a k-anonymity threshold checked at publish time.' },
  { k: 'decay', n: '8 · Decay', t: 'Decay & Revalidation', d: 'Stale patterns age out; a CAPS or ATP version change invalidates every dependent exemplar. The soil stays honest.' }
];

export const STAGES_BUILD: [string, string, string][] = [
  ['00', 'Ground rules, repo, toolchain', '—'],
  ['01', 'Data foundation, tenancy, RLS', '00'],
  ['02', 'Identity, RBAC, audit ledger', '01'],
  ['03', 'POPIA layer: consent, purpose, de-ident', '01·02'],
  ['04', 'Model Gateway', '00'],
  ['05', 'Infinite Brain L0–L4', '01·03·04'],
  ['06', 'Agent runtime, orchestrator, guardrails, HITL', '04·05'],
  ['07', 'Eval harness & golden sets', '06'],
  ['08', 'MOD-01 Curriculum Engine', '06·07'],
  ['09', 'MOD-03 Data Warehouse', '03·06'],
  ['10', 'MOD-02 Support Analytics', '09'],
  ['11', 'MOD-04 Toolbox', '08·10'],
  ['12', 'MOD-05 Analytics & PD Studio', '08·09·11'],
  ['13', 'LE Learning Engine', '07·12'],
  ['14', 'Experience surfaces', '08–13'],
  ['15', 'Observability, SLOs, DR', '14'],
  ['16', 'Security hardening', '15'],
  ['17', 'Tenant lifecycle, provisioning, billing', '16'],
  ['18', 'Launch readiness & handover', '17']
];

export const ROLES_LIST: RoleItem[] = [
  {
    id: 'dbe',
    icon: '🏛',
    name: 'DBE & District',
    pitch: 'A system built for oversight, not just uptake.',
    points: [
      'Policy alignment is provable, not asserted: every plan traces back to a CAPS clause; every SIAS step follows the mandated order and can’t be skipped; every support decision is human-ratified and logged.',
      'National-scale visibility without ever exposing learner-level PII — district rollups on de-identified aggregates only.',
      'Coverage and pacing data that shows CAPS implementation in practice, at scale.',
      'A pricing model built for cost-recovery at national scale, not per-seat commercial margin.'
    ],
    before: 'Quarters of collating spreadsheets to answer one question.',
    after: 'Provable alignment and a rollup ready for the meeting — with provenance on every number.',
    habitat: 'District Rollup · the highveld view'
  },
  {
    id: 'smt',
    icon: '⛰',
    name: 'Principal & SMT',
    pitch: 'One dashboard, the real picture.',
    points: [
      'A single, honest view of the school: curriculum coverage, tiered-support caseloads, and staff development — all reconciled from the school’s own data, all provenance-checked, none of it a black box.',
      'System health and coverage visible at a glance, grade by grade.',
      'Every approval that requires SMT sign-off surfaces in one queue.',
      'No learner-level exposure in staff-facing analytics — small groups are automatically suppressed.'
    ],
    before: 'Five systems, three spreadsheets, and a gut feeling.',
    after: 'One honest picture — and decisions made on evidence with the team.',
    habitat: 'SMT Dashboard · the kopje lookout'
  },
  {
    id: 'hod',
    icon: '🌾',
    name: 'Head of Department',
    pitch: 'Approve without edits — finally.',
    points: [
      'Approvals arrive with a diff against the previous version, the evidence used, and the required role.',
      'Coverage audits compare planned vs taught vs assessed — drift surfaced, not hidden.',
      'Assessment weightings and mark allocations come from ratified policy only; the engine cannot invent them.',
      'Template fidelity is structural: wrong section order is a hard failure, not a nitpick.'
    ],
    before: 'Rewriting plans at midnight to make them “school-ready”.',
    after: 'Reviewing quality work in your exact template — and ratifying it in minutes.',
    habitat: 'HoD Console · the seed store'
  },
  {
    id: 'teacher',
    icon: '💧',
    name: 'Teacher',
    pitch: 'Tomorrow’s lesson, ready before the bell.',
    points: [
      'Teacher Studio is built around two questions teachers actually ask every day: “give me tomorrow’s lesson” and “this learner is stuck.”',
      'A full term of planning grounded in your CAPS subject and your school’s template.',
      'Classroom-ready worksheets and support materials in minutes, in your home-language mix.',
      'Development that responds to your own classroom, not a generic course calendar. Everything AI drafts is exactly that — a draft.'
    ],
    before: 'Producing everything, alone, at 9 PM on a Sunday.',
    after: 'Directing and reviewing — with time left for the children in front of you.',
    habitat: 'Teacher Studio · the watering hole'
  },
  {
    id: 'sbst',
    icon: '📒',
    name: 'SBST & Support',
    pitch: 'One case file. One truth. One team decision.',
    points: [
      'Universal screening and core-health checks before individual tiering — no mass referrals.',
      'Every recommendation shows its evidence; below minimum data, the system says “insufficient data”, not a guess.',
      'SIAS packs compiled in process order; minutes, decisions and next-check dates written for you.',
      'No diagnostic, clinical or disability language — ever. AI organises evidence; humans and specialists decide.'
    ],
    before: 'Case files scattered across meetings, emails and memory.',
    after: 'One ledger per learner — history, evidence, decisions — ratified by the team.',
    habitat: 'SBST Casebook · the ranger’s ledger'
  },
  {
    id: 'family',
    icon: '🏡',
    name: 'Parent & Learner',
    pitch: 'Visible, respectful, in your language.',
    points: [
      'Progress letters in the family’s home language, at a checked readability level.',
      'When AI is part of a learning interaction, that is visible — never hidden.',
      'Strict data minimisation; a child’s voice or screening data gets special-category care under POPIA.',
      'Safeguarding concerns escalate to a named human immediately — never queued, never summarised away.'
    ],
    before: 'Jargon-filled letters and unanswered questions.',
    after: 'Plain words, home language, and a school that notices early and calls you in.',
    habitat: 'Parent Portal · the homestead'
  }
];

export const GLOSSARY: [string, string][] = [
  ['CAPS', 'Curriculum and Assessment Policy Statement — the only source of learning outcomes in South African schools.'],
  ['ATP', 'Annual Teaching Plan — the DBE’s week-by-week pacing calendar the ecosystem treats as authoritative.'],
  ['SIAS', 'Screening, Identification, Assessment and Support — the DBE inclusive-education process the support module follows step by step.'],
  ['MTSS / RTI', 'Multi-Tiered System of Support / Response to Intervention — organising help into three tiers of increasing intensity.'],
  ['SBST', 'School-Based Support Team — the human council that ratifies every tier change, referral and exit.'],
  ['SMT', 'School Management Team — the leadership team that reviews evidence and signs off expansion.'],
  ['HoD', 'Head of Department — the human approval gate before any curriculum artefact publishes.'],
  ['POPIA', 'Protection of Personal Information Act — South Africa’s privacy law, woven into every layer of the system.'],
  ['LoLT', 'Language of Learning and Teaching — follows phase policy from tenant settings, in all eleven official languages.'],
  ['CPTD', 'Continuing Professional Teacher Development — point values come from supplied SACE policy, never computed by a model.']
];

export const TRUST_CARDS = [
  {
    icon: '🗺',
    t: 'Residency',
    sub: 'Data stays on South African soil',
    d: 'All learner data is stored and processed in-region (af-south-1), never moved offshore without an explicit, logged, per-school decision.',
    tech: 'Cross-region model calls require a per-tenant setting, default off, and are logged with SHA-256 audit records.'
  },
  {
    icon: '🤝',
    t: 'Consent',
    sub: 'Built to POPIA, from the ground up',
    d: 'Purpose-limited access, a full consent record for every data subject, and a working right-to-erasure process — not a policy document sitting unused.',
    tech: 'Every learner-data query takes a purpose argument; disallowed columns are dropped and logged, and erasure tombstones PII while the decision record survives.'
  },
  {
    icon: '🧑‍🏫',
    t: 'Human Oversight',
    sub: 'A person signs off on everything that matters',
    d: 'Curriculum publication, support decisions, and staff development plans all pass through a named human before they take effect.',
    tech: 'Approval records must exist before guarded transitions commit — bypass is impossible in production. No SKIP_APPROVAL.'
  },
  {
    icon: '🔍',
    t: 'Auditability',
    sub: 'Every decision can explain itself',
    d: 'Ask the system “why was this recommended?” and it can trace the answer all the way back to the source document and the person who approved it.',
    tech: 'explain() returns the full provenance chain: source, actor, timestamp, derivation and trace ID.'
  }
];

export const LAWS11: [string, string, string, string, string][] = [
  ['01', '🌱', 'Seasons come in order', 'Never skip a stage; no stage begins before the previous exit gate passes. A failed gate is fixed, never “temporarily” bypassed.', 'CI runs pnpm verify:stage <NN> cumulatively; a stage gate failing blocks the next stage from being recorded in the stage log.'],
  ['02', '🚨', 'You don’t silence a smoke alarm', 'Never disable, skip or weaken a failing test to make CI green. Fix the root cause.', 'ESLint bans .skip, .only, xit and commented-out assertions in committed tests; CI fails on any of them. Zero skipped tests is a hard threshold.'],
  ['03', '🌊', 'One river mouth to the sea', 'No model call bypasses the Gateway. No provider SDK in application code.', 'A lint rule plus a repo-wide test assert no provider SDK is imported outside the gateway app. All traffic passes one OpenAI-compatible egress point.'],
  ['04', '🛑', 'Names stop at the gate', 'No learner PII in a prompt — enforced at runtime by the de-identification service and a PII egress guard that fails closed.', 'A fuzz/property test generates synthetic learner records with embedded PII and asserts the guard blocks 100% of egress attempts; a 40+ prompt red-team suite must all fail closed.'],
  ['05', '🏞', 'Every school is its own reserve', 'Every DB read/write through the tenant-scoped client; Postgres Row-Level Security as the second line of defence.', 'The unscoped client is not exported from the db package; the RLS isolation suite tests every tenant-owned table for cross-tenant read, write, insert and aggregate leakage.'],
  ['06', '🧑‍🏫', 'Nothing reaches a child unapproved', 'Human-in-the-loop gates cannot be bypassed in production. No flag, no env var, no override.', 'The approval record must exist before the guarded transition commits; a dedicated test attempts every bypass vector and all fail.'],
  ['07', '🔑', 'No buried keys', 'No secret in the repository — not in code, tests, fixtures, comments or examples.', 'Secret scanning runs in CI and across git history; .env.example holds key names with empty values only; SOPS + age encrypts config.'],
  ['08', '🧰', 'No shortcuts in the build', 'TypeScript strict. No any, no @ts-ignore. unknown + a Zod parse is the correct pattern.', 'tsconfig enforces strict, noUncheckedIndexedAccess and exactOptionalPropertyTypes; ESLint mechanically bans any and @ts-ignore in every package.'],
  ['09', '🌿', 'No foreign species', 'No new dependency without name, version, licence, why, and what it replaces — recorded and reviewed.', 'docs/DEPENDENCIES.md is mandatory; licences outside MIT/Apache-2.0/BSD/ISC require explicit approval; supply-chain scanning and SBOM run in CI.'],
  ['10', '🔄', 'Every change keeps a path home', 'No schema change without a forward migration and a tested rollback.', 'Every migration ships with a tested rollback; destructive migrations require a separate, explicitly approved step.'],
  ['11', '🪨', 'Memory is never erased — only superseded', 'Nothing in the Brain is destructively updated; deletion only via the retention/tombstone path.', 'A database trigger raises on UPDATE of superseded Brain rows; nightly snapshots with point-in-time restore are rehearsed as a runbook drill.']
];

export const INTELS: IntelItem[] = [
  {
    icon: '📖',
    name: 'Linguistic',
    sub: 'Word smart',
    d: 'Storytelling, reading, argument and nuance in every language of the classroom.',
    sup: 'Home-Language Adapter (11 languages) · decodable passages · rubric-grounded writing feedback.',
    ex: 'In class: a decodable passage at the right level in the learner’s home language, drafted and approved by the teacher before it reaches a single child.'
  },
  {
    icon: '🧮',
    name: 'Logical-Mathematical',
    sub: 'Number & reason smart',
    d: 'Patterns, proof, strategy and the joy of a problem actually solved.',
    sup: 'CRA-sequenced tasks · Item Writer with cognitive-demand spread · fact-fluency drills that free working memory.',
    ex: 'In class: concrete→representational→abstract fraction tasks, with fact-fluency drills that free working memory for real problem-solving.'
  },
  {
    icon: '🎨',
    name: 'Spatial',
    sub: 'Picture smart',
    d: 'Seeing, sketching, mapping and thinking in images.',
    sup: 'Visual Brief Writer · Board & Deck Builder · bar models that make thinking visible.',
    ex: 'In class: bar models and number lines that make mathematical thinking visible and transferable.'
  },
  {
    icon: '🤸',
    name: 'Bodily-Kinaesthetic',
    sub: 'Body smart',
    d: 'Learning through doing, building, moving and making.',
    sup: 'Resource-Light Activity Agent designs hands-on, low-cost tasks — learning that leaves the desk.',
    ex: 'In class: low-cost, hands-on activities the Resource-Light Activity Agent designs from what the school already has.'
  },
  {
    icon: '🎵',
    name: 'Musical',
    sub: 'Rhythm smart',
    d: 'Pitch, rhythm, pattern and the memory that melody carries.',
    sup: 'Toolbox briefs weave rhythm, chant and song into phonics and fact practice.',
    ex: 'In class: chant-and-rhythm phonics practice and song-based fact drills woven into toolbox artefacts.'
  },
  {
    icon: '🤝',
    name: 'Interpersonal',
    sub: 'People smart',
    d: 'Collaboration, leadership, reading the room.',
    sup: 'Planner drafts group projects with roles and checkpoints · MTSS models team reasoning school-wide.',
    ex: 'In class: group projects with roles, midpoint check-ins and presentation days — collaboration practised, not preached.'
  },
  {
    icon: '🪞',
    name: 'Intrapersonal',
    sub: 'Self smart',
    d: 'Goals, reflection, knowing how you learn.',
    sup: 'Reflect exit tickets · the Socratic Coach builds metacognition by asking, not telling.',
    ex: 'In class: exit tickets and reflection prompts that teach learners to notice how they learn.'
  },
  {
    icon: '🌿',
    name: 'Naturalistic',
    sub: 'Nature smart',
    d: 'Classifying, observing, caring for the living world.',
    sup: 'South African contexts, names and settings by default — passages rooted in learners’ real world.',
    ex: 'In class: passages and problems set in South African contexts, names and measures — by default, from tenant settings.'
  }
];

export const COURSES: CourseItem[] = [
  {
    part: 'Part 1',
    title: 'From Prompts to Agents',
    sub: 'Build your first AI teaching team, hands-on — name, describe, instruct, ground and guardrail a real classroom agent.',
    hue: '#7c5cff',
    chips: ['🛠 Hands-on build', '⏱ Self-paced', '🎓 Certificate'],
    mods: [
      'Why agents beat prompts',
      'Naming & describing your agent',
      'Writing grounded instructions',
      'Attaching knowledge files',
      'Guardrails for classroom agents',
      'Your first teaching team, live'
    ],
    del: [
      'A configured, guardrailed classroom agent',
      'Your agent’s knowledge file',
      'A first eval checklist'
    ]
  },
  {
    part: 'Part 2',
    title: 'Next-Level Teaching & Learning with AI Agents',
    sub: 'The Study & Learn Agent, your six-role teaching team in practice, whole-school use cases — and a plan that changes your week.',
    hue: '#2dd4bf',
    chips: ['⏱ 2–2.5 h', '🎯 7 modules', '📋 4 deliverables', '🎓 Certificate'],
    mods: [
      '1 · Sunday Night, 9 PM',
      '2 · The Study & Learn Agent',
      '3 · Your Six-Agent Team',
      '4 · Beyond One Classroom',
      '5 · Safe by Design',
      '6 · A Week in the Life',
      '7 · Try This Month'
    ],
    del: [
      'Sunday Night Audit',
      'Stuck-Point Brief',
      'IT Conversation Script',
      'School-Level Agent Proposal'
    ]
  },
  {
    part: 'Part 3',
    title: 'AI-Powered Literacy Systems',
    sub: 'Scaling reading progress with purpose — how AI listening tools really work, what the evidence shows, and a tiered rollout plan.',
    hue: '#f5b841',
    chips: ['⏱ 2.5–3 h', '🎯 7 modules', '📋 4 deliverables', '🇿 PIRLS grounded'],
    mods: [
      '1 · A Scale Problem',
      '2 · How the AI Actually Listens',
      '3 · What the Evidence Shows',
      '4 · A Tiered Reading System',
      '5 · Evaluating & Piloting a Tool',
      '6 · From Dashboard to Instruction',
      '7 · Your School’s Rollout Roadmap'
    ],
    del: [
      'Class Reading Tier Map',
      'Tool Evaluation Scorecard',
      'Data-to-Intervention Weekly Plan',
      '90-Day Rollout Plan'
    ]
  },
  {
    part: 'Part 4',
    title: 'The Science of Learning, MTSS & AI Agents',
    sub: 'The Science of Reading, the Science of Math, multi-tiered support — and agents placed tier by tier, capped with a 90-day integrated plan.',
    hue: '#fb7185',
    chips: ['⏱ 3–3.5 h', '🎯 8 modules', '🛠 5 deliverables', '🇿🇦 CAPS & POPIA aware'],
    mods: [
      '1 · The MTSS Framework',
      '2 · Science of Reading',
      '3 · Science of Math',
      '4 · Tiering Reading & Maths Together',
      '5 · Build an MTSS-Aware Agent',
      '6 · Where Agents Fit, Tier by Tier',
      '7 · Data-Based Decision Making',
      '8 · Your 90-Day Integrated Plan'
    ],
    del: [
      'Two-Subject Tier Map',
      'Tier 2 Agent Configuration',
      'MTSS Team Data Summary',
      '90-Day Integrated Roadmap'
    ]
  }
];
