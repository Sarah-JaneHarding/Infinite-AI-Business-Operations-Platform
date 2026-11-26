/**
 * Linear-time scans for `htmlToDoc`. They replace backtracking patterns that CodeQL flagged as incomplete sanitization
 * (alerts 4 and 5) and that were also quadratic: 20,000 repeated `<script` took about 4 seconds, and an upload may be 5 MB.
 *
 * Each function returns exactly what the pattern it replaces returned, quirks included (a tag name is not required to end at a
 * word boundary for script, style, head or title; a close tag must match exactly). test/htmlscan.test.ts compares them with
 * the original patterns on random input. Every search moves forward only, and a search that fails once is not repeated.
 */

/** ASCII-only lower-casing. Unlike `toLowerCase` it never changes the length, so indexes stay valid; it is also all the old /i patterns folded. */
const lower = (s: string) => s.replace(/[A-Z]+/g, (m) => m.toLowerCase());

/** The first `ch` at or after a position that never goes backwards: each part of `s` is searched at most once. */
function firstAfter(s: string, ch: string) {
  let at = -2;
  return (pos: number): number => {
    if (at === -1) return -1; // none after an earlier position, so none after this one
    if (at === -2 || pos > at) at = s.indexOf(ch, pos);
    return at;
  };
}

/** Same result as `s.replace(/<[^>]+>/g, '')`. */
export function stripTags(s: string): string {
  const gt = firstAfter(s, '>');
  let out = '';
  let i = 0;
  for (;;) {
    const lt = s.indexOf('<', i);
    if (lt < 0) return out + s.slice(i);
    const end = gt(lt + 1);
    if (end < 0) return out + s.slice(i);
    if (end === lt + 1) { out += s.slice(i, lt + 1); i = lt + 1; continue; } // "<>" has nothing inside, so it is not a tag
    out += s.slice(i, lt);
    i = end + 1;
  }
}

const BLOCKS = ['script', 'style', 'head'] as const;

/** Same result as `html.replace(/<(script|style|head)[\s\S]*?<\/\1>/gi, '')`. */
export function removeBlocks(html: string): string {
  const low = lower(html);
  const dead = new Set<string>();
  let out = '';
  let i = 0;
  let p = 0;
  for (;;) {
    p = low.indexOf('<', p);
    if (p < 0) break;
    let hit = false;
    for (const n of BLOCKS) {
      if (dead.has(n) || !low.startsWith(n, p + 1)) continue;
      const close = low.indexOf(`</${n}>`, p + 1 + n.length);
      if (close < 0) { dead.add(n); break; } // no close tag anywhere after here, so none for a later start either
      out += html.slice(i, p);
      i = p = close + n.length + 3;
      hit = true;
      break;
    }
    if (!hit) p += 1;
  }
  return out + html.slice(i);
}

/** The text of the first `<title>`, as `/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]`, or null. */
export function titleOf(html: string): string | null {
  const low = lower(html);
  const p = low.indexOf('<title');
  if (p < 0) return null;
  const gt = low.indexOf('>', p + 6);
  if (gt < 0) return null;
  const close = low.indexOf('</title>', gt + 1);
  return close < 0 ? null : html.slice(gt + 1, close);
}

export interface Element { name: string; inner: string }

/**
 * Elements opened by a tag that `open` (a sticky pattern run on the lower-cased text, at the character after `<`) recognises,
 * each running to the first close tag `closers` names. The open tag ends at the first `>`. Matches do not overlap, and a
 * start with no close tag after it is skipped, as with `/<(…)\b[^>]*>([\s\S]*?)<\/…>/gi`.
 */
function elements(src: string, open: RegExp, closers: (m: RegExpExecArray) => string[]): Element[] {
  const low = lower(src);
  const gt = firstAfter(low, '>');
  const dead = new Set<string>();
  const out: Element[] = [];
  let p = 0;
  for (;;) {
    p = low.indexOf('<', p);
    if (p < 0) break;
    open.lastIndex = p + 1;
    const m = open.exec(low);
    if (m) {
      const end = gt(p + 1 + m[0].length);
      if (end < 0) break; // no `>` left at all
      const names = closers(m);
      const key = names.join('|');
      if (!dead.has(key)) {
        let close = -1;
        let len = 0;
        for (const c of names) {
          const at = low.indexOf(c, end + 1);
          if (at >= 0 && (close < 0 || at < close)) { close = at; len = c.length; }
        }
        if (close >= 0) {
          out.push({ name: m[1]!, inner: src.slice(end + 1, close) });
          p = close + len;
          continue;
        }
        dead.add(key);
      }
    }
    p += 1;
  }
  return out;
}

const BLOCK_OPEN = /(h[1-6]|p|li|table|pre|blockquote)\b/y;
const ROW_OPEN = /(tr)\b/y;
const CELL_OPEN = /(t[hd])\b/y;

/** Same matches as `/<(h[1-6]|p|li|table|pre|blockquote)\b[^>]*>([\s\S]*?)<\/\1>/gi`; `name` is lower-case. */
export const blocksOf = (html: string) => elements(html, BLOCK_OPEN, (m) => [`</${m[1]}>`]);
/** Same matches as `/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi`. */
export const rowsOf = (html: string) => elements(html, ROW_OPEN, () => ['</tr>']);
/** Same matches as `/<t[hd]\b[^>]*>([\s\S]*?)<\/t[hd]>/gi`: a cell ends at the first `</th>` or `</td>`. */
export const cellsOf = (html: string) => elements(html, CELL_OPEN, () => ['</th>', '</td>']);
