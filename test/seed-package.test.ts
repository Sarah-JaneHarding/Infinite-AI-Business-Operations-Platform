import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { Warehouse } from '../src/core/warehouse';
import { listDocuments, loadOriginal, type DocRecord } from '../src/core/documents';
import { PACKAGE_FILES, seedPackage } from '../src/library/seedPackage';
import { PLAN } from '../src/core/ceo';

const dir = join(process.cwd(), 'docs', 'business-plan');
const files = () => PACKAGE_FILES.map((f) => ({ ...f, bytes: new Uint8Array(readFileSync(join(dir, f.name))) }));

describe('ingesting the package v1.4 and the library index', () => {
  it('stores the originals byte for byte, the index as an editable document and the plan data', async () => {
    const w = await new Warehouse().init();
    const r = await seedPackage(w, files(), 'test', '2026-11-14T00:00:00.000Z');
    expect(r.written.sort()).toEqual(['pkg-library-index', 'pkg-v1.4-docx', 'pkg-v1.4-html', 'plan-v1.4']);
    for (const f of files()) expect(Buffer.from(loadOriginal(w, f.id)!).equals(Buffer.from(f.bytes)), f.id).toBe(true);
    const docs = listDocuments(w);
    expect(docs.find((d) => d.id === 'pkg-library-index')?.doc?.blocks.length).toBeGreaterThan(3);
    expect(docs.find((d) => d.id === 'pkg-v1.4-docx')?.doc).toBeUndefined(); // too large to edit as a document; the original is kept
    expect(docs.every((d: DocRecord) => d.origin === 'uploaded' && d.by === 'test')).toBe(true);
    const plan = w.latest<{ id: string; founder: { monthlyPay: number }; decisions: unknown[] }>('plan_snapshots')[0]!;
    expect(plan.id).toBe('plan-v1.4');
    expect(plan.founder.monthlyPay).toBe(PLAN.founder.monthlyPay);
    expect(plan.decisions.length).toBeGreaterThan(5);
  });
  it('is idempotent: a second run writes nothing, and an edited record is not overwritten', async () => {
    const w = await new Warehouse().init();
    await seedPackage(w, files());
    await w.put('documents', { ...w.latest<DocRecord>('documents').find((d) => d.id === 'pkg-library-index')!, title: 'Edited by a person' } as never);
    const again = await seedPackage(w, files());
    expect(again.written).toEqual([]);
    expect(again.skipped).toHaveLength(4);
    expect(listDocuments(w).find((d) => d.id === 'pkg-library-index')!.title).toBe('Edited by a person');
    expect(w.list('document_chunks').length).toBeGreaterThan(10);
  });
  it('the stored package is the branded v1.4 (tagline and contact line present, no secrets)', () => {
    const html = readFileSync(join(dir, 'Infinite-AI-Business-Planning-Package-v1.4.html'), 'utf8');
    for (const s of ['EDUCATE - INNOVATE - TRANSFORM', 'infinite-ai-ecosystem@protonmail.com', '+27 611 939 620', 'Version 1.4']) expect(html, s).toContain(s);
    expect(html).not.toMatch(/sk-ant-|ghp_|OPS_USERS=/);
  });
});
