# Running the ecosystem locally on free models

A step-by-step manual for running INFINITE-AI on your own machine (or a free cloud
machine) with **no paid model API**, so you can look at every screen, edit the design, and
produce model outputs for iterating on agents and calibrating judges before you spend
anything.

> Companion to `docs/DEV_SETUP.md` (the reference sequence). This manual is the guided
> version: it picks the free path for you and tells you what works today and what does not.
>
> **Verification status.** The code changes this manual relies on (Part 3) are unit-tested.
> The Docker stack and the model calls were **not** run while writing it — the authoring
> sandbox has no Docker daemon and no GPU. Commands are taken from the repo's own, previously
> verified setup (`docs/STAGE_LOG.md` Stage 90–94). Treat your first run as the test of this
> manual, and fix whatever it gets wrong in the same PR.

---

## Part 0 — Read this first (the honest summary)

**What "free and unlimited" can and cannot mean.**

| Option                                                           | Free? | Unlimited?                   | Notes                                                                                               |
| ---------------------------------------------------------------- | ----- | ---------------------------- | --------------------------------------------------------------------------------------------------- |
| **A. Local model server (Ollama / LM Studio / vLLM)**            | Yes   | **Yes** — your hardware only | The only genuinely unlimited option. Slower and weaker than Claude/GPT-4-class models.              |
| B. Hosted free tier (Groq, Google AI Studio, OpenRouter `:free`) | Yes   | **No** — rate and daily caps | Fast and stronger models, but you will hit limits. Free tiers may log prompts. Limits change often. |
| C. No model at all                                               | Yes   | Yes                          | Enough to review and restyle every screen. Nothing that calls an agent will work.                   |

Use **C** for design work, **A** for volume (training/calibration runs), and **B** only for
short bursts when you want a stronger model than your hardware can run.

**What is testable end to end today.**

| You want to…                                                     | Works today?     | How                                                    |
| ---------------------------------------------------------------- | ---------------- | ------------------------------------------------------ |
| See and edit all nine role screens                               | Yes              | Part 6–7 (needs Postgres + Keycloak, **no model**)     |
| Run the age-appropriateness **judge** on a real model            | Yes              | Part 8.1                                               |
| See every prompt/response in a trace viewer                      | Yes              | Langfuse, Part 5.5                                     |
| Run the eval harness (`pnpm evals:run`)                          | Yes, but see 8.2 | It uses **stub executors — it never calls a model**    |
| Run any one of the 56 agents on a live model, keep the raw reply | Yes              | `pnpm dev:run-agent`, Part 8.3                         |
| Run golden sets on a live model and save every reply             | Yes              | `pnpm evals:run-live`, Part 8.4                        |
| Start a MOD-01…05 / LE pipeline and watch it                     | Yes (new)        | `pnpm dev:run-pipeline`, Part 8.5 — but see its limits |
| Start a pipeline from the web UI                                 | **No**           | No screen does it; use the command above               |

The new runners close most of the old gap between "the ecosystem runs" and "I can generate
training and calibration data from it". Their limits are real and listed in Part 8.5 and
Part 13 — read them before trusting a number.

**Smaller models will behave differently.** Agents are required to answer in JSON that is
validated by Zod, and the judge fails closed (a malformed reply becomes "not appropriate").
An 8B model will produce malformed JSON more often than Claude. That is useful signal for
prompt iteration, but **never carry a calibration number from a free model to a paid one**
(OQ-016: re-calibrate whenever the judge's model changes).

---

## Part 1 — What you will be running

```
 browser ──► apps/web (Next.js, :3000) ──► Keycloak (:8180, sign-in)
                  │                            │
                  ▼                            ▼
          Postgres+pgvector (:5432) ◄── apps/worker (:8081) ──► Redis (:6379)
                  ▲                            │
                  │                            ▼
            apps/gateway (:8080) ◄─────────────┘   (the ONLY path to a model)
                  │
                  ▼
        your model server (Ollama :11434)   ← free, local
        MinIO (:9000/:9001)   Langfuse (:3001, optional trace viewer)
```

| Part         | Needed for design work? | Needed for model calls? |
| ------------ | ----------------------- | ----------------------- |
| Postgres     | yes                     | yes                     |
| Keycloak     | yes (sign-in)           | yes                     |
| Redis, MinIO | no                      | yes                     |
| web          | yes                     | —                       |
| gateway      | no                      | yes                     |
| worker       | no                      | yes                     |
| Langfuse     | no                      | optional, recommended   |

---

## Part 2 — Choose where to run it

### 2.1 Your own computer (recommended)

You need **Node 22+**, **pnpm 10+** (`corepack enable`), **Docker with a running daemon**
(`docker info` must succeed), **git**, **openssl**, and ~20 GB free disk. For the models:
16 GB RAM runs an 8B-parameter model slowly on CPU; a GPU with 8 GB+ VRAM runs it well.

### 2.2 A free cloud playground

Docker is mandatory (Postgres, Keycloak and the rest run as containers), so a browser-only
sandbox will not do. Options that give you a Docker-capable Linux machine for free:

- **GitHub Codespaces** — personal accounts get a monthly free quota (currently 120 core-hours
  on the Free plan, i.e. 60 hours on a 2-core machine; 15 GB storage). Not unlimited, and
  free quota is not available to organisation accounts. Pick a **4-core / 16 GB** machine for
  the data plane; **do not** run a model here (no GPU). Ports `3000` and `8180` must be
  forwarded and **made public to your own browser session** — see the Keycloak note in Part 6.
- **Oracle Cloud "Always Free" Ampere A1 VM** — a permanent free Arm VM (Oracle's page states up
  to 4 OCPU / 24 GB in total; one source claims a lower current limit, so confirm on Oracle's
  Always Free page). Enough for the whole stack plus a small CPU model. You manage the VM
  yourself (install Docker, Node, pnpm). Stay inside the limit: Oracle disables then deletes
  instances that exceed it.
- **Model on a separate machine.** Run the stack on Codespaces/Oracle and the model on your
  own GPU PC (or a free GPU notebook such as Colab/Kaggle exposed through a tunnel). The
  gateway only needs one URL: `LOCAL_MODEL_BASE_URL=https://<your-tunnel>/v1`. Anything on
  the public internet must be protected — see Part 10 (security).

For every option the rest of the manual is identical; only the host changes.

---

## Part 3 — Get the model brain (pick A, B or C)

The gateway speaks to anything that implements the OpenAI `/chat/completions` format through
its `local` adapter (`LOCAL_MODEL_BASE_URL` + `LOCAL_MODEL_API_KEYS`). It does not matter what
sits behind that URL. **A key is mandatory in the config but Ollama ignores its value** — any
non-empty text works.

### Option A — Ollama (free, unlimited, local)

1. Install Ollama from <https://ollama.com/download> and start it (`ollama serve`; the desktop
   app does this for you). It listens on `http://localhost:11434`.
