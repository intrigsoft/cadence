import { describe, expect, it } from 'vitest';
import { buildSeed } from '../sandbox/seed';
import { handle } from '../api/respond';
import { bootstrap, getBoard, moveCard } from '../domain';
import type { Actor, WorkspaceState } from '../types';

// The machine-API contract (design/PHASE-2-ASSISTANT-INTEGRATION.md §7): every
// outcome comes back as { ok, ... }; the NotFound-vs-Forbidden split is the
// credential-blind boundary, surfaced to the LLM as distinct codes.

const SARAH: Actor = { userId: 'u_sarah', isAgent: true }; // agent-as-user
const TOM: Actor = { userId: 'u_tom', isAgent: true };

function locals(state: WorkspaceState, actor: Actor | null) {
  return { state, actor };
}
const read = (res: Response) => res.json();

describe('machine-API response contract', () => {
  it('missing actor => 401 AUTH_REQUIRED', async () => {
    const state = buildSeed();
    const res = handle(locals(state, null), (s, a) => bootstrap(s, a));
    expect(res.status).toBe(401);
    expect(await read(res)).toMatchObject({ ok: false, code: 'AUTH_REQUIRED' });
  });

  it('success => { ok:true, data }', async () => {
    const state = buildSeed();
    const res = handle(locals(state, SARAH), (s, a) => bootstrap(s, a));
    expect(res.status).toBe(200);
    const body = await read(res);
    expect(body.ok).toBe(true);
    expect(body.data.currentUser.id).toBe('u_sarah');
  });

  it('hidden board => 404 NOT_FOUND (existence not leaked, no role detail)', async () => {
    const state = buildSeed();
    const res = handle(locals(state, TOM), (s, a) => getBoard(s, a, 'b_leadership'));
    expect(res.status).toBe(404);
    const body = await read(res);
    expect(body).toMatchObject({ ok: false, code: 'NOT_FOUND', retryable: false });
    expect(JSON.stringify(body)).not.toContain('Leadership');
  });

  it('workflow denial on a VISIBLE board => 403 with a specific code', async () => {
    const state = buildSeed();
    const backlogCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_backlog')!;
    const res = handle(locals(state, TOM), (s, a) => moveCard(s, a, backlogCard.id, 'l_s_todo', 0));
    expect(res.status).toBe(403);
    expect(await read(res)).toMatchObject({ ok: false, code: 'WORKFLOW_PICK_DENIED' });
  });

  it('agent action still writes audit attributed to the user (kind:agent)', async () => {
    const state = buildSeed();
    const card = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    const res = handle(locals(state, TOM), (s, a) => moveCard(s, a, card.id, 'l_s_stage', 0));
    expect((await read(res)).ok).toBe(true);
    expect(card.activity.at(-1)).toMatchObject({ kind: 'agent', actorUserId: 'u_tom' });
  });
});
