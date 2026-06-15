# Cadence MCP Server

The relay DioscHub's MCP client connects to. It exposes Cadence's task tools and
forwards every call to the Cadence **machine API** (`/api/v1/*`) carrying a BYOA
**artifact** as a bearer token. It enforces nothing itself — Cadence resolves the
acting identity from the artifact and applies the per-board permission gates on
every call. See [`../design/PHASE-2-ASSISTANT-INTEGRATION.md`](../design/PHASE-2-ASSISTANT-INTEGRATION.md).

```
DioscHub MCP client ──stdio──▶ this server ──HTTP + Bearer<artifact>──▶ Cadence /api/v1 ──▶ domain gates
```

## Run it

Prereqs: the Cadence app is running (`npm run dev`, default `http://localhost:5173`).

```bash
# 1. Get a BYOA artifact (dev path — see "Artifacts" below)
CADENCE_DEV_ARTIFACT=1 npm run dev            # in the app, enables the dev mint route
ART=$(curl -s -XPOST http://localhost:5173/api/v1/dev/artifact \
  -H 'content-type: application/json' -d '{"userId":"u_sarah"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['data']['artifact'])")

# 2. Run the relay
CADENCE_API_URL=http://localhost:5173 CADENCE_ARTIFACT="$ART" npm run mcp
```

### Environment

| Var | Where | Purpose |
| --- | --- | --- |
| `CADENCE_API_URL` | relay | Base URL of the running Cadence app (default `http://localhost:5173`). |
| `CADENCE_ARTIFACT` | relay | The BYOA artifact (bearer). In production DioscHub supplies this per session. |
| `CADENCE_ARTIFACT_SECRET` | **app** | HMAC secret used to sign/verify artifacts. Set the SAME value on the app process that mints and the one that verifies (one process in this sample). |
| `CADENCE_DEV_ARTIFACT` | **app** | `1` enables the dev-only headless mint route. Never set in production. |

## Artifacts

- **Production-faithful:** the host mints for its authenticated session via
  `POST /api/v1/auth/artifact` (cookie-authed) and hands the token to DioscHub,
  which passes it opaquely to this relay. The LLM never sees it.
- **Dev/headless:** `POST /api/v1/dev/artifact { "userId": "u_sarah" }` spins up a
  fresh sandbox, signs in, and returns a token. Double-gated (dev build **and**
  `CADENCE_DEV_ARTIFACT=1`); answers 404 otherwise.

The artifact binds `{ deviceId, userId }` — the `deviceId` is what lets the
assistant act on the **same** per-device sandbox the human is using (there is no
shared database).

## Registering with DioscHub

Point a DioscHub MCP instance at this server as a stdio command, e.g.:

```jsonc
{
  "command": "npx",
  "args": ["tsx", "mcp/main.ts"],
  "cwd": "/path/to/cadence",
  "env": { "CADENCE_API_URL": "https://cadence.example", "CADENCE_ARTIFACT": "<per-session artifact>" }
}
```

Which of the 28 tools actually **load** for a given session is DioscHub's
toolset/role configuration — this server always exposes the broad surface and
relies on Cadence's per-call enforcement (design doc §3, §5).

## Tools (28)

- **Read:** `whoami`, `list_boards`, `get_board`, `get_card`, `search_cards`, `my_cards`, `time_report`
- **Collaborate:** `create_card`, `update_card`, `delete_card`, `move_card`, `assign_member`, `unassign_member`, `add_label`, `remove_label`, `add_comment`, `add_checklist_item`, `toggle_checklist_item`, `remove_checklist_item`, `log_time`, `start_timer`, `stop_timer`, `running_timer`
- **Manage:** `create_board`, `add_list`, `add_board_member`, `remove_board_member`, `save_workflow`

Failures come back as a structured error result (`{ error: { code, message, retryable } }`,
`isError: true`) so the assistant can explain a denial, retry validation, or
report a partial outcome — never guess. Codes: `AUTH_REQUIRED`, `NOT_FOUND`,
`VALIDATION`, `WORKFLOW_PICK_DENIED`, `WORKFLOW_DROP_DENIED`, `WORKFLOW_REORDER_DENIED`,
`TRACK_DENIED`, `ADMIN_REQUIRED`, `APPROVAL_REQUIRED`, `UNREACHABLE`, `INTERNAL`.

## Verify

```bash
npm test            # unit: artifact, contract, MCP relay wiring (stubbed fetch)
npm run check:mcp   # typecheck the mcp/ sources
```
