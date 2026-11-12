# Review board

Every output, from a person, an agent or an autonomous run, is a **draft** until two different people have signed the
exact content. Open it from the sidebar: **Review Board**.

```
DRAFT ──submit──▶ IN_REVIEW ──approve──▶ APPROVED ──countersign──▶ RATIFIED ──ingest──▶ INGESTED
  ▲                   │                      │
  └──── edit / reject ┴───── any edit voids the signatures and returns it to DRAFT
```

| Step | Who | What it records |
| ---- | --- | --------------- |
| **Edit and save** | a person | A new version. Every edit returns the artefact to DRAFT and voids earlier signatures. |
| **Review and approve** | a named human | The approval, bound to the exact content (a hash). A rejection needs a reason. Agents that require it need someone other than the author. |
| **Countersign** | a *different* human from the approver | The second signature on the same content. This ratifies it. |
| **Ratify** | recorded with the countersignature | `artefact.countersigned` then `artefact.ratified` in the audit ledger. |
| **Ingest** | the countersigner's action, automatic | The exact ratified document is saved to the document library (immutable) and an episode is recorded in the Brain. Skipped when the agent's contract says `ingestion: 'none'` (not relevant). A failed ingestion leaves it RATIFIED and can be retried. |

## Rules (enforced on the server, not only in the browser)

- No bot, agent or autonomous actor (`auto:…`) can approve, countersign, ratify or ingest.
- The approver and the countersigner must be different people. The author may be one of the two, but nobody signs twice.
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
(two different humans, neither signing twice). Whether authors should be barred from signing their own work is an open
decision (OPQ-017).

## What this does not do

- It does not decide *who* may approve or countersign (roles). Anyone signed in can. That needs the role model (OPQ-002).
- Ingestion puts the whole document in the library and a short episode in the Brain. It does not extract facts from the
  document into the Brain's policy tiers; that is a separate, human-ratified step.
