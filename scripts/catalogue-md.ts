// Generates docs/AGENT_CATALOGUE.md from src/departments/catalogue.ts. Run: npx tsx scripts/catalogue-md.ts
import { writeFileSync } from 'node:fs';
import { CATALOGUE, catalogueTasks } from '../src/departments/catalogue';
import { DEPARTMENTS } from '../src/departments';

const built = new Set(DEPARTMENTS.flatMap((d) => d.agents.map((a) => a.id)));
const tasks = catalogueTasks();
const name = (id: string) => DEPARTMENTS.find((d) => d.id === id)!.name;
const L: string[] = [];
L.push('# Agent catalogue', '');
L.push('Roles, tasks and specialist agents for the 16 business operations departments. **Roles are drafted for the founder to review**: the repository defines none, so rename, merge or drop any of them. Each role has two tasks, and each task has one agent.', '');
L.push(`- ${tasks.length} agents in total: ${tasks.filter((t) => built.has(t.id)).length} built, ${tasks.filter((t) => !built.has(t.id)).length} planned.`);
L.push('- Every agent drafts for a human, needs approval, and invents no numbers or policy. Agents marked **2nd** need a second approver.');
L.push('- Ids follow `OPS-<CODE>-nn`. Existing agents keep their numbers. New ones continue from 04.');
L.push('- All 100 agents are built. The Batch number in the source is the order they were built: Finance and Government first, then one department per batch.', '');
L.push('| Department | Roles | Agents | Built | Planned |', '|---|---|---|---|---|');
for (const d of CATALOGUE) { const t = tasks.filter((x) => x.dept === d.dept); L.push(`| ${name(d.dept)} | ${d.roles.length} | ${t.length} | ${t.filter((x) => built.has(x.id)).length} | ${t.filter((x) => !built.has(x.id)).length} |`); }
L.push('');
for (const d of CATALOGUE) {
  L.push(`## ${name(d.dept)}`, '');
  for (const r of d.roles) {
    L.push(`### ${r.role}`, '', '| Agent | Task | What it produces | You supply | Formats | Widget | Status |', '|---|---|---|---|---|---|---|');
    for (const t of r.tasks) L.push(`| ${t.id}${t.two ? ' (2nd)' : ''} | ${t.name} | ${t.summary} | ${t.inputs.join('; ')} | ${t.out} | ${t.widget ?? ''} | ${built.has(t.id) ? 'Built' : `Planned, batch ${t.batch}`} |`);
    L.push('');
  }
}
L.push('## Widgets added with this catalogue', '', '- **Finance:** School quote calculator (calc), Month-end close (checklist), Debtors (tracker), Grants (tracker).', '- **Government:** Funding and partnership leads (tracker, seeded with 43 leads), Partner onboarding (checklist), Tender requirements (tracker).', '- Widgets marked “(new)” in the tables for other departments are proposed and built with their batch.', '');
L.push('## Decisions for you', '', '1. Do the drafted roles suit how you will run each department? Rename, merge or drop any.', '2. FIN-05 quotes use the pricing formula, which is still a proposal (decision D-1). Approve D-1 before any quote leaves the company.', '3. Departments with legal, employment or funder-facing output carry a second approver. Say if you want more or fewer.', '');
writeFileSync('docs/AGENT_CATALOGUE.md', L.join('\n'));
console.log(L.length, 'lines');
