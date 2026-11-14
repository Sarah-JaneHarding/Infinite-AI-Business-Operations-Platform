/** South African time is UTC+2 all year (no daylight saving), so date maths is plain arithmetic. */
export const SAST_OFFSET_MS = 2 * 3_600_000;
const pad = (n: number) => String(n).padStart(2, '0');

/** YYYY-MM-DD in South African time. */
export function sastDate(ms: number): string {
  const d = new Date(ms + SAST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
}

/** The UTC instant for a South African wall-clock time. */
export function sastToUtc(date: string, hour: number, minute = 0): number {
  const [y, m, d] = date.split('-').map(Number);
  return Date.UTC(y!, m! - 1, d!, hour, minute) - SAST_OFFSET_MS;
}

/** 0 = Sunday … 6 = Saturday, for a South African calendar date. */
export const sastWeekday = (date: string): number => new Date(`${date}T00:00:00Z`).getUTCDay();

export function addDays(date: string, n: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

export const isDate = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(`${s}T00:00:00Z`));
