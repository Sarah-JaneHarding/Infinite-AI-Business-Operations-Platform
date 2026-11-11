import React, { useState } from 'react';
import { NavTab } from './types';
import { OpsProvider, useOps } from './ui/store';
import { Navbar } from './components/Navbar';
import { DocsAndRatify } from './components/DocsAndRatify';
import { DataWarehouse } from './components/DataWarehouse';
import { CloudAndFinance } from './components/CloudAndFinance';
import { EducationEcosystemWebsite } from './components/EducationEcosystemWebsite';
import { Studio } from './ui/Studio';
import { Library } from './ui/Library';
import { Builders } from './ui/Builders';
import { onNavigate } from './ui/nav';
import { 
  Overview, 
  Dept, 
  BrainView, 
  LedgerView, 
  WarehouseView, 
  ConnectorView, 
  GuardrailLab 
} from './ui/Views';
import { DEPARTMENTS } from './departments';
import { 
  ShieldCheck, 
  Lock, 
  Cpu, 
  FileText, 
  Database, 
  PenTool, 
  ArrowRight, 
  CheckCircle2, 
  Layers,
  Users
} from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<NavTab>('command');
  React.useEffect(() => onNavigate((d) => { setActiveTab(d.tab as NavTab); if (d.sub) setStudioSubView(d.sub as 'library'); }), []);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('ai');
  const [selectedStudioDocId, setSelectedStudioDocId] = useState<string | null>(null);
  const [studioSubView, setStudioSubView] = useState<'ops_docs' | 'artefacts' | 'library' | 'builders'>('ops_docs');
  const [ratifiedCount, setRatifiedCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ia_ratified_count');
      return saved ? parseInt(saved, 10) : 42;
    } catch {
      return 42;
    }
  });

  const handleRatifyPolicy = () => {
    setRatifiedCount(prev => {
      const next = Math.min(136, prev + 1);
      try { localStorage.setItem('ia_ratified_count', next.toString()); } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#E9EDF8] flex flex-col font-sans selection:bg-cyan-500/30 selection:text-white">
      {/* Top Fixed Navbar */}
      <Navbar 
        activeTab={activeTab} 
        onSelectTab={setActiveTab}
        ratifiedCount={ratifiedCount}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-20 pb-16">
        {/* TAB 1: COMMAND CENTRE */}
        {activeTab === 'command' && (
          <div className="space-y-6">
            {/* Quick Navigation Cards */}
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <button 
                onClick={() => setActiveTab('studio')}
                className="card p-4 text-left hover:border-cyan-400 transition-all group bg-[#0A1226]/80"
              >
                <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-1">
                  <span className="font-mono text-cyan-400 font-bold">DOCUMENT STUDIO</span>
                  <FileText className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Viewer, Editor &amp; Ratify</h3>
                <p className="text-[11px] text-[#CBD5E1] mt-1">
                  Read, review, edit markdown, and execute countersignatures.
                </p>
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-2 font-mono">
                  <span>Open Studio</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('warehouse')}
                className="card p-4 text-left hover:border-cyan-400 transition-all group bg-[#0A1226]/80"
              >
                <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-1">
                  <span className="font-mono text-cyan-400 font-bold">MOD-03 WAREHOUSE</span>
                  <Database className="w-4 h-4 text-cyan-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Multi-Tenant Store</h3>
                <p className="text-[11px] text-[#CBD5E1] mt-1">
                  Contracts, primary school tenants, policies &amp; SQL console.
                </p>
                <span className="text-[10px] text-cyan-400 flex items-center gap-1 mt-2 font-mono">
                  <span>Open Warehouse</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('infra')}
                className="card p-4 text-left hover:border-emerald-400 transition-all group bg-[#0A1226]/80"
              >
                <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-1">
                  <span className="font-mono text-emerald-400 font-bold">R4k / MO SAAS</span>
                  <span className="text-xs font-bold text-emerald-400">ZAR</span>
                </div>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Cost &amp; Finance Model</h3>
                <p className="text-[11px] text-[#CBD5E1] mt-1">
                  Primary school unit economics &amp; AWS Cape Town bills.
                </p>
                <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-2 font-mono">
                  <span>View Calculator</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>

              <button 
                onClick={() => setActiveTab('depts')}
                className="card p-4 text-left hover:border-purple-400 transition-all group bg-[#0A1226]/80"
              >
                <div className="flex items-center justify-between text-xs text-[#CBD5E1] mb-1">
                  <span className="font-mono text-purple-400 font-bold">16 DEPARTMENTS</span>
                  <Users className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
                </div>
                <h3 className="text-sm font-bold text-[#E9EDF8]">48 Specialist Agents</h3>
                <p className="text-[11px] text-[#CBD5E1] mt-1">
                  Run agents, inspect widgets, and view departmental missions.
                </p>
                <span className="text-[10px] text-purple-400 flex items-center gap-1 mt-2 font-mono">
                  <span>Explore Agents</span>
                  <ArrowRight className="w-3 h-3" />
                </span>
              </button>
            </div>

            {/* Core Overview Platform Engine */}
            <Overview />
          </div>
        )}

        {/* TAB 2: DOCUMENT STUDIO & RATIFICATION */}
        {activeTab === 'studio' && (
          <div className="space-y-4">
            {/* Studio Mode Toggle Bar */}
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#0E1830] border border-[rgba(148,163,255,0.1)]">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStudioSubView('ops_docs')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    studioSubView === 'ops_docs' 
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40' 
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Operations &amp; Policy Document Editor</span>
                </button>

                <button
                  onClick={() => setStudioSubView('artefacts')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    studioSubView === 'artefacts' 
                      ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40' 
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Agent Generative Artefacts Studio</span>
                </button>
                <button
                  onClick={() => setStudioSubView('library')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    studioSubView === 'library' 
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Library &amp; Templates</span>
                </button>

                <button
                  onClick={() => setStudioSubView('builders')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all ${
                    studioSubView === 'builders' 
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                      : 'text-[#CBD5E1] hover:text-white'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Agent, Widget &amp; Artefact Builders</span>
                </button>
              </div>

              <span className="text-[11px] font-mono text-[#CBD5E1] hidden sm:block">
                Non-bypassable Human Decision Gate (Law 02)
              </span>
            </div>

            {studioSubView === 'ops_docs' ? (
              <DocsAndRatify 
                ratifiedCount={ratifiedCount}
                onRatifyPolicy={handleRatifyPolicy}
                onNavigateToWarehouse={() => setActiveTab('warehouse')}
                initialDocId={selectedStudioDocId}
              />
            ) : studioSubView === 'library' ? (
              <Library />
            ) : studioSubView === 'builders' ? (
              <Builders />
            ) : (
              <Studio id={selectedStudioDocId || undefined} />
            )}
          </div>
        )}

        {/* TAB 3: DATA WAREHOUSE */}
        {activeTab === 'warehouse' && (
          <div className="space-y-6">
            <DataWarehouse 
              onOpenDocInEditor={(docId) => {
                setSelectedStudioDocId(docId);
                setStudioSubView('ops_docs');
                setActiveTab('studio');
              }}
            />
            
            {/* Raw System Warehouse Collections */}
            <div className="pt-6 border-t border-[rgba(148,163,255,0.1)]">
              <WarehouseView />
            </div>
          </div>
        )}

        {/* TAB 4: 16 DEPARTMENTS & AGENTS */}
        {activeTab === 'depts' && (
          <div className="space-y-6">
            {/* Department Navigation Strip */}
            <div className="card p-3 space-y-2 bg-[#0A1226]/80">
              <div className="flex items-center justify-between">
                <span className="text-xs font-mono text-cyan-400 uppercase font-bold">
                  Select Department (16 Operational Divisions)
                </span>
                <span className="text-xs text-[#CBD5E1]">
                  Active: <strong className="text-[#E9EDF8]">{DEPARTMENTS.find(d => d.id === selectedDeptId)?.name}</strong>
                </span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {DEPARTMENTS.map(d => (
                  <button
                    key={d.id}
                    onClick={() => setSelectedDeptId(d.id)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-all ${
                      selectedDeptId === d.id
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                        : 'bg-[#13203C] text-[#CBD5E1] hover:text-white'
                    }`}
                  >
                    {d.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Department View with Agents & Widgets */}
            <Dept id={selectedDeptId} />
          </div>
        )}

        {/* TAB 5: INFINITE BRAIN L0-L4 */}
        {activeTab === 'brain' && (
          <BrainView />
        )}

        {/* TAB 6: AUDIT LEDGER */}
        {activeTab === 'ledger' && (
          <LedgerView />
        )}

        {/* TAB 7: COST & FINANCE */}
        {activeTab === 'infra' && (
          <CloudAndFinance />
        )}

        {/* TAB 8: ECOSYSTEM SHOWCASE */}
        {activeTab === 'website' && (
          <EducationEcosystemWebsite onSwitchToOps={() => setActiveTab('command')} />
        )}

        {/* TAB 9: GUARDRAIL LAB */}
        {activeTab === 'guardrails' && (
          <GuardrailLab />
        )}

        {/* TAB 10: GITHUB CONNECTOR */}
        {activeTab === 'connector' && (
          <ConnectorView />
        )}
      </main>

      {/* System Footer */}
      <footer className="border-t border-[rgba(148,163,255,0.08)] bg-[#0A1226]/80 backdrop-blur py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#CBD5E1]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-[#E9EDF8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>INFINITE-AI OPS PLATFORM</span>
            </div>
            <span>·</span>
            <span className="font-mono text-[11px]">AI drafts. The human decides.</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              POPIA Section 72 Compliant
            </span>
            <span>·</span>
            <span className="text-cyan-400 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5" />
              Non-Bypassable HITL Gates
            </span>
            <span>·</span>
            <span className="text-purple-300 flex items-center gap-1">
              <Cpu className="w-3.5 h-3.5" />
              AWS af-south-1 (Cape Town)
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}

export default function App() {
  return (
    <OpsProvider>
      <AppContent />
    </OpsProvider>
  );
}
