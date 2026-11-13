/**
 * Saves the library into the data warehouse as `documents` records (origin 'template') with the editable
 * original (.docx, or .xlsx for workbooks) as `document_chunks`. Idempotent: an id that is already stored is skipped,
 * so a second run writes nothing and a person's later edit of a record is never overwritten.
 */
import { saveRecord, type DocRecord, type Store } from '../core/documents';
import { toDocx } from '../core/artefacts/render';
import { LIBRARY } from './index';
import { buildWorkbook } from './workbooks';

const DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export async function seedLibrary(store: Store, by = 'library-seed', at = new Date().toISOString()): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  const have = new Set(store.latest<DocRecord>('documents').map((d) => d.id));
  for (const it of LIBRARY) {
    if (have.has(it.id)) { skipped.push(it.id); continue; }
    const sheet = Boolean(it.workbook);
    const bytes = sheet ? await buildWorkbook(it) : await toDocx(it.doc);
    const ext = sheet ? 'xlsx' : 'docx';
    const rec: DocRecord = { id: it.id, title: it.title, origin: 'template', name: `${it.id}.${ext}`, mime: sheet ? XLSX : DOCX, kind: ext, doc: it.doc, scan: { scanned: true, notes: [it.review ? `Needs review by ${it.review}` : 'No review flag'] }, dept: it.dept, by, at };
    await saveRecord(store, rec, bytes);
    written.push(it.id);
  }
  return { written, skipped };
}
