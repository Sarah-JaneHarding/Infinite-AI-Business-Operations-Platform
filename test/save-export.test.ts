import { describe, expect, it } from 'vitest';
import { Warehouse } from '../src/core/warehouse';
import { importFile, needsReview, saveExport, saveRecord, listDocuments, loadOriginal, exportFile, type DocRecord } from '../src/core/documents';
import { NEEDS_REVIEW_MARK, NEEDS_REVIEW_NOTICE, noticeFor, scanNotesFor, withNotice } from '../src/core/notice';
import { toHtml, toMarkdown } from '../src/core/artefacts/render';
import type { ArtefactFormat, Doc } from '../src/core/types';

const doc: Doc = { title: 'Supplier terms', blocks: [{ type: 'p', text: 'Payment in 30 days.' }, { type: 'table', headers: ['Item', 'Price'], rows: [['A', 10]] }], meta: {} };
const rec = (over: Partial<DocRecord> = {}): DocRecord => ({ id: 'lib-1', title: 'Supplier terms', origin: 'template', doc, scan: { scanned: true, notes: ['No review flag'] }, by: 'seed', at: '2026-01-01T00:00:00.000Z', ...over });
const MIMES: Record<string, [string, string]> = {
  md: ['md', 'text/markdown'], html: ['html', 'text/html'], json: ['json', 'application/json'], csv: ['csv', 'text/csv'],
  docx: ['docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'], xlsx: ['xlsx', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
};

describe('saveExport', () => {
  for (const f of ['md', 'html', 'json', 'csv', 'docx', 'xlsx'] as ArtefactFormat[]) {
    it(`saves a ${f} copy with the right name, type and bytes, and leaves the original alone`, async () => {
      const store = await new Warehouse().init();
      const original = await saveRecord(store, rec());
      const before = JSON.stringify(original);
      const saved = await saveExport(store, original, f, 'sarah', '2026-02-02T00:00:00.000Z');
      expect(saved.origin).toBe('saved');
      expect(saved.id).not.toBe(original.id);
      expect(saved.name).toBe(`supplier-terms.${MIMES[f][0]}`);
      expect(saved.mime).toBe(MIMES[f][1]);
      expect(saved.kind).toBe(f === 'md' ? 'markdown' : f);
      expect(saved.by).toBe('sarah');
      expect(saved.at).toBe('2026-02-02T00:00:00.000Z');
      expect(saved.size).toBeGreaterThan(0);
      expect(loadOriginal(store, saved.id)!.length).toBe(saved.size);
      expect(JSON.stringify(original)).toBe(before);
      expect(listDocuments(store).find((d) => d.id === original.id)!.origin).toBe('template');
    });
  }

  it('refuses pdf with no silent substitute', async () => {
    const store = await new Warehouse().init();
    await expect(saveExport(store, rec(), 'pdf', 'sarah')).rejects.toThrow('PDF is produced by printing; use Print');
    expect(listDocuments(store)).toHaveLength(0);
  });

  it('refuses a record that has no editable content', async () => {
    const store = await new Warehouse().init();
    await expect(saveExport(store, rec({ doc: undefined }), 'md', 'sarah')).rejects.toThrow(/stored as uploaded/);
  });

  it('a download and a saved copy are byte-identical for the same format', async () => {
    const store = await new Warehouse().init();
    const flagged = rec({ scan: { scanned: true, notes: ['Needs review by an attorney'] } });
    const shown = withNotice(doc, noticeFor(['needs-review']));
    for (const f of ['md', 'html', 'json', 'csv'] as ArtefactFormat[]) {
      const saved = await saveExport(store, flagged, f, 'sarah');
      const file = await exportFile(shown, f);
      expect(Buffer.from(loadOriginal(store, saved.id)!).equals(Buffer.from(new TextEncoder().encode(file.bytes as string))), f).toBe(true);
      expect(saved.name).toBe(file.name);
    }
  });

  it('Word and Excel copies hold the same content as a download (the libraries add random ids, so the zip bytes differ)', async () => {
    const store = await new Warehouse().init();
    const flagged = rec({ scan: { scanned: true, notes: ['Needs review by an attorney'] } });
    const shown = withNotice(doc, noticeFor(['needs-review']));
    for (const f of ['docx', 'xlsx'] as ArtefactFormat[]) {
      const saved = await saveExport(store, flagged, f, 'sarah');
      const file = await exportFile(shown, f);
      const back = async (b: Uint8Array) => (await importFile(file.name, file.mime, b)).doc!.blocks;
      expect(await back(loadOriginal(store, saved.id)!), f).toEqual(await back(file.bytes as Uint8Array));
      expect(saved.name).toBe(file.name);
    }
  });

  it('a record marked "Needs review by" is saved with the notice and stays flagged', async () => {
    const store = await new Warehouse().init();
    const saved = await saveExport(store, rec({ scan: { scanned: true, notes: ['Needs review by an attorney'] } }), 'md', 'sarah');
    expect(new TextDecoder().decode(loadOriginal(store, saved.id)!)).toContain(NEEDS_REVIEW_NOTICE);
    expect(saved.scan.notes.some((n) => n.startsWith('Needs review by'))).toBe(true);
    const plain = await saveExport(store, rec(), 'md', 'sarah');
    expect(new TextDecoder().decode(loadOriginal(store, plain.id)!)).not.toContain(NEEDS_REVIEW_NOTICE);
  });
});

describe('withNotice', () => {
  it('prepends exactly one callout and leaves the input untouched', () => {
    const before = JSON.stringify(doc);
    const out = withNotice(doc, NEEDS_REVIEW_NOTICE);
    expect(out.blocks).toHaveLength(doc.blocks.length + 1);
    expect(out.blocks[0]).toMatchObject({ type: 'callout', tone: 'warn', text: NEEDS_REVIEW_NOTICE });
    expect(JSON.stringify(doc)).toBe(before);
  });
  it('is idempotent', () => {
    const once = withNotice(doc, NEEDS_REVIEW_NOTICE);
    expect(withNotice(once, NEEDS_REVIEW_NOTICE)).toEqual(once);
    expect(withNotice(once, NEEDS_REVIEW_NOTICE).blocks.filter((b) => b.text === NEEDS_REVIEW_NOTICE)).toHaveLength(1);
  });
  it('returns the input unchanged for null', () => { expect(withNotice(doc, null)).toBe(doc); });
  it('noticeFor reads the needs-review flag only', () => {
    expect(noticeFor(['needs-review'])).toBe(NEEDS_REVIEW_NOTICE);
    expect(noticeFor(['single-signer'])).toBeNull();
    expect(noticeFor([])).toBeNull();
  });
  it('shows in the HTML and Markdown exports and in the print HTML', () => {
    const n = withNotice(doc, NEEDS_REVIEW_NOTICE);
    expect(toHtml(n)).toContain(NEEDS_REVIEW_NOTICE);
    expect(toMarkdown(n)).toContain(NEEDS_REVIEW_NOTICE);
    expect(toHtml(doc)).not.toContain(NEEDS_REVIEW_NOTICE);
  });
});

describe('a saved copy of a flagged artefact stays recognised as needs-review', () => {
  const asRecord = (flags: string[]): DocRecord => ({ id: 'art-1', title: 'Supplier terms', origin: 'saved', doc, scan: { scanned: true, notes: scanNotesFor(noticeFor(flags), ['Copy of art-1 v1']) }, by: 'sarah', at: '2026-01-01T00:00:00.000Z' });
  it('plain copy: flagged gets the mark and the stored doc has no notice block', async () => {
    const store = await new Warehouse().init();
    const saved = await saveRecord(store, asRecord(['needs-review']));
    expect(needsReview(saved)).toBe(true);
    expect(JSON.stringify(saved.doc)).not.toContain(NEEDS_REVIEW_NOTICE);
    const again = await saveExport(store, saved, 'md', 'sarah');
    expect(new TextDecoder().decode(loadOriginal(store, again.id)!)).toContain(NEEDS_REVIEW_NOTICE);
    expect(toHtml(withNotice(saved.doc!, needsReview(saved) ? NEEDS_REVIEW_NOTICE : null))).toContain(NEEDS_REVIEW_NOTICE);
    expect(needsReview(again)).toBe(true);
  });
  it('file-type save of an artefact copy (explicit notice) carries the mark and re-exports with the notice', async () => {
    const store = await new Warehouse().init();
    const artefactCopy: DocRecord = { id: 'art-1', title: 'Supplier terms', origin: 'saved', doc, scan: { scanned: true, notes: [] }, by: 'sarah', at: '2026-01-01T00:00:00.000Z' };
    const saved = await saveExport(store, artefactCopy, 'html', 'sarah', undefined, NEEDS_REVIEW_NOTICE);
    expect(needsReview(saved)).toBe(true);
    expect(JSON.stringify(saved.doc)).not.toContain(NEEDS_REVIEW_NOTICE);
    const again = await saveExport(store, saved, 'html', 'sarah');
    expect(new TextDecoder().decode(loadOriginal(store, again.id)!)).toContain(NEEDS_REVIEW_NOTICE);
  });
  it('unflagged artefacts get no mark', async () => {
    const store = await new Warehouse().init();
    expect(needsReview(await saveRecord(store, asRecord([])))).toBe(false);
    const saved = await saveExport(store, { ...asRecord([]), scan: { scanned: true, notes: [] } }, 'md', 'sarah', undefined, null);
    expect(saved.scan.notes.some((n) => n.startsWith('Needs review by'))).toBe(false);
    expect(scanNotesFor(null, ['x'])).toEqual(['x']);
    expect(scanNotesFor(NEEDS_REVIEW_NOTICE, [NEEDS_REVIEW_MARK]).length).toBe(1);
  });
});
