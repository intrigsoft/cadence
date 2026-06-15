import { body, handle } from '$lib/server/api/respond';
import { removeChecklistItem, toggleChecklistItem } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const { done } = await body<{ done: boolean }>(request);
  return handle(locals, (s, a) => toggleChecklistItem(s, a, params.cardId, params.itemId, done));
};

export const DELETE: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => removeChecklistItem(s, a, params.cardId, params.itemId));
