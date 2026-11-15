import { useCallback, useEffect, useMemo, useState } from 'react';
import { Bot, Pause, Play, Rocket, ShieldCheck, XCircle } from 'lucide-react';
import { Badge, Card } from './primitives';
import { apiFetch } from '../core/api';
import { useOps } from './store';
import { AGENTS, DEPARTMENTS } from '../departments';
import { templatesFor } from '../departments/orderTemplates';
import { groupTasksByDept, templateToForm } from './autonomyView';
import type { Task } from '../server/autonomy/tasks';

interface Order {
  id: string; name: string; agentId: string; status: 'PROPOSED' | 'ACTIVE' | 'PAUSED' | 'REVOKED';
  trigger: { kind: 'request' } | { kind: 'schedule'; every: 'daily' | 'weekly'; weekday?: number; hourUtc: number } | { kind: 'event'; events: string[]; cooldownMinutes: number };
  inputs: Record<string, string>; allowTaskInputs?: boolean; maxRunsPerDay: number; proposedBy: string; activatedBy?: string; statusNote?: string;
  runsToday: number; lastRunAt: string | null;
}
interface Status {
  enabled: boolean; maxRunsPerDay: number; runsToday: number; orders: Order[];
  queue: { queued: number; byDept: Record<string, number> };
  recent: { at: string; action: string; orderId: string; detail: { artefactId?: string; failed?: string[]; error?: string } }[];
}
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const EVENTS = ['push', 'pull_request', 'workflow_run', 'issues'];
const TONE: Record<Order['status'], string> = { PROPOSED: 'review', ACTIVE: 'ok', PAUSED: 'draft', REVOKED: 'bad' };

const describeTrigger = (t: Order['trigger']) =>
  t.kind === 'request' ? 'Only when a person asks' :
  t.kind === 'schedule' ? (t.every === 'daily' ? `Every day at ${String(t.hourUtc).padStart(2, '0')}:00 UTC` : `Every ${DAYS[t.weekday ?? 0]} at ${String(t.hourUtc).padStart(2, '0')}:00 UTC`) :
  `On GitHub ${t.events.join(', ')} (at most once every ${t.cooldownMinutes} min)`;

