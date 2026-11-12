import { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Wrench, Shield, CheckCircle, Calculator, Database, Search, ArrowRight, Sparkles, Terminal } from 'lucide-react';
import { apiFetch } from '../core/api';

interface ToolInvocation {
  name: string;
  args: Record<string, unknown>;
  result: Record<string, unknown>;
}

interface Message {
  id: string;
  role: 'user' | 'model';
  text: string;
  toolInvocations?: ToolInvocation[];
  timestamp: string;
}

export function AICopilot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-1',
      role: 'model',
      text: `### Welcome to the Infinite-AI Operations Copilot
I am your generative AI assistant equipped with direct operational tool usage across the Infinite-AI platform.
I can analyze South African primary school unit economics, query the live data warehouse, audit POPIA Section 72 and learner data compliance, and inspect any of our 48 specialist agents.

Try asking a question or click one of the quick prompts below!`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'chat' | 'tools'>('chat');
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, busy]);

  const sendMessage = async (textToSend?: string) => {
    const query = (textToSend ?? input).trim();
    if (!query || busy) return;

    const userMsg: Message = {
      id: `u-${Date.now()}`,
      role: 'user',
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setBusy(true);
    setError(null);

    try {
      const history = messages
        .filter((m) => m.id !== 'init-1')
        .map((m) => ({ role: m.role, text: m.text }));

      const res = await apiFetch('/api/ai/copilot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: query, history })
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      const botMsg: Message = {
        id: `m-${Date.now()}`,
        role: 'model',
        text: data.text,
        toolInvocations: data.toolInvocations,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const samplePrompts = [
    { label: 'School Unit Economics', query: 'Calculate the unit economics and gross margins for 15 primary schools at R4,000/month.' },
    { label: 'Data Warehouse Audit', query: 'Query the data warehouse for audit ledger entries and verify tamper-evidence.' },
    { label: 'POPIA & PII Compliance', query: 'Audit this student transfer memo for POPIA Section 72 and learner PII compliance.' },
    { label: 'Agent Inspection', query: 'Inspect OPS-FIN-01 and show me its required inputs and approval framework.' }
  ];

  const toolsCatalog = [
    {
      name: 'calculate_school_unit_economics',
      icon: <Calculator size={16} className="text-emerald-700" />,
      desc: 'Computes South African primary school unit economics, gross margins, AWS Cape Town infrastructure hosting, and LLM inference token costs at R4,000/mo baseline.',
      params: 'activeSchools: number, monthlyFeeZar?: number, llmTokensPerSchoolPerMonth?: number, serverCostPerMonthZar?: number'
    },
    {
      name: 'query_data_warehouse',
      icon: <Database size={16} className="text-indigo-700" />,
      desc: 'Query contracts, schools, policies, documents, or audit ledger records from the append-only storage warehouse.',
      params: 'collection: "contracts" | "schools" | "policies" | "documents" | "ledger" | "all", query?: string, limit?: number'
    },
    {
      name: 'audit_compliance_and_guardrails',
      icon: <Shield size={16} className="text-violet-700" />,
      desc: 'Audits text and inputs against POPIA Section 72 cross-border data transfer rules, South African 13-digit ID numbers, learner PII, and SIAS MTSS tier safeguards.',
      params: 'content: string, checkPopiaSection72?: boolean, checkStudentPii?: boolean, checkSiasTierSafeguards?: boolean'
    },
    {
      name: 'inspect_department_agent',
      icon: <Search size={16} className="text-amber-700" />,
      desc: 'Inspects any specialist agent contract across the 16 Infinite-AI departments (purpose, inputs, formats, approvers, framework).',
      params: 'agentId: string (e.g. OPS-EXEC-01, OPS-FIN-01)'
    },
    {
      name: 'generate_task_recommendations',
      icon: <Sparkles size={16} className="text-pink-700" />,
      desc: 'Generates strategic suggestions, recommended input presets, risk safeguards, and next-step checklists for any agent task.',
      params: 'agentId: string, contextSummary?: string'
    }
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] max-w-5xl mx-auto rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between border-b border-slate-200 bg-slate-50/90 px-4 py-3">
        <div className="flex items-center gap-2.5">
          <div className="rounded-lg bg-violet-600 p-1.5 text-white shadow-xs">
            <Sparkles size={18} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-slate-900">Operations Copilot</h2>
              <span className="mono rounded bg-violet-100 px-2 py-0.5 text-[11px] font-semibold text-violet-800">
                gemini-3.8-flash
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 px-2 py-0.5 text-[11px] font-semibold text-emerald-800">
                <CheckCircle size={10} /> 5 Tools Active
              </span>
            </div>
            <p className="text-xs text-slate-600">Generative operations intelligence for South African school workflows</p>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            className={`btn text-xs px-3 py-1 ${activeTab === 'chat' ? 'primary' : ''}`}
            onClick={() => setActiveTab('chat')}
          >
            Chat & Reasoning
          </button>
          <button
            type="button"
            className={`btn text-xs px-3 py-1 ${activeTab === 'tools' ? 'primary' : ''}`}
            onClick={() => setActiveTab('tools')}
          >
            <Wrench size={12} className="mr-1 inline" /> Tools Catalog
          </button>
        </div>
      </div>

      {activeTab === 'tools' ? (
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          <div className="border-b border-slate-200 pb-2">
            <h3 className="font-bold text-slate-900">Generative AI Operations Toolset</h3>
            <p className="text-xs text-slate-600">The model uses function declarations to call these real-time tools directly during conversation and agent execution.</p>
          </div>

          <div className="grid gap-3">
            {toolsCatalog.map((tool) => (
              <div key={tool.name} className="rounded-lg border border-slate-200 bg-slate-50/50 p-3 hover:bg-slate-50 transition">
                <div className="flex items-center gap-2 mb-1">
                  {tool.icon}
                  <span className="mono font-bold text-xs text-slate-900">{tool.name}</span>
                </div>
                <p className="text-xs text-slate-700 mb-1.5">{tool.desc}</p>
                <div className="mono text-[11px] text-slate-600 bg-white border border-slate-200 rounded p-1.5">
                  <span className="text-violet-700 font-semibold">parameters:</span> {tool.params}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <>
          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={`flex gap-3 ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.role === 'model' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white shadow-xs">
                    <Bot size={16} />
                  </div>
                )}

                <div className={`max-w-[85%] space-y-2 ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                  {/* Tool Invocations Visualization */}
                  {m.toolInvocations && m.toolInvocations.length > 0 && (
                    <div className="space-y-1.5">
                      {m.toolInvocations.map((inv, idx) => (
                        <div
                          key={idx}
                          className="rounded-lg border border-indigo-200 bg-indigo-50/80 p-2.5 text-xs text-slate-900 shadow-xs"
                        >
                          <div className="flex items-center gap-1.5 font-bold text-indigo-900">
                            <Wrench size={13} className="text-indigo-700" />
                            <span>Executed Tool:</span>
                            <span className="mono rounded bg-white px-1.5 py-0.5 border border-indigo-200 text-indigo-800">
                              {inv.name}
                            </span>
                          </div>
                          <div className="mt-1.5 grid gap-1 text-[11px]">
                            <div className="mono text-slate-700">
                              <span className="font-semibold text-indigo-900">Args:</span> {JSON.stringify(inv.args)}
                            </div>
                            <details className="mt-1">
                              <summary className="cursor-pointer font-semibold text-indigo-800 hover:underline">
                                View tool output payload
                              </summary>
                              <pre className="mt-1 max-h-36 overflow-auto rounded bg-slate-900 p-2 text-[10px] text-emerald-300">
                                {JSON.stringify(inv.result, null, 2)}
                              </pre>
                            </details>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Message body */}
                  <div
                    className={`rounded-xl px-4 py-3 text-sm leading-relaxed shadow-xs ${
                      m.role === 'user'
                        ? 'bg-violet-700 text-white'
                        : 'border border-slate-200 bg-white text-slate-900'
                    }`}
                  >
                    <div className="whitespace-pre-wrap font-sans">{m.text}</div>
                    <div
                      className={`mt-1 text-[10px] text-right ${
                        m.role === 'user' ? 'text-violet-200' : 'text-slate-600'
                      }`}
                    >
                      {m.timestamp}
                    </div>
                  </div>
                </div>

                {m.role === 'user' && (
                  <div className="mt-1 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-700 text-white">
                    <User size={16} />
                  </div>
                )}
              </div>
            ))}

            {busy && (
              <div className="flex gap-3 items-center text-xs text-slate-600">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-violet-600 text-white animate-pulse">
                  <Bot size={16} />
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-2.5">
                  <span className="inline-block animate-pulse font-medium text-slate-700">
                    Executing tools & reasoning with gemini-3.8-flash…
                  </span>
                </div>
              </div>
            )}

            {error && (
              <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800">
                {error}
              </div>
            )}

            <div ref={chatEndRef} />
          </div>

          {/* Quick prompt chips */}
          <div className="border-t border-slate-100 bg-slate-50/60 px-4 py-2">
            <div className="flex flex-wrap gap-1.5 items-center">
              <span className="text-[11px] font-semibold text-slate-600 mr-1">Quick Tools:</span>
              {samplePrompts.map((p) => (
                <button
                  key={p.label}
                  type="button"
                  className="rounded-full border border-slate-200 bg-white hover:bg-violet-50 hover:border-violet-300 px-2.5 py-1 text-xs text-slate-800 transition"
                  onClick={() => sendMessage(p.query)}
                  disabled={busy}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Input bar */}
          <div className="border-t border-slate-200 bg-white p-3">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage();
              }}
              className="flex gap-2"
            >
              <input
                type="text"
                className="input flex-1 text-slate-900 bg-white"
                placeholder="Ask about school economics, warehouse data, compliance audits, or agents…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={busy}
              />
              <button
                type="submit"
                className="btn primary px-4 py-2"
                disabled={busy || !input.trim()}
              >
                <Send size={15} className="mr-1 inline" /> Send
              </button>
            </form>
          </div>
        </>
      )}
    </div>
  );
}
