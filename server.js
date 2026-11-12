// server.ts
import "dotenv/config";
import express from "express";
import path from "node:path";

// src/connector/parse.ts
function parseStages(stageLog) {
  return [...stageLog.matchAll(/^## Stage (\d+) — (.+)$/gm)].map((m) => {
    const d = m[2].match(/^(.*?)\s·\s(\d{4}-\d{2}-\d{2})$/);
    return { n: Number(m[1]), title: (d ? d[1] : m[2]).trim(), date: d ? d[2] : null };
  });
}
function parseOpenQuestions(text) {
  const map = /* @__PURE__ */ new Map();
  for (const m of text.matchAll(/^\|\s*(OQ-\d+)\s*\|\s*([\d-]+)\s*\|\s*([^|]*)\|\s*([^|]*?)\s*\|\s*(.+?)\s*\|\s*$/gm))
    map.set(m[1], { id: m[1], raised: m[2], status: m[4].trim(), title: m[5].replace(/\*\*/g, "").slice(0, 160) });
  for (const m of text.matchAll(/^### (OQ-\d+)(?: \(partial\))? — (.+?)(?: · (resolved )?(\d{4}-\d{2}-\d{2}))?$/gm))
    if (!map.has(m[1])) map.set(m[1], { id: m[1], raised: m[4] ?? null, status: m[3] ? "RESOLVED" : "OPEN", title: m[2].slice(0, 160) });
  return [...map.values()].sort((a, b) => a.id.localeCompare(b.id));
}
var isOpen = (q) => !/^RESOLVED/i.test(q.status);

// src/connector/github.ts
var GithubReader = class {
  constructor(repo, token, f = fetch, api = "https://api.github.com") {
    this.repo = repo;
    this.token = token;
    this.f = f;
    this.api = api;
  }
  async get(path2, accept = "application/vnd.github+json") {
    const r = await this.f(`${this.api}${path2}`, { method: "GET", headers: { accept, "user-agent": "infinite-ai-ops", ...this.token ? { authorization: `Bearer ${this.token}` } : {} } });
    if (!r.ok) throw new Error(`GitHub ${r.status} for ${path2}`);
    return accept.includes("raw") ? await r.text() : await r.json();
  }
  async file(path2, ref) {
    return this.get(`/repos/${this.repo}/contents/${path2}${ref ? `?ref=${ref}` : ""}`, "application/vnd.github.raw+json");
  }
  async status() {
    const errors = [];
    const safe = async (label, p) => {
      try {
        return await p;
      } catch (e) {
        errors.push(`${label}: ${e.message}`);
        return null;
      }
    };
    const [commits, pulls, repo, runs, stageLog, oq] = await Promise.all([
      safe("commits", this.get(`/repos/${this.repo}/commits?per_page=1`)),
      safe("pulls", this.get(`/repos/${this.repo}/pulls?state=open&per_page=30`)),
      safe("repo", this.get(`/repos/${this.repo}`)),
      safe("ci", this.get(`/repos/${this.repo}/actions/runs?per_page=8`)),
      safe("STAGE_LOG", this.file("docs/STAGE_LOG.md")),
      safe("OPEN_QUESTIONS", this.file("docs/OPEN_QUESTIONS.md"))
    ]);
    const stages = stageLog ? parseStages(stageLog) : [];
    const qs = oq ? parseOpenQuestions(oq) : [];
    const c = commits?.[0];
    return {
      fetchedAt: (/* @__PURE__ */ new Date()).toISOString(),
      repo: this.repo,
      head: c ? { sha: c.sha.slice(0, 7), date: c.commit.author.date, subject: c.commit.message.split("\n")[0] } : null,
      openPulls: (pulls ?? []).map((p) => ({ number: p.number, title: p.title, draft: p.draft, updated: p.updated_at })),
      // GitHub counts PRs inside open_issues_count; subtract them so the number means issues only.
      openIssues: repo && pulls ? Math.max(0, repo.open_issues_count - pulls.length) : null,
      ci: (runs?.workflow_runs ?? []).map((r) => ({ name: r.name, status: r.status, conclusion: r.conclusion, updated: r.updated_at, url: r.html_url })),
      stages: { count: stages.length, latest: stages.at(-1)?.n ?? 0, latestTitle: stages.at(-1)?.title ?? "" },
      openQuestions: { total: qs.length, open: qs.filter(isOpen).length },
      errors
    };
  }
};
function liveFacts(s) {
  const f = { "live.fetchedAt": s.fetchedAt, "live.stages": s.stages.count, "live.latestStage": s.stages.latest, "live.oq.total": s.openQuestions.total, "live.oq.open": s.openQuestions.open, "live.openPulls": s.openPulls.length };
  if (s.head) f["live.head"] = s.head.sha;
  if (s.openIssues !== null) f["live.openIssues"] = s.openIssues;
  return f;
}

// src/connector/webhook.ts
async function verifySignature(secret, body, header) {
  if (!secret || !header?.startsWith("sha256=")) return false;
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, "0")).join("");
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}
function summariseEvent(event, payload) {
  const at = (/* @__PURE__ */ new Date()).toISOString();
  switch (event) {
    case "push":
      return { kind: "push", at, summary: `${payload.pusher?.name ?? "someone"} pushed ${payload.commits?.length ?? 0} commit(s) to ${String(payload.ref ?? "").replace("refs/heads/", "")}` };
    case "pull_request":
      return { kind: "pull_request", at, summary: `PR #${payload.number} ${payload.action}: ${payload.pull_request?.title ?? ""}` };
    case "workflow_run":
      return { kind: "workflow_run", at, summary: `${payload.workflow_run?.name ?? "workflow"} ${payload.workflow_run?.conclusion ?? payload.workflow_run?.status ?? ""}` };
    case "issues":
      return { kind: "issues", at, summary: `Issue #${payload.issue?.number} ${payload.action}: ${payload.issue?.title ?? ""}` };
    default:
      return { kind: event, at, summary: `${event} received` };
  }
}

// src/connector/proposals.ts
var ECOSYSTEM_RULES_CHECKLIST = [
  "Stage-gate: one stage, one PR; update docs/STAGE_LOG.md in the same commit",
  "Definition of Done: unit tests with happy path + at least two failure paths",
  "No second model path; HITL cannot be bypassed; no secrets in the repo",
  "Strict TypeScript, no `any`; record new dependencies in docs",
  "Unsure? Stop and write the question to docs/OPEN_QUESTIONS.md"
];
function proposalFromArtefact(a, summary) {
  const body = [
    `> Drafted by the Infinite-AI Ops Platform (${a.agentId}) and approved by a named human (${a.approvedBy ?? "n/a"}). AI drafts. The human decides.`,
    "",
    summary,
    "",
    "### Ecosystem rules this change must respect",
    ...ECOSYSTEM_RULES_CHECKLIST.map((r) => `- [ ] ${r}`),
    "",
    `Artefact: \`${a.id}\` v${a.version}`
  ].join("\n");
  return { title: a.title.slice(0, 120), body, labels: ["ops-platform-proposal"] };
}
var PublishRefused = class extends Error {
};
var ProposalPublisher = class {
  constructor(repo, token, writesEnabled, f = fetch, api = "https://api.github.com") {
    this.repo = repo;
    this.token = token;
    this.writesEnabled = writesEnabled;
    this.f = f;
    this.api = api;
  }
  async openIssue(a, p) {
    if (a.status !== "APPROVED" || !a.approvedBy) throw new PublishRefused("Only a human-APPROVED artefact can be published.");
    if (!this.writesEnabled) throw new PublishRefused('Ecosystem writes are disabled (OPS_ALLOW_ECOSYSTEM_WRITES is not "true"). Download the proposal instead.');
    if (!this.token) throw new PublishRefused("No GitHub token is configured on the server.");
    const r = await this.f(`${this.api}/repos/${this.repo}/issues`, { method: "POST", headers: { authorization: `Bearer ${this.token}`, accept: "application/vnd.github+json", "content-type": "application/json", "user-agent": "infinite-ai-ops" }, body: JSON.stringify(p) });
    if (!r.ok) throw new PublishRefused(`GitHub refused: ${r.status}`);
    return { url: (await r.json()).html_url };
  }
};

