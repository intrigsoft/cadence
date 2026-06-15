import { bootstrap } from '$lib/server/domain';
import type { PageServerLoad } from './$types';

// Scaffold home: proves the backend is wired — scoped boards + the
// hidden-boards count, all from the device sandbox. The real BoardsHome UI
// lands in phase 4.
export const load: PageServerLoad = async ({ locals }) => {
  const data = bootstrap(locals.state, locals.actor);
  return {
    workspace: data.workspace,
    currentUser: data.currentUser,
    boards: data.boards,
    totalBoardCount: data.totalBoardCount,
    accessibleBoardCount: data.accessibleBoardCount
  };
};
