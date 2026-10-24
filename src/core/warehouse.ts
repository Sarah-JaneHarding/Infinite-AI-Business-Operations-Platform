import { canonical, sha256Hex } from './crypto';

export type Rec = Record<string, unknown> & { id: string };

export interface StorageAdapter {
  load(): Promise<Record<string, Rec[]>>;
  /** Append-only: adapters persist one more record; they never rewrite earlier ones. */
  append(collection: string, rec: Rec): Promise<void>;
  clear?(): Promise<void>;
}

export class MemoryAdapter implements StorageAdapter {
  data: Record<string, Rec[]> = {};
  async load() {
    return structuredClone(this.data);
  }
  async append(c: string, r: Rec) {
    (this.data[c] ??= []).push(structuredClone(r));
  }
  async clear() {
    this.data = {};
  }
}

/** Browser persistence (localStorage). Wrapped in try/catch: storage may be absent or blocked. */
export class LocalStorageAdapter implements StorageAdapter {
  constructor(private key = 'infinite-ai-ops-warehouse') {}
  async load() {
    try {
      return JSON.parse(globalThis.localStorage.getItem(this.key) ?? '{}');
    } catch {
      return {};
    }
  }
  async append(c: string, r: Rec) {
    try {
      const d = await this.load();
      (d[c] ??= []).push(r);
      globalThis.localStorage.setItem(this.key, JSON.stringify(d));
    } catch {
      /* best effort; the in-memory copy still holds the record */
    }
  }
  async clear() {
    try {
      globalThis.localStorage.removeItem(this.key);
    } catch {
      /* ignore */
    }
  }
}

/**
 * The data warehouse. Records are immutable once written; "updates" are new records with the same
 * logical key (`latest()` returns the newest). Content is hash-addressed so duplicates are detectable.
 */
export class Warehouse {
  private cols: Record<string, Rec[]> = {};
  constructor(private adapter: StorageAdapter = new MemoryAdapter()) {}

  async init() {
    this.cols = await this.adapter.load();
    return this;
  }

  async put<T extends Record<string, unknown>>(collection: string, rec: T & { id: string }): Promise<T & { id: string; hash: string }> {
    const hash = await sha256Hex(canonical(rec));
    const stored = { ...rec, hash, storedAt: rec['storedAt'] ?? new Date().toISOString() } as unknown as Rec;
    (this.cols[collection] ??= []).push(stored);
    await this.adapter.append(collection, stored);
    return stored as unknown as T & { id: string; hash: string };
  }

  /** Store a record exactly as given (used for ledger entries, which carry their own hash). */
  async putRaw(collection: string, rec: Rec): Promise<void> {
    (this.cols[collection] ??= []).push(rec);
    await this.adapter.append(collection, rec);
  }

  list<T = Rec>(collection: string, where?: (r: Rec) => boolean): T[] {
    const all = this.cols[collection] ?? [];
    return (where ? all.filter(where) : [...all]) as unknown as T[];
  }

  /** Newest record per `key` field value. */
  latest<T = Rec>(collection: string, key = 'id'): T[] {
    const m = new Map<unknown, Rec>();
    for (const r of this.cols[collection] ?? []) m.set(r[key], r);
    return [...m.values()] as unknown as T[];
  }

  collections() {
    return Object.fromEntries(Object.entries(this.cols).map(([k, v]) => [k, v.length]));
  }

  /** JSON-lines bundle so data is never trapped in the platform. */
  exportJsonl(): string {
    return Object.entries(this.cols)
      .flatMap(([c, rs]) => rs.map((r) => JSON.stringify({ collection: c, ...r })))
      .join('\n');
  }

  async clearAll() {
    this.cols = {};
    await this.adapter.clear?.();
  }
}
