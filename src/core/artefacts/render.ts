import type { ArtefactFormat, Block, Doc } from '../types';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const cell = (c: string | number) => String(c);

export function toMarkdown(d: Doc): string {
  const out: string[] = [`# ${d.title}`];
  if (d.subtitle) out.push(`_${d.subtitle}_`);
  for (const b of d.blocks) {
    switch (b.type) {
      case 'h': out.push(`${'#'.repeat(Math.min(6, (b.level ?? 2) + 0))} ${b.text}`); break;
      case 'p': out.push(b.text ?? ''); break;
      case 'ul': out.push((b.items ?? []).map((i) => `- ${i}`).join('\n')); break;
      case 'ol': out.push((b.items ?? []).map((i, n) => `${n + 1}. ${i}`).join('\n')); break;
      case 'checklist': out.push((b.checks ?? []).map((c) => `- [${c.done ? 'x' : ' '}] ${c.label}`).join('\n')); break;
      case 'callout': out.push(`> **${(b.tone ?? 'info').toUpperCase()}** ${b.text}`); break;
      case 'kv': out.push((b.pairs ?? []).map(([k, v]) => `- **${k}:** ${v}`).join('\n')); break;
      case 'table': {
        const h = b.headers ?? [];
        out.push([`| ${h.join(' | ')} |`, `| ${h.map(() => '---').join(' | ')} |`, ...(b.rows ?? []).map((r) => `| ${r.map(cell).join(' | ')} |`)].join('\n'));
        break;
      }
    }
  }
  const meta = Object.entries(d.meta);
  if (meta.length) out.push('---\n' + meta.map(([k, v]) => `*${k}:* ${v}`).join(' · '));
  return out.join('\n\n') + '\n';
}

function blockHtml(b: Block): string {
  switch (b.type) {
    case 'h': return `<h${Math.min(4, (b.level ?? 2) + 1)}>${esc(b.text ?? '')}</h${Math.min(4, (b.level ?? 2) + 1)}>`;
    case 'p': return `<p>${esc(b.text ?? '').replace(/\n/g, '<br>')}</p>`;
    case 'ul': return `<ul>${(b.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>`;
    case 'ol': return `<ol>${(b.items ?? []).map((i) => `<li>${esc(i)}</li>`).join('')}</ol>`;
    case 'checklist': return `<ul class="chk">${(b.checks ?? []).map((c) => `<li>${c.done ? '☑' : '☐'} ${esc(c.label)}</li>`).join('')}</ul>`;
    case 'callout': return `<div class="callout ${b.tone ?? 'info'}">${esc(b.text ?? '')}</div>`;
    case 'kv': return `<dl>${(b.pairs ?? []).map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}</dl>`;
    case 'table': return `<table><thead><tr>${(b.headers ?? []).map((h) => `<th>${esc(h)}</th>`).join('')}</tr></thead><tbody>${(b.rows ?? []).map((r) => `<tr>${r.map((c) => `<td>${esc(cell(c))}</td>`).join('')}</tr>`).join('')}</tbody></table>`;
  }
}

