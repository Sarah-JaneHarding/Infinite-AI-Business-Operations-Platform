/**
 * Provider adapters. This file and hub.ts are the only code that may talk to a model provider (rule M10).
 * Each adapter does exactly one model step over plain fetch: no SDK, no retries, no policy. Policy lives in hub.ts.
 */
export type ProviderId = 'anthropic' | 'gemini';
export const PROVIDER_IDS: readonly ProviderId[] = ['anthropic', 'gemini'];

export interface JsonSchema { type: string; description?: string; properties?: Record<string, JsonSchema>; required?: string[]; items?: JsonSchema; enum?: string[] }
export interface ToolSpec { name: string; description: string; parameters: JsonSchema }
export interface ToolCall { id: string; name: string; args: Record<string, unknown> }
export interface ToolResult { id: string; name: string; result: Record<string, unknown> }
export type ChatMessage =
  | { role: 'user'; text: string }
  | { role: 'assistant'; text: string; toolCalls: ToolCall[] }
  | { role: 'tool'; results: ToolResult[] };

export interface StepRequest { model: string; system: string; messages: ChatMessage[]; tools: ToolSpec[]; maxTokens: number; json: boolean }
export interface StepResult { text: string; toolCalls: ToolCall[]; inputTokens?: number; outputTokens?: number }

/** Carries only the status. The upstream body is never copied into an error, because it can echo the request. */
export class ProviderError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export interface Adapter {
  id: ProviderId;
  label: string;
  keyEnv: string;
  modelEnv: string;
  baseEnv: string;
  defaultModel: string;
  defaultBase: string;
  step(req: StepRequest, ctx: { apiKey: string; base: string; fetchImpl: typeof fetch }): Promise<StepResult>;
}

async function post(ctx: { fetchImpl: typeof fetch }, url: string, headers: Record<string, string>, body: unknown): Promise<Record<string, unknown>> {
  let res: Response;
  try {
    res = await ctx.fetchImpl(url, { method: 'POST', headers: { 'content-type': 'application/json', ...headers }, body: JSON.stringify(body), signal: AbortSignal.timeout(30_000) });
  } catch {
    throw new ProviderError(0, 'provider unreachable');
  }
  if (!res.ok) throw new ProviderError(res.status, `provider returned ${res.status}`);
  return (await res.json().catch(() => ({}))) as Record<string, unknown>;
}

const JSON_ONLY = '\n\nRespond with a single JSON object and nothing else.';

