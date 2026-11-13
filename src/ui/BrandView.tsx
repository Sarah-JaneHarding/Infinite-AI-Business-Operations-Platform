import { Badge, Card } from './primitives';
import { BRAND, addressLine1, addressLine2 } from '../brand';

const FILES: [string, string, string][] = [
  ['Brand guidelines (PDF)', '/brand-kit/Infinite-AI-Brand-Guidelines.pdf', 'Logo use, colours, type, voice and the full asset index'],
  ['Letterhead, editable (Word)', '/brand-kit/Infinite-AI-letterhead-editable.docx', 'Two blanks: company registration and VAT numbers'],
  ['Letterhead, print ready (PDF)', '/brand-kit/letterhead_A4.pdf', 'A4'],
  ['Email signature (founder)', '/brand-kit/email/email-signature-founder.html', 'Open in a browser, select all, copy and paste into your mail settings'],
  ['Logo, 512 px', BRAND.assets.logo, 'Square master for profiles and icons'],
  ['Founder photo, 360 px', BRAND.assets.founder, 'Use at this size or smaller'],
  ['Link-preview image', BRAND.assets.share, '1200 × 630'],
];

export function BrandView() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-4">
        <img src={BRAND.assets.logo} alt={BRAND.name} width={120} height={120} className="rounded-2xl" />
        <div><h1 className="text-2xl font-bold">Brand kit</h1><p className="mono text-sm" style={{ color: 'var(--cyan)', letterSpacing: '.14em' }}>{BRAND.tagline}</p><p style={{ color: 'var(--muted)' }}>{BRAND.descriptor}.</p></div>
      </div>
      <div className="grid gap-4 lg:grid-cols-2">
        <Card title="Company details">
          <address className="not-italic text-sm leading-7"><b>{BRAND.name}</b><br />{addressLine1}<br />{addressLine2}<br /><a className="underline" href={`tel:${BRAND.phoneTel}`}>{BRAND.phone}</a><br /><a className="underline" href={`mailto:${BRAND.email}`}>{BRAND.email}</a></address>
          <p className="mt-2 text-xs" style={{ color: 'var(--muted)' }}>These come from one file, src/brand.ts. Exported documents carry the same footer.</p>
        </Card>
        <Card title="Founder">
          <div className="flex items-center gap-4"><img src={BRAND.assets.founder} alt={BRAND.founder.name} width={96} height={96} className="rounded-full" style={{ boxShadow: '0 0 0 3px var(--cyan)' }} /><div><b>{BRAND.founder.name}</b><div className="text-sm" style={{ color: 'var(--muted)' }}>{BRAND.founder.title}, {BRAND.name}</div></div></div>
        </Card>
      </div>
      <Card title="Colours">
        <div className="grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6">
          {Object.entries(BRAND.colours).slice(0, 6).map(([k, v]) => (
            <div key={k} className="rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}><div className="h-10 rounded" style={{ background: v, border: '1px solid var(--line)' }} /><div className="mt-1 text-xs font-semibold">{k}</div><div className="mono text-[11px]" style={{ color: 'var(--muted)' }}>{v}</div></div>
          ))}
        </div>
      </Card>
      <Card title="Downloads" right={<Badge tone="info">the full kit (social, cards, banners) is in the project</Badge>}>
        <ul className="space-y-2">
          {FILES.map(([n, href, d]) => (
            <li key={href} className="flex flex-wrap items-baseline justify-between gap-2 rounded-lg border p-2" style={{ borderColor: 'var(--line)' }}><span><b>{n}</b> <span className="text-xs" style={{ color: 'var(--muted)' }}>{d}</span></span><a className="btn" href={href} download>Download</a></li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
