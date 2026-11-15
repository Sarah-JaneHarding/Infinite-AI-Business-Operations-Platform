import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { BRAND } from '../src/brand';
import { BRAND_TOKENS, HEX, type ColourRole } from '../src/brandTokens';

const ROLES: ColourRole[] = [
  'bg', 'surface', 'surfaceRaised', 'border', 'borderStrong', 'text', 'textSoft', 'textMuted',
  'textSubtle', 'primary', 'primaryText', 'accent', 'highlight', 'success', 'danger',
];

const css = readFileSync(fileURLToPath(new URL('../src/index.css', import.meta.url)), 'utf8');
const rootMatch = /:root\s*\{([^}]*)\}/.exec(css);
const rootVars = new Map<string, string>();
for (const m of (rootMatch?.[1] ?? '').matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
  rootVars.set(m[1], m[2].trim());
}
const norm = (s: string): string => s.replace(/\s+/g, ' ').trim();
const cssHex = (name: string): string | undefined => rootVars.get(name)?.toLowerCase();

describe('brand tokens', () => {
  it('has exactly the 15 colour roles, each a 6-digit hex', () => {
    expect(Object.keys(BRAND_TOKENS.colour).sort()).toEqual([...ROLES].sort());
    for (const role of ROLES) expect(BRAND_TOKENS.colour[role]).toMatch(HEX);
  });

  it('reads brand-owned values from BRAND', () => {
    const c = BRAND_TOKENS.colour;
    expect(c.bg).toBe(BRAND.colours.deepSpace);
    expect(c.surface).toBe(BRAND.colours.midnight);
    expect(c.primary).toBe(BRAND.colours.plasmaCyan);
    expect(c.accent).toBe(BRAND.colours.neuralViolet);
    expect(c.highlight).toBe(BRAND.colours.sparkGold);
    expect(c.primaryText).toBe(BRAND.colours.deepSpace);
    expect(BRAND_TOKENS.font.display.family).toBe(BRAND.fonts.display);
    expect(BRAND_TOKENS.font.body.family).toBe(BRAND.fonts.body);
    expect(BRAND_TOKENS.font.mono.family).toBe(BRAND.fonts.mono);
  });

  it('starts each font stack with its family and ends with a generic family', () => {
    const { display, body, mono } = BRAND_TOKENS.font;
    for (const f of [display, body, mono]) {
      expect(f.stack.startsWith(`'${f.family}'`) || f.stack.startsWith(f.family)).toBe(true);
    }
    expect(display.stack.endsWith('sans-serif')).toBe(true);
    expect(body.stack.endsWith('sans-serif')).toBe(true);
    expect(mono.stack.endsWith('monospace')).toBe(true);
  });

  it('matches the working palette in src/index.css :root', () => {
    expect(rootMatch).not.toBeNull();
    const c = BRAND_TOKENS.colour;
    const pairs: Array<[string, string]> = [
      ['--cream', c.bg], ['--card', c.surface], ['--card2', c.surfaceRaised], ['--line', c.border],
      ['--line-strong', c.borderStrong], ['--ink', c.text], ['--muted', c.textMuted],
      ['--muted-soft', c.textSubtle], ['--violet', c.accent], ['--amber', c.highlight],
      ['--emerald', c.success], ['--rose', c.danger], ['--cyan', c.primary],
    ];
    for (const [name, value] of pairs) {
      expect(cssHex(name), name).toBe(value.toLowerCase());
    }
    expect(norm(rootVars.get('--fd') ?? '')).toBe(norm(BRAND_TOKENS.font.display.stack));
    expect(norm(rootVars.get('--fb') ?? '')).toBe(norm(BRAND_TOKENS.font.body.stack));
    expect(norm(rootVars.get('--fm') ?? '')).toBe(norm(BRAND_TOKENS.font.mono.stack));
  });

  it('matches the p colour and .card radius in src/index.css', () => {
    const p = /(?:^|\n)p\s*\{([^}]*)\}/.exec(css);
    expect(/color:\s*([#\w]+)/.exec(p?.[1] ?? '')?.[1].toLowerCase()).toBe(BRAND_TOKENS.colour.textSoft.toLowerCase());
    const card = /\.card\s*\{([^}]*)\}/.exec(css);
    expect(/border-radius:\s*([^;]+);/.exec(card?.[1] ?? '')?.[1].trim()).toBe(BRAND_TOKENS.radius.card);
    expect(BRAND_TOKENS.radius.card).toBe('14px');
  });

  it('contains no CSS-breaking characters in any token value', () => {
    const bad = /[;{}\n\r]/;
    for (const v of Object.values(BRAND_TOKENS.colour)) expect(v).not.toMatch(bad);
    expect(BRAND_TOKENS.radius.card).not.toMatch(bad);
    for (const f of Object.values(BRAND_TOKENS.font)) {
      expect(f.stack).not.toMatch(bad);
      expect(f.family).not.toMatch(/[;{}"\n\r]/);
      // double quotes are not allowed anywhere; quotes in stacks are single quotes
      expect(f.stack).not.toContain('"');
    }
  });
});
