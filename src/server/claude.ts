import type { Fetch } from '../connector/github';

export class ClaudeError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

export interface ClaudeRequest {
  apiKey: string;
  model: string;
  system: string;
  prompt: string;
  maxTokens?: number;
  fetchImpl?: Fetch;
  api?: string;
}

/**
 * Server-side call to the Anthropic Messages API. Called only from the gateway route, after its PII and
 * injection checks; the key never reaches the browser. The error never echoes the upstream body.
 */
export async function completeWithClaude(r: ClaudeRequest): Promise<string> {
  const f = r.fetchImpl ?? fetch;
  const res = await f(`${r.api ?? 'https://api.anthropic.com'}/v1/messages`, {
    method: 'POST',
    headers: { 'x-api-key': r.apiKey, 'anthropic-version': '2023-06-01', 'content-type': 'application/json' },
    body: JSON.stringify({ model: r.model, max_tokens: r.maxTokens ?? 1024, system: r.system, messages: [{ role: 'user', content: r.prompt }] }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!res.ok) throw new ClaudeError(res.status, `Anthropic ${res.status}`);
  const j = (await res.json()) as { content?: { type: string; text?: string }[] };
  const text = (j.content ?? []).filter((b) => b.type === 'text').map((b) => b.text ?? '').join('');
  if (!text) throw new ClaudeError(502, 'Anthropic returned no text');
  return text;
}
