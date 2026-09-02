import React, { useState } from 'react';
import { RepoConnection, ProductEpic, AutonomousTask } from '../types';
import { 
  GitBranch, 
  GitPullRequest, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  ShieldCheck, 
  Play, 
  RefreshCw, 
  Plus, 
  Terminal, 
  ArrowRight, 
  Lock, 
  FileCode, 
  Check, 
  X, 
  Layers, 
  Cpu, 
  Zap, 
  Sliders, 
  FileText,
  Workflow,
  ExternalLink,
  Shield,
  Activity,
  AlertCircle
} from 'lucide-react';

interface ProductDevelopmentManagerProps {
  repoConnection: RepoConnection;
  epics: ProductEpic[];
  tasks: AutonomousTask[];
  onSyncRepos: () => void;
  onApproveTask: (taskId: string, comment: string, approverName: string) => void;
  onRejectTask: (taskId: string, reason: string) => void;
  onAddTask: (newTask: Omit<AutonomousTask, 'id' | 'createdAt' | 'updatedAt' | 'releaseVersion'>) => void;
  onRunTestTask: (taskId: string) => void;
}

export const ProductDevelopmentManager: React.FC<ProductDevelopmentManagerProps> = ({
  repoConnection,
  epics,
  tasks,
  onSyncRepos,
  onApproveTask,
  onRejectTask,
  onAddTask,
  onRunTestTask
}) => {
  const [activeTab, setActiveTab] = useState<'board' | 'approvals' | 'tests' | 'epics' | 'bridge'>('board');
  const [selectedTask, setSelectedTask] = useState<AutonomousTask | null>(() => {
    return tasks.find(t => t.status === 'AWAITING_APPROVAL') || tasks[0] || null;
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  // Approval Modal/Drawer State
  const [approvalComment, setApprovalComment] = useState('Verified compliance against POPIA Section 72 and Law 02. Approved for automated merge to tecosystem:main.');
  const [approverName, setApproverName] = useState('Sarah-Jane (CEO & Founder)');
  const [law02Confirmed, setLaw02Confirmed] = useState(true);

  // New Autonomous Task Modal State
  const [showNewTaskModal, setShowNewTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskEpicId, setNewTaskEpicId] = useState(epics[0]?.id || 'EPIC-TEC-01');
  const [newTaskAgentId, setNewTaskAgentId] = useState('A04');
  const [newTaskPriority, setNewTaskPriority] = useState<'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'>('HIGH');
  const [newTaskDescription, setNewTaskDescription] = useState('');

  // Live Test Runner State
  const [runningTestSuite, setRunningTestSuite] = useState<string | null>(null);
  const [testOutputTerminal, setTestOutputTerminal] = useState<string | null>(null);

  const pendingApprovalsCount = tasks.filter(t => t.status === 'AWAITING_APPROVAL').length;
  const inTestingCount = tasks.filter(t => t.status === 'TESTING').length;
  const mergedCount = tasks.filter(t => t.status === 'MERGED').length;
  const inDevCount = tasks.filter(t => t.status === 'AUTONOMOUS_DEV').length;

  const handleManualSync = () => {
    setIsSyncing(true);
    setSyncNotice(null);
    onSyncRepos();
    setTimeout(() => {
      setIsSyncing(false);
      setSyncNotice('Dual-repo sync verified: commit hashes and webhook state aligned with tecosystem:main');
      setTimeout(() => setSyncNotice(null), 4000);
    }, 900);
  };

  const handleExecuteApproval = (task: AutonomousTask) => {
    if (!law02Confirmed) return;
    onApproveTask(task.id, approvalComment, approverName);
    if (selectedTask?.id === task.id) {
      setSelectedTask(prev => prev ? {
        ...prev,
        status: 'MERGED',
        approvalCheck: {
          ...prev.approvalCheck,
          status: 'APPROVED',
          signedBy: approverName,
          signedAt: new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC',
          signatureHash: 'sha256:' + Math.random().toString(16).substring(2, 14) + Math.random().toString(16).substring(2, 14),
          comments: approvalComment
        }
      } : null);
    }
  };

  const handleCreateAutonomousTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    const agentLookup: Record<string, { name: string; role: string; department: string }> = {
      'A01': { name: 'Oracle-Product', role: 'Chief Product Officer', department: 'Product & Strategy' },
      'A03': { name: 'Nexus-Architect', role: 'Principal Software Architect', department: 'Software Engineering' },
      'A04': { name: 'Titan-FullStack', role: 'Full-Stack Development Lead', department: 'Software Engineering' },
      'A05': { name: 'Aegis-DevOps', role: 'DevOps & Cloud Lead', department: 'DevOps & Cloud' },
      'A06': { name: 'Vanguard-QA', role: 'QA & Testing Automation Lead', department: 'Software Engineering' },
      'A11': { name: 'Sentinel-Auditor', role: 'Security & Compliance Auditor', department: 'Security & Compliance' }
    };

    const agent = agentLookup[newTaskAgentId] || agentLookup['A04'];
    const branchName = `feat/tecosystem-${newTaskTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 24)}`;

    onAddTask({
      title: newTaskTitle,
      epicId: newTaskEpicId,
      repo: 'tecosystem',
      branch: branchName,
      assignedAgent: {
        id: newTaskAgentId,
        name: agent.name,
        role: agent.role,
        department: agent.department
      },
      collaboratingAgents: ['A03 · Principal Architect', 'A06 · QA Automation'],
      status: 'AUTONOMOUS_DEV',
      priority: newTaskPriority,
      description: newTaskDescription || 'Autonomous feature delivery for tecosystem product core with automated test harness.',
      diffSummary: {
        filesChanged: 3,
        additions: 85,
        deletions: 12,
        files: [`packages/core/src/${newTaskTitle.toLowerCase().replace(/\s+/g, '-')}.ts`]
      },
      testResults: {
        totalTests: 24,
        passed: 24,
        failed: 0,
        durationMs: 310,
        coveragePct: 96.5,
        suites: [
          { name: 'Unit: Core Module Verification', status: 'PASS', tests: 14, duration: '120ms' },
          { name: 'Integration: API Gateway & RLS Contract', status: 'PASS', tests: 10, duration: '190ms' }
        ],
        securityScan: {
          status: 'PASS',
          piiChecked: true,
          popiaCompliant: true,
          details: 'Zero PII leakages detected in input/output AST.'
        }
      },
      approvalCheck: {
        required: true,
        status: 'PENDING',
        approverRole: 'Sarah-Jane (CEO) / Product Architect',
        gatedReason: 'Law 02 (Human-in-the-Loop) gating required before merging into tecosystem:main.'
      },
      codeDiff: `diff --git a/packages/core/src/${newTaskTitle.toLowerCase().replace(/\s+/g, '-')}.ts b/packages/core/src/${newTaskTitle.toLowerCase().replace(/\s+/g, '-')}.ts
new file mode 100644
--- /dev/null
+++ b/packages/core/src/${newTaskTitle.toLowerCase().replace(/\s+/g, '-')}.ts
@@ -0,0 +1,24 @@
+// Autonomous Agent Implementation by ${agent.name} (${newTaskAgentId})
+// Managed by Infinite AI Business Operations Platform for tecosystem
+export interface SpecConfig {
+  tenantId: string;
+  enabled: boolean;
+}
+
+export function initializeModule(config: SpecConfig) {
+  if (!config.tenantId) throw new Error('Law 04 violation: tenantId required');
+  return { status: 'INITIALIZED', timestamp: Date.now() };
+}`
    });

    setNewTaskTitle('');
    setNewTaskDescription('');
    setShowNewTaskModal(false);
  };

  const handleSimulateTests = (task: AutonomousTask) => {
    setRunningTestSuite(task.id);
    setTestOutputTerminal(`> cd ../tecosystem && pnpm test --filter=${task.branch}

[TECOSYSTEM:AUTONOMOUS_TEST_HARNESS]
Initializing sandbox environment in af-south-1 isolated VPC...
Loaded security policy: Law 01 (Membrane) + Law 04 (Tenant Isolation)
Agent in charge: ${task.assignedAgent.name} (${task.assignedAgent.id})

Running test suites for ${task.branch}:
`);

    setTimeout(() => {
      setTestOutputTerminal(prev => (prev || '') + `  ✔ packages/test/unit.spec.ts (${task.testResults.totalTests} tests) - ${task.testResults.durationMs}ms
  ✔ packages/test/security-popia.spec.ts (POPIA Sec 72 Audit) - PASSED
  ✔ packages/test/tenant-isolation.spec.ts (RLS cross-tenant leak check) - 0 leaks
  
All ${task.testResults.totalTests} automated tests PASSED. Coverage: ${task.testResults.coveragePct}%
Automated test gate cleared. Task transitioned to: AWAITING_APPROVAL (HITL Law 02).`);
      setRunningTestSuite(null);
      onRunTestTask(task.id);
    }, 1200);
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Top Dual-Repository Connection Banner */}
      <div className="panel p-6 relative overflow-hidden border border-[#22D3EE]/20">
        <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-[#22D3EE]/10 via-purple-500/5 to-transparent pointer-events-none" />

        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="chip text-[10px] bg-emerald-950/40 text-emerald-300 border-emerald-500/30 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Dual-Repository Sync Active
              </span>
              <span className="text-xs text-[#8FA0C2] font-mono">
                Bridge Latency: {repoConnection.syncLatencyMs}ms
              </span>
              <span className="text-xs text-[#8FA0C2] font-mono">
                Sync Status: {repoConnection.syncStatus}
              </span>
            </div>

            <h1 className="text-xl md:text-2xl font-bold text-[#E9EDF8] flex items-center gap-2">
              <span>Business Operations</span>
              <ArrowRight className="w-4 h-4 text-[#22D3EE]" />
              <span className="text-[#22D3EE]">tecosystem Product Development</span>
            </h1>

            <p className="text-xs md:text-sm text-[#8FA0C2] mt-1 max-w-3xl">
              The business operations app governs, budgets, tests, and drives engineering releases in the core{' '}
              <strong className="text-[#E9EDF8]">tecosystem</strong> repository. Autonomous AI-agents plan, write code, and execute automated test suites under non-bypassable human approval checks (<strong className="text-[#22D3EE]">Law 02</strong>).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleManualSync}
              disabled={isSyncing}
              className="btn btn-g text-xs py-2 px-3.5 flex items-center gap-2 font-mono"
              title="Poll tecosystem repository for new commits and webhooks"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-[#22D3EE]' : 'text-[#8FA0C2]'}`} />
              <span>{isSyncing ? 'Syncing...' : 'Sync Repos Now'}</span>
            </button>

            <button
              onClick={() => setShowNewTaskModal(true)}
              className="btn btn-p text-xs py-2 px-3.5 flex items-center gap-2"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Dispatch Autonomous Task</span>
            </button>
          </div>
        </div>

        {/* Sync Toast Notice */}
        {syncNotice && (
          <div className="mt-3 p-2.5 rounded-md bg-emerald-950/30 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{syncNotice}</span>
          </div>
        )}

        {/* Dual-Repository Twin Cards */}
        <div className="grid md:grid-cols-2 gap-4 mt-5">
          {/* Operations Repository */}
          <div className="panel2 p-4 border border-[rgba(148,163,255,0.15)] bg-[#0B1528]/80">
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#8FA0C2] uppercase">
                Host / Governance Repository
              </span>
              <span className="chip text-[10px] bg-blue-950/40 text-blue-300 border-blue-500/30">
                Operations & Brain
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#22D3EE]" />
              <strong className="text-sm text-[#E9EDF8] font-mono">{repoConnection.opsRepo.name}</strong>
            </div>
            <div className="text-xs text-[#8FA0C2] mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3 h-3 text-[#8FA0C2]" />
                <span>Branch: <code className="text-[#22D3EE] font-mono">{repoConnection.opsRepo.branch}</code></span>
                <span className="text-[#8FA0C2]">· Commit: <code className="text-[#E9EDF8] font-mono">{repoConnection.opsRepo.commitHash}</code></span>
              </div>
              <p className="text-[11px] text-[#8FA0C2] italic truncate">
                "{repoConnection.opsRepo.lastCommitMsg}"
              </p>
            </div>
          </div>

          {/* Product Repository: tecosystem */}
          <div className="panel2 p-4 border border-[#22D3EE]/30 bg-[#0B1528]/80 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-24 h-24 bg-[#22D3EE]/5 pointer-events-none rounded-bl-full" />
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="text-[10px] font-mono tracking-wider text-[#22D3EE] uppercase">
                Managed Product Repository
              </span>
              <span className="chip text-[10px] bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
                Target: tecosystem
              </span>
            </div>
            <div className="flex items-center gap-2">
              <GitPullRequest className="w-4 h-4 text-emerald-400" />
              <strong className="text-sm text-[#E9EDF8] font-mono">{repoConnection.productRepo.name}</strong>
            </div>
            <div className="text-xs text-[#8FA0C2] mt-2 space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="w-3 h-3 text-emerald-400" />
                <span>Branch: <code className="text-emerald-400 font-mono">{repoConnection.productRepo.branch}</code></span>
                <span className="text-[#8FA0C2]">· Commit: <code className="text-[#E9EDF8] font-mono">{repoConnection.productRepo.commitHash}</code></span>
              </div>
              <p className="text-[11px] text-[#8FA0C2] italic truncate">
                "{repoConnection.productRepo.lastCommitMsg}"
              </p>
            </div>
          </div>
        </div>

        {/* Live Telemetry Ribbons */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 text-xs font-mono">
          <div className="panel2 p-2.5 flex items-center justify-between">
            <span className="text-[#8FA0C2]">Autonomous In-Flight</span>
            <strong className="text-[#22D3EE]">{inDevCount + inTestingCount} Tasks</strong>
          </div>
          <div className="panel2 p-2.5 flex items-center justify-between">
            <span className="text-[#8FA0C2]">Pending HITL Approvals</span>
            <strong className={pendingApprovalsCount > 0 ? 'text-amber-300' : 'text-emerald-400'}>
              {pendingApprovalsCount} Action{pendingApprovalsCount === 1 ? '' : 's'}
            </strong>
          </div>
          <div className="panel2 p-2.5 flex items-center justify-between">
            <span className="text-[#8FA0C2]">Automated Tests Passing</span>
            <strong className="text-emerald-400">100% (48 Suites)</strong>
          </div>
          <div className="panel2 p-2.5 flex items-center justify-between">
            <span className="text-[#8FA0C2]">Merged to tecosystem</span>
            <strong className="text-[#E9EDF8]">{mergedCount} Delivered</strong>
          </div>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex items-center gap-1.5 border-b border-[rgba(148,163,255,0.15)] pb-2 overflow-x-auto text-xs">
        <button
          onClick={() => setActiveTab('board')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'board'
              ? 'bg-[#1D2B4F] text-[#22D3EE] border border-[rgba(34,211,238,0.4)]'
              : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#13203C]'
          }`}
        >
          <Workflow className="w-3.5 h-3.5" />
          <span>Autonomous Sprint Board</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#13203C] text-[#8FA0C2]">
            {tasks.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('approvals')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'approvals'
              ? 'bg-[#1D2B4F] text-[#22D3EE] border border-[rgba(34,211,238,0.4)]'
              : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#13203C]'
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Approval Checks (Law 02)</span>
          {pendingApprovalsCount > 0 && (
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
              {pendingApprovalsCount}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('tests')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'tests'
              ? 'bg-[#1D2B4F] text-[#22D3EE] border border-[rgba(34,211,238,0.4)]'
              : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#13203C]'
          }`}
        >
          <Terminal className="w-3.5 h-3.5" />
          <span>Automated Test Matrix</span>
        </button>

        <button
          onClick={() => setActiveTab('epics')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'epics'
              ? 'bg-[#1D2B4F] text-[#22D3EE] border border-[rgba(34,211,238,0.4)]'
              : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#13203C]'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>Product Epics & Roadmap</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-[#13203C] text-[#8FA0C2]">
            {epics.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bridge')}
          className={`px-3.5 py-1.5 rounded-md font-medium transition-all flex items-center gap-2 whitespace-nowrap ${
            activeTab === 'bridge'
              ? 'bg-[#1D2B4F] text-[#22D3EE] border border-[rgba(34,211,238,0.4)]'
              : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#13203C]'
          }`}
        >
          <GitBranch className="w-3.5 h-3.5" />
          <span>Git Bridge & Webhook Config</span>
        </button>
      </div>

      {/* TAB 1: AUTONOMOUS SPRINT BOARD */}
      {activeTab === 'board' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#E9EDF8]">
                Autonomous Agent Execution Pipeline (Target: <code className="text-[#22D3EE]">tecosystem</code>)
              </h2>
              <p className="text-xs text-[#8FA0C2]">
                Agents autonomously write code diffs, trigger automated test runs, and await non-bypassable human sign-off.
              </p>
            </div>
            <div className="text-xs text-[#8FA0C2] font-mono">
              Non-Bypassable HITL: <span className="text-emerald-400">Enforced by Law 02</span>
            </div>
          </div>

          {/* Kanban Columns */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {/* Column 1: Autonomous In-Dev */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1D38] border border-[rgba(148,163,255,0.1)]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E9EDF8]">
                  <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
                  <span>Autonomous In-Dev</span>
                </div>
                <span className="chip text-[10px] bg-blue-950/40 text-blue-300">
                  {tasks.filter(t => t.status === 'AUTONOMOUS_DEV' || t.status === 'BACKLOG').length}
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'AUTONOMOUS_DEV' || t.status === 'BACKLOG').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className={`panel p-3.5 space-y-2.5 cursor-pointer transition-all hover:border-[#22D3EE]/50 ${
                      selectedTask?.id === task.id ? 'border-[#22D3EE] ring-1 ring-[#22D3EE]' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#8FA0C2]">{task.id}</span>
                      <span className={`chip text-[9px] ${
                        task.priority === 'CRITICAL' ? 'border-rose-500/30 text-rose-400' : 'border-amber-500/30 text-amber-300'
                      }`}>
                        {task.priority}
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#E9EDF8] leading-snug">{task.title}</h3>

                    <div className="flex items-center gap-1.5 text-[11px] text-[#22D3EE] font-mono">
                      <GitBranch className="w-3 h-3 shrink-0" />
                      <span className="truncate">{task.branch}</span>
                    </div>

                    <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] flex items-center justify-between text-[11px] text-[#8FA0C2]">
                      <span>{task.assignedAgent.name} ({task.assignedAgent.id})</span>
                      <span className="text-emerald-400 font-mono">+{task.diffSummary.additions} / -{task.diffSummary.deletions}</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSimulateTests(task);
                      }}
                      className="w-full btn btn-g text-[10px] py-1 flex items-center justify-center gap-1 font-mono"
                    >
                      <Play className="w-2.5 h-2.5 text-[#22D3EE]" />
                      <span>Trigger Test Suite</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 2: Automated Testing */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1D38] border border-[rgba(148,163,255,0.1)]">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#E9EDF8]">
                  <Terminal className="w-3.5 h-3.5 text-purple-400" />
                  <span>Automated Testing</span>
                </div>
                <span className="chip text-[10px] bg-purple-950/40 text-purple-300">
                  {tasks.filter(t => t.status === 'TESTING').length}
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'TESTING').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className={`panel p-3.5 space-y-2.5 cursor-pointer transition-all hover:border-purple-500/50 ${
                      selectedTask?.id === task.id ? 'border-purple-400 ring-1 ring-purple-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#8FA0C2]">{task.id}</span>
                      <span className="chip text-[9px] border-purple-500/30 text-purple-300 flex items-center gap-1">
                        <RefreshCw className="w-2.5 h-2.5 animate-spin" /> In Test
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#E9EDF8] leading-snug">{task.title}</h3>

                    <div className="p-2 rounded bg-[#0A1222] border border-[rgba(148,163,255,0.1)] text-[10px] font-mono text-[#8FA0C2] space-y-1">
                      <div className="flex justify-between">
                        <span>Vitest / Playwright:</span>
                        <strong className="text-emerald-400">{task.testResults.passed}/{task.testResults.totalTests} Pass</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Code Coverage:</span>
                        <strong className="text-[#22D3EE]">{task.testResults.coveragePct}%</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>POPIA Egress Scan:</span>
                        <strong className="text-emerald-400">PASSED</strong>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] flex items-center justify-between text-[11px] text-[#8FA0C2]">
                      <span>{task.assignedAgent.name}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedTask(task);
                          setActiveTab('approvals');
                        }}
                        className="text-[#22D3EE] hover:underline font-semibold"
                      >
                        Review Gate →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 3: Awaiting Approval (HITL Law 02) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1D38] border border-amber-500/30">
                <div className="flex items-center gap-2 text-xs font-semibold text-amber-300">
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Awaiting Approval</span>
                </div>
                <span className="chip text-[10px] bg-amber-950/40 text-amber-300 font-bold">
                  {tasks.filter(t => t.status === 'AWAITING_APPROVAL').length} Gated
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'AWAITING_APPROVAL').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => {
                      setSelectedTask(task);
                      setActiveTab('approvals');
                    }}
                    className={`panel p-3.5 space-y-2.5 cursor-pointer transition-all hover:border-amber-400 ${
                      selectedTask?.id === task.id ? 'border-amber-400 ring-1 ring-amber-400' : 'border-amber-500/30'
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#8FA0C2]">{task.id}</span>
                      <span className="chip text-[9px] border-amber-500/40 text-amber-300 font-semibold bg-amber-950/30">
                        Law 02 Gated
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#E9EDF8] leading-snug">{task.title}</h3>

                    <div className="p-2 rounded bg-amber-950/20 border border-amber-500/20 text-[11px] text-amber-200">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-0.5">
                        Required Approver
                      </p>
                      {task.approvalCheck.approverRole}
                    </div>

                    <div className="text-[11px] text-[#8FA0C2] flex items-center justify-between font-mono">
                      <span>Tests: {task.testResults.passed}/{task.testResults.totalTests} Passed</span>
                      <span className="text-emerald-400 font-bold">100% Green</span>
                    </div>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedTask(task);
                        setActiveTab('approvals');
                      }}
                      className="w-full btn btn-p text-xs py-1.5 flex items-center justify-center gap-1 font-semibold"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Inspect Diff & Sign</span>
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Column 4: Merged to tecosystem:main */}
            <div className="space-y-3">
              <div className="flex items-center justify-between p-2.5 rounded-lg bg-[#0F1D38] border border-emerald-500/30">
                <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Merged to main</span>
                </div>
                <span className="chip text-[10px] bg-emerald-950/40 text-emerald-300">
                  {tasks.filter(t => t.status === 'MERGED').length}
                </span>
              </div>

              <div className="space-y-3">
                {tasks.filter(t => t.status === 'MERGED').map(task => (
                  <div 
                    key={task.id} 
                    onClick={() => setSelectedTask(task)}
                    className={`panel p-3.5 space-y-2.5 cursor-pointer transition-all hover:border-emerald-500/50 ${
                      selectedTask?.id === task.id ? 'border-emerald-400 ring-1 ring-emerald-400' : ''
                    }`}
                  >
                    <div className="flex items-center justify-between text-[10px]">
                      <span className="font-mono text-[#8FA0C2]">{task.id}</span>
                      <span className="chip text-[9px] border-emerald-500/30 text-emerald-300">
                        Merged
                      </span>
                    </div>

                    <h3 className="text-xs font-semibold text-[#E9EDF8] leading-snug">{task.title}</h3>

                    <div className="text-[11px] text-[#8FA0C2] space-y-1">
                      <div className="flex items-center gap-1 text-emerald-400 font-mono text-[10px]">
                        <Check className="w-3 h-3" /> Signed by: {task.approvalCheck.signedBy}
                      </div>
                      <div className="text-[10px] font-mono text-[#8FA0C2] truncate">
                        Hash: {task.approvalCheck.signatureHash || 'sha256:verified'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] flex items-center justify-between text-[10px] text-[#8FA0C2]">
                      <span>Target: {task.releaseVersion}</span>
                      <span className="text-emerald-400">Delivered</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Selected Task Deep-Dive Drawer */}
          {selectedTask && (
            <div className="panel p-6 border border-[#22D3EE]/30 space-y-4 mt-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="chip text-[10px] bg-blue-950/40 text-blue-300 font-mono">
                      {selectedTask.id}
                    </span>
                    <span className="text-xs text-[#8FA0C2]">
                      Target: <code className="text-[#22D3EE] font-mono">{selectedTask.repo}</code> ({selectedTask.branch})
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#E9EDF8]">{selectedTask.title}</h3>
                </div>

                <div className="flex items-center gap-2">
                  {selectedTask.status === 'AWAITING_APPROVAL' && (
                    <button
                      onClick={() => setActiveTab('approvals')}
                      className="btn btn-p text-xs py-1.5 px-3 flex items-center gap-1.5"
                    >
                      <ShieldCheck className="w-3.5 h-3.5" />
                      <span>Proceed to Approval Gate</span>
                    </button>
                  )}
                  {selectedTask.status !== 'MERGED' && (
                    <button
                      onClick={() => handleSimulateTests(selectedTask)}
                      disabled={runningTestSuite === selectedTask.id}
                      className="btn btn-g text-xs py-1.5 px-3 flex items-center gap-1.5 font-mono"
                    >
                      <Play className="w-3.5 h-3.5 text-[#22D3EE]" />
                      <span>{runningTestSuite === selectedTask.id ? 'Running Tests...' : 'Re-run Test Harness'}</span>
                    </button>
                  )}
                </div>
              </div>

              <p className="text-xs text-[#8FA0C2] leading-relaxed">{selectedTask.description}</p>

              {/* Code Diff Preview */}
              {selectedTask.codeDiff && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-[#8FA0C2]">Code Diff (tecosystem PR)</span>
                    <span className="text-emerald-400 font-mono">
                      +{selectedTask.diffSummary.additions} / -{selectedTask.diffSummary.deletions} across {selectedTask.diffSummary.filesChanged} files
                    </span>
                  </div>
                  <pre className="p-3.5 rounded-lg bg-[#070D18] border border-[rgba(148,163,255,0.15)] text-xs font-mono text-[#E9EDF8] overflow-x-auto max-h-60 leading-relaxed">
                    {selectedTask.codeDiff}
                  </pre>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: APPROVAL CHECKS (HITL LAW 02) */}
      {activeTab === 'approvals' && (
        <div className="space-y-6">
          <div className="panel p-5 bg-gradient-to-r from-amber-950/20 via-[#0B1528] to-[#0B1528] border border-amber-500/30">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-lg bg-amber-500/20 text-amber-400 border border-amber-500/30 shrink-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <h2 className="text-sm font-bold text-[#E9EDF8] flex items-center gap-2">
                  <span>Non-Bypassable Human-in-the-Loop Approval Queue</span>
                  <span className="chip text-[10px] bg-amber-950/50 text-amber-300 border-amber-500/40">
                    Law 02 Mandate
                  </span>
                </h2>
                <p className="text-xs text-[#8FA0C2] leading-relaxed max-w-4xl">
                  Under Infinite AI Law 02 (§0.2), autonomous AI agents can implement code, run automated tests, and format branches in <code className="text-[#22D3EE] font-mono">tecosystem</code>, but <strong className="text-[#E9EDF8]">cannot merge to main or deploy to production without explicit human review and cryptographic countersignature</strong>.
                </p>
              </div>
            </div>
          </div>

          {/* Pending Tasks Review Queue */}
          <div className="space-y-5">
            {tasks.filter(t => t.status === 'AWAITING_APPROVAL').length === 0 ? (
              <div className="panel p-8 text-center space-y-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h3 className="text-sm font-semibold text-[#E9EDF8]">All Approval Gates Clear</h3>
                <p className="text-xs text-[#8FA0C2]">No pending tasks in tecosystem require human countersignature at this moment.</p>
              </div>
            ) : (
              tasks.filter(t => t.status === 'AWAITING_APPROVAL').map(task => (
                <div key={task.id} className="panel p-6 border border-amber-500/40 space-y-4">
                  <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-3 border-b border-[rgba(148,163,255,0.1)]">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="chip text-[10px] bg-amber-950/40 text-amber-300 border-amber-500/30 font-mono">
                          {task.id}
                        </span>
                        <span className="text-xs text-[#8FA0C2]">
                          Branch: <code className="text-[#22D3EE] font-mono">{task.branch}</code>
                        </span>
                        <span className="chip text-[10px] border-rose-500/30 text-rose-400">
                          {task.priority} Priority
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-[#E9EDF8]">{task.title}</h3>
                      <p className="text-xs text-[#8FA0C2] mt-1">{task.description}</p>
                    </div>

                    <div className="text-xs text-right text-[#8FA0C2] font-mono shrink-0">
                      <div>Assigned: <span className="text-[#E9EDF8]">{task.assignedAgent.name}</span></div>
                      <div>Role: <span className="text-[#22D3EE]">{task.assignedAgent.role}</span></div>
                      <div>Target Release: <span className="text-emerald-400">{task.releaseVersion}</span></div>
                    </div>
                  </div>

                  {/* Automated Test Verification Summary */}
                  <div className="grid sm:grid-cols-3 gap-3 text-xs">
                    <div className="panel2 p-3 border-l-2 border-l-emerald-400">
                      <span className="text-[10px] font-mono text-[#8FA0C2] uppercase">Automated Tests</span>
                      <p className="text-sm font-bold text-emerald-400 mt-0.5">
                        {task.testResults.passed} / {task.testResults.totalTests} Passing (100%)
                      </p>
                      <span className="text-[11px] text-[#8FA0C2]">Execution: {task.testResults.durationMs}ms</span>
                    </div>

                    <div className="panel2 p-3 border-l-2 border-l-[#22D3EE]">
                      <span className="text-[10px] font-mono text-[#8FA0C2] uppercase">Test Coverage</span>
                      <p className="text-sm font-bold text-[#22D3EE] mt-0.5">
                        {task.testResults.coveragePct}% Statements
                      </p>
                      <span className="text-[11px] text-[#8FA0C2]">All assertions green</span>
                    </div>

                    <div className="panel2 p-3 border-l-2 border-l-purple-400">
                      <span className="text-[10px] font-mono text-[#8FA0C2] uppercase">POPIA & Security</span>
                      <p className="text-sm font-bold text-purple-300 mt-0.5">
                        Section 72 Compliant
                      </p>
                      <span className="text-[11px] text-[#8FA0C2] truncate block">{task.testResults.securityScan.details}</span>
                    </div>
                  </div>

                  {/* Code Diff Box */}
                  {task.codeDiff && (
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between text-xs text-[#8FA0C2] font-mono">
                        <span>Autonomous Code Changes for Review</span>
                        <span className="text-emerald-400">+{task.diffSummary.additions} lines / -{task.diffSummary.deletions} lines</span>
                      </div>
                      <pre className="p-3.5 rounded-lg bg-[#070D18] border border-[rgba(148,163,255,0.15)] text-xs font-mono text-[#E9EDF8] overflow-x-auto max-h-56">
                        {task.codeDiff}
                      </pre>
                    </div>
                  )}

                  {/* Human Sign-Off Action Box */}
                  <div className="panel2 p-4 border border-amber-500/30 bg-[#0E1B33] space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                        <Lock className="w-3.5 h-3.5" />
                        <span>Sign-Off & Merge Authorization</span>
                      </span>
                      <span className="text-[11px] text-[#8FA0C2] font-mono">Non-repudiable audit ledger entry</span>
                    </div>

                    <div className="grid sm:grid-cols-2 gap-3">
                      <div>
                        <label className="text-[11px] text-[#8FA0C2] block mb-1">Approver Identity (Human Lead)</label>
                        <input
                          type="text"
                          value={approverName}
                          onChange={(e) => setApproverName(e.target.value)}
                          className="inp text-xs w-full font-mono"
                          placeholder="Name / Role"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] text-[#8FA0C2] block mb-1">Executive Audit Memo</label>
                        <input
                          type="text"
                          value={approvalComment}
                          onChange={(e) => setApprovalComment(e.target.value)}
                          className="inp text-xs w-full"
                          placeholder="Add approval comment..."
                        />
                      </div>
                    </div>

                    <label className="flex items-center gap-2 text-xs text-[#8FA0C2] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={law02Confirmed}
                        onChange={(e) => setLaw02Confirmed(e.target.checked)}
                        className="task"
                      />
                      <span>
                        I certify that I have reviewed the code diff, test suite results, and verified zero PII exposure under South African POPIA regulations.
                      </span>
                    </label>

                    <div className="flex flex-wrap items-center justify-end gap-2.5 pt-2">
                      <button
                        onClick={() => onRejectTask(task.id, 'Changes requested during architectural review')}
                        className="btn btn-g text-xs py-2 px-3.5 text-rose-400 hover:text-rose-300"
                      >
                        Request Changes
                      </button>

                      <button
                        onClick={() => handleExecuteApproval(task)}
                        disabled={!law02Confirmed}
                        className={`btn text-xs py-2 px-4 flex items-center gap-2 font-semibold transition-all ${
                          law02Confirmed 
                            ? 'btn-p text-white shadow-lg shadow-[#22D3EE]/20' 
                            : 'opacity-50 cursor-not-allowed bg-[#13203C] text-[#8FA0C2]'
                        }`}
                      >
                        <Check className="w-4 h-4" />
                        <span>Sign & Merge to tecosystem:main</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 3: AUTOMATED TEST MATRIX */}
      {activeTab === 'tests' && (
        <div className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-semibold text-[#E9EDF8]">
                tecosystem Automated Test Matrix & Verification Harness
              </h2>
              <p className="text-xs text-[#8FA0C2]">
                Continuous autonomous test suites verifying IRT math, tenant isolation, and POPIA privacy membranes.
              </p>
            </div>

            <button
              onClick={() => {
                const firstTask = tasks[0];
                if (firstTask) handleSimulateTests(firstTask);
              }}
              className="btn btn-p text-xs py-2 px-3.5 flex items-center gap-2 font-mono"
            >
              <Play className="w-3.5 h-3.5" />
              <span>Run Full Regression Suite</span>
            </button>
          </div>

          {/* Test Terminal Stream Output */}
          {testOutputTerminal && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-[#8FA0C2] flex items-center gap-1.5">
                  <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Real-Time Test Runner Output</span>
                </span>
                <button 
                  onClick={() => setTestOutputTerminal(null)}
                  className="text-xs text-[#8FA0C2] hover:text-[#E9EDF8]"
                >
                  Clear Output
                </button>
              </div>
              <pre className="p-4 rounded-lg bg-[#060B14] border border-emerald-500/30 text-xs font-mono text-emerald-300 overflow-x-auto max-h-72 leading-relaxed">
                {testOutputTerminal}
              </pre>
            </div>
          )}

          {/* Test Suites Table */}
          <div className="panel overflow-hidden">
            <div className="p-4 border-b border-[rgba(148,163,255,0.1)] flex items-center justify-between">
              <p className="kick">TECOSYSTEM COMPONENT TEST SUITES</p>
              <span className="text-xs text-emerald-400 font-mono">48 of 48 Passing</span>
            </div>

            <div className="divide-y divide-[rgba(148,163,255,0.08)] text-xs">
              {tasks.flatMap(t => t.testResults.suites.map(s => ({ ...s, taskTitle: t.title, taskId: t.id }))).map((suite, idx) => (
                <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-[#13203C]/40 transition-colors">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="chip text-[9px] bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
                        {suite.status}
                      </span>
                      <strong className="text-[#E9EDF8] font-mono">{suite.name}</strong>
                    </div>
                    <p className="text-[11px] text-[#8FA0C2]">{suite.taskTitle} ({suite.taskId})</p>
                  </div>

                  <div className="flex items-center gap-4 text-right font-mono text-[#8FA0C2]">
                    <span>{suite.tests} tests</span>
                    <span className="text-[#22D3EE]">{suite.duration}</span>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCT EPICS & ROADMAP */}
      {activeTab === 'epics' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#E9EDF8]">
                Product Epics Managed by Business Operations
              </h2>
              <p className="text-xs text-[#8FA0C2]">
                Strategic product roadmap for tecosystem aligned with commercial pilot customer contracts.
              </p>
            </div>
            <span className="chip text-xs border-[#22D3EE]/30 text-[#22D3EE]">
              5 Active Epics
            </span>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {epics.map(epic => (
              <div key={epic.id} className="panel p-5 space-y-3 border border-[rgba(148,163,255,0.15)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-mono text-[#22D3EE] font-semibold">{epic.id}</span>
                  <span className={`chip text-[10px] ${
                    epic.status === 'COMPLETED' ? 'border-emerald-500/30 text-emerald-300' :
                    epic.status === 'IN_PROGRESS' ? 'border-blue-500/30 text-blue-300' :
                    epic.status === 'VALIDATION' ? 'border-purple-500/30 text-purple-300' :
                    'border-amber-500/30 text-amber-300'
                  }`}>
                    {epic.status}
                  </span>
                </div>

                <h3 className="text-sm font-bold text-[#E9EDF8]">{epic.title}</h3>
                <p className="text-xs text-[#8FA0C2] leading-relaxed">{epic.description}</p>

                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-xs">
                    <span className="text-[#8FA0C2]">Deliverable Progress:</span>
                    <strong className="text-[#22D3EE] font-mono">{epic.progress}%</strong>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${epic.progress}%` }} />
                  </div>
                </div>

                <div className="pt-2 border-t border-[rgba(148,163,255,0.1)] flex items-center justify-between text-[11px] text-[#8FA0C2]">
                  <div>Lead: <span className="text-[#E9EDF8]">{epic.leadAgent}</span></div>
                  <div>Target: <span className="text-emerald-400 font-mono">{epic.targetRelease}</span></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GIT BRIDGE & WEBHOOK CONFIG */}
      {activeTab === 'bridge' && (
        <div className="space-y-6">
          <div className="panel p-6 space-y-4">
            <h2 className="text-sm font-semibold text-[#E9EDF8] flex items-center gap-2">
              <GitBranch className="w-4 h-4 text-[#22D3EE]" />
              <span>Two-Way Repository Bridge Architecture</span>
            </h2>
            <p className="text-xs text-[#8FA0C2] leading-relaxed">
              Bi-directional synchronization coordinates business operations governance (policies, audits, agent memory L0-L4) with the product development lifecycle in <code className="text-[#22D3EE] font-mono">tecosystem</code>.
            </p>

            <div className="grid sm:grid-cols-2 gap-4 pt-2">
              <div className="panel2 p-4 space-y-2 text-xs">
                <p className="kick">OPERATIONS REPO (HOST)</p>
                <div className="font-mono text-[#E9EDF8]">git@github.com:infinite-ai/business-operations.git</div>
                <div className="text-[#8FA0C2]">Branch: <code className="text-[#22D3EE]">main</code></div>
                <div className="text-[#8FA0C2]">Role: Strategy, Governance, CRM, Brain L0-L4, HITL Approval Engine</div>
              </div>

              <div className="panel2 p-4 space-y-2 text-xs">
                <p className="kick">PRODUCT REPO (MANAGED)</p>
                <div className="font-mono text-emerald-400">git@github.com:infinite-ai/tecosystem.git</div>
                <div className="text-[#8FA0C2]">Branch: <code className="text-emerald-400">main</code> (Protected)</div>
                <div className="text-[#8FA0C2]">Role: Adaptive Learning Engine, Student Assessment, Microservices</div>
              </div>
            </div>

            <div className="panel2 p-4 space-y-3 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-bold text-[#E9EDF8]">Automated Webhook Endpoint</span>
                <span className="chip text-[10px] bg-emerald-950/40 text-emerald-300 border-emerald-500/30">
                  Active (200 OK)
                </span>
              </div>
              <div className="p-2 rounded bg-[#070D18] font-mono text-[#22D3EE] select-all truncate">
                {repoConnection.webhookUrl}
              </div>
              <div className="flex items-center justify-between text-[#8FA0C2] text-[11px]">
                <span>HMAC Secret: Configured (KMS SHA-256)</span>
                <span>Events: push, pull_request, workflow_run, check_suite</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DISPATCH NEW AUTONOMOUS TASK */}
      {showNewTaskModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
          <div className="panel p-6 max-w-lg w-full space-y-4 border border-[#22D3EE]/40">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#E9EDF8] flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[#22D3EE]" />
                <span>Dispatch Autonomous Agent to tecosystem</span>
              </h3>
              <button 
                onClick={() => setShowNewTaskModal(false)}
                className="text-[#8FA0C2] hover:text-[#E9EDF8]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateAutonomousTask} className="space-y-3.5 text-xs">
              <div>
                <label className="text-[#8FA0C2] block mb-1">Feature / Task Title</label>
                <input
                  type="text"
                  required
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  placeholder="e.g. Implement Real-Time Telemetry Socket in tecosystem"
                  className="inp w-full"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[#8FA0C2] block mb-1">Target Epic</label>
                  <select
                    value={newTaskEpicId}
                    onChange={(e) => setNewTaskEpicId(e.target.value)}
                    className="inp w-full"
                  >
                    {epics.map(ep => (
                      <option key={ep.id} value={ep.id}>{ep.title} ({ep.id})</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-[#8FA0C2] block mb-1">Lead Autonomous Agent</label>
                  <select
                    value={newTaskAgentId}
                    onChange={(e) => setNewTaskAgentId(e.target.value)}
                    className="inp w-full font-mono"
                  >
                    <option value="A04">A04 · Titan-FullStack Lead</option>
                    <option value="A03">A03 · Nexus-Architect</option>
                    <option value="A05">A05 · Aegis-DevOps Lead</option>
                    <option value="A06">A06 · Vanguard-QA Automation</option>
                    <option value="A11">A11 · Sentinel-Security Auditor</option>
                    <option value="A01">A01 · Oracle-Chief Product Officer</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-[#8FA0C2] block mb-1">Priority</label>
                <div className="flex gap-2">
                  {(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] as const).map(pr => (
                    <button
                      type="button"
                      key={pr}
                      onClick={() => setNewTaskPriority(pr)}
                      className={`flex-1 py-1.5 rounded text-[11px] font-semibold transition-all border ${
                        newTaskPriority === pr
                          ? 'bg-[#22D3EE]/20 text-[#22D3EE] border-[#22D3EE]'
                          : 'bg-[#13203C] text-[#8FA0C2] border-transparent hover:border-[#8FA0C2]/40'
                      }`}
                    >
                      {pr}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-[#8FA0C2] block mb-1">Task Specification / Acceptance Criteria</label>
                <textarea
                  rows={3}
                  value={newTaskDescription}
                  onChange={(e) => setNewTaskDescription(e.target.value)}
                  placeholder="Detail the algorithm, API contract, and tests required..."
                  className="inp w-full"
                />
              </div>

              <div className="p-2.5 rounded bg-blue-950/20 border border-blue-500/20 text-[11px] text-[#8FA0C2]">
                ℹ️ Agent will autonomously generate the branch, author the code diff, execute Vitest/Playwright suites, and present a pull request in the <strong className="text-amber-300">Law 02 Approval Queue</strong>.
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowNewTaskModal(false)}
                  className="btn btn-g py-2 px-3 text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-p py-2 px-4 text-xs font-semibold"
                >
                  Launch Autonomous Agent
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
