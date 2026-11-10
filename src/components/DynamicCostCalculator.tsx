import React, { useState, useMemo } from 'react';
import { 
  DollarSign, 
  TrendingUp, 
  Server, 
  PieChart, 
  ArrowUpRight, 
  HelpCircle, 
  Layers, 
  Database, 
  ShieldCheck, 
  HardDrive, 
  Activity, 
  Cpu, 
  Check, 
  Info,
  ExternalLink,
  ChevronRight
} from 'lucide-react';

export interface DynamicCostCalculatorProps {
  initialSchools?: number;
  initialPrice?: number;
}

export const DynamicCostCalculator: React.FC<DynamicCostCalculatorProps> = ({
  initialSchools = 25,
  initialPrice = 4000
}) => {
  // Navigation sub-tab inside the calculator
  const [activeSubTab, setActiveSubTab] = useState<'financial' | 'aws'>('financial');

  // Core model state
  const [schools, setSchools] = useState<number>(initialSchools);
  const [price, setPrice] = useState<number>(initialPrice);
  const [emailService, setEmailService] = useState<'ses' | 'postmark'>('ses');
  const [schoolSize, setSchoolSize] = useState<'small' | 'medium' | 'large'>('medium');
  const [fxRate, setFxRate] = useState<number>(18.5); // ZAR per USD

  // Fixed monthly costs in ZAR
  const AWS_FIXED_USD = 350;
  const awsFixedZar = Math.round(AWS_FIXED_USD * fxRate); // R6,475 at 18.5
  const DOMAIN_ZAR = 13;
  const SENTRY_ZAR = Math.round(26 * fxRate); // R481 at 18.5
  const UPTIME_ZAR = Math.round(20 * fxRate); // R370 at 18.5
  const POSTMARK_ZAR = Math.round(15 * fxRate); // R278 at 18.5

  // Marginal / variable costs per school per month in USD and ZAR
  // Sizing tiers:
  // Small: 200 learners -> $18 LLM (R333), $8 infra (R148)
  // Medium: 500 learners -> $45 LLM (R833), $13 infra (R241)
  // Large: 800 learners -> $73 LLM (R1,350), $18 infra (R333)
  const tierConfig = {
    small: { llmUsd: 18, infraUsd: 8, label: 'Small (~200 learners, ~15 staff)' },
    medium: { llmUsd: 45, infraUsd: 13, label: 'Medium (~500 learners, ~35 staff)' },
    large: { llmUsd: 73, infraUsd: 18, label: 'Large (~800 learners, ~55 staff)' }
  };

  const selectedTier = tierConfig[schoolSize];
  const perLlmZar = Math.round(selectedTier.llmUsd * fxRate);
  const perInfraZar = Math.round(selectedTier.infraUsd * fxRate);
  const variableFloor = perLlmZar + perInfraZar; // minimum variable cost per school

  // Derived financial metrics
  const thirdPartyFixed = DOMAIN_ZAR + SENTRY_ZAR + UPTIME_ZAR + (emailService === 'postmark' ? POSTMARK_ZAR : 0);
  const totalFixedCosts = awsFixedZar + thirdPartyFixed;

  const varLlmTotal = schools * perLlmZar;
  const varInfraTotal = schools * perInfraZar;
  const totalVariableCosts = varLlmTotal + varInfraTotal;

  const totalMonthlyCost = totalFixedCosts + totalVariableCosts;
  const blendedCostPerSchool = schools > 0 ? totalMonthlyCost / schools : 0;

  const monthlyGrossRevenue = schools * price;
  const grossProfit = monthlyGrossRevenue - totalMonthlyCost;
  const grossMarginPct = monthlyGrossRevenue > 0 ? (grossProfit / monthlyGrossRevenue) * 100 : 0;

  const unitContribution = price - variableFloor;
  const breakEvenSchools = unitContribution > 0 ? Math.ceil(totalFixedCosts / unitContribution) : Infinity;
  const annualGrossProfit = grossProfit * 12;
  const annualRevenue = monthlyGrossRevenue * 12;
  const monthlyLlmUsd = schools * selectedTier.llmUsd;

  // Formatting helpers
  const fmtZar = (n: number) => `R${Math.round(n).toLocaleString('en-ZA')}`;
  const fmtZarK = (n: number) => n >= 1000 ? `R${(n / 1000).toFixed(1)}k` : fmtZar(n);

  const getMarginColor = (pct: number) => {
    if (pct < 0) return 'text-rose-400';
    if (pct < 20) return 'text-amber-400';
    if (pct < 40) return 'text-blue-300';
    return 'text-emerald-400';
  };

  const getMarginBg = (pct: number) => {
    if (pct < 0) return 'rgba(244, 63, 94, 0.12)';
    if (pct < 20) return 'rgba(245, 158, 11, 0.12)';
    if (pct < 40) return 'rgba(56, 189, 248, 0.1)';
    return 'rgba(52, 211, 153, 0.15)';
  };

  // Sensitivity matrix options
  const matrixPrices = [3000, 3500, 4000, 4500, 5000];
  const matrixSchools = [5, 10, 25, 50, 100];

  // SVG Chart 1: Stacked Bar Chart Calculations
  const chart1Max = Math.max(totalMonthlyCost, monthlyGrossRevenue) * 1.18 || 1;
  const c1W = 380;
  const c1H = 200;
  const c1Pad = { t: 24, r: 24, b: 36, l: 60 };
  const c1InnerW = c1W - c1Pad.l - c1Pad.r;
  const c1InnerH = c1H - c1Pad.t - c1Pad.b;
  const barWidth = c1InnerW * 0.28;
  const barCostX = c1Pad.l + c1InnerW * 0.25;
  const barRevX = c1Pad.l + c1InnerW * 0.75;

  const yOfVal = (v: number) => c1Pad.t + c1InnerH - (v / chart1Max) * c1InnerH;

  // Segments for Cost Bar
  const hAwsFixed = (awsFixedZar / chart1Max) * c1InnerH;
  const h3pFixed = (thirdPartyFixed / chart1Max) * c1InnerH;
  const hInfraVar = (varInfraTotal / chart1Max) * c1InnerH;
  const hLlmVar = (varLlmTotal / chart1Max) * c1InnerH;

  const yAws = c1Pad.t + c1InnerH - hAwsFixed;
  const y3p = yAws - h3pFixed;
  const yInfra = y3p - hInfraVar;
  const yLlm = yInfra - hLlmVar;
  const totalCostTop = yLlm;

  const hRev = (monthlyGrossRevenue / chart1Max) * c1InnerH;
  const revTop = c1Pad.t + c1InnerH - hRev;

  // SVG Chart 2: Cost Per School vs Scale Curve
  const c2W = 380;
  const c2H = 200;
  const c2Pad = { t: 24, r: 28, b: 36, l: 56 };
  const c2InnerW = c2W - c2Pad.l - c2Pad.r;
  const c2InnerH = c2H - c2Pad.t - c2Pad.b;
  const maxScaleN = 100;
  const maxCps = Math.max(price * 1.2, 5000);

  const xOfN = (n: number) => c2Pad.l + (n / maxScaleN) * c2InnerW;
  const yOfCps = (v: number) => c2Pad.t + c2InnerH - (Math.min(v, maxCps) / maxCps) * c2InnerH;

  const curvePoints = useMemo(() => {
    const pts: string[] = [];
    for (let n = 1; n <= 100; n++) {
      const c = (totalFixedCosts + n * variableFloor) / n;
      pts.push(`${xOfN(n).toFixed(1)},${yOfCps(c).toFixed(1)}`);
    }
    return pts.join(' ');
  }, [totalFixedCosts, variableFloor, maxCps]);

  const currentDotX = xOfN(Math.min(schools, 100));
  const currentDotY = yOfCps(blendedCostPerSchool);

  return (
    <div className="space-y-6">
      {/* Sub Header & Tab Switcher */}
      <div className="panel p-5 bg-[#0A1224] border border-[#22D3EE]/25 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="chip border-cyan-500/30 text-cyan-300 bg-cyan-950/40 text-[10px] font-mono">
              FINANCIAL ARCHITECTURE · AF-SOUTH-1
            </span>
            <span className="chip border-emerald-500/30 text-emerald-400 bg-emerald-950/40 text-[10px] font-mono">
              ZAR @ R{fxRate.toFixed(2)}/USD
            </span>
          </div>
          <h1 className="text-xl md:text-2xl font-bold text-[#E9EDF8] mt-1.5 flex items-center gap-2">
            <span>Infinite AI · Dynamic Financial Model &amp; Unit Economics</span>
          </h1>
          <p className="text-xs text-[#CBD5E1] mt-0.5 max-w-2xl">
            South African school SaaS economics at the <strong className="text-cyan-300">R4,000/month baseline</strong>.
            Live infrastructure cost simulation, AWS Cape Town resource catalog, and sensitivity modeling.
          </p>
        </div>

        {/* Sub Tab Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#070D1E] rounded-xl border border-[rgba(148,163,255,0.18)] self-start md:self-auto shrink-0">
          <button
            onClick={() => setActiveSubTab('financial')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'financial'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
            }`}
          >
            <TrendingUp className="w-3.5 h-3.5" />
            <span>Financial Model</span>
          </button>
          <button
            onClick={() => setActiveSubTab('aws')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
              activeSubTab === 'aws'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm'
                : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
            }`}
          >
            <Server className="w-3.5 h-3.5" />
            <span>AWS Infrastructure</span>
          </button>
        </div>
      </div>

      {activeSubTab === 'financial' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="panel p-5 bg-[#0B1528] border border-[rgba(148,163,255,0.14)] space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {/* School Volume Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="kick text-[11px]">SCHOOLS ONBOARDED</span>
                  <span className="font-mono text-sm font-bold text-cyan-300">{schools} Schools</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[5, 10, 25, 50, 100].map((num) => (
                    <button
                      key={num}
                      onClick={() => setSchools(num)}
                      className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition-all ${
                        schools === num
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-bold'
                          : 'bg-[#070D1E] text-[#CBD5E1] border-[rgba(148,163,255,0.16)] hover:border-cyan-500/40 hover:text-white'
                      }`}
                    >
                      {num}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={1}
                  max={120}
                  value={schools}
                  onChange={(e) => setSchools(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#070D1E] rounded-lg appearance-none cursor-pointer accent-cyan-400 mt-1"
                />
              </div>

              {/* Monthly Price / School Control */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="kick text-[11px]">MONTHLY PRICE / SCHOOL</span>
                  <span className="font-mono text-sm font-bold text-emerald-400">{fmtZar(price)}/mo</span>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[3000, 3500, 4000, 4500, 5000].map((p) => (
                    <button
                      key={p}
                      onClick={() => setPrice(p)}
                      className={`px-2 py-1 text-xs font-semibold rounded-md border transition-all ${
                        price === p
                          ? 'bg-emerald-500 text-slate-950 border-emerald-400 font-bold'
                          : 'bg-[#070D1E] text-[#CBD5E1] border-[rgba(148,163,255,0.16)] hover:border-emerald-500/40 hover:text-white'
                      }`}
                    >
                      {fmtZar(p)}
                    </button>
                  ))}
                </div>
                <input
                  type="range"
                  min={2000}
                  max={8000}
                  step={250}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-1.5 bg-[#070D1E] rounded-lg appearance-none cursor-pointer accent-emerald-400 mt-1"
                />
              </div>

              {/* School Sizing Tier */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="kick text-[11px]">SCHOOL PROFILE / SIZE</span>
                  <span className="font-mono text-xs text-[#CBD5E1] capitalize">{schoolSize}</span>
                </div>
                <div className="flex gap-1.5">
                  {(['small', 'medium', 'large'] as const).map((sz) => (
                    <button
                      key={sz}
                      onClick={() => setSchoolSize(sz)}
                      className={`flex-1 py-1 text-xs font-semibold rounded-md border capitalize transition-all ${
                        schoolSize === sz
                          ? 'bg-purple-600 text-white border-purple-400 font-bold'
                          : 'bg-[#070D1E] text-[#CBD5E1] border-[rgba(148,163,255,0.16)] hover:border-purple-500/40 hover:text-white'
                      }`}
                    >
                      {sz}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-[#CBD5E1] mt-0.5 truncate">
                  {selectedTier.label}
                </p>
              </div>

              {/* Email & FX Settings */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="kick text-[11px]">EMAIL &amp; FX SETTINGS</span>
                  <span className="font-mono text-[10px] text-[#CBD5E1]">R{fxRate.toFixed(2)}/$</span>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => setEmailService('ses')}
                    className={`flex-1 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                      emailService === 'ses'
                        ? 'bg-amber-500/30 text-amber-300 border-amber-500'
                        : 'bg-[#070D1E] text-[#CBD5E1] border-[rgba(148,163,255,0.16)]'
                    }`}
                  >
                    AWS SES (Free)
                  </button>
                  <button
                    onClick={() => setEmailService('postmark')}
                    className={`flex-1 py-1 text-[11px] font-semibold rounded-md border transition-all ${
                      emailService === 'postmark'
                        ? 'bg-cyan-500/30 text-cyan-300 border-cyan-500'
                        : 'bg-[#070D1E] text-[#CBD5E1] border-[rgba(148,163,255,0.16)]'
                    }`}
                  >
                    Postmark (+{fmtZar(POSTMARK_ZAR)})
                  </button>
                </div>
                <div className="flex items-center justify-between text-[10px] text-[#CBD5E1] pt-0.5">
                  <span>Planning FX Rate:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setFxRate(18.0)}
                      className={`px-1 py-0.5 rounded text-[9px] ${fxRate === 18.0 ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'hover:text-white'}`}
                    >
                      R18.00
                    </button>
                    <button
                      onClick={() => setFxRate(18.5)}
                      className={`px-1 py-0.5 rounded text-[9px] ${fxRate === 18.5 ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'hover:text-white'}`}
                    >
                      R18.50
                    </button>
                    <button
                      onClick={() => setFxRate(19.5)}
                      className={`px-1 py-0.5 rounded text-[9px] ${fxRate === 19.5 ? 'bg-cyan-950 text-cyan-300 border border-cyan-500/40' : 'hover:text-white'}`}
                    >
                      R19.50
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 4 Core KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Total Monthly Cost */}
            <div className="panel p-4 bg-[#0A1324] border border-[rgba(148,163,255,0.14)]">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px]">TOTAL MONTHLY RUNNING COST</span>
                <Server className="w-4 h-4 text-amber-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-[#E9EDF8] mt-1">
                {fmtZar(totalMonthlyCost)}
              </p>
              <p className="text-[11px] text-[#CBD5E1] mt-0.5">
                {fmtZar(totalFixedCosts)} fixed + {fmtZar(totalVariableCosts)} variable
              </p>
            </div>

            {/* Cost Per School */}
            <div className="panel p-4 bg-[#0A1324] border border-[rgba(148,163,255,0.14)]">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px]">BLENDED COST / SCHOOL</span>
                <Layers className="w-4 h-4 text-cyan-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-cyan-300 mt-1">
                {fmtZar(blendedCostPerSchool)}
              </p>
              <p className="text-[11px] text-[#CBD5E1] mt-0.5">
                Variable floor: <span className="text-amber-300 font-mono">{fmtZar(variableFloor)}</span> at scale
              </p>
            </div>

            {/* Gross Monthly Revenue */}
            <div className="panel p-4 bg-[#0A1324] border border-emerald-500/30 bg-emerald-950/10">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px] text-emerald-400">GROSS MONTHLY REVENUE (MRR)</span>
                <DollarSign className="w-4 h-4 text-emerald-400" />
              </div>
              <p className="text-2xl font-bold font-mono text-emerald-400 mt-1">
                {fmtZar(monthlyGrossRevenue)}
              </p>
              <p className="text-[11px] text-[#CBD5E1] mt-0.5">
                {schools} schools × {fmtZar(price)}/mo (ARR: {fmtZar(annualRevenue)})
              </p>
            </div>

            {/* Gross Margin */}
            <div className="panel p-4 bg-[#0A1324] border border-[rgba(148,163,255,0.14)]">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px]">GROSS MARGIN (CONTRIBUTION)</span>
                <PieChart className="w-4 h-4 text-purple-400" />
              </div>
              <p className={`text-2xl font-bold font-mono mt-1 ${getMarginColor(grossMarginPct)}`}>
                {grossMarginPct.toFixed(1)}%
              </p>
              <p className="text-[11px] text-[#CBD5E1] mt-0.5">
                Gross profit: <span className="font-mono text-emerald-300">{fmtZar(grossProfit)}/mo</span>
              </p>
            </div>
          </div>

          {/* 3 Insight Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Break-even */}
            <div className="panel2 p-4 border border-[rgba(148,163,255,0.12)] space-y-1">
              <span className="kick text-[10px]">PORTFOLIO BREAK-EVEN</span>
              <p className={`text-xl font-bold font-mono ${schools >= breakEvenSchools ? 'text-emerald-400' : 'text-amber-300'}`}>
                {isFinite(breakEvenSchools) ? `${breakEvenSchools} ${breakEvenSchools === 1 ? 'school' : 'schools'}` : 'N/A'}
              </p>
              <p className="text-[11px] text-[#CBD5E1]">
                {schools >= breakEvenSchools 
                  ? `✓ Fully profitable at ${schools} schools (+${fmtZar(grossProfit)}/mo net contribution)`
                  : `Need ${breakEvenSchools - schools} more school(s) to cover fixed costs`}
              </p>
            </div>

            {/* Annual Gross Profit */}
            <div className="panel2 p-4 border border-[rgba(148,163,255,0.12)] space-y-1">
              <span className="kick text-[10px]">ANNUALIZED GROSS PROFIT</span>
              <p className={`text-xl font-bold font-mono ${annualGrossProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {fmtZar(annualGrossProfit)} / year
              </p>
              <p className="text-[11px] text-[#CBD5E1]">
                12 × monthly gross profit of {fmtZar(grossProfit)} before staff &amp; SG&amp;A
              </p>
            </div>

            {/* LLM FX Exposure */}
            <div className="panel2 p-4 border border-[rgba(148,163,255,0.12)] space-y-1">
              <span className="kick text-[10px]">ANTHROPIC LLM USD EXPOSURE</span>
              <p className="text-xl font-bold font-mono text-cyan-300">
                ${monthlyLlmUsd.toLocaleString()} USD / mo
              </p>
              <p className="text-[11px] text-[#CBD5E1]">
                Billed directly in USD (~{fmtZar(varLlmTotal)}/mo). Prompt caching saves ~80% on inputs.
              </p>
            </div>
          </div>

          {/* SVG Charts Row */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            {/* Chart 1: Stacked Bar: Cost vs Revenue */}
            <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick text-[10px]">MONTHLY SNAPSHOT</p>
                  <h3 className="text-sm font-bold text-[#E9EDF8]">Cost vs Revenue Stacked Profile</h3>
                </div>
                <span className="chip text-[10px] text-cyan-300 border-cyan-500/30">
                  {fmtZar(monthlyGrossRevenue)} Rev vs {fmtZar(totalMonthlyCost)} Cost
                </span>
              </div>

              <div className="w-full overflow-x-auto py-2">
                <svg viewBox={`0 0 ${c1W} ${c1H}`} className="w-full h-48 select-none">
                  {/* Y Grid lines */}
                  {[0, 0.25, 0.5, 0.75, 1].map((frac, idx) => {
                    const val = frac * chart1Max;
                    const y = yOfVal(val);
                    return (
                      <g key={idx}>
                        <line
                          x1={c1Pad.l}
                          y1={y}
                          x2={c1W - c1Pad.r}
                          y2={y}
                          stroke="#1E293B"
                          strokeDasharray={frac === 0 ? '' : '3,3'}
                          strokeWidth={frac === 0 ? 1.5 : 0.8}
                        />
                        <text
                          x={c1Pad.l - 6}
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {fmtZarK(val)}
                        </text>
                      </g>
                    );
                  })}

                  {/* Cost Bar (Stacked Segments) */}
                  {/* 1. AWS Fixed (Blue) */}
                  <rect
                    x={barCostX - barWidth / 2}
                    y={yAws}
                    width={barWidth}
                    height={hAwsFixed}
                    fill="#2563EB"
                    rx="3"
                  />
                  {/* 2. 3rd Party Fixed (Cyan) */}
                  {h3pFixed > 0 && (
                    <rect
                      x={barCostX - barWidth / 2}
                      y={y3p}
                      width={barWidth}
                      height={h3pFixed}
                      fill="#0891B2"
                      rx="1"
                    />
                  )}
                  {/* 3. Infra Variable (Amber) */}
                  {hInfraVar > 0 && (
                    <rect
                      x={barCostX - barWidth / 2}
                      y={yInfra}
                      width={barWidth}
                      height={hInfraVar}
                      fill="#D97706"
                      rx="1"
                    />
                  )}
                  {/* 4. LLM Variable (Rose) */}
                  {hLlmVar > 0 && (
                    <rect
                      x={barCostX - barWidth / 2}
                      y={yLlm}
                      width={barWidth}
                      height={hLlmVar}
                      fill="#DC2626"
                      rx="3"
                    />
                  )}

                  {/* Cost Top Label */}
                  <text
                    x={barCostX}
                    y={Math.max(totalCostTop - 6, 14)}
                    textAnchor="middle"
                    fill="#E2E8F0"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {fmtZarK(totalMonthlyCost)}
                  </text>

                  {/* Revenue Bar (Emerald) */}
                  <rect
                    x={barRevX - barWidth / 2}
                    y={revTop}
                    width={barWidth}
                    height={hRev}
                    fill="#10B981"
                    rx="3"
                    opacity="0.9"
                  />
                  {/* Revenue Top Label */}
                  <text
                    x={barRevX}
                    y={Math.max(revTop - 6, 14)}
                    textAnchor="middle"
                    fill="#34D399"
                    fontSize="10"
                    fontWeight="700"
                    fontFamily="monospace"
                  >
                    {fmtZarK(monthlyGrossRevenue)}
                  </text>

                  {/* Profit bridge line if profitable */}
                  {grossProfit > 0 && (
                    <g>
                      <line
                        x1={barCostX + barWidth / 2 + 4}
                        y1={totalCostTop}
                        x2={barRevX - barWidth / 2 - 4}
                        y2={revTop}
                        stroke="#A855F7"
                        strokeWidth="1.5"
                        strokeDasharray="4,3"
                      />
                      <text
                        x={(barCostX + barRevX) / 2}
                        y={(totalCostTop + revTop) / 2 - 6}
                        textAnchor="middle"
                        fill="#C084FC"
                        fontSize="9.5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        +{grossMarginPct.toFixed(0)}% Margin
                      </text>
                    </g>
                  )}

                  {/* X Axis Labels */}
                  <text
                    x={barCostX}
                    y={c1H - c1Pad.b + 18}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Total Cost
                  </text>
                  <text
                    x={barRevX}
                    y={c1H - c1Pad.b + 18}
                    textAnchor="middle"
                    fill="#94A3B8"
                    fontSize="10"
                    fontWeight="600"
                  >
                    Revenue ({schools} sch)
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-[rgba(148,163,255,0.1)] text-[11px] text-[#CBD5E1]">
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#2563EB]" />
                  <span>AWS Fixed ({fmtZar(awsFixedZar)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#0891B2]" />
                  <span>3rd-Party ({fmtZar(thirdPartyFixed)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#D97706]" />
                  <span>Infra Var ({fmtZar(varInfraTotal)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#DC2626]" />
                  <span>Claude LLM ({fmtZar(varLlmTotal)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-sm bg-[#10B981]" />
                  <span>Revenue ({fmtZar(monthlyGrossRevenue)})</span>
                </div>
              </div>
            </div>

            {/* Chart 2: Cost Per School vs Scale Curve */}
            <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <p className="kick text-[10px]">ECONOMIES OF SCALE</p>
                  <h3 className="text-sm font-bold text-[#E9EDF8]">Cost Per School vs Scale (1–100 Schools)</h3>
                </div>
                <span className="chip text-[10px] text-emerald-400 border-emerald-500/30 font-mono">
                  Current: {fmtZar(blendedCostPerSchool)} / school
                </span>
              </div>

              <div className="w-full overflow-x-auto py-2">
                <svg viewBox={`0 0 ${c2W} ${c2H}`} className="w-full h-48 select-none">
                  {/* Grid Lines */}
                  {[10, 25, 50, 75, 100].map((n) => {
                    const x = xOfN(n);
                    return (
                      <g key={n}>
                        <line
                          x1={x}
                          y1={c2Pad.t}
                          x2={x}
                          y2={c2H - c2Pad.b}
                          stroke="#1E293B"
                          strokeDasharray="3,3"
                          strokeWidth="0.8"
                        />
                        <text
                          x={x}
                          y={c2H - c2Pad.b + 16}
                          textAnchor="middle"
                          fill="#64748B"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {n}
                        </text>
                      </g>
                    );
                  })}

                  {[0, 1500, 3000, 4500].map((v) => {
                    const y = yOfCps(v);
                    return (
                      <g key={v}>
                        <line
                          x1={c2Pad.l}
                          y1={y}
                          x2={c2W - c2Pad.r}
                          y2={y}
                          stroke="#1E293B"
                          strokeDasharray={v === 0 ? '' : '3,3'}
                          strokeWidth={v === 0 ? 1.5 : 0.8}
                        />
                        <text
                          x={c2Pad.l - 6}
                          y={y + 3.5}
                          textAnchor="end"
                          fill="#64748B"
                          fontSize="9"
                          fontFamily="monospace"
                        >
                          {fmtZarK(v)}
                        </text>
                      </g>
                    );
                  })}

                  {/* User Price Line (Dashed Green) */}
                  {price <= maxCps && (
                    <g>
                      <line
                        x1={c2Pad.l}
                        y1={yOfCps(price)}
                        x2={c2W - c2Pad.r}
                        y2={yOfCps(price)}
                        stroke="#10B981"
                        strokeWidth="1.5"
                        strokeDasharray="5,3"
                      />
                      <text
                        x={c2W - c2Pad.r - 4}
                        y={yOfCps(price) - 4}
                        textAnchor="end"
                        fill="#10B981"
                        fontSize="8.5"
                        fontWeight="700"
                        fontFamily="monospace"
                      >
                        Price: {fmtZar(price)}
                      </text>
                    </g>
                  )}

                  {/* Variable Floor Line (Dashed Amber) */}
                  <g>
                    <line
                      x1={c2Pad.l}
                      y1={yOfCps(variableFloor)}
                      x2={c2W - c2Pad.r}
                      y2={yOfCps(variableFloor)}
                      stroke="#D97706"
                      strokeWidth="1.5"
                      strokeDasharray="4,3"
                    />
                    <text
                      x={c2W - c2Pad.r - 4}
                      y={yOfCps(variableFloor) - 4}
                      textAnchor="end"
                      fill="#D97706"
                      fontSize="8.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      Floor: {fmtZar(variableFloor)}
                    </text>
                  </g>

                  {/* Hyperbolic Curve */}
                  <polyline
                    points={curvePoints}
                    fill="none"
                    stroke="#38BDF8"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />

                  {/* Active Dot Marker */}
                  <g>
                    <circle
                      cx={currentDotX}
                      cy={currentDotY}
                      r="6"
                      fill="#0B132B"
                      stroke="#38BDF8"
                      strokeWidth="2.5"
                    />
                    <circle
                      cx={currentDotX}
                      cy={currentDotY}
                      r="2.5"
                      fill="#38BDF8"
                    />
                    <text
                      x={currentDotX + 8}
                      y={currentDotY > c2Pad.t + 25 ? currentDotY - 8 : currentDotY + 16}
                      textAnchor="start"
                      fill="#F1F5F9"
                      fontSize="9.5"
                      fontWeight="700"
                      fontFamily="monospace"
                    >
                      {fmtZar(blendedCostPerSchool)}
                    </text>
                  </g>

                  {/* X Axis Label */}
                  <text
                    x={c2Pad.l + c2InnerW / 2}
                    y={c2H - 4}
                    textAnchor="middle"
                    fill="#64748B"
                    fontSize="9"
                  >
                    Number of Schools
                  </text>
                </svg>
              </div>

              {/* Legend */}
              <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 pt-2 border-t border-[rgba(148,163,255,0.1)] text-[11px] text-[#CBD5E1]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 bg-[#38BDF8]" />
                  <span>Blended Cost / School Curve</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-[#10B981]" />
                  <span>Subscription Price ({fmtZar(price)})</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-0.5 border-t border-dashed border-[#D97706]" />
                  <span>Variable Cost Floor ({fmtZar(variableFloor)})</span>
                </div>
              </div>
            </div>
          </div>

          {/* Itemized Cost Breakdown Table */}
          <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="kick text-[10px]">DETAILED STATEMENT</p>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Monthly Itemized Cost &amp; Revenue Breakdown</h3>
              </div>
              <span className="text-xs font-mono text-[#CBD5E1]">
                ZAR @ R{fxRate.toFixed(2)}/USD
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#CBD5E1] font-mono text-[10px]">
                    <th className="pb-2">LINE ITEM</th>
                    <th className="pb-2">CLASSIFICATION</th>
                    <th className="pb-2">UNIT BASIS</th>
                    <th className="pb-2 text-right">MONTHLY (ZAR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#CBD5E1]">
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                      AWS Cape Town Fixed Cluster (ECS, RDS, Redis, ALB, NAT, WAF)
                    </td>
                    <td className="py-2.5 text-blue-300 font-mono text-[11px]">Fixed Shared</td>
                    <td className="py-2.5 text-[#CBD5E1]">$350 USD baseline</td>
                    <td className="py-2.5 font-mono text-right text-[#E9EDF8] font-semibold">{fmtZar(awsFixedZar)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
                      Primary Domain Name (.co.za)
                    </td>
                    <td className="py-2.5 text-cyan-300 font-mono text-[11px]">Fixed Shared</td>
                    <td className="py-2.5 text-[#CBD5E1]">Annual amortized</td>
                    <td className="py-2.5 font-mono text-right text-[#E9EDF8]">{fmtZar(DOMAIN_ZAR)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
                      Sentry Team (Distributed Error Tracking)
                    </td>
                    <td className="py-2.5 text-cyan-300 font-mono text-[11px]">Fixed Shared</td>
                    <td className="py-2.5 text-[#CBD5E1]">$26 USD / month</td>
                    <td className="py-2.5 font-mono text-right text-[#E9EDF8]">{fmtZar(SENTRY_ZAR)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
                      BetterStack (Uptime &amp; Synthetic Monitoring)
                    </td>
                    <td className="py-2.5 text-cyan-300 font-mono text-[11px]">Fixed Shared</td>
                    <td className="py-2.5 text-[#CBD5E1]">$20 USD / month</td>
                    <td className="py-2.5 font-mono text-right text-[#E9EDF8]">{fmtZar(UPTIME_ZAR)}</td>
                  </tr>
                  {emailService === 'postmark' && (
                    <tr>
                      <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
                        Postmark (Dedicated Transactional Email Delivery)
                      </td>
                      <td className="py-2.5 text-cyan-300 font-mono text-[11px]">Fixed Shared</td>
                      <td className="py-2.5 text-[#CBD5E1]">$15 USD / month</td>
                      <td className="py-2.5 font-mono text-right text-[#E9EDF8]">{fmtZar(POSTMARK_ZAR)}</td>
                    </tr>
                  )}
                  {/* Fixed Subtotal Row */}
                  <tr className="bg-[#0D1933] font-semibold text-[#E9EDF8]">
                    <td colSpan={3} className="py-2.5 pl-3 font-mono text-[11px] text-cyan-300">
                      FIXED RUNNING COSTS SUBTOTAL
                    </td>
                    <td className="py-2.5 font-mono text-right text-cyan-300 text-sm">
                      {fmtZar(totalFixedCosts)}
                    </td>
                  </tr>

                  {/* Variable Rows */}
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#D97706]" />
                      AWS Marginal Storage &amp; Data Transfer ({schools} schools)
                    </td>
                    <td className="py-2.5 text-amber-400 font-mono text-[11px]">Variable</td>
                    <td className="py-2.5 text-[#CBD5E1]">{fmtZar(perInfraZar)} / school ({schools}×)</td>
                    <td className="py-2.5 font-mono text-right text-amber-300">{fmtZar(varInfraTotal)}</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-medium text-[#E9EDF8] flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-[#DC2626]" />
                      Anthropic Claude API (Sonnet 4.6 with prompt cache, {schools} schools)
                    </td>
                    <td className="py-2.5 text-rose-400 font-mono text-[11px]">Variable</td>
                    <td className="py-2.5 text-[#CBD5E1]">{fmtZar(perLlmZar)} / school ({schools}×)</td>
                    <td className="py-2.5 font-mono text-right text-rose-300">{fmtZar(varLlmTotal)}</td>
                  </tr>

                  {/* Total Cost Row */}
                  <tr className="border-t-2 border-[rgba(148,163,255,0.2)] bg-[#070D1E] font-bold text-[#E9EDF8]">
                    <td colSpan={3} className="py-3 pl-3 font-mono text-xs">
                      TOTAL MONTHLY RUNNING EXPENDITURE (COGS)
                    </td>
                    <td className="py-3 font-mono text-right text-amber-400 text-sm">
                      {fmtZar(totalMonthlyCost)}
                    </td>
                  </tr>

                  {/* Gross Revenue Row */}
                  <tr className="bg-emerald-950/20 font-bold text-emerald-400">
                    <td colSpan={3} className="py-3 pl-3 font-mono text-xs">
                      GROSS MONTHLY SUBSCRIPTION REVENUE ({schools} Schools @ {fmtZar(price)}/mo)
                    </td>
                    <td className="py-3 font-mono text-right text-emerald-400 text-sm">
                      {fmtZar(monthlyGrossRevenue)}
                    </td>
                  </tr>

                  {/* Gross Profit / Contribution Row */}
                  <tr className="bg-[#0B1528] font-bold">
                    <td colSpan={3} className={`py-3 pl-3 font-mono text-xs ${getMarginColor(grossMarginPct)}`}>
                      NET MONTHLY GROSS PROFIT (CONTRIBUTION MARGIN)
                    </td>
                    <td className={`py-3 font-mono text-right text-base ${getMarginColor(grossMarginPct)}`}>
                      {fmtZar(grossProfit)}{' '}
                      <span className="text-xs font-normal opacity-80">({grossMarginPct.toFixed(1)}%)</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Gross Margin Sensitivity Matrix Table */}
          <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="kick text-[10px]">SENSITIVITY ANALYSIS</p>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Gross Margin Sensitivity Matrix (Price × School Volume)</h3>
              </div>
              <span className="text-[11px] text-[#CBD5E1]">
                Active cell outlined in cyan
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr className="bg-[#0E1B38] text-[#CBD5E1] font-mono text-[10px]">
                    <th className="py-2.5 px-3 text-left">↓ PRICE / SCHOOLS →</th>
                    {matrixSchools.map((n) => (
                      <th key={n} className="py-2.5 px-3">
                        {n} SCHOOLS
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(148,163,255,0.08)]">
                  {matrixPrices.map((p) => (
                    <tr key={p} className="hover:bg-[#0E1A33]/40 transition-colors">
                      <td className="py-2.5 px-3 text-left font-mono font-bold text-[#E9EDF8] bg-[#0A1428]">
                        {fmtZar(p)}/mo
                      </td>
                      {matrixSchools.map((n) => {
                        const mRev = n * p;
                        const mCost = totalFixedCosts + n * variableFloor;
                        const mProfit = mRev - mCost;
                        const mPct = mRev > 0 ? (mProfit / mRev) * 100 : 0;
                        const isCurrent = n === schools && p === price;

                        return (
                          <td
                            key={n}
                            style={{ background: getMarginBg(mPct) }}
                            className={`py-2.5 px-3 font-mono font-bold transition-all ${getMarginColor(mPct)} ${
                              isCurrent ? 'ring-2 ring-cyan-400 ring-inset rounded font-black' : ''
                            }`}
                          >
                            {mPct.toFixed(0)}%
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Model Assumptions Grid */}
          <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-3">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-cyan-400" />
              <p className="kick text-[10px]">UNDERLYING FINANCIAL &amp; INFRASTRUCTURE ASSUMPTIONS</p>
            </div>

            <div className="grid md:grid-cols-2 gap-x-8 gap-y-2 text-xs">
              <div className="space-y-1.5 divide-y divide-[rgba(148,163,255,0.06)]">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Exchange Rate (Planning):</span>
                  <strong className="text-[#E9EDF8] font-mono">R{fxRate.toFixed(2)} / $1.00 USD (SARB Reference)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">AWS Region &amp; Data Sovereignty:</span>
                  <strong className="text-cyan-300 font-mono">af-south-1 (Cape Town) · POPIA In-Region</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Standard School Sizing:</span>
                  <strong className="text-[#E9EDF8]">~500 learners, ~35 teachers/SMT (DoE medium)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">LLM Model &amp; Gateway:</span>
                  <strong className="text-[#E9EDF8]">Claude Sonnet 4.6 + L2 5-min prompt cache</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Cache Hit Rate Assumed:</span>
                  <strong className="text-emerald-400 font-mono">~80% on CAPS system prompts &amp; rubrics</strong>
                </div>
              </div>

              <div className="space-y-1.5 divide-y divide-[rgba(148,163,255,0.06)]">
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">AWS Shared Baseline (Fixed):</span>
                  <strong className="text-[#E9EDF8] font-mono">{fmtZar(awsFixedZar)}/mo ($350 USD)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">AWS Marginal Storage / School:</span>
                  <strong className="text-[#E9EDF8] font-mono">{fmtZar(perInfraZar)}/mo ($13 USD)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Anthropic API Cost / School:</span>
                  <strong className="text-[#E9EDF8] font-mono">{fmtZar(perLlmZar)}/mo ($45 USD cached)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Monitoring (Sentry + BetterStack):</span>
                  <strong className="text-[#E9EDF8] font-mono">{fmtZar(SENTRY_ZAR + UPTIME_ZAR)}/mo ($46 USD)</strong>
                </div>
                <div className="flex justify-between py-1.5">
                  <span className="text-[#CBD5E1]">Excluded from Gross COGS:</span>
                  <strong className="text-[#CBD5E1] italic">Staff salaries, corporate tax, VAT, SG&amp;A</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AWS Infrastructure Tab Content */}
      {activeSubTab === 'aws' && (
        <div className="space-y-6">
          {/* AWS Overview Top Banner */}
          <div className="panel p-5 bg-[#091222] border border-amber-500/30 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-5 h-5 text-amber-400" />
                <span className="kick text-[11px] text-amber-300">AWS SERVICES &amp; PER-SCHOOL WORKLOAD SPECIFICATION</span>
              </div>
              <span className="chip font-mono text-[10px] text-[#CBD5E1]">
                DOC ID: IAI-INFRA-2026-001
              </span>
            </div>
            <p className="text-xs text-[#CBD5E1] leading-relaxed max-w-3xl">
              Multi-tenant SaaS deployment in <strong>af-south-1 (Cape Town)</strong> ensuring full POPIA in-region compliance. 
              One shared container cluster, one RDS PostgreSQL instance with Row-Level Security (RLS), and one ElastiCache cluster.
              Costs split into a <strong className="text-cyan-300">shared baseline (fixed)</strong> and <strong className="text-amber-300">marginal per-school growth</strong>.
            </p>
          </div>

          {/* 3 Workload Tiers Overview */}
          <div className="panel p-5 bg-[#091222] border border-[rgba(148,163,255,0.14)] space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="kick text-[10px]">DOe NORMS MODELING</p>
                <h3 className="text-sm font-bold text-[#E9EDF8]">Per-School Annual Workload &amp; Resource Consumption</h3>
              </div>
              <span className="text-xs text-[#CBD5E1] font-mono">
                Full 5-Module Deployment
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[rgba(148,163,255,0.12)] text-[#CBD5E1] font-mono text-[10px]">
                    <th className="pb-2">METRIC</th>
                    <th className="pb-2 text-center text-emerald-400">SMALL (~200 LEARNERS)</th>
                    <th className="pb-2 text-center text-cyan-300">MEDIUM (~500 LEARNERS)</th>
                    <th className="pb-2 text-center text-rose-400">LARGE (~800 LEARNERS)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[rgba(148,163,255,0.06)] text-[#CBD5E1] font-mono">
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">Active Staff Users</td>
                    <td className="py-2.5 text-center">~15</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">~35</td>
                    <td className="py-2.5 text-center">~55</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">Peak Concurrent Sessions</td>
                    <td className="py-2.5 text-center">5 – 8</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">12 – 18</td>
                    <td className="py-2.5 text-center">20 – 32</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">RDS PostgreSQL Storage Growth / Year</td>
                    <td className="py-2.5 text-center">1 – 2 GB</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">3 – 5 GB</td>
                    <td className="py-2.5 text-center">5 – 10 GB</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">pgvector Embeddings / Year (Brain Memory)</td>
                    <td className="py-2.5 text-center">~2,000</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">~5,000</td>
                    <td className="py-2.5 text-center">~8,000</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">S3 Document Uploads &amp; Archives / Year</td>
                    <td className="py-2.5 text-center">0.5 – 1 GB</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">1 – 3 GB</td>
                    <td className="py-2.5 text-center">3 – 6 GB</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">LLM API Calls / Year (Curriculum + SIAS)</td>
                    <td className="py-2.5 text-center">~30,000</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">~75,000</td>
                    <td className="py-2.5 text-center">~120,000</td>
                  </tr>
                  <tr>
                    <td className="py-2.5 font-sans font-medium text-[#E9EDF8]">Prompt-Cached Input Tokens / Year</td>
                    <td className="py-2.5 text-center">~36 MTok (80%)</td>
                    <td className="py-2.5 text-center text-cyan-300 font-bold">~90 MTok (80%)</td>
                    <td className="py-2.5 text-center">~144 MTok (80%)</td>
                  </tr>
                  <tr className="bg-[#0B1528] font-bold">
                    <td className="py-2.5 font-sans text-amber-300">Estimated LLM API Cost / Month (ZAR)</td>
                    <td className="py-2.5 text-center text-emerald-400">~R333 / mo</td>
                    <td className="py-2.5 text-center text-cyan-300 text-sm">~R833 / mo</td>
                    <td className="py-2.5 text-center text-rose-400">~R1,350 / mo</td>
                  </tr>
                  <tr className="bg-[#08101E] font-bold">
                    <td className="py-2.5 font-sans text-[#E9EDF8]">AWS Marginal Infra Cost / Month (ZAR)</td>
                    <td className="py-2.5 text-center text-emerald-400">~R148 / mo</td>
                    <td className="py-2.5 text-center text-cyan-300 text-sm">~R241 / mo</td>
                    <td className="py-2.5 text-center text-rose-400">~R333 / mo</td>
                  </tr>
                  <tr className="bg-[#0F1E38] font-black border-t-2 border-cyan-500/40">
                    <td className="py-2.5 font-sans text-cyan-300">Total Variable Floor / School / Month</td>
                    <td className="py-2.5 text-center text-emerald-400">~R481 / mo</td>
                    <td className="py-2.5 text-center text-cyan-300 text-base">~R1,074 / mo</td>
                    <td className="py-2.5 text-center text-rose-400">~R1,683 / mo</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Service Architecture Catalog by Layer */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Compute Layer */}
            <div className="panel p-4 bg-[#091222] border border-[rgba(148,163,255,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px] text-blue-400">L8 + L6 + L7 · COMPUTE</span>
                <span className="chip text-[9px] text-cyan-300 border-cyan-500/30">SHARED BASELINE</span>
              </div>
              <h4 className="font-bold text-xs text-[#E9EDF8]">ECS Fargate (Web, Gateway &amp; Workers)</h4>
              <p className="text-[11px] text-[#CBD5E1]">
                Next.js 16 App Router UI (2 tasks HA), Model Gateway proxy (2 tasks HA), and asynchronous queue worker (1 task). Sized at 0.5 vCPU, 1 GB RAM per task.
              </p>
              <div className="text-[10px] font-mono text-cyan-300 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
                <span>Monthly Allocation:</span>
                <span>~$140 USD (R2,590 ZAR)</span>
              </div>
            </div>

            {/* Data Plane */}
            <div className="panel p-4 bg-[#091222] border border-[rgba(148,163,255,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px] text-emerald-400">L3 · DATA PLANE</span>
                <span className="chip text-[9px] text-amber-300 border-amber-500/30">SHARED + MARGINAL</span>
              </div>
              <h4 className="font-bold text-xs text-[#E9EDF8]">RDS PostgreSQL 16 + pgvector</h4>
              <p className="text-[11px] text-[#CBD5E1]">
                Tenant-isolated data plane with strict Row Level Security (RLS). Holds learner tokens, consent ledgers, SIAS cases, and 1536-dim vector embeddings for Brain L2.
              </p>
              <div className="text-[10px] font-mono text-emerald-400 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
                <span>Monthly Base:</span>
                <span>~$120 USD (R2,220 ZAR) + storage</span>
              </div>
            </div>

            {/* Cache Layer */}
            <div className="panel p-4 bg-[#091222] border border-[rgba(148,163,255,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px] text-purple-400">L3 · CACHE</span>
                <span className="chip text-[9px] text-cyan-300 border-cyan-500/30">SHARED BASELINE</span>
              </div>
              <h4 className="font-bold text-xs text-[#E9EDF8]">ElastiCache for Redis 7</h4>
              <p className="text-[11px] text-[#CBD5E1]">
                In-memory session state, rate-limiting tokens, school context lookups, and Brain L4 hot-tier cache. Keyed strictly by tenant slug.
              </p>
              <div className="text-[10px] font-mono text-purple-300 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
                <span>Monthly Allocation:</span>
                <span>~$11.50 USD (R213 ZAR)</span>
              </div>
            </div>

            {/* Security & Secrets */}
            <div className="panel p-4 bg-[#091222] border border-[rgba(148,163,255,0.12)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="kick text-[10px] text-rose-400">L5 + L2 · SECURITY</span>
                <span className="chip text-[9px] text-cyan-300 border-cyan-500/30">SHARED BASELINE</span>
              </div>
              <h4 className="font-bold text-xs text-[#E9EDF8]">Secrets Manager, KMS &amp; AWS WAF</h4>
              <p className="text-[11px] text-[#CBD5E1]">
                Customer Managed Keys (CMK) for envelope encryption on RDS/S3 (POPIA data-at-rest obligation). Web Application Firewall on ALB protecting against OWASP Top 10.
              </p>
              <div className="text-[10px] font-mono text-rose-300 pt-1 border-t border-[rgba(148,163,255,0.08)] flex justify-between">
                <span>Monthly Allocation:</span>
                <span>~$24.30 USD (R450 ZAR)</span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
