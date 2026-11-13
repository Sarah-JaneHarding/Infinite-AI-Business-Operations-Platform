import { describe, expect, it } from 'vitest';
import { createHash } from 'node:crypto';
import { LIBRARY } from '../src/library';
import { TEMPLATES } from '../src/departments/templates';
import { needsReview } from '../src/library/kit';
import { buildWorkbook } from '../src/library/workbooks';
import { detectPii } from '../src/core/guardrails/pii';
import { toDocx, toHtml, toJson, toMarkdown, toXlsx } from '../src/core/artefacts/render';
import { docText, importFile } from '../src/core/documents';

describe('document library', () => {
  it('has unique ids across the library and the quick templates', () => {
    const ids = TEMPLATES.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const i of LIBRARY) expect(TEMPLATES.some((t) => t.id === i.id)).toBe(true);
  });
  it('covers both groups', () => {
    expect(LIBRARY.some((i) => i.group === 'business')).toBe(true);
    expect(LIBRARY.some((i) => i.group === 'customer')).toBe(true);
  });
  for (const i of LIBRARY) {
    describe(i.id, () => {
      const text = docText(i.doc);
      it('is marked draft and carries its id', () => {
        expect(text).toContain(i.id);
        expect(i.doc.meta.Status).toMatch(/DRAFT/);
      });
      it('has no personal data and no invented rand amounts', () => {
        expect(detectPii(text)).toHaveLength(0);
        expect(/R\s?\d/.test(text)).toBe(false);
      });
      it('names its reviewer when it carries legal weight', () => {
        if (needsReview(i)) expect(i.review).toBeTruthy();
      });
      it('renders in every format', async () => {
        expect(toMarkdown(i.doc).length).toBeGreaterThan(50);
        expect(toHtml(i.doc)).toContain('<html');
        expect(JSON.parse(toJson(i.doc)).title).toBe(i.title);
        expect((await toDocx(i.doc)).byteLength).toBeGreaterThan(1000);
        expect((await toXlsx(i.doc)).byteLength).toBeGreaterThan(1000);
      });
      it('keeps every blank in the Fill in form', () => {
        expect(/\[(?!Fill in: )[^\]]*\]/.test(text.replace(/\[ \]|\[x\]/g, ''))).toBe(false);
      });
    });
  }
  it('builds each native workbook and it reads back', async () => {
    for (const i of LIBRARY.filter((x) => x.workbook)) {
      const bytes = await buildWorkbook(i);
      expect(bytes.byteLength).toBeGreaterThan(2000);
      const back = await importFile(`${i.id}.xlsx`, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', bytes);
      expect(back.doc?.blocks.length).toBeGreaterThan(0);
    }
  });
  it('round-trips a document through docx and html import', async () => {
    const i = LIBRARY.find((x) => x.id === 'lib-dpa')!;
    for (const [name, data, type] of [[`${i.id}.docx`, await toDocx(i.doc), 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], [`${i.id}.html`, toHtml(i.doc), 'text/html']] as const) {
      const back = await importFile(name, type, typeof data === 'string' ? new TextEncoder().encode(data) : data);
      expect(docText(back.doc!)).toContain('Fill in');
    }
  });
  it('hashes are stable', () => {
    const h = (s: string) => createHash('sha256').update(s).digest('hex');
    for (const i of LIBRARY.slice(0, 5)) expect(h(toHtml(i.doc))).toBe(h(toHtml(i.doc)));
  });
});

import { seedLibrary } from '../src/library/seed';
import { listDocuments, loadOriginal, type Store } from '../src/core/documents';
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

function memStore(): Store & { rows: Record<string, Record<string, unknown>[]> } {
  const rows: Record<string, Record<string, unknown>[]> = {};
  return {
    rows,
    put: async (c, r) => { (rows[c] ??= []).push(r); },
    latest: <T,>(c: string) => [...new Map((rows[c] ?? []).map((r) => [String(r['id']), r])).values()] as T[],
    list: <T,>(c: string, w?: (r: Record<string, unknown> & { id: string }) => boolean) => (rows[c] ?? []).filter((r) => (w ? w(r as never) : true)) as T[],
  };
}

describe('library: references, warehouse and manifest', () => {
  it('every lib- reference in a document points at a real document', () => {
    const ids = new Set(LIBRARY.map((i) => i.id));
    for (const i of LIBRARY) for (const m of docText(i.doc).match(/\blib-[a-z0-9-]+/g) ?? []) if (m !== i.id) expect(ids.has(m), `${i.id} mentions ${m}`).toBe(true);
  });
  it('seeds every document, retrievable with its editable original, and is idempotent', async () => {
    const s = memStore();
    const first = await seedLibrary(s, 'test', '2026-01-01T00:00:00.000Z');
    expect(first.written).toHaveLength(LIBRARY.length);
    expect(listDocuments(s)).toHaveLength(LIBRARY.length);
    const dpa = loadOriginal(s, 'lib-dpa')!;
    const back = await importFile('lib-dpa.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', dpa);
    expect(back.doc?.title).toBeTruthy();
    expect(loadOriginal(s, 'lib-pricing-calculator')!.byteLength).toBeGreaterThan(2000);
    const rowsBefore = Object.values(s.rows).reduce((n, r) => n + r.length, 0);
    const second = await seedLibrary(s, 'test');
    expect(second.written).toHaveLength(0);
    expect(second.skipped).toHaveLength(LIBRARY.length);
    expect(Object.values(s.rows).reduce((n, r) => n + r.length, 0)).toBe(rowsBefore);
  });
  it('the committed manifest matches the files on disk (run npm run build:library if this fails)', () => {
    const root = join(process.cwd(), 'library');
    expect(existsSync(join(root, 'manifest.json'))).toBe(true);
    const m = JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as { count: number; items: { id: string; files: { path: string; sha256: string }[] }[] };
    expect(m.count).toBe(LIBRARY.length);
    for (const it of m.items) for (const f of it.files) expect(createHash('sha256').update(readFileSync(join(root, f.path))).digest('hex')).toBe(f.sha256);
  });
});
