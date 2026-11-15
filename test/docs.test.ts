import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const read = (p: string): string => readFileSync(p, 'utf8');

describe('documentation and repository policy files', () => {
  it('.env.example names the signing keys with empty values', () => {
    const env = read('.env.example');
    for (const key of ['OPS_SIGNERS', 'OPS_SIGNING_MODE', 'OPS_SOLO_WAIT_MINUTES']) {
      expect(env).toMatch(new RegExp(`^${key}=$`, 'm'));
    }
  });
  it('CODEOWNERS exists and names the owner', () => {
    expect(existsSync('.github/CODEOWNERS')).toBe(true);
    expect(read('.github/CODEOWNERS')).toContain('@Sarah-JaneHarding');
  });
  it('PR_POLICY.md exists and requires draft pull requests', () => {
    expect(existsSync('docs/PR_POLICY.md')).toBe(true);
    expect(read('docs/PR_POLICY.md')).toMatch(/draft/i);
  });
  it('REVIEW_BOARD.md documents solo signing, two-person and professional review', () => {
    const doc = read('docs/REVIEW_BOARD.md');
    for (const term of ['OPS_SIGNING_MODE', 'twoPerson', 'professionalReview']) expect(doc).toContain(term);
  });
});

describe('brand token docs', () => {
  it('BRAND_TOKENS.md exists and names the files, commands and version rule', () => {
    expect(existsSync('docs/BRAND_TOKENS.md')).toBe(true);
    const doc = read('docs/BRAND_TOKENS.md');
    for (const term of ['brand.tokens.json', 'brand.tokens.css', 'fonts.manifest.json', 'npm run brand:export', 'npm run brand:check', 'version']) {
      expect(doc).toContain(term);
    }
  });
  it('BRAND.md links to BRAND_TOKENS.md', () => {
    expect(read('docs/BRAND.md')).toContain('docs/BRAND_TOKENS.md');
  });
  it('README.md names the export command', () => {
    expect(read('README.md')).toContain('npm run brand:export');
  });
});

describe('OPEN_QUESTIONS table', () => {
  it('keeps every OPQ row contiguous with the table, with the header cell count', () => {
    const lines = read('docs/OPEN_QUESTIONS.md').split('\n');
    const cells = (l: string): number => l.split(/(?<!\\)\|/).length - 2;
    const header = lines.find((l) => l.startsWith('| ID '));
    expect(header).toBeDefined();
    lines.forEach((l, i) => {
      if (!l.startsWith('| OPQ-')) return;
      expect(lines[i - 1]?.startsWith('|'), `row not directly under a table line: ${l.slice(0, 12)}`).toBe(true);
      expect(cells(l), `cell count: ${l.slice(0, 12)}`).toBe(cells(header ?? ''));
    });
  });
});
