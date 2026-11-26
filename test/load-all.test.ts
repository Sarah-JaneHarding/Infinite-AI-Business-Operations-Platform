import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Warehouse } from '../src/core/warehouse';
import { listDocuments, type DocRecord } from '../src/core/documents';
import { loadAll } from '../src/library/loadAll';
import { sourceOf } from '../src/library/sourceOf';
import { PACKAGE_FILES } from '../src/library/seedPackage';

const readFile = (p: string) => new Uint8Array(readFileSync(join(process.cwd(), p)));
const stub = (id: string): DocRecord => ({ id, title: id, origin: 'created', scan: { scanned: true, notes: [] }, by: 'x', at: '2026-11-26T00:00:00Z' });

describe('loadAll', () => {
  it('loads the library, the business plan package and the ecosystem copy', async () => {
    const w = new Warehouse();
    const r = await loadAll(w, readFile);
    expect(r.library.written).toHaveLength(120);
    expect(r.library.written.every((id) => id.startsWith('lib-'))).toBe(true);
    for (const f of PACKAGE_FILES) expect(r.businessPlan.written).toContain(f.id);
    expect(r.ecosystem.written.length + r.ecosystem.refused.length).toBe(35);
  });

  it('classifies every stored document into exactly one source and the counts add up', async () => {
    const w = new Warehouse();
    await loadAll(w, readFile);
    const docs = listDocuments(w);
    const counts = { library: 0, 'business-plan': 0, ecosystem: 0, other: 0 };
    for (const d of docs) counts[sourceOf(d)]++;
    expect(counts.library).toBe(120);
    expect(counts['business-plan']).toBe(PACKAGE_FILES.length);
    expect(counts.other).toBe(0);
    expect(counts.library + counts['business-plan'] + counts.ecosystem + counts.other).toBe(docs.length);
  });

  it('sourceOf: own documents are other', () => {
    expect(sourceOf(stub('doc-abc-123'))).toBe('other');
    expect(sourceOf(stub('lib-anything'))).toBe('library');
    expect(sourceOf(stub('eco_x-md'))).toBe('ecosystem');
    expect(sourceOf(stub(PACKAGE_FILES[0].id))).toBe('business-plan');
  });

  it('holds no state between calls: each call checks its own store, and a second call on one store writes nothing', async () => {
    const a = new Warehouse();
    const b = new Warehouse();
    const ra = await loadAll(a, readFile);
    const rb = await loadAll(b, readFile);
    expect(rb.library.written).toEqual(ra.library.written);
    const again = await loadAll(a, readFile);
    expect(again.library.written).toHaveLength(0);
    expect(again.ecosystem.written).toHaveLength(0);
    expect(again.businessPlan.written).toHaveLength(0);
  });

  it('fails loudly when a file cannot be read, rather than loading a partial set silently', async () => {
    await expect(loadAll(new Warehouse(), () => { throw new Error('ENOENT'); })).rejects.toThrow('ENOENT');
  });
});
