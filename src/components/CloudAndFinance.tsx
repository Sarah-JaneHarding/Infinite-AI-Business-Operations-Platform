import React, { useState } from 'react';
import { AWS_SERVICE_CATALOG } from '../data/mockData';
import { 
  Cloud, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Server, 
  Database, 
  HardDrive, 
  ShieldCheck, 
  Cpu, 
  PieChart,
  ArrowUpRight,
  Calculator
} from 'lucide-react';

export const CloudAndFinance: React.FC = () => {
  const [currency, setCurrency] = useState<'ZAR' | 'USD'>('ZAR');
  const fxRate = 18.5; // 1 USD = 18.5 ZAR

  // Interactive SaaS Pricing Calculator State
  const [pilotTenants, setPilotTenants] = useState<number>(3);
  const [standardTenants, setStandardTenants] = useState<number>(12);
  const [enterpriseTenants, setEnterpriseTenants] = useState<number>(4);

  // Price points (ZAR/month)
  const PILOT_PRICE = 15000;
  const STANDARD_PRICE = 48000;
  const ENTERPRISE_PRICE = 120000;

  // Monthly Revenue in ZAR
  const totalMonthlyZar = 
    pilotTenants * PILOT_PRICE + 
    standardTenants * STANDARD_PRICE + 
    enterpriseTenants * ENTERPRISE_PRICE;
  
  const totalArrZar = totalMonthlyZar * 12;

  // Compute Total Fixed AWS Costs
  const totalFixedAwsZar = AWS_SERVICE_CATALOG.reduce((acc, s) => acc + s.monthlyZar, 0);
  const totalFixedAwsUsd = AWS_SERVICE_CATALOG.reduce((acc, s) => acc + s.monthlyUsd, 0);

  // Variable AWS & Token Cost per Tenant (~R180 / tenant / mo)
  const totalVariableCostZar = (pilotTenants + standardTenants + enterpriseTenants) * 180;
  const totalCogsZar = totalFixedAwsZar + totalVariableCostZar;

  // Gross Margin Calculation
  const grossProfitZar = totalMonthlyZar - totalCogsZar;
  const grossMarginPercent = totalMonthlyZar > 0 ? ((grossProfitZar / totalMonthlyZar) * 100).toFixed(1) : '0';

  const formatMoney = (amountZar: number) => {
    if (currency === 'USD') {
      const usd = amountZar / fxRate;
      return `$${Math.round(usd).toLocaleString()}`;
    }
    return `R${Math.round(amountZar).toLocaleString()}`;
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">FINANCIAL MANAGEMENT &amp; SAAS UNIT ECONOMICS</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            3-Year Financial Model &amp; <span className="grad">AWS af-south-1 Infrastructure</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Detailed SaaS unit economics, multi-tenant cloud cost breakdown in AWS Cape Town region,
            and interactive annual recurring revenue projections.
          </p>
        </div>

        {/* Currency Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#0E1830] rounded-xl border border-[rgba(148,163,255,0.14)] self-start md:self-auto">
          <button
            onClick={() => setCurrency('ZAR')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currency === 'ZAR'
                ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
            }`}
          >
            ZAR (R)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currency === 'USD'
                ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                : 'text-[#8FA0C2] hover:text-[#E9EDF8]'
            }`}
          >
            USD ($)
          </button>
        </div>
      </div>

      {/* 3-Year Strategic SaaS KPI Overview */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">PROJECTED ARR (YEAR 3)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">
            {formatMoney(12400000)}
          </p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
            <ArrowUpRight className="w-3 h-3" />
            CAGR 145% across pilot cohorts
          </span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">BLENDED GROSS MARGIN</span>
            <PieChart className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-2xl font-bold text-[#22D3EE] mt-1">{grossMarginPercent}%</p>
          <span className="text-[10px] text-[#8FA0C2]">Boosted by L2 prompt caching</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">LTV : CAC RATIO</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">4.9 : 1</p>
          <span className="text-[10px] text-[#8FA0C2]">CAC Payback: 10.2 Months</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">FIXED CLOUD FLOOR (AWS)</span>
            <Server className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">
            {currency === 'USD' ? `$${totalFixedAwsUsd}` : `R${totalFixedAwsZar.toLocaleString()}`}
          </p>
          <span className="text-[10px] text-[#8FA0C2]">Monthly af-south-1 base</span>
        </div>
      </div>

      {/* Interactive SaaS Revenue Calculator */}
      <div className="panel p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div>
            <p className="kick">INTERACTIVE REVENUE &amp; MARGIN MODEL</p>
            <h2 className="text-base font-bold text-[#E9EDF8]">Tenant Volume &amp; Tier Calculator</h2>
          </div>
          <span className="chip border-[#22D3EE]/30 text-[#22D3EE] text-xs">
            Dynamic Simulation
          </span>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          {/* Pilot Seed Tier */}
          <div className="panel2 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#E9EDF8]">Pilot Seed Tier</span>
              <span className="text-xs font-mono text-[#22D3EE]">{formatMoney(PILOT_PRICE)}/mo</span>
            </div>
            <p className="text-[11px] text-[#8FA0C2]">Single department trial, 500k tokens, 5 users</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#8FA0C2]">Active Tenants:</span>
                <strong className="text-[#E9EDF8]">{pilotTenants}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={20}
                value={pilotTenants}
                onChange={(e) => setPilotTenants(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0E1830] rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
              />
            </div>
            <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
              <span>Subtotal:</span>
              <span>{formatMoney(pilotTenants * PILOT_PRICE)}/mo</span>
            </div>
          </div>

          {/* Standard Tier */}
          <div className="panel2 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#E9EDF8]">Standard Operations Tier</span>
              <span className="text-xs font-mono text-[#22D3EE]">{formatMoney(STANDARD_PRICE)}/mo</span>
            </div>
            <p className="text-[11px] text-[#8FA0C2]">MOD-01 to MOD-04, 2.5M tokens, 25 users</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#8FA0C2]">Active Tenants:</span>
                <strong className="text-[#E9EDF8]">{standardTenants}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={50}
                value={standardTenants}
                onChange={(e) => setStandardTenants(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0E1830] rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
              />
            </div>
            <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
              <span>Subtotal:</span>
              <span>{formatMoney(standardTenants * STANDARD_PRICE)}/mo</span>
            </div>
          </div>

          {/* Enterprise Tier */}
          <div className="panel2 p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#E9EDF8]">Enterprise Autonomous Tier</span>
              <span className="text-xs font-mono text-[#22D3EE]">{formatMoney(ENTERPRISE_PRICE)}/mo</span>
            </div>
            <p className="text-[11px] text-[#8FA0C2]">Full 46 agents, unlimited tokens, dedicated KMS</p>
            <div className="space-y-1">
              <div className="flex justify-between text-xs">
                <span className="text-[#8FA0C2]">Active Tenants:</span>
                <strong className="text-[#E9EDF8]">{enterpriseTenants}</strong>
              </div>
              <input
                type="range"
                min={0}
                max={25}
                value={enterpriseTenants}
                onChange={(e) => setEnterpriseTenants(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0E1830] rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
              />
            </div>
            <div className="text-[11px] font-mono text-emerald-400 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
              <span>Subtotal:</span>
              <span>{formatMoney(enterpriseTenants * ENTERPRISE_PRICE)}/mo</span>
            </div>
          </div>
        </div>

        {/* Dynamic Total Summary Bar */}
        <div className="panel2 p-4 bg-[#05070f] flex flex-wrap items-center justify-between gap-4 border border-[#22D3EE]/30">
          <div>
            <span className="text-[10px] text-[#8FA0C2] font-mono block">PROJECTED MONTHLY REVENUE (MRR):</span>
            <p className="text-xl font-bold text-[#22D3EE]">{formatMoney(totalMonthlyZar)}</p>
          </div>
          <div>
            <span className="text-[10px] text-[#8FA0C2] font-mono block">RUN-RATE ANNUAL REVENUE (ARR):</span>
            <p className="text-xl font-bold text-emerald-400">{formatMoney(totalArrZar)}</p>
          </div>
          <div>
            <span className="text-[10px] text-[#8FA0C2] font-mono block">TOTAL CLOUD COGS:</span>
            <p className="text-xl font-bold text-rose-300">{formatMoney(totalCogsZar)}</p>
          </div>
          <div>
            <span className="text-[10px] text-[#8FA0C2] font-mono block">CALCULATED GROSS MARGIN:</span>
            <p className="text-xl font-bold text-[#E9EDF8]">{grossMarginPercent}%</p>
          </div>
        </div>
      </div>

      {/* AWS af-south-1 Service Catalog Table */}
      <div className="panel p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <p className="kick">INFRASTRUCTURE BILL OF MATERIALS</p>
            <h2 className="text-base font-bold text-[#E9EDF8]">AWS Cape Town (af-south-1) Resource Catalog</h2>
          </div>
          <span className="text-xs text-[#8FA0C2] font-mono">
            Directly from Stage 15 Terraform Specs
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#8FA0C2] font-mono text-[10px]">
                <th className="pb-2.5">LAYER</th>
                <th className="pb-2.5">AWS SERVICE</th>
                <th className="pb-2.5">SIZING / CONFIGURATION</th>
                <th className="pb-2.5">PURPOSE &amp; GOVERNANCE</th>
                <th className="pb-2.5 text-right">COST ({currency})</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#8FA0C2]">
              {AWS_SERVICE_CATALOG.map((svc, i) => (
                <tr key={i} className="hover:bg-[#13203C]/40 transition-colors">
                  <td className="py-3 font-mono text-[#22D3EE] font-bold text-[11px]">{svc.layer}</td>
                  <td className="py-3 font-semibold text-[#E9EDF8]">{svc.service}</td>
                  <td className="py-3 font-mono text-[11px]">{svc.sizing}</td>
                  <td className="py-3 text-[11px] max-w-xs">{svc.purpose}</td>
                  <td className="py-3 font-mono font-bold text-right text-emerald-400">
                    {currency === 'USD' ? `$${svc.monthlyUsd}` : `R${svc.monthlyZar.toLocaleString()}`}
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-[rgba(148,163,255,0.18)] font-bold text-[#E9EDF8]">
                <td colSpan={4} className="py-3 font-mono text-[11px]">
                  TOTAL MONTHLY FIXED INFRASTRUCTURE FLOOR
                </td>
                <td className="py-3 font-mono text-right text-[#22D3EE] text-sm">
                  {currency === 'USD' ? `$${totalFixedAwsUsd}` : `R${totalFixedAwsZar.toLocaleString()}`}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
