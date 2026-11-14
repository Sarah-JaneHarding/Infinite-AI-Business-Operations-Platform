import { useMemo, useState } from 'react';
import { Bot, CalendarClock, Download, RefreshCw, User } from 'lucide-react';
import { useOps, MONITOR_SECONDS } from './store';
import { Badge, Card, download } from './primitives';
import { agentById, DEPARTMENTS } from '../departments';
import { CALENDAR_RULES, HEALTH_RULES, OPS_REVIEW_AGENT, PLAN, toIcs, type Block, type CeoTask, type DeptHealth, type TaskState } from '../core/ceo';
import { checkTaskText, MAX_TITLE } from '../core/ceo/guard';
import { digestText } from '../core/ceo/digest';
import { sastDate } from '../core/ceo/time';
import { RunRefused } from '../core/platform';

const newId = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
const LIGHT_TONE: Record<DeptHealth['light'], string> = { green: 'ok', amber: 'review', red: 'bad', none: 'draft' };
const LIGHT_TEXT: Record<DeptHealth['light'], string> = { green: 'On track', amber: 'Watch', red: 'Act now', none: 'Nothing recorded' };
const STATUS_TONE: Record<CeoTask['status'], string> = { done: 'ok', overdue: 'bad', blocked: 'bad', in_progress: 'review', open: 'draft' };
const STATUS_TEXT: Record<CeoTask['status'], string> = { done: 'Done', overdue: 'Overdue', blocked: 'Blocked', in_progress: 'In progress', open: 'Open' };
const SOURCE_TEXT: Record<CeoTask['source'], string> = { tracker: 'Tracker', checklist: 'Checklist', artefact: 'Artefact', plan: 'Plan v1.4', manual: 'Added by hand', inbound: 'Inbound', monitor: 'Monitor' };
const time = (iso: string) => new Date(iso).toLocaleTimeString('en-ZA', { timeZone: 'Africa/Johannesburg', hour: '2-digit', minute: '2-digit' });
const dayLabel = (d: string) => new Date(`${d}T12:00:00Z`).toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' });
const deptName = (id: string) => DEPARTMENTS.find((d) => d.id === id)?.name ?? id;

export function CeoCentre() {
  const { p, ceo, ceoAt, refreshCeo, go, actor, bump, mode } = useOps();
  const [msg, setMsg] = useState<{ tone: 'ok' | 'bad'; text: string } | null>(null);
  const [busy, setBusy] = useState(false);
  if (!p || !ceo) return <p>Starting the monitor…</p>;
  const f = ceo.facts;
  const tile = (label: string, value: string | number, tone?: 'warn' | 'bad') => (
    <div className="card p-3"><div className="mono text-2xl font-bold" style={{ color: tone === 'bad' ? 'var(--rose)' : tone === 'warn' ? 'var(--amber)' : 'var(--violet)' }}>{value}</div><div className="text-xs">{label}</div></div>
  );
  const runReview = async () => {
    setBusy(true); setMsg(null);
    try {
      const a = await p.runAgent(agentById(OPS_REVIEW_AGENT)!, { focus: '' }, actor);
      bump();
      go({ name: 'studio', id: a.id });
    } catch (e) { setMsg({ tone: 'bad', text: e instanceof RunRefused ? e.message : (e as Error).message }); } finally { setBusy(false); }
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">CEO Command Centre</h1>
          <p style={{ color: 'var(--muted)' }}>Every department, every task, one calendar. The monitor reads recorded work, never guesses. AI drafts; you decide.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge tone="ok">live · refreshes every {MONITOR_SECONDS}s</Badge>
          <span className="mono text-[11px]" style={{ color: 'var(--muted)' }}>read {ceoAt ? time(ceoAt) : '…'} SAST{mode === 'server' ? '' : ' · this browser only'}</span>
          <button className="btn" onClick={() => void refreshCeo()}><RefreshCw size={14} /> Refresh now</button>
          <button className="btn primary" disabled={busy} onClick={runReview}><Bot size={14} /> Draft operations review</button>
        </div>
      </div>
      {msg && <div role="status" className="rounded-lg border p-2 text-sm" style={{ borderColor: msg.tone === 'ok' ? 'var(--emerald)' : 'var(--rose)' }}>{msg.text}</div>}

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
        {tile('Waiting for you', f['ops.tasks.humanOpen'] ?? 0, 'warn')}
        {tile('Overdue', f['ops.tasks.overdue'] ?? 0, Number(f['ops.tasks.overdue']) ? 'bad' : undefined)}
        {tile('Blocked', f['ops.tasks.blocked'] ?? 0, Number(f['ops.tasks.blocked']) ? 'warn' : undefined)}
        {tile('Open or in progress', f['ops.tasks.open'] ?? 0)}
        {tile('Done', f['ops.tasks.done'] ?? 0)}
        {tile('Departments red', f['ops.depts.red'] ?? 0, Number(f['ops.depts.red']) ? 'bad' : undefined)}
        {tile('Amber', f['ops.depts.amber'] ?? 0, Number(f['ops.depts.amber']) ? 'warn' : undefined)}
        {tile('Nothing recorded', f['ops.depts.none'] ?? 0)}
      </div>

      <Departments health={ceo.health} onOpen={(id) => go({ name: 'dept', id })} />
      <Tasks tasks={ceo.tasks} />
      <Calendar blocks={ceo.blocks} unscheduled={ceo.unscheduled} />
      <PlanCard />
    </div>
  );
}