2. Pull one **heavy** model, one **light** model and an embedding model. Names change as new
   models appear — pick any current instruction-tuned model that supports JSON output and
   that fits your RAM/VRAM (`ollama list` shows what you have). Example:

   ```bash
   ollama pull qwen3:8b            # heavy: planning, authoring, analysis
   ollama pull llama3.2:3b         # light: screening, classification (fast)
   ollama pull nomic-embed-text    # embeddings (already named in routing.json)
   ```

3. Check it answers: `curl http://localhost:11434/v1/models`.

### Option B — a hosted free tier (rate-limited)

Use the gateway's `openai` provider with a different base URL. Sign up with the provider,
create an API key, and later (Part 5.3) set:

| Provider         | `OPENAI_BASE_URL`                                         | Notes                                                                                                 |
| ---------------- | --------------------------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| Groq             | `https://api.groq.com/openai/v1`                          | Free tier ≈ 30 requests/min and a few hundred thousand tokens/day per org for `openai/gpt-oss-120b`.  |
| Google AI Studio | `https://generativelanguage.googleapis.com/v1beta/openai` | Free tier is Flash-class models only and has per-minute limits. Free-tier data may be used by Google. |
| OpenRouter       | `https://openrouter.ai/api/v1`                            | Models whose id ends in `:free` have low daily caps.                                                  |

These limits change often and sources disagree — **read your provider's own rate-limit page**.
The gateway's circuit breaker opens for 30 s after five consecutive provider failures, so
hitting a limit looks like a burst of errors followed by a pause, not a crash.
Do not put learner data into a free tier: the system already stops identifiable learner data
reaching any model (rule 4), but only synthetic/seed data belongs here regardless.

### Option C — no model

Skip this part. Everything in Parts 4–7 works; anything that needs a model returns an error.

---

## Part 4 — Install and prepare the repository

```bash
git clone https://github.com/Sarah-JaneHarding/infinite-ai-ecosystem.git
cd infinite-ai-ecosystem
git checkout claude/local-ecosystem-setup-1arave     # the branch that contains this manual's tooling
pnpm install --frozen-lockfile
```

If the branch has been merged, stay on `main`.

### 4.1 Generate every secret and config file in one go

Nothing secret is committed (rule 7), so you create four local files. This block writes all of
them with random values. Run it **once**, from the repo root. The files are git-ignored.