export function Autonomy() {
  const { mode, actor } = useOps();
  const [st, setSt] = useState<Status | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [tasksErr, setTasksErr] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string; checks?: { id: string; pass: boolean; detail: string }[] } | null>(null);

  const load = useCallback(async () => {
    try {
      const r = await apiFetch('/api/autonomy');
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      setSt((await r.json()) as Status);
      setErr(null);
      try {
        const t = await apiFetch('/api/autonomy/tasks');
        if (!t.ok) throw new Error(`HTTP ${t.status}`);
        setTasks(((await t.json()) as { tasks: Task[] }).tasks);
        setTasksErr(null);
      } catch (e) { setTasksErr((e as Error).message); }
    } catch (e) { setErr((e as Error).message); }
  }, []);
  useEffect(() => {
    if (mode !== 'server') return;
    void load();
    const t = setInterval(load, 15_000);
    return () => clearInterval(t);
  }, [mode, load]);

  const post = async (path: string, body: unknown, ok: string) => {
    try {
      const r = await apiFetch(path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
      const j = (await r.json().catch(() => ({}))) as { error?: string; checks?: { id: string; pass: boolean; detail: string }[]; outcome?: string };
      if (!r.ok) { setMsg({ tone: 'bad', text: j.error ?? `HTTP ${r.status}`, checks: j.checks?.filter((c) => !c.pass) }); return false; }
      setMsg({ tone: 'ok', text: j.outcome === 'quarantined' ? 'The run finished, but the draft failed its tests and was quarantined. It is on the Review Board.' : j.outcome === 'submitted' ? 'The run finished and the draft passed its tests. It is on the Review Board, waiting for a person.' : ok });
      return true;
    } catch (e) { setMsg({ tone: 'bad', text: (e as Error).message }); return false; } finally { await load(); }
  };

  if (mode !== 'server') return <Card title="Autonomous agents"><p className="text-sm">Autonomous agents need the server. Start it with <code>npm run dev</code>.</p></Card>;
  if (err && !st) return <Card title="Autonomous agents"><p className="text-sm">Could not load: {err}</p></Card>;
  if (!st) return <div className="p-4">Loading…</div>;

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Autonomous agents</h1>
        <p style={{ color: 'var(--muted)' }}>Specialist agents can do routine work without being asked, but only under a <b>standing order</b> that one person proposes and a <b>different</b> person activates. They only ever produce <b>drafts</b>: each draft is tested automatically, and only one that passes goes to the Review Board, where people approve, countersign and ratify it.</p>
      </div>
      {msg && (
        <div role="status" className={`callout ${msg.tone === 'ok' ? 'ok' : 'warn'}`}>
          {msg.text}
          {msg.checks && msg.checks.length > 0 && <ul className="mt-1 list-disc pl-5 text-xs">{msg.checks.map((c) => <li key={c.id}><b>{c.id}</b> {c.detail}</li>)}</ul>}
        </div>
      )}
      {st.enabled
        ? <div className="callout ok"><ShieldCheck size={14} className="mr-1 inline" />Autonomy is <b>on</b>. {st.runsToday} of {st.maxRunsPerDay} runs used today across the platform.</div>
        : <div className="callout warn"><b>Autonomy is switched off on this server.</b> Orders can be proposed and activated, but nothing runs until an operator sets <code>OPS_AUTONOMY=on</code> in the server's <code>.env</code> and restarts it. This is the master switch.</div>}

      <Card title="The limits that always apply">
        <ul className="list-disc space-y-1 pl-5 text-sm">
          <li>An agent runs without a person <b>only</b> under an active standing order. Nothing in a trigger (a schedule, a GitHub event) can add text to what the agent is given: the inputs are fixed when the order is made.</li>
          <li>Each order has its own daily budget (at most 5), the platform has a daily cap, and runs happen one at a time. A restart cannot reset them.</li>
          <li>Every draft must pass ten automatic checks (contract, structure, no personal data, no injection, every figure sourced, safe export, marked as a draft). The server re-checks them before it accepts a submission.</li>
          <li>An autonomous agent <b>can never approve, countersign or ratify</b>. A draft that fails is quarantined and never reaches review.</li>
          <li>Anyone signed in can pause or revoke an order at once.</li>
        </ul>
      </Card>

      <Card title={`Standing orders (${st.orders.length})`}>
        {!st.orders.length ? <p className="text-sm" style={{ color: 'var(--muted)' }}>No standing orders yet. Propose one below.</p> : (
          <ul className="space-y-3">{st.orders.map((o) => <OrderRow key={o.id} o={o} me={actor.id} post={post} />)}</ul>
        )}
      </Card>

      <TaskQueue orders={st.orders} tasks={tasks} tasksErr={tasksErr} queued={st.queue.queued} post={post} />

      <NewOrder post={post} />

      <Card title="Recent autonomous runs">
        {!st.recent.length ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing has run yet.</p> : (
          <ul className="space-y-1 text-sm">{st.recent.map((r, i) => (
            <li key={i} className="flex flex-wrap items-center gap-2">
              <Badge tone={r.action.endsWith('submitted') ? 'ok' : r.action.endsWith('quarantined') ? 'draft' : 'bad'}>{r.action.replace('autonomy.', '')}</Badge>
              <span className="mono text-xs">{r.at.slice(0, 16).replace('T', ' ')}</span>
              <span>{st.orders.find((o) => o.id === r.orderId)?.name ?? r.orderId}</span>
              {r.detail.failed && r.detail.failed.length > 0 && <span className="text-xs" style={{ color: 'var(--muted)' }}>failed {r.detail.failed.join(', ')}</span>}
              {r.detail.error && <span className="text-xs" style={{ color: 'var(--muted)' }}>{r.detail.error}</span>}
            </li>))}</ul>
        )}
      </Card>
    </div>
  );
}

