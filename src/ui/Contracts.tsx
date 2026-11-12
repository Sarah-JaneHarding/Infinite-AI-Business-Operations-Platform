import { useMemo, useState } from 'react';
import { FileCheck2 } from 'lucide-react';
import { Badge, Card } from './primitives';
import { AGENTS, DEPARTMENTS } from '../departments';
import { CONTRACT_RULES, checkContract } from '../core/contract';

/** Read-only register of every built-in agent's contract, with the rules re-checked live. */
export function Contracts() {
  const [q, setQ] = useState('');
  const env = useMemo(() => ({ departments: DEPARTMENTS.map((d) => d.id) }), []);
  const rows = useMemo(() => AGENTS.map((a) => ({ a, problems: checkContract(a, env) })), [env]);
  const shown = rows.filter(({ a }) => `${a.id} ${a.name} ${a.dept} ${a.purpose}`.toLowerCase().includes(q.toLowerCase()));
  const broken = rows.filter((r) => r.problems.length).length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2"><FileCheck2 size={20} /><h1 className="text-xl font-semibold">Agent contracts</h1></div>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>Each agent promises an owner, one purpose, a data ceiling, a budget, an evaluation and a human decision. The server checks these promises when it starts and refuses to run if one is broken.</p>
      <Card><div className="p-3 text-sm"><b>{rows.length}</b> agents registered. <b>{broken}</b> breaking a rule.
        <ul className="mt-2 grid gap-1 md:grid-cols-2">{CONTRACT_RULES.map((r) => <li key={r.id}><b>{r.id} {r.title}.</b> {r.text}</li>)}</ul></div></Card>
      <input className="input w-full" placeholder="Search by id, name, department or purpose" aria-label="Search contracts" value={q} onChange={(e) => setQ(e.target.value)} />
      <div className="overflow-x-auto"><table className="w-full text-left text-sm">
        <thead><tr><th>Agent</th><th>Owner role</th><th>Purpose</th><th>Data ceiling</th><th>Models</th><th>Budget</th><th>Signers</th><th>Contract</th></tr></thead>
        <tbody>{shown.map(({ a, problems }) => (
          <tr key={a.id} className="border-t" style={{ borderColor: 'var(--line)' }}>
            <td><b>{a.id}</b><div className="text-xs" style={{ color: 'var(--muted)' }}>{a.name}</div></td>
            <td>{a.owner}</td><td>{a.purpose}</td><td>{a.dataClass}</td>
            <td>{a.models?.join(', ') ?? 'any attested'}</td><td>{a.budget.maxPromptChars}</td>
            <td>{a.secondApprover ? 'two people' : 'reviewer + countersigner'}</td>
            <td>{problems.length ? <Badge tone="bad">{problems.map((p) => p.rule).join(' ')}</Badge> : <Badge tone="ok">holds</Badge>}</td>
          </tr>))}</tbody></table></div>
    </div>
  );
}
