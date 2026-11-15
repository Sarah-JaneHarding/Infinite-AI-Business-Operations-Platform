import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { BRAND } from '../src/brand';
import { BRAND_TOKENS, type ColourRole } from '../src/brandTokens';
import {
  buildTokenFile, canonicalJson, contrastRatio, outOfDate, renderCss, renderFontsManifest,
} from '../src/brandExport';

const read = (rel: string): string => readFileSync(fileURLToPath(new URL(rel, import.meta.url)), 'utf8');

const STALE = 'Brand tokens are out of date. Run: npm run brand:export';

/** Throws the one agreed message when a committed file differs from freshly generated output. */
function assertCurrent(onDisk: string, expected: string): void {
  if (outOfDate(onDisk, expected)) throw new Error(STALE);
}

const mutated = (primary: string) =>
  buildTokenFile({ ...BRAND_TOKENS, colour: { ...BRAND_TOKENS.colour, primary } });

/** Every contact detail in BRAND, read from the source rather than re-typed. */
function contactStrings(): string[] {
  return [
    ...Object.values(BRAND.address),
    BRAND.phone, BRAND.phoneTel, BRAND.email, BRAND.founder.name,
  ];
}

/** Returns the contact strings found in the text (case-insensitive). */
function contactHits(text: string): string[] {
  const hay = text.toLowerCase();
  return contactStrings().filter((c) => hay.includes(c.toLowerCase()));
}

/** Reuse comparison: returns the roles whose value differs from the brand palette. */
function reuseDifferences(colour: Record<string, string>): string[] {
  const reused: [string, keyof typeof BRAND.colours][] = [
    ['bg', 'deepSpace'], ['surface', 'midnight'], ['primary', 'plasmaCyan'], ['accent', 'neuralViolet'], ['highlight', 'sparkGold'],
  ];
  return reused.filter(([role, name]) => colour[role] !== BRAND.colours[name]).map(([role]) => role);
}

interface Manifest { fonts: { family: string; weights: number[] }[] }

/** Parses the Google Fonts css2 link in index.html into family -> weights. */
function googleFontsWeights(html: string): Map<string, number[]> {
  const href = /href="(https:\/\/fonts\.googleapis\.com\/css2\?[^"]+)"/.exec(html)?.[1];
  if (!href) throw new Error('No Google Fonts link found in index.html');
  const out = new Map<string, number[]>();
  for (const param of new URL(href.replace(/&amp;/g, '&')).search.slice(1).split('&')) {
    const m = /^family=([^:]+):wght@(.+)$/.exec(param);
    if (m) out.set(m[1].replace(/\+/g, ' '), m[2].split(';').map(Number));
  }
  return out;
}

/** Returns a list of differences between the manifest and the font link; empty means they agree. */
function fontDifferences(manifest: Manifest, link: Map<string, number[]>): string[] {
  const diffs: string[] = [];
  const families = manifest.fonts.map((f) => f.family).sort();
  const linked = [...link.keys()].sort();
  if (JSON.stringify(families) !== JSON.stringify(linked)) diffs.push(`families: ${families.join(',')} vs ${linked.join(',')}`);
  for (const f of manifest.fonts) {
    const want = link.get(f.family);
    if (JSON.stringify(f.weights) !== JSON.stringify(want)) diffs.push(`weights for ${f.family}`);
  }
  return diffs;
}

describe('generated brand files match the source', () => {
  it('brand/brand.tokens.json is current', () => {
    expect(() => assertCurrent(read('../brand/brand.tokens.json'), canonicalJson(buildTokenFile()))).not.toThrow();
  });
  it('brand/brand.tokens.css is current', () => {
    expect(() => assertCurrent(read('../brand/brand.tokens.css'), renderCss(buildTokenFile()))).not.toThrow();
  });
  it('brand/fonts.manifest.json is current', () => {
    expect(() => assertCurrent(read('../brand/fonts.manifest.json'), renderFontsManifest())).not.toThrow();
  });
  it('tolerates CRLF checkouts but nothing else', () => {
    const json = canonicalJson(buildTokenFile());
    expect(() => assertCurrent(json.replace(/\n/g, '\r\n'), json)).not.toThrow();
    expect(() => assertCurrent(`${json} `, json)).toThrow(STALE);
  });

  describe('the guards can fail (mutations applied in memory only)', () => {
    it('a changed primary colour is reported out of date in the JSON file', () => {
      expect(() => assertCurrent(read('../brand/brand.tokens.json'), canonicalJson(mutated('#000000')))).toThrow(STALE);
    });
    it('a changed primary colour is reported out of date in the CSS file', () => {
      expect(() => assertCurrent(read('../brand/brand.tokens.css'), renderCss(mutated('#000000')))).toThrow(STALE);
    });
    it('a changed font stack is reported out of date', () => {
      const t = { ...BRAND_TOKENS, font: { ...BRAND_TOKENS.font, body: { ...BRAND_TOKENS.font.body, stack: 'Arial, sans-serif' } } };
      expect(() => assertCurrent(read('../brand/brand.tokens.json'), canonicalJson(buildTokenFile(t)))).toThrow(STALE);
    });
    it('a missing file is reported out of date', () => {
      expect(outOfDate(undefined, 'x')).toBe(true);
    });
    it('a mutated manifest differs from the committed one', () => {
      const original = read('../brand/fonts.manifest.json');
      const changed = original.replace('"Inter"', '"Intr"');
      expect(changed).not.toBe(original);
      expect(() => assertCurrent(changed, renderFontsManifest())).toThrow(STALE);
    });
  });
});

