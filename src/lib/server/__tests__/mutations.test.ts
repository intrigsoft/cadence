import { describe, expect, it } from 'vitest';
import { buildSeed } from '../sandbox/seed';
import {
  addCard,
  addComment,
  addList,
  assignMember,
  createBoard,
  logTime,
  patchCard,
  switchIdentity,
  timeReport,
  toggleChecklistItem
} from '../domain';
import { ForbiddenError, ValidationError } from '../errors';
import type { Actor } from '../types';

const SARAH: Actor = { userId: 'u_sarah', isAgent: false };
const TOM: Actor = { userId: 'u_tom', isAgent: false };

describe('card mutations write audit + enforce membership', () => {
  it('addCard appends to the end of a list with a create activity', () => {
    const state = buildSeed();
    const before = state.cards.filter((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_todo').length;
    const card = addCard(state, SARAH, 'b_sprint', 'l_s_todo', '  New work  ');
    expect(card.title).toBe('New work');
    expect(card.pos).toBe(before);
    expect(card.activity.at(-1)).toMatchObject({ kind: 'create', actorUserId: 'u_sarah' });
  });

  it('addCard rejects empty titles', () => {
    const state = buildSeed();
    expect(() => addCard(state, SARAH, 'b_sprint', 'l_s_todo', '   ')).toThrow(ValidationError);
  });

  it('assignMember requires the assignee to be a board member', () => {
    const state = buildSeed();
    const card = state.cards.find((c) => c.boardId === 'b_sprint')!;
    expect(() => assignMember(state, SARAH, card.id, 'u_marcus')).toThrow(ValidationError); // marcus not on sprint
    const ok = assignMember(state, SARAH, card.id, 'u_priya');
    expect(ok.members).toContain('u_priya');
  });

  it('comment + patch write audit rows attributed to the actor', () => {
    const state = buildSeed();
    const card = state.cards.find((c) => c.boardId === 'b_sprint')!;
    addComment(state, SARAH, card.id, 'looks good');
    expect(card.comments.at(-1)).toMatchObject({ userId: 'u_sarah', text: 'looks good' });
    expect(card.activity.at(-1)).toMatchObject({ kind: 'comment', actorUserId: 'u_sarah' });
    patchCard(state, SARAH, card.id, { desc: 'new desc' });
    expect(card.desc).toBe('new desc');
  });

  it('toggleChecklistItem flips done', () => {
    const state = buildSeed();
    const card = state.cards.find((c) => c.checklist.length > 0)!;
    const item = card.checklist[0];
    const original = item.done;
    const res = toggleChecklistItem(state, SARAH, card.id, item.id, !original);
    expect(res.done).toBe(!original);
  });
});

describe('list & board creation', () => {
  it('addList extends the board workflow with a usable stage', () => {
    const state = buildSeed();
    const list = addList(state, SARAH, 'b_sprint', 'Blocked');
    const board = state.boards.b_sprint;
    expect(board.lists.at(-1)!.id).toBe(list.id);
    expect(board.workflow.permissions[list.id]).toBeDefined();
  });

  it('createBoard makes the creator the sole member with default lists', () => {
    const state = buildSeed();
    const board = createBoard(state, TOM, { name: 'Tom Board', accent: '#4B3FE4', visibility: 'private' });
    expect(board.memberIds).toEqual(['u_tom']);
    expect(board.lists.map((l) => l.name)).toEqual(['To Do', 'In Progress', 'Done']);
    expect(board.roleAssignments['u_tom']).toBeDefined();
  });
});

describe('time tracking is stage×role gated', () => {
  it('Tom (Developer) can log time on Development but not Testing', () => {
    const state = buildSeed();
    const devCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_doing')!;
    const entry = logTime(state, TOM, devCard.id, { minutes: 30 });
    expect(entry.minutes).toBe(30);
    expect(entry.userId).toBe('u_tom');

    const testCard = state.cards.find((c) => c.boardId === 'b_sprint' && c.listId === 'l_s_review')!;
    expect(() => logTime(state, TOM, testCard.id, { minutes: 30 })).toThrow(ForbiddenError);
  });

  it('timeReport aggregates seeded entries by user/role/stage', () => {
    const state = buildSeed();
    const report = timeReport(state, SARAH, 'b_sprint');
    expect(report.totalMinutes).toBeGreaterThan(0);
    expect(report.byUser.length).toBeGreaterThan(0);
  });
});

describe('sandbox identity switch (re-scopes the whole app)', () => {
  it('switching from Sarah to Tom changes the current user', () => {
    const state = buildSeed();
    expect(state.currentUserId).toBe('u_sarah');
    const u = switchIdentity(state, 'u_tom');
    expect(u.id).toBe('u_tom');
    expect(state.currentUserId).toBe('u_tom');
  });
});
