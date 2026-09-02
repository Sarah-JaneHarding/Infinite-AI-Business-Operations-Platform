import React, { useState } from 'react';
import { NavTab } from '../types';
import { 
  BarChart3, 
  Cpu, 
  Users, 
  Globe, 
  Terminal, 
  Workflow, 
  Cloud, 
  ShieldCheck, 
  Building2, 
  Share2, 
  BookOpen, 
  Menu, 
  X 
} from 'lucide-react';

interface NavbarProps {
  activeTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
  stage02Resolved: boolean;
  ratifiedCount: number;
}

export const Navbar: React.FC<NavbarProps> = ({ 
  activeTab, 
  onSelectTab, 
  stage02Resolved,
  ratifiedCount 
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems: { id: NavTab; label: string; icon: React.ReactNode; badge?: string }[] = [
    { id: 'command', label: 'Command', icon: <BarChart3 className="w-3.5 h-3.5" /> },
    { id: 'brain', label: 'Brain & Modules', icon: <Cpu className="w-3.5 h-3.5" /> },
    { id: 'agents', label: '46 AI Agents', icon: <Users className="w-3.5 h-3.5" /> },
    { id: 'website', label: 'Business Website', icon: <Globe className="w-3.5 h-3.5" /> },
    { 
      id: 'dev', 
      label: 'Dev Studio', 
      icon: <Terminal className="w-3.5 h-3.5" />,
      badge: stage02Resolved ? undefined : '1 Action'
    },
    { id: 'gateway', label: 'Model Gateway', icon: <Workflow className="w-3.5 h-3.5" /> },
    { id: 'infra', label: 'Cloud & Finance', icon: <Cloud className="w-3.5 h-3.5" /> },
    { id: 'gov', label: 'Security & Risk', icon: <ShieldCheck className="w-3.5 h-3.5" /> },
    { id: 'crm', label: 'CRM Pipeline', icon: <Building2 className="w-3.5 h-3.5" /> },
    { id: 'integrations', label: 'Integrations', icon: <Share2 className="w-3.5 h-3.5" /> },
    { id: 'docs', label: 'Docs & Ratify', icon: <BookOpen className="w-3.5 h-3.5" /> },
  ];

  const handleSelect = (tab: NavTab) => {
    onSelectTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <nav className="top fixed top-0 left-0 right-0 z-50">
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
              <span className="grad font-black">OPS</span>
            </p>
            <p className="text-[9px] text-[#8FA0C2] font-mono leading-none">Operations Platform</p>
          </div>
        </div>

        {/* Desktop Nav Items (scrollable or wrap if needed) */}
        <div className="hidden lg:flex items-center gap-1 overflow-x-auto py-0.5">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleSelect(item.id)}
                className={`relative px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 flex items-center gap-1.5 whitespace-nowrap ${
                  isActive 
                    ? 'text-[#22D3EE] bg-[#13203C] border border-[rgba(34,211,238,0.3)] shadow-[0_0_12px_rgba(34,211,238,0.15)]' 
                    : 'text-[#8FA0C2] hover:text-[#E9EDF8] hover:bg-[#0E1830]'
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
          <div className="hidden sm:flex items-center gap-2 text-[10px] font-mono text-[#8FA0C2] bg-[#0E1830] px-2.5 py-1 rounded-lg border border-[rgba(148,163,255,0.08)]">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              L0-L8 ONLINE
            </span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-1.5 rounded-lg bg-[#0E1830] text-[#8FA0C2] hover:text-[#E9EDF8] border border-[rgba(148,163,255,0.1)]"
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
                    ? 'text-[#22D3EE] bg-[#13203C] border border-[#22D3EE]/30' 
                    : 'text-[#8FA0C2] hover:bg-[#0E1830] hover:text-[#E9EDF8]'
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
