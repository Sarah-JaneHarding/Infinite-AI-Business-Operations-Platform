import type { Doc } from './types';

/** Shown on every printed, downloaded or saved copy of a document that carries the `needs-review` flag. */
export const NEEDS_REVIEW_NOTICE = 'No professional review recorded.';

/** The notice an artefact's flags call for, or null. */
export const noticeFor = (flags: readonly string[]): string | null => (flags.includes('needs-review') ? NEEDS_REVIEW_NOTICE : null);

/**
 * A copy of `doc` with the notice as its first block, for print, download and save. Pure: the stored document, and so its
 * content hash, never changes. Applying it twice gives the same result. `null` returns the input unchanged.
 */
export function withNotice(doc: Doc, notice: string | null): Doc {
  if (!notice) return doc;
  const first = doc.blocks[0];
  if (first && first.type === 'callout' && first.text === notice) return doc;
  return { ...doc, blocks: [{ type: 'callout', tone: 'warn', text: notice }, ...doc.blocks] };
}
