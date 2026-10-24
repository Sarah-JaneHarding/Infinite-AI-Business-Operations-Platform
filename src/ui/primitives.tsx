import type { ReactNode } from 'react';
import * as Icons from 'lucide-react';
import type { ArtefactFormat, Doc } from '../core/types';
import { fileName, MIME, render, toHtml } from '../core/artefacts/render';

export function Icon({ name, size = 16 }: { name: string; size?: number }) {
  const I = (Icons as unknown as Record<string, React.ComponentType<{ size?: number }>>)[name] ?? Icons.Circle;
  return <I size={size} />;
}
export const Card = ({ title, right, children, className = '' }: { title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string }) => (
  <section className={`card p-4 ${className}`}>
    {(title || right) && (
      <header className="mb-3 flex items-center justify-between gap-2">
        <h3 className="text-[15px] font-semibold">{title}</h3>
        {right}
      </header>
    )}
    {children}
  </section>
);
export const Badge = ({ tone = '', children }: { tone?: string; children: ReactNode }) => <span className={`badge ${tone}`}>{children}</span>;
export const statusTone = (s: string) => ({ DRAFT: 'draft', IN_REVIEW: 'review', APPROVED: 'ok', REJECTED: 'bad' }[s] ?? '');

export function download(name: string, data: string | Uint8Array, mime: string) {
  const blob = new Blob([data as BlobPart], { type: mime });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export async function downloadDoc(doc: Doc, f: ArtefactFormat) {
  if (f === 'pdf') {
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(toHtml(doc));
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400); // choose "Save as PDF" in the print dialog
    return;
  }
  download(fileName(doc, f), await render(doc, f), MIME[f]);
}
export const FORMAT_LABEL: Record<ArtefactFormat, string> = { md: 'Markdown', html: 'HTML', pdf: 'PDF (print)', csv: 'CSV', json: 'JSON', docx: 'Word', xlsx: 'Excel' };
