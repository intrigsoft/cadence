import { handle } from '$lib/server/api/respond';
import { searchCards } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, url }) => handle(locals, (s, a) => searchCards(s, a, url.searchParams.get('q') ?? ''));
