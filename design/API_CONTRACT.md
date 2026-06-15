# Cadence — API Contract

This document defines the **backend surface the frontend talks to.** It exists because of the project's core rule: **nothing is hardcoded in the frontend.** Every board, list, card, label, user, membership, comment, and activity entry is fetched and mutated through this API. The prototype's `data.js` is only a fixture standing in for these responses — use it to **seed your database** and as the **shape reference** for the payloads below.

> **Target = SvelteKit.** Each route below is a `+server.js` endpoint under `src/routes/api/...`; the UI-facing flows may also use `load()` + form actions over the same domain functions. The auth boundary (`hooks.server.js`) and the **DioscHub auth-artifact handshake** are specified in **`INTEGRATION_SVELTEKIT.md`** — read it alongside this file.

> Transport is illustrated as REST/JSON. GraphQL is equally fine — the entities, fields, and permission rules are what matter. Adjust verbs/paths to your conventions.

---

## Conventions

- **Base path:** `/api/v1`
- **Auth:** every request carries the authenticated session (cookie or `Authorization: Bearer <token>`). The server resolves the **current user** from it. The client never sends "who I am" as a parameter — identity comes from the session.
- **IDs:** opaque strings.
- **Timestamps:** ISO‑8601 UTC.
- **Errors:** standard HTTP codes + `{ "error": { "code": "...", "message": "..." } }`.
  - `401` not authenticated · `403` authenticated but not permitted (e.g. not a board member) · `404` hidden-or-absent (prefer 404 over 403 for boards the user isn't a member of, so existence isn't leaked) · `422` validation.
- **Permission rule (applies to every board-scoped route):** the current user must be in the board's `memberIds`, else the server rejects. This is enforced **server-side** regardless of what the client shows. See `SPEC.md` §4.

---

## Auth & session

### `POST /auth/login`
Real product: SSO/OIDC redirect or credential exchange. Sandbox: accepts a seeded user.
- **Body (sandbox):** `{ "email": "sarah.chen@northwind.io" }` (or an opaque `sampleUserId`).
- **200:** `{ "user": User, "session": { "expiresAt": ISO } }` (+ sets session cookie).

### `POST /auth/logout`
- **204.** Clears the session.

### `GET /auth/me`
Resolves the signed-in identity for app bootstrap.
- **200:** `User` (see schema) — drives the account menu and all scoping.
- **401** if no valid session.

> **Sandbox-only:** the "switch demo identity" shortcut calls `POST /auth/login` again with another sample user. **Do not expose this in production** — identity is the authenticated session, period.

---

## Bootstrap

### `GET /me/workspace`
Everything the shell needs on load.
- **200:**
```json
{
  "workspace": { "id": "ws_northwind", "name": "Northwind", "plan": "Business" },
  "currentUser": { "...": "User" },
  "boards": [ "...BoardSummary (only boards the current user is a member of)" ],
  "totalBoardCount": 5,
  "accessibleBoardCount": 4
}
```
- `totalBoardCount − accessibleBoardCount` powers the **"N more boards you don't have access to"** cue. Return the count only — **never** names or contents of inaccessible boards.

---

## Users & members

### `GET /users/:id`
- **200:** `User`. Only resolvable for users who share a board with the current user.

