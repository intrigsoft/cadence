import { handle } from '$lib/server/api/respond';
import { myCards } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => handle(locals, (s, a) => myCards(s, a));
