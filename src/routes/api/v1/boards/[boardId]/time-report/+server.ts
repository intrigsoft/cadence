import { handle } from '$lib/server/api/respond';
import { timeReport } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => handle(locals, (s, a) => timeReport(s, a, params.boardId));
