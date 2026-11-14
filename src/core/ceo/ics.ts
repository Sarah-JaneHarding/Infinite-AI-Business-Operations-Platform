/** iCalendar (RFC 5545) text for the CEO calendar. Works with Google Calendar, Outlook and Apple Calendar "subscribe by URL". No attendees, no personal data. */
import type { Block, CalEvent } from './types';

const esc = (s: string) => s.replace(/\\/g, '\\\\').replace(/;/g, '\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
const stamp = (iso: string) => new Date(iso).toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');

/** Lines are folded at 75 octets, continuation lines start with one space. */
export function fold(line: string): string {
  const enc = new TextEncoder();
  if (enc.encode(line).length <= 75) return line;
  const out: string[] = [];
  let cur = '';
  let size = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    if (size + n > (out.length ? 74 : 75)) { out.push(cur); cur = ''; size = 0; }
    cur += ch; size += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function toIcs(blocks: Block[], events: CalEvent[], now: number, name = 'Infinite-AI CEO calendar'): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Infinite-AI//Business Operations Platform//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${esc(name)}`, 'X-WR-TIMEZONE:Africa/Johannesburg', 'REFRESH-INTERVAL;VALUE=DURATION:PT1H', 'X-PUBLISHED-TTL:PT1H'];
  const dtstamp = stamp(new Date(now).toISOString());
  const add = (uid: string, summary: string, start: string, end: string, desc?: string, cat?: string) => {
    lines.push('BEGIN:VEVENT', `UID:${uid}@infinite-ai-ecosystem`, `DTSTAMP:${dtstamp}`, `DTSTART:${stamp(start)}`, `DTEND:${stamp(end)}`, `SUMMARY:${esc(summary)}`);
    if (desc) lines.push(`DESCRIPTION:${esc(desc)}`);
    if (cat) lines.push(`CATEGORIES:${esc(cat)}`);
    lines.push('TRANSP:OPAQUE', 'END:VEVENT');
  };
  for (const b of blocks) add(b.id, b.title, b.start, b.end, b.reason, b.dept);
  for (const e of events.filter((x) => !x.deleted)) add(`evt:${e.id}`, e.title, e.start, e.end);
  lines.push('END:VCALENDAR');
  return lines.map(fold).join('\r\n') + '\r\n';
}
