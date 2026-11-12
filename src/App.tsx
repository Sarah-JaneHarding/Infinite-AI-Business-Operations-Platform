import { useEffect, useState } from 'react';
import { 
  BookOpen, 
  BrainCircuit, 
  Bot, 
  ClipboardCheck, 
  Cpu, 
  Database, 
  Eraser, 
  DollarSign, 
  FileText, 
  Gauge, 
  GitBranch, 
  Globe, 
  ListChecks, 
  Menu, 
  ScrollText, 
  ShieldAlert, 
  Sparkles, 
  Users,
  ChevronDown,
  ChevronRight
} from 'lucide-react';
import { OpsProvider, useOps, type View } from './ui/store';
import { Icon } from './ui/primitives';
import { DocumentStudio } from './ui/DocumentStudio';
import { AICopilot } from './ui/AICopilot';
import { ErasureView } from './ui/Erasure';
import { ModelHub } from './ui/ModelHub';
import { Board } from './ui/Board';
import { Autonomy } from './ui/Autonomy';
import { CloudAndFinance } from '../legacy/components/CloudAndFinance';
import { EducationEcosystemWebsite } from '../legacy/components/EducationEcosystemWebsite';
import { onNavigate } from './ui/nav';
import { BrainView, ConnectorView, Dept, GuardrailLab, LedgerView, Overview, WarehouseView } from './ui/Views';
import { DEPARTMENTS } from './departments';

