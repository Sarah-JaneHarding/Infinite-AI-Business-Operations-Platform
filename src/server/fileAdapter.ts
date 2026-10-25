import { appendFileSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Rec } from '../core/warehouse';

/**
 * Server-side warehouse storage: one append-only JSON-lines file per collection. Never rewritten.
 * Read once at start-up and kept in memory, so a request never re-parses the disk.
 */
export class FileStore {
  private cache: Record<string, Rec[]> = {};
  constructor(private dir = join(process.cwd(), 'data', 'warehouse')) {
    mkdirSync(this.dir, { recursive: true });
    for (const f of readdirSync(this.dir).filter((n) => n.endsWith('.jsonl'))) {
      this.cache[f.slice(0, -6)] = readFileSync(join(this.dir, f), 'utf8').split('\n').filter(Boolean).map((l, i) => {
        try {
          return JSON.parse(l) as Rec;
        } catch {
          throw new Error(`warehouse file ${f} line ${i + 1} is not valid JSON`);
        }
      });
    }
  }
  private path(c: string) {
    if (!/^[a-z0-9_]{1,64}$/.test(c)) throw new Error('bad collection name');
    return join(this.dir, `${c}.jsonl`);
  }
  append(collection: string, rec: Rec) {
    appendFileSync(this.path(collection), JSON.stringify(rec) + '\n');
    (this.cache[collection] ??= []).push(rec);
  }
  load(): Record<string, readonly Rec[]> {
    return this.cache;
  }
  list(c: string): readonly Rec[] {
    return this.cache[c] ?? [];
  }
  exists(c: string) {
    return c in this.cache;
  }
}
