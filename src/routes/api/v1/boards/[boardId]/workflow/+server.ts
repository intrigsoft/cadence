import { body, handle } from '$lib/server/api/respond';
import { saveWorkflow } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const PUT: RequestHandler = async ({ locals, params, request }) => {
  const payload = await body<Parameters<typeof saveWorkflow>[3]>(request);
  return handle(locals, (s, a) => saveWorkflow(s, a, params.boardId, payload));
};
