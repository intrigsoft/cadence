import { body, handle } from '$lib/server/api/respond';
import { addChecklistItem } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { text } = await body<{ text: string }>(request);
  return handle(locals, (s, a) => addChecklistItem(s, a, params.cardId, text), 201);
};