```bash
set -e
rnd()  { openssl rand -hex 16; }
PG_DB=infinite_ai_dev
MIG=$(rnd); APP=$(rnd); WRK=$(rnd); ANA=$(rnd)
LF_PUB=pk-lf-$(rnd); LF_SEC=sk-lf-$(rnd)
WEB_SECRET=$(rnd)
SEED_PW="Aa1!$(openssl rand -hex 6)"          # satisfies Keycloak's password policy
DBKEY=$(openssl rand -base64 32)

cat > infra/docker/.env <<EOF
POSTGRES_DB=$PG_DB
POSTGRES_USER=postgres
POSTGRES_PASSWORD=$(rnd)
MIGRATOR_PASSWORD=$MIG
APP_RW_PASSWORD=$APP
WORKER_RW_PASSWORD=$WRK
ANALYTICS_RO_PASSWORD=$ANA
KEYCLOAK_ADMIN=admin
KEYCLOAK_ADMIN_PASSWORD=$(rnd)
KEYCLOAK_WEB_CLIENT_SECRET=$WEB_SECRET
KEYCLOAK_WORKER_CLIENT_SECRET=$(rnd)
KEYCLOAK_PROVISIONER_CLIENT_SECRET=$(rnd)
SEED_USER_PASSWORD=$SEED_PW
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=$(rnd)
OBJECT_STORE_BUCKET=infinite-ai-dev
LANGFUSE_POSTGRES_USER=langfuse
LANGFUSE_POSTGRES_PASSWORD=$(rnd)
LANGFUSE_REDIS_PASSWORD=$(rnd)
LANGFUSE_CLICKHOUSE_USER=clickhouse
LANGFUSE_CLICKHOUSE_PASSWORD=$(rnd)
LANGFUSE_SALT=$(rnd)
LANGFUSE_ENCRYPTION_KEY=$(openssl rand -hex 32)
LANGFUSE_NEXTAUTH_SECRET=$(rnd)
LANGFUSE_INIT_PROJECT_PUBLIC_KEY=$LF_PUB
LANGFUSE_INIT_PROJECT_SECRET_KEY=$LF_SEC
LANGFUSE_INIT_USER_EMAIL=dev@example.com
LANGFUSE_INIT_USER_PASSWORD=$(rnd)
EOF

cat > .env <<EOF
NODE_ENV=development
APP_REGION=local
LOG_LEVEL=info
DATABASE_URL=postgresql://app_rw:$APP@localhost:5432/$PG_DB
REDIS_URL=redis://localhost:6379
DB_ENCRYPTION_KEY=$DBKEY
GATEWAY_BASE_URL=http://localhost:8080
WORKER_PORT=8081
OBJECT_STORE_ENDPOINT=http://localhost:9000
OBJECT_STORE_BUCKET=infinite-ai-dev
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:3001/api/public/otel
OTEL_EXPORTER_OTLP_HEADERS=Authorization=Basic $(printf '%s:%s' "$LF_PUB" "$LF_SEC" | base64 -w0)
EOF

cat > apps/web/.env <<EOF
NEXTAUTH_SECRET=$(openssl rand -base64 32)
AUTH_KEYCLOAK_ID=infinite-ai-web
AUTH_KEYCLOAK_SECRET=$WEB_SECRET
AUTH_KEYCLOAK_ISSUER=http://localhost:8180/realms/infinite-ai
EOF

echo "MIGRATOR_URL=postgresql://migrator:$MIG@localhost:5432/$PG_DB" > .migrator-url
echo; echo "Dev-login password (Keycloak forces a change on first login): $SEED_PW"
```

- **Write down the dev-login password** printed at the end; you will need it in Part 6.
- Do not run this block again over an existing database: it makes new passwords that no
  longer match the volume. To start over, see "Reset everything" in Part 11.
- `base64 -w0` is GNU/Linux. On macOS use `base64 | tr -d '\n'`.
- `.migrator-url` holds the schema-owner password and is git-ignored; delete it when you are done (`rm .migrator-url`).
- You are not setting the gateway's `.env` here — Part 5.3 does that once you know your model.

---

## Part 5 — Start everything

### 5.1 Start the data plane

Without Langfuse (lighter, fine for design work):

```bash
docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml \
  up -d postgres redis keycloak-db-init keycloak minio minio-init
```

With Langfuse (adds ClickHouse; needs ~4 GB more RAM; **recommended for model work**, because
it lets you read every prompt and response):

```bash
docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml up -d
```

Wait until `docker compose -f infra/docker/compose.dev.yml ps` shows `postgres`, `redis`,
`keycloak` as `healthy` (Keycloak takes 20–30 s; Langfuse up to a minute). `minio-init` and
`keycloak-db-init` should say `Exited (0)` — that is success.

### 5.2 Create the tables and demo data

```bash
set -a; source <(grep -vE '=[[:space:]]*$' .env); set +a      # load the root .env into this shell

# 1. Tables — as the migrator role (the only role allowed to change the schema)
source .migrator-url
DATABASE_URL="$MIGRATOR_URL" pnpm --filter @infinite-ai/db db:migrate:deploy

# 2. Three demo schools (idempotent). Also as the migrator.
DATABASE_URL="$MIGRATOR_URL" pnpm --filter @infinite-ai/db db:seed

# 3. Curriculum, templates and age-appropriateness data — as app_rw (root .env DATABASE_URL)
pnpm curriculum:seed && pnpm curriculum:ratify
pnpm templates:seed && pnpm templates:ratify
pnpm age-appropriateness:seed && pnpm age-appropriateness:ratify

# 4. Optional: ten placeholder approval items so the approval screens are not empty
DATABASE_URL="$MIGRATOR_URL" pnpm --filter @infinite-ai/db db:seed:approvals
```

`DB_ENCRYPTION_KEY` (in `.env`) must be set **before** step 2 and never changed afterwards: the
gateway uses it to read each school's learner-name list, and without it the gateway refuses
every request.

### 5.3 Point the gateway at your free model

The gateway refuses to boot unless **every provider named in its routing file has a
credential**. The shipped `routing.json` names four providers, so for free testing you
generate a routing file that names only one. The script below does this and keeps the
logical-model list identical to `routing.json`.

**Option A (Ollama):**

