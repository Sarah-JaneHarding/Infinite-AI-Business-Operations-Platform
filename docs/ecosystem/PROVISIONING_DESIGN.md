# Account provisioning — design draft (OQ-033)

**Status:** DRAFT for the owner's decision. Nothing in this document is built. It follows the
decision that the actor id is `user_account.id` (OQ-033, Stage 112) and answers the part that
decision left open: **how a real person comes to have an account and a role.**

**Scope:** school staff roles — `teacher`, `hod`, `smt`, `sbst`, `admin`. Guardians and learners
are out of scope (see §9). Platform staff have no tenant of their own (see §8).

---

## 1. The problem

Sign-in now resolves the identity provider's `sub` to the school's own `user_account` and uses
that account's id as the actor. Nothing creates that account for a real person. So today a real
staff member can sign in, has no actor, sees no data, and cannot decide a human gate. That fails
closed, which is correct, but it means the product cannot be used by anyone except the seeded dev
logins.

The question is not "can we create rows" — it is **who is allowed to say "this person holds this
role at this school", and what proves that the person signing in is that person.**

## 2. What exists today (verified in the repository)

| Fact                                                                                                                                                                               | Where                                                          |
| ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- |
| `user_account` is per tenant: `@@unique([tenantId, subject])` and `@@unique([tenantId, email])`; the schema comment says the same human at two schools is two accounts             | `packages/db/prisma/schema.prisma`                             |
| `role_assignment` references `user_account.id`, has optional school/class/subject scope and an `expiresAt`                                                                         | same                                                           |
| `staff_member.userAccountId` is nullable and unique — a staff record can exist before it has a login                                                                               | same                                                           |
| `UserStatus` is `ACTIVE`, `SUSPENDED`, `OFFBOARDED`                                                                                                                                | same                                                           |
| The lookup used at sign-in resolves only an `ACTIVE` account                                                                                                                       | `packages/db/src/user-account.ts`                              |
| The token's `tenant_id` and role claims both come from **Keycloak** (a user attribute and the realm roles)                                                                         | `infra/keycloak/realm.json` mappers                            |
| The onboarding wizard's staff step records only a **count and an import method** — no names, emails or roles                                                                       | `packages/provisioning/src/wizard.ts` `ImportStaffInputSchema` |
| RBAC has a `staff_member` resource (admin: read/create/update) but **no resource for accounts or role assignments**                                                                | `packages/policy/src/rbac.ts`                                  |
| No mail-sending library or SMTP code, and no call to the Keycloak admin API, was found (OQ-021 names a mail account for dunning notices, but no sender exists)                     | grep of `packages`, `apps`, `infra`                            |
| The audit ledger forbids plaintext personal information in an event's `diff`                                                                                                       | `packages/db/src/audit.ts`                                     |
| `docs/SECURITY.md` says MFA is enforced in Keycloak for `admin`, `smt` and `platform_*`, but **`realm.json` contains no MFA, required-action or email-verification configuration** | `docs/SECURITY.md` §7 vs `realm.json`                          |

So today the identity provider is both the authentication source **and** the authority on tenant
and role. This design moves authority over _who holds which role at which school_ into the
school's own data, and keeps the provider for what it is good at: proving a person controls an
email address and a credential.

## 3. Principles

1. **Link on sign-in, grant by an administrator.** First sign-in may _attach_ a provider identity
   to an account an administrator already created. It never creates authority.
2. **A token claim grants nothing.** A role or tenant claim in a token is, at most, a hint that
   must agree with the school's own records. (This also settles OQ-032's source of truth.)
3. **Fail closed, with a reason.** Every refusal is logged and, where safe, explained to the user.
4. **No authority from an unverified email.** Linking requires the provider to assert
   `email_verified = true`.
5. **Everything that confers authority is audited**, in the same transaction as the change.
6. **No personal information in the audit diff or in logs** — refer to the invitation or account
   by id.

## 4. Proposed design

### 4.1 An invitation record

A new tenant-owned table, `user_invitation`:

| Column                               | Notes                                                                                                                              |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------- |
| `id`                                 | uuid                                                                                                                               |
| `tenant_id`                          | RLS like every tenant table; added to `tables.ts` so the isolation suite covers it                                                 |
| `email`                              | normalised (trimmed, lower-cased); **personal information**, encrypted or access-restricted like other direct identifiers — see §7 |
| `roles`                              | the roles to grant on acceptance (child rows or an array), each with optional school scope                                         |
| `staff_member_id`                    | optional; links the invitee to an existing `staff_member` on acceptance                                                            |
| `status`                             | `PENDING` · `ACCEPTED` · `REVOKED` · `EXPIRED`                                                                                     |
| `expires_at`                         | default 14 days (a number for the owner to set)                                                                                    |
| `created_by`, `created_at`           | the inviting administrator's **account id**                                                                                        |
| `accepted_at`, `accepted_account_id` | set on link                                                                                                                        |

Unique on `(tenant_id, email)` where `status = PENDING`, so one live invitation per address.

**As built in step 1 (2026-10-24), where it differs from the draft above:**

- `roles` is a `text[]` on the invitation, with one optional `school_id` that applies to **all** of the listed
  roles — not child rows with a scope each. Per-role scope is a role change after acceptance (step 3).
- `email` is stored in plaintext behind row-level security, exactly as `user_account.email` already is, rather
  than encrypted: it has to be compared exactly at sign-in, and the neighbouring table sets the precedent.
  It must still never appear in an audit event's `diff`.
- The data layer enforces what the design says the application must: `email` is trimmed and lower-case and
  contains an `@`; `roles` is non-empty and a subset of `teacher, hod, smt, sbst, admin` (a platform, guardian or
  learner role can never be invited, whoever writes the row); one `PENDING` invitation per `(tenant, email)`; and
  `ACCEPTED` if and only if `accepted_at` and `accepted_account_id` are both set. An account is created from at
  most one invitation.
- Forward migrations: `20261024090000_oq033_user_invitation` (table) and `…090100_…_rls` (policy). Rollback:
  `20261024090000_oq033_user_invitation/rollback.sql`, exercised by an integration test.

**Why a separate table rather than a half-built `user_account`:** `user_account.subject` is
required and is the key of the sign-in lookup. A placeholder subject or a nullable subject would
create accounts that exist but cannot be the target of a lookup, weaken the `(tenant, subject)`
uniqueness the whole design leans on, and invite bugs where "an account exists" is mistaken for
"a person has signed in". With an invitation table, **every `user_account` is a real, linked
person.**

Requires a forward migration and a tested rollback (rule 10). No existing table changes.

### 4.2 Roles are granted at acceptance, from the invitation

