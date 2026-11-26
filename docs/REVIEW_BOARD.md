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
- A draft from a queued task (see [AUTONOMY.md](AUTONOMY.md)) takes the same path: acceptance suite, then this board, with the same signing rules.
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
| `OPS_SIGNERS` | The registry of people who may sign for the business: entries `id\|Display Name\|scope\|profession\|registration` separated by `;`. Scope is `*` or departments joined with `+`. A professional entry needs a department scope and registration text. Each id must be in `OPS_USERS`. `\|` and `;` cannot appear in a registration. Unset (or empty) means no registry: anyone signed in may approve and countersign as before, **except** that `professionalReview` agents (OPS-LEG-01 to 05) can then never be ratified (nobody holds a profession), and `twoPerson` agents always need a second, different person. Those rules apply in every mode, with or without a registry. |
| `OPS_SIGNING_MODE` | `solo` opts in. Default is dual. Solo needs `OPS_USERS` and exactly **one non-professional** signer (the person who signs alone); any number of professional signers (attorney, accountant, tax practitioner, each with a department scope) may be registered beside them. The server refuses to start in solo with no non-professional signer, or with two or more. Empty or blank means unset (dual). |
| `OPS_SOLO_WAIT_MINUTES` | Whole minutes, 1 to 1440, default 10. Empty or blank means unset (10); any other value outside 1 to 1440 stops the server. |

Professions are `attorney`, `accountant` and `tax_practitioner`. Registration numbers are free text kept for the owner's record.
The platform stores them and cannot verify them.

### What solo mode allows

- The approver may countersign their own approval, after the wait, by re-entering their token: the request carries the
  signer's own token in the `x-ops-reauth` header. This is token re-entry (the same token the browser already holds in
  sessionStorage), which proves a deliberate act; it is not a second factor. The wait is timed by the server from the server-authored `hitl.approved`
  ledger entry for that artefact version, not from anything the client sends.
- A solo author may approve their own run of an agent that needs a second approver (custom agents included). With a
  registry, a custom agent's decisions need a `*`-scoped signer: the server ignores the department on a custom definition
  and fails closed.
- Either way the record is flagged `signing: single-signer`. The Board shows a banner while solo is on, a token prompt for
  the token re-entry, and a single-signer badge on flagged artefacts.
- Both signatures stay bound to the same content hash; any edit voids both.
- Agents and `auto:` actors can never sign, in any mode.

### Hard exceptions (never relaxed by solo)

- **`twoPerson`** (agent contract field): the countersigner must be a different person from the approver, in every mode, with no
  solo fallback. If no second registered signer exists, the artefact stays APPROVED and unratified.
- **`professionalReview`** (`attorney`, `accountant` or `tax_practitioner`; implies `twoPerson`): the countersigner must be a
  registered signer holding that profession. The owner cannot countersign it unless registered in that profession. The single-signer
  flag never appears on these.

Default mapping today: OPS-LEG-01 to OPS-LEG-05 need an attorney; OPS-SEC-01 and OPS-PPL-04 are `twoPerson`; nothing else is
gated. Which other agents should be is OPQ-033. The contract rule is C11 in `docs/AGENT_CONTRACTS.md`.

These rules hold in every mode and whether or not `OPS_SIGNERS` is set. With no registry nobody holds a profession, so a
`professionalReview` artefact stays APPROVED and cannot be ratified until a professional is registered.

**Solo with a registered professional.** Solo allows exactly one non-professional signer and any number of professional
signers beside them, for example `OPS_SIGNERS=owner|Owner|*;lerato|Lerato M|legal|attorney|<registration>` with
`OPS_SIGNING_MODE=solo`. The owner then signs ordinary agents alone (flagged single-signer). A legal artefact needs the
attorney to countersign, and the attorney must be a different person from the approver. Because the legal agents also need
an approver other than their author, an owner-drafted legal artefact with only one attorney registered cannot be completed
(the attorney cannot both approve and countersign); have the attorney run the agent and the owner approve, or register a
second signer. A professional may also approve and countersign ordinary artefacts within their own department scope, and in
solo the solo rules (wait, token re-entry, flag) apply to them there too. The single-signer flag never appears on a
`professionalReview` artefact.

### What the ledger and report show

- Single-signer approvals and countersignatures carry `signing: single-signer` in the ledger and on the artefact record.
- `GET /api/signing/report` lists every single-signer ratification (kind `self-countersign` or `self-approval`, signer, time,
  content hash) so a second person can review them later.
