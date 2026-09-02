import React, { useState, useEffect } from 'react';
import { NavTab, StageGate, OpenQuestion } from './types';
import { INITIAL_STAGES, INITIAL_OPEN_QUESTIONS } from './data/mockData';
import { Navbar } from './components/Navbar';
import { CommandCenter } from './components/CommandCenter';
import { InfiniteBrainModules } from './components/InfiniteBrainModules';
import { AgentDirectory } from './components/AgentDirectory';
import { DynamicWebsite } from './components/DynamicWebsite';
import { DeveloperStudio } from './components/DeveloperStudio';
import { ModelGateway } from './components/ModelGateway';
import { CloudAndFinance } from './components/CloudAndFinance';
import { GovernanceAndRisk } from './components/GovernanceAndRisk';
import { CrmSystem } from './components/CrmSystem';
import { IntegrationsDashboard } from './components/IntegrationsDashboard';
import { DocsAndRatify } from './components/DocsAndRatify';
import { ProductDevelopmentManager } from './components/ProductDevelopmentManager';
import { INITIAL_REPO_CONNECTION, INITIAL_EPICS, INITIAL_AUTONOMOUS_TASKS } from './data/productDevData';
import { RepoConnection, ProductEpic, AutonomousTask } from './types';
import { ShieldCheck, CheckCircle2, Lock, Cpu, ArrowUpRight } from 'lucide-react';

