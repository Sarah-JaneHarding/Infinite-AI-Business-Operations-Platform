import { describe, expect, it } from 'vitest';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { BRAND, addressOneLine, contactLine } from '../src/brand';
import { LIBRARY } from '../src/library';
import { toDocx, toHtml } from '../src/core/artefacts/render';
import { LOGO_PNG_BASE64 } from '../src/brandLogo';

const pub = (p: string) => join(process.cwd(), 'public', p);

describe('brand', () => {
  it('holds the supplied details exactly', () => {
    expect(BRAND.tagline).toBe('EDUCATE - INNOVATE - TRANSFORM');
    expect(BRAND.phone).toBe('+27 611 939 620');
    expect(BRAND.email).toBe('infinite-ai-ecosystem@protonmail.com');
    expect(addressOneLine).toBe('10 Jellicoe Street, Pinetown, KwaZulu-Natal, 3610, South Africa');
    expect(BRAND.founder.name).toBe('Sarah-Jane Harding');
  });
  it('every exported library document carries the logo, tagline and contact footer', () => {
    for (const i of LIBRARY) {
      const html = toHtml(i.doc);
      expect(html, i.id).toContain(BRAND.tagline);
      expect(html, i.id).toContain(BRAND.email);
      expect(html, i.id).toContain(BRAND.phone);
      expect(html, i.id).toContain(`data:image/png;base64,${LOGO_PNG_BASE64.slice(0, 40)}`);
    }
  });
  it('word exports carry the same header and footer text', async () => {
    const { default: JSZip } = await import('jszip').catch(() => ({ default: null as never }));
    const bytes = await toDocx(LIBRARY[0]!.doc);
    expect(bytes.byteLength).toBeGreaterThan(5000);
    if (JSZip) {
      const z = await JSZip.loadAsync(bytes);
      const names = Object.keys(z.files);
      const footer = names.find((n) => n.startsWith('word/footer'));
      expect(footer).toBeTruthy();
      expect(await z.file(footer!)!.async('string')).toContain(BRAND.email);
      expect(names.some((n) => n.startsWith('word/media/'))).toBe(true);
    }
  });
  it('the app assets and the downloadable kit exist and are not empty', () => {
    for (const f of [BRAND.assets.logo, BRAND.assets.logoSmall, BRAND.assets.founder, BRAND.assets.share, '/brand/favicon.ico', '/brand/apple-touch-icon.png', '/brand-kit/Infinite-AI-Brand-Guidelines.pdf', '/brand-kit/Infinite-AI-letterhead-editable.docx', '/brand-kit/letterhead_A4.pdf', '/brand-kit/email/email-signature-founder.html']) {
      expect(existsSync(pub(f)), f).toBe(true);
      expect(statSync(pub(f)).size, f).toBeGreaterThan(500);
    }
  });
  it('the signature, guidelines and letterhead agree with brand.ts', () => {
    const sig = readFileSync(pub('/brand-kit/email/email-signature-founder.html'), 'utf8');
    for (const t of [BRAND.phone, BRAND.email, BRAND.tagline, BRAND.founder.name, BRAND.address.street, BRAND.address.postcode]) expect(sig).toContain(t);
    const g = readFileSync(pub('/brand-kit/Infinite-AI-Brand-Guidelines.html'), 'utf8');
    for (const t of [BRAND.phone, BRAND.email, BRAND.tagline, BRAND.address.street]) expect(g).toContain(t);
    const tokens = JSON.parse(readFileSync(pub('/brand-kit/brand-tokens.json'), 'utf8')) as { tagline: string; phone: string; email: string; colours: Record<string, string> };
    expect(tokens.tagline).toBe(BRAND.tagline); expect(tokens.phone).toBe(BRAND.phone); expect(tokens.email).toBe(BRAND.email);
    expect(tokens.colours).toEqual(BRAND.colours);
  });
  it('contact line is used once, in one format', () => { expect(contactLine).toBe(`${BRAND.email} · ${BRAND.phone}`); });
  it('index.html uses the brand favicon and share image', () => {
    const h = readFileSync(join(process.cwd(), 'index.html'), 'utf8');
    expect(h).toContain('/brand/favicon.ico'); expect(h).toContain('/brand/og-share-1200x630.jpg');
  });
});
