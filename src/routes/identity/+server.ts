import { redirect } from '@sveltejs/kit';
import { switchIdentity } from '$lib/server/domain';
import type { RequestHandler } from './$types';

// Sandbox-only: "switch demo identity". Re-scopes the whole app and returns
// home (matches the prototype). In production identity is the SSO session.
export const POST: RequestHandler = async ({ request, locals }) => {
  const form = await request.formData();
  const userId = String(form.get('userId') ?? '');
  if (locals.state.users[userId]) switchIdentity(locals.state, userId);
  throw redirect(303, '/');
};
