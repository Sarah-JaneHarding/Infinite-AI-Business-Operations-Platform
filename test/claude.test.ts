import { describe, expect, it } from 'vitest';
import { ClaudeError, completeWithClaude } from '../src/server/claude';

const base = { apiKey: 'k', model: 'm', system: 's', prompt: 'p' };
const reply = (status: number, body: unknown) => (async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('completeWithClaude', () => {
  it('sends the key as a header, not in the body, and joins text blocks', async () => {
    let seen: { url: string; init: RequestInit } | undefined;
    const f = (async (url: string, init: RequestInit) => {
      seen = { url, init };
      return new Response(JSON.stringify({ content: [{ type: 'text', text: 'a' }, { type: 'tool_use' }, { type: 'text', text: 'b' }] }));
    }) as unknown as typeof fetch;
    expect(await completeWithClaude({ ...base, fetchImpl: f })).toBe('ab');
    expect(seen?.url).toBe('https://api.anthropic.com/v1/messages');
    expect((seen?.init.headers as Record<string, string>)['x-api-key']).toBe('k');
    expect(String(seen?.init.body)).not.toContain('"k"');
  });

  it('raises a status-only error on a non-2xx and never echoes the upstream body', async () => {
    const err = await completeWithClaude({ ...base, fetchImpl: reply(401, { error: { message: 'secret detail' } }) }).catch((e) => e);
    expect(err).toBeInstanceOf(ClaudeError);
    expect(err.status).toBe(401);
    expect(err.message).toBe('Anthropic 401');
  });

  it('refuses an empty completion', async () => {
    await expect(completeWithClaude({ ...base, fetchImpl: reply(200, { content: [] }) })).rejects.toThrow(/no text/);
  });
});
