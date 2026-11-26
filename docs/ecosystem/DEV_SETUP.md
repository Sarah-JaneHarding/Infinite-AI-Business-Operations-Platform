# Local development setup

This is the sequence a fresh clone needs to get the full stack — Postgres, Redis,
Keycloak, the gateway, the worker, and the web app — running locally. If you only want
to run the test suites (unit or integration), you don't need any of this: see
`README.md`'s "Getting started" and the "Running the automated tests" section near the
bottom of this file instead.

Want to run it on free models with no paid API? Use `docs/FREE_LOCAL_TESTING.md`, which
picks the free path for you.

Want the data plane without the assembly? `pnpm sandbox up` does steps 2 and 3 below for you (secrets,
Postgres, Redis, Keycloak, migrations, seeds) in a disposable project — see `docs/SANDBOX.md`. The rest of
this file is the hand-assembled path and the reference for what each piece is. There is still no root `dev`
script that starts the apps — each step below is a real command you run.

## 1. Prerequisites

- Node 22+, pnpm 10+ (see `README.md`).
- Use pnpm. `npm install` is also supported (see `README.md` and OQ-049): CI installs and tests with pnpm and also runs an npm install compatibility check. Only pnpm applies the build-script allow-list in `package.json`.
- Docker, with a running daemon — `docker info` should succeed. If it doesn't, Docker
  Desktop isn't running (Mac/Windows) or the service isn't started (`sudo systemctl
start docker` on Linux).

```bash
pnpm install --frozen-lockfile
```

## 2. Bring up the dev data plane

Copy the Docker Compose env template and fill it in — see the file itself for what
each variable is for and how to generate a password:

```bash
cp infra/docker/.env.example infra/docker/.env
# edit infra/docker/.env — every line needs a value; openssl rand -base64 24 for passwords
```

```bash
docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml up -d
```

Wait for every service to report healthy:

```bash
docker compose -f infra/docker/compose.dev.yml ps
```

Keycloak's realm import can take 20–30 seconds after the container starts — `ps` will
show it as `starting` until then.

Once it reports `healthy` the realm import has finished: the healthcheck asks for the
realm's discovery document and only gets a 200 after `--import-realm` completes.

Keycloak keeps its own database (`keycloak`, created by the one-shot `keycloak-db-init`
service), separate from the application database. It used to share it, which put Keycloak's
tables in the application's `public` schema and made `prisma migrate deploy` fail with
`P3005: The database schema is not empty` as soon as Keycloak had finished booting. If you
started this stack before that change, your application database still contains them:
remove the volumes and start again (`docker compose --env-file infra/docker/.env -f
infra/docker/compose.dev.yml down -v`) — this deletes the dev data.

**If Keycloak's client secret substitution doesn't take** (the `${KEYCLOAK_WEB_CLIENT_SECRET}`
/`${KEYCLOAK_WORKER_CLIENT_SECRET}` placeholders in `infra/keycloak/realm.json` are
resolved by Keycloak's own environment-variable placeholder mechanism at import time;
verified against a live Keycloak 26.0 container on 2026-10-01 — see Stage 90 in
`docs/STAGE_LOG.md`): open
`http://localhost:8180`, sign in as `KEYCLOAK_ADMIN`/`KEYCLOAK_ADMIN_PASSWORD`, go to the
`infinite-ai` realm → Clients → `infinite-ai-web` → Credentials tab, and copy the secret
shown there into `apps/web/.env`'s `AUTH_KEYCLOAK_SECRET` instead of what you put in
`infra/docker/.env`.

`minio-init` runs once, creates the bucket named by `infra/docker/.env`'s
`OBJECT_STORE_BUCKET` (plus a fixed `langfuse` bucket for the service below), and exits —
`docker compose ps` will show it `Exited (0)`, which is success, not a crash. The MinIO
console is at `http://localhost:9001` (`MINIO_ROOT_USER`/`MINIO_ROOT_PASSWORD`) if you
want to look inside either bucket.