- `GET /api/whoami` returns `signing`, `signer` and the caller's own `profession`. It never returns registration text.
- A professional countersignature records the person and their `profession` on the countersignature row and in the
  `artefact.countersigned` and `artefact.ratified` ledger entries. It does **not** record the registration text: the ledger
  is readable by everyone signed in, and registration text stays in the registry (`OPS_SIGNERS`), like whoami. The owner can
  look it up there for any countersignature (OPQ-033).

### Returning to dual

Register a second signer in `OPS_SIGNERS` and remove `OPS_SIGNING_MODE=solo`, then restart. The server will not start in solo
with two non-professional signers (registered professionals do not count). Artefacts already ratified as single-signer keep their flag and stay on the report.

### Migration notes

- `hitl.approved` ledger entries written before this change carry no version. A solo self-countersign for an artefact approved
  earlier therefore needs a re-approval first.
- Signing and profession markers must now match exactly when rows are re-appended.
- Legal artefacts (OPS-LEG-01 to 05) that were approved but not countersigned before this change stay APPROVED until an
  attorney is registered in `OPS_SIGNERS` and countersigns them.
- Legal artefacts ratified before this change have no `profession` on their countersignature row, so the outbound gate
  refuses to publish or send them. They are not grandfathered (a client-supplied ratification time could be forged): start a
  revision and take it through the board again, with a registered attorney countersigning.
- Deploying: a browser tab still running an older bundle writes `approvals` rows without `version`. The server refuses the
  ledger entry for that approval, so the artefact cannot pass the outbound gate (or a solo self-countersign) until it is
  edited and approved again. Reload every open tab after deploying.

## Founder-only setup

This is how one person (the founder or CEO) puts any readable Library document on the board and signs it alone. It is
configuration only: the approve and countersign rules are the ones above, and nothing about them changes.

1. **Put the document on the board.** In the Library tab, select a document that can be edited and press **Send to review**.
   This makes a DRAFT artefact with agent id `LIBRARY-DOC` (a label, not an agent: nothing runs it) and opens it in the Studio.
   The Library record is never changed. Pressing it again opens the artefact already made for that document. Stored-as-is files
   (PDFs, images) cannot be sent. Only a named person can; agents and `auto:` actors are refused.
2. **Register the one signer.** In `.env`, set `OPS_USERS=<id>:<token>`, `OPS_SIGNERS=<id>|<Display Name>|*` and
   `OPS_SIGNING_MODE=solo`. Solo needs exactly **one non-professional signer**; the server will not start with none or with two.
   Registered professionals (attorney, accountant, tax practitioner) may be added beside them.
3. **Sign.** Submit for review, then approve. To countersign your own approval you must wait: the default is **10 minutes**,
   set with `OPS_SOLO_WAIT_MINUTES` (1 to 1440), timed by the server from its own `hitl.approved` ledger entry. Then countersign
   again with your token re-entered; the browser sends it in the `x-ops-reauth` header. That ratifies the document, saves the
   exact content to the library as `rat_<artefact id>_v<version>` and records an episode in the Brain (L2).
4. **What shows.** The artefact, its countersignature and the ledger entries carry the **single-signer** flag, and it appears on
   `GET /api/signing/report` so a second person can review it later. Any edit voids both signatures and returns it to DRAFT.
   Ratified output is final: start a revision to change it.

Professional-review agents (OPS-LEG-01 to 05) are unaffected: they still need a registered professional to countersign, and
`twoPerson` agents still need a second person, in every mode.

**Documents marked "Needs review by ...".** A library record whose scan note starts with "Needs review by" gets the
`needs-review` flag on its artefact. The founder can still ratify it (single-signer), but it **cannot leave the platform**
(an issue, another system) unless a countersignature on the same content carries a profession. Today only a professional-review
agent's countersignature records one, and `LIBRARY-DOC` is not one, so such a document stays on the platform until that is
decided by the owner.

## What this does not do

- It does not decide *who* may approve or countersign (roles). Anyone signed in can, unless `OPS_SIGNERS` is set: then the registry limits who may sign (scope, and profession for professional review). Roles beyond that need the role model (OPQ-002).
- Ingestion puts the whole document in the library and a short episode in the Brain. It does not extract facts from the
  document into the Brain's policy tiers; that is a separate, human-ratified step.
