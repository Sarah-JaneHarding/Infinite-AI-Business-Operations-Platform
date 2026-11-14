import { afterEach, describe, expect, it, vi } from 'vitest';
import { apiFetch, setToken, withReauth } from '../src/core/api';

const seen: (string | undefined)[] = [];
const stub = () => vi.stubGlobal('fetch', vi.fn(async (_u: unknown, init?: RequestInit) => { seen.push((init?.headers as Record<string, string> | undefined)?.['x-ops-reauth']); return new Response('{}'); }));

afterEach(() => { vi.unstubAllGlobals(); seen.length = 0; setToken(undefined); });

describe('withReauth', () => {
  it('sends x-ops-reauth only while the action runs', async () => {
    stub();
    setToken('session-token');
    await apiFetch('/before');
    await withReauth('fresh-token', async () => { await apiFetch('/during'); await apiFetch('/during2'); });
    await apiFetch('/after');
    expect(seen).toEqual([undefined, 'fresh-token', 'fresh-token', undefined]);
  });
  it('clears the header when the action throws, and rethrows', async () => {
    stub();
    await expect(withReauth('fresh-token', async () => { throw new Error('boom'); })).rejects.toThrow('boom');
    await apiFetch('/after');
    expect(seen).toEqual([undefined]);
  });
  it('returns what the action returns', async () => {
    stub();
    expect(await withReauth('t', async () => 7)).toBe(7);
  });
});
