import { useState } from 'react';
import { Download, Printer, Save } from 'lucide-react';
import type { ArtefactFormat, Doc } from '../core/types';
import { downloadDoc, FORMAT_LABEL } from './primitives';

export const ALL_FORMATS: ArtefactFormat[] = ['docx', 'pdf', 'md', 'csv', 'json', 'html', 'xlsx'];
const HINT: Record<ArtefactFormat, string> = {
  docx: 'Editable in Word', pdf: 'Opens the print dialog; choose “Save as PDF”', md: 'Plain text with formatting marks', csv: 'Tables only, one block after another', json: 'Structured, for other systems', html: 'A web page', xlsx: 'Tables on separate sheets',
};

/** Choose a format, then download, print or save a copy. Works for any Doc. */
export function ExportBar({ doc, onSave, saveLabel = 'Save copy to library' }: { doc: Doc; onSave?: () => void | Promise<void>; saveLabel?: string }) {
  const [f, setF] = useState<ArtefactFormat>('docx');
  const [busy, setBusy] = useState(false);
  const run = async (fn: () => unknown) => { setBusy(true); try { await fn(); } finally { setBusy(false); } };
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <label className="text-sm font-semibold" htmlFor="fmt">File type</label>
        <select id="fmt" className="select !w-auto" value={f} onChange={(e) => setF(e.target.value as ArtefactFormat)}>
          {ALL_FORMATS.map((x) => <option key={x} value={x}>{FORMAT_LABEL[x]}</option>)}
        </select>
        <button className="btn primary" disabled={busy} onClick={() => run(() => downloadDoc(doc, f))}><Download size={14} /> Download</button>
        <button className="btn" disabled={busy} onClick={() => run(() => downloadDoc(doc, 'pdf'))}><Printer size={14} /> Print</button>
        {onSave && <button className="btn" disabled={busy} onClick={() => run(onSave)}><Save size={14} /> {saveLabel}</button>}
      </div>
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{HINT[f]}. The file is exactly the version shown.</p>
    </div>
  );
}
