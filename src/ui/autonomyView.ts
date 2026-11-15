import type { OrderTemplate, TemplateTrigger } from '../departments/orderTemplates';
// Type only: the browser bundle must not pull in server code.
import type { Task } from '../server/autonomy/tasks';

/**
 * What a template fills into the proposal form. A template pre-selects, it never pre-fills: `inputs` is always empty,
 * because a standing order's inputs are facts a person vouches for. The map is fresh on every call.
 */
export function templateToForm(t: OrderTemplate): { name: string; agentId: string; trigger: TemplateTrigger; runs: number; inputs: Record<string, string> } {
  return { name: t.name, agentId: t.agentId, trigger: t.trigger, runs: t.maxRunsPerDay, inputs: {} };
}

/** Same order as the server's `compareTasks` (a test holds the two together): most urgent, earlier due, earlier arrival, then id. */
const byQueueOrder = (a: Task, b: Task): number =>
  a.priority - b.priority ||
  Date.parse(a.due) - Date.parse(b.due) ||
  Date.parse(a.at) - Date.parse(b.at) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/** Tasks grouped by department id, in queue order within each. Departments with no tasks are absent; an unknown department keeps its own id. */
export function groupTasksByDept(tasks: Task[]): Record<string, Task[]> {
  const out: Record<string, Task[]> = {};
  for (const t of [...tasks].sort(byQueueOrder)) (out[t.dept] ??= []).push(t);
  return out;
}
