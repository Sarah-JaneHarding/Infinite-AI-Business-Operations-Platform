/**
 * Outbound integration: send a ratified artefact to a host the operator has explicitly allowed.
 * Off unless OPS_OUTBOUND_ALLOWLIST names at least one host. Only https, only exact host matches, never an IP or an internal name,
 * and the resolved address is checked again before connecting (see isPrivateIp).
 * The request URL is rebuilt from the allow-list's own host string and a validated path, so typed text never becomes the hostname.
 */
import { createHmac } from 'node:crypto';
import { isIP } from 'node:net';
import type { Artefact } from '../core/platform';

export const parseAllowlist = (v?: string): string[] => (v ?? '').split(',').map((h) => h.trim().toLowerCase()).filter(Boolean);

export type Target = { ok: true; url: URL } | { ok: false; why: string };
export function checkTarget(raw: string, allow: string[]): Target {
  if (!allow.length) return { ok: false, why: 'Outbound sending is off: OPS_OUTBOUND_ALLOWLIST is not set.' };
  let u: URL;
  try { u = new URL(raw); } catch { return { ok: false, why: 'That is not a valid URL.' }; }
  if (u.protocol !== 'https:') return { ok: false, why: 'Only https addresses are allowed.' };
  if (u.username || u.password) return { ok: false, why: 'Addresses with a user name or password are not allowed.' };
  if (u.port && u.port !== '443') return { ok: false, why: 'Only the standard https port is allowed.' };
  const host = u.hostname.toLowerCase().replace(/\.$/, '');
  if (isIP(host) || host.startsWith('[') || !host.includes('.') || /(^|\.)(localhost|local|internal|lan|home|corp)$/.test(host)) return { ok: false, why: 'Internal and numeric addresses are not allowed.' };
  // The hostname of the request is the operator's own allow-list entry, never the typed text.
  const allowed = allow.find((h) => h === host);
  if (allowed === undefined) return { ok: false, why: `${host} is not on the allowed list.` };
  // The URL parser resolves dot segments silently, so the path is checked as it was typed.
  const typed = /^[a-z][a-z0-9+.-]*:\/\/[^/?#]*([^?#]*)/i.exec(raw.trim())?.[1] ?? '';
  const path = safePath(typed === '' ? '/' : typed);
  if (path === undefined) return { ok: false, why: 'That path is not allowed: no "..", encoded slashes, backslashes or control characters.' };
  // Query and fragment are dropped: incoming-webhook addresses (Slack, Teams, Zapier) carry their key in the path.
  return { ok: true, url: new URL(`https://${allowed}${path}`) };
}

/** A path made only of ordinary segments. Refuses traversal ("." / ".."), encoded or raw backslashes and slashes inside a segment, and control characters. */
export function safePath(pathname: string): string | undefined {
  if (pathname.length > 512 || /[\\\u0000-\u001f\u007f]/.test(pathname)) return undefined;
  for (const seg of pathname.split('/')) {
    let d: string;
    try { d = decodeURIComponent(seg); } catch { return undefined; }
    if (d === '.' || d === '..' || /[\\/\u0000-\u001f]/.test(d)) return undefined;
  }
  return pathname.startsWith('/') ? pathname : `/${pathname}`;
}

/** True for loopback, private, link-local, unique-local and other non-public addresses. */
export function isPrivateIp(ip: string): boolean {
  const v = isIP(ip);
  if (v === 4) {
    const [a, b] = ip.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
  }
  if (v === 6) {
    const l = ip.toLowerCase();
    if (l === '::' || l === '::1') return true;
    const m = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(l);
    if (m) return isPrivateIp(m[1]);
    return /^(fc|fd|fe[89ab])/.test(l) || l.startsWith('ff');
  }
  return true; // not an address we understand: refuse
}

export function payloadFor(a: Artefact) {
  return { id: a.id, title: a.title, version: a.version, status: a.status, agent: a.agentId, approvedBy: a.approvedBy ?? null, at: a.at, doc: a.doc };
}
export const sign = (secret: string, body: string) => `sha256=${createHmac('sha256', secret).update(body).digest('hex')}`;