function Departments({ health, onOpen }: { health: DeptHealth[]; onOpen: (id: string) => void }) {
  return (
    <Card title="Department dashboard" right={<span className="text-xs" style={{ color: 'var(--muted)' }}>Status comes only from what has been recorded</span>}>
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {health.map((h) => (
          <button key={h.dept} className="card p-3 text-left" onClick={() => onOpen(h.dept)} aria-label={`${h.name}: ${LIGHT_TEXT[h.light]}. Open department`}>
            <div className="flex items-start justify-between gap-2"><b className="text-sm">{h.name}</b><Badge tone={LIGHT_TONE[h.light]}>{LIGHT_TEXT[h.light]}</Badge></div>
            <div className="mono mt-2 grid grid-cols-4 gap-1 text-center text-[11px]">
              <div><div className="text-base font-bold">{h.open}</div>open</div>
              <div><div className="text-base font-bold" style={{ color: h.blocked ? 'var(--amber)' : undefined }}>{h.blocked}</div>blocked</div>
              <div><div className="text-base font-bold" style={{ color: h.overdue ? 'var(--rose)' : undefined }}>{h.overdue}</div>overdue</div>
              <div><div className="text-base font-bold">{h.inReview}</div>review</div>
            </div>
            <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>{h.reasons.length ? h.reasons.join(' · ') : 'Nothing wrong on what is recorded'}{h.lastActivity ? ` · last activity ${h.lastActivity.slice(0, 10)}` : ''}</p>
          </button>
        ))}
      </div>
      <details className="mt-3 text-xs" style={{ color: 'var(--muted)' }}>
        <summary className="cursor-pointer">How the status is decided</summary>
        <ul className="mt-1 list-disc pl-5"><li><b>Act now:</b> {HEALTH_RULES.red}</li><li><b>Watch:</b> {HEALTH_RULES.amber}</li><li><b>On track:</b> {HEALTH_RULES.green}</li><li><b>Nothing recorded:</b> {HEALTH_RULES.none} It is never shown as green.</li></ul>
      </details>
    </Card>
  );
}