On accept, in one transaction: create the `user_account` (subject, email, display name from the
provider), create its `role_assignment` rows from the invitation, set `staff_member.userAccountId`
if linked, mark the invitation `ACCEPTED`, append the audit events.

### 4.3 First sign-in algorithm

```
on sign-in (provider profile P, tenant claim T):
  1. require P.email_verified === true and T is a UUID of an ACTIVE tenant   → else refuse
  2. account = ACTIVE user_account in T with subject = P.sub
       found                                                                 → resolve (today's path)
  3. not found: invitation = PENDING, unexpired user_invitation in T with
       email = normalise(P.email)
       none                                                                  → refuse "no invitation"
  4. accept the invitation (§4.2) — one transaction, serialised on the
     invitation row; a concurrent second sign-in finds it already ACCEPTED
     and resolves the account created by the first
  5. a SUSPENDED / OFFBOARDED account with this subject                      → refuse, never relink
```

Only step 4 writes. It runs as a dedicated, narrow database path (not the session's own
privileges — the person has no account yet), which is a security-boundary decision in itself: see
§10, question 6.

### 4.4 Where the session's role comes from

The session role becomes the intersection of **the account's active `role_assignment` rows** and
**the provider's role claim**:

- a role in the claim but not in the database → ignored (the claim grants nothing);
- a role in the database but not in the claim → ignored for this session, and logged (the
  provider is out of sync; see §5);
- exactly one role in the intersection → that role;
- more than one → the person chooses at sign-in (resolves OQ-032 with a chooser, never a
  privilege ranking);
- none → the sign-in is refused.

This keeps `session.role` — and so `ROUTE_ACCESS`, the proxy and the pages — unchanged.

### 4.5 Administrator operations

New routes, each behind `authorize()`, each audited in the same transaction:

| Operation                                            | Rule                                                                         |
| ---------------------------------------------------- | ---------------------------------------------------------------------------- |
| Invite staff (email + roles + optional school scope) | admin only; the inviter's account id is recorded                             |
| Revoke an invitation                                 | admin only                                                                   |
| Grant / revoke a role on an existing account         | admin only; see the guard-rails below                                        |
| Suspend / offboard an account                        | admin only; takes effect at the next sign-in and at every gate decision (§6) |
| List accounts and pending invitations                | admin only                                                                   |

**Guard-rails** (each a test, each a decision for the owner — §10):

- a tenant administrator can never grant a `platform_*` role;
- nobody can change **their own** roles;
- the last `admin` of a tenant cannot be removed or demoted;
- granting a role that can decide human gates (`hod`, `smt`) or administer (`admin`) is the
  sensitive act. Recommended: it is audited with the inviter and, for `admin` and `smt`, requires a
  second administrator to confirm (rule 6's spirit — authority over gates should not be a
  one-person decision).

