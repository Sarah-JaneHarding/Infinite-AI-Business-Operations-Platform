import { appendFileSync, existsSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { Rec } from '../core/warehouse';

/** Server-side warehouse storage: one append-only JSON-lines file per collection. Never rewritten. */
export class FileStore {
  constructor(private dir = join(process.cwd(), 'data', 'warehouse')) {
    mkdirSync(this.dir, { recursive: true });
  }
  private path(c: string) {
    if (!/^[a-z0-9_]{1,64}$/.test(c)) throw new Error('bad collection name');
    return join(this.dir, `${c}.jsonl`);
  }
  append(collection: string, rec: Rec) {
    appendFileSync(this.path(collection), JSON.stringify(rec) + '\n');
  }
  load(): Record<string, Rec[]> {
    const out: Record<string, Rec[]> = {};
    for (const f of readdirSync(this.dir).filter((n) => n.endsWith('.jsonl'))) {
      const c = f.slice(0, -6);
      out[c] = readFileSync(join(this.dir, f), 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l) as Rec);
    }
    return out;
  }
  exists(c: string) {
    return existsSync(this.path(c));
  }
}
