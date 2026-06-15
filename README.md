# Cadence

A Trello-style task-management app — the **DioscHub** sample. It's a believable kanban product (boards → lists → cards) for a fictional company, Northwind, built to showcase **Bring Your Own Auth**: every action runs with the signed-in user's exact permissions, the assistant is credential-blind, and every action is logged under the real user.

This repo is built in two parts:

1. **The standalone app** (this phase) — the full product, with **server-enforced permissions** and a real **audit trail**, running entirely on its own. No external services required.
2. **The DioscHub integration** (later) — the embedded assistant kit + an MCP relay acting as the user. The seam is already in place (`locals.actor`); the integration is additive.

The design brief, prototype, screenshots, and API contract live in [`design/`](./design).

## How data works (no database)

There is **no database**. The backend owns all state in memory, isolated **per device**: each browser gets an opaque cookie mapped to its own fresh deep-clone of the seed (`src/lib/server/sandbox/`). Mutations are real and server-side, but scoped to that device — like a personal sandbox. A server restart resets every sandbox to seed; that's intentional for a public demo.

The frontend owns **no** domain data — every board, list, and card is fetched from and mutated through the backend.

## Stack

- **SvelteKit** + `@sveltejs/adapter-node`
- TypeScript, Vitest
- Design tokens lifted verbatim from the prototype (`src/app.css`)

## Quickstart

```bash
npm install
npm run dev        # http://localhost:5173
```

```bash
npm test           # run the unit tests (permissions + sandbox isolation)
npm run check      # svelte-check / typecheck
npm run build && npm start   # production (adapter-node)
```

## Project layout

```
src/
  hooks.server.ts            # device-cookie + locals.actor chokepoint
  app.css                    # design tokens (lifted from the prototype)
  lib/server/
    types.ts                 # domain model (SPEC §3 + workflow layer)
    sandbox/seed.ts          # the seed (port of design/prototype/*.js)
    sandbox/store.ts         # per-device in-memory store (the "DB" stand-in)
    permissions.ts           # board membership + workflow stage×role (SPEC §4)
    domain.ts                # operations shared by UI + API; audit on mutate
    __tests__/               # permissions + sandbox isolation tests
  routes/                    # SvelteKit pages + (later) /api/*
design/                      # the handoff bundle: brief, prototype, screenshots
```

## License & usage

**MIT** — see [LICENSE](./LICENSE). Use it for anything, including commercial work: clone it, learn from it, adapt it to build your own DioscHub integration. The only thing not granted is the **Cadence / Northwind / DioscHub names and logos** (trademarks of their owners) — don't pass your fork off as those products.
