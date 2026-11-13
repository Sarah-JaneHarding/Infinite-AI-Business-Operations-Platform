/** Seeds the document library into data/warehouse. Idempotent. Run: npx tsx scripts/seed-library.ts */
import { FileStore } from '../src/server/fileAdapter';
import { seedLibrary } from '../src/library/seed';
import type { Store } from '../src/core/documents';

const fs = new FileStore();
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
seedLibrary(store).then((r) => console.log(`library seed: ${r.written.length} written, ${r.skipped.length} already present`));
