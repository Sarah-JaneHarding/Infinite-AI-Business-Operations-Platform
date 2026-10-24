// SHA-256 hex via Web Crypto (browser and Node 20+). Used for hash-chaining and content addressing.
export async function sha256Hex(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const buf = await globalThis.crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/** Deterministic JSON (sorted keys) so hashes do not depend on property order. */
export function canonical(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value) ?? 'null';
  if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
  const o = value as Record<string, unknown>;
  return '{' + Object.keys(o).sort().filter((k) => o[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonical(o[k])).join(',') + '}';
}

export function newId(prefix: string): string {
  const r = globalThis.crypto.getRandomValues(new Uint8Array(8));
  return prefix + '_' + [...r].map((b) => b.toString(16).padStart(2, '0')).join('');
}
