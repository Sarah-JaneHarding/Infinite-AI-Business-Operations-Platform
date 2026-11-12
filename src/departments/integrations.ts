/** What the platform connects to, and honestly, what state each connection is in. Nothing here claims a connection that does not exist. */
export interface HealthLike { githubToken?: boolean; llm?: boolean; ecosystemWrites?: boolean; webhook?: boolean; outbound?: boolean; auth?: 'users' | 'open' }
export type IntState = 'live' | 'off' | 'not_built' | 'built_in';
export interface Integration { id: string; name: string; direction: 'in' | 'out' | 'both' | 'file'; state: IntState; what: string; how: string }

export function integrations(h: HealthLike | null, serverMode: boolean): Integration[] {
  const s = (on?: boolean): IntState => (serverMode && on ? 'live' : 'off');
  return [
    { id: 'files', name: 'Files: Word, Excel, PDF, CSV, JSON, Markdown, HTML', direction: 'file', state: 'built_in', what: 'Upload any file; download or print documents in these formats.', how: 'Library & Templates. Word and Excel open in Microsoft 365 and Google Docs/Sheets as ordinary files.' },
    { id: 'github-read', name: 'GitHub: read the ecosystem repository', direction: 'in', state: s(h?.githubToken), what: 'Live facts (pull requests, builds, open questions) shown as sourced figures.', how: 'Set GITHUB_TOKEN on the server. Without it the platform uses the public, rate-limited API or a saved snapshot.' },
    { id: 'github-issue', name: 'GitHub: open an issue from an approved artefact', direction: 'out', state: s(h?.ecosystemWrites), what: 'Opens an issue only. It never pushes code.', how: 'Set OPS_ALLOW_ECOSYSTEM_WRITES=true and a token that can write issues.' },
    { id: 'github-webhook', name: 'GitHub webhook (incoming events)', direction: 'in', state: s(h?.webhook), what: 'Records repository events as they happen, verified by signature.', how: 'Set GITHUB_WEBHOOK_SECRET and point the repository webhook at /api/connector/webhook.' },
    { id: 'outbound', name: 'Send an approved artefact to another system', direction: 'out', state: s(h?.outbound), what: 'POSTs the approved artefact as JSON to a host you allow. Optional signature header.', how: 'Set OPS_OUTBOUND_ALLOWLIST to the exact host names (https only). Optionally set OPS_OUTBOUND_SECRET to sign each request.' },
    { id: 'llm', name: 'Model providers (Model Hub)', direction: 'both', state: s(h?.llm), what: 'Lets agents polish wording and powers the copilot. Every call runs the same non-bypassable rules: de-identified text with sources only, audited, output always a draft.', how: 'Open Model Hub in the sidebar: add a provider key on the server, restart, attest the provider, then test it. Without a ready provider, agents use their built-in templates.' },
    { id: 'sso', name: 'Single sign-on (Keycloak)', direction: 'in', state: 'not_built', what: 'Sign in with school or company accounts.', how: 'Decision OPQ-002 is open. Today sign-in uses OPS_USERS tokens.' },
    { id: 'messaging', name: 'Email and WhatsApp', direction: 'out', state: 'not_built', what: 'Sending messages to schools and parents.', how: 'Decision OPQ-003 is open. Needs consent and a POPIA review before any build. Use download or copy for now.' },
    { id: 'payments', name: 'Payments and accounting', direction: 'both', state: 'not_built', what: 'Invoicing and reconciliation with a payments or accounting provider.', how: 'Decision OPQ-004 is open. Export tables as CSV or Excel for your accountant.' },
  ];
}
