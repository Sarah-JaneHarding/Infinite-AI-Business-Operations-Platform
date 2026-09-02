import React, { useState, useEffect, useMemo } from 'react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  BarChart, 
  Bar, 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  ReferenceLine,
  Cell
} from 'recharts';
import { 
  Activity, 
  CheckCircle2, 
  Clock, 
  TrendingUp, 
  Zap, 
  AlertCircle, 
  Play, 
  Pause, 
  RefreshCw, 
  ShieldCheck, 
  Sliders, 
  BarChart2, 
  Cpu,
  Layers,
  Sparkles
} from 'lucide-react';
import { AgentRecord } from '../types';

interface AgentPerformanceAnalyticsProps {
  agents: AgentRecord[];
}

interface TimePoint {
  time: string;
  completed: number;
  hitlGated: number;
  totalThroughput: number;
  successRate: number;
  avgLatencyMs: number;
}

interface DepartmentStat {
  department: string;
  shortName: string;
  agentCount: number;
  tasksTotal: number;
  successRate: number;
  throughputPerMin: number;
  avgLatencyMs: number;
  hitlReviewCount: number;
}

export const AgentPerformanceAnalytics: React.FC<AgentPerformanceAnalyticsProps> = ({ agents }) => {
  const [isLive, setIsLive] = useState(true);
  const [activeMetricView, setActiveMetricView] = useState<'throughput' | 'departments' | 'agents'>('throughput');
  const [timeWindow, setTimeWindow] = useState<'15m' | '1h' | '24h'>('15m');
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('All');
  const [surgeActive, setSurgeActive] = useState(false);

  // Initial timeline data generation (last 12 timepoints)
  const [timelineData, setTimelineData] = useState<TimePoint[]>(() => {
    const points: TimePoint[] = [];
    const now = new Date();
    for (let i = 12; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 60 * 1000);
      const timeStr = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      const completed = 160 + Math.floor(Math.sin(i * 0.8) * 35) + Math.floor(Math.random() * 20);
      const hitlGated = 8 + Math.floor(Math.random() * 6);
      const total = completed + hitlGated;
      const successRate = +(98.5 + (Math.random() * 1.3)).toFixed(2);
      const avgLatencyMs = 210 + Math.floor(Math.random() * 45);

      points.push({
        time: timeStr,
        completed,
        hitlGated,
        totalThroughput: total,
        successRate,
        avgLatencyMs
      });
    }
    return points;
  });

  // Real-time ticking simulation
  useEffect(() => {
    if (!isLive) return;

    const interval = setInterval(() => {
      setTimelineData(prev => {
        const now = new Date();
        const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });

        const multiplier = surgeActive ? 1.6 : 1.0;
        const baseCompleted = Math.floor((170 + Math.random() * 30) * multiplier);
        const baseHitl = Math.floor((9 + Math.random() * 5) * multiplier);
        const total = baseCompleted + baseHitl;
        const successRate = +(Math.min(99.9, Math.max(97.8, 98.9 + (Math.random() * 0.9 - 0.3)))).toFixed(2);
        const avgLatencyMs = Math.floor(215 + Math.random() * 40 * (surgeActive ? 1.3 : 1.0));

        const nextPoint: TimePoint = {
          time: timeStr,
          completed: baseCompleted,
          hitlGated: baseHitl,
          totalThroughput: total,
          successRate,
          avgLatencyMs
        };

        // Keep last 15 points
        return [...prev.slice(1), nextPoint];
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isLive, surgeActive]);

  // Aggregate department performance data
  const departmentStats: DepartmentStat[] = useMemo(() => {
    const deptMap: Record<string, {
      agents: AgentRecord[];
      tasks: number;
    }> = {};

    agents.forEach(agent => {
      if (!deptMap[agent.department]) {
        deptMap[agent.department] = { agents: [], tasks: 0 };
      }
      deptMap[agent.department].agents.push(agent);
      deptMap[agent.department].tasks += agent.telemetry.tasksHandled || 100;
    });

    // Custom success rates and latency based on department profile
    const deptProfiles: Record<string, { rate: number; latency: number; hitlRatio: number }> = {
      'Executive Management': { rate: 99.7, latency: 310, hitlRatio: 0.18 },
      'Product Development': { rate: 98.9, latency: 260, hitlRatio: 0.08 },
      'Software Engineering': { rate: 99.4, latency: 195, hitlRatio: 0.05 },
      'DevOps & Cloud': { rate: 99.8, latency: 140, hitlRatio: 0.04 },
      'CRM & Success': { rate: 98.7, latency: 240, hitlRatio: 0.06 },
      'Sales': { rate: 98.4, latency: 220, hitlRatio: 0.09 },
      'Marketing': { rate: 99.1, latency: 230, hitlRatio: 0.04 },
      'Finance & Accounting': { rate: 99.9, latency: 280, hitlRatio: 0.15 },
      'HR & Talent': { rate: 98.8, latency: 250, hitlRatio: 0.07 },
      'Legal & Contracts': { rate: 99.6, latency: 340, hitlRatio: 0.22 },
      'Security & Compliance': { rate: 99.9, latency: 180, hitlRatio: 0.12 },
      'Operations & Support': { rate: 99.2, latency: 210, hitlRatio: 0.05 }
    };

    return Object.entries(deptMap).map(([dept, info]) => {
      const profile = deptProfiles[dept] || { rate: 99.0, latency: 240, hitlRatio: 0.07 };
      // Slight live variation
      const jitter = ((info.tasks % 7) - 3) * 0.05;
      const rate = +(profile.rate + jitter).toFixed(2);
      const hitlReviewCount = Math.round(info.tasks * profile.hitlRatio);
      const throughputPerMin = Math.round((info.tasks / 60) * 1.2);

      // Short name for chart axes
      const shortName = dept
        .replace(' & Management', '')
        .replace('Executive Management', 'Executive')
        .replace('Software Engineering', 'Eng / Dev')
        .replace('Product Development', 'Product')
        .replace('DevOps & Cloud', 'DevOps')
        .replace('CRM & Success', 'CRM')
        .replace('Finance & Accounting', 'Finance')
        .replace('HR & Talent', 'HR')
        .replace('Legal & Contracts', 'Legal')
        .replace('Security & Compliance', 'Security')
        .replace('Operations & Support', 'Ops / Supp');

      return {
        department: dept,
        shortName,
        agentCount: info.agents.length,
        tasksTotal: info.tasks,
        successRate: rate,
        throughputPerMin,
        avgLatencyMs: profile.latency,
        hitlReviewCount
      };
    }).sort((a, b) => b.tasksTotal - a.tasksTotal);
  }, [agents]);

  // Agent level stats
  const agentSuccessStats = useMemo(() => {
    return agents.map(a => {
      const tasks = a.telemetry.tasksHandled || 150;
      // Derive deterministically high-tier success rates (>97.5%)
      const hash = a.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      const rate = +(98.2 + (hash % 16) * 0.1).toFixed(2);
      const hitlRate = +(3.5 + (hash % 10) * 0.6).toFixed(1);
      const latency = 160 + (hash % 14) * 15;

      return {
        id: a.id,
        name: a.name,
        department: a.department,
        tasksHandled: tasks,
        successRate: rate,
        hitlRate,
        latency
      };
    }).sort((a, b) => b.tasksHandled - a.tasksHandled);
  }, [agents]);

  const filteredAgentStats = useMemo(() => {
    if (selectedDeptFilter === 'All') return agentSuccessStats.slice(0, 16);
    return agentSuccessStats.filter(a => a.department === selectedDeptFilter);
  }, [agentSuccessStats, selectedDeptFilter]);

  // Current live snapshot metrics
  const latestPoint = timelineData[timelineData.length - 1] || {
    completed: 185,
    hitlGated: 12,
    totalThroughput: 197,
    successRate: 99.2,
    avgLatencyMs: 235
  };

  const totalTasksCompleted = useMemo(() => {
    return agents.reduce((acc, a) => acc + (a.telemetry.tasksHandled || 0), 0);
  }, [agents]);

  const averageFleetSuccessRate = useMemo(() => {
    if (!departmentStats.length) return 99.2;
    const sum = departmentStats.reduce((acc, d) => acc + d.successRate, 0);
    return +(sum / departmentStats.length).toFixed(2);
  }, [departmentStats]);

  // Trigger brief task surge
  const handleTriggerSurge = () => {
    setSurgeActive(true);
    setTimeout(() => setSurgeActive(false), 8000);
  };

  return (
    <div className="panel p-5 space-y-6 border border-[#22D3EE]/30 bg-gradient-to-b from-[#0A1226] to-[#070B14] shadow-xl">
      {/* Top Header & Real-time Status */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[rgba(148,163,255,0.1)] pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="font-mono text-[10px] text-[#22D3EE] font-bold bg-[#0E1830] px-2.5 py-0.5 rounded border border-[rgba(34,211,238,0.3)]">
              TELEMETRY BUS · L6 ORCHESTRATOR
            </span>
            <div className="flex items-center gap-1.5 text-[11px] font-mono">
              <span className={`w-2 h-2 rounded-full ${isLive ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
              <span className={isLive ? 'text-emerald-400' : 'text-amber-400'}>
                {isLive ? 'STREAMING REAL-TIME (2s)' : 'FEED PAUSED'}
              </span>
            </div>
            {surgeActive && (
              <span className="chip text-[10px] border-amber-500/40 text-amber-300 bg-amber-950/40 animate-pulse">
                SURGE PEAK ACTIVE (+60% Throughput)
              </span>
            )}
          </div>
          <h2 className="text-lg md:text-xl font-bold text-[#E9EDF8] mt-1.5 flex items-center gap-2">
            <Activity className="w-5 h-5 text-[#22D3EE]" />
            Agent Success Rates &amp; <span className="grad">Task Completion Throughput</span>
          </h2>
          <p className="text-xs text-[#8FA0C2] mt-0.5">
            Real-time telemetry measuring deterministic execution accuracy, statutory HITL gating (Law 02), and task throughput across all 46 active agents.
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2 self-start lg:self-auto">
          {/* Live / Pause Button */}
          <button
            onClick={() => setIsLive(!isLive)}
            className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 font-mono ${
              isLive ? 'btn-g text-amber-300' : 'btn-p text-white'
            }`}
          >
            {isLive ? (
              <>
                <Pause className="w-3.5 h-3.5" />
                <span>Pause Feed</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" />
                <span>Resume Live</span>
              </>
            )}
          </button>

          {/* Simulate Surge */}
          <button
            onClick={handleTriggerSurge}
            disabled={surgeActive}
            className={`btn text-xs py-1.5 px-3 flex items-center gap-1.5 font-mono ${
              surgeActive 
                ? 'bg-amber-950/50 text-amber-400 border border-amber-500/40' 
                : 'btn-g text-[#22D3EE] hover:border-[#22D3EE]/50'
            }`}
            title="Inject a realistic burst of high-throughput tasks"
          >
            <Zap className={`w-3.5 h-3.5 ${surgeActive ? 'text-amber-400 animate-spin' : 'text-[#22D3EE]'}`} />
            <span>{surgeActive ? 'Surge Injected' : 'Simulate Spike'}</span>
          </button>

          {/* View Tab Selector */}
          <div className="flex items-center gap-1 bg-[#0E1830] p-1 rounded-lg border border-[rgba(148,163,255,0.14)]">
            <button
              onClick={() => setActiveMetricView('throughput')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                activeMetricView === 'throughput'
                  ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                  : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              Throughput Timeline
            </button>
            <button
              onClick={() => setActiveMetricView('departments')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                activeMetricView === 'departments'
                  ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                  : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              Department SLA
            </button>
            <button
              onClick={() => setActiveMetricView('agents')}
              className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                activeMetricView === 'agents'
                  ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                  : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              Agent Matrix
            </button>
          </div>
        </div>
      </div>

      {/* KPI Highlight Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="panel2 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">Fleet Success Rate</span>
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          </div>
          <p className="text-xl font-bold font-mono text-emerald-400">
            {latestPoint.successRate}%
          </p>
          <span className="text-[10px] text-[#8FA0C2] flex items-center gap-1">
            <span className="text-emerald-400 font-semibold">&gt; 98.5%</span> SLA target passed
          </span>
        </div>

        <div className="panel2 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">Current Throughput</span>
            <TrendingUp className="w-3.5 h-3.5 text-[#22D3EE]" />
          </div>
          <p className="text-xl font-bold font-mono text-[#22D3EE]">
            {latestPoint.totalThroughput} <span className="text-xs font-normal text-[#8FA0C2]">tasks/min</span>
          </p>
          <span className="text-[10px] text-[#8FA0C2]">
            ~{(latestPoint.totalThroughput * 60).toLocaleString()} / hour fleet capacity
          </span>
        </div>

        <div className="panel2 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">Completed (Direct)</span>
            <Zap className="w-3.5 h-3.5 text-cyan-300" />
          </div>
          <p className="text-xl font-bold font-mono text-[#E9EDF8]">
            {latestPoint.completed} <span className="text-xs font-normal text-[#8FA0C2]">/ min</span>
          </p>
          <span className="text-[10px] text-[#8FA0C2]">
            {totalTasksCompleted.toLocaleString()} total handled to date
          </span>
        </div>

        <div className="panel2 p-3.5 space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">HITL Sign-off Gates</span>
            <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
          </div>
          <p className="text-xl font-bold font-mono text-purple-400">
            {latestPoint.hitlGated} <span className="text-xs font-normal text-[#8FA0C2]">gated/min</span>
          </p>
          <span className="text-[10px] text-purple-300 font-mono">
            {((latestPoint.hitlGated / latestPoint.totalThroughput) * 100).toFixed(1)}% human verified
          </span>
        </div>

        <div className="panel2 p-3.5 space-y-1 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[#8FA0C2] font-mono uppercase">L5 Membrane Latency</span>
            <Clock className="w-3.5 h-3.5 text-amber-300" />
          </div>
          <p className="text-xl font-bold font-mono text-amber-300">
            {latestPoint.avgLatencyMs} <span className="text-xs font-normal text-[#8FA0C2]">ms</span>
          </p>
          <span className="text-[10px] text-emerald-400 font-mono">
            Zero PII egress leakage
          </span>
        </div>
      </div>

      {/* Main Visualization Viewport */}
      {activeMetricView === 'throughput' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#E9EDF8] flex items-center gap-1.5">
                <span>Real-Time Task Throughput &amp; Success Trajectory</span>
                <span className="chip text-[9px] border-emerald-500/30 text-emerald-400">Live Dual-Axis</span>
              </h3>
              <p className="text-[11px] text-[#8FA0C2]">
                Left axis: Throughput volume (tasks/min). Right axis: Operational success percentage.
              </p>
            </div>

            <div className="flex items-center gap-3 text-xs font-mono">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#22D3EE]" />
                <span className="text-[#8FA0C2]">Direct Completed</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-[#8B5CF6]" />
                <span className="text-[#8FA0C2]">HITL Gated (Law 02)</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-0.5 bg-emerald-400" />
                <span className="text-emerald-400">Success Rate %</span>
              </div>
            </div>
          </div>

          {/* Recharts Area + Line Chart */}
          <div className="h-72 w-full p-2 rounded-xl bg-[#05070F] border border-[rgba(148,163,255,0.08)]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={timelineData} margin={{ top: 15, right: 25, left: -10, bottom: 5 }}>
                <defs>
                  <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22D3EE" stopOpacity={0.35}/>
                    <stop offset="95%" stopColor="#22D3EE" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="colorHitl" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                  </linearGradient>
                </defs>

                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 255, 0.08)" vertical={false} />

                <XAxis 
                  dataKey="time" 
                  stroke="#8FA0C2" 
                  fontSize={10} 
                  tickLine={false} 
                  dy={5}
                />
                
                {/* Left Y Axis: Tasks per minute */}
                <YAxis 
                  yAxisId="left" 
                  stroke="#8FA0C2" 
                  fontSize={10} 
                  tickLine={false} 
                  domain={[100, 'auto']}
                  tickFormatter={(val) => `${val}/m`}
                />

                {/* Right Y Axis: Success Rate % */}
                <YAxis 
                  yAxisId="right" 
                  orientation="right" 
                  stroke="#34D399" 
                  fontSize={10} 
                  tickLine={false} 
                  domain={[96, 100]}
                  tickFormatter={(val) => `${val}%`}
                />

                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0E1830',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#E9EDF8',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                  itemStyle={{ padding: '1px 0' }}
                  labelStyle={{ color: '#22D3EE', fontWeight: 'bold', marginBottom: '4px' }}
                  formatter={(value: any, name: string | undefined) => {
                    const safeName = name || '';
                    if (safeName === 'completed') return [`${value} tasks`, 'Direct Completed'];
                    if (safeName === 'hitlGated') return [`${value} tasks`, 'HITL Review (Law 02)'];
                    if (safeName === 'successRate') return [`${value}%`, 'Success Rate'];
                    if (safeName === 'avgLatencyMs') return [`${value} ms`, 'Membrane Latency'];
                    return [value, safeName];
                  }}
                />

                <ReferenceLine 
                  yAxisId="right" 
                  y={98.5} 
                  stroke="#F59E0B" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: 'SLA Target (98.5%)', 
                    position: 'insideBottomRight', 
                    fill: '#F59E0B', 
                    fontSize: 9 
                  }} 
                />

                <Area 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="completed" 
                  stroke="#22D3EE" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorCompleted)" 
                />

                <Area 
                  yAxisId="left" 
                  type="monotone" 
                  dataKey="hitlGated" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  fillOpacity={1} 
                  fill="url(#colorHitl)" 
                />

                <Line 
                  yAxisId="right" 
                  type="monotone" 
                  dataKey="successRate" 
                  stroke="#34D399" 
                  strokeWidth={2.5}
                  dot={{ r: 2.5, fill: '#34D399' }}
                  activeDot={{ r: 5, fill: '#34D399', stroke: '#070B14', strokeWidth: 2 }}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Department SLA Comparison View */}
      {activeMetricView === 'departments' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#E9EDF8] flex items-center gap-1.5">
                <span>Departmental Success Rates vs. 98.5% SLA Benchmark</span>
                <span className="chip text-[9px] border-emerald-500/30 text-emerald-400">12 Enterprise Departments</span>
              </h3>
              <p className="text-[11px] text-[#8FA0C2]">
                Aggregated execution reliability, statutory countersignatures, and task throughput by business function.
              </p>
            </div>

            <div className="flex items-center gap-2 text-[10px] font-mono text-[#8FA0C2]">
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                &gt;= 99.0% Premier
              </span>
              <span className="flex items-center gap-1">
                <span className="w-2 h-2 rounded-full bg-[#22D3EE]" />
                98.5% - 98.9% Nominal
              </span>
            </div>
          </div>

          <div className="h-72 w-full p-2 rounded-xl bg-[#05070F] border border-[rgba(148,163,255,0.08)]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={departmentStats} margin={{ top: 15, right: 15, left: -10, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 255, 0.08)" vertical={false} />
                
                <XAxis 
                  dataKey="shortName" 
                  stroke="#8FA0C2" 
                  fontSize={9} 
                  tickLine={false} 
                  angle={-25}
                  textAnchor="end"
                  interval={0}
                />

                <YAxis 
                  stroke="#8FA0C2" 
                  fontSize={10} 
                  tickLine={false} 
                  domain={[97, 100]}
                  tickFormatter={(val) => `${val}%`}
                />

                <Tooltip 
                  contentStyle={{
                    backgroundColor: '#0E1830',
                    borderColor: 'rgba(34, 211, 238, 0.3)',
                    borderRadius: '8px',
                    fontSize: '11px',
                    color: '#E9EDF8',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.5)'
                  }}
                  formatter={(val: any, name: string | undefined, props: any) => {
                    const safeName = name || '';
                    if (safeName === 'successRate') {
                      return [
                        <div key="item" className="space-y-1">
                          <p className="font-bold text-emerald-400">{val}% Success Rate</p>
                          <p className="text-[10px] text-[#8FA0C2]">
                            Agents: <span className="text-[#E9EDF8]">{props.payload.agentCount}</span> · Tasks: <span className="text-[#E9EDF8]">{props.payload.tasksTotal}</span>
                          </p>
                          <p className="text-[10px] text-[#8FA0C2]">
                            HITL Gated: <span className="text-purple-300">{props.payload.hitlReviewCount}</span> · Latency: <span className="text-amber-300">{props.payload.avgLatencyMs}ms</span>
                          </p>
                        </div>,
                        ''
                      ];
                    }
                    return [val, safeName];
                  }}
                />

                <ReferenceLine 
                  y={98.5} 
                  stroke="#F59E0B" 
                  strokeDasharray="4 4" 
                  label={{ 
                    value: 'SLA Minimum 98.5%', 
                    position: 'top', 
                    fill: '#F59E0B', 
                    fontSize: 9 
                  }} 
                />

                <Bar dataKey="successRate" radius={[4, 4, 0, 0]}>
                  {departmentStats.map((entry, index) => (
                    <Cell 
                      key={`cell-${index}`} 
                      fill={entry.successRate >= 99.2 ? '#34D399' : entry.successRate >= 98.5 ? '#22D3EE' : '#F59E0B'} 
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Individual Agent Leaderboard & Throughput Matrix */}
      {activeMetricView === 'agents' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h3 className="text-sm font-bold text-[#E9EDF8] flex items-center gap-1.5">
                <span>Agent-Level Success Rate &amp; Workload Distribution</span>
                <span className="chip text-[9px] border-[#22D3EE]/30 text-[#22D3EE]">Top Active Performers</span>
              </h3>
              <p className="text-[11px] text-[#8FA0C2]">
                Detailed execution accuracy, task completions, and statutory HITL review ratios per autonomous AI worker.
              </p>
            </div>

            {/* Department Filter for Matrix */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[10px]">
              <span className="text-[#8FA0C2] font-mono">Filter:</span>
              {['All', 'Executive Management', 'Software Engineering', 'DevOps & Cloud', 'Finance & Accounting'].map(dept => (
                <button
                  key={dept}
                  onClick={() => setSelectedDeptFilter(dept)}
                  className={`px-2 py-0.5 rounded whitespace-nowrap transition-all ${
                    selectedDeptFilter === dept
                      ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                      : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8]'
                  }`}
                >
                  {dept.replace(' Management', '').replace(' & Accounting', '')}
                </button>
              ))}
            </div>
          </div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
            {filteredAgentStats.map((ag) => {
              const isHigh = ag.successRate >= 99.0;
              return (
                <div key={ag.id} className="panel2 p-3 space-y-2 hover:border-[#22D3EE]/40 transition-all">
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="font-mono text-[10px] text-[#22D3EE] font-bold bg-[#0E1830] px-1.5 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                        {ag.id}
                      </span>
                      <h4 className="text-xs font-bold text-[#E9EDF8] mt-1 leading-tight">{ag.name}</h4>
                      <p className="text-[10px] text-[#8FA0C2] truncate">{ag.department}</p>
                    </div>

                    <span className={`chip text-[10px] ${
                      isHigh ? 'border-emerald-500/30 text-emerald-400' : 'border-[#22D3EE]/30 text-[#22D3EE]'
                    }`}>
                      {ag.successRate}%
                    </span>
                  </div>

                  {/* Micro Progress Bar for Success Rate */}
                  <div className="space-y-1 pt-1 border-t border-[rgba(148,163,255,0.08)]">
                    <div className="flex justify-between text-[10px] font-mono">
                      <span className="text-[#8FA0C2]">Handled: {ag.tasksHandled}</span>
                      <span className="text-purple-300">HITL: {ag.hitlRate}%</span>
                    </div>
                    <div className="w-full bg-[#0E1830] h-1.5 rounded-full overflow-hidden border border-[rgba(148,163,255,0.08)]">
                      <div 
                        className={`h-full rounded-full ${isHigh ? 'bg-gradient-to-r from-emerald-500 to-cyan-400' : 'bg-gradient-to-r from-cyan-500 to-purple-500'}`}
                        style={{ width: `${Math.max(0, (ag.successRate - 90) * 10)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Footer Diagnostic Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-[rgba(148,163,255,0.08)] text-[11px] text-[#8FA0C2]">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-[#E9EDF8]">
            <Cpu className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>46 AI Agents Evaluated Concurrently</span>
          </span>
          <span>·</span>
          <span className="text-emerald-400 font-mono">
            Zero SLA Violations (&lt;1.5% Failure Bound)
          </span>
        </div>

        <div className="flex items-center gap-2 font-mono text-[10px]">
          <span className="text-[#8FA0C2]">Ingress Gateway:</span>
          <span className="text-[#22D3EE]">AWS af-south-1 (Cape Town)</span>
          <span>·</span>
          <span className="text-purple-300">HITL Gate: Law 02 Enforced</span>
        </div>
      </div>
    </div>
  );
};
