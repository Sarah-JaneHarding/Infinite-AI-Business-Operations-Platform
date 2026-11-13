/**
 * Document library kit: one small vocabulary for writing documents as canonical Docs.
 *
 * House rules (the same as src/departments/templates.ts, and checked by test/library.test.ts):
 * - Every blank is `[Fill in: …]`. Nothing is pre-filled with a rand amount, a date, a person or a legal position.
 * - A document that carries legal or regulatory weight names who must review it, and names the statutes as pointers
 *   for that reviewer, not as advice.
 * - Where a legal choice has to be made, the choice is laid out as options for counsel; this kit never picks one.
 */
import type { Block, Doc } from '../core/types';

export type LibraryKind = 'contract' | 'policy' | 'sop' | 'form' | 'letter' | 'template' | 'checklist' | 'register' | 'workbook' | 'notice' | 'plan';
export type LibraryGroup = 'business' | 'customer';

export interface LibraryItem {
  id: string;
  title: string;
  group: LibraryGroup;
  dept: string;
  kind: LibraryKind;
  summary: string;
  /** Who must review this before it is used. Required for contracts, notices and anything citing a statute. */
  review?: string;
  /** Statutes and instruments named as pointers for the reviewer. */
  law?: string[];
  doc: Doc;
  /** A native spreadsheet to ship alongside the canonical Doc (formulas, validation, totals). */
  workbook?: WorkbookSpec;
}

export interface SheetColumn {
  header: string;
  width?: number;
  type?: 'text' | 'date' | 'number' | 'money' | 'percent' | 'list';
  list?: string[];
  /** Excel formula for rows, `{r}` is replaced by the row number. */
  formula?: string;
  total?: 'sum' | 'count' | 'avg';
}
export interface SheetSpec { name: string; note?: string; columns: SheetColumn[]; rows?: number }
export interface WorkbookSpec { sheets: SheetSpec[]; /** Builds extra sheets that need bespoke formulas. */ custom?: 'pricing' }

export const F = (what: string) => `[Fill in: ${what}]`;
export const h = (text: string, level = 2): Block => ({ type: 'h', level, text });
export const p = (text: string): Block => ({ type: 'p', text });
export const ul = (...items: string[]): Block => ({ type: 'ul', items });
export const ol = (...items: string[]): Block => ({ type: 'ol', items });
export const checks = (...labels: string[]): Block => ({ type: 'checklist', checks: labels.map((label) => ({ label, done: false })) });
export const kv = (...pairs: [string, string][]): Block => ({ type: 'kv', pairs });
export const table = (headers: string[], ...rows: string[][]): Block => ({ type: 'table', headers, rows });
export const note = (text: string, tone: 'info' | 'warn' | 'ok' = 'info'): Block => ({ type: 'callout', tone, text });
export const blank = (n: number, w: number): string[][] => Array.from({ length: n }, () => Array<string>(w).fill(''));
/** A clause: numbered heading, what it must do, and the choice or blank for the reviewer. */
export const clause = (n: string, title: string, must: string, choice?: string | Block): Block[] => [h(`${n}. ${title}`, 3), p(must), ...(choice ? [typeof choice === 'string' ? p(choice) : choice] : [])];
/** Options laid out for counsel to choose between. Never picked here. */
export const options = (label: string, ...opts: string[]): Block => ul(`${label}: choose one.`, ...opts.map((o, i) => `Option ${String.fromCharCode(65 + i)}: ${o}`));

const WEIGHT: LibraryKind[] = ['contract', 'notice'];
const CONTROLLED: LibraryKind[] = ['contract', 'policy', 'sop', 'plan'];

/** Build one library item. Adds the document-control block and the review warning so no document forgets them. */
export function lib(o: Omit<LibraryItem, 'doc' | 'workbook'> & { workbook?: WorkbookSpec }, blocks: Block[], subtitle?: string): LibraryItem {
  const control: Block = CONTROLLED.includes(o.kind)
    ? kv(['Document ID', o.id], ['Version', '1.0 (draft)'], ['Owner (role)', F('role')], ['Approved by (role)', F('role')], ['Effective date', F('date')], ['Next review', F('date')])
    : kv(['Document ID', o.id], ['Version', '1.0 (draft)'], ['Prepared by (role)', F('role')], ['Date', F('date')]);
  const warn: Block[] = o.review
    ? [note(`Needs review by ${o.review} before use. This is a drafting outline, not legal advice and not an approved document.${o.law?.length ? ` The statutes and instruments named are pointers for the reviewer: ${o.law.join('; ')}.` : ''}`, 'warn')]
    : [];
  const meta: Record<string, string> = { 'Library ID': o.id, Kind: o.kind, Version: '1.0', Status: 'DRAFT, not approved for use' };
  const { workbook, ...rest } = o;
  return { ...rest, ...(workbook ? { workbook } : {}), doc: { title: o.title, subtitle, blocks: [...warn, control, ...blocks], meta } };
}

export const needsReview = (i: LibraryItem) => WEIGHT.includes(i.kind) || !!i.law?.length;
