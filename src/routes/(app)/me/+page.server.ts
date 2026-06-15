import { myCards } from '$lib/server/domain';
import { accessibleBoardIds } from '$lib/server/permissions';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  const mine = myCards(locals.state, locals.actor);
  const order = accessibleBoardIds(locals.state, locals.user!.id);
  const boards = order
    .map((id) => locals.state.boards[id])
    .filter((b) => mine.some((c) => c.boardId === b.id))
    .map((b) => ({ id: b.id, name: b.name, accent: b.accent, lists: b.lists }));
  return { mine, boards, labels: locals.state.labels };
};
