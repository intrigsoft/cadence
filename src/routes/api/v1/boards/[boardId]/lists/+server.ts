import { body, handle } from '$lib/server/api/respond';
import { addList } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { name } = await body<{ name: string }>(request);
  return handle(locals, (s, a) => addList(s, a, params.boardId, name), 201);
};