function Shell() {
  const { view, go, p, mode, actor, setActor, llm, setLlm, health, authNeeded, authError, signIn, syncError } = useOps();
  const [navOpen, setNavOpen] = useState(false);
  const [deptsOpen, setDeptsOpen] = useState(false);
  const [name, setName] = useState('');
  const [token, setTokenInput] = useState('');

  const item = (v: View, label: string, icon: React.ReactNode, on: boolean, badge?: string) => (
    <button key={label} className={`flex items-center justify-between w-full ${on ? 'on font-bold' : ''}`} onClick={() => { go(v); setNavOpen(false); }} aria-current={on ? 'page' : undefined}>
      <span className="flex items-center gap-2">{icon}{label}</span>
      {badge && <span className="mono text-[9px] px-1.5 py-0.5 rounded bg-cyan-950/80 text-cyan-300 border border-cyan-500/30">{badge}</span>}
    </button>
  );

  if (authNeeded) return (
    <div className="card mx-auto mt-10 max-w-md space-y-3 p-5">
      <h1 className="text-xl font-bold">Sign in</h1>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>This server requires your access token. Approvals are recorded against the person the token belongs to.</p>
      <input className="input" type="password" autoComplete="off" placeholder="Access token" value={token} onChange={(e) => setTokenInput(e.target.value)} aria-label="Access token" />
      {authError && <p className="text-xs" style={{ color: 'var(--muted)' }}>{authError}</p>}
      <button className="btn primary" disabled={token.trim().length < 20} onClick={() => signIn(token)}>Sign in</button>
    </div>
  );
  if (!p) return <div className="p-8">Starting the platform…</div>;
  const needName = health?.auth !== 'users' && (!actor.name || actor.name === 'Operator');

  return (
    <div className="flex min-h-full">
      <aside className={`nav fixed inset-y-0 left-0 z-20 w-64 overflow-y-auto p-3 lg:static lg:block flex flex-col justify-between ${navOpen ? 'block' : 'hidden'}`} style={{ background: '#0e0b24' }}>
        <div>
          {/* Logo & Brand Header */}
          <div className="mb-4 px-2 pt-2 border-b border-indigo-900/40 pb-3 cursor-pointer" onClick={() => go({ name: 'overview' })}>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-violet-500 via-teal-400 to-cyan-400 p-[1.5px] shadow-sm">
                <div className="w-full h-full bg-[#0e0b24] rounded-[6px] flex items-center justify-center">
                  <span className="font-mono text-cyan-400 font-black text-xs">∞</span>
                </div>
              </div>
              <div>
                <div className="text-base font-bold text-white tracking-wide" style={{ fontFamily: 'var(--fd)' }}>
                  INFINITE-AI <span className="text-cyan-400 font-black">OPS</span>
                </div>
                <div className="mono text-[9.5px] tracking-wider" style={{ color: '#9d97cf' }}>
                  OPERATIONS PLATFORM
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Items */}
          <div className="space-y-1">
            {item({ name: 'overview' }, 'Command Centre', <Gauge size={16} />, view.name === 'overview')}
            {item({ name: 'studio' }, 'Document Studio', <BookOpen size={16} className="text-purple-300" />, view.name === 'studio')}
            {item({ name: 'warehouse' }, 'Data Warehouse', <Database size={16} className="text-cyan-400" />, view.name === 'warehouse')}

            {/* 16 Departments section */}
            <div>
              <button
                type="button"
                className={`flex items-center justify-between w-full px-2 py-1.5 rounded-lg text-xs font-medium transition ${deptsOpen || view.name === 'dept' ? 'text-white' : 'text-[#8f89c4] hover:text-white'}`}
                onClick={() => setDeptsOpen(!deptsOpen)}
              >
                <span className="flex items-center gap-2">
                  <Users size={16} className="text-amber-300" />
                  <span>16 Departments</span>
                </span>
                {deptsOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {(deptsOpen || view.name === 'dept') && (
                <div className="ml-4 pl-2 border-l border-indigo-900/60 space-y-0.5 mt-1">
                  {DEPARTMENTS.map((d) => item({ name: 'dept', id: d.id }, d.name, <Icon name={d.icon} />, view.name === 'dept' && view.id === d.id))}
                </div>
              )}
            </div>

            {item({ name: 'brain' }, 'Infinite Brain', <BrainCircuit size={16} className="text-emerald-400" />, view.name === 'brain')}
            {item({ name: 'ledger' }, 'Audit Ledger', <ScrollText size={16} className="text-rose-300" />, view.name === 'ledger')}
            {item({ name: 'cost' }, 'Cost & Finance', <DollarSign size={16} className="text-emerald-400" />, view.name === 'cost')}
            {item({ name: 'showcase' }, 'Ecosystem Showcase', <Globe size={16} className="text-cyan-300" />, view.name === 'showcase')}
            {item({ name: 'guardrails' }, 'Guardrail Lab', <ShieldAlert size={16} className="text-purple-400" />, view.name === 'guardrails')}
            {item({ name: 'connector' }, 'GitHub Connector', <GitBranch size={16} className="text-sky-400" />, view.name === 'connector')}
            {item({ name: 'autonomy' }, 'Autonomous Agents', <Bot size={16} className="text-cyan-300" />, view.name === 'autonomy')}
            {item({ name: 'board' }, 'Review Board', <ClipboardCheck size={16} className="text-amber-300" />, view.name === 'board')}
            {item({ name: 'models' }, 'Model Hub', <Cpu size={16} className="text-violet-300" />, view.name === 'models')}
            {item({ name: 'erasure' }, 'Erasure Requests', <Eraser size={16} className="text-rose-300" />, view.name === 'erasure')}
            {item({ name: 'copilot' }, 'Operations Copilot & Tools', <Sparkles size={16} className="text-violet-400" />, view.name === 'copilot')}
          </div>
        </div>

        {/* Sidebar Footer with L0-L4 BRAIN ONLINE Indicator */}
        <div className="mt-6 pt-3 border-t border-indigo-900/40">
          <div className="rounded-lg bg-[#070517] p-2.5 border border-indigo-500/20 text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
              </span>
              <span className="mono text-[10.5px] font-bold tracking-wider text-emerald-400">
                L0–L4 BRAIN ONLINE
              </span>
            </div>
            <p className="text-[9.5px] text-slate-400 mt-1 font-mono">
              AWS af-south-1 · POPIA §72
            </p>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 flex flex-wrap items-center gap-3 border-b px-4 py-2" style={{ background: 'var(--cream)', borderColor: 'var(--line)' }}>
          <button className="btn lg:hidden" aria-label="Menu" onClick={() => setNavOpen(!navOpen)}><Menu size={16} /></button>
          <span className="badge info"><ListChecks size={11} className="mr-1 inline" />POPIA · learner data refused</span>
          <span className={`badge ${mode === 'server' ? 'ok' : 'draft'}`}>{mode === 'server' ? 'server storage' : 'browser storage'}</span>
          <label className="ml-auto flex items-center gap-2 text-xs"><input type="checkbox" checked={llm} disabled={!health?.llm} onChange={(e) => setLlm(e.target.checked)} /> AI narrative {health?.llm ? '' : '(not configured)'}</label>
          {!needName && <span className="text-xs">Signed in as <b>{actor.name}</b> · {actor.roles[0]}</span>}
        </header>

        {syncError && <div role="alert" className="border-b px-4 py-2 text-sm" style={{ background: '#fdecec', borderColor: 'var(--line)', color: '#9b1c1c' }}>The server did not accept a record, so this view may be ahead of what is saved: {syncError}. Reload to see what is stored.</div>}
        <main className="mx-auto max-w-[1440px] p-4">
          {needName ? (
            <div className="card mx-auto mt-10 max-w-md space-y-3 p-5">
              <h1 className="text-xl font-bold">Who is deciding?</h1>
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Approvals are recorded against a named human. Enter your name and role. (Production sign-in is an open question; see docs/OPEN_QUESTIONS.md.)</p>
              <input className="input" placeholder="Your name" value={name} onChange={(e) => setName(e.target.value)} aria-label="Your name" />
              <button className="btn primary" disabled={!name.trim()} onClick={() => setActor(name.trim(), 'Founder')}>Continue</button>
            </div>
          ) : view.name === 'overview' ? <Overview />
            : view.name === 'dept' ? <Dept id={view.id} />
            : view.name === 'studio' ? <DocumentStudio initialArtefactId={view.id} initialDocId={view.docId} />
            : view.name === 'copilot' ? <AICopilot />
            : view.name === 'brain' ? <BrainView />
            : view.name === 'ledger' ? <LedgerView />
            : view.name === 'warehouse' ? <WarehouseView />
            : view.name === 'cost' ? <CloudAndFinance />
            : view.name === 'showcase' ? <EducationEcosystemWebsite onSwitchToOps={() => go({ name: 'overview' })} />
            : view.name === 'connector' ? <ConnectorView />
            : view.name === 'erasure' ? <ErasureView />
            : view.name === 'models' ? <ModelHub />
            : view.name === 'board' ? <Board />
            : view.name === 'autonomy' ? <Autonomy />
            : <GuardrailLab />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return <OpsProvider><Shell /></OpsProvider>;
}