// src/server/fileAdapter.ts
import { appendFileSync, mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
var FileStore = class {
  constructor(dir = join(process.cwd(), "data", "warehouse")) {
    this.dir = dir;
    this.cache = {};
    mkdirSync(this.dir, { recursive: true });
    for (const f of readdirSync(this.dir).filter((n) => n.endsWith(".jsonl"))) {
      this.cache[f.slice(0, -6)] = readFileSync(join(this.dir, f), "utf8").split("\n").filter(Boolean).map((l, i) => {
        try {
          return JSON.parse(l);
        } catch {
          throw new Error(`warehouse file ${f} line ${i + 1} is not valid JSON`);
        }
      });
    }
  }
  path(c) {
    if (!/^[a-z0-9_]{1,64}$/.test(c)) throw new Error("bad collection name");
    return join(this.dir, `${c}.jsonl`);
  }
  append(collection, rec) {
    appendFileSync(this.path(collection), JSON.stringify(rec) + "\n");
    (this.cache[collection] ??= []).push(rec);
  }
  load() {
    return this.cache;
  }
  list(c) {
    return this.cache[c] ?? [];
  }
  exists(c) {
    return c in this.cache;
  }
};

// src/server/claude.ts
var ClaudeError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function completeWithClaude(r) {
  const f = r.fetchImpl ?? fetch;
  const res = await f(`${r.api ?? "https://api.anthropic.com"}/v1/messages`, {
    method: "POST",
    headers: { "x-api-key": r.apiKey, "anthropic-version": "2023-06-01", "content-type": "application/json" },
    body: JSON.stringify({ model: r.model, max_tokens: r.maxTokens ?? 1024, system: r.system, messages: [{ role: "user", content: r.prompt }] }),
    signal: AbortSignal.timeout(3e4)
  });
  if (!res.ok) throw new ClaudeError(res.status, `Anthropic ${res.status}`);
  const j = await res.json();
  const text = (j.content ?? []).filter((b) => b.type === "text").map((b) => b.text ?? "").join("");
  if (!text) throw new ClaudeError(502, "Anthropic returned no text");
  return text;
}

// src/server/auth.ts
import { createHash, timingSafeEqual } from "node:crypto";
var digest = (t) => createHash("sha256").update(t).digest();
var LOOPBACK = /* @__PURE__ */ new Set(["127.0.0.1", "::1", "localhost"]);
function parseAuth(env2) {
  const users = [];
  const add = (id, token) => {
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error(`OPS_USERS: bad user id "${id}" (use a-z, 0-9, "-", 2-40 chars)`);
    if (token.length < 20) throw new Error(`OPS_USERS: token for "${id}" must be at least 20 characters`);
    if (users.some((u) => u.id === id)) throw new Error(`OPS_USERS: duplicate user "${id}"`);
    const d = digest(token);
    if (users.some((u) => timingSafeEqual(u.digest, d))) throw new Error("OPS_USERS: two users share a token");
    users.push({ id, digest: d });
  };
  for (const entry of (env2.OPS_USERS ?? "").split(",").map((s) => s.trim()).filter(Boolean)) {
    const i = entry.indexOf(":");
    if (i < 1) throw new Error("OPS_USERS: entries look like id:token");
    add(entry.slice(0, i), entry.slice(i + 1));
  }
  if (env2.OPS_API_TOKEN) add("operator", env2.OPS_API_TOKEN);
  if (users.length) return { mode: "users", users };
  if (env2.OPS_OPEN_DEV === "true" || LOOPBACK.has(env2.HOST ?? "127.0.0.1")) return { mode: "open" };
  throw new Error("No users configured (OPS_USERS) and HOST is not loopback. Set OPS_USERS, or OPS_OPEN_DEV=true for a throwaway local container.");
}
function authenticate(auth2, token) {
  if (auth2.mode !== "users" || !token) return null;
  const d = digest(token);
  let found = null;
  for (const u of auth2.users) if (timingSafeEqual(u.digest, d)) found = u.id;
  return found;
}

// src/departments/kit.ts
var TBC = "\u2014 to complete \u2014";
var src = (ctx, key, fallback = "unknown") => key in ctx.facts ? `${ctx.facts[key]} [src:${key}]` : fallback;
function blocksFrom(secs) {
  const out = [];
  for (const s of secs) {
    out.push({ type: "h", level: 2, text: s.h });
    if (s.callout) out.push({ type: "callout", tone: s.callout.tone, text: s.callout.text });
    if (s.p) out.push({ type: "p", text: s.p });
    if (s.input !== void 0) out.push({ type: "p", text: s.input.trim() ? s.input : TBC });
    if (s.kv) out.push({ type: "kv", pairs: s.kv });
    if (s.bullets) out.push({ type: "ul", items: s.bullets });
    if (s.ol) out.push({ type: "ol", items: s.ol });
    if (s.checks) out.push({ type: "checklist", checks: s.checks.map((label) => ({ label, done: false })) });
    if (s.table) out.push({ type: "table", headers: s.table.headers, rows: s.table.rows });
  }
  return out;
}
function defineAgent(dept, code, d) {
  const id = `OPS-${code}-${String(d.n).padStart(2, "0")}`;
  return {
    id,
    version: "1.0.0",
    dept,
    name: d.name,
    summary: d.summary,
    framework: d.framework,
    purpose: d.purpose,
    allowedPurposes: [d.purpose],
    dataClass: "internal",
    reads: ["L1", "L2", "L3"],
    formats: d.formats ?? ["md", "docx", "html", "pdf", "json"],
    inputs: d.inputs,
    requiresApproval: true,
    secondApprover: d.secondApprover,
    budget: { maxPromptChars: 6e3 },
    evalRef: "test/departments.test.ts",
    narrativeFacts: d.narrative,
    build(ctx) {
      const provided = d.inputs.map((i) => [i.label, ctx.input[i.key]?.trim() ? ctx.input[i.key] : TBC]);
      const head = [
        { type: "callout", tone: "info", text: `Draft for human review. Method: ${d.framework}. Agent ${id} v1.0.0. Figures are either sourced from the ecosystem snapshot, typed in by you, or removed and flagged as unsourced.` }
      ];
      if (d.warning) head.push({ type: "callout", tone: "warn", text: d.warning });
      head.push({ type: "h", level: 2, text: "Inputs provided" }, { type: "kv", pairs: provided });
      const tail2 = [
        { type: "h", level: 2, text: "Human review before this is used" },
        { type: "checklist", checks: ["Facts checked against their sources", "Every number traced or removed", "No personal or learner information included", "Approver named in the platform"].map((label) => ({ label, done: false })) }
      ];
      return { title: d.title ? d.title(ctx) : d.name, subtitle: d.summary, blocks: [...head, ...blocksFrom(d.sections(ctx)), ...tail2], meta: { generated: (/* @__PURE__ */ new Date()).toISOString().slice(0, 10) } };
    }
  };
}
var txt = (key, label, required = false, help) => ({ key, label, kind: "text", required, help });
var long = (key, label, required = false, help) => ({ key, label, kind: "longtext", required, help });
var num = (key, label, required = false, help) => ({ key, label, kind: "number", required, help });
var pick = (key, label, options, required = false) => ({ key, label, kind: "select", options, required });
var blankRows = (labels, cols) => labels.map((l) => [l, ...Array(cols - 1).fill("")]);
var v = (ctx, k) => ctx.input[k]?.trim() || TBC;

// src/departments/calc.ts
var div = (a, b) => b === 0 || !Number.isFinite(a / b) ? null : a / b;
var runway = (cash, monthlyNetBurn) => [
  { label: "Runway", value: monthlyNetBurn > 0 ? div(cash, monthlyNetBurn) : null, unit: "months", formula: "cash \xF7 monthly net burn" }
];
var burnMultiple = (netBurn, netNewArr) => [
  { label: "Burn multiple", value: div(netBurn, netNewArr), unit: "\xD7", formula: "net burn \xF7 net new ARR" }
];
var unitEconomics = (cac, arpaMonthly, grossMarginPct, monthlyChurnPct) => {
  const gm = grossMarginPct / 100;
  const churn = monthlyChurnPct / 100;
  const ltv = churn > 0 ? div(arpaMonthly * gm, churn) : null;
  return [
    { label: "LTV", value: ltv, unit: "currency", formula: "ARPA \xD7 gross margin \xF7 monthly churn" },
    { label: "LTV : CAC", value: ltv === null ? null : div(ltv, cac), unit: "\xD7", formula: "LTV \xF7 CAC" },
    { label: "CAC payback", value: div(cac, arpaMonthly * gm), unit: "months", formula: "CAC \xF7 (ARPA \xD7 gross margin)" }
  ];
};
var nrr = (startMrr, expansion, contraction, churned) => [
  { label: "Net revenue retention", value: div(startMrr + expansion - contraction - churned, startMrr) === null ? null : div(startMrr + expansion - contraction - churned, startMrr) * 100, unit: "%", formula: "(start + expansion \u2212 contraction \u2212 churn) \xF7 start" },
  { label: "Gross revenue retention", value: div(startMrr - contraction - churned, startMrr) === null ? null : div(startMrr - contraction - churned, startMrr) * 100, unit: "%", formula: "(start \u2212 contraction \u2212 churn) \xF7 start" }
];
var grossMargin = (revenue, cogs) => [
  { label: "Gross margin", value: revenue === 0 ? null : (revenue - cogs) / revenue * 100, unit: "%", formula: "(revenue \u2212 COGS) \xF7 revenue" }
];
var breakEven = (fixedCosts, pricePerUnit, variableCostPerUnit) => [
  { label: "Break-even units", value: pricePerUnit - variableCostPerUnit > 0 ? div(fixedCosts, pricePerUnit - variableCostPerUnit) : null, unit: "units", formula: "fixed costs \xF7 (price \u2212 variable cost)" }
];
var rice = (reach, impact, confidencePct, effort) => [
  { label: "RICE score", value: div(reach * impact * (confidencePct / 100), effort), unit: "points", formula: "reach \xD7 impact \xD7 confidence \xF7 effort" }
];
var weightedScore = (rows) => {
  const w = rows.reduce((a, r) => a + r.weight, 0);
  return [{ label: "Weighted score", value: div(rows.reduce((a, r) => a + r.weight * r.score, 0), w), unit: "weighted avg", formula: "\u03A3(weight \xD7 score) \xF7 \u03A3 weight" }];
};
function priority(impact, urgency) {
  const s = impact + urgency;
  return s <= 2 ? "P1" : s === 3 ? "P2" : s <= 4 ? "P3" : "P4";
}
var MEDDICC = ["Metrics", "Economic buyer", "Decision criteria", "Decision process", "Identify pain", "Champion", "Competition", "Paper process"];
var variance = (budget, actual) => [
  { label: "Variance", value: actual - budget, unit: "currency", formula: "actual \u2212 budget" },
  { label: "Variance %", value: budget === 0 ? null : (actual - budget) / budget * 100, unit: "%", formula: "(actual \u2212 budget) \xF7 budget" }
];

// src/departments/d1.ts
var ecoStats = (f) => [
  { label: "Workspace units", value: f["eco.units"], source: "snapshot" },
  { label: "Source lines (non-test)", value: Number(f["eco.srcLoc"]).toLocaleString("en-ZA"), source: "snapshot" },
  { label: "Test files", value: f["eco.testFiles"], source: "snapshot" },
  { label: "Build stages logged", value: f["eco.stages"], source: "snapshot" },
  { label: "Open questions", value: `${f["eco.oq.open"]} of ${f["eco.oq.total"]}`, source: "snapshot", tone: "warn" },
  { label: "Agent contracts", value: f["eco.agents.contracts"], source: "snapshot" }
];
var executive = {
  id: "executive",
  name: "Executive & Strategy",
  icon: "Compass",
  mission: "One view of the company and the product. Decisions recorded, objectives owned, the board informed from real data.",
  frameworks: ["OKRs (Doerr)", "Balanced Scorecard (Kaplan & Norton)", "One-way / two-way door decisions (Amazon)", "Six-page narrative memo", "Decision log"],
  widgets: [
    { id: "eco-pulse", title: "Ecosystem pulse (snapshot)", type: "stats", note: "Counted from the repository by scripts/audit-ecosystem.mjs. Not estimates.", stats: ecoStats },
    { id: "okr", title: "OKR tracker", type: "tracker", collection: "okr", columns: [{ key: "objective", label: "Objective", kind: "text" }, { key: "kr", label: "Key result", kind: "text" }, { key: "owner", label: "Owner (role)", kind: "text" }, { key: "target", label: "Target", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["Not started", "On track", "At risk", "Done"] }] },
    { id: "decisions", title: "Decision log", type: "tracker", collection: "decisions", columns: [{ key: "decision", label: "Decision", kind: "text" }, { key: "door", label: "Door", kind: "select", options: ["One-way", "Two-way"] }, { key: "decider", label: "Decider (role)", kind: "text" }, { key: "date", label: "Date", kind: "date" }, { key: "review", label: "Review on", kind: "date" }] }
  ],
  agents: [
    defineAgent("executive", "EXEC", {
      n: 1,
      name: "Board update pack",
      summary: "Quarterly board / advisor update seeded with real ecosystem facts.",
      framework: "Balanced Scorecard + narrative memo",
      purpose: "strategy_planning",
      formats: ["md", "docx", "html", "pdf", "json"],
      inputs: [txt("period", "Reporting period", true), long("wins", "Wins this period (your words)"), long("risks", "Top risks (your words)"), long("asks", "Asks of the board / advisors")],
      narrative: (c) => ({ "eco.stages": c.facts["eco.stages"] ?? 0, "eco.oq.open": c.facts["eco.oq.open"] ?? 0 }),
      sections: (c) => [
        { h: "Product & engineering (from the repository)", table: { headers: ["Measure", "Value", "Source"], rows: [["Build stages logged", src(c, "eco.stages"), "docs/STAGE_LOG.md"], ["Latest stage", src(c, "eco.latestStage"), "docs/STAGE_LOG.md"], ["Open questions", `${src(c, "eco.oq.open")} of ${src(c, "eco.oq.total")}`, "docs/OPEN_QUESTIONS.md"], ["Agent contracts", src(c, "eco.agents.contracts"), "packages/agents"], ["Commit audited", src(c, "eco.head"), "git"]] } },
        { h: "Wins", input: c.input.wins ?? "" },
        { h: "Risks", input: c.input.risks ?? "" },
        { h: "Customer, finance and people", callout: { tone: "warn", text: "No customer, revenue or headcount figures are generated. Add them yourself from your records, with a source." }, table: { headers: ["Perspective", "Measure (you define)", "Value (you supply)", "Source"], rows: blankRows(["Customer", "Financial", "Internal process", "Learning & growth"], 4) } },
        { h: "Asks", input: c.input.asks ?? "" }
      ]
    }),
    defineAgent("executive", "EXEC", {
      n: 2,
      name: "OKR drafter",
      summary: "Turn a direction into objectives and measurable key results, with owners and check-in cadence.",
      framework: "OKRs (Doerr)",
      purpose: "strategy_planning",
      inputs: [txt("quarter", "Quarter / period", true), long("direction", "Strategic direction in one or two sentences", true), long("constraints", "Constraints (budget, time, people)")],
      sections: (c) => [
        { h: "Direction", input: c.input.direction ?? "" },
        { h: "Rules for good OKRs", bullets: ["Objective: qualitative, inspiring, time-bound.", "Key results: measurable outcomes, not tasks; each has a baseline and a target you can verify.", "Few objectives, few key results each.", "Aspirational (stretch) and committed OKRs are labelled differently.", "Score honestly at the end; do not edit targets after the fact."] },
        { h: "Draft OKRs (complete the targets from your own data)", table: { headers: ["Objective", "Key result", "Baseline (source)", "Target", "Owner (role)", "Check-in"], rows: [["O1", "KR1.1", "", "", "", "Weekly"], ["O1", "KR1.2", "", "", "", "Weekly"], ["O2", "KR2.1", "", "", "", "Weekly"]] } },
        { h: "Constraints", input: c.input.constraints ?? "" }
      ]
    }),
    defineAgent("executive", "EXEC", {
      n: 3,
      name: "Decision memo",
      summary: "Structured decision record: options, trade-offs, reversibility, owner and review date.",
      framework: "One-way / two-way door + decision log",
      purpose: "strategy_planning",
      inputs: [txt("decision", "Decision to make", true), long("options", "Options considered (one per line)", true), long("criteria", "Criteria that matter"), pick("door", "Reversibility", ["Two-way (easily reversed)", "One-way (hard to reverse)"])],
      sections: (c) => [
        { h: "Decision", input: c.input.decision ?? "" },
        { h: "Reversibility", callout: { tone: c.input.door?.startsWith("One") ? "warn" : "info", text: c.input.door?.startsWith("One") ? "One-way door: slow down, gather evidence, name a second reviewer." : "Two-way door: decide quickly with the information in hand, and review after." } },
        { h: "Options", input: c.input.options ?? "" },
        { h: "Assessment", table: { headers: ["Option", "Benefits", "Costs / risks", "Reversible?", "Evidence (source)"], rows: blankRows(["Option A", "Option B", "Do nothing"], 5) } },
        { h: "Criteria", input: c.input.criteria ?? "" },
        { h: "Recommendation and owner", kv: [["Recommendation", TBC], ["Decider (role)", TBC], ["Decision date", TBC], ["Review date", TBC]] }
      ]
    })
  ]
};
var product = {
  id: "product",
  name: "Product & Engineering",
  icon: "Boxes",
  mission: "Plan and govern work on the Education Ecosystem using its own stage-gate rules, with live repository status.",
  frameworks: ["Stage-Gate (Cooper)", "RICE prioritisation (Intercom)", "Architecture Decision Records (Nygard)", "DORA delivery metrics (from CI only)", "Definition of Done"],
  widgets: [
    { id: "pulls", title: "Open pull requests (live)", type: "live", source: "pulls" },
    { id: "ci", title: "CI runs (live)", type: "live", source: "ci" },
    { id: "stages", title: "Latest build stages", type: "live", source: "stages" },
    { id: "rice", title: "RICE calculator", type: "calc", note: "Reach, impact, confidence and effort come from you. Nothing is pre-filled.", inputs: [{ key: "reach", label: "Reach (people per period)" }, { key: "impact", label: "Impact (your scale)" }, { key: "conf", label: "Confidence", unit: "%" }, { key: "effort", label: "Effort (person-weeks)" }], compute: (x) => rice(x.reach, x.impact, x.conf, x.effort) },
    { id: "backlog", title: "Roadmap backlog", type: "tracker", collection: "roadmap", columns: [{ key: "item", label: "Item", kind: "text" }, { key: "rice", label: "RICE", kind: "number" }, { key: "stage", label: "Stage-gate", kind: "select", options: ["Idea", "Scoped", "Build", "Test", "Launch"] }, { key: "oq", label: "Linked OQ", kind: "text" }] }
  ],
  agents: [
    defineAgent("product", "PROD", {
      n: 1,
      name: "Ecosystem stage-gate proposal",
      summary: "A change proposal that follows the ecosystem\u2019s own CLAUDE.md rules, ready to open as a GitHub issue after approval.",
      framework: "Stage-Gate + Definition of Done",
      purpose: "engineering_governance",
      formats: ["md", "docx", "json"],
      secondApprover: true,
      inputs: [txt("title", "Proposal title", true), long("problem", "Problem / outcome wanted", true), long("scope", "In scope / out of scope"), long("risks", "Risks and open questions")],
      title: (c) => `Proposal: ${c.input.title ?? ""}`,
      sections: (c) => [
        { h: "Context (from the repository)", kv: [["Audited commit", src(c, "eco.head")], ["Latest stage", src(c, "eco.latestStage")], ["Open questions", src(c, "eco.oq.open")]] },
        { h: "Problem", input: c.input.problem ?? "" },
        { h: "Scope", input: c.input.scope ?? "" },
        { h: "Ecosystem rules this change must respect", checks: ["One stage, one PR; docs/STAGE_LOG.md updated in the same commit", "Unit tests: happy path plus at least two failure paths", "No second model path; human approval cannot be bypassed", "No PII in prompts; tenant isolation preserved", "No secrets in the repository; new dependencies recorded in docs", "Strict TypeScript, no `any`", "If unsure: stop and add the question to docs/OPEN_QUESTIONS.md"] },
        { h: "Risks and open questions", input: c.input.risks ?? "" },
        { h: "Acceptance criteria", ol: [TBC, TBC, TBC] }
      ]
    }),
    defineAgent("product", "PROD", {
      n: 2,
      name: "RICE backlog prioritiser",
      summary: "Score and rank candidate work from numbers you supply.",
      framework: "RICE (Intercom)",
      purpose: "engineering_governance",
      formats: ["md", "csv", "xlsx", "json"],
      inputs: [long("items", "Candidates, one per line: name | reach | impact | confidence% | effort", true, "Example: Parent report | 400 | 2 | 80 | 3")],
      sections: (c) => {
        const rows = (c.input.items ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 5 && p[0]).map((p) => {
          const [r, i, cf, e] = [Number(p[1]), Number(p[2]), Number(p[3]), Number(p[4])];
          const s = e > 0 && [r, i, cf].every(Number.isFinite) ? r * i * (cf / 100) / e : NaN;
          return [p[0], p[1], p[2], p[3], p[4], Number.isFinite(s) ? Math.round(s * 100) / 100 : "n/a"];
        }).sort((a, b) => (typeof b[5] === "number" ? b[5] : -1) - (typeof a[5] === "number" ? a[5] : -1));
        return [{ h: "Ranked backlog", table: { headers: ["Item", "Reach", "Impact", "Confidence %", "Effort", "RICE"], rows: rows.length ? rows : [[TBC, "", "", "", "", ""]] } }, { h: "Method", p: "RICE = reach \xD7 impact \xD7 confidence \xF7 effort. A score is a conversation starter, not a decision. Low-confidence items need evidence before they are built." }];
      }
    }),
    defineAgent("product", "PROD", {
      n: 3,
      name: "Architecture decision record",
      summary: "ADR: the decision, context, options and consequences, kept with the code.",
      framework: "ADR (Nygard)",
      purpose: "engineering_governance",
      formats: ["md", "docx", "json"],
      inputs: [txt("title", "Decision title", true), long("context", "Context and forces", true), long("options", "Options considered"), txt("decision", "Decision taken")],
      title: (c) => `ADR: ${c.input.title ?? ""}`,
      sections: (c) => [{ h: "Status", p: "Proposed" }, { h: "Context", input: c.input.context ?? "" }, { h: "Options considered", input: c.input.options ?? "" }, { h: "Decision", input: c.input.decision ?? "" }, { h: "Consequences", kv: [["Positive", TBC], ["Negative / cost", TBC], ["Follow-ups", TBC]] }, { h: "Ecosystem invariants checked", checks: ["Tenant isolation", "No PII in prompts", "Purpose limitation", "Append-only ledgers"] }]
    })
  ]
};
var curriculum = {
  id: "curriculum",
  name: "Curriculum & Pedagogy QA",
  icon: "BookOpenCheck",
  mission: "Quality assurance for the learning content the Ecosystem will serve. CAPS is the authority; this department never invents policy.",
  frameworks: ["Bloom's revised taxonomy", "Universal Design for Learning (CAST)", "Backward design (Wiggins & McTighe)", "CAPS alignment review", "Teacher-in-the-loop review"],
  widgets: [
    { id: "caps-qa", title: "Lesson QA checklist", type: "checklist", collection: "curriculum_qa", items: ["Aligned to a named CAPS topic and term (cite the CAPS document and page)", "Learning outcome is observable and assessable", "Language level suits the grade and home-language policy", "Activities include concrete, visual or practical work", "Differentiation: support and extension are both present", "Assessment matches the outcome", "Examples are South African and culturally respectful", "No learner names or identifiers in the material", "Teacher guidance is clear: AI drafts, the teacher decides"] },
    { id: "qa-log", title: "Content review log", type: "tracker", collection: "content_review", columns: [{ key: "asset", label: "Asset", kind: "text" }, { key: "grade", label: "Grade", kind: "select", options: ["R", "1", "2", "3", "4", "5", "6", "7"] }, { key: "caps", label: "CAPS reference", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["To review", "Changes needed", "Approved"] }, { key: "reviewer", label: "Reviewer (role)", kind: "text" }] }
  ],
  agents: [
    defineAgent("curriculum", "CURR", {
      n: 1,
      name: "Lesson plan QA review",
      summary: "A structured review of a lesson plan you paste in. It flags what to check against CAPS; it does not decide compliance.",
      framework: "CAPS alignment review + Bloom + UDL",
      purpose: "content_review",
      formats: ["md", "docx", "html", "pdf"],
      warning: "This review cannot confirm CAPS compliance. Verify every alignment claim against the official CAPS document.",
      inputs: [pick("grade", "Grade", ["R", "1", "2", "3", "4", "5", "6", "7"], true), txt("subject", "Subject", true), txt("caps", "CAPS topic and page you believe it matches"), long("lesson", "Lesson plan text (no learner names)", true)],
      sections: (c) => [
        { h: "Lesson under review", input: c.input.lesson ?? "" },
        { h: "CAPS alignment (human to verify)", table: { headers: ["Check", "Result", "Evidence / CAPS page"], rows: [["Topic and term match the CAPS document", "To verify", c.input.caps ?? ""], ["Content depth fits the grade", "To verify", ""], ["Assessment type fits CAPS requirements", "To verify", ""]] } },
        { h: "Cognitive demand (Bloom's)", p: "Mark the verbs used in the outcomes and activities, then check the spread suits the grade.", table: { headers: ["Level", "Present in lesson?", "Example from the lesson"], rows: blankRows(["Remember", "Understand", "Apply", "Analyse", "Evaluate", "Create"], 3) } },
        { h: "Access for all learners (UDL)", checks: ["Multiple ways to present the idea", "Multiple ways for learners to respond", "Multiple ways to engage and motivate", "Language support for additional-language learners"] },
        { h: "Teacher decision", kv: [["Outcome", "Approve / Revise / Reject"], ["Reviewer (role)", TBC], ["Date", TBC]] }
      ]
    }),
    defineAgent("curriculum", "CURR", {
      n: 2,
      name: "Backward-design unit planner",
      summary: "Outcome first, then evidence, then activities.",
      framework: "Backward design (Wiggins & McTighe)",
      purpose: "content_review",
      inputs: [pick("grade", "Grade", ["R", "1", "2", "3", "4", "5", "6", "7"], true), txt("topic", "Topic", true), long("outcome", "Intended learning outcome (from CAPS)", true)],
      sections: (c) => [{ h: "Stage 1 \xB7 Desired results", input: c.input.outcome ?? "" }, { h: "Stage 2 \xB7 Evidence of learning", table: { headers: ["Evidence", "Type", "Success looks like"], rows: blankRows(["Performance task", "Quick check", "Observation"], 3) } }, { h: "Stage 3 \xB7 Learning plan", table: { headers: ["Lesson", "Activity", "Resources", "Differentiation"], rows: blankRows(["Lesson 1", "Lesson 2", "Lesson 3"], 4) } }, { h: "Sources used", callout: { tone: "warn", text: "List the CAPS document and any resource used. Content without a source stays marked unverified." } }]
    }),
    defineAgent("curriculum", "CURR", {
      n: 3,
      name: "Differentiation and support sheet",
      summary: "Support, core and extension versions of one task.",
      framework: "UDL + tiered tasks",
      purpose: "content_review",
      inputs: [txt("task", "Task / activity", true), pick("grade", "Grade", ["R", "1", "2", "3", "4", "5", "6", "7"], true), long("needs", "Typical range of needs in the class (no names)")],
      sections: (c) => [{ h: "Core task", input: c.input.task ?? "" }, { h: "Tiers", table: { headers: ["Tier", "What changes", "Scaffold or stretch"], rows: blankRows(["Support", "Core", "Extension"], 3) } }, { h: "Range of needs", input: c.input.needs ?? "" }]
    })
  ]
};
var aibrain = {
  id: "ai",
  name: "AI, Brain & Evals",
  icon: "BrainCircuit",
  mission: "Govern the Infinite Brain and agents: contracts, evals, model risk. Reconcile what the docs say with what the repository contains.",
  frameworks: ["NIST AI RMF (Govern, Map, Measure, Manage)", "Model cards", "Eval-driven development", "Prompt change control"],
  widgets: [
    { id: "roster", title: "Agent contracts by module", type: "live", source: "roster" },
    { id: "roster-check", title: "Roster reconciliation", type: "stats", note: "The documented count and the counted contracts disagree until someone reconciles them.", stats: (f) => [{ label: "Contract files counted", value: f["eco.agents.contracts"], source: "snapshot" }, { label: "Count stated in docs/AGENTS.md", value: f["eco.agents.documented"], source: "snapshot", tone: "warn" }] },
    { id: "evals", title: "Eval tracker", type: "tracker", collection: "evals", columns: [{ key: "agent", label: "Agent id", kind: "text" }, { key: "suite", label: "Eval suite", kind: "text" }, { key: "result", label: "Last result (from CI)", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["None", "Defined", "Passing", "Failing"] }] }
  ],
  agents: [
    defineAgent("ai", "AI", {
      n: 1,
      name: "Agent roster reconciliation",
      summary: "Compares counted agent contracts with the documented roster and flags differences to resolve.",
      framework: "NIST AI RMF \xB7 Govern",
      purpose: "ai_governance",
      formats: ["md", "csv", "xlsx", "docx"],
      inputs: [txt("other", "Any other roster figure you have seen (e.g. in a deck), with where")],
      sections: (c) => {
        const mods = Object.keys(c.facts).filter((k) => k.startsWith("eco.agents.") && !["eco.agents.contracts", "eco.agents.documented"].includes(k));
        return [
          { h: "Counted from the repository", table: { headers: ["Module", "Contract files"], rows: mods.map((k) => [k.replace("eco.agents.", ""), src(c, k)]) } },
          { h: "Comparison", table: { headers: ["Source", "Count"], rows: [["Contract files (packages/agents)", src(c, "eco.agents.contracts")], ["docs/AGENTS.md states", src(c, "eco.agents.documented")], ["Other source you supplied", v(c, "other")]] } },
          { h: "Action", callout: { tone: "warn", text: "These sources should agree. Decide which is authoritative, update the others, and record the answer. Do not quote a roster number externally until they match." } }
        ];
      }
    }),
    defineAgent("ai", "AI", {
      n: 2,
      name: "Model risk assessment",
      summary: "Risk register entry for an agent or model use, mapped to NIST AI RMF functions.",
      framework: "NIST AI RMF",
      purpose: "ai_governance",
      secondApprover: true,
      inputs: [txt("agent", "Agent or use case", true), long("use", "What it does and who relies on it", true), long("harms", "Foreseeable harms")],
      sections: (c) => [{ h: "Use case", input: c.input.use ?? "" }, { h: "Foreseeable harms", input: c.input.harms ?? "" }, { h: "Risk register", table: { headers: ["Function", "Question", "Finding", "Control / owner"], rows: [["Govern", "Is there a named accountable human?", "", ""], ["Map", "Who could be harmed, and how?", "", ""], ["Measure", "Which eval shows the risk is controlled?", "", ""], ["Manage", "What is the rollback / human override?", "", ""]] } }, { h: "Ecosystem guardrails to confirm", checks: ["De-identified input only", "Purpose limitation enforced", "Human approval before any output is used", "Output logged in the audit ledger"] }]
    }),
    defineAgent("ai", "AI", {
      n: 3,
      name: "Eval plan",
      summary: "Define what \u201Cgood\u201D means for an agent before changing it.",
      framework: "Eval-driven development",
      purpose: "ai_governance",
      formats: ["md", "docx", "csv", "xlsx"],
      inputs: [txt("agent", "Agent id", true), long("behaviour", "Behaviour to protect", true), long("failures", "Failure modes to test")],
      sections: (c) => [{ h: "Behaviour to protect", input: c.input.behaviour ?? "" }, { h: "Cases", table: { headers: ["Case", "Type", "Input (de-identified)", "Expected", "Pass rule"], rows: [["Happy path", "Positive", "", "", ""], ["Failure 1", "Negative", "", "", ""], ["Failure 2", "Negative", "", "", ""], ["Injection attempt", "Safety", "", "", ""]] } }, { h: "Failure modes", input: c.input.failures ?? "" }, { h: "Gate", p: "No prompt, model or contract change ships without these cases passing in CI." }]
    })
  ]
};

// src/departments/d2.ts
var POPIA_CONDITIONS = ["Accountability", "Processing limitation", "Purpose specification", "Further processing limitation", "Information quality", "Openness", "Security safeguards", "Data subject participation"];
var security = {
  id: "security",
  name: "Security & POPIA Compliance",
  icon: "ShieldCheck",
  mission: "Keep the company and the Ecosystem compliant with POPIA and secure by design. Compliance is a precondition, not a feature.",
  frameworks: ["POPIA eight conditions for lawful processing", "Privacy impact assessment", "ISO/IEC 27001-style control mapping", "NIST CSF (Identify, Protect, Detect, Respond, Recover)", "Breach response (POPIA s22)"],
  widgets: [
    { id: "popia", title: "POPIA eight conditions", type: "checklist", collection: "popia_conditions", items: POPIA_CONDITIONS.map((c) => `${c}: evidence recorded and reviewed`) },
    { id: "oqs", title: "Open questions (live from snapshot)", type: "live", source: "oq", note: "Includes security items such as OQ-036 (MFA not shown as enforced in the Keycloak realm). Raised in the repository on 2026-10-24." },
    { id: "risks", title: "Risk register", type: "tracker", collection: "risk", columns: [{ key: "risk", label: "Risk", kind: "text" }, { key: "category", label: "Category", kind: "select", options: ["Privacy", "Security", "Legal", "Operational", "Reputational", "Financial"] }, { key: "likelihood", label: "Likelihood (L/M/H)", kind: "select", options: ["Low", "Medium", "High"] }, { key: "impact", label: "Impact (L/M/H)", kind: "select", options: ["Low", "Medium", "High"] }, { key: "owner", label: "Owner (role)", kind: "text" }, { key: "treatment", label: "Treatment", kind: "text" }] },
    { id: "breach", title: "Incident / breach log", type: "tracker", collection: "breach_log", columns: [{ key: "what", label: "What happened (no personal data)", kind: "text" }, { key: "detected", label: "Detected", kind: "date" }, { key: "regulator", label: "Regulator told?", kind: "select", options: ["Not required", "Decision pending", "Yes"] }, { key: "subjects", label: "Data subjects told?", kind: "select", options: ["Not required", "Decision pending", "Yes"] }] }
  ],
  agents: [
    defineAgent("security", "SEC", {
      n: 1,
      name: "POPIA conditions assessment",
      summary: "Assess a process or system against the eight conditions for lawful processing.",
      framework: "POPIA eight conditions",
      purpose: "compliance_review",
      secondApprover: true,
      formats: ["md", "docx", "xlsx", "html", "pdf"],
      warning: "This is a working assessment, not legal advice. The Information Officer and counsel decide.",
      inputs: [txt("process", "Process or system assessed", true), long("data", "Categories of personal information involved (categories only, no real data)", true), long("purpose", "Purpose of processing"), txt("basis", "Lawful basis you rely on")],
      sections: (c) => [
        { h: "Scope", kv: [["Process", v(c, "process")], ["Purpose", v(c, "purpose")], ["Lawful basis", v(c, "basis")]] },
        { h: "Personal information involved", input: c.input.data ?? "" },
        { h: "Assessment against the eight conditions", table: { headers: ["Condition", "Question", "Finding", "Evidence", "Action / owner"], rows: [["Accountability", "Is a responsible party and Information Officer named?", "", "", ""], ["Processing limitation", "Lawful, minimal, with a justification (s11) and consent where needed?", "", "", ""], ["Purpose specification", "Is the purpose specific and retention defined?", "", "", ""], ["Further processing limitation", "Is any new use compatible with the original purpose?", "", "", ""], ["Information quality", "Is the data complete, accurate and updated?", "", "", ""], ["Openness", "Are data subjects informed and records maintained?", "", "", ""], ["Security safeguards", "Are technical and organisational measures in place, and operators bound by written contract?", "", "", ""], ["Data subject participation", "Can people access, correct and delete?", "", "", ""]] } },
        { h: "Special categories and children", callout: { tone: "warn", text: "Information about children and other special personal information carries extra conditions. Escalate to the Information Officer before any processing. The Ecosystem\u2019s rule is that learner-level data never enters the operations platform." } },
        { h: "Cross-border and operators", checks: ["Every operator (hosting, AI provider) has a written contract", "Any transfer outside South Africa meets the cross-border conditions (s72)", "Sub-processors are listed"] }
      ]
    }),
    defineAgent("security", "SEC", {
      n: 2,
      name: "Breach response plan",
      summary: "Decision record and checklist for a suspected security compromise.",
      framework: "POPIA s22 + NIST CSF Respond",
      purpose: "compliance_review",
      secondApprover: true,
      warning: "POPIA s22 requires notification to the Regulator and affected data subjects as soon as reasonably possible after discovery. Confirm the current requirements and form with counsel and the Information Regulator.",
      inputs: [long("incident", "What happened (facts only, no personal data)", true), txt("detected", "When detected"), long("systems", "Systems affected")],
      sections: (c) => [
        { h: "Facts", input: c.input.incident ?? "" },
        { h: "Systems affected", input: c.input.systems ?? "" },
        { h: "Response checklist", checks: ["Contain: stop the compromise and preserve evidence", "Assess: what personal information, how many data subjects, what risk of harm", "Decide: notify the Information Regulator and affected data subjects (record who decided and when)", "Notify: with the information the law requires", "Operators informed where they hold the data", "Eradicate and recover; confirm with a test", "Blameless review within an agreed time; record lessons"] },
        { h: "Decision record", kv: [["Decision maker (role)", TBC], ["Regulator notified", TBC], ["Data subjects notified", TBC], ["Time of decision", TBC]] }
      ]
    }),
    defineAgent("security", "SEC", {
      n: 3,
      name: "Security control mapping",
      summary: "Map an open security question to controls and an owner (ISO 27001-style).",
      framework: "ISO/IEC 27001-style Annex A mapping",
      purpose: "compliance_review",
      inputs: [txt("issue", "Issue or control gap (for example OQ-036 MFA)", true), long("context", "Context")],
      sections: (c) => [{ h: "Issue", input: c.input.issue ?? "" }, { h: "Context", input: c.input.context ?? "" }, { h: "Control mapping", table: { headers: ["Domain", "Control objective", "Current state (evidence)", "Gap", "Owner (role)", "Target date"], rows: [["Access control", "Strong authentication for privileged and school-admin access", "", "", "", ""], ["Cryptography", "Keys and secrets managed outside the repo", "", "", "", ""], ["Operations", "Logging and monitoring of access", "", "", "", ""], ["Supplier relationships", "Operators bound by contract", "", "", "", ""]] } }, { h: "Risk treatment", p: "Choose one for each gap: mitigate, accept (named owner), transfer or avoid. Record the decision in the risk register." }]
    })
  ]
};
var legal = {
  id: "legal",
  name: "Legal & Contracts",
  icon: "Scale",
  mission: "Standard terms, school agreements and operator agreements, drafted for a lawyer to review. The platform never gives legal advice.",
  frameworks: ["Contract lifecycle management", "Clause playbook with fall-backs", "POPIA operator agreement (s20\u201321)", "ECTA electronic signatures"],
  widgets: [
    { id: "contracts", title: "Contract register", type: "tracker", collection: "contracts", columns: [{ key: "counterparty", label: "Counterparty (organisation)", kind: "text" }, { key: "type", label: "Type", kind: "select", options: ["School agreement", "Operator agreement", "NDA", "Supplier", "Partnership", "Employment"] }, { key: "status", label: "Status", kind: "select", options: ["Drafting", "Counsel review", "Negotiation", "Signed", "Expired"] }, { key: "renewal", label: "Renewal / expiry", kind: "date" }, { key: "owner", label: "Owner (role)", kind: "text" }] },
    { id: "clauses", title: "Core clause checklist", type: "checklist", collection: "clause_check", items: ["Parties, scope and term", "Fees, invoicing and VAT treatment", "Data protection: roles (responsible party / operator) and instructions", "Security measures and breach notification duties", "Cross-border transfer terms", "Intellectual property and licence of content", "Service levels and support", "Limitation of liability", "Termination and data return / deletion", "Governing law and dispute resolution"] }
  ],
  agents: [
    defineAgent("legal", "LEG", {
      n: 1,
      name: "Contract review sheet",
      summary: "Clause-by-clause review sheet for a counterparty contract you paste in.",
      framework: "Clause playbook with fall-backs",
      purpose: "contract_review",
      secondApprover: true,
      warning: "Not legal advice. A qualified South African attorney must review before signature.",
      inputs: [txt("counterparty", "Counterparty (organisation)", true), pick("kind", "Contract type", ["School agreement", "Operator agreement", "NDA", "Supplier", "Partnership"], true), long("text", "Contract text or key clauses (no personal data)", true)],
      sections: (c) => [{ h: "Contract under review", input: c.input.text ?? "" }, { h: "Clause review", table: { headers: ["Clause", "What it says", "Risk (H/M/L)", "Preferred position", "Fall-back"], rows: blankRows(["Term and renewal", "Fees and payment", "Data protection roles", "Security and breach", "IP and licence", "Liability cap", "Termination and exit", "Governing law"], 5) } }, { h: "Questions for counsel", ol: [TBC, TBC] }]
    }),
    defineAgent("legal", "LEG", {
      n: 2,
      name: "Operator agreement outline (POPIA)",
      summary: "Outline of the terms a school (responsible party) and Infinite-AI (operator) should settle in writing.",
      framework: "POPIA operator obligations",
      purpose: "contract_review",
      secondApprover: true,
      warning: "Outline for counsel to turn into a contract. Not legal advice.",
      inputs: [txt("party", "School / responsible party (organisation)", true), long("processing", "Processing the operator will do")],
      sections: (c) => [{ h: "Parties", kv: [["Responsible party", v(c, "party")], ["Operator", "Infinite-AI"]] }, { h: "Processing", input: c.input.processing ?? "" }, { h: "Terms to settle", checks: ["Process only on documented instructions", "Confidentiality of personnel", "Security measures and how they are evidenced", "Notification of any security compromise to the responsible party", "Sub-operators and approval", "Cross-border transfers", "Assistance with data subject requests", "Return or deletion at the end", "Audit and information rights"] }]
    }),
    defineAgent("legal", "LEG", {
      n: 3,
      name: "NDA triage",
      summary: "Quick triage of an incoming NDA against a standard position.",
      framework: "Clause playbook",
      purpose: "contract_review",
      warning: "Triage only. Counsel decides.",
      inputs: [txt("counterparty", "Counterparty", true), long("text", "NDA text", true)],
      sections: (c) => [{ h: "Text", input: c.input.text ?? "" }, { h: "Triage", table: { headers: ["Point", "Standard position", "This NDA", "Flag"], rows: [["Mutual or one-way", "Mutual", "", ""], ["Definition of confidential information", "Reasonably narrow", "", ""], ["Term and survival", "Fixed, with defined survival", "", ""], ["Permitted disclosures", "Advisers, law, regulators", "", ""], ["Return / destruction", "On request", "", ""], ["Governing law", "South Africa", "", ""]] } }]
    })
  ]
};
var FIN_NOTE = "Calculators use only the numbers you type in. No benchmarks or assumptions are pre-filled.";
var finance = {
  id: "finance",
  name: "Finance",
  icon: "Landmark",
  mission: "Plan, forecast and report from your own numbers. Nothing here invents a financial figure.",
  frameworks: ["Three-statement forecast", "Unit economics (CAC, LTV, payback)", "Net revenue retention", "Burn multiple", "Budget vs actual variance analysis", "Rolling cash forecast"],
  widgets: [
    { id: "runway", title: "Runway", type: "calc", note: FIN_NOTE, inputs: [{ key: "cash", label: "Cash on hand", unit: "R" }, { key: "burn", label: "Monthly net burn", unit: "R" }], compute: (x) => runway(x.cash, x.burn) },
    { id: "unit", title: "Unit economics", type: "calc", note: FIN_NOTE, inputs: [{ key: "cac", label: "CAC", unit: "R" }, { key: "arpa", label: "Monthly revenue per account", unit: "R" }, { key: "gm", label: "Gross margin", unit: "%" }, { key: "churn", label: "Monthly churn", unit: "%" }], compute: (x) => unitEconomics(x.cac, x.arpa, x.gm, x.churn) },
    { id: "nrr", title: "Net revenue retention", type: "calc", note: FIN_NOTE, inputs: [{ key: "s", label: "Starting MRR", unit: "R" }, { key: "e", label: "Expansion", unit: "R" }, { key: "c", label: "Contraction", unit: "R" }, { key: "ch", label: "Churned", unit: "R" }], compute: (x) => nrr(x.s, x.e, x.c, x.ch) },
    { id: "burnm", title: "Burn multiple", type: "calc", note: FIN_NOTE, inputs: [{ key: "b", label: "Net burn", unit: "R" }, { key: "n", label: "Net new ARR", unit: "R" }], compute: (x) => burnMultiple(x.b, x.n) },
    { id: "margin", title: "Gross margin", type: "calc", note: FIN_NOTE, inputs: [{ key: "r", label: "Revenue", unit: "R" }, { key: "c", label: "Cost of revenue", unit: "R" }], compute: (x) => grossMargin(x.r, x.c) },
    { id: "be", title: "Break-even", type: "calc", note: FIN_NOTE, inputs: [{ key: "f", label: "Fixed costs", unit: "R" }, { key: "p", label: "Price per unit", unit: "R" }, { key: "v", label: "Variable cost per unit", unit: "R" }], compute: (x) => breakEven(x.f, x.p, x.v) },
    { id: "var", title: "Budget vs actual", type: "calc", note: FIN_NOTE, inputs: [{ key: "b", label: "Budget", unit: "R" }, { key: "a", label: "Actual", unit: "R" }], compute: (x) => variance(x.b, x.a) },
    { id: "budget", title: "Budget lines", type: "tracker", collection: "budget", columns: [{ key: "line", label: "Line", kind: "text" }, { key: "budget", label: "Budget (R)", kind: "number" }, { key: "actual", label: "Actual (R)", kind: "number" }, { key: "note", label: "Note", kind: "text" }] }
  ],
  agents: [
    defineAgent("finance", "FIN", {
      n: 1,
      name: "Monthly management commentary",
      summary: "Variance commentary built from figures you supply.",
      framework: "Budget vs actual variance analysis",
      purpose: "financial_planning",
      formats: ["md", "docx", "xlsx", "html", "pdf"],
      inputs: [txt("month", "Month", true), long("lines", "Lines, one per row: name | budget | actual", true), long("notes", "Context for the variances")],
      sections: (c) => {
        const rows = (c.input.lines ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]).map((p) => {
          const [b, a] = [Number(p[1].replace(/[R,\s]/g, "")), Number(p[2].replace(/[R,\s]/g, ""))];
          const ok = Number.isFinite(b) && Number.isFinite(a);
          return [p[0], p[1], p[2], ok ? a - b : "n/a", ok && b !== 0 ? `${((a - b) / b * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"];
        });
        return [{ h: "Variance table (computed from your figures)", table: { headers: ["Line", "Budget", "Actual", "Variance", "Variance %"], rows: rows.length ? rows : [[TBC, "", "", "", ""]] } }, { h: "Drivers", input: c.input.notes ?? "" }, { h: "Actions", ol: [TBC, TBC] }];
      }
    }),
    defineAgent("finance", "FIN", {
      n: 2,
      name: "Pricing options analysis",
      summary: "Compare pricing structures using your own costs and assumptions. The platform supplies the structure, never the prices.",
      framework: "Value-based pricing + unit economics",
      purpose: "financial_planning",
      secondApprover: true,
      inputs: [long("options", "Pricing options (for example per-learner, per-school flat, tiered)", true), long("costs", "Your cost per school / per learner and how you know"), long("buyers", "What a school can pay and how it budgets")],
      sections: (c) => [{ h: "Options", input: c.input.options ?? "" }, { h: "Cost to serve", input: c.input.costs ?? "" }, { h: "Buyer context", input: c.input.buyers ?? "" }, { h: "Comparison", table: { headers: ["Option", "Price (you set)", "Gross margin (calculator)", "Fit for school budgeting", "Risks"], rows: blankRows(["Option A", "Option B", "Option C"], 5) } }, { h: "Note", callout: { tone: "warn", text: "Reconcile any pricing language in marketing material with the approved price list before it is used externally." } }]
    }),
    defineAgent("finance", "FIN", {
      n: 3,
      name: "Rolling 13-week cash forecast",
      summary: "Template for weekly cash in and out with an opening balance you enter.",
      framework: "Rolling cash forecast",
      purpose: "financial_planning",
      formats: ["md", "xlsx", "csv"],
      inputs: [num("opening", "Opening cash balance (R)", true), long("assumptions", "Assumptions and sources")],
      sections: (c) => [{ h: "Opening balance", kv: [["Opening cash", `R ${c.input.opening ?? ""}`]] }, { h: "Weekly forecast (fill each week)", table: { headers: ["Week", "Cash in", "Cash out", "Net", "Closing"], rows: Array.from({ length: 13 }, (_, i) => [`Week ${i + 1}`, "", "", "", ""]) } }, { h: "Assumptions", input: c.input.assumptions ?? "" }]
    })
  ]
};
var sales = {
  id: "sales",
  name: "Sales & CRM",
  icon: "Handshake",
  mission: "Win schools with a clear qualification discipline. CRM holds organisations and roles, never learner data.",
  frameworks: ["MEDDICC qualification", "Mutual action plan", "Pipeline stages with exit criteria", "Account planning"],
  widgets: [
    { id: "pipeline", title: "Pipeline (CRM)", type: "tracker", note: "Organisations and roles only. Do not store personal details of individuals or any learner data.", collection: "crm_pipeline", columns: [{ key: "school", label: "School / organisation", kind: "text" }, { key: "province", label: "Province", kind: "text" }, { key: "stage", label: "Stage", kind: "select", options: ["Lead", "Qualified", "Demo", "Pilot", "Proposal", "Won", "Lost"] }, { key: "buyer", label: "Economic buyer (role)", kind: "text" }, { key: "value", label: "Value (R)", kind: "number" }, { key: "next", label: "Next step", kind: "text" }, { key: "due", label: "Due", kind: "date" }] },
    { id: "meddicc", title: "MEDDICC qualification", type: "checklist", collection: "meddicc", items: [...MEDDICC].map((m) => `${m}: evidenced`) }
  ],
  agents: [
    defineAgent("sales", "SALES", {
      n: 1,
      name: "School account plan",
      summary: "Account plan for one school, qualified with MEDDICC and a mutual action plan.",
      framework: "MEDDICC + account planning",
      purpose: "sales_pipeline",
      inputs: [txt("school", "School / organisation", true), long("pain", "Pain the school has told you about", true), long("buying", "Who decides and how the school buys (roles, governing body, budget cycle)"), long("competition", "Alternatives they use today")],
      sections: (c) => [{ h: "Account", kv: [["School", v(c, "school")]] }, { h: "Pain", input: c.input.pain ?? "" }, { h: "Buying process", input: c.input.buying ?? "" }, { h: "MEDDICC", table: { headers: ["Element", "What we know", "Evidence", "Gap to close"], rows: [...MEDDICC].map((m) => [m, "", "", ""]) } }, { h: "Alternatives", input: c.input.competition ?? "" }, { h: "Mutual action plan", table: { headers: ["Step", "Owner (school / us)", "Date"], rows: blankRows(["Demo", "Pilot agreement", "Operator agreement signed", "Onboarding", "Review"], 3) } }]
    }),
    defineAgent("sales", "SALES", {
      n: 2,
      name: "Discovery call prep",
      summary: "Questions and goals for a discovery call with a school leader.",
      framework: "MEDDICC discovery",
      purpose: "sales_pipeline",
      inputs: [txt("school", "School", true), txt("role", "Role of the person you are meeting", true), long("known", "What you already know")],
      sections: (c) => [{ h: "Goal of the call", p: "Leave with: confirmed pain, the decision process, and an agreed next step." }, { h: "Known so far", input: c.input.known ?? "" }, { h: "Questions", ol: ["How do teachers plan lessons today, and what takes the most time?", "What does the school do about assessment evidence for CAPS?", "Who needs to agree before the school adopts a new tool?", "How does the school budget for software, and when?", "How do you protect learner information today?", "What would make a pilot a success for you?"] }, { h: "Next step to propose", input: "" }]
    }),
    defineAgent("sales", "SALES", {
      n: 3,
      name: "Proposal outline",
      summary: "Proposal structure for a school, with scope, responsibilities and POPIA positioning.",
      framework: "Mutual action plan + consultative proposal",
      purpose: "sales_pipeline",
      secondApprover: true,
      inputs: [txt("school", "School", true), long("scope", "Scope agreed in conversation", true), long("commercials", "Commercial terms approved by Finance")],
      sections: (c) => [{ h: "Their situation", p: "Restate in the school\u2019s own words." }, { h: "What we will do", input: c.input.scope ?? "" }, { h: "How AI is used and controlled", bullets: ["AI drafts. The teacher decides.", "No learner personal information in prompts", "Every action is recorded in an audit trail", "Operator agreement under POPIA"] }, { h: "Commercials", input: c.input.commercials ?? "" }, { h: "Timeline and responsibilities", table: { headers: ["Milestone", "Date", "School", "Infinite-AI"], rows: blankRows(["Agreement", "Onboarding", "Pilot start", "Review"], 4) } }]
    })
  ]
};

// src/departments/d3.ts
var marketing = {
  id: "marketing",
  name: "Marketing & Brand",
  icon: "Megaphone",
  mission: "Teacher-first, honest marketing in the Infinite-AI voice. Direct marketing follows POPIA s69.",
  frameworks: ["Jobs-to-be-done messaging", "AARRR funnel", "Content pillars and calendar", "Brand voice guardrails", "POPIA s69 direct marketing"],
  widgets: [
    { id: "calendar", title: "Content calendar", type: "tracker", collection: "content_calendar", columns: [{ key: "date", label: "Date", kind: "date" }, { key: "channel", label: "Channel", kind: "select", options: ["LinkedIn", "Facebook", "Email", "Blog", "WhatsApp (opt-in only)", "Event"] }, { key: "pillar", label: "Pillar", kind: "text" }, { key: "piece", label: "Piece", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["Idea", "Drafting", "Review", "Approved", "Published"] }] },
    { id: "s69", title: "Direct-marketing check (POPIA s69)", type: "checklist", collection: "s69", items: ["Recipient is an existing customer for similar products, or has opted in", "Every message offers a simple way to opt out", "No purchased lists", "Sender identity and contact details are clear", "Opt-in evidence is stored (who, when, how)"] },
    { id: "voice", title: "Brand voice check", type: "checklist", collection: "voice", items: ["Teacher is the decision-maker; AI assists", "No claim of results without a cited source", "No learner names or photos without consent", "South African English; plain language", "Does not overpromise on CAPS compliance"] }
  ],
  agents: [
    defineAgent("marketing", "MKT", {
      n: 1,
      name: "Campaign brief",
      summary: "Audience, message, channels and measures for one campaign.",
      framework: "Jobs-to-be-done + AARRR",
      purpose: "marketing_content",
      inputs: [txt("goal", "Campaign goal", true), long("audience", "Audience (role, not individuals)", true), long("offer", "What you are offering"), long("proof", "Proof points you can cite, with source")],
      sections: (c) => [{ h: "Goal", input: c.input.goal ?? "" }, { h: "Audience and job to be done", input: c.input.audience ?? "" }, { h: "Offer", input: c.input.offer ?? "" }, { h: "Proof (cited only)", input: c.input.proof ?? "" }, { h: "Message house", table: { headers: ["Level", "Message"], rows: [["Promise", ""], ["Pillar 1", ""], ["Pillar 2", ""], ["Pillar 3", ""]] } }, { h: "Funnel and measures", table: { headers: ["Stage", "Tactic", "Measure (you define)"], rows: blankRows(["Acquisition", "Activation", "Retention", "Referral", "Revenue"], 3) } }, { h: "Compliance", checks: ["POPIA s69 check complete", "Brand voice check complete", "Claims sourced"] }]
    }),
    defineAgent("marketing", "MKT", {
      n: 2,
      name: "Post / email draft",
      summary: "A first draft for a human to rewrite in their own voice.",
      framework: "Brand voice guardrails",
      purpose: "marketing_content",
      formats: ["md", "docx", "html"],
      inputs: [pick("channel", "Channel", ["LinkedIn", "Facebook", "Email", "Blog"], true), long("message", "Core message in your words", true), long("proof", "Facts you may cite (with source)")],
      sections: (c) => [{ h: `Draft for ${v(c, "channel")}`, input: c.input.message ?? "" }, { h: "Facts that may be cited", input: c.input.proof ?? "" }, { h: "Edit notes", bullets: ["Rewrite in your own voice.", "Remove any claim you cannot source.", "Add an opt-out line if this is an email to a list."] }]
    }),
    defineAgent("marketing", "MKT", {
      n: 3,
      name: "Brand and claims review",
      summary: "Check a piece of copy against voice and claim rules.",
      framework: "Brand voice guardrails",
      purpose: "marketing_content",
      inputs: [long("copy", "Copy to review", true)],
      sections: (c) => [{ h: "Copy", input: c.input.copy ?? "" }, { h: "Review", table: { headers: ["Rule", "Pass?", "Note"], rows: [["The teacher decides; AI assists", "", ""], ["Every claim has a cited source", "", ""], ["No guaranteed outcomes", "", ""], ["POPIA: no personal data, opt-out present", "", ""], ["Plain South African English", "", ""]] } }]
    })
  ]
};
var success = {
  id: "success",
  name: "Customer Success & Pilots",
  icon: "HeartHandshake",
  mission: "Get schools to value quickly and keep them. Pilots follow the ecosystem\u2019s own pilot protocol.",
  frameworks: ["Onboarding milestones", "Customer health scoring (you define the signals)", "Quarterly business review", "Pilot protocol (docs/PILOT_PROTOCOL.md)"],
  widgets: [
    { id: "pilots", title: "Pilot tracker", type: "tracker", collection: "pilots", columns: [{ key: "school", label: "School", kind: "text" }, { key: "phase", label: "Phase", kind: "select", options: ["Agreed", "Onboarding", "Running", "Review", "Decision"] }, { key: "start", label: "Start", kind: "date" }, { key: "champion", label: "Champion (role)", kind: "text" }, { key: "health", label: "Health", kind: "select", options: ["Green", "Amber", "Red"] }, { key: "note", label: "Note", kind: "text" }] },
    { id: "onboard", title: "Onboarding checklist", type: "checklist", collection: "onboarding", items: ["Operator agreement signed", "Administrator accounts created", "Teachers invited", "Training session held", "First lesson planned with the tool", "Success criteria agreed in writing", "Review date booked"] }
  ],
  agents: [
    defineAgent("success", "CS", {
      n: 1,
      name: "Pilot plan",
      summary: "A pilot plan for one school with success criteria they agree to.",
      framework: "Pilot protocol + onboarding milestones",
      purpose: "customer_success",
      inputs: [txt("school", "School", true), long("goals", "What the school wants to learn or achieve", true), txt("duration", "Duration (terms/weeks)")],
      sections: (c) => [{ h: "Pilot", kv: [["School", v(c, "school")], ["Duration", v(c, "duration")]] }, { h: "Goals", input: c.input.goals ?? "" }, { h: "Success criteria (agreed in writing, measurable)", table: { headers: ["Criterion", "How measured", "Evidence source", "Agreed by"], rows: blankRows(["Teacher time", "Usage", "Teacher confidence", "Quality of output"], 4) } }, { h: "Milestones", table: { headers: ["Milestone", "Date", "Owner"], rows: blankRows(["Kick-off", "Training", "Mid-point check-in", "Review", "Decision"], 3) } }, { h: "Source protocol", p: "Align with the pilot protocol in the ecosystem repository (docs/PILOT_PROTOCOL.md). Any difference must be recorded." }, { h: "Data protection", checks: ["Operator agreement signed before any data flows", "No learner-level data enters the operations platform", "Teacher decisions are recorded"] }]
    }),
    defineAgent("success", "CS", {
      n: 2,
      name: "Quarterly business review",
      summary: "Review pack for a school using only measures you have and can show.",
      framework: "QBR",
      purpose: "customer_success",
      inputs: [txt("school", "School", true), long("usage", "What the usage data shows (your words, with source)"), long("feedback", "Teacher feedback (summarised, no names)")],
      sections: (c) => [{ h: "Usage", input: c.input.usage ?? "" }, { h: "Teacher feedback", input: c.input.feedback ?? "" }, { h: "Goals vs outcomes", table: { headers: ["Goal", "Outcome (evidence)", "Status"], rows: blankRows(["Goal 1", "Goal 2"], 3) } }, { h: "Next period", ol: [TBC, TBC] }]
    }),
    defineAgent("success", "CS", {
      n: 3,
      name: "Renewal playbook",
      summary: "Plan for a renewal conversation, risks and asks.",
      framework: "Renewal playbook",
      purpose: "customer_success",
      inputs: [txt("school", "School", true), long("value", "Value the school has gained (their words)"), long("risks", "Risks to renewal")],
      sections: (c) => [{ h: "Value delivered", input: c.input.value ?? "" }, { h: "Risks", input: c.input.risks ?? "" }, { h: "Plan", table: { headers: ["Action", "Owner", "Date"], rows: blankRows(["Review with sponsor", "Confirm budget cycle", "Send renewal paperwork"], 3) } }]
    })
  ]
};
var IMPACT = ["1 = whole school affected", "2 = a group affected", "3 = one user affected"];
var support = {
  id: "support",
  name: "Support & Service Desk",
  icon: "LifeBuoy",
  mission: "Teachers get help quickly and the platform learns from every ticket. No learner or personal data in tickets.",
  frameworks: ["ITIL incident and problem management", "Impact \xD7 urgency priority matrix", "Knowledge-centred service", "Blameless post-incident review"],
  widgets: [
    { id: "tickets", title: "Tickets", type: "tracker", note: "Describe the problem without names or learner details.", collection: "tickets", columns: [{ key: "summary", label: "Summary", kind: "text" }, { key: "impact", label: "Impact (1-3)", kind: "select", options: ["1", "2", "3"] }, { key: "urgency", label: "Urgency (1-3)", kind: "select", options: ["1", "2", "3"] }, { key: "priority", label: "Priority", kind: "select", options: ["P1", "P2", "P3", "P4"] }, { key: "status", label: "Status", kind: "select", options: ["New", "In progress", "Waiting", "Resolved"] }] },
    { id: "calc-p", title: "Priority matrix", type: "calc", note: `Impact: ${IMPACT.join("; ")}. Urgency uses the same 1\u20133 scale.`, inputs: [{ key: "i", label: "Impact (1-3)" }, { key: "u", label: "Urgency (1-3)" }], compute: (x) => [{ label: "Priority (P1 highest)", value: [1, 2, 3].includes(x.i) && [1, 2, 3].includes(x.u) ? Number(priority(x.i, x.u).slice(1)) : null, unit: "P-level", formula: "ITIL impact \xD7 urgency" }] }
  ],
  agents: [
    defineAgent("support", "SUP", {
      n: 1,
      name: "Ticket triage",
      summary: "Classify and prioritise a ticket, and suggest the first reply.",
      framework: "ITIL priority matrix",
      purpose: "service_desk",
      inputs: [long("ticket", "Ticket text (remove names and learner details first)", true), pick("impact", "Impact", ["1", "2", "3"], true), pick("urgency", "Urgency", ["1", "2", "3"], true)],
      sections: (c) => {
        const p = priority(Number(c.input.impact || 3), Number(c.input.urgency || 3));
        return [{ h: "Ticket", input: c.input.ticket ?? "" }, { h: "Priority", callout: { tone: p === "P1" ? "warn" : "info", text: `${p} (impact ${v(c, "impact")}, urgency ${v(c, "urgency")}). Matrix is the standard ITIL convention; set response targets in your own SLA.` } }, { h: "Suggested first reply (edit before sending)", p: "Thank you for telling us. We are looking into this and will update you. If anything changes on your side, please reply here." }, { h: "Routing", table: { headers: ["Question", "Answer"], rows: blankRows(["Known issue / existing article?", "Needs engineering?", "Possible personal-data issue? (escalate to Security)"], 2) } }];
      }
    }),
    defineAgent("support", "SUP", {
      n: 2,
      name: "Knowledge base article",
      summary: "Teacher-friendly how-to article from a resolved ticket.",
      framework: "Knowledge-centred service",
      purpose: "service_desk",
      formats: ["md", "docx", "html"],
      inputs: [txt("title", "Article title", true), long("problem", "Problem the teacher had", true), long("fix", "Steps that solved it", true)],
      title: (c) => c.input.title ?? "Help article",
      sections: (c) => [{ h: "Problem", input: c.input.problem ?? "" }, { h: "Steps", input: c.input.fix ?? "" }, { h: "If it still does not work", p: "Contact support and tell us what you see on screen. Do not include learner names." }]
    }),
    defineAgent("support", "SUP", {
      n: 3,
      name: "Incident update",
      summary: "Plain-language status update for users during an incident.",
      framework: "ITIL incident communication",
      purpose: "service_desk",
      inputs: [long("what", "What is happening", true), long("impact", "Who is affected"), long("next", "Next update when")],
      sections: (c) => [{ h: "What is happening", input: c.input.what ?? "" }, { h: "Who is affected", input: c.input.impact ?? "" }, { h: "What we are doing", input: "" }, { h: "Next update", input: c.input.next ?? "" }]
    })
  ]
};
var government = {
  id: "government",
  name: "Government & Partnerships",
  icon: "Building2",
  mission: "Work with the DBE, provincial departments, districts and partners. Policy is cited from source, never invented.",
  frameworks: ["Stakeholder mapping (power / interest)", "Theory of change", "Partnership MoU outline", "Grant application structure"],
  widgets: [
    { id: "stake", title: "Stakeholder map", type: "tracker", note: "Roles and organisations only.", collection: "stakeholders", columns: [{ key: "org", label: "Organisation / body", kind: "text" }, { key: "role", label: "Role", kind: "text" }, { key: "power", label: "Power", kind: "select", options: ["High", "Medium", "Low"] }, { key: "interest", label: "Interest", kind: "select", options: ["High", "Medium", "Low"] }, { key: "next", label: "Next engagement", kind: "text" }] }
  ],
  agents: [
    defineAgent("government", "GOV", {
      n: 1,
      name: "Stakeholder engagement plan",
      summary: "Who to engage, why, and how, for one objective.",
      framework: "Power / interest mapping",
      purpose: "public_sector_relations",
      inputs: [txt("objective", "Objective", true), long("stakeholders", "Stakeholders (organisations and roles)", true)],
      sections: (c) => [{ h: "Objective", input: c.input.objective ?? "" }, { h: "Stakeholders", input: c.input.stakeholders ?? "" }, { h: "Plan", table: { headers: ["Stakeholder", "Power", "Interest", "Approach", "Owner (role)"], rows: blankRows(["Stakeholder 1", "Stakeholder 2", "Stakeholder 3"], 5) } }]
    }),
    defineAgent("government", "GOV", {
      n: 2,
      name: "Partnership MoU outline",
      summary: "Outline of a memorandum of understanding for counsel.",
      framework: "MoU structure",
      purpose: "public_sector_relations",
      secondApprover: true,
      warning: "Outline only. A lawyer drafts the actual agreement.",
      inputs: [txt("partner", "Partner (organisation)", true), long("aim", "Shared aim", true)],
      sections: (c) => [{ h: "Parties and aim", kv: [["Partner", v(c, "partner")], ["Aim", v(c, "aim")]] }, { h: "Clauses to settle", checks: ["Roles and responsibilities", "Resources each party commits", "Intellectual property", "Data protection roles and rules", "Communications and branding", "Duration, review and exit", "Dispute resolution"] }]
    }),
    defineAgent("government", "GOV", {
      n: 3,
      name: "Funding application skeleton",
      summary: "Structure for a grant or tender response using only facts you can cite.",
      framework: "Logic model + grant structure",
      purpose: "public_sector_relations",
      warning: "Cite policy only from the official source. Unverified policy statements must be marked as such.",
      inputs: [txt("funder", "Funder / programme", true), long("need", "Need you address (cite evidence)", true), long("activities", "Activities")],
      sections: (c) => [{ h: "Need", input: c.input.need ?? "" }, { h: "Logic model", table: { headers: ["Inputs", "Activities", "Outputs", "Outcomes", "Evidence"], rows: [["", c.input.activities ?? "", "", "", ""]] } }, { h: "Technology and data protection", p: `The Ecosystem\u2019s repository is at commit ${src(c, "eco.head")}, with ${src(c, "eco.stages")} logged build stages. Describe controls only as documented in docs/POPIA.md and docs/SECURITY.md.` }, { h: "Budget and sustainability", input: "" }]
    })
  ]
};

// src/departments/d4.ts
var people = {
  id: "people",
  name: "People & Culture",
  icon: "Users",
  mission: "Hire well, onboard clearly, review fairly. Employment decisions go to a human and, where needed, labour counsel.",
  frameworks: ["Structured interviews with scorecards", "30-60-90 onboarding", "SMART goals", "Role scorecard (mission, outcomes, competencies)"],
  widgets: [
    { id: "hiring", title: "Hiring pipeline", type: "tracker", note: "Use candidate reference codes, not names.", collection: "hiring", columns: [{ key: "role", label: "Role", kind: "text" }, { key: "ref", label: "Candidate ref", kind: "text" }, { key: "stage", label: "Stage", kind: "select", options: ["Applied", "Screen", "Interview", "Offer", "Hired", "Closed"] }, { key: "next", label: "Next step", kind: "text" }] },
    { id: "onb", title: "New starter checklist", type: "checklist", collection: "starter", items: ["Contract signed", "POPIA and confidentiality briefing", "Accounts created with least privilege", "Equipment issued", "First-week plan agreed", "Buddy named"] }
  ],
  agents: [
    defineAgent("people", "PPL", {
      n: 1,
      name: "Role scorecard and job description",
      summary: "Outcomes-first role definition.",
      framework: "Role scorecard",
      purpose: "people_ops",
      warning: "Employment terms and selection criteria must comply with South African labour law. Have counsel review.",
      inputs: [txt("role", "Role title", true), long("mission", "Mission of the role", true), long("outcomes", "Outcomes expected in the first year"), long("skills", "Skills and competencies")],
      title: (c) => `Role scorecard: ${c.input.role ?? ""}`,
      sections: (c) => [{ h: "Mission", input: c.input.mission ?? "" }, { h: "Outcomes", input: c.input.outcomes ?? "" }, { h: "Competencies", input: c.input.skills ?? "" }, { h: "Scorecard", table: { headers: ["Outcome", "Measure", "Timeframe"], rows: blankRows(["Outcome 1", "Outcome 2", "Outcome 3"], 3) } }]
    }),
    defineAgent("people", "PPL", {
      n: 2,
      name: "Interview scorecard",
      summary: "Structured, comparable interview guide.",
      framework: "Structured interviews",
      purpose: "people_ops",
      inputs: [txt("role", "Role", true), long("competencies", "Competencies to assess (one per line)", true)],
      sections: (c) => [{ h: "Competencies", input: c.input.competencies ?? "" }, { h: "Scoring", table: { headers: ["Competency", "Question (same for every candidate)", "Evidence heard", "Score 1\u20135"], rows: blankRows(["Competency 1", "Competency 2", "Competency 3"], 4) } }, { h: "Fairness", checks: ["Same questions for all candidates", "Score before discussing", "No questions on protected characteristics", "Decision recorded with reasons"] }]
    }),
    defineAgent("people", "PPL", {
      n: 3,
      name: "30-60-90 onboarding plan",
      summary: "First three months with outcomes and check-ins.",
      framework: "30-60-90 plan",
      purpose: "people_ops",
      inputs: [txt("role", "Role", true), long("priorities", "Priorities for the first three months")],
      sections: (c) => [{ h: "Priorities", input: c.input.priorities ?? "" }, { h: "Plan", table: { headers: ["Period", "Learn", "Contribute", "Check-in"], rows: [["First month", "", "", ""], ["Second month", "", "", ""], ["Third month", "", "", ""]] } }]
    })
  ]
};
var devops = {
  id: "devops",
  name: "IT, DevOps & SRE",
  icon: "ServerCog",
  mission: "Reliable, observable, recoverable. Operate from the ecosystem\u2019s runbooks and live CI results.",
  frameworks: ["SRE: SLOs and error budgets", "ITIL change enablement", "Blameless postmortems", "Disaster recovery (RPO / RTO)", "Runbooks"],
  widgets: [
    { id: "ci", title: "CI runs (live)", type: "live", source: "ci" },
    { id: "runbooks", title: "Ecosystem runbooks", type: "live", source: "runbooks" },
    { id: "changes", title: "Change log", type: "tracker", collection: "changes", columns: [{ key: "change", label: "Change", kind: "text" }, { key: "risk", label: "Risk", kind: "select", options: ["Low", "Medium", "High"] }, { key: "rollback", label: "Rollback plan", kind: "text" }, { key: "approver", label: "Approver (role)", kind: "text" }, { key: "when", label: "When", kind: "date" }] }
  ],
  agents: [
    defineAgent("devops", "SRE", {
      n: 1,
      name: "Change request",
      summary: "Change record with risk, test and rollback.",
      framework: "ITIL change enablement",
      purpose: "infrastructure_ops",
      secondApprover: true,
      inputs: [txt("change", "Change", true), long("reason", "Why", true), long("rollback", "Rollback plan", true)],
      sections: (c) => [{ h: "Change", input: c.input.change ?? "" }, { h: "Reason", input: c.input.reason ?? "" }, { h: "Rollback", input: c.input.rollback ?? "" }, { h: "Checks", checks: ["Tested outside production", "Secrets not in the repository", "Runbook updated", "Approver is not the implementer", "CI green on the release commit"] }, { h: "Ecosystem runbooks available", p: `${src(c, "eco.runbooks")} runbooks are listed in the repository. Link the relevant one.` }]
    }),
    defineAgent("devops", "SRE", {
      n: 2,
      name: "Blameless postmortem",
      summary: "Timeline, contributing factors and actions without blame.",
      framework: "Blameless postmortem",
      purpose: "infrastructure_ops",
      inputs: [txt("incident", "Incident", true), long("timeline", "Timeline (time | event)", true), long("factors", "Contributing factors")],
      sections: (c) => [{ h: "Summary", input: c.input.incident ?? "" }, { h: "Timeline", input: c.input.timeline ?? "" }, { h: "Contributing factors", input: c.input.factors ?? "" }, { h: "What went well, what did not", table: { headers: ["Went well", "Went badly", "Got lucky"], rows: [["", "", ""]] } }, { h: "Actions", table: { headers: ["Action", "Owner (role)", "Due", "Type"], rows: blankRows(["Prevent", "Detect", "Mitigate"], 4) } }]
    }),
    defineAgent("devops", "SRE", {
      n: 3,
      name: "SLO and recovery targets",
      summary: "Define SLOs and recovery objectives from targets you choose.",
      framework: "SRE SLOs + DR",
      purpose: "infrastructure_ops",
      inputs: [long("services", "Services in scope", true), long("targets", "Availability / recovery targets you have decided, with reasoning")],
      sections: (c) => [{ h: "Services", input: c.input.services ?? "" }, { h: "Targets", input: c.input.targets ?? "" }, { h: "Definitions", table: { headers: ["Service", "SLI (what is measured)", "SLO (target you set)", "RPO", "RTO", "Test of recovery (date)"], rows: blankRows(["Service 1", "Service 2"], 6) } }, { h: "Error budget policy", p: "When the budget is spent, reliability work takes priority over new features until it recovers." }]
    })
  ]
};
var procurement = {
  id: "procurement",
  name: "Procurement & Vendors",
  icon: "PackageSearch",
  mission: "Choose and govern suppliers, especially anything that touches data. Every operator is bound in writing.",
  frameworks: ["Weighted decision matrix", "Total cost of ownership", "Vendor due diligence (POPIA operator, cross-border)", "Supplier performance review"],
  widgets: [
    { id: "vendors", title: "Vendor register", type: "tracker", collection: "vendors", columns: [{ key: "vendor", label: "Vendor", kind: "text" }, { key: "service", label: "Service", kind: "text" }, { key: "data", label: "Touches personal data?", kind: "select", options: ["No", "Yes", "Unknown"] }, { key: "contract", label: "Written operator contract?", kind: "select", options: ["N/A", "Yes", "No"] }, { key: "location", label: "Data location", kind: "text" }, { key: "review", label: "Next review", kind: "date" }] },
    { id: "score", title: "Weighted score (3 criteria)", type: "calc", note: "Weights and scores are yours.", inputs: [{ key: "w1", label: "Weight 1" }, { key: "s1", label: "Score 1" }, { key: "w2", label: "Weight 2" }, { key: "s2", label: "Score 2" }, { key: "w3", label: "Weight 3" }, { key: "s3", label: "Score 3" }], compute: (x) => weightedScore([{ weight: x.w1 || 0, score: x.s1 || 0 }, { weight: x.w2 || 0, score: x.s2 || 0 }, { weight: x.w3 || 0, score: x.s3 || 0 }]) }
  ],
  agents: [
    defineAgent("procurement", "PRO", {
      n: 1,
      name: "Vendor due diligence",
      summary: "Due-diligence questionnaire for a supplier that may touch personal data.",
      framework: "POPIA operator due diligence",
      purpose: "vendor_management",
      secondApprover: true,
      inputs: [txt("vendor", "Vendor", true), long("service", "Service and data involved", true)],
      sections: (c) => [{ h: "Service", input: c.input.service ?? "" }, { h: "Questions", table: { headers: ["Area", "Question", "Answer", "Evidence"], rows: [["Data", "What personal information is processed and where is it stored?", "", ""], ["Contract", "Will you sign a written operator agreement?", "", ""], ["Security", "Which independent assurance do you hold?", "", ""], ["Transfers", "Is data sent outside South Africa, and under what safeguards?", "", ""], ["Sub-processors", "Who else touches the data?", "", ""], ["Breach", "How and how fast will you tell us?", "", ""], ["Exit", "How is data returned or deleted?", "", ""]] } }]
    }),
    defineAgent("procurement", "PRO", {
      n: 2,
      name: "RFQ and scoring matrix",
      summary: "Request for quotation and a weighted scoring matrix.",
      framework: "Weighted decision matrix",
      purpose: "vendor_management",
      inputs: [txt("item", "What you are buying", true), long("criteria", "Criteria and weights you have decided", true)],
      sections: (c) => [{ h: "Requirement", input: c.input.item ?? "" }, { h: "Criteria and weights", input: c.input.criteria ?? "" }, { h: "Matrix", table: { headers: ["Criterion", "Weight", "Vendor A score", "Vendor B score", "Vendor C score"], rows: blankRows(["Criterion 1", "Criterion 2", "Criterion 3", "Total cost of ownership"], 5) } }]
    }),
    defineAgent("procurement", "PRO", {
      n: 3,
      name: "Supplier review",
      summary: "Periodic performance and risk review of an existing supplier.",
      framework: "Supplier performance review",
      purpose: "vendor_management",
      inputs: [txt("vendor", "Vendor", true), long("performance", "How they have performed")],
      sections: (c) => [{ h: "Performance", input: c.input.performance ?? "" }, { h: "Review", table: { headers: ["Area", "Rating", "Evidence", "Action"], rows: blankRows(["Delivery", "Quality", "Security / data protection", "Cost", "Relationship"], 4) } }, { h: "Decision", kv: [["Continue / change / exit", TBC], ["Decided by (role)", TBC]] }]
    })
  ]
};
var research = {
  id: "research",
  name: "Research, Impact & Knowledge",
  icon: "FlaskConical",
  mission: "Show whether it works, honestly. No impact claim without evidence. Research uses no learner-identifying data here.",
  frameworks: ["Theory of change", "Kirkpatrick levels", "Pre-registered evaluation plan", "Evidence log with source grading"],
  widgets: [
    { id: "evidence", title: "Evidence log", type: "tracker", collection: "evidence", columns: [{ key: "claim", label: "Claim", kind: "text" }, { key: "source", label: "Source (cite)", kind: "text" }, { key: "grade", label: "Strength", kind: "select", options: ["Anecdote", "Internal data", "Pilot study", "Independent study"] }, { key: "usable", label: "OK to use externally?", kind: "select", options: ["No", "With caveat", "Yes"] }] }
  ],
  agents: [
    defineAgent("research", "RES", {
      n: 1,
      name: "Theory of change",
      summary: "Pathway from activities to outcomes with assumptions to test.",
      framework: "Theory of change",
      purpose: "research_evaluation",
      inputs: [txt("change", "Change you want to see", true), long("activities", "What you do", true), long("assumptions", "Assumptions")],
      sections: (c) => [{ h: "Change sought", input: c.input.change ?? "" }, { h: "Pathway", table: { headers: ["Activity", "Short-term outcome", "Medium-term outcome", "Long-term impact", "Assumption to test"], rows: [[c.input.activities ?? "", "", "", "", c.input.assumptions ?? ""]] } }]
    }),
    defineAgent("research", "RES", {
      n: 2,
      name: "Evaluation plan",
      summary: "Design for judging whether a pilot worked, before it starts.",
      framework: "Kirkpatrick + pre-registered plan",
      purpose: "research_evaluation",
      secondApprover: true,
      inputs: [txt("question", "Evaluation question", true), long("measures", "Measures and data sources you will use"), long("ethics", "Consent and data protection plan")],
      sections: (c) => [{ h: "Question", input: c.input.question ?? "" }, { h: "Measures", input: c.input.measures ?? "" }, { h: "Levels", table: { headers: ["Level", "Question", "Measure", "When"], rows: blankRows(["1 Reaction", "2 Learning", "3 Behaviour", "4 Results"], 4) } }, { h: "Ethics and POPIA", input: c.input.ethics ?? "" }, { h: "Analysis committed in advance", p: "Write down how results will be judged before collecting them. Report null and negative results." }]
    }),
    defineAgent("research", "RES", {
      n: 3,
      name: "Impact report skeleton",
      summary: "Report structure that holds only evidence you supply.",
      framework: "Evidence log with source grading",
      purpose: "research_evaluation",
      secondApprover: true,
      inputs: [txt("title", "Report title", true), long("findings", "Findings, each with its source", true), long("limits", "Limitations")],
      sections: (c) => [{ h: "Findings (sourced)", input: c.input.findings ?? "" }, { h: "Limitations", input: c.input.limits ?? "" }, { h: "Claims check", callout: { tone: "warn", text: "Each claim above must appear in the evidence log with a source and a strength grade before external use." } }, { h: "Repository context", p: `Product facts come from the ecosystem snapshot: ${src(c, "eco.stages")} logged stages at commit ${src(c, "eco.head")}.` }]
    })
  ]
};

// src/departments/index.ts
var DEPARTMENTS = [executive, product, curriculum, aibrain, security, legal, finance, sales, marketing, success, support, government, people, devops, procurement, research];
var AGENTS = DEPARTMENTS.flatMap((d) => d.agents);
var agentById = (id) => AGENTS.find((a) => a.id === id);

// src/server/validate.ts
var MAX_RECORD_BYTES = 256 * 1024;
var MAX_RECORDS = 2e4;
var CORE = ["ledger", "brain", "artefact_versions", "runs", "approvals", "tombstones"];
var CLIENT_COLLECTIONS = /* @__PURE__ */ new Set([
  ...CORE,
  ...DEPARTMENTS.flatMap((d) => d.widgets).flatMap((w) => "collection" in w ? [w.collection] : [])
]);
var Rejected = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
var bad = (message, status = 400) => {
  throw new Rejected(status, message);
};
var latestById = (rows, id) => rows.filter((r) => r.id === id).at(-1);
var isHash = (v2) => typeof v2 === "string" && /^[0-9a-f]{64}$/.test(v2);
async function validateAppend(collection, body, ctx) {
  if (collection === "ledger") bad("ledger entries are authored by the server: POST /api/ledger", 403);
  if (!CLIENT_COLLECTIONS.has(collection)) bad("unknown collection", 404);
  if (typeof body !== "object" || body === null || Array.isArray(body)) bad("record must be an object");
  const rec = body;
  if (typeof rec.id !== "string" || rec.id.length < 1 || rec.id.length > 200) bad("record needs a string id (1-200 chars)");
  if (JSON.stringify(rec).length > MAX_RECORD_BYTES) bad("record too large", 413);
  if (ctx.store.list(collection).length >= MAX_RECORDS) bad("collection is full", 507);
  switch (collection) {
    case "artefact_versions":
      artefact(rec, ctx);
      break;
    case "approvals":
      approval(rec, ctx);
      break;
    case "brain":
      brain(rec, ctx);
      break;
    case "tombstones":
      if (!isHash(rec.subjectHash)) bad("tombstone needs a subjectHash (sha-256 hex)");
      break;
  }
  return rec;
}
function artefact(rec, ctx) {
  const status = rec.status;
  if (status !== "DRAFT" && status !== "IN_REVIEW" && status !== "APPROVED" && status !== "REJECTED") bad("bad artefact status");
  if (typeof rec.agentId !== "string" || !agentById(rec.agentId)) bad("unknown agent");
  if (status !== "APPROVED" && status !== "REJECTED" && rec.approvedBy !== void 0) bad("only a decision carries approvedBy");
  const cur = latestById(ctx.store.list("artefact_versions"), rec.id);
  if (!cur) {
    if (status !== "DRAFT" || rec.version !== 1) bad("a new artefact starts as DRAFT v1");
    if (ctx.actor && rec.requestedBy !== ctx.actor) bad("requestedBy is not you", 403);
    return;
  }
  if (rec.requestedBy !== cur.requestedBy || rec.agentId !== cur.agentId || rec.orgId !== cur.orgId) bad("requestedBy, agent and org cannot change");
  const sameDoc = rec.docHash === cur.docHash && rec.version === cur.version;
  if (status === "DRAFT") {
    if (rec.version !== Number(cur.version) + 1) bad("an edit is a new version");
  } else if (cur.status === "DRAFT" && status === "IN_REVIEW") {
    if (!sameDoc) bad("submitting for review cannot change the document");
  } else if (cur.status === "IN_REVIEW" && (status === "APPROVED" || status === "REJECTED")) {
    if (!sameDoc) bad("a decision cannot change the document");
    const approver = rec.approvedBy;
    if (typeof approver !== "string" || !approver) bad("a decision needs approvedBy");
    if (ctx.actor && approver !== ctx.actor) bad("approvedBy is not you", 403);
    if (agentById(String(cur.agentId))?.secondApprover && approver === cur.requestedBy) bad("this agent requires a second person to approve", 403);
    if (status === "REJECTED" && !String(rec.note ?? "").trim()) bad("a rejection needs a reason");
  } else {
    bad(`cannot go from ${String(cur.status)} to ${status}`, 409);
  }
}
function approval(rec, ctx) {
  const art = latestById(ctx.store.list("artefact_versions"), rec.artefactId);
  if (!art || art.status !== rec.decision || art.approvedBy !== rec.approver) bad("approval does not match a recorded decision", 409);
  if (ctx.actor && rec.approver !== ctx.actor) bad("approver is not you", 403);
}
function brain(rec, ctx) {
  const tier = rec.tier;
  if (tier !== "L1" && tier !== "L2" && tier !== "L3" && tier !== "L4") bad("L0 is the constitution and cannot be written", 403);
  const p = rec.provenance;
  if (p?.deidentified !== true || !Array.isArray(p.sources) || !p.sources.length) bad("Brain refuses facts that are not de-identified and sourced");
  if (rec.status === "ratified" && (tier === "L3" || tier === "L4")) {
    const from = typeof rec.supersedes === "string" ? ctx.store.list("brain").filter((f) => f.id === rec.supersedes).at(-1) : void 0;
    if (!from || from.status !== "proposed") bad("L3/L4 facts are ratified only by a human ratifying a proposed fact", 403);
    if (ctx.actor && rec.by !== ctx.actor) bad("ratifier is not you", 403);
  }
}

// src/server/rate.ts
var RateLimiter = class {
  constructor(max = 20, windowMs = 6e4, now = Date.now) {
    this.max = max;
    this.windowMs = windowMs;
    this.now = now;
    this.calls = /* @__PURE__ */ new Map();
  }
  allow(key) {
    const t = this.now();
    const recent = (this.calls.get(key) ?? []).filter((x) => t - x < this.windowMs);
    if (recent.length >= this.max) {
      this.calls.set(key, recent);
      return false;
    }
    this.calls.set(key, [...recent, t]);
    return true;
  }
};

// src/core/crypto.ts
async function sha256Hex(text) {
  const data = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}
function canonical(value) {
  if (value === null || typeof value !== "object") return JSON.stringify(value) ?? "null";
  if (Array.isArray(value)) return "[" + value.map(canonical).join(",") + "]";
  const o = value;
  return "{" + Object.keys(o).sort().filter((k) => o[k] !== void 0).map((k) => JSON.stringify(k) + ":" + canonical(o[k])).join(",") + "}";
}

// src/server/ledgerService.ts
var GENESIS = "0".repeat(64);
var MAX_DETAIL_BYTES = 16 * 1024;
var short = (v2) => typeof v2 === "string" && v2.length > 0 && v2.length <= 200;
var strip = (r) => {
  const { id: _id, ...e } = r;
  return e;
};
function appendLedger(store2, input, knownSeq, actor, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  const run = (tails.get(store2) ?? Promise.resolve()).then(() => write(store2, input, knownSeq, actor, now));
  tails.set(store2, run.catch(() => void 0));
  return run;
}
var tails = /* @__PURE__ */ new WeakMap();
async function write(store2, input, knownSeq, actor, now = () => (/* @__PURE__ */ new Date()).toISOString()) {
  const bad2 = (m, status = 400) => {
    throw new Rejected(status, m);
  };
  if (typeof input !== "object" || input === null || Array.isArray(input)) bad2("ledger input must be an object");
  const i = input;
  if (!short(i.orgId) || !short(i.actor) || !short(i.action) || !short(i.subject)) bad2("orgId, actor, action and subject are required strings (1-200 chars)");
  const detail = i.detail ?? {};
  if (typeof detail !== "object" || detail === null || Array.isArray(detail) || JSON.stringify(detail).length > MAX_DETAIL_BYTES) bad2("detail must be a small object");
  const action = i.action;
  const who = i.actor;
  const subject = i.subject;
  if (actor && /^(hitl|artefact|subject)\./.test(action) && who !== actor) bad2("ledger actor is not you", 403);
  const art = store2.list("artefact_versions").filter((r) => r.id === subject).at(-1);
  if (/^hitl\.(approved|rejected)$/.test(action) && (art?.status !== action.slice(5).toUpperCase() || art.approvedBy !== who)) bad2("no recorded decision matches this ledger entry", 409);
  if (action === "artefact.submit" && art?.status !== "IN_REVIEW") bad2("artefact is not in review", 409);
  const ledger = store2.list("ledger");
  if (ledger.length >= MAX_RECORDS) bad2("collection is full", 507);
  const last = ledger.at(-1);
  const lastSeq = Number(last?.seq ?? 0);
  if (typeof knownSeq !== "number" || !Number.isInteger(knownSeq) || knownSeq < 0 || knownSeq > lastSeq) bad2("knownSeq is not a position in the ledger");
  const base = { seq: lastSeq + 1, at: now(), orgId: i.orgId, actor: who, action, subject, detail, prevHash: last?.hash ?? GENESIS };
  const entry = { ...base, hash: await sha256Hex(canonical(base)) };
  store2.append("ledger", { ...entry, id: `L${entry.seq}` });
  return { entry, earlier: ledger.filter((r) => Number(r.seq) > knownSeq && Number(r.seq) < entry.seq).map(strip) };
}

// src/core/guardrails/pii.ts
function validSaId(id) {
  if (!/^\d{13}$/.test(id)) return false;
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));
  if (mm < 1 || mm > 12 || dd < 1 || dd > 31) return false;
  let sum = 0;
  for (let i = 0; i < 13; i++) {
    let d = Number(id[12 - i]);
    if (i % 2 === 1) {
      d *= 2;
      if (d > 9) d -= 9;
    }
    sum += d;
  }
  return sum % 10 === 0;
}
var EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
var PHONE = /(?:\+27|\b0)[\s-]?[6-8]\d[\s-]?\d{3}[\s-]?\d{4}\b|(?:\+27|\b0)[\s-]?[1-5]\d[\s-]?\d{3}[\s-]?\d{4}\b/g;
var TITLED = /\b(?:Mr|Mrs|Ms|Miss|Mx|Dr|Prof|Principal|Mnr|Mev)\.?\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g;
var LEARNER_ID = /\b(?:EMIS|learner\s*(?:no|number|id|name)|student\s*(?:no|number|id)|pupil\s*(?:no|number|id))\b[\s:#-]*[\w-]+/gi;
var THIRTEEN = /(?<!\d)\d{13}(?!\d)/g;
function collect(re, text, kind, keep = () => true) {
  const out = [];
  for (const m of text.matchAll(re)) {
    if (keep(m[0])) out.push({ kind, match: m[0], start: m.index ?? 0, end: (m.index ?? 0) + m[0].length });
  }
  return out;
}
function detectPii(text, knownNames = []) {
  const found = [
    ...collect(THIRTEEN, text, "sa_id", validSaId),
    ...collect(EMAIL, text, "email"),
    ...collect(PHONE, text, "phone_za"),
    ...collect(TITLED, text, "titled_name"),
    ...collect(LEARNER_ID, text, "learner_identifier")
  ];
  for (const name of knownNames.filter((n) => n.trim().length >= 3)) {
    const re = new RegExp("\\b" + name.trim().replace(/[.*+?^${}()|[\]\\]/g, "\\$&") + "\\b", "gi");
    found.push(...collect(re, text, "known_name"));
  }
  return found.sort((a, b) => a.start - b.start);
}

// src/core/guardrails/injection.ts
var RULES = [
  ["override_instructions", /\b(ignore|disregard|forget)\b[^.\n]{0,40}\b(previous|prior|above|system|earlier)\b[^.\n]{0,30}\b(instructions?|prompts?|rules?)\b/i],
  ["reveal_system_prompt", /\b(reveal|print|show|repeat|leak)\b[^.\n]{0,30}\b(system|hidden|developer)\s+(prompt|message|instructions?)\b/i],
  ["role_hijack", /\byou\s+are\s+now\b|\bact\s+as\s+(?:an?\s+)?(?:unrestricted|jailbroken|dan)\b|\bdeveloper\s+mode\b/i],
  ["bypass_controls", /\b(bypass|disable|skip|turn\s+off|override)\b[^.\n]{0,30}\b(guardrails?|approval|hitl|human\s+review|pii|audit|ledger|safety)\b/i],
  ["approval_flag", /\bSKIP_APPROVAL\b|\bAUTO_APPROVE\b|\bFORCE_APPROVE\b/],
  ["exfiltrate", /\b(send|post|upload|exfiltrate)\b[^.\n]{0,40}\b(secrets?|api\s*keys?|tokens?|passwords?|credentials?)\b/i]
];
function detectInjection(text) {
  const out = [];
  for (const [rule, re] of RULES) {
    const m = text.match(re);
    if (m) out.push({ rule, match: m[0] });
  }
  return out;
}

// server.ts
var env = process.env;
var REPO = env.ECOSYSTEM_REPO ?? "Sarah-JaneHarding/infinite-ai-ecosystem";
var PORT = Number(env.PORT ?? 3e3);
var HOST = env.HOST ?? "0.0.0.0";
if (!env.OPS_USERS && !env.OPS_API_TOKEN && !env.OPS_OPEN_DEV) {
  env.OPS_OPEN_DEV = "true";
}
var auth;
try {
  auth = parseAuth(env);
} catch (err) {
  console.warn(`WARNING: Auth configuration notice (${err.message}). Starting in open dev mode.`);
  auth = { mode: "open" };
}
var store = new FileStore();
var reader = new GithubReader(REPO, env.GITHUB_TOKEN);
var publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === "true");
var app = express();
app.disable("x-powered-by");
var wrap = (fn) => (req, res, next) => {
  Promise.resolve().then(() => fn(req, res)).catch(next);
};
var actorOf = (res) => res.locals.actor;
var tail = Promise.resolve();
var serial = (fn) => {
  const run = tail.then(fn, fn);
  tail = run.catch(() => void 0);
  return run;
};
app.get("/api/health", (_q, res) => res.json({ ok: true, repo: REPO, auth: auth.mode, githubToken: Boolean(env.GITHUB_TOKEN), llm: Boolean(env.ANTHROPIC_API_KEY), ecosystemWrites: env.OPS_ALLOW_ECOSYSTEM_WRITES === "true", webhook: Boolean(env.GITHUB_WEBHOOK_SECRET) }));
var events = [];
app.post("/api/connector/webhook", express.raw({ type: "*/*", limit: "1mb" }), wrap(async (req, res) => {
  const secret = env.GITHUB_WEBHOOK_SECRET ?? "";
  const body = req.body.toString("utf8");
  if (!await verifySignature(secret, body, req.header("x-hub-signature-256"))) return res.status(401).json({ error: "bad signature" });
  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return res.status(400).json({ error: "body is not JSON" });
  }
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) return res.status(400).json({ error: "payload must be a JSON object" });
  const ev = summariseEvent(req.header("x-github-event") ?? "unknown", payload);
  events.unshift(ev);
  events.length = Math.min(events.length, 100);
  store.append("connector_events", { id: `ev_${Date.now()}`, ...ev });
  cache = null;
  res.json({ ok: true });
}));
app.use(express.json({ limit: "512kb" }));
app.use("/api", (req, res, next) => {
  const actor = authenticate(auth, req.header("x-ops-token"));
  if (auth.mode === "users" && !actor) return res.status(401).json({ error: "unauthorised" });
  res.locals.actor = actor;
  next();
});
app.get("/api/whoami", (_q, res) => res.json({ actor: actorOf(res), mode: auth.mode }));
var cache = null;
app.get("/api/connector/status", wrap(async (_q, res) => {
  if (!cache || Date.now() - cache.at > 6e4) cache = { at: Date.now(), status: await reader.status() };
  res.json({ status: cache.status, facts: liveFacts(cache.status) });
}));
app.get("/api/connector/events", (_q, res) => res.json(events));
app.post("/api/connector/publish", wrap(async (req, res) => {
  try {
    const actor = actorOf(res);
    if (!actor) return res.status(403).json({ error: "Publishing needs an authenticated user (set OPS_USERS)." });
    const id = String(req.body?.artefactId ?? "");
    const art = store.list("artefact_versions").filter((r) => r.id === id).at(-1);
    if (!art) return res.status(404).json({ error: "unknown artefact" });
    if (!store.list("approvals").some((r) => r.artefactId === id && r.decision === "APPROVED" && r.approver === art.approvedBy)) return res.status(403).json({ error: "No recorded human approval for this artefact." });
    const summary = String(req.body?.summary ?? "").slice(0, 4e3);
    const out = await publisher.openIssue(art, proposalFromArtefact(art, summary));
    store.append("connector_events", { id: `pub_${Date.now()}`, kind: "issue_opened", summary: out.url, by: actor, at: (/* @__PURE__ */ new Date()).toISOString() });
    res.json(out);
  } catch (e) {
    if (e instanceof PublishRefused) return res.status(403).json({ error: e.message });
    throw e;
  }
}));
var limiter = new RateLimiter(20, 6e4);
app.post("/api/gateway/complete", wrap(async (req, res) => {
  const { system = "", prompt = "", provenance } = req.body ?? {};
  if (!env.ANTHROPIC_API_KEY) return res.status(503).json({ error: "ANTHROPIC_API_KEY not configured" });
  if (typeof system !== "string" || typeof prompt !== "string" || !prompt || system.length + prompt.length > 2e4) return res.status(400).json({ error: "system and prompt must be strings (prompt required, 20k characters in total at most)" });
  if (provenance?.deidentified !== true || !Array.isArray(provenance.sources) || !provenance.sources.length) return res.status(422).json({ error: "refused: payload is not stamped de-identified with sources" });
  if (!limiter.allow(actorOf(res) ?? "open")) return res.status(429).json({ error: "rate limit: try again in a minute" });
  if (detectPii(`${system}
${prompt}`).length || detectInjection(prompt).length) return res.status(422).json({ error: "refused: personal data or injection pattern" });
  try {
    const text = await completeWithClaude({ apiKey: env.ANTHROPIC_API_KEY, model: env.ANTHROPIC_MODEL ?? "claude-sonnet-5-5", system, prompt });
    res.json({ text });
  } catch (e) {
    res.status(e instanceof ClaudeError ? 502 : 500).json({ error: e.message });
  }
}));
app.post("/api/ledger", wrap(async (req, res) => {
  try {
    const out = await appendLedger(store, req.body?.input, req.body?.knownSeq, actorOf(res));
    res.json(out);
  } catch (e) {
    if (e instanceof Rejected) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));
app.get("/api/warehouse", (_q, res) => res.json(store.load()));
app.post("/api/warehouse/:collection", wrap(async (req, res) => {
  try {
    await serial(async () => {
      const rec = await validateAppend(req.params.collection, req.body, { actor: actorOf(res), store });
      store.append(req.params.collection, rec);
    });
    res.json({ ok: true });
  } catch (e) {
    if (e instanceof Rejected) return res.status(e.status).json({ error: e.message });
    throw e;
  }
}));
app.get("/api/warehouse-export.jsonl", (_q, res) => {
  const all = store.load();
  res.type("application/x-ndjson").send(Object.entries(all).flatMap(([c, rs]) => rs.map((r) => JSON.stringify({ collection: c, ...r }))).join("\n"));
});
app.use("/api", (err, _req, res, _next) => {
  const e = err;
  const status = e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  if (status === 500) console.error(err);
  res.status(status).json({ error: status === 500 ? "internal error" : e.message ?? "error" });
});
async function start() {
  if (env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    const dist = path.join(process.cwd(), "dist");
    app.use(express.static(dist));
    app.get("*", (_q, res) => res.sendFile(path.join(dist, "index.html")));
  }
  app.listen(PORT, HOST, () => {
    console.log(`Infinite-AI Ops Platform on http://${HOST}:${PORT}  (repo: ${REPO}; auth: ${auth.mode})`);
    if (auth.mode === "open") console.warn("WARNING: no users configured (OPS_USERS). Open dev mode: identity is self-declared and publishing is disabled.");
  });
}
start();