function Tasks({ tasks }: { tasks: CeoTask[] }) {
  const { p, go, actor, bump } = useOps();
  const [dept, setDept] = useState('');
  const [status, setStatus] = useState('active');
  const [who, setWho] = useState('human');
  const [source, setSource] = useState('');
  const [q, setQ] = useState('');
  const [limit, setLimit] = useState(40);
  const rows = useMemo(() => tasks.filter((t) =>
    (!dept || t.dept === dept) && (!source || t.source === source) &&
    (status === 'all' || (status === 'active' ? t.status !== 'done' : t.status === status)) &&
    (who === 'all' || (who === 'human' ? t.requiresHuman : !t.requiresHuman)) &&
    (!q || t.title.toLowerCase().includes(q.toLowerCase()))), [tasks, dept, status, who, source, q]);
  const setState = async (t: CeoTask, st: NonNullable<TaskState['status']>) => {
    const cur = p!.warehouse.latest<TaskState>('ceo_task_state').find((s) => s.id === t.id);
    await p!.warehouse.put('ceo_task_state', { ...cur, id: t.id, status: st, by: actor.id, at: new Date().toISOString() } as never);
    bump();
  };
  const open = (t: CeoTask) => (t.source === 'artefact' ? go({ name: 'studio', id: t.sourceRef }) : t.source === 'tracker' || t.source === 'checklist' || t.source === 'plan' || t.source === 'monitor' ? go({ name: 'dept', id: t.dept }) : undefined);
  return (
    <Card title={`All tasks (${rows.length} of ${tasks.length})`} right={<span className="text-xs" style={{ color: 'var(--muted)' }}><User size={12} className="inline" /> needs a person · <Bot size={12} className="inline" /> an agent can draft it</span>}>
      <div className="mb-3 flex flex-wrap gap-2">
        <select className="select !w-auto" aria-label="Department" value={dept} onChange={(e) => setDept(e.target.value)}><option value="">All departments</option>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select>
        <select className="select !w-auto" aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)}><option value="active">Not done</option><option value="all">Everything</option><option value="overdue">Overdue</option><option value="blocked">Blocked</option><option value="in_progress">In progress</option><option value="open">Open</option><option value="done">Done</option></select>
        <select className="select !w-auto" aria-label="Who" value={who} onChange={(e) => setWho(e.target.value)}><option value="human">Needs a person</option><option value="ai">An agent can draft</option><option value="all">Either</option></select>
        <select className="select !w-auto" aria-label="Source" value={source} onChange={(e) => setSource(e.target.value)}><option value="">All sources</option>{Object.entries(SOURCE_TEXT).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        <input className="input !w-48" aria-label="Search tasks" placeholder="Search" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>
      <div className="overflow-x-auto">
        <table className="t">
          <thead><tr><th>Status</th><th /><th>Task</th><th>Department</th><th>Due</th><th>Owner</th><th>Source</th><th /></tr></thead>
          <tbody>
            {rows.slice(0, limit).map((t) => (
              <tr key={t.id}>
                <td><Badge tone={STATUS_TONE[t.status]}>{STATUS_TEXT[t.status]}</Badge></td>
                <td title={t.requiresHuman ? 'Needs a person' : 'An agent can prepare this; a person still approves'}>{t.requiresHuman ? <User size={14} aria-label="Needs a person" /> : <Bot size={14} aria-label="An agent can draft" />}</td>
                <td><div className="text-sm">{t.title}</div><div className="text-[11px]" style={{ color: 'var(--muted)' }}>{t.reason}</div></td>
                <td className="text-xs">{deptName(t.dept)}</td>
                <td className="mono text-xs">{t.due ?? ''}</td>
                <td className="text-xs">{t.owner ?? ''}</td>
                <td className="text-xs">{SOURCE_TEXT[t.source]}</td>
                <td className="whitespace-nowrap">
                  {(t.source === 'plan' || t.source === 'manual' || t.source === 'inbound') ? (
                    <select className="select !w-auto" aria-label={`Set status of ${t.title}`} value={t.status === 'overdue' ? 'open' : t.status} onChange={(e) => void setState(t, e.target.value as NonNullable<TaskState['status']>)}><option value="open">Open</option><option value="in_progress">In progress</option><option value="blocked">Blocked</option><option value="done">Done</option></select>
                  ) : <button className="btn" onClick={() => open(t)}>Open</button>}
                </td>
              </tr>
            ))}
            {!rows.length && <tr><td colSpan={8} style={{ color: 'var(--muted)' }}>No tasks match.</td></tr>}
          </tbody>
        </table>
      </div>
      {rows.length > limit && <button className="btn mt-2" onClick={() => setLimit(limit + 60)}>Show more ({rows.length - limit} left)</button>}
      <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>Tracker, checklist and artefact tasks are finished where they are recorded (use Open). Plan, hand-added and inbound tasks are finished here. Nothing is invented: every task comes from a record, a checklist item, an artefact or the plan.</p>
      <AddTask />
    </Card>
  );
}

