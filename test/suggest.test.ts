import { describe, expect, it } from 'vitest';
import { applyInput, blanksOf, excludeFor, requestRound, SUGGEST_LIMITS, deterministicSuggestions, excludeSeen, failPanelState, generatedWithLabel, initialPanelState, nextPanelState, parseDoc, startLoading, textsOf, type DocSuggestions } from '../src/core/suggest';
import type { Doc } from '../src/core/types';

const F = (s: string) => `[Fill in: ${s}]`;
const fixture = (): Doc => ({
  title: 'Supplier agreement',
  blocks: [
    { type: 'h', level: 1, text: 'Parties' },
    { type: 'p', text: `This agreement is between ${F('supplier name')} and the school. Contact ${F('supplier name')} for queries; the term is ${F('term length')}.` },
    { type: 'table', headers: ['Item', 'Notes'], rows: [['Delivery', ''], ['Payment', 'Monthly']] },
  ],
  meta: {},
});
const bare = (): Doc => ({ title: 'Meeting note', blocks: [{ type: 'p', text: 'Nothing to fill.' }], meta: {} });

const sig = (r: { inputs: { value: string }[]; prompts: { text: string }[] }) => JSON.stringify([r.inputs.map((i) => i.value), r.prompts.map((p) => p.text)]);

describe('blanksOf', () => {
  it('lists each placeholder and empty cell once, in document order', () => {
    expect(blanksOf(fixture())).toEqual(['supplier name', 'term length', 'Notes']);
  });
  it('reads empty key/value values by their key', () => {
    const d: Doc = { title: 't', blocks: [{ type: 'kv', pairs: [['Owner', ''], ['Venue', 'Hall'], ['Date', '  ']] }], meta: {} };
    expect(blanksOf(d)).toEqual(['Owner', 'Date']);
  });
  it('is empty for a document with nothing to fill and tolerates missing fields', () => {
    expect(blanksOf(bare())).toEqual([]);
    expect(blanksOf({ title: 't', blocks: [{ type: 'table' }, { type: 'kv' }], meta: {} })).toEqual([]);
  });
});

describe('excludeSeen', () => {
  it('ignores case and surrounding or repeated space', () => {
    expect(excludeSeen(['Hello  World', 'other'], ['  hello world '])).toEqual(['other']);
    expect(excludeSeen(['A'], [])).toEqual(['A']);
  });
});

describe('applyInput', () => {
  it('replaces a placeholder in a paragraph, first occurrence only', () => {
    const d = applyInput(fixture(), 'supplier name', 'Acme Cleaning');
    expect((d.blocks[1] as { text: string }).text).toBe(`This agreement is between Acme Cleaning and the school. Contact ${F('supplier name')} for queries; the term is ${F('term length')}.`);
  });
  it('replaces a placeholder inside a key/value value', () => {
    const d: Doc = { title: 't', blocks: [{ type: 'kv', pairs: [['Owner', F('owner')], ['Venue', 'Hall']] }], meta: {} };
    expect(applyInput(d, 'owner', 'The principal').blocks[0]!.pairs).toEqual([['Owner', 'The principal'], ['Venue', 'Hall']]);
  });
  it('fills an empty key/value value by its key', () => {
    const d: Doc = { title: 't', blocks: [{ type: 'kv', pairs: [['Owner', ''], ['Venue', '']] }], meta: {} };
    expect(applyInput(d, 'Venue', 'Hall').blocks[0]!.pairs).toEqual([['Owner', ''], ['Venue', 'Hall']]);
  });
  it('fills the first empty table cell under a header, and replaces a placeholder inside a cell', () => {
    expect(applyInput(fixture(), 'Notes', 'Weekly').blocks[2]!.rows).toEqual([['Delivery', 'Weekly'], ['Payment', 'Monthly']]);
    const d: Doc = { title: 't', blocks: [{ type: 'table', headers: ['A'], rows: [[F('amount')], [F('amount')]] }], meta: {} };
    expect(applyInput(d, 'amount', 'to be agreed').blocks[0]!.rows).toEqual([['to be agreed'], [F('amount')]]);
  });
  it('returns the document unchanged when the blank is not found', () => {
    const d = fixture();
    expect(applyInput(d, 'no such blank', 'x')).toEqual(d);
  });
  it('never mutates the input document', () => {
    const d = fixture();
    const before = JSON.stringify(d);
    const out = applyInput(d, 'term length', '12 months to be confirmed');
    expect(JSON.stringify(d)).toBe(before);
    expect(out).not.toBe(d);
  });
});

