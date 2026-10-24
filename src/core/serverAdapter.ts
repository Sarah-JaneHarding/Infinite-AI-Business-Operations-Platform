import type { Rec, StorageAdapter } from './warehouse';

/** Browser → server warehouse. Falls back by throwing on load so the caller can choose local storage. */
export class ServerAdapter implements StorageAdapter {
  constructor(private base = '/api/warehouse', private token?: string) {}
  private h() {
    return { 'content-type': 'application/json', ...(this.token ? { 'x-ops-token': this.token } : {}) };
  }
  async load() {
    const r = await fetch(this.base, { headers: this.h() });
    if (!r.ok) throw new Error('warehouse unavailable');
    return (await r.json()) as Record<string, Rec[]>;
  }
  async append(collection: string, rec: Rec) {
    const r = await fetch(`${this.base}/${collection}`, { method: 'POST', headers: this.h(), body: JSON.stringify(rec) });
    if (!r.ok) throw new Error('warehouse append failed');
  }
}
