/**
 * Department assistant. This is rule-based, not a language model: it matches what you type to the department's
 * agents and templates, asks for each input in turn, and hands the finished request to the same agent runner and the
 * same input gates as the forms. It cannot invent an answer; if it does not recognise a request it says so and lists what it can do.
 */
import type { AgentContract } from '../core/agent';
import type { Template } from './templates';

export type ChatState = { mode: 'idle' } | { mode: 'collect'; agentId: string; queue: string[]; answers: Record<string, string> };
export type ChatAction =
  | { type: 'run'; agentId: string; input: Record<string, string> }
  | { type: 'template'; id: string }
  | { type: 'builder'; kind: 'agent' | 'widget' | 'artefact' };
export interface ChatReply { state: ChatState; say: string; actions: ChatAction[] }
export interface ChatCtx { deptName: string; agents: AgentContract[]; templates: Template[] }

const STOP = new Set('a an and are as at be by can for from get give i in is it make me my need of on or please the to us want we with write draft create new help do you your that this'.split(' '));
const words = (s: string) => s.toLowerCase().replace(/[^a-z0-9 ]+/g, ' ').split(/\s+/).filter((w) => w.length > 2 && !STOP.has(w));
const stem = (w: string) => w.replace(/(ing|ed|es|s)$/, '');
const bag = (s: string) => new Set(words(s).map(stem));
function score(q: Set<string>, text: string): number { const t = bag(text); let n = 0; for (const w of q) if (t.has(w)) n++; return n; }

export const GREETING = (c: ChatCtx) => `I am the ${c.deptName} assistant. I am rule-based, not a language model: I match what you ask to this department's ${c.agents.length} agents and ${c.templates.length} templates, ask for the details, and send them through the same checks as the forms. Try “draft a …”, “template for …”, “new agent”, “new widget” or “list”.`;

export const listing = (c: ChatCtx) => `Agents:\n${c.agents.map((a) => `• ${a.name}`).join('\n')}${c.templates.length ? `\n\nTemplates:\n${c.templates.map((t) => `• ${t.title}`).join('\n')}` : ''}`;

const ask = (a: AgentContract, key: string) => { const f = a.inputs.find((i) => i.key === key)!; return `${f.label}${f.required ? '' : ' (optional, or type “skip”)'}${f.kind === 'select' ? `. Choose one: ${f.options!.join(', ')}` : ''}${f.help ? `\n${f.help}` : ''}`; };

export function step(state: ChatState, text: string, c: ChatCtx): ChatReply {
  const t = text.trim();
  const low = t.toLowerCase();
  if (!t) return { state, say: state.mode === 'collect' ? 'Please type an answer, or “cancel”.' : GREETING(c), actions: [] };
  if (/^(cancel|stop|reset|never ?mind)\b/.test(low)) return { state: { mode: 'idle' }, say: 'Cancelled. Nothing was drafted.', actions: [] };

  if (state.mode === 'collect') {
    const a = c.agents.find((x) => x.id === state.agentId);
    if (!a) return { state: { mode: 'idle' }, say: 'That agent is no longer available.', actions: [] };
    const [key, ...rest] = state.queue;
    const f = a.inputs.find((i) => i.key === key)!;
    if (low === 'skip' && f.required) return { state, say: `${f.label} is required. ${ask(a, key)}`, actions: [] };
    let val = low === 'skip' ? '' : t;
    if (f.kind === 'select' && val) { const o = f.options!.find((x) => x.toLowerCase() === low) ?? f.options!.find((x) => x.toLowerCase().startsWith(low)); if (!o) return { state, say: `Please choose one of: ${f.options!.join(', ')}.`, actions: [] }; val = o; }
    if (f.kind === 'number' && val && !Number.isFinite(Number(val.replace(/[\s,]/g, '')))) return { state, say: 'Please give a number.', actions: [] };
    const answers = { ...state.answers, [key]: val };
    if (rest.length) return { state: { ...state, queue: rest, answers }, say: ask(a, rest[0]), actions: [] };
    return { state: { mode: 'idle' }, say: `Sending to ${a.name}. It will be checked, drafted and wait for a human decision.`, actions: [{ type: 'run', agentId: a.id, input: answers }] };
  }

  if (/^(help|\?|what can you do|list|menu)\b/.test(low)) return { state, say: listing(c), actions: [] };
  const mk = /\b(new|create|build|make|define|add)\b/.test(low);
  if (mk && /\bagent\b/.test(low)) return { state, say: 'Opening the agent builder.', actions: [{ type: 'builder', kind: 'agent' }] };
  if (mk && /\b(widget|tracker|checklist|calculator|calc)\b/.test(low)) return { state, say: 'Opening the widget builder.', actions: [{ type: 'builder', kind: 'widget' }] };
  if (mk && /\b(artefact|artifact)\b/.test(low)) return { state, say: 'Opening the artefact builder.', actions: [{ type: 'builder', kind: 'artefact' }] };

  const q = bag(t);
  const wantsTemplate = /\btemplate|form|letter|agenda|checklist|outline\b/.test(low);
  const ts = c.templates.map((x) => ({ x, s: score(q, `${x.title} ${x.summary}`) })).sort((p, r) => r.s - p.s);
  const as = c.agents.map((x) => ({ x, s: score(q, `${x.name} ${x.summary}`) })).sort((p, r) => r.s - p.s);
  const bt = ts[0], ba = as[0];
  if (wantsTemplate && bt && bt.s > 0 && bt.s >= (ba?.s ?? 0)) return { state, say: `Opening the template “${bt.x.title}” in the library, where you can edit it and download it in any format.`, actions: [{ type: 'template', id: bt.x.id }] };
  if (ba && ba.s > 0) {
    const a = ba.x;
    const tie = as.filter((p) => p.s === ba.s && p.x.id !== a.id);
    const queue = a.inputs.map((i) => i.key);
    const intro = tie.length ? `Closest match is ${a.name}. If you meant ${tie.slice(0, 2).map((p) => p.x.name).join(' or ')}, type “cancel” and be more specific.\n\n` : `I will use ${a.name}.\n\n`;
    return { state: { mode: 'collect', agentId: a.id, queue, answers: {} }, say: `${intro}${ask(a, queue[0])}`, actions: [] };
  }
  if (bt && bt.s > 0) return { state, say: `Opening the template “${bt.x.title}”.`, actions: [{ type: 'template', id: bt.x.id }] };
  return { state, say: `I did not recognise that as something this department can draft. I can only use its agents and templates, and I will not guess.\n\n${listing(c)}\n\nOr say “new agent”, “new widget” or “new artefact” to define something new.`, actions: [] };
}