```bash
pnpm routing:local \
  --heavy qwen3:8b --light llama3.2:3b \
  --embedding nomic-embed-text \
  --judge qwen3:8b \
  --out apps/gateway/routing.local.json

cat > apps/gateway/.env <<EOF
GATEWAY_PORT=8080
ROUTING_CONFIG_PATH=$PWD/apps/gateway/routing.local.json
LOCAL_MODEL_BASE_URL=http://localhost:11434/v1
LOCAL_MODEL_API_KEYS=ollama
LOCAL_MODEL_TIMEOUT_MS=300000
EOF
```

- `--heavy` serves the routes that plan, author and analyse; `--light` serves screening and
  classification; `--judge` pins the age-appropriateness judge to one model so calibration
  measures a single known model.
- `LOCAL_MODEL_TIMEOUT_MS` matters. Without it the gateway gives up after **30 seconds**; a
  CPU-only 8B model can need minutes for one long answer. 300 000 = 5 minutes. (This variable
  is new, added together with this manual.)

**Option B (hosted free tier)** — reuse the same script, but name the provider `openai` and
use the provider's own model ids:

```bash
pnpm routing:local --provider openai \
  --heavy openai/gpt-oss-120b --light openai/gpt-oss-120b \
  --judge openai/gpt-oss-120b --out apps/gateway/routing.local.json    # no --embedding

cat > apps/gateway/.env <<EOF
GATEWAY_PORT=8080
ROUTING_CONFIG_PATH=$PWD/apps/gateway/routing.local.json
OPENAI_BASE_URL=https://api.groq.com/openai/v1
OPENAI_API_KEYS=<paste your key — this file is git-ignored>
EOF
```

