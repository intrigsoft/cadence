// PUT /api/v1/boards/:boardId/stages/:listId/tracking — enable/disable time
// tracking for one role on this stage (admin only).
import { body, handle } from '$lib/server/api/respond';
import { setStageTracking } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { roleId, enabled } = await body<{ roleId: string; enabled: boolean }>(request);
  return handle(locals, (s, a) => setStageTracking(s, a, params.boardId, params.listId, roleId, enabled));
};
