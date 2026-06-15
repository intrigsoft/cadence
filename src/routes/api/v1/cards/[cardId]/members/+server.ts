import { body, handle } from '$lib/server/api/respond';
import { assignMember } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals, params, request }) => {
  const { userId } = await body<{ userId: string }>(request);
  return handle(locals, (s, a) => assignMember(s, a, params.cardId, userId));
};
