import type { LibraryItem, SheetColumn, SheetSpec } from './kit';
import { SCHOOL_PRICING as P } from '../departments/calc';

const HEAD = 'FF14112B';
const colLetter = (n: number) => { let s = ''; for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };
const FMT: Record<string, string> = { date: 'yyyy-mm-dd', money: '"R" #,##0.00', percent: '0.0%', number: '#,##0' };

type WS = import('exceljs').Worksheet;

function addTableSheet(wb: import('exceljs').Workbook, s: SheetSpec) {
  const ws = wb.addWorksheet(s.name.slice(0, 31));
  let top = 1;
  if (s.note) { ws.addRow([s.note]).font = { italic: true }; ws.addRow([]); top = 3; }
  const hr = ws.addRow(s.columns.map((c) => c.header));
  hr.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  hr.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: HEAD } };
  s.columns.forEach((c, i) => { ws.getColumn(i + 1).width = c.width ?? 20; });
  const n = s.rows ?? 50;
  const first = top + 1;
  for (let r = first; r < first + n; r++) {
    const row = ws.getRow(r + 0);
    s.columns.forEach((c, i) => {
      const cell = row.getCell(i + 1);
      if (c.formula) cell.value = { formula: c.formula.replace(/\{r\}/g, String(r)) };
      if (c.type && FMT[c.type]) cell.numFmt = FMT[c.type];
      if (c.type === 'list' && c.list) cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${c.list.join(',')}"`] };
      if (c.type === 'date') cell.dataValidation = { type: 'date', operator: 'greaterThan', formulae: [new Date(2000, 0, 1)], allowBlank: true };
      if (c.type === 'number' || c.type === 'money' || c.type === 'percent') cell.dataValidation = { type: 'decimal', operator: 'greaterThanOrEqual', formulae: [0], allowBlank: true };
    });
  }
  const totals = s.columns.map((c: SheetColumn, i) => {
    if (!c.total) return '';
    const L = colLetter(i + 1);
    const fn = c.total === 'sum' ? 'SUM' : c.total === 'avg' ? 'AVERAGE' : 'COUNTA';
    return { formula: `${fn}(${L}${first}:${L}${first + n - 1})` };
  });
  if (totals.some((t) => t !== '')) {
    const tr = ws.addRow(totals.map((t, i) => (i === 0 && t === '' ? 'Total' : t)));
    tr.font = { bold: true };
    s.columns.forEach((c, i) => { if (c.type && FMT[c.type]) tr.getCell(i + 1).numFmt = FMT[c.type]; });
  }
  ws.views = [{ state: 'frozen', ySplit: top }];
  ws.autoFilter = { from: { row: top, column: 1 }, to: { row: top, column: s.columns.length } };
  return ws;
}

/** The pricing calculator: every rate sits in an input cell read from SCHOOL_PRICING, and every result is a live formula. */
function addPricing(wb: import('exceljs').Workbook) {
  const ws: WS = wb.addWorksheet('Quote');
  ws.getColumn(1).width = 44; ws.getColumn(2).width = 18; ws.getColumn(3).width = 60;
  const bold = (r: number) => { ws.getRow(r).font = { bold: true }; };
  ws.addRow(['School quote calculator']).font = { bold: true, size: 14 };
  ws.addRow(['Rates are the company’s proposed rates (decision D-1, provisional). Change a rate in the Rates block and every result recalculates. Cells in yellow are inputs.']);
  ws.addRow([]);
  ws.addRow(['Inputs']); bold(4);
  ws.addRow(['School', '']); ws.addRow(['Educators', 0]); ws.addRow(['Learners', 0]); ws.addRow(['Rate type (standard or community)', 'standard']);
  ws.getCell('B8').dataValidation = { type: 'list', allowBlank: false, formulae: ['"standard,community"'] };
  ws.getCell('B6').dataValidation = { type: 'whole', operator: 'greaterThanOrEqual', formulae: [0] };
  ws.getCell('B7').dataValidation = { type: 'whole', operator: 'greaterThanOrEqual', formulae: [0] };
  ['B5', 'B6', 'B7', 'B8'].forEach((a) => { ws.getCell(a).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2B3' } }; });
  ws.addRow([]);
  ws.addRow(['Rates']); bold(10);
  const rates: [string, number, string][] = [
    ['Platform fee per month', P.platformFee, '"R" #,##0.00'], ['Per educator per month', P.perEducator, '"R" #,##0.00'],
    ['Per learner, first tier', P.perLearnerFirst, '"R" #,##0.00'], ['Tier break (learners)', P.tierBreak, '#,##0'],
    ['Per learner above the break', P.perLearnerBeyond, '"R" #,##0.00'], ['Minimum per month', P.minMonthly, '"R" #,##0.00'],
    ['Community rate factor', P.communityFactor, '0%'], ['Annual prepay discount', P.annualDiscount, '0%'], ['VAT rate', P.vat, '0%'],
  ];
  rates.forEach(([l, v, f], i) => { const r = 11 + i; ws.addRow([l, v]); ws.getCell(`B${r}`).numFmt = f; ws.getCell(`B${r}`).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFFFF2B3' } }; });
  // rates: B11 platform, B12 educator, B13 first, B14 break, B15 beyond, B16 min, B17 community, B18 discount, B19 vat
  ws.addRow([]);
  ws.addRow(['Results']); bold(21);
  const M = '"R" #,##0.00';
  const results: [string, string, string, string][] = [
    ['Standard monthly, excluding VAT', 'MAX(B16,B11+B12*B6+B13*MIN(B7,B14)+B15*MAX(0,B7-B14))', M, 'Maximum of the minimum and the built-up price'],
    ['Monthly for this school, excluding VAT', 'IF(B8="community",B22*B17,B22)', M, 'Community rate applies the factor to the standard monthly'],
    ['Monthly VAT', 'B23*B19', M, ''],
    ['Monthly including VAT', 'B23+B24', M, ''],
    ['Annual prepay, excluding VAT', 'B23*12*(1-B18)', M, 'Twelve months less the prepay discount'],
    ['Annual prepay VAT', 'B26*B19', M, ''],
    ['Annual prepay including VAT', 'B26+B27', M, ''],
    ['Price per learner per month, excluding VAT', 'IF(B7=0,"",B23/B7)', M, ''],
  ];
  results.forEach(([l, f, nf, note], i) => { const r = 22 + i; ws.addRow([l, { formula: f }, note]); ws.getCell(`B${r}`).numFmt = nf; });
  ws.addRow([]);
  ws.addRow(['Quote output must carry: the school name, the quote reference, the date, the VAT rate, and the line "Provisional pricing". A figure from this sheet is not an offer until a person approves the quote.']);
}

export async function buildWorkbook(it: LibraryItem): Promise<Uint8Array> {
  const ExcelJS = (await import('exceljs')).default;
  const wb = new ExcelJS.Workbook();
  wb.creator = 'Infinite-AI Ops Platform';
  wb.title = it.title;
  const spec = it.workbook;
  if (spec?.custom === 'pricing') addPricing(wb);
  for (const s of spec?.sheets ?? []) addTableSheet(wb, s);
  const info = wb.addWorksheet('About');
  info.getColumn(1).width = 24; info.getColumn(2).width = 90;
  info.addRow([it.title]).font = { bold: true, size: 14 };
  info.addRow(['Library ID', it.id]); info.addRow(['Version', '1.0 (draft)']); info.addRow(['Status', 'DRAFT, not approved for use']);
  if (it.review) info.addRow(['Review', `Needs review by ${it.review}`]);
  return new Uint8Array(await wb.xlsx.writeBuffer());
}
