import { redirect } from '@sveltejs/kit';
import { resetDevice } from '$lib/server/sandbox/store';
import type { RequestHandler } from './$types';

// "Reset sandbox" — restore this device to the seed and sign out. The no-DB
// analogue of wiping your demo data.
export const POST: RequestHandler = async ({ locals }) => {
  resetDevice(locals.deviceId);
  throw redirect(303, '/login');
};
