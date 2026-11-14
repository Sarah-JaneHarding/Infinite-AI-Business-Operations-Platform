/**
 * Saves the Business Planning Package v1.4, the document library index and the plan data into the warehouse, so the
 * platform can retrieve them on request and its CEO command centre reads the same figures. Idempotent: an id that is
 * already stored is skipped, so a second run writes nothing and a person's later edit is never overwritten.
 */
import { markdownToDoc, saveRecord, MAX_DOC_JSON, type DocRecord, type FileKind, type Store } from '../core/documents';
import { PLAN, PLAN_DECISIONS } from '../core/ceo/plan';

export interface PackageFile { id: string; title: string; name: string; mime: string; kind: FileKind; bytes: Uint8Array; dept: string; note: string }

export const PACKAGE_FILES: Omit<PackageFile, 'bytes'>[] = [
  { id: 'pkg-v1.4-html', title: 'Business Planning Package v1.4 (HTML, dark by default)', name: 'Infinite-AI-Business-Planning-Package-v1.4.html', mime: 'text/html', kind: 'html', dept: 'executive', note: 'Original file, 13 November 2026. Open or download it from the Library.' },
  { id: 'pkg-v1.4-docx', title: 'Business Planning Package v1.4 (Word)', name: 'Infinite-AI-Business-Planning-Package-v1.4.docx', mime: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', kind: 'docx', dept: 'executive', note: 'Original file, 13 November 2026. Editable in Word.' },
  { id: 'pkg-library-index', title: 'Document library index (13 November 2026)', name: 'document-library-index-2026-11-13.md', mime: 'text/markdown', kind: 'markdown', dept: 'executive', note: 'Index of the 120 library documents.' },
];

export async function seedPackage(store: Store, files: PackageFile[], by = 'package-seed', at = new Date().toISOString()): Promise<{ written: string[]; skipped: string[] }> {
  const written: string[] = [];
  const skipped: string[] = [];
  const have = new Set(store.latest<DocRecord>('documents').map((d) => d.id));
  for (const f of files) {
    if (have.has(f.id)) { skipped.push(f.id); continue; }
    let doc: DocRecord['doc'];
    if (f.kind === 'markdown') {
      const d = markdownToDoc(f.title, new TextDecoder().decode(f.bytes));
      if (JSON.stringify(d).length <= MAX_DOC_JSON) doc = d;
    }
    const rec: DocRecord = { id: f.id, title: f.title, origin: 'uploaded', name: f.name, mime: f.mime, kind: f.kind, doc, scan: { scanned: Boolean(doc), notes: [f.note] }, dept: f.dept, by, at };
    await saveRecord(store, rec, f.bytes);
    written.push(f.id);
  }
  const planId = `plan-v${PLAN.version}`;
  if (store.latest<{ id: string }>('plan_snapshots').some((r) => r.id === planId)) skipped.push(planId);
  else {
    await store.put('plan_snapshots', { id: planId, ...PLAN, decisions: PLAN_DECISIONS, by, at });
    written.push(planId);
  }
  return { written, skipped };
}
