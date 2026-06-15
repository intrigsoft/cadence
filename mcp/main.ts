// stdio entry point — run with `npm run mcp`.
//
// Requires two env vars:
//   CADENCE_API_URL   base URL of the running Cadence app (default http://localhost:5173)
//   CADENCE_ARTIFACT  a BYOA artifact (mint via POST /api/v1/auth/artifact while
//                     signed in, or POST /api/v1/dev/artifact in dev). In a real
//                     DioscHub deployment the relay receives this per session.
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createCadenceMcpServer } from './server.js';

const server = createCadenceMcpServer();
const transport = new StdioServerTransport();
await server.connect(transport);
