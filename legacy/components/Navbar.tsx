import React, { useState } from 'react';
import { NavTab } from '../types';
import { 
  BarChart3, 
  Cpu, 
  Users, 
  Globe, 
  Terminal, 
  Workflow, 
  ShieldCheck, 
  Building2, 
  Share2, 
  BookOpen, 
  Menu, 
  X,
  DollarSign,
  Database,
  Lock,
  GitPullRequest
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  ratifiedCount?: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onSelectTab,
  ratifiedCount = 42
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'command', label: 'Command Centre', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'studio', label: 'Document Studio', icon: <BookOpen className="w-3.5 h-3.5 text-purple-300" /> },
    { id: 'warehouse', label: 'Data Warehouse', icon: <Database className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'depts', label: '16 Departments', icon: <Users className="w-3.5 h-3.5 text-amber-300" /> },
    { id: 'brain', label: 'Infinite Brain', icon: <Cpu className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'ledger', label: 'Audit Ledger', icon: <Lock className="w-3.5 h-3.5 text-rose-300" /> },
    { id: 'infra', label: 'Cost & Finance', icon: <DollarSign className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'website', label: 'Ecosystem Showcase', icon: <Globe className="w-3.5 h-3.5 text-cyan-300" /> },
    { id: 'guardrails', label: 'Guardrail Lab', icon: <ShieldCheck className="w-3.5 h-3.5 text-purple-400" /> },
    { id: 'connector', label: 'GitHub Connector', icon: <GitPullRequest className="w-3.5 h-3.5 text-sky-400" /> }
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="top fixed top-0 left-0 right-0 z-50 bg-[#0A1226]/90 backdrop-blur-md border-b border-[rgba(148,163,255,0.12)]">
      <div className="max-w-7xl mx-auto px-3 py-2 flex items-center justify-between gap-2">
        {/* Brand Logo & Name */}
        <div 
          className="flex items-center gap-2 cursor-pointer group shrink-0"
          onClick={() => handleSelect('command')}
        >
          <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-gradient-to-br from-[#8B5CF6] via-[#2DD4BF] to-[#22D3EE] p-[1.5px] shadow-sm">
            <div className="w-full h-full bg-[#0A1226] rounded-[6.5px] flex items-center justify-center">
              <svg width="22" height="12" viewBox="0 0 64 32">
                <defs>
                  <linearGradient id="navGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#E879F9" />
                    <stop offset="50%" stopColor="#8B5CF6" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
                <path 
                  d="M16 8 C 5 8 5 24 16 24 C 27 24 37 8 48 8 C 59 8 59 24 48 24 C 37 24 27 8 16 8 Z" 
                  fill="none" 
                  stroke="url(#navGrad)" 
                  strokeWidth="5" 
                  strokeLinecap="round"
                />
              </svg>
            </div>
          </div>
          <div>
            <p className="disp font-bold text-xs tracking-wide leading-tight flex items-center gap-1">
              <span>INFINITE-AI</span>
              <span className="grad font-black text-cyan-400">OPS</span>
            </p>
            <p className="text-[9px] text-[#CBD5E1] font-mono leading-none">Operations Platform</p>
          </div>
        </div>

        {/* Desktop Nav Items */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive 
                    ? 'text-cyan-300 bg-[#13203C] border border-[rgba(34,211,238,0.3)] shadow-[0_0_12px_rgba(34,211,238,0.15)] font-semibold' 
                    : 'text-[#CBD5E1] hover:text-white hover:bg-[#0E1830]'
                }`}
              >
                {item.icon}
                <span>{item.label}</span>
                {item.badge && (
                  <span className="w-2 h-2 rounded-full bg-[#FB7185] animate-pulse" title={item.badge} />
                )}
              </button>
            );
          })}
        </div>

        {/* Right Status Capsule & Mobile Toggle */}
        <div className="flex items-center gap-2">
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#CBD5E1] bg-[#0E1830] px-2.5 py-1 rounded-lg border border-[rgba(148,163,255,0.14)]">
            <span className="flex items-center gap-1 text-emerald-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              L0–L4 BRAIN ONLINE
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#0E1830] text-[#CBD5E1] hover:text-white border border-[rgba(148,163,255,0.2)]"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0A1226]/95 backdrop-blur-md border-b border-[rgba(148,163,255,0.14)] p-4 space-y-1 max-h-[80vh] overflow-y-auto">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`w-full px-3 py-2 rounded-lg text-xs font-medium flex items-center justify-between transition-all ${
                  isActive 
                    ? 'text-cyan-300 bg-[#13203C] border border-cyan-500/30 font-semibold' 
                    : 'text-[#CBD5E1] hover:bg-[#0E1830] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  {item.icon}
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-rose-950 text-rose-300 font-mono">
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </nav>
  );
};