**Langfuse** (self-hosted LLM observability — `packages/telemetry/src/tracing.ts`'s own
header explains why this is the one OTLP endpoint this codebase targets) takes longer
than the other services to report healthy on first boot: `langfuse-web`/`langfuse-worker`
wait on their own dedicated Postgres, Redis and ClickHouse (`docker compose ps` will show
those `starting` for up to a minute while ClickHouse's own migrations run). Once healthy,
sign in at `http://localhost:3001` with `LANGFUSE_INIT_USER_EMAIL`/`LANGFUSE_INIT_USER_PASSWORD`
— the `dev-project` project and its API key pair already exist, bootstrapped from
`LANGFUSE_INIT_PROJECT_PUBLIC_KEY`/`LANGFUSE_INIT_PROJECT_SECRET_KEY` on first boot, no
manual project-creation step needed. (Published on `3001`, not Langfuse's own default
`3000` — `apps/web`'s dev server already uses `3000`, and the entire point of running
Langfuse locally is having both up at once.)

## 3. Run migrations

Migrations need the `migrator` role — the only one with DDL privileges (rule 5;
`infra/docker/initdb/02-roles.sh`).

```bash
export DATABASE_URL="postgresql://migrator:<MIGRATOR_PASSWORD>@localhost:5432/<POSTGRES_DB>"
pnpm --filter @infinite-ai/db db:migrate:deploy
```

(Use the same `POSTGRES_DB`/`MIGRATOR_PASSWORD` values you put in `infra/docker/.env`.)

## 4. Set up each app's own `.env`

Three separate `.env` files, at three different scopes — copy each example and fill it in:

```bash
cp .env.example .env                            # root — shared runtime config
cp apps/gateway/.env.example apps/gateway/.env   # provider credentials, gateway-only
cp apps/web/.env.example apps/web/.env           # next-auth + Keycloak, web-only
```

**Root `.env`** — `DATABASE_URL` here is **not** the migrator URL from step 3. Point it
at `app_rw` — least-privilege, RLS-enforced, what the app actually runs as in production:

```bash
DATABASE_URL=postgresql://app_rw:<APP_RW_PASSWORD>@localhost:5432/<POSTGRES_DB>
REDIS_URL=redis://localhost:6379
GATEWAY_BASE_URL=http://localhost:8080
WORKER_PORT=8081
```

`OBJECT_STORE_ENDPOINT`/`OBJECT_STORE_BUCKET` point at the MinIO brought up in step 2 —
matching `infra/docker/.env`'s own `OBJECT_STORE_BUCKET` exactly:

```bash
OBJECT_STORE_ENDPOINT=http://localhost:9000
OBJECT_STORE_BUCKET=<same value as infra/docker/.env's OBJECT_STORE_BUCKET>
```

`OTEL_EXPORTER_OTLP_ENDPOINT`/`OTEL_EXPORTER_OTLP_HEADERS` now point at something real —
the Langfuse instance step 2 brought up, using the same public/secret key pair you put in
`infra/docker/.env`'s `LANGFUSE_INIT_PROJECT_PUBLIC_KEY`/`LANGFUSE_INIT_PROJECT_SECRET_KEY`:

```bash
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3001/api/public/otel
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic <output of the command below>
```

```bash
echo -n '<LANGFUSE_INIT_PROJECT_PUBLIC_KEY>:<LANGFUSE_INIT_PROJECT_SECRET_KEY>' | base64
```

(Same values, two files, same shape `KEYCLOAK_WEB_CLIENT_SECRET` already has.) Set
`DB_ENCRYPTION_KEY` (`openssl rand -base64 32`) **before you seed** and keep it for the
gateway: without it the gateway's PII guard cannot read the learner-name lexicon and
**refuses every request**, and a seed run without it encrypts the dev learners under a
throwaway key the gateway can never use.

**`apps/gateway/.env`** — provider credentials. The gateway **refuses to boot** unless
every provider named in any fallback chain of its routing file has a credential pool
(`Routing config for "…" references unknown provider "openai"`). The shipped
`apps/gateway/routing.json` names four — `anthropic`, `openai`, `google` and `local` (an
OpenAI-compatible server such as Ollama: `LOCAL_MODEL_BASE_URL` + `LOCAL_MODEL_API_KEYS`) —
so all four must be set, with placeholder values if you will never call that provider. To
run with fewer, point `ROUTING_CONFIG_PATH` at a routing file that lists only the providers
you have. For **Anthropic alone** the repo ships one: `apps/gateway/routing.anthropic.json`,
which is `routing.json` reduced to its Anthropic links (a test keeps the two in step). With it,
`ANTHROPIC_API_KEYS` is the only credential needed, and every route is served by Claude. The one
route it drops is `embedding.encode` (Anthropic has no embeddings API; nothing but tests calls
it today). Any model call to a provider with a placeholder credential fails.

**Calibrating the age-appropriateness judge?** Use the Anthropic-only file. In `routing.json` the
judge's route, `guardrail.age_appropriateness`, tries **Google first** (`gemini-2.0-flash`), then
Claude, then OpenAI — so a run with a Google credential present measures Gemini, and one without
measures Claude only after a failed Google call. In `routing.anthropic.json` the route is Claude
alone, so every verdict comes from the model you are calibrating.

**`apps/web/.env`**:

```bash
NEXTAUTH_SECRET=<openssl rand -base64 32>
AUTH_KEYCLOAK_ID=infinite-ai-web
AUTH_KEYCLOAK_SECRET=<same value as infra/docker/.env's KEYCLOAK_WEB_CLIENT_SECRET>
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/infinite-ai
```

## 5. (Optional) Seed curriculum, template and age-appropriateness data

CE-01/CE-02 need real CAPS/ATP data in L0 to produce anything other than
`NEEDS_INPUT` — see `docs/OPEN_QUESTIONS.md`'s OQ-002 for what's actually been ingested
so far. All three seed scripts below write into the same three fixed dev tenant ids
(`10000000-…001/002/003`), so the dev tenants themselves have to exist first —
`pnpm --filter @infinite-ai/db db:seed` creates them (idempotent; safe to run again):

```bash
pnpm --filter @infinite-ai/db db:seed   # creates the three dev tenants, if not already done

pnpm curriculum:seed                    # submits CAPS/ATP source documents to L0
pnpm curriculum:ratify                  # advances them to committed brain_constitution rows

pnpm templates:seed                     # submits lesson-plan template definitions to L0
pnpm templates:ratify                   # advances them to committed brain_constitution rows

pnpm age-appropriateness:seed           # submits the 206 age-appropriateness/readiness entries
pnpm age-appropriateness:ratify         # advances them to committed brain_constitution rows
```

To act as someone — decide a gate, or use the admin CAPS console — the dev login needs an account at the dev
school. A token's `sub` is resolved at sign-in to that school's `user_account`, and the account's id (not the `sub`)
is the actor everywhere (OQ-033). Seed one for each of the eight school-role logins, after `db:seed`, as the migrator:

```bash
pnpm --filter @infinite-ai/db db:seed:identities   # 7 accounts + role assignments at the dev school
```

**A login that goes through the real invitation path (OQ-033 step 8).** `invitee.dev` has a pending invitation and
deliberately no account. Seed the invitation, as the migrator, after `db:seed`:

```bash
pnpm --filter @infinite-ai/db db:seed:invitations   # one pending teacher invitation, and no account
```

Then sign in as `invitee.dev`: the verified address finds the invitation, the account and its `teacher` role are created
there and then (the path every real school staff member will take), and the invitation is spent. Seeding again never
reopens a spent invitation; `pnpm sandbox reset` starts the flow over. The seeded identities above still create their
accounts directly: replacing that with invitations for every login waits on checking the identity-provider integration
against a running Keycloak (`docs/PROVISIONING_DESIGN.md` §11.1, slice 7e). `pnpm sandbox up` runs this seed for you.

The eight school-role Keycloak users in `infra/keycloak/realm.json` carry fixed ids so their `sub` is stable across imports; the
seed uses those same ids as each account's `subject` (`packages/db/prisma/dev-identities.ts`, with a test that fails
if the two drift). Without this step you can still sign in, but the app has no actor for you: pages that read data
show nothing, and API routes answer 403 "No active account for this user". Sign out and in again after seeding —
the account is resolved when you sign in, not on every request. A realm that was imported before the ids were added
must be re-imported (the old users have random ids). `platform-support.dev` and `platform-admin.dev` have no tenant of
their own and get no account.

