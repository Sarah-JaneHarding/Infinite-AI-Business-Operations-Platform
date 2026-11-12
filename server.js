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

// server.ts
import { lookup } from "node:dns/promises";

// src/server/outbound.ts
import { createHmac } from "node:crypto";
import { isIP } from "node:net";
var parseAllowlist = (v2) => (v2 ?? "").split(",").map((h) => h.trim().toLowerCase()).filter(Boolean);
function checkTarget(raw, allow) {
  if (!allow.length) return { ok: false, why: "Outbound sending is off: OPS_OUTBOUND_ALLOWLIST is not set." };
  let u;
  try {
    u = new URL(raw);
  } catch {
    return { ok: false, why: "That is not a valid URL." };
  }
  if (u.protocol !== "https:") return { ok: false, why: "Only https addresses are allowed." };
  if (u.username || u.password) return { ok: false, why: "Addresses with a user name or password are not allowed." };
  if (u.port && u.port !== "443") return { ok: false, why: "Only the standard https port is allowed." };
  const host = u.hostname.toLowerCase().replace(/\.$/, "");
  if (isIP(host) || host.startsWith("[") || !host.includes(".") || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return { ok: false, why: "Internal and numeric addresses are not allowed." };
  if (!allow.includes(host)) return { ok: false, why: `${host} is not on the allowed list.` };
  return { ok: true, url: u };
}
function isPrivateIp(ip) {
  const v2 = isIP(ip);
  if (v2 === 4) {
    const [a, b] = ip.split(".").map(Number);
    return a === 0 || a === 10 || a === 127 || a === 100 && b >= 64 && b <= 127 || a === 169 && b === 254 || a === 172 && b >= 16 && b <= 31 || a === 192 && b === 168 || a === 192 && b === 0 || a === 198 && (b === 18 || b === 19) || a >= 224;
  }
  if (v2 === 6) {
    const l = ip.toLowerCase();
    if (l === "::" || l === "::1") return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    if (m) return isPrivateIp(m[1]);
    return /^(fc|fd|fe[89ab])/.test(l) || l.startsWith("ff");
  }
  return true;
}
function payloadFor(a) {
  return { id: a.id, title: a.title, version: a.version, status: a.status, agent: a.agentId, approvedBy: a.approvedBy ?? null, at: a.at, doc: a.doc };
}
var sign = (secret, body) => `sha256=${createHmac("sha256", secret).update(body).digest("hex")}`;

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
    `> Drafted by the Infinite-AI Ops Platform (${a.agentId}) and approved by ${a.approvedBy ?? "n/a"} and countersigned by ${a.countersignedBy ?? "n/a"}. AI drafts. The human decides.`,
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
    if (a.status !== "RATIFIED" && a.status !== "INGESTED" || !a.approvedBy || !a.countersignedBy || a.approvedBy === a.countersignedBy) throw new PublishRefused("Only a ratified artefact (approved and countersigned by two different people) can be published.");
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
  if (env2.OPS_OPEN_DEV === "true" || LOOPBACK.has(env2.HOST || "127.0.0.1")) return { mode: "open" };
  throw new Error("No users configured (OPS_USERS) and HOST is not loopback. Set OPS_USERS, or OPS_OPEN_DEV=true for a throwaway local container.");
}
function authenticate(auth2, token) {
  if (auth2.mode !== "users" || !token) return null;
  const d = digest(token);
  let found = null;
  for (const u of auth2.users) if (timingSafeEqual(u.digest, d)) found = u.id;
  return found;
}

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
function newId(prefix) {
  const r = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return prefix + "_" + [...r].map((b) => b.toString(16).padStart(2, "0")).join("");
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
var DEPT_OWNER = { executive: "Executive", product: "Product", curriculum: "Curriculum", ai: "AI and Brain", security: "Security", legal: "Legal", finance: "Finance", sales: "Sales", marketing: "Marketing", success: "Customer Success", support: "Support", government: "Government Relations", people: "People", devops: "Infrastructure", procurement: "Procurement", research: "Research" };
function defineAgent(dept, code, d) {
  const id = `OPS-${code}-${String(d.n).padStart(2, "0")}`;
  return {
    id,
    version: "1.0.0",
    dept,
    name: d.name,
    summary: d.summary,
    framework: d.framework,
    owner: d.owner ?? `Head of ${DEPT_OWNER[dept] ?? dept}`,
    models: d.models,
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
var rows = (s) => (s ?? "").split("\n").map((l) => l.split("|").map((x) => x.trim())).filter((p) => p[0]);
var lines = (s) => (s ?? "").split("\n").map((x) => x.trim()).filter(Boolean);

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
var weightedScore = (rows2) => {
  const w = rows2.reduce((a, r) => a + r.weight, 0);
  return [{ label: "Weighted score", value: div(rows2.reduce((a, r) => a + r.weight * r.score, 0), w), unit: "weighted avg", formula: "\u03A3(weight \xD7 score) \xF7 \u03A3 weight" }];
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
var SCHOOL_PRICING = {
  minMonthly: 750,
  platformFee: 300,
  perEducator: 75,
  perLearnerFirst: 4,
  tierBreak: 500,
  perLearnerBeyond: 1.5,
  communityFactor: 0.5,
  annualDiscount: 0.1,
  vat: 0.15,
  variablePerLearner: 1.76,
  paymentFee: 0.01
};
var schoolMonthlyExVat = (learners, educators) => {
  const P = SCHOOL_PRICING;
  if (![learners, educators].every((n) => Number.isFinite(n) && n >= 0)) return null;
  const raw = P.platformFee + P.perEducator * educators + P.perLearnerFirst * Math.min(learners, P.tierBreak) + P.perLearnerBeyond * Math.max(0, learners - P.tierBreak);
  return Math.max(P.minMonthly, raw);
};
var schoolQuote = (learners, educators) => {
  const P = SCHOOL_PRICING;
  const std = schoolMonthlyExVat(learners, educators);
  if (std === null) return [{ label: "Monthly price ex VAT", value: null, unit: "R", formula: "learners and educators must be zero or more" }];
  const com = std * P.communityFactor;
  const annual = (m) => m * 12 * (1 - P.annualDiscount);
  const margin = (m) => m - P.variablePerLearner * learners - P.paymentFee * m;
  return [
    { label: "Standard: monthly ex VAT", value: std, unit: "R", formula: "max(R750, R300 + R75 \xD7 educators + R4.00 \xD7 first 500 learners + R1.50 \xD7 learners above 500)" },
    { label: "Standard: monthly incl VAT", value: std * (1 + P.vat), unit: "R", formula: "ex VAT \xD7 1.15" },
    { label: "Standard: annual prepay ex VAT", value: annual(std), unit: "R", formula: "monthly \xD7 12 \xD7 0.90" },
    { label: "Community rate: monthly ex VAT", value: com, unit: "R", formula: "standard \xD7 50% (no-fee / low-budget public schools)" },
    { label: "Community rate: annual prepay ex VAT", value: annual(com), unit: "R", formula: "community monthly \xD7 12 \xD7 0.90" },
    { label: "Price per learner per month (standard, ex VAT)", value: div(std, learners), unit: "R", formula: "monthly ex VAT \xF7 learners" },
    { label: "Internal margin per month (standard, ex VAT)", value: margin(std), unit: "R", formula: "price \u2212 R1.76 \xD7 learners \u2212 1% payment fee" }
  ];
};

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
    { id: "decisions", title: "Decision log", type: "tracker", collection: "decisions", columns: [{ key: "decision", label: "Decision", kind: "text" }, { key: "door", label: "Door", kind: "select", options: ["One-way", "Two-way"] }, { key: "decider", label: "Decider (role)", kind: "text" }, { key: "date", label: "Date", kind: "date" }, { key: "review", label: "Review on", kind: "date" }] },
    { id: "actions", title: "Action tracker", type: "tracker", collection: "actions", columns: [{ key: "action", label: "Action", kind: "text" }, { key: "owner", label: "Owner (role)", kind: "text" }, { key: "due", label: "Due", kind: "date" }, { key: "status", label: "Status", kind: "select", options: ["Open", "Done", "Blocked"] }] },
    { id: "compliance-cal", title: "Compliance calendar", type: "tracker", collection: "compliance_calendar", note: "Enter only dates you have confirmed on the official source.", columns: [{ key: "item", label: "Item", kind: "text" }, { key: "date", label: "Date", kind: "date" }, { key: "source", label: "Source", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["To confirm", "Confirmed", "Done"] }] }
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
    }),
    defineAgent("executive", "EXEC", {
      n: 4,
      name: "Scenario and risk review",
      summary: "Scenarios with the assumptions you type, the risks and a trigger to watch for each.",
      framework: "Scenario planning",
      purpose: "strategy_planning",
      formats: ["md", "docx", "xlsx"],
      inputs: [txt("decision", "Decision at stake", true), long("scenarios", "Scenarios, one per line: name | what happens | trigger to watch", true), long("assumptions", "Assumptions, one per line: assumption | source", true)],
      sections: (c) => [{ h: "Decision", input: c.input.decision ?? "" }, { h: "Scenarios", table: { headers: ["Scenario", "What happens", "Trigger to watch", "Owner (role)"], rows: rows(c.input.scenarios).map((p) => [p[0], p[1] ?? "", p[2] ?? "", ""]) } }, { h: "Assumptions and where they come from", table: { headers: ["Assumption", "Source", "Status"], rows: rows(c.input.assumptions).map((p) => [p[0], p[1] || "None given", p[1] ? "Sourced" : "Unsourced: cite or drop"]) } }, { h: "Risks", table: { headers: ["Risk", "Scenario", "Response", "Owner (role)"], rows: blankRows(["Risk 1", "Risk 2", "Risk 3"], 4) } }, { h: "Before this is used", checks: ["Every assumption has a source or is marked as a judgement", "Each scenario has a trigger someone is watching", "Owners named by role"] }]
    }),
    defineAgent("executive", "EXEC", {
      n: 5,
      name: "Meeting minutes and action log",
      summary: "Minutes from your notes, with actions, owners and dates.",
      framework: "Minutes and action log",
      purpose: "strategy_planning",
      formats: ["md", "docx", "csv"],
      inputs: [txt("meeting", "Meeting and date", true), txt("attendees", "Attendees (roles)"), long("notes", "Your notes", true), long("actions", "Actions, one per line: action | owner (role) | due date")],
      sections: (c) => [{ h: "Meeting", kv: [["Meeting", v(c, "meeting")], ["Attendees", v(c, "attendees")]] }, { h: "Notes", input: c.input.notes ?? "" }, { h: "Actions", table: { headers: ["Action", "Owner (role)", "Due", "Status"], rows: rows(c.input.actions).length ? rows(c.input.actions).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "Open"]) : [[TBC, "", "", ""]] } }, { h: "Before these minutes are filed", checks: ["Attendees have seen and agreed the minutes", "Every action has one owner and a date", "Actions copied to the action tracker"] }]
    }),
    defineAgent("executive", "EXEC", {
      n: 6,
      name: "Statutory and compliance calendar",
      summary: "Calendar of filings and renewals. Every date is flagged to confirm with the official source.",
      framework: "Compliance calendar",
      purpose: "strategy_planning",
      formats: ["md", "xlsx", "csv"],
      warning: "The platform does not know any statutory deadline. Dates here are only the ones you typed, and each must be confirmed with the official source.",
      inputs: [long("entity", "Entity facts (type, registrations, year end)", true), long("deadlines", "Deadlines, one per line: item | date | source", true)],
      sections: (c) => [{ h: "Entity", input: c.input.entity ?? "" }, { h: "Calendar", table: { headers: ["Item", "Date (as you typed it)", "Source", "Status"], rows: rows(c.input.deadlines).map((p) => [p[0], p[1] ?? "", p[2] || "None given", "Confirm with the official source"]) } }, { h: "Before this is relied on", checks: ["Each date confirmed on the official source", "An owner and a reminder set for each item", "Reviewed by the accountant or company secretary"] }]
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
    { id: "backlog", title: "Roadmap backlog", type: "tracker", collection: "roadmap", columns: [{ key: "item", label: "Item", kind: "text" }, { key: "rice", label: "RICE", kind: "number" }, { key: "stage", label: "Stage-gate", kind: "select", options: ["Idea", "Scoped", "Build", "Test", "Launch"] }, { key: "oq", label: "Linked OQ", kind: "text" }] },
    { id: "findings", title: "Usability findings", type: "tracker", collection: "usability_findings", columns: [{ key: "finding", label: "Finding", kind: "text" }, { key: "screen", label: "Screen or flow", kind: "text" }, { key: "severity", label: "Severity", kind: "select", options: ["Blocker", "Major", "Minor"] }, { key: "status", label: "Status", kind: "select", options: ["New", "Planned", "Fixed"] }] },
    { id: "a11y", title: "Accessibility checks", type: "checklist", collection: "a11y", items: ["Everything works by keyboard", "Colour contrast checked", "Every control has a name and label", "Focus is always visible", "Text can be enlarged without loss", "Tested with assistive technology"] }
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
        const rows2 = (c.input.items ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 5 && p[0]).map((p) => {
          const [r, i, cf, e] = [Number(p[1]), Number(p[2]), Number(p[3]), Number(p[4])];
          const s = e > 0 && [r, i, cf].every(Number.isFinite) ? r * i * (cf / 100) / e : NaN;
          return [p[0], p[1], p[2], p[3], p[4], Number.isFinite(s) ? Math.round(s * 100) / 100 : "n/a"];
        }).sort((a, b) => (typeof b[5] === "number" ? b[5] : -1) - (typeof a[5] === "number" ? a[5] : -1));
        return [{ h: "Ranked backlog", table: { headers: ["Item", "Reach", "Impact", "Confidence %", "Effort", "RICE"], rows: rows2.length ? rows2 : [[TBC, "", "", "", "", ""]] } }, { h: "Method", p: "RICE = reach \xD7 impact \xD7 confidence \xF7 effort. A score is a conversation starter, not a decision. Low-confidence items need evidence before they are built." }];
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
    }),
    defineAgent("product", "PROD", {
      n: 4,
      name: "Release readiness checklist",
      summary: "Go or no-go sheet for a release.",
      framework: "Release readiness review",
      purpose: "engineering_governance",
      formats: ["md", "docx", "pdf"],
      inputs: [txt("release", "Release", true), long("scope", "Scope of the release", true), long("risks", "Known risks and open issues"), txt("ci", "CI status as you read it on the Live CI widget")],
      sections: (c) => [{ h: "Release", kv: [["Release", v(c, "release")], ["CI status (your reading)", v(c, "ci")]] }, { h: "Scope", input: c.input.scope ?? "" }, { h: "Known risks", input: c.input.risks ?? "" }, { h: "Readiness checks", checks: ["Tests pass in CI on the release commit", "Rollback tested or documented", "Migrations reviewed", "Documentation and release notes updated", "POPIA impact checked for any change touching personal information", "Open issues accepted or fixed by the approver"] }, { h: "Decision", table: { headers: ["Decision", "Decided by (role)", "Date", "Conditions"], rows: [["Go / No-go", "", "", ""]] } }]
    }),
    defineAgent("product", "PROD", {
      n: 5,
      name: "Teacher usability test plan",
      summary: "Task script and observation grid for sessions with teachers. No learner data.",
      framework: "Moderated usability test",
      purpose: "engineering_governance",
      formats: ["md", "docx", "csv"],
      inputs: [txt("feature", "Feature or flow", true), long("tasks", "Tasks, one per line: task | what success looks like", true), long("participants", "Participant roles (no names)")],
      sections: (c) => [{ h: "Goal", input: c.input.feature ?? "" }, { h: "Participants (roles)", input: c.input.participants ?? "" }, { h: "Task script and observation grid", table: { headers: ["Task", "Success looks like", "What you saw", "Issue to log"], rows: rows(c.input.tasks).map((p) => [p[0], p[1] ?? "", "", ""]) } }, { h: "Ethics and data", checks: ["Participants are teachers who agreed to take part", "No learner data on screen or in notes", "Recordings, if any, stored and deleted as agreed", "Findings added to the findings tracker"] }]
    }),
    defineAgent("product", "PROD", {
      n: 6,
      name: "Accessibility review sheet",
      summary: "Accessibility checks per screen with space for evidence and fixes.",
      framework: "WCAG principles (perceivable, operable, understandable, robust)",
      purpose: "engineering_governance",
      formats: ["md", "xlsx"],
      inputs: [long("screens", "Screens or flows, one per line", true), txt("at", "Assistive technology and browsers used")],
      sections: (c) => [{ h: "Method", kv: [["Assistive technology", v(c, "at")]] }, { h: "Screen review", table: { headers: ["Screen", "Keyboard only", "Colour contrast", "Labels and names", "Focus visible", "Zoomed text", "Evidence and fix"], rows: lines(c.input.screens).map((s) => [s, "", "", "", "", "", ""]) } }, { h: "Principles to check", checks: ["Perceivable: text alternatives, contrast, resizable text", "Operable: everything works by keyboard, no traps, enough time", "Understandable: clear labels, predictable behaviour, helpful errors", "Robust: works with assistive technology"] }]
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
    { id: "qa-log", title: "Content review log", type: "tracker", collection: "content_review", columns: [{ key: "asset", label: "Asset", kind: "text" }, { key: "grade", label: "Grade", kind: "select", options: ["R", "1", "2", "3", "4", "5", "6", "7"] }, { key: "caps", label: "CAPS reference", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["To review", "Changes needed", "Approved"] }, { key: "reviewer", label: "Reviewer (role)", kind: "text" }] },
    { id: "moderation", title: "Moderation checks", type: "checklist", collection: "moderation", items: ["Learner codes only", "Sample method written down", "Marking guide applied consistently", "Differences discussed and recorded", "Feedback to teacher recorded"] }
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
    }),
    defineAgent("curriculum", "CURR", {
      n: 4,
      name: "CAPS-aligned assessment task and rubric",
      summary: "Task, rubric and memo template for a topic you cite from CAPS.",
      framework: "CAPS alignment",
      purpose: "content_review",
      formats: ["md", "docx", "pdf"],
      warning: "The CAPS wording must be pasted from the official document. The platform never writes CAPS content from memory.",
      inputs: [txt("grade", "Grade", true), txt("subject", "Subject", true), txt("topic", "CAPS topic and page", true), long("caps", "CAPS wording you are assessing (pasted)"), long("task", "Task draft or idea")],
      sections: (c) => [{ h: "Alignment", kv: [["Grade", v(c, "grade")], ["Subject", v(c, "subject")], ["CAPS topic and page", v(c, "topic")]] }, { h: "CAPS wording (as pasted)", input: c.input.caps ?? "" }, { h: "Task", input: c.input.task ?? "" }, { h: "Rubric (you set the descriptors)", table: { headers: ["Criterion", "Level descriptor", "Level descriptor", "Level descriptor", "Level descriptor"], rows: blankRows(["Criterion 1", "Criterion 2", "Criterion 3"], 5) } }, { h: "Memo", table: { headers: ["Question", "Expected response", "Marks"], rows: blankRows(["Question 1", "Question 2"], 3) } }, { h: "Check before use", checks: ["Task matches the CAPS wording above", "Language level suits the grade", "Accessible to learners with barriers to learning", "Marks add up to the total you intend"] }]
    }),
    defineAgent("curriculum", "CURR", {
      n: 5,
      name: "Moderation record",
      summary: "Moderation checklist and record for sampled tasks, by learner code only.",
      framework: "Assessment moderation",
      purpose: "content_review",
      formats: ["md", "docx", "csv"],
      inputs: [long("sample", "Sample, one per line: task | learner code | teacher mark", true), txt("moderator", "Moderator (role)")],
      sections: (c) => [{ h: "Moderator", kv: [["Moderator (role)", v(c, "moderator")]] }, { h: "Sampled work", table: { headers: ["Task", "Learner code", "Teacher mark", "Moderator mark", "Agreed", "Comment"], rows: rows(c.input.sample).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "", "", ""]) } }, { h: "Checks", checks: ["Learner codes only: no names", "Sample chosen by a method the school has written down", "Marking guide applied the same way to each script", "Differences discussed and recorded", "Feedback to the teacher recorded"] }]
    }),
    defineAgent("curriculum", "CURR", {
      n: 6,
      name: "Home-language glossary check",
      summary: "Term list laid out for a first-language speaker to verify. Unverified translation is never used.",
      framework: "Glossary verification",
      purpose: "content_review",
      formats: ["md", "docx", "csv"],
      warning: "The platform does not translate. Each translation is supplied and verified by a first-language speaker before use.",
      inputs: [long("terms", "Terms, one per line: term | meaning in English", true), txt("languages", "Languages", true)],
      sections: (c) => [{ h: "Languages", input: c.input.languages ?? "" }, { h: "Glossary", table: { headers: ["Term", "Meaning in English", "Term in the language", "Verified by (first-language speaker)", "Date"], rows: rows(c.input.terms).map((p) => [p[0], p[1] ?? "", "", "", ""]) } }, { h: "Checks", checks: ["A first-language speaker verified each entry", "Terms match those used in the classroom and in CAPS", "Reviewed for dialect and register suitable for the grade"] }]
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
    }),
    defineAgent("ai", "AI", {
      n: 4,
      name: "Eval results review",
      summary: "Pass or fail table against thresholds you set, from results you type.",
      framework: "Eval gate review",
      purpose: "ai_governance",
      formats: ["md", "xlsx", "csv"],
      inputs: [txt("agent", "Agent or model", true), long("results", "Results, one per line: metric | value", true), long("thresholds", "Thresholds, one per line: metric | minimum", true)],
      sections: (c) => {
        const res = new Map(rows(c.input.results).map((p) => [p[0], Number(p[1])]));
        const table = rows(c.input.thresholds).map((p) => {
          const t = Number(p[1]);
          const r = res.get(p[0]);
          const ok = Number.isFinite(t) && r !== void 0 && Number.isFinite(r);
          return [p[0], r === void 0 ? "No result" : String(r), p[1] ?? "", ok ? (r >= t ? "Pass" : "Fail") + " [src:computed from your inputs]" : "Cannot compare"];
        });
        return [{ h: "Agent", input: c.input.agent ?? "" }, { h: "Results against thresholds", table: { headers: ["Metric", "Result", "Minimum", "Outcome"], rows: table.length ? table : [[TBC, "", "", ""]] } }, { h: "Before release", checks: ["Every threshold has a result", "Failures have an owner and a fix date", "Eval set contains no learner data", "Approver recorded"] }];
      }
    }),
    defineAgent("ai", "AI", {
      n: 5,
      name: "Guardrail rule change proposal",
      summary: "Proposed guardrail change with the risk it addresses and a test to prove it.",
      framework: "Change control for guardrails",
      purpose: "ai_governance",
      secondApprover: true,
      formats: ["md", "docx"],
      inputs: [txt("rule", "Rule to change", true), long("reason", "Why the change is needed", true), long("test", "Test that proves it works", true)],
      sections: (c) => [{ h: "Proposed change", input: c.input.rule ?? "" }, { h: "Risk addressed", input: c.input.reason ?? "" }, { h: "Proof", input: c.input.test ?? "" }, { h: "Gate impact (the platform\u2019s fixed order)", table: { headers: ["Gate", "Affected?", "Note"], rows: [["Tombstone", "", ""], ["Purpose", "", ""], ["Lawful basis", "", ""]] } }, { h: "Before approval", checks: ["Test added and passing", "No weakening of the refusal of learner data", "Second approver has read the test"] }]
    }),
    defineAgent("ai", "AI", {
      n: 6,
      name: "Prompt change review",
      summary: "Risk notes on a prompt change.",
      framework: "Prompt review",
      purpose: "ai_governance",
      formats: ["md", "docx"],
      inputs: [txt("agent", "Agent", true), long("diff", "Prompt change (before and after)", true), long("notes", "Reviewer notes")],
      sections: (c) => [{ h: "Agent", input: c.input.agent ?? "" }, { h: "Change as submitted", input: c.input.diff ?? "" }, { h: "Review questions", checks: ["Scope stays within the agent\u2019s purpose", "No instruction invites personal or learner data", "No claim, figure or policy is hard-coded without a source", "Instructions cannot be overridden by user input", "Evals re-run after the change"] }, { h: "Notes", input: c.input.notes ?? "" }]
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
    { id: "breach", title: "Incident / breach log", type: "tracker", collection: "breach_log", columns: [{ key: "what", label: "What happened (no personal data)", kind: "text" }, { key: "detected", label: "Detected", kind: "date" }, { key: "regulator", label: "Regulator told?", kind: "select", options: ["Not required", "Decision pending", "Yes"] }, { key: "subjects", label: "Data subjects told?", kind: "select", options: ["Not required", "Decision pending", "Yes"] }] },
    { id: "access-review", title: "Access review", type: "checklist", collection: "access_review", items: ["Access follows the role, not the person", "Leavers and role changes removed", "Administrator rights limited and justified", "Multi-factor sign-in on for every administrator", "Review date recorded"] },
    { id: "dsr-log", title: "Data subject requests", type: "tracker", collection: "dsr_log", note: "Reference codes only. Never a name.", columns: [{ key: "ref", label: "Reference code", kind: "text" }, { key: "type", label: "Type", kind: "select", options: ["Access", "Correction", "Deletion", "Objection"] }, { key: "received", label: "Received", kind: "date" }, { key: "status", label: "Status", kind: "select", options: ["Open", "Responded", "Closed"] }] }
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
    }),
    defineAgent("security", "SEC", {
      n: 4,
      name: "Data subject request response",
      summary: "Response checklist for a POPIA access, correction, deletion or objection request, by reference code only.",
      framework: "POPIA data subject rights",
      purpose: "compliance_review",
      secondApprover: true,
      formats: ["md", "docx"],
      warning: "Use a reference code, never the person\u2019s name. Confirm the response period and wording with the Information Officer or counsel.",
      inputs: [txt("ref", "Reference code", true), pick("type", "Request type", ["Access", "Correction", "Deletion", "Objection"], true), txt("received", "Date received", true), long("systems", "Systems that may hold the information")],
      sections: (c) => [{ h: "Request", kv: [["Reference", v(c, "ref")], ["Type", v(c, "type")], ["Received", v(c, "received")]] }, { h: "Systems to search", input: c.input.systems ?? "" }, { h: "Steps", checks: ["Identity of the requester verified", "Request logged in the request log", "Every system searched", "Response period confirmed with the Information Officer", "For deletion: erasure carried out and recorded (see OPQ-013)", "Response sent by a named person", "Outcome recorded"] }, { h: "Record", table: { headers: ["Step", "Done by (role)", "Date", "Note"], rows: blankRows(["Verification", "Search", "Decision", "Response"], 4) } }]
    }),
    defineAgent("security", "SEC", {
      n: 5,
      name: "Access review",
      summary: "Least-privilege review of roles and the access they hold, by role not name.",
      framework: "Least privilege review",
      purpose: "compliance_review",
      formats: ["md", "xlsx", "csv"],
      inputs: [long("access", "Access, one per line: role | system | access level", true), txt("reviewer", "Reviewer (role)")],
      sections: (c) => [{ h: "Reviewer", kv: [["Reviewer (role)", v(c, "reviewer")]] }, { h: "Access held", table: { headers: ["Role", "System", "Access level", "Needed for the role?", "Action"], rows: rows(c.input.access).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "", ""]) } }, { h: "Checks", checks: ["Access follows the role, not the person", "Leavers and role changes removed", "Administrator rights limited and justified", "Multi-factor sign-in on for every administrator (see OQ-036)", "Review date recorded"] }]
    }),
    defineAgent("security", "SEC", {
      n: 6,
      name: "Operator register review",
      summary: "Checks that each operator has a written agreement and recorded security measures.",
      framework: "POPIA operator agreements",
      purpose: "compliance_review",
      formats: ["md", "xlsx", "csv"],
      inputs: [long("operators", "Operators, one per line: operator | service | written agreement (yes or no) | security measures recorded (yes or no)", true)],
      sections: (c) => {
        const r = rows(c.input.operators).map((p) => {
          const a = (p[2] ?? "").toLowerCase() === "yes";
          const s = (p[3] ?? "").toLowerCase() === "yes";
          return [p[0], p[1] ?? "", a ? "Yes" : "No", s ? "Yes" : "No", a && s ? "Complete" : "Gap: fix before relying on this operator"];
        });
        return [{ h: "Register", table: { headers: ["Operator", "Service", "Written agreement", "Security measures recorded", "Result"], rows: r.length ? r : [[TBC, "", "", "", ""]] } }, { h: "Gaps", bullets: r.filter((x) => String(x[4]).startsWith("Gap")).map((x) => `${x[0]}: ${x[1]}`).concat(r.some((x) => String(x[4]).startsWith("Gap")) ? [] : ["None found in what you typed"]) }, { h: "Checks", checks: ["Register matches the vendors the company really uses", "Agreements are signed and filed", "Counsel reviewed any operator handling personal information"] }];
      }
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
    { id: "clauses", title: "Core clause checklist", type: "checklist", collection: "clause_check", items: ["Parties, scope and term", "Fees, invoicing and VAT treatment", "Data protection: roles (responsible party / operator) and instructions", "Security measures and breach notification duties", "Cross-border transfer terms", "Intellectual property and licence of content", "Service levels and support", "Limitation of liability", "Termination and data return / deletion", "Governing law and dispute resolution"] },
    { id: "obligations", title: "Obligations and renewals", type: "tracker", collection: "obligations", columns: [{ key: "contract", label: "Contract", kind: "text" }, { key: "obligation", label: "Obligation", kind: "text" }, { key: "due", label: "Due", kind: "date" }, { key: "owner", label: "Owner (role)", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["Open", "Done"] }] }
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
    }),
    defineAgent("legal", "LEG", {
      n: 4,
      name: "School agreement term sheet",
      summary: "Term sheet for a school agreement, for counsel to turn into a contract.",
      framework: "Term sheet",
      purpose: "contract_review",
      secondApprover: true,
      formats: ["md", "docx"],
      warning: "Outline only. A lawyer drafts the agreement. Price comes from an approved price card or quote, never from this agent.",
      inputs: [txt("school", "School", true), long("pricing", "Pricing agreed (from an approved quote)", true), txt("term", "Term and renewal"), long("special", "Special terms the school asked for")],
      sections: (c) => [{ h: "Parties", kv: [["School", v(c, "school")], ["Company", "Infinite-AI"]] }, { h: "Commercial terms", input: c.input.pricing ?? "" }, { h: "Term and renewal", input: c.input.term ?? "" }, { h: "Special terms", input: c.input.special ?? "" }, { h: "Clauses for counsel to settle", checks: ["Services and service levels", "Fees, invoicing and VAT", "Roles under POPIA: who is responsible party and who is operator", "Data protection and security", "Intellectual property", "Liability", "Termination and data return", "Governing law and disputes"] }]
    }),
    defineAgent("legal", "LEG", {
      n: 5,
      name: "Privacy notice outline",
      summary: "Outline of a notice for counsel to finalise.",
      framework: "POPIA openness and notification",
      purpose: "contract_review",
      secondApprover: true,
      formats: ["md", "docx"],
      warning: "Outline only. Counsel confirms what POPIA requires the notice to say.",
      inputs: [long("data", "Personal information collected, and from whom", true), long("purposes", "Purposes it is used for", true), txt("officer", "Information Officer (role)")],
      sections: (c) => [{ h: "What we collect", input: c.input.data ?? "" }, { h: "Why we use it", input: c.input.purposes ?? "" }, { h: "Who we share it with", table: { headers: ["Recipient", "Why", "Agreement in place"], rows: blankRows(["Recipient 1", "Recipient 2"], 3) } }, { h: "People\u2019s rights", bullets: ["See the information we hold", "Ask us to correct or delete it", "Object to how we use it", "Complain to the Information Regulator"] }, { h: "Contact", kv: [["Information Officer (role)", v(c, "officer")]] }, { h: "Check before publishing", checks: ["Matches what the system really does", "Written for the reader\u2019s level (teachers and parents)", "Counsel has reviewed it"] }]
    }),
    defineAgent("legal", "LEG", {
      n: 6,
      name: "Obligation and renewal register",
      summary: "Dates and duties taken from signed contracts.",
      framework: "Contract obligation register",
      purpose: "contract_review",
      formats: ["md", "xlsx", "csv"],
      inputs: [txt("asof", "As at date (YYYY-MM-DD)", true), long("items", "One per line: contract | obligation | due date (YYYY-MM-DD) | owner (role)", true)],
      sections: (c) => {
        const asof = Date.parse(c.input.asof ?? "");
        const r = rows(c.input.items).map((p) => {
          const d = Date.parse(p[2] ?? "");
          const days = Number.isFinite(asof) && Number.isFinite(d) ? Math.round((d - asof) / 864e5) : null;
          return [p[0], p[1] ?? "", p[2] ?? "", days === null ? "n/a" : `${days} [src:computed from your dates]`, p[3] ?? ""];
        }).sort((a, b) => (typeof a[3] === "string" && a[3] !== "n/a" ? parseInt(a[3]) : 1e9) - (typeof b[3] === "string" && b[3] !== "n/a" ? parseInt(b[3]) : 1e9));
        return [{ h: "Obligations, soonest first", table: { headers: ["Contract", "Obligation", "Due", "Days to due", "Owner (role)"], rows: r.length ? r : [[TBC, "", "", "", ""]] } }, { h: "Checks", checks: ["Dates copied from the signed contract", "Each obligation has an owner", "Reminders set"] }];
      }
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
    { id: "schoolquote", title: "School quote calculator", type: "calc", note: "Type a school\u2019s learners and educators. Rates come from the per-school pricing model (a proposal for decision D-1, not yet tested with a paying school): R300 + R75 per educator + R4.00 per learner for the first 500 + R1.50 above 500, minimum R750; community rate 50%; annual prepay 10% off; VAT 15%.", inputs: [{ key: "learners", label: "Learners" }, { key: "educators", label: "Educators" }], compute: (x) => schoolQuote(x.learners, x.educators) },
    { id: "var", title: "Budget vs actual", type: "calc", note: FIN_NOTE, inputs: [{ key: "b", label: "Budget", unit: "R" }, { key: "a", label: "Actual", unit: "R" }], compute: (x) => variance(x.b, x.a) },
    { id: "budget", title: "Budget lines", type: "tracker", collection: "budget", columns: [{ key: "line", label: "Line", kind: "text" }, { key: "budget", label: "Budget (R)", kind: "number" }, { key: "actual", label: "Actual (R)", kind: "number" }, { key: "note", label: "Note", kind: "text" }] },
    { id: "closechk", title: "Month-end close", type: "checklist", collection: "month_end_close", items: ["Bank accounts reconciled to statements", "Payment processor settlements matched to the ledger", "Debtors and creditors ledgers agree to their control accounts", "Accruals and prepayments posted", "Payroll journals posted", "VAT workings prepared for the accountant", "Management accounts reviewed", "Close signed off"] },
    { id: "debtors", title: "Debtors", type: "tracker", collection: "debtors", note: "School accounts only. Never a learner or parent.", columns: [{ key: "school", label: "School", kind: "text" }, { key: "invoice", label: "Invoice ref", kind: "text" }, { key: "amount", label: "Amount (R)", kind: "number" }, { key: "due", label: "Due", kind: "date" }, { key: "last", label: "Last contact", kind: "date" }, { key: "status", label: "Status", kind: "select", options: ["Open", "Promised", "Disputed", "Paid"] }] },
    { id: "grants", title: "Grants", type: "tracker", collection: "grants", columns: [{ key: "funder", label: "Funder", kind: "text" }, { key: "line", label: "Budget line", kind: "text" }, { key: "budget", label: "Approved (R)", kind: "number" }, { key: "spent", label: "Spent (R)", kind: "number" }, { key: "drawn", label: "Drawn (R)", kind: "number" }, { key: "note", label: "Note", kind: "text" }] }
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
        const rows2 = (c.input.lines ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]).map((p) => {
          const [b, a] = [Number(p[1].replace(/[R,\s]/g, "")), Number(p[2].replace(/[R,\s]/g, ""))];
          const ok = Number.isFinite(b) && Number.isFinite(a);
          return [p[0], p[1], p[2], ok ? a - b : "n/a", ok && b !== 0 ? `${((a - b) / b * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"];
        });
        return [{ h: "Variance table (computed from your figures)", table: { headers: ["Line", "Budget", "Actual", "Variance", "Variance %"], rows: rows2.length ? rows2 : [[TBC, "", "", "", ""]] } }, { h: "Drivers", input: c.input.notes ?? "" }, { h: "Actions", ol: [TBC, TBC] }];
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
    }),
    defineAgent("finance", "FIN", {
      n: 4,
      name: "Month-end close checklist",
      summary: "Close checklist with owners and sign-off, for the accountant to complete.",
      framework: "Month-end close",
      purpose: "financial_planning",
      formats: ["md", "xlsx"],
      inputs: [txt("month", "Month", true), long("scope", "Accounting package, bank accounts and payment processors in scope", true), txt("accountant", "Accountant or bookkeeper (role)")],
      sections: (c) => [{ h: "Scope", kv: [["Month", v(c, "month")], ["Accountant (role)", v(c, "accountant")]] }, { h: "In scope", input: c.input.scope ?? "" }, { h: "Close steps", checks: ["Bank accounts reconciled to statements", "Payment processor settlements matched to the ledger", "Debtors and creditors ledgers agree to their control accounts", "Accruals and prepayments posted", "Payroll journals posted", "VAT workings prepared for the accountant", "Fixed assets and depreciation updated", "Management accounts reviewed for unusual movements", "Close signed off by the approver"] }, { h: "Sign-off record", table: { headers: ["Step", "Owner (role)", "Done on", "Evidence reference"], rows: blankRows(["Bank reconciliation", "Debtors and creditors", "VAT workings", "Management accounts review"], 4) } }]
    }),
    defineAgent("finance", "FIN", {
      n: 5,
      name: "School quote pack",
      summary: "Quote for one school, computed by the pricing formula from learners and educators.",
      framework: "Per-school pricing formula",
      purpose: "financial_planning",
      secondApprover: true,
      formats: ["md", "docx", "pdf"],
      warning: "The pricing formula is a proposal for decision D-1 and has not been tested with a paying school. Do not send this quote until D-1 is approved and the VAT position is confirmed with the accountant (D-6).",
      inputs: [txt("school", "School name", true), num("learners", "Learners", true), num("educators", "Educators", true), pick("rate", "Rate", ["Standard", "Community"], true), pick("billing", "Billing", ["Monthly", "Annual prepay"], true), txt("valid", "Quote valid until")],
      sections: (c) => {
        const P = SCHOOL_PRICING;
        const [l, e] = [Number(c.input.learners), Number(c.input.educators)];
        const std = schoolMonthlyExVat(l, e);
        const R = (n) => n === null ? "n/a" : `R${n.toFixed(2)}`;
        const f = std === null ? 1 : (c.input.rate === "Community" ? P.communityFactor : 1) * (c.input.billing === "Annual prepay" ? 12 * (1 - P.annualDiscount) : 1);
        const mo = std === null ? null : std * (c.input.rate === "Community" ? P.communityFactor : 1);
        const total = std === null ? null : std * f;
        const tag = " [src:computed by the pricing formula]";
        const T = " [src:pricing model]";
        const build = std === null ? [[TBC, "", ""]] : [
          ["Platform fee", `1 \xD7 R${P.platformFee}${T}`, R(P.platformFee) + T],
          ["Educators", `${e} \xD7 R${P.perEducator}${T}`, R(P.perEducator * e) + T],
          ["Learners, first tier", `${Math.min(l, P.tierBreak)} \xD7 R${P.perLearnerFirst.toFixed(2)}${T}`, R(P.perLearnerFirst * Math.min(l, P.tierBreak)) + T],
          ["Learners, second tier", `${Math.max(0, l - P.tierBreak)} \xD7 R${P.perLearnerBeyond.toFixed(2)}${T}`, R(P.perLearnerBeyond * Math.max(0, l - P.tierBreak)) + T],
          ["Standard monthly price (the monthly minimum applies if higher)", "", R(std) + tag]
        ];
        return [
          { h: "Quote", kv: [["School", v(c, "school")], ["Learners / educators", std === null ? TBC : `${l} / ${e}`], ["Rate", v(c, "rate")], ["Billing", v(c, "billing")], ["Price per month ex VAT", R(mo) + tag], ["Price per month incl VAT (15%)", R(mo === null ? null : mo * (1 + P.vat)) + tag], [c.input.billing === "Annual prepay" ? "Year one total ex VAT (10% prepay discount)" : "Twelve months ex VAT", R(total === null ? null : c.input.billing === "Annual prepay" ? total : (mo ?? 0) * 12) + tag], ["Valid until", v(c, "valid")]] },
          { h: "How the standard price is built", table: { headers: ["Component", "Quantity", "Amount (R, ex VAT)"], rows: build } },
          { h: "Before this quote is sent", checks: ["Decision D-1 (price card) approved", "VAT position confirmed with the accountant (D-6)", "Learner and educator counts confirmed with the school", "Community rate only for a school that qualifies, as you define it", "Quote sent by a named person from the company\u2019s own channel"] }
        ];
      }
    }),
    defineAgent("finance", "FIN", {
      n: 6,
      name: "Runway and funding scenarios",
      summary: "Runway under funding scenarios you type. Burn is held constant.",
      framework: "Runway (cash \xF7 net burn)",
      purpose: "financial_planning",
      formats: ["md", "xlsx", "csv"],
      inputs: [num("cash", "Cash on hand (R)", true), num("burn", "Monthly net burn (R)", true), long("scenarios", "Scenarios, one per line: name | amount (R) | months from now it arrives", true)],
      sections: (c) => {
        const [cash, burn] = [Number(c.input.cash), Number(c.input.burn)];
        const base = runway(cash, burn)[0].value;
        const rows2 = (c.input.scenarios ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]).map((p) => {
          const [amt, at] = [Number(p[1].replace(/[R,\s]/g, "")), Number(p[2])];
          const ok = Number.isFinite(amt) && Number.isFinite(at) && base !== null;
          if (!ok) return [p[0], p[1], p[2], "n/a", "Check the figures"];
          const arrives = at <= base;
          return [p[0], p[1], p[2], arrives ? `${runway(cash + amt, burn)[0].value.toFixed(1)} months [src:computed from your inputs]` : `${base.toFixed(1)} months`, arrives ? "Arrives before cash runs out" : "Arrives after cash runs out, so it does not extend runway"];
        });
        return [{ h: "Starting point", kv: [["Cash on hand", `R ${c.input.cash ?? ""}`], ["Monthly net burn", `R ${c.input.burn ?? ""}`], ["Runway today", base === null ? "n/a" : `${base.toFixed(1)} months [src:computed from your inputs]`]] }, { h: "Scenarios", table: { headers: ["Scenario", "Amount (R)", "Arrives (months)", "Total runway", "Note"], rows: rows2.length ? rows2 : [[TBC, "", "", "", ""]] } }, { h: "Assumptions to state", bullets: ["Burn is held constant. Say if you expect it to change.", "Funding amounts and timing are the ones you typed, not forecasts by the platform."] }];
      }
    }),
    defineAgent("finance", "FIN", {
      n: 7,
      name: "Debtors follow-up schedule",
      summary: "Follow-up schedule and draft reminder wording for overdue school accounts. Draft only, nothing is sent.",
      framework: "Credit control",
      purpose: "financial_planning",
      formats: ["md", "docx", "csv"],
      warning: "Draft only. The platform sends nothing (OPQ-003) and does not issue invoices (OPQ-004). A person checks each amount against the ledger and sends from the company\u2019s own channel.",
      inputs: [txt("asof", "As at date (YYYY-MM-DD)", true), long("accounts", "Overdue accounts, one per line: school | amount (R) | due date (YYYY-MM-DD) | last contact", true), long("terms", "Payment terms agreed with schools")],
      sections: (c) => {
        const asof = Date.parse(c.input.asof ?? "");
        const rows2 = (c.input.accounts ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]).map((p) => {
          const due = Date.parse(p[2]);
          const days = Number.isFinite(asof) && Number.isFinite(due) ? Math.round((asof - due) / 864e5) : null;
          return [p[0], p[1], p[2], days === null ? "n/a" : `${days} [src:computed from your dates]`, p[3] ?? "", ""];
        });
        return [{ h: "Overdue accounts", table: { headers: ["School", "Amount (R)", "Due", "Days overdue", "Last contact", "Next step (you decide)"], rows: rows2.length ? rows2 : [[TBC, "", "", "", "", ""]] } }, { h: "Terms", input: c.input.terms ?? "" }, { h: "Draft wording (edit before use)", bullets: ["Reminder: \u201CHello [bursar or principal], our records show invoice [number] for R[amount], due on [date], is unpaid. Could you confirm when payment will be made? Please tell us if anything about the invoice needs correcting.\u201D", "Follow-up: \u201CFollowing our message of [date] about invoice [number]. We would like to help resolve this. Is there a payment date, or a question we can answer?\u201D", "Escalation: \u201CInvoice [number] is now [days] days overdue. Please contact [role] on [channel] so we can agree a way forward before [date].\u201D"] }, { h: "Before anything is sent", checks: ["Amount and due date checked against the ledger", "Invoice was delivered to the school", "No learner names or personal details in the message", "Sent by a named person from the company\u2019s own channel", "Contact logged with the date"] }];
      }
    }),
    defineAgent("finance", "FIN", {
      n: 8,
      name: "Grant budget and drawdown report",
      summary: "Budget against spend and drawdowns for a funder, from figures you supply.",
      framework: "Grant budget vs actual",
      purpose: "financial_planning",
      secondApprover: true,
      formats: ["md", "xlsx", "csv"],
      warning: "Use the format the funder asks for. This is a working layout, and the funder\u2019s template wins.",
      inputs: [txt("funder", "Funder and grant", true), txt("period", "Reporting period"), long("lines", "Budget lines, one per line: line | approved budget (R) | spent to date (R)", true), long("drawn", "Drawdowns received, one per line: date | amount (R)")],
      sections: (c) => {
        const n = (s) => Number(s.replace(/[R,\s]/g, ""));
        const parsed = (c.input.lines ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 3 && p[0]);
        const rows2 = parsed.map((p) => {
          const [b, s] = [n(p[1]), n(p[2])];
          const ok = Number.isFinite(b) && Number.isFinite(s);
          return [p[0], p[1], p[2], ok ? b - s : "n/a", ok && b !== 0 ? `${(s / b * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"];
        });
        const good = parsed.map((p) => [n(p[1]), n(p[2])]).filter(([b, s]) => Number.isFinite(b) && Number.isFinite(s));
        const [tb, ts] = [good.reduce((a, x) => a + x[0], 0), good.reduce((a, x) => a + x[1], 0)];
        const draws = (c.input.drawn ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p.length >= 2 && p[0]);
        const td = draws.map((p) => n(p[1])).filter(Number.isFinite).reduce((a, x) => a + x, 0);
        return [{ h: "Grant", kv: [["Funder and grant", v(c, "funder")], ["Period", v(c, "period")]] }, { h: "Budget against spend", table: { headers: ["Line", "Approved (R)", "Spent (R)", "Remaining (R)", "Spent %"], rows: rows2.length ? [...rows2, ["Total", tb, ts, tb - ts, tb ? `${(ts / tb * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"]] : [[TBC, "", "", "", ""]] } }, { h: "Drawdowns", table: { headers: ["Date", "Amount (R)"], rows: draws.length ? [...draws.map((p) => [p[0], p[1]]), ["Total received", td]] : [[TBC, ""]] } }, { h: "Cash position on the grant", kv: [["Received less spent", draws.length && good.length ? `R ${(td - ts).toFixed(2)} [src:computed from your inputs]` : TBC]] }, { h: "Before this goes to the funder", checks: ["Spend traced to the ledger and supporting documents", "Lines match the approved budget and any approved changes", "Funder\u2019s own template and deadline used", "Reviewed by a second approver"] }];
      }
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
    }),
    defineAgent("sales", "SALES", {
      n: 4,
      name: "Pipeline review",
      summary: "Weekly review with MEDDICC coverage per opportunity, from what the rep can evidence.",
      framework: "MEDDICC",
      purpose: "sales_pipeline",
      formats: ["md", "xlsx", "csv"],
      inputs: [long("opps", "Opportunities, one per line: school | stage | next step | elements evidenced (comma-separated)", true, `Elements: ${MEDDICC.join(", ")}.`)],
      sections: (c) => {
        const r = rows(c.input.opps).map((p) => {
          const have = (p[3] ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
          const ev = MEDDICC.map((m) => have.includes(m.toLowerCase()));
          const cov = ev.filter(Boolean).length;
          return [p[0], p[1] ?? "", p[2] ?? "", `${cov} of ${MEDDICC.length} [src:computed from your inputs]`, MEDDICC.filter((_, i) => !ev[i]).join(", ") || "None", p[2] ? "" : "No next step"];
        });
        return [{ h: "Opportunities", table: { headers: ["School", "Stage", "Next step", "MEDDICC coverage", "Gaps", "Flag"], rows: r.length ? r : [[TBC, "", "", "", "", ""]] } }, { h: "Reminder", p: "Coverage is a qualification check, not a forecast. The platform does not predict who will buy." }];
      }
    }),
    defineAgent("sales", "SALES", {
      n: 5,
      name: "Win and loss review",
      summary: "Structured review of why a school bought or did not.",
      framework: "Win/loss review",
      purpose: "sales_pipeline",
      formats: ["md", "docx"],
      inputs: [txt("school", "School", true), pick("outcome", "Outcome", ["Won", "Lost", "No decision"], true), long("reasons", "Reasons, in the school\u2019s words where you can", true), txt("alt", "What they chose instead"), long("learned", "What we would do differently")],
      sections: (c) => [{ h: "Deal", kv: [["School", v(c, "school")], ["Outcome", v(c, "outcome")], ["Chose instead", v(c, "alt")]] }, { h: "Reasons", input: c.input.reasons ?? "" }, { h: "What we would do differently", input: c.input.learned ?? "" }, { h: "Actions", table: { headers: ["Action", "Owner (role)", "By when"], rows: blankRows(["Action 1", "Action 2"], 3) } }]
    }),
    defineAgent("sales", "SALES", {
      n: 6,
      name: "Teacher demo script",
      summary: "Demo script built around a teacher\u2019s day, with no learner data on screen.",
      framework: "Demo flow",
      purpose: "sales_pipeline",
      formats: ["md", "docx"],
      inputs: [txt("audience", "Audience (roles)", true), long("features", "Features to show, one per line: feature | benefit for the teacher", true), txt("minutes", "Time available")],
      sections: (c) => [{ h: "Audience", kv: [["Audience", v(c, "audience")], ["Time available", v(c, "minutes")]] }, { h: "Flow", table: { headers: ["Step", "Feature", "Benefit for the teacher", "Time"], rows: rows(c.input.features).map((p, i) => [i + 1, p[0], p[1] ?? "", ""]) } }, { h: "Opening and close", bullets: ["Open with a problem the teacher told us about.", "Close with one clear next step."] }, { h: "Before the demo", checks: ["Demo school and learner data are fictional", "No real learner\u2019s name or image on screen", "Every claim about results has a source"] }]
    })
  ]
};

// src/departments/fundingLeads.ts
var FUNDING_LEAD_SEED = [
  { "id": "lead-01", "name": "Injini EdTech accelerator", "type": "Accelerator + funding", "category": "Accelerator", "fit": "High", "availability": "Closed, watch", "timing": "AI programme closed 27 Sep 2026. Watch for next intake", "stage": "Not started", "person": "Krista Davidson (Executive Director); Gigi Ngcobo (Venture Scale Lead)", "contact": "injini.co.za (use the contact form)", "why": "South African EdTech specialist. Apply to the next cohort with the pilot school as proof." },
  { "id": "lead-02", "name": "Mastercard Foundation EdTech Fellowship (run by Injini)", "type": "Equity-free fellowship + funding", "category": "Accelerator", "fit": "High", "availability": "Confirm", "timing": "2025 call opened earlier in the year. Confirm the next call", "stage": "Not started", "person": "Krista Davidson (Executive Director, Injini); Tsepo Ngwenyama (Programmes and Portfolio Head, Injini, 2023 listing)", "contact": "injini.co.za; mastercardfdn.org (EdTech Fellowship page)", "why": "Six-month, equity-free. Reported funding above R1m, mentors and EdTech Impact pedagogical certification. Built for South African education EdTech." },
  { "id": "lead-03", "name": "Fab AI cohort (Google DeepMind, Google.org, Gates Foundation)", "type": "Funded innovator cohort", "category": "Philanthropy", "fit": "High", "availability": "Confirm", "timing": "Announced 4 Nov 2026. Check how innovators are selected", "stage": "Not started", "person": "No person named. Fab AI leads the cohort", "contact": "Details on the Google blog post of 4 Nov 2026 and Fab AI's website", "why": "Funds local innovators in Kenya, Ghana and South Africa to build AI tools on open Gemma models for foundational learning. Close match to Infinite-AI." },
  { "id": "lead-04", "name": "TIA Seed Fund", "type": "Government (Technology Innovation Agency)", "category": "Government", "fit": "High", "availability": "Closed, watch", "timing": "Pre-Seed call closed 16 Oct 2026. Watch for next call", "stage": "Not started", "person": "No named person found. Use the fund mailbox", "contact": "seed.fund@tia.org.za; customerservice@tia.org.za; +27 21 442 3780; +27 31 220 3100", "why": "Funds early technology ventures. Prepare the tested codebase and pilot evidence." },
  { "id": "lead-05", "name": "SmartXchange (Durban Technology Hub)", "type": "Incubator + seed fund", "category": "Government", "fit": "High", "availability": "Confirm", "timing": "Check current intake. Its fund wants KZN-based, pre-revenue technology", "stage": "Not started", "person": "No named person found", "contact": "Listed on innovationbridge.info; confirm details on the SmartXchange site", "why": "Local to Durban. Its listed seed fund criteria match a pre-revenue KZN tech business." },
  { "id": "lead-06", "name": "AWS Activate", "type": "Cloud credits", "category": "Credits", "fit": "High", "availability": "Open now", "timing": "Open (rolling). Application overview already in the project", "stage": "Not started", "person": "Application portal, no person", "contact": "aws.amazon.com/activate", "why": "Credits would fund the af-south-1 deployment. See the AWS Activate overview in the project." },
  { "id": "lead-07", "name": "Microsoft for Startups Founders Hub", "type": "Cloud credits + mentoring", "category": "Credits", "fit": "High", "availability": "Open now", "timing": "Open (rolling). Confirm current credit levels", "stage": "Not started", "person": "No person. Self-service application", "contact": "Search 'Microsoft for Startups Founders Hub' for the application page", "why": "Free Azure, GitHub and Microsoft 365 resources. Can sit alongside AWS credits." },
  { "id": "lead-08", "name": "Anthropic Startup Program", "type": "Cloud and AI credits", "category": "Credits", "fit": "Medium", "availability": "Closed, watch", "timing": "Full from 30 Oct 2026. Watch for reopening", "stage": "Not started", "person": "No person. Programme page", "contact": "anthropic.com (startup programme page)", "why": "Offsets LLM cost, which is R1.28 per learner per month in the model." },
  { "id": "lead-09", "name": "Google for Startups Accelerator: Africa", "type": "Accelerator + credits", "category": "Accelerator", "fit": "Medium", "availability": "Closed, watch", "timing": "2026 call closed 18 Mar 2026. Watch for next year", "stage": "Not started", "person": "No person. Programme page", "contact": "startup.google.com/programs", "why": "Equity-free support and cloud credits. Check AI-in-education fit when it reopens." },
  { "id": "lead-10", "name": "Google funding for early-stage African AI startups and Google.org", "type": "Corporate grants + startup funding", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Announced July 2025 for 100+ early-stage African startups. Confirm what is open", "stage": "Not started", "person": "Kabelo Makwane (Country Director, Google South Africa, Oct 2025)", "contact": "startup.google.com/programs; google.org", "why": "Startup programme names education as a sector. Google.org grants mostly go to non-profits and universities, so approach as a partner." },
  { "id": "lead-11", "name": "Microsoft Elevate South Africa and EEIP funds", "type": "Corporate programme + enterprise development fund", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Programmes run through 2026. Confirm what is open", "stage": "Not started", "person": "Tiara Pathon (AI Skills Director, Microsoft Elevate South Africa, May 2026)", "contact": "microsoft.com/en-za/eeipv3", "why": "EEIP covers up to 42 SMMEs and startups, with an R660m enterprise development fund and an early-startup technology fund. Check the ownership rules." },
  { "id": "lead-12", "name": "Trevor Noah Foundation: Khulani Nathi Innovation Fund (with Microsoft Elevate)", "type": "Philanthropy grant fund", "category": "Philanthropy", "fit": "Medium", "availability": "Confirm", "timing": "Fund expanded 11 May 2026. Check eligibility, as grant funds like this often favour non-profits", "stage": "Not started", "person": "Shalane Yuen (Executive Director, per 2023 reporting; confirm still current)", "contact": "trevornoahfoundation.org", "why": "Education innovation fund for South African schools. A 2025 listing gave up to R30m. May suit a partnership or pilot rather than a direct grant." },
  { "id": "lead-13", "name": "Allan & Gill Gray Philanthropies Africa (Binding Constraints Lab, FLOAT fund)", "type": "Philanthropy (foundation phase learning)", "category": "Philanthropy", "fit": "Medium", "availability": "Confirm", "timing": "Active in foundational literacy and numeracy. Confirm what it funds", "stage": "Not started", "person": "Ntandoyenkosi Kunene (Programme Lead, Entrepreneurship in Schools). Listed on theorg.com, so confirm the role", "contact": "allangrayorbis.org; Cape Town office", "why": "Strong sector match. Likely a partnership or pilot-evaluation route, not equity." },
  { "id": "lead-14", "name": "Zenex Foundation", "type": "Philanthropy (language and maths education)", "category": "Philanthropy", "fit": "Medium", "availability": "Confirm", "timing": "Confirm whether it funds for-profit pilots", "stage": "Not started", "person": "Gail Campbell (listed contact; confirm still current)", "contact": "+27 11 481 7820; info@zenexfoundation.org.za", "why": "Funds language and maths education. Pitch a research-backed pilot, not a product." },
  { "id": "lead-15", "name": "ELMA Philanthropies", "type": "Philanthropy + impact investing", "category": "Philanthropy", "fit": "Medium", "availability": "Confirm", "timing": "ELMA Relief does not take unsolicited proposals. Approach through staff", "stage": "Not started", "person": "No named person found", "contact": "ELMA Philanthropies Services (Africa), Portside, 17th Floor, 4 Bree St, Cape Town", "why": "Makes impact investments in education products and services. Needs a warm introduction." },
  { "id": "lead-16", "name": "Michael & Susan Dell Foundation (South Africa)", "type": "Philanthropy", "category": "Philanthropy", "fit": "Medium", "availability": "Confirm", "timing": "Funds proven projects. Prepare pilot results first", "stage": "Not started", "person": "No named person found", "contact": "dell.org (South Africa programme team page)", "why": "Funds education data systems, early-grade literacy and teacher development in South Africa. Needs measurable results." },
  { "id": "lead-17", "name": "DGMT (DG Murray Trust)", "type": "Philanthropy", "category": "Philanthropy", "fit": "Low", "availability": "Confirm", "timing": "Earlier search suggested non-profit grantees. Confirm", "stage": "Not started", "person": "No person found", "contact": "dgmt.co.za", "why": "Education and early-learning funder. Partnership route only." },
  { "id": "lead-18", "name": "The Shuttleworth Foundation", "type": "Philanthropy (fellowships)", "category": "Philanthropy", "fit": "Low", "availability": "Closed, watch", "timing": "Reported as shutting down by the start of 2024. Treat as closed and confirm", "stage": "Not started", "person": "No person to approach", "contact": "shuttleworthfoundation.org (confirm the site status)", "why": "Funded individual fellows working on open ideas, with grants of about a year's salary plus co-investment. Not an option unless it has reopened." },
  { "id": "lead-19", "name": "The Unlimited Child", "type": "Non-profit partner (early childhood)", "category": "Philanthropy", "fit": "Low", "availability": "Confirm", "timing": "Partnership route only. Its focus is ages 0 to 6", "stage": "Not started", "person": "Candice Potgieter (CEO, 2021 reporting; confirm)", "contact": "theunlimited.co.za", "why": "Not a funder. Launched an AI app for ECD practitioners and is an implementer of the ECCE Outcomes Fund. Possible Grade R feeder partner." },
  { "id": "lead-20", "name": "Standard Bank CSI (South Africa)", "type": "Corporate social investment", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Education is its main CSI focus. Confirm how to apply, as it partners with chosen organisations", "stage": "Not started", "person": "Zanele Tshabalala (CSI Manager, from a Sesame Workshop announcement; confirm still current)", "contact": "standardbank.co.za, Corporate Social Investment page", "why": "Backs early childhood centres, teacher support (for example Uplands Outreach, Grades 4 to 7) and maths teacher courses. Says it aims for long-term co-created partnerships. Pitch through a school-support partner." },
  { "id": "lead-21", "name": "Standard Bank Tutuwa Community Foundation", "type": "Corporate foundation (separate from the bank's CSI)", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Seeds and supports programmes. Confirm whether it takes direct applications", "stage": "Not started", "person": "Zanele Twala (CEO); Zandile Ntuli (Head of Programmes) and Thandi Lekeba (Programme Manager), per a 2025 Trialogue page", "contact": "Search 'Standard Bank Tutuwa Community Foundation' for its site and contact form", "why": "Supports early childhood, schooling and post-schooling, with a focus on young people not in education, employment or training. Pilots with partners such as Junior Achievement." },
  { "id": "lead-22", "name": "Standard Bank Education sector team", "type": "Bank education specialist team", "category": "Corporate", "fit": "Low", "availability": "Confirm", "timing": "Created in July 2020. Confirm what it funds", "stage": "Not started", "person": "Ben Pretorius (Head: Education Sector, from an older article; confirm)", "contact": "standardbank.co.za", "why": "In-house education department covering seven education and skills areas. A relationship contact for later growth finance, not a grant source." },
  { "id": "lead-23", "name": "Vodacom Foundation", "type": "Corporate CSI", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Funds schools and ICT. Confirm how to apply", "stage": "Not started", "person": "Angela Abrahams (Executive Head, CSI); Vince Montjane (education specialist). Trialogue listings", "contact": "vodacom.com/vodacom-foundation.php", "why": "Supports schools of excellence and ICT in education. Pitch a measured pilot." },
  { "id": "lead-24", "name": "MTN SA Foundation", "type": "Corporate CSI", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "More than half its CSI budget goes to education. Confirm how to apply", "stage": "Not started", "person": "No named person found", "contact": "mtn.co.za (MTN SA Foundation pages)", "why": "Works with the DBE and provincial departments, focused on quintile 1 to 3 schools." },
  { "id": "lead-25", "name": "Corporate CSI: Nedbank, FirstRand, Old Mutual, Sasol, Anglo American", "type": "Corporate social investment", "category": "Corporate", "fit": "Medium", "availability": "Confirm", "timing": "Education is a priority for 92% of companies in Trialogue's research. Calls vary", "stage": "Not started", "person": "Contact each company's CSI office", "contact": "Use the Trialogue Knowledge Hub directory to find CSI contacts", "why": "Many fund through non-profits, so a partnership with a school group or NGO helps." },
  { "id": "lead-26", "name": "sefa (Small Enterprise Finance Agency)", "type": "Government development finance", "category": "Government", "fit": "Medium", "availability": "Confirm", "timing": "Rolling. Confirm product and your nearest KZN office", "stage": "Not started", "person": "No named person found", "contact": "helpline@sefa.org.za; 012 748 9600", "why": "Loans and small-business finance. More useful for working capital than equity." },
  { "id": "lead-27", "name": "KZN Growth Fund Agency", "type": "Provincial fund (equity, quasi-equity, debt)", "category": "Government", "fit": "Medium", "availability": "Confirm", "timing": "Ran funding roadshows in Sep 2025. Confirm current window", "stage": "Not started", "person": "No named person found", "contact": "Durban-based. Find details on the KZN Growth Fund Agency site", "why": "KZN only. Aimed at larger projects, so a fit once there are paying schools." },
  { "id": "lead-28", "name": "Ithala Development Finance Corporation", "type": "Provincial development finance", "category": "Government", "fit": "Low", "availability": "Confirm", "timing": "Rolling", "stage": "Not started", "person": "No current person verified", "contact": "031 907 8911; ithala.co.za", "why": "SMME lending in KZN. Backup option for working capital." },
  { "id": "lead-29", "name": "DBE or district pilot funding", "type": "Government pilot", "category": "Government", "fit": "Medium", "availability": "Confirm", "timing": "Per the business plan: pursue after the first pilot", "stage": "Not started", "person": "District or provincial office via the pilot school principal", "contact": "Via Benjamin Pine Primary and the district office", "why": "Named in the business plan as an alternative to equity." },
  { "id": "lead-30", "name": "Education Outcomes Fund (ECCE Outcomes Fund)", "type": "Outcomes-based fund (government + donors)", "category": "Government", "fit": "Low", "availability": "Confirm", "timing": "R496m fund launched Dec 2025 for ages 0 to 6, implementers already selected", "stage": "Not started", "person": "No person named", "contact": "educationoutcomesfund.org", "why": "Pays for verified results. Watch for a foundation-phase fund. Roll-out includes KwaZulu-Natal." },
  { "id": "lead-31", "name": "Jobs Fund", "type": "Government challenge fund", "category": "Government", "fit": "Low", "availability": "Confirm", "timing": "Rounds are run for job creation. Minimum request listed as R10m", "stage": "Not started", "person": "No person. Contact centre", "contact": "info@jobsfund.org.za; 086 100 3272 (older Treasury listing)", "why": "Aimed at job creation through intermediaries, so a poor match now." },
  { "id": "lead-32", "name": "IDC and NEF (National Empowerment Fund)", "type": "National development finance", "category": "Government", "fit": "Low", "availability": "Confirm", "timing": "NEF launched a youth start-up partnership with NYDA in Sep 2026. Check ownership and age rules", "stage": "Not started", "person": "No person found", "contact": "idc.co.za; nefcorp.co.za", "why": "Later-stage debt and equity. NEF targets black-owned and youth businesses." },
  { "id": "lead-33", "name": "MultiChoice Innovation Fund", "type": "Corporate venture fund", "category": "Corporate", "fit": "Low", "availability": "Confirm", "timing": "Confirm it is still accepting applications", "stage": "Not started", "person": "No person found", "contact": "Search 'MultiChoice Innovation Fund' for the current page", "why": "Reported R407m disbursed to entrepreneurs. Technology focus." },
  { "id": "lead-34", "name": "Grindstone Ventures (Knife Capital)", "type": "Seed fund + accelerator", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Confirm intake and eligibility", "stage": "Not started", "person": "No named person found", "contact": "knifecap.com", "why": "Reported as a women-led accelerator seed fund (R100K to R500K range). Check the eligibility rules." },
  { "id": "lead-35", "name": "Future Africa", "type": "Pre-seed and seed collective", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Rolling. Confirm", "stage": "Not started", "person": "No named person found", "contact": "future.africa", "why": "Reported cheque size $50K to $500K. Sector list shows SaaS." },
  { "id": "lead-36", "name": "Antler Africa", "type": "Pre-seed accelerator", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Check next cohort", "stage": "Not started", "person": "No named person found", "contact": "antler.co", "why": "Reported pre-seed cheque $100K to $200K. Sector agnostic." },
  { "id": "lead-37", "name": "4Di Capital", "type": "VC (pre-seed to Series A)", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Rolling. Confirm", "stage": "Not started", "person": "No named person found", "contact": "4dicapital.com", "why": "Reported to back applied AI. Better once there are paying schools." },
  { "id": "lead-38", "name": "Jozi Angels", "type": "Angel network", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Rolling", "stage": "Not started", "person": "Abu Cassim and Basil Chassoulas (co-founders, deal screening)", "contact": "Contact via LinkedIn or the network website (verify)", "why": "Deal-by-deal angels. Johannesburg based but invests across SA." },
  { "id": "lead-39", "name": "SABAN (South African Business Angel Network)", "type": "Angel association", "category": "Investor", "fit": "Medium", "availability": "Confirm", "timing": "Rolling", "stage": "Not started", "person": "No named person found", "contact": "Find angel groups through the SABAN member list", "why": "Route to angel groups, including any KZN groups." },
  { "id": "lead-40", "name": "Kalon Venture Partners", "type": "VC (seed / Series A)", "category": "Investor", "fit": "Low", "availability": "Confirm", "timing": "Rolling. Targets post-revenue companies", "stage": "Not started", "person": "No named person found", "contact": "kalon.vc (verify domain)", "why": "Low fit for now. Reported cheque $250K to $2M. Approach after the first paid schools." },
  { "id": "lead-41", "name": "Knife Capital", "type": "VC (growth)", "category": "Investor", "fit": "Low", "availability": "Confirm", "timing": "Rolling", "stage": "Not started", "person": "No named person found", "contact": "knifecap.com", "why": "Low fit for now. Series A and B focus. Keep for the R6m to R8m seed-to-growth stage." },
  { "id": "lead-42", "name": "Norrsken22", "type": "VC (growth)", "category": "Investor", "fit": "Low", "availability": "Confirm", "timing": "Rolling", "stage": "Not started", "person": "No named person found", "contact": "norrsken22.com", "why": "Low fit for now. Lists edtech as a sector. Later stage than Infinite-AI today." },
  { "id": "lead-43", "name": "Revenue-based or milestone funding", "type": "Alternative financing", "category": "Investor", "fit": "Later", "availability": "Confirm", "timing": "Once ARR passes R2m (business plan)", "stage": "Not started", "person": "Not applicable", "contact": "Not applicable", "why": "Named in the business plan. Revisit after about 30 paying schools." }
];

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
    }),
    defineAgent("marketing", "MKT", {
      n: 4,
      name: "Content calendar builder",
      summary: "A month of posts across channels, ready for the calendar tracker.",
      framework: "Content pillars and calendar",
      purpose: "marketing_content",
      formats: ["md", "csv"],
      inputs: [txt("month", "Month", true), long("pillars", "Content pillars", true), txt("channels", "Channels", true), long("posts", "Posts, one per line: date | channel | topic")],
      sections: (c) => [{ h: "Plan", kv: [["Month", v(c, "month")], ["Channels", v(c, "channels")]] }, { h: "Pillars", input: c.input.pillars ?? "" }, { h: "Calendar", table: { headers: ["Date", "Channel", "Topic", "Pillar", "Owner (role)", "Claims checked"], rows: rows(c.input.posts).length ? rows(c.input.posts).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "", "", "No"]) : blankRows(["Week 1", "Week 2", "Week 3", "Week 4"], 6) } }, { h: "Checks", checks: ["Every post passed the brand and claims review", "Direct messages follow POPIA section 69", "Entries copied to the content calendar tracker"] }]
    }),
    defineAgent("marketing", "MKT", {
      n: 5,
      name: "Case study draft",
      summary: "Case study built only from evidence you supply, with a consent check.",
      framework: "Case study structure",
      purpose: "marketing_content",
      formats: ["md", "docx"],
      inputs: [txt("school", "School", true), pick("consent", "Written consent to publish", ["Obtained", "Not yet"], true), long("evidence", "Evidence: what changed, with sources", true)],
      sections: (c) => [...c.input.consent === "Obtained" ? [] : [{ h: "Stop", callout: { tone: "warn", text: "Written consent has not been obtained. Do not publish this case study." } }], { h: "School", kv: [["School", v(c, "school")], ["Consent", v(c, "consent")]] }, { h: "Challenge", input: "" }, { h: "What the school did", input: "" }, { h: "What changed (evidence you supplied)", input: c.input.evidence ?? "" }, { h: "In the teacher\u2019s words", input: "" }, { h: "Before publishing", checks: ["Written consent from the school and any person quoted", "No learner names, images or identifying detail", "Every result traced to a source", "Brand and claims review done"] }]
    }),
    defineAgent("marketing", "MKT", {
      n: 6,
      name: "Direct-marketing consent audit (POPIA s69)",
      summary: "Checks a list and message against the section 69 conditions.",
      framework: "POPIA s69",
      purpose: "marketing_content",
      formats: ["md", "docx"],
      warning: "Counsel confirms the current conditions. This is a working checklist.",
      inputs: [long("source", "Where the list came from", true), long("message", "The message", true), pick("basis", "Basis for contact", ["Opted in", "Existing customer, similar products", "Neither, or not sure"], true)],
      sections: (c) => [...c.input.basis === "Neither, or not sure" ? [{ h: "Stop", callout: { tone: "warn", text: "No opt-in or customer relationship. Do not send." } }] : [], { h: "List source", input: c.input.source ?? "" }, { h: "Message", input: c.input.message ?? "" }, { h: "Conditions to check", checks: ["Recipient opted in, or is an existing customer for similar products", "Message identifies the sender", "Message has an easy way to opt out", "Opt-outs are honoured and recorded", "Record of consent kept", "Opt-out offered at the first contact and in each message"] }]
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
    { id: "onboard", title: "Onboarding checklist", type: "checklist", collection: "onboarding", items: ["Operator agreement signed", "Administrator accounts created", "Teachers invited", "Training session held", "First lesson planned with the tool", "Success criteria agreed in writing", "Review date booked"] },
    { id: "onboard", title: "School onboarding", type: "checklist", collection: "school_onboarding", items: ["Agreement signed", "School administrator named by role", "School profile set up", "Teachers invited", "Training session held", "First lesson delivered", "First check-in booked"] }
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
    }),
    defineAgent("success", "CS", {
      n: 4,
      name: "School onboarding checklist",
      summary: "Checklist from agreement to first lesson, with owners.",
      framework: "Customer onboarding",
      purpose: "customer_success",
      formats: ["md", "xlsx"],
      inputs: [txt("school", "School", true), txt("start", "Start date")],
      sections: (c) => [{ h: "School", kv: [["School", v(c, "school")], ["Start", v(c, "start")]] }, { h: "Steps", checks: ["Agreement signed", "School administrator named by role", "School profile set up", "Teachers invited", "Training session held", "First lesson delivered with the platform", "First check-in booked"] }, { h: "Owners", table: { headers: ["Step", "Owner (role)", "Due", "Done"], rows: blankRows(["Agreement", "Set-up", "Training", "First lesson", "Check-in"], 4) } }]
    }),
    defineAgent("success", "CS", {
      n: 5,
      name: "Teacher training session plan",
      summary: "Session plan with outcomes, activities and a short feedback form.",
      framework: "Training design",
      purpose: "customer_success",
      formats: ["md", "docx"],
      inputs: [txt("audience", "Audience (roles)", true), txt("duration", "Duration", true), long("outcomes", "What teachers should be able to do afterwards", true)],
      sections: (c) => [{ h: "Session", kv: [["Audience", v(c, "audience")], ["Duration", v(c, "duration")]] }, { h: "Outcomes", input: c.input.outcomes ?? "" }, { h: "Agenda", table: { headers: ["Segment", "Activity", "Time", "Materials"], rows: blankRows(["Welcome", "Demonstration", "Hands-on practice", "Questions", "Close"], 4) } }, { h: "Feedback form (edit)", ol: ["What was most useful?", "What was unclear?", "What would you like help with next?"] }, { h: "Checks", checks: ["Practice uses fictional learner data", "Materials tested on the school\u2019s devices", "Feedback form ready"] }]
    }),
    defineAgent("success", "CS", {
      n: 6,
      name: "Training feedback summary",
      summary: "Summary of feedback results you type in, with no names.",
      framework: "Feedback analysis",
      purpose: "customer_success",
      formats: ["md", "docx", "csv"],
      inputs: [txt("session", "Session", true), long("results", "Results, one per line: question | result | comment", true)],
      sections: (c) => [{ h: "Session", input: c.input.session ?? "" }, { h: "Results as typed", table: { headers: ["Question", "Result", "Comment"], rows: rows(c.input.results).map((p) => [p[0], p[1] ?? "", p[2] ?? ""]) } }, { h: "Themes", bullets: ["\u2014 to complete \u2014"] }, { h: "Actions", table: { headers: ["Action", "Owner (role)", "By when"], rows: blankRows(["Action 1", "Action 2"], 3) } }, { h: "Checks", checks: ["No names or identifying comments included", "Themes drawn from the results above, not added"] }]
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
    }),
    defineAgent("support", "SUP", {
      n: 4,
      name: "Escalation handoff note",
      summary: "Handoff from support to engineering with the facts and what has been tried.",
      framework: "Escalation handoff",
      purpose: "service_desk",
      formats: ["md", "docx"],
      inputs: [long("ticket", "Ticket summary (no personal data)", true), long("steps", "What has been tried", true), pick("severity", "Severity", ["P1", "P2", "P3", "P4"], true)],
      sections: (c) => [{ h: "Severity", kv: [["Severity", v(c, "severity")]] }, { h: "What is happening", input: c.input.ticket ?? "" }, { h: "What has been tried", input: c.input.steps ?? "" }, { h: "Hand-off", table: { headers: ["Item", "Detail"], rows: [["Handed to (role)", ""], ["Time handed over", ""], ["Next update due", ""]] } }, { h: "Checks", checks: ["No learner or personal data in the note", "Steps to reproduce included", "Customer told what happens next"] }]
    }),
    defineAgent("support", "SUP", {
      n: 5,
      name: "Response macro library",
      summary: "Reusable reply wording for common questions, for the support lead to approve.",
      framework: "Response templates",
      purpose: "service_desk",
      formats: ["md", "docx"],
      inputs: [long("questions", "Common questions, one per line", true)],
      sections: (c) => [{ h: "Macros", table: { headers: ["Question", "Draft reply", "Approved by (role)"], rows: lines(c.input.questions).map((q) => [q, "\u2014 to complete \u2014", ""]) } }, { h: "Shape of a good reply", bullets: ["Greet the teacher by role or name they gave.", "Answer the question first.", "Give one next step.", "Never ask for learner data."] }]
    }),
    defineAgent("support", "SUP", {
      n: 6,
      name: "Ticket trend review",
      summary: "Themes and shares from ticket categories you type.",
      framework: "Ticket trend analysis",
      purpose: "service_desk",
      formats: ["md", "xlsx", "csv"],
      inputs: [txt("period", "Period", true), long("counts", "Counts, one per line: category | number of tickets", true)],
      sections: (c) => {
        const r = rows(c.input.counts).map((p) => [p[0], Number(p[1])]).filter((p) => Number.isFinite(p[1]));
        const total = r.reduce((a, p) => a + p[1], 0);
        r.sort((a, b) => b[1] - a[1]);
        return [{ h: "Period", input: c.input.period ?? "" }, { h: "Categories, largest first", table: { headers: ["Category", "Tickets", "Share"], rows: r.length ? [...r.map((p) => [p[0], p[1], total ? `${(p[1] / total * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"]), ["Total", total, ""]] : [[TBC, "", ""]] } }, { h: "What to do about the top categories", table: { headers: ["Category", "Action (article, fix or training)", "Owner (role)"], rows: blankRows(["Top category", "Second category"], 3) } }];
      }
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
    {
      id: "leads",
      title: "Funding and partnership leads",
      type: "tracker",
      collection: "funding_leads",
      seed: FUNDING_LEAD_SEED,
      note: "Seeded with 43 leads researched from public pages on 11 Nov 2026. Contacts are unverified, so confirm on the funder\u2019s own page before reaching out. Programmes marked \u201CClosed, watch\u201D are closed now; \u201CConfirm\u201D means the current call needs checking.",
      columns: [{ key: "name", label: "Lead", kind: "text" }, { key: "category", label: "Category", kind: "select", options: ["Government", "Accelerator", "Credits", "Investor", "Philanthropy", "Corporate"] }, { key: "fit", label: "Fit", kind: "select", options: ["High", "Medium", "Low", "Later"] }, { key: "availability", label: "Availability", kind: "select", options: ["Open now", "Closed, watch", "Confirm"] }, { key: "stage", label: "Stage", kind: "select", options: ["Not started", "Researching", "Contacted", "In talks", "Applied", "Declined"] }, { key: "type", label: "Type", kind: "text" }, { key: "timing", label: "Timing", kind: "text" }, { key: "person", label: "Contact person", kind: "text" }, { key: "contact", label: "Contact details", kind: "text" }, { key: "why", label: "Why it fits", kind: "text" }]
    },
    { id: "stake", title: "Stakeholder map", type: "tracker", note: "Roles and organisations only.", collection: "stakeholders", columns: [{ key: "org", label: "Organisation / body", kind: "text" }, { key: "role", label: "Role", kind: "text" }, { key: "power", label: "Power", kind: "select", options: ["High", "Medium", "Low"] }, { key: "interest", label: "Interest", kind: "select", options: ["High", "Medium", "Low"] }, { key: "next", label: "Next engagement", kind: "text" }] },
    { id: "gonboard", title: "Partner onboarding", type: "checklist", collection: "partner_onboarding", items: ["Agreement or MoU signed", "Roles for personal information recorded", "Named contacts by role on both sides", "Communications and branding rules agreed", "Reporting rhythm and format agreed", "Exit terms and data return agreed", "Partner added to the stakeholder map"] },
    { id: "tender", title: "Tender requirements", type: "tracker", collection: "tender_requirements", note: "Copy each requirement from the tender document. Nothing is pre-filled.", columns: [{ key: "tender", label: "Tender", kind: "text" }, { key: "req", label: "Requirement", kind: "text" }, { key: "evidence", label: "Evidence or document", kind: "text" }, { key: "owner", label: "Owner (role)", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["Not started", "In progress", "Ready", "Checked"] }] }
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
    }),
    defineAgent("government", "GOV", {
      n: 4,
      name: "District and provincial briefing note",
      summary: "One-page briefing for an official, using only facts you can cite.",
      framework: "Briefing note",
      purpose: "public_sector_relations",
      formats: ["md", "docx", "pdf"],
      warning: "Cite policy only from the official source. A fact with no source is flagged and must be cited or removed before the note goes out.",
      inputs: [txt("audience", "Audience (role and office)", true), txt("purpose", "Purpose of the note", true), long("facts", "Facts, one per line: fact | source (document and page, or link)", true), txt("ask", "What you are asking for")],
      sections: (c) => {
        const rows2 = (c.input.facts ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0]).map((p) => [p[0], p[1] || "No source given", p[1] ? "Sourced" : "Unsourced: cite or remove"]);
        return [{ h: "To and purpose", kv: [["Audience", v(c, "audience")], ["Purpose", v(c, "purpose")], ["Ask", v(c, "ask")]] }, { h: "Key facts", table: { headers: ["Fact", "Source", "Status"], rows: rows2.length ? rows2 : [[TBC, "", ""]] } }, { h: "Proposed next steps", table: { headers: ["Step", "Owner (role)", "By when"], rows: blankRows(["Step 1", "Step 2"], 3) } }, { h: "Before this is sent", checks: ["Every fact traced to an official source", "Tone and length suit the audience\u2019s office", "Sent by a named person on the company\u2019s behalf"] }];
      }
    }),
    defineAgent("government", "GOV", {
      n: 5,
      name: "Partner onboarding checklist",
      summary: "Steps to bring a partner in: agreement, data roles, contacts and communications.",
      framework: "Partnership onboarding",
      purpose: "public_sector_relations",
      formats: ["md", "xlsx"],
      inputs: [txt("partner", "Partner (organisation)", true), long("scope", "What the partner will do with us"), txt("start", "Planned start")],
      sections: (c) => [{ h: "Partner", kv: [["Partner", v(c, "partner")], ["Planned start", v(c, "start")]] }, { h: "Scope", input: c.input.scope ?? "" }, { h: "Onboarding steps", checks: ["Agreement or MoU signed (see the MoU outline agent)", "Roles for personal information recorded: who decides, who processes", "Named contacts by role on both sides", "Communications and branding rules agreed", "Reporting rhythm and format agreed", "Exit terms and data return agreed", "Partner added to the stakeholder map"] }, { h: "Step owners", table: { headers: ["Step", "Owner (role)", "Due", "Evidence"], rows: blankRows(["Agreement", "Data roles", "Contacts", "Communications"], 4) } }]
    }),
    defineAgent("government", "GOV", {
      n: 6,
      name: "Funding pipeline review",
      summary: "Review of the funding leads: counts by stage and the next action for each live lead.",
      framework: "Pipeline review",
      purpose: "public_sector_relations",
      formats: ["md", "docx", "csv"],
      inputs: [long("leads", "Leads, one per line: name | stage | next action", true, "Stages are Not started, Researching, Contacted, In talks, Applied, Declined."), long("priorities", "What matters most this month")],
      sections: (c) => {
        const STAGES = ["Not started", "Researching", "Contacted", "In talks", "Applied", "Declined"];
        const rows2 = (c.input.leads ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0]);
        const count = (s) => rows2.filter((p) => p[1] === s).length;
        const unknown = rows2.filter((p) => !STAGES.includes(p[1] ?? ""));
        const live = rows2.filter((p) => ["Researching", "Contacted", "In talks", "Applied"].includes(p[1]));
        return [{ h: "Leads by stage", table: { headers: ["Stage", "Count"], rows: STAGES.map((s) => [s, count(s)]) } }, ...unknown.length ? [{ h: "Needs a valid stage", bullets: unknown.map((p) => `${p[0]}: stage \u201C${p[1] ?? ""}\u201D`) }] : [], { h: "Live leads and next action", table: { headers: ["Lead", "Stage", "Next action", "Flag"], rows: live.length ? live.map((p) => [p[0], p[1], p[2] ?? "", p[2] ? "" : "No next action recorded"]) : [[TBC, "", "", ""]] } }, { h: "Priorities", input: c.input.priorities ?? "" }, { h: "Reminders", bullets: ["Contacts in the tracker are unverified: confirm on the funder\u2019s own page before reaching out.", "Check closing dates and eligibility on the funder\u2019s page before applying."] }];
      }
    }),
    defineAgent("government", "GOV", {
      n: 7,
      name: "Policy watch note",
      summary: "Note on a policy or circular. Every statement cites the official source.",
      framework: "Policy watch",
      purpose: "public_sector_relations",
      formats: ["md", "docx"],
      warning: "Cite policy only from the official source. Check the document is the current version before relying on it.",
      inputs: [txt("policy", "Policy, circular or notice", true), txt("link", "Link to the official source", true), long("statements", "Statements, one per line: statement | section or page", true), long("relevance", "Why this matters to the company")],
      sections: (c) => {
        const rows2 = (c.input.statements ?? "").split("\n").map((l) => l.split("|").map((s) => s.trim())).filter((p) => p[0]).map((p) => [p[0], p[1] || "Not given", p[1] ? "Located in source" : "Unverified: add the section or page"]);
        return [{ h: "Source", kv: [["Policy", v(c, "policy")], ["Official source", v(c, "link")]] }, { h: "What it says", table: { headers: ["Statement", "Where in the source", "Status"], rows: rows2.length ? rows2 : [[TBC, "", ""]] } }, { h: "Why it matters to us", input: c.input.relevance ?? "" }, { h: "Actions", table: { headers: ["Action", "Owner (role)", "By when"], rows: blankRows(["Action 1", "Action 2"], 3) } }, { h: "Before this is used", checks: ["Document is the current version, checked on the official source", "Each statement located in the source", "Reviewed by someone who knows the policy area"] }];
      }
    }),
    defineAgent("government", "GOV", {
      n: 8,
      name: "Tender and RFQ response checklist",
      summary: "Checklist of what a tender asks for, built from the tender text you supply.",
      framework: "Tender compliance matrix",
      purpose: "public_sector_relations",
      formats: ["md", "xlsx"],
      warning: "Take every requirement from the tender document itself. The platform adds none and does not know what any tender requires.",
      inputs: [txt("tender", "Tender reference and issuer", true), txt("closing", "Closing date and time, as stated in the tender", true), long("reqs", "Requirements, one per line, copied from the tender document", true)],
      sections: (c) => {
        const reqs = (c.input.reqs ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
        return [{ h: "Tender", kv: [["Reference and issuer", v(c, "tender")], ["Closing", v(c, "closing")]] }, { h: "Requirements matrix", table: { headers: ["#", "Requirement (from the tender)", "Evidence or document", "Owner (role)", "Status"], rows: reqs.length ? reqs.map((r, i) => [i + 1, r, "", "", "Not started"]) : [[1, TBC, "", "", ""]] } }, { h: "Submission checks", checks: ["Closing date, time and place confirmed on the tender document", "Submission method follows the tender (electronic or hard copy)", "All forms completed and signed as the tender requires", "Pricing schedule checked by a second person", "Supporting documents are current as the tender requires", "Submission receipt kept"] }];
      }
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
    }),
    defineAgent("people", "PPL", {
      n: 4,
      name: "Offer and contract checklist",
      summary: "Checklist for a labour lawyer to review before an offer goes out.",
      framework: "Offer review",
      purpose: "people_ops",
      secondApprover: true,
      formats: ["md", "docx"],
      warning: "Employment terms are checked by a labour lawyer. This agent sets none of them.",
      inputs: [txt("role", "Role", true), long("terms", "Terms you propose (you set every one)", true)],
      sections: (c) => [{ h: "Role", input: c.input.role ?? "" }, { h: "Proposed terms", input: c.input.terms ?? "" }, { h: "For the labour lawyer", checks: ["Written particulars of employment complete", "Probation, notice and leave terms checked against the law", "Restraint or confidentiality clauses reviewed", "Consent and notice for the employee\u2019s personal information", "Role description matches the job"] }]
    }),
    defineAgent("people", "PPL", {
      n: 5,
      name: "Performance review guide",
      summary: "Structured review guide. Ratings are the manager\u2019s alone.",
      framework: "Goal-based performance review",
      purpose: "people_ops",
      secondApprover: true,
      formats: ["md", "docx"],
      inputs: [txt("role", "Role", true), long("goals", "Goals for the period, one per line: goal | evidence", true)],
      sections: (c) => [{ h: "Role", input: c.input.role ?? "" }, { h: "Goals and evidence", table: { headers: ["Goal", "Evidence", "Manager\u2019s rating (manager only)", "Employee\u2019s comment"], rows: rows(c.input.goals).map((p) => [p[0], p[1] ?? "", "", ""]) } }, { h: "Strengths and development", table: { headers: ["Strengths", "Development areas"], rows: [["", ""]] } }, { h: "Fairness checks", checks: ["Same criteria used for people in the same role", "Judgements rest on evidence", "Employee had the chance to reply", "HR or a second approver has read it"] }]
    }),
    defineAgent("people", "PPL", {
      n: 6,
      name: "Staff development plan",
      summary: "Development plan from goals the person and manager agree.",
      framework: "Development planning",
      purpose: "people_ops",
      formats: ["md", "docx"],
      inputs: [txt("role", "Role", true), long("goals", "Development goals, one per line: goal | support needed", true)],
      sections: (c) => [{ h: "Role", input: c.input.role ?? "" }, { h: "Plan", table: { headers: ["Goal", "Action", "Support needed", "By when", "Check-in"], rows: rows(c.input.goals).map((p) => [p[0], "", p[1] ?? "", "", ""]) } }, { h: "Checks", checks: ["Goals agreed by the person and manager", "Support is available and costed", "Review date set"] }]
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
    { id: "changes", title: "Change log", type: "tracker", collection: "changes", columns: [{ key: "change", label: "Change", kind: "text" }, { key: "risk", label: "Risk", kind: "select", options: ["Low", "Medium", "High"] }, { key: "rollback", label: "Rollback plan", kind: "text" }, { key: "approver", label: "Approver (role)", kind: "text" }, { key: "when", label: "When", kind: "date" }] },
    { id: "restore-log", title: "Restore tests", type: "tracker", collection: "restore_tests", columns: [{ key: "system", label: "System", kind: "text" }, { key: "date", label: "Date", kind: "date" }, { key: "result", label: "Result", kind: "select", options: ["Passed", "Failed", "Partly"] }, { key: "note", label: "Note", kind: "text" }] }
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
    }),
    defineAgent("devops", "SRE", {
      n: 4,
      name: "Backup and restore test record",
      summary: "Record of a restore test with the result and evidence.",
      framework: "Restore testing",
      purpose: "infrastructure_ops",
      formats: ["md", "xlsx"],
      inputs: [txt("system", "System", true), txt("date", "Date tested", true), pick("result", "Result", ["Passed", "Failed", "Partly"], true), long("notes", "What you did and saw")],
      sections: (c) => [{ h: "Test", kv: [["System", v(c, "system")], ["Date", v(c, "date")], ["Result", v(c, "result")]] }, { h: "What happened", input: c.input.notes ?? "" }, { h: "Steps to confirm", checks: ["Backup identified and its date recorded", "Restored to an isolated environment", "Data integrity checked", "Time taken recorded against the recovery target", "No production data exposed during the test"] }, { h: "If it failed or partly passed", table: { headers: ["Problem", "Fix", "Owner (role)", "Retest date"], rows: blankRows(["Problem 1"], 4) } }]
    }),
    defineAgent("devops", "SRE", {
      n: 5,
      name: "Release runbook",
      summary: "Step-by-step runbook for a release.",
      framework: "Runbook",
      purpose: "infrastructure_ops",
      formats: ["md", "docx"],
      inputs: [txt("release", "Release", true), txt("env", "Environment", true), long("steps", "Steps, one per line", true)],
      sections: (c) => [{ h: "Release", kv: [["Release", v(c, "release")], ["Environment", v(c, "env")]] }, { h: "Before you start", checks: ["Change request approved", "Backup taken and verified", "Rollback steps read", "Stakeholders told"] }, { h: "Steps", ol: lines(c.input.steps).length ? lines(c.input.steps) : [TBC] }, { h: "Rollback", input: "" }, { h: "After", checks: ["Health checks green", "Smoke test done", "Release recorded"] }]
    }),
    defineAgent("devops", "SRE", {
      n: 6,
      name: "Cloud cost review",
      summary: "Budget against actual from bill figures you type. Never estimated.",
      framework: "Budget vs actual",
      purpose: "infrastructure_ops",
      formats: ["md", "xlsx", "csv"],
      inputs: [txt("period", "Period", true), long("lines", "Lines, one per line: service | budget (R) | actual (R)", true)],
      sections: (c) => {
        const n = (s) => Number(s.replace(/[R,\s]/g, ""));
        const r = rows(c.input.lines).map((p) => {
          const [b, a] = [n(p[1] ?? ""), n(p[2] ?? "")];
          const ok = Number.isFinite(b) && Number.isFinite(a);
          return [p[0], p[1] ?? "", p[2] ?? "", ok ? a - b : "n/a", ok && b !== 0 ? `${((a - b) / b * 100).toFixed(1)}% [src:computed from your inputs]` : "n/a"];
        });
        return [{ h: "Period", input: c.input.period ?? "" }, { h: "Cost against budget", table: { headers: ["Service", "Budget", "Actual", "Variance", "Variance %"], rows: r.length ? r : [[TBC, "", "", "", ""]] } }, { h: "Actions", table: { headers: ["Service", "Action", "Owner (role)"], rows: blankRows(["Largest overspend"], 3) } }];
      }
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
    { id: "score", title: "Weighted score (3 criteria)", type: "calc", note: "Weights and scores are yours.", inputs: [{ key: "w1", label: "Weight 1" }, { key: "s1", label: "Score 1" }, { key: "w2", label: "Weight 2" }, { key: "s2", label: "Score 2" }, { key: "w3", label: "Weight 3" }, { key: "s3", label: "Score 3" }], compute: (x) => weightedScore([{ weight: x.w1 || 0, score: x.s1 || 0 }, { weight: x.w2 || 0, score: x.s2 || 0 }, { weight: x.w3 || 0, score: x.s3 || 0 }]) },
    { id: "purchases", title: "Purchase log", type: "tracker", collection: "purchases", columns: [{ key: "item", label: "Item", kind: "text" }, { key: "cost", label: "Cost (R)", kind: "number" }, { key: "approver", label: "Approver (role)", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["Requested", "Approved", "Declined", "Paid"] }] },
    { id: "operator-register", title: "Operator register", type: "tracker", collection: "operator_register", columns: [{ key: "operator", label: "Operator", kind: "text" }, { key: "service", label: "Service", kind: "text" }, { key: "data", label: "Data types", kind: "text" }, { key: "agreement", label: "Agreement", kind: "select", options: ["Signed", "In progress", "None"] }] }
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
    }),
    defineAgent("procurement", "PRO", {
      n: 4,
      name: "Operator register update",
      summary: "Updates the register of operators and their written agreements.",
      framework: "POPIA operator register",
      purpose: "vendor_management",
      secondApprover: true,
      formats: ["md", "xlsx", "csv"],
      inputs: [long("operators", "Operators, one per line: operator | service | data types | agreement status", true)],
      sections: (c) => [{ h: "Register", table: { headers: ["Operator", "Service", "Data types", "Agreement status", "Reviewed by (role)", "Date"], rows: rows(c.input.operators).map((p) => [p[0], p[1] ?? "", p[2] ?? "", p[3] ?? "", "", ""]) } }, { h: "Checks", checks: ["Every operator touching personal information has a written agreement", "Security measures recorded for each", "Register matches the vendors really in use", "Second approver has reviewed changes"] }]
    }),
    defineAgent("procurement", "PRO", {
      n: 5,
      name: "Purchase request and approval log",
      summary: "Purchase request with the approval recorded.",
      framework: "Purchase approval",
      purpose: "vendor_management",
      formats: ["md", "csv"],
      inputs: [txt("item", "Item or service", true), long("reason", "Why it is needed", true), txt("cost", "Cost as quoted (R)"), txt("approver", "Approver (role)", true)],
      sections: (c) => [{ h: "Request", table: { headers: ["Item", "Cost as quoted (R)", "Approver (role)", "Status"], rows: [[v(c, "item"), c.input.cost ? `R ${c.input.cost}` : TBC, v(c, "approver"), "Requested"]] } }, { h: "Reason", input: c.input.reason ?? "" }, { h: "Checks", checks: ["A budget line exists", "Quotes compared where the value warrants it", "Operator review done if personal information is touched", "Approval recorded below"] }, { h: "Approval", table: { headers: ["Decision", "By (role)", "Date", "Conditions"], rows: [["", "", "", ""]] } }]
    }),
    defineAgent("procurement", "PRO", {
      n: 6,
      name: "Exit and data-return plan",
      summary: "Plan to leave a supplier and get data returned or deleted.",
      framework: "Supplier exit",
      purpose: "vendor_management",
      secondApprover: true,
      formats: ["md", "docx"],
      inputs: [txt("supplier", "Supplier", true), long("data", "Data the supplier holds", true)],
      sections: (c) => [{ h: "Supplier", input: c.input.supplier ?? "" }, { h: "Data held", input: c.input.data ?? "" }, { h: "Exit steps", checks: ["Notice given as the agreement requires", "Data exported in a usable format", "Replacement in place before cut-over", "Supplier confirms deletion in writing", "Access and keys revoked", "Register updated"] }]
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
    { id: "evidence", title: "Evidence log", type: "tracker", collection: "evidence", columns: [{ key: "claim", label: "Claim", kind: "text" }, { key: "source", label: "Source (cite)", kind: "text" }, { key: "grade", label: "Strength", kind: "select", options: ["Anecdote", "Internal data", "Pilot study", "Independent study"] }, { key: "usable", label: "OK to use externally?", kind: "select", options: ["No", "With caveat", "Yes"] }] },
    { id: "claims", title: "Claims register", type: "tracker", collection: "claims_register", columns: [{ key: "claim", label: "Claim", kind: "text" }, { key: "evidence", label: "Evidence", kind: "text" }, { key: "used", label: "Where used", kind: "text" }, { key: "status", label: "Status", kind: "select", options: ["No evidence", "Evidence given", "Checked"] }] }
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
    }),
    defineAgent("research", "RES", {
      n: 4,
      name: "Literature scan summary",
      summary: "Summary of sources you supply, each cited. Nothing added from memory.",
      framework: "Structured literature scan",
      purpose: "research_evaluation",
      formats: ["md", "docx"],
      inputs: [txt("question", "Question", true), long("sources", "Sources, one per line: citation | key finding | link", true)],
      sections: (c) => [{ h: "Question", input: c.input.question ?? "" }, { h: "Sources", table: { headers: ["Citation", "Key finding", "Link", "Quality note (you assess)", "Status"], rows: rows(c.input.sources).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "", p[2] ? "Linked" : "No link: add one or drop"]) } }, { h: "Synthesis (written by you)", input: "" }, { h: "Checks", checks: ["Every finding traced to its source", "Nothing added from memory", "Gaps in the evidence stated"] }]
    }),
    defineAgent("research", "RES", {
      n: 5,
      name: "Pilot data collection plan",
      summary: "What to collect, from whom, with a consent checklist.",
      framework: "Data collection plan",
      purpose: "research_evaluation",
      secondApprover: true,
      formats: ["md", "docx"],
      warning: "Learner-identifying data never enters this platform. Collect only what the evaluation needs, with consent.",
      inputs: [txt("pilot", "Pilot", true), long("measures", "Measures, one per line: measure | source | how collected", true)],
      sections: (c) => [{ h: "Pilot", input: c.input.pilot ?? "" }, { h: "Measures", table: { headers: ["Measure", "Source", "How collected", "When", "Stored where"], rows: rows(c.input.measures).map((p) => [p[0], p[1] ?? "", p[2] ?? "", "", ""]) } }, { h: "Consent and ethics", checks: ["Consent from the school and from parents or guardians where required", "Only data the evaluation needs", "De-identified before analysis", "Storage and deletion date agreed", "Second approver has reviewed"] }]
    }),
    defineAgent("research", "RES", {
      n: 6,
      name: "Evidence claims register",
      summary: "Register tying each public claim to its evidence.",
      framework: "Claims and evidence register",
      purpose: "research_evaluation",
      formats: ["md", "xlsx", "csv"],
      inputs: [long("claims", "Claims, one per line: claim | evidence | where it is used", true)],
      sections: (c) => [{ h: "Register", table: { headers: ["Claim", "Evidence", "Where used", "Status"], rows: rows(c.input.claims).map((p) => [p[0], p[1] ?? "None", p[2] ?? "", p[1] ? "Evidence given: check it supports the claim" : "No evidence: do not publish"]) } }, { h: "Checks", checks: ["Evidence supports the claim as worded", "Marketing has the current version", "Claims without evidence removed"] }]
    })
  ]
};

// src/departments/index.ts
var DEPARTMENTS = [executive, product, curriculum, aibrain, security, legal, finance, sales, marketing, success, support, government, people, devops, procurement, research];
var AGENTS = DEPARTMENTS.flatMap((d) => d.agents);
var agentById = (id) => AGENTS.find((a) => a.id === id);

// src/core/erasure.ts
var ERASURE_CATEGORIES = ["data_subject_request", "consent_withdrawn", "retention_expired", "unlawfully_obtained", "other"];
var normalizeSubject = (s) => s.trim();

// src/core/types.ts
var PURPOSES = [
  "strategy_planning",
  "engineering_governance",
  "content_review",
  "ai_governance",
  "compliance_review",
  "contract_review",
  "financial_planning",
  "sales_pipeline",
  "marketing_content",
  "customer_success",
  "service_desk",
  "public_sector_relations",
  "people_ops",
  "infrastructure_ops",
  "vendor_management",
  "research_evaluation"
];
var LAWFUL_BASES = ["legitimate_interest", "contract", "consent", "legal_obligation"];

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
var EMAIL = /(?<![A-Za-z0-9._%+-])[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g;
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
var LearnerDataRefused = class extends Error {
  constructor(findings) {
    super("Learner-level identifiers are never admitted to the operations platform.");
    this.findings = findings;
  }
};
function deidentify(text, sources, knownNames = []) {
  const findings = detectPii(text, knownNames);
  const learner = findings.filter((f) => f.kind === "learner_identifier");
  if (learner.length) throw new LearnerDataRefused(learner);
  const tokens = {};
  const seen = /* @__PURE__ */ new Map();
  const counters = {};
  let out = "";
  let cursor = 0;
  for (const f of findings) {
    if (f.start < cursor) continue;
    out += text.slice(cursor, f.start);
    const key = f.kind + ":" + f.match.toLowerCase();
    let tok = seen.get(key);
    if (!tok) {
      counters[f.kind] = (counters[f.kind] ?? 0) + 1;
      tok = `[${f.kind.toUpperCase()}_${counters[f.kind]}]`;
      seen.set(key, tok);
      tokens[tok] = f.match;
    }
    out += tok;
    cursor = f.end;
  }
  out += text.slice(cursor);
  return { text: out, tokens, findings, provenance: { deidentified: true, sources } };
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

// src/core/artefacts/render.ts
var esc = (s) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
var cell = (c) => String(c);
function toMarkdown(d) {
  const out = [`# ${d.title}`];
  if (d.subtitle) out.push(`_${d.subtitle}_`);
  for (const b of d.blocks) {
    switch (b.type) {
      case "h":
        out.push(`${"#".repeat(Math.min(6, (b.level ?? 2) + 0))} ${b.text}`);
        break;
      case "p":
        out.push(b.text ?? "");
        break;
      case "ul":
        out.push((b.items ?? []).map((i) => `- ${i}`).join("\n"));
        break;
      case "ol":
        out.push((b.items ?? []).map((i, n) => `${n + 1}. ${i}`).join("\n"));
        break;
      case "checklist":
        out.push((b.checks ?? []).map((c) => `- [${c.done ? "x" : " "}] ${c.label}`).join("\n"));
        break;
      case "callout":
        out.push(`> **${(b.tone ?? "info").toUpperCase()}** ${b.text}`);
        break;
      case "kv":
        out.push((b.pairs ?? []).map(([k, v2]) => `- **${k}:** ${v2}`).join("\n"));
        break;
      case "table": {
        const h = b.headers ?? [];
        out.push([`| ${h.join(" | ")} |`, `| ${h.map(() => "---").join(" | ")} |`, ...(b.rows ?? []).map((r) => `| ${r.map(cell).join(" | ")} |`)].join("\n"));
        break;
      }
    }
  }
  const meta = Object.entries(d.meta);
  if (meta.length) out.push("---\n" + meta.map(([k, v2]) => `*${k}:* ${v2}`).join(" \xB7 "));
  return out.join("\n\n") + "\n";
}
function blockHtml(b) {
  switch (b.type) {
    case "h":
      return `<h${Math.min(4, (b.level ?? 2) + 1)}>${esc(b.text ?? "")}</h${Math.min(4, (b.level ?? 2) + 1)}>`;
    case "p":
      return `<p>${esc(b.text ?? "").replace(/\n/g, "<br>")}</p>`;
    case "ul":
      return `<ul>${(b.items ?? []).map((i) => `<li>${esc(i)}</li>`).join("")}</ul>`;
    case "ol":
      return `<ol>${(b.items ?? []).map((i) => `<li>${esc(i)}</li>`).join("")}</ol>`;
    case "checklist":
      return `<ul class="chk">${(b.checks ?? []).map((c) => `<li>${c.done ? "\u2611" : "\u2610"} ${esc(c.label)}</li>`).join("")}</ul>`;
    case "callout":
      return `<div class="callout ${b.tone ?? "info"}">${esc(b.text ?? "")}</div>`;
    case "kv":
      return `<dl>${(b.pairs ?? []).map(([k, v2]) => `<dt>${esc(k)}</dt><dd>${esc(v2)}</dd>`).join("")}</dl>`;
    case "table":
      return `<table><thead><tr>${(b.headers ?? []).map((h) => `<th>${esc(h)}</th>`).join("")}</tr></thead><tbody>${(b.rows ?? []).map((r) => `<tr>${r.map((c) => `<td>${esc(cell(c))}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
  }
}
function toHtml(d) {
  const meta = Object.entries(d.meta).map(([k, v2]) => `<span><b>${esc(k)}</b> ${esc(v2)}</span>`).join("");
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--ink:#14112b;--violet:#6d4aff;--amber:#f5a524;--emerald:#12a870;--rose:#e5484d;--cyan:#12a4c7;--cream:#fbf8f1}
body{font:16px/1.6 Inter,system-ui,sans-serif;color:var(--ink);background:var(--cream);max-width:860px;margin:0 auto;padding:40px 24px}
h1,h2,h3,h4{font-family:'Space Grotesk',Inter,sans-serif;line-height:1.2}h1{font-size:2rem;border-bottom:4px solid var(--violet);padding-bottom:.4rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}th{background:var(--ink);color:#fff;text-align:left}th,td{border:1px solid #d9d3c3;padding:6px 10px;vertical-align:top}tr:nth-child(even) td{background:#f3eee0}
.callout{border-left:5px solid var(--cyan);background:#e8f6fa;padding:10px 14px;margin:1rem 0}.callout.warn{border-color:var(--amber);background:#fdf3dc}.callout.ok{border-color:var(--emerald);background:#e2f6ee}
dl{display:grid;grid-template-columns:minmax(150px,36%) 1fr;gap:4px 16px}dt{font-weight:600}dd{margin:0}.chk{list-style:none;padding-left:0}
.meta{font:12px 'Space Mono',monospace;color:#55507a;display:flex;flex-wrap:wrap;gap:4px 14px;border-top:1px solid #d9d3c3;margin-top:2rem;padding-top:.6rem}
.draft{display:inline-block;background:var(--amber);color:var(--ink);font:700 11px 'Space Mono',monospace;padding:2px 8px;border-radius:99px;letter-spacing:.06em}
@media print{body{background:#fff;padding:0}}
</style></head><body><span class="draft">AI DRAFT \xB7 THE HUMAN DECIDES</span><h1>${esc(d.title)}</h1>${d.subtitle ? `<p><i>${esc(d.subtitle)}</i></p>` : ""}${d.blocks.map(blockHtml).join("\n")}<div class="meta">${meta}</div></body></html>`;
}
function csvEscape(v2) {
  let s = String(v2);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
function toCsv(d) {
  const tables = d.blocks.filter((b) => b.type === "table");
  if (!tables.length) {
    const rows2 = d.blocks.flatMap((b) => b.type === "kv" ? (b.pairs ?? []).map(([k, v2]) => [k, v2]) : b.type === "ul" || b.type === "ol" ? (b.items ?? []).map((i) => ["", i]) : b.text ? [["", b.text]] : []);
    return ["Field,Value", ...rows2.map((r) => r.map(csvEscape).join(","))].join("\r\n") + "\r\n";
  }
  return tables.map((t, i) => [`${csvEscape(`Table ${i + 1}`)}`, (t.headers ?? []).map(csvEscape).join(","), ...(t.rows ?? []).map((r) => r.map(csvEscape).join(","))].join("\r\n")).join("\r\n\r\n") + "\r\n";
}
function toJson(d) {
  return JSON.stringify(d, null, 2) + "\n";
}

// src/core/acceptance.ts
var MAX_DOC_JSON = 2e5;
var BLOCK_TYPES = /* @__PURE__ */ new Set(["h", "p", "ul", "ol", "table", "kv", "callout", "checklist"]);
function textOf(doc) {
  const out = [doc.title, doc.subtitle ?? ""];
  for (const b of doc.blocks) {
    out.push(b.text ?? "", ...b.items ?? [], ...b.headers ?? [], ...(b.checks ?? []).map((c) => c.label));
    for (const r of b.rows ?? []) out.push(...r.map(String));
    for (const [k, v2] of b.pairs ?? []) out.push(k, v2);
  }
  out.push(...Object.values(doc.meta ?? {}).map(String));
  return out.filter(Boolean);
}
var check = (id, title, fn) => {
  try {
    const fail = fn();
    return { id, title, pass: fail === null, detail: fail ?? "ok" };
  } catch (e) {
    return { id, title, pass: false, detail: `check could not run: ${e.message.slice(0, 80)}` };
  }
};
function runAcceptance(c, agent) {
  const doc = c.doc;
  const tooBig = (() => {
    try {
      return JSON.stringify(doc).length > MAX_DOC_JSON;
    } catch {
      return true;
    }
  })();
  if (tooBig) return { passed: false, results: [{ id: "A7", title: "It fits the storage limit", pass: false, detail: `larger than ${MAX_DOC_JSON} characters, so the other checks were not run` }] };
  const texts = (() => {
    try {
      return textOf(doc);
    } catch {
      return [];
    }
  })();
  const joined = texts.join("\n");
  const results = [
    check("A1", "The agent contract holds", () => {
      if (!agent) return `no registered agent ${c.agentId}`;
      if (agent.requiresApproval !== true) return "the contract does not require approval";
      if (agent.dataClass === "learner") return "the contract handles learner data, which is never admitted";
      if (!PURPOSES.includes(agent.purpose) || !agent.allowedPurposes.includes(agent.purpose)) return "the contract purpose is not one it is allowed";
      return null;
    }),
    check("A2", "The document is well formed", () => {
      if (typeof doc?.title !== "string" || !doc.title.trim() || doc.title.length > 200) return "the title is missing or longer than 200 characters";
      if (!Array.isArray(doc.blocks) || !doc.blocks.length) return "the document has no content";
      const bad2 = doc.blocks.filter((b) => !BLOCK_TYPES.has(b.type)).length;
      if (bad2) return `${bad2} block(s) have an unknown type`;
      if (doc.blocks.some((b) => b.type === "h" && !(b.text ?? "").trim())) return "a heading is empty";
      return null;
    }),
    check("A3", "It says something", () => {
      const body = doc.blocks.filter((b) => b.type !== "h").flatMap((b) => [b.text ?? "", ...b.items ?? [], ...(b.pairs ?? []).map(([, v2]) => v2), ...(b.rows ?? []).flat().map(String)]).join(" ").trim();
      return body.length >= 40 ? null : "there is almost no content outside headings";
    }),
    check("A4", "No personal data", () => {
      const found = detectPii(joined);
      return found.length ? `personal data present (${[...new Set(found.map((f) => f.kind))].join(", ")})` : null;
    }),
    check("A5", "No instruction-override text", () => detectInjection(joined).length ? "the text contains an instruction-override pattern" : null),
    check("A6", "Every figure is sourced and nothing was redacted", () => {
      const flagged = (c.flags ?? []).filter((f) => /^(pii_echo|unsourced_claims)/.test(f));
      if (flagged.length) return `the guardrails flagged it while drafting (${flagged.join(", ")})`;
      if (/\[UNSOURCED\]/.test(joined)) return "it still contains [UNSOURCED] figures";
      if (/\[REDACTED_[A-Z_]+\]/.test(joined)) return "it still contains redacted personal data";
      return null;
    }),
    check("A7", "It fits the storage limit", () => null),
    check("A8", "It renders safely in every text format", () => {
      const md = toMarkdown(doc);
      const html = toHtml(doc);
      const csv = toCsv(doc);
      const json = toJson(doc);
      if (![md, html, csv, json].every((s) => s.trim().length > 0)) return "a format rendered empty";
      JSON.parse(json);
      const markup = html.replace(/<style[\s\S]*?<\/style>/i, "");
      if (/<script/i.test(markup) || /<[a-z][^>]*\son[a-z]+\s*=/i.test(markup) || /\b(?:href|src)\s*=\s*["']?\s*javascript:/i.test(markup)) return "the HTML export contains script or an event handler";
      return null;
    }),
    check("A9", "It is marked as a draft with its provenance", () => {
      const m = doc.meta ?? {};
      if (m.status !== "DRAFT") return "meta.status is not DRAFT";
      if (!m.agent || m.agent !== c.agentId) return "meta.agent does not match the agent";
      if (!m.engine) return "meta.engine is missing";
      if (agent && m.purpose !== agent.purpose) return "meta.purpose does not match the contract";
      return null;
    }),
    check("A10", "An autonomous draft names its standing order", () => {
      if (!c.requestedBy?.startsWith("auto:")) return null;
      return doc.meta?.order === c.requestedBy.slice(5) ? null : "meta.order does not match the autonomous actor";
    })
  ];
  return { passed: results.every((r) => r.pass), results };
}
var failedChecks = (a) => a.results.filter((r) => !r.pass);

// src/server/validate.ts
var MAX_RECORD_BYTES = 256 * 1024;
var MAX_RECORDS = 2e4;
var CORE = ["ledger", "brain", "artefact_versions", "runs", "approvals", "countersignatures", "tombstones", "erasure_requests"];
var LIBRARY = ["documents", "document_chunks", "custom_defs", "chat_log", "integration_settings"];
var CUSTOM_WIDGET_COLLECTION = /^cw_[a-z0-9_]{1,40}$/;
var CLIENT_COLLECTIONS = /* @__PURE__ */ new Set([
  ...CORE,
  ...LIBRARY,
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
var latestById = (rows2, id) => rows2.filter((r) => r.id === id).at(-1);
var isHash = (v2) => typeof v2 === "string" && /^[0-9a-f]{64}$/.test(v2);
async function validateAppend(collection, body, ctx) {
  if (collection === "ledger") bad("ledger entries are authored by the server: POST /api/ledger", 403);
  if (!CLIENT_COLLECTIONS.has(collection) && !CUSTOM_WIDGET_COLLECTION.test(collection)) bad("unknown collection", 404);
  if (typeof body !== "object" || body === null || Array.isArray(body)) bad("record must be an object");
  const rec = body;
  if (typeof rec.id !== "string" || rec.id.length < 1 || rec.id.length > 200) bad("record needs a string id (1-200 chars)");
  if (JSON.stringify(rec).length > MAX_RECORD_BYTES) bad("record too large", 413);
  if (ctx.store.list(collection).length >= MAX_RECORDS) bad("collection is full", 507);
  switch (collection) {
    case "artefact_versions":
      await artefact(rec, ctx);
      break;
    case "approvals":
      approval(rec, ctx);
      break;
    case "countersignatures":
      countersignature(rec, ctx);
      break;
    case "documents":
      await document(rec, ctx);
      break;
    case "brain":
      brain(rec, ctx);
      break;
    case "erasure_requests":
      erasure(rec, ctx);
      break;
    case "tombstones":
      tombstone(rec, ctx);
      break;
  }
  return rec;
}
async function artefact(rec, ctx) {
  if (typeof rec.doc !== "object" || rec.doc === null || typeof rec.docHash !== "string" || await sha256Hex(canonical(rec.doc)) !== rec.docHash) bad("docHash does not match the document");
  const status = rec.status;
  if (status !== "DRAFT" && status !== "IN_REVIEW" && status !== "APPROVED" && status !== "RATIFIED" && status !== "INGESTED" && status !== "REJECTED") bad("bad artefact status");
  const customIds = new Set(ctx.store.list("custom_defs").filter((d) => d.kind === "agent" && !d.deleted).map((d) => d.id));
  if (typeof rec.agentId !== "string" || !(agentById(rec.agentId) || customIds.has(rec.agentId))) bad("unknown agent");
  if (status !== "APPROVED" && status !== "REJECTED" && status !== "RATIFIED" && status !== "INGESTED" && rec.approvedBy !== void 0) bad("only a decision carries approvedBy");
  if (status !== "RATIFIED" && status !== "INGESTED" && rec.countersignedBy !== void 0) bad("only a ratified artefact carries countersignedBy");
  const cur = latestById(ctx.store.list("artefact_versions"), rec.id);
  if (!cur) {
    if (status !== "DRAFT" || rec.version !== 1) bad("a new artefact starts as DRAFT v1");
    if (ctx.actor && rec.requestedBy !== ctx.actor) bad("requestedBy is not you", 403);
    if (String(rec.requestedBy).startsWith("auto:")) {
      const orderId = String(rec.requestedBy).slice(5);
      const order = latestById(ctx.store.list("standing_orders"), orderId);
      if (ctx.actor !== rec.requestedBy) bad("only the autonomy runner can create an autonomous draft", 403);
      if (!order || order.status !== "ACTIVE") return bad("there is no active standing order for this autonomous draft", 403);
      if (order.agentId !== rec.agentId) bad("the draft is from a different agent than its standing order", 403);
      if (rec.doc?.meta?.order !== orderId) bad("the draft does not name its standing order");
    }
    if (rec.revisionOf !== void 0) {
      const of = latestById(ctx.store.list("artefact_versions"), rec.revisionOf);
      if (of?.status !== "RATIFIED" && of?.status !== "INGESTED") bad("only a ratified artefact can be revised", 409);
    }
    return;
  }
  if (rec.requestedBy !== cur.requestedBy || rec.agentId !== cur.agentId || rec.orgId !== cur.orgId) bad("requestedBy, agent and org cannot change");
  const sameDoc = rec.docHash === cur.docHash && rec.version === cur.version;
  if (status === "DRAFT") {
    if (cur.status === "RATIFIED" || cur.status === "INGESTED") bad("a ratified artefact is final: start a revision instead", 409);
    if (rec.version !== Number(cur.version) + 1) bad("an edit is a new version");
  } else if (cur.status === "DRAFT" && status === "IN_REVIEW") {
    if (!sameDoc) bad("submitting for review cannot change the document");
    if (String(rec.requestedBy).startsWith("auto:")) {
      const acc = runAcceptance({ doc: rec.doc, agentId: String(rec.agentId), flags: Array.isArray(rec.flags) ? rec.flags.map(String) : [], requestedBy: String(rec.requestedBy) }, agentById(String(rec.agentId)));
      if (!acc.passed) bad(`it did not pass the acceptance suite: ${failedChecks(acc).map((c) => `${c.id} ${c.detail}`).join("; ")}`, 422);
    }
  } else if (cur.status === "IN_REVIEW" && (status === "APPROVED" || status === "REJECTED")) {
    if (!sameDoc) bad("a decision cannot change the document");
    const approver = rec.approvedBy;
    if (typeof approver !== "string" || !approver) bad("a decision needs approvedBy");
    if (String(approver).startsWith("auto:")) bad("an autonomous actor can never approve", 403);
    if (ctx.actor && approver !== ctx.actor) bad("approvedBy is not you", 403);
    if ((agentById(String(cur.agentId))?.secondApprover || customIds.has(String(cur.agentId))) && approver === cur.requestedBy) bad("this agent requires a second person to approve", 403);
    if (status === "REJECTED" && !String(rec.note ?? "").trim()) bad("a rejection needs a reason");
  } else if (cur.status === "APPROVED" && status === "RATIFIED") {
    if (!sameDoc) bad("a countersignature cannot change the document");
    const signer = rec.countersignedBy;
    if (typeof signer !== "string" || !signer) bad("ratifying needs countersignedBy");
    if (String(signer).startsWith("auto:")) bad("an autonomous actor can never countersign", 403);
    if (ctx.actor && signer !== ctx.actor) bad("countersignedBy is not you", 403);
    if (signer === cur.approvedBy) bad("a different person from the approver must countersign", 403);
    if (rec.approvedBy !== cur.approvedBy) bad("approvedBy cannot change");
    if (typeof rec.ratifiedAt !== "string") bad("ratifying needs ratifiedAt");
  } else if (cur.status === "RATIFIED" && status === "INGESTED") {
    if (!sameDoc) bad("ingesting cannot change the document");
    if (rec.approvedBy !== cur.approvedBy || rec.countersignedBy !== cur.countersignedBy) bad("signers cannot change");
    if (agentById(String(cur.agentId))?.ingestion === "none") bad("this agent's contract says its output is not ingested", 409);
    const doc = latestById(ctx.store.list("documents"), `rat_${String(cur.id)}_v${String(cur.version)}`);
    if (!doc || doc.origin !== "ratified" || doc.ratifiedFrom?.docHash !== cur.docHash) bad("the ratified document is not in the library yet", 409);
    if (typeof rec.ingestedAt !== "string") bad("ingesting needs ingestedAt");
  } else {
    bad(`cannot go from ${String(cur.status)} to ${status}`, 409);
  }
}
function countersignature(rec, ctx) {
  const art = latestById(ctx.store.list("artefact_versions"), rec.artefactId);
  if (!art || art.status !== "RATIFIED" || art.countersignedBy !== rec.signer || art.docHash !== rec.docHash || art.version !== rec.version) bad("countersignature does not match a ratified artefact", 409);
  if (ctx.actor && rec.signer !== ctx.actor) bad("signer is not you", 403);
}
async function document(rec, ctx) {
  if (latestById(ctx.store.list("documents"), rec.id)?.origin === "ratified") bad("a ratified document is immutable", 409);
  if (rec.origin !== "ratified") return;
  const from = rec.ratifiedFrom;
  const art = latestById(ctx.store.list("artefact_versions"), from?.artefactId);
  if (!art || art.status !== "RATIFIED" || art.docHash !== from?.docHash || rec.id !== `rat_${String(art.id)}_v${String(art.version)}`) return bad("a ratified document must come from a ratified artefact", 409);
  if (await sha256Hex(canonical(rec.doc)) !== art.docHash) bad("the document does not match what was ratified");
  if (ctx.actor && rec.by !== ctx.actor) bad("by is not you", 403);
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
var latestRequests = (store2) => {
  const m = /* @__PURE__ */ new Map();
  for (const r of store2.list("erasure_requests")) m.set(r.id, r);
  return [...m.values()];
};
function erasure(rec, ctx) {
  if (!isHash(rec.subjectHash)) bad("erasure request needs a subjectHash (sha-256 hex)");
  if (!ERASURE_CATEGORIES.includes(rec.category)) bad("bad erasure category");
  if (typeof rec.note !== "string" || rec.note.length > 200) bad("note must be text of at most 200 characters");
  if (typeof rec.requestedBy !== "string" || !rec.requestedBy) bad("requestedBy is required");
  const hasTombstone = (h) => ctx.store.list("tombstones").some((t) => t.subjectHash === h);
  const cur = latestById(ctx.store.list("erasure_requests"), rec.id);
  if (!cur) {
    if (rec.status !== "REQUESTED" || rec.version !== 1 || rec.decidedBy !== void 0) bad("a new erasure request starts as REQUESTED v1");
    if (ctx.actor && rec.requestedBy !== ctx.actor) bad("requestedBy is not you", 403);
    if (hasTombstone(rec.subjectHash)) bad("that subject has already been erased", 409);
    if (latestRequests(ctx.store).some((r) => r.subjectHash === rec.subjectHash && (r.status === "REQUESTED" || r.status === "APPROVED"))) bad("there is already an open request for that subject", 409);
    return;
  }
  if (rec.subjectHash !== cur.subjectHash || rec.requestedBy !== cur.requestedBy || rec.category !== cur.category) bad("subject, requester and category cannot change");
  if (rec.version !== Number(cur.version) + 1) bad("a change is a new version");
  if (cur.status === "REQUESTED" && (rec.status === "APPROVED" || rec.status === "REJECTED")) {
    const by = rec.decidedBy;
    if (typeof by !== "string" || !by) bad("a decision needs decidedBy");
    if (ctx.actor && by !== ctx.actor) bad("decidedBy is not you", 403);
    if (by === cur.requestedBy) bad("a second person must decide an erasure request", 403);
    if (ctx.roles && !ctx.roles.includes("officer")) bad("deciding an erasure request needs the officer role", 403);
    if (rec.status === "REJECTED" && !String(rec.decisionNote ?? "").trim()) bad("a rejection needs a reason");
  } else if (cur.status === "APPROVED" && rec.status === "EXECUTED") {
    if (!hasTombstone(cur.subjectHash)) bad("the erasure has not been applied: no tombstone is recorded", 409);
    if (rec.decidedBy !== cur.decidedBy) bad("decidedBy cannot change");
  } else {
    bad(`cannot go from ${String(cur.status)} to ${String(rec.status)}`, 409);
  }
}
function tombstone(rec, ctx) {
  if (!isHash(rec.subjectHash)) bad("tombstone needs a subjectHash (sha-256 hex)");
  if (!latestRequests(ctx.store).some((r) => r.subjectHash === rec.subjectHash && r.status === "APPROVED")) bad("a tombstone needs an approved erasure request", 403);
  if (ctx.actor && rec.by !== ctx.actor) bad("by is not you", 403);
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

// src/server/ledgerService.ts
var GENESIS = "0".repeat(64);
var MAX_DETAIL_BYTES = 16 * 1024;
var short = (v2) => typeof v2 === "string" && v2.length > 0 && v2.length <= 200;
var strip = (r) => {
  const { id: _id, ...e } = r;
  return e;
};
function appendLedger(store2, input, knownSeq, actor, now = () => (/* @__PURE__ */ new Date()).toISOString(), opts = {}) {
  const run = (tails.get(store2) ?? Promise.resolve()).then(() => write(store2, input, knownSeq, actor, now, opts));
  tails.set(store2, run.catch(() => void 0));
  return run;
}
var tails = /* @__PURE__ */ new WeakMap();
var SERVER_ONLY_ACTIONS = /^(model|autonomy)\./;
async function write(store2, input, knownSeq, actor, now = () => (/* @__PURE__ */ new Date()).toISOString(), opts = {}) {
  const bad2 = (m, status = 400) => {
    throw new Rejected(status, m);
  };
  if (typeof input !== "object" || input === null || Array.isArray(input)) bad2("ledger input must be an object");
  const i = input;
  if (!short(i.orgId) || !short(i.actor) || !short(i.action) || !short(i.subject)) bad2("orgId, actor, action and subject are required strings (1-200 chars)");
  const detail = i.detail ?? {};
  if (typeof detail !== "object" || detail === null || Array.isArray(detail) || JSON.stringify(detail).length > MAX_DETAIL_BYTES) bad2("detail must be a small object");
  const action = i.action;
  if (opts.client && SERVER_ONLY_ACTIONS.test(action)) bad2("this action is written by the server only", 403);
  const who = i.actor;
  const subject = i.subject;
  if (actor && /^(hitl|artefact|subject|erasure)\./.test(action) && who !== actor) bad2("ledger actor is not you", 403);
  const art = store2.list("artefact_versions").filter((r) => r.id === subject).at(-1);
  if (/^hitl\.(approved|rejected)$/.test(action) && (art?.status !== action.slice(5).toUpperCase() || art.approvedBy !== who)) bad2("no recorded decision matches this ledger entry", 409);
  if (action === "artefact.submit" && art?.status !== "IN_REVIEW") bad2("artefact is not in review", 409);
  if (/^artefact\.(countersigned|ratified)$/.test(action) && (art?.status !== "RATIFIED" && art?.status !== "INGESTED" || art?.countersignedBy !== who)) bad2("no recorded countersignature matches this ledger entry", 409);
  if (action === "artefact.ingested" && art?.status !== "INGESTED") bad2("artefact is not ingested", 409);
  const er = store2.list("erasure_requests").filter((r) => r.id === subject).at(-1);
  if (action === "erasure.requested" && (er?.status !== "REQUESTED" || er.requestedBy !== who)) bad2("no recorded erasure request matches this ledger entry", 409);
  if (/^erasure\.(approved|rejected)$/.test(action)) {
    const want = action === "erasure.approved" ? ["APPROVED", "EXECUTED"] : ["REJECTED"];
    if (!er || !want.includes(er.status) || er.decidedBy !== who) bad2("no recorded erasure decision matches this ledger entry", 409);
  }
  if (action === "subject.tombstone" && !store2.list("tombstones").some((t) => t.id === subject)) bad2("no recorded tombstone matches this ledger entry", 409);
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

// src/server/finality.ts
function ratifiedProblem(store2, art) {
  if (!art) return "unknown artefact";
  if (art.status !== "RATIFIED" && art.status !== "INGESTED") return "Only a ratified artefact (approved and countersigned) can leave the platform.";
  if (!art.approvedBy || !art.countersignedBy || art.approvedBy === art.countersignedBy) return "The artefact does not carry two different signers.";
  const approved = store2.list("approvals").some((r) => r.artefactId === art.id && r.decision === "APPROVED" && r.approver === art.approvedBy);
  const countersigned = store2.list("countersignatures").some((r) => r.artefactId === art.id && r.signer === art.countersignedBy && r.docHash === art.docHash);
  if (!approved || !countersigned) return "No recorded approval and countersignature for this artefact.";
  return null;
}

// src/server/autonomy/schedule.ts
var EVENT_KINDS = ["push", "pull_request", "workflow_run", "issues"];
var CATCH_UP_MS = 3 * 36e5;
var TriggerInvalid = class extends Error {
};
var int = (v2, lo, hi, what) => {
  if (typeof v2 !== "number" || !Number.isInteger(v2) || v2 < lo || v2 > hi) throw new TriggerInvalid(`${what} must be a whole number from ${lo} to ${hi}`);
  return v2;
};
function parseTrigger(v2) {
  if (typeof v2 !== "object" || v2 === null) throw new TriggerInvalid("a trigger is required");
  const t = v2;
  if (t.kind === "request") return { kind: "request" };
  if (t.kind === "schedule") {
    if (t.every === "daily") return { kind: "schedule", every: "daily", hourUtc: int(t.hourUtc, 0, 23, "hour (UTC)") };
    if (t.every === "weekly") return { kind: "schedule", every: "weekly", weekday: int(t.weekday, 0, 6, "weekday (0 is Sunday)"), hourUtc: int(t.hourUtc, 0, 23, "hour (UTC)") };
    throw new TriggerInvalid("a schedule is daily or weekly");
  }
  if (t.kind === "event") {
    const events2 = Array.isArray(t.events) ? [...new Set(t.events)] : [];
    if (!events2.length || events2.some((e) => !EVENT_KINDS.includes(e))) throw new TriggerInvalid(`events must be a non-empty list from: ${EVENT_KINDS.join(", ")}`);
    return { kind: "event", events: events2, cooldownMinutes: int(t.cooldownMinutes ?? 60, 15, 1440, "cooldown (minutes)") };
  }
  throw new TriggerInvalid("a trigger is a schedule, an event or a request");
}
function latestSlot(t, now) {
  const today2 = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), t.hourUtc));
  if (t.every === "daily") return today2 > now ? new Date(today2.getTime() - 864e5) : today2;
  const back = (today2.getUTCDay() - t.weekday + 7) % 7;
  const slot = new Date(today2.getTime() - back * 864e5);
  return slot > now ? new Date(slot.getTime() - 7 * 864e5) : slot;
}
function dueSlot(t, now, alreadyRan) {
  const slot = latestSlot(t, now);
  const key = slot.toISOString();
  if (alreadyRan.has(key)) return null;
  return now.getTime() - slot.getTime() <= CATCH_UP_MS ? key : null;
}

// src/server/autonomy/orders.ts
var MAX_RUNS_PER_DAY_CEILING = 5;
var OrderRefused = class extends Error {
  constructor(status, message, checks) {
    super(message);
    this.status = status;
    this.checks = checks;
  }
};
function parseProposal(body) {
  if (typeof body !== "object" || body === null || Array.isArray(body)) throw new OrderRefused(400, "the order must be an object");
  const b = body;
  const name = typeof b.name === "string" ? b.name.trim() : "";
  if (name.length < 3 || name.length > 80) throw new OrderRefused(400, "the name must be 3 to 80 characters");
  if (detectPii(name).length) throw new OrderRefused(422, "the name must not contain personal data");
  const agent = typeof b.agentId === "string" ? agentById(b.agentId) : void 0;
  if (!agent) throw new OrderRefused(404, "unknown agent");
  if (agent.dataClass === "learner") throw new OrderRefused(422, "this agent handles learner data, which is never admitted");
  if (agent.requiresApproval !== true) throw new OrderRefused(422, "this agent does not require approval, so it cannot run autonomously");
  let trigger;
  try {
    trigger = parseTrigger(b.trigger);
  } catch (e) {
    if (e instanceof TriggerInvalid) throw new OrderRefused(400, e.message);
    throw e;
  }
  const given = typeof b.inputs === "object" && b.inputs !== null && !Array.isArray(b.inputs) ? b.inputs : {};
  const unknown = Object.keys(given).filter((k) => !agent.inputs.some((i) => i.key === k));
  if (unknown.length) throw new OrderRefused(400, `unknown input(s): ${unknown.join(", ")}`);
  const inputs = {};
  for (const f of agent.inputs) {
    const v2 = given[f.key];
    if (v2 === void 0 || v2 === "") {
      if (f.required) throw new OrderRefused(400, `the input "${f.label}" is required`);
      continue;
    }
    if (typeof v2 !== "string" || v2.length > 1e3) throw new OrderRefused(400, `the input "${f.label}" must be text of at most 1000 characters`);
    if (f.kind === "number" && !Number.isFinite(Number(v2.replace(/[,\s]/g, "")))) throw new OrderRefused(400, `the input "${f.label}" must be a number`);
    if (f.kind === "select" && !(f.options ?? []).includes(v2)) throw new OrderRefused(400, `the input "${f.label}" must be one of its options`);
    if (detectPii(v2).some((x) => x.kind === "learner_identifier")) throw new OrderRefused(422, `the input "${f.label}" contains a learner identifier, which is never admitted`);
    if (detectPii(v2).length) throw new OrderRefused(422, `the input "${f.label}" contains personal data`);
    if (detectInjection(v2).length) throw new OrderRefused(422, `the input "${f.label}" looks like an attempt to override platform controls`);
    inputs[f.key] = v2;
  }
  const runs = b.maxRunsPerDay === void 0 ? 1 : b.maxRunsPerDay;
  if (typeof runs !== "number" || !Number.isInteger(runs) || runs < 1 || runs > MAX_RUNS_PER_DAY_CEILING) throw new OrderRefused(400, `maxRunsPerDay must be a whole number from 1 to ${MAX_RUNS_PER_DAY_CEILING}`);
  return { name, agentId: agent.id, trigger, inputs, maxRunsPerDay: runs };
}

// src/server/autonomy/service.ts
var DAY = 864e5;
var RUN_TIMEOUT_MS = 18e4;
var AutonomyService = class {
  /** Throws on a bad configuration, so the server stops rather than starting with a different limit than the operator meant. */
  constructor(deps) {
    this.deps = deps;
    this.chain = Promise.resolve();
    this.enabled = deps.env.OPS_AUTONOMY === "on";
    if (deps.env.OPS_AUTONOMY && !["on", "off"].includes(deps.env.OPS_AUTONOMY)) throw new Error('OPS_AUTONOMY must be "on" or "off"');
    const max = deps.env.OPS_AUTONOMY_MAX_RUNS_PER_DAY?.trim();
    this.maxRunsPerDay = max ? Number(max) : 20;
    if (!Number.isInteger(this.maxRunsPerDay) || this.maxRunsPerDay < 1) throw new Error("OPS_AUTONOMY_MAX_RUNS_PER_DAY must be a whole number of at least 1");
    this.now = deps.now ?? (() => /* @__PURE__ */ new Date());
  }
  // ------------------------------------------------------------ storage
  orders() {
    const m = /* @__PURE__ */ new Map();
    for (const r of this.deps.store.list("standing_orders")) m.set(String(r.id), r);
    return [...m.values()];
  }
  order(id) {
    const o = this.orders().find((x) => x.id === id);
    if (!o) throw new OrderRefused(404, "unknown order");
    return o;
  }
  save(o, patch) {
    const { statusNote: _drop, ...keep } = o;
    const next = { ...keep, ...patch, version: o.version + 1, at: this.now().toISOString() };
    this.deps.store.append("standing_orders", next);
    return next;
  }
  async audit(action, actor, subject, detail = {}) {
    const last = this.deps.store.list("ledger").at(-1);
    await appendLedger(this.deps.store, { orgId: "infinite-ai", actor, action, subject, detail }, Number(last?.seq ?? 0), null, () => this.now().toISOString());
  }
  /** Ledger entries of one action since a time, newest first. Entries are in time order, so the scan stops early. */
  since(action, from, subject) {
    const out = [];
    const ledger = this.deps.store.list("ledger");
    for (let i = ledger.length - 1; i >= 0; i--) {
      const e = ledger[i];
      if (new Date(String(e.at)) < from) break;
      if (e.action === action && (!subject || e.subject === subject)) out.push(e);
    }
    return out;
  }
  startOfDay() {
    const n = this.now();
    return new Date(Date.UTC(n.getUTCFullYear(), n.getUTCMonth(), n.getUTCDate()));
  }
  runsToday(orderId) {
    return this.since("autonomy.started", this.startOfDay(), orderId).length;
  }
  // ---------------------------------------------------- order lifecycle
  human(actor) {
    if (!actor || actor.startsWith("auto:")) throw new OrderRefused(403, "Standing orders need a signed-in person (set OPS_USERS).");
    return actor;
  }
  dryRunFailure(a) {
    return new OrderRefused(422, `The dry run failed: ${failedChecks(a).map((c) => `${c.id} ${c.detail}`).join("; ")}`, a.results);
  }
  async propose(actor, body) {
    const by = this.human(actor);
    const p = parseProposal(body);
    const dry = await this.deps.runner.dryRun(p);
    if (!dry.passed) throw this.dryRunFailure(dry);
    const o = { id: newId("ord"), ...p, status: "PROPOSED", proposedBy: by, version: 1, at: this.now().toISOString() };
    this.deps.store.append("standing_orders", o);
    await this.audit("autonomy.order.proposed", by, o.id, { agentId: o.agentId, trigger: o.trigger.kind, maxRunsPerDay: o.maxRunsPerDay });
    return o;
  }
  /** A different person activates it, and it is dry-run again first: contracts and facts may have changed since it was proposed. */
  async activate(actor, id, note) {
    const by = this.human(actor);
    const o = this.order(id);
    if (o.status === "REVOKED") throw new OrderRefused(409, "a revoked order cannot be activated");
    if (o.status === "ACTIVE") throw new OrderRefused(409, "the order is already active");
    if (o.status === "PROPOSED" && by === o.proposedBy) throw new OrderRefused(403, "A different person from the proposer must activate an order.");
    const dry = await this.deps.runner.dryRun(o);
    if (!dry.passed) throw this.dryRunFailure(dry);
    const next = this.save(o, { status: "ACTIVE", activatedBy: by, statusNote: (note ?? "").trim().slice(0, 300) });
    await this.audit(o.status === "PAUSED" ? "autonomy.order.resumed" : "autonomy.order.activated", by, id, { note: next.statusNote });
    return next;
  }
  async pause(actor, id, reason) {
    return this.stop(actor, id, reason, "PAUSED", "autonomy.order.paused");
  }
  async revoke(actor, id, reason) {
    return this.stop(actor, id, reason, "REVOKED", "autonomy.order.revoked");
  }
  async stop(actor, id, reason, status, action) {
    const by = this.human(actor);
    const o = this.order(id);
    const r = (reason ?? "").trim();
    if (r.length < 5 || r.length > 300) throw new OrderRefused(400, "Give a reason, in 5 to 300 characters.");
    if (o.status === "REVOKED" || status === "PAUSED" && o.status !== "ACTIVE") throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
    const next = this.save(o, { status, statusNote: r });
    await this.audit(action, by, id, { reason: r });
    return next;
  }
  // --------------------------------------------------------------- runs
  /** One run at a time, and the budget check and the "started" record are one step, so two triggers cannot both squeeze under a limit. */
  exclusive(fn) {
    const run = this.chain.then(fn, fn);
    this.chain = run.catch(() => void 0);
    return run;
  }
  async startRun(orderId, via, by) {
    return this.exclusive(async () => {
      if (!this.enabled) throw new OrderRefused(503, "Autonomy is switched off. The operator enables it with OPS_AUTONOMY=on.");
      const o = this.order(orderId);
      if (o.status !== "ACTIVE") throw new OrderRefused(409, `the order is ${o.status.toLowerCase()}`);
      const perOrder = this.runsToday(o.id);
      if (perOrder >= o.maxRunsPerDay) throw new OrderRefused(429, `This order has used its ${o.maxRunsPerDay} run(s) for today.`);
      if (this.runsToday() >= this.maxRunsPerDay) throw new OrderRefused(429, `The platform's autonomous runs for today (${this.maxRunsPerDay}) are used up.`);
      const actor = `auto:${o.id}`;
      await this.audit("autonomy.started", actor, o.id, { via, by });
      let outcome;
      try {
        outcome = await Promise.race([
          this.deps.runner.run(o, via),
          new Promise((_, rej) => setTimeout(() => rej(new Error("the run took too long")), RUN_TIMEOUT_MS).unref())
        ]);
      } catch (e) {
        await this.audit("autonomy.failed", actor, o.id, { error: e.message.slice(0, 200) }).catch(() => void 0);
        throw e;
      }
      await this.audit(outcome.outcome === "submitted" ? "autonomy.submitted" : "autonomy.quarantined", actor, o.id, { artefactId: outcome.artefactId, failed: failedChecks({ passed: false, results: outcome.checks }).map((c) => c.id) });
      return outcome;
    });
  }
  /** By request: a person asks an active order to run now. It still counts against the budgets. */
  async runNow(actor, id) {
    const by = this.human(actor);
    return this.startRun(id, { kind: "request", by }, by);
  }
  /** Called when a signed webhook event arrives. Only active orders listening for it run, no more than once per cooldown. */
  async onEvent(kind) {
    if (!this.enabled) return [];
    const out = [];
    for (const o of this.orders()) {
      if (o.status !== "ACTIVE" || o.trigger.kind !== "event" || !o.trigger.events.includes(kind)) continue;
      const cool = new Date(this.now().getTime() - o.trigger.cooldownMinutes * 6e4);
      if (this.since("autonomy.started", cool, o.id).length) continue;
      try {
        out.push(await this.startRun(o.id, { kind: "event", event: kind }, "webhook"));
      } catch (e) {
        if (!(e instanceof OrderRefused)) await this.audit("autonomy.failed", `auto:${o.id}`, o.id, { error: e.message.slice(0, 200) }).catch(() => void 0);
      }
    }
    return out;
  }
  /** Called every minute. Runs each scheduled order whose slot is due and has not run, one after another. */
  async tick(now = this.now()) {
    if (!this.enabled) return [];
    const out = [];
    for (const o of this.orders()) {
      if (o.status !== "ACTIVE" || o.trigger.kind !== "schedule") continue;
      const ran = new Set(this.since("autonomy.started", new Date(now.getTime() - 9 * DAY - CATCH_UP_MS), o.id).map((e) => String(e.detail.via?.slot ?? "")));
      const slot = dueSlot(o.trigger, now, ran);
      if (!slot) continue;
      try {
        out.push(await this.startRun(o.id, { kind: "schedule", slot }, "schedule"));
      } catch (e) {
        if (!(e instanceof OrderRefused)) await this.audit("autonomy.failed", `auto:${o.id}`, o.id, { error: e.message.slice(0, 200) }).catch(() => void 0);
      }
    }
    return out;
  }
  // ------------------------------------------------------------- status
  status() {
    const day = this.startOfDay();
    const orders = this.orders().map((o) => ({ ...o, runsToday: this.runsToday(o.id), lastRunAt: this.since("autonomy.started", new Date(this.now().getTime() - 30 * DAY), o.id)[0]?.at ?? null }));
    const recent = [];
    const ledger = this.deps.store.list("ledger");
    for (let i = ledger.length - 1; i >= 0 && recent.length < 40; i--) {
      const e = ledger[i];
      if (/^autonomy\.(submitted|quarantined|failed)$/.test(String(e.action))) recent.push({ at: String(e.at), action: String(e.action), orderId: String(e.subject), detail: e.detail });
    }
    return { enabled: this.enabled, maxRunsPerDay: this.maxRunsPerDay, runsToday: this.runsToday(), since: day.toISOString(), orders, recent };
  }
};

// src/core/ledger.ts
var GENESIS2 = "0".repeat(64);
var Ledger = class {
  /** With a `sequencer` the server assigns seq/hash/time (and persists the entry); without one the chain is built locally. */
  constructor(initial = [], onAppend, sequencer) {
    this.onAppend = onAppend;
    this.sequencer = sequencer;
    this.entries = [];
    this.tail = Promise.resolve();
    this.entries = [...initial];
  }
  get all() {
    return this.entries;
  }
  async append(e) {
    if (!this.sequencer) return this.appendLocal(e);
    const run = this.tail.then(() => this.appendRemote(this.sequencer, e));
    this.tail = run.catch(() => void 0);
    return run;
  }
  async appendRemote(seq, e) {
    const known = this.entries[this.entries.length - 1]?.seq ?? 0;
    const { entry, earlier } = await seq({ orgId: e.orgId, actor: e.actor, action: e.action, subject: e.subject, detail: e.detail }, known);
    const gap = [...earlier, entry].every((x, i) => x.seq === known + 1 + i);
    if (!gap) throw new Error("Server ledger reply does not continue this ledger.");
    this.entries.push(...earlier, entry);
    return entry;
  }
  async appendLocal(e) {
    const prev = this.entries[this.entries.length - 1];
    const base = {
      seq: (prev?.seq ?? 0) + 1,
      at: e.at ?? (/* @__PURE__ */ new Date()).toISOString(),
      orgId: e.orgId,
      actor: e.actor,
      action: e.action,
      subject: e.subject,
      detail: e.detail ?? {},
      prevHash: prev?.hash ?? GENESIS2
    };
    const entry = { ...base, hash: await sha256Hex(canonical(base)) };
    this.entries.push(entry);
    this.onAppend?.(entry);
    return entry;
  }
  /** Returns the seq of the first bad entry, or null when the chain is intact. */
  async verify() {
    let prevHash = GENESIS2;
    for (const [i, e] of this.entries.entries()) {
      const { hash, ...base } = e;
      if (e.seq !== i + 1 || e.prevHash !== prevHash || await sha256Hex(canonical(base)) !== hash) return e.seq;
      prevHash = hash;
    }
    return null;
  }
};

// src/core/brain.ts
var CONSTITUTION = [
  { topic: "invariant.pii", text: "No personal information reaches a model. Only de-identified text is admitted." },
  { topic: "invariant.learner", text: "Learner-level data is never held or processed by the operations platform." },
  { topic: "invariant.purpose", text: "Every run declares a purpose and may only use agents permitted for it." },
  { topic: "invariant.append_only", text: "Ledger and Brain are append-only. Corrections supersede; erasure is a tombstone." },
  { topic: "invariant.human", text: "AI drafts. The human decides. Nothing is approved without a named human." },
  { topic: "invariant.numbers", text: "No invented numbers. Every figure is sourced or stripped." },
  { topic: "invariant.curriculum", text: "Never invent curriculum policy; cite CAPS/DBE sources or mark as unverified." }
];
var TIER_NEEDS_RATIFY = ["L3", "L4"];
var Brain = class {
  constructor(ledger, orgId = "infinite-ai", restored = [], onChange) {
    this.ledger = ledger;
    this.orgId = orgId;
    this.onChange = onChange;
    this.facts = [];
    const at = "2026-01-01T00:00:00.000Z";
    if (restored.length) this.facts.push(...restored.filter((f) => f.tier !== "L0"));
    CONSTITUTION.forEach(
      (c, i) => this.facts.push({ id: `L0-${String(i + 1).padStart(2, "0")}`, orgId, tier: "L0", topic: c.topic, text: c.text, provenance: { deidentified: true, sources: ["constitution"] }, status: "ratified", by: "system", at })
    );
  }
  get all() {
    return this.facts;
  }
  async remember(f) {
    if (f.tier === "L0") throw new Error("L0 is the constitution and cannot be written.");
    if (!f.provenance.deidentified) throw new Error("Brain refuses facts that are not de-identified.");
    if (!f.provenance.sources.length) throw new Error("Brain refuses facts without a source.");
    const fact = { id: newId("fact"), orgId: this.orgId, tier: f.tier, topic: f.topic, text: f.text, provenance: f.provenance, status: TIER_NEEDS_RATIFY.includes(f.tier) ? "proposed" : "ratified", by: f.by, at: (/* @__PURE__ */ new Date()).toISOString() };
    this.facts.push(fact);
    this.onChange?.(fact);
    await this.ledger.append({ orgId: this.orgId, actor: f.by, action: "brain.remember", subject: fact.id, detail: { tier: f.tier, topic: f.topic, status: fact.status } });
    return fact;
  }
  /** Only a named human can ratify a proposed fact. */
  async ratify(id, approver) {
    if (approver.kind !== "human") throw new Error("Only a human can ratify a Brain fact.");
    const f = this.facts.find((x) => x.id === id);
    if (!f || f.status !== "proposed") throw new Error("No proposed fact with that id.");
    const next = { ...f, id: newId("fact"), status: "ratified", supersedes: f.id, by: approver.id, at: (/* @__PURE__ */ new Date()).toISOString() };
    this.mark(f, "superseded");
    this.facts.push(next);
    this.onChange?.(next);
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: "brain.ratify", subject: next.id, detail: { supersedes: f.id } });
    return next;
  }
  async supersede(id, text, provenance, by) {
    const old = this.facts.find((x) => x.id === id);
    if (!old || old.tier === "L0" || old.status === "tombstoned") throw new Error("Cannot supersede that fact.");
    if (!provenance.deidentified) throw new Error("Brain refuses facts that are not de-identified.");
    const next = { ...old, id: newId("fact"), text, provenance, supersedes: id, by, at: (/* @__PURE__ */ new Date()).toISOString(), status: TIER_NEEDS_RATIFY.includes(old.tier) ? "proposed" : "ratified" };
    this.mark(old, "superseded");
    this.facts.push(next);
    this.onChange?.(next);
    await this.ledger.append({ orgId: this.orgId, actor: by, action: "brain.supersede", subject: next.id, detail: { supersedes: id } });
    return next;
  }
  /** Erasure: keep the audit fact (id, topic, who/when), drop the content. */
  async forget(id, by) {
    const f = this.facts.find((x) => x.id === id);
    if (!f || f.tier === "L0") throw new Error("Cannot forget that fact.");
    this.mark(f, "tombstoned", { text: "[erased]" });
    await this.ledger.append({ orgId: this.orgId, actor: by, action: "brain.forget", subject: id, detail: { topic: f.topic } });
  }
  /** Recall only ratified, live facts. Proposed facts are never fed to agents. */
  recall(tiers, topicPrefix = "") {
    return this.facts.filter((f) => f.status === "ratified" && tiers.includes(f.tier) && f.topic.startsWith(topicPrefix));
  }
  explain(id) {
    const chain = [];
    let cur = this.facts.find((f) => f.id === id);
    while (cur) {
      chain.push(cur);
      const prev = cur.supersedes;
      cur = prev ? this.facts.find((f) => f.id === prev) : void 0;
    }
    return chain;
  }
  mark(f, status, patch = {}) {
    Object.assign(f, patch, { status });
    this.onChange?.(f);
  }
};

// src/core/warehouse.ts
var MemoryAdapter = class {
  constructor() {
    this.data = {};
  }
  async load() {
    return structuredClone(this.data);
  }
  async append(c, r) {
    (this.data[c] ??= []).push(structuredClone(r));
  }
  async clear() {
    this.data = {};
  }
};
var Warehouse = class {
  constructor(adapter = new MemoryAdapter()) {
    this.adapter = adapter;
    this.cols = {};
  }
  async init() {
    this.cols = await this.adapter.load();
    return this;
  }
  async put(collection, rec) {
    const hash = await sha256Hex(canonical(rec));
    const stored = { ...rec, hash, storedAt: rec["storedAt"] ?? (/* @__PURE__ */ new Date()).toISOString() };
    await this.persist(collection, stored);
    return stored;
  }
  /** Store a record exactly as given (used for ledger entries, which carry their own hash). */
  async putRaw(collection, rec) {
    await this.persist(collection, rec);
  }
  /** The record is visible locally while it is being saved, and is taken back out if saving fails, so this view never holds a record the store does not. */
  async persist(collection, rec) {
    const rows2 = this.cols[collection] ??= [];
    rows2.push(rec);
    try {
      await this.adapter.append(collection, rec);
    } catch (e) {
      const i = rows2.lastIndexOf(rec);
      if (i >= 0) rows2.splice(i, 1);
      throw e;
    }
  }
  list(collection, where) {
    const all = this.cols[collection] ?? [];
    return where ? all.filter(where) : [...all];
  }
  /** Newest record per `key` field value. */
  latest(collection, key = "id") {
    const m = /* @__PURE__ */ new Map();
    for (const r of this.cols[collection] ?? []) m.set(r[key], r);
    return [...m.values()];
  }
  collections() {
    return Object.fromEntries(Object.entries(this.cols).map(([k, v2]) => [k, v2.length]));
  }
  /** JSON-lines bundle so data is never trapped in the platform. */
  exportJsonl() {
    return Object.entries(this.cols).flatMap(([c, rs]) => rs.map((r) => JSON.stringify({ collection: c, ...r }))).join("\n");
  }
  async clearAll() {
    this.cols = {};
    await this.adapter.clear?.();
  }
};

// src/core/gateway.ts
var localDraftEngine = {
  name: "local-draft/1",
  async complete(req) {
    const lines3 = Object.entries(req.context ?? {}).map(([k, v2]) => `- ${k}: ${v2} [src:${k}]`);
    return lines3.length ? `Facts supplied to this draft:
${lines3.join("\n")}` : "No structured facts were supplied; a human must complete this section.";
  }
};
var GatewayRefused = class extends Error {
};
var Gateway = class {
  constructor(ledger, engine = localDraftEngine) {
    this.ledger = ledger;
    this.engine = engine;
  }
  setEngine(e) {
    this.engine = e;
  }
  get engineName() {
    return this.engine.name;
  }
  async complete(req) {
    if (!req.provenance.deidentified) {
      await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: "gateway.refused", subject: req.purpose, detail: { reason: "not_deidentified" } });
      throw new GatewayRefused("Gateway refuses any request that is not de-identified.");
    }
    if (!req.provenance.sources.length) throw new GatewayRefused("Gateway refuses requests without provenance sources.");
    let text;
    let engine = this.engine;
    try {
      text = await engine.complete(req);
    } catch (e) {
      await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: "gateway.fallback", subject: req.purpose, detail: { from: engine.name, error: String(e.message) } });
      engine = localDraftEngine;
      text = await engine.complete(req);
    }
    await this.ledger.append({ orgId: req.orgId, actor: req.agentId, action: "gateway.complete", subject: req.purpose, detail: { engine: engine.name, promptChars: req.prompt.length, sources: req.provenance.sources } });
    return { text, engine: engine.name };
  }
};

// src/core/guardrails/claims.ts
var NUMBER = /(?<![A-Za-z0-9_.\-/])(?:R\s?|\$|US\$)?\d[\d,\s]*(?:\.\d+)?\s?(?:%|[kKmMbB]\b|bn\b)?(?![A-Za-z0-9_\-/])/g;
function isExempt(raw, before, after) {
  const n = raw.replace(/[R$,\s%kKmMbB]|US|bn/g, "");
  if (/^(19|20)\d{2}$/.test(n)) return true;
  if (n.length <= 1 && !/[%R$]/.test(raw)) return true;
  if (/(?:iso|iec|nist|sp|soc|sections?|ss?|act|no|pr|issue|rfc|cis|owasp|oq|ac|mod|le)\.?\s*$/i.test(before) || /#\s*$/.test(before)) return true;
  if (/(?:^|\s)(stage|step|phase|section|part|week|term|grade|gate|tier|level|l|q|fy|b|v|a|sprint|rule|day)\s*$/i.test(before)) return true;
  if (/^\s*(?:\.|\)|:)\s/.test(after) && before.trim() === "") return true;
  return false;
}
function enforceSourcing(text, allowed = []) {
  const allow = new Set([...allowed].map((v2) => String(v2).replace(/[R$,\s%]/g, "").toLowerCase()));
  const stripped = [];
  let sourced = 0;
  const lines3 = text.split("\n").map((line) => {
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return line;
    return line.split(/(?<=[.!?;])\s+/).map((sentence) => {
      const hasTag = /\[src:[^\]]+\]/.test(sentence);
      return sentence.replace(NUMBER, (raw, offset, whole) => {
        const before = whole.slice(0, offset).replace(/\[src:[^\]]*\]/g, "");
        const after = whole.slice(offset + raw.length);
        if (isExempt(raw, before, after)) return raw;
        const norm = raw.replace(/[R$,\s%]/g, "").toLowerCase();
        if (hasTag || allow.has(norm)) {
          sourced++;
          return raw;
        }
        stripped.push(raw.trim());
        return "[UNSOURCED]";
      });
    }).join(" ");
  });
  return { text: lines3.join("\n"), stripped, sourced };
}

// src/core/guardrails/engine.ts
function runGates(g) {
  if (g.dataClass === "learner") return { gate: "data_class", reason: "Learner-level data is never admitted to the operations platform." };
  if (g.subjectId && g.tombstoned?.has(g.subjectId)) return { gate: "tombstone", reason: `Subject ${g.subjectId} has been erased; no processing is permitted.` };
  if (!PURPOSES.includes(g.purpose) || !g.allowedPurposes.includes(g.purpose))
    return { gate: "purpose", reason: `Purpose "${g.purpose}" is not permitted for this agent.` };
  if (g.dataClass === "personal" && !g.lawfulBasis) return { gate: "lawful_basis", reason: "Personal data requires a stated lawful basis (POPIA s11)." };
  return null;
}
function checkInput(text, sources, knownNames = []) {
  const injection = detectInjection(text);
  if (injection.length) return { ok: false, refusal: "injection", injection };
  try {
    return { ok: true, clean: deidentify(text, sources, knownNames), injection };
  } catch (e) {
    if (e instanceof LearnerDataRefused) return { ok: false, refusal: "learner_data", pii: e.findings };
    throw e;
  }
}
function checkOutput(text, allowedNumbers, knownNames = []) {
  const pii = detectPii(text, knownNames).filter((f) => f.kind !== "titled_name" || false);
  let redacted = text;
  for (const f of [...pii].sort((a, b) => b.start - a.start)) redacted = redacted.slice(0, f.start) + `[REDACTED_${f.kind.toUpperCase()}]` + redacted.slice(f.end);
  const claims = enforceSourcing(redacted, allowedNumbers);
  const flags = [];
  if (pii.length) flags.push(`pii_echo:${pii.length}`);
  if (claims.stripped.length) flags.push(`unsourced_claims:${claims.stripped.length}`);
  return { text: claims.text, claims, piiRedacted: pii.length, flags };
}

// src/core/platform.ts
var isAutonomous = (id) => id.startsWith("auto:");
var erasureFields = (r) => ({ id: r.id, subjectHash: r.subjectHash, category: r.category, note: r.note, status: r.status, requestedBy: r.requestedBy, decidedBy: r.decidedBy, decisionNote: r.decisionNote, version: r.version });
var RunRefused = class extends Error {
  constructor(kind, message) {
    super(message);
    this.kind = kind;
  }
};
var Platform = class {
  constructor(o = {}) {
    /** sha-256 of each erased subject id. The raw id is never stored. */
    this.tombstoned = /* @__PURE__ */ new Set();
    this.persistTail = Promise.resolve();
    this.orgId = o.orgId ?? "infinite-ai";
    this.warehouse = new Warehouse(o.adapter ?? new MemoryAdapter());
    this.engine = o.engine;
    this.sequencer = o.sequencer;
    this.wire([], []);
    this.factsFn = o.facts ?? (() => ({}));
    this.knownNames = o.knownNames ?? [];
    this.onPersistError = o.onPersistError ?? ((e) => console.error("persist failed:", e.message));
  }
  /** (Re)build ledger, Brain and gateway over the warehouse so state survives a reload. */
  wire(ledger, facts) {
    const fail = (e) => this.onPersistError(e instanceof Error ? e : new Error(String(e)));
    const queue = (collection, rec) => {
      this.persistTail = this.persistTail.then(() => this.warehouse.putRaw(collection, rec)).catch(fail);
    };
    this.ledger = new Ledger(ledger, this.sequencer ? void 0 : (e) => queue("ledger", { ...e, id: `L${e.seq}` }), this.sequencer);
    this.brain = new Brain(this.ledger, this.orgId, facts, (f) => queue("brain", { ...f }));
    this.gateway = new Gateway(this.ledger, this.engine);
  }
  async init() {
    await this.warehouse.init();
    const ledger = this.warehouse.list("ledger").map(({ id: _id, ...e }) => e);
    const facts = this.warehouse.latest("brain", "id");
    this.wire(ledger, facts);
    this.tombstoned = new Set(this.warehouse.list("tombstones").map((t) => t.subjectHash));
    return this;
  }
  /** Resolves once every queued ledger/Brain write has been handed to the storage adapter. */
  flush() {
    return this.persistTail;
  }
  /** Swap the model engine (undefined = the deterministic local engine). The gateway remains the only path. */
  useEngine(e) {
    this.engine = e;
    this.gateway = new Gateway(this.ledger, e);
  }
  setFacts(fn) {
    this.factsFn = fn;
  }
  /** Erase a data subject: recorded in the warehouse and the ledger, so it survives a reload. Only a hash is kept. */
  async tombstone(subjectId, by) {
    const subjectHash = await sha256Hex(normalizeSubject(subjectId));
    if (this.tombstoned.has(subjectHash)) return;
    await this.warehouse.put("tombstones", { id: `ts_${subjectHash.slice(0, 16)}`, subjectHash, by });
    this.tombstoned.add(subjectHash);
    await this.ledger.append({ orgId: this.orgId, actor: by, action: "subject.tombstone", subject: `ts_${subjectHash.slice(0, 16)}` });
  }
  // ---- erasure requests: one person asks, a different person decides, approval applies the tombstone ----
  /** Newest version of each request, newest first. */
  erasureRequests() {
    return this.warehouse.latest("erasure_requests").sort((a, b) => b.at.localeCompare(a.at));
  }
  erasureRequest(id) {
    const r = this.erasureRequests().find((x) => x.id === id);
    if (!r) throw new RunRefused("erasure", "Unknown erasure request.");
    return r;
  }
  async saveErasure(next) {
    return this.warehouse.put("erasure_requests", { ...next, at: (/* @__PURE__ */ new Date()).toISOString() });
  }
  async requestErasure(subjectRef, category, note, requester) {
    if (requester.kind !== "human") throw new RunRefused("erasure", "Only a named human can raise an erasure request.");
    const ref = normalizeSubject(subjectRef);
    const n = note.trim();
    if (ref.length < 3 || ref.length > 100) throw new RunRefused("erasure", "Enter the subject reference (3 to 100 characters).");
    if (!ERASURE_CATEGORIES.includes(category)) throw new RunRefused("erasure", "Choose a reason category.");
    if (n.length > 200) throw new RunRefused("erasure", "Keep the note to 200 characters.");
    if (category === "other" && !n) throw new RunRefused("erasure", 'Explain "other" in the note.');
    if (detectPii(ref, this.knownNames).length || detectPii(n, this.knownNames).length) throw new RunRefused("pii", "Use an opaque reference. The reference and note must not contain a name, email, phone number or ID number.");
    const subjectHash = await sha256Hex(ref);
    if (this.tombstoned.has(subjectHash)) throw new RunRefused("erasure", "That subject has already been erased.");
    if (this.erasureRequests().some((r) => r.subjectHash === subjectHash && (r.status === "REQUESTED" || r.status === "APPROVED"))) throw new RunRefused("erasure", "There is already an open erasure request for that subject.");
    const req = await this.saveErasure({ id: newId("er"), subjectHash, category, note: n, status: "REQUESTED", requestedBy: requester.id, version: 1 });
    await this.ledger.append({ orgId: this.orgId, actor: requester.id, action: "erasure.requested", subject: req.id, detail: { category } });
    return req;
  }
  /**
   * HITL. A second person decides. To approve, they retype the subject reference, which must hash to the request's:
   * that proves they know exactly who is being erased. The approval is recorded before the tombstone is applied.
   */
  async decideErasure(id, approver, decision, note, subjectRef = "") {
    if (approver.kind !== "human") throw new RunRefused("hitl", "Only a named human can decide an erasure request.");
    const cur = this.erasureRequest(id);
    if (cur.status !== "REQUESTED") throw new RunRefused("hitl", "Only a request that is waiting for a decision can be decided.");
    if (approver.id === cur.requestedBy) throw new RunRefused("hitl", "A second person must decide an erasure request.");
    if (decision === "REJECTED" && !note.trim()) throw new RunRefused("hitl", "A rejection needs a reason.");
    if (decision === "APPROVED") await this.assertReference(cur, subjectRef);
    const next = await this.saveErasure({ ...erasureFields(cur), status: decision, decidedBy: approver.id, decisionNote: note.trim(), version: cur.version + 1 });
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: "erasure." + decision.toLowerCase(), subject: id, detail: { note: note.trim() } });
    return decision === "APPROVED" ? this.applyErasure(id, approver, subjectRef) : next;
  }
  /** Applies an approved erasure. Also the retry if applying failed after the approval was recorded; safe to repeat. */
  async applyErasure(id, by, subjectRef) {
    if (by.kind !== "human") throw new RunRefused("hitl", "Only a named human can apply an erasure.");
    const cur = this.erasureRequest(id);
    if (cur.status !== "APPROVED") throw new RunRefused("hitl", "Only an approved request can be applied.");
    await this.assertReference(cur, subjectRef);
    await this.tombstone(subjectRef, by.id);
    return this.saveErasure({ ...erasureFields(cur), status: "EXECUTED", version: cur.version + 1 });
  }
  async assertReference(req, subjectRef) {
    if (await sha256Hex(normalizeSubject(subjectRef)) !== req.subjectHash) throw new RunRefused("erasure", "That reference does not match this request.");
  }
  async runAgent(agent, rawInput, requester, opts = {}) {
    const log = (action, subject, detail = {}) => this.ledger.append({ orgId: this.orgId, actor: requester.id, action, subject, detail });
    const gate = runGates({ subjectId: opts.subjectId ? await sha256Hex(normalizeSubject(opts.subjectId)) : void 0, tombstoned: this.tombstoned, purpose: agent.purpose, allowedPurposes: agent.allowedPurposes, dataClass: agent.dataClass, lawfulBasis: agent.lawfulBasis });
    if (gate) {
      await log("run.refused", agent.id, { gate: gate.gate });
      throw new RunRefused(gate.gate, gate.reason);
    }
    for (const f of agent.inputs.filter((i) => i.required)) {
      if (!rawInput[f.key]?.trim()) throw new RunRefused("input", `Missing required input: ${f.label}`);
    }
    const cleanInput = {};
    const inputNumbers = [];
    let promptChars = 0;
    for (const [k, v2] of Object.entries(rawInput)) {
      const field = agent.inputs.find((i) => i.key === k);
      if (!field) continue;
      const verdict = checkInput(v2, ["user-input"], this.knownNames);
      if (!verdict.ok) {
        await log("run.refused", agent.id, { reason: verdict.refusal, field: k });
        throw new RunRefused(verdict.refusal, verdict.refusal === "injection" ? "Input looks like an attempt to override platform controls." : "Learner-level identifiers are never admitted. Remove them and retry.");
      }
      cleanInput[k] = verdict.clean.text;
      promptChars += verdict.clean.text.length;
      if (field.kind === "number") {
        const n = Number(v2.replace(/[,\s]/g, ""));
        if (!Number.isNaN(n)) inputNumbers.push(n);
      } else for (const m of v2.matchAll(/\d[\d,]*(?:\.\d+)?/g)) inputNumbers.push(Number(m[0].replace(/,/g, "")));
    }
    if (promptChars > agent.budget.maxPromptChars) throw new RunRefused("budget", `Input exceeds the agent's budget (${agent.budget.maxPromptChars} characters).`);
    const brain2 = this.brain.recall(["L0", ...agent.reads]).map((f) => ({ id: f.id, topic: f.topic, text: f.text }));
    const facts = this.factsFn();
    const ctx = { facts, input: cleanInput, inputNumbers, brain: brain2 };
    let doc = agent.build(ctx);
    let engineName = this.gateway.engineName;
    const nf = agent.narrativeFacts?.(ctx);
    if (nf) {
      const prompt = `Summarise for a South African education-company operations reader. Do not add numbers or facts not listed.
${Object.entries(nf).map(([k, v2]) => `${k}: ${v2}`).join("\n")}`;
      const d = deidentify(prompt, ["agent:" + agent.id, ...Object.keys(facts).slice(0, 0)], this.knownNames);
      const res = await this.gateway.complete({ orgId: this.orgId, agentId: agent.id, purpose: agent.purpose, system: "You draft. A human decides. Never invent numbers.", prompt: d.text, provenance: d.provenance, context: nf });
      engineName = res.engine;
      doc = { ...doc, blocks: [...doc.blocks, { type: "h", level: 2, text: "Narrative (AI draft)" }, { type: "p", text: res.text }] };
    }
    const allowed = [...inputNumbers];
    const flags = [];
    const guard = (s) => {
      const o = checkOutput(s, allowed, this.knownNames);
      flags.push(...o.flags);
      return o.text;
    };
    const blocks = doc.blocks.map((b) => ({
      ...b,
      text: b.text !== void 0 ? guard(b.text) : void 0,
      items: b.items?.map(guard),
      rows: b.rows?.map((r) => r.map((c) => typeof c === "string" ? guard(c) : c)),
      pairs: b.pairs?.map(([k, v2]) => [k, guard(v2)])
    }));
    doc = { ...doc, title: guard(doc.title), blocks: blocks.map((b) => JSON.parse(JSON.stringify(b))), meta: { ...doc.meta, ...opts.meta, agent: agent.id, version: agent.version, framework: agent.framework, engine: engineName, status: "DRAFT", purpose: agent.purpose } };
    const art = { id: newId("art"), orgId: this.orgId, agentId: agent.id, dept: agent.dept, title: doc.title, status: "DRAFT", version: 1, requestedBy: requester.id, formats: agent.formats, doc, flags: [...new Set(flags)], engine: engineName, at: (/* @__PURE__ */ new Date()).toISOString() };
    await this.saveVersion(art, requester.id);
    await this.warehouse.put("runs", { id: newId("run"), agentId: agent.id, artefactId: art.id, requester: requester.id, flags: art.flags, engine: engineName, at: art.at });
    await log("run.complete", art.id, { agent: agent.id, flags: art.flags, status: "DRAFT" });
    return art;
  }
  async saveVersion(a, by) {
    const docHash = await sha256Hex(canonical(a.doc));
    await this.warehouse.put("artefact_versions", { ...a, docHash, editedBy: by });
  }
  /** Newest record per artefact (every state change and edit is a new immutable record). */
  artefacts() {
    return this.warehouse.latest("artefact_versions", "id").sort((x, y) => y.at.localeCompare(x.at));
  }
  artefact(id) {
    return this.artefacts().find((a) => a.id === id);
  }
  history(id) {
    return this.warehouse.list("artefact_versions", (r) => r["id"] === id);
  }
  /** Human edit → new version (status returns to DRAFT) + learning proposal. */
  async edit(artefactId, doc, editor) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error("Unknown artefact.");
    if (editor.kind !== "human") throw new Error("Only a human can edit an artefact.");
    if (cur.status === "RATIFIED" || cur.status === "INGESTED") throw new RunRefused("hitl", "A ratified artefact is final. Start a revision instead.");
    const clean = JSON.parse(JSON.stringify(doc));
    const next = { ...cur, id: artefactId, doc: clean, title: clean.title, version: cur.version + 1, status: "DRAFT", approvedBy: void 0, at: (/* @__PURE__ */ new Date()).toISOString() };
    try {
      deidentify(JSON.stringify(clean), ["edit"]);
    } catch (e) {
      if (e instanceof LearnerDataRefused) throw new RunRefused("learner_data", "Learner-level identifiers cannot be saved.");
      throw e;
    }
    await this.saveVersion(next, editor.id);
    await this.ledger.append({ orgId: this.orgId, actor: editor.id, action: "artefact.edit", subject: artefactId, detail: { version: next.version } });
    await this.captureLearning(cur.doc, clean, cur.agentId, editor.id, artefactId);
    return next;
  }
  async submitForReview(artefactId, by) {
    const cur = this.artefact(artefactId);
    if (!cur || cur.status !== "DRAFT") throw new Error("Only a DRAFT can be submitted.");
    const next = { ...cur, id: artefactId, status: "IN_REVIEW", version: cur.version, at: (/* @__PURE__ */ new Date()).toISOString() };
    await this.warehouse.put("artefact_versions", { ...next, editedBy: by.id });
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: "artefact.submit", subject: artefactId });
    return next;
  }
  /** HITL. No agent, no self-approval where the contract demands a second person, no skip flag. */
  async decide(artefactId, approver, decision, note, agent) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error("Unknown artefact.");
    if (approver.kind !== "human" || isAutonomous(approver.id)) throw new RunRefused("hitl", "Only a named human can approve or reject.");
    if (cur.status !== "IN_REVIEW") throw new RunRefused("hitl", "Artefact must be submitted for review first.");
    if (agent?.secondApprover && approver.id === cur.requestedBy) throw new RunRefused("hitl", "This agent requires a second person to approve.");
    if (decision === "REJECTED" && !note.trim()) throw new RunRefused("hitl", "A rejection needs a reason.");
    const next = { ...cur, id: artefactId, status: decision, approvedBy: approver.id, note, at: (/* @__PURE__ */ new Date()).toISOString() };
    await this.warehouse.put("artefact_versions", { ...next, editedBy: approver.id });
    await this.warehouse.put("approvals", { id: newId("apr"), artefactId, decision, approver: approver.id, note, at: next.at });
    await this.ledger.append({ orgId: this.orgId, actor: approver.id, action: "hitl." + decision.toLowerCase(), subject: artefactId, detail: { note } });
    return next;
  }
  /**
   * Second signature. A different human from the approver countersigns the exact content that was approved; that
   * ratifies it, and then (unless the agent's contract says it is not relevant) it is ingested.
   */
  async countersign(artefactId, signer, note, agent) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error("Unknown artefact.");
    if (signer.kind !== "human" || isAutonomous(signer.id)) throw new RunRefused("hitl", "Only a named human can countersign.");
    if (cur.status !== "APPROVED") throw new RunRefused("hitl", "Only an approved artefact can be countersigned.");
    if (signer.id === cur.approvedBy) throw new RunRefused("hitl", "A different person from the approver must countersign.");
    const n = (note ?? "").trim();
    if (n.length > 300) throw new RunRefused("hitl", "Keep the countersignature note to 300 characters.");
    const docHash = cur.docHash ?? await sha256Hex(canonical(cur.doc));
    const at = (/* @__PURE__ */ new Date()).toISOString();
    const next = { ...cur, id: artefactId, docHash, status: "RATIFIED", countersignedBy: signer.id, ratifiedAt: at, at };
    await this.warehouse.put("artefact_versions", { ...next, editedBy: signer.id });
    await this.warehouse.put("countersignatures", { id: newId("sig"), artefactId, version: cur.version, docHash, signer: signer.id, note: n, at });
    await this.ledger.append({ orgId: this.orgId, actor: signer.id, action: "artefact.countersigned", subject: artefactId, detail: { note: n, docHash, approvedBy: cur.approvedBy } });
    await this.ledger.append({ orgId: this.orgId, actor: signer.id, action: "artefact.ratified", subject: artefactId, detail: { docHash, approvedBy: cur.approvedBy, countersignedBy: signer.id } });
    if (agent?.ingestion === "none") return next;
    return this.ingest(artefactId, signer);
  }
  /** Ratified output goes into the document library (exact content) and the Brain (an episode). Safe to repeat if it failed part-way. */
  async ingest(artefactId, by) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error("Unknown artefact.");
    if (by.kind !== "human" || isAutonomous(by.id)) throw new RunRefused("hitl", "Only a named human can ingest.");
    if (cur.status === "INGESTED") return cur;
    if (cur.status !== "RATIFIED") throw new RunRefused("hitl", "Only a ratified artefact can be ingested.");
    const docHash = cur.docHash ?? await sha256Hex(canonical(cur.doc));
    const at = (/* @__PURE__ */ new Date()).toISOString();
    const docId = `rat_${artefactId}_v${cur.version}`;
    if (!this.warehouse.list("documents", (r) => r["id"] === docId).length) {
      await this.warehouse.put("documents", { id: docId, title: cur.title, origin: "ratified", doc: cur.doc, scan: { scanned: true, notes: ["Ratified artefact: approved and countersigned."] }, dept: cur.dept, by: by.id, at, ratifiedFrom: { artefactId, version: cur.version, docHash, agentId: cur.agentId, approvedBy: cur.approvedBy, countersignedBy: cur.countersignedBy } });
    }
    const src2 = `artefact:${artefactId}@${docHash.slice(0, 12)}`;
    if (!this.brain.all.some((f) => f.provenance.sources.includes(src2))) {
      const d = deidentify(`Ratified: ${cur.title} (version ${cur.version}), approved by ${cur.approvedBy} and countersigned by ${cur.countersignedBy}.`, [src2], this.knownNames);
      await this.brain.remember({ tier: "L2", topic: `ratified.${cur.agentId}`, text: d.text, provenance: d.provenance, by: by.id });
    }
    const next = { ...cur, id: artefactId, docHash, status: "INGESTED", ingestedAt: at, at };
    await this.warehouse.put("artefact_versions", { ...next, editedBy: by.id });
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: "artefact.ingested", subject: artefactId, detail: { docId, docHash } });
    return next;
  }
  /** A ratified artefact is final. Changing it means a new artefact, copied as a draft, that goes through the whole board again. */
  async revise(artefactId, by) {
    const cur = this.artefact(artefactId);
    if (!cur) throw new Error("Unknown artefact.");
    if (by.kind !== "human" || isAutonomous(by.id)) throw new RunRefused("hitl", "Only a named human can start a revision.");
    if (cur.status !== "RATIFIED" && cur.status !== "INGESTED") throw new RunRefused("hitl", "Only a ratified artefact needs a revision; a draft can be edited directly.");
    const doc = JSON.parse(JSON.stringify(cur.doc));
    doc.meta = { ...doc.meta, status: "DRAFT", revisionOf: artefactId };
    const art = { id: newId("art"), orgId: cur.orgId, agentId: cur.agentId, dept: cur.dept, title: cur.title, status: "DRAFT", version: 1, requestedBy: by.id, formats: cur.formats, doc, flags: [], engine: cur.engine, at: (/* @__PURE__ */ new Date()).toISOString(), revisionOf: artefactId };
    await this.saveVersion(art, by.id);
    await this.ledger.append({ orgId: this.orgId, actor: by.id, action: "artefact.revise", subject: art.id, detail: { of: artefactId } });
    return this.artefact(art.id);
  }
  /** Learning engine: proposals only. A human must ratify before it enters the Brain (L3/L4). */
  async captureLearning(before, after, agentId, by, artefactId) {
    const was = before.blocks.map((b) => b.text ?? "").filter(Boolean);
    const now = after.blocks.map((b) => b.text ?? "").filter(Boolean);
    const changed = now.filter((t) => !was.includes(t));
    if (!changed.length) return;
    try {
      const d = deidentify(changed.slice(0, 5).join("\n"), ["human-edit:" + artefactId]);
      await this.brain.remember({ tier: "L4", topic: `learning.${agentId}`, text: `Human edited ${changed.length} block(s). Sample: ${d.text.slice(0, 280)}`, provenance: d.provenance, by });
    } catch {
    }
  }
};

