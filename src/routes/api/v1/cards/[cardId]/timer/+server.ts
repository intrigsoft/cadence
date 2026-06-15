// POST /api/v1/cards/:cardId/timer — start a timer on a card (canTrack-gated).
// Stopping is cardId-free: see DELETE /api/v1/timer.
import { handle } from '$lib/server/api/respond';
import { startTimer } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => {
    startTimer(s, a, params.cardId);
    return { started: true };
  });
