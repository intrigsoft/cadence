// PUT /api/v1/boards/:boardId/stages/:listId/permissions — set one role's
// pick/drop/work on this stage. Omitted verbs are left unchanged (admin only).
import { body, handle } from '$lib/server/api/respond';
import { setStagePermission } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const { roleId, pick, drop, work } = await body<{
    roleId: string;
    pick?: boolean;
    drop?: boolean;
    work?: boolean;
  }>(request);
  return handle(locals, (s, a) =>
    setStagePermission(s, a, params.boardId, params.listId, roleId, { pick, drop, work })
  );
};
