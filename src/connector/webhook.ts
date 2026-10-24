/** GitHub signs webhook bodies with HMAC-SHA256 (`x-hub-signature-256: sha256=<hex>`). Constant-time compare. */
export async function verifySignature(secret: string, body: string, header: string | undefined): Promise<boolean> {
  if (!secret || !header?.startsWith('sha256=')) return false;
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(body)));
  const hex = [...sig].map((b) => b.toString(16).padStart(2, '0')).join('');
  const given = header.slice(7);
  if (given.length !== hex.length) return false;
  let diff = 0;
  for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ given.charCodeAt(i);
  return diff === 0;
}

export interface EcoEvent { kind: string; summary: string; at: string }
export function summariseEvent(event: string, payload: Record<string, any>): EcoEvent {
  const at = new Date().toISOString();
  switch (event) {
    case 'push': return { kind: 'push', at, summary: `${payload.pusher?.name ?? 'someone'} pushed ${payload.commits?.length ?? 0} commit(s) to ${String(payload.ref ?? '').replace('refs/heads/', '')}` };
    case 'pull_request': return { kind: 'pull_request', at, summary: `PR #${payload.number} ${payload.action}: ${payload.pull_request?.title ?? ''}` };
    case 'workflow_run': return { kind: 'workflow_run', at, summary: `${payload.workflow_run?.name ?? 'workflow'} ${payload.workflow_run?.conclusion ?? payload.workflow_run?.status ?? ''}` };
    case 'issues': return { kind: 'issues', at, summary: `Issue #${payload.issue?.number} ${payload.action}: ${payload.issue?.title ?? ''}` };
    default: return { kind: event, at, summary: `${event} received` };
  }
}
