# Cadence ↔ DioscHub — Live Integration Runbook (dev)

How to bring up the embedded assistant end-to-end against a local DioscHub. This
was verified working: the assistant runs inside Cadence, acts as the signed-in
user (BYOA), and its tool calls are enforced per board by Cadence.

## Processes

| Port | What |
|------|------|
| 3333 | DioscHub backend (the hub) |
| 5174 | Cadence MCP server, HTTP transport (`npm run mcp:http`) |
| 3001 | Cadence app (`npm run dev -- --port 3001`) — **3001, not 5173**, because the hub's `DIOSC_CORS_ORIGINS` allows `:3001` |

The MCP server relays to the Cadence app (`CADENCE_API_URL`). The hub connects to
the MCP server (`http://localhost:5174/mcp`) and to the Cadence app's embed/bind.

## One-time hub setup (admin API + one SQL insert)

```bash
H=http://localhost:3333/api
T=$(curl -s -XPOST $H/admin/auth/login -H 'content-type: application/json' \
     -d '{"email":"admin@diosc.ai","password":"Admin123!"}' | jq -r .accessToken)

# 1. Register the Cadence MCP server (dev test route; or POST /admin/mcp-instances)
curl -s -XPOST $H/test/mcp-instance -H 'content-type: application/json' \
  -d '{"name":"cadence","serverUrl":"http://localhost:5174/mcp","transportType":"http"}'

# 2. Create the assistant (gpt-5-mini). No role rows => allowAllTools default => cadence tools in scope.
curl -s -XPOST $H/admin/assistants -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"name":"Cadence","greeting":"Hi!","llmConfig":{"provider":"openai","model":"gpt-5-mini","temperature":0.2}}'
# → note the assistant id

# 3. Bind threshold > tool count so all 28 tools bind up-front (no load_toolset)
curl -s -XPUT $H/admin/system-settings -H "authorization: Bearer $T" -H 'content-type: application/json' \
  -d '{"graphLimits":{"toolBindThreshold":100}}'

# 4. Embed key. The admin lacked embed:manage, so insert directly (dev DB):
#    KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))")
#    psql "postgresql://postgres:postgres@localhost:15432/diosc_hub" -c \
#      "INSERT INTO embed_api_keys (key,name,assistant_info_id,\"allowedDomains\",is_active)
#       VALUES ('$KEY','Cadence Dev Key','<ASSISTANT_ID>','',true);"
```

CORS: the hub allows an origin if it's in `DIOSC_CORS_ORIGINS` **or** in an
assistant's `site.cors.allowedOrigins`. We use `:3001` (already allow-listed).

## Start the Cadence side

```bash
KEY=<embed key from step 4>
# MCP relay (HTTP) -> Cadence app on 3001
CADENCE_API_URL=http://localhost:3001 CADENCE_MCP_PORT=5174 npm run mcp:http &

# Cadence app on 3001, wired to the hub + embed key
CADENCE_ARTIFACT_SECRET=cadence-dev-secret \
DIOSC_HUB_URL=http://localhost:3333 DIOSC_EMBED_KEY=$KEY \
PUBLIC_DIOSC_HUB_URL=http://localhost:3333 PUBLIC_DIOSC_EMBED_KEY=$KEY \
npm run dev -- --port 3001
```

Env summary: `PUBLIC_DIOSC_*` are read by the frontend embed (`(app)/+layout.svelte`);
`DIOSC_*` by the bind endpoint (`api/diosc/bind`); `CADENCE_ARTIFACT_SECRET` signs +
verifies BYOA artifacts (same process mints and verifies).

## The flow (what happens at runtime)

1. The app shell embeds `<diosc-chat>` via the hub loader + sets `bindEndpoint`.
2. Kit connects (WS) → hub emits `widget:auth:required` → kit POSTs `{wsId}` to
   `/api/diosc/bind` (same-origin, device cookie flows).
3. `/api/diosc/bind` mints a Cadence artifact for the signed-in user+device and
   forwards it to the hub's `POST /auth/bind` (`x-api-key: <embed key>`).
4. The hub injects that artifact into every MCP tool call's `_meta.headers`.
5. The MCP relay reads `_meta` and calls the Cadence API as the user; Cadence
   enforces per board. Agent writes are audited (`kind:'agent'`, "acting as …").

## Gotcha worth knowing

The kit bootstraps its engine on window `load`, which can race ahead of the
`<diosc-chat>` element configuring `apiKey/backendUrl`, so the init-time
auto-connect misses. The embed re-asserts `config` + `connect` a few times after
the loader script loads (`(app)/+layout.svelte`); `connect` is idempotent.
