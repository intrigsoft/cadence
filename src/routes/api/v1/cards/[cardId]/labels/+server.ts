import { body, handle } from '$lib/server/api/respond';
import { addLabel } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { labelId } = await body<{ labelId: string }>(request);
  return handle(locals, (s, a) => addLabel(s, a, params.cardId, labelId));
};
