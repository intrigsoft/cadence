// GET /api/v1/me — whoami: the acting identity + board-scope counts.
import { handle } from '$lib/server/api/respond';
import { bootstrap } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => handle(locals, (state, actor) => bootstrap(state, actor));