RBAC gained three resource types, all admin-only (built in step 2, `packages/policy/src/rbac.ts`): `user_account`
(read; update = suspend / offboard — **no create**, because an account is made by a person's first sign-in linking
to an invitation), `role_assignment` (read; create = grant; delete = revoke; approve = confirm another
administrator's grant of `admin` or `smt`) and `user_invitation` (read; create = invite; update = revoke). The draft
named two; the invitation is a third because it holds an address that should not be readable through account listing.
The guard-rails are pure functions in `packages/policy/src/provisioning.ts`, one reason per refusal.

**The last administrator.** A single change can never remove a school's last administrator, and no branch is needed
to say so: the actor must be an active administrator and cannot be the target, so whenever the target is an
administrator the actor is a second one. The unit test checks that exhaustively over every small school. The real
hazard is a **race** — two administrators demoting each other at the same moment both pass against the same snapshot
and leave none. That is closed where the change commits (step 3): the school's administrators are locked and
re-counted inside the transaction, and the rules are evaluated against that count. Step 3 must carry a concurrency
test for exactly this.
The existing `staff_member` grant is not enough, and widening it would blur "a staff record" with
"authority to act".

### 4.6 The first administrator

A tenant with no administrator cannot invite anyone. The bootstrap must not be a back door:

- the platform operator creates the tenant and one `user_invitation` for the school's named
  principal with role `admin` — through the provisioning flow, not by writing rows by hand;
- platform staff gain **no** read access to the school's data by doing this: they create the
  invitation (a write to a narrow, audited path), nothing more;
- the invitation is the only artefact; the principal then signs in, verifies their email and is
  linked like anyone else.

This needs the tenant-creation path in `packages/provisioning` to produce the invitation, and an
operator-only entry point. It also forces a decision on what the platform may write into a school
(§10, question 7).

### 4.7 Granting `admin` or `smt` to an existing account (step 3b — built, Stage 118)

**The gap.** Inviting a new person into `admin` or `smt` works (§4.1, Stage 115): the invitation is created
`AWAITING`, a second administrator confirms it as themselves, and only then can it be accepted. Granting the same roles
to someone who **already has an account** has no equivalent, because there is no row to hold "proposed, not yet
confirmed". Today no function does it, so it fails closed: nobody can be promoted to `admin` or `smt` once they have
signed in once. That is safe, and unusable (a teacher who becomes deputy principal cannot be made `smt`).

**What the stored record must do.** A confirmation the caller merely asserts is no confirmation (the same reasoning as
the invitation's `confirmed_by`). So the proposal must be a durable act by the first administrator, and the
confirmation a separate durable act by the second, each as themselves, and the two must be different people on the
face of the record.

**Proposed: a `role_grant_request` table**, tenant-owned, row-level security forced, registered in `tables.ts`, with a
forward migration and a tested `rollback.sql` (rules 5 and 10).

| Column                       | Meaning                                                                     |
| ---------------------------- | --------------------------------------------------------------------------- |
| `id`, `tenant_id`            | as every tenant-owned table                                                 |
| `target_account_id`          | the existing account that would receive the roles                           |
| `roles` (text[])             | non-empty, each one of `admin` or `smt` — nothing else ever needs a request |
| `school_id` (nullable)       | the optional scope the assignments would carry, as on an invitation         |
| `requested_by`, `created_at` | the proposing administrator                                                 |
| `expires_at`                 | a request that is never decided must not linger as standing authority       |
| `status`                     | `PENDING`, `APPLIED`, `DECLINED`, `CANCELLED`, `EXPIRED`                    |
| `decided_by`, `decided_at`   | the second administrator (for `APPLIED` / `DECLINED`) or whoever cancelled  |

**Constraints held in the database, not only in code:**

- `target_account_id <> requested_by` — nobody proposes roles for themselves;
- `decided_by` is not null exactly when `status` is `APPLIED` or `DECLINED`, and then
  `decided_by <> requested_by` and `decided_by <> target_account_id` — **the two-person rule is a CHECK**, so a
  bug in a caller cannot record a self-confirmed grant;
- one `PENDING` request per target account (a partial unique index, which Prisma cannot express, so SQL only);
- `roles` limited to the sensitive pair, with a drift test against `CONFIRMATION_REQUIRED_ROLES` in policy, as the
  invitation's role list has against `SCHOOL_STAFF_ROLES`.

**Lifecycle — confirming applies the grant in the same transaction.** There is deliberately no "confirmed but not yet
applied" state: a second administrator's confirmation creates the `role_assignment` rows and marks the request
`APPLIED` together, or does neither.

1. **Request** (`requestRoleGrant`, any active administrator): under the provisioning lock, the rules
   (`evaluateRoleConferral` with an `account` target) decide. `confirmation_required` stores a `PENDING` request;
   `waived_sole_admin` (the school has one administrator) applies the grant immediately and audits the waiver, exactly
   as for an invitation; every other refusal is returned and nothing is stored. A target who is not `ACTIVE` is refused.
2. **Confirm** (`confirmRoleGrant`, a different active administrator): under the lock, re-read the administrators and
   re-run the rules with `confirmedByAccountId`; require the proposer is still an administrator, the target still
   `ACTIVE`, the request `PENDING` and unexpired; then write the assignments and mark `APPLIED`.
3. **Decline** (a different administrator) records `DECLINED` so the proposer can see it was refused;
   **Cancel** (the proposer, or any administrator) records `CANCELLED`. Neither takes free text, so no personal
   information is stored in the record.
4. **Expire** lazily, as invitations do: found past `expires_at` when read or confirmed, marked `EXPIRED`, refused.

All four steps take the same provisioning lock as the rest of step 3 and append an audit event in the transaction
(`role_grant.requested`, `.applied`, `.declined`, `.cancelled`, `.expired`), carrying ids, roles and states — never an
address. A suspended or offboarded proposer or target leaves a `PENDING` request that can no longer be confirmed (the
rules refuse a non-administrator actor and the function refuses a non-active target); it is cancelled by the next
administrator who looks, or expires.

**Alternatives considered, and why not.**

- _Reuse the audit chain as the proposal_ (the confirmation is a later audit event that cites the first). Rejected: the
  chain is append-only and holds no mutable state, so "one pending per target", expiry and a database-enforced
  two-person CHECK all become reconstructions from history rather than constraints.
- _Reuse `user_invitation` with an account id._ Rejected: an invitation is, by definition, for a person who has no
  account and carries an address that is personal information. Overloading it would blur what its constraints mean and
  put an address-bearing table on the path for people who do not need one.
- _A confirmation token the second administrator presents._ Rejected: a bearer secret is a new thing to leak, and it
  proves possession rather than that an administrator, signed in as themselves, agreed.
- _Allow `admin`/`smt` grants to existing accounts only through the sole-administrator waiver._ This is today's
  behaviour and is the safe fallback if this proposal is not accepted.

**What this does not change.** Granting any other staff role (`teacher`, `hod`, `sbst`) to an existing account is not
sensitive and needs no confirmation; that path (a plain grant by one administrator) is a small separate function and not
part of this table. Revoking authority needs no confirmation (§4.5). No platform role is ever involved.

**As built (Stage 118)** — the four decisions below were answered "go ahead with my recommendations": a 7-day request
lifetime, an optional school scope, and the proposer may cancel their own request (as may any other administrator).
The functions are in `packages/db/src/role-grant.ts` (`requestRoleGrant`, `confirmRoleGrant`, `declineRoleGrant`,
`cancelRoleGrant`); the table is `role_grant_request` (migrations `20261111100000_oq033_role_grant_request` and
`…100100_…_rls`, with a `rollback.sql`). Two points differ from the text above, and a third was found while testing:

- **`decided_by` / `decided_at` are also set when a request is `CANCELLED`** (the proposer included), so the row says who
  withdrew it. The two-person CHECK therefore applies to `APPLIED` and `DECLINED` only, not to every decided status.
- **A request that names the same target as an expired `PENDING` one** closes the old request (`EXPIRED`, audited) and
  then stores the new one, in the same transaction, so the one-live-request index never blocks a fresh proposal.
- **The `roles` CHECK is explicit about `NULL`.** The column is nullable (as Prisma generates list columns), and a CHECK
  that evaluates to `NULL` passes, so `cardinality(NULL) >= 1` let a `NULL` through. Found by trying it in a local Postgres;
  the new table's CHECK starts with `"roles" IS NOT NULL`. **`user_invitation.roles` had the same gap** and was fixed separately (Stage 119).

**Decisions that were put to the owner (answered as recommended):**

1. Is a stored request record the right shape (this proposal), or should existing-account promotion stay
   waiver-only for now?
2. Request lifetime. Recommended **7 days**, shorter than an invitation's 14: this one decides authority and the person
   already works at the school, so there is less reason to wait.
3. Should a request carry an optional school scope (`school_id`), as an invitation does? Recommended **yes**, for
   parity; a tenant-wide grant is `school_id` null.
4. May the proposer cancel their own request? Recommended **yes** (withdrawing a proposal narrows nothing), with any other
   administrator also able to cancel.

**Tests this implies** (so the cost is visible): the constraints above, each by an insert that violates it; every
refusal; request/confirm/decline/cancel/expire paths; no address in any audit diff; cross-tenant isolation (generic
suite picks the table up from `tables.ts`); the concurrency cases — two administrators confirming the same request
at once yields one `APPLIED` and one refusal, and a request racing the proposer's own demotion cannot apply; and the
rollback test.

### 4.8 Choosing the active role (step 4b — decided 2026-11-12; both parts built)

**Status.** The owner accepted all five recommendations in §4.8's decision list (2026-11-12). **Part 1 is built (Stage 123):**
eligibility, the token, the chooser page, the proxy state and `Session.role: Role | null`. **Part 2 is built (Stage 124):** `actingAs` on
gate decisions (item 5) — `decideHumanGate` requires it, requires it to equal the gate's `requiredRole`, and still checks
the live assignment. One difference from the text below: a school role present in the account but absent from the claim is
returned as data (`assignedNotClaimed`) rather than logged — `apps/web` has no telemetry dependency, and importing the
telemetry package pulls OpenTelemetry into the Next bundle.

**Already decided** (OQ-032, 2026-11-05; §12.1 item 3): an account may hold several roles, the person chooses the
active one at sign-in, and every action is checked against that role. This section is how to build it, and what
that last clause has to mean in the code.

**Today.** `roleFromProfile` takes the first of our roles in the provider's claim, in an order that carries no
meaning. `session.role` is that one role, and `proxy.ts` enforces `ROUTE_ACCESS` by it. `decideHumanGate` never sees it:
it asks only whether the deciding account holds a live `role_assignment` for the gate's `requiredRole`
(`hasActiveRoleAssignment`). So "checked against the active role" is true for pages and routes and **not** for gate
decisions: a person signed in as `teacher` who also holds `smt` can decide an `smt` gate today. With one role per account
that cannot matter; with several it is the case this section exists to close.

**Proposal.**

1. **Which roles a sign-in is eligible for.** For a school staff role (`teacher`, `hod`, `smt`, `sbst`, `admin`):
   it must be in the provider's claim **and** the account must hold a live `role_assignment` for it (§4.4's
   intersection). In the claim only → ignored (the claim grants nothing). In the database only → not available this
   session, and logged with the account id and the role name, never an address (the provider is out of step; §5).
   Roles that **have no database source** — `platform_support`, `platform_admin`, `guardian`, `learner` — stay eligible
   from the claim alone, exactly as today: platform staff and the guardian and learner users hold no school account or
   assignments by design (§8, §12.2 item 10), so intersecting them with the database would lock them out. No invitation
   can grant any of them (the table refuses it), so a claim alone still cannot confer school authority.
2. **Computed once, at sign-in, and carried in the token.** After `resolveSignIn`, a new database read
   (`listActiveRoles(tx, accountId, now)`, tenant-scoped, live assignments only) gives the school roles; they are
   intersected with the claim. The token carries `eligibleRoles`. The token is signed, so the list is the server's, not
   the client's. `role` is set immediately when exactly one role is eligible, and is **absent** otherwise.
3. **Three outcomes, one page.** A new `/choose-role` page handles all three: exactly one eligible role → no page, the
   role is set; two or more → the person picks, listing each with its `ROLE_LABEL`; **none** → the page shows the
   account explanation from 4a (`AccountNotice`) and a sign-out. The proxy lets a token with no active role reach only
   `/choose-role`, the sign-in routes and sign-out, and sends everything else to `/choose-role`. A token with no active
   role is therefore never "no token", and nothing is reachable by default (default deny, as now).
4. **The server decides what a choice may be.** The page calls next-auth's `update({ role })`. The `jwt` callback, on
   `trigger === 'update'`, accepts the role **only if it is in `token.eligibleRoles`**; the client supplies a name and
   nothing else, and can never write the list. One active role per session; no ranking, no remembered default.
5. **Every action is checked against the active role.** Routes and pages already are (the proxy). Gate decisions
   become so: `decideHumanGate` takes an `actingAs` role and requires `actingAs === task.requiredRole` **and** the live
   assignment it checks today. Equality, not hierarchy: nothing here ranks one role above another. The decide route
   passes `token.role`. The assignment check stays, because the token's eligible list is a snapshot (item 7) and the
   database is what knows a role has since been revoked. Effect to know about: a person who is both `hod` and `smt`
   must be signed in as the gate's role to decide it.
6. **Switching role** is not in 4b: sign out and in again. A later "switch role" re-runs the chooser and re-derives
   the school roles from the database at that moment, never from the token's snapshot.
7. **Stale roles.** `eligibleRoles` is fixed at sign-in, as the account is (§6). A role revoked mid-session stays the
   session's active role until it ends — pages and routes will keep honouring it — but a gate decision is refused,
   because item 5 re-checks the database. Shortening the session lifetime (§6) narrows the window for the rest.

**What it touches.** `rolesFromProfile` (all of our roles in the claim) replaces `roleFromProfile`; the test that pins
first-match behaviour and names OQ-032 is replaced by the intersection table. `Session.role` becomes `Role | null`, `null`
only where the proxy sends a person to `/choose-role` — it is read in 25 places across 18 files, two of them `as Role`
casts that become real narrowing. A new `listActiveRoles` in `packages/db`; an `actingAs` field on the human-gate input
in `packages/orchestrator` and a pass-through in the decide route.

**Suggested split, in this order.** (i) Eligibility, the token, the chooser page, the proxy state, `Session.role |
null`. (ii) `actingAs` on gate decisions. Not the other way round: with first-match still in place (ii) alone would stop
a multi-role person deciding any gate but the one role the claim happens to list first.

**Threats considered.** A client forging `update({ role: 'admin' })` — refused, not in the signed list. A claim naming
a school role the account was never assigned — ignored. A claim naming a platform role next to a school account — both
offered, as today; the platform surface still has no actor. A token held past a revocation — covered for gates by item 5,
for pages by §6. Nobody ever reaching a page with no role — covered by the proxy state and its test.

**Tests this implies.** The intersection table exhaustively (claim only, database only, both, neither, for each school
role, and the four claim-only roles); a forged update refused; one, two and none eligible (auto-select, chooser,
explanation); the proxy letting a role-less token reach only `/choose-role`; a gate refused when the active role differs
from the gate's, when the assignment has been revoked, and when both agree; an integration test for `listActiveRoles`
(live, expired, another school's).

**Decisions for the owner** (each with my recommendation):

1. Do `platform_*`, `guardian` and `learner` stay claim-only, as today, rather than needing a database source?
   **Recommended: yes** — they have none by design, and the alternative locks them out.
2. When **no** role is eligible, is the person given a session that reaches only the explanation page, rather than being
   refused outright? **Recommended: yes** — a session needs a role to exist, and this reuses the explanation 4a added.
   (The same call as "no hard refusal" for step 4a, which the owner decided on 2026-11-11 — §12.1.)
3. Must a gate decision be made **acting as the gate's own role** (`actingAs` equals `requiredRole`), rather than by
   any role the person holds? **Recommended: yes** — it is what "every action is checked against that role" means; the
   alternative keeps today's behaviour, where the active role is decoration for gates.
4. No role switching without signing in again in 4b? **Recommended: yes**; add switching as its own change.
5. Remember the last role chosen as the default? **Recommended: no** — a default is a quiet precedence, which OQ-032
   decided against.

### 4.9 A new school role: `sbst_chair` (OQ-046 — decided 2026-11-12; built, Stage 128)

**Status.** The owner accepted all four recommendations below (2026-11-12) and the role is built. One correction to the
touch list: only **one** CHECK constraint spells the role out, `user_invitation_roles_school_staff`; `role_grant_request` accepts
only `admin` and `smt` (the roles needing a second administrator, decision 2), so it is unchanged. Not built: a dev identity
holding both `sbst` and `sbst_chair` (the dev-identity machinery has one role per login), and MFA for the chair (the Keycloak
MFA flows cover `admin`, `smt` and the platform roles; whether the chair needs it is a security decision, not made here).

OQ-046 found three gates naming roles that do not exist. The owner decided two of them onto existing roles (`lse` → `sbst`,
`data_manager` → `admin`, built in Stage 126) and one into a **new role**, `sbst_chair`, for the MOD-02 `chair-confirmation` gate
(the SBST chair confirms draft minutes before they are committed to the Brain as a ratified fact). Until it is built that
gate waits for an approval nobody can give; `apps/web/tests/unit/pipeline-gate-roles.spec.ts` lists it as awaiting.

**What a new school role touches** (nothing here is optional; each is a place a role list is written out by hand):

1. `Role` (`packages/policy`) and `SCHOOL_STAFF_ROLES` / `isSchoolStaffRole` — what an invitation or grant request may carry.
2. A forward migration with a tested rollback for the CHECK constraint that spells the list out,
   `user_invitation_roles_school_staff` (migrations `20261024090000…`, `20261111110000…`), keeping the explicit
   `IS NOT NULL` (a CHECK that evaluates to NULL passes). `role_grant_request` is untouched: it carries only `admin` and `smt`.
3. The RBAC matrix (`rbac.ts`) — rows for the new role, written out like the others, not inherited from `sbst`.
4. `route-access.ts`, `ROLE_LABEL` / `ROLE_NAV` / `ROLE_HOME`, and the `/approvals` page's role list (a test pins the pages to the table).
5. The Keycloak realm role and the dev identities, so the claim can carry it; the pipeline-gate test then drops it from its
   awaiting list (it fails until you do).
6. Tests: the eligibility table, the chooser, the proxy table and the conferral rules all enumerate roles.

**Decisions for the owner** (recommendations first):

1. **Does the chair also hold `sbst`?** Recommended: yes — two assignments on one account. The chooser then offers both, and
   because a gate is decided _as its own role_ (§4.8 item 5) the chair signs in as `sbst_chair` to confirm minutes and as
   `sbst` for casework. The alternative, `sbst_chair` alone carrying the casework grants, duplicates the `sbst` matrix rows.
2. **Who may confer it, and is a second person needed?** Recommended: the same rule as `sbst` (an administrator, no second
   person). The two-person rule today covers only `admin` and `smt`, the roles that confer authority over others; the chair
   confirms minutes and confers nothing. Say if minutes ratified into the Brain warrant the stricter rule.
3. **At most one chair per school?** Recommended: no constraint yet — handovers and a deputy are normal, and a unique index
   would need a swap procedure. The audit ledger shows who confirmed what.
4. **What may the chair role see on its own?** Recommended: the `/approvals` queue and the `/sbst` casebook read-only view,
   nothing else; everything else is done as `sbst`.

## 5. The identity-provider side

Today Keycloak users, their `tenant_id` attribute and their realm roles are created by hand. That
does not scale past the pilot's three schools, and it is where authority currently leaks, so the
design has to say what happens there.

**Recommendation:** an admin invitation triggers creation of the Keycloak user through the Keycloak
Admin API, using the worker's existing service-account client, with:

- the `tenant_id` attribute set from the invitation's tenant;
- the realm role(s) mirrored from the invitation (needed so Keycloak's own policies, notably MFA,
  can key on them — §4.4 keeps the database as the authority);
- required actions `VERIFY_EMAIL`, `UPDATE_PASSWORD`, and `CONFIGURE_TOTP` for the roles that must
  have MFA;
- Keycloak's own "execute actions" email delivering the link, so **Keycloak** is what verifies the
  address — the application sends no email in this design.

**For the pilot** the operator may create Keycloak users by hand instead (three schools), with the
application doing everything else in §4. The linking logic is identical either way, which is why
the Keycloak integration can come last.

**Things that must be true of the Keycloak realm, none of which the repository currently proves:**

- email verification is required (`verifyEmail`), so `email_verified` means something;
- no federated login from a provider that does not verify email;
- MFA actually enforced for `admin`, `smt` and the platform roles. `docs/SECURITY.md` §7 says it
  is; **the realm file has no configuration for it.** Either it is configured out of band in the
  real environment (then record where) or the claim is untrue today. This should be checked before
  pilot regardless of this design — it is a standing documentation/reality gap.

## 6. Account lifecycle and stale sessions

A session's account is fixed at sign-in. Suspending an account therefore does not end an existing
session. Two cheap mitigations, both recommended:

- `decideHumanGate`'s existing role check also requires the deciding account to be `ACTIVE` (it
  checked only the role assignment) — **built (Stage 125)**, as `isUserAccountActive`, before the role questions;
- shorten the application session's lifetime, or re-check account status periodically. `auth.ts`
  sets no `maxAge`, so next-auth's default (30 days) applies, while `docs/SECURITY.md` §7 describes
  30-minute refresh tokens at the provider — the application session outlives them by a wide margin.

Offboarding sets `OFFBOARDED`, expires role assignments (`expiresAt`), and leaves audit and consent
history intact (OQ-022). It never deletes the row.

## 7. POPIA and data handling

- A staff member's email is personal information. It is **not** learner information, but it is held
  to the audit ledger's rule: never in an event's `diff`. Events refer to the invitation or account
  by id.
- The invitation's email should be treated like other direct identifiers (access-restricted;
  consider encryption at rest with the existing key service) and deleted or blanked a fixed period
  after acceptance, expiry or revocation. The retention period is a **school determination**
  (OQ-007), not mine to set.
