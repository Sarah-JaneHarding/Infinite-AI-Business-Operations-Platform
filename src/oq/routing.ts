import { AGENTS, DEPARTMENTS } from '../departments';
import type { Question, Routing } from './types';

/**
 * Which department answers for a question, and which of its agents can prepare the follow-up.
 * Data, not code: the first rule whose words appear in the question's title, text or source wins. A person can see why in `why`.
 * Anything no rule matches goes to Executive, because a question nobody can place is a founder decision.
 */
export interface RoutingRule { dept: string; words: string[]; agents: string[] }

export const ROUTING_RULES: RoutingRule[] = [
  { dept: 'security', words: ['popia', 'erasure', 'kms', 'encrypt', 'csp', 'keycloak', 'sso', 'sign in', 'sign-in', 'token', 'secret', 'safeguarding', 'password', 'mfa', 'oauth', 'rls', 'tenant usage', 'information officer'], agents: ['OPS-SEC-01'] },
  { dept: 'legal', words: ['attorney', 'contract', 'licence', 'terms', 'vat', 'tax', 'ratif', 'countersign', 'claims'], agents: ['OPS-LEG-01'] },
  { dept: 'finance', words: ['pricing', 'price', 'invoice', 'payment', 'cost drives', 'budget', 'billing'], agents: ['OPS-FIN-01'] },
  { dept: 'devops', words: ['terraform', 'staging', 'deploy', 'hosted', 'hosting', 'postgres', 'jsonl', 'alert', 'sns', 'ci '], agents: ['OPS-SRE-01'] },
  { dept: 'curriculum', words: ['caps', 'atp', 'sias', 'sace', 'african-language', 'grade band', 'curriculum', 'template'], agents: ['OPS-CURR-01'] },
  { dept: 'ai', words: ['agent', 'model', 'provider', 'gemini', 'anthropic', 'brain', 'eval', 'label', 'autonomy', 'prompt'], agents: ['OPS-AI-01'] },
  { dept: 'marketing', words: ['marketing', 'brand', 'palette', 'social', 'visual system', 'dark, light'], agents: ['OPS-MKT-01'] },
  { dept: 'government', words: ['district', 'department of basic education', 'dbe'], agents: ['OPS-GOV-01'] },
  { dept: 'product', words: ['widget', 'calendar', 'library', 'seed', 'pdf', 'roster', 'tool defaults'], agents: ['OPS-PROD-01'] },
];

const FALLBACK: Routing = { dept: 'executive', agents: ['OPS-EXEC-01'], why: 'No rule matched, so this is a founder decision' };

export function routeQuestion(q: Pick<Question, 'title' | 'question' | 'source' | 'blocks'>): Routing {
  const hay = ` ${q.title} ${q.question} ${q.source ?? ''} ${q.blocks ?? ''} `.toLowerCase();
  for (const r of ROUTING_RULES) {
    const hit = r.words.find((w) => hay.includes(w));
    if (hit) return { dept: r.dept, agents: r.agents, why: `Mentions "${hit.trim()}"` };
  }
  return FALLBACK;
}

/** Every department and agent a rule names must exist, so a renamed agent fails a test, not a decision. */
export function routingProblems(): string[] {
  const depts = new Set(DEPARTMENTS.map((d) => d.id));
  const agents = new Set(AGENTS.map((a) => a.id));
  const out: string[] = [];
  for (const r of [...ROUTING_RULES, { ...FALLBACK, words: [] as string[] }]) {
    if (!depts.has(r.dept)) out.push(`unknown department ${r.dept}`);
    for (const a of r.agents) if (!agents.has(a)) out.push(`unknown agent ${a}`);
  }
  return out;
}