function OrderRow({ o, me, post }: { o: Order; me: string; post: (path: string, body: unknown, ok: string) => Promise<boolean> }) {
  const [note, setNote] = useState('');
  const agent = AGENTS.find((a) => a.id === o.agentId);
  return (
    <li className="card p-3" data-testid="standing-order">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TONE[o.status]}>{o.status}</Badge>
        <b className="text-sm">{o.name}</b>
        <Badge tone="info"><Bot size={11} className="mr-1 inline" />{o.agentId}</Badge>
        <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>proposed by {o.proposedBy}{o.activatedBy ? ` · activated by ${o.activatedBy}` : ''}</span>
      </div>
      <p className="mt-1 text-sm">{agent?.name} · {describeTrigger(o.trigger)} · {o.runsToday} of {o.maxRunsPerDay} run(s) today{o.lastRunAt ? ` · last run ${o.lastRunAt.slice(0, 16).replace('T', ' ')}` : ''}</p>
      {o.statusNote && <p className="text-xs" style={{ color: 'var(--muted)' }}>{o.statusNote}</p>}
      <p className="text-xs" style={{ color: 'var(--muted)' }}>{o.allowTaskInputs ? 'A person may enqueue a task for this order with its own inputs.' : 'Tasks for this order use only its fixed inputs.'}</p>
      {o.status !== 'REVOKED' && (
        <div className="mt-2 space-y-2">
          <input className="input" value={note} onChange={(e) => setNote(e.target.value)} placeholder={o.status === 'ACTIVE' ? 'Reason (to pause or revoke)' : 'Note (optional)'} aria-label={`Note for ${o.name}`} />
          <div className="flex flex-wrap gap-2">
            {o.status === 'PROPOSED' && <button className="btn primary" disabled={o.proposedBy === me} title={o.proposedBy === me ? 'A different person from the proposer must activate' : ''} onClick={() => post(`/api/autonomy/orders/${o.id}/activate`, { note }, 'Order activated.')}><Play size={14} /> Activate</button>}
            {o.status === 'PAUSED' && <button className="btn primary" onClick={() => post(`/api/autonomy/orders/${o.id}/activate`, { note }, 'Order resumed.')}><Play size={14} /> Resume</button>}
            {o.status === 'ACTIVE' && <button className="btn primary" onClick={() => post(`/api/autonomy/orders/${o.id}/run`, {}, 'Run finished.')}><Rocket size={14} /> Run now</button>}
            {o.status === 'ACTIVE' && <button className="btn" disabled={note.trim().length < 5} onClick={() => post(`/api/autonomy/orders/${o.id}/pause`, { reason: note }, 'Order paused.').then(() => setNote(''))}><Pause size={14} /> Pause</button>}
            <button className="btn danger" disabled={note.trim().length < 5} onClick={() => post(`/api/autonomy/orders/${o.id}/revoke`, { reason: note }, 'Order revoked.').then(() => setNote(''))}><XCircle size={14} /> Revoke</button>
          </div>
        </div>
      )}
    </li>
  );
}

