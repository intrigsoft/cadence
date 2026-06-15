import { body, handle } from '$lib/server/api/respond';
import { addCard } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, request }) => {
  const { boardId, listId, title } = await body<{ boardId: string; listId: string; title: string }>(request);
  return handle(locals, (s, a) => addCard(s, a, boardId, listId, title), 201);
};
