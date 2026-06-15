# Cadence — Handoff Spec

**A Trello-style task-management sample app for Dioschub.**
Companion to the existing e-commerce/sales-agent sample. This document is the implementation brief for the backend, the MCP server, and the production frontend. The HTML prototype (`Cadence.html` + JSX files) is the visual + interaction source of truth — match it.

---

## 1. Purpose & demo narrative

Cadence is a believable kanban product (boards → lists → cards) used by a fictional company, **Northwind**. Its real job is to be a stage for the **embedded Dioschub assistant**, demonstrating **Bring Your Own Auth**:

- The assistant is embedded as a docked panel inside Cadence.
- It **operates as the signed-in user** — same access, never more.
- It is **credential-blind** — it never sees or stores user credentials.
- Every assistant action is **logged under the real user** (visible in card activity feeds).

**The demo entry point** is a **real login screen**. In production this is the host app's SSO / session — identity is *authenticated*, never chosen from a menu. For the public sandbox, the login screen doubles as an **identity picker**: a visitor signs in as one of the seeded users (e.g. Sarah, an Admin → Tom, a Guest contractor) and the whole app — visible boards, and the assistant's reach — is scoped to that user. Boards they can't access are hidden, with an explicit "N more boards you don't have access to" cue.

> **Auth model.** The product-true flow is **login → you are that user → sign out**. The sandbox stands in for SSO with the login screen's identity picker, plus a clearly-labeled **"Switch demo identity"** shortcut inside the in-app account menu (so prospects can swap roles quickly without a full sign-out round-trip). This shortcut is a **sandbox-only affordance** — it must NOT ship in the real product. Real identity comes solely from the authenticated session.

---

## 2. Screens & information architecture

| Screen | Route (suggested) | Notes |
|---|---|---|
| **Login** | `/login` | Product-true entry. SSO + email/password form (the real path) **and** a sandbox "sign in as a sample user" identity picker. BYOA story on the side panel. |
| **All boards** (home) | `/` | Greeting, grid of boards the user can access, hidden-boards cue. |
| **My cards** | `/me` | Cards assigned to the current user, grouped by board. |
| **Board / kanban** | `/b/:boardId` | Lists as columns, draggable cards, inline card composer, "add list". |
| **Card detail** | modal over board (`/b/:boardId/c/:cardId`) | Description, checklist (w/ progress), assignees, due date, **activity feed with audit attribution**, comment composer. |
| **Assistant panel** | docked right rail, toggleable | Dark "embedded secure layer". Operating-as header, security badges, conversation, input. Persists open/closed. |

Persistent chrome: **dark left sidebar** (workspace switcher, nav, permission-scoped board list, "Secured by Dioschub" badge) and **top bar** (breadcrumb, search, notifications, **account menu**, assistant toggle). The account menu shows the signed-in identity (name, email, role, board count), **Account settings**, **Sign out**, and the sandbox-only **Switch demo identity** shortcut.

---

## 3. Data model

```
Workspace
  id            string
  name          string            // "Northwind"
  plan          string            // "Business"

User
  id            string
  name          string
  email         string            // identity used for audit attribution
  title         string            // job title, display only
  role          'admin'|'member'|'guest'   // workspace role
  initials      string
  color         string            // avatar bg (hex)

Label                              // workspace-scoped
  id            string
  name          string
  color         string            // hex

Board
  id            string
  name          string
  subtitle      string
  accent        string            // hex, drives cover + accents
  visibility    'workspace'|'private'
  memberIds     string[]          // users with access — THE permission boundary
  lists         List[]            // ordered

List
  id            string
  name          string
  // order is array position within Board.lists

Card
  id            string
  boardId       string
  listId        string
  pos           number            // sort order within its list (ascending)
  title         string
  desc          string?
  labels        string[]          // Label ids
  members       string[]          // User ids (assignees)
  due           ISO8601?          // due date
  checklist     ChecklistItem[]
  comments      Comment[]
  activity      Activity[]

ChecklistItem { id, text, done:boolean }

Comment   { id, userId, at:ISO8601, text }

Activity                          // the audit/event feed on a card
  id            string
  kind          'agent'|'move'|'create'|'assign'|'comment'|...
  actorUserId   string            // WHO the action is attributed to
  at            ISO8601
  text          string            // e.g. "moved this card from To Do to In Progress"
  // kind:'agent' => performed by the Dioschub assistant ON BEHALF OF actorUserId.
  //   UI renders the spark avatar + a mono "acting as {actorUser.email}" audit chip.
```

Seed data lives in `data.js` (`window.CADENCE_DATA`). Counts: 5 users, 5 boards, ~44 cards.

