import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Platform } from '../core/platform';
import { LocalStorageAdapter, type StorageAdapter } from '../core/warehouse';
import { ServerAdapter } from '../core/serverAdapter';
import { remoteEngine } from '../core/gateway';
import { snapshotFacts } from '../connector/snapshot';
import type { LiveStatus } from '../connector/github';
import type { Actor } from '../core/types';

export interface Health { ok: boolean; repo: string; githubToken: boolean; gemini: boolean; ecosystemWrites: boolean; webhook: boolean }
export type View = { name: 'overview' } | { name: 'dept'; id: string } | { name: 'studio'; id?: string } | { name: 'brain' } | { name: 'ledger' } | { name: 'warehouse' } | { name: 'connector' } | { name: 'guardrails' };

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
  gemini: boolean;
  setGemini: (on: boolean) => void;
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
  const [view, go] = useState<View>({ name: 'overview' });
  const [gemini, setGem] = useState(false);
  const [actorName, setActorName] = useState(read('ops.actor', ''));
  const [actorRole, setActorRole] = useState(read('ops.role', 'Founder'));
  const liveFacts = useRef<Record<string, string | number>>({});
  const bump = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    (async () => {
      let adapter: StorageAdapter = new LocalStorageAdapter();
      let m: Ctx['mode'] = 'local';
      try {
        const h = await fetch('/api/health');
        if (h.ok) {
          setHealth((await h.json()) as Health);
          const sa = new ServerAdapter();
          await sa.load();
          adapter = sa;
          m = 'server';
        }
      } catch { /* static hosting: browser storage */ }
      const plat = new Platform({ adapter, facts: () => ({ ...snapshotFacts(), ...liveFacts.current }) });
      await plat.init();
      setP(plat);
      setMode(m);
    })();
  }, []);

  const refreshLive = useCallback(async () => {
    try {
      const r = await fetch('/api/connector/status');
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

  const setGemini = useCallback((on: boolean) => {
    if (!p) return;
    p.useEngine(on ? remoteEngine() : undefined);
    setGem(on);
  }, [p]);

  const actor: Actor = useMemo(() => ({ id: slug(actorName), name: actorName || 'Operator', kind: 'human', roles: [actorRole] }), [actorName, actorRole]);
  const setActor = (n: string, role: string) => {
    setActorName(n); setActorRole(role); write('ops.actor', n); write('ops.role', role);
  };

  const value: Ctx = { p, mode, health, live, liveError, refreshLive, actor, setActor, tick, bump, view, go, gemini, setGemini };
  return <C.Provider value={value}>{children}</C.Provider>;
}
