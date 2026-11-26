import { describe, expect, it } from 'vitest';
import { toDocx, toHtml, toMarkdown } from '../src/core/artefacts/render';
import type { Doc } from '../src/core/types';

// CodeQL alert 7: a heading level comes from an upload or the API and went straight into '#'.repeat(level), which throws on a negative count,
// and into the tag name <h${level}>. Valid levels must render exactly as before; anything else must render something sane and never throw.
const doc = (level: unknown): Doc => ({ title: 'T', blocks: [{ type: 'h', level: level as number, text: 'Heading' }], meta: {} });

describe('heading levels', () => {
  it('render as before for every valid level', () => {
    for (let n = 1; n <= 6; n++) expect(toMarkdown(doc(n))).toContain(`\n\n${'#'.repeat(n)} Heading`);
    expect(toMarkdown({ title: 'T', blocks: [{ type: 'h', text: 'Heading' }], meta: {} })).toContain('\n\n## Heading'); // the default is 2
    const tag = (n: number) => /<(h\d)>Heading<\/\1>/.exec(toHtml(doc(n)))?.[1];
    expect([1, 2, 3, 4, 5, 6].map(tag)).toEqual(['h2', 'h3', 'h4', 'h4', 'h4', 'h4']);
  });
  const hostile: [string, unknown][] = [['negative', -1], ['very negative', -1e9], ['-Infinity', -Infinity], ['NaN', NaN], ['Infinity', Infinity], ['huge', 1e12], ['fraction', 2.7], ['a number as text', '3'], ['text', 'x'], ['null', null]];
  for (const [name, level] of hostile) {
    it(`do not throw or break the markup for a ${name} level`, async () => {
      const md = toMarkdown(doc(level));
      expect(md).toMatch(/\n\n#{0,6} Heading/);
      expect(toHtml(doc(level))).toMatch(/<h[1-4]>Heading<\/h[1-4]>/);
      expect((await toDocx(doc(level))).length).toBeGreaterThan(0);
    });
  }
});
