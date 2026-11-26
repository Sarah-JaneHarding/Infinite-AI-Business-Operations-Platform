/** Loads the library, the business plan package and the ecosystem documents into data/warehouse (or the directory given as the first argument). Idempotent. Run: npm run seed:all */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileStore } from '../src/server/fileAdapter';
import { loadAll } from '../src/library/loadAll';
import type { Store } from '../src/core/documents';

// Optional first argument: a warehouse directory to use instead of data/warehouse (for a dry run).
const fs = new FileStore(process.argv[2]);
const latest = <T>(c: string): T[] => {
  const m = new Map<string, unknown>();
  for (const r of fs.list(c)) m.set(String(r.id), r);
  return [...m.values()] as T[];
};
const store: Store = {
  put: async (c, rec) => { fs.append(c, rec); },
  latest: (c) => latest(c),
  list: (c, where) => (where ? fs.list(c).filter(where) : [...fs.list(c)]) as never,
};
const r = await loadAll(store, (p) => new Uint8Array(readFileSync(join(process.cwd(), p))));
console.log(`library: ${r.library.written.length} written, ${r.library.skipped.length} already present`);
console.log(`business plan and plan data: ${r.businessPlan.written.length} written, ${r.businessPlan.skipped.length} already present`);
console.log(`ecosystem: ${r.ecosystem.written.length} written, ${r.ecosystem.skipped.length} already present, ${r.ecosystem.refused.length} refused`);
for (const x of r.ecosystem.refused) console.log(`  refused ${x.name}: ${x.reason}`);
