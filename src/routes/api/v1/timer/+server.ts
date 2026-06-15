// /api/v1/timer — the current user's running timer (no cardId needed).
import { handle } from '$lib/server/api/respond';
import { runningTimer, stopTimer } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => handle(locals, (s, a) => runningTimer(s, a));

// stop_timer stops whichever timer is running for the user, so it lives here
// rather than under a specific card.
export const DELETE: RequestHandler = ({ locals }) => handle(locals, (s, a) => ({ stopped: true, entry: stopTimer(s, a) }));