function NewOrder({ post }: { post: (path: string, body: unknown, ok: string) => Promise<boolean> }) {
  const [agentId, setAgentId] = useState(AGENTS[0]!.id);
  const [name, setName] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [kind, setKind] = useState<'request' | 'schedule' | 'event'>('request');
  const [every, setEvery] = useState<'daily' | 'weekly'>('weekly');
  const [weekday, setWeekday] = useState(1);
  const [hourUtc, setHourUtc] = useState(6);
  const [events, setEvents] = useState<string[]>(['push']);
  const [cooldown, setCooldown] = useState(60);
  const [runs, setRuns] = useState(1);
  const [allowTaskInputs, setAllowTaskInputs] = useState(false);
  const [tplDept, setTplDept] = useState(DEPARTMENTS[0]!.id);
  const [tplId, setTplId] = useState('');
  const templates = templatesFor(tplDept);
  const useTemplate = (id: string) => {
    setTplId(id);
    const t = templates.find((x) => x.id === id);
    if (!t) return;
    const f = templateToForm(t);
    setAgentId(f.agentId); setName(f.name); setRuns(f.runs); setInputs(f.inputs);
    setKind(f.trigger.kind);
    if (f.trigger.kind === 'schedule') {
      setEvery(f.trigger.every); setHourUtc(f.trigger.hourUtc);
      if (f.trigger.every === 'weekly') setWeekday(f.trigger.weekday);
    }
  };
  const agent = useMemo(() => AGENTS.find((a) => a.id === agentId)!, [agentId]);
  const trigger = kind === 'request' ? { kind } : kind === 'schedule' ? (every === 'daily' ? { kind, every, hourUtc } : { kind, every, weekday, hourUtc }) : { kind, events, cooldownMinutes: cooldown };
  return (
    <Card title="Propose a standing order">
      <div className="mb-3 space-y-2">
        <p className="text-sm font-semibold">Use a template <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional. It picks the agent, name and timing. You still type the inputs, and a different person still activates the order.)</span></p>
        <div className="grid gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm"><span>Department</span>
            <select className="input" value={tplDept} onChange={(e) => { setTplDept(e.target.value); setTplId(''); }} aria-label="Template department">
              {DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
          </label>
          <label className="space-y-1 text-sm"><span>Template</span>
            <select className="input" value={tplId} onChange={(e) => useTemplate(e.target.value)} aria-label="Template">
              <option value="">{templates.length ? 'Choose…' : 'No template for this department'}</option>
              {templates.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
        </div>
        {templates.find((t) => t.id === tplId) && <p className="text-xs" style={{ color: 'var(--muted)' }}>{templates.find((t) => t.id === tplId)!.why}</p>}
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="font-semibold">Agent</span>
          <select className="input" value={agentId} onChange={(e) => { setAgentId(e.target.value); setInputs({}); setTplId(''); }} aria-label="Agent">
            {DEPARTMENTS.map((d) => <optgroup key={d.id} label={d.name}>{d.agents.map((a) => <option key={a.id} value={a.id}>{a.id} · {a.name}</option>)}</optgroup>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Order name</span>
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Weekly executive summary" aria-label="Order name" />
        </label>
        <div className="space-y-2 md:col-span-2">
          <p className="text-sm font-semibold">Fixed inputs <span className="font-normal" style={{ color: 'var(--muted)' }}>(typed once, checked now, and used every time. No personal data.)</span></p>
          {agent.inputs.map((f) => (
            <label key={f.key} className="block space-y-1 text-sm">
              <span>{f.label}{f.required ? ' *' : ''}</span>
              {f.kind === 'select' ? (
                <select className="input" value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={f.label}><option value="">Choose…</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
              ) : f.kind === 'longtext' ? (
                <textarea className="textarea" rows={2} value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={f.label} />
              ) : (
                <input className="input" value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={f.label} />
              )}
            </label>
          ))}
        </div>
        <label className="space-y-1 text-sm"><span className="font-semibold">When it runs</span>
          <select className="input" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)} aria-label="Trigger">
            <option value="request">Only when a person asks</option><option value="schedule">On a schedule</option><option value="event">When something happens on GitHub</option>
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Runs per day (at most 5)</span>
          <select className="input" value={runs} onChange={(e) => setRuns(Number(e.target.value))} aria-label="Runs per day">{[1, 2, 3, 4, 5].map((n) => <option key={n}>{n}</option>)}</select>
        </label>
        <div className="space-y-1 md:col-span-2">
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={allowTaskInputs} onChange={(e) => setAllowTaskInputs(e.target.checked)} /><span className="font-semibold">Allow task inputs</span></label>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>If ticked, a person may queue a task for this order with its own inputs (checked like these ones). The person who activates the order sees this choice. Off by default.</p>
        </div>
        {kind === 'schedule' && (
          <div className="flex flex-wrap items-end gap-2 md:col-span-2">
            <label className="text-sm">Every <select className="input" value={every} onChange={(e) => setEvery(e.target.value as 'daily' | 'weekly')} aria-label="Schedule"><option value="daily">day</option><option value="weekly">week</option></select></label>
            {every === 'weekly' && <label className="text-sm">on <select className="input" value={weekday} onChange={(e) => setWeekday(Number(e.target.value))} aria-label="Weekday">{DAYS.map((d, i) => <option key={d} value={i}>{d}</option>)}</select></label>}
            <label className="text-sm">at (UTC hour) <select className="input" value={hourUtc} onChange={(e) => setHourUtc(Number(e.target.value))} aria-label="Hour (UTC)">{Array.from({ length: 24 }, (_, h) => <option key={h} value={h}>{String(h).padStart(2, '0')}:00</option>)}</select></label>
          </div>
        )}
        {kind === 'event' && (
          <div className="space-y-2 md:col-span-2">
            <div className="flex flex-wrap gap-3 text-sm">{EVENTS.map((ev) => <label key={ev} className="flex items-center gap-1"><input type="checkbox" checked={events.includes(ev)} onChange={(e) => setEvents(e.target.checked ? [...events, ev] : events.filter((x) => x !== ev))} />{ev}</label>)}</div>
            <label className="text-sm">At most once every <input className="input !inline-block !w-24" type="number" min={15} max={1440} value={cooldown} onChange={(e) => setCooldown(Number(e.target.value))} aria-label="Cooldown minutes" /> minutes</label>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>Needs the GitHub webhook (see Integrations). The event only decides <i>when</i> to run: nothing in it is passed to the agent.</p>
          </div>
        )}
      </div>
      <button className="btn primary mt-3" disabled={name.trim().length < 3} onClick={() => post('/api/autonomy/orders', { name, agentId, trigger, inputs: Object.fromEntries(Object.entries(inputs).filter(([, v]) => v)), maxRunsPerDay: runs, allowTaskInputs }, 'Proposed. The agent was dry-run and passed its tests. A different person now has to activate it.')}><Bot size={14} /> Propose order</button>
    </Card>
  );
}

const TASK_TONE: Record<Task['status'], string> = { QUEUED: 'review', RUNNING: 'info', SUBMITTED: 'ok', QUARANTINED: 'draft', FAILED: 'bad', CANCELLED: 'draft', EXPIRED: 'draft' };
const PRIORITY: Record<1 | 2 | 3, string> = { 1: '1 (most urgent)', 2: '2', 3: '3 (least urgent)' };
const showTime = (iso: string) => `${iso.slice(0, 16).replace('T', ' ')} UTC`;

function TaskQueue({ orders, tasks, tasksErr, queued, post }: { orders: Order[]; tasks: Task[]; tasksErr: string | null; queued: number; post: (path: string, body: unknown, ok: string) => Promise<boolean> }) {
  const active = orders.filter((o) => o.status === 'ACTIVE');
  const [orderId, setOrderId] = useState('');
  const [priority, setPriority] = useState<1 | 2 | 3>(2);
  const [due, setDue] = useState('');
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const order = active.find((o) => o.id === orderId);
  const agent = order ? AGENTS.find((a) => a.id === order.agentId) : undefined;
  const dueMs = due ? new Date(due).getTime() : NaN;
  const groups = groupTasksByDept(tasks);
  const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;
  const enqueue = async () => {
    const given = Object.fromEntries(Object.entries(inputs).filter(([, v]) => v.trim()));
    const body: Record<string, unknown> = { orderId, priority, due: new Date(dueMs).toISOString().replace(/\.\d{3}Z$/, 'Z') };
    if (order?.allowTaskInputs && Object.keys(given).length) body.inputs = given;
    if (await post('/api/autonomy/tasks', body, 'Task queued.')) setInputs({});
  };
  return (
    <Card title={`Task queue (${queued} waiting)`}>
      <p className="text-sm" style={{ color: 'var(--muted)' }}>A task is one run of an active order, queued for a time. Schedules and GitHub events add tasks here too. Tasks run most urgent first, within each order's daily budget, and only ever produce drafts.</p>
      <div className="mt-3 grid gap-3 md:grid-cols-2">
        <label className="space-y-1 text-sm"><span className="font-semibold">Order</span>
          <select className="input" value={orderId} onChange={(e) => { setOrderId(e.target.value); setInputs({}); }} aria-label="Task order">
            <option value="">{active.length ? 'Choose an active order…' : 'No active orders'}</option>
            {active.map((o) => <option key={o.id} value={o.id}>{o.name} · {o.agentId}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Priority</span>
          <select className="input" value={priority} onChange={(e) => setPriority(Number(e.target.value) as 1 | 2 | 3)} aria-label="Task priority">
            {([1, 2, 3] as const).map((p) => <option key={p} value={p}>{PRIORITY[p]}</option>)}
          </select>
        </label>
        <label className="space-y-1 text-sm"><span className="font-semibold">Due (your local time)</span>
          <input className="input" type="datetime-local" value={due} onChange={(e) => setDue(e.target.value)} aria-label="Task due date and time" />
        </label>
        {order?.allowTaskInputs && agent && (
          <div className="space-y-2 md:col-span-2">
            <p className="text-sm font-semibold">Inputs for this task <span className="font-normal" style={{ color: 'var(--muted)' }}>(optional. Anything left empty uses the order's own. No personal data.)</span></p>
            {agent.inputs.map((f) => (
              <label key={f.key} className="block space-y-1 text-sm">
                <span>{f.label}</span>
                {f.kind === 'select' ? (
                  <select className="input" value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={`Task ${f.label}`}><option value="">Use the order's</option>{(f.options ?? []).map((o) => <option key={o}>{o}</option>)}</select>
                ) : f.kind === 'longtext' ? (
                  <textarea className="textarea" rows={2} value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={`Task ${f.label}`} />
                ) : (
                  <input className="input" value={inputs[f.key] ?? ''} onChange={(e) => setInputs({ ...inputs, [f.key]: e.target.value })} aria-label={`Task ${f.label}`} />
                )}
              </label>
            ))}
          </div>
        )}
      </div>
      <button className="btn primary mt-3" disabled={!orderId || !Number.isFinite(dueMs)} onClick={enqueue}><Rocket size={14} /> Add to queue</button>
      <div className="mt-4 space-y-3">
        {tasksErr && <div role="alert" className="callout warn">Could not refresh the task list ({tasksErr}). {tasks.length ? 'The list below may be out of date.' : 'Tasks may exist that are not shown.'}</div>}
        {!tasks.length && !tasksErr && <p className="text-sm" style={{ color: 'var(--muted)' }}>No tasks yet.</p>}
        {Object.entries(groups).map(([dept, list]) => (
          <section key={dept} aria-label={`${deptName(dept)} tasks`}>
            <h3 className="text-sm font-semibold">{deptName(dept)} ({list.length})</h3>
            <ul className="mt-1 space-y-2">{list.map((t) => <TaskRow key={t.id} t={t} orderName={orders.find((o) => o.id === t.orderId)?.name ?? t.orderId} post={post} />)}</ul>
          </section>
        ))}
      </div>
    </Card>
  );
}

function TaskRow({ t, orderName, post }: { t: Task; orderName: string; post: (path: string, body: unknown, ok: string) => Promise<boolean> }) {
  const [reason, setReason] = useState('');
  const len = reason.trim().length;
  return (
    <li className="card p-3" data-testid="queued-task">
      <div className="flex flex-wrap items-center gap-2">
        <Badge tone={TASK_TONE[t.status]}>{t.status}</Badge>
        <b className="text-sm">{orderName}</b>
        <Badge tone="info"><Bot size={11} className="mr-1 inline" />{t.agentId}</Badge>
        <span className="ml-auto text-xs" style={{ color: 'var(--muted)' }}>priority {t.priority} · due {showTime(t.due)}</span>
      </div>
      <p className="mt-1 text-xs" style={{ color: 'var(--muted)' }}>{t.origin.kind === 'person' ? `queued by ${t.origin.by}` : t.origin.kind === 'schedule' ? 'queued by its schedule' : 'queued by a GitHub event'}{t.inputs ? ' · with its own inputs' : ''}{t.note ? ` · ${t.note}` : ''}</p>
      {t.status === 'QUEUED' && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <input className="input !w-auto min-w-0 flex-1" value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder="Reason (5 to 300 characters)" aria-label={`Reason to cancel the task for ${orderName}`} />
          <button className="btn danger" disabled={len < 5 || len > 300} onClick={() => post(`/api/autonomy/tasks/${t.id}/cancel`, { reason: reason.trim() }, 'Task cancelled.').then(() => setReason(''))}><XCircle size={14} /> Cancel</button>
        </div>
      )}
    </li>
  );
}