/** Standalone, print-ready HTML (Infinite-AI branding). "Save as PDF" in the print dialog gives the PDF. */
export function toHtml(d: Doc): string {
  const meta = Object.entries(d.meta).map(([k, v]) => `<span><b>${esc(k)}</b> ${esc(v)}</span>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${esc(d.title)}</title><meta name="viewport" content="width=device-width,initial-scale=1"><style>
:root{--ink:#14112b;--violet:#6d4aff;--amber:#f5a524;--emerald:#12a870;--rose:#e5484d;--cyan:#12a4c7;--cream:#fbf8f1}
body{font:16px/1.6 Inter,system-ui,sans-serif;color:var(--ink);background:var(--cream);max-width:860px;margin:0 auto;padding:40px 24px}
h1,h2,h3,h4{font-family:'Space Grotesk',Inter,sans-serif;line-height:1.2}h1{font-size:2rem;border-bottom:4px solid var(--violet);padding-bottom:.4rem}
table{border-collapse:collapse;width:100%;margin:1rem 0;font-size:.92rem}th{background:var(--ink);color:#fff;text-align:left}th,td{border:1px solid #d9d3c3;padding:6px 10px;vertical-align:top}tr:nth-child(even) td{background:#f3eee0}
.callout{border-left:5px solid var(--cyan);background:#e8f6fa;padding:10px 14px;margin:1rem 0}.callout.warn{border-color:var(--amber);background:#fdf3dc}.callout.ok{border-color:var(--emerald);background:#e2f6ee}
dl{display:grid;grid-template-columns:minmax(150px,36%) 1fr;gap:4px 16px}dt{font-weight:600}dd{margin:0}.chk{list-style:none;padding-left:0}
.meta{font:12px 'Space Mono',monospace;color:#55507a;display:flex;flex-wrap:wrap;gap:4px 14px;border-top:1px solid #d9d3c3;margin-top:2rem;padding-top:.6rem}
.draft{display:inline-block;background:var(--amber);color:var(--ink);font:700 11px 'Space Mono',monospace;padding:2px 8px;border-radius:99px;letter-spacing:.06em}
@media print{body{background:#fff;padding:0}}
</style></head><body><span class="draft">AI DRAFT · THE HUMAN DECIDES</span><h1>${esc(d.title)}</h1>${d.subtitle ? `<p><i>${esc(d.subtitle)}</i></p>` : ''}${d.blocks.map(blockHtml).join('\n')}<div class="meta">${meta}</div></body></html>`;
}

function csvEscape(v: string | number): string {
  let s = String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s; // neutralise spreadsheet formula injection
  return /[",\n\r]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}
/** Every table in the document, stacked with a title row, as one CSV. */
export function toCsv(d: Doc): string {
  const tables = d.blocks.filter((b) => b.type === 'table');
  if (!tables.length) {
    const rows = d.blocks.flatMap((b) => (b.type === 'kv' ? (b.pairs ?? []).map(([k, v]) => [k, v]) : b.type === 'ul' || b.type === 'ol' ? (b.items ?? []).map((i) => ['', i]) : b.text ? [['', b.text]] : []));
    return ['Field,Value', ...rows.map((r) => r.map(csvEscape).join(','))].join('\r\n') + '\r\n';
  }
  return tables.map((t, i) => [`${csvEscape(`Table ${i + 1}`)}`, (t.headers ?? []).map(csvEscape).join(','), ...(t.rows ?? []).map((r) => r.map(csvEscape).join(','))].join('\r\n')).join('\r\n\r\n') + '\r\n';
}

export function toJson(d: Doc): string {
  return JSON.stringify(d, null, 2) + '\n';
}

export async function toDocx(d: Doc): Promise<Uint8Array> {
  const docx = await import('docx');
  const { Document, Packer, Paragraph, HeadingLevel, TextRun, Table, TableRow, TableCell, WidthType } = docx;
  const H = [HeadingLevel.HEADING_1, HeadingLevel.HEADING_2, HeadingLevel.HEADING_3, HeadingLevel.HEADING_4];
  const children: (InstanceType<typeof Paragraph> | InstanceType<typeof Table>)[] = [new Paragraph({ text: d.title, heading: HeadingLevel.TITLE })];
  if (d.subtitle) children.push(new Paragraph({ children: [new TextRun({ text: d.subtitle, italics: true })] }));
  const para = (t: string, extra: Partial<ConstructorParameters<typeof Paragraph>[0] & object> = {}) => new Paragraph({ text: t, ...extra });
  for (const b of d.blocks) {
    if (b.type === 'h') children.push(para(b.text ?? '', { heading: H[Math.min(3, b.level ?? 1)] }));
    else if (b.type === 'p') children.push(para(b.text ?? ''));
    else if (b.type === 'callout') children.push(new Paragraph({ children: [new TextRun({ text: `${(b.tone ?? 'info').toUpperCase()}: `, bold: true }), new TextRun(b.text ?? '')] }));
    else if (b.type === 'ul') (b.items ?? []).forEach((i) => children.push(para(i, { bullet: { level: 0 } })));
    else if (b.type === 'ol') (b.items ?? []).forEach((i, n) => children.push(para(`${n + 1}. ${i}`)));
    else if (b.type === 'checklist') (b.checks ?? []).forEach((c) => children.push(para(`${c.done ? '☑' : '☐'} ${c.label}`)));
    else if (b.type === 'kv') (b.pairs ?? []).forEach(([k, v]) => children.push(new Paragraph({ children: [new TextRun({ text: `${k}: `, bold: true }), new TextRun(v)] })));
    else if (b.type === 'table') {
      const mk = (cells: (string | number)[], bold = false) => new TableRow({ children: cells.map((c) => new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: String(c), bold })] })] })) });
      children.push(new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows: [mk(b.headers ?? [], true), ...(b.rows ?? []).map((r) => mk(r))] }));
      children.push(para(''));
    }
  }
  children.push(new Paragraph({ children: [new TextRun({ text: Object.entries(d.meta).map(([k, v]) => `${k}: ${v}`).join(' · '), size: 16, color: '555077' })] }));
  const file = new Document({ creator: 'Infinite-AI Ops Platform', title: d.title, sections: [{ children }] });
  // Browsers have no Buffer; Node (tests, server) does.
  if (typeof Buffer === 'undefined') return new Uint8Array(await (await Packer.toBlob(file)).arrayBuffer());
  return new Uint8Array(await Packer.toBuffer(file));
}

