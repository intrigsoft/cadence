// POST /api/v1/auth/artifact — mint a BYOA artifact for the assistant.
//
// Production-faithful path: the HOST mints this for its authenticated session
// (here: the signed-in device cookie) and hands it to DioscHub, which passes it
// opaquely to the MCP relay. Only a human cookie session may mint — an agent
// artifact cannot re-mint itself (no self-renewal / privilege loop).
import { json } from '@sveltejs/kit';
import { mintArtifact } from '$lib/server/api/artifact';
import { fail } from '$lib/server/api/respond';
import type { RequestHandler } from './$types';

export const POST: RequestHandler = ({ locals }) => {
  if (!locals.user || locals.actor?.isAgent) {
    return fail('AUTH_REQUIRED', 'Sign in as a user before minting an assistant artifact.', 401);
  }
  const { artifact, expiresAt } = mintArtifact({ deviceId: locals.deviceId, userId: locals.user.id });
  return json({ ok: true, data: { artifact, expiresAt } });
};