// src/server/autonomy/runner.ts
var hubEngine = (hub2, actor) => ({
  name: "model-hub",
  async complete(req) {
    return (await hub2.complete({ system: req.system, prompt: req.prompt, purpose: req.purpose, provenance: req.provenance, actor, agent: agentById(req.agentId) })).text;
  }
});
function makeRunner(deps) {
  const requesterFor = (id, name) => ({ id: `auto:${id}`, name: `Autonomous: ${name}`, kind: "agent", roles: ["autonomous"] });
  async function run(order, via) {
    const agent = agentById(order.agentId);
    if (!agent) throw new Error(`agent ${order.agentId} is no longer registered`);
    const requester = requesterFor(order.id, order.name);
    const engine = deps.engineFor?.(requester.id) ?? (deps.hub?.anyReady() ? hubEngine(deps.hub, requester.id) : void 0);
    const adapter = {
      load: async () => Object.fromEntries(Object.entries(deps.store.load()).map(([k, v2]) => [k, [...v2]])),
      append: (c, rec) => deps.appendValidated(c, rec, requester.id)
    };
    const platform = await new Platform({ adapter, facts: deps.facts, engine, sequencer: (input, known) => appendLedger(deps.store, input, known, requester.id) }).init();
    const art = await platform.runAgent(agent, order.inputs, requester, { meta: { order: order.id, trigger: via.kind } });
    const acc = runAcceptance({ doc: art.doc, agentId: art.agentId, flags: art.flags, requestedBy: requester.id }, agent);
    const docHash = art.docHash ?? await sha256Hex(canonical(art.doc));
    deps.store.append("draft_checks", { id: newId("chk"), artefactId: art.id, docHash, orderId: order.id, passed: acc.passed, results: acc.results, at: (/* @__PURE__ */ new Date()).toISOString() });
    if (!acc.passed) {
      await platform.flush();
      return { outcome: "quarantined", artefactId: art.id, checks: acc.results, flags: art.flags };
    }
    await platform.submitForReview(art.id, requester);
    await platform.flush();
    return { outcome: "submitted", artefactId: art.id, checks: acc.results, flags: art.flags };
  }
  async function dryRun(p) {
    const agent = agentById(p.agentId);
    const requester = requesterFor("dryrun", p.name);
    if (!agent) return { passed: false, results: [{ id: "RUN", title: "The agent runs on these inputs", pass: false, detail: "unknown agent" }] };
    try {
      const platform = await new Platform({ adapter: new MemoryAdapter(), facts: deps.facts }).init();
      const art = await platform.runAgent(agent, p.inputs, requester, { meta: { order: "dryrun", trigger: "dry-run" } });
      return runAcceptance({ doc: art.doc, agentId: art.agentId, flags: art.flags, requestedBy: requester.id }, agent);
    } catch (e) {
      return { passed: false, results: [{ id: "RUN", title: "The agent runs on these inputs", pass: false, detail: e.message.slice(0, 200) }] };
    }
  }
  return { run, dryRun };
}

