# Cadence — Phase 2: DioscHub Assistant Integration (Design)

> **Status: design only.** This is the blueprint for embedding the DioscHub assistant into Cadence. No implementation yet. It records *what* to build and — just as importantly — *why the simpler shape is the correct one*, so the reasoning isn't re-litigated later.
>
> Companion to [`SPEC.md`](./SPEC.md), [`API_CONTRACT.md`](./API_CONTRACT.md), and [`INTEGRATION_SVELTEKIT.md`](./INTEGRATION_SVELTEKIT.md). The standalone app (phase 1) is built; the seam this design relies on — `locals.actor` + audit-on-every-mutation — is already in place.

---

## 1. The problem this design solves

Cadence's authorization is **dynamic**: roles are **board-specific**, created and edited **at runtime** by board admins (the Workflow Designer), and a single user is simultaneously different things on different boards — *Owner on board A, Member on board B*. The permission for any action (`move_card`, `log_time`, `save_workflow`) depends on the user's role **on the specific board the action targets** and that board's current stage×role matrix.

The open question was whether DioscHub — whose Role is a **static, admin-configured** entity (one active role per session) — can represent this. The answer the design landed on: **it shouldn't try to.** The per-board dynamism does not belong in DioscHub at all. It belongs where it already lives in phase 1 — in **per-call enforcement at the backend**.

## 2. What was rejected, and why (so we don't loop back)