**Provisioner secret (OQ-033 step 7).** `KEYCLOAK_PROVISIONER_CLIENT_SECRET` is a fourth client secret in `infra/docker/.env`: the realm
import substitutes it into the `infinite-ai-provisioner` client, so the stack will not start without it (`pnpm sandbox env` generates it). To let
the web app use it, put the same value and `KEYCLOAK_PROVISIONER_CLIENT_ID=infinite-ai-provisioner` in `apps/web/.env`; leave them empty to keep
creating Keycloak users by hand. A realm imported before this change must be re-imported to gain the client.

**One-time codes in dev (OQ-036).** The realm requires a one-time code for `admin.dev`, `smt.dev`, `platform-support.dev`,
`platform-admin.dev` and `sbst_chair`. The first time you sign in as one of them, Keycloak asks you to set up an authenticator app (any
TOTP app; the QR code is on that screen) and then asks for a code on every later sign-in. The other dev users sign in with the
password only. `chair.dev` is the one login that holds two roles (`sbst` and `sbst_chair`), so you can act as either at a
gate that needs the chair and see the other refused; once the chair is made an MFA role (OQ-046, Stage 133) it needs a code too. A realm imported before this change must be re-imported to pick up the flow.

Optional, to see the approvals screens with something on them (`/approvals`, the HoD console, the SMT
dashboard), open ten placeholder human gates. Run it as the migrator, like `db:seed`, after `db:seed`:

