import React, { useState } from 'react';
import { INITIAL_DEALS } from '../data/mockData';
import { DealItem } from '../types';
import { 
  Users, 
  UserCheck, 
  TrendingUp, 
  AlertCircle, 
  Plus, 
  CheckCircle2, 
  Building2, 
  PhoneCall, 
  Clock, 
  DollarSign,
  ChevronRight,
  ShieldAlert,
  Search
} from 'lucide-react';

export const CrmSystem: React.FC = () => {
  const [deals, setDeals] = useState<DealItem[]>(INITIAL_DEALS);
  const [selectedStage, setSelectedStage] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);

  // New Deal Form State
  const [clientName, setClientName] = useState('');
  const [contactRole, setContactRole] = useState('');
  const [dealTier, setDealTier] = useState<'Pilot Seed' | 'Standard' | 'Enterprise'>('Standard');
  const [annualValue, setAnnualValue] = useState(48000);
  const [nextStepText, setNextStepText] = useState('');

  // Total Pipeline Value
  const totalPipelineZar = deals.reduce((acc, d) => acc + d.annualValueZar, 0);

  // Filtered deals
  const filteredDeals = deals.filter(d => {
    const matchStage = selectedStage === 'ALL' || d.stage === selectedStage;
    const matchSearch = d.client.toLowerCase().includes(searchQuery.toLowerCase()) ||
                        d.contact.toLowerCase().includes(searchQuery.toLowerCase());
    return matchStage && matchSearch;
  });

  const handleAddDeal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientName.trim()) return;

    const newDeal: DealItem = {
      id: `D-00${deals.length + 1}`,
      client: clientName,
      contact: contactRole || 'Operations Lead',
      stage: 'PROSPECT',
      tier: dealTier,
      annualValueZar: Number(annualValue),
      nextStep: nextStepText || 'Initial discovery and policy intake call.'
    };

    setDeals([...deals, newDeal]);
    setShowAddModal(false);
    setClientName('');
    setContactRole('');
    setNextStepText('');
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">CRM &amp; ENTERPRISE CUSTOMER SUCCESS</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Customer 360 &amp; <span className="grad">Enterprise Pilot Pipeline</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Multi-tenant customer lifecycle monitoring, enterprise pilot onboarding pipeline,
            and automated churn risk scoring powered by CRM Intelligence AI (A08).
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="btn btn-p text-xs self-start md:self-auto"
        >
          <Plus className="w-3.5 h-3.5 mr-1" />
          Add Enterprise Prospect
        </button>
      </div>

      {/* Overview Stat Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">ACTIVE PIPELINE VALUE</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">R{totalPipelineZar.toLocaleString()}</p>
          <span className="text-[10px] text-emerald-400">4 qualified enterprise deals</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">KEY PILOT TENANT</span>
            <Building2 className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-base font-bold text-[#22D3EE] mt-1">Beacon Ridge Group</p>
          <span className="text-[10px] text-amber-300">Gated on PagerDuty escalation</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">AVG TENANT HEALTH INDEX</span>
            <UserCheck className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-purple-400 mt-1">94.2 / 100</p>
          <span className="text-[10px] text-[#8FA0C2]">Zero high-risk churn indicators</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">ONBOARDING READINESS</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">Stage 17 Ready</p>
          <span className="text-[10px] text-[#8FA0C2]">Automated provisioning wizard</span>
        </div>
      </div>

      {/* Pipeline Filter Bar */}
      <div className="panel p-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto text-xs">
          {['ALL', 'PILOT GATED', 'DEMO', 'BRIEFED', 'PROSPECT'].map((st) => (
            <button
              key={st}
              onClick={() => setSelectedStage(st)}
              className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedStage === st
                  ? 'bg-[#22D3EE]/20 text-[#22D3EE] border border-[#22D3EE]/40'
                  : 'bg-[#13203C] text-[#8FA0C2] hover:text-[#E9EDF8]'
              }`}
            >
              {st}
            </button>
          ))}
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8FA0C2] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search clients..."
            className="inp pl-8 text-xs py-1"
          />
        </div>
      </div>

      {/* Enterprise Deals Cards */}
      <div className="grid md:grid-cols-2 gap-4">
        {filteredDeals.map((deal) => {
          const isGated = deal.stage === 'PILOT GATED';
          return (
            <div 
              key={deal.id} 
              className={`panel p-5 space-y-3.5 transition-all ${
                isGated ? 'border-amber-500/40 bg-[#0E1830]/80' : ''
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-[#22D3EE] font-bold bg-[#0E1830] px-2 py-0.5 rounded border border-[rgba(34,211,238,0.2)]">
                      {deal.id}
                    </span>
                    <span className={`chip text-[10px] ${
                      isGated 
                        ? 'border-amber-500/40 text-amber-300 bg-amber-950/20' 
                        : 'border-emerald-500/30 text-emerald-400'
                    }`}>
                      {deal.stage}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-[#E9EDF8] mt-1.5">{deal.client}</h3>
                  <p className="text-xs text-[#8FA0C2]">Contact: {deal.contact}</p>
                </div>

                <div className="text-right">
                  <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block">Value:</span>
                  <span className="text-base font-mono font-bold text-emerald-400">
                    R{deal.annualValueZar.toLocaleString()}
                  </span>
                  <span className="text-[10px] text-[#8FA0C2] block">Tier: {deal.tier}</span>
                </div>
              </div>

              {/* Next Step & Blockers */}
              <div className="p-3 rounded-lg bg-[#05070f] border border-[rgba(148,163,255,0.08)] text-xs space-y-1">
                <span className="text-[10px] font-mono uppercase text-[#22D3EE] block font-bold">
                  Next Milestone Action:
                </span>
                <p className="text-[#8FA0C2] leading-relaxed">{deal.nextStep}</p>
              </div>

              {isGated && (
                <div className="flex items-center gap-2 text-[11px] text-amber-300 bg-amber-950/30 p-2 rounded border border-amber-500/30">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>Blocked on OQ-014: Requires PagerDuty emergency safeguarding key setup.</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Deal Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="panel max-w-lg w-full p-6 relative border border-[#22D3EE]/30 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-[#E9EDF8]">Create New Enterprise Prospect</h3>
            <p className="text-xs text-[#8FA0C2]">
              Register an enterprise organization in the pilot conversion pipeline.
            </p>

            <form onSubmit={handleAddDeal} className="space-y-3">
              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Company / Organization:</label>
                <input
                  type="text"
                  required
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="e.g., Sanlam Enterprise Operations"
                  className="inp text-xs"
                />
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Key Stakeholder &amp; Role:</label>
                <input
                  type="text"
                  value={contactRole}
                  onChange={(e) => setContactRole(e.target.value)}
                  placeholder="e.g., Head of Digital Transformation"
                  className="inp text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Tier:</label>
                  <select
                    value={dealTier}
                    onChange={(e) => setDealTier(e.target.value as any)}
                    className="inp text-xs"
                  >
                    <option value="Pilot Seed">Pilot Seed (R15k)</option>
                    <option value="Standard">Standard (R48k)</option>
                    <option value="Enterprise">Enterprise (R120k)</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Annual Value (ZAR):</label>
                  <input
                    type="number"
                    value={annualValue}
                    onChange={(e) => setAnnualValue(Number(e.target.value))}
                    className="inp text-xs font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1">Immediate Next Step:</label>
                <input
                  type="text"
                  value={nextStepText}
                  onChange={(e) => setNextStepText(e.target.value)}
                  placeholder="e.g., Deliver customized security questionnaire"
                  className="inp text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="btn btn-g text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-p text-xs px-4"
                >
                  Save Prospect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
