import { createHash, timingSafeEqual } from 'node:crypto';

/**
 * Interim identity, until SSO is decided (OPQ-002). Each staff member has an id and a long random token;
 * the server derives who is acting from the token, never from anything the client claims.
 */
export interface AuthUser { id: string; digest: Buffer }
export type Auth = { mode: 'users'; users: AuthUser[] } | { mode: 'open' };

export interface AuthEnv { OPS_USERS?: string; OPS_API_TOKEN?: string; OPS_OPEN_DEV?: string; HOST?: string }

const digest = (t: string) => createHash('sha256').update(t).digest();
const LOOPBACK = new Set(['127.0.0.1', '::1', 'localhost']);

/** Fails closed: a malformed config, or no users on a non-loopback host, stops the server from starting. */
export function parseAuth(env: AuthEnv): Auth {
  const users: AuthUser[] = [];
  const add = (id: string, token: string) => {
    if (!/^[a-z0-9-]{2,40}$/.test(id)) throw new Error(`OPS_USERS: bad user id "${id}" (use a-z, 0-9, "-", 2-40 chars)`);
    if (token.length < 20) throw new Error(`OPS_USERS: token for "${id}" must be at least 20 characters`);
    if (users.some((u) => u.id === id)) throw new Error(`OPS_USERS: duplicate user "${id}"`);
    const d = digest(token);
    if (users.some((u) => timingSafeEqual(u.digest, d))) throw new Error('OPS_USERS: two users share a token');
    users.push({ id, digest: d });
  };
  for (const entry of (env.OPS_USERS ?? '').split(',').map((s) => s.trim()).filter(Boolean)) {
    const i = entry.indexOf(':');
    if (i < 1) throw new Error('OPS_USERS: entries look like id:token');
    add(entry.slice(0, i), entry.slice(i + 1));
  }
  if (env.OPS_API_TOKEN) add('operator', env.OPS_API_TOKEN); // legacy single shared secret
  if (users.length) return { mode: 'users', users };
  if (env.OPS_OPEN_DEV === 'true' || LOOPBACK.has(env.HOST ?? '127.0.0.1')) return { mode: 'open' };
  throw new Error('No users configured (OPS_USERS) and HOST is not loopback. Set OPS_USERS, or OPS_OPEN_DEV=true for a throwaway local container.');
}

/** Constant-time against every user, so timing does not reveal how many characters matched or which user exists. */
export function authenticate(auth: Auth, token: string | undefined): string | null {
  if (auth.mode !== 'users' || !token) return null;
  const d = digest(token);
  let found: string | null = null;
  for (const u of auth.users) if (timingSafeEqual(u.digest, d)) found = u.id;
  return found;
}
