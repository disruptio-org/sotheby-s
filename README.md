# Sotheby's · AI Back Office

Implementation of the Claude Design prototype [`Sothebys AI Back Office.dc.html`](design/Sothebys%20AI%20Back%20Office.dc.html)
as a real React application. The original design file and the `support.js` runtime it imports are
kept under [`design/`](design/) as the reference source of truth.

The back office lets an operations team manage AI **agents**, reusable **skills**, multi-step
**workflows**, connected **apps**, **users**, **roles & permissions**, and LLM provider **settings**.
The whole interface is in Portuguese (pt-PT), exactly as designed.

## Stack

- **Vite 5** + **React 18** + **TypeScript 5.6** (strict, including `noUncheckedIndexedAccess` and
  `exactOptionalPropertyTypes`; project references split app and node configs)
- No UI framework and no CSS-in-JS — plain CSS with design tokens in `src/styles/tokens.css`
- No backend: all data is seeded in memory (see *Data* below)

## Getting started

```bash
npm install
```

```bash
npm run dev
```

Then open http://localhost:5173.

| Script | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | `tsc -b` then a production build into `dist/` |
| `npm run preview` | Serve the production build locally |
| `npm run typecheck` | Type-check only |

## Configuration

The prototype exposed two canvas props; they are promoted to build-time environment variables,
read in [`src/config.ts`](src/config.ts). Copy `.env.example` to `.env` to change them.

| Variable | Design prop | Default | Meaning |
| --- | --- | --- | --- |
| `VITE_START_LOGGED_IN` | `startLoggedIn` | `false` | Skip the sign-in screen and boot straight into the back office |
| `VITE_WORKFLOW_STEP_DELAY` | `workflowStepDelay` | `1000` | Milliseconds each workflow step stays in the "A executar" state (clamped to 300–2500) |

## Signing in

Sign-in is a demo flow, matching the design — **no credentials are checked**:

- Enter the e-mail of any **active** seeded user and you sign in as that user, with that user's role.
- Anything else (including an empty field) signs you in as **Mariana Costa**, *Administrador*.
- The password field is decorative; its value is ignored.

Signing in as **Ricardo Nunes** (*Consultor*) is the quickest way to see the permission gating: the
sidebar drops to the sections that role can view and every mutating control disappears.

## Data

Everything lives in memory and resets on reload — there is no API, no database and no persistence,
just like the prototype. Seed data (roles, users, skills, agents, workflows, settings) is in
[`src/domain/seed.ts`](src/domain/seed.ts); static catalogues (models, providers, knowledge files,
tool integrations, section copy) are in [`src/domain/catalogs.ts`](src/domain/catalogs.ts).

> The API key shown in settings (`sk-ant-api03-9f2Kv7`) is fake placeholder text carried over from
> the design — not a real secret.

## Architecture

```
src/
  config.ts            build-time knobs (the two design props) + timing constants
  domain/              framework-free model: types, permission catalogue, seed + static catalogues
  state/               useReducer store: types, pure reducer, pt-PT messages, React context provider
  components/          shell pieces shared by every screen (sidebar, header, drawer, dialog, toasts)
  screens/             one component per section, plus the login screen
  styles/              tokens → base → layout → components → screens (imported by index.css)
  utils/format.ts      number/plural/currency helpers
```

A few decisions worth knowing:

- **One store, one reducer.** [`src/state/reducer.ts`](src/state/reducer.ts) is pure: toasts, the
  confirm dialog and the workflow run are modelled as *data* (never callbacks), so every transition
  is reproducible. Side effects — the workflow step timer and toast auto-dismiss — live in
  `useEffect` inside [`src/state/store.tsx`](src/state/store.tsx).
- **Permissions are a catalogue, not scattered checks.** `PermissionKey` is
  `` `${SectionId}.${ActionId}` ``, and [`src/domain/permissions.ts`](src/domain/permissions.ts)
  drives both the roles matrix UI and every `can(...)` gate, so the two can never drift apart.
- **One drawer, five variants.** A single `DrawerState` with a flat field bag backs the agent,
  skill, user, workflow and role editors, mirroring the prototype's single-drawer behaviour.
- **Copy in one place.** Every user-facing action string is in
  [`src/state/messages.ts`](src/state/messages.ts).

### Deviations from the prototype

Small, deliberate, and all in the same direction — the prototype's own rules, enforced properly:

- Deleting a skill also removes it from agents' skill lists and from workflow steps, instead of
  leaving dangling references.
- Move-left / move-right on a workflow step are `disabled` at the ends rather than dimmed no-ops.
- If a role change strips view access to the section currently on screen, the app navigates to the
  first section that role *can* see.
