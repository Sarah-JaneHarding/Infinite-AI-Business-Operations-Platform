import React, { useState } from 'react';
import { DynamicCostCalculator } from './DynamicCostCalculator';

export const AWS_SERVICE_CATALOG = [
  {
    layer: 'L8/L6',
    service: 'ECS Fargate (Web & Workers)',
    purpose: 'Containerized Next.js UI, model gateway, and background worker queues',
    sizing: '0.5 vCPU · 1 GB RAM × 5 tasks',
    model: 'Per vCPU/GB-hour',
    monthlyZar: 2590,
    monthlyUsd: 140,
    type: 'Shared'
  },
  {
    layer: 'L3',
    service: 'RDS PostgreSQL 16 + pgvector',
    purpose: 'Tenant-isolated database with RLS, audit ledgers, and 1536-dim memory embeddings',
    sizing: 'db.t4g.medium (2 vCPU · 4 GB)',
    model: 'Instance hour + storage',
    monthlyZar: 2220,
    monthlyUsd: 120,
    type: 'Shared'
  },
  {
    layer: 'L3',
    service: 'ElastiCache Redis 7',
    purpose: 'High-speed session cache, tenant rate-limiting counters, hot Brain memory cache',
    sizing: 'cache.t4g.micro (0.5 GB)',
    model: 'Node hour',
    monthlyZar: 213,
    monthlyUsd: 11.5,
    type: 'Shared'
  },
  {
    layer: 'L3/L8',
    service: 'S3 + CloudFront CDN',
    purpose: 'Document asset uploads, Brain long-term snapshots, static web edge delivery in SA',
    sizing: 'S3 Standard-IA + Edge POP',
    model: 'Per GB stored & transferred',
    monthlyZar: 444,
    monthlyUsd: 24,
    type: 'Variable'
  },
  {
    layer: 'L6',
    service: 'SQS Standard Queue + ALB',
    purpose: 'Worker task queue for ingestion, de-ident, reports; Application Load Balancer with TLS',
    sizing: '1 ALB + multi-queues',
    model: 'Per LCU-hour & request volume',
    monthlyZar: 555,
    monthlyUsd: 30,
    type: 'Shared'
  },
  {
    layer: 'L5/L2',
    service: 'Secrets Manager, KMS & WAF',
    purpose: 'Envelope encryption for POPIA compliance; Web Application Firewall on ALB',
    sizing: '12 secrets + 3 CMKs + WAF rules',
    model: 'Per secret/key & rule requests',
    monthlyZar: 450,
    monthlyUsd: 24.3,
    type: 'Shared'
  },
  {
    layer: 'L0',
    service: 'VPC, Route 53 & NAT Gateway',
    purpose: 'Private subnets for compute & DB; outbound NAT Gateway for LLM API requests',
    sizing: '2 AZs + 1 NAT Gateway',
    model: 'Per NAT hour + data processed',
    monthlyZar: 620,
    monthlyUsd: 33.5,
    type: 'Shared'
  }
];
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
          <p className="text-xs text-[#CBD5E1] mt-1 max-w-2xl">
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
                : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
            }`}
          >
            ZAR (R)
          </button>
          <button
            onClick={() => setCurrency('USD')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              currency === 'USD'
                ? 'bg-[#13203C] text-[#22D3EE] border border-[#22D3EE]/40'
                : 'text-[#CBD5E1] hover:text-[#E9EDF8]'
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
            <span className="text-xs font-normal text-[#CBD5E1]"> / mo</span>
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
          <span className="text-[10px] text-[#CBD5E1]">Unit cost R1,368 vs R4k revenue</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">PORTFOLIO BREAK-EVEN</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-emerald-400 mt-1">3 Schools</p>
          <span className="text-[10px] text-[#CBD5E1]">R2,926/mo unit contribution</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">FIXED CLOUD BASELINE (AWS)</span>
            <Server className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">
            {currency === 'USD' ? `$${totalFixedAwsUsd}` : `R${totalFixedAwsZar.toLocaleString()}`}
          </p>
          <span className="text-[10px] text-[#CBD5E1]">Monthly af-south-1 Cape Town</span>
        </div>
      </div>

      {/* Dynamic Cost & Revenue Calculator Component */}
      <DynamicCostCalculator initialSchools={25} initialPrice={4000} />
    </div>
  );
};
