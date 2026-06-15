import { handle } from '$lib/server/api/respond';
import { removeLabel } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const DELETE: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => removeLabel(s, a, params.cardId, params.labelId));
