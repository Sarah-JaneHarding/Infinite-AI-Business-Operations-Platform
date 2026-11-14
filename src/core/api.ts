/** Every call to the server goes through here so the credential is attached in one place. */
let token: string | undefined;

export function loadToken(): string | undefined {
  try {
    token = globalThis.sessionStorage?.getItem('ops.token') ?? undefined;
  } catch {
    /* storage blocked: the token then lives in memory for this page only */
  }
  return token;
}

export function setToken(t: string | undefined) {
  token = t;
  try {
    if (t) globalThis.sessionStorage?.setItem('ops.token', t);
    else globalThis.sessionStorage?.removeItem('ops.token');
  } catch {
    /* ignore */
  }
}

/** Set only while `withReauth` runs. Never persisted. */
let reauth: string | undefined;

/**
 * Sends the signer's own token as `x-ops-reauth` on every `apiFetch` made while `fn` runs, then clears it, also when `fn` throws.
 * For one in-flight action: nested or concurrent use is not supported (the inner call would clear the outer's token).
 */
export async function withReauth<T>(reauthToken: string, fn: () => Promise<T>): Promise<T> {
  reauth = reauthToken;
  try {
    return await fn();
  } finally {
    reauth = undefined;
  }
}

export const apiFetch: typeof fetch = (input, init = {}) =>
  fetch(input, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...(token ? { 'x-ops-token': token } : {}), ...(reauth ? { 'x-ops-reauth': reauth } : {}) } });