export async function toXlsx(d: Doc): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Infinite-AI Ops Platform';
  const sum = wb.addWorksheet('Summary');
  sum.addRow([d.title]).font = { bold: true, size: 14 };
  if (d.subtitle) sum.addRow([d.subtitle]);
  sum.addRow([]);
  for (const b of d.blocks) {
    if (b.type === 'kv') (b.pairs ?? []).forEach(([k, v]) => sum.addRow([k, v]));
    else if (b.type === 'p' || b.type === 'callout') sum.addRow([b.text ?? '']);
    else if (b.type === 'h') sum.addRow([b.text ?? '']).font = { bold: true };
    else if (b.type === 'ul' || b.type === 'ol') (b.items ?? []).forEach((i) => sum.addRow(['•', i]));
    else if (b.type === 'checklist') (b.checks ?? []).forEach((c) => sum.addRow([c.done ? '☑' : '☐', c.label]));
  }
  sum.getColumn(1).width = 34;
  sum.getColumn(2).width = 80;
  Object.entries(d.meta).forEach(([k, v]) => sum.addRow([k, v]));
  let n = 0;
  for (const b of d.blocks.filter((x) => x.type === 'table')) {
    n++;
    const ws = wb.addWorksheet(`Table ${n}`);
    const hr = ws.addRow(b.headers ?? []);
    hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF14112B' } };
    (b.rows ?? []).forEach((r) => ws.addRow(r.map((c) => (typeof c === 'string' && /^[=+\-@]/.test(c) ? "'" + c : c))));
    ws.columns.forEach((c) => (c.width = 22));
    ws.views = [{ state: 'frozen', ySplit: 1 }];
  }
  return new Uint8Array(await wb.xlsx.writeBuffer());
}

export const MIME: Record<ArtefactFormat, string> = {
  md: 'text/markdown', html: 'text/html', pdf: 'text/html', csv: 'text/csv', json: 'application/json',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};
export const EXT: Record<ArtefactFormat, string> = { md: 'md', html: 'html', pdf: 'html', csv: 'csv', json: 'json', docx: 'docx', xlsx: 'xlsx' };

export async function render(d: Doc, f: ArtefactFormat): Promise<string | Uint8Array> {
  switch (f) {
    case 'md': return toMarkdown(d);
    case 'html': case 'pdf': return toHtml(d);
    case 'csv': return toCsv(d);
    case 'json': return toJson(d);
    case 'docx': return toDocx(d);
    case 'xlsx': return toXlsx(d);
  }
}

export function fileName(d: Doc, f: ArtefactFormat): string {
  return `${d.title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 60) || 'artefact'}.${EXT[f]}`;
}
