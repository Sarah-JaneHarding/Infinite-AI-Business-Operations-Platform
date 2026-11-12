import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/** Rule M10: the model hub is the only code that can reach a model provider. This fails if a second door is added. */
const walk = (dir: string): string[] => readdirSync(dir).flatMap((n) => {
  const p = join(dir, n);
  return statSync(p).isDirectory() ? (n === 'node_modules' || n === 'dist' ? [] : walk(p)) : /\.(ts|tsx|mjs|js)$/.test(n) ? [p] : [];
});
const files = [...walk('src'), ...walk('legacy'), 'server.ts'].filter((f) => f !== 'src/generated/ecosystem-snapshot.json');
const read = (f: string) => readFileSync(f, 'utf8');
const only = (needle: RegExp, allowed: string[]) => files.filter((f) => needle.test(read(f)) && !allowed.includes(f));

describe('M10: one door to the model providers', () => {
  it('only providers.ts knows a provider host, header or SDK', () => {
    for (const needle of [/api\.anthropic\.com/, /generativelanguage\.googleapis\.com/, /@google\/genai/, /@anthropic-ai\/sdk/, /x-api-key/, /x-goog-api-key/, /anthropic-version/, /api\.openai\.com/]) {
      expect(only(needle, ['src/server/models/providers.ts']), String(needle)).toEqual([]);
    }
  });

  it('only the hub drives an adapter, and only the hub and the routes import the providers module', () => {
    expect(only(/\bADAPTERS\b/, ['src/server/models/providers.ts', 'src/server/models/hub.ts'])).toEqual([]);
    expect(only(/models\/providers['"]|from '\.\/providers'/, ['src/server/models/hub.ts', 'src/server/models/tools.ts', 'src/server/modelRoutes.ts'])).toEqual([]);
  });

  it('no provider key is read outside the hub configuration', () => {
    for (const k of ['ANTHROPIC_API_KEY', 'GEMINI_API_KEY']) expect(only(new RegExp(k), ['src/server/models/providers.ts']), k).toEqual([]);
  });

  it('the browser never sees a provider key or host: no UI or core code mentions one', () => {
    const browser = files.filter((f) => f.startsWith('src/ui') || f.startsWith('src/core') || f === 'src/App.tsx' || f === 'src/main.tsx');
    for (const f of browser) expect(read(f), f).not.toMatch(/ANTHROPIC|GEMINI|api\.anthropic|googleapis|x-api-key/);
  });

  it('no route outside the model routes calls the hub to run a model', () => {
    expect(only(/\bhub\.(complete|copilot|recommend|selfTest)\(/, ['src/server/modelRoutes.ts'])).toEqual([]);
  });
});
