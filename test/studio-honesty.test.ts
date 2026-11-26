import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { countRatified } from '../src/core/documents';

const read = (p: string) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8');

describe('countRatified', () => {
  it('is 0 for nothing', () => { expect(countRatified([])).toBe(0); });
  it('counts only RATIFIED and INGESTED', () => {
    expect(countRatified([{ status: 'DRAFT' }, { status: 'IN_REVIEW' }, { status: 'APPROVED' }, { status: 'REJECTED' }, { status: 'RATIFIED' }, { status: 'INGESTED' }, { status: 'RATIFIED' }])).toBe(3);
  });
});

describe('the studio shows no invented numbers or people', () => {
  const studio = read('src/ui/DocumentStudio.tsx');
  const legacy = read('legacy/components/DocsAndRatify.tsx');
  it('DocumentStudio has no 136, no starting 58 and no ledger ratify entry', () => {
    expect(studio).not.toMatch(/136/);
    expect(studio).not.toMatch(/useState<number>\(58\)/);
    expect(studio).not.toMatch(/document\.ratify/);
    expect(studio).toMatch(/countRatified\(/);
  });
  it('DocsAndRatify has no 136, no default of 42 and no hard-coded signer', () => {
    expect(legacy).not.toMatch(/\b136\b/);
    expect(legacy).not.toMatch(/ratifiedCount = 42/);
    for (const person of ['Sarah-Jane Harding', 'Peter Thorne', 'Van Zyl']) expect(legacy).not.toContain(person);
    expect(legacy).toMatch(/signerName/);
  });
  it('the legacy ratify button no longer marks a document ratified by itself', () => {
    expect(legacy).not.toMatch(/status: 'RATIFIED' as const/);
    expect(legacy).not.toMatch(/ia_warehouse_audit_log/);
  });
});
