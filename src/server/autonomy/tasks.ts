import { OrderRefused } from "./orders";

export type TaskStatus =
  | "QUEUED"
  | "RUNNING"
  | "SUBMITTED"
  | "QUARANTINED"
  | "FAILED"
  | "CANCELLED"
  | "EXPIRED";
export type TaskOrigin =
  | { kind: "person"; by: string }
  | { kind: "schedule"; slot: string }
  | { kind: "event"; event: string };

/** One unit of queued work for an agent under a standing order. A task can only ever produce a draft, like the order itself. */
export interface Task {
  id: string;
  orderId: string;
  agentId: string;
  dept: string;
  /** 1 is most urgent. */
  priority: 1 | 2 | 3;
  /** ISO time. */
  due: string;
  /** Only when the order allowed task inputs and a person enqueued it. */
  inputs?: Record<string, string>;
  origin: TaskOrigin;
  dedupeKey?: string;
  status: TaskStatus;
  note?: string;
  artefactId?: string;
  version: number;
  at: string;
}

const DAY_MS = 24 * 60 * 60 * 1000;
export const TASK_EXPIRY_MS = 7 * DAY_MS;
export const MAX_QUEUED_PER_ORDER = 10;
const DUE_AHEAD_MS = 90 * DAY_MS;
const DUE_BEHIND_MS = DAY_MS;

export interface EnqueueRequest {
  orderId: string;
  priority: 1 | 2 | 3;
  due: string;
  /** Unchecked until the service parses it against the order's agent. */
  inputs?: Record<string, unknown>;
}

const ISO =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.\d{1,3})?(Z|[+-]\d{2}:\d{2})$/;

/** True only for a real ISO timestamp: a date that Date would roll over (30 February) is refused by the round trip. */
function validIso(v: string): boolean {
  const m = ISO.exec(v);
  if (!m) return false;
  const ms = Date.parse(v);
  if (!Number.isFinite(ms)) return false;
  const [, y, mo, d, h, mi, s, zone] = m;
  const shifted =
    zone === "Z"
      ? 0
      : (zone!.startsWith("-") ? -1 : 1) *
        (Number(zone!.slice(1, 3)) * 60 + Number(zone!.slice(4, 6))) *
        60000;
  const local = new Date(ms + shifted);
  return (
    local.getUTCFullYear() === Number(y) &&
    local.getUTCMonth() + 1 === Number(mo) &&
    local.getUTCDate() === Number(d) &&
    local.getUTCHours() === Number(h) &&
    local.getUTCMinutes() === Number(mi) &&
    local.getUTCSeconds() === Number(s)
  );
}

/** Checks the shape of an enqueue request. Inputs are checked later against the agent, so only their outline is checked here. Messages name the field, never repeat the value. */
export function parseEnqueue(body: unknown, now: Date): EnqueueRequest {
  if (typeof body !== "object" || body === null || Array.isArray(body))
    throw new OrderRefused(400, "the task must be an object");
  const b = body as Record<string, unknown>;
  if (typeof b.orderId !== "string" || b.orderId.trim() === "")
    throw new OrderRefused(400, "orderId is required");
  const p = b.priority;
  if (p !== 1 && p !== 2 && p !== 3)
    throw new OrderRefused(400, "priority must be 1, 2 or 3");
  if (typeof b.due !== "string" || !validIso(b.due))
    throw new OrderRefused(
      400,
      "due must be an ISO time such as 2026-11-20T08:00:00Z",
    );
  const due = Date.parse(b.due);
  if (due > now.getTime() + DUE_AHEAD_MS)
    throw new OrderRefused(400, "due must be no more than 90 days ahead");
  if (due < now.getTime() - DUE_BEHIND_MS)
    throw new OrderRefused(400, "due must not be more than a day in the past");
  const req: EnqueueRequest = { orderId: b.orderId, priority: p, due: b.due };
  if (b.inputs !== undefined) {
    if (
      typeof b.inputs !== "object" ||
      b.inputs === null ||
      Array.isArray(b.inputs)
    )
      throw new OrderRefused(400, "inputs must be an object");
    req.inputs = b.inputs as Record<string, unknown>;
  }
  return req;
}

/** Most urgent first, then the earlier due time, then the earlier arrival. The id is the last tie-break so the order is total. */
export const compareTasks = (a: Task, b: Task): number =>
  a.priority - b.priority ||
  Date.parse(a.due) - Date.parse(b.due) ||
  Date.parse(a.at) - Date.parse(b.at) ||
  (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);
