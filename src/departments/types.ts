import type { AgentContract } from '../core/agent';
import type { CalcOut } from './calc';

export interface Stat { label: string; value: string | number; source: string; tone?: 'ok' | 'warn' | 'info' }
export interface Col { key: string; label: string; kind: 'text' | 'number' | 'date' | 'select'; options?: string[] }

export type Widget =
  | { id: string; title: string; type: 'stats'; note?: string; stats: (facts: Record<string, string | number>) => Stat[] }
  | { id: string; title: string; type: 'calc'; note?: string; inputs: { key: string; label: string; unit?: string }[]; compute: (v: Record<string, number>) => CalcOut[] }
  | { id: string; title: string; type: 'tracker'; note?: string; collection: string; columns: Col[] }
  | { id: string; title: string; type: 'checklist'; note?: string; collection: string; items: string[] }
  | { id: string; title: string; type: 'live'; note?: string; source: 'pulls' | 'ci' | 'oq' | 'events' | 'roster' | 'runbooks' | 'stages' };

export interface Department {
  id: string;
  name: string;
  icon: string; // lucide icon name
  mission: string;
  /** Named, recognised methods applied here. These are methods, not performance claims. */
  frameworks: string[];
  agents: AgentContract[];
  widgets: Widget[];
}
