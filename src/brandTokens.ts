import { BRAND } from './brand';

/** Semantic roles for colour. Every role maps to one value that already exists in the repo. */
export type ColourRole =
  | 'bg' | 'surface' | 'surfaceRaised' | 'border' | 'borderStrong'
  | 'text' | 'textSoft' | 'textMuted' | 'textSubtle'
  | 'primary' | 'primaryText' | 'accent' | 'highlight' | 'success' | 'danger';

export interface FontToken { family: string; stack: string }

export interface BrandTokens {
  colour: Record<ColourRole, string>;
  font: { display: FontToken; body: FontToken; mono: FontToken };
  radius: { card: string };
}

/** A 6-digit hex colour. */
export const HEX = /^#[0-9A-Fa-f]{6}$/;

/**
 * Typed source of the semantic tokens. Brand-owned values are read from BRAND (src/brand.ts);
 * the rest are copied exactly from the working palette in src/index.css.
 */
export const BRAND_TOKENS: BrandTokens = {
  colour: {
    bg: BRAND.colours.deepSpace, // BRAND.colours.deepSpace
    surface: BRAND.colours.midnight, // BRAND.colours.midnight
    surfaceRaised: '#0B132B', // src/index.css --card2
    border: '#1E293B', // src/index.css --line
    borderStrong: '#334155', // src/index.css --line-strong
    text: '#F8FAFC', // src/index.css --ink
    textSoft: '#E2E8F0', // src/index.css p colour
    textMuted: '#CBD5E1', // src/index.css --muted
    textSubtle: '#94A3B8', // src/index.css --muted-soft
    primary: BRAND.colours.plasmaCyan, // BRAND.colours.plasmaCyan
    primaryText: BRAND.colours.deepSpace, // BRAND.colours.deepSpace
    accent: BRAND.colours.neuralViolet, // BRAND.colours.neuralViolet
    highlight: BRAND.colours.sparkGold, // BRAND.colours.sparkGold
    success: '#34D399', // src/index.css --emerald
    danger: '#FB7185', // src/index.css --rose
  },
  font: {
    display: { family: BRAND.fonts.display, stack: "'Space Grotesk', system-ui, sans-serif" }, // BRAND.fonts.display; src/index.css --fd
    body: { family: BRAND.fonts.body, stack: 'Inter, system-ui, sans-serif' }, // BRAND.fonts.body; src/index.css --fb
    mono: { family: BRAND.fonts.mono, stack: "'Space Mono', ui-monospace, monospace" }, // BRAND.fonts.mono; src/index.css --fm
  },
  radius: {
    card: '14px', // src/index.css .card border-radius
  },
};
