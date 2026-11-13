import { F, blank, checks, h, kv, lib, note, ol, p, table, ul, type LibraryItem, type SheetSpec } from './kit';

const VAT = 'VAT Act 89 of 1991';
const TAX = 'a registered tax practitioner or the company’s accountant';

const reg = (name: string, cols: SheetSpec['columns'], noteText?: string): SheetSpec => ({ name, columns: cols, note: noteText, rows: 100 });
const T = (header: string, type?: SheetSpec['columns'][number]['type'], extra: Partial<SheetSpec['columns'][number]> = {}) => ({ header, type, ...extra });

export const FINANCE: LibraryItem[] = [
  lib({ id: 'lib-pricing-calculator', title: 'School Quote Calculator (workbook)', group: 'customer', dept: 'sales', kind: 'workbook', summary: 'Native spreadsheet that works out a school quote with live formulas from the proposed rates.', workbook: { custom: 'pricing', sheets: [] } }, [
    p('This is a spreadsheet. Open the .xlsx file; this page describes it.'),
    ul('Enter the school, educators, learners and rate type.', 'Standard monthly = the larger of the minimum and the built-up price.', 'Community rate applies the community factor.', 'Annual prepay applies the prepay discount to twelve months.', 'VAT is added at the rate in the Rates block.'),
    note('The rates are the company’s proposed pricing, provisional until decision D-1 is final. Change a rate once, in the Rates block, and every result follows.', 'warn'),
  ]),
  lib({ id: 'lib-tax-invoice', title: 'Tax Invoice Template', group: 'customer', dept: 'finance', kind: 'template', summary: 'Invoice layout carrying the particulars a tax invoice needs.', review: TAX, law: [`${VAT} section 20`] }, [
    note('Use this only once the company is registered for VAT (see lib-vat-registration-checklist). Until then issue an invoice without the words “tax invoice” and without VAT. Confirm the required particulars with the tax adviser.', 'warn'),
    kv(['Words “Tax Invoice”', 'Shown prominently, once VAT-registered'], ['Supplier name, address and VAT number', F('details')], ['Customer name, address and VAT number if registered', F('details')], ['Invoice number (sequential)', F('number')], ['Date of issue', F('date')], ['Description, quantity and price of each item', 'See lines'], ['Value excluding VAT, VAT amount, total', 'See totals']),
    table(['Description', 'Quantity', 'Unit price excl. VAT', 'Amount excl. VAT'], ...blank(5, 4)),
    table(['Total excl. VAT', 'VAT', 'Total incl. VAT'], ['', '', '']),
    p(`Payment details: ${F('bank details held by finance; never in this template file if it is shared widely')}. Terms: ${F('payment term')}.`),
  ]),
  lib({ id: 'lib-credit-note', title: 'Credit Note Template', group: 'customer', dept: 'finance', kind: 'template', summary: 'Corrects or cancels an invoice.', review: TAX, law: [`${VAT} section 21`] }, [
    kv(['Credit note number', F('number')], ['Date', F('date')], ['Original invoice number and date', F('reference')], ['Reason', F('reason')]),
    table(['Description', 'Amount excl. VAT', 'VAT', 'Amount incl. VAT'], ...blank(4, 4)),
    p('Credit notes must be approved by ' + F('role') + ' before they are issued.'),
  ]),
  lib({ id: 'lib-statement-of-account', title: 'Statement of Account Template', group: 'customer', dept: 'finance', kind: 'template', summary: 'Periodic statement to a customer.', workbook: undefined }, [
    kv(['Customer', F('name')], ['Statement date', F('date')]),
    table(['Date', 'Document', 'Debit', 'Credit', 'Balance'], ...blank(8, 5)),
    table(['Current', '30 days', '60 days', '90 days and over'], ['', '', '', '']),
  ]),
  lib({ id: 'lib-expense-claim', title: 'Expense Claim Form', group: 'business', dept: 'finance', kind: 'form', summary: 'Staff expense claim with a receipt per line.', workbook: { sheets: [reg('Claim', [T('Date', 'date'), T('Description', 'text', { width: 40 }), T('Category', 'list', { list: ['Travel', 'Subsistence', 'Software', 'Equipment', 'Training', 'Other'] }), T('Amount incl. VAT', 'money', { total: 'sum' }), T('Receipt attached', 'list', { list: ['Yes', 'No'] }), T('Approved by', 'text')])] } }, [
    kv(['Claimant', F('name')], ['Period', F('dates')], ['Approved by (role)', F('role')]),
    table(['Date', 'Description', 'Category', 'Amount', 'Receipt'], ...blank(8, 5)),
    p('No claim is paid without a receipt or a written reason. The approver may not be the claimant.'),
  ]),
  lib({ id: 'lib-purchase-order', title: 'Purchase Order Template', group: 'business', dept: 'procurement', kind: 'template', summary: 'Order to a supplier.', }, [
    kv(['PO number', F('number')], ['Date', F('date')], ['Supplier', F('name and VAT number')], ['Delivery or service date', F('date')], ['Approved by (role)', F('role')]),
    table(['Item', 'Quantity', 'Unit price', 'Total'], ...blank(5, 4)),
  ]),
  lib({ id: 'lib-payment-requisition', title: 'Payment Requisition', group: 'business', dept: 'finance', kind: 'form', summary: 'Request to pay a supplier, with two-person approval.', }, [
    kv(['Supplier', F('name')], ['Invoice number and date', F('reference')], ['Amount', F('from the invoice')], ['Purchase order matched', F('yes or no')], ['Requested by', F('role')], ['Approved by (second person)', F('role')]),
    checks('Invoice is a valid tax invoice', 'Goods or services received', 'Matches the purchase order', 'Bank details confirmed by a second route', 'Two different people approved'),
  ]),
  lib({ id: 'lib-supplier-onboarding', title: 'Supplier Onboarding Form', group: 'business', dept: 'procurement', kind: 'form', summary: 'Details and checks for a new supplier.', law: ['POPIA (Act 4 of 2013)'], review: 'the Information Officer for the data-handling questions' }, [
    table(['', ''], ['Registered name and number', ''], ['VAT number', ''], ['Contact', ''], ['Bank details', 'Collected by finance only'], ['Will the supplier handle personal information?', 'Yes / No'], ['If yes, operator agreement signed', 'Yes / No / Date']),
    checks('Tax compliance confirmed', 'Bank details verified', 'Conflict of interest declared', 'Security questionnaire sent if the supplier touches data'),
  ]),
  lib({ id: 'lib-month-end-sop', title: 'Month-End Close SOP', group: 'business', dept: 'finance', kind: 'sop', summary: 'Steps to close the books each month.', }, [
    ol('Record every invoice and receipt for the month.', 'Reconcile bank and payment-processor statements.', 'Review the debtors and creditors ageing.', 'Post accruals and prepayments.', 'Prepare the VAT workings.', 'Review the profit and loss with the owner.', 'Lock the period and back up the books.'),
    p('Owner: ' + F('role') + '. Due: ' + F('working day')),
    checks('Bank reconciled', 'Processor settlements reconciled', 'Ageing reviewed', 'Accruals posted', 'VAT workings done', 'Period locked'),
  ]),
  lib({ id: 'lib-collections-sop', title: 'Collections SOP', group: 'business', dept: 'finance', kind: 'sop', summary: 'How overdue school accounts are followed up.', }, [
    table(['Stage', 'When', 'Action', 'Template'], ['Reminder', F('days overdue'), 'Friendly email', ''], ['Second notice', F('days overdue'), 'Email and call', ''], ['Escalation', F('days overdue'), F('who decides what next'), ''], ['Suspension', F('days overdue'), 'Only with written approval and notice per the agreement', '']),
    p('A school is never suspended without the notice the agreement requires and a named approver.'),
  ]),
  lib({ id: 'lib-vat-registration-checklist', title: 'VAT Registration Checklist', group: 'business', dept: 'finance', kind: 'checklist', summary: 'Prepares the decision and the registration (decision D-6).', review: TAX, law: [`${VAT} section 23`] }, [
    checks('Turnover to date and expected turnover recorded by the accountant', 'Decision on whether and when to register recorded', 'Registration documents gathered', 'Invoice template updated for tax invoices', 'Pricing and quotes checked for VAT treatment', 'Bookkeeping set up for input and output VAT'),
    p(F('registration date and number, once registered')),
  ]),
  lib({ id: 'lib-budget-workbook', title: 'Operating Budget (workbook)', group: 'business', dept: 'finance', kind: 'workbook', summary: 'Monthly budget with actuals and variance as live formulas.', workbook: { sheets: [{ name: 'Budget', note: 'Enter budget and actual per line per month. Variance and percent are formulas. Amounts are in rand.', rows: 60, columns: [T('Line', 'text', { width: 32 }), T('Type', 'list', { list: ['Income', 'Cost'] }), T('Month', 'text'), T('Budget', 'money', { total: 'sum' }), T('Actual', 'money', { total: 'sum' }), T('Variance', 'money', { formula: 'E{r}-D{r}', total: 'sum', width: 16 }), T('Variance %', 'percent', { formula: 'IF(D{r}=0,"",F{r}/D{r})' })] }] } }, [p('Spreadsheet. Open the .xlsx file.'), ul('One row per line per month.', 'Variance is actual minus budget.')]),
  lib({ id: 'lib-cashflow-13w', title: '13-Week Cash Flow (workbook)', group: 'business', dept: 'finance', kind: 'workbook', summary: 'Rolling 13-week cash forecast.', workbook: { sheets: [{ name: 'Cash flow', rows: 13, note: 'Week 1 opening balance is typed. After that opening = prior closing.', columns: [T('Week starting', 'date'), T('Opening', 'money'), T('Receipts', 'money', { total: 'sum' }), T('Payments', 'money', { total: 'sum' }), T('Closing', 'money', { formula: 'B{r}+C{r}-D{r}' }), T('Notes', 'text', { width: 40 })] }] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-debtors-ageing', title: 'Debtors Ageing (workbook)', group: 'business', dept: 'finance', kind: 'workbook', summary: 'Open invoices by age.', workbook: { sheets: [reg('Ageing', [T('Customer', 'text', { width: 30 }), T('Invoice no.', 'text'), T('Invoice date', 'date'), T('Due date', 'date'), T('Amount', 'money', { total: 'sum' }), T('Paid', 'money', { total: 'sum' }), T('Outstanding', 'money', { formula: 'E{r}-F{r}', total: 'sum' }), T('Days overdue', 'number', { formula: 'IF(OR(D{r}="",G{r}<=0),"",MAX(0,TODAY()-D{r}))' }), T('Bucket', 'text', { formula: 'IF(H{r}="","",IF(H{r}<=0,"Current",IF(H{r}<=30,"1-30",IF(H{r}<=60,"31-60",IF(H{r}<=90,"61-90","90+")))))' })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-invoice-register', title: 'Invoice Register (workbook)', group: 'business', dept: 'finance', kind: 'register', summary: 'Sequential invoice log.', workbook: { sheets: [reg('Invoices', [T('Invoice no.', 'text'), T('Date', 'date'), T('Customer', 'text', { width: 30 }), T('Excl. VAT', 'money', { total: 'sum' }), T('VAT', 'money', { total: 'sum' }), T('Incl. VAT', 'money', { formula: 'D{r}+E{r}', total: 'sum' }), T('Status', 'list', { list: ['Draft', 'Sent', 'Part-paid', 'Paid', 'Credited'] })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-expense-register', title: 'Expense Register (workbook)', group: 'business', dept: 'finance', kind: 'register', summary: 'Expense log for the books.', workbook: { sheets: [reg('Expenses', [T('Date', 'date'), T('Supplier', 'text', { width: 28 }), T('Description', 'text', { width: 36 }), T('Category', 'text'), T('Excl. VAT', 'money', { total: 'sum' }), T('VAT', 'money', { total: 'sum' }), T('Incl. VAT', 'money', { formula: 'E{r}+F{r}', total: 'sum' }), T('Receipt on file', 'list', { list: ['Yes', 'No'] })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-vat-workings', title: 'VAT Workings (workbook)', group: 'business', dept: 'finance', kind: 'workbook', summary: 'Output less input VAT for a period.', review: TAX, law: [VAT], workbook: { sheets: [{ name: 'VAT', rows: 2, note: 'Fill the period totals from the invoice and expense registers. Confirm treatment with the tax adviser.', columns: [T('Period', 'text'), T('Output VAT', 'money'), T('Input VAT', 'money'), T('Payable or refundable', 'money', { formula: 'B{r}-C{r}' })] }] } }, [p('Spreadsheet. Open the .xlsx file.')]),
  lib({ id: 'lib-asset-register', title: 'Asset Register (workbook)', group: 'business', dept: 'finance', kind: 'register', summary: 'Equipment and licences owned.', workbook: { sheets: [reg('Assets', [T('Asset', 'text', { width: 30 }), T('Serial or licence no.', 'text'), T('Bought', 'date'), T('Cost', 'money', { total: 'sum' }), T('Holder', 'text'), T('Location', 'text'), T('Status', 'list', { list: ['In use', 'Spare', 'Disposed'] })])] } }, [p('Spreadsheet. Open the .xlsx file.')]),
];