- Purpose: provisioning and authentication of staff. Should be added to the purpose table in
  `packages/contracts/src/popia/purpose.ts` rather than read under an existing purpose.
- Refusal messages must not reveal whether an address has an invitation (no enumeration): the user
  sees a generic "ask your administrator", the log records the reason.

## 8. Platform staff

`platform_support` and `platform_admin` have no tenant of their own and no account at any school;
they reach a school's data only through the (not yet built) administrator-approved, time-limited
support session. This design neither changes nor depends on that. It does mean platform sign-ins
must keep resolving **no** actor, and a test should pin that.

## 9. Out of scope — needs its own design

- **Guardians.** Linking a guardian to a learner is a POPIA consent matter (`consent_record`), not
  an administrator granting a role. The link must come from the school's learner records and the
  guardian's own consent, and no guardian may see a learner they are not linked to.
- **Learners.** Children. Whether a learner has a login at all, with what identifier (no email), and
  who acts for a Foundation Phase child are policy questions I have not found a source for.
- **Bulk import.** The wizard's staff step takes a count, not people. Importing a staff list (CSV /
  SA-SAMS) that creates _invitations_ — never accounts — is a natural extension once §4 exists, and
  needs its own column-mapping and validation design.
- **SSO / SCIM** for school groups that already run an identity provider.

