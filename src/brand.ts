/**
 * The one place the company's name, tagline, contact details and colours are written down.
 * Documents, the app shell, the library and the brand kit all read from here (see test/brand.test.ts).
 * Change a detail here, then run `npm run build:library` to refresh the exported documents.
 */
export const BRAND = {
  name: 'Infinite-AI',
  product: 'Infinite-AI Education Ecosystem',
  tagline: 'EDUCATE - INNOVATE - TRANSFORM',
  descriptor: 'An AI-powered education ecosystem for South African primary schools',
  address: { street: '10 Jellicoe Street', town: 'Pinetown', province: 'KwaZulu-Natal', postcode: '3610', country: 'South Africa' },
  phone: '+27 611 939 620',
  phoneTel: '+27611939620',
  email: 'infinite-ai-ecosystem@protonmail.com',
  founder: { name: 'Sarah-Jane Harding', title: 'Founder' },
  colours: {
    deepSpace: '#05070F', midnight: '#0C1224', plasmaCyan: '#5BC8EC', neuralViolet: '#8D6CFF', sparkGold: '#F5B841', iceWhite: '#E9F6FF',
    inkLight: '#12162A', cyanOnLight: '#0A6F8F', violetOnLight: '#4F34D2', mutedDark: '#9DB0D3', mutedLight: '#44506F',
  },
  fonts: { display: 'Space Grotesk', body: 'Inter', mono: 'Space Mono' },
  assets: { logo: '/brand/logo-512.png', logoSmall: '/brand/logo-64.png', founder: '/brand/founder-360.png', share: '/brand/og-share-1200x630.jpg' },
} as const;

export const addressLine1 = `${BRAND.address.street}, ${BRAND.address.town}`;
export const addressLine2 = `${BRAND.address.province}, ${BRAND.address.postcode}, ${BRAND.address.country}`;
export const addressOneLine = `${addressLine1}, ${addressLine2}`;
export const contactLine = `${BRAND.email} · ${BRAND.phone}`;
