# Agent contracts

Every agent is a contract: data a machine can check. `src/core/contract.ts` holds the rules; they run

- at **server start** over every built-in agent (a broken contract stops the boot),
- when a **custom agent** is loaded (a definition that breaks a rule is not registered, so it cannot run),
- in `test/contracts.test.ts` over all registered agents, with one failing case per rule.

| Rule | Promise |
| ---- | ------- |
| **C1** Identity | `OPS-DEPT-nn` or `agt-xxxx` id, semver version, name, summary and method present, registered department. |
| **C2** Owner | An accountable owner *role* (never a person, no personal data). |
| **C3** Purpose | One purpose from the closed list, among the contract's allowed purposes. |
| **C4** Data-class ceiling | public, internal, confidential or personal. Never learner. Personal needs a lawful basis. |
| **C5** Approval cannot be skipped | `requiresApproval` is true; custom agents also need a second approver. |
| **C6** Allowed models | If `models` lists providers they must be known, and **the model hub tries only those**. No list means any attested provider. |
| **C7** Budget | Whole-number prompt budget, at most 20,000 characters (the hub's input limit). |
| **C8** Evaluation | `evalRef` names a test file under `test/` (the tests check it exists). |
| **C9** Inputs | At most 12, unique keys, labels, options for a choice. |
| **C10** Reads and outputs | Known Brain tiers and formats; `ingestion` is `library` or `none`. |

What the contract does **not** do: it does not stop a person using the browser to call `/api/gateway/complete` without an
`agentId`. Purpose and provider limits bind only when the call names a built-in agent, and always bind autonomous runs and
recommendations (server-side). Every call still passes the ten model rules. Owners default to the department head role as a
placeholder until the organisation names them (OPQ-022).
