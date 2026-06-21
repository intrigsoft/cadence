// PUT /api/v1/boards/:boardId/members/:userId/role — assign (or clear, with
// roleId:null) a member's project role on this board (admin only).
import { body, handle } from '$lib/server/api/respond';
import { assignBoardRole } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { roleId } = await body<{ roleId: string | null }>(request);
  return handle(locals, (s, a) => assignBoardRole(s, a, params.boardId, params.userId, roleId ?? null));
};
