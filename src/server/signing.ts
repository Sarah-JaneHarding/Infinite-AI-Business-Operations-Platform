import type { Auth } from './auth';
import type { ReadStore } from './validate';
import { DEFAULT_SIGNING, PROFESSIONS, holdsProfession, type Profession, type SigningPolicy } from '../core/signing';

/**
 * People who may sign for the business, and for which departments. Configured, never client-supplied.
 * `|` and `;` cannot appear in a registration (they are the field and entry separators). An empty or whitespace-only
 * OPS_SIGNERS, OPS_SIGNING_MODE or OPS_SOLO_WAIT_MINUTES means unset (`.env.example` ships them empty, and dotenv and
 * compose `env_file` load that as ""): no registry, dual, ten minutes. Any other bad value throws.
 */
export interface Signer {
  id: string;
  name: string;
  scope: '*' | readonly string[];
  profession?: Profession;
  registration?: string;
}
export interface SigningEnv { OPS_SIGNERS?: string; OPS_SIGNING_MODE?: string; OPS_SOLO_WAIT_MINUTES?: string }

const isProfession = (v: string): v is Profession => (PROFESSIONS as readonly string[]).includes(v);

/** Fails closed: any malformed entry stops the server from starting. No registry means legacy behaviour. */
export function parseSigners(raw: string | undefined, auth: Auth, knownDepartments: readonly string[]): Signer[] {
  const entries = (raw ?? '').split(';').map((s) => s.trim()).filter(Boolean);
  if (!entries.length) return [];
  if (auth.mode === 'open') throw new Error('OPS_SIGNERS: signers need named users; set OPS_USERS (open mode has no identities)');
  const signers: Signer[] = [];
  for (const entry of entries) {
    const parts = entry.split('|').map((s) => s.trim());
    if (parts.length !== 3 && parts.length !== 5) {
      throw new Error('OPS_SIGNERS: entries look like id|Display Name|scope or id|Display Name|scope|profession|registration');
    }
    const [id, name, scopeRaw, profession, registration] = parts;
    if (!id || !name || !scopeRaw) throw new Error(`OPS_SIGNERS: entry "${entry}" has an empty field`);
    if (!auth.users.some((u) => u.id === id)) throw new Error(`OPS_SIGNERS: "${id}" is not a user in OPS_USERS`);
    if (signers.some((s) => s.id === id)) throw new Error(`OPS_SIGNERS: duplicate signer "${id}"`);
    let scope: '*' | string[];
    if (scopeRaw === '*') scope = '*';
    else {
      scope = scopeRaw.split('+').map((d) => d.trim());
      if (scope.includes('*')) throw new Error(`OPS_SIGNERS: "*" cannot be combined with departments for "${id}"`);
      if (scope.some((d) => !d)) throw new Error(`OPS_SIGNERS: empty department in the scope for "${id}"`);
      if (new Set(scope).size !== scope.length) throw new Error(`OPS_SIGNERS: duplicate department in the scope for "${id}"`);
      for (const d of scope) {
        if (!knownDepartments.includes(d)) throw new Error(`OPS_SIGNERS: unknown department "${d}" for "${id}"`);
      }
    }
    const signer: Signer = { id, name, scope };
    if (parts.length === 5) {
      if (!profession || !isProfession(profession)) {
        throw new Error(`OPS_SIGNERS: unknown profession "${profession}" for "${id}" (use ${PROFESSIONS.join(', ')})`);
      }
      if (scope === '*') throw new Error(`OPS_SIGNERS: professional "${id}" needs a department scope, not "*"`);
      if (!registration) throw new Error(`OPS_SIGNERS: professional "${id}" needs registration text`);
      signer.profession = profession;
      signer.registration = registration;
    }
    signers.push(signer);
  }
  return signers;
}

/** Empty or whitespace-only counts as unset. */
const setting = (v: string | undefined): string | undefined => (v === undefined || v.trim() === '' ? undefined : v.trim());

/**
 * Fails closed: solo mode is only valid with named users and exactly ONE non-professional signer (the person who signs
 * alone). Any number of professional signers may be registered beside them: they are department-scoped and are the
 * different person a professionalReview artefact needs.
 */
export function parseSigningPolicy(env: SigningEnv, signers: readonly Signer[], auth: Auth): SigningPolicy {
  const modeRaw = setting(env.OPS_SIGNING_MODE) ?? DEFAULT_SIGNING.mode;
  if (modeRaw !== 'solo' && modeRaw !== 'dual') throw new Error(`OPS_SIGNING_MODE: unknown mode "${modeRaw}" (use solo or dual)`);
  let waitMs = DEFAULT_SIGNING.waitMs;
  const t = setting(env.OPS_SOLO_WAIT_MINUTES);
  if (t !== undefined) {
    const minutes = /^\d+$/.test(t) ? Number(t) : NaN;
    if (!Number.isInteger(minutes) || minutes < 1 || minutes > 1440) {
      throw new Error('OPS_SOLO_WAIT_MINUTES: must be a whole number from 1 to 1440');
    }
    waitMs = minutes * 60_000;
  }
  if (modeRaw === 'solo') {
    if (auth.mode === 'open') throw new Error('OPS_SIGNING_MODE: solo needs named users (OPS_USERS), not open mode');
    const plain = signers.filter((s) => s.profession === undefined).length;
    if (plain !== 1) {
      throw new Error(`OPS_SIGNING_MODE: solo needs exactly one non-professional signer in OPS_SIGNERS (found ${plain}); professional signers (attorney, accountant, tax_practitioner) may be added beside them`);
    }
  }
  return { mode: modeRaw, waitMs };
}

export function maySignFor(signers: readonly Signer[], personId: string, department: string | undefined): boolean {
  const s = signers.find((x) => x.id === personId);
  if (!s) return false;
  if (s.scope === '*') return true;
  return department !== undefined && s.scope.includes(department);
}

/** True only if this person is registered with exactly the required profession. */
export function maySignProfessional(signers: readonly Signer[], personId: string, required: Profession): boolean {
  return holdsProfession(signers, personId, required);
}

export interface SingleSignerItem {
  artefactId: string;
  title: string;
  agentId: string;
  kind: 'self-countersign' | 'self-approval';
  signer: string;
  ratifiedAt: string;
  docHash: string;
}

/** Ratified or ingested artefacts that went through a one-person path, for a second review. Read-only; latest version per id only. */
export function singleSignerReport(store: ReadStore): { count: number; items: SingleSignerItem[] } {
  const latest = new Map<string, Record<string, unknown>>();
  for (const r of store.list('artefact_versions')) latest.set(String(r.id), r as Record<string, unknown>);
  const items: SingleSignerItem[] = [];
  for (const [id, r] of latest) {
    if ((r.status !== 'RATIFIED' && r.status !== 'INGESTED') || r.signing !== 'single-signer') continue;
    const selfCounter = r.approvedBy === r.countersignedBy;
    items.push({
      artefactId: id,
      title: String(r.title ?? ''),
      agentId: String(r.agentId ?? ''),
      kind: selfCounter ? 'self-countersign' : 'self-approval',
      signer: String(selfCounter ? r.approvedBy : r.requestedBy),
      ratifiedAt: String(r.ratifiedAt ?? ''),
      docHash: String(r.docHash ?? '')
    });
  }
  items.sort((a, b) => (a.ratifiedAt < b.ratifiedAt ? -1 : a.ratifiedAt > b.ratifiedAt ? 1 : 0));
  return { count: items.length, items };
}
