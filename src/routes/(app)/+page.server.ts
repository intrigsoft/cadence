import { fail, redirect } from '@sveltejs/kit';
import { createBoard, myCards } from '$lib/server/domain';
import type { Actions, PageServerLoad } from './$types';
import type { Visibility } from '$lib/server/types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    today: locals.state.today,
    myCardCount: myCards(locals.state, locals.actor).length
  };
};

export const actions: Actions = {
  create: async ({ request, locals }) => {
    const form = await request.formData();
    const name = String(form.get('name') ?? '').trim();
    const accent = String(form.get('accent') ?? '#4B3FE4');
    const visibility = (String(form.get('visibility') ?? 'private') as Visibility) ?? 'private';
    if (!name) return fail(422, { error: 'Board name is required' });
    const board = createBoard(locals.state, locals.actor, { name, accent, visibility });
    throw redirect(303, `/b/${board.id}`);
  }
};
