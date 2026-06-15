import { body, handle } from '$lib/server/api/respond';
import { moveCard } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { toListId, toIndex } = await body<{ toListId: string; toIndex: number }>(request);
  return handle(locals, (s, a) => moveCard(s, a, params.cardId, toListId, toIndex));
};
