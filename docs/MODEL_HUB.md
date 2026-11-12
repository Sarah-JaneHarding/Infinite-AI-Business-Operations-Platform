# Model Hub

Every AI model the platform uses is connected through one place, the **Model Hub** (sidebar → *Model Hub*, code in
`src/server/models/`). It exists so that adding a provider is easy, and so that no provider can be used in a way that
skips the platform's rules.

**Everything a model produces is a draft.** Nothing in the hub can approve, ratify or ingest model output; that is done
by people (see `docs/PLATFORM_DESIGN.md`).

## Set up a provider (5 steps)

1. **Create an API key** in the provider's console. Use a key dedicated to this platform so it can be revoked on its own.
   - Anthropic (Claude): the Anthropic Console
   - Google Gemini: Google AI Studio
2. **Add it to the server's `.env`** (never to the repository, the browser or a chat):
   ```
   ANTHROPIC_API_KEY=<paste the key here>
   GEMINI_API_KEY=<paste the key here>
   ```
   Optional: pin a model with `ANTHROPIC_MODEL` / `GEMINI_MODEL`. The card in the hub shows the exact lines.
3. **Restart the server.** The provider's card now says *Configured · needs attestation*.
4. **Attest.** A named person confirms they reviewed the provider's terms for the exact model shown (data processing,
   retention, training use). This is recorded in the audit ledger. It must be repeated if the model changes, and anyone
   can **revoke** it with a reason; revoking stops use immediately.
5. **Run the test.** It sends a harmless fixed prompt through the full rule path and records the result.

Choose the order providers are tried in with `OPS_MODEL_ORDER=anthropic,gemini` (default). If the first fails, the next
ready provider answers, and the failure is audited. With no ready provider, agents use their built-in templates and the
copilot uses a deterministic engine.

## Configuration reference

| Variable | Meaning | Default |
| -------- | ------- | ------- |
| `ANTHROPIC_API_KEY`, `GEMINI_API_KEY` | Provider keys. Server only; never returned by any API. | unset |
| `ANTHROPIC_MODEL`, `GEMINI_MODEL` | Model to use. Changing it requires a new attestation. | `claude-sonnet-5-5`, `gemini-3.8-flash` |
| `ANTHROPIC_API_BASE`, `GEMINI_API_BASE` | Provider base URL (for a proxy). Must be `https`; plain `http` only for localhost. | provider default |
| `OPS_MODEL_ORDER` | Routing order. An unknown name stops startup. | `anthropic,gemini` |
| `OPS_MODEL_DAILY_CALLS` | Calls per provider per UTC day, counted from the ledger so a restart does not reset it. | `500` |
| `OPS_MODEL_READABLE_COLLECTIONS` | Collections whose *contents* tools may show a model (de-identified, trimmed). Counts are always available. | none |

A bad value in any of these stops the server with a `FATAL:` message; it never starts with a weaker setting.

## The rules (cannot be turned off)

They are code, identical for every provider and model. Configuration can only make them stricter.

| | Rule |
| - | ---- |
| M1 | **Provenance first.** Every request carries a de-identified stamp with sources; unstamped is refused even if the detector finds nothing. |
| M2 | **No personal data or injection in any prompt.** System text, prompt, every history message, every tool argument and every tool result are scanned. |
| M3 | **Purpose limitation.** One purpose from the closed list; an agent's request must be a purpose it is contracted for. |
| M4 | **Size limits** on input, history, tool results, tool turns and output. |
| M5 | **A human must attest each provider and model.** No override. |
| M6 | **Rate and daily budget**, counted from the ledger. |
| M7 | **Every call is audited, audit first.** If the ledger cannot be written, the call is not made (or its answer is withheld). The ledger records who, model, purpose, sizes and a hash of the prompt, never its content. |
| M8 | **Output is always a draft.** Personal data echoed by the model is redacted and unsourced figures are stripped. |
| M9 | **Tools see only what is allowed, de-identified.** The ledger, erasure records, integration settings, approvals, the Brain and custom definitions can never be made readable. |
| M10 | **One door.** Only the hub can call a provider; a test fails if any other file contains a provider host, header, SDK or key name. |

## Troubleshooting

| You see | Cause and fix |
| ------- | ------------- |
| Card says *Not configured* | The key is not in the server's environment. Check the variable name, restart. |
| `FATAL: model hub configuration: …` at start | A hub variable has a bad value; the message names it. |
| `503 … rule M5` | No ready provider: configure and attest one in the hub. |
| `429 … rule M6` | Rate limit (per minute, per user) or the provider's daily budget. Raise `OPS_MODEL_DAILY_CALLS` only deliberately. |
| `422 … rule M2` | The text contained personal data or an instruction-override pattern. Remove it and retry. |
| `503 … rule M7` | The audit ledger could not be written (disk full or read-only). Fix storage; nothing was sent. |
| Test fails with `provider returned 401` | The key is wrong or revoked. |
| Test fails with `provider returned 404` | The model name is not available to that key. Check `*_MODEL`. |
| `provider unreachable` | The server cannot reach the provider (network or proxy). Behind a proxy, set `*_API_BASE`. |

## What this does not do, and what is unverified

- It does not make a provider's own handling of data compliant. Attestation records that a *person* reviewed the terms; it
  is not a legal assessment (see `docs/OPEN_QUESTIONS.md`).
- The adapters talk to each provider's HTTP API directly. They are tested against local stand-ins and have **not been run
  against the live providers** from this repository. Run **Test** in the hub with a real key before relying on one.
- The default Gemini model name (`gemini-3.8-flash`) was inherited from earlier code and is not verified; pin
  `GEMINI_MODEL` to a model your key can use.
- Anyone signed in can attest or revoke. Restricting that to certain roles needs the role model (OPQ-002).
