import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from '../core/platform';
import { DEFAULT_SIGNING, type Profession, type SigningPolicy } from '../core/signing';
import { LocalStorageAdapter, type StorageAdapter } from '../core/warehouse';
import { ServerAdapter, serverSequencer } from '../core/serverAdapter';
import { remoteEngine } from '../core/gateway';
import { apiFetch, loadToken, setToken } from '../core/api';
import { snapshotFacts } from '../connector/snapshot';
import type { LiveStatus } from '../connector/github';
import type { Actor } from '../core/types';
import type { Rec } from '../core/warehouse';
import { buildCeoState, mergeCollections, type CeoState } from '../core/ceo';
import { agentById, DEPARTMENTS } from '../departments';

/** How often the CEO command centre re-reads the data and recomputes: the monitor is a loop, not a button. */
export const MONITOR_SECONDS = 30;

export interface Health { ok: boolean; repo: string; auth: 'users' | 'open'; githubToken: boolean; llm: boolean; ecosystemWrites: boolean; prWrites?: boolean; webhook: boolean; outbound?: boolean; inbound?: boolean; calendarFeed?: boolean }
export type View = { name: 'overview' } | { name: 'dept'; id: string } | { name: 'studio'; id?: string; docId?: string } | { name: 'brain' } | { name: 'ledger' } | { name: 'warehouse' } | { name: 'connector' } | { name: 'guardrails' } | { name: 'copilot' } | { name: 'cost' } | { name: 'showcase' } | { name: 'erasure' } | { name: 'models' } | { name: 'board' } | { name: 'autonomy' } | { name: 'contracts' } | { name: 'brand' } | { name: 'ceo' } | { name: 'oq' } | { name: 'questions'; id?: string };

interface Ctx {
  p: Platform | null;
  mode: 'server' | 'local' | 'starting';
  health: Health | null;
  live: { status: LiveStatus; facts: Record<string, string | number> } | null;
  liveError: string | null;
  refreshLive: () => Promise<void>;
  actor: Actor;
  setActor: (n: string, role: string) => void;
  tick: number;
  bump: () => void;
  view: View;
  go: (v: View) => void;
  llm: boolean;
  setLlm: (on: boolean) => void;
  /** The server wants a token before it will show anything. */
  authNeeded: boolean;
  authError: string | null;
  signIn: (token: string) => void;
  /** Set when the server refused or lost a record the platform tried to save. */
  syncError: string | null;
  /** The signing policy the server runs under (dual unless it says solo). */
  signing: SigningPolicy;
  /** True when the signed-in person is on the server's signer registry. */
  signer: boolean;
  /** The monitor's latest pass over every department. Recomputed on every change and every MONITOR_SECONDS. */
  ceo: CeoState | null;
  /** When the monitor last read the data (ISO). */
  ceoAt: string | null;
  refreshCeo: () => Promise<void>;
}
const C = createContext<Ctx>(null as unknown as Ctx);
export const useOps = () => useContext(C);

const slug = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'operator';
const read = (k: string, d: string) => {
  try { return localStorage.getItem(k) ?? d; } catch { return d; }
};
const write = (k: string, v: string) => {
  try { localStorage.setItem(k, v); } catch { /* ignore */ }
};

