/**
 * Builds the document library to disk: library/<dept>/<id>.{docx,html,json,md}, native workbooks as .xlsx,
 * and library/manifest.json with a sha256 for every file. Run: npx tsx scripts/build-library.ts
 */
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { LIBRARY } from '../src/library';
import { toDocx, toHtml, toJson, toMarkdown } from '../src/core/artefacts/render';
import { buildWorkbook } from '../src/library/workbooks';

const OUT = join(process.cwd(), 'library');
const sha = (b: Uint8Array | string) => createHash('sha256').update(b).digest('hex');

async function main() {
  const manifest: unknown[] = [];
  for (const it of LIBRARY) {
    const dir = join(OUT, it.dept);
    mkdirSync(dir, { recursive: true });
    const files: { ext: string; path: string; sha256: string; bytes: number }[] = [];
    const put = (ext: string, data: Uint8Array | string) => {
      const path = `${it.dept}/${it.id}.${ext}`;
      writeFileSync(join(OUT, path), data);
      files.push({ ext, path, sha256: sha(data), bytes: typeof data === 'string' ? Buffer.byteLength(data) : data.byteLength });
    };
    put('html', toHtml(it.doc));
    put('md', toMarkdown(it.doc));
    put('json', toJson(it.doc));
    put('docx', await toDocx(it.doc));
    if (it.workbook) put('xlsx', await buildWorkbook(it));
    manifest.push({ id: it.id, title: it.title, group: it.group, dept: it.dept, kind: it.kind, review: it.review ?? null, law: it.law ?? [], files });
  }
  writeFileSync(join(OUT, 'manifest.json'), JSON.stringify({ count: LIBRARY.length, items: manifest }, null, 2));
  console.log(`library: ${LIBRARY.length} documents`);
}
main();
