// /api/v1/cards/:cardId — read / edit / delete a single card (membership-gated).
import { body, handle } from '$lib/server/api/respond';
import { deleteCard, getCard, patchCard } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals, params }) => handle(locals, (s, a) => getCard(s, a, params.cardId));

export const PATCH: RequestHandler = async ({ locals, params, request }) => {
  const patch = await body<{ title?: string; desc?: string; due?: string | null }>(request);
  return handle(locals, (s, a) => patchCard(s, a, params.cardId, patch));
};

export const DELETE: RequestHandler = ({ locals, params }) =>
  handle(locals, (s, a) => {
    deleteCard(s, a, params.cardId);
    return { id: params.cardId, deleted: true };
  });
