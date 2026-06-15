import { describe, expect, it } from 'vitest';
import { buildSeed } from '../sandbox/seed';
import { accessibleBoards, bootstrap, getBoard, moveCard, myCards } from '../domain';
import { NotFoundError, ForbiddenError } from '../errors';
import type { Actor } from '../types';

const SARAH: Actor = { userId: 'u_sarah', isAgent: false };
const TOM: Actor = { userId: 'u_tom', isAgent: false };

describe('board membership scoping (SPEC §4 — the BYOA demo)', () => {
  it('Sarah (admin) sees 4 boards; Tom (guest) sees 2 — the live downgrade', () => {
    const state = buildSeed();
    expect(accessibleBoards(state, SARAH).map((b) => b.id).sort()).toEqual(
      ['b_bugs', 'b_leadership', 'b_roadmap', 'b_sprint'].sort()
    );
    expect(accessibleBoards(state, TOM).map((b) => b.id).sort()).toEqual(['b_bugs', 'b_sprint'].sort());
  });

  it('bootstrap exposes only a count of hidden boards, never names', () => {
    const state = buildSeed();
    const boot = bootstrap(state, TOM);
    expect(boot.totalBoardCount).toBe(5);
    expect(boot.accessibleBoardCount).toBe(2);
    // Leadership must not leak via the bootstrap payload.
    expect(JSON.stringify(boot.boards)).not.toContain('Leadership');
  });

  it('Leadership Planning is admin-only: hidden from a non-member as 404, not 403', () => {
    const state = buildSeed();
    expect(() => getBoard(state, TOM, 'b_leadership')).toThrow(NotFoundError);
  });

  it('reports stable seed counts (13 sprint cards, 16 assigned to Sarah)', () => {
    const state = buildSeed();
    expect(state.cards.filter((c) => c.boardId === 'b_sprint')).toHaveLength(13);
    expect(myCards(state, SARAH)).toHaveLength(16);
  });
});

describe('workflow stage×role gating (enforced server-side)', () => {
  it('Tom (Developer) cannot move a card out of Backlog — no pick on that stage', () => {
    const state = buildSeed();
    const backlogCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_backlog')!;
    expect(() => moveCard(state, TOM, backlogCard.id, 'l_s_todo', 0)).toThrow(ForbiddenError);
  });

  it('Tom (Developer) CAN move a card within Development → Staging (pick+drop allowed)', () => {
    const state = buildSeed();
    const devCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    const res = moveCard(state, TOM, devCard.id, 'l_s_stage', 0);
    expect(res.card.listId).toBe('l_s_stage');
    // audit written, attributed to Tom, kind 'move' (human actor)
    const last = res.card.activity.at(-1)!;
    expect(last).toMatchObject({ kind: 'move', actorUserId: 'u_tom' });
  });

  it('Sarah (workspace admin) bypasses stage gates entirely', () => {
    const state = buildSeed();
    const backlogCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_backlog')!;
    const res = moveCard(state, SARAH, backlogCard.id, 'l_s_done', 0);
    expect(res.card.listId).toBe('l_s_done');
  });

  it('agent actor attributes the move as kind:"agent" under the same user', () => {
    const state = buildSeed();
    const card = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    const res = moveCard(state, { userId: 'u_tom', isAgent: true }, card.id, 'l_s_stage', 0);
    expect(res.card.activity.at(-1)).toMatchObject({ kind: 'agent', actorUserId: 'u_tom' });
  });
});