Several keys are comma-separated and rotate (the gateway's credential pool) — but providers
usually count limits **per organisation**, so extra keys from one account will not help.

**Option C:** skip.

### 5.4 Run the four programs

The gateway and worker do **not** read `.env` files by themselves. Open **three terminals** in
the repo root. In each of the first two, load both env files first:

```bash
# terminal 1 — gateway
set -a; source <(grep -vE '=[[:space:]]*$' .env); source <(grep -vE '=[[:space:]]*$' apps/gateway/.env); set +a
pnpm --filter @infinite-ai/gateway start

# terminal 2 — worker (needs the root .env only)
set -a; source <(grep -vE '=[[:space:]]*$' .env); set +a
pnpm --filter @infinite-ai/worker start

# terminal 3 — web (Next.js reads apps/web/.env itself; hot reload is on)
pnpm --filter @infinite-ai/web dev
```

Why the `grep`: the apps treat `NAME=` (present but empty) as an error, not as "unset".

### 5.5 Check it is alive

```bash
curl -s localhost:8080/health      # {"status":"ok"}   gateway
curl -s localhost:8081/health      # {"status":"ok"}   worker
```

**Prove a model answers through the gateway.** This sends a tiny, obviously non-personal
request. `provenance` is the "this text contains no learner data" stamp the gateway insists
on; it is honest here because the text is a fixed sentence.

```bash
curl -s localhost:8080/v1/chat/completions -H 'content-type: application/json' -d '{
  "tenantId": "10000000-0000-4000-8000-000000000001",
  "module": "smoke", "agent": "manual-check",
  "model": "plan.verify",
  "messages": [{"role":"user","content":"Reply with the single word: ready"}],
  "provenance": {"deidentified": true, "saltVersion": 0, "dropped": []}
}'
```

Expect JSON with `"provider":"local"` and `message.content`. First call to an Ollama model
is slow (it loads the model into memory). Failures and what they mean are in Part 11.

**Langfuse** (if started): <http://localhost:3001>, sign in with `LANGFUSE_INIT_USER_EMAIL` /
`LANGFUSE_INIT_USER_PASSWORD` from `infra/docker/.env`; project `infinite-ai-dev`. Your smoke
call should appear as a trace within seconds, with the full prompt and reply.

---

## Part 6 — See every user experience

Open <http://localhost:3000> and press the Keycloak sign-in button. Each account is a
fixture (no real person) in the demo school **Kleinbos Primary**. Password: the
`SEED_USER_PASSWORD` printed in Part 4.1 — Keycloak makes you choose a new one on first login
per account (12+ characters with upper, lower, digit and symbol). Use a private window per
role, or sign out between them.

| Username               | Sees                                                       | Direct URL                                                                     |
| ---------------------- | ---------------------------------------------------------- | ------------------------------------------------------------------------------ |
| `teacher.dev`          | Teacher Studio (curriculum map from the seeded ATP data)   | `/teacher`                                                                     |
| `hod.dev`              | Head-of-Department console and approvals                   | `/hod`, `/approvals`                                                           |
| `smt.dev`              | School Management dashboard                                | `/smt`                                                                         |
| `sbst.dev`             | Support-team screening views (EGRA etc.)                   | `/sbst`                                                                        |
| `admin.dev`            | Prompt Builder, school setup, environment docs, CAPS canon | `/admin/prompts`, `/admin/setup`, `/admin/env`, `/admin/curriculum/caps-canon` |
| `guardian.dev`         | Guardian view                                              | `/guardian`                                                                    |
| `learner.dev`          | Learner space (**uses built-in sample data**)              | `/learner`                                                                     |
| `platform-support.dev` | Run Inspector                                              | `/platform/runs`                                                               |
| `platform-admin.dev`   | Run Inspector, tenants, district roll-up                   | `/platform/runs`, `/district`                                                  |

**Know what is real and what is sample** while you judge a screen:

- Teacher Studio shows a yellow **"Sample data"** badge on sections that are not yet backed by
  real data. The curriculum map is real (seeded L0 data).
- The learner screen builds its profile and graph from sample builders in
  `LearnerSpace.tsx` — it will not change when you run agents.
- Run Inspector and District roll-up say honestly when there is nothing to show. With no
  pipeline ever run, an empty Run Inspector is correct.
- `/platform/tenants` no longer appears in the navigation (the dead link was removed in Stage 97); there is no tenants page to review.

**Cloud playground note.** The sign-in redirects your browser to Keycloak at the address in
`AUTH_KEYCLOAK_ISSUER`. In Codespaces that must be the forwarded public URL of port 8180
(not `localhost`), set identically in `apps/web/.env` and used by your browser; the
Keycloak client's allowed redirect URIs must include your forwarded web URL
(Keycloak admin console at port 8180 → realm `infinite-ai` → Clients → `infinite-ai-web`).
Locally none of this applies.

---

## Part 7 — Edit appearance and usability as you go

You only need Postgres, Keycloak and the web app running (Option C is enough). The dev server
hot-reloads: save a file and the browser updates.

| To change…                                  | Edit…                                                                                                               |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- |
| Colours, fonts, spacing (global)            | `packages/design-system/src/tokens.css` and `tokens.ts` — **change both**                                           |
| A shared component (button, badge, card…)   | `packages/design-system/src/components/`                                                                            |
| A role's screen                             | `apps/web/src/components/<role>/` (e.g. `teacher/TeacherStudio.tsx`) and `apps/web/src/app/(shell)/<role>/page.tsx` |
| Navigation and who can open what            | `apps/web/src/lib/roles.ts` (`ROLE_NAV`, `roleCanViewPath`)                                                         |
| Global styles                               | `apps/web/src/app/globals.css`                                                                                      |
| Brand rules (the reasoning behind the look) | `docs/BRAND_KIT.md`, `docs/brand-identity.html`                                                                     |

Guard rails while you restyle:

```bash
pnpm --filter @infinite-ai/web test        # unit tests (also catch broken copy/labels)
pnpm test:a11y                             # accessibility checks (Playwright, needs the app running)
pnpm test:lighthouse                       # performance/accessibility scores
pnpm lint && pnpm typecheck && pnpm format:check
```

Two rules that will trip a visual tweak: **no ad-hoc hex colours in components** (use the
semantic tokens — Stage 63) and **never replace a "Sample data" or empty-state message with
invented numbers** (Stages 101–105 removed those on purpose). The page's honest wording is
part of the product.

---

## Part 8 — Produce outputs from agents and judges

### 8.1 The age-appropriateness judge — works today, against your free model

This is the one calibration workflow that already calls a real model through the gateway.
It reads labelled cases from `packages/guardrails/calibration/age-appropriateness/`.

```bash
# gateway must be running (terminal 1) and Langfuse is useful to read the prompts
pnpm age-appropriateness:calibrate --include-unreviewed --out /tmp/judge-run-1.json
```

- `--include-unreviewed` scores the 31 _constructed_ cases. This is a **dry run, not evidence**
  — the runner and OQ-016 both say the real set needs 50+ cases labelled by a person. Without
  the flag it refuses to run until a person has reviewed `cases.json`.
- It prints raw agreement with the labels. It sets **no pass mark**; that is the school's call.
- Iterate: edit the judge prompt `packages/prompts/src/AGE-APPROPRIATENESS-JUDGE/1.0.0.prompt.md`
  (create a new version file rather than overwriting — prompts are versioned), re-run, compare
  the two output files and the Langfuse traces. Use a different `--judge` model per run by
  regenerating `routing.local.json` and restarting the gateway.
- To use more than the 31 cases: add labelled cases to `cases.json` (and the coverage file)
  following the existing shape; `checkLabelledSet` rejects an inconsistent set.

### 8.2 The eval harness — what it does and does not do

```bash
pnpm evals:run --all          # every agent's golden set
pnpm evals:run --agent CE-05  # one agent
pnpm evals:gate               # regression gate vs the stored champion
```

These run **stub executors** (`scripts/register-*-executors.ts`) built with fake database and
gateway dependencies, and a rule-based judge (`scripts/ac-stub-judge.ts`). They verify the
agents' _deterministic_ logic and schemas, not what a model writes. They need no gateway and
will pass without any model. Use them to guard against regressions while you edit; do **not**
read them as model-quality results.

### 8.3 One agent, live — `pnpm dev:run-agent`

Runs a single agent exactly as the worker would for an `agent_call` step: same prompt file,
same gateway request, same JSON parsing, same production guardrails. It also keeps what the
worker throws away: the **raw reply**, token usage, which provider answered, latency, and
_where_ a failure happened. It needs only the gateway (Part 5.4, terminal 1).

```bash
pnpm dev:run-agent --agent CE-01 --template > in.json      # skeleton of the agent's input
# edit in.json, replacing the "<string>" placeholders with synthetic data
pnpm dev:run-agent --agent CE-01 --input in.json --out runs/ce01.jsonl
```

The printed record has an `outcome`: `ok`, `invalid_input` (no model call was made — the input
broke the agent's schema; the issues are listed), `gateway_error`, `non_json` (the model replied
with prose; `rawContent` has all of it), `guardrail_refused`, or `error`. `--send-invalid`
calls the model even for an invalid input. `--out` appends one JSON line per run — iterate a
prompt, re-run, and diff the file.

Safety: the runner only accepts the three seeded fixture tenants and refuses
`NODE_ENV=production`. It stamps prompts "de-identified" the way the worker does for
curriculum work, which is only honest for synthetic data — so use only synthetic data.

### 8.4 Golden sets, live — `pnpm evals:run-live`

```bash
pnpm evals:run-live --agent CE-05 --limit 5        # 5 cases of one agent
pnpm evals:run-live --module TB                    # every Toolbox agent
pnpm evals:run-live --all --limit 3                # a sample of everything (56 agents × 3)
```

Each case's input goes to the live model; the output is scored with the same scorers as
`evals:run`. It writes `runs/evals-live-<time>/calls.jsonl` (one record per call, as in 8.3)
and `summary.json` (per case: `passed`, `failed`, `unscored`, `call_failed`).

Read the numbers carefully:

- **The golden sets were written for the stub executors.** Many expectations describe the
  stub's behaviour (for example "L0 is empty, so reply `needs_input`"). A live "failed" often
  means "the model did something reasonable that the stub-era case did not expect". The
  **raw replies are the product of this tool**, not the pass rate.
- `llm_judge` expectations are **not scored** (there is no calibrated judge — OQ-016). They are
  counted as deferred; a case with nothing else to check is `unscored`. The saved replies are
  exactly what you would hand to a judge or a human reviewer.
- About 1 in 6 golden inputs deliberately breaks its agent's schema (they test refusals).
  Those come back `invalid_input` without a model call unless you pass `--send-invalid`.
- `--all` without `--limit` is 1,473 model calls. On a CPU-only local model that is hours:
  start small.
- It is sequential and spends no money, but it does spend your time and (on Option B) your
  daily quota.

### 8.5 Pipelines, live — `pnpm dev:run-pipeline`

```bash
pnpm dev:run-pipeline --list
pnpm dev:run-pipeline --pipeline mod-01-curriculum --template > in.json
# edit in.json (synthetic data only)
pnpm dev:run-pipeline --pipeline mod-01-curriculum --input in.json --out runs/run1.json
pnpm dev:run-pipeline --pipeline mod-01-curriculum --inspect <runId>
```

It validates the input against every agent the pipeline will reach (printing exactly which
field is wrong, before any model time is spent), opens the run, puts the same job on the
queue the **running worker** consumes (so start the worker, Part 5.4), and prints one line per
step until the run finishes. `--out` saves the full inspection (every step's input, output,
error and timing) as JSON; `--no-wait` just starts it.

**Human gates are never decided by this tool.** When a run reaches one it prints "waiting for
a person"; sign in as the gate's role (`hod.dev`, `teacher.dev`, …) and decide it under
`/approvals`. The run then continues and this command reports the rest. That decision is a
real, audited label — the best training signal in the system.

**What a pipeline run does today (audit findings — they bound what you can learn):**

1. **In the worker, every step receives the run's original input.** (`--chain`, Part 8.6, changes
   this for MOD-01 in dev only.) The runner passes `run.input` to each
   step; one agent's output is not handed to the next (only `map` steps split a collection
   from the input). So a pipeline run exercises each agent on the same input rather than
   chaining them. Use it to test wiring, gates and failure handling; use 8.3/8.4 to study one
   agent's behaviour.
