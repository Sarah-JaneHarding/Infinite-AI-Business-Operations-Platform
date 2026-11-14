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
  const approved = useMemo(() => (p?.artefacts() ?? []).filter((a) => a.status === 'RATIFIED' || a.status === 'INGESTED'), [p, tick]);
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
  const sendDigest = async () => {
    try {
      const r = await apiFetch('/api/ceo/digest/send', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ url: `https://${host}${path.startsWith('/') ? path : '/' + path}` }) });
      const j = await r.json();
      setMsg(r.ok ? { tone: 'ok', text: `Digest sent to ${j.host} (status ${j.status}).` } : { tone: 'bad', text: j.error ?? `Failed (status ${j.status}).` });
    } catch (e) { setMsg({ tone: 'bad', text: (e as Error).message }); }
  };
  const origin = typeof location === 'undefined' ? 'https://YOUR-SERVER' : location.origin;
  const curl = `BODY='{"externalId":"form-17","title":"Call the accountant about VAT","dept":"finance","due":"2026-12-01"}'
SIG="sha256=$(printf '%s' "$BODY" | openssl dgst -sha256 -hmac "$OPS_INBOUND_SECRET" | sed 's/^.* //')"
curl -X POST ${origin}/api/integrations/inbound -H "x-ops-signature: $SIG" -H 'content-type: application/json' -d "$BODY"`;
  return (
    <div className="space-y-4">
      <Card title="Connect your tools: step by step">
        <ol className="list-decimal space-y-3 pl-5 text-sm">
          <li><b>See your tasks in your own calendar.</b> On the server set <code>OPS_CALENDAR_TOKEN</code> to a long random value (24+ characters) and restart. Then subscribe to <code className="mono break-all">{origin}/api/ceo/calendar.ics?token=YOUR_TOKEN</code>. Google Calendar: Other calendars, +, From URL. Outlook: Add calendar, Subscribe from web. Apple Calendar: File, New Calendar Subscription. It is read-only and refreshes by itself, but your calendar app decides how often (often hourly). The server must be reachable from the internet for Google and Microsoft to read it. Anyone with the link can read the task titles, so treat it like a password.</li>
          <li><b>Add tasks from another tool.</b> Set <code>OPS_INBOUND_SECRET</code> (16+ characters) and restart. Your tool sends a signed request; the platform checks the signature, refuses learner or ID numbers, and adds a task that always needs a person. Zapier, Make and n8n need a step that computes the HMAC-SHA256 signature (Code by Zapier, Make's sha256 HMAC function, the n8n Crypto node). Test from a terminal:
            <pre className="mono mt-2 overflow-x-auto rounded-lg border p-2 text-[11px]" style={{ borderColor: 'var(--line)' }}>{curl}</pre></li>
          <li><b>Send the digest to Slack or Teams.</b> Create an incoming webhook there, copy its host name (for example the part after https://), add it to <code>OPS_OUTBOUND_ALLOWLIST</code>, restart, then use the form at the bottom of this page.</li>
          <li><b>Check it worked.</b> Each row below shows <i>live</i> once its setting is read by the server. Everything received or sent is written to the connector log.</li>
        </ol>
        <p className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>Secrets live only in the server's environment (the <code>.env</code> file on the server). They are never stored in the browser, the warehouse or the library.</p>
      </Card>
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
      <Card title="Send an approved artefact, or the daily digest">
        {mode !== 'server' || !hosts.length ? <p className="text-sm">Off. Run the server with OPS_OUTBOUND_ALLOWLIST set to the host names you trust, and sign in as a named user.</p> : (
          <div className="space-y-2">
            <select className="select" value={art} onChange={(e) => setArt(e.target.value)} aria-label="Approved artefact"><option value="">Choose an approved artefact…</option>{approved.map((a) => <option key={a.id} value={a.id}>{a.title} (v{a.version})</option>)}</select>
            <div className="flex gap-2"><select className="select !w-auto" value={host} onChange={(e) => setHost(e.target.value)} aria-label="Host">{hosts.map((h) => <option key={h}>{h}</option>)}</select><input className="input" value={path} onChange={(e) => setPath(e.target.value)} aria-label="Path" /></div>
            <div className="flex gap-2"><button className="btn primary" disabled={!art || !host} onClick={send}>Send</button><button className="btn" disabled={!host} onClick={sendDigest}>Send digest (text) to this address</button></div>
            {msg && <div role="status" className="rounded-lg border p-2 text-sm" style={{ borderColor: msg.tone === 'ok' ? 'var(--emerald)' : 'var(--rose)' }}>{msg.text}</div>}
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Only an approved artefact with a recorded human approval is sent. Each send is written to the connector log.</p>
          </div>
        )}
      </Card>
    </div>
  );
}
