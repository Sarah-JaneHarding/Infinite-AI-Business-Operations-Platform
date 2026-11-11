import { describe, expect, it } from 'vitest';
import { TEMPLATES } from '../src/departments/templates';
import { toDocx, toMarkdown, toXlsx, toJson, toCsv, toHtml } from '../src/core/artefacts/render';
import { docText } from '../src/core/documents';
import { detectPii } from '../src/core/guardrails/pii';

describe('templates', () => {
  it('has unique ids and both groups', () => {
    expect(new Set(TEMPLATES.map((t) => t.id)).size).toBe(TEMPLATES.length);
    expect(TEMPLATES.some((t) => t.group === 'business')).toBe(true);
    expect(TEMPLATES.some((t) => t.group === 'customer')).toBe(true);
  });
  it('every template renders in every format and has fill-in markers', async () => {
    for (const t of TEMPLATES) {
      expect(docText(t.doc)).toContain('Fill in');
      expect(toMarkdown(t.doc).length).toBeGreaterThan(50);
      expect(toHtml(t.doc)).toContain('<');
      expect(() => toJson(t.doc)).not.toThrow();
      expect(typeof toCsv(t.doc)).toBe('string');
      expect((await toDocx(t.doc)).length).toBeGreaterThan(500);
      expect((await toXlsx(t.doc)).length).toBeGreaterThan(200);
    }
  });
  it('carries no personal details and no invented rand amounts', () => {
    for (const t of TEMPLATES) {
      const text = docText(t.doc);
      expect(detectPii(text).length, t.id).toBe(0);
      expect(/R\s?\d/.test(text), t.id).toBe(false);
    }
  });
  it('legal-weight templates say who must review them', () => {
    for (const id of ['tpl-privacy-notice', 'tpl-pilot-summary', 'tpl-consent-case-study', 'tpl-school-quote']) expect(TEMPLATES.find((t) => t.id === id)?.review).toBeTruthy();
  });
});