describe('parseDoc', () => {
  it('accepts a well-formed document and rejects malformed ones', () => {
    expect(parseDoc(fixture())).not.toBeNull();
    expect(parseDoc({ title: 'x', blocks: [{ type: 'p', text: 'a' }] })?.meta).toEqual({});
    for (const bad of [null, 'x', { title: 1, blocks: [] }, { title: 'x', blocks: 'no' }, { title: 'x', blocks: [{ type: 'script' }] }, { title: 'x', blocks: [null] }]) expect(parseDoc(bad)).toBeNull();
  });
});

describe('deterministicSuggestions', () => {
  for (const [name, doc] of [['a document with three blanks', { ...fixture(), blocks: [...fixture().blocks, { type: 'p', text: F('start date') }] } as Doc], ['a document with none', bare()]] as [string, Doc][]) {
    it(`gives a different set on each of 8 consecutive refreshes for ${name}`, () => {
      const sets = [0, 1, 2, 3, 4, 5, 6, 7].map((r) => sig(deterministicSuggestions(doc, r, [])));
      for (let i = 1; i < sets.length; i++) expect(sets[i]).not.toBe(sets[i - 1]);
      expect(new Set(sets).size).toBe(sets.length);
    });

    it(`never repeats anything the client has already seen across 40 refreshes for ${name}`, () => {
      const seen: string[] = [];
      let prev = '';
      for (let r = 0; r < 40; r++) {
        const out = deterministicSuggestions(doc, r, seen);
        const texts = textsOf(out);
        expect(texts.length).toBeGreaterThan(0);
        expect(excludeSeen(texts, seen)).toEqual(texts);
        expect(sig(out)).not.toBe(prev);
        prev = sig(out);
        seen.push(...texts);
      }
    });
  }

  it('suggests values derived from the blank and marked as placeholders, never invented facts', () => {
    const out = deterministicSuggestions(fixture(), 0, []);
    expect(out.inputs.map((i) => i.blank)).toEqual(['supplier name', 'term length', 'Notes']);
    for (const i of out.inputs) {
      expect(i.value).toContain('[Fill in:');
      expect(i.value.toLowerCase()).toContain(i.blank.toLowerCase());
      expect(i.value).not.toMatch(/\d/);
      expect(i.why.length).toBeGreaterThan(0);
    }
  });

  it('is a pure function of its arguments', () => {
    expect(sig(deterministicSuggestions(fixture(), 3, ['x']))).toBe(sig(deterministicSuggestions(fixture(), 3, ['x'])));
  });

  it('keeps a result when the exclude list swallows the whole pool, avoiding the previous round, and flags it', () => {
    const all = new Set<string>();
    for (let r = 0; r < 300; r++) for (const t of textsOf(deterministicSuggestions(bare(), r, []))) all.add(t);
    const out = deterministicSuggestions(bare(), 5, [...all]);
    expect(out.cycled).toBe(true);
    expect(out.prompts.length).toBeGreaterThan(0);
    const previous = new Set(textsOf(deterministicSuggestions(bare(), 4, [])));
    expect(out.prompts.some((p) => previous.has(p.text))).toBe(false);
  });
});

