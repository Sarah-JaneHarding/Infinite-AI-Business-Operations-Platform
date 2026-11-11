import { useEffect, useMemo, useState } from 'react';
import { useOps } from './store';
import { Badge, Card } from './primitives';
import { apiFetch } from '../core/api';
import { integrations, type IntState } from '../departments/integrations';

const TONE: Record<IntState, string> = { live: 'ok', built_in: 'ok', off: 'draft', not_built: 'bad' };
const LABEL: Record<IntState, string> = { live: 'live', built_in: 'built in', off: 'off: needs setup', not_built: 'not built' };

export function Integrations() {
  const { p, health, mode, tick } = useOps();
  const list = useMemo(() => integrations(health, mode === 'server'), [health, mode]);
  const approved = useMemo(() => (p?.artefacts() ?? []).filter((a) => a.status === 'APPROVED'), [p, tick]);
  const [hosts, setHosts] = useState<string[]>([]);
  const [host, setHost] = useState('');
  const [path, setPath] = useState('/');
  const [art, setArt] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  useEffect(() => { if (mode !== 'server') return; apiFetch('/api/integrations/targets').then((r) => r.json()).then((j) => { setHosts(j.hosts ?? []); setHost(j.hosts?.[0] ?? ''); }).catch(() => undefined); }, [mode]);
  const send = async () => {
    try {
      const r = await apiFetch('/api/integrations/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ artefactId: art, url: `https://${host}${path.startsWith('/') ? path : '/' + path}` }) });
      const j = await r.json();
      setMsg(r.ok ? { tone: 'ok', text: `Sent to ${j.host} (status ${j.status}).` } : { tone: 'bad', text: j.error ?? `Failed (status ${j.status}).` });
    } catch (e) { setMsg({ tone: 'bad', text: (e as Error).message }); }
  };
  return (
    <div className="space-y-4">
      <Card title="Integrations">
        <ul className="space-y-2">
          {list.map((i) => (
            <li key={i.id} className="rounded-lg border p-3" style={{ borderColor: 'var(--line)' }}>
              <div className="flex flex-wrap items-center gap-2"><b>{i.name}</b><Badge tone={TONE[i.state]}>{LABEL[i.state]}</Badge><Badge>{i.direction}</Badge></div>
              <p className="mt-1 text-sm">{i.what}</p>
              <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{i.how}</p>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>No keys or secrets are stored in the browser or in the library. They live in the server’s environment only.</p>
      </Card>
      <Card title="Send an approved artefact">
        {mode !== 'server' || !hosts.length ? <p className="text-sm">Off. Run the server with OPS_OUTBOUND_ALLOWLIST set to the host names you trust, and sign in as a named user.</p> : (
          <div className="space-y-2">
            <select className="select" value={art} onChange={(e) => setArt(e.target.value)} aria-label="Approved artefact"><option value="">Choose an approved artefact…</option>{approved.map((a) => <option key={a.id} value={a.id}>{a.title} (v{a.version})</option>)}</select>
            <div className="flex gap-2"><select className="select !w-auto" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Host">{hosts.map((h) => <option key={h}>{h}</option>)}</select><input className="input" value={path} onChange={(e) => setPath(e.target.value)} aria-label="Path" /></div>
            <button className="btn primary" disabled={!art || !host} onClick={send}>Send</button>
            {msg && <div role="status" className="rounded-lg border p-2 text-sm" style={{ borderColor: msg.tone === 'ok' ? 'var(--emerald)' : 'var(--rose)' }}>{msg.text}</div>}
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Only an approved artefact with a recorded human approval is sent. Each send is written to the connector log.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