**Workflow / time-tracking layer** (seed in `workflow-data.js`, which decorates `CADENCE_DATA` after `data.js`). Adds, per board: `roles` (`{roleId:{id,name,color}}`, project-scoped, admin-designed), `roleAssignments` (`{userId:roleId}`), and `workflow = { nodes:{listId:{x,y}}, edges:[{from,to}], permissions:{listId:{roleId:{pick,drop,work}}}, tracking:{roleId:[listId]} }`. Adds, per card: `timeEntries:[{id,userId,roleId,listId,minutes,at,manual}]`. The `permissions` and `tracking` maps are **enforced server-side** (stage×role gates moves and time-tracking); `edges` are documentation only. See the Workflow Designer + time-tracking surfaces in `README.md`.

---

## 4. Permission model (must be enforced server-side)

**Board membership is the single source of truth.** A user can see/act on a board **iff** their id is in `board.memberIds`. Everything cascades from that:

- **Board list / sidebar / home grid** → only boards where `memberIds.includes(currentUserId)`.
- **Hidden-boards cue** → `totalBoards − accessibleBoards` (count only; never leak names/contents).
- **Direct board access** (deep link) → if not a member, **deny** (the prototype shows an "Access denied" toast and routes home).
- **Search** → only matches cards on accessible boards.
- **Card mutations** (move, assign, comment, check) → only on accessible boards.

Workspace `role` (`admin`/`member`/`guest`) is mostly display today, but reserve it for: who may create/share boards, who can be added to private boards, and admin-only boards (e.g. **Leadership Planning** has only the admin as a member — use this as the canonical "the assistant refuses for non-admins" demo).

> ⚠️ The prototype enforces permissions in the client because it has no backend. **In production, enforce on the server / API.** The client scoping is UX, not security.

---

## 5. Dioschub assistant — integration points

The prototype panel is a **shell**: operating-as identity, security badges, scoped welcome, conversation, input. Live AI behaviour is implemented here. Wiring contract:

**Identity & auth (Bring Your Own Auth)**
- The host (Cadence) hands the assistant a **delegated, permission-bound session token** for the current user — **never** the user's credentials.
- Assistant header always reflects the live identity: `Operating as {user.email}` + a scope summary (`{n} boards in scope`).
- On persona/identity change, **reset the conversation** and re-fetch scope.

**MCP server — suggested tool surface** (each call carries the delegated token; the server checks board membership before acting and **rejects** anything out of scope):

| Tool | Purpose | Permission check |
|---|---|---|
| `list_boards()` | boards the user can access | filter by `memberIds` |
| `get_board(boardId)` | lists + cards | member-only |
| `search_cards(query)` | scoped search | accessible boards only |
| `create_card(listId, title, …)` | add a card | member of the board |
| `move_card(cardId, toListId, pos)` | move/reorder | member of the board |
| `assign_card(cardId, userId)` | assign | member; assignee must be a board member |
| `comment_card(cardId, text)` | comment | member |
| `summarize_board(boardId)` | read-only summary | member |

**Audit logging (non-negotiable)**
- Every mutating tool call writes an `Activity{ kind:'agent', actorUserId: <signed-in user>, text, at }` onto the affected card.
- The UI renders these with the assistant avatar + a `acting as {email}` chip — see `ActivityRow` in `carddetail.jsx`. This is the visible compliance story.

**Refusal behaviour (the BYOA money shot)**
- If the user asks the assistant to touch a board they're not a member of, it must **decline and explain** ("You don't have access to that board") rather than reveal contents. Mirror the host's "Access denied" toast tone.

> Scope note: the UI mock intentionally does **not** script specific capability demos (per the brief). Wire real behaviour during implementation; the tool surface above is the recommended starting point, not a hard requirement.

---

## 6. Visual design system

Defined in `styles.css` as CSS custom properties. **"Studio Kanban": warm paper host app, dark-ink embedded assistant** — the dark panel is intentional and signals "a separate secure layer dropped into your app." Keep it.

**Color**
- Canvas `#F4F1EA` (warm paper, not cool gray) · Surface `#FFFFFF` · List wells `#ECEAE2`
- Ink `#1A1814` / muted `#56524B` / faint `#8C887F` · Lines `#E3DFD5` / `#D6D1C4`
- Brand (accent) `#4B3FE4`, dark `#3A2FC0`, tints `#E7E4FB` / `#EFEDFB`
- Dark chrome (sidebar + assistant): `#1A1814` → `#2A2620`, lines `#393227`, on-dark text `#F4F1EA` / `#B7B0A1` / `#847D6E`
- Assistant accent ("beam") `#8C7DFF` / `#6B5CF0`
- Label palette (desaturated): bug `#E05A4F`, feature `#3E78D9`, design `#8A5BD6`, research `#E0A33E`, infra `#3FA66A`, ios `#0E8C7F`, api `#4B3FE4`, urgent `#C0392B`, growth `#C2410C`
- Each board has an `accent` hex driving its cover gradient + accents.

