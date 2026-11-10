import React, { useState } from 'react';
import { AWS_SERVICE_CATALOG } from '../data/mockData';
import { DynamicCostCalculator } from './DynamicCostCalculator';
import { 
  Cloud, 
  DollarSign, 
  TrendingUp, 
  Layers, 
  Server, 
  Database, 
  ShieldCheck, 
  PieChart,
  ArrowUpRight,
  Calculator,
  CheckCircle2
} from 'lucide-react';

export const CloudAndFinance: React.FC = () => {
  const [currency, setCurrency] = useState<'ZAR' | 'USD'>('ZAR');
  const fxRate = 18.5; // 1 USD = 18.5 ZAR

  // Standard SA Primary School Baseline
  const BASELINE_SCHOOLS = 25;
  const BASELINE_PRICE_PER_SCHOOL = 4000; // R4,000 / school / month

  // Compute Total Fixed AWS Costs
  const totalFixedAwsZar = AWS_SERVICE_CATALOG.reduce((acc, s) => acc + s.monthlyZar, 0); // ~R6,475
  const totalFixedAwsUsd = AWS_SERVICE_CATALOG.reduce((acc, s) => acc + s.monthlyUsd, 0); // ~$350

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
            School SaaS Model &amp; <span className="grad">Dynamic Cost Calculator</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            South African primary school SaaS economics at the <strong className="text-cyan-300">R4,000 / month</strong> baseline.
            Includes shared AWS af-south-1 infrastructure, 3rd-party operations, and Anthropic Claude prompt-cached token consumption.
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

      {/* Strategic Executive Highlight (At R4,000/mo baseline across cohorts) */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">BASELINE REVENUE (25 SCHOOLS)</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">
            {formatMoney(BASELINE_SCHOOLS * BASELINE_PRICE_PER_SCHOOL)}
            <span className="text-xs font-normal text-[#8FA0C2]"> / mo</span>
          </p>
          <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5 font-mono">
            <ArrowUpRight className="w-3 h-3" />
            ARR: {formatMoney(BASELINE_SCHOOLS * BASELINE_PRICE_PER_SCHOOL * 12)}
          </span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">GROSS CONTRIBUTION MARGIN</span>
            <PieChart className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-2xl font-bold text-[#22D3EE] mt-1">65.8%</p>
          <span className="text-[10px] text-[#8FA0C2]">Unit cost R1,368 vs R4k revenue</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">PORTFOLIO BREAK-EVEN</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">3 Schools</p>
          <span className="text-[10px] text-[#8FA0C2]">R2,926/mo unit contribution</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">FIXED CLOUD BASELINE (AWS)</span>
            <Server className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">
            {currency === 'USD' ? `$${totalFixedAwsUsd}` : `R${totalFixedAwsZar.toLocaleString()}`}
          </p>
          <span className="text-[10px] text-[#8FA0C2]">Monthly af-south-1 Cape Town</span>
        </div>
      </div>

      {/* Dynamic Cost & Revenue Calculator Component */}
      <DynamicCostCalculator initialSchools={25} initialPrice={4000} />
    </div>
  );
};
