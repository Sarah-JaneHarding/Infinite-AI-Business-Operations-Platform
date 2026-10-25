import { useState } from 'react';
import { BrainCircuit, Database, FileText, Gauge, GitBranch, ListChecks, Menu, ScrollText, ShieldAlert } from 'lucide-react';
import { OpsProvider, useOps, type View } from './ui/store';
import { Icon } from './ui/primitives';
import { Studio } from './ui/Studio';
import { BrainView, ConnectorView, Dept, GuardrailLab, LedgerView, Overview, WarehouseView } from './ui/Views';
import { DEPARTMENTS } from './departments';

function Shell() {
  const { view, go, p, mode, actor, setActor, engine, setEngine, health } = useOps();
  const [navOpen, setNavOpen] = useState(false);
  const [name, setName] = useState('');
  const item = (v: View, label: string, icon: React.ReactNode, on: boolean) => (
    <button key={label} className={on ? 'on' : ''} onClick={() => { go(v); setNavOpen(false); }} aria-current={on ? 'page' : undefined}>{icon}{label}</button>
  );
  if (!p) return <div className="p-8">Starting the platform…</div>;
  const needName = !actor.name || actor.name === 'Operator';
  return (
    <div className="flex min-h-full">
      <aside className={`nav fixed inset-y-0 left-0 z-20 w-64 overflow-y-auto p-3 lg:static lg:block ${navOpen ? 'block' : 'hidden'}`} style={{ background: '#14112b' }}>
        <div className="mb-3 px-2 pt-1"><div className="text-lg font-bold text-white" style={{ fontFamily: 'var(--fd)' }}>Infinite-AI</div><div className="mono text-[10.5px]" style={{ color: '#a7a2cf' }}>OPERATIONS PLATFORM</div></div>
        {item({ name: 'overview' }, 'Command centre', <Gauge size={16} />, view.name === 'overview')}
        <div className="mono mx-2 mb-1 mt-3 text-[10px] uppercase tracking-wider" style={{ color: '#8f89c4' }}>Departments</div>
        {DEPARTMENTS.map((d) => item({ name: 'dept', id: d.id }, d.name, <Icon name={d.icon} />, view.name === 'dept' && view.id === d.id))}
        <div className="mono mx-2 mb-1 mt-3 text-[10px] uppercase tracking-wider" style={{ color: '#8f89c4' }}>Core</div>
        {item({ name: 'studio' }, 'Artefact studio', <FileText size={16} />, view.name === 'studio')}
        {item({ name: 'brain' }, 'Infinite Brain', <BrainCircuit size={16} />, view.name === 'brain')}
        {item({ name: 'warehouse' }, 'Data warehouse', <Database size={16} />, view.name === 'warehouse')}
        {item({ name: 'ledger' }, 'Audit ledger', <ScrollText size={16} />, view.name === 'ledger')}
        {item({ name: 'connector' }, 'Ecosystem connector', <GitBranch size={16} />, view.name === 'connector')}
        {item({ name: 'guardrails' }, 'Guardrail lab', <ShieldAlert size={16} />, view.name === 'guardrails')}
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-4 py-2" style={{ background: 'var(--cream)', borderColor: 'var(--line)' }}>
          <button className="btn lg:hidden" aria-label="Menu" onClick={() => setNavOpen(!navOpen)}><Menu size={16} /></button>
          <span className="badge info"><ListChecks size={11} className="mr-1 inline" />POPIA · learner data refused</span>
          <span className={`badge ${mode === 'server' ? 'ok' : 'draft'}`}>{mode === 'server' ? 'server storage' : 'browser storage'}</span>
          <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={engine === 'claude'} disabled={!health?.claude} onChange={(e) => setEngine(e.target.checked ? 'claude' : 'local')} /> Claude narrative {health?.claude ? '' : '(not configured)'}</label>
          <label className="flex items-center gap-2 text-xs"><input type="checkbox" checked={engine === 'gemini'} disabled={!health?.gemini} onChange={(e) => setEngine(e.target.checked ? 'gemini' : 'local')} /> Gemini narrative {health?.gemini ? '' : '(not configured)'}</label>
          {!needName && <span className="text-xs">Signed in as <b>{actor.name}</b> · {actor.roles[0]}</span>}
        </header>
        <main className="mx-auto max-w-[1400px] p-4">
          {needName ? (
            <div className="card mx-auto mt-10 max-w-md space-y-3 p-5">
              <h1 className="text-xl font-bold">Who is deciding?</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Approvals are recorded against a named human. Enter your name and role. (Production sign-in is an open question; see docs/OPEN_QUESTIONS.md.)</p>
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
              <button className="btn primary" disabled={!name.trim()} onClick={() => setActor(name.trim(), 'Founder')}>Continue</button>
            </div>
          ) : view.name === 'overview' ? <Overview />
            : view.name === 'dept' ? <Dept id={view.id} />
            : view.name === 'studio' ? <Studio id={view.id} />
            : view.name === 'brain' ? <BrainView />
            : view.name === 'ledger' ? <LedgerView />
            : view.name === 'warehouse' ? <WarehouseView />
            : view.name === 'connector' ? <ConnectorView />
            : <GuardrailLab />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <OpsProvider><Shell /></OpsProvider>;
}
