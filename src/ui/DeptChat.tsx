import { useEffect, useRef, useState } from 'react';
import { Send } from 'lucide-react';
import { useOps } from './store';
import { Card } from './primitives';
import { RunRefused } from '../core/platform';
import { GREETING, step, type ChatCtx, type ChatState } from '../departments/chat';
import { customAgents } from '../departments/custom';
import { deptById } from '../departments';
import { TEMPLATES } from '../departments/templates';
import { navigate } from './nav';

interface Msg { from: 'you' | 'bot'; text: string }

/** Rule-based assistant for one department. Chat text is kept in this page only; it is not stored. */
export function DeptChat({ deptId }: { deptId: string }) {
  const { p, actor, bump, go, tick } = useOps();
  const d = deptById(deptId)!;
  const ctx = (): ChatCtx => ({ deptName: d.name, agents: [...d.agents, ...(p ? customAgents(p.warehouse, deptId) : [])], templates: TEMPLATES.filter((t) => t.dept === deptId) });
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [st, setSt] = useState<ChatState>({ mode: 'idle' });
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);
  useEffect(() => { setMsgs([{ from: 'bot', text: GREETING(ctx()) }]); setSt({ mode: 'idle' }); }, [deptId, tick]); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { end.current?.scrollIntoView?.({ block: 'nearest' }); }, [msgs]);

  const send = async () => {
    const t = text.trim();
    if (!t || busy) return;
    setText('');
    const c = ctx();
    const r = step(st, t, c);
    setSt(r.state);
    setMsgs((m) => [...m, { from: 'you', text: t }, { from: 'bot', text: r.say }]);
    for (const a of r.actions) {
      if (a.type === 'template') navigate({ tab: 'studio', sub: 'library', template: a.id });
      else if (a.type === 'builder') navigate({ tab: 'studio', sub: 'builders', builder: a.kind, dept: deptId });
      else if (p) {
        const agent = c.agents.find((x) => x.id === a.agentId)!;
        setBusy(true);
        try { const art = await p.runAgent(agent, a.input, actor); bump(); setMsgs((m) => [...m, { from: 'bot', text: `Drafted “${art.title}”. It is a DRAFT and waits for a human decision. Opening it now.` }]); go({ name: 'studio', id: art.id }); navigate({ tab: 'studio', sub: 'artefacts' }); }
        catch (e) { setMsgs((m) => [...m, { from: 'bot', text: e instanceof RunRefused ? `Refused (${e.kind}): ${e.message}` : (e as Error).message }]); }
        finally { setBusy(false); }
      }
    }
  };
  return (
    <Card title={`${d.name} assistant`}>
      <div className="max-h-72 space-y-2 overflow-auto" role="log" aria-live="polite">
        {msgs.map((m, i) => <div key={i} className={`whitespace-pre-wrap rounded-lg p-2 text-sm ${m.from === 'you' ? 'ml-8' : 'mr-8'}`} style={{ background: m.from === 'you' ? 'var(--violet-soft, rgba(124,58,237,.12))' : 'var(--panel2, rgba(148,163,255,.08))' }}>{m.text}</div>)}
        <div ref={end} />
      </div>
      <form className="mt-2 flex gap-2" onSubmit={(e) => { e.preventDefault(); void send(); }}>
        <input className="input" value={text} onChange={(e) => setText(e.target.value)} placeholder={st.mode === 'collect' ? 'Your answer, or “cancel”' : 'Ask for a task, a template, or “new agent”'} aria-label="Message the department assistant" />
        <button className="btn primary" disabled={busy || !text.trim()}><Send size={14} /> Send</button>
      </form>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>Do not type learner names or details. They are refused.</p>
    </Card>
  );
}
