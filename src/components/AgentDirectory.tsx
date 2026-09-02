import React, { useState, useMemo } from 'react';
import { FULL_46_AGENTS, HUMAN_LEADERSHIP } from '../data/agentRegistry';
import { AgentRecord } from '../types';
import { 
  Users, 
  Search, 
  Filter, 
  ShieldCheck, 
  Cpu, 
  Play, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  Terminal, 
  Lock,
  Layers,
  Sparkles,
  ArrowRight,
  ExternalLink,
  ChevronRight,
  X
} from 'lucide-react';

export const AgentDirectory: React.FC = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('All');
  const [selectedAgent, setSelectedAgent] = useState<AgentRecord | null>(null);
  const [activeView, setActiveView] = useState<'ai' | 'human'>('ai');

  // Task dispatch simulation state
  const [dispatchTaskInput, setDispatchTaskInput] = useState('');
  const [dispatching, setDispatching] = useState(false);
  const [dispatchOutput, setDispatchOutput] = useState<{
    agentId: string;
    agentName: string;
    output: string;
    timestamp: string;
  } | null>(null);

  // Unique departments list
  const departments = useMemo(() => {
    const deps = new Set(FULL_46_AGENTS.map(a => a.department));
    return ['All', ...Array.from(deps)];
  }, []);

  // Filtered agents
  const filteredAgents = useMemo(() => {
    return FULL_46_AGENTS.filter(agent => {
      const matchDep = selectedDepartment === 'All' || agent.department === selectedDepartment;
      const q = searchQuery.toLowerCase();
      const matchQuery = 
        agent.name.toLowerCase().includes(q) ||
        agent.role.toLowerCase().includes(q) ||
        agent.skills.some(s => s.toLowerCase().includes(q)) ||
        agent.department.toLowerCase().includes(q) ||
        agent.id.toLowerCase().includes(q);
      return matchDep && matchQuery;
    });
  }, [selectedDepartment, searchQuery]);

  // Handle task dispatch simulation
  const handleDispatchTask = (agent: AgentRecord) => {
    if (!dispatchTaskInput.trim()) return;
    setDispatching(true);
    setDispatchOutput(null);

    setTimeout(() => {
      setDispatchOutput({
        agentId: agent.id,
        agentName: agent.name,
        output: `[TELEMETRY: TASK DISPATCHED TO ${agent.id} · ${agent.name}]
Correlation ID: corr-${Math.random().toString(36).substring(2, 9)}
RBAC Authorization: VALIDATED (Permissions: ${agent.permissions.read.join(', ')})
L5 Membrane Check: ZERO PII DETECTED in payload
Execution:
  -> Prompt synthesized against Brain L0/L3 standards
  -> Guardrail check passed: ${agent.guardrails[0]}
  -> HITL Gate Triggered: "${agent.hitl_gates[0] || 'Standard Review'}" (Requires human sign-off before downstream commit)

RESULT: Task executed successfully and written to L4 Episodic Working Memory.`,
        timestamp: new Date().toLocaleTimeString()
      });
      setDispatching(false);
    }, 850);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">ENTERPRISE WORKFORCE &amp; AGENT DIRECTORY</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            46 Departmental AI Employees &amp; <span className="grad">Human Leadership</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Complete registry of autonomous departmental agents across twelve enterprise functions.
            Every agent operates under defined skills, strict guardrails, explicit RBAC data permissions, and non-bypassable HITL approval gates.
          </p>
        </div>

        {/* View Toggle */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0E1830] rounded-xl border border-[rgba(148,163,255,0.14)] self-start md:self-auto">
          <button
            onClick={() => setActiveView('ai')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'ai'
                ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>46 AI Agents</span>
          </button>
          <button
            onClick={() => setActiveView('human')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeView === 'human'
                ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40 shadow-sm'
                : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Human Executives</span>
          </button>
        </div>
      </div>

      {activeView === 'human' ? (
        /* Human Leadership Roster */
        <div className="space-y-4">
          <div className="panel p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="kick">HUMAN GOVERNANCE COCKPIT</p>
                <h2 className="text-base font-bold text-[#E9EDF8]">Authorized Executive Decision-Makers</h2>
              </div>
              <span className="chip border-emerald-500/30 text-emerald-400 text-xs">
                Law 02 Enforced (The Human Decides)
              </span>
            </div>

            <p className="text-xs text-[#8FA0C2] mb-6">
              In accordance with Build Manual §0.2, AI agents generate drafts, detect anomalies, and calculate models,
              but all final statutory decisions, policy ratifications, and budget allocations are held by authorized human leaders.
            </p>

            <div className="grid md:grid-cols-2 gap-4">
              {HUMAN_LEADERSHIP.map((leader, i) => (
                <div key={i} className="panel2 p-5 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h3 className="font-bold text-sm text-[#E9EDF8]">{leader.name}</h3>
                      <p className="text-xs text-[#22D3EE] font-medium">{leader.role}</p>
                      <span className="text-[10px] text-[#8FA0C2] font-mono">{leader.department}</span>
                    </div>
                    <span className="st st-pass text-[10px]">{leader.status}</span>
                  </div>

                  <div className="text-xs space-y-1.5 pt-2 border-t border-[rgba(148,163,255,0.08)]">
                    <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">Primary Sign-off Responsibilities:</span>
                    <ul className="space-y-1 text-[#8FA0C2] text-[11px]">
                      {leader.responsibilities.map((r, idx) => (
                        <li key={idx} className="flex items-center gap-1.5">
                          <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span>{r}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="pt-2 flex items-center justify-between text-[11px] text-[#8FA0C2]">
                    <span className="font-mono">{leader.email}</span>
                    <span className="text-[10px] text-[#22D3EE]">Authorized Signer</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* 46 AI Agents View */
        <div className="space-y-5">
          {/* Controls: Search & Department Tabs */}
          <div className="panel p-4 space-y-3">
            <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
              {/* Search Bar */}
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-[#8FA0C2] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search 46 agents, skills, or roles..."
                  className="inp pl-9 text-xs"
                />
              </div>

              <div className="text-xs text-[#8FA0C2] font-mono">
                Showing <strong className="text-[#22D3EE]">{filteredAgents.length}</strong> of 46 registered agents
              </div>
            </div>

            {/* Department Filter Chips */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
              <Filter className="w-3.5 h-3.5 text-[#8FA0C2] shrink-0 mr-1" />
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDepartment(dept)}
                  className={`px-3 py-1 rounded-lg font-medium whitespace-nowrap transition-all text-[11px] ${
                    selectedDepartment === dept
                      ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                      : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#1a2c52]'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </div>
          </div>

          {/* Agents Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3.5">
            {filteredAgents.map((agent) => (
              <div
                key={agent.id}
                onClick={() => setSelectedAgent(agent)}
                className="panel2 p-4 cursor-pointer hover:border-[#22D3EE]/50 hover:bg-[#13203C]/80 transition-all flex flex-col justify-between group relative"
              >
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-mono text-[11px] text-[#22D3EE] font-bold bg-[#0E1830] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                      {agent.id}
                    </span>
                    <span className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Active
                    </span>
                  </div>

                  <h3 className="text-sm font-bold text-[#E9EDF8] group-hover:text-[#22D3EE] transition-colors leading-tight">
                    {agent.name}
                  </h3>
                  <p className="text-[11px] text-[#8FA0C2] font-medium mt-0.5">
                    {agent.role}
                  </p>

                  <div className="mt-2.5">
                    <span className="text-[9px] uppercase font-mono text-[#8FA0C2] block mb-1">
                      Department:
                    </span>
                    <span className="inline-block text-[10px] px-2 py-0.5 rounded bg-[#0E1830] text-[#8FA0C2] border border-[rgba(148,163,255,0.1)]">
                      {agent.department}
                    </span>
                  </div>

                  <div className="mt-2.5">
                    <span className="text-[9px] uppercase font-mono text-[#8FA0C2] block mb-1">
                      Core Skills:
                    </span>
                    <div className="flex flex-wrap gap-1">
                      {agent.skills.slice(0, 3).map((skill, idx) => (
                        <span key={idx} className="text-[9px] px-1.5 py-0.5 rounded bg-[#13203C] text-[#8FA0C2]">
                          {skill}
                        </span>
                      ))}
                      {agent.skills.length > 3 && (
                        <span className="text-[9px] text-[#8FA0C2] self-center">
                          +{agent.skills.length - 3}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="pt-3 border-t border-[rgba(148,163,255,0.08)] mt-3 flex items-center justify-between text-[10px] text-[#8FA0C2]">
                  <span>Tasks: {agent.telemetry.tasksHandled}</span>
                  <span className="text-[#22D3EE] flex items-center gap-0.5 group-hover:translate-x-0.5 transition-transform">
                    Inspect Specs <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Agent Detail Modal */}
      {selectedAgent && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 relative border border-[#22D3EE]/30 shadow-2xl">
            {/* Close Button */}
            <button
              onClick={() => setSelectedAgent(null)}
              className="absolute top-5 right-5 text-[#8FA0C2] hover:text-[#E9EDF8] p-1 rounded-lg bg-[#0E1830]"
            >
              <X className="w-5 h-5" />
            </button>

            {/* Header */}
            <div className="flex items-start gap-3">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#8B5CF6] to-[#22D3EE] p-[1.5px]">
                <div className="w-full h-full bg-[#0A1226] rounded-[10px] flex items-center justify-center text-sm font-mono font-bold text-[#22D3EE]">
                  {selectedAgent.id}
                </div>
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-bold text-[#E9EDF8]">{selectedAgent.name}</h2>
                  <span className="chip border-emerald-500/30 text-emerald-400 text-[10px]">
                    Autonomous AI Worker
                  </span>
                </div>
                <p className="text-xs text-[#22D3EE]">{selectedAgent.role} · {selectedAgent.department}</p>
              </div>
            </div>

            {/* Spec Sections */}
            <div className="grid md:grid-cols-2 gap-4 mt-6">
              {/* Skills */}
              <div className="panel2 p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-[#22D3EE] uppercase tracking-wider block">
                  1. Defined Skills &amp; Competencies
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedAgent.skills.map((skill, i) => (
                    <span key={i} className="text-xs px-2 py-1 rounded bg-[#0E1830] text-[#E9EDF8] border border-[rgba(148,163,255,0.12)]">
                      {skill}
                    </span>
                  ))}
                </div>
              </div>

              {/* Responsibilities */}
              <div className="panel2 p-3.5 space-y-2">
                <span className="text-[10px] font-mono text-cyan-300 uppercase tracking-wider block">
                  2. Operational Responsibilities
                </span>
                <ul className="text-xs space-y-1 text-[#8FA0C2]">
                  {selectedAgent.responsibilities.map((resp, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400 shrink-0 mt-0.5" />
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Guardrails */}
              <div className="panel2 p-3.5 space-y-2 border-l-2 border-l-rose-400">
                <span className="text-[10px] font-mono text-rose-400 uppercase tracking-wider block flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" />
                  3. System Guardrails &amp; Constraints
                </span>
                <ul className="text-xs space-y-1 text-[#8FA0C2]">
                  {selectedAgent.guardrails.map((g, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0 mt-0.5" />
                      <span className="text-[#E9EDF8]">{g}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* HITL Gates */}
              <div className="panel2 p-3.5 space-y-2 border-l-2 border-l-amber-400">
                <span className="text-[10px] font-mono text-amber-400 uppercase tracking-wider block flex items-center gap-1">
                  <Lock className="w-3 h-3" />
                  4. Non-Bypassable HITL Approval Gates
                </span>
                <ul className="text-xs space-y-1 text-[#8FA0C2]">
                  {selectedAgent.hitl_gates.map((gate, i) => (
                    <li key={i} className="flex items-start gap-1.5">
                      <span className="text-amber-400 font-bold">•</span>
                      <span>Requires human sign-off on: <strong className="text-[#E9EDF8]">{gate}</strong></span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* RBAC Permissions Table */}
            <div className="mt-4 panel2 p-3.5 space-y-2">
              <span className="text-[10px] font-mono text-[#8FA0C2] uppercase tracking-wider block">
                5. RBAC Data Scope &amp; Permissions
              </span>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="p-2 rounded bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                  <span className="text-[10px] text-emerald-400 block font-mono">READ SCOPE:</span>
                  <p className="text-[#E9EDF8] mt-0.5 font-mono text-[11px]">
                    {selectedAgent.permissions.read.join(', ')}
                  </p>
                </div>
                <div className="p-2 rounded bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                  <span className="text-[10px] text-cyan-300 block font-mono">WRITE SCOPE:</span>
                  <p className="text-[#E9EDF8] mt-0.5 font-mono text-[11px]">
                    {selectedAgent.permissions.write.join(', ') || 'None (Read-Only)'}
                  </p>
                </div>
                <div className="p-2 rounded bg-[#0E1830] border border-[rgba(148,163,255,0.08)]">
                  <span className="text-[10px] text-rose-400 block font-mono">EXECUTE:</span>
                  <p className="text-[#E9EDF8] mt-0.5 font-mono text-[11px]">
                    {selectedAgent.permissions.execute.length ? selectedAgent.permissions.execute.join(', ') : 'Gated by Orchestrator'}
                  </p>
                </div>
              </div>
            </div>

            {/* Dispatch Interactive Task Test */}
            <div className="mt-5 pt-4 border-t border-[rgba(148,163,255,0.1)] space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E9EDF8] flex items-center gap-1.5">
                  <Terminal className="w-4 h-4 text-[#22D3EE]" />
                  Simulate Task Dispatch to {selectedAgent.name}
                </span>
                <span className="text-[10px] text-[#8FA0C2]">Live orchestrator sandbox</span>
              </div>

              <div className="flex gap-2">
                <input
                  type="text"
                  value={dispatchTaskInput}
                  onChange={(e) => setDispatchTaskInput(e.target.value)}
                  placeholder={`Assign a task (e.g., "Analyze Q3 compliance audit for tenant Beacon Ridge")...`}
                  className="inp text-xs flex-1"
                />
                <button
                  onClick={() => handleDispatchTask(selectedAgent)}
                  disabled={dispatching || !dispatchTaskInput.trim()}
                  className="btn btn-p text-xs px-4"
                >
                  <Play className="w-3.5 h-3.5 mr-1" />
                  {dispatching ? 'Executing...' : 'Dispatch'}
                </button>
              </div>

              {dispatchOutput && dispatchOutput.agentId === selectedAgent.id && (
                <div className="panel2 p-3.5 bg-[#05070f] border border-[#22D3EE]/30 font-mono text-xs text-[#E9EDF8] space-y-1">
                  <div className="flex items-center justify-between text-[10px] text-[#8FA0C2] pb-1 border-b border-[rgba(148,163,255,0.1)]">
                    <span>ORCHESTRATOR TELEMETRY TRACE</span>
                    <span>{dispatchOutput.timestamp}</span>
                  </div>
                  <pre className="text-[11px] text-[#22D3EE] whitespace-pre-wrap mt-1">
                    {dispatchOutput.output}
                  </pre>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
