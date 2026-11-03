import type { Rec, StorageAdapter } from './warehouse';
import { apiFetch } from './api';

/** Browser → server warehouse. Falls back by throwing on load so the caller can choose local storage. */
export class ServerAdapter implements StorageAdapter {
  constructor(private base = '/api/warehouse', private f: typeof fetch = apiFetch) {}
  async load() {
    const r = await this.f(this.base);
    if (!r.ok) throw new Error('warehouse unavailable');
    return (await r.json()) as Record<string, Rec[]>;
  }
  async append(collection: string, rec: Rec) {
    const r = await this.f(`${this.base}/${collection}`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(rec) });
    if (!r.ok) {
      const j = (await r.json().catch(() => ({}))) as { error?: string };
      throw new Error(`warehouse append failed (${r.status}${j.error ? ': ' + j.error : ''})`);
    }
  }
}