function AddTask() {
  const { p, actor, bump } = useOps();
  const [title, setTitle] = useState('');
  const [dept, setDept] = useState('executive');
  const [due, setDue] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const add = async () => {
    const refused = !title.trim() ? 'Write the task first.' : title.length > MAX_TITLE ? `Keep it under ${MAX_TITLE} characters.` : checkTaskText(title);
    if (refused) return setErr(refused);
    await p!.warehouse.put('ceo_tasks', { id: newId(), title: title.trim(), dept, due: due || undefined, source: 'manual', kind: 'action', requiresHuman: true, by: actor.id, at: new Date().toISOString() } as never);
    setTitle(''); setDue(''); setErr(null); bump();
  };
  return (
    <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
      <label className="text-xs">Add a task<input className="input mt-1 !w-72" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="No learner or personal details" /></label>
      <label className="text-xs">Department<select className="select mt-1" value={dept} onChange={(e) => setDept(e.target.value)}>{DEPARTMENTS.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></label>
      <label className="text-xs">Due<input className="input mt-1" type="date" value={due} onChange={(e) => setDue(e.target.value)} /></label>
      <button className="btn primary" onClick={() => void add()}>Add</button>
      {err && <span role="alert" className="text-xs" style={{ color: 'var(--rose)' }}>{err}</span>}
    </div>
  );
}

function Calendar({ blocks, unscheduled }: { blocks: Block[]; unscheduled: CeoTask[] }) {
  const { p, ceo, actor, bump } = useOps();
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [err, setErr] = useState<string | null>(null);
  const byDay = useMemo(() => {
    const m = new Map<string, { b: Block[]; e: { id: string; title: string; start: string; end: string }[] }>();
    const slot = (d: string) => m.get(d) ?? m.set(d, { b: [], e: [] }).get(d)!;
    for (const b of blocks) slot(sastDate(Date.parse(b.start))).b.push(b);
    for (const e of ceo!.events) slot(sastDate(Date.parse(e.start))).e.push(e);
    return [...m.entries()].sort(([a], [b]) => a.localeCompare(b)).slice(0, 10);
  }, [blocks, ceo]);
  const pin = async (b: Block, v: string) => {
    if (!b.taskId) return;
    const cur = p!.warehouse.latest<TaskState>('ceo_task_state').find((s) => s.id === b.taskId);
    const next: Record<string, unknown> = { ...cur, id: b.taskId, by: actor.id, at: new Date().toISOString() };
    if (v) next['scheduledStart'] = new Date(v).toISOString(); else delete next['scheduledStart'];
    await p!.warehouse.put('ceo_task_state', next as never);
    bump();
  };
  const addEvent = async () => {
    const s = Date.parse(start); const e = Date.parse(end);
    const refused = !title.trim() ? 'Give the event a title.' : !Number.isFinite(s) || !Number.isFinite(e) || e <= s ? 'End must be after start.' : checkTaskText(title);
    if (refused) return setErr(refused);
    await p!.warehouse.put('ceo_events', { id: newId(), title: title.trim(), start: new Date(s).toISOString(), end: new Date(e).toISOString(), by: actor.id, at: new Date().toISOString() } as never);
    setTitle(''); setStart(''); setEnd(''); setErr(null); bump();
  };
  const removeEvent = async (id: string) => { const e = ceo!.events.find((x) => x.id === id); if (e) { await p!.warehouse.put('ceo_events', { ...e, deleted: true } as never); bump(); } };
  const R = CALENDAR_RULES;
  return (
    <Card title={<span><CalendarClock size={15} className="mr-1 inline" />CEO calendar: tasks that need you</span>} right={<div className="flex gap-2"><button className="btn" onClick={() => download('infinite-ai-ceo-calendar.ics', toIcs(blocks, ceo!.events, Date.now()), 'text/calendar')}><Download size={14} /> .ics</button><button className="btn" onClick={() => void navigator.clipboard?.writeText(digestText(ceo!))}>Copy digest</button></div>}>
      {byDay.length === 0 ? <p className="text-sm" style={{ color: 'var(--muted)' }}>Nothing to schedule: no task that needs you has a due date or is overdue, blocked or waiting on a decision.</p> : (
        <div className="space-y-3">
          {byDay.map(([d, v]) => (
            <div key={d}>
              <h4 className="text-sm font-semibold">{dayLabel(d)}</h4>
              <ul className="mt-1 space-y-1">
                {[...v.b.map((b) => ({ at: b.start, node: (
                  <li key={b.id} className="flex flex-wrap items-center gap-2 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: b.late ? 'var(--rose)' : 'var(--line)' }}>
                    <span className="mono text-xs">{time(b.start)}-{time(b.end)}</span><User size={13} /><span className="flex-1">{b.title}</span>
                    {b.late && <Badge tone="bad">after due date</Badge>}{b.fixed && <Badge tone="info">pinned</Badge>}
                    <input type="datetime-local" className="input !w-auto text-xs" aria-label={`Move ${b.title}`} onChange={(e) => void pin(b, e.target.value)} />
                    {b.fixed && <button className="btn" onClick={() => void pin(b, '')}>Unpin</button>}
                  </li>) })),
                ...v.e.map((e) => ({ at: e.start, node: (
                  <li key={e.id} className="flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm" style={{ borderColor: 'var(--line)' }}><span className="mono text-xs">{time(e.start)}-{time(e.end)}</span><span className="flex-1">{e.title}</span><Badge>event</Badge><button className="btn" onClick={() => void removeEvent(e.id)}>Remove</button></li>) }))]
                  .sort((a, b) => a.at.localeCompare(b.at)).map((x) => x.node)}
              </ul>
            </div>
          ))}
        </div>
      )}
      {unscheduled.length > 0 && <p className="mt-3 text-xs" style={{ color: 'var(--amber)' }}>{unscheduled.length} task(s) did not fit in the next {R.horizonDays} working days. Find them in the task list.</p>}
      <div className="mt-3 flex flex-wrap items-end gap-2 border-t pt-3" style={{ borderColor: 'var(--line)' }}>
        <label className="text-xs">Add an event<input className="input mt-1 !w-60" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Board call" /></label>
        <label className="text-xs">Start<input className="input mt-1" type="datetime-local" value={start} onChange={(e) => setStart(e.target.value)} /></label>
        <label className="text-xs">End<input className="input mt-1" type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} /></label>
        <button className="btn primary" onClick={() => void addEvent()}>Add</button>
        {err && <span role="alert" className="text-xs" style={{ color: 'var(--rose)' }}>{err}</span>}
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>Rules: Monday to Friday {R.startHour}:00-{R.endHour}:00 South African time, {R.breakFrom}:00-{R.breakTo}:00 kept free, {R.blockMinutes}-minute blocks (the platform does not guess how long a task takes: move a block to set your own time), at most {R.maxBlocksPerDay} blocks a day, earliest due date first. Times you pick are in your device's time zone. To see this in Google Calendar or Outlook, use the calendar feed in Integrations.</p>
    </Card>
  );
}

