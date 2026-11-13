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