## 10. Threats considered

| Threat                                                                 | Mitigation in this design                                                                                                                                                                                                   |
| ---------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Someone registers the invitee's address at the provider before they do | Verified email is required; Keycloak's verification link proves control of the address. Residual risk: a compromised mailbox. An optional secret token in the invitation link would close it; deferred as an owner decision |
| Provider administrator error puts a user in the wrong tenant           | A `tenant_id` claim alone grants nothing: linking needs a pending invitation **in that tenant** for that verified address                                                                                                   |
| Provider role claim inflated or edited                                 | The claim is intersected with the database; it cannot add a role                                                                                                                                                            |
| Tenant admin escalates (self-grant, platform role, last-admin removal) | §4.5 guard-rails, each tested                                                                                                                                                                                               |
| Two concurrent first sign-ins race                                     | Acceptance serialised on the invitation row; unique `(tenant, subject)` and `(tenant, email)` are the backstop                                                                                                              |
| Address reuse after offboarding                                        | A `SUSPENDED`/`OFFBOARDED` account with that subject is never relinked; a new person with the same address needs a new invitation and gets a new account                                                                    |
| Email changed at the provider                                          | Linking is by `sub` once an account exists, so a changed address cannot capture another account; a changed address on an unlinked invitee simply fails to match                                                             |
| Plus-addressing / case / Unicode lookalikes                            | Normalise on write and lookup; compare exactly after normalisation; no fuzzy matching                                                                                                                                       |
| Invitation enumeration                                                 | Generic refusal text; per-IP and per-tenant rate limits on sign-in failures (Keycloak brute-force protection already covers the credential, not this lookup)                                                                |
| Stale session after suspension                                         | §6                                                                                                                                                                                                                          |
| Unaudited authority                                                    | §4.5, same-transaction audit events                                                                                                                                                                                         |

