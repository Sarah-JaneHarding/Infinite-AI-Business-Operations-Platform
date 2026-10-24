#!/usr/bin/env node
// Ecosystem audit: reads a LOCAL checkout of infinite-ai-ecosystem (read-only) and writes a
// factual snapshot. No numbers are estimated: every figure is counted from files, and the
// snapshot records which file each came from. Usage:
//   node scripts/audit-ecosystem.mjs <path-to-ecosystem-checkout> [out.json]
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';
import { execFileSync } from 'node:child_process';

const root = process.argv[2];
const out = process.argv[3] ?? 'src/generated/ecosystem-snapshot.json';
if (!root || !existsSync(root)) {
  console.error('usage: audit-ecosystem.mjs <ecosystem-checkout> [out.json]');
  process.exit(2);
}

const SKIP = new Set(['node_modules', '.git', 'dist', '.next', '.turbo', 'coverage']);
function* walk(dir) {
  for (const name of readdirSync(dir)) {
    if (SKIP.has(name)) continue;
    const p = join(dir, name);
    const st = statSync(p);
    if (st.isDirectory()) yield* walk(p);
    else yield p;
  }
}
const isTest = (p) => /\.(test|spec)\.(ts|tsx)$/.test(p);
const isTs = (p) => /\.(ts|tsx)$/.test(p) && !p.endsWith('.d.ts');
const loc = (p) => readFileSync(p, 'utf8').split('\n').length;
const read = (rel) => {
  const p = join(root, rel);
  return existsSync(p) ? readFileSync(p, 'utf8') : '';
};

// --- git (best effort; a shallow clone reports what it can see) ---
function git(...args) {
  try {
    return execFileSync('git', ['-C', root, ...args], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
  } catch {
    return null;
  }
}
const repo = {
  head: git('log', '-1', '--format=%h'),
  headDate: git('log', '-1', '--format=%ad', '--date=short'),
  headSubject: git('log', '-1', '--format=%s'),
  visibleCommits: git('rev-list', '--count', 'HEAD') ? Number(git('rev-list', '--count', 'HEAD')) : null,
  shallow: git('rev-parse', '--is-shallow-repository') === 'true',
};

// --- code / tests per workspace unit ---
const units = [];
for (const top of ['apps', 'packages']) {
  const base = join(root, top);
  if (!existsSync(base)) continue;
  for (const name of readdirSync(base).sort()) {
    const dir = join(base, name);
    if (!statSync(dir).isDirectory()) continue;
    let srcLoc = 0, testLoc = 0, srcFiles = 0, testFiles = 0;
    for (const f of walk(dir)) {
      if (!isTs(f)) continue;
      if (isTest(f)) { testFiles++; testLoc += loc(f); }
      else { srcFiles++; srcLoc += loc(f); }
    }
    units.push({ kind: top === 'apps' ? 'app' : 'package', name, srcFiles, srcLoc, testFiles, testLoc });
  }
}
const totals = units.reduce(
  (a, u) => ({ srcFiles: a.srcFiles + u.srcFiles, srcLoc: a.srcLoc + u.srcLoc, testFiles: a.testFiles + u.testFiles, testLoc: a.testLoc + u.testLoc }),
  { srcFiles: 0, srcLoc: 0, testFiles: 0, testLoc: 0 },
);

// --- build stages from STAGE_LOG headings ---
const stageLog = read('docs/STAGE_LOG.md');
const stages = [...stageLog.matchAll(/^## Stage (\d+) — (.+)$/gm)].map((m) => {
  const dated = m[2].match(/^(.*?)\s·\s(\d{4}-\d{2}-\d{2})$/);
  return { n: Number(m[1]), title: (dated ? dated[1] : m[2]).trim(), date: dated ? dated[2] : null };
});

// --- open questions: summary table rows + "### OQ-" sections ---
const oqText = read('docs/OPEN_QUESTIONS.md');
const oqMap = new Map();
for (const m of oqText.matchAll(/^\|\s*(OQ-\d+)\s*\|\s*([\d-]+)\s*\|\s*([^|]*)\|\s*([^|]*?)\s*\|\s*(.+?)\s*\|\s*$/gm)) {
  const text = m[5].replace(/\*\*/g, '');
  oqMap.set(m[1], { id: m[1], raised: m[2], stage: m[3].trim(), status: m[4].trim(), title: text.slice(0, 160) });
}
for (const m of oqText.matchAll(/^### (OQ-\d+)(?: \(partial\))? — (.+?)(?: · (resolved )?(\d{4}-\d{2}-\d{2}))?$/gm)) {
  if (!oqMap.has(m[1])) oqMap.set(m[1], { id: m[1], raised: m[4] ?? null, stage: '', status: m[3] ? 'RESOLVED' : 'OPEN', title: m[2].slice(0, 160) });
}
const oqs = [...oqMap.values()].sort((a, b) => a.id.localeCompare(b.id));
const oqOpen = oqs.filter((q) => !/^RESOLVED/i.test(q.status));

// --- agents: contract files, plus the documented roster number ---
const agentsDir = join(root, 'packages/agents/src');
const contracts = [];
if (existsSync(agentsDir)) {
  for (const f of walk(agentsDir)) {
    const m = f.match(/([A-Z]{2}-\d{2})\.contract\.ts$/);
    if (m) contracts.push({ id: m[1], module: relative(agentsDir, f).split('/')[0] });
  }
}
const byModule = {};
for (const c of contracts) byModule[c.module] = (byModule[c.module] ?? 0) + 1;
const rosterClaim = read('docs/AGENTS.md').match(/(\w+(?:-\w+)?) agents across five modules/i)?.[1] ?? null;

// --- docs inventory ---
const docs = existsSync(join(root, 'docs'))
  ? readdirSync(join(root, 'docs')).filter((f) => !statSync(join(root, 'docs', f)).isDirectory()).sort()
  : [];
const runbooks = existsSync(join(root, 'docs/RUNBOOKS')) ? readdirSync(join(root, 'docs/RUNBOOKS')).sort() : [];
const ci = existsSync(join(root, '.github/workflows')) ? readdirSync(join(root, '.github/workflows')).sort() : [];

const snapshot = {
  schema: 'infinite-ai.ecosystem-snapshot/1',
  source: { repo: 'Sarah-JaneHarding/infinite-ai-ecosystem', method: 'local-checkout-count', note: 'Every number below is counted from files. Test PASS counts are not claimed here: they come from CI via the live connector.' },
  repo,
  code: { totals, units },
  stages: { count: stages.length, first: stages[0] ?? null, latest: stages.slice(-8), stageLogLines: stageLog.split('\n').length },
  openQuestions: { total: oqs.length, open: oqOpen.length, openList: oqOpen, all: oqs },
  agents: { contractFiles: contracts.length, byModule, rosterClaimInAgentsMd: rosterClaim, ids: contracts.map((c) => c.id).sort() },
  docs: { files: docs, runbooks, ciWorkflows: ci },
};

mkdirSync(dirname(out), { recursive: true });
writeFileSync(out, JSON.stringify(snapshot, null, 2) + '\n');
console.log(`wrote ${out}: ${units.length} units, ${totals.srcLoc} src LOC, ${totals.testFiles} test files, ${stages.length} stages, ${oqOpen.length}/${oqs.length} OQs open, ${contracts.length} agent contracts`);
