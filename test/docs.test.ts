import { existsSync, readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { CONTRAST_PAIRS, contrastRatio, renderFontsManifest } from '../src/brandExport';
import { BRAND_TOKENS } from '../src/brandTokens';

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
  it('BRAND_TOKENS.md points at OPQ-036, which exists in OPEN_QUESTIONS.md', () => {
    expect(read('docs/BRAND_TOKENS.md')).toContain('OPQ-036');
    expect(read('docs/OPEN_QUESTIONS.md')).toMatch(/^\| OPQ-036 \|/m);
  });
  it('BRAND.md links to BRAND_TOKENS.md', () => {
    expect(read('docs/BRAND.md')).toContain('docs/BRAND_TOKENS.md');
  });
  it('README.md names the export command', () => {
    expect(read('README.md')).toContain('npm run brand:export');
  });
});

describe('figures quoted in the brand docs equal the code', () => {
  const doc = read('docs/BRAND_TOKENS.md');
  const buildLog = read('docs/BUILD_LOG.md');
  const c = BRAND_TOKENS.colour;
  const two = (n: number): string => n.toFixed(2);
  const ratio = (fg: string, bg: string): string => two(contrastRatio(fg, bg));

  it('lists exactly the colour roles of BRAND_TOKENS, and the count', () => {
    const line = /- `colour`: (\d+) roles: ([^\n]+?)\. The `text` token/.exec(doc);
    expect(line).not.toBeNull();
    const roles = [...(line?.[2] ?? '').matchAll(/`(\w+)`/g)].map((m) => m[1]);
    expect(roles).toEqual(Object.keys(c));
    expect(Number(line?.[1])).toBe(Object.keys(c).length);
  });
  it('quotes the text token hex from BRAND_TOKENS', () => {
    expect(doc).toContain(`The \`text\` token is \`${c.text}\``);
  });
  it('quotes the font weights of renderFontsManifest()', () => {
    const manifest = JSON.parse(renderFontsManifest()) as { fonts: { role: string; family: string; weights: number[] }[] };
    const quoted = /Display: (.+?) ([\d, ]+)\. Body: (.+?) ([\d, ]+)\. Mono: (.+?) ([\d, ]+)\./.exec(doc);
    expect(quoted).not.toBeNull();
    const want = ['display', 'body', 'mono'].flatMap((role) => {
      const f = manifest.fonts.find((x) => x.role === role);
      return [f?.family, f?.weights.join(', ')];
    });
    expect((quoted ?? []).slice(1)).toEqual(want);
  });
  it('quotes the radius of BRAND_TOKENS', () => {
    expect(doc).toContain(`- \`radius\`: \`card\` (\`${BRAND_TOKENS.radius.card}\`).`);
  });
  it('quotes the pair count and the lowest contrast ratio of the gate list', () => {
    const ratios = CONTRAST_PAIRS.map(([fg, bg]) => contrastRatio(c[fg], c[bg]));
    const lowest = two(Math.min(...ratios));
    expect(doc).toContain(`Contrast: ${CONTRAST_PAIRS.length} text and background pairs`);
    expect(doc).toContain(`The contrast gate is a numeric check of those ${CONTRAST_PAIRS.length} pairs`);
    expect(doc).toContain(`at ${lowest}.`);
    expect(buildLog).toContain(`${CONTRAST_PAIRS.length} contrast pairs at 4.5:1 or more`);
    expect(buildLog).toContain(`\`surfaceRaised\`, ${lowest})`);
  });
  it('quotes the border ranges measured against bg, surface and surfaceRaised', () => {
    const range = (role: 'border' | 'borderStrong'): string => {
      const r = (['bg', 'surface', 'surfaceRaised'] as const).map((b) => contrastRatio(c[role], c[b]));
      return `between ${two(Math.min(...r))}:1 and ${two(Math.max(...r))}:1`;
    };
    expect(doc).toContain(`\`border\` is ${range('border')}`);
    expect(doc).toContain(`\`borderStrong\` ${range('borderStrong')}`);
  });
  it('quotes the existing-UI button and input figures', () => {
    expect(doc).toContain(`\`#FFFFFF\` on \`#0284C7\`) is ${ratio('#FFFFFF', '#0284C7')}:1`);
    expect(Number(ratio('#FFFFFF', '#0284C7'))).toBeLessThan(4.5);
    expect(doc).toContain(`(\`#0369A1\`) gives ${ratio('#FFFFFF', '#0369A1')}:1`);
    expect(doc).toContain(`${ratio(c.borderStrong, c.surfaceRaised)}:1 against that background and ${ratio(c.borderStrong, c.bg)}:1 against \`bg\``);
    expect(buildLog).toContain(`is ${ratio('#FFFFFF', '#0284C7')}:1`);
  });
  it('the check can fail: a doc line with a different count does not match', () => {
    expect(doc).not.toContain(`Contrast: ${CONTRAST_PAIRS.length + 1} text and background pairs`);
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
