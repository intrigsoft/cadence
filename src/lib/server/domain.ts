// Domain operations — the single set of functions shared by the UI flows
// (load() + form actions) and the machine API (/api/*). Both pass an Actor +
// the device WorkspaceState; only the auth SOURCE differs, never the logic.
//
// Audit is written here on every mutation (appendActivity), so when the phase-2
// DioscHub agent acts it's simply another actorUserId — the ActivityRow
// "acting as {email}" chip already renders it.

import { ForbiddenError, NotFoundError, UnauthorizedError } from './errors';
import { accessibleBoardIds, actorUser, canStage } from './permissions';
import type {
  Activity,
  ActivityKind,
  Actor,
  Board,
  BoardSummary,
  Card,
  User,
  Workspace,
  WorkspaceState
} from './types';

// ---- helpers ---------------------------------------------------------------

function requireUser(state: WorkspaceState, actor: Actor | null): User {
  const user = actorUser(state, actor);
  if (!user) throw new UnauthorizedError();
  return user;
}

function cardCount(state: WorkspaceState, boardId: string): number {
  return state.cards.reduce((n, c) => (c.boardId === boardId ? n + 1 : n), 0);
}

function toSummary(state: WorkspaceState, board: Board): BoardSummary {
  return {
    id: board.id,
    name: board.name,
    subtitle: board.subtitle,
    accent: board.accent,
    visibility: board.visibility,
    memberIds: board.memberIds,
    cardCount: cardCount(state, board.id)
  };
}

function listName(board: Board, listId: string): string {
  return board.lists.find((l) => l.id === listId)?.name ?? listId;
}

/** Append an audit entry to a card. The compliance surface — call on every mutation. */
export function appendActivity(
  card: Card,
  entry: { kind: ActivityKind; actorUserId: string; text: string }
): Activity {
  const activity: Activity = {
    id: 'a_' + crypto.randomUUID(),
    at: new Date().toISOString(),
    ...entry
  };
  card.activity.push(activity);
  return activity;
}

// ---- read paths ------------------------------------------------------------

export interface Bootstrap {
  workspace: Workspace;
  currentUser: User;
  boards: BoardSummary[];
  totalBoardCount: number;
  accessibleBoardCount: number;
}

/** Everything the shell needs on load — scoped to the actor (design/API_CONTRACT GET /me/workspace). */
export function bootstrap(state: WorkspaceState, actor: Actor | null): Bootstrap {
  const user = requireUser(state, actor);
  const boards = accessibleBoardIds(state, user.id).map((id) => toSummary(state, state.boards[id]));
  return {
    workspace: state.workspace,
    currentUser: user,
    boards,
    totalBoardCount: Object.keys(state.boards).length,
    accessibleBoardCount: boards.length
  };
}

/** Board summaries the actor can access (sidebar + home grid). */
export function accessibleBoards(state: WorkspaceState, actor: Actor | null): BoardSummary[] {
  const user = requireUser(state, actor);
  return accessibleBoardIds(state, user.id).map((id) => toSummary(state, state.boards[id]));
}

/**
 * The full board for the kanban view. NotFound (not 403) if the actor isn't a
 * member, so existence of private boards isn't leaked.
 */
export function getBoard(state: WorkspaceState, actor: Actor | null, boardId: string): Board {
  const user = requireUser(state, actor);
  const board = state.boards[boardId];
  if (!board || !board.memberIds.includes(user.id)) throw new NotFoundError();
  return board;
}

/** Cards on a board, ordered by list then pos. Membership-gated. */
export function cardsForBoard(state: WorkspaceState, actor: Actor | null, boardId: string): Card[] {
  const board = getBoard(state, actor, boardId);
  const order = new Map(board.lists.map((l, i) => [l.id, i]));
  return state.cards
    .filter((c) => c.boardId === boardId)
    .sort((a, b) => (order.get(a.listId)! - order.get(b.listId)!) || a.pos - b.pos);
}

/** Scoped card search — only boards the actor can access (design/API_CONTRACT GET /search/cards). */
export function searchCards(state: WorkspaceState, actor: Actor | null, q: string): Card[] {
  const user = requireUser(state, actor);
  const query = q.trim().toLowerCase();
  if (!query) return [];
  const scoped = new Set(accessibleBoardIds(state, user.id));
  const labelName = (id: string) => state.labels[id]?.name.toLowerCase() ?? '';
  return state.cards.filter((c) => {
    if (!scoped.has(c.boardId)) return false;
    return (
      c.title.toLowerCase().includes(query) ||
      (c.desc?.toLowerCase().includes(query) ?? false) ||
      c.labels.some((l) => labelName(l).includes(query))
    );
  });
}

/** Cards assigned to the actor across accessible boards (My Cards). */
export function myCards(state: WorkspaceState, actor: Actor | null): Card[] {
  const user = requireUser(state, actor);
  const scoped = new Set(accessibleBoardIds(state, user.id));
  return state.cards.filter((c) => scoped.has(c.boardId) && c.members.includes(user.id));
}

// ---- mutations -------------------------------------------------------------

export interface MoveResult {
  card: Card;
  affectedListIds: string[];
}

/**
 * Move/reorder a card. Enforces BOTH gates:
 *  - board membership (NotFound if not a member)
 *  - workflow: actor's role needs `pick` on the source stage and `drop` on the
 *    target stage (Forbidden otherwise) — design/API_CONTRACT "card moves are
 *    workflow-checked".
 * Writes an audit Activity and re-packs `pos` in both lists.
 */
export function moveCard(
  state: WorkspaceState,
  actor: Actor | null,
  cardId: string,
  toListId: string,
  toIndex: number
): MoveResult {
  const user = requireUser(state, actor);
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) throw new NotFoundError();

  const board = getBoard(state, actor, card.boardId); // membership gate
  if (!board.lists.some((l) => l.id === toListId)) throw new NotFoundError('Unknown list');

  const fromListId = card.listId;

  // Workflow stage×role gate. A same-list reorder only needs `drop` on the list.
  if (fromListId !== toListId) {
    if (!canStage(board, user, fromListId, 'pick')) throw new ForbiddenError('No permission to move cards out of this stage');
    if (!canStage(board, user, toListId, 'drop')) throw new ForbiddenError('No permission to move cards into this stage');
  } else if (!canStage(board, user, toListId, 'drop')) {
    throw new ForbiddenError('No permission to reorder in this stage');
  }

  // Re-pack: pull the card out, splice into the target list at toIndex.
  card.listId = toListId;
  const target = state.cards
    .filter((c) => c.boardId === board.id && c.listId === toListId && c.id !== cardId)
    .sort((a, b) => a.pos - b.pos);
  const idx = Math.max(0, Math.min(toIndex, target.length));
  target.splice(idx, 0, card);
  target.forEach((c, i) => (c.pos = i));

  // Re-pack the source list too (when distinct).
  if (fromListId !== toListId) {
    state.cards
      .filter((c) => c.boardId === board.id && c.listId === fromListId)
      .sort((a, b) => a.pos - b.pos)
      .forEach((c, i) => (c.pos = i));
  }

  const isAgent = actor?.isAgent ?? false;
  appendActivity(card, {
    kind: isAgent ? 'agent' : 'move',
    actorUserId: user.id,
    text:
      fromListId === toListId
        ? `reordered this card in ${listName(board, toListId)}`
        : `moved this card from ${listName(board, fromListId)} to ${listName(board, toListId)}`
  });

  const affectedListIds = fromListId === toListId ? [toListId] : [fromListId, toListId];
  return { card, affectedListIds };
}