## 11. Delivery plan (each step a PR with its own tests)

1. **Schema + migration + rollback** for `user_invitation`; register in `tables.ts`; RLS isolation
   test (a second tenant cannot read or accept the first's invitations).
2. **RBAC** _(built — Stage 116)_: `user_account` and `role_assignment` resources and admin grants; matrix tests; the
   guard-rails as pure functions with tests (no self-grant, no platform role, last admin).
3. **DB functions** (including the concurrency test for two administrators demoting each other, §4.5): create/revoke invitation, accept (link) transaction, grant/revoke role,
   suspend/offboard — each audited; concurrency test on acceptance. _Built (3a), in
   `packages/db/src/provisioning.ts`: invite, confirm, revoke, accept, revoke a role,
   suspend/offboard, all behind one per-tenant advisory lock taken before the audit lock, with the
   rules injected (`ProvisioningRules`) because db may not import policy. The second
   administrator's confirmation is persisted on the invitation (`confirmation`, `confirmed_by`).
   The web layer binds the real rules in `apps/web/src/lib/provisioning-rules.ts` (Stage 117).
   Built (3b, Stage 118, §4.7): granting `admin`/`smt` to an EXISTING account when the school has
   two or more administrators, through a stored `role_grant_request` that a different administrator
   confirms (applying the grant in the same transaction), declines or cancels, in
   `packages/db/src/role-grant.ts`._
4. **Sign-in integration**: §4.3 and §4.4 in the `jwt` callback; refusal reasons; tests for every row
   of the table in §4.3 and for platform sign-ins resolving no actor. _Split: **4a built (Stage 120)** —
   §4.3 in the `jwt` callback through `resolveSignIn` (`apps/web/src/lib/actor-resolution.ts`), the reason
   carried on the token and session, an explanation shown to a school role with no account, a tenant-ACTIVE
   check, and a guard that only `packages/db` writes the account tables. **4b part 1 built (Stage 123)**:
   the session role from the intersection of the account's role assignments and the provider's claim, and the
   chooser (OQ-032); **4b part 2 built (Stage 124)**: gate decisions checked against the active role (§4.8 item 5)._
5. **Admin UI** (`/admin/staff`): invite, revoke, list, role changes; wired to the routes. _Split in slices: **a — read-only overview built (Stage 127)**: accounts with their roles (lapsed ones flagged), pending invitations, pending role requests, admin only (`loadStaffOverview` in `packages/db`, `lib/staff-loader.ts`, the page, a nav link and a `ROUTE_ACCESS` rule). **b — invite a person and revoke an invitation built (Stage 129)**: two admin-only routes with Zod contracts (`/api/admin/staff/invitations`, `…/[id]/revoke`), a form and a revoke button on the page. **School scope built (Stage 134)**: a school id on an invitation or a grant must be a school of the caller's own tenant, checked in the data layer (`schoolInTenant`), with a picker on the forms when the tenant has more than one school. **Not built:** Each is a Zod-contracted route behind the existing provisioning functions plus a form, and each its own PR._ **c — roles and confirmations built (Stage 130)**: give a role to an existing account (`grantRole`, new in `packages/db`, for the roles that need no second administrator; `admin` and `smt` are only ever _proposed_ through `requestRoleGrant`), remove a role, confirm an `AWAITING` invitation, and confirm / decline / cancel a role request — seven admin-only routes behind one front door (`lib/staff-route.ts`), with buttons and a grant control on the page. **d — suspend and offboard built (Stage 131)**: one admin-only route (`/api/admin/staff/accounts/[id]/status`) over `setAccountStatus`, and Suspend / Offboard buttons (offboarded accounts and the viewer's own offer none). **Reinstating a suspended account is not designed and not built** (OQ-047); until it is, suspension from the UI is one-way.
6. **Gate decision hardening** (§6): require an `ACTIVE` account in `decideHumanGate`. _Built (Stage 125)._
7. **Keycloak integration** (§5): Admin API client, mirrored roles, required actions; realm config
   for email verification and MFA, with a drift test like the dev-identities one.
8. **Dev stack** _(8a built, Stage 142: a dev invitee who signs in through the real accept path; 8b — replacing the identities seed — waits on 7e)_: replace `db:seed:identities` with seeded _invitations_ so the dev flow exercises
   the real path.

### 11.1 Plan for steps 7 and 8 (written 2026-11-12; nothing below is built)

**What is already true of step 7.** The _realm configuration_ half is done: email verification, the browser flow
with per-role OTP, and the drift test `keycloak-realm-mfa.spec.ts` (OQ-036, Stages 120s and 133). What is **not**
built is the Admin API half: nothing in the repository creates or changes a Keycloak user. The realm has a
service-account client, `infinite-ai-worker`, but it holds **no `realm-management` roles**, so today it could not
create a user even if code asked it to.

**Step 7, in slices (each its own PR):**