describe('token colours reuse the brand palette', () => {
  const file = JSON.parse(read('../brand/brand.tokens.json')) as { colour: Record<string, string> };
  it('bg, surface, primary, accent and highlight are the brand colours', () => {
    expect(reuseDifferences(file.colour)).toEqual([]);
  });
  it('the comparison can fail: a mutated token file reports the changed role', () => {
    expect(reuseDifferences(mutated('#000000').colour)).toEqual(['primary']);
  });
});

describe('no contact details in the generated files', () => {
  const files = ['../brand/brand.tokens.json', '../brand/brand.tokens.css', '../brand/fonts.manifest.json'];
  it('contactStrings covers the 9 expected fields, each at least 3 characters', () => {
    const list = contactStrings();
    expect(list).toHaveLength(9);
    for (const c of list) {
      expect(c.length).toBeGreaterThanOrEqual(3);
      expect(c.trim()).toBe(c);
    }
  });
  it.each(files)('%s contains none of them', (rel) => {
    expect(contactHits(read(rel))).toEqual([]);
  });
  it('the scan can fail: a string appended to the CSS is reported by name', () => {
    expect(contactHits(`${read('../brand/brand.tokens.css')}/* ${BRAND.email} */`)).toEqual([BRAND.email]);
  });
  it('the scan can fail: an entry added to the JSON is reported by name', () => {
    const json = read('../brand/brand.tokens.json').replace('{', `{"x": "${BRAND.address.postcode}",`);
    expect(contactHits(json)).toEqual([BRAND.address.postcode]);
  });
  it('the scan can fail: one appended string is reported for each of the 9, case-insensitively', () => {
    for (const c of contactStrings()) {
      expect(contactHits(`some text ${c.toUpperCase()} more`)).toContain(c);
    }
  });
});

/**
 * WCAG AA for normal text. No allow-list and no lower fallback: if a colour change breaks a pair,
 * this test fails and the owner decides. It is never loosened to pass.
 *
 * Measured on the current values:
 *   text on bg 19.23          textSoft on bg 16.32      textMuted on bg 13.55
 *   textMuted on surface 12.54  textSubtle on surface 7.26
 *   primary on bg 10.46       accent on bg 5.48         accent on surface 5.07
 *   highlight on bg 11.32     success on bg 10.47
 *   danger on bg 7.48         danger on surface 6.92    primaryText on primary 10.46
 */
const AA_NORMAL = 4.5;

describe('contrast (WCAG AA, normal text)', () => {
  const c = BRAND_TOKENS.colour;
  const pairs: [ColourRole, ColourRole][] = [
    ['text', 'bg'], ['textSoft', 'bg'], ['textMuted', 'bg'], ['textMuted', 'surface'], ['textSubtle', 'surface'],
    ['primary', 'bg'], ['accent', 'bg'], ['accent', 'surface'], ['highlight', 'bg'], ['success', 'bg'],
    ['danger', 'bg'], ['danger', 'surface'], ['primaryText', 'primary'],
  ];
  it.each(pairs)('%s on %s is at least 4.5', (fg, bg) => {
    expect(contrastRatio(c[fg], c[bg])).toBeGreaterThanOrEqual(AA_NORMAL);
  });
  it('the check can fail: #333333 on #05070F is below 4.5', () => {
    expect(contrastRatio('#333333', '#05070F')).toBeLessThan(AA_NORMAL);
  });
  it('the loop can fail: a darkened primary on bg breaks the primary/bg pair', () => {
    const bad = { ...c, primary: '#101830' };
    const failing = pairs.filter(([fg, bg]) => contrastRatio(bad[fg], bad[bg]) < AA_NORMAL);
    expect(failing).toContainEqual(['primary', 'bg']);
  });
});

describe('fonts', () => {
  const manifest = JSON.parse(read('../brand/fonts.manifest.json')) as Manifest;
  const link = googleFontsWeights(read('../index.html'));

  it('manifest families and weights equal the Google Fonts link in index.html', () => {
    expect(fontDifferences(manifest, link)).toEqual([]);
  });
  it('the comparison can fail: a changed weight is reported', () => {
    const copy: Manifest = { fonts: manifest.fonts.map((f) => ({ ...f, weights: [...f.weights] })) };
    copy.fonts[0].weights[0] = 300;
    expect(fontDifferences(copy, link)).toEqual([`weights for ${copy.fonts[0].family}`]);
  });
  it('the comparison can fail: a missing family is reported', () => {
    const copy: Manifest = { fonts: manifest.fonts.slice(1) };
    expect(fontDifferences(copy, link).length).toBeGreaterThan(0);
  });
  it('the parser reads the link correctly', () => {
    expect(link.get('Space Grotesk')).toEqual([500, 600, 700]);
    expect(link.size).toBe(3);
  });
});

describe('public/brand-kit/brand-tokens.json (older downloadable kit)', () => {
  const kit = JSON.parse(read('../public/brand-kit/brand-tokens.json')) as {
    colours: Record<string, string>; fonts: Record<string, string>;
  };
  it('colours still equal BRAND.colours', () => {
    expect(kit.colours).toEqual(BRAND.colours);
  });
  it('fonts equal the token families', () => {
    expect(kit.fonts).toEqual({
      display: BRAND_TOKENS.font.display.family,
      body: BRAND_TOKENS.font.body.family,
      mono: BRAND_TOKENS.font.mono.family,
    });
  });
});
