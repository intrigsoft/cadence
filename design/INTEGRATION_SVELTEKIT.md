# Cadence — SvelteKit Target & DioscHub Integration

This is the **implementation-architecture brief** for building Cadence as a real product on **SvelteKit**, with the **DioscHub assistant kit** embedded and a **DioscHub MCP server** acting on the user's behalf.

It supersedes the "suggested stack" notes elsewhere in this bundle: the prototype is React-via-Babel for convenience, but **the production target is SvelteKit**. Nothing in the design depends on React semantics — the component split, localStorage persistence, derived state, and state-as-routing all map cleanly (often more tersely) onto SvelteKit. Read `SPEC.md` for the domain and `API_CONTRACT.md` for the entity surface; read this for *how the pieces wire together*.

---

## 0. TL;DR of the architecture

```
                         ┌──────────────────────────────────────────────┐
                         │  SvelteKit app  (THE HOST)                    │
  Browser (user)         │                                              │
  ┌─────────────┐        │  Frontend                Backend             │
  │ Cadence UI  │◀──SSR──┤  +page.svelte / +layout  +page.server.js     │
  │             │        │  (load() + form actions) load() / actions    │
  │ ┌─────────┐ │        │                                              │
  │ │DioscHub │ │ trigger│  REST API           Auth boundary            │
  │ │assistant│─┼────────┼─▶ /api/* (+server.js) hooks.server.js         │
  │ │  kit    │ │  host   │  /api/dioschub/auth  (session ↔ bearer)      │
  │ └─────────┘ │ endpoint│        │                                     │
  └─────────────┘        └────────┼─────────────────────────────────────┘
        ▲                         │ mints + forwards auth artifacts
        │ "auth needed"           ▼
        │                    ┌──────────┐   tool calls carry artifacts   ┌────────────┐
        └────────────────────│ DioscHub │ ──────────────────────────────▶│ MCP server │
            backend tells     │   hub    │                               │ (yours)    │
            the kit           └──────────┘                               └─────┬──────┘
                                                                                │ Bearer artifact
                                                          ┌─────────────────────▼─────────┐
                                                          │ SvelteKit /api/* REST routes   │
                                                          │ hooks.server.js verifies token │
                                                          │ + scopes → DB mutation + audit │
                                                          └────────────────────────────────┘
```

**Three responsibilities the SvelteKit host owns:**
1. **Render the app + embed the assistant kit** (frontend).
2. **Expose the host auth endpoint** the kit triggers, which **mints auth artifacts bound to the verified session user** and forwards them to DioscHub.
3. **Expose a token-protected REST API** (`/api/*`) that the MCP server calls with those artifacts — with `hooks.server.js` as the single auth chokepoint enforcing the §4 permission model server-side.

The **MCP server is a separate, thin service**: it maps MCP tools → REST calls against the host API, attaching the artifacts it receives in each tool call. It holds no business logic of its own — the host API is authoritative.

---

## 1. Why SvelteKit fits Cadence

| Prototype construct (React) | SvelteKit equivalent | Note |
|---|---|---|
| Component files (`shell`, `kanban`, `carddetail`, …) | `.svelte` single-file components | Markup + style + logic co-located; near 1:1 port |
| `useState` / big `App` state tree | a few Svelte stores | server-owned data lives behind `load()`, not in stores |
| `useMemo` (`accessibleBoards`, `cardsByBoard`) | `$derived` / `$:` reactivity | terser |
| `useEffect` → `localStorage` persistence | server session + DB | persistence moves server-side; only ephemeral UI state stays client |
| `view` state object as router | file-based routes (`/b/[boardId]`, `/b/[boardId]/c/[cardId]`) | an upgrade — real URLs, deep links |
| `useTweaks` hook | **delete** | prototype harness only; not product code |
| hand-rolled HTML5 drag | `svelte-dnd-action` (or similar) | replace the prototype's `DropSlot`/`pos` shuffling |

**Adapter choice:** because this app has a database and a long-lived API, use **`@sveltejs/adapter-node`** (host it like any Node service / container) unless you have a specific edge/serverless host in mind (`adapter-vercel`, `adapter-cloudflare` also work). This is the main conceptual difference from Next.js, which is Vercel-native by default.

---

## 2. The two auth modes (one chokepoint)

`hooks.server.js` runs before every request and is where **both** auth modes are resolved. Branch on the path (and/or the presence of an `Authorization` header):

