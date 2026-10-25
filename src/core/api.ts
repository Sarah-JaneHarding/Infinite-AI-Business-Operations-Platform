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

export const apiFetch: typeof fetch = (input, init = {}) =>
  fetch(input, { ...init, headers: { ...(init.headers as Record<string, string> | undefined), ...(token ? { 'x-ops-token': token } : {}) } });
