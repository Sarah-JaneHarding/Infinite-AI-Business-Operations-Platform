/**
 * Document library: create, import and store documents in any format.
 *
 * - Anything can be uploaded (up to MAX_UPLOAD_BYTES). Text-like formats, Word and Excel are read into the
 *   platform's canonical `Doc` so they can be edited and re-exported in any other format. PDFs and other binaries
 *   are stored as-is and cannot be previewed or scanned, and the library says so.
 * - Every readable file goes through the same input gate as agent input: learner identifiers and prompt injection
 *   refuse the upload. Other personal details (email, phone, titles) are allowed but flagged.
 * - Files are stored in the warehouse: one `documents` record per file plus `document_chunks` records holding
 *   the original bytes as base64 pieces that fit the server's per-record limit.
 */
import type { Block, Doc } from './types';
import { checkInput } from './guardrails/engine';
import { detectPii } from './guardrails/pii';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
/** Characters of base64 per chunk record. The server caps a record at 256 KiB of JSON. */
export const CHUNK_CHARS = 120_000;
/** The editable view is kept only if it fits in one record. */
export const MAX_DOC_JSON = 200_000;

export type FileKind = 'markdown' | 'text' | 'csv' | 'json' | 'html' | 'docx' | 'xlsx' | 'pdf' | 'image' | 'other';

export interface DocRecord {
  id: string;
  title: string;
  origin: 'created' | 'uploaded' | 'template' | 'saved';
  name?: string;
  mime?: string;
  size?: number;
  kind?: FileKind;
  doc?: Doc;
  chunks?: number;
  scan: { scanned: boolean; notes: string[] };
  dept?: string;
  by: string;
  at: string;
  deleted?: boolean;
}

export const extOf = (name: string) => (name.split('.').pop() ?? '').toLowerCase();

export function kindOf(name: string, mime = ''): FileKind {
  const e = extOf(name);
  if (['md', 'markdown'].includes(e)) return 'markdown';
  if (['txt', 'log', 'rtf', 'yaml', 'yml', 'xml', 'ini', 'tex'].includes(e) || mime === 'text/plain') return 'text';
  if (['csv', 'tsv'].includes(e) || mime === 'text/csv') return 'csv';
  if (e === 'json' || mime === 'application/json') return 'json';
  if (['html', 'htm'].includes(e) || mime === 'text/html') return 'html';
  if (e === 'docx') return 'docx';
  if (['xlsx'].includes(e)) return 'xlsx';
  if (e === 'pdf' || mime === 'application/pdf') return 'pdf';
  if (mime.startsWith('image/') || ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'].includes(e)) return 'image';
  return 'other';
}

const decodeText = (b: Uint8Array) => new TextDecoder('utf-8', { fatal: false }).decode(b).replace(/^﻿/, '');

// ---------- text → Doc ----------

const cells = (line: string) => line.trim().replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
const isRule = (line: string) => /^\s*\|?\s*:?-{2,}:?\s*(\|\s*:?-{2,}:?\s*)*\|?\s*$/.test(line);

export function markdownToDoc(title: string, md: string): Doc {
  const blocks: Block[] = [];
  const L = md.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  let docTitle = title;
  while (i < L.length) {
    const line = L[i];
    if (!line.trim()) { i++; continue; }
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      if (h[1].length === 1 && !blocks.length) docTitle = h[2].trim() || title;
      else blocks.push({ type: 'h', level: Math.min(3, h[1].length), text: h[2].trim() });
      i++; continue;
    }
    if (/^\s*[-*]\s+\[[ xX]\]\s+/.test(line)) {
      const checks: { label: string; done: boolean }[] = [];
      while (i < L.length && /^\s*[-*]\s+\[[ xX]\]\s+/.test(L[i])) { const m = /^\s*[-*]\s+\[([ xX])\]\s+(.*)$/.exec(L[i])!; checks.push({ label: m[2], done: m[1] !== ' ' }); i++; }
      blocks.push({ type: 'checklist', checks }); continue;
    }
    if (/^\s*[-*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < L.length && /^\s*[-*]\s+/.test(L[i])) { items.push(L[i].replace(/^\s*[-*]\s+/, '')); i++; }
      blocks.push({ type: 'ul', items }); continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items: string[] = [];
      while (i < L.length && /^\s*\d+[.)]\s+/.test(L[i])) { items.push(L[i].replace(/^\s*\d+[.)]\s+/, '')); i++; }
      blocks.push({ type: 'ol', items }); continue;
    }
    if (line.includes('|') && i + 1 < L.length && isRule(L[i + 1])) {
      const headers = cells(line); i += 2;
      const rows: string[][] = [];
      while (i < L.length && L[i].includes('|') && L[i].trim()) { const r = cells(L[i]); while (r.length < headers.length) r.push(''); rows.push(r.slice(0, headers.length)); i++; }
      blocks.push({ type: 'table', headers, rows }); continue;
    }
    if (/^>\s?/.test(line)) {
      const t: string[] = [];
      while (i < L.length && /^>\s?/.test(L[i])) { t.push(L[i].replace(/^>\s?/, '')); i++; }
      blocks.push({ type: 'callout', tone: 'info', text: t.join(' ') }); continue;
    }
    const para: string[] = [];
    while (i < L.length && L[i].trim() && !/^(#{1,6}\s|\s*[-*]\s|\s*\d+[.)]\s|>)/.test(L[i]) && !(L[i].includes('|') && i + 1 < L.length && isRule(L[i + 1]))) { para.push(L[i].trim()); i++; }
    blocks.push({ type: 'p', text: para.join(' ') });
  }
  return { title: docTitle, blocks, meta: {} };
}

