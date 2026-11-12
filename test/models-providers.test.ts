import { describe, expect, it } from 'vitest';
import { ADAPTERS, ProviderError, type StepRequest, type ToolSpec } from '../src/server/models/providers';

const tool: ToolSpec = { name: 'lookup', description: 'd', parameters: { type: 'object', properties: { id: { type: 'string', description: 'x' }, n: { type: 'integer' } }, required: ['id'] } };
const req = (o: Partial<StepRequest> = {}): StepRequest => ({ model: 'm-1', system: 'sys', messages: [{ role: 'user', text: 'hi' }], tools: [], maxTokens: 100, json: false, ...o });
const stub = (status: number, body: unknown) => {
  const calls: { url: string; init: RequestInit; body: Record<string, any> }[] = [];
  const fetchImpl = (async (url: string, init: RequestInit) => {
    calls.push({ url, init, body: JSON.parse(String(init.body)) });
    return new Response(JSON.stringify(body), { status });
  }) as unknown as typeof fetch;
  return { calls, fetchImpl };
};

describe('anthropic adapter', () => {
  const a = ADAPTERS.anthropic;
  it('sends the key as a header only, the system text, token cap and neutral tools as input_schema', async () => {
    const s = stub(200, { content: [{ type: 'text', text: 'hello' }], usage: { input_tokens: 7, output_tokens: 2 } });
    const r = await a.step(req({ tools: [tool] }), { apiKey: 'sk-secret', base: 'https://api.example', fetchImpl: s.fetchImpl });
    expect(r).toEqual({ text: 'hello', toolCalls: [], inputTokens: 7, outputTokens: 2 });
    const c = s.calls[0]!;
    expect(c.url).toBe('https://api.example/v1/messages');
    expect((c.init.headers as Record<string, string>)['x-api-key']).toBe('sk-secret');
    expect(JSON.stringify(c.body)).not.toContain('sk-secret');
    expect(c.body).toMatchObject({ model: 'm-1', max_tokens: 100, system: 'sys', messages: [{ role: 'user', content: 'hi' }], tools: [{ name: 'lookup', input_schema: tool.parameters }] });
  });
  it('turns a tool exchange into tool_use and tool_result blocks, and parses a tool call', async () => {
    const s = stub(200, { content: [{ type: 'text', text: 'checking' }, { type: 'tool_use', id: 'tu_1', name: 'lookup', input: { id: 'a' } }] });
    const r = await a.step(req({ messages: [{ role: 'user', text: 'q' }, { role: 'assistant', text: 'ok', toolCalls: [{ id: 'tu_0', name: 'lookup', args: { id: 'z' } }] }, { role: 'tool', results: [{ id: 'tu_0', name: 'lookup', result: { v: 1 } }] }] }), { apiKey: 'k', base: 'https://b', fetchImpl: s.fetchImpl });
    expect(r.toolCalls).toEqual([{ id: 'tu_1', name: 'lookup', args: { id: 'a' } }]);
    expect(s.calls[0]!.body.messages).toEqual([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: [{ type: 'text', text: 'ok' }, { type: 'tool_use', id: 'tu_0', name: 'lookup', input: { id: 'z' } }] },
      { role: 'user', content: [{ type: 'tool_result', tool_use_id: 'tu_0', content: '{"v":1}' }] },
    ]);
  });
  it('asks for JSON in the system text when json is set', async () => {
    const s = stub(200, { content: [{ type: 'text', text: '{}' }] });
    await a.step(req({ json: true }), { apiKey: 'k', base: 'https://b', fetchImpl: s.fetchImpl });
    expect(s.calls[0]!.body.system).toMatch(/single JSON object/);
  });
});

describe('gemini adapter', () => {
  const g = ADAPTERS.gemini;
  it('puts the key in a header (not the URL), upper-cases schema types, and maps roles', async () => {
    const s = stub(200, { candidates: [{ content: { parts: [{ text: 'hey' }] } }], usageMetadata: { promptTokenCount: 4, candidatesTokenCount: 1 } });
    const r = await g.step(req({ tools: [tool], json: true, messages: [{ role: 'user', text: 'a' }, { role: 'assistant', text: 'b', toolCalls: [] }] }), { apiKey: 'g-secret', base: 'https://g.example', fetchImpl: s.fetchImpl });
    expect(r).toEqual({ text: 'hey', toolCalls: [], inputTokens: 4, outputTokens: 1 });
    const c = s.calls[0]!;
    expect(c.url).toBe('https://g.example/v1beta/models/m-1:generateContent');
    expect(c.url).not.toContain('g-secret');
    expect((c.init.headers as Record<string, string>)['x-goog-api-key']).toBe('g-secret');
    expect(c.body.contents.map((m: { role: string }) => m.role)).toEqual(['user', 'model']);
    expect(c.body.generationConfig).toEqual({ maxOutputTokens: 100, responseMimeType: 'application/json' });
    expect(c.body.tools[0].functionDeclarations[0].parameters).toEqual({ type: 'OBJECT', properties: { id: { type: 'STRING', description: 'x' }, n: { type: 'INTEGER' } }, required: ['id'] });
  });
  it('parses function calls and sends function responses back', async () => {
    const s = stub(200, { candidates: [{ content: { parts: [{ functionCall: { name: 'lookup', args: { id: 'q' } } }] } }] });
    const r = await g.step(req({ messages: [{ role: 'tool', results: [{ id: 'call_0', name: 'lookup', result: { v: 2 } }] }] }), { apiKey: 'k', base: 'https://b', fetchImpl: s.fetchImpl });
    expect(r.toolCalls).toEqual([{ id: 'call_0', name: 'lookup', args: { id: 'q' } }]);
    expect(s.calls[0]!.body.contents[0]).toEqual({ role: 'user', parts: [{ functionResponse: { name: 'lookup', response: { v: 2 } } }] });
  });
});

describe('errors', () => {
  it('report only the status, never the upstream body, and treat a network failure as status 0', async () => {
    for (const a of Object.values(ADAPTERS)) {
      const s = stub(401, { error: { message: 'your key sk-live-abc was echoed' } });
      const e = await a.step(req(), { apiKey: 'k', base: 'https://b', fetchImpl: s.fetchImpl }).catch((x) => x);
      expect(e).toBeInstanceOf(ProviderError);
      expect(e.status).toBe(401);
      expect(e.message).toBe('provider returned 401');
      const down = (async () => { throw new Error('ECONNREFUSED secret-host'); }) as unknown as typeof fetch;
      const e2 = await a.step(req(), { apiKey: 'k', base: 'https://b', fetchImpl: down }).catch((x) => x);
      expect([e2.status, e2.message]).toEqual([0, 'provider unreachable']);
    }
  });
  it('tolerates an empty or odd reply as an empty answer rather than crashing', async () => {
    for (const a of Object.values(ADAPTERS)) {
      const r = await a.step(req(), { apiKey: 'k', base: 'https://b', fetchImpl: stub(200, {}).fetchImpl });
      expect(r).toMatchObject({ text: '', toolCalls: [] });
    }
  });
});
