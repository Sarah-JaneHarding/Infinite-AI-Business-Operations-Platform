// "No invented metrics." Every figure in a draft must be sourced, or it is stripped.
//
// A figure is sourced when (a) its sentence carries a [src:…] tag, or (b) the figure appears in the
// caller-supplied `allowed` set (numbers the human typed in, or numbers read from a real record).
// Dates, years, versions, ordinals-in-lists and identifier digits (OQ-016, A01, Stage 12) are not "claims".

export interface ClaimResult {
  text: string;
  stripped: string[];
  sourced: number;
}

const NUMBER = /(?<![A-Za-z0-9_.\-/])(?:R\s?|\$|US\$)?\d[\d,\s]*(?:\.\d+)?\s?(?:%|[kKmMbB]\b|bn\b)?(?![A-Za-z0-9_\-/])/g;

function isExempt(raw: string, before: string, after: string): boolean {
  const n = raw.replace(/[R$,\s%kKmMbB]|US|bn/g, '');
  if (/^(19|20)\d{2}$/.test(n)) return true; // year
  if (n.length <= 1 && !/[%R$]/.test(raw)) return true; // single digits in prose ("2 options") are not metrics
  if (/(?:iso|iec|nist|sp|soc|sections?|ss?|act|no|pr|issue|rfc|cis|owasp|oq|ac|mod|le)\.?\s*$/i.test(before) || /#\s*$/.test(before)) return true; // standard / section / PR identifiers
  if (/(?:^|\s)(stage|step|phase|section|part|week|term|grade|gate|tier|level|l|q|fy|b|v|a|sprint|rule|day)\s*$/i.test(before)) return true;
  if (/^\s*(?:\.|\)|:)\s/.test(after) && before.trim() === '') return true; // list marker "1."
  return false;
}

export function enforceSourcing(text: string, allowed: Iterable<string | number> = []): ClaimResult {
  const allow = new Set([...allowed].map((v) => String(v).replace(/[R$,\s%]/g, '').toLowerCase()));
  const stripped: string[] = [];
  let sourced = 0;
  const lines = text.split('\n').map((line) => {
    if (/^\s*\|[\s:|-]+\|\s*$/.test(line)) return line; // table separator
    // split sentences but keep delimiters so we can rejoin untouched
    return line
      .split(/(?<=[.!?;])\s+/)
      .map((sentence) => {
        const hasTag = /\[src:[^\]]+\]/.test(sentence);
        return sentence.replace(NUMBER, (raw, offset: number, whole: string) => {
          const before = whole.slice(0, offset).replace(/\[src:[^\]]*\]/g, '');
          const after = whole.slice(offset + raw.length);
          if (isExempt(raw, before, after)) return raw;
          const norm = raw.replace(/[R$,\s%]/g, '').toLowerCase();
          if (hasTag || allow.has(norm)) {
            sourced++;
            return raw;
          }
          stripped.push(raw.trim());
          return '[UNSOURCED]';
        });
      })
      .join(' ');
  });
  return { text: lines.join('\n'), stripped, sourced };
}
