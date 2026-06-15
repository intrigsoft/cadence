import { handle } from '$lib/server/api/respond';
import { removeBoardMember } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => removeBoardMember(s, a, params.boardId, params.userId));