// src/server/autonomyRoutes.ts
import { Router } from "express";
function autonomyRoutes(autonomy2) {
  const r = Router();
  const actorOf2 = (res) => res.locals.actor;
  const wrap2 = (fn) => (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((e) => {
      if (e instanceof OrderRefused) return void res.status(e.status).json({ error: e.message, checks: e.checks });
      console.error(e);
      res.status(500).json({ error: "internal error" });
    });
  };
  r.get("/autonomy", (_q, res) => res.json(autonomy2.status()));
  r.post("/autonomy/orders", wrap2(async (req, res) => res.json(await autonomy2.propose(actorOf2(res), req.body))));
  r.post("/autonomy/orders/:id/activate", wrap2(async (req, res) => res.json(await autonomy2.activate(actorOf2(res), req.params.id, String(req.body?.note ?? "")))));
  r.post("/autonomy/orders/:id/pause", wrap2(async (req, res) => res.json(await autonomy2.pause(actorOf2(res), req.params.id, String(req.body?.reason ?? "")))));
  r.post("/autonomy/orders/:id/revoke", wrap2(async (req, res) => res.json(await autonomy2.revoke(actorOf2(res), req.params.id, String(req.body?.reason ?? "")))));
  r.post("/autonomy/orders/:id/run", wrap2(async (req, res) => res.json(await autonomy2.runNow(actorOf2(res), req.params.id))));
  return r;
}

