# Review board

Every output, from a person, an agent or an autonomous run, is a **draft** until two different people have signed the
exact content (except in solo mode, where one registered person may sign twice, flagged; see "Solo signing" below). Open it from the sidebar: **Review Board**.

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──countersign──▶ RATIFIED ──ingest──▶ INGESTED
  ▲                   │                      │
  └──── edit / reject ┴───── any edit voids the signatures and returns it to DRAFT
```

| Step | Who | What it records |
| ---- | --- | --------------- |
| **Edit and save** | a person | A new version. Every edit returns the artefact to DRAFT and voids earlier signatures. |
| **Review and approve** | a named human | The approval, bound to the exact content (a hash). A rejection needs a reason. Agents that require it need someone other than the author. |
| **Countersign** | a *different* human from the approver (in solo mode the approver may do it themselves, flagged; never for `twoPerson` or `professionalReview` agents) | The second signature on the same content. This ratifies it. |
| **Ratify** | recorded with the countersignature | `artefact.countersigned` then `artefact.ratified` in the audit ledger. |
| **Ingest** | the countersigner's action, automatic | The exact ratified document is saved to the document library (immutable) and an episode is recorded in the Brain. Skipped when the agent's contract says `ingestion: 'none'` (not relevant). A failed ingestion leaves it RATIFIED and can be retried. |

## Rules (enforced on the server, not only in the browser)

- No bot, agent or autonomous actor (`auto:…`) can approve, countersign, ratify or ingest.
- The approver and the countersigner must be different people. The author may be one of the two, but nobody signs twice. This holds in dual mode and when `OPS_SIGNERS` is unset. In solo mode it is relaxed for agents that are not `twoPerson` or `professionalReview` (flagged `single-signer`); for those two kinds it holds in every mode. See "Solo signing" below.
- A signature only counts for the exact content it was given on: the content hash must not change between approval and
  countersignature, and nothing can be edited after ratification.
- **Ratified output is final.** To change it, start a *revision*: a new draft copied from it that goes through the whole board
  again. The ratified original and its library copy stay as they were. A ratified library document can never be rewritten or
  deleted.
- Anything that leaves the platform (opening a GitHub issue, sending an artefact to another system) requires a ratified
  artefact with both signatures on record. Approved alone is not enough.
- Each step is written to the append-only ledger under the person who did it, and only if the stored state matches.

## Two-person teams

With only two people, one approves and the other countersigns; the author may be either. That is the minimum the rules allow
(two different humans, neither signing twice; solo mode is the one-person exception, see below). Whether authors should be barred from signing their own work is an open
decision (OPQ-017).

## Solo signing, two-person and professional review

Owner decision, 2026-11-14: a **temporary** relaxation of the two-signer rule, because one person signs for the business
today. It is opt-in, visible, and never applies to the hard exceptions below. It is recorded against OPQ-017 and OPQ-019.
Drafting is never gated: agents draft every document in every mode.

### Configuration

| Key | Meaning |
| --- | ------- |
| `OPS_SIGNERS` | The registry of people who may sign for the business: entries `id\|Display Name\|scope\|profession\|registration` separated by `;`. Scope is `*` or departments joined with `+`. A professional entry needs a department scope and registration text. Each id must be in `OPS_USERS`. `\|` and `;` cannot appear in a registration. Unset (or empty) means no registry: behaviour is exactly as before. |
| `OPS_SIGNING_MODE` | `solo` opts in. Default is dual. Solo needs `OPS_USERS` and exactly one registered signer; the server refuses to start in solo with two signers. An empty value stops the server. |
| `OPS_SOLO_WAIT_MINUTES` | Whole minutes, 1 to 1440, default 10. An empty value stops the server. |

Professions are `attorney`, `accountant` and `tax_practitioner`. Registration numbers are free text kept for the owner's record.
The platform stores them and cannot verify them.

### What solo mode allows

- The approver may countersign their own approval, after the wait, with a fresh re-authentication: the request carries the
  signer's own token in the `x-ops-reauth` header. The wait is timed by the server from the server-authored `hitl.approved`
  ledger entry for that artefact version, not from anything the client sends.
- A solo author may approve their own run of an agent that needs a second approver (custom agents included).
- Either way the record is flagged `signing: single-signer`. The Board shows a banner while solo is on, a token prompt for
  the re-authentication, and a single-signer badge on flagged artefacts.
- Both signatures stay bound to the same content hash; any edit voids both.
- Agents and `auto:` actors can never sign, in any mode.

### Hard exceptions (never relaxed by solo)

- **`twoPerson`** (agent contract field): the countersigner must be a different person from the approver, in every mode, with no
  solo fallback. If no second registered signer exists, the artefact stays APPROVED and unratified.
- **`professionalReview`** (`attorney`, `accountant` or `tax_practitioner`; implies `twoPerson`): the countersigner must be a
  registered signer holding that profession. The owner cannot countersign it unless registered in that profession. The single-signer
  flag never appears on these.

Default mapping today: OPS-LEG-01 to OPS-LEG-05 need an attorney; OPS-SEC-01 and OPS-PPL-04 are `twoPerson`; nothing else is
gated. Which other agents should be is OPQ-028. The contract rule is C11 in `docs/AGENT_CONTRACTS.md`.

### What the ledger and report show

- Single-signer approvals and countersignatures carry `signing: single-signer` in the ledger and on the artefact record.
- `GET /api/signing/report` lists every single-signer ratification (kind `self-countersign` or `self-approval`, signer, time,
  content hash) so a second person can review them later.
- `GET /api/whoami` returns `signing`, `signer` and the caller's own `profession`. It never returns registration text.

### Returning to dual

Register a second signer in `OPS_SIGNERS` and remove `OPS_SIGNING_MODE=solo`, then restart. The server will not start in solo
with two signers. Artefacts already ratified as single-signer keep their flag and stay on the report.

### Migration notes

- `hitl.approved` ledger entries written before this change carry no version. A solo self-countersign for an artefact approved
  earlier therefore needs a re-approval first.
- Signing and profession markers must now match exactly when rows are re-appended.

## What this does not do

- It does not decide *who* may approve or countersign (roles). Anyone signed in can, unless `OPS_SIGNERS` is set: then the registry limits who may sign (scope, and profession for professional review). Roles beyond that need the role model (OPQ-002).
- Ingestion puts the whole document in the library and a short episode in the Brain. It does not extract facts from the
  document into the Brain's policy tiers; that is a separate, human-ratified step.
