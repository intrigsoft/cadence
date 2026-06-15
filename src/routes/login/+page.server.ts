import { fail, redirect } from '@sveltejs/kit';
import { personaList, signIn } from '$lib/server/domain';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
  return {
    workspace: locals.state.workspace,
    personas: personaList(locals.state)
  };
};

export const actions: Actions = {
  // SSO + sandbox identity picker both resolve to a seeded user, then sign in.
  // (The email/password form is decorative — the product-true path is SSO.)
  default: async ({ request, locals }) => {
    const form = await request.formData();
    const method = String(form.get('method') ?? '');
    const userId = method === 'sso' ? 'u_sarah' : String(form.get('userId') ?? '');
    if (!locals.state.users[userId]) return fail(422, { error: 'Unknown user' });
    signIn(locals.state, userId);
    throw redirect(303, '/');
  }
};