export function textToDoc(title: string, text: string): Doc {
  const blocks: Block[] = text.replace(/\r\n?/g, '\n').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean).map((p) => ({ type: 'p' as const, text: p.replace(/\n/g, ' ') }));
  return { title, blocks: blocks.length ? blocks : [{ type: 'p', text: '' }], meta: {} };
}

/** RFC 4180-style CSV/TSV parser (quoted fields, doubled quotes, embedded newlines). */
export function parseCsv(text: string, delim = ','): string[][] {
  const out: string[][] = [];
  let row: string[] = [], f = '', q = false;
  const s = text.replace(/^﻿/, '');
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (q) {
      if (ch === '"') { if (s[i + 1] === '"') { f += '"'; i++; } else q = false; } else f += ch;
    } else if (ch === '"') q = true;
    else if (ch === delim) { row.push(f); f = ''; }
    else if (ch === '\n' || ch === '\r') { if (ch === '\r' && s[i + 1] === '\n') i++; row.push(f); f = ''; if (row.some((c) => c !== '') || row.length > 1) out.push(row); row = []; }
    else f += ch;
  }
  if (f !== '' || row.length) { row.push(f); out.push(row); }
  return out;
}

export function csvToDoc(title: string, csv: string, delim = ','): Doc {
  const r = parseCsv(csv, delim);
  if (!r.length) return { title, blocks: [{ type: 'p', text: '' }], meta: {} };
  const width = Math.max(...r.map((x) => x.length));
  const pad = (x: string[]) => [...x, ...Array(width - x.length).fill('')];
  return { title, blocks: [{ type: 'table', headers: pad(r[0]), rows: r.slice(1).map(pad) }], meta: {} };
}

export function jsonToDoc(title: string, text: string): Doc {
  let v: unknown;
  try { v = JSON.parse(text); } catch { return textToDoc(title, text); }
  if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object' && !Array.isArray(x))) {
    const headers = [...new Set(v.flatMap((o) => Object.keys(o as object)))];
    return { title, blocks: [{ type: 'table', headers, rows: v.map((o) => headers.map((h) => { const c = (o as Record<string, unknown>)[h]; return typeof c === 'object' && c !== null ? JSON.stringify(c) : String(c ?? ''); })) }], meta: {} };
  }
  if (v && typeof v === 'object' && !Array.isArray(v) && Object.values(v).every((x) => typeof x !== 'object' || x === null)) {
    return { title, blocks: [{ type: 'kv', pairs: Object.entries(v).map(([k, x]) => [k, String(x ?? '')] as [string, string]) }], meta: {} };
  }
  return { title, blocks: [{ type: 'p', text: JSON.stringify(v, null, 2) }], meta: {} };
}