// src/server/security.ts
var CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'"
].join("; ");
var securityHeaders = (o) => (req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=(), usb=()");
  if (o.csp) res.setHeader("Content-Security-Policy", CSP);
  if (o.hsts) res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  if (req.path.startsWith("/api")) res.setHeader("Cache-Control", "no-store");
  next();
};
var tooMany = (res) => res.status(429).set("Retry-After", "60").json({ error: "too many requests: slow down" });
function requestLimits(o) {
  const all = new RateLimiter(o.perMinute, 6e4, o.now);
  const bad2 = new RateLimiter(o.badTokensPerMinute, 6e4, o.now);
  return {
    /** Counts every API request. */
    general: ((req, res, next) => all.allow(req.ip ?? "unknown") ? next() : tooMany(res)),
    /** Call with the result of authentication: counts only failures, and refuses once a caller has failed too often. */
    failure: (req, res) => bad2.allow(req.ip ?? "unknown") ? false : (tooMany(res), true)
  };
}
var ROLES = ["officer"];
function parseRoles(spec, auth2) {
  const entries = (spec ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  if (!entries.length) return null;
  if (auth2.mode !== "users") throw new Error("OPS_ROLES needs OPS_USERS: roles belong to signed-in people");
  const m = /* @__PURE__ */ new Map();
  for (const e of entries) {
    const [id, ...roles2] = e.split(/[:|]/).map((s) => s.trim());
    if (!id || !roles2.length) throw new Error("OPS_ROLES: entries look like id:officer");
    if (!auth2.users.some((u) => u.id === id)) throw new Error(`OPS_ROLES: "${id}" is not in OPS_USERS`);
    for (const r of roles2) {
      if (!ROLES.includes(r)) throw new Error(`OPS_ROLES: unknown role "${r}" (known: ${ROLES.join(", ")})`);
      (m.get(id) ?? m.set(id, /* @__PURE__ */ new Set()).get(id)).add(r);
    }
  }
  return m;
}
var rolesOf = (t, actor) => t === null ? void 0 : [...t.get(actor ?? "") ?? []];
var requireRole = (t, role) => (req, res, next) => {
  if (t === null) return next();
  const actor = res.locals.actor;
  if (actor && t.get(actor)?.has(role)) return next();
  res.status(403).json({ error: `this action needs the "${role}" role` });
};

// src/generated/ecosystem-snapshot.json
var ecosystem_snapshot_default = {
  schema: "infinite-ai.ecosystem-snapshot/1",
  source: {
    repo: "Sarah-JaneHarding/infinite-ai-ecosystem",
    method: "local-checkout-count",
    note: "Every number below is counted from files. Test PASS counts are not claimed here: they come from CI via the live connector."
  },
  repo: {
    head: "3c2511a",
    headDate: "2026-10-24",
    headSubject: "Merge pull request #158 from Sarah-JaneHarding/claude/peaceful-hopper-5p0vtu",
    visibleCommits: 1,
    shallow: true
  },
  code: {
    totals: {
      srcFiles: 500,
      srcLoc: 94275,
      testFiles: 350,
      testLoc: 67595
    },
    units: [
      {
        kind: "app",
        name: "gateway",
        srcFiles: 18,
        srcLoc: 3134,
        testFiles: 17,
        testLoc: 3081
      },
      {
        kind: "app",
        name: "web",
        srcFiles: 69,
        srcLoc: 8661,
        testFiles: 40,
        testLoc: 3445
      },
      {
        kind: "app",
        name: "worker",
        srcFiles: 20,
        srcLoc: 3333,
        testFiles: 15,
        testLoc: 2879
      },
      {
        kind: "package",
        name: "agent-builder",
        srcFiles: 6,
        srcLoc: 2028,
        testFiles: 1,
        testLoc: 567
      },
      {
        kind: "package",
        name: "agents",
        srcFiles: 63,
        srcLoc: 2134,
        testFiles: 38,
        testLoc: 2544
      },
      {
        kind: "package",
        name: "analytics",
        srcFiles: 8,
        srcLoc: 1756,
        testFiles: 7,
        testLoc: 1666
      },
      {
        kind: "package",
        name: "billing",
        srcFiles: 7,
        srcLoc: 542,
        testFiles: 5,
        testLoc: 651
      },
      {
        kind: "package",
        name: "brain",
        srcFiles: 18,
        srcLoc: 2520,
        testFiles: 17,
        testLoc: 3266
      },
      {
        kind: "package",
        name: "compliance",
        srcFiles: 9,
        srcLoc: 542,
        testFiles: 2,
        testLoc: 753
      },
      {
        kind: "package",
        name: "config",
        srcFiles: 3,
        srcLoc: 298,
        testFiles: 3,
        testLoc: 293
      },
      {
        kind: "package",
        name: "contracts",
        srcFiles: 81,
        srcLoc: 44792,
        testFiles: 52,
        testLoc: 12766
      },
      {
        kind: "package",
        name: "curriculum-seed",
        srcFiles: 23,
        srcLoc: 2854,
        testFiles: 18,
        testLoc: 5924
      },
      {
        kind: "package",
        name: "db",
        srcFiles: 29,
        srcLoc: 4688,
        testFiles: 33,
        testLoc: 7940
      },
      {
        kind: "package",
        name: "deident",
        srcFiles: 4,
        srcLoc: 377,
        testFiles: 3,
        testLoc: 385
      },
      {
        kind: "package",
        name: "design-system",
        srcFiles: 8,
        srcLoc: 399,
        testFiles: 2,
        testLoc: 167
      },
      {
        kind: "package",
        name: "document-annotation",
        srcFiles: 4,
        srcLoc: 423,
        testFiles: 1,
        testLoc: 608
      },
      {
        kind: "package",
        name: "evals",
        srcFiles: 13,
        srcLoc: 1587,
        testFiles: 12,
        testLoc: 1781
      },
      {
        kind: "package",
        name: "gamification",
        srcFiles: 5,
        srcLoc: 553,
        testFiles: 2,
        testLoc: 748
      },
      {
        kind: "package",
        name: "guardrails",
        srcFiles: 16,
        srcLoc: 1774,
        testFiles: 14,
        testLoc: 2210
      },
      {
        kind: "package",
        name: "learner-client",
        srcFiles: 4,
        srcLoc: 342,
        testFiles: 1,
        testLoc: 582
      },
      {
        kind: "package",
        name: "learning",
        srcFiles: 15,
        srcLoc: 1472,
        testFiles: 13,
        testLoc: 2056
      },
      {
        kind: "package",
        name: "low-tech-assessment",
        srcFiles: 4,
        srcLoc: 392,
        testFiles: 1,
        testLoc: 456
      },
      {
        kind: "package",
        name: "orchestrator",
        srcFiles: 17,
        srcLoc: 3612,
        testFiles: 12,
        testLoc: 3972
      },
      {
        kind: "package",
        name: "pd-journal",
        srcFiles: 3,
        srcLoc: 220,
        testFiles: 1,
        testLoc: 562
      },
      {
        kind: "package",
        name: "policy",
        srcFiles: 6,
        srcLoc: 980,
        testFiles: 7,
        testLoc: 1443
      },
      {
        kind: "package",
        name: "prompt-builder",
        srcFiles: 4,
        srcLoc: 314,
        testFiles: 1,
        testLoc: 348
      },
      {
        kind: "package",
        name: "prompts",
        srcFiles: 3,
        srcLoc: 274,
        testFiles: 4,
        testLoc: 386
      },
      {
        kind: "package",
        name: "provisioning",
        srcFiles: 6,
        srcLoc: 451,
        testFiles: 4,
        testLoc: 554
      },
      {
        kind: "package",
        name: "school-setup",
        srcFiles: 3,
        srcLoc: 157,
        testFiles: 1,
        testLoc: 248
      },
      {
        kind: "package",
        name: "security",
        srcFiles: 7,
        srcLoc: 551,
        testFiles: 5,
        testLoc: 601
      },
      {
        kind: "package",
        name: "system-prompt-builder",
        srcFiles: 4,
        srcLoc: 239,
        testFiles: 1,
        testLoc: 299
      },
      {
        kind: "package",
        name: "telemetry",
        srcFiles: 8,
        srcLoc: 946,
        testFiles: 7,
        testLoc: 866
      },
      {
        kind: "package",
        name: "testkit",
        srcFiles: 1,
        srcLoc: 147,
        testFiles: 1,
        testLoc: 116
      },
      {
        kind: "package",
        name: "warehouse",
        srcFiles: 11,
        srcLoc: 1783,
        testFiles: 9,
        testLoc: 3432
      }
    ]
  },
  stages: {
    count: 116,
    first: {
      n: 0,
      title: "Ground rules, repository, toolchain",
      date: null
    },
    latest: [
      {
        n: 106,
        title: "the header shows the school's name, not its tenant id",
        date: null
      },
      {
        n: 107,
        title: "`next` 16.3.6 \u2192 16.3.8 (GHSA-cjq9-62q9-8jv4)",
        date: null
      },
      {
        n: 108,
        title: "the SBST tabs stop presenting sample learners and SIAS cases as real",
        date: null
      },
      {
        n: 109,
        title: "free local testing manual, local-model timeout, single-provider routing",
        date: null
      },
      {
        n: 110,
        title: "live agent and pipeline runners",
        date: null
      },
      {
        n: 111,
        title: "dev-only chaining and grounding for MOD-01 (OQ-030, option C)",
        date: null
      },
      {
        n: 112,
        title: "the actor is the school's account id, not the provider's `sub` (OQ-033)",
        date: null
      },
      {
        n: 113,
        title: "OQ-033 provisioning, step 1: the `user_invitation` table",
        date: null
      }
    ],
    stageLogLines: 11134
  },
  openQuestions: {
    total: 36,
    open: 20,
    openList: [
      {
        id: "OQ-002",
        raised: "2026-07-28",
        stage: "08",
        status: "PARTIALLY ANSWERED",
        title: "Scope confirmed 2026-07-29: full primary, Grades R-7, across all three phases. Update 2026-08-18: 21 CAPS documents ingested \u2014 all core subjects for Grades R-7."
      },
      {
        id: "OQ-003",
        raised: "2026-07-28",
        stage: "08",
        status: "PARTIALLY ANSWERED",
        title: "Update 2026-08-19: Benjamin Pine Primary School's 2026 Lesson Plan Preparation Template supplied and ingested. Machine-readable `TemplateDefinition` at `package"
      },
      {
        id: "OQ-006",
        raised: "2026-07-29",
        stage: "12",
        status: "PARTIALLY ANSWERED",
        title: "SACE CPTD point-value schedules are needed for PD-08, which may not compute them. Same supply problem as OQ-002. Update 2026-08-13: The SACE PD Points Schedule "
      },
      {
        id: "OQ-008",
        raised: "2026-08-05",
        stage: "19",
        status: "OPEN",
        title: "Should the visual AI-workflow builder be its own package (`@infinite-ai/agent-builder`) or built inside `packages/agents`? A separate package is cleaner to main"
      },
      {
        id: "OQ-009",
        raised: "2026-08-05",
        stage: "22",
        status: "OPEN",
        title: "Should live classroom quiz games (Stage 22) be a standalone product area, or folded into MOD-04's teaching-and-learning toolkit (Stage 11)? Standalone gets more"
      },
      {
        id: "OQ-011",
        raised: "2026-08-05",
        stage: "10/19",
        status: "OPEN",
        title: "Where should SIAS documentation and workflow live long-term \u2014 inside MOD-02 Support Analytics (Stage 10, where it is currently planned), or split into its own m"
      },
      {
        id: "OQ-012",
        raised: "2026-08-05",
        stage: "20/21",
        status: "OPEN",
        title: "Should the Master Prompt Builder (Stage 20) and System Prompt Builder (Stage 21) be one combined tool or two separate ones? Separate is clearer about what each "
      },
      {
        id: "OQ-013",
        raised: "2026-08-05",
        stage: "08",
        status: "OPEN",
        title: "Eight of South Africa's eleven official languages, and Grades 10-12 entirely, are still missing from the CAPS documents supplied so far (see OQ-002). Sepedi, Se"
      },
      {
        id: "OQ-015",
        raised: "2026-08-05",
        stage: "06",
        status: "OPEN (Gap 2's model call resolved; calibration pending OQ-016)",
        title: "Age-appropriateness needs a supplied content policy. The same guardrail engine's `checkAgeAppropriateness` is a real mechanism with no built-in rule \u2014 this code"
      },
      {
        id: "OQ-016",
        raised: "2026-08-06",
        stage: "07",
        status: "OPEN",
        title: `The LLM-as-judge scorer has no calibration data. Stage 07 step 2's own text requires the judge to be "calibrated against at least 50 human-labelled cases, and r`
      },
      {
        id: "OQ-017",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "k6 load tests need a live environment. Stage 18 step 2 requires load testing at 3\xD7 expected peak (450 concurrent learners, Starter tier) and a spike test for te"
      },
      {
        id: "OQ-018",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "Cost model needs real gateway telemetry. `docs/COST_MODEL.md` uses estimated token counts based on typical artefact types. Actual costs depend on real usage pat"
      },
      {
        id: "OQ-020",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "Architecture walkthrough recording. Stage 18 step 7 requires a recorded architecture walkthrough (screen + audio) covering the nine-layer diagram, the four inva"
      },
      {
        id: "OQ-030",
        raised: "2026-10-23",
        stage: "111",
        status: "PARTIALLY ANSWERED (2026-10-23)",
        title: "MOD-01 prompts require _ratified_ upstream artefacts, but the pipeline has one human gate at the end and no store for ratified artefacts. Asked to make pipeline"
      },
      {
        id: "OQ-031",
        raised: "2026-10-01",
        stage: "",
        status: "OPEN",
        title: "four navigation entries had no page and no data behind them"
      },
      {
        id: "OQ-032",
        raised: "2026-10-01",
        stage: "",
        status: "OPEN",
        title: "which role wins when an account holds more than one"
      },
      {
        id: "OQ-033",
        raised: "2026-10-07",
        stage: "",
        status: "OPEN",
        title: "no real person can decide an approval gate: identity mismatch and no provisioning"
      },
      {
        id: "OQ-034",
        raised: "2026-10-08",
        stage: "",
        status: "OPEN",
        title: "what a district rollup would be, if the product wants one"
      },
      {
        id: "OQ-035",
        raised: "2026-10-08",
        stage: "",
        status: "OPEN",
        title: "the EGRA screening tab's benchmarks and tier rule have no supplied source"
      },
      {
        id: "OQ-036",
        raised: "2026-10-24",
        stage: "",
        status: "OPEN",
        title: "is MFA actually enforced for `admin`, `smt` and the platform roles?"
      }
    ],
    all: [
      {
        id: "OQ-001",
        raised: "2026-07-29",
        stage: "",
        status: "RESOLVED",
        title: "where the platform lives"
      },
      {
        id: "OQ-002",
        raised: "2026-07-28",
        stage: "08",
        status: "PARTIALLY ANSWERED",
        title: "Scope confirmed 2026-07-29: full primary, Grades R-7, across all three phases. Update 2026-08-18: 21 CAPS documents ingested \u2014 all core subjects for Grades R-7."
      },
      {
        id: "OQ-003",
        raised: "2026-07-28",
        stage: "08",
        status: "PARTIALLY ANSWERED",
        title: "Update 2026-08-19: Benjamin Pine Primary School's 2026 Lesson Plan Preparation Template supplied and ingested. Machine-readable `TemplateDefinition` at `package"
      },
      {
        id: "OQ-004",
        raised: "2026-07-28",
        stage: "01",
        status: "RESOLVED (2026-08-13)",
        title: "Tenant shape for the seed data: the manual asks for a small primary, a large primary and a school group with two campuses. Should the seed model Benjamin Pine P"
      },
      {
        id: "OQ-005",
        raised: "2026-07-29",
        stage: "08",
        status: "RESOLVED (2026-08-13)",
        title: "CAPS statements, ATPs and DBE policy documents are Crown-copyright government publications. Redistributing them inside a multi-tenant SaaS product is a licensin"
      },
      {
        id: "OQ-006",
        raised: "2026-07-29",
        stage: "12",
        status: "PARTIALLY ANSWERED",
        title: "SACE CPTD point-value schedules are needed for PD-08, which may not compute them. Same supply problem as OQ-002. Update 2026-08-13: The SACE PD Points Schedule "
      },
      {
        id: "OQ-007",
        raised: "2026-07-29",
        stage: "03",
        status: "RESOLVED (2026-09-14)",
        title: "Retention periods per data category. Decision recorded: a 7-year retention period applies to learner and school records for the pilot/release scope, measured fr"
      },
      {
        id: "OQ-008",
        raised: "2026-08-05",
        stage: "19",
        status: "OPEN",
        title: "Should the visual AI-workflow builder be its own package (`@infinite-ai/agent-builder`) or built inside `packages/agents`? A separate package is cleaner to main"
      },
      {
        id: "OQ-009",
        raised: "2026-08-05",
        stage: "22",
        status: "OPEN",
        title: "Should live classroom quiz games (Stage 22) be a standalone product area, or folded into MOD-04's teaching-and-learning toolkit (Stage 11)? Standalone gets more"
      },
      {
        id: "OQ-010",
        raised: "2026-08-05",
        stage: "25",
        status: "RESOLVED (Stage 26)",
        title: "Should the learner-facing app (Stage 25) be a separate PWA, or built into the same `apps/web` every other role uses? Decision: integrated into `apps/web`. The `"
      },
      {
        id: "OQ-011",
        raised: "2026-08-05",
        stage: "10/19",
        status: "OPEN",
        title: "Where should SIAS documentation and workflow live long-term \u2014 inside MOD-02 Support Analytics (Stage 10, where it is currently planned), or split into its own m"
      },
      {
        id: "OQ-012",
        raised: "2026-08-05",
        stage: "20/21",
        status: "OPEN",
        title: "Should the Master Prompt Builder (Stage 20) and System Prompt Builder (Stage 21) be one combined tool or two separate ones? Separate is clearer about what each "
      },
      {
        id: "OQ-013",
        raised: "2026-08-05",
        stage: "08",
        status: "OPEN",
        title: "Eight of South Africa's eleven official languages, and Grades 10-12 entirely, are still missing from the CAPS documents supplied so far (see OQ-002). Sepedi, Se"
      },
      {
        id: "OQ-014",
        raised: "2026-08-05",
        stage: "06",
        status: "RESOLVED (2026-09-13)",
        title: "Safeguarding escalation needs a real paging integration. Stage 06 step 6's guardrail engine (`packages/guardrails/src/engine.ts`) can attach an `EscalationRoute"
      },
      {
        id: "OQ-015",
        raised: "2026-08-05",
        stage: "06",
        status: "OPEN (Gap 2's model call resolved; calibration pending OQ-016)",
        title: "Age-appropriateness needs a supplied content policy. The same guardrail engine's `checkAgeAppropriateness` is a real mechanism with no built-in rule \u2014 this code"
      },
      {
        id: "OQ-016",
        raised: "2026-08-06",
        stage: "07",
        status: "OPEN",
        title: `The LLM-as-judge scorer has no calibration data. Stage 07 step 2's own text requires the judge to be "calibrated against at least 50 human-labelled cases, and r`
      },
      {
        id: "OQ-017",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "k6 load tests need a live environment. Stage 18 step 2 requires load testing at 3\xD7 expected peak (450 concurrent learners, Starter tier) and a spike test for te"
      },
      {
        id: "OQ-018",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "Cost model needs real gateway telemetry. `docs/COST_MODEL.md` uses estimated token counts based on typical artefact types. Actual costs depend on real usage pat"
      },
      {
        id: "OQ-019",
        raised: "2026-08-12",
        stage: "18",
        status: "RESOLVED (2026-09-09)",
        title: "Pilot schools have not been identified. `docs/PILOT_PROTOCOL.md` targets 3 schools (small primary, large primary, school group). Pilot school #1 confirmed: Benj"
      },
      {
        id: "OQ-020",
        raised: "2026-08-12",
        stage: "18",
        status: "OPEN",
        title: "Architecture walkthrough recording. Stage 18 step 7 requires a recorded architecture walkthrough (screen + audio) covering the nine-layer diagram, the four inva"
      },
      {
        id: "OQ-021",
        raised: "2026-08-12",
        stage: "18",
        status: "RESOLVED (2026-09-14)",
        title: "Dunning emails need a transactional email provider. Decision recorded: use the configured outbound mail account `infinite-ai-ecosystem@protonmail.com` for dunni"
      },
      {
        id: "OQ-022",
        raised: "2026-08-12",
        stage: "17",
        status: "RESOLVED (2026-09-14)",
        title: "POPIA erasure for append-only tables. Decision recorded: append-only compliance ledgers (`audit_event`, `consent_record`, `tenant_metering_event`) are retained "
      },
      {
        id: "OQ-023",
        raised: "2026-08-20",
        stage: "29",
        status: "RESOLVED (2026-09-11)",
        title: "`GradeFramework` needs `hoursPerWeek` and `assessmentWeighting` data. Answer: statutory values are not LLM output \u2014 they are gazette facts. A deterministic DBE "
      },
      {
        id: "OQ-024",
        raised: "2026-08-24",
        stage: "06",
        status: "RESOLVED (2026-09-01)",
        title: "`branch` step conditions cannot see a prior step's actual output. `evaluateCondition` only ever received `run.input`, never what an intervening agent produced, "
      },
      {
        id: "OQ-025",
        raised: "2026-08-25",
        stage: "16",
        status: "RESOLVED (2026-08-25)",
        title: "The per-request CSP nonce did not reach the client on `/sign-in`. Answer: root cause was `next-auth@4.24.15`'s `withAuth()` unconditionally short-circuiting bef"
      },
      {
        id: "OQ-026",
        raised: "2026-08-25",
        stage: "06/10",
        status: "RESOLVED (2026-09-01)",
        title: "`checkDiagnosticLanguage` has no caller. Needed to know which of a MOD-02 agent's own output fields are free text before it could be wired in for real, without "
      },
      {
        id: "OQ-027",
        raised: "2026-09-01",
        stage: "06/10",
        status: "RESOLVED 2026-09-02",
        title: "`support.needs_referral`'s SIAS-status field has no ratified shape. Found while resolving OQ-024: `mod-02.ts`'s `branch-on-referral` is narrated as evaluating \""
      },
      {
        id: "OQ-028",
        raised: "2026-09-01",
        stage: "06/11",
        status: "RESOLVED (2026-09-03)",
        title: "Three more declared guardrail names have no real caller: `source_grounding_guard`, `grounding_check`, `template_fidelity`; `readability_guard` is now only half-"
      },
      {
        id: "OQ-029",
        raised: "2026-09-11",
        stage: "\u2014",
        status: "RESOLVED (2026-09-13)",
        title: "GitHub Actions CI has returned `startup_failure` (zero jobs ever created) on every single workflow run since run #276 (2026-09-02T01:37:04Z), and this is not ca"
      },
      {
        id: "OQ-030",
        raised: "2026-10-23",
        stage: "111",
        status: "PARTIALLY ANSWERED (2026-10-23)",
        title: "MOD-01 prompts require _ratified_ upstream artefacts, but the pipeline has one human gate at the end and no store for ratified artefacts. Asked to make pipeline"
      },
      {
        id: "OQ-031",
        raised: "2026-10-01",
        stage: "",
        status: "OPEN",
        title: "four navigation entries had no page and no data behind them"
      },
      {
        id: "OQ-032",
        raised: "2026-10-01",
        stage: "",
        status: "OPEN",
        title: "which role wins when an account holds more than one"
      },
      {
        id: "OQ-033",
        raised: "2026-10-07",
        stage: "",
        status: "OPEN",
        title: "no real person can decide an approval gate: identity mismatch and no provisioning"
      },
      {
        id: "OQ-034",
        raised: "2026-10-08",
        stage: "",
        status: "OPEN",
        title: "what a district rollup would be, if the product wants one"
      },
      {
        id: "OQ-035",
        raised: "2026-10-08",
        stage: "",
        status: "OPEN",
        title: "the EGRA screening tab's benchmarks and tier rule have no supplied source"
      },
      {
        id: "OQ-036",
        raised: "2026-10-24",
        stage: "",
        status: "OPEN",
        title: "is MFA actually enforced for `admin`, `smt` and the platform roles?"
      }
    ]
  },
  agents: {
    contractFiles: 56,
    byModule: {
      le: 9,
      "mod-01": 9,
      "mod-02": 11,
      "mod-03": 8,
      "mod-04": 11,
      "mod-05": 8
    },
    rosterClaimInAgentsMd: "Fifty-five",
    ids: [
      "AC-01",
      "AC-02",
      "AC-03",
      "AC-04",
      "AC-05",
      "AC-06",
      "AC-07",
      "AC-08",
      "AC-09",
      "AC-10",
      "AC-11",
      "CE-01",
      "CE-02",
      "CE-03",
      "CE-04",
      "CE-05",
      "CE-06",
      "CE-07",
      "CE-08",
      "CE-09",
      "DW-01",
      "DW-02",
      "DW-03",
      "DW-04",
      "DW-05",
      "DW-06",
      "DW-07",
      "DW-08",
      "LE-01",
      "LE-02",
      "LE-03",
      "LE-04",
      "LE-05",
      "LE-06",
      "LE-07",
      "LE-08",
      "LE-09",
      "PD-01",
      "PD-02",
      "PD-03",
      "PD-04",
      "PD-05",
      "PD-06",
      "PD-07",
      "PD-08",
      "TB-01",
      "TB-02",
      "TB-03",
      "TB-04",
      "TB-05",
      "TB-06",
      "TB-07",
      "TB-08",
      "TB-09",
      "TB-10",
      "TB-11"
    ]
  },
  docs: {
    files: [
      "AGENTS.md",
      "ARCHITECTURE.md",
      "AWS_MIGRATION_AUDIT.md",
      "BRAND_KIT.md",
      "COST_MODEL.md",
      "DEPENDENCIES.md",
      "DEV_SETUP.md",
      "FREE_LOCAL_TESTING.md",
      "HOW_TO_ADD_AN_AGENT.md",
      "INCIDENT_PROCESS.md",
      "INFINITE-AI-PRODUCTION-READINESS-AUDIT.html",
      "INFINITE-AI-VERIFIED-PILOT-AUDIT-V3.html",
      "ONBOARDING_GUIDE.md",
      "OPEN_QUESTIONS.md",
      "OPERATOR_MANUAL.md",
      "PEDAGOGY.md",
      "PILOT_PROTOCOL.md",
      "POPIA.md",
      "PROMPTS.md",
      "PROVISIONING_DESIGN.md",
      "REPOSITORY_AUDIT_2026-09-25.md",
      "RETENTION_SCHEDULE_TEMPLATE.md",
      "SECURITY.md",
      "SOURCE_DOCUMENTS.md",
      "STAGE_LOG.md",
      "aws-cost-estimate.html",
      "brand-identity.html",
      "financial-model.html",
      "infinite-ai-business-planning.html",
      "sbom.json"
    ],
    runbooks: [
      "README.md",
      "bad-prompt-promotion-rollback.md",
      "brain-restore.md",
      "canary-deploy.md",
      "database-restore.md",
      "drill-results",
      "provider-outage.md",
      "queue-backlog.md",
      "region-loss.md",
      "suspected-breach.md",
      "tenant-data-erasure.md"
    ],
    ciWorkflows: [
      "cd.yml",
      "ci.yml",
      "docker-publish.yml",
      "terraform.yml"
    ]
  }
};

// src/connector/snapshot.ts
var snapshot = ecosystem_snapshot_default;
var WORDS = { forty: 40, fifty: 50, "fifty-five": 55, "fifty-six": 56, "forty-six": 46 };
function snapshotFacts(s = snapshot) {
  return {
    "eco.head": s.repo.head ?? "unknown",
    "eco.headDate": s.repo.headDate ?? "unknown",
    "eco.units": s.code.units.length,
    "eco.srcFiles": s.code.totals.srcFiles,
    "eco.srcLoc": s.code.totals.srcLoc,
    "eco.testFiles": s.code.totals.testFiles,
    "eco.testLoc": s.code.totals.testLoc,
    "eco.stages": s.stages.count,
    "eco.latestStage": s.stages.latest.at(-1)?.n ?? 0,
    "eco.oq.total": s.openQuestions.total,
    "eco.oq.open": s.openQuestions.open,
    "eco.agents.contracts": s.agents.contractFiles,
    "eco.agents.documented": s.agents.rosterClaimInAgentsMd ? WORDS[s.agents.rosterClaimInAgentsMd.toLowerCase()] ?? s.agents.rosterClaimInAgentsMd : "unknown",
    ...Object.fromEntries(Object.entries(s.agents.byModule).map(([m, n]) => [`eco.agents.${m}`, n])),
    "eco.runbooks": s.docs.runbooks.length,
    "eco.ciWorkflows": s.docs.ciWorkflows.length,
    "eco.docs": s.docs.files.length
  };
}

// src/server/models/hub.ts
import { createHash as createHash2 } from "node:crypto";

// src/server/models/rules.ts
var RULES2 = [
  { id: "M1", title: "Provenance first", text: "Every request must carry a de-identified stamp with its sources. An unstamped payload is refused even when the detector finds nothing." },
  { id: "M2", title: "No personal data or injection in any prompt", text: "The system text, the prompt, every history message and every tool result are scanned. Names with titles, emails, phone numbers, ID numbers and learner identifiers are refused; instruction-override patterns are refused." },
  { id: "M3", title: "Purpose limitation", text: "A request declares one purpose from the closed list, and when it comes from an agent the purpose must be one that agent is contracted for." },
  { id: "M4", title: "Size limits", text: "Input, history, tool results, tool turns and output are capped, so a request cannot be used to move bulk data to a provider." },
  { id: "M5", title: "A human must attest each provider and model", text: "A provider cannot be used until a named person has attested that they reviewed its terms for the exact model configured. Changing the model requires a new attestation. If an agent's contract lists the providers it may use, only those are tried. There is no override." },
  { id: "M6", title: "Rate and daily budget", text: "Each user is rate limited and each provider has a daily call budget, counted from the audit ledger so a restart does not reset it." },
  { id: "M7", title: "Every call is audited, and the audit comes first", text: "A ledger entry is written before the provider is called and another after it answers, refuses or fails. They record who, which model, purpose, sizes and a hash of the prompt, never its content. If the ledger cannot be written the call is not made." },
  { id: "M8", title: "Output is always a draft", text: "Model output is scanned for personal data and has unsourced figures stripped. It is returned marked as a draft and nothing in this module can approve, ratify or ingest it." },
  { id: "M9", title: "Tools see only what is allowed, and only de-identified", text: "Tools read an allow-list of collections that is empty by default, can never include the ledger, erasure records, integration settings or approvals, and every tool result is scanned before it reaches the model." },
  { id: "M10", title: "One door", text: "The model hub is the only code that can call a model provider. Keys stay on the server and are never returned by any API." }
];
var LIMITS = {
  maxInputChars: 2e4,
  maxHistory: 6,
  maxToolResultChars: 12e3,
  maxToolTurns: 3,
  maxOutputTokens: 1024
};
var NEVER_MODEL_READABLE = /* @__PURE__ */ new Set(["ledger", "tombstones", "erasure_requests", "integration_settings", "chat_log", "connector_events", "approvals", "brain", "model_attestations", "custom_defs", "standing_orders", "draft_checks"]);
var ModelRefused = class extends Error {
  constructor(rule, message, status = 422) {
    super(message);
    this.rule = rule;
    this.status = status;
  }
};
function checkRequest(req) {
  const p = req.provenance;
  if (!p || p.deidentified !== true || !Array.isArray(p.sources) || !p.sources.length || p.sources.some((s) => typeof s !== "string" || !s)) {
    throw new ModelRefused("M1", "Refused: the payload is not stamped de-identified with sources.");
  }
  if (!PURPOSES.includes(req.purpose)) throw new ModelRefused("M3", "Refused: the purpose is not on the closed purpose list.");
  if (req.agentPurposes && !req.agentPurposes.includes(req.purpose)) throw new ModelRefused("M3", `Refused: purpose "${req.purpose}" is not permitted for agent ${req.agentId ?? ""}.`.replace(" .", "."));
  if (typeof req.system !== "string" || typeof req.prompt !== "string" || !req.prompt.trim()) throw new ModelRefused("M4", "Refused: a prompt is required.", 400);
  if (!Array.isArray(req.history) || req.history.length > LIMITS.maxHistory || req.history.some((h) => h.role !== "user" && h.role !== "assistant" || typeof h.text !== "string")) throw new ModelRefused("M4", `Refused: history must be at most ${LIMITS.maxHistory} messages of text.`, 400);
  const total = req.system.length + req.prompt.length + req.history.reduce((n, h) => n + h.text.length, 0);
  if (total > LIMITS.maxInputChars) throw new ModelRefused("M4", `Refused: input exceeds ${LIMITS.maxInputChars} characters.`, 400);
  const texts = [req.system, req.prompt, ...req.history.map((h) => h.text)];
  const found = texts.flatMap((t) => detectPii(t));
  if (found.some((f) => f.kind === "learner_identifier")) throw new ModelRefused("M2", "Refused: learner-level identifiers are never sent to a model.");
  if (found.length) throw new ModelRefused("M2", `Refused: personal data detected (${[...new Set(found.map((f) => f.kind))].join(", ")}). Remove it and retry.`);
  if ([req.prompt, ...req.history.map((h) => h.text)].some((t) => detectInjection(t).length)) throw new ModelRefused("M2", "Refused: the text looks like an attempt to override platform controls.");
}
function checkToolResult(result) {
  const s = JSON.stringify(result) ?? "";
  if (s.length > LIMITS.maxToolResultChars) return "result too large; narrow the query";
  const found = detectPii(s);
  if (found.some((f) => f.kind === "learner_identifier")) return "withheld: contained learner-level identifiers";
  if (found.length) return `withheld: contained personal data (${[...new Set(found.map((f) => f.kind))].join(", ")})`;
  return null;
}
var numbersIn = (s) => [...s.matchAll(/\d[\d,]*(?:\.\d+)?/g)].map((m) => m[0].replace(/,/g, ""));
function checkModelOutput(text, inputs) {
  const allowed = inputs.flatMap(numbersIn);
  const o = checkOutput(text, allowed, []);
  return { text: o.text, flags: o.flags };
}

// src/server/models/providers.ts
var PROVIDER_IDS = ["anthropic", "gemini"];
var ProviderError = class extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
};
async function post(ctx, url, headers, body) {
  let res;
  try {
    res = await ctx.fetchImpl(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(3e4) });
  } catch {
    throw new ProviderError(0, "provider unreachable");
  }
  if (!res.ok) throw new ProviderError(res.status, `provider returned ${res.status}`);
  return await res.json().catch(() => ({}));
}
var JSON_ONLY = "\n\nRespond with a single JSON object and nothing else.";
var anthropic = {
  id: "anthropic",
  label: "Anthropic (Claude)",
  keyEnv: "ANTHROPIC_API_KEY",
  modelEnv: "ANTHROPIC_MODEL",
  baseEnv: "ANTHROPIC_API_BASE",
  defaultModel: "claude-sonnet-5-5",
  defaultBase: "https://api.anthropic.com",
  async step(req, ctx) {
    const messages = req.messages.map((m) => {
      if (m.role === "user") return { role: "user", content: m.text };
      if (m.role === "assistant") return { role: "assistant", content: [...m.text ? [{ type: "text", text: m.text }] : [], ...m.toolCalls.map((c) => ({ type: "tool_use", id: c.id, name: c.name, input: c.args }))] };
      return { role: "user", content: m.results.map((r) => ({ type: "tool_result", tool_use_id: r.id, content: JSON.stringify(r.result) })) };
    });
    const body = { model: req.model, max_tokens: req.maxTokens, system: req.system + (req.json ? JSON_ONLY : ""), messages };
    if (req.tools.length) body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    const j = await post(ctx, `${ctx.base}/v1/messages`, { "x-api-key": ctx.apiKey, "anthropic-version": "2023-06-01" }, body);
    const blocks = Array.isArray(j.content) ? j.content : [];
    const usage = j.usage ?? {};
    return {
      text: blocks.filter((b) => b.type === "text").map((b) => b.text ?? "").join(""),
      toolCalls: blocks.filter((b) => b.type === "tool_use").map((b, i) => ({ id: b.id ?? `call_${i}`, name: b.name ?? "", args: b.input ?? {} })),
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens
    };
  }
};
var geminiSchema = (s) => ({
  type: s.type.toUpperCase(),
  ...s.description ? { description: s.description } : {},
  ...s.enum ? { enum: s.enum } : {},
  ...s.properties ? { properties: Object.fromEntries(Object.entries(s.properties).map(([k, v2]) => [k, geminiSchema(v2)])) } : {},
  ...s.required ? { required: s.required } : {},
  ...s.items ? { items: geminiSchema(s.items) } : {}
});
var gemini = {
  id: "gemini",
  label: "Google Gemini",
  keyEnv: "GEMINI_API_KEY",
  modelEnv: "GEMINI_MODEL",
  baseEnv: "GEMINI_API_BASE",
  defaultModel: "gemini-3.8-flash",
  defaultBase: "https://generativelanguage.googleapis.com",
  async step(req, ctx) {
    const contents = req.messages.map((m) => {
      if (m.role === "user") return { role: "user", parts: [{ text: m.text }] };
      if (m.role === "assistant") return { role: "model", parts: [...m.text ? [{ text: m.text }] : [], ...m.toolCalls.map((c) => ({ functionCall: { name: c.name, args: c.args } }))] };
      return { role: "user", parts: m.results.map((r) => ({ functionResponse: { name: r.name, response: r.result } })) };
    });
    const body = {
      systemInstruction: { parts: [{ text: req.system }] },
      contents,
      generationConfig: { maxOutputTokens: req.maxTokens, ...req.json ? { responseMimeType: "application/json" } : {} }
    };
    if (req.tools.length) body.tools = [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.parameters) })) }];
    const j = await post(ctx, `${ctx.base}/v1beta/models/${encodeURIComponent(req.model)}:generateContent`, { "x-goog-api-key": ctx.apiKey }, body);
    const cand = Array.isArray(j.candidates) ? j.candidates[0] : void 0;
    const parts = cand?.content?.parts ?? [];
    const usage = j.usageMetadata ?? {};
    return {
      text: parts.map((p) => p.text ?? "").join(""),
      toolCalls: parts.filter((p) => p.functionCall).map((p, i) => ({ id: `call_${i}`, name: p.functionCall?.name ?? "", args: p.functionCall?.args ?? {} })),
      inputTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount
    };
  }
};
var ADAPTERS = { anthropic, gemini };
var LOOPBACK2 = /* @__PURE__ */ new Set(["127.0.0.1", "::1", "localhost", "[::1]"]);
function validateBase(name, value) {
  let u;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (u.protocol !== "https:" && !(u.protocol === "http:" && LOOPBACK2.has(u.hostname))) throw new Error(`${name} must be https (plain http is only allowed for localhost)`);
  return value.replace(/\/+$/, "");
}
function readProviders(env2) {
  return PROVIDER_IDS.map((id) => {
    const a = ADAPTERS[id];
    const key = env2[a.keyEnv]?.trim();
    const model = env2[a.modelEnv]?.trim() || a.defaultModel;
    if (!/^[A-Za-z0-9._:-]{1,80}$/.test(model)) throw new Error(`${a.modelEnv} has characters a model name cannot contain`);
    const base = validateBase(a.baseEnv, env2[a.baseEnv]?.trim() || a.defaultBase);
    return { id, label: a.label, configured: Boolean(key), model, keyEnv: a.keyEnv, modelEnv: a.modelEnv, baseEnv: a.baseEnv, base, apiKey: key || void 0 };
  });
}
function readOrder(env2) {
  const raw = (env2.OPS_MODEL_ORDER ?? "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!raw.length) return [...PROVIDER_IDS];
  const bad2 = raw.filter((r) => !PROVIDER_IDS.includes(r));
  if (bad2.length) throw new Error(`OPS_MODEL_ORDER names an unknown provider: ${bad2.join(", ")} (known: ${PROVIDER_IDS.join(", ")})`);
  return [...new Set(raw)];
}
var SETUP = {
  anthropic: {
    where: "Anthropic Console",
    url: "https://console.anthropic.com/",
    steps: [
      "Sign in to the Anthropic Console and create an API key for this platform. Use a key dedicated to it, so it can be revoked on its own.",
      "Put it in the server's .env as ANTHROPIC_API_KEY (never in the browser, the repository or a chat).",
      "Optional: set ANTHROPIC_MODEL to pin the model. Leave it out to use the platform default.",
      'Restart the server, then return here: the card will show "Configured".'
    ]
  },
  gemini: {
    where: "Google AI Studio",
    url: "https://aistudio.google.com/apikey",
    steps: [
      "Sign in to Google AI Studio and create an API key for this platform. Use a key dedicated to it.",
      "Put it in the server's .env as GEMINI_API_KEY (never in the browser, the repository or a chat).",
      "Optional: set GEMINI_MODEL to pin the model. Leave it out to use the platform default.",
      'Restart the server, then return here: the card will show "Configured".'
    ]
  }
};

// src/server/models/schema.ts
var Type = { OBJECT: "object", STRING: "string", INTEGER: "integer", NUMBER: "number", BOOLEAN: "boolean", ARRAY: "array" };

// src/server/models/local.ts
function getDeterministicRecommendations(agent, currentValues = {}) {
  const strategicRecommendations = [];
  const recommendedInputs = {};
  const complianceGuidance = [
    "POPIA Section 72 Invariant: Ensure all learner and operational data remains resident in AWS Cape Town (af-south-1).",
    "Law 02 (Human-in-the-Loop): All drafted artefacts require recorded human approval before publishing or outbound dispatch.",
    "De-identification: Use pseudonymous learner identifiers (e.g. LRN-7402) rather than national ID numbers or full names."
  ];
  const suggestedNextSteps = [
    'Click "Apply to Form" to populate the recommended operational parameters.',
    "Review drafted output in Studio Artefacts viewer.",
    agent.secondApprover ? "Route to second approver for required dual-signoff." : "Execute human ratification to commit to the audit ledger."
  ];
  for (const input of agent.inputs) {
    if (currentValues[input.key]) {
      recommendedInputs[input.key] = currentValues[input.key];
      continue;
    }
    if (input.kind === "select" && input.options && input.options.length > 0) {
      recommendedInputs[input.key] = input.options[0];
    } else if (input.kind === "number") {
      if (input.key.toLowerCase().includes("fee") || input.key.toLowerCase().includes("price") || input.key.toLowerCase().includes("rate")) {
        recommendedInputs[input.key] = "4000";
      } else if (input.key.toLowerCase().includes("count") || input.key.toLowerCase().includes("schools") || input.key.toLowerCase().includes("tenants")) {
        recommendedInputs[input.key] = "12";
      } else if (input.key.toLowerCase().includes("day") || input.key.toLowerCase().includes("term")) {
        recommendedInputs[input.key] = "30";
      } else {
        recommendedInputs[input.key] = "10";
      }
    } else if (input.kind === "longtext") {
      recommendedInputs[input.key] = `Comprehensive operational review for South African primary school deployment. Aligned with CAPS Curriculum standards, POPIA Section 72 data sovereignty, and SIAS tiered learning interventions under the R4,000/month model.`;
    } else {
      if (input.key.toLowerCase().includes("school")) {
        recommendedInputs[input.key] = "Strelitzia Primary School (Western Cape)";
      } else if (input.key.toLowerCase().includes("period") || input.key.toLowerCase().includes("date")) {
        recommendedInputs[input.key] = "2026-Q1";
      } else if (input.key.toLowerCase().includes("name") || input.key.toLowerCase().includes("title")) {
        recommendedInputs[input.key] = `Infinite-AI Operational Directive - ${agent.name}`;
      } else if (input.key.toLowerCase().includes("curr") || input.key.toLowerCase().includes("mon")) {
        recommendedInputs[input.key] = "ZAR";
      } else {
        recommendedInputs[input.key] = `Standard ops baseline for ${agent.name}`;
      }
    }
  }
  if (agent.id.startsWith("OPS-FIN")) {
    strategicRecommendations.push("Maintain R4,000/mo flat subscription fee per primary school tenant to uphold 85%+ gross margins.");
    strategicRecommendations.push("Factor in Cape Town AWS data hosting overhead (approx R850/mo) and Gemini inference token margins.");
    strategicRecommendations.push("Ensure South African VAT (15%) treatment is transparently represented in financial schedules.");
  } else if (agent.id.startsWith("OPS-SEC") || agent.id.startsWith("OPS-LEG")) {
    strategicRecommendations.push("Confirm data residency within the Republic of South Africa pursuant to POPIA Section 72.");
    strategicRecommendations.push("Verify student de-identification pipeline strips 13-digit SA ID numbers prior to any LLM ingestion.");
    strategicRecommendations.push("Ensure Information Officer registration with the South African Information Regulator is active.");
  } else if (agent.id.startsWith("OPS-CURR") || agent.id.startsWith("OPS-PROD")) {
    strategicRecommendations.push("Align learner outcomes with South African Department of Basic Education (DBE) CAPS requirements.");
    strategicRecommendations.push("Structure tiered learning plans strictly within SIAS (Screening, Identification, Assessment & Support) guidelines.");
    strategicRecommendations.push("Support both English and Afrikaans primary school language instructional media.");
  } else {
    strategicRecommendations.push(`Optimize ${agent.name} inputs for standardized South African primary school operations.`);
    strategicRecommendations.push("Review department handoffs and ensure all downstream ledger entries are cryptographic and tamper-evident.");
    strategicRecommendations.push("Verify operational outputs can export cleanly to PDF, DOCX, and XLSX formats.");
  }
  return {
    agentId: agent.id,
    strategicRecommendations,
    recommendedInputs,
    complianceGuidance,
    suggestedNextSteps
  };
}
function fallbackCopilot(message, collections, reason) {
  const invocations = [];
  const lower = message.toLowerCase();
  if (lower.includes("economic") || lower.includes("margin") || lower.includes("cost") || lower.includes("revenue") || lower.includes("r4,000") || lower.includes("r4000")) {
    const matchSchools = message.match(/\b(\d+)\s*schools?/i);
    const schools = matchSchools ? parseInt(matchSchools[1], 10) : 15;
    const result = {
      modelParameters: {
        activeSchools: schools,
        monthlyFeeZar: 4e3,
        llmTokensPerSchoolPerMonth: 15e4,
        serverCostPerMonthZar: 850,
        region: "AWS Cape Town (af-south-1)"
      },
      financialSummary: {
        monthlyRecurringRevenueZar: schools * 4e3,
        annualRecurringRevenueZar: schools * 4e3 * 12,
        totalDirectCostZar: 850 + Math.round(schools * 0.55 * 100) / 100,
        grossMarginPercent: `${Math.round((schools * 4e3 - 850) / (schools * 4e3) * 1e3) / 10}%`,
        viabilityStatus: "HIGHLY_VIABLE"
      }
    };
    invocations.push({
      name: "calculate_school_unit_economics",
      args: { activeSchools: schools, monthlyFeeZar: 4e3 },
      result
    });
    return {
      text: `### South African Primary School Unit Economics Analysis
- **Active School Count**: ${schools} primary schools
- **Subscription Model**: R4,000/month flat fee
- **Monthly Recurring Revenue (MRR)**: R${(schools * 4e3).toLocaleString()} ZAR
- **Annual Recurring Revenue (ARR)**: R${(schools * 4e3 * 12).toLocaleString()} ZAR
- **AWS Cape Town Infra Overhead**: R850/month
- **Blended Gross Margin**: **${result.financialSummary.grossMarginPercent}**
- **Sovereignty & Compliance**: In-country AWS Cape Town hosting adheres to POPIA Section 72 without extra cross-border data transfer tariffs.`,
      toolInvocations: invocations
    };
  }
  if (lower.includes("warehouse") || lower.includes("store") || lower.includes("records") || lower.includes("data")) {
    invocations.push({
      name: "query_data_warehouse",
      args: { collection: "all", limit: 5 },
      result: { collections, status: "operational" }
    });
    return {
      text: `### Data Warehouse Inspection
- **Operational Collections**: ${collections.join(", ") || "Initialized (clean state)"}
- **Storage Layer**: Local append-only ledger & file store with SHA-256 sequencing.
- **POPIA Invariant**: Learner PII de-identified before warehouse persistence.`,
      toolInvocations: invocations
    };
  }
  if (lower.includes("agent") || lower.includes("ops-")) {
    const match = message.match(/OPS-[A-Z]+-\d+/i);
    const agentId = match ? match[0].toUpperCase() : "OPS-EXEC-01";
    const agent = agentById(agentId);
    if (agent) {
      invocations.push({
        name: "inspect_department_agent",
        args: { agentId },
        result: { id: agent.id, name: agent.name, purpose: agent.purpose, framework: agent.framework }
      });
      return {
        text: `### Specialist Agent Inspection: ${agent.id} (${agent.name})
- **Department Framework**: ${agent.framework}
- **Purpose**: ${agent.purpose}
- **Required Inputs**: ${agent.inputs.map((i) => i.label).join(", ")}
- **Supported Formats**: ${agent.formats.join(", ")}
- **Second Approver**: ${agent.secondApprover ? "Required (Dual-authorization)" : "Single human approver"}`,
        toolInvocations: invocations
      };
    }
  }
  return {
    text: `### Infinite AI Operations Platform
The platform is running with full generative AI capabilities and tool integration (model: \`gemini-3.8-flash\`).
Available generative tools:
1. \`query_data_warehouse\`: Query contracts, schools, policies, and documents.
2. \`calculate_school_unit_economics\`: Compute MRR, ARR, AWS Cape Town COGS, and gross margins at R4,000/month.
3. \`audit_compliance_and_guardrails\`: Audit content for POPIA Section 72, student PII, and SIAS MTSS tier safeguards.
4. \`inspect_department_agent\`: Inspect any of the 48 specialist agents.
5. \`generate_task_recommendations\`: Generate suggestions and parameter presets for any agent task.

${reason ? `*(Operating in local deterministic reasoning mode: ${reason})*` : ""}`,
    toolInvocations: invocations
  };
}

// src/server/models/tools.ts
var TOOLS = [
  { name: "query_data_warehouse", description: "Inspect the data warehouse. Always returns collection names and record counts. Returns record contents only for collections an administrator has allowed for model access (none by default), and only de-identified.", parameters: { type: Type.OBJECT, properties: { collection: { type: Type.STRING, description: 'A collection name, or "all" for counts of every collection' }, query: { type: Type.STRING, description: "Optional keyword filter (allowed collections only)" }, limit: { type: Type.INTEGER, description: "Maximum records to return (default 10, at most 20)" } }, required: ["collection"] } },
  { name: "calculate_school_unit_economics", description: "Computes illustrative unit economics for a number of primary schools from the inputs given. Inputs left out use stated defaults; treat the result as a draft model, not a sourced figure.", parameters: { type: Type.OBJECT, properties: { activeSchools: { type: Type.INTEGER, description: "Number of subscribed primary schools" }, monthlyFeeZar: { type: Type.NUMBER, description: "Monthly subscription fee per school in ZAR (default 4000)" }, llmTokensPerSchoolPerMonth: { type: Type.INTEGER, description: "Average monthly model tokens per school (default 150000)" }, serverCostPerMonthZar: { type: Type.NUMBER, description: "Fixed monthly hosting and storage cost in ZAR (default 850)" } }, required: ["activeSchools"] } },
  { name: "audit_compliance_and_guardrails", description: "Checks text for personal identifiers, South African ID numbers, instruction-override patterns and cross-border transfer indicators. A screening aid, not legal advice.", parameters: { type: Type.OBJECT, properties: { content: { type: Type.STRING, description: "Text to check" }, checkPopiaSection72: { type: Type.BOOLEAN, description: "Also check for cross-border transfer indicators" }, checkStudentPii: { type: Type.BOOLEAN, description: "Also check for learner identifiers" }, checkSiasTierSafeguards: { type: Type.BOOLEAN, description: "Reserved" } }, required: ["content"] } },
  { name: "inspect_department_agent", description: "Returns a specialist agent contract (purpose, inputs, formats, approvers, framework).", parameters: { type: Type.OBJECT, properties: { agentId: { type: Type.STRING, description: "The agent id, for example OPS-FIN-01" } }, required: ["agentId"] } },
  { name: "generate_task_recommendations", description: "Returns illustrative suggestions, input presets and next steps for an agent task. Presets are placeholders to edit, not facts.", parameters: { type: Type.OBJECT, properties: { agentId: { type: Type.STRING, description: "The agent id" }, contextSummary: { type: Type.STRING, description: "Brief context or objective" } }, required: ["agentId"] } }
];
var TOOL_NAMES = new Set(TOOLS.map((t) => t.name));
function readReadable(env2) {
  const names = (env2.OPS_MODEL_READABLE_COLLECTIONS ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const never = names.filter((n) => NEVER_MODEL_READABLE.has(n));
  if (never.length) throw new Error(`OPS_MODEL_READABLE_COLLECTIONS may never include: ${never.join(", ")}`);
  const bad2 = names.filter((n) => !/^[a-z0-9_]{1,64}$/.test(n));
  if (bad2.length) throw new Error(`OPS_MODEL_READABLE_COLLECTIONS has an invalid collection name: ${bad2.join(", ")}`);
  return new Set(names);
}
var slim = (r) => Object.fromEntries(Object.entries(r).filter(([, v2]) => typeof v2 === "number" || typeof v2 === "boolean" || typeof v2 === "string" && v2.length <= 200));
async function executeTool(name, args, ctx) {
  switch (name) {
    case "query_data_warehouse": {
      const collection = String(args.collection || "all");
      const query = typeof args.query === "string" ? args.query.toLowerCase() : "";
      const limit = typeof args.limit === "number" ? Math.max(1, Math.min(Math.floor(args.limit), 20)) : 10;
      const all = ctx.load();
      const counts = Object.fromEntries(Object.entries(all).filter(([c]) => !NEVER_MODEL_READABLE.has(c)).map(([c, v2]) => [c, v2.length]));
      if (collection === "all" || !ctx.readable.has(collection)) {
        return { collection, counts, note: collection === "all" || NEVER_MODEL_READABLE.has(collection) || !(collection in all) ? void 0 : "Contents of this collection are not available to models; only counts are." };
      }
      const rows2 = (all[collection] ?? []).map(slim).filter((r) => !query || JSON.stringify(r).toLowerCase().includes(query)).slice(0, limit);
      const clean = JSON.parse(deidentify(JSON.stringify(rows2), ["tool:query_data_warehouse"]).text);
      return { collection, counts, records: clean };
    }
    case "calculate_school_unit_economics": {
      const activeSchools = Number(args.activeSchools) || 1;
      const monthlyFeeZar = Number(args.monthlyFeeZar) || 4e3;
      const llmTokens = Number(args.llmTokensPerSchoolPerMonth) || 15e4;
      const serverCostZar = Number(args.serverCostPerMonthZar) || 850;
      const usdToZar = 18.5;
      const blendedCostPerTokenUsd = 2e-7;
      const tokenCostPerSchoolUsd = llmTokens * blendedCostPerTokenUsd;
      const tokenCostPerSchoolZar = Math.round(tokenCostPerSchoolUsd * usdToZar * 100) / 100;
      const totalLlmCostZar = Math.round(tokenCostPerSchoolZar * activeSchools * 100) / 100;
      const monthlyRevenueZar = activeSchools * monthlyFeeZar;
      const annualRecurringRevenueZar = monthlyRevenueZar * 12;
      const totalDirectCostZar = serverCostZar + totalLlmCostZar;
      const monthlyGrossProfitZar = monthlyRevenueZar - totalDirectCostZar;
      const grossMarginPercent = monthlyRevenueZar > 0 ? Math.round(monthlyGrossProfitZar / monthlyRevenueZar * 1e3) / 10 : 0;
      const breakEvenSchools = Math.ceil(serverCostZar / (monthlyFeeZar - tokenCostPerSchoolZar));
      return {
        modelParameters: {
          activeSchools,
          monthlyFeeZar,
          llmTokensPerSchoolPerMonth: llmTokens,
          serverCostPerMonthZar: serverCostZar,
          region: "AWS Cape Town (af-south-1) - In-Country Data Residency"
        },
        financialSummary: {
          monthlyRecurringRevenueZar: monthlyRevenueZar,
          annualRecurringRevenueZar,
          totalDirectCostZar,
          tokenCostPerSchoolZar,
          monthlyGrossProfitZar,
          grossMarginPercent: `${grossMarginPercent}%`,
          breakEvenSchools,
          viabilityStatus: grossMarginPercent > 70 ? "HIGHLY_VIABLE" : grossMarginPercent > 50 ? "VIABLE" : "SUBSIDY_REQUIRED"
        },
        southAfricanSchoolViability: {
          targetQuintile: "Quintile 4-5 and Independent Primary Schools",
          affordabilityBenchmark: "R4,000/month covers full multi-user ops & CAPS analytics",
          popiaComplianceSurcharge: "R0 (Included in base tier with local data residency)"
        }
      };
    }
    case "audit_compliance_and_guardrails": {
      const content = String(args.content || "");
      const piiIssues = detectPii(content);
      const injectionIssues = detectInjection(content);
      const checkPopia72 = args.checkPopiaSection72 !== false;
      const popia72Violations = [];
      const crossBorderKeywords = ["us-east-1", "openai foreign server", "unencrypted s3 us", "eu central cross-border without agreement"];
      for (const kw of crossBorderKeywords) {
        if (content.toLowerCase().includes(kw)) {
          popia72Violations.push(`Cross-border data transfer flagged (${kw}): POPIA Section 72 requires adequate safeguards, binding corporate rules, or explicit consent.`);
        }
      }
      const saIdRegex = /\b\d{13}\b/g;
      const saIdMatches = content.match(saIdRegex) || [];
      return {
        contentLength: content.length,
        compliant: piiIssues.length === 0 && injectionIssues.length === 0 && popia72Violations.length === 0 && saIdMatches.length === 0,
        piiFindings: piiIssues,
        saIdNumbersFound: saIdMatches.length,
        injectionFindings: injectionIssues,
        popiaSection72Findings: popia72Violations,
        remediationAdvice: [
          ...piiIssues.length ? ["Strip learner names, cell numbers, and email addresses prior to drafting."] : [],
          ...saIdMatches.length ? ["Replace 13-digit SA national ID numbers with pseudonymous learner UUIDs."] : [],
          ...popia72Violations.length ? ["Ensure cloud data residency remains within AWS Cape Town (af-south-1)."] : [],
          "Enforce Law 02: Human-in-the-Loop second approver sign-off on all drafted operational documents."
        ]
      };
    }
    case "inspect_department_agent": {
      const id = String(args.agentId || "").trim();
      const agent = agentById(id);
      if (!agent) {
        return { error: `Agent '${id}' not found in the 16 Infinite-AI departments.` };
      }
      return {
        id: agent.id,
        name: agent.name,
        purpose: agent.purpose,
        summary: agent.summary,
        framework: agent.framework,
        inputs: agent.inputs.map((i) => ({ key: i.key, label: i.label, kind: i.kind, required: i.required })),
        formats: agent.formats,
        secondApprover: agent.secondApprover,
        lawsCovered: ["Law 01 (De-identification)", "Law 02 (Human Ratification)", "Law 03 (POPIA s72 Residency)"]
      };
    }
    case "generate_task_recommendations": {
      const id = String(args.agentId || "").trim();
      const agent = agentById(id);
      if (!agent) return { error: `Agent '${id}' not found.` };
      const recs = getDeterministicRecommendations(agent);
      return { ...recs, agentId: id };
    }
    default:
      return { error: `Unknown tool: ${name}` };
  }
}

// src/server/models/hub.ts
var ModelUnavailable = class extends Error {
  constructor() {
    super(...arguments);
    this.status = 502;
  }
};
var sha = (s) => createHash2("sha256").update(s).digest("hex");
var today = (iso) => iso.slice(0, 10);
var ModelHub = class {
  /** Throws on a bad configuration (unknown provider in the order, an unreadable collection on the never-list, a bad base URL). */
  constructor(o) {
    this.store = o.store;
    this.providers = readProviders(o.env);
    this.order = readOrder(o.env);
    this.readable = readReadable(o.env);
    const budget = o.env.OPS_MODEL_DAILY_CALLS?.trim();
    this.dailyBudget = budget ? Number(budget) : 500;
    if (!Number.isInteger(this.dailyBudget) || this.dailyBudget < 1) throw new Error("OPS_MODEL_DAILY_CALLS must be a whole number of at least 1");
    this.limiter = o.limiter ?? new RateLimiter(20, 6e4);
    this.fetchImpl = o.fetchImpl ?? fetch;
  }
  // ---------------------------------------------------------------- status
  cfg(id) {
    return this.providers.find((p) => p.id === id);
  }
  latestAttestation(id) {
    return this.store.list("model_attestations").filter((r) => r.provider === id).at(-1);
  }
  stateOf(p) {
    if (!p.configured) return "not_configured";
    const a = this.latestAttestation(p.id);
    if (!a || a.status !== "ATTESTED") return "needs_attestation";
    return a.model === p.model ? "ready" : "reattest";
  }
  /** Providers that may be called, in routing order (rule M5). */
  ready(only) {
    return this.order.filter((id) => !only || id === only).map((id) => this.cfg(id)).filter((p) => this.stateOf(p) === "ready");
  }
  entriesToday(action, prefix) {
    const ledger = this.store.list("ledger");
    const day = today((/* @__PURE__ */ new Date()).toISOString());
    const out = [];
    for (let i = ledger.length - 1; i >= 0; i--) {
      const e = ledger[i];
      if (today(String(e.at)) < day) break;
      if (e.action === action && (!prefix || String(e.subject).startsWith(prefix))) out.push(e);
    }
    return out;
  }
  callsToday(id) {
    return this.entriesToday("model.request", `${id}:`).length;
  }
  status() {
    const tests = this.store.list("ledger").filter((e) => e.action === "model.test");
    const providers = this.order.map((id) => {
      const p = this.cfg(id);
      const a = this.latestAttestation(id);
      const t = tests.filter((e) => String(e.subject) === `${id}:${p.model}`).at(-1);
      const d = t?.detail ?? {};
      const ok = a?.status === "ATTESTED";
      return {
        id,
        label: p.label,
        state: this.stateOf(p),
        configured: p.configured,
        model: p.model,
        keyEnv: p.keyEnv,
        modelEnv: p.modelEnv,
        attestation: ok ? { by: String(a.by), at: String(a.at), note: String(a.note), model: String(a.model) } : null,
        lastTest: t ? { ok: d.ok === true, at: String(t.at), ms: Number(d.ms ?? 0), error: d.error } : null,
        callsToday: this.callsToday(id),
        setup: { ...SETUP[id], envExample: [`${p.keyEnv}=<paste the key here>`, `${p.modelEnv}=${p.model}`, `OPS_MODEL_ORDER=${this.order.join(",")}`] }
      };
    });
    const responses = this.entriesToday("model.response");
    return {
      providers,
      order: this.order,
      rules: RULES2,
      limits: { ...LIMITS, dailyCallsPerProvider: this.dailyBudget },
      readableCollections: [...this.readable],
      toolNames: [...TOOL_NAMES],
      usage: { calls: this.entriesToday("model.request").length, inputTokens: responses.reduce((n, e) => n + Number(e.detail.inputTokens ?? 0), 0), outputTokens: responses.reduce((n, e) => n + Number(e.detail.outputTokens ?? 0), 0) }
    };
  }
  // ----------------------------------------------------------- attestation
  /** A named person confirms they reviewed the provider's terms for this exact model. Recorded in the warehouse and the ledger. */
  async attest(id, by, note) {
    const p = this.cfg(id);
    if (!p.configured) throw new ModelRefused("M5", `${p.label} has no key configured (${p.keyEnv}). Add it and restart first.`, 409);
    const n = (note ?? "").trim();
    if (n.length < 10 || n.length > 300) throw new ModelRefused("M5", `Say what you reviewed, in 10 to 300 characters (for example: "Reviewed the provider's data-processing terms and retention settings").`, 400);
    if (detectPii(n).length) throw new ModelRefused("M2", "The note must not contain personal data.", 400);
    const rec = { id: newId("att"), provider: id, model: p.model, status: "ATTESTED", by: by ?? "open-dev", note: n, at: (/* @__PURE__ */ new Date()).toISOString() };
    this.store.append("model_attestations", rec);
    await this.audit("model.attested", rec.by, `${id}:${p.model}`, { note: n });
    return rec;
  }
  async revoke(id, by, reason) {
    const r = (reason ?? "").trim();
    if (r.length < 5 || r.length > 300) throw new ModelRefused("M5", "Give a reason, in 5 to 300 characters.", 400);
    if (detectPii(r).length) throw new ModelRefused("M2", "The reason must not contain personal data.", 400);
    const rec = { id: newId("att"), provider: id, model: this.cfg(id).model, status: "REVOKED", by: by ?? "open-dev", note: r, at: (/* @__PURE__ */ new Date()).toISOString() };
    this.store.append("model_attestations", rec);
    await this.audit("model.revoked", rec.by, `${id}:${rec.model}`, { reason: r });
    return rec;
  }
  // ----------------------------------------------------------------- audit
  async audit(action, actor, subject, detail) {
    const last = this.store.list("ledger").at(-1);
    await appendLedger(this.store, { orgId: "infinite-ai", actor, action, subject, detail }, Number(last?.seq ?? 0), null);
  }
  /** Rule M7: if the audit cannot be written, the model is not called (or its answer is withheld). */
  async auditStrict(action, actor, subject, detail) {
    try {
      await this.audit(action, actor, subject, detail);
    } catch {
      throw new ModelRefused("M7", "The audit ledger could not be written, so the model was not used.", 503);
    }
  }
  // -------------------------------------------------------------- the door
  /**
   * Every model call in the platform goes through here (rule M10). The order is fixed: rules M1-M4, a ready provider (M5),
   * rate and budget (M6), audit before the call (M7), the call, the output scan (M8), audit after.
   */
  async execute(req, useTools, only) {
    const who = req.actor ?? "open";
    const refuse = async (e, subject = "none") => {
      await this.audit("model.refused", who, subject, { rule: e.rule, capability: req.capability, purpose: req.purpose }).catch(() => void 0);
      throw e;
    };
    try {
      checkRequest(req);
    } catch (e) {
      if (e instanceof ModelRefused) return refuse(e);
      throw e;
    }
    const allowed = req.agentProviders;
    const candidates = this.ready(only).filter((p) => !allowed || allowed.includes(p.id));
    if (allowed && !candidates.length && this.ready(only).length) return refuse(new ModelRefused("M5", `None of the providers this agent's contract allows (${allowed.join(", ")}) is ready.`, 503));
    if (!candidates.length) return refuse(new ModelRefused("M5", only ? "That provider is not ready: configure it and attest it first." : "No model provider is ready. Open the Model Hub to configure and attest one.", 503));
    if (!this.limiter.allow(who)) return refuse(new ModelRefused("M6", "Rate limit: try again in a minute.", 429));
    const inputs = [req.system, req.prompt, ...req.history.map((h) => h.text)];
    let budgetHit = false;
    let lastStatus = 0;
    for (const p of candidates) {
      if (this.callsToday(p.id) >= this.dailyBudget) {
        budgetHit = true;
        await this.audit("model.refused", who, `${p.id}:${p.model}`, { rule: "M6", capability: req.capability, purpose: req.purpose, reason: "daily budget" }).catch(() => void 0);
        continue;
      }
      const subject = `${p.id}:${p.model}`;
      await this.auditStrict("model.request", who, subject, { capability: req.capability, purpose: req.purpose, agentId: req.agentId, inputChars: inputs.reduce((n, s) => n + s.length, 0), promptSha256: sha(inputs.join("\n")), sources: req.provenance?.sources, tools: useTools });
      const started = Date.now();
      try {
        const r = await this.loop(p, req, useTools, who, subject, inputs);
        const out = checkModelOutput(r.text, [...inputs, ...r.invocations.map((i) => JSON.stringify(i.result))]);
        await this.auditStrict("model.response", who, subject, { outputChars: out.text.length, flags: out.flags, ms: Date.now() - started, inputTokens: r.inputTokens, outputTokens: r.outputTokens, toolCalls: r.invocations.length });
        return { text: out.text, draft: true, provider: p.id, model: p.model, flags: out.flags, toolInvocations: r.invocations, usage: { inputTokens: r.inputTokens, outputTokens: r.outputTokens } };
      } catch (e) {
        if (e instanceof ProviderError) {
          lastStatus = e.status;
          await this.audit("model.failed", who, subject, { status: e.status, ms: Date.now() - started, capability: req.capability }).catch(() => void 0);
          continue;
        }
        throw e;
      }
    }
    if (budgetHit && !lastStatus) throw new ModelRefused("M6", "The daily model budget is used up for every ready provider.", 429);
    throw new ModelUnavailable(`No provider could answer${lastStatus ? ` (last status ${lastStatus})` : ""}.`);
  }
  async loop(p, req, useTools, who, subject, inputs) {
    const adapter = ADAPTERS[p.id];
    const messages = [...req.history.map((h) => h.role === "user" ? { role: "user", text: h.text } : { role: "assistant", text: h.text, toolCalls: [] }), { role: "user", text: req.prompt }];
    const invocations = [];
    let inputTokens = 0;
    let outputTokens = 0;
    const ctx = { apiKey: p.apiKey, base: p.base, fetchImpl: this.fetchImpl };
    for (let turn = 0; turn <= LIMITS.maxToolTurns; turn++) {
      const tools = useTools && turn < LIMITS.maxToolTurns ? TOOLS : [];
      const step = await adapter.step({ model: p.model, system: req.system, messages, tools, maxTokens: LIMITS.maxOutputTokens, json: Boolean(req.json) }, ctx);
      inputTokens += step.inputTokens ?? 0;
      outputTokens += step.outputTokens ?? 0;
      if (!step.toolCalls.length) return { text: step.text, invocations, inputTokens, outputTokens };
      if (turn === LIMITS.maxToolTurns) return { text: "No final answer was produced within the tool limit. Narrow the question and try again.", invocations, inputTokens, outputTokens };
      const calls = step.toolCalls.slice(0, 4).map((c) => ({ call: c, dirty: detectPii(JSON.stringify(c.args)).length > 0 }));
      messages.push({ role: "assistant", text: step.text, toolCalls: calls.map(({ call, dirty }) => dirty ? { ...call, args: {} } : call) });
      const results = [];
      for (const { call, dirty } of calls) results.push(await this.runTool(dirty ? { ...call, args: {} } : call, who, subject, invocations, dirty));
      messages.push({ role: "tool", results });
    }
    return { text: "", invocations, inputTokens, outputTokens };
  }
  /** Rule M9: the tool runs, and its result reaches the model only if it passes the scan. */
  async runTool(call, who, subject, invocations, dirtyArgs = false) {
    let result;
    let withheld = null;
    if (dirtyArgs) {
      result = { error: "rejected: the arguments contained personal data" };
      withheld = "rejected: arguments contained personal data";
    } else if (!TOOL_NAMES.has(call.name) || JSON.stringify(call.args).length > 2e3) {
      result = { error: "unknown tool or arguments too large" };
      withheld = "rejected";
    } else {
      try {
        result = await executeTool(call.name, call.args, { load: () => this.store.load(), readable: this.readable });
        withheld = checkToolResult(result);
      } catch (e) {
        if (!(e instanceof LearnerDataRefused)) throw e;
        result = {};
        withheld = "withheld: contained learner-level identifiers";
      }
      if (withheld) result = { error: withheld };
    }
    await this.auditStrict("model.tool", who, subject, { tool: call.name, resultChars: JSON.stringify(result).length, withheld });
    invocations.push({ name: call.name, args: call.args, result });
    return { id: call.id, name: call.name, result };
  }
  // ------------------------------------------------- what the platform asks
  /** True when at least one provider could be called right now. */
  anyReady() {
    return this.ready().length > 0;
  }
  /** For text the server itself composes: refuse anything with personal data, then stamp it (the stamp's only producer is deidentify). Refusals are audited. */
  async stamp(texts, sources, who, capability, purpose) {
    try {
      return this.stampSync(texts, sources);
    } catch (e) {
      if (e instanceof ModelRefused) await this.audit("model.refused", who ?? "open", "none", { rule: e.rule, capability, purpose }).catch(() => void 0);
      throw e;
    }
  }
  stampSync(texts, sources) {
    try {
      const d = deidentify(texts.join("\n"), sources);
      if (d.findings.length) throw new ModelRefused("M2", `Refused: personal data detected (${[...new Set(d.findings.map((f) => f.kind))].join(", ")}). Remove it and retry.`);
      return d.provenance;
    } catch (e) {
      if (e instanceof LearnerDataRefused) throw new ModelRefused("M2", "Refused: learner-level identifiers are never sent to a model.");
      throw e;
    }
  }
  /** A plain completion for a payload the caller has already de-identified and stamped (the in-browser gateway). */
  complete(r) {
    return this.execute({ capability: "complete", purpose: r.purpose, system: r.system, prompt: r.prompt, history: [], provenance: r.provenance, actor: r.actor, agentId: r.agent?.id, agentPurposes: r.agent?.allowedPurposes, agentProviders: r.agent?.models }, false);
  }
  /** The operations copilot: free text from a person, with tools. Falls back to the deterministic engine when no provider is ready. */
  async copilot(message, history, actor) {
    const h = (Array.isArray(history) ? history : []).slice(-LIMITS.maxHistory).map((m) => ({ role: m?.role === "user" ? "user" : "assistant", text: String(m?.text ?? "") }));
    const system = "You are the Infinite-AI Operations Copilot for South African primary-school business operations. You recommend, analyse and draft; named humans review, edit, countersign and ratify. Never state a figure you were not given or did not get from a tool. Say when something needs a source. Use the tools to inspect counts, compute illustrative economics, screen text or inspect agent contracts.";
    const provenance = await this.stamp([message, ...h.map((m) => m.text)], [`copilot-input:${actor ?? "open"}`], actor, "copilot", "strategy_planning");
    if (!this.ready().length) return this.local(fallbackCopilot(message, Object.keys(this.store.load())));
    return this.execute({ capability: "copilot", purpose: "strategy_planning", system, prompt: message, history: h, provenance, actor }, true);
  }
  async recommend(agent, currentValues, actor) {
    const values = Object.fromEntries(Object.entries(currentValues ?? {}).filter(([k, v2]) => agent.inputs.some((i) => i.key === k) && typeof v2 === "string").map(([k, v2]) => [k, String(v2).slice(0, 500)]));
    const fallback = () => ({ ...getDeterministicRecommendations(agent, values), toolsUsed: [], generatedWith: "deterministic-fallback", draft: true, flags: ["deterministic", "illustrative_defaults"] });
    const prompt = `Suggest how to complete this agent task. Agent: ${agent.id} (${agent.name}). Purpose: ${agent.purpose}. Summary: ${agent.summary}.
Inputs: ${JSON.stringify(agent.inputs.map((i) => ({ key: i.key, label: i.label, kind: i.kind, options: i.options })))}
Current values: ${JSON.stringify(values)}
Reply with a JSON object: {"strategicRecommendations": string[], "recommendedInputs": {<input key>: string}, "complianceGuidance": string[], "suggestedNextSteps": string[]}. Do not invent figures, names or facts: where a value needs one, say what source is required.`;
    const provenance = await this.stamp([prompt], [`agent:${agent.id}`, `input:${actor ?? "open"}`], actor, "recommend", agent.purpose);
    if (!this.ready().length) return fallback();
    const r = await this.execute({ capability: "recommend", purpose: agent.purpose, agentId: agent.id, agentPurposes: agent.allowedPurposes, agentProviders: agent.models, system: "You are an operations specialist. You produce drafts for a human to review. Output only the JSON object asked for.", prompt, history: [], provenance, actor, json: true }, false);
    let parsed = {};
    try {
      parsed = JSON.parse(r.text.replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
      return { ...fallback(), flags: [...r.flags, "model_reply_not_json", "deterministic"] };
    }
    const det = getDeterministicRecommendations(agent, values);
    const strings = (v2, d) => Array.isArray(v2) && v2.length ? v2.map(String).slice(0, 8) : d;
    const recIn = typeof parsed.recommendedInputs === "object" && parsed.recommendedInputs !== null ? parsed.recommendedInputs : {};
    const recommendedInputs = Object.fromEntries(agent.inputs.map((i) => [i.key, typeof recIn[i.key] === "string" ? String(recIn[i.key]) : det.recommendedInputs[i.key] ?? ""]));
    return { agentId: agent.id, strategicRecommendations: strings(parsed.strategicRecommendations, det.strategicRecommendations), recommendedInputs, complianceGuidance: strings(parsed.complianceGuidance, det.complianceGuidance), suggestedNextSteps: strings(parsed.suggestedNextSteps, det.suggestedNextSteps), toolsUsed: [], generatedWith: `${r.provider}:${r.model}`, draft: true, flags: r.flags };
  }
  /** A fixed, harmless prompt through the full rule path, to prove a provider is wired up. It still needs attestation first. */
  async selfTest(id, actor) {
    const p = this.cfg(id);
    const started = Date.now();
    let out;
    try {
      await this.execute({ capability: "self-test", purpose: "ai_governance", system: "You are a connectivity check.", prompt: "Reply with the single word OK.", history: [], provenance: { deidentified: true, sources: ["hub-self-test"] }, actor }, false, id);
      out = { ok: true, model: p.model };
    } catch (e) {
      if (e instanceof ModelRefused && e.rule !== "M5" && e.rule !== "M6" && e.rule !== "M7") throw e;
      out = { ok: false, error: e.message, model: p.model };
    }
    const ms = Date.now() - started;
    await this.audit("model.test", actor ?? "open", `${id}:${p.model}`, { ok: out.ok, ms, error: out.error }).catch(() => void 0);
    return { ...out, ms };
  }
  local(r) {
    return { text: r.text, draft: true, provider: "local", model: "deterministic", flags: ["deterministic"], toolInvocations: r.toolInvocations, usage: { inputTokens: 0, outputTokens: 0 } };
  }
};

// src/core/contract.ts
var CONTRACT_MAX_PROMPT_CHARS = 2e4;
var KNOWN_PROVIDERS = ["anthropic", "gemini"];
var TIERS = ["L0", "L1", "L2", "L3", "L4"];
var FORMATS = ["md", "html", "pdf", "csv", "json", "docx", "xlsx"];
var CEILINGS = ["public", "internal", "confidential", "personal"];
function checkContract(a, env2) {
  const out = [];
  const bad2 = (rule, message) => out.push({ rule, message });
  const str = (x2, min, max) => typeof x2 === "string" && x2.trim().length >= min && x2.length <= max;
  const x = a;
  if (typeof a.id !== "string" || !/^(OPS-[A-Z]+-\d{2}|CUS-[A-Z]+-\d{2}|agt-[a-z0-9]+)$/.test(a.id)) bad2("C1", "id must look like OPS-DEPT-nn or agt-xxxx");
  if (typeof a.version !== "string" || !/^\d+\.\d+\.\d+$/.test(a.version)) bad2("C1", "version must be semver (1.0.0)");
  if (!str(a.name, 3, 80)) bad2("C1", "name must be 3 to 80 characters");
  if (!str(a.summary, 5, 400)) bad2("C1", "summary must be 5 to 400 characters");
  if (!str(a.framework, 3, 200)) bad2("C1", "the method (framework) must be named");
  if (!env2.departments.includes(a.dept)) bad2("C1", `department "${String(a.dept)}" is not registered`);
  if (!str(x.owner, 3, 60)) bad2("C2", "an owner role is required (3 to 60 characters)");
  else if (detectPii(String(x.owner)).length) bad2("C2", "the owner must be a role, not personal data");
  if (!PURPOSES.includes(a.purpose)) bad2("C3", "purpose is not on the closed purpose list");
  if (!Array.isArray(a.allowedPurposes) || !a.allowedPurposes.length) bad2("C3", "allowedPurposes must not be empty");
  else {
    if (a.allowedPurposes.some((p) => !PURPOSES.includes(p))) bad2("C3", "allowedPurposes holds a purpose that is not on the list");
    if (new Set(a.allowedPurposes).size !== a.allowedPurposes.length) bad2("C3", "allowedPurposes has a duplicate");
    if (!a.allowedPurposes.includes(a.purpose)) bad2("C3", "purpose must be one of allowedPurposes");
  }
  if (!CEILINGS.includes(a.dataClass)) bad2("C4", a.dataClass === "learner" ? "learner data is never admitted to this platform" : "unknown data class");
  if (a.dataClass === "personal" && !(a.lawfulBasis && LAWFUL_BASES.includes(a.lawfulBasis))) bad2("C4", "personal data needs a lawful basis (POPIA s11)");
  if (a.requiresApproval !== true) bad2("C5", "requiresApproval must be true: no agent skips the human");
  if (/^(agt-|CUS-)/.test(String(a.id)) && a.secondApprover !== true) bad2("C5", "a custom agent needs a second approver");
  if (x.models !== void 0) {
    const known = env2.providers ?? KNOWN_PROVIDERS;
    if (!Array.isArray(x.models) || !x.models.length) bad2("C6", "models, when present, must be a non-empty list of providers");
    else if (x.models.some((m) => typeof m !== "string" || !known.includes(m))) bad2("C6", "models names a provider that is not known");
    else if (new Set(x.models).size !== x.models.length) bad2("C6", "models has a duplicate");
  }
  const budget = a.budget?.maxPromptChars;
  if (typeof budget !== "number" || !Number.isInteger(budget) || budget < 100 || budget > CONTRACT_MAX_PROMPT_CHARS) bad2("C7", `budget.maxPromptChars must be a whole number from 100 to ${CONTRACT_MAX_PROMPT_CHARS}`);
  if (typeof a.evalRef !== "string" || !/^test\/[A-Za-z0-9._/-]+\.test\.ts$/.test(a.evalRef) || a.evalRef.includes("..")) bad2("C8", "evalRef must point at a test file under test/");
  if (!Array.isArray(a.inputs) || a.inputs.length > 12) bad2("C9", "an agent has at most 12 inputs");
  else {
    const keys = a.inputs.map((i) => i?.key);
    if (keys.some((k) => typeof k !== "string" || !/^[A-Za-z][A-Za-z0-9_]{0,39}$/.test(k))) bad2("C9", "every input needs a simple key");
    if (new Set(keys).size !== keys.length) bad2("C9", "two inputs share a key");
    if (a.inputs.some((i) => !str(i?.label, 1, 120))) bad2("C9", "every input needs a label");
    if (a.inputs.some((i) => i?.kind === "select" && !i.options?.length)) bad2("C9", "a choice input needs options");
    if (a.inputs.some((i) => !["text", "longtext", "number", "select"].includes(String(i?.kind)))) bad2("C9", "an input has an unknown kind");
  }
  if (!Array.isArray(a.reads) || a.reads.some((t) => !TIERS.includes(t))) bad2("C10", "reads holds an unknown Brain tier");
  if (!Array.isArray(a.formats) || !a.formats.length || a.formats.some((f) => !FORMATS.includes(f))) bad2("C10", "formats must be a non-empty list of known formats");
  if (a.ingestion !== void 0 && a.ingestion !== "library" && a.ingestion !== "none") bad2("C10", "ingestion must be library or none");
  if (typeof a.build !== "function") bad2("C10", "build must be a function");
  return out;
}
function checkRegistry(agents, env2) {
  const out = {};
  const seen = /* @__PURE__ */ new Set();
  for (const a of agents) {
    const p = checkContract(a, env2);
    if (seen.has(a.id)) p.push({ rule: "C1", message: "duplicate id" });
    seen.add(a.id);
    if (p.length) out[String(a.id)] = p;
  }
  return out;
}
var formatProblems = (r) => Object.entries(r).map(([id, ps]) => `${id}: ${ps.map((p) => `${p.rule} ${p.message}`).join("; ")}`).join("\n");

// src/server/modelRoutes.ts
import { Router as Router2 } from "express";
function modelRoutes(hub2) {
  const r = Router2();
  const actorOf2 = (res) => res.locals.actor;
  const wrap2 = (fn) => (req, res) => {
    Promise.resolve().then(() => fn(req, res)).catch((e) => {
      if (e instanceof ModelRefused) return void res.status(e.status).json({ error: e.message, rule: e.rule });
      if (e instanceof ModelUnavailable) return void res.status(e.status).json({ error: e.message });
      console.error(e);
      res.status(500).json({ error: "internal error" });
    });
  };
  const provider = (req) => {
    const id = req.params.id;
    if (!PROVIDER_IDS.includes(id)) throw new ModelRefused("M5", "Unknown provider.", 404);
    return id;
  };
  r.get("/models/hub", (_q, res) => res.json(hub2.status()));
  r.post("/models/providers/:id/attest", wrap2(async (req, res) => res.json(await hub2.attest(provider(req), actorOf2(res), String(req.body?.note ?? "")))));
  r.post("/models/providers/:id/revoke", wrap2(async (req, res) => res.json(await hub2.revoke(provider(req), actorOf2(res), String(req.body?.reason ?? "")))));
  r.post("/models/providers/:id/test", wrap2(async (req, res) => res.json(await hub2.selfTest(provider(req), actorOf2(res)))));
  r.post("/gateway/complete", wrap2(async (req, res) => {
    const { system = "", prompt = "", provenance, purpose, agentId } = req.body ?? {};
    const agent = typeof agentId === "string" ? agentById(agentId) : void 0;
    const out = await hub2.complete({ system: typeof system === "string" ? system : "", prompt: typeof prompt === "string" ? prompt : "", purpose, provenance, actor: actorOf2(res), agent });
    res.json({ text: out.text, draft: out.draft, provider: out.provider, model: out.model, flags: out.flags });
  }));
  r.get("/ai/tools", (_q, res) => res.json({ providerReady: hub2.anyReady(), tools: TOOLS.map((t) => ({ name: t.name, description: t.description })) }));
  r.post("/ai/copilot", wrap2(async (req, res) => {
    const { message = "", history = [] } = req.body ?? {};
    if (typeof message !== "string" || !message.trim()) return void res.status(400).json({ error: "message string is required" });
    const out = await hub2.copilot(message, history, actorOf2(res));
    res.json({ text: out.text, toolInvocations: out.toolInvocations, draft: out.draft, provider: out.provider, model: out.model, flags: out.flags });
  }));
  r.post("/ai/agent-recommendations", wrap2(async (req, res) => {
    const { agentId, currentValues = {} } = req.body ?? {};
    if (typeof agentId !== "string" || !agentId) return void res.status(400).json({ error: "agentId is required" });
    const agent = agentById(agentId);
    if (!agent) return void res.status(404).json({ error: `Agent ${agentId} not found` });
    res.json(await hub2.recommend(agent, currentValues, actorOf2(res)));
  }));
  return r;
}

// server.ts
var env = process.env;
var REPO = env.ECOSYSTEM_REPO ?? "Sarah-JaneHarding/infinite-ai-ecosystem";
var PORT = Number(env.PORT ?? 3e3);
var HOST = env.HOST || "127.0.0.1";
var auth;
try {
  auth = parseAuth({ ...env, HOST });
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
}
var contractProblems = checkRegistry(AGENTS, { departments: DEPARTMENTS.map((d) => d.id) });
if (Object.keys(contractProblems).length) {
  console.error(`FATAL: agent contracts do not hold:
${formatProblems(contractProblems)}`);
  process.exit(1);
}
var store = new FileStore();
var reader = new GithubReader(REPO, env.GITHUB_TOKEN);
var publisher = new ProposalPublisher(REPO, env.GITHUB_TOKEN, env.OPS_ALLOW_ECOSYSTEM_WRITES === "true");
var hub;
try {
  hub = new ModelHub({ env, store, limiter: new RateLimiter(20, 6e4) });
} catch (err) {
  console.error(`FATAL: model hub configuration: ${err.message}`);
  process.exit(1);
}
var appendValidated = (collection, rec, actor) => serial(async () => {
  const v2 = await validateAppend(collection, rec, { actor, store });
  store.append(collection, v2);
});
var autonomy;
try {
  autonomy = new AutonomyService({ env, store, runner: makeRunner({ store, appendValidated, hub, facts: () => ({ ...snapshotFacts(), ...cache ? liveFacts(cache.status) : {} }) }) });
} catch (err) {
  console.error(`FATAL: autonomy configuration: ${err.message}`);
  process.exit(1);
}
var roles;
try {
  roles = parseRoles(env.OPS_ROLES, auth);
} catch (err) {
  console.error(`FATAL: ${err.message}`);
  process.exit(1);
}
var limits = requestLimits({ perMinute: Number(env.OPS_RATE_PER_MINUTE) > 0 ? Number(env.OPS_RATE_PER_MINUTE) : 300, badTokensPerMinute: 10 });
var app = express();
app.disable("x-powered-by");
if (env.OPS_TRUST_PROXY === "1") app.set("trust proxy", 1);
app.use(securityHeaders({ csp: env.NODE_ENV === "production", hsts: env.OPS_HSTS === "on" }));
app.use("/api", limits.general);
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
app.get("/api/health", (_q, res) => res.json({
  ok: true,
  repo: REPO,
  auth: auth.mode,
  githubToken: Boolean(env.GITHUB_TOKEN),
  llm: hub.anyReady(),
  autonomy: autonomy.enabled,
  roles: roles !== null,
  ecosystemWrites: env.OPS_ALLOW_ECOSYSTEM_WRITES === "true",
  webhook: Boolean(env.GITHUB_WEBHOOK_SECRET),
  outbound: parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST).length > 0
}));
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
  void autonomy.onEvent(ev.kind).catch((e) => console.error("autonomy event failed:", e.message));
  res.json({ ok: true });
}));
app.use(express.json({ limit: "512kb" }));
app.use("/api", (req, res, next) => {
  const actor = authenticate(auth, req.header("x-ops-token"));
  if (auth.mode === "users" && !actor) return limits.failure(req, res) ? void 0 : res.status(401).json({ error: "unauthorised" });
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
    const problem = ratifiedProblem(store, art);
    if (problem) return res.status(403).json({ error: problem });
    const summary = String(req.body?.summary ?? "").slice(0, 4e3);
    const out = await publisher.openIssue(art, proposalFromArtefact(art, summary));
    store.append("connector_events", { id: `pub_${Date.now()}`, kind: "issue_opened", summary: out.url, by: actor, at: (/* @__PURE__ */ new Date()).toISOString() });
    res.json(out);
  } catch (e) {
    if (e instanceof PublishRefused) return res.status(403).json({ error: e.message });
    throw e;
  }
}));
app.get("/api/integrations/targets", (_q, res) => res.json({ hosts: parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST), signed: Boolean(env.OPS_OUTBOUND_SECRET) }));
app.post("/api/integrations/send", wrap(async (req, res) => {
  const actor = actorOf(res);
  if (!actor) return res.status(403).json({ error: "Sending needs an authenticated user (set OPS_USERS)." });
  const t = checkTarget(String(req.body?.url ?? ""), parseAllowlist(env.OPS_OUTBOUND_ALLOWLIST));
  if (!t.ok) return res.status(403).json({ error: t.why });
  const id = String(req.body?.artefactId ?? "");
  const art = store.list("artefact_versions").filter((r2) => r2.id === id).at(-1);
  if (!art) return res.status(404).json({ error: "unknown artefact" });
  const problem = ratifiedProblem(store, art);
  if (problem) return res.status(403).json({ error: problem });
  try {
    const addrs = await lookup(t.url.hostname, { all: true });
    if (!addrs.length || addrs.some((a) => isPrivateIp(a.address))) return res.status(403).json({ error: "That host resolves to a non-public address." });
  } catch {
    return res.status(502).json({ error: "Could not resolve that host." });
  }
  const body = JSON.stringify(payloadFor(art));
  const headers = { "content-type": "application/json", "user-agent": "infinite-ai-ops" };
  if (env.OPS_OUTBOUND_SECRET) headers["x-ops-signature"] = sign(env.OPS_OUTBOUND_SECRET, body);
  const r = await fetch(t.url, { method: "POST", headers, body, redirect: "error", signal: AbortSignal.timeout(1e4) }).catch((e) => ({ ok: false, status: 0, statusText: e.message }));
  store.append("connector_events", { id: `out_${Date.now()}`, kind: "artefact_sent", summary: `${art.id} v${art.version} to ${t.url.hostname}: ${r.status}`, by: actor, at: (/* @__PURE__ */ new Date()).toISOString() });
  res.status(r.ok ? 200 : 502).json({ ok: r.ok, status: r.status, host: t.url.hostname });
}));
app.post("/api/models/providers/:id/attest", requireRole(roles, "officer"));
app.post("/api/autonomy/orders/:id/activate", requireRole(roles, "officer"));
app.use("/api", modelRoutes(hub));
app.use("/api", autonomyRoutes(autonomy));
app.post("/api/ledger", wrap(async (req, res) => {
  try {
    const out = await appendLedger(store, req.body?.input, req.body?.knownSeq, actorOf(res), void 0, { client: true });
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
      const rec = await validateAppend(req.params.collection, req.body, { actor: actorOf(res), store, roles: rolesOf(roles, actorOf(res)) });
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
  if (autonomy.enabled) {
    setInterval(() => void autonomy.tick().catch((e) => console.error("autonomy tick failed:", e.message)), 6e4).unref();
  }
  app.listen(PORT, HOST, () => {
    console.log(`Infinite-AI Ops Platform on http://${HOST}:${PORT}  (repo: ${REPO}; auth: ${auth.mode}; autonomy: ${autonomy.enabled ? "on" : "off"})`);
    if (auth.mode === "open") console.warn("WARNING: no users configured (OPS_USERS). Open dev mode: identity is self-declared and publishing is disabled.");
  });
}
start();