| Idea | Why it fails for Cadence |
|---|---|
| **Mirror Cadence roles as DioscHub roles** | DioscHub resolves **one active role per session**. It cannot represent "Owner on A *and* Member on B" at the same time. Runtime-created per-board roles can't be static admin config. |
| **Switch the active DioscHub role as you navigate boards** | A session has a single resolved role; switching replaces the whole scope wholesale. Needs a platform extension *and* still breaks the use case below. |
| **Context-scoped toolset loading** (load the board's tools when you open it) | Breaks the core use case: from the **top level**, a user must be able to say *"log 2h on the create-user task and ship it to review"* — the assistant finds the task by name across **all** accessible boards and acts, with **no prior navigation**. Scoping tools to the currently-open board defeats the assistant's entire value. |
| **Let the LLM pick the toolset via prompt** | Works today but is LLM-dependent (the demo runs a small model), forgets to unload, and gives only soft least-privilege. It's ergonomics, never a boundary. |

The elimination is the result: tools must be **broad** (the union of what the user could do anywhere), and the dynamic decision must happen **per call, against the target board**.

## 3. The converged design

Four decisions, **needing zero DioscHub platform extension**:

1. **Two assistants — internal vs external.** They differ on prompt, tool surface, security posture, audience, and quota. One assistant serving both is a compromise on every axis.
   - **Internal** — trusted staff. Full tool surface. Uniform (or no) quota.
   - **External** — public. Anonymous + auth-upgrade. Tight anon quota.

2. **Quota at the assistant level.** The only quota distinction with real value is **anon vs authenticated**, and it lives entirely inside the *external* assistant. The internal assistant has a uniform audience, so its quota is assistant-wide. This frees the *role* from carrying quota.

3. **Role = coarse, user-level capability standing — never per-board.** The one statically-knowable tier is *"is this user ever a manager, on **any** accessible board?"* It gates whether the **high-privilege tools load at all**, without breaking cross-project use:
   - Manager-standing anywhere → bind the full surface (incl. `save_workflow`, list/member management).
   - Member on every board → bind read + collaborate only (manage tools would be pure noise — failed attempts everywhere).

4. **Tools bound broad; per-call enforcement is THE boundary.** The assistant carries the union of the user's possible actions across all accessible boards. Each tool call resolves the user's **live role on the target card's board** (derived from the named task, not from UI navigation) and allows / denies / requires-approval. The currently-open board is only a **soft disambiguation hint** ("the create-user task" when two boards have one).

### How the layers map

| Concern | Where it lives | Changes |
|---|---|---|
| Audience + quota + system prompt | **Assistant** (internal / external) | rarely |
| Coarse capability standing ("ever a manager?") | **Role** (resolved at session / identity bind) | rarely |
| Which tools exist | **Toolset** (broad — the union) | static |
| **Per-board owner/member/stage permission** | **Per-call enforcement** in `domain.ts` | live, every call |

> **This is the credential-blind model, intact.** DioscHub stays a conduit: it binds identity (BYOA) and a static tool surface. It never learns what "Lead" or "QA" means on a board. The host enforces.

## 4. Identity & BYOA flow

Identity is **never** a tool parameter. It arrives as an auth artifact and resolves server-side into `locals.actor` — exactly as phase 1's web flow does, the only difference being the *source* of the actor.

```
host session / SSO ──> auth artifact ──> Cadence backend resolves ──> locals.actor {userId, isAgent:true}
                                                                          │
                                              same domain.ts functions ───┘  (UI flow uses isAgent:false)
```

- `userId` appears in tool payloads only as **data** (assign *this person*), never as the acting identity.
- `actor.isAgent = true` for assistant calls → audit entries render as `kind:'agent'` ("acting as {email}"). The compliance surface is already wired (`appendActivity`).
- **Not exposed as tools:** `signIn`, `signOut`, `switchIdentity`, `findUserByEmail`, `personaList` — these are the sandbox's SSO stand-in. Exposing `switchIdentity` would be the privilege-escalation hole.

See `INTEGRATION_SVELTEKIT.md` for the artifact handshake; this design adds the `isAgent` branch on the same `locals.actor` resolution.

## 5. The MCP tool surface

The MCP server is a thin relay: each tool calls the **same `domain.ts` function** the UI uses, passing the resolved `actor`. No business logic in the tool layer — gates fire for free.

### Read (always bound, no approval)

| Tool | Domain fn | Gate |
|---|---|---|
| `whoami` | `bootstrap` | authed — lets the assistant state "operating as …" honestly |
| `list_boards` | `accessibleBoards` | membership scope (only boards the user can see) |
| `get_board` | `getBoard` + `cardsForBoard` | membership — **NotFound** if hidden (no existence leak) |
| `get_card` | `cardCtx` (read) | membership |
| `search_cards` | `searchCards` | scoped to accessible boards |
| `my_cards` | `myCards` | the actor's assigned cards |
| `time_report` | `timeReport` | membership |

### Collaborate — card + time writes (approval candidates)

| Tool | Domain fn | Gate |
|---|---|---|
| `create_card` | `addCard` | membership + list exists |
| `update_card` | `patchCard` | membership |
| `delete_card` | `deleteCard` | membership — **destructive → approval** |
| `move_card` | `moveCard` | membership + **workflow `pick`/`drop` (stage×role)** ← the dynamic gate |
| `assign_member` / `unassign_member` | `assign/unassignMember` | membership + assignee is a board member |
| `add_label` / `remove_label` | `add/removeLabel` | membership + label exists |
| `add_comment` | `addComment` | membership |
| `add_checklist_item` / `toggle_checklist_item` / `remove_checklist_item` | checklist ops | membership |
| `log_time` | `logTime` | **`canTrack` (stage×role)** |
| `start_timer` / `stop_timer` | timer ops | **`canTrack`** |

### Manage — structure (high-privilege; bound only for manager-standing users)

| Tool | Domain fn | Gate |
|---|---|---|
| `create_board` | `createBoard` | authed |
| `add_list` | `addList` | membership |
| `add_board_member` / `remove_board_member` | board member ops | membership — **scope-changing → approval** |
| `save_workflow` | `saveWorkflow` | **admin-only** — the runtime role/permission editor |

> ~25 tools. The Read + Collaborate split is the never-manager surface; Manage is added for manager-standing users. **The split is user-level, not board-level** — a Member can still *attempt* a `move_card` on a board where they happen to be Owner, because the tool is bound; the per-call gate decides.

## 6. Validation — reuse, don't rebuild

`domain.ts` is the **single enforcement point** and already throws typed, well-worded errors:

- membership → `NotFoundError` (existence not leaked)
- workflow stage×role → `ForbiddenError("No permission to move cards into this stage")`
- time tracking → `ForbiddenError("Your role cannot track time on this stage")`
- admin gate → `ForbiddenError("Only workspace admins can edit the workflow")`
- bad input → `ValidationError`

The MCP tools **must not** re-implement any of this. They call the domain function and translate the thrown error into the contract below.

## 7. The LLM error contract (the genuinely new work)

The validation half exists. What's new is making failures **legible to the LLM** so it reports accurately instead of guessing.

### Three outcomes, not two

| Outcome | When | LLM behavior |
|---|---|---|
| **Success** | call allowed | use the result |
| **Denied (terminal)** | `Forbidden` — workflow/role/admin gate | **Explain the specific reason and stop.** Do **not** retry into another stage or work around it. |
| **Pending approval** | action requires consensus | Say *"I've requested approval to …"* — **not** "done" and not "failed". |
| **Invalid input** | `Validation` | Fix and retry, or ask the user. |
| **Not found** | `NotFound` (hidden or absent) | *"I couldn't find that task."* **Never** "you're not a member of that board." |

### Preserve the NotFound-vs-Forbidden split — it is the credential-blind boundary

- A card/board the user can't see → **NotFound** → vague to the user (no existence leak).
- A permission denial on something they *can* see → **Forbidden** → safe, even helpful, to be **specific**: *"Your role can't move cards into Review on this board."* That's the user's own standing.

Flattening both into a generic 403 would either leak existence or make denials useless.

### Result shape

```jsonc
// success
{ "ok": true, "data": { /* card, entry, board summary, ... */ } }

// failure — returned as the tool result the LLM reads
{
  "ok": false,
  "code": "WORKFLOW_DROP_DENIED",   // machine-branchable
  "message": "Your role can't move cards into 'Review' on this board.", // human + LLM readable
  "retryable": false
}

// pending
{ "ok": false, "code": "APPROVAL_REQUIRED", "message": "Moving to Review needs approval; I've requested it.", "retryable": false }
```

Suggested `code` set (map 1:1 from domain errors):
`AUTH_REQUIRED` · `NOT_FOUND` · `VALIDATION` · `WORKFLOW_PICK_DENIED` · `WORKFLOW_DROP_DENIED` · `TRACK_DENIED` · `ADMIN_REQUIRED` · `NOT_BOARD_MEMBER` · `APPROVAL_REQUIRED`.

### Report partial outcomes honestly

A single intent ("log 2h **and** ship to review") is multiple tool calls. If `log_time` succeeds but `move_card` is denied, each call returns its own result and the LLM must compose the truth: *"Logged 2h. I couldn't ship it to review — your role can't drop into that stage."* The contract makes each step independently legible; the prompt (below) enforces honest composition.

## 8. System-prompt discipline

A short, load-bearing block in the assistant's system prompt:

- You act **as the signed-in user** with their exact permissions — never more. Every action is logged under their name.
- On a **denial**, explain the specific reason to the user and **stop**. Do not try alternate stages, boards, or workarounds.
- On **pending approval**, tell the user it's awaiting approval — do not claim it's done.
- On a **multi-step request**, report exactly what succeeded and what didn't.
- If you **can't find** something, say so plainly; never speculate about boards or access you can't see.
- Disambiguate by the **currently-open board** when a name is ambiguous, but you may act on any board the user can access.

## 9. What DioscHub needs: nothing new

| Capability | Needed? |
|---|---|
| Static role + broad toolset config | already exists |
| BYOA identity binding (`/auth/bind` style) | already exists |
| Per-call authorization | **not DioscHub's job** — Cadence backend / MCP server |
| Host-signaled context-scoped toolset binding | **not required** (rejected in §2) |
| Multi-directional role switching | **not required** |
| Approval / consensus mechanism | DioscHub's existing approval flow; Cadence emits `APPROVAL_REQUIRED` |

## 10. Out of scope / open questions

- **Approval policy source.** This design assumes DioscHub's existing approval config gates destructive/scope-changing tools (`delete_card`, member management, `save_workflow`). If approval ever needs to vary by the *dynamic* per-board role (e.g. a Lead self-approves, a Developer needs sign-off), that's a **host-driven consensus** question — the same "move it to the host" pattern as authorization — and would be a DioscHub roadmap item, not a Cadence change. Noted, not solved here.
- **Manager-standing recomputation.** The coarse role is resolved at session / identity-bind time. If a user is promoted to Owner of a new board mid-session, the Manage tools won't appear until the role is re-stamped (the `promoteSession` pattern). Acceptable; revisit only if it bites.
- **Transport.** Tool surface is illustrated as discrete MCP tools over the Cadence REST domain. The entities, gates, and error contract are what matter; adjust to the relay's conventions.

## 11. Build status

| Piece | Status | Where |
|---|---|---|
| Machine API (`/api/v1/*`) over `domain.ts` | **built + tested** | `src/routes/api/v1/**` |
| BYOA artifact (mint / verify, HMAC) | **built + tested** | `src/lib/server/api/artifact.ts`, `POST /api/v1/auth/artifact` |
| `hooks` artifact → `actor{isAgent:true}` branch | **built** | `src/hooks.server.ts` |
| Three-outcome error contract + codes | **built + tested** | `src/lib/server/api/respond.ts`, `src/lib/server/errors.ts` |
| MCP server (28 tools, relay) | **built + tested** | `mcp/` — **HTTP** (`npm run mcp:http`, the hub transport) + stdio (`npm run mcp`, local). See `mcp/README.md` |
| Dev headless artifact mint | **built** (double-gated) | `POST /api/v1/dev/artifact` |
| **Registered + discovered by a running DioscHub** | **done** | hub pulled all 28 tools (`initialize`/`tools/list`) from `http://localhost:5174/mcp` |
| Verification | 34 unit tests + live HTTP smoke + real streamable-HTTP round-trip with per-call `_meta` BYOA | `npm test`, `npm run check:mcp` |

> **Transport correction (verified against the running hub):** DioscHub connects
> to external MCP servers over **HTTP/SSE, not stdio**, and delivers per-user
> identity inside each call's **`_meta.headers.Authorization`**, not as transport
> headers. The server reads it per call (`mcp/api.ts` `artifactFor`). Register
> with `transportType: "http"`, `serverUrl: http://<host>:5174/mcp`.

**The wall — a live assistant acting in the app** is not built (needs an
assistant configured with an LLM, an embed key, and the kit embedded). What
remains:
1. In the hub: create/choose an assistant whose role/toolset includes the
   `cadence` instance's tools (§3 tiers), set an LLM, and configure approval for
   `delete_card`, member management, and `save_workflow`. Set the §8 system prompt.
2. Embed the DioscHub assistant-kit script in the app shell (panel stub:
   `src/lib/AssistantPanel.svelte`) with the embed key.
3. Stand up a Cadence `bind` endpoint: on `widget:auth:required`, mint via
   `POST /api/v1/auth/artifact` (cookie-authed) and forward
   `{ wsId, identity, authArtifacts: { headers: { Authorization } } }` to the
   hub's `/auth/bind`. That puts the artifact into each call's `_meta`.

---

**One-line summary:** broad tools, identity via BYOA, **per-call enforcement reusing `domain.ts`**, and a three-outcome error contract that preserves the NotFound-vs-Forbidden boundary — no DioscHub extension required.
