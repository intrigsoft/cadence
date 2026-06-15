// Domain operations — the single set of functions shared by the UI flows
// (load() + form actions) and the machine API (/api/*). Both pass an Actor +
// the device WorkspaceState; only the auth SOURCE differs, never the logic.
//
// Audit is written here on every mutation (appendActivity), so when the phase-2
// DioscHub agent acts it's simply another actorUserId — the ActivityRow
// "acting as {email}" chip already renders it.

import { ForbiddenError, NotFoundError, UnauthorizedError, ValidationError } from './errors';
import { accessibleBoardIds, actorUser, canStage, canTrack } from './permissions';
import type {
  Activity,
  ActivityKind,
  Actor,
  Board,
  BoardSummary,
  Card,
  ChecklistItem,
  Comment,
  List,
  Role,
  StagePerm,
  TimeEntry,
  User,
  Visibility,
  Workflow,
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

// ---- card resolution helper ------------------------------------------------

interface CardCtx {
  user: User;
  card: Card;
  board: Board;
}

/** Resolve a card with the membership gate applied (NotFound if hidden). */
function cardCtx(state: WorkspaceState, actor: Actor | null, cardId: string): CardCtx {
  const user = requireUser(state, actor);
  const card = state.cards.find((c) => c.id === cardId);
  if (!card) throw new NotFoundError();
  const board = getBoard(state, actor, card.boardId); // membership gate
  return { user, card, board };
}

function actorKind(actor: Actor | null, human: ActivityKind): ActivityKind {
  return actor?.isAgent ? 'agent' : human;
}

// ---- card mutations --------------------------------------------------------

/** Create a card at the end of a list (the "Add a card" composer). */
export function addCard(
  state: WorkspaceState,
  actor: Actor | null,
  boardId: string,
  listId: string,
  title: string
): Card {
  const user = requireUser(state, actor);
  const board = getBoard(state, actor, boardId);
  if (!board.lists.some((l) => l.id === listId)) throw new NotFoundError('Unknown list');
  const text = title.trim();
  if (!text) throw new ValidationError('Card title is required');

  const pos = state.cards.filter((c) => c.boardId === boardId && c.listId === listId).length;
  const card: Card = {
    id: 'c_' + crypto.randomUUID(),
    boardId,
    listId,
    pos,
    title: text,
    labels: [],
    members: [],
    checklist: [],
    comments: [],
    activity: [],
    timeEntries: []
  };
  state.cards.push(card);
  appendActivity(card, { kind: actorKind(actor, 'create'), actorUserId: user.id, text: 'created this card' });
  return card;
}

/** Catch-all card edit — title / description / due date. */
export function patchCard(
  state: WorkspaceState,
  actor: Actor | null,
  cardId: string,
  patch: { title?: string; desc?: string; due?: string | null }
): Card {
  const { user, card } = cardCtx(state, actor, cardId);
  if (patch.title !== undefined) {
    const t = patch.title.trim();
    if (!t) throw new ValidationError('Title cannot be empty');
    card.title = t;
  }
  if (patch.desc !== undefined) card.desc = patch.desc;
  if (patch.due !== undefined) card.due = patch.due ?? undefined;
  appendActivity(card, { kind: actorKind(actor, 'edit'), actorUserId: user.id, text: 'updated this card' });
  return card;
}

export function deleteCard(state: WorkspaceState, actor: Actor | null, cardId: string): void {
  cardCtx(state, actor, cardId); // gate
  state.cards = state.cards.filter((c) => c.id !== cardId);
}

/** Assign a board member to a card. Assignee must be a member of the board. */
export function assignMember(state: WorkspaceState, actor: Actor | null, cardId: string, userId: string): Card {
  const { user, card, board } = cardCtx(state, actor, cardId);
  if (!board.memberIds.includes(userId)) throw new ValidationError('Assignee must be a board member');
  if (!card.members.includes(userId)) {
    card.members.push(userId);
    const who = state.users[userId]?.name ?? userId;
    appendActivity(card, { kind: actorKind(actor, 'assign'), actorUserId: user.id, text: `assigned ${who}` });
  }
  return card;
}

export function unassignMember(state: WorkspaceState, actor: Actor | null, cardId: string, userId: string): Card {
  const { user, card } = cardCtx(state, actor, cardId);
  if (card.members.includes(userId)) {
    card.members = card.members.filter((m) => m !== userId);
    const who = state.users[userId]?.name ?? userId;
    appendActivity(card, { kind: actorKind(actor, 'assign'), actorUserId: user.id, text: `unassigned ${who}` });
  }
  return card;
}

export function addLabel(state: WorkspaceState, actor: Actor | null, cardId: string, labelId: string): Card {
  const { card } = cardCtx(state, actor, cardId);
  if (!state.labels[labelId]) throw new ValidationError('Unknown label');
  if (!card.labels.includes(labelId)) card.labels.push(labelId);
  return card;
}

export function removeLabel(state: WorkspaceState, actor: Actor | null, cardId: string, labelId: string): Card {
  const { card } = cardCtx(state, actor, cardId);
  card.labels = card.labels.filter((l) => l !== labelId);
  return card;
}

export function addChecklistItem(state: WorkspaceState, actor: Actor | null, cardId: string, text: string): ChecklistItem {
  const { card } = cardCtx(state, actor, cardId);
  const t = text.trim();
  if (!t) throw new ValidationError('Checklist item text is required');
  const item: ChecklistItem = { id: 'k_' + crypto.randomUUID(), text: t, done: false };
  card.checklist.push(item);
  return item;
}

export function toggleChecklistItem(
  state: WorkspaceState,
  actor: Actor | null,
  cardId: string,
  itemId: string,
  done: boolean
): ChecklistItem {
  const { card } = cardCtx(state, actor, cardId);
  const item = card.checklist.find((i) => i.id === itemId);
  if (!item) throw new NotFoundError('Unknown checklist item');
  item.done = done;
  return item;
}

export function removeChecklistItem(state: WorkspaceState, actor: Actor | null, cardId: string, itemId: string): Card {
  const { card } = cardCtx(state, actor, cardId);
  card.checklist = card.checklist.filter((i) => i.id !== itemId);
  return card;
}

/** Post a comment; appended to the activity feed as the actor. */
export function addComment(state: WorkspaceState, actor: Actor | null, cardId: string, text: string): Comment {
  const { user, card } = cardCtx(state, actor, cardId);
  const t = text.trim();
  if (!t) throw new ValidationError('Comment cannot be empty');
  const comment: Comment = { id: 'm_' + crypto.randomUUID(), userId: user.id, at: new Date().toISOString(), text: t };
  card.comments.push(comment);
  appendActivity(card, { kind: actorKind(actor, 'comment'), actorUserId: user.id, text: 'commented' });
  return comment;
}

// ---- list & board mutations ------------------------------------------------

export function addList(state: WorkspaceState, actor: Actor | null, boardId: string, name: string): List {
  getBoard(state, actor, boardId); // membership gate
  const board = state.boards[boardId];
  const n = name.trim();
  if (!n) throw new ValidationError('List name is required');
  const list: List = { id: 'l_' + crypto.randomUUID(), name: n };
  board.lists.push(list);
  // Extend the workflow so the new stage is usable (full perms for every role).
  board.workflow.nodes[list.id] = { x: 40 + (board.lists.length - 1) * 240, y: 150 };
  const perms: Record<string, StagePerm> = {};
  for (const rid of Object.keys(board.roles)) {
    perms[rid] = { pick: true, drop: true, work: true };
    if (!board.workflow.tracking[rid]) board.workflow.tracking[rid] = [];
    board.workflow.tracking[rid].push(list.id);
  }
  board.workflow.permissions[list.id] = perms;
  return list;
}

/** Create a board. Creator becomes the sole initial member; default lists. */
export function createBoard(
  state: WorkspaceState,
  actor: Actor | null,
  input: { name: string; accent: string; visibility: Visibility }
): Board {
  const user = requireUser(state, actor);
  const name = input.name.trim();
  if (!name) throw new ValidationError('Board name is required');

  const id = 'b_' + crypto.randomUUID();
  const lists: List[] = [
    { id: 'l_' + crypto.randomUUID(), name: 'To Do' },
    { id: 'l_' + crypto.randomUUID(), name: 'In Progress' },
    { id: 'l_' + crypto.randomUUID(), name: 'Done' }
  ];
  const rid = 'r_all';
  const role: Role = { id: rid, name: 'Contributor', color: input.accent };
  const nodes: Record<string, { x: number; y: number }> = {};
  const edges: Array<{ from: string; to: string }> = [];
  const permissions: Record<string, Record<string, StagePerm>> = {};
  lists.forEach((l, i) => {
    nodes[l.id] = { x: 40 + i * 240, y: 150 };
    permissions[l.id] = { [rid]: { pick: true, drop: true, work: true } };
    if (i > 0) edges.push({ from: lists[i - 1].id, to: l.id });
  });

  const board: Board = {
    id,
    name,
    subtitle: '',
    accent: input.accent,
    visibility: input.visibility,
    memberIds: [user.id],
    lists,
    roles: { [rid]: role },
    roleAssignments: { [user.id]: rid },
    workflow: { nodes, edges, permissions, tracking: { [rid]: lists.map((l) => l.id) } }
  };
  state.boards[id] = board;
  return board;
}

/** Add a board member — the lever that changes scope (membership = access). */
export function addBoardMember(state: WorkspaceState, actor: Actor | null, boardId: string, userId: string): Board {
  const board = getBoard(state, actor, boardId);
  if (!state.users[userId]) throw new ValidationError('Unknown user');
  if (!board.memberIds.includes(userId)) {
    board.memberIds.push(userId);
    const rid = Object.keys(board.roles)[0];
    if (rid && !board.roleAssignments[userId]) board.roleAssignments[userId] = rid;
  }
  return board;
}

export function removeBoardMember(state: WorkspaceState, actor: Actor | null, boardId: string, userId: string): Board {
  const board = getBoard(state, actor, boardId);
  board.memberIds = board.memberIds.filter((m) => m !== userId);
  delete board.roleAssignments[userId];
  return board;
}

// ---- time tracking ---------------------------------------------------------

/**
 * Log time on a card. The actor's role must be allowed to track the card's
 * current stage (design/SPEC §6). roleId is derived from the actor's board
 * assignment, never trusted from the client.
 */
export function logTime(
  state: WorkspaceState,
  actor: Actor | null,
  cardId: string,
  input: { minutes: number; manual?: boolean; listId?: string }
): TimeEntry {
  const { user, card, board } = cardCtx(state, actor, cardId);
  const minutes = Math.round(input.minutes);
  if (!Number.isFinite(minutes) || minutes <= 0) throw new ValidationError('Minutes must be a positive number');

  const listId = input.listId ?? card.listId;
  if (!canTrack(board, user, listId)) throw new ForbiddenError('Your role cannot track time on this stage');
  const roleId = board.roleAssignments[user.id] ?? Object.keys(board.roles)[0];

  const entry: TimeEntry = {
    id: 'te_' + crypto.randomUUID(),
    userId: user.id,
    roleId,
    listId,
    minutes,
    at: new Date().toISOString(),
    manual: !!input.manual
  };
  card.timeEntries.push(entry);
  return entry;
}

export interface TimeReportRow {
  key: string;
  minutes: number;
}
export interface TimeReport {
  totalMinutes: number;
  byUser: TimeReportRow[];
  byRole: TimeReportRow[];
  byStage: TimeReportRow[];
}

/** Board-level time report — aggregation of card timeEntries. Member-gated. */
export function timeReport(state: WorkspaceState, actor: Actor | null, boardId: string): TimeReport {
  const board = getBoard(state, actor, boardId);
  const byUser = new Map<string, number>();
  const byRole = new Map<string, number>();
  const byStage = new Map<string, number>();
  let totalMinutes = 0;
  for (const card of state.cards) {
    if (card.boardId !== boardId) continue;
    for (const e of card.timeEntries) {
      totalMinutes += e.minutes;
      byUser.set(e.userId, (byUser.get(e.userId) ?? 0) + e.minutes);
      byRole.set(e.roleId, (byRole.get(e.roleId) ?? 0) + e.minutes);
      byStage.set(e.listId, (byStage.get(e.listId) ?? 0) + e.minutes);
    }
  }
  const rows = (m: Map<string, number>): TimeReportRow[] =>
    [...m.entries()].map(([key, minutes]) => ({ key, minutes })).sort((a, b) => b.minutes - a.minutes);
  void board;
  return { totalMinutes, byUser: rows(byUser), byRole: rows(byRole), byStage: rows(byStage) };
}

// ---- timers ----------------------------------------------------------------

export interface RunningTimer {
  cardId: string;
  startedAt: number;
}

export function runningTimer(state: WorkspaceState, actor: Actor | null): RunningTimer | null {
  const user = actorUser(state, actor);
  if (!user) return null;
  return state.timers[user.id] ?? null;
}

/** Start a timer on a card (auto-stops + logs any other running timer first). */
export function startTimer(state: WorkspaceState, actor: Actor | null, cardId: string): void {
  const { user, card, board } = cardCtx(state, actor, cardId);
  if (!canTrack(board, user, card.listId)) throw new ForbiddenError('Your role cannot track time on this stage');
  const existing = state.timers[user.id];
  if (existing && existing.cardId !== cardId) commitTimer(state, user.id);
  state.timers[user.id] = { cardId, startedAt: Date.now() };
}

/** Stop the actor's running timer, logging the elapsed minutes as an entry. */
export function stopTimer(state: WorkspaceState, actor: Actor | null): TimeEntry | null {
  const user = requireUser(state, actor);
  return commitTimer(state, user.id);
}

function commitTimer(state: WorkspaceState, userId: string): TimeEntry | null {
  const timer = state.timers[userId];
  if (!timer) return null;
  delete state.timers[userId];
  const card = state.cards.find((c) => c.id === timer.cardId);
  if (!card) return null;
  const board = state.boards[card.boardId];
  const minutes = Math.max(1, Math.round((Date.now() - timer.startedAt) / 60000));
  const entry: TimeEntry = {
    id: 'te_' + crypto.randomUUID(),
    userId,
    roleId: board?.roleAssignments[userId] ?? Object.keys(board?.roles ?? {})[0] ?? '',
    listId: card.listId,
    minutes,
    at: new Date().toISOString(),
    manual: false
  };
  card.timeEntries.push(entry);
  return entry;
}

// ---- workflow designer (admin-only) ----------------------------------------

/**
 * Replace the editable board structure from the Workflow Designer: lists,
 * roles, role assignments, and the workflow (nodes/edges/permissions/tracking).
 * Admin-gated — the stage×role permissions this writes are enforced everywhere.
 */
export function saveWorkflow(
  state: WorkspaceState,
  actor: Actor | null,
  boardId: string,
  payload: { lists?: List[]; roles?: Record<string, Role>; roleAssignments?: Record<string, string>; workflow?: Workflow }
): Board {
  const user = requireUser(state, actor);
  const board = state.boards[boardId];
  if (!board || !board.memberIds.includes(user.id)) throw new NotFoundError();
  if (user.role !== 'admin') throw new ForbiddenError('Only workspace admins can edit the workflow');
  if (payload.lists) board.lists = payload.lists;
  if (payload.roles) board.roles = payload.roles;
  if (payload.roleAssignments) board.roleAssignments = payload.roleAssignments;
  if (payload.workflow) board.workflow = payload.workflow;
  return board;
}

// ---- sandbox identity (sandbox-only; replaced by real SSO in production) ----

/** Switch the device's signed-in identity (login picker / "switch demo identity"). */
export function switchIdentity(state: WorkspaceState, userId: string): User {
  const user = state.users[userId];
  if (!user) throw new NotFoundError('Unknown user');
  state.currentUserId = userId;
  return user;
}

/** Sign in to the device sandbox as a seeded user (login screen / SSO stand-in). */
export function signIn(state: WorkspaceState, userId: string): User {
  const user = switchIdentity(state, userId);
  state.authed = true;
  return user;
}

/** Resolve a seeded user by email (the email sign-in path). */
export function findUserByEmail(state: WorkspaceState, email: string): User | null {
  const e = email.trim().toLowerCase();
  return Object.values(state.users).find((u) => u.email.toLowerCase() === e) ?? null;
}

/** Sign out of the device's sandbox (returns to the login screen). */
export function signOut(state: WorkspaceState): void {
  state.authed = false;
}

/** The seeded users offered by the sandbox identity picker, in demo order. */
export function personaList(state: WorkspaceState): Array<User & { boardCount: number }> {
  return state.personaOrder
    .map((id) => state.users[id])
    .filter(Boolean)
    .map((u) => ({ ...u, boardCount: accessibleBoardIds(state, u.id).length }));
}
