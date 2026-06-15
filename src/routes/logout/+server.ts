import { redirect } from '@sveltejs/kit';
import { signOut } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = async ({ locals }) => {
  signOut(locals.state);
  throw redirect(303, '/login');
};
