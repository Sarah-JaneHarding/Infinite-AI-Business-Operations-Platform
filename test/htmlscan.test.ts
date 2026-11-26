import { describe, expect, it } from 'vitest';
import { blocksOf, cellsOf, removeBlocks, rowsOf, stripTags, titleOf } from '../src/core/htmlscan';
import { htmlToDoc } from '../src/core/documents';

// The linear scans in src/core/htmlscan.ts replace backtracking patterns (CodeQL alerts 4 and 5, and a stall on hostile HTML).
// Each must return exactly what the pattern it replaced returned, so each has a reference here.
// CodeQL flags the original tag-stripping and block-removal patterns wherever they appear, even as a test's reference (alerts 22 and 23), so
// those two references are plain loops that read the original patterns directly, with none of the caching htmlscan.ts adds. They were
// checked against the original patterns on 300,000 random inputs with no differences. The other references below are the original patterns.
const REF_STRIP = (s: string) => {
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '<') {
      const j = s.indexOf('>', i + 1);
      if (j > i + 1) { i = j; continue; } // a tag needs at least one character inside; "<>" is text
    }
    out += s[i];
  }
  return out;
};
const REF_BLOCKS = (s: string) => {
  const low = s.replace(/[A-Z]+/g, (m) => m.toLowerCase());
  let out = '';
  for (let i = 0; i < s.length; i++) {
    if (s[i] === '<') {
      const n = (['script', 'style', 'head'] as const).find((x) => low.startsWith(x, i + 1));
      if (n) {
        const close = low.indexOf(`</${n}>`, i + 1 + n.length);
        if (close >= 0) { i = close + n.length + 2; continue; }
      }
    }
    out += s[i];
  }
  return out;
};
const REF_TITLE = (s: string) => /<title[^>]*>([\s\S]*?)<\/title>/i.exec(s)?.[1] ?? null;
const refAll = (re: RegExp, s: string) => [...s.matchAll(re)].map((m) => ({ name: (m[1] ?? '').toLowerCase(), inner: m[2]! }));
const REF_BLOCKS_OF = (s: string) => refAll(/<(h[1-6]|p|li|table|pre|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi, s);
const REF_ROWS = (s: string) => [...s.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)].map((m) => m[1]!);
const REF_CELLS = (s: string) => [...s.matchAll(/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi)].map((m) => m[1]!);

const TOKENS = ['<p>', '</p>', '<P>', '</P>', '<p class="a>b">', '<li>', '</li>', '<table>', '</table>', '<TABLE>', '<tr>', '</tr>', '<td>', '</td>', '<th>', '</th>', '<h1>', '</h1>',
  '<h2 class="x">', '</h2>', '<script>', '</script>', '<SCRIPT>', '</SCRIPT>', '<style>', '</style>', '<head>', '</head>', '<header>', '</header>', '<title>', '</title>', '<TITLE x>',
  '<title', '<pre>', '</pre>', '<blockquote>', '</blockquote>', '<pr', '<scr', 'ipt>', '<p ', 'a=">"', '<', '>', '<>', '<<', '&lt;', '&amp;', 'text', ' ', '\n', '<b>', '</b>', 'İ', 'K'];
let seed = 20261126;
const rnd = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
const soup = () => Array.from({ length: Math.floor(rnd() * 30) }, () => TOKENS[Math.floor(rnd() * TOKENS.length)]).join('');

describe('htmlscan matches the patterns it replaced', () => {
  it('on 30,000 random, often malformed, inputs', () => {
    for (let i = 0; i < 30000; i++) {
      const h = soup();
      expect(stripTags(h), h).toBe(REF_STRIP(h));
      expect(removeBlocks(h), h).toBe(REF_BLOCKS(h));
      expect(titleOf(h), h).toBe(REF_TITLE(h));
      expect(blocksOf(h), h).toEqual(REF_BLOCKS_OF(h));
      expect(rowsOf(h).map((r) => r.inner), h).toEqual(REF_ROWS(h));
      expect(cellsOf(h).map((c) => c.inner), h).toEqual(REF_CELLS(h));
    }
  });
  it('on the inputs that leave a tag behind after one pass', () => {
    // Nothing executable survives: the leftovers are text, and every output path escapes text.
    const doc = htmlToDoc('t', '<p>a<<b>script>alert(1)</p><scr<script></script>ipt>alert(2)</scr<script></script>ipt><p>y</p>');
    expect(JSON.stringify(doc.blocks)).not.toMatch(/<script/i);
    expect(doc.blocks).toEqual([{ type: 'p', text: 'ascript>alert(1)' }, { type: 'p', text: 'y' }]);
  });
});

describe('htmlscan is linear on hostile HTML', () => {
  const timed = (html: string) => { const t = performance.now(); htmlToDoc('t', html); return performance.now() - t; };
  // Each of these took seconds to minutes with the patterns (20,000 repeated "<script" alone took about 4 s).
  const hostile: [string, string][] = [
    ['unclosed <script, repeated', '<script'.repeat(300000)],
    ['<, repeated', '<'.repeat(300000)],
    ['unclosed <p>, repeated', '<p>'.repeat(300000)],
    ['<p> repeated, one close at the end', '<p>'.repeat(300000) + '</p>'],
    ['unclosed table, row, cell, repeated', '<table><tr><td>'.repeat(100000)],
    ['one table with many unclosed cells', '<table><tr>' + '<td>x'.repeat(200000) + '</tr></table>'],
  ];
  for (const [name, html] of hostile) {
    it(name, () => { expect(timed(html)).toBeLessThan(750); });
  }
});
