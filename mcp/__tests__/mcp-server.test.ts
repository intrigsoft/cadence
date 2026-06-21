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
      const method = init?.method ?? 'GET';
      const headers = new Headers(init?.headers);
      calls.push({ url: u, method, auth: headers.get('authorization') });
      const json = (data: unknown, status = 200) => new Response(JSON.stringify({ ok: true, data }), { status });
      if (u.includes('/cards/c1/move')) {
        return new Response(JSON.stringify({ ok: false, code: 'WORKFLOW_DROP_DENIED', message: "can't drop here", retryable: false }), { status: 403 });
      }
      // Fat create_card / update_card fan-out: a card to key off, then a final read.
      if (method === 'POST' && u.endsWith('/api/v1/cards')) {
        return json({ id: 'c_new', labels: [], members: [], checklist: [] }, 201);
      }
      if (u.includes('/checklist')) {
        return json({ id: 'ci_new', text: 'x', done: false }, 201);
      }
      if (method === 'GET' && u.includes('/api/v1/cards/')) {
        return json({ id: 'c_new', labels: ['lbl_red'], members: ['u_amir'], checklist: [{ id: 'ci_new', text: 'Draft', done: false }] });
      }
      return json({ currentUser: { id: 'u_sarah' } });
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
  it('exposes the intent-shaped broad tool surface (26 tools)', async () => {
    const client = await connect();
    const { tools } = await client.listTools();
    const names = tools.map((t) => t.name);
    expect(tools).toHaveLength(26);
    expect(names).toEqual(expect.arrayContaining(['whoami', 'list_boards', 'create_card', 'update_card', 'move_card', 'log_time', 'stop_timer']));
    // Granular workflow editing replaces the whole-graph save_workflow on the LLM
    // surface (so a rebuilt payload can't clobber untouched stages/roles).
    expect(names).toEqual(expect.arrayContaining(['rename_stage', 'remove_stage', 'reorder_stage', 'set_stage_permission', 'set_stage_tracking', 'assign_board_role']));
    expect(names).not.toEqual(expect.arrayContaining(['save_workflow']));
    // The surgical card-edit tools were folded into create_card / update_card.
    expect(names).not.toEqual(expect.arrayContaining(['add_label', 'assign_member', 'add_checklist_item', 'toggle_checklist_item']));
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

  it('create_card builds the whole card in ONE tool call, fanning out internally', async () => {
    const client = await connect();
    const res = await client.callTool({
      name: 'create_card',
      arguments: {
        boardId: 'b1',
        listId: 'l1',
        title: 'Draft',
        desc: 'spec it',
        labelIds: ['lbl_red'],
        assigneeIds: ['u_amir'],
        checklist: ['Outline', 'Review'],
      },
    });
    expect(res.isError).toBeFalsy();

    // One create, then the extras forwarded to the existing granular endpoints,
    // then a final read — all from a single model-facing tool call.
    const writes = calls.filter((c) => c.method !== 'GET');
    expect(calls.find((c) => c.method === 'POST' && c.url.endsWith('/api/v1/cards'))).toBeTruthy();
    expect(writes.some((c) => c.url.includes('/cards/c_new/labels'))).toBe(true);
    expect(writes.some((c) => c.url.includes('/cards/c_new/members'))).toBe(true);
    expect(writes.filter((c) => c.url.includes('/cards/c_new/checklist'))).toHaveLength(2);
    expect(calls.some((c) => c.method === 'GET' && c.url.includes('/api/v1/cards/c_new'))).toBe(true);

    const payload = JSON.parse((res.content as Array<{ type: string; text: string }>)[0].text);
    expect(payload.card).toMatchObject({ id: 'c_new' });
    expect(payload.applied).toEqual(expect.arrayContaining(['details', 'label:lbl_red', 'assignee:u_amir', 'checklist:Outline']));
  });

  it('update_card reconciles labels to the desired set (adds missing, removes extra)', async () => {
    const client = await connect();
    // Current card (from the GET stub) has labels ['lbl_red'], members ['u_amir'].
    const res = await client.callTool({ name: 'update_card', arguments: { cardId: 'c_new', labelIds: ['lbl_blue'] } });
    expect(res.isError).toBeFalsy();
    const writes = calls.filter((c) => c.method !== 'GET');
    expect(writes.some((c) => c.method === 'POST' && c.url.includes('/cards/c_new/labels'))).toBe(true); // add lbl_blue
    expect(writes.some((c) => c.method === 'DELETE' && c.url.includes('/cards/c_new/labels/lbl_red'))).toBe(true); // remove lbl_red
  });

  it('maps a denial to an MCP error result carrying the code', async () => {
    const client = await connect();
    const res = await client.callTool({ name: 'move_card', arguments: { cardId: 'c1', toListId: 'l2', toIndex: 0 } });
    expect(res.isError).toBe(true);
    const text = (res.content as Array<{ type: string; text: string }>)[0].text;
    expect(JSON.parse(text)).toMatchObject({ error: { code: 'WORKFLOW_DROP_DENIED', retryable: false } });
  });
});
