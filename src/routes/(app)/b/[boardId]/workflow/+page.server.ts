import { error, fail, redirect } from '@sveltejs/kit';
import { getBoard, saveWorkflow } from '$lib/server/domain';
import { ForbiddenError, NotFoundError } from '$lib/server/errors';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
  let board;
  try {
    board = getBoard(locals.state, locals.actor, params.boardId);
  } catch (e) {
    if (e instanceof NotFoundError) throw error(404, 'Board not found');
    throw e;
  }
  // Admin-only surface — non-admins get bounced back to the board.
  if (locals.user!.role !== 'admin') throw redirect(303, `/b/${params.boardId}`);
  return {
    board,
    cardCounts: countByList(locals, params.boardId),
    users: locals.state.users
  };
};

function countByList(locals: App.Locals, boardId: string): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const c of locals.state.cards) {
    if (c.boardId === boardId) counts[c.listId] = (counts[c.listId] ?? 0) + 1;
  }
  return counts;
}

export const actions: Actions = {
  save: async ({ request, params, locals }) => {
    const form = await request.formData();
    let payload;
    try {
      payload = JSON.parse(String(form.get('payload') ?? '{}'));
    } catch {
      return fail(422, { error: 'Malformed payload' });
    }
    try {
      saveWorkflow(locals.state, locals.actor, params.boardId, payload);
    } catch (e) {
      if (e instanceof ForbiddenError) return fail(403, { error: e.message });
      if (e instanceof NotFoundError) return fail(404, { error: e.message });
      throw e;
    }
    return { ok: true };
  }
};
