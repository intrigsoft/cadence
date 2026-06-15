// The permission model — design/SPEC.md §4 + the workflow stage×role layer.
//
// THIS is the BYOA security story, enforced server-side. Board membership is
// the single source of truth for access; the workflow permissions gate moves
// and time-tracking by stage × role. Every check reads an Actor + the device
// WorkspaceState — never anything client-sent.

import type { Actor, Board, User, WorkspaceState } from './types';

type Verb = 'pick' | 'drop' | 'work';

/** Board membership = access. The single gate everything else cascades from. */
export function isBoardMember(state: WorkspaceState, userId: string, boardId: string): boolean {
  const board = state.boards[boardId];
  return !!board && board.memberIds.includes(userId);
}

/** Ids of every board the user can access, in workspace order. */
export function accessibleBoardIds(state: WorkspaceState, userId: string): string[] {
  return Object.values(state.boards)
    .filter((b) => b.memberIds.includes(userId))
    .map((b) => b.id);
}

/** The user's project role on a board (or null if unassigned). */
export function workflowRole(board: Board, userId: string) {
  const rid = board.roleAssignments[userId];
  return (rid && board.roles[rid]) || null;
}

/**
 * Can `user` perform `verb` on `listId`? Workspace admins bypass stage gates;
 * everyone else needs an assigned role with the permission bit set.
 */
export function canStage(board: Board, user: User, listId: string, verb: Verb): boolean {
  if (user.role === 'admin') return true;
  const rid = board.roleAssignments[user.id];
  if (!rid) return false;
  const perm = board.workflow.permissions[listId]?.[rid];
  return !!perm && perm[verb];
}

/** May `user` time-track on `listId`? (admins always; else per tracking map.) */
export function canTrack(board: Board, user: User, listId: string): boolean {
  const rid = board.roleAssignments[user.id];
  if (!rid) return user.role === 'admin';
  return (board.workflow.tracking[rid] || []).includes(listId);
}

/** Is this stage relevant to the user at all (any verb or tracking)? */
export function isStageRelevant(board: Board, user: User, listId: string): boolean {
  return (
    canStage(board, user, listId, 'pick') ||
    canStage(board, user, listId, 'drop') ||
    canStage(board, user, listId, 'work') ||
    canTrack(board, user, listId)
  );
}

/** Resolve the User behind an actor, or null. */
export function actorUser(state: WorkspaceState, actor: Actor | null): User | null {
  if (!actor) return null;
  return state.users[actor.userId] ?? null;
}
