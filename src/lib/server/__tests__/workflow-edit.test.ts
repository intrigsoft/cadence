// Granular workflow editing — the targeted alternative to saveWorkflow's
// whole-graph replace. The headline test is the corruption regression: changing
// one role's permission must leave every OTHER role's entry on that stage intact.
import { describe, expect, it } from 'vitest';
import { buildSeed } from '../sandbox/seed';
import {
  addList,
  assignBoardRole,
  removeStage,
  renameStage,
  reorderStage,
  setStagePermission,
  setStageTracking
} from '../domain';
import { ForbiddenError, NotFoundError, ValidationError } from '../errors';
import type { Actor } from '../types';

const SARAH: Actor = { userId: 'u_sarah', isAgent: false }; // workspace admin
const TOM: Actor = { userId: 'u_tom', isAgent: false }; // member (non-admin)

const triagedPerms = (state: ReturnType<typeof buildSeed>) =>
  state.boards.b_bugs.workflow.permissions['l_b_triaged'];

describe('granular workflow editing (admin-only, single-purpose)', () => {
  it('setStagePermission changes ONE role and leaves other roles untouched (corruption regression)', () => {
    const state = buildSeed();
    // Seed: l_b_triaged => r_blead {1,1,1}, r_bdev {pick:1, drop:0, work:0}
    setStagePermission(state, SARAH, 'b_bugs', 'l_b_triaged', 'r_bdev', { drop: true });
    const perms = triagedPerms(state);
    expect(perms.r_bdev).toEqual({ pick: true, drop: true, work: false }); // only drop flipped
    expect(perms.r_blead).toEqual({ pick: true, drop: true, work: true }); // Lead entry intact
  });

  it('setStagePermission only touches the verbs passed', () => {
    const state = buildSeed();
    setStagePermission(state, SARAH, 'b_bugs', 'l_b_triaged', 'r_bdev', { work: true });
    expect(triagedPerms(state).r_bdev).toEqual({ pick: true, drop: false, work: true });
  });

  it('setStagePermission rejects a non-admin and an unknown role', () => {
    const state = buildSeed();
    expect(() => setStagePermission(state, TOM, 'b_bugs', 'l_b_triaged', 'r_bdev', { drop: true })).toThrow(ForbiddenError);
    expect(() => setStagePermission(state, SARAH, 'b_bugs', 'l_b_triaged', 'r_nope', { drop: true })).toThrow(ValidationError);
  });

  it('renameStage renames in place; unknown stage is NOT_FOUND', () => {
    const state = buildSeed();
    renameStage(state, SARAH, 'b_bugs', 'l_b_triaged', '  Triage Queue  ');
    expect(state.boards.b_bugs.lists.find((l) => l.id === 'l_b_triaged')!.name).toBe('Triage Queue');
    expect(() => renameStage(state, SARAH, 'b_bugs', 'l_missing', 'x')).toThrow(NotFoundError);
  });

  it('removeStage refuses while cards remain, succeeds once empty, and cleans the workflow', () => {
    const state = buildSeed();
    expect(() => removeStage(state, SARAH, 'b_bugs', 'l_b_new')).toThrow(ValidationError); // has cards
    const fresh = addList(state, SARAH, 'b_bugs', 'Scratch');
    removeStage(state, SARAH, 'b_bugs', fresh.id);
    expect(state.boards.b_bugs.lists.find((l) => l.id === fresh.id)).toBeUndefined();
    expect(state.boards.b_bugs.workflow.permissions[fresh.id]).toBeUndefined();
    expect(state.boards.b_bugs.workflow.nodes[fresh.id]).toBeUndefined();
  });

  it('reorderStage moves a stage to a new index', () => {
    const state = buildSeed();
    reorderStage(state, SARAH, 'b_bugs', 'l_b_verify', 0);
    expect(state.boards.b_bugs.lists[0].id).toBe('l_b_verify');
  });

  it('setStageTracking toggles a role on and off for a stage', () => {
    const state = buildSeed();
    setStageTracking(state, SARAH, 'b_bugs', 'l_b_new', 'r_bdev', true);
    expect(state.boards.b_bugs.workflow.tracking.r_bdev).toContain('l_b_new');
    setStageTracking(state, SARAH, 'b_bugs', 'l_b_new', 'r_bdev', false);
    expect(state.boards.b_bugs.workflow.tracking.r_bdev ?? []).not.toContain('l_b_new');
  });

  it('assignBoardRole assigns and clears a member role; rejects non-members', () => {
    const state = buildSeed();
    assignBoardRole(state, SARAH, 'b_bugs', 'u_tom', 'r_blead');
    expect(state.boards.b_bugs.roleAssignments.u_tom).toBe('r_blead');
    assignBoardRole(state, SARAH, 'b_bugs', 'u_tom', null);
    expect(state.boards.b_bugs.roleAssignments.u_tom).toBeUndefined();
    expect(() => assignBoardRole(state, SARAH, 'b_bugs', 'u_marcus', 'r_blead')).toThrow(ValidationError); // not a member
  });
});
