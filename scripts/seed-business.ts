/** Seeds the library, the Business Planning Package v1.4, the library index and the plan data into data/warehouse. Idempotent. Run: npm run seed:business */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { FileStore } from '../src/server/fileAdapter';
import { seedLibrary } from '../src/library/seed';
import { PACKAGE_FILES, seedPackage } from '../src/library/seedPackage';
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
const dir = join(process.cwd(), 'docs', 'business-plan');
const files = PACKAGE_FILES.map((f) => ({ ...f, bytes: new Uint8Array(readFileSync(join(dir, f.name))) }));
const lib = await seedLibrary(store);
const pkg = await seedPackage(store, files);
console.log(`library: ${lib.written.length} written, ${lib.skipped.length} already present`);
console.log(`package and plan: ${pkg.written.length} written, ${pkg.skipped.length} already present`);
