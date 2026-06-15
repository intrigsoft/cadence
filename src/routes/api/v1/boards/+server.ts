import { body, handle } from '$lib/server/api/respond';
import { accessibleBoards, createBoard } from '$lib/server/domain';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = ({ locals }) => handle(locals, (s, a) => accessibleBoards(s, a));

export const POST: RequestHandler = async ({ locals, request }) => {
  const { name, accent, visibility } = await body<{ name: string; accent: string; visibility: 'private' | 'workspace' }>(request);
  return handle(locals, (s, a) => createBoard(s, a, { name, accent, visibility }), 201);
};
