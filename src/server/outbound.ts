/**
 * Outbound integration: send a ratified artefact to a host the operator has explicitly allowed.
 * Off unless OPS_OUTBOUND_ALLOWLIST names at least one host. Only https, only exact host matches, never an IP or an internal name,
 * and the resolved address is checked again before connecting (see isPrivateIp).
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
  if (!allow.includes(host)) return { ok: false, why: `${host} is not on the allowed list.` };
  return { ok: true, url: u };
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