- **Browser / UI routes** → **session cookie** → resolves `locals.user` (the signed-in human).
- **`/api/*` machine routes** → **bearer artifact** (from the MCP server) → resolves `locals.client` (an agent acting *as* a user, with that user's scope).

```js
// src/hooks.server.js
export async function handle({ event, resolve }) {
  const { pathname } = event.url;

  if (pathname.startsWith('/api/')) {
    // Machine-to-machine: the MCP server presents an auth artifact
    const token = event.request.headers.get('authorization')?.replace('Bearer ', '');
    event.locals.client = await resolveArtifact(token); // → { userId, scopes, expiresAt } | null
  } else {
    // Browser: real SSO/session cookie → the signed-in human
    event.locals.user = await resolveSession(event.cookies.get('sid'));
  }

  return resolve(event);
}
```

> **Security invariant:** the permission model in `SPEC.md` §4 (board membership = access) is enforced **here and in every `+server.js`**, never in the browser. The prototype's client-side board filtering is UX only. Whether the actor is `locals.user` (human) or `locals.client` (agent-as-user), the *same* membership checks gate every read and write.

---

## 3. The DioscHub auth-artifact handshake (BYOA)

This is the flow the product demonstrates. The host never hands DioscHub the user's credentials — it mints **delegated, short-lived, permission-bound artifacts** tied to the verified session user.

**Sequence:**

1. The **DioscHub assistant kit** is embedded in the Cadence frontend as a web widget (a `<script>`/component dropped into the root layout).
2. When DioscHub's backend determines auth is needed, **it tells the kit**, and the kit **triggers a REST endpoint provided by the host** (`POST /api/dioschub/auth`).
3. That host endpoint **already knows who the user is** (the request carries the session cookie → `locals.user`). It **mints the auth artifacts** for that user and **calls DioscHub** with them.
4. DioscHub now holds artifacts scoped to the user. **Within tool calls, the hub passes the artifacts to the MCP server.**
5. The **MCP server formulates REST calls** to the host `/api/*`, attaching the artifact as a bearer token. `hooks.server.js` verifies it and scopes the action.

**The host endpoint (the trust handoff):**

```js
// src/routes/api/dioschub/auth/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ locals, fetch }) {
  // 1. Identity is the VERIFIED session user — never chosen by the caller.
  const user = locals.user;
  if (!user) return new Response('Unauthorized', { status: 401 });

  // 2. Mint delegated artifacts bound to THIS user. Short-lived, scope = the
  //    user's board memberships. Credential-blind: no password/SSO secret inside.
  const artifacts = await mintDelegatedArtifacts({
    userId: user.id,
    scopes: await boardScopesFor(user.id), // e.g. ['board:b_sprint', 'board:b_roadmap']
    ttlSeconds: 600,
  });

  // 3. Host calls DioscHub with the artifacts (server-to-server).
  const res = await fetch(DIOSCHUB_CONNECT_URL, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'authorization': `Bearer ${DIOSCHUB_APP_KEY}` },
    body: JSON.stringify({ artifacts }),
  });
  if (!res.ok) return new Response('Upstream auth failed', { status: 502 });

  return json(await res.json());
}
```

**Properties to preserve (these ARE the demo):**
- **Credential-blind** — artifacts never contain the user's credentials; only a delegated, signed reference + scopes.
- **Permission-bound** — `scopes` is derived from `board.memberIds`; the artifact can do **nothing the user can't**.
- **Short-lived** — small TTL; the kit re-triggers `/api/dioschub/auth` to refresh.
- **Verified identity** — minted only from `locals.user`, which `hooks.server.js` established from the real session. The browser/widget cannot forge or choose the identity.
- **Audited** — when the MCP server later mutates via `/api/*`, the endpoint writes `Activity{ kind:"agent", actorUserId: <the artifact's userId> }` (see §5).

### Artifact format — decide with DioscHub
`mintDelegatedArtifacts` is the one piece whose internals depend on a **DioscHub contract**, not SvelteKit. Pick one with them:
- **Opaque token** → store server-side (Redis/DB) keyed to `{ userId, scopes, exp }`; `resolveArtifact` looks it up. Easiest to revoke.
- **Signed JWT** → self-contained `{ sub: userId, scopes, exp }` signed with a host key; `resolveArtifact` verifies the signature. No lookup, but revocation needs a denylist.
- **Exchange code** → short code the MCP server swaps for a token at a `/api/token` endpoint (OAuth2-ish). Use if DioscHub expects an OAuth client-credentials / token-exchange shape.

Whatever the shape, `resolveArtifact(token)` in `hooks.server.js` must return `{ userId, scopes, expiresAt }` or `null`.

---

## 4. The host REST API (what the MCP server calls)

`/api/*` is the SvelteKit-native REST surface, defined with `+server.js` files. It mirrors `API_CONTRACT.md` — the difference here is **how** it's expressed in SvelteKit and that it is reached with **artifacts**, not a session cookie.

```js
// src/routes/api/boards/[boardId]/cards/[cardId]/move/+server.js
import { json } from '@sveltejs/kit';

export async function POST({ params, request, locals }) {
  const actor = locals.client;                         // agent-as-user (or locals.user for UI)
  if (!actor) return new Response('Unauthorized', { status: 401 });

  // §4 permission model — board membership is the gate, enforced HERE.
  if (!actor.scopes.includes(`board:${params.boardId}`))
    return new Response('Not found', { status: 404 }); // 404, don't leak existence

  const { toListId, toIndex } = await request.json();
  const result = await moveCard(params.cardId, toListId, toIndex);

  // Audit — non-negotiable for agent actions.
  await appendActivity(params.cardId, {
    kind: actor.isAgent ? 'agent' : 'move',
    actorUserId: actor.userId,
    text: `moved this card to ${result.toListName}`,
  });

  return json(result);
}
```

**Suggested `/api/*` route tree** (full payloads in `API_CONTRACT.md`):

```
src/routes/api/
  dioschub/auth/+server.js          POST   ← the artifact-mint handoff (§3)
  token/+server.js                  POST   ← optional: exchange-code → token
  me/workspace/+server.js           GET    bootstrap (scoped boards + counts)
  boards/+server.js                 GET POST
  boards/[boardId]/+server.js       GET PATCH DELETE
  boards/[boardId]/members/+server.js          GET POST
  boards/[boardId]/members/[userId]/+server.js DELETE
  boards/[boardId]/lists/+server.js            POST
  boards/[boardId]/cards/+server.js            GET POST
  cards/[cardId]/+server.js                    PATCH DELETE
  cards/[cardId]/move/+server.js               POST
  cards/[cardId]/members/+server.js            POST
  cards/[cardId]/members/[userId]/+server.js   DELETE
  cards/[cardId]/labels/+server.js             POST
  cards/[cardId]/checklist/+server.js          POST
  cards/[cardId]/comments/+server.js           POST
  checklist/[itemId]/+server.js                PATCH DELETE
  search/cards/+server.js           GET
  # workflow + time-tracking layer (see SPEC + API_CONTRACT):
  boards/[boardId]/workflow/+server.js         GET PATCH   (admin-gated)
  boards/[boardId]/roles/+server.js            GET POST
  cards/[cardId]/time/+server.js               GET POST    (timers + manual entries)
```

> **UI vs API:** the browser-facing pages can use **`load()` + form actions** (progressively enhanced, no client fetch needed) for the human flows, while `/api/*` serves the MCP server. Both paths hit the same domain functions (`moveCard`, `appendActivity`, …) so logic isn't duplicated — only the auth source differs (`locals.user` vs `locals.client`).

---

## 5. MCP server (separate service)

Keep it **thin and separate** from the SvelteKit app. It exposes MCP tools to DioscHub and, on each call, makes an HTTP request to the host `/api/*` with the artifact it was handed.

```js
// mcp-server: tool implementation sketch
server.tool('move_card', moveCardSchema, async ({ cardId, toListId, toIndex }, { artifacts }) => {
  const res = await fetch(`${HOST_API}/api/cards/${cardId}/move`, {
    method: 'POST',
    headers: {
      'authorization': `Bearer ${artifacts.token}`, // the user-scoped artifact
      'content-type': 'application/json',
    },
    body: JSON.stringify({ toListId, toIndex }),
  });
  if (res.status === 404 || res.status === 403) {
    return { content: [{ type: 'text', text: "You don't have access to that board." }] }; // refusal
  }
  return { content: [{ type: 'text', text: 'Moved.' }] };
});
```

**Tool surface** (from `SPEC.md` §5): `list_boards`, `get_board`, `search_cards`, `create_card`, `move_card`, `assign_card`, `comment_card`, `summarize_board`. Each is a thin wrapper over the matching `/api/*` route. Extend with workflow/time tools (`get_workflow`, `log_time`) if you want the assistant to reach those surfaces.

**Non-negotiables the MCP layer inherits from the host:**
- **Membership enforced server-side** — the MCP server does *not* decide access; it just relays. The host `/api/*` returns `404`/`403` for out-of-scope boards and the tool turns that into a **refusal** ("You don't have access to that board") — never leaking contents.
- **Audit on every mutation** — handled by the host endpoints writing `Activity{ kind:"agent", actorUserId }`. The card UI renders these with the spark avatar + mono `acting as {email}` chip (`ActivityRow` in `carddetail.jsx`). This is the visible compliance story.

**Where it runs:** a standalone Node process is the cleanest separation (host owns DB + REST; MCP is a stateless relay). You *could* expose MCP directly from SvelteKit endpoints, but separating them keeps the trust boundary obvious and lets the MCP server scale/deploy independently.

---

## 6. Suggested project layout

```
cadence/                              # the SvelteKit host
  svelte.config.js                    # adapter-node
  src/
    hooks.server.js                   # auth chokepoint (session + artifact)
    lib/
      server/
        db.js                         # Drizzle/Prisma — schema mirrors SPEC §3 + workflow layer
        auth.js                       # resolveSession, resolveArtifact, mintDelegatedArtifacts
        permissions.js                # board-membership + stage×role checks (SPEC §4)
        domain/                       # moveCard, appendActivity, logTime… (shared by UI + API)
      components/                     # ported .svelte: Sidebar, TopBar, CardTile, CardDetail,
                                      #   AssistantPanel, WorkflowDesigner, TimeReport…
      stores/                         # ephemeral UI state only (open modal, drafts, panel open)
      styles/tokens.css               # lifted verbatim from prototype/styles.css
    routes/
      +layout.svelte                  # chrome + <DioscHubAssistantKit/> widget mount
      +layout.server.js               # load() → /me/workspace bootstrap
      login/+page.svelte
      +page.svelte                    # boards home
      me/+page.svelte                 # my cards
      b/[boardId]/+page.svelte        # kanban  (+page.server.js: load board, form actions)
      b/[boardId]/c/[cardId]/+page.svelte   # card detail modal route
      b/[boardId]/workflow/+page.svelte     # admin workflow designer
      api/…                           # the REST surface from §4

mcp-cadence/                          # separate MCP server (thin relay over the host API)
  src/tools/*.js
```

**Seed the database** from `prototype/data.js` + `prototype/workflow-data.js` (boards, users, memberships, cards, roles, workflow permissions, time entries). They are **fixtures for the DB seed**, never frontend constants — see the top rule in `README.md`.

---

## 7. Build order

1. **DB + domain layer** — schema per `SPEC.md` §3 (incl. the workflow/role/time-tracking layer from `workflow-data.js`); seed from the fixtures. Pure functions in `lib/server/domain`.
2. **`hooks.server.js` auth** — session resolution first; stub `resolveArtifact` returning a fixed user so you can build before DioscHub is wired.
3. **Host pages** — port `styles.css`, build chrome + boards → board → card with `load()` + form actions and server-enforced permissions. Real DnD lib.
4. **`/api/*` REST** — the machine surface; verify with curl + a bearer stub.
5. **DioscHub handshake** — implement `mintDelegatedArtifacts` / `resolveArtifact` against the agreed artifact format; embed the assistant kit; wire `/api/dioschub/auth`.
6. **MCP server** — thin tool wrappers over `/api/*`; confirm audit rows + refusal behavior end-to-end.

---

## 8. Open contract questions for DioscHub (resolve early)

- **Artifact format** — opaque token vs signed JWT vs exchange code (§3)? Dictates `mint`/`resolve`.
- **Kit ↔ host trigger** — exact request the assistant kit makes to `/api/dioschub/auth` (method, body, expected response shape).
- **Hub → MCP artifact passing** — how the hub injects artifacts into tool-call context (header, env, per-call argument).
- **Refresh** — does the kit re-trigger the host endpoint on expiry, or is there a refresh exchange?
- **Scope vocabulary** — string scheme for board scopes (`board:<id>`) and any role/admin scopes for the workflow designer + admin-gated routes.
