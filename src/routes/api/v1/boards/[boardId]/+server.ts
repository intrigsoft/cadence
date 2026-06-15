import { handle } from '$lib/server/api/respond';
import { cardsForBoard, getBoard } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => ({ board: getBoard(s, a, params.boardId), cards: cardsForBoard(s, a, params.boardId) }));
