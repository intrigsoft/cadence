import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

// Single auth gate: unauthenticated devices land on /login; authenticated ones
// never see it. Identity is the device sandbox session (real SSO in production).
export const load: LayoutServerLoad = async ({ locals, url }) => {
  const onLogin = url.pathname === '/login';
  if (!locals.authed && !onLogin) throw redirect(303, '/login');
  if (locals.authed && onLogin) throw redirect(303, '/');
  return { authed: locals.authed };
};
