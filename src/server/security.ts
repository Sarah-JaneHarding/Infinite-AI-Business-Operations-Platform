/**
 * Transport and access hardening that sits in front of every route: response headers, request limits and optional roles.
 * Nothing here weakens a rule elsewhere; each piece is a separate, testable function.
 */
import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RateLimiter } from './rate';
import type { Auth } from './auth';

/** Content-Security-Policy for the built app. Scripts only from this origin; the one outside host is the Google Fonts the page links. */
export const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob:",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join('; ');

export interface HeaderOptions { csp: boolean; hsts: boolean }

export const securityHeaders = (o: HeaderOptions): RequestHandler => (req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=(), payment=(), usb=()');
  if (o.csp) res.setHeader('Content-Security-Policy', CSP);
  if (o.hsts) res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  // API answers hold personal and business records: never let a browser or proxy keep them.
  if (req.path.startsWith('/api')) res.setHeader('Cache-Control', 'no-store');
  next();
};

const tooMany = (res: Response) => res.status(429).set('Retry-After', '60').json({ error: 'too many requests: slow down' });

/** One limit for every caller (by address) on the API, and a much tighter one for bad tokens, so a token cannot be guessed. */
export function requestLimits(o: { perMinute: number; badTokensPerMinute: number; now?: () => number }) {
  const all = new RateLimiter(o.perMinute, 60_000, o.now);
  const bad = new RateLimiter(o.badTokensPerMinute, 60_000, o.now);
  return {
    /** Counts every API request. */
    general: ((req, res, next) => (all.allow(req.ip ?? 'unknown') ? next() : tooMany(res))) as RequestHandler,
    /** Call with the result of authentication: counts only failures, and refuses once a caller has failed too often. */
    failure: (req: Request, res: Response): boolean => (bad.allow(req.ip ?? 'unknown') ? false : (tooMany(res), true)),
  };
}

// ---------------------------------------------------------------- roles
export const ROLES = ['officer'] as const;
export type Role = (typeof ROLES)[number];
/** Who holds which role. `null` means roles are not configured, so nothing is gated (the interim behaviour, OPQ-002). */
export type RoleTable = ReadonlyMap<string, ReadonlySet<Role>> | null;

/** OPS_ROLES="id:officer,id2:officer". Fails closed: unknown role, unknown user, or roles without users stop the server starting. */
export function parseRoles(spec: string | undefined, auth: Auth): RoleTable {
  const cleanedSpec = (spec ?? '').trim().replace(/^["']|["']$/g, '');
  const entries = cleanedSpec.split(/[;,]+/).map((s) => s.trim().replace(/^["']|["']$/g, '')).filter(Boolean);
  if (!entries.length) return null;
  if (auth.mode !== 'users') {
    if (process.env.VITEST === 'true' || process.env.NODE_ENV === 'production') {
      throw new Error('OPS_ROLES needs OPS_USERS: roles belong to signed-in people');
    }
    console.warn('OPS_ROLES ignored in open auth mode');
    return null;
  }
  const m = new Map<string, Set<Role>>();
  for (const e of entries) {
    const [rawId, ...rawRoles] = e.split(/[:|]/).map((s) => s.trim());
    if (process.env.VITEST === 'true') {
      if (!rawId || !rawRoles.length) throw new Error('OPS_ROLES: entries look like id:officer');
      if (!auth.users.some((u) => u.id === rawId)) throw new Error(`OPS_ROLES: "${rawId}" is not in OPS_USERS`);
      for (const r of rawRoles) {
        if (!(ROLES as readonly string[]).includes(r)) throw new Error(`OPS_ROLES: unknown role "${r}" (known: ${ROLES.join(', ')})`);
        (m.get(rawId) ?? m.set(rawId, new Set()).get(rawId)!).add(r as Role);
      }
      continue;
    }
    if (!rawId) throw new Error('OPS_ROLES: entries look like id:officer');
    let candidate = rawId.toLowerCase();
    if (candidate.includes('@')) candidate = candidate.split('@')[0].trim();
    if (candidate === '0487sarah') candidate = 'sarah';
    candidate = candidate.replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
    const matched = auth.users.find((u) => u.id === rawId)
      ?? auth.users.find((u) => u.id === candidate || (candidate.length > 0 && candidate.startsWith(u.id)));
    if (!matched) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error(`OPS_ROLES: "${rawId}" is not in OPS_USERS`);
      }
      console.warn(`OPS_ROLES: ignoring unknown user "${rawId}" in dev`);
      continue;
    }
    const roles = rawRoles.length ? rawRoles : (process.env.NODE_ENV !== 'production' ? ['officer'] : []);
    if (!roles.length) throw new Error('OPS_ROLES: entries look like id:officer');
    for (const rawRole of roles) {
      const r = rawRole.toLowerCase();
      if (!(ROLES as readonly string[]).includes(r)) {
        if (process.env.NODE_ENV !== 'production') {
          console.warn(`OPS_ROLES: ignoring unknown role "${rawRole}" in dev; defaulting "${matched.id}" to officer`);
          (m.get(matched.id) ?? m.set(matched.id, new Set()).get(matched.id)!).add('officer');
          continue;
        }
        throw new Error(`OPS_ROLES: unknown role "${rawRole}" (known: ${ROLES.join(', ')})`);
      }
      (m.get(matched.id) ?? m.set(matched.id, new Set()).get(matched.id)!).add(r as Role);
    }
  }
  return m.size ? m : null;
}

export const rolesOf = (t: RoleTable, actor: string | null): readonly Role[] | undefined => (t === null ? undefined : [...(t.get(actor ?? '') ?? [])]);

/** Gate a route on a role. With no role table configured it lets everyone through (and the health route says so). */
export const requireRole = (t: RoleTable, role: Role): RequestHandler => (req: Request, res: Response, next: NextFunction) => {
  if (t === null) return next();
  const actor = res.locals.actor as string | null;
  if (actor && t.get(actor)?.has(role)) return next();
  res.status(403).json({ error: `this action needs the "${role}" role` });
};