### `GET /boards/:boardId/members`
Board membership — populates assignee pickers, avatar stacks, the Share dialog.
- **200:** `[ User, ... ]` (the board's members). Member-only.

### `POST /boards/:boardId/members` · `DELETE /boards/:boardId/members/:userId`
Add / remove a board member. **This is the lever that changes the assistant's scope** (membership = access). Admin/owner-gated per `SPEC.md` §4.
- **Body (add):** `{ "userId": "u_tom" }`
- **200:** updated member list.

---

## Boards

### `GET /boards`
Boards the current user can access. (Same data as bootstrap's `boards`.)
- **200:** `[ BoardSummary, ... ]`

### `GET /boards/:boardId`
Full board for the kanban view: board + its lists + cards (or return cards separately, see below).
- **200:** `Board` (with `lists`). Member-only (`404`/`403` otherwise → client shows access-denied toast and routes home).

### `POST /boards`
Create a board. The creator becomes the sole initial member (per the New Board modal).
- **Body:** `{ "name": "Q4 Planning", "accent": "#4B3FE4", "visibility": "private" }`
- **201:** `Board` (with default lists, e.g. To Do / In Progress / Done — server decides defaults).

### `PATCH /boards/:boardId`
Rename, recolor, change visibility, reorder lists.
- **Body (any subset):** `{ "name": "...", "accent": "#...", "visibility": "workspace", "listOrder": ["l1","l2",...] }`
- **200:** `Board`.

### `DELETE /boards/:boardId`
- **204.** Owner/admin-gated.

---

## Lists

### `POST /boards/:boardId/lists`
Add a list (the "Add a list" composer).
- **Body:** `{ "name": "Blocked" }` — appended after the last list.
- **201:** `List`.

### `PATCH /lists/:listId` · `DELETE /lists/:listId`
Rename / remove. `200` / `204`.

---

## Cards

### `GET /boards/:boardId/cards`
All cards on a board (if not embedded in `GET /boards/:boardId`).
- **200:** `[ Card, ... ]` ordered by `listId` then `pos`.

### `POST /boards/:boardId/cards`
Create a card (the "Add a card" composer).
- **Body:** `{ "listId": "l_s_todo", "title": "Drag-and-drop on touch devices" }`
- **201:** `Card` (server assigns `id`, `pos` = end of list).

### `PATCH /cards/:cardId`
The catch-all for card edits — title, description, due date.
- **Body (any subset):** `{ "title": "...", "desc": "...", "due": "2026-06-19T17:00:00Z" | null }`
- **200:** `Card`. Writes an `Activity` entry server-side where meaningful.

### `POST /cards/:cardId/move`
Move/reorder a card (drag & drop). **Append an `Activity{ kind:"move", actorUserId: currentUser }`.**
- **Body:** `{ "toListId": "l_s_doing", "toIndex": 0 }`
- **200:** `{ "card": Card, "affectedListIds": ["...","..."] }` — return enough for the client to reconcile `pos` across the source and target lists (or have the client refetch the board).

### `DELETE /cards/:cardId`
- **204.**

### Card sub-resources

| Action | Endpoint | Body | Notes |
|---|---|---|---|
| Assign member | `POST /cards/:cardId/members` | `{ "userId": "u_priya" }` | Assignee must be a board member. Writes `Activity`. |
| Unassign | `DELETE /cards/:cardId/members/:userId` | — | |
| Add label | `POST /cards/:cardId/labels` | `{ "labelId": "feature" }` | Label must exist in the workspace. |
| Remove label | `DELETE /cards/:cardId/labels/:labelId` | — | |
| Add checklist item | `POST /cards/:cardId/checklist` | `{ "text": "Rate-limit per token" }` | Returns the new `ChecklistItem`. |
| Toggle checklist item | `PATCH /checklist/:itemId` | `{ "done": true }` | |
| Remove checklist item | `DELETE /checklist/:itemId` | — | |
| Comment | `POST /cards/:cardId/comments` | `{ "text": "..." }` | Author = current user; appended to the activity feed. |

---

## Labels

### `GET /workspaces/:wsId/labels`
Workspace label palette (populates label pickers).
- **200:** `[ Label, ... ]`
- Treat as workspace config; CRUD (`POST`/`PATCH`/`DELETE /labels`) is admin-gated and optional for v1.

---

## Search

### `GET /search/cards?q=...`
- **200:** `[ Card, ... ]` — **only** cards on boards the current user is a member of. Permission scoping is mandatory and server-side. Matches title / description / label name.

---

## Workflow, roles & time tracking

The workflow layer (seed in `prototype/workflow-data.js`) adds per-board **roles**, **role assignments**, a **workflow** (`nodes`/`edges`/`permissions`/`tracking`), and per-card **`timeEntries`**. The `permissions` (stage × role × `pick`/`drop`/`work`) and `tracking` (which roles may time-track which stages) are **enforced server-side**, exactly like board membership.

### `GET /boards/:boardId/workflow`
- **200:** `{ roles, roleAssignments, workflow }` for the board. Member-only.

### `PATCH /boards/:boardId/workflow` — **admin-gated**
Used by the Workflow Designer: move nodes, add/remove edges, set stage×role permissions, set tracking eligibility.
- **Body (any subset):** `{ "nodes": {…}, "edges": […], "permissions": {…}, "tracking": {…} }`
- **200:** updated `workflow`. Only workspace admins / board owners may write.

### `GET /boards/:boardId/roles` · `POST /boards/:boardId/roles`
Project-scoped roles (id, name, color). `POST` admin-gated.

### `POST /boards/:boardId/roleAssignments`
Assign a user to a role on the board. **Body:** `{ "userId": "u_tom", "roleId": "r_dev" }`. Admin-gated.

### Card moves are workflow-checked
`POST /cards/:cardId/move` must additionally verify the actor's role has `pick` on the source stage and `drop` on the target stage (per `board.workflow.permissions`), else `403`.

### `GET /cards/:cardId/time` · `POST /cards/:cardId/time`
Time entries for a card.
- **`POST` body (timer stop):** `{ "roleId": "r_dev", "listId": "l_s_doing", "minutes": 35, "manual": false }` — server stamps `userId` (the actor), `id`, `at`.
- **Permission:** the actor's role must be allowed to `work` (and track) that stage. Returns the new `timeEntry`.
- **Board report** is a read-side aggregation of `timeEntries` (by user / role / stage); expose as `GET /boards/:boardId/time/report` or compute client-side from the cards payload.

---

## Dioschub assistant (MCP)

The assistant is **not** a frontend feature to fake — it's a separate, permission-bound agent. The frontend only renders the panel and streams a conversation; the agent acts through an **MCP server** using **delegated, credential-blind, short-lived auth artifacts** scoped to the current user. The full handshake (assistant kit → host `POST /api/dioschub/auth` → mint artifacts → hub → MCP server → `/api/*`), the artifact-format options, and the MCP tool wiring are in **`INTEGRATION_SVELTEKIT.md` §3–§5**. Full tool surface, audit, and refusal rules are in **`SPEC.md` §5**. Summary of what the backend must provide:

- **`POST /api/dioschub/auth`** — the host endpoint the assistant kit triggers. Reads the **verified session user** (`locals.user`), **mints delegated artifacts** bound to that user (scopes = board memberships; credential-blind; short TTL), and forwards them to DioscHub. Never accepts an identity from the caller.
- The MCP tool surface (`list_boards`, `get_board`, `search_cards`, `create_card`, `move_card`, `assign_card`, `comment_card`, `summarize_board`), **each enforcing board membership** (and workflow stage×role where relevant) before acting.
- **Audit:** every mutating tool call appends `Activity{ kind:"agent", actorUserId: <the artifact's user>, text, at }` to the affected card. The UI renders these with the "acting as {email}" chip.
- **Refusal:** out-of-scope requests are declined with an explanation; never leak inaccessible board data.

---

## Schemas (response shapes)

These mirror `SPEC.md` §3 and the fixture in `prototype/data.js`. Field names match the prototype so components port cleanly.

```ts
User = {
  id, name, email, title,
  role: "admin" | "member" | "guest",   // workspace role
  initials, color                        // avatar background hex
}

Label = { id, name, color }              // color = hex

BoardSummary = {
  id, name, subtitle, accent,            // accent = hex
  visibility: "workspace" | "private",
  memberIds: string[],                   // the permission boundary
  cardCount: number
}

Board = BoardSummary & {
  lists: List[]                          // ordered
}

List = { id, name }                      // order = position in Board.lists

Card = {
  id, boardId, listId,
  pos: number,                           // sort order within list
  title, desc?,
  labels: string[],                      // Label ids
  members: string[],                     // User ids (assignees)
  due?: ISO8601,
  checklist: ChecklistItem[],
  comments: Comment[],
  activity: Activity[]
}

ChecklistItem = { id, text, done: boolean }

Comment = { id, userId, at: ISO8601, text }

Activity = {
  id,
  kind: "agent" | "move" | "create" | "assign" | "comment" | "...",
  actorUserId,                           // WHO the action is attributed to
  at: ISO8601,
  text                                   // e.g. "moved this card from To Do to In Progress"
}
// kind:"agent" => performed by the Dioschub assistant on behalf of actorUserId.

// ---- workflow / time-tracking layer (seed: prototype/workflow-data.js) ----
Role = { id, name, color }               // project-scoped, hex color

// on Board:
roleAssignments = { [userId]: roleId }
workflow = {
  nodes:       { [listId]: { x, y } },                       // designer canvas positions
  edges:       [{ from: listId, to: listId }],               // documents flow (not enforced)
  permissions: { [listId]: { [roleId]: { pick, drop, work } } }, // ENFORCED
  tracking:    { [roleId]: listId[] }                        // where a role may time-track
}

// on Card:
timeEntries = [{ id, userId, roleId, listId, minutes, at: ISO8601, manual: boolean }]
```

---

## Loading / empty / error states (frontend obligation)

Because the frontend owns no data, every surface must handle three states the prototype glosses over (it has instant fixtures):
- **Loading** — skeletons for the board grid, lists, and card detail.
- **Empty** — "No boards yet / Create one", empty lists, "No cards assigned to you" (the prototype's `MyCards` empty state is a starting point).
- **Error** — failed fetch / `403` access-denied (surface the toast, route home) / network retry.
