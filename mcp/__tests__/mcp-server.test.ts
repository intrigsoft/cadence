import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { InMemoryTransport } from '@modelcontextprotocol/sdk/inMemory.js';
import { createCadenceMcpServer } from '../server.js';

// Verifies the relay wiring without a live LLM: tools register, calls forward to
// the machine API with the bearer artifact, and the structured contract maps to
// MCP results (success vs isError).

interface FetchCall {
  url: string;
  method: string;
  auth: string | null;
}

let calls: FetchCall[];

function stubApi() {
  calls = [];
  vi.stubGlobal(
    'fetch',
    vi.fn(async (url: string | URL, init?: RequestInit) => {
      const u = String(url);
      const headers = new Headers(init?.headers);
      calls.push({ url: u, method: init?.method ?? 'GET', auth: headers.get('authorization') });
      if (u.includes('/cards/c1/move')) {
        return new Response(JSON.stringify({ ok: false, code: 'WORKFLOW_DROP_DENIED', message: "can't drop here", retryable: false }), { status: 403 });
      }
      return new Response(JSON.stringify({ ok: true, data: { currentUser: { id: 'u_sarah' } } }), { status: 200 });
    })
  );
}

async function connect() {
  const server = createCadenceMcpServer();
  const [clientT, serverT] = InMemoryTransport.createLinkedPair();
  const client = new Client({ name: 'test', version: '0.0.0' });
  await server.connect(serverT);
  await client.connect(clientT);
  return client;
}

beforeEach(stubApi);
afterEach(() => vi.unstubAllGlobals());

describe('Cadence MCP server', () => {
  it('exposes the full broad tool surface (28 tools)', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(tools).toHaveLength(28);
    expect(names).toEqual(expect.arrayContaining(['whoami', 'list_boards', 'move_card', 'log_time', 'save_workflow', 'stop_timer']));
  });

  it('forwards a read with the bearer artifact and returns the data', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'whoami', arguments: {} });
    expect(res.isError).toBeFalsy();
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(JSON.parse(text)).toMatchObject({ currentUser: { id: 'u_sarah' } });
    expect(calls[0].method).toBe('GET');
    expect(calls[0].url).toContain('/api/v1/me');
    expect(calls[0].auth).toMatch(/^Bearer/);
  });

  it('uses the per-call BYOA artifact from _meta.headers (DioscHub path)', async () => {
    const client = await connect();
    await client.callTool({ name: 'whoami', arguments: {}, _meta: { headers: { Authorization: 'Bearer SESSION-TOKEN' } } });
    expect(calls[0].auth).toBe('Bearer SESSION-TOKEN');
  });

  it('maps a denial to an MCP error result carrying the code', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'move_card', arguments: { cardId: 'c1', toListId: 'l2', toIndex: 0 } });
    expect(res.isError).toBe(true);
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'WORKFLOW_DROP_DENIED', retryable: false } });
  });
});