const anthropic: Adapter = {
  id: 'anthropic',
  label: 'Anthropic (Claude)',
  keyEnv: 'ANTHROPIC_API_KEY',
  modelEnv: 'ANTHROPIC_MODEL',
  baseEnv: 'ANTHROPIC_API_BASE',
  defaultModel: 'claude-sonnet-5-5',
  defaultBase: 'https://api.anthropic.com',
  async step(req, ctx) {
    const messages = req.messages.map((m) => {
      if (m.role === 'user') return { role: 'user', content: m.text };
      if (m.role === 'assistant') return { role: 'assistant', content: [...(m.text ? [{ type: 'text', text: m.text }] : []), ...m.toolCalls.map((c) => ({ type: 'tool_use', id: c.id, name: c.name, input: c.args }))] };
      return { role: 'user', content: m.results.map((r) => ({ type: 'tool_result', tool_use_id: r.id, content: JSON.stringify(r.result) })) };
    });
    const body: Record<string, unknown> = { model: req.model, max_tokens: req.maxTokens, system: req.system + (req.json ? JSON_ONLY : ''), messages };
    if (req.tools.length) body.tools = req.tools.map((t) => ({ name: t.name, description: t.description, input_schema: t.parameters }));
    const j = await post(ctx, `${ctx.base}/v1/messages`, { 'x-api-key': ctx.apiKey, 'anthropic-version': '2023-06-01' }, body);
    const blocks = (Array.isArray(j.content) ? j.content : []) as { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[];
    const usage = (j.usage ?? {}) as { input_tokens?: number; output_tokens?: number };
    return {
      text: blocks.filter((b) => b.type === 'text').map((b) => b.text ?? '').join(''),
      toolCalls: blocks.filter((b) => b.type === 'tool_use').map((b, i) => ({ id: b.id ?? `call_${i}`, name: b.name ?? '', args: b.input ?? {} })),
      inputTokens: usage.input_tokens,
      outputTokens: usage.output_tokens,
    };
  },
};

/** Gemini's schema types are upper case. */
const geminiSchema = (s: JsonSchema): Record<string, unknown> => ({
  type: s.type.toUpperCase(),
  ...(s.description ? { description: s.description } : {}),
  ...(s.enum ? { enum: s.enum } : {}),
  ...(s.properties ? { properties: Object.fromEntries(Object.entries(s.properties).map(([k, v]) => [k, geminiSchema(v)])) } : {}),
  ...(s.required ? { required: s.required } : {}),
  ...(s.items ? { items: geminiSchema(s.items) } : {}),
});

const gemini: Adapter = {
  id: 'gemini',
  label: 'Google Gemini',
  keyEnv: 'GEMINI_API_KEY',
  modelEnv: 'GEMINI_MODEL',
  baseEnv: 'GEMINI_API_BASE',
  defaultModel: 'gemini-3.8-flash',
  defaultBase: 'https://generativelanguage.googleapis.com',
  async step(req, ctx) {
    const contents = req.messages.map((m) => {
      if (m.role === 'user') return { role: 'user', parts: [{ text: m.text }] };
      if (m.role === 'assistant') return { role: 'model', parts: [...(m.text ? [{ text: m.text }] : []), ...m.toolCalls.map((c) => ({ functionCall: { name: c.name, args: c.args } }))] };
      return { role: 'user', parts: m.results.map((r) => ({ functionResponse: { name: r.name, response: r.result } })) };
    });
    const body: Record<string, unknown> = {
      systemInstruction: { parts: [{ text: req.system }] },
      contents,
      generationConfig: { maxOutputTokens: req.maxTokens, ...(req.json ? { responseMimeType: 'application/json' } : {}) },
    };
    if (req.tools.length) body.tools = [{ functionDeclarations: req.tools.map((t) => ({ name: t.name, description: t.description, parameters: geminiSchema(t.parameters) })) }];
    const j = await post(ctx, `${ctx.base}/v1beta/models/${encodeURIComponent(req.model)}:generateContent`, { 'x-goog-api-key': ctx.apiKey }, body);
    const cand = (Array.isArray(j.candidates) ? j.candidates[0] : undefined) as { content?: { parts?: { text?: string; functionCall?: { name?: string; args?: Record<string, unknown> } }[] } } | undefined;
    const parts = cand?.content?.parts ?? [];
    const usage = (j.usageMetadata ?? {}) as { promptTokenCount?: number; candidatesTokenCount?: number };
    return {
      text: parts.map((p) => p.text ?? '').join(''),
      toolCalls: parts.filter((p) => p.functionCall).map((p, i) => ({ id: `call_${i}`, name: p.functionCall?.name ?? '', args: p.functionCall?.args ?? {} })),
      inputTokens: usage.promptTokenCount,
      outputTokens: usage.candidatesTokenCount,
    };
  },
};

export const ADAPTERS: Record<ProviderId, Adapter> = { anthropic, gemini };

export interface ProviderConfig {
  id: ProviderId;
  label: string;
  /** Whether a key is present. The key itself is never exposed outside this object's `apiKey` field. */
  configured: boolean;
  model: string;
  keyEnv: string;
  modelEnv: string;
  baseEnv: string;
  base: string;
  apiKey?: string;
}

const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost', '[::1]']);

/** Plain http is accepted only for loopback (a local test double). Throws on anything else, so a bad value stops startup. */
export function validateBase(name: string, value: string): string {
  let u: URL;
  try {
    u = new URL(value);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (u.protocol !== 'https:' && !(u.protocol === 'http:' && LOOPBACK.has(u.hostname))) throw new Error(`${name} must be https (plain http is only allowed for localhost)`);
  return value.replace(/\/+$/, '');
}

export function readProviders(env: Record<string, string | undefined>): ProviderConfig[] {
  return PROVIDER_IDS.map((id) => {
    const a = ADAPTERS[id];
    const key = env[a.keyEnv]?.trim();
    const model = env[a.modelEnv]?.trim() || a.defaultModel;
    if (!/^[A-Za-z0-9._:-]{1,80}$/.test(model)) throw new Error(`${a.modelEnv} has characters a model name cannot contain`);
    const base = validateBase(a.baseEnv, env[a.baseEnv]?.trim() || a.defaultBase);
    return { id, label: a.label, configured: Boolean(key), model, keyEnv: a.keyEnv, modelEnv: a.modelEnv, baseEnv: a.baseEnv, base, apiKey: key || undefined };
  });
}

/** Routing order from OPS_MODEL_ORDER (default: anthropic, gemini). A typo stops startup rather than silently re-routing. */
export function readOrder(env: Record<string, string | undefined>): ProviderId[] {
  const raw = (env.OPS_MODEL_ORDER ?? '').split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
  if (!raw.length) return [...PROVIDER_IDS];
  const bad = raw.filter((r) => !PROVIDER_IDS.includes(r as ProviderId));
  if (bad.length) throw new Error(`OPS_MODEL_ORDER names an unknown provider: ${bad.join(', ')} (known: ${PROVIDER_IDS.join(', ')})`);
  return [...new Set(raw as ProviderId[])];
}

/** What the setup page shows for each provider. No secrets, only names and steps. */
export const SETUP: Record<ProviderId, { where: string; url: string; steps: string[] }> = {
  anthropic: {
    where: 'Anthropic Console',
    url: 'https://console.anthropic.com/',
    steps: [
      'Sign in to the Anthropic Console and create an API key for this platform. Use a key dedicated to it, so it can be revoked on its own.',
      'Put it in the server\'s .env as ANTHROPIC_API_KEY (never in the browser, the repository or a chat).',
      'Optional: set ANTHROPIC_MODEL to pin the model. Leave it out to use the platform default.',
      'Restart the server, then return here: the card will show "Configured".',
    ],
  },
  gemini: {
    where: 'Google AI Studio',
    url: 'https://aistudio.google.com/apikey',
    steps: [
      'Sign in to Google AI Studio and create an API key for this platform. Use a key dedicated to it.',
      'Put it in the server\'s .env as GEMINI_API_KEY (never in the browser, the repository or a chat).',
      'Optional: set GEMINI_MODEL to pin the model. Leave it out to use the platform default.',
      'Restart the server, then return here: the card will show "Configured".',
    ],
  },
};
