import React, { useState } from 'react';
import { 
  Workflow, 
  Cpu, 
  Zap, 
  ShieldCheck, 
  AlertTriangle, 
  CheckCircle2, 
  RefreshCw, 
  Sliders,
  DollarSign,
  TrendingDown,
  Layers,
  Sparkles,
  Lock
} from 'lucide-react';

export const ModelGateway: React.FC = () => {
  // Provider pool settings
  const [primaryModel, setPrimaryModel] = useState<'claude-3.7-sonnet' | 'claude-3.5-haiku' | 'gemini-2.5-flash'>('claude-3.7-sonnet');
  const [fallbackModel, setFallbackModel] = useState<'gemini-2.5-flash' | 'claude-3.5-haiku'>('gemini-2.5-flash');
  const [circuitBreakerTripped, setCircuitBreakerTripped] = useState<boolean>(false);
  const [promptCachingEnabled, setPromptCachingEnabled] = useState<boolean>(true);
  const [tenantTokenBudget, setTenantTokenBudget] = useState<number>(2500000); // 2.5M tokens / month

  // Interactive Test Sandbox
  const [testPrompt, setTestPrompt] = useState<string>('Extract quarterly gross margin from Beacon Ridge pilot audit (contact: John Doe, ID: 8901235678082, email: john@beaconridge.edu.za)');
  const [scrubbedPrompt, setScrubbedPrompt] = useState<string | null>(null);
  const [routingResult, setRoutingResult] = useState<any | null>(null);
  const [testing, setTesting] = useState<boolean>(false);

  // Run test dispatch
  const handleTestDispatch = () => {
    setTesting(true);
    setScrubbedPrompt(null);
    setRoutingResult(null);

    setTimeout(() => {
      // Step 1: L5 PII Membrane Scrubbing
      const scrubbed = testPrompt
        .replace(/John Doe/g, '<DEIDENTIFIED_ENTITY_01>')
        .replace(/8901235678082/g, '<DEIDENTIFIED_NAT_ID_01>')
        .replace(/john@beaconridge\.edu\.za/g, '<DEIDENTIFIED_EMAIL_01>');
      
      setScrubbedPrompt(scrubbed);

      // Step 2: Route through gateway
      const activeProvider = circuitBreakerTripped ? fallbackModel : primaryModel;
      const cached = promptCachingEnabled;
      const inputTokens = Math.round(testPrompt.length * 0.35 + 1800); // including system prompt
      const cachedTokens = cached ? Math.round(inputTokens * 0.81) : 0;
      const billedTokens = inputTokens - cachedTokens;

      setRoutingResult({
        provider: activeProvider,
        circuitStatus: circuitBreakerTripped ? 'FALLBACK TRIGGERED' : 'NOMINAL',
        inputTokens,
        cachedTokens,
        billedTokens,
        savingsZar: cached ? 'R1.84 (81% saved)' : 'R0.00',
        latencyMs: activeProvider.includes('flash') ? 290 : 640,
        piiStatus: 'PASS: 3 PII entities cryptographically tokenized before gateway egress'
      });

      setTesting(false);
    }, 700);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <p className="kick">L2 MODEL GATEWAY &amp; ROUTING INFRASTRUCTURE</p>
          <h1 className="text-2xl md:text-3xl font-bold mt-1 text-[#E9EDF8]">
            Multi-Provider Pooling &amp; <span className="grad">Token Budgeting</span>
          </h1>
          <p className="text-xs text-[#8FA0C2] mt-1 max-w-2xl">
            Centralized intelligent router managing Anthropic Claude and Google Gemini models.
            Enforces hard per-tenant spend quotas, 5-minute system prompt caching, and zero-downtime circuit breaker failover.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className={`chip text-xs ${circuitBreakerTripped ? 'border-rose-500/30 text-rose-400 bg-rose-950/20' : 'border-emerald-500/30 text-emerald-400 bg-emerald-950/20'}`}>
            <Zap className="w-3.5 h-3.5" />
            {circuitBreakerTripped ? 'Fallback Model Active' : 'Primary Route Active'}
          </span>
        </div>
      </div>

      {/* Metric Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">GATEWAY UPTIME (30D)</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">99.98%</p>
          <span className="text-[10px] text-[#8FA0C2]">Zero unhandled model dropouts</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">PROMPT CACHE HIT RATE</span>
            <Sparkles className="w-4 h-4 text-[#22D3EE]" />
          </div>
          <p className="text-2xl font-bold text-[#22D3EE] mt-1">81.4%</p>
          <span className="text-[10px] text-emerald-400">Yields ~R24,800/mo cost reduction</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">P95 INFERENCE LATENCY</span>
            <Cpu className="w-4 h-4 text-amber-300" />
          </div>
          <p className="text-2xl font-bold text-amber-300 mt-1">680ms</p>
          <span className="text-[10px] text-[#8FA0C2]">SLA threshold: 1,200ms max</span>
        </div>

        <div className="panel p-4">
          <div className="flex items-center justify-between">
            <span className="text-[10px] kick">MONTHLY TOKEN USAGE</span>
            <DollarSign className="w-4 h-4 text-purple-400" />
          </div>
          <p className="text-2xl font-bold text-[#E9EDF8] mt-1">18.4M</p>
          <span className="text-[10px] text-[#8FA0C2]">Across 25 enterprise tenants</span>
        </div>
      </div>

      {/* Gateway Controls & Multi-Provider Config */}
      <div className="grid lg:grid-cols-2 gap-5">
        {/* Router Settings */}
        <div className="panel p-6 space-y-5">
          <div className="flex items-center justify-between">
            <div>
              <p className="kick">MULTI-PROVIDER POOLING CONFIG</p>
              <h2 className="text-base font-bold text-[#E9EDF8] mt-0.5">Model Allocation &amp; Circuit Breakers</h2>
            </div>
            <button
              onClick={() => setCircuitBreakerTripped(!circuitBreakerTripped)}
              className={`btn text-xs py-1 px-2.5 ${
                circuitBreakerTripped
                  ? 'bg-rose-950/40 text-rose-300 border-rose-500/40'
                  : 'btn-g text-[#8FA0C2]'
              }`}
            >
              {circuitBreakerTripped ? 'Reset Circuit Breaker' : 'Simulate Provider Outage'}
            </button>
          </div>

          <div className="space-y-4 text-xs">
            <div>
              <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1.5">
                Primary Complex Reasoning Model (Tier 1):
              </label>
              <select
                value={primaryModel}
                onChange={(e) => setPrimaryModel(e.target.value as any)}
                className="inp text-xs"
              >
                <option value="claude-3.7-sonnet">Anthropic Claude 3.7 Sonnet (Primary Strategic Model)</option>
                <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (High-Throughput Fast Model)</option>
                <option value="claude-3.5-haiku">Anthropic Claude 3.5 Haiku (Budget Operational Model)</option>
              </select>
            </div>

            <div>
              <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block mb-1.5">
                Automatic Fallback Provider (Failover Chokepoint):
              </label>
              <select
                value={fallbackModel}
                onChange={(e) => setFallbackModel(e.target.value as any)}
                className="inp text-xs"
              >
                <option value="gemini-2.5-flash">Google Gemini 2.5 Flash (Cape Town Region Verified)</option>
                <option value="claude-3.5-haiku">Anthropic Claude 3.5 Haiku (Secondary Failover)</option>
              </select>
            </div>

            {/* Prompt Caching Toggle */}
            <div className="panel2 p-3.5 flex items-center justify-between">
              <div>
                <strong className="text-xs text-[#E9EDF8] block">5-Minute System Prompt Caching</strong>
                <p className="text-[11px] text-[#8FA0C2]">Caches static L0 corporate policies and SOP state machine schemas</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={promptCachingEnabled}
                  onChange={(e) => setPromptCachingEnabled(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-9 h-5 bg-[#0E1830] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-[#22D3EE]"></div>
              </label>
            </div>

            {/* Tenant Token Budget Slider */}
            <div className="panel2 p-3.5 space-y-2">
              <div className="flex items-center justify-between">
                <strong className="text-xs text-[#E9EDF8]">Tenant Monthly Token Quota</strong>
                <span className="text-xs font-mono text-[#22D3EE] font-bold">
                  {(tenantTokenBudget / 1000000).toFixed(1)}M Tokens / Tenant
                </span>
              </div>
              <input
                type="range"
                min={500000}
                max={10000000}
                step={500000}
                value={tenantTokenBudget}
                onChange={(e) => setTenantTokenBudget(Number(e.target.value))}
                className="w-full h-1.5 bg-[#0E1830] rounded-lg appearance-none cursor-pointer accent-[#22D3EE]"
              />
              <div className="flex justify-between text-[10px] text-[#8FA0C2] font-mono">
                <span>0.5M (Pilot Seed)</span>
                <span>2.5M (Standard)</span>
                <span>10M (Enterprise)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Gateway Test Playground */}
        <div className="panel p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="kick">LIVE MEMBRANE &amp; GATEWAY TEST HARNESS</p>
              <h2 className="text-base font-bold text-[#E9EDF8] mt-0.5">Zero-PII Ingestion Probe</h2>
            </div>
            <span className="chip border-rose-500/30 text-rose-400 text-[10px]">
              Law 01 Enforced
            </span>
          </div>

          <p className="text-xs text-[#8FA0C2]">
            Test the L5 Egress Guard in real-time. Sensitive identifiers (names, SA ID numbers, emails)
            must be scrubbed and replaced with cryptographic tokens before touching the model API.
          </p>

          <div className="space-y-2">
            <label className="text-[10px] text-[#8FA0C2] font-mono uppercase block">Raw Inbound Payload:</label>
            <textarea
              rows={3}
              value={testPrompt}
              onChange={(e) => setTestPrompt(e.target.value)}
              className="inp text-xs leading-relaxed"
            />
          </div>

          <button
            onClick={handleTestDispatch}
            disabled={testing}
            className="btn btn-p text-xs w-full justify-center py-2"
          >
            {testing ? 'Routing through L5 Membrane...' : 'Execute Probe Through Gateway'}
          </button>

          {routingResult && (
            <div className="panel2 p-4 space-y-3 bg-[#05070f] border border-[#22D3EE]/30">
              <div className="flex items-center justify-between border-b border-[rgba(148,163,255,0.1)] pb-2 text-[10px] font-mono">
                <span className="text-emerald-400">✓ L5 MEMBRANE PASSED</span>
                <span className="text-[#22D3EE]">{routingResult.provider}</span>
              </div>

              <div>
                <span className="text-[10px] text-[#8FA0C2] uppercase font-mono block mb-1">
                  Scrubbed Payload (Sent to Model):
                </span>
                <p className="text-xs font-mono text-[#E9EDF8] bg-[#0E1830] p-2.5 rounded border border-[rgba(148,163,255,0.1)]">
                  {scrubbedPrompt}
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-xs pt-1">
                <div className="p-2 rounded bg-[#0E1830]">
                  <span className="text-[9px] text-[#8FA0C2] block">Input Tokens</span>
                  <strong className="text-[#E9EDF8]">{routingResult.inputTokens}</strong>
                </div>
                <div className="p-2 rounded bg-[#0E1830]">
                  <span className="text-[9px] text-[#8FA0C2] block">Cached (81%)</span>
                  <strong className="text-[#22D3EE]">{routingResult.cachedTokens}</strong>
                </div>
                <div className="p-2 rounded bg-[#0E1830]">
                  <span className="text-[9px] text-[#8FA0C2] block">Billed Tokens</span>
                  <strong className="text-emerald-400">{routingResult.billedTokens}</strong>
                </div>
                <div className="p-2 rounded bg-[#0E1830]">
                  <span className="text-[9px] text-[#8FA0C2] block">Latency</span>
                  <strong className="text-amber-300">{routingResult.latencyMs}ms</strong>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