function PlanCard() {
  return (
    <Card title={`Business Planning Package v${PLAN.version} (${PLAN.date})`}>
      <div className="grid gap-2 text-sm md:grid-cols-3">
        <div><b>Price (ZAR, ex VAT)</b><br />R{PLAN.pricing.platformFee} + R{PLAN.pricing.perEducator} per educator + R{PLAN.pricing.perLearnerFirst.toFixed(2)} per learner (first {PLAN.pricing.tierBreak}) + R{PLAN.pricing.perLearnerBeyond.toFixed(2)} above; minimum R{PLAN.pricing.minMonthly}. Community {PLAN.pricing.communityFactor * 100}%, annual prepay {PLAN.pricing.annualDiscount * 100}% off, VAT {PLAN.pricing.vat * 100}%.<br /><span className="text-xs" style={{ color: 'var(--muted)' }}>{PLAN.pricing.status}</span></div>
        <div><b>Founder pay</b><br />R{PLAN.founder.monthlyPay.toLocaleString('en-ZA')} a month for {PLAN.founder.monthsInModel} months. <span className="text-xs" style={{ color: 'var(--muted)' }}>{PLAN.founder.note}</span></div>
        <div><b>Base funding need</b><br />R{PLAN.funding.baseNeedMillion}m. <span className="text-xs" style={{ color: 'var(--muted)' }}>{PLAN.funding.note}</span></div>
      </div>
      <p className="mt-2 text-[11px]" style={{ color: 'var(--muted)' }}>These figures are read from the platform's own plan data, and a test fails if they ever differ from the pricing in the code. The full package (Word and HTML) is stored in the Library.</p>
    </Card>
  );
}
