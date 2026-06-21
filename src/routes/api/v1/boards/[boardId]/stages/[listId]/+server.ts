// /api/v1/boards/:boardId/stages/:listId — rename or remove a single stage (admin).
import { body, handle } from '$lib/server/api/respond';
import { removeStage, renameStage } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const { name } = await body<{ name: string }>(request);
  return handle(locals, (s, a) => renameStage(s, a, params.boardId, params.listId, name));
};

export const DELETE: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => {
    removeStage(s, a, params.boardId, params.listId);
    return { id: params.listId, removed: true };
  });