export function OpsProvider({ children }: { children: ReactNode }) {
  const [p, setP] = useState<Platform | null>(null);
  const [mode, setMode] = useState<Ctx['mode']>('starting');
  const [health, setHealth] = useState<Health | null>(null);
  const [live, setLive] = useState<Ctx['live']>(null);
  const [liveError, setLiveError] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [view, go] = useState<View>({ name: 'ceo' });
  const [llm, setGem] = useState(false);
  const [authNeeded, setAuthNeeded] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [serverActor, setServerActor] = useState<string | null>(null);
  const [signing, setSigning] = useState<SigningPolicy>(DEFAULT_SIGNING);
  const [signer, setSigner] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [actorName, setActorName] = useState(read('ops.actor', ''));
  const [actorRole, setActorRole] = useState(read('ops.role', 'Founder'));
  const liveFacts = useRef<Record<string, string | number>>({});
  /** The server's copy of the dashboard collections, so other people's edits show up here. */
  const remote = useRef<Record<string, Rec[]>>({});
  const [clock, setClock] = useState(0);
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    (async () => {
      let adapter: StorageAdapter = new LocalStorageAdapter();
      let m: Ctx['mode'] = 'local';
      let policy: SigningPolicy = DEFAULT_SIGNING;
      let isSigner = false;
      let signers: { id: string; profession: Profession }[] = [];
      const hadToken = Boolean(loadToken());
      try {
        const h = await apiFetch('/api/health');
        if (h.ok) {
          const hh = (await h.json()) as Health;
          setHealth(hh);
          if (hh.auth === 'users') {
            // Who is acting comes from the server's reading of the token, never from what the user types.
            const w = await apiFetch('/api/whoami');
            if (!w.ok) {
              setToken(undefined);
              setAuthError(hadToken ? 'That token was not accepted.' : null);
              setAuthNeeded(true);
              return;
            }
            const who = (await w.json()) as { actor: string; signing?: { mode: 'solo' | 'dual'; waitMinutes: number }; signer?: boolean; profession?: Profession };
            setServerActor(who.actor);
            if (who.signing) policy = { mode: who.signing.mode, waitMs: who.signing.waitMinutes * 60_000 };
            isSigner = who.signer === true;
            signers = who.profession ? [{ id: who.actor, profession: who.profession }] : [];
          }
          setAuthNeeded(false);
          const sa = new ServerAdapter();
          await sa.load();
          adapter = sa;
          m = 'server';
        }
      } catch { /* static hosting: browser storage */ }
      const ceoNow = () => buildCeoState({ departments: DEPARTMENTS, collections: mergeCollections(plat.warehouse.all(), remote.current), agentSecondApprover: (id) => Boolean(agentById(id)?.secondApprover), now: Date.now() });
      const plat: Platform = new Platform({ adapter, facts: () => ({ ...snapshotFacts(), ...liveFacts.current, ...ceoNow().facts }), onPersistError: (e) => setSyncError(e.message), sequencer: m === 'server' ? serverSequencer() : undefined, signing: m === 'server' ? policy : DEFAULT_SIGNING, signers: m === 'server' ? signers : [] });
      await plat.init();
      setSigning(m === 'server' ? policy : DEFAULT_SIGNING);
      setSigner(m === 'server' && isSigner);
      setP(plat);
      setMode(m);
    })();
  }, [attempt]);

  const signIn = useCallback((token: string) => {
    setToken(token.trim());
    setAuthError(null);
    setAttempt((n) => n + 1);
  }, []);

  const refreshLive = useCallback(async () => {
    try {
      const r = await apiFetch('/api/connector/status');
      if (!r.ok) throw new Error(`connector ${r.status}`);
      const j = (await r.json()) as { status: LiveStatus; facts: Record<string, string | number> };
      liveFacts.current = j.facts;
      setLive(j);
      setLiveError(j.status.errors.length ? j.status.errors.join('; ') : null);
    } catch (e) {
      setLiveError((e as Error).message);
    }
  }, []);
  useEffect(() => {
    if (mode === 'server') void refreshLive();
  }, [mode, refreshLive]);

  const refreshCeo = useCallback(async () => {
    if (mode === 'server') {
      try {
        const r = await apiFetch('/api/warehouse?only=ceo');
        if (r.ok) remote.current = (await r.json()) as Record<string, Rec[]>;
      } catch { /* keep the last copy; the local data still counts */ }
    }
    setClock((c) => c + 1);
  }, [mode]);
  useEffect(() => {
    if (!p) return;
    void refreshCeo();
    const id = setInterval(() => void refreshCeo(), MONITOR_SECONDS * 1000);
    return () => clearInterval(id);
  }, [p, refreshCeo]);
  const ceo = useMemo(
    () => (p ? buildCeoState({ departments: DEPARTMENTS, collections: mergeCollections(p.warehouse.all(), remote.current), agentSecondApprover: (id) => Boolean(agentById(id)?.secondApprover), now: Date.now() }) : null),
    [p, tick, clock], // eslint-disable-line react-hooks/exhaustive-deps
  );

  const setLlm = useCallback((on: boolean) => {
    if (!p) return;
    p.useEngine(on ? remoteEngine() : undefined);
    setGem(on);
  }, [p]);

  const actor: Actor = useMemo(() => (serverActor ? { id: serverActor, name: serverActor, kind: 'human', roles: [actorRole] } : { id: slug(actorName), name: actorName || 'Operator', kind: 'human', roles: [actorRole] }), [actorName, actorRole, serverActor]);
  const setActor = (n: string, role: string) => {
    setActorName(n); setActorRole(role); write('ops.actor', n); write('ops.role', role);
  };

  const value: Ctx = { p, mode, health, live, liveError, refreshLive, actor, setActor, tick, bump, view, go, llm, setLlm, authNeeded, authError, signIn, syncError, signing, signer, ceo, ceoAt: ceo?.at ?? null, refreshCeo };
  return <C.Provider value={value}>{children}</C.Provider>;
}
