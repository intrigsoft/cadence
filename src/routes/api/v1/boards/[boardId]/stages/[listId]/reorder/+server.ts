// POST /api/v1/boards/:boardId/stages/:listId/reorder — move this stage to a
// new index in the board's ordered stage list (admin only).
import { body, handle } from '$lib/server/api/respond';
import { reorderStage } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { toIndex } = await body<{ toIndex: number }>(request);
  return handle(locals, (s, a) => reorderStage(s, a, params.boardId, params.listId, toIndex));
};
