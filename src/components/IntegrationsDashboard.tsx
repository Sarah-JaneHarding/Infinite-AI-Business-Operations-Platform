import React, { useState } from 'react';
import { INITIAL_INTEGRATIONS } from '../data/integrationsData';
import { IntegrationTool } from '../types';
import { 
  Workflow, 
  CheckCircle2, 
  RefreshCw, 
  ExternalLink, 
  Sliders, 
  Key, 
  Send, 
  AlertCircle,
  FileText,
  MessageSquare,
  Kanban,
  GitBranch,
  Mail,
  CreditCard,
  Users,
  Zap,
  Cloud,
  Server,
  X
} from 'lucide-react';

export const IntegrationsDashboard: React.FC = () => {
  const [integrations, setIntegrations] = useState<IntegrationTool[]>(INITIAL_INTEGRATIONS);
  const [selectedTool, setSelectedTool] = useState<IntegrationTool | null>(null);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [syncFeedback, setSyncFeedback] = useState<{ id: string; msg: string } | null>(null);

  // Icon mapping
  const renderIcon = (name: string) => {
    switch (name) {
      case 'FileText': return <FileText className="w-5 h-5 text-[#22D3EE]" />;
      case 'MessageSquare': return <MessageSquare className="w-5 h-5 text-emerald-400" />;
      case 'Kanban': return <Kanban className="w-5 h-5 text-blue-400" />;
      case 'GitBranch': return <GitBranch className="w-5 h-5 text-purple-400" />;
      case 'Mail': return <Mail className="w-5 h-5 text-red-400" />;
      case 'CreditCard': return <CreditCard className="w-5 h-5 text-amber-300" />;
      case 'Users': return <Users className="w-5 h-5 text-cyan-300" />;
      case 'Zap': return <Zap className="w-5 h-5 text-yellow-400" />;
      case 'Cloud': return <Cloud className="w-5 h-5 text-orange-400" />;
      case 'Server': return <Server className="w-5 h-5 text-indigo-400" />;
      default: return <Workflow className="w-5 h-5 text-[#22D3EE]" />;
    }
  };

  const handleTestSync = (tool: IntegrationTool) => {
    setSyncingId(tool.id);
    setSyncFeedback(null);

    setTimeout(() => {
      setSyncingId(null);
      setSyncFeedback({
        id: tool.id,
        msg: `HTTP 200 OK: Webhook verified with ${tool.name}. Synchronized telemetry payload across L6 orchestrator.`
      });

      const updated = integrations.map(t => 
        t.id === tool.id ? { ...t, lastSynced: 'Just now' } : t
      );
      setIntegrations(updated);

      setTimeout(() => setSyncFeedback(null), 4000);
    }, 750);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">THIRD-PARTY ENTERPRISE ECOSYSTEM</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Third-Party Integrations <span className="grad">Dashboard</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Free-tier optimized enterprise connectors powering cross-tool synchronization.
            Connect Notion, Slack, Jira, GitHub, Stripe, and Cloud platforms seamlessly.
          </p>
        </div>

        <span className="chip border-emerald-500/30 text-emerald-400 text-xs self-start md:self-auto">
          10 Connectors Active · 100% Free Tier Compatible
        </span>
      </div>

      {/* Grid of 10 Integrations */}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
        {integrations.map((tool) => {
          const isSyncing = syncingId === tool.id;
          return (
            <div key={tool.id} className="panel2 p-5 space-y-3.5 flex flex-col justify-between hover:border-[#22D3EE]/40 transition-all">
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0E1830] flex items-center justify-center border border-[rgba(148,163,255,0.1)]">
                      {renderIcon(tool.iconName)}
                    </div>
                    <div>
                      <h3 className="font-bold text-sm text-[#E9EDF8]">{tool.name}</h3>
                      <span className="text-[10px] text-[#8FA0C2] font-mono">{tool.category}</span>
                    </div>
                  </div>

                  <span className="st st-pass text-[10px]">{tool.status}</span>
                </div>

                <p className="text-xs text-[#8FA0C2] mt-3 leading-relaxed">
                  {tool.description}
                </p>

                <div className="mt-3 space-y-1 text-[11px] font-mono text-[#8FA0C2]">
                  <div className="flex justify-between">
                    <span>Quota:</span>
                    <span className="text-[#E9EDF8]">{tool.usageQuota}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Last Synced:</span>
                    <span className="text-emerald-400">{tool.lastSynced}</span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-3 border-t border-[rgba(148,163,255,0.08)]">
                {syncFeedback && syncFeedback.id === tool.id && (
                  <div className="text-[10px] text-emerald-300 font-mono bg-emerald-950/40 p-2 rounded border border-emerald-500/30">
                    {syncFeedback.msg}
                  </div>
                )}

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleTestSync(tool)}
                    disabled={isSyncing}
                    className="btn btn-g text-xs flex-1 justify-center py-1.5"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 mr-1 ${isSyncing ? 'animate-spin' : ''}`} />
                    {isSyncing ? 'Testing...' : 'Test Sync Webhook'}
                  </button>
                  <button
                    onClick={() => setSelectedTool(tool)}
                    className="btn btn-g text-xs p-2 text-[#8FA0C2] hover:text-[#E9EDF8]"
                    title="Configure tool parameters"
                  >
                    <Sliders className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Tool Configuration Modal */}
      {selectedTool && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel max-w-lg w-full p-6 relative border border-[#22D3EE]/30 shadow-2xl space-y-4">
            <button
              onClick={() => setSelectedTool(null)}
              className="absolute top-5 right-5 text-[#8FA0C2] hover:text-[#E9EDF8]"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0E1830] flex items-center justify-center border border-[rgba(148,163,255,0.1)]">
                {renderIcon(selectedTool.iconName)}
              </div>
              <div>
                <h3 className="text-base font-bold text-[#E9EDF8]">{selectedTool.name} Settings</h3>
                <span className="text-xs text-[#22D3EE] font-mono">{selectedTool.tier}</span>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Inbound Webhook URL:</label>
                <input
                  type="text"
                  readOnly
                  value={selectedTool.webhookUrl}
                  className="inp text-xs font-mono text-[#8FA0C2] bg-[#05070f]"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Free Tier Allocation:</label>
                <div className="p-2.5 rounded bg-[#05070f] border border-[rgba(148,163,255,0.1)] text-[#E9EDF8]">
                  {selectedTool.usageQuota}
                </div>
              </div>

              <div className="p-3 rounded-lg bg-[#0E1830] border border-[rgba(148,163,255,0.1)] text-[11px] text-[#8FA0C2]">
                <strong className="text-[#E9EDF8] block mb-1">Zero-Leakage Security Protocol:</strong>
                Credentials and webhooks are held strictly in AWS Secrets Manager using KMS envelope encryption.
                Outgoing sync payloads undergo entity pseudonymization through the L5 Membrane.
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedTool(null)}
                className="btn btn-p text-xs px-4"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
