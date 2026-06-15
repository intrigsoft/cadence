# Handoff: Cadence — Task Management for Dioschub

> A Trello-style kanban app that serves as a **sample application for Dioschub** — the enterprise AI layer that embeds into existing apps with **Bring Your Own Auth** (the assistant acts with the signed-in user's exact permissions, is credential-blind, and logs every action under the real user).

This bundle is everything a developer needs to build Cadence in a real codebase with a real backend.

---

## ⛔️ The single most important rule: nothing is hardcoded in the frontend

The prototype ships with a seed dataset (`prototype/data.js`) **purely so the HTML demo can run without a server.** It is a fixture, not a spec for frontend state.

In the production build, **the frontend owns no data.** Every board, list, card, label, user, membership, comment, and activity entry is **fetched from your backend API** and **mutated through it**. The frontend is a pure rendering + interaction layer over server state.

Concretely:
- ❌ Do **not** port `data.js` into the app as constants, default state, mock arrays, or fallbacks.
- ❌ Do **not** compute permissions/visibility on the client as the source of truth (the prototype does this for demo only — see below).
- ✅ **Do** load `data.js` once, if you like, as **seed/fixture data for the backend's database** (or as the shape reference for your API responses).
- ✅ **Do** treat every list in the UI as "empty until the API responds," with real loading/empty/error states.

**Permission enforcement lives on the server.** The prototype filters boards by membership in the client because it has no backend — that is UX convenience, **not** security. In production, the API must reject any read/write to a board the authenticated user is not a member of. The client may still hide inaccessible things for UX, but it must never be the gate.

See **`API_CONTRACT.md`** for the full endpoint surface that replaces `data.js`.

---

## About the design files

The files in `prototype/` are **design references created in HTML/React-via-Babel** — a high-fidelity prototype showing the intended look and behavior. They are **not** production code to copy verbatim. (React-via-Babel is a prototyping convenience only; nothing in the design depends on React.)

Your task: **recreate these designs in the target environment** using its established patterns and libraries.

> **Target framework: SvelteKit.** This build targets **SvelteKit** (the host owns both the frontend and the backend/REST API, Next.js-style). The component split, localStorage persistence, derived state, and state-as-routing all map cleanly — often more tersely — onto SvelteKit. Use `@sveltejs/adapter-node`, a real DnD lib (e.g. `svelte-dnd-action`) in place of the hand-rolled drag code, and a server data layer (`load()` + form actions + `/api/*` endpoints) over the API in `API_CONTRACT.md`. **Read `INTEGRATION_SVELTEKIT.md` for the full host architecture and the DioscHub auth-artifact / MCP wiring — it is the primary architecture doc for this build.**

The prototype's CSS (`prototype/styles.css`) **is** production-grade and can be lifted directly — it's the design system (see Design Tokens below).

## Fidelity

**High-fidelity.** Final colors, typography, spacing, radii, shadows, and interactions are all settled. Recreate the UI pixel-faithfully using the tokens in `styles.css`. The layout, component anatomy, and copy in the prototype are intentional.

---

## Companion documents in this bundle

| File | What's in it |
|---|---|
| **`README.md`** (this file) | Orientation, fidelity, screen-by-screen UI breakdown, design tokens. |
| **`SPEC.md`** | Product narrative, the **data model**, the **permission model**, the **Dioschub assistant / MCP integration**, and seeded sample data. Read this for the *why* and the domain logic. |
| **`INTEGRATION_SVELTEKIT.md`** | **The target architecture.** SvelteKit host structure, the two auth modes (`hooks.server.js`), the **DioscHub auth-artifact handshake** (assistant kit → host endpoint → mint artifacts → hub → MCP server), the `/api/*` route tree, and the MCP server wiring. Read this first for *how it all connects*. |
| **`API_CONTRACT.md`** | The REST surface the frontend + MCP server talk to — every action mapped to an endpoint, with request/response shapes. This is what replaces `data.js`. |
| **`screenshots/`** | High-fidelity captures of all eight screens (`screenshots/README.md` indexes them). Use to keep the build pixel-synced. |
| **`prototype/`** | The runnable HTML prototype. Open `Cadence.html` to interact with it. |

---

## Screens / Views

The app is a single-page experience with five primary surfaces. Persistent chrome: a **dark left sidebar** + a **top bar**, with a **docked assistant panel** on the right. The main column swaps between Home, Board, and My Cards. Screenshots of every screen are in **`screenshots/`** (indexed in `screenshots/README.md`).

### 1. Login (`Login`, `prototype/login.jsx`)
- **Purpose:** product-true entry point. Establishes identity.
- **Layout:** two-pane. Left (`42%`, min `380px`) is dark ink (`--ink-900`) carrying the BYOA brand story; right is the sign-in column, centered, max `420px` wide.
- **Components:**
  - Left panel: `Cadence` wordmark (top); headline *"You bring the identity. We inherit the permissions."* in `--font-display` 33px/600; three trust bullets (Credential-blind, Permission-scoped, Fully audited); "Secured by Dioschub" pill.
  - Right panel: workspace badge ("Northwind workspace" + "Sign in to Cadence"); **Continue with Northwind SSO** button (dark, `--ink-900`); divider; email + password fields (decorative — the real SSO/credential path); disabled **Sign in**.
  - **Sandbox identity picker** (a bordered card, tagged `SANDBOX` in amber): a list of the seeded users, each a row with avatar, name, `RoleBadge`, mono email + board count, and an arrow. Clicking signs in as that user.
- **Production note:** the SSO/email path is the real one. The **sandbox picker is demo-only and must be removed in production** — identity comes from authenticated SSO/session.

### 2. Boards Home (`BoardsHome`, `prototype/boards.jsx`)
- **Purpose:** landing after sign-in; pick a board.
- **Layout:** centered column, max `1080px`, `40px` padding. Hero (date, greeting headline, summary line) → "Your boards" header row with a **New board** button → responsive grid (`repeat(auto-fill, minmax(264px, 1fr))`, `16px` gap) of board cards + a dashed **New board** tile → a dashed "N more boards you don't have access to" note.
- **`BoardCard`:** `16px` radius, white surface, `--shadow-card` (→ `--shadow-pop` on hover, lifts `-3px`). An `86px` gradient cover (from `board.accent` → darkened), a "Private" pill when applicable, then title (`--font-display` 17px/600), subtitle, and a footer with `AvatarStack` + card count.
- **The hidden-boards note** is a deliberate BYOA cue — it shows the *count* of inaccessible boards, never their names.

### 3. Kanban Board (`BoardView`, `prototype/kanban.jsx`)
- **Purpose:** the core workspace — lists of cards.
- **Layout:** board header (accent bar, title, Private pill, subtitle, member stack, Share) over a horizontally-scrolling row of lists (`14px` gap, `28px` padding).
- **`List`:** `272px` wide, `--surface-2` well, `14px` radius. Header (name + mono count chip + overflow menu), scrollable card area, and an inline "Add a card" composer at the foot. An **`AddListComposer`** ("Add a list") sits after the last list.
- **`CardTile`:** white, `11px` radius, `--shadow-card`. Optional label chips (color tints), title (13.5px/500), and a meta row: due chip, checklist count, comment count, a **"Dioschub" badge** when the assistant has touched the card, and an assignee `AvatarStack`. Draggable between/within lists with a visible insertion line (`DropSlot`) and a target-list ring.

### 4. Card Detail (`CardDetail`, `prototype/carddetail.jsx`)
- **Purpose:** full card view + editing. Modal over the board.
- **Layout:** centered modal, max `820px`, `18px` radius, with a `6px` accent strip on top. Two columns: main content (breadcrumb, title, labels, **editable description**, **checklist** with progress bar + add/remove, **activity feed**) and a `230px` right sidebar (Assignees, Labels, Due date, "Add to card" actions).
- **All sidebar actions are functional**, driven by anchored `Popover`s: assign/unassign board members, toggle labels, set/clear a due date (native date input), add/remove checklist items, edit the description, post comments.
- **`ActivityRow` is the audit surface:** assistant actions render with the spark avatar, "Dioschub Assistant …", and a mono `acting as {email}` chip. This is the visible compliance story — preserve it exactly.

### 5. My Cards (`MyCards`, `prototype/app.jsx`)
- **Purpose:** everything assigned to the signed-in user, grouped by board.
- **Layout:** centered column max `760px`; per-board groups, each a list of compact card rows (label dots, title, list name, due chip) that open the card detail.

### 6. Workflow Designer (`WorkflowDesigner`, `prototype/workflow.jsx`) — admin-only
- **Purpose:** a graphical pipeline editor where **stages ARE the board's lists**. Admins lay out stages on a canvas, draw edges to document flow, and — critically — set **per-stage × per-role permissions** (`pick` / `drop` / `work`) and **per-role time-tracking eligibility**. The permissions here are **enforced** by the board; the edges are documentation only.
- **Layout:** draggable node canvas (nodes `190×78`, snap-to-10 grid, SVG edges with hover-to-delete) + an inspector panel with `stage` / `roles` tabs. Project-scoped **roles** (designed by admins, with colors) and **role assignments** (user → role) live alongside the workflow.
- **Note:** this is the lever behind the BYOA story at the *stage* level — a role without `work` on a stage can't start timers or act on its cards. Gating logic is plain data (`board.workflow.permissions`); enforce it **server-side** in production.

### 7. Time Tracking (`prototype/timetrack.jsx`)
- **Purpose:** live timers, manual time logging, per-card time chips, and a board-level time report.
- **Components:** `TimeChip` (passive, on card tiles) and `TimerChip` (interactive play/pause — pausing logs the elapsed minutes as a `timeEntry`); a manual-log popover; a board report aggregating `card.timeEntries` by user/role/stage.
- **Eligibility** is `role × stage`, defined in `board.workflow.tracking` — only roles permitted to `work` a stage may track time there. Timers persist across reload in the prototype (`localStorage`); in production they are server-owned.

### Persistent chrome
- **Sidebar** (`Sidebar`, `prototype/shell.jsx`): dark (`--ink-900`), `248px`. Workspace switcher (Northwind), "All boards" / "My cards" nav, a permission-scoped board list (only the user's boards, each with accent dot + lock for private), a "+" to create a board, and a "Secured by Dioschub" badge pinned to the foot.
- **Top bar** (`TopBar`): breadcrumb (left), card search, notifications bell, **account menu**, and the **Assistant** toggle.
- **Account menu** (`AccountMenu`): signed-in identity (name/email/role/board count), Account settings, **Sign out**, and the sandbox-only **Switch demo identity** expander (remove in production).
- **Assistant panel** (`AssistantPanel`, `prototype/assistant.jsx`): docked right rail, dark ink to signal "a separate secure layer." Header shows the **operating-as identity** + security badges; below is the conversation and input. In the prototype the AI is a stub — wire the real assistant per `SPEC.md` §5.

---

## Interactions & behavior

- **Auth:** Login sets the active session; Sign out returns to Login. Production = real SSO/session.
- **Drag & drop:** cards move between and within lists; insertion line + target-list highlight; reorder persists via `pos`. Use a real DnD lib in production.
- **Inline composers:** "Add a card" / "Add a list" (Enter to submit, Esc to cancel); checklist item add.
- **Popovers:** click-outside + Esc to dismiss; anchored, right-aligned in the card sidebar so they open into the modal.
- **Card modal:** Esc or backdrop click closes; checklist toggles animate the progress bar; comments append to the activity feed as the current user.
- **Toasts** (`Toaster`): bottom-center, auto-dismiss ~4.2s; used for sign-in, identity switch, and access-denied.
- **Search:** filters cards on the active board by title / description / label.
- **Motion:** staggered `fadeUp` entrances; card hover lift; assistant panel width transition (`.34s`); toast pop. Respect `prefers-reduced-motion`; ensure resting states are visible without animation.

## State management (production)

All of the following are **server-owned**; the client holds only a cache + ephemeral UI state:
- **Session/identity** — from auth; drives every scoped request.
- **Server data** — boards, lists, cards, labels, users, memberships, comments, activity. Fetch via the API; mutate via the API; reflect the response. Use optimistic updates with rollback for drag/toggle if desired, but the server is authoritative.
- **Ephemeral UI state only** (safe to keep client-side): which modal/popover is open, composer drafts, search query, assistant panel open/closed, current route.

Do **not** keep boards/cards/etc. in client constants. See `API_CONTRACT.md`.

---

## Design Tokens

All defined in `prototype/styles.css` as CSS custom properties — **lift this file directly.** Highlights:

**Color**
- Canvas `--canvas: #F4F1EA` (warm paper) · `--surface: #FFFFFF` · list wells `--surface-2: #ECEAE2` · `--surface-3: #E4E1D7` · `--paper-edge: #E2DED3`
- Ink `--ink: #1A1814` · `--ink-2: #56524B` · `--ink-3: #8C887F` · lines `--line: #E3DFD5` / `--line-2: #D6D1C4`
- Brand `--brand: #4B3FE4` · `--brand-700: #3A2FC0` · `--brand-100: #E7E4FB` · `--brand-tint: #EFEDFB`
- Dark chrome `--ink-900: #1A1814` → `--ink-800: #2A2620`, `--line-dark: #393227`; on-dark text `--ink-on-dark: #F4F1EA` / `--ink-on-dark-2: #B7B0A1` / `--ink-on-dark-3: #847D6E`
- Assistant accent `--beam: #8C7DFF` · `--beam-soft: #6B5CF0`
- **Label palette** (desaturated): bug `#E05A4F` · feature `#3E78D9` · design `#8A5BD6` · research `#E0A33E` · infra `#3FA66A` · ios `#0E8C7F` · api `#4B3FE4` · urgent `#C0392B` · growth `#C2410C`

**Typography** (Google Fonts)
- Display / wordmark / headings: **Bricolage Grotesque**
- UI / body: **Hanken Grotesk**
- Mono (emails, audit chips, counts): **JetBrains Mono**
- Scale: page H1 32–38 · board title 23 · card-detail title 25 · section heads 14/700 · card title 13.5 · body 13.5–14 · meta 11–12. Min UI text ~11px.

**Shape & depth**
- Radii `--r-sm: 7` / `--r-md: 10` / `--r-lg: 14` / `--r-xl: 20`px
- Shadows `--shadow-card` / `--shadow-pop` / `--shadow-drag` (defined in `styles.css`)
- Subtle paper grain on the canvas via the `.grain` class (inline SVG noise)

## Assets

No external image assets — all iconography is inline SVG (`Icons` in `prototype/helpers.jsx`, a stroke set you can replace with your icon library), and avatars are initials-on-color. Fonts load from Google Fonts (swap for self-hosted in production). The Northwind "N" mark and the Cadence/Dioschub wordmarks are CSS/SVG, not raster files.

## Files (prototype/)

| File | Contents |
|---|---|
| `Cadence.html` | Entry point; loads fonts, `styles.css`, React/Babel, and the JSX modules in order. |
| `styles.css` | **Design tokens + base styles. Production-grade — lift directly.** |
| `data.js` | **Seed/fixture data only.** Use for the backend DB seed or as response-shape reference — never as frontend constants. |
| `helpers.jsx` | Icons, `Avatar`/`AvatarStack`, date helpers (`dueMeta`, `timeAgo`). |
| `login.jsx` | `Login` screen. |
| `shell.jsx` | `Sidebar`, `TopBar`, `AccountMenu`, `RoleBadge`, `Toaster`, `Wordmark`. |
| `boards.jsx` | `BoardsHome`, `BoardCard`, `NewBoardTile`, `NewBoardModal`. |
| `kanban.jsx` | `BoardView`, `List`, `CardTile`, `DueChip`, `AddListComposer`. |
| `carddetail.jsx` | `CardDetail`, `Popover`, `CommentRow`, `ActivityRow`, sidebar actions. |
| `assistant.jsx` | `AssistantPanel` (embedded Dioschub shell). |
| `app.jsx` | `App` root: routing, mutations, scoping, `MyCards`. **The mutation handlers here show intended behavior — in production each becomes an API call.** |
| `workflow.jsx` | `WorkflowDesigner` (admin-only): the stage canvas, edges, and per-stage × role permission + tracking-eligibility editor. |
| `timetrack.jsx` | Time tracking: `TimeChip`, `TimerChip`, manual-log popover, board time report. |
| `workflow-data.js` | **Seed/fixture only.** Decorates `CADENCE_DATA` with `board.roles`, `roleAssignments`, `board.workflow` (nodes/edges/permissions/tracking) and `card.timeEntries`. |
| `tweaks-panel.jsx` | **Prototype harness only — do NOT port.** Drives the in-preview tweak controls; has no production equivalent. |

---

## Build order (suggested)

> Full SvelteKit-specific build order, file layout, and the DioscHub/MCP wiring are in **`INTEGRATION_SVELTEKIT.md`**. High-level:

1. **Backend first** — model + endpoints per `SPEC.md` §3 and `API_CONTRACT.md` (incl. the workflow/role/time-tracking layer from `workflow-data.js`), with server-enforced permissions (`SPEC.md` §4). Seed from `data.js` + `workflow-data.js`.
2. **Auth** — `hooks.server.js` with two modes (session for the UI, bearer **auth artifacts** for `/api/*`); the DioscHub artifact handshake per `INTEGRATION_SVELTEKIT.md` §3.
3. **Frontend shell** — port `styles.css`, build the chrome (sidebar, top bar, account menu) against the API; embed the DioscHub assistant kit in the root layout.
4. **Boards → board → card** — wire each surface to its endpoints; real loading/empty/error states; real DnD lib (`svelte-dnd-action`).
5. **Workflow designer + time tracking** — admin pipeline editor and the timer/report surfaces, gated by the stage×role model.
6. **DioscHub assistant + MCP server** — `SPEC.md` §5 + `INTEGRATION_SVELTEKIT.md` §5: thin MCP relay over `/api/*`, audit attribution, refusal behavior.