export default function App() {
  // Navigation State
  const [activeTab, setActiveTab] = useState<NavTab>('command');

  // Product Development & Tecosystem Connection State
  const [repoConnection, setRepoConnection] = useState<RepoConnection>(() => {
    try {
      const saved = localStorage.getItem('ia_repo_connection');
      return saved ? JSON.parse(saved) : INITIAL_REPO_CONNECTION;
    } catch {
      return INITIAL_REPO_CONNECTION;
    }
  });

  const [epics, setEpics] = useState<ProductEpic[]>(() => {
    try {
      const saved = localStorage.getItem('ia_epics');
      return saved ? JSON.parse(saved) : INITIAL_EPICS;
    } catch {
      return INITIAL_EPICS;
    }
  });

  const [autonomousTasks, setAutonomousTasks] = useState<AutonomousTask[]>(() => {
    try {
      const saved = localStorage.getItem('ia_autonomous_tasks');
      return saved ? JSON.parse(saved) : INITIAL_AUTONOMOUS_TASKS;
    } catch {
      return INITIAL_AUTONOMOUS_TASKS;
    }
  });

  const pendingApprovalsCount = autonomousTasks.filter(t => t.status === 'AWAITING_APPROVAL').length;

  const handleSyncRepos = () => {
    setRepoConnection(prev => {
      const updated: RepoConnection = {
        ...prev,
        lastSynced: 'Just now',
        syncStatus: 'CONNECTED',
        stats: {
          ...prev.stats,
          autonomousCommitsToday: prev.stats.autonomousCommitsToday + 1
        }
      };
      try {
        localStorage.setItem('ia_repo_connection', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleApproveTask = (taskId: string, comment: string, approverName: string) => {
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC';
    const signatureHash = 'sha256:' + Array.from({ length: 4 }, () => Math.random().toString(16).substring(2, 8)).join('');

    setAutonomousTasks(prev => {
      const next = prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: 'MERGED' as const,
            approvalCheck: {
              ...task.approvalCheck,
              status: 'APPROVED' as const,
              signedBy: approverName,
              signedAt: timestamp,
              signatureHash,
              comments: comment
            }
          };
        }
        return task;
      });
      try {
        localStorage.setItem('ia_autonomous_tasks', JSON.stringify(next));
      } catch {}
      return next;
    });

    // Update repository latest commit
    setRepoConnection(prev => {
      const updated: RepoConnection = {
        ...prev,
        productRepo: {
          ...prev.productRepo,
          commitHash: signatureHash.substring(7, 14),
          lastCommitMsg: `merge(pr): approve autonomous agent pull request #${taskId.replace(/[^0-9]/g, '')}`
        },
        stats: {
          ...prev.stats,
          openPrs: Math.max(0, prev.stats.openPrs - 1),
          pendingApprovals: Math.max(0, prev.stats.pendingApprovals - 1)
        }
      };
      try {
        localStorage.setItem('ia_repo_connection', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const handleRejectTask = (taskId: string, reason: string) => {
    setAutonomousTasks(prev => {
      const next = prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: 'AUTONOMOUS_DEV' as const,
            approvalCheck: {
              ...task.approvalCheck,
              status: 'CHANGES_REQUESTED' as const,
              comments: reason
            }
          };
        }
        return task;
      });
      try {
        localStorage.setItem('ia_autonomous_tasks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleAddTask = (newTaskData: Omit<AutonomousTask, 'id' | 'createdAt' | 'updatedAt' | 'releaseVersion'>) => {
    const taskId = `TASK-TEC-${210 + autonomousTasks.length}`;
    const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 16) + ' UTC';

    const newTask: AutonomousTask = {
      ...newTaskData,
      id: taskId,
      releaseVersion: 'tecosystem v2.4.0-rc1',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    setAutonomousTasks(prev => {
      const next = [newTask, ...prev];
      try {
        localStorage.setItem('ia_autonomous_tasks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  const handleRunTestTask = (taskId: string) => {
    setAutonomousTasks(prev => {
      const next = prev.map(task => {
        if (task.id === taskId) {
          return {
            ...task,
            status: 'AWAITING_APPROVAL' as const,
            testResults: {
              ...task.testResults,
              passed: task.testResults.totalTests,
              failed: 0
            }
          };
        }
        return task;
      });
      try {
        localStorage.setItem('ia_autonomous_tasks', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  // Stage 02 Resolution State (Persisted)
  const [stage02Resolved, setStage02Resolved] = useState<boolean>(() => {
    try {
      return localStorage.getItem('ia_stage02_resolved') === 'true';
    } catch {
      return false;
    }
  });

  // Ratified Policies Count (starts at 38, up to 136)
  const [ratifiedCount, setRatifiedCount] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('ia_ratified_count');
      return saved ? parseInt(saved, 10) : 38;
    } catch {
      return 38;
    }
  });

  // Stages List
  const [stages, setStages] = useState<StageGate[]>(() => {
    return INITIAL_STAGES.map(s => {
      if (s.id === '02' && stage02Resolved) {
        return {
          ...s,
          status: 'PASS',
          summary: 'PASSED · Retroactive exit gate verified. Merkle audit ledger active with SHA-256 hash chains.',
          testCount: 48
        };
      }
      return s;
    });
  });

  // Open Questions Register
  const [openQuestions, setOpenQuestions] = useState<OpenQuestion[]>(() => {
    try {
      const saved = localStorage.getItem('ia_open_questions');
      return saved ? JSON.parse(saved) : INITIAL_OPEN_QUESTIONS;
    } catch {
      return INITIAL_OPEN_QUESTIONS;
    }
  });

  // Handle Stage 02 Resolution
  const handleResolveStage02 = () => {
    setStage02Resolved(true);
    try {
      localStorage.setItem('ia_stage02_resolved', 'true');
    } catch {}

    setStages(prev => prev.map(s => {
      if (s.id === '02') {
        return {
          ...s,
          status: 'PASS',
          summary: 'PASSED · Retroactive exit gate verified. Merkle audit ledger active with SHA-256 hash chains.',
          testCount: 48
        };
      }
      return s;
    }));

    // Also mark OQ-001 as DONE
    setOpenQuestions(prev => {
      const updated = prev.map(q => q.id === 'OQ-001' ? { ...q, status: 'DONE' as const } : q);
      try {
        localStorage.setItem('ia_open_questions', JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  // Handle Policy Ratification
  const handleRatifyPolicy = () => {
    setRatifiedCount(prev => {
      const next = Math.min(136, prev + 5);
      try {
        localStorage.setItem('ia_ratified_count', next.toString());
      } catch {}
      return next;
    });
  };

  const handleRatifyAll = () => {
    setRatifiedCount(136);
    try {
      localStorage.setItem('ia_ratified_count', '136');
    } catch {}
  };

  // Handle Cycling Open Question Status
  const handleCycleOq = (id: string) => {
    setOpenQuestions(prev => {
      const next = prev.map(q => {
        if (q.id !== id) return q;
        const cycleMap: Record<string, OpenQuestion['status']> = {
          'OPEN': 'PROG',
          'PROG': 'DONE',
          'DONE': 'OPEN',
          'CRITICAL': 'PROG',
          'BLOCKED': 'PROG',
          'DECISION': 'DONE'
        };
        const newStatus = cycleMap[q.status] || 'OPEN';
        return { ...q, status: newStatus };
      });
      try {
        localStorage.setItem('ia_open_questions', JSON.stringify(next));
      } catch {}
      return next;
    });
  };

  return (
    <div className="min-h-screen bg-[#070B14] text-[#E9EDF8] flex flex-col font-sans selection:bg-[#22D3EE]/30 selection:text-white">
      {/* Top Fixed Navbar */}
      <Navbar 
        activeTab={activeTab} 
        onSelectTab={setActiveTab}
        stage02Resolved={stage02Resolved}
        ratifiedCount={ratifiedCount}
        pendingApprovalsCount={pendingApprovalsCount}
      />

      {/* Main Workspace Canvas */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-20">
        {activeTab === 'command' && (
          <CommandCenter 
            onNavigate={setActiveTab}
            stage02Resolved={stage02Resolved}
            ratifiedCount={ratifiedCount}
            onRatifyAll={handleRatifyAll}
            pendingApprovalsCount={pendingApprovalsCount}
          />
        )}

        {activeTab === 'product' && (
          <ProductDevelopmentManager
            repoConnection={repoConnection}
            epics={epics}
            tasks={autonomousTasks}
            onSyncRepos={handleSyncRepos}
            onApproveTask={handleApproveTask}
            onRejectTask={handleRejectTask}
            onAddTask={handleAddTask}
            onRunTestTask={handleRunTestTask}
          />
        )}

        {activeTab === 'brain' && (
          <InfiniteBrainModules />
        )}

        {activeTab === 'agents' && (
          <AgentDirectory />
        )}

        {activeTab === 'website' && (
          <DynamicWebsite />
        )}

        {activeTab === 'dev' && (
          <DeveloperStudio 
            stages={stages}
            stage02Resolved={stage02Resolved}
            onResolveStage02={handleResolveStage02}
            openQuestions={openQuestions}
            onCycleOq={handleCycleOq}
          />
        )}

        {activeTab === 'gateway' && (
          <ModelGateway />
        )}

        {activeTab === 'infra' && (
          <CloudAndFinance />
        )}

        {activeTab === 'gov' && (
          <GovernanceAndRisk />
        )}

        {activeTab === 'crm' && (
          <CrmSystem />
        )}

        {activeTab === 'integrations' && (
          <IntegrationsDashboard />
        )}

        {activeTab === 'docs' && (
          <DocsAndRatify 
            ratifiedCount={ratifiedCount}
            onRatifyPolicy={handleRatifyPolicy}
          />
        )}
      </main>

      {/* System Footer */}
      <footer className="border-t border-[rgba(148,163,255,0.08)] bg-[#0A1226]/80 backdrop-blur py-6 mt-auto">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#8FA0C2]">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1.5 font-bold text-[#E9EDF8]">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>INFINITE-AI OPS PLATFORM</span>
            </div>
            <span>·</span>
            <span className="font-mono text-[11px]">Nine-Layer Enforcement Stack (L0–L8)</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] font-mono">
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5" />
              POPIA Section 72 Compliant
            </span>
            <span>·</span>
            <span className="text-[#22D3EE] flex items-center gap-1">
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