const unent = (s: string) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const plain = (s: string) => unent(s.replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();

export function htmlToDoc(title: string, html: string): Doc {
  const clean = html.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '');
  const t = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html);
  const blocks: Block[] = [];
  const re = /<(h[1-6]|p|li|table|pre|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi;
  let m: RegExpExecArray | null;
  const lis: string[] = [];
  const flush = () => { if (lis.length) { blocks.push({ type: 'ul', items: [...lis] }); lis.length = 0; } };
  while ((m = re.exec(clean))) {
    const tag = m[1].toLowerCase();
    if (tag === 'li') { lis.push(plain(m[2])); continue; }
    flush();
    if (tag === 'table') {
      const trs = [...m[2].matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((r) => [...r[1].matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((c) => plain(c[1])));
      if (trs.length) { const w = Math.max(...trs.map((r) => r.length)); const pad = (r: string[]) => [...r, ...Array(w - r.length).fill('')]; blocks.push({ type: 'table', headers: pad(trs[0]), rows: trs.slice(1).map(pad) }); }
    } else if (tag[0] === 'h') { const x = plain(m[2]); if (x) blocks.push({ type: 'h', level: Math.min(3, Number(tag[1])), text: x }); }
    else { const x = plain(m[2]); if (x) blocks.push(tag === 'blockquote' ? { type: 'callout', tone: 'info', text: x } : { type: 'p', text: x }); }
  }
  flush();
  return { title: (t ? plain(t[1]) : '') || title, blocks: blocks.length ? blocks : [{ type: 'p', text: plain(clean) }], meta: {} };
}

// ---------- zip (for docx) ----------

async function inflateRaw(data: Uint8Array): Promise<Uint8Array> {
  const ds = new DecompressionStream('deflate-raw');
  const stream = new Blob([data as BlobPart]).stream().pipeThrough(ds);
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

/** Read named entries from a zip archive. Supports stored and deflate entries. */
export async function unzip(bytes: Uint8Array, want: (name: string) => boolean): Promise<Record<string, Uint8Array>> {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let eocd = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('Not a zip archive');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const out: Record<string, Uint8Array> = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('Corrupt zip directory');
    const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true), nlen = dv.getUint16(p + 28, true), xlen = dv.getUint16(p + 30, true), clen = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(bytes.subarray(p + 46, p + 46 + nlen));
    p += 46 + nlen + xlen + clen;
    if (!want(name)) continue;
    const lnlen = dv.getUint16(off + 26, true), lxlen = dv.getUint16(off + 28, true);
    const data = bytes.subarray(off + 30 + lnlen + lxlen, off + 30 + lnlen + lxlen + csize);
    out[name] = method === 0 ? data : method === 8 ? await inflateRaw(data) : (() => { throw new Error(`Unsupported zip method ${method}`); })();
  }
  return out;
}

export async function docxToDoc(title: string, bytes: Uint8Array): Promise<Doc> {
  const files = await unzip(bytes, (n) => n === 'word/document.xml');
  const xml = files['word/document.xml'];
  if (!xml) throw new Error('No word/document.xml in this file');
  const s = decodeText(xml);
  const blocks: Block[] = [];
  const body = s.replace(/<w:tbl>[\s\S]*?<\/w:tbl>/g, (tbl) => {
    const rows = [...tbl.matchAll(/<w:tr[ >][\s\S]*?<\/w:tr>/g)].map((r) => [...r[0].matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((c) => plain([...c[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join('')) ));
    if (rows.length) { const w = Math.max(...rows.map((r) => r.length)); const pad = (r: string[]) => [...r, ...Array(w - r.length).fill('')]; return `\u0001TABLE${JSON.stringify({ headers: pad(rows[0]), rows: rows.slice(1).map(pad) })}\u0002`; }
    return '';
  });
  let docTitle = title;
  for (const part of body.split(/(\u0001TABLE[\s\S]*?\u0002)/)) {
    if (part.startsWith('\u0001TABLE')) { const t = JSON.parse(part.slice(6, -1)); blocks.push({ type: 'table', headers: t.headers, rows: t.rows }); continue; }
    for (const para of part.matchAll(/<w:p[ >][\s\S]*?<\/w:p>/g)) {
      const text = plain([...para[0].matchAll(/<w:t[^>]*>([\s\S]*?)<\/w:t>/g)].map((t) => t[1]).join(''));
      if (!text) continue;
      const style = /<w:pStyle w:val="([^"]+)"/.exec(para[0])?.[1] ?? '';
      const lvl = /^Heading(\d)$/i.exec(style);
      if (/^Title$/i.test(style) && !blocks.length) docTitle = text;
      else if (lvl) blocks.push({ type: 'h', level: Math.min(3, Number(lvl[1])), text });
      else if (/<w:numPr>/.test(para[0])) { const last = blocks[blocks.length - 1]; if (last?.type === 'ul') last.items!.push(text); else blocks.push({ type: 'ul', items: [text] }); }
      else blocks.push({ type: 'p', text });
    }
  }
  return { title: docTitle, blocks: blocks.length ? blocks : [{ type: 'p', text: '' }], meta: {} };
}

export async function xlsxToDoc(title: string, bytes: Uint8Array): Promise<Doc> {
  const { default: ExcelJS } = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(bytes as unknown as ArrayBuffer);
  const blocks: Block[] = [];
  wb.eachSheet((ws) => {
    const rows: string[][] = [];
    ws.eachRow({ includeEmpty: false }, (row) => {
      const vals = (row.values as unknown[]).slice(1).map((c) => {
        if (c === null || c === undefined) return '';
        if (typeof c === 'object') { const o = c as { text?: string; result?: unknown; richText?: { text: string }[] }; return String(o.text ?? o.result ?? o.richText?.map((r) => r.text).join('') ?? ''); }
        return String(c);
      });
      rows.push(vals);
    });
    if (wb.worksheets.length > 1) blocks.push({ type: 'h', level: 2, text: ws.name });
    if (rows.length) { const w = Math.max(...rows.map((r) => r.length)); const pad = (r: string[]) => [...r, ...Array(w - r.length).fill('')]; blocks.push({ type: 'table', headers: pad(rows[0]), rows: rows.slice(1).map(pad) }); }
  });
  return { title, blocks: blocks.length ? blocks : [{ type: 'p', text: '' }], meta: {} };
}

// ---------- import ----------

export interface Imported { kind: FileKind; doc?: Doc; text?: string; notes: string[] }
export class UploadRefused extends Error {
  constructor(message: string, public readonly why: 'size' | 'learner_data' | 'injection' | 'empty') { super(message); }
}

/** All the text in a Doc, for scanning. */
export const docText = (d: Doc): string => [d.title, d.subtitle ?? '', ...d.blocks.flatMap((b) => [b.text ?? '', ...(b.items ?? []), ...(b.headers ?? []), ...(b.rows ?? []).flat().map(String), ...(b.pairs ?? []).flat(), ...(b.checks ?? []).map((c) => c.label)])].join('\n');

export async function importFile(name: string, mime: string, bytes: Uint8Array): Promise<Imported> {
  if (!bytes.length) throw new UploadRefused('The file is empty.', 'empty');
  if (bytes.length > MAX_UPLOAD_BYTES) throw new UploadRefused(`The file is ${(bytes.length / 1048576).toFixed(1)} MB. The limit is ${MAX_UPLOAD_BYTES / 1048576} MB.`, 'size');
  const kind = kindOf(name, mime);
  const title = name.replace(/\.[^.]+$/, '');
  const notes: string[] = [];
  let doc: Doc | undefined;
  let text: string | undefined;
  try {
    switch (kind) {
      case 'markdown': text = decodeText(bytes); doc = markdownToDoc(title, text); break;
      case 'text': text = decodeText(bytes); doc = textToDoc(title, text); break;
      case 'csv': text = decodeText(bytes); doc = csvToDoc(title, text, extOf(name) === 'tsv' ? '\t' : ','); break;
      case 'json': text = decodeText(bytes); doc = jsonToDoc(title, text); break;
      case 'html': text = decodeText(bytes); doc = htmlToDoc(title, text); break;
      case 'docx': doc = await docxToDoc(title, bytes); break;
      case 'xlsx': doc = await xlsxToDoc(title, bytes); break;
      case 'pdf': notes.push('PDF stored as it is. Its text cannot be read, scanned or edited here. Do not upload a PDF that contains learner or personal data.'); break;
      case 'image': notes.push('Image stored as it is. It cannot be scanned. Do not upload images of learners.'); break;
      default: notes.push('This format is stored as it is. Its content cannot be read or scanned here. Do not upload anything that contains learner or personal data.');
    }
  } catch (e) {
    notes.push(`The file could not be read as ${kind} (${(e as Error).message}). It is stored as it is and not scanned.`);
    doc = undefined;
  }
  if (doc) {
    const scanText = text ?? docText(doc);
    const verdict = checkInput(scanText, []);
    if (!verdict.ok) {
      if (verdict.refusal === 'learner_data') throw new UploadRefused('This file contains learner identifiers (such as an ID number or learner number). Learner data is never admitted to the platform.', 'learner_data');
      throw new UploadRefused('This file contains text that looks like instructions aimed at an AI (prompt injection), so it was not accepted.', 'injection');
    }
    const kinds = [...new Set(detectPii(scanText).map((f) => f.kind))];
    if (kinds.length) notes.push(`Contains personal details (${kinds.join(', ')}). Allowed, but keep it to business contacts.`);
    if (JSON.stringify(doc).length > MAX_DOC_JSON) { notes.push('Too large to edit here. The original file is stored and can be downloaded.'); doc = undefined; }
  }
  return { kind, doc, text, notes };
}

// ---------- storage ----------

export const toBase64 = (b: Uint8Array): string => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
export const fromBase64 = (s: string): Uint8Array => { const bin = atob(s); const out = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i); return out; };
export const chunkBase64 = (b64: string): string[] => { const out: string[] = []; for (let i = 0; i < b64.length; i += CHUNK_CHARS) out.push(b64.slice(i, i + CHUNK_CHARS)); return out.length ? out : ['']; };

/** Minimal slice of the Warehouse the library needs, so it can be tested without the UI. */
export interface Store {
  put(collection: string, rec: Record<string, unknown> & { id: string }): Promise<unknown>;
  latest<T>(collection: string, key?: string): T[];
  list<T>(collection: string, where?: (r: Record<string, unknown> & { id: string }) => boolean): T[];
}
export const newDocId = () => `doc-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

export async function saveRecord(store: Store, rec: DocRecord, original?: Uint8Array): Promise<DocRecord> {
  if (original) {
    const parts = chunkBase64(toBase64(original));
    for (let i = 0; i < parts.length; i++) await store.put('document_chunks', { id: `${rec.id}:${i}`, doc: rec.id, i, data: parts[i] });
    rec = { ...rec, chunks: parts.length, size: original.length };
  }
  await store.put('documents', rec as unknown as Record<string, unknown> & { id: string });
  return rec;
}

export async function uploadFile(store: Store, file: { name: string; type: string; bytes: Uint8Array }, by: string, dept?: string): Promise<DocRecord> {
  const imp = await importFile(file.name, file.type, file.bytes);
  const rec: DocRecord = { id: newDocId(), title: imp.doc?.title ?? file.name.replace(/\.[^.]+$/, ''), origin: 'uploaded', name: file.name, mime: file.type || 'application/octet-stream', kind: imp.kind, doc: imp.doc, scan: { scanned: Boolean(imp.doc), notes: imp.notes }, dept, by, at: new Date().toISOString() };
  return saveRecord(store, rec, file.bytes);
}

export function loadOriginal(store: Store, id: string): Uint8Array | null {
  const parts = store.list<{ doc: string; i: number; data: string }>('document_chunks', (r) => r['doc'] === id);
  if (!parts.length) return null;
  const latest = new Map<number, string>();
  for (const p of parts) latest.set(p.i, p.data);
  const ordered = [...latest.entries()].sort((a, b) => a[0] - b[0]).map((x) => x[1]).join('');
  return fromBase64(ordered);
}

export const listDocuments = (store: Store): DocRecord[] => store.latest<DocRecord>('documents').filter((d) => !d.deleted).sort((a, b) => b.at.localeCompare(a.at));