- **7a — a Keycloak Admin API port and client** _(built, Stage 138; unverified against Keycloak until 7e)_. One narrow interface (`createUser`, `setRealmRoles`,
  `disableUser`, `enableUser`, `sendExecuteActionsEmail`), a `fetch`-based implementation (no new dependency, so
  rule 9 is untouched) and an in-memory fake. Contract-tested against recorded request/response shapes with an
  injected `fetch`. Secrets come from `packages/config` only; no token is logged. **Not wired to anything.**
- **7b — a dedicated service-account client and its realm config** _(built, Stage 139; unverified against Keycloak until 7e)_ (see OQ-048 (a) for why not the worker's), granted
  only the roles it needs, with a drift test that fails if the realm file grants it more.
- **7c — the schema for "the identity provider has been told"** _(built, Stage 140)_. An `idp_state` on the invitation / account
  (PENDING, SYNCED, FAILED + last error class, never a message that could carry an address), so a Keycloak failure
  after the database commit is visible and retryable instead of silent. This is a migration (rule 10).
- **7d — wire it** _(built, Stage 141; unverified against Keycloak until 7e)_. After the database transaction commits (never inside it: a network call must not hold the
  provisioning advisory lock): invitation confirmed → create the Keycloak user (`tenant_id` attribute, mirrored
  roles, required actions); role granted/revoked → mirror; **suspended / offboarded → disable the user and revoke its
  sessions** (this is also the real fix for §6's stale session, which the ACTIVE-account gate only half closes);
  reinstated → enable. The database stays the authority; a mismatch is repaired from the database, never the reverse.
- **7e — verify against a running Keycloak 26.** §13 is explicit that the Admin API calls are from knowledge of the
  product and unexercised. The sandbox (Stage 132) is where this happens; until it has run, 7d does not merge.

**Step 8 depends on 7.** Replacing `db:seed:identities` with seeded _invitations_ only makes sense once an accepted
invitation can produce a Keycloak user, and the dev gates need accounts that exist before anyone signs in. Plan: keep
`db:seed:identities` until 7e has passed; then seed invitations for the dev logins and add a sandbox step that
accepts them, keeping `chair.dev`'s two roles. Deleting the old seed is its own, last PR.

**What this plan deliberately does not do:** send any email from the application (Keycloak's own
execute-actions email does that, §5); touch platform staff (§8); or change who may be invited (§4).

Steps 1–6 are testable without Docker only in their unit tier; the isolation, concurrency and
migration tests are integration tests and run in CI.

## 12. Decisions needed from the owner

1. **Invitation lifetime** (default proposed: 14 days).
2. **May a school administrator grant `admin`?** And is a second administrator's confirmation
   required to grant `admin` or `smt`? (Recommended: yes to both, for the reason in §4.5.)
3. **One active role per session, chosen at sign-in** (§4.4) — acceptable, or must a person act in
   several roles at once?
4. **Link on verified email alone, or also a secret token in the invitation link?** (Recommended:
   email alone for the pilot; add the token if a school's mailboxes are shared or weakly secured.)
5. **Who creates Keycloak users for the pilot** — the operator by hand, or build the Admin API
   integration first?
6. **The sign-in write path.** Accepting an invitation writes before the person has any account, so
   it cannot run as them. It needs a narrow database role or `SECURITY DEFINER` function limited to
   "accept the pending invitation matching this verified email in this tenant". That is a
   security-boundary decision, like OQ-030's tenant directory. _(Refined in §12.2: it can in fact run as the application role inside the tenant context from the token's tenant claim, so the question is how much to narrow that role, not how to get around isolation.)_
7. **What the platform operator may write into a school** to create the first administrator's
   invitation, and how that is audited.
8. **MFA reality check** (§5): is it configured anywhere? Who owns fixing `SECURITY.md` or the realm?
9. **Retention of invitations** after acceptance/expiry — the school's determination (OQ-007).
10. **Guardian and learner provisioning** — commission separate designs (§9).

## 12.1 Decisions recorded 2026-10-24

The owner asked the implementer to answer the five questions below. They are answered here so work can
proceed; each is **reversible until the step that depends on it ships**, and the owner can overrule any of
them. (Numbers refer to the list in §12.)

| Question                                                                                                         | Decision                                                                                                                                                                                                                                                                        | Why                                                                                                                                                                                                                                                                                                                                                           |
| ---------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 2 — May an administrator grant `admin`? Is a second administrator's confirmation required for `admin` and `smt`? | **Yes** to granting `admin`. A second administrator **confirms** a grant of `admin` or `smt` **when the tenant has two or more active administrators**. A **sole** administrator may grant without confirmation, and the audit event records that no confirmation was possible. | Authority over human gates (`hod`, `smt`) and over accounts (`admin`) should not be a one-person decision (rule 6's spirit). But a small primary may have exactly one administrator; requiring a second would deadlock it. The audit marker keeps the exception visible. The first `admin` of a tenant comes from the operator's bootstrap invitation (§4.6). |
| 3 — One active role per session, chosen at sign-in?                                                              | **Yes.** More than one role in the intersection of the account's assignments and the provider's claim → the person chooses; exactly one → that one.                                                                                                                             | Keeps `session.role`, `ROUTE_ACCESS` and the proxy unchanged; avoids a privilege ranking nobody has ratified (OQ-032). Acting in two roles at once can be added later without undoing this.                                                                                                                                                                   |
| 4 — Verified email alone, or also a secret token?                                                                | **Verified email alone** for the pilot. Revisit with a secret token in the link if a school's mailboxes are shared or weakly secured.                                                                                                                                           | Keycloak's verification link already proves control of the address, and the invitation must exist in that tenant. A second secret mainly helps against a compromised mailbox, which the pilot's three schools can be asked about directly.                                                                                                                    |
| 5 — Who creates Keycloak users for the pilot?                                                                    | **The operator, by hand,** for the three pilot schools. The Admin API integration stays at step 7.                                                                                                                                                                              | Everything in steps 1–6 (linking, roles, guard-rails, UI) works identically either way; the integration is the largest piece and the only one that needs a running Keycloak to test.                                                                                                                                                                          |
| 8 — Is MFA configured anywhere?                                                                                  | **Not answerable by the implementer.** Until the owner confirms, **treat MFA as not enforced**. Recorded as **OQ-036**; `docs/SECURITY.md` §7 now carries a note.                                                                                                               | `SECURITY.md` says it is enforced, but `infra/keycloak/realm.json` configures none, and the production realm is not in the repository. The owner (or whoever operates Keycloak) has to look. Step 7 adds the realm configuration with a drift test, so the repository stops depending on memory.                                                              |

Still open: 1 (lifetime; 14 days is the working default), 6, 7, 9, 10.

**Decided 2026-11-11 (Sarah-Jane Harding)** — the three places where the step 4a sign-in (§4.3, Stage 120) differs from
this document's earlier wording. They stand as built:

- **No hard refusal.** A sign-in with no resolvable account still gets a session with no actor and a reason, rather
  than being refused. Platform staff and the dev guardian and learner users legitimately have no school account.
- **`email_verified` is required to link an invitation, not to resolve an existing account.** The subject, not the
  address, finds an existing account.
- **The tenant must be `ACTIVE` for existing accounts too.** A suspended or closed school resolves no actor.

## 12.2 Recommendations for the decisions still open

These are **recommendations, not decisions**; each says what it rests on and what it does not know.

**6 — The sign-in write path.** Do it in the application for the pilot: one `acceptInvitation` function in
`packages/db`, run inside `withTenant` as `app_rw` using the tenant claim, in a single transaction that locks the
invitation row, refuses unless the provider asserted `email_verified`, and writes the account, role assignments and
audit events together. Do **not** introduce a `SECURITY DEFINER` function yet. Why: (a) this corrects the draft — the
tables are `FORCE ROW LEVEL SECURITY`, so a definer function owned by the table owner is _still_ bound by the tenant
policy; it would add privilege separation, not an isolation bypass; (b) `app_rw` already has blanket DML on every
table through default privileges (`infra/docker/initdb/02-roles.sh`), so narrowing it for these tables alone is a
repository-wide hardening decision, and the migrations contain no `SECURITY DEFINER` precedent; (c) the database
already enforces the invariants that matter whoever writes — the staff-role list, one pending invitation per address,
acceptance consistency. The residual risk is that any code holding a tenant context could write `role_assignment`.
Mitigate with a test that only the db package writes it (like the guard against `token.sub`), same-transaction
audit, and — as a later hardening — a dedicated `provisioner` database role with `INSERT` on these tables that is
revoked from `app_rw`. _Not known:_ whether a second connection pool is acceptable operationally.

**7 — Bootstrapping a school's first administrator.** An operator-run command in `packages/provisioning`, run in the
deploy environment — not a web route — that creates the tenant (the wizard's existing `create_tenant` step) and
**one** `user_invitation` for the named principal with role `admin`, `created_by` null, with an audit event whose
diff holds the invitation id and no address. Platform staff therefore gain no read access to the school by doing
this, and need no RBAC grant for it. Because everything downstream trusts that one invitation, verify the principal
out of band first: a written request on the school's letterhead and a call-back to the school's published number.
Go-live readiness should then require **two** active administrators (principal plus a deputy), or an explicit,
recorded acknowledgement of the sole-administrator exception from §12.1. _Also found:_ `docs/ONBOARDING_GUIDE.md`
Step 4 uses role names that are not in the system (`principal`, `head_of_department`, `educator`, `support_educator`,
`admin_staff`) and says accounts are created at that step; it should be reconciled with the real roles
(`admin`, `hod`, `teacher`, `sbst`, `smt`) and with link-on-sign-in when step 5 builds the admin screen.

**9 — Retention of invitations.** Keep a `PENDING` invitation until it is accepted, revoked or expires; then delete
the row about 90 days after it reaches a terminal state. The durable record is the audit event (invitation id,
roles, inviter, confirmer, outcome — no address), which the ledger rules already retain (OQ-007, OQ-022); an accepted
invitation's address already lives in `user_account.email`, so deletion loses nothing needed. Hold it as a retention
rule loaded through the school's schedule (`pnpm check:retention`), with a real `authority` and `ratifiedBy`, rather
than hard-coding it; with the existing `RECORD_CREATED` anchor, roughly 120 days covers a 14-day invitation plus 90.
**90 days is my working proposal, not a legal determination** — it is the school's to ratify (OQ-007). _Not
verified:_ that the retention machinery can delete from this table; check before relying on it.

**10 — Guardians and learners.** Commission separate designs, and for the pilot **issue neither a login.**
Guardians: `guardian` and `guardian_link` already exist, `consent_source` already has `PAPER_FORM` and
`STAFF_CAPTURED`, and the pilot's consent metric (`PILOT_PROTOCOL.md`) can be met by staff capturing consent from
paper forms — so a guardian portal is not on the pilot's critical path. When it is designed, a guardian's access
should come from the school's own guardian-to-learner link (which `guardianOfLearnerIds` already models), not from an
administrator granting a role. Learners: the learner surface (`packages/learner-client`) works offline on school
devices; whether a child has an individual login, with what identifier (no email), and who acts for a Foundation Phase
child are POPIA special-care questions for the owner and the school's information officer, and I have found no
source to design from. Until then the `guardian.dev` and `learner.dev` Keycloak users have no accounts and resolve no
actor, which is the safe state.

**OQ-036 — MFA (see `OPEN_QUESTIONS.md`).** Have someone with Keycloak admin access export the production realm
(Admin console → Realm settings → Action → Partial export, or `kc.sh export`) and check four things: the browser
authentication flow requires OTP for `admin`, `smt` and the platform roles (conditional on role) or sets the
`CONFIGURE_TOTP` required action when the account is created; **Verify email** is on; brute-force detection is on; and
no identity provider is federated that does not verify email. Then either commit the sanitised export (no secrets) so
the repository finally describes the real realm, with a drift test like the dev-identities one, or configure what is
missing and correct `SECURITY.md`. Until confirmed, treat MFA as absent: do not make the claim to schools, and limit who
holds `admin` and `smt` in the pilot to named individuals. Do this before the pilot and before step 7. _Unverified:_
the exact Keycloak 26 menu and flow names above are from my knowledge of the product and should be checked.

## 13. Not verified

- Keycloak 26's exact Admin API calls and required-action names — from knowledge of the product,
  not exercised here; check against the running version.
- Whether the production Keycloak realm differs from `realm.json` (MFA, email verification).
- That `execute-actions-email` can be delivered from the pilot environment (needs Keycloak SMTP
  configured; OQ-021 names a mail account for dunning, not for Keycloak).

## 14. Sources consulted

`docs/OPEN_QUESTIONS.md` (OQ-021, OQ-022, OQ-030, OQ-032, OQ-033); `docs/SECURITY.md` §7;
`docs/PILOT_PROTOCOL.md` (staff invitation acceptance metric); `CLAUDE.md` (rules 5, 6, 10, the
stop-and-ask list); `packages/db/prisma/schema.prisma` (`UserAccount`, `RoleAssignment`,
`StaffMember`, `UserStatus`, `AuditEvent`); `packages/db/src/user-account.ts`, `roles.ts`,
`audit.ts`; `packages/policy/src/rbac.ts`; `packages/provisioning/src/wizard.ts` and README;
`packages/school-setup/README.md`; `apps/web/src/auth.ts`; `infra/keycloak/realm.json`.
No external standards or vendor documentation were consulted.