describe('panel state', () => {
  const result = (round: number, inputs: string[], prompts: string[], extra: Partial<DocSuggestions> = {}): DocSuggestions => ({ inputs: inputs.map((v) => ({ blank: 'b', value: v, why: 'w' })), prompts: prompts.map((t) => ({ text: t, why: 'w' })), round, generatedWith: 'deterministic-fallback', draft: true, flags: [], ...extra });

  it('adds a round, marks only the new items as New and remembers every text seen', () => {
    const s1 = nextPanelState(initialPanelState(), result(0, ['v1'], ['p1']));
    expect([s1.inputs.map((i) => i.isNew), s1.prompts.map((p) => p.isNew)]).toEqual([[true], [true]]);
    const s2 = nextPanelState(startLoading(s1), result(1, ['v2'], ['p2']));
    expect(s2.round).toBe(1);
    expect(s2.loading).toBe(false);
    expect(s2.inputs.map((i) => [i.value, i.isNew])).toEqual([['v2', true], ['v1', false]]);
    expect(s2.prompts.map((p) => [p.text, p.isNew])).toEqual([['p2', true], ['p1', false]]);
    expect(s2.seen).toEqual(['v1', 'p1', 'v2', 'p2']);
  });

  it('asks for the next round only after a success, and keeps asking for the same one after a failure', () => {
    const s1 = nextPanelState(initialPanelState(), result(0, ['v1'], ['p1']));
    expect(s1.round).toBe(0);
    const failed = failPanelState(startLoading(s1), 'HTTP 500');
    expect(failed.error).toBe('HTTP 500');
    expect(failed.loading).toBe(false);
    expect(failed.round).toBe(0);
  });

  it('never leaves old items marked New after an error, and an error clears on the next success', () => {
    const s1 = nextPanelState(initialPanelState(), result(0, ['v1'], ['p1']));
    const failed = failPanelState(startLoading(s1), 'boom');
    expect([...failed.inputs, ...failed.prompts].every((i) => !i.isNew)).toBe(true);
    const ok = nextPanelState(startLoading(failed), result(1, ['v2'], ['p2']));
    expect(ok.error).toBeNull();
  });

  it('shows only the latest rounds but still remembers older texts for the exclude list', () => {
    let s = initialPanelState();
    for (let r = 0; r < 12; r++) s = nextPanelState(startLoading(s), result(r, [`v${r}`], [`p${r}`]));
    expect(s.prompts.length).toBeLessThanOrEqual(12);
    expect(s.seen).toContain('p0');
    expect(s.seen.length).toBeLessThanOrEqual(200);
  });

  it('labels where the suggestions came from', () => {
    expect(generatedWithLabel('anthropic:claude-x', [])).toBe('Model: anthropic:claude-x');
    expect(generatedWithLabel('deterministic-fallback', ['deterministic'])).toBe('Built-in suggestions (no model configured)');
    expect(generatedWithLabel('deterministic-fallback', ['refresh_fallback', 'rate_limited'])).toMatch(/limit/);
    expect(generatedWithLabel('deterministic-fallback', ['refresh_fallback', 'provider_failed'])).toMatch(/unavailable/);
    expect(generatedWithLabel('anthropic:claude-x', ['refresh_fallback', 'mixed_source'])).toBe('Model: anthropic:claude-x (some suggestions are built-in)');
  });
});

describe('Refresh cannot dead-end', () => {
  const longLabel = 'x'.repeat(700);
  const docs: [string, Doc][] = [
    ['three blanks', { ...fixture(), blocks: [...fixture().blocks, { type: 'p', text: F('start date') }] } as Doc],
    ['none', bare()],
    ['a very long blank label', { title: 'Long', blocks: [{ type: 'p', text: F(longLabel) }, { type: 'p', text: F('other  thing') }], meta: {} }],
  ];
  for (const [name, doc] of docs) {
    it(`130 successive clicks all send a valid request and never repeat (${name})`, () => {
      let state = initialPanelState();
      let prev = '';
      let wrapped = false;
      for (let click = 0; click < 130; click++) {
        const round = requestRound(state);
        const exclude = excludeFor(state.seen);
        expect(Number.isInteger(round) && round >= 0 && round <= SUGGEST_LIMITS.maxRound).toBe(true);
        expect(exclude.length).toBeLessThanOrEqual(SUGGEST_LIMITS.maxExclude);
        expect(exclude.every((t) => t.length <= SUGGEST_LIMITS.maxExcludeChars)).toBe(true);
        if (click > 0 && round === 0) wrapped = true;
        const d = deterministicSuggestions(doc, round, exclude);
        const result: DocSuggestions = { inputs: d.inputs, prompts: d.prompts, round, generatedWith: 'deterministic-fallback', draft: true, flags: [] };
        const texts = textsOf(result);
        expect(texts.length).toBeGreaterThan(0);
        expect(texts.every((t) => t.length <= SUGGEST_LIMITS.maxExcludeChars)).toBe(true);
        expect(excludeSeen(texts, exclude)).toEqual(texts);
        expect(sig(result)).not.toBe(prev);
        prev = sig(result);
        state = nextPanelState(startLoading(state), result);
      }
      expect(wrapped).toBe(true);
    });
  }

  it('keeps only the most recent 200 excluded texts, normalised and cut to 500 characters', () => {
    const seen = [...Array.from({ length: 250 }, (_, i) => `t${i}`), `a   b${'y'.repeat(600)}`];
    const out = excludeFor(seen);
    expect(out).toHaveLength(200);
    expect(out[0]).toBe('t51');
    expect(out.at(-1)!.length).toBe(500);
    expect(out.at(-1)!.startsWith('a b')).toBe(true);
  });
});
