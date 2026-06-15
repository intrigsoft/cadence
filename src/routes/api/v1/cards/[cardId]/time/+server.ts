import { body, handle } from '$lib/server/api/respond';
import { logTime } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const payload = await body<{ minutes: number; manual?: boolean; listId?: string }>(request);
  return handle(locals, (s, a) => logTime(s, a, params.cardId, payload), 201);
};