2. **The worker adds no L0/Brain context to an agent call**, although the MOD-01 prompts are
   written to receive `{ input, context }` (the L0 documents and earlier agents' artefacts).
   Without `--chain`, live output lacks CAPS grounding unless you put the facts in the input.
3. **MOD-04's `draft-artefact` step does not call a Toolbox agent.** `toolbox.draft_artefact`
   only records a Brain episode saying a draft was created; its comment promises dispatch to
   TB-01…11, but the handler does not do it. A MOD-04 run is a test of gates and bookkeeping,
   not of generation. Use `dev:run-agent --agent TB-0x` for generation.
4. Some pipelines begin with a tool step (for example `l0.ingest_ratified_source`) that
   validates its own input at run time; `--template` cannot show those fields.

These are recorded as follow-ups in Part 13.

### 8.6 Chained and grounded MOD-01 — `--chain` (dev only)

```bash
pnpm dev:run-pipeline --pipeline mod-01-curriculum --template > in.json   # edit: synthetic data
pnpm dev:run-pipeline --pipeline mod-01-curriculum --input in.json --chain \
  [--context-file ctx.json] --out runs/mod01.json
pnpm dev:run-agent --agent CE-04 --input in.json --context-file ctx.json    # one agent, your context
```

**Stop the worker first.** `--chain` runs the pipeline inside this command (no queue). If the
worker is up, the approval you give in the web app also queues a continuation job for it.

What changes, for the nine MOD-01 agents only (CE-01…CE-09; every other agent is sent exactly
what production sends):

- **Grounding.** Each agent receives `context.l0Documents` (and the named groups its prompt
  reads, such as `assessmentPolicy` and `templateDefinition`) from the tenant's ratified L0 —
  the same kinds `packages/curriculum-seed`'s executors attach.
- **Chaining.** Each agent also receives the drafts earlier agents produced **in this run**:
  `framework` (CE-01) for CE-02…09, `atpSchedule` (CE-02), `termPlan` (CE-03),
  `unitBlueprint` (CE-04 items matching subject and term), `assessmentTask` (CE-06 items
  matching subject and task kind), `lessonPlan` (CE-05 items matching subject, week and term).
  Where several items match, they arrive under the plural key (`unitBlueprints`) and the model
  must choose. An upstream result that is `needs_input`, failed, or absent is simply missing; it
  is listed in `context.devChain.missingUpstream`.
- **Labelled, never ratified.** Drafts are listed in `context.devChain.provisionalArtefacts`,
  nothing sets `ratifiedAt`, and the system prompt gets a "CALIBRATION RUN (development only)"
  addendum saying provisional artefacts may be used for this run. The HoD gate still decides, and
  the human decision is still the only ratification (OQ-030, option C).
- `--context-file` merges your own JSON object into every chained agent's `context`, reported as
  `devSupplied`. Use it for documents the system does not have yet (below).

**What will still come back `needs_input`, honestly.** The map steps still take their _parameters_
from your run input (`contentAreas`, `units`, `lessonPlans`, `assessmentTasks` — one entry per
item, each a full input for that item's agent); chaining adds the _artefacts_. And no
`ASSESSMENT_POLICY` document is seeded (there is no source in the repository for it, and the
rules forbid inventing assessment policy), so CE-03 and CE-06 return `needs_input`, which leaves
CE-04…CE-09 without a term plan. To exercise the whole chain, supply a real policy excerpt of your
own via `--context-file` (`{"assessmentPolicy": [ … ]}`) — it is labelled developer-supplied. CE-09
also needs an episode log (`{"episodeLog": {…}}`) that does not exist in a fresh database.

Not covered: the other 46 agents (add a row to `CHAIN_SPECS` once their data flow is decided),
the first tool step `l0.ingest_ratified_source` (it needs `documentId`, `documentVersion`,
`content` and `source` in the run input), and the production design — see OQ-030 option A.

---

## Part 9 — Where the outputs are, and how to keep them

| What                           | Where                                                                                   |
| ------------------------------ | --------------------------------------------------------------------------------------- |
| Every prompt, reply, latency   | Langfuse (<http://localhost:3001>) — filter by trace; export from the UI/API            |
| Judge verdicts                 | The `--out` JSON from `age-appropriateness:calibrate`                                   |
| Pipeline runs and step outputs | Tables `orchestrator_run`, `orchestrator_step_run` (columns `input`, `output`, `error`) |
| Human decisions on drafts      | Approval tasks (decision, reason, edit diff) — the main training signal                 |
| Ratified policy data           | `brain_constitution` (CAPS, ATP, templates, age clauses)                                |
| Audit trail                    | `audit_event` (append-only)                                                             |

Look at the database as the read-write app role, scoped to one school:

```bash
docker compose -f infra/docker/compose.dev.yml exec postgres psql -U app_rw -d infinite_ai_dev
-- every query must first set the school, or it errors by design:
BEGIN;
SELECT set_config('app.tenant_id','10000000-0000-4000-8000-000000000001', true);
SELECT set_config('app.actor_id','00000000-0000-4000-8000-000000000009', true);
SELECT id, pipeline_id, status FROM orchestrator_run ORDER BY created_at DESC LIMIT 10;
COMMIT;
```

(`-U app_rw` will ask for `APP_RW_PASSWORD` from `infra/docker/.env`.)

**Training data hygiene.** Outputs derived from the seed data contain no real people. Do not
mix in real learner data: it must pass the de-identification service first (rule 4), and a
free hosted tier is not an acceptable destination for it.

---

## Part 10 — Security while testing for free

- The gateway has **no per-request authentication** — the school comes from the request body.
  Keep it on `localhost`. Never forward port 8080 publicly, in Codespaces or anywhere.
- If your model server is on another machine, protect the tunnel (token or allow-list) —
  anyone who finds the URL gets free compute and sees your prompts.
- Keep the generated `.env` files private; they are git-ignored. Do not paste them into
  chats or issues. Delete `.migrator-url` when finished.
- Do not change any guard to "make a free model pass" (no `SKIP_*` flags, no PII bypass).
  If a small model fails a guardrail, that is the guardrail doing its job — adjust the
  prompt or the model.

---

## Part 11 — Troubleshooting

| Symptom                                                         | Cause and fix                                                                                                                                                      |
| --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `docker compose` says `set X in your local .env`                | Pass `--env-file infra/docker/.env`, and check no value is empty.                                                                                                  |
| Worker exits with `Invalid url` or similar                      | An env line is present but empty. Use the `grep -vE '=[[:space:]]*$'` loader from 5.4.                                                                             |
| Gateway: `references unknown provider "openai"`                 | `ROUTING_CONFIG_PATH` is unset or points at the shipped file. Use the generated `routing.local.json` (5.3).                                                        |
| Gateway: `Required` / PII guard "fails closed" on every request | `DB_ENCRYPTION_KEY` missing from the gateway's shell, or seeded under a different key. Re-source `.env`; if the key changed, reset (see "Reset everything" below). |
| Smoke call: `unavailable` / `timeout`                           | Ollama not running, model not pulled, or `LOCAL_MODEL_TIMEOUT_MS` too small. Try `curl localhost:11434/v1/models`; pull the model; raise it.                       |
| Many errors then a 30 s pause                                   | Circuit breaker: five consecutive provider failures. Fix the cause, wait 30 s.                                                                                     |
| Judge says "not appropriate" to everything                      | It fails closed: model replied with invalid JSON, or timed out. Read the trace in Langfuse; try a larger `--judge` model.                                          |
| Keycloak sign-in error page                                     | `AUTH_KEYCLOAK_SECRET` ≠ the client secret. Copy it from the Keycloak admin console (Clients → `infinite-ai-web` → Credentials).                                   |
| Keycloak restarts in a loop                                     | `SEED_USER_PASSWORD` fails the policy (12+ chars, upper, lower, digit, symbol). Fix and run `down -v` (see "Reset everything" below).                              |
| `prisma migrate deploy` permission error / app returns nothing  | Wrong role in `DATABASE_URL`: migrations use `migrator`, running apps use `app_rw`.                                                                                |
| Port already in use                                             | Web `3000`, Langfuse `3001`, gateway `8080`, worker `8081`, Keycloak `8180`, Postgres `5432`, Redis `6379`, MinIO `9000/9001`.                                     |
| `docker pull` 403                                               | A network/proxy policy, not Docker. MinIO now uses a Chainguard image because MinIO stopped free image publishing.                                                 |

### Reset everything (destroys all local data)

```bash
docker compose --env-file infra/docker/.env -f infra/docker/compose.dev.yml down -v
```

Then repeat from Part 4.1 (new secrets) or keep the same `.env` files and go to 5.1.

---

## Part 12 — Moving to paid models later

1. Keep `apps/gateway/routing.json` as the production routing; stop using `routing.local.json`.
2. Remove `ROUTING_CONFIG_PATH`/`LOCAL_MODEL_*` and supply the real provider keys
   (`ANTHROPIC_API_KEYS`, …) — or use `routing.anthropic.json` for Anthropic alone.
3. **Re-run every calibration.** Agreement measured on a free model says nothing about a paid
   one (OQ-016).
4. Provider pricing is still unset in the gateway (`zeroCost` in `apps/gateway/src/index.ts`),
   so budgets do not enforce spend until you supply it. Before paid use, set real prices.

---

## Part 13 — Known gaps (what to build next, in priority order)

These are findings from the audit, not hypothetical wishes. Each is its own change under
`CLAUDE.md`'s rules (tests, docs, one logical change per PR).

1. **Production chaining and grounding (OQ-030 option A).** `--chain` is dev-only. For production,
   each MOD-01 artefact needs its own human ratification and a store (new constitution kinds and a
   migration), so the prompts' "ratified only" rule holds. A person must decide this first.
   1x. **Other modules.** Add `CHAIN_SPECS` rows (and decide the data flow) for MOD-02, MOD-03, MOD-05
   and the Learning Engine.
   1a. **Make MOD-04's `draft-artefact` actually call the TB agent** named in the run input
   (Part 8.5, finding 3).
   1b. **Golden sets for live use.** Cases written for the stub executors expect stub behaviour;
   a live-calibrated set (reviewed by a person) is what turns 8.4 into a score.
2. **A real-model LLM judge for the eval harness.** `LlmJudge` in `packages/evals` is only a
   hook; scripts use the rule-based `ac-stub-judge`. Wire one through the gateway (rule 3),
   with the 50+ human-labelled cases OQ-016 requires.
3. **Wire the named provider slots.** `GROQ_*`, `OLLAMA_*`, `LM_STUDIO_*`, `DASHSCOPE_*`,
   `AI_PROVIDER` and `getProviderDefaults()` exist in `apps/gateway/src/config` but
   `buildAdapters()` ignores them; only `anthropic`, `openai`, `google` and `local` are live.
   This manual works around it with the `local` and `openai` adapters.
4. **Streaming/JSON-mode for small models.** The adapter does not request JSON-constrained
   output; adding `response_format` (where the provider supports it) would cut malformed
   replies from small models.
5. **Replace sample data** in the learner screen and the remaining teacher sections as real
   data sources arrive, so what you restyle matches what you ship.
6. **A one-command bootstrap** (`pnpm dev:up`) replacing Part 4–5. DEV_SETUP notes there is
   none today.
7. **`compose.apps.yml` inconsistency.** It names the routing variable `GATEWAY_ROUTING_CONFIG`
   (mapped to `ROUTING_CONFIG_PATH` inside the container) while `DEV_SETUP.md` and the gateway
   use `ROUTING_CONFIG_PATH` on the host. Both are right in their own place, but easy to mix up.

---

## Appendix — Sources for the free-tier figures

Free-tier quotas change; these were checked on 2026-10-23 from secondary sources and must be
confirmed on each provider's own page before you rely on them: Groq and Gemini free-tier
limits (third-party comparison pages disagree), GitHub Codespaces included usage (GitHub
Docs, "How use of GitHub Codespaces is measured"), Oracle Always Free Ampere A1 allowance
(Oracle Cloud Infrastructure Free Tier documentation).
