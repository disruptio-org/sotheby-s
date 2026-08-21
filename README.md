# Sotheby's International Realty · AI Back Office

Internal platform for building, sequencing and running the AI agents behind the
client experience. Agents hold a model and a system prompt, skills are the
reusable capabilities, and workflows chain skills into an end-to-end run that a
real provider executes.

Interface copy is European Portuguese throughout.

## Layout

```
packages/domain   Shared vocabulary — DTOs, permission catalogue, zod schemas,
                  model/pricing tables. Imported by both the API and the web app,
                  so the two can never drift.
apps/api          Fastify + Prisma + PostgreSQL. Sessions, RBAC, run queue,
                  provider adapters, SSE progress stream.
apps/web          React + Vite single-page app.
```

Two conventions run through the whole codebase:

- **Money is always integer cents.** Nothing stores or passes euros as a float.
- **Enum values are canonical UPPERCASE** in the database and on the wire
  (`ACTIVE`, `SUCCEEDED`, `CONTENT`). The Portuguese labels live in
  `packages/domain/src/catalogs.ts` and are applied only at render time.

## Getting started

Requires Node 20.11 or newer and a PostgreSQL database.

### 1. Install

```bash
npm install
```

### 2. Point at a database

Either run Postgres locally with the bundled compose file:

```bash
npm run db:up
```

…which listens on **5433** (not 5432, so it will not clash with an existing
local Postgres), or use a hosted database such as [Neon](https://neon.tech) and
copy its connection string.

The same compose file runs [Mailpit](https://mailpit.axllent.org) as the
development mail server. It accepts every message and delivers none of them —
read what the platform sent at **http://localhost:8025**. Nothing leaves the
machine.

### 3. Configure the API

```bash
cp apps/api/.env.example apps/api/.env
```

Then edit `apps/api/.env`:

| Variable | Notes |
| --- | --- |
| `DATABASE_URL` | Postgres connection string. Hosted providers usually require `?sslmode=require`. |
| `SESSION_SECRET` | Signs the session cookie. 32+ random characters. |
| `ENCRYPTION_KEY` | Encrypts provider API keys at rest. Base64 that decodes to exactly 32 bytes. |
| `WEB_ORIGIN` | Origin allowed to call the API with credentials. `http://localhost:5173` in development. |
| `RUN_CONCURRENCY` | How many workflow runs execute at once. |
| `RUN_STEP_TIMEOUT_MS` | Per-step ceiling before the run is aborted. |
| `RUN_SIMULATE` | `true` runs workflows against a stub instead of a real provider. |
| `SMTP_HOST` / `SMTP_PORT` | Outgoing mail. `localhost:1025` is the bundled Mailpit. |
| `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASS` | TLS and credentials, for a real relay. |
| `MAIL_FROM` | The From address on invitations. |
| `INVITE_TTL_HOURS` | How long an invitation link stays good. 72 by default. |
| `SEED_PASSWORD` | Password given to the seeded users. |

Generate the two secrets:

```bash
node -e "console.log('SESSION_SECRET=' + require('crypto').randomBytes(48).toString('base64url'))"
```

```bash
node -e "console.log('ENCRYPTION_KEY=' + require('crypto').randomBytes(32).toString('base64'))"
```

`ENCRYPTION_KEY` is not rotatable in place — change it and every stored provider
key becomes undecryptable, and has to be pasted in again.

### 4. Create the schema and seed it

```bash
npm run db:migrate
```

```bash
npm run db:seed
```

The seed is idempotent: three roles, four users, six skills, three agents and
three workflows, matching the design. It seeds **no** API keys.

### 5. Run it

```bash
npm run dev
```

The API listens on `http://127.0.0.1:3001` and the web app on
`http://localhost:5173`. Vite proxies `/api` to the API, so the browser is
always same-origin — no CORS round-trip and no buffering on the SSE stream.

## Seeded accounts

All active accounts share the `SEED_PASSWORD` from `.env` (`back-office-2026`
unless changed). The seed prints it on every run.

| Account | Role | Sees |
| --- | --- | --- |
| `mariana.costa@sothebysrealty.pt` | Administrador | Everything |
| `duarte.almeida@sothebysrealty.pt` | Gestor de Operações de IA | Platform, no administration |
| `sofia.mendes@sothebysrealty.pt` | Consultor | Read-only view of agents, skills and workflows |
| `ricardo.faria@sothebysrealty.pt` | Consultor | Invited — has no password until the invitation is accepted |

## Invitations

Creating a user on the Utilizadores screen sends them an invitation. Open
**http://localhost:8025**, follow the link in the message, and set a password:
that signs the new account in and marks it active. The link is single-use, good
for `INVITE_TTL_HOURS`, and **Reenviar convite** retires whatever link went out
before it. No password is ever shown to the administrator.

## Running workflows for real

Out of the box `RUN_SIMULATE=true`, so runs complete against a stub and cost
nothing. To use a real provider:

1. Set `RUN_SIMULATE=false` and restart the API.
2. Sign in as an administrator, open **Definições**, choose the provider, paste
   the API key and save it. Keys are encrypted with `ENCRYPTION_KEY` before they
   touch the database and are never sent back to the browser — the client only
   ever learns whether a key exists.
3. **Testar** verifies the key against the provider before you rely on it.

Anthropic, OpenAI and Google Gemini are supported. Every step's token usage is
recorded and priced, and spend is checked against both the agent's monthly
ceiling and the platform budget — before each step, not just at the start.

> **Verify the pricing table.** The per-million-token rates in
> `packages/domain/src/catalogs.ts` are estimates. Check them against each
> provider's current price list before treating the cost figures as accurate.

## Permissions

Every action in the UI is an individual permission (`agents.create`,
`workflows.run`, `roles.edit`, …). Permissions compose into roles, roles are
assigned to users. The client hides what a role cannot do; the server re-checks
the same permission on every route, so hiding is convenience, not security.

Editing a role's permissions revokes every session held by that role, so nobody
keeps a grant they have just lost.

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Builds the shared package, then runs API and web together |
| `npm run build` | Builds all three workspaces |
| `npm run typecheck` | Type-checks all three workspaces |
| `npm run db:up` / `db:down` | Starts / stops the bundled Postgres container |
| `npm run db:migrate` | Applies migrations (development) |
| `npm run db:seed` | Seeds demo content |
| `npm run db:reset` | Drops, re-migrates and re-seeds |
| `npm run db:studio` | Opens Prisma Studio |
