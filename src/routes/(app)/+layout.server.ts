import { bootstrap, personaList } from '$lib/server/domain';
import type { LayoutServerLoad } from './$types';

// Shell bootstrap — scoped to the signed-in actor. Everything the chrome needs.
export const load: LayoutServerLoad = async ({ locals }) => {
  const boot = bootstrap(locals.state, locals.actor);
  return {
    workspace: boot.workspace,
    currentUser: boot.currentUser,
    boards: boot.boards,
    totalBoardCount: boot.totalBoardCount,
    accessibleBoardCount: boot.accessibleBoardCount,
    personas: personaList(locals.state)
  };
};