```bash
pnpm --filter @infinite-ai/db db:seed:approvals   # 6 for the HoD, 2 SMT, 1 teacher, 1 in another tenant
```

The gates carry a plainly marked placeholder artefact ("Dev fixture") — no curriculum, no people — and the
seed is idempotent. The one in the second tenant is there to make a cross-tenant leak visible: nobody signed in
to the first tenant should ever see it.

## 6. Start the apps

Three separate processes, three terminals. Neither the gateway nor the worker load a
`.env` file automatically (there is no `dotenv` step anywhere in this codebase — only
`apps/web`, via Next.js's own built-in convention, does that for you) — export the root
`.env` into your shell first:

```bash
set -a; source <(grep -vE '=[[:space:]]*$' .env); set +a
```

The `grep` leaves out lines with an empty value. The apps validate their environment strictly and
treat a variable that is present but empty as an error, not as "unset" — and `.env.example` is made
of blank `NAME=` lines, so a plain `source .env` makes the worker refuse to start (verified with the
real loader: `OTEL_EXPORTER_OTLP_ENDPOINT` and `SAFEGUARDING_SNS_TOPIC_ARN` are refused when empty).

```bash
# terminal 1
pnpm --filter @infinite-ai/gateway start

# terminal 2 (same exported env)
pnpm --filter @infinite-ai/worker start

# terminal 3 — Next.js loads apps/web/.env itself, nothing extra needed
pnpm --filter @infinite-ai/web dev
```

Visit `http://localhost:3000` and sign in via the Keycloak sign-in button. The imported
realm ships one dev login per role, all scoped to the Kleinbos Primary dev tenant
(`10000000-0000-4000-8000-000000000001`) that step 5's `db:seed` creates, so every role
surface is reachable immediately after import — no manual Keycloak admin-console step
needed:

### Signing in as each role

| Username               | Role                                | Reaches                                                      |
| ---------------------- | ----------------------------------- | ------------------------------------------------------------ |
| `teacher.dev`          | `teacher`                           | `/teacher`                                                   |
| `hod.dev`              | `hod`                               | `/hod`                                                       |
| `smt.dev`              | `smt`                               | `/smt`                                                       |
| `sbst.dev`             | `sbst`                              | `/sbst`                                                      |
| `chair.dev`            | `sbst` + `sbst_chair`               | `/sbst`; the chair-only gates (OQ-046), via the role chooser |
| `invitee.dev`          | `teacher` (after the first sign-in) | `/teacher`; the account is created from its invitation       |
| `admin.dev`            | `admin`                             | `/admin/prompts`, `/admin/setup`, `/admin/env`               |
| `guardian.dev`         | `guardian`                          | `/guardian`                                                  |
| `learner.dev`          | `learner`                           | `/learner`                                                   |
| `platform-support.dev` | `platform_support`                  | `/platform/runs`                                             |
| `platform-admin.dev`   | `platform_admin`                    | `/platform/runs`, `/platform/tenants`, `/district`           |

The password for all eleven is `SEED_USER_PASSWORD` from `infra/docker/.env` — each
account has `temporary: true` on its credential, so Keycloak forces a password change on
first login (pick anything meeting the realm's password policy). These are fixture
identities, invented the same way `packages/db/prisma/seed.ts`'s own header explains: no
real person, staff member, guardian or learner is represented.

## Building and running the apps as containers

Each app has its own `Dockerfile` (`apps/gateway/Dockerfile`, `apps/worker/Dockerfile`,
`apps/web/Dockerfile`), built from the repository root since every `@infinite-ai/*`
dependency resolves through pnpm's `workspace:*` protocol — the whole monorepo tree needs
to be present, not just one app's own directory:

```bash
docker build -f apps/worker/Dockerfile -t infiniteai/infinite-ai-worker:latest .
docker build -f apps/gateway/Dockerfile -t infiniteai/infinite-ai-gateway:latest .
docker build -f apps/web/Dockerfile -t infiniteai/infinite-ai-web:latest .
```

(Those are the names `infra/docker/compose.apps.yml` looks for; any other tag makes
compose try to pull `infiniteai/…` from Docker Hub.)

Each image runs the same way its `pnpm start` already does locally — see each
Dockerfile's own header comment for why (no separate compiled build output exists yet)
and the known follow-up it names (the image carries the whole workspace, not just what
that one app needs at runtime — a size optimization on top of a working image, not a
prerequisite for one). Run one with the same environment variables `docs/DEV_SETUP.md`'s
earlier steps already describe, e.g.:

```bash
docker run --rm -p 8081:8081 --env-file .env infinite-ai-worker
```

(`--env-file` needs real values, not `NAME=` placeholders — point `DATABASE_URL`/
`REDIS_URL` at a reachable Postgres/Redis, which `localhost` won't resolve to from inside
the container; use `host.docker.internal` in its place, or run the container on the same
Docker network as the dev-stack `docker compose` services.)

### The whole stack in Docker (no local Node needed)

Verified end to end on a clean machine with the shipped compose files. Two steps, in this
order, because `compose.apps.yml` joins the network `compose.dev.yml` creates — passing both
files to one `up` fails with `network infinite-ai-dev_default declared as external, but could
not be found`.

1. Fill in `infra/docker/.env`, including the apps' variables (the second half of
   `infra/docker/.env.example`). Inside containers use **service names**, not `localhost`:
   `postgres`, `redis`, `minio`. Three things to get right:
   - A variable that is present but **empty** is an error, not "unset": the apps validate
     strictly, so `OTEL_EXPORTER_OTLP_ENDPOINT=` makes the worker exit with `Invalid url`.
     Delete lines you do not use; do not leave `NAME=` blank.
   - Gateway providers: for Anthropic alone set `ANTHROPIC_API_KEYS` and
     `GATEWAY_ROUTING_CONFIG=/repo/apps/gateway/routing.anthropic.json` (see "Calibrating the
     age-appropriateness judge?" above); leave `OPENAI_API_KEYS`, `GOOGLE_API_KEYS` and
     `LOCAL_MODEL_*` out. The gateway is published on `127.0.0.1:8080` only: it has no
     per-request authentication (the tenant is taken from the request body), so it must not be
     reachable from other machines.
   - `KEYCLOAK_ISSUER` must be one URL that both the web container and your browser can open
     — use `http://host.docker.internal:8180/realms/infinite-ai`. Docker Desktop resolves
     that name on the host and in containers; on a Linux engine add
     `127.0.0.1 host.docker.internal` to `/etc/hosts` (compose already maps it for the
     containers).
2. Start the data plane, migrate and seed from a throwaway container (the same image the
   gateway uses, which carries the whole workspace), then start the apps:

```bash
docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml \
  up -d postgres redis minio minio-init keycloak          # + langfuse services if you want them

set -a; source infra/docker/.env; set +a
docker run --rm --network infinite-ai-dev_default \
  -e MIG_URL="postgresql://migrator:${MIGRATOR_PASSWORD}@postgres:5432/${POSTGRES_DB}" \
  -e DATABASE_URL -e DB_ENCRYPTION_KEY \
  infiniteai/infinite-ai-gateway:latest bash -c '
    cd /repo
    DATABASE_URL="$MIG_URL" pnpm --filter @infinite-ai/db db:migrate:deploy
    DATABASE_URL="$MIG_URL" pnpm --filter @infinite-ai/db db:seed
    for s in curriculum:seed curriculum:ratify templates:seed templates:ratify \
             age-appropriateness:seed age-appropriateness:ratify; do pnpm "$s"; done'

docker compose --env-file infra/docker/.env -f infra/docker/compose.apps.yml up -d
```

Then open `http://localhost:3000`. The gateway is on `:8080`, the worker's probe on
`127.0.0.1:8081`, Keycloak on `:8180`, the MinIO console on `:9001`.

## Running the automated tests

You don't need any of the above for this — see the root `README.md`'s "Getting started"
for `pnpm test` (unit tier, no Docker), and this excerpt for the integration tier
(real Postgres via Testcontainers, self-contained, no manual setup):

```bash
pnpm --filter @infinite-ai/db test:integration
pnpm --filter @infinite-ai/brain test:integration
pnpm --filter @infinite-ai/orchestrator test:integration
pnpm --filter @infinite-ai/curriculum-seed test:integration
pnpm --filter @infinite-ai/guardrails test:integration
```

Each spins up its own throwaway Postgres, runs migrations against it, and tears it down
— nothing here touches the dev data plane from step 2.

## Troubleshooting

| Symptom                                                          | Cause                                                                                                                                                        |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose up` fails with `":?set X in your local .env"`    | A variable in `infra/docker/.env` is missing or empty — check against `infra/docker/.env.example`.                                                           |
| Gateway/worker exits immediately citing `DATABASE_URL: Required` | You didn't `source .env` into the shell before starting it (step 6) — Node processes here don't auto-load `.env`.                                            |
| `prisma migrate deploy` fails with a permissions error           | `DATABASE_URL` is pointed at `app_rw`, not `migrator` — migrations need DDL privileges only `migrator` has.                                                  |
| The app connects but every query 403s / returns nothing          | `DATABASE_URL` is pointed at `migrator` at runtime instead of `app_rw` — swap it back (step 4).                                                              |
| Keycloak sign-in redirects to an error page                      | `AUTH_KEYCLOAK_SECRET` doesn't match the realm's actual client secret — see the fallback note in step 2.                                                     |
| `docker pull ...` fails with 403/Forbidden                       | An egress policy is blocking the registry, not a Docker problem — check your network/proxy configuration before assuming Testcontainers or Docker is broken. |