**Type**
- Display / wordmark / headings: **Bricolage Grotesque**
- UI / body: **Hanken Grotesk**
- Mono (emails, audit chips, counts, technical metadata): **JetBrains Mono**
- Min UI text ~11px (mono meta) / ~13.5px body. Card titles 13.5–14, board titles 23, page H1 32–38.

**Shape & depth**
- Radii 7 / 10 / 14 / 20px. Soft, layered shadows (see `--shadow-card`, `--shadow-pop`, `--shadow-drag`). Subtle paper grain on the canvas (`.grain`).
- Avatars: initials on a per-user color, 2px surface ring.

**Components to reuse** (prototype names): `Login`, `AccountMenu`, `Avatar` / `AvatarStack`, `RoleBadge`, label `.chip`, `DueChip` (tone: over/today/soon/normal), `CardTile`, `List`, `BoardCard`, `Toaster`, `Section`, `ActivityRow` (audit), `AssistantPanel`.

**Motion**
- Staggered `fadeUp` entrances on load; card hover lift; panel slides in 0.34s; toast pop. Card drag uses a drop-line placeholder (`DropSlot`) + a list highlight ring.
- Respect `prefers-reduced-motion`. Entrance animations must not leave content hidden in print/export (the prototype uses `animation-fill-mode: both` purely for the live load; ensure resting state is visible in SSR/export).

---

## 7. Interactions to preserve

- **Drag & drop** cards between/within lists with a visible insertion line and target-list ring.
- **Inline card composer** ("Add a card" → textarea; Enter to add, Esc to cancel).
- **Card detail modal**: toggle checklist items (live % bar), post a comment (appends to activity as the current user), Esc / backdrop to close.
- **Login / identity**: in the prototype, the login screen sets the active user (and an `authed` flag); signing out returns to it. In production, replace with real SSO/session auth — the **Switch demo identity** shortcut is sandbox-only and must be removed.
- **Account menu**: shows signed-in identity + Sign out; re-scopes nothing by itself (identity is fixed per session). The demo switch re-scopes everything, closes any open card, resets the assistant, and fires a confirmation toast.
- **Assistant toggle** persists; panel docks/un-docks with width transition.
- Search filters cards on the active board (title / description / label).
- Light persistence (signed-in user, `authed` flag, view, assistant open/closed) in `localStorage` — replace with real session state in production.

---

## 8. Implementation stack

**Target framework: SvelteKit** (the host owns frontend + backend/REST, Next.js-style). Full architecture, file layout, auth-artifact handshake, and MCP wiring are in **`INTEGRATION_SVELTEKIT.md`** — read it as the primary build doc. Summary:

- **Frontend:** SvelteKit (`.svelte` components ported from the prototype's JSX; nothing depends on React). `@sveltejs/adapter-node`. Real DnD lib (e.g. `svelte-dnd-action`) in place of the hand-rolled HTML5 DnD. Lift `styles.css` verbatim.
- **Backend:** SvelteKit `load()` + form actions for UI flows and `+server.js` under `/api/*` for the machine surface, over a DB mirroring §3 (plus the workflow/role/time-tracking layer in `workflow-data.js`) with server-enforced §4 permissions. Activity feed is append-only.
- **Auth:** `hooks.server.js` with two modes — session/SSO for the browser, **delegated credential-blind auth artifacts** (bearer) for `/api/*`. The DioscHub handshake: the embedded **assistant kit** triggers the host's `POST /api/dioschub/auth`, which mints artifacts bound to the verified session user and forwards them to DioscHub; the hub passes them into MCP tool calls. Sandbox = login-screen identity picker (+ demo-switch shortcut); production = real SSO, no identity picker.
- **MCP server:** a **separate, thin relay** — implement §5 tools as wrappers over `/api/*`, attaching the artifact as a bearer token; the host enforces membership and writes audit `Activity` on every mutation.

---

## 9. Seeded sample data (summary)

**Users:** Sarah Chen (Admin, Eng Lead) · Marcus Reed (Member, PM) · Priya Nair (Member, Designer) · Dana Okafor (Member, Marketing) · Tom Becker (Guest, iOS contractor — external email).

**Boards & membership:**
- **Sprint 24 · Engineering** (private) — Sarah, Priya, Tom
- **Q3 Product Roadmap** (workspace) — Sarah, Marcus, Priya, Dana
- **Launch: Mobile App** (private) — Marcus, Dana, Priya
- **Bug Triage** (private) — Sarah, Tom
- **Leadership Planning** (private, **admin-only**) — Sarah

This membership matrix is deliberate: switching **Sarah → Tom** drops visible boards from 4 → 2 and hides Leadership entirely — the live BYOA demonstration.
